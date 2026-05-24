<?php

namespace App\Domain\Valuation\Services;

use App\Domain\Valuation\Data\InferenceRequestData;
use App\Domain\Valuation\Data\InferenceResponseData;
use App\Domain\Valuation\Exceptions\AiEngineException;
use App\Models\AiEvaluationLog;
use App\Models\Business;
use App\Models\LoanApplication;
use App\Models\PsychometricAssessment;
use App\Models\SmeDailyHeartbeat;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Builds selector-based v2 inference requests and coordinates calls to the FastAPI service.
 */
class InferenceOrchestratorService
{
    public function __construct(
        private readonly AiEngineClient $client,
    ) {}

    public function buildRequest(LoanApplication $application): InferenceRequestData
    {
        $business = $application->business;
        if ($business === null) {
            throw new \InvalidArgumentException('Loan application is missing an associated business.');
        }

        return $this->buildForBusiness($business, $application);
    }

    public function buildForBusiness(
        Business $business,
        ?LoanApplication $application = null,
    ): InferenceRequestData {
        $asOfDate = $this->resolveAsOfDate($business);
        $lookbackDays = (int) config('valuation.inference_lookback_days', 60);
        $horizonDays = $application !== null
            ? min(max((int) $application->requested_tenure_months * 30, 7), 365)
            : (int) config('valuation.inference_horizon_days', 30);

        return new InferenceRequestData(
            requestId: (string) Str::uuid(),
            businessUuid: (string) $business->uuid,
            asOfDate: $asOfDate,
            historyWindow: [
                'mode' => 'lookback_days',
                'lookback_days' => $lookbackDays,
            ],
            horizonDays: $horizonDays,
            psychometricRef: $this->resolvePsychometricRef($business),
            macroRef: [
                'mode' => 'as_of_date',
                'date' => $asOfDate,
            ],
        );
    }

    public function call(LoanApplication $application, InferenceRequestData $request): InferenceResponseData
    {
        $startedAt = microtime(true);
        $payload = $request->toPayload();
        $success = false;
        $errorMessage = null;
        $responseData = [];

        try {
            $responseData = $this->client->inference($payload);
            $success = true;

            return InferenceResponseData::fromHttp($responseData);
        } catch (AiEngineException $e) {
            $errorMessage = $e->errorCode.': '.$e->getMessage();
            throw $e;
        } catch (\Throwable $e) {
            $errorMessage = $e->getMessage();
            throw $e;
        } finally {
            try {
                AiEvaluationLog::create([
                    'loan_application_id' => $application->id,
                    'request_payload' => $payload,
                    'response_payload' => $responseData,
                    'latency_ms' => (int) ((microtime(true) - $startedAt) * 1000),
                    'success' => $success,
                    'error_message' => $errorMessage,
                ]);
            } catch (\Throwable $logException) {
                Log::warning('Failed to write AI evaluation log', [
                    'reason' => $logException->getMessage(),
                ]);
            }
        }
    }

    public function health(): array
    {
        return $this->client->health();
    }

    private function resolveAsOfDate(Business $business): string
    {
        $latestHeartbeat = SmeDailyHeartbeat::query()
            ->forBusiness($business)
            ->orderByDesc('transaction_date')
            ->value('transaction_date');

        if ($latestHeartbeat !== null) {
            return Carbon::parse($latestHeartbeat)->toDateString();
        }

        return now()->toDateString();
    }

    /**
     * @return array<string, mixed>
     */
    private function resolvePsychometricRef(Business $business): array
    {
        $assessment = PsychometricAssessment::query()
            ->where('business_id', $business->id)
            ->latest('completed_at')
            ->first();

        if ($assessment === null) {
            return ['mode' => 'none'];
        }

        return [
            'mode' => 'assessment_id',
            'assessment_id' => (string) $assessment->id,
        ];
    }
}
