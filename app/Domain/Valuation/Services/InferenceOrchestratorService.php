<?php

namespace App\Domain\Valuation\Services;

use App\Domain\Valuation\Data\InferenceResponseData;
use App\Domain\Valuation\Exceptions\AiEngineException;
use App\Models\AiEvaluationLog;
use App\Models\LoanApplication;
use Illuminate\Support\Facades\Log;

/**
 * Builds v1 /predict requests and coordinates calls to the Hugging Face AI service.
 */
class InferenceOrchestratorService
{
    public function __construct(
        private readonly AiEngineClient $client,
        private readonly ValuationFallbackService $fallback,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function buildPredictPayload(LoanApplication $application): array
    {
        $business = $application->business;
        if ($business === null) {
            throw new \InvalidArgumentException('Loan application is missing an associated business.');
        }

        return [
            'business_uuid' => (string) $business->uuid,
            'horizon_days' => (int) config('valuation.inference_horizon_days', 30),
            'cashflow_haircut' => (float) config('valuation.cashflow_haircut', 0.30),
            'requested_amount' => (float) $application->requested_amount,
            'force_degraded' => false,
        ];
    }

    public function call(LoanApplication $application): InferenceResponseData
    {
        $payload = $this->buildPredictPayload($application);
        $startedAt = microtime(true);
        $success = false;
        $errorMessage = null;
        $responseData = [];

        try {
            $responseData = $this->client->predict($payload);
            $success = true;

            return InferenceResponseData::fromPredictV1($responseData);
        } catch (AiEngineException $e) {
            $errorMessage = $e->errorCode.': '.$e->getMessage();

            if (config('services.ai_engine.fallback_enabled', true)) {
                Log::warning('AI predict failed; using fallback valuation', [
                    'application_id' => $application->id,
                    'error' => $errorMessage,
                ]);

                return $this->fallback->build($application);
            }

            throw $e;
        } catch (\Throwable $e) {
            $errorMessage = $e->getMessage();

            if (config('services.ai_engine.fallback_enabled', true)) {
                Log::warning('AI predict error; using fallback valuation', [
                    'application_id' => $application->id,
                    'error' => $errorMessage,
                ]);

                return $this->fallback->build($application);
            }

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
}
