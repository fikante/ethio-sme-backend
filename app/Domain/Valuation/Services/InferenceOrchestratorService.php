<?php

namespace App\Domain\Valuation\Services;

use App\Domain\Valuation\Data\InferenceRequestData;
use App\Domain\Valuation\Data\InferenceResponseData;
use App\Models\AiEvaluationLog;
use App\Models\Business;
use App\Models\ExogenousFactor;
use App\Models\LoanApplication;
use App\Models\PsychometricAssessment;
use App\Models\SmeDailyHeartbeat;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Coordinates the request to the FastAPI inference service. Builds the request
 * payload from domain models, calls the remote endpoint, and returns a typed
 * response. Persistence of the resulting valuation is performed by Actions.
 */
class InferenceOrchestratorService
{
    public function buildRequest(LoanApplication $application): InferenceRequestData
    {
        $business = $application->business;
        $heartbeat = SmeDailyHeartbeat::query()
            ->where('business_id', $business->id)
            ->orderByDesc('heartbeat_date')
            ->limit(60)
            ->get(['heartbeat_date', 'inflow_total', 'transaction_failure_rate', 'is_payday', 'is_holiday'])
            ->reverse()
            ->values()
            ->toArray();

        $assessment = PsychometricAssessment::query()
            ->where('business_id', $business->id)
            ->latest()
            ->first();

        $factors = ExogenousFactor::latestRow();

        return new InferenceRequestData(
            businessId: $business->id,
            businessProfile: [
                'sector' => $business->sector,
                'sub_city' => $business->sub_city,
                'established_year' => $business->established_year,
                'monthly_revenue_estimate' => $business->monthly_revenue_estimate,
            ],
            heartbeatWindow: $heartbeat,
            psychometric: [
                'integrity_score' => (float) ($assessment->integrity_score ?? 0.5),
                'conscientiousness_score' => (float) ($assessment->conscientiousness_score ?? 0.5),
                'risk_tolerance_score' => (float) ($assessment->risk_tolerance_score ?? 0.5),
            ],
            exogenousFactors: [
                'nbe_policy_rate' => (float) ($factors->nbe_policy_rate ?? config('valuation.fallback_policy_rate', 0.15)),
                'inflation_rate' => (float) ($factors->inflation_rate ?? 0.0),
                'usd_etb_rate' => $factors->usd_etb_rate !== null ? (float) $factors->usd_etb_rate : null,
            ],
            tenureMonths: (int) $application->requested_tenure_months,
            cohortAttributes: [
                'sub_city' => $business->sub_city,
                'sector' => $business->sector,
            ],
        );
    }

    public function call(LoanApplication $application, InferenceRequestData $request): InferenceResponseData
    {
        $baseUrl = (string) config('services.ai_engine.url', 'http://localhost:8001');
        $timeout = (int) config('services.ai_engine.timeout', 30);
        $retries = (int) config('services.ai_engine.retries', 1);

        $startedAt = microtime(true);
        $payload = $request->toPayload();
        $success = false;
        $errorMessage = null;
        $responseData = [];

        try {
            $response = Http::timeout($timeout)
                ->retry(max(1, $retries), 200, throw: false)
                ->acceptJson()
                ->asJson()
                ->post(rtrim($baseUrl, '/').'/forecast', $payload);

            if ($response->failed()) {
                throw new \RuntimeException("Inference call failed: HTTP {$response->status()}");
            }

            $responseData = (array) $response->json();
            $success = true;

            return InferenceResponseData::fromHttp($responseData);
        } catch (ConnectionException $e) {
            $errorMessage = 'circuit_open: '.$e->getMessage();
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

    public function buildForBusiness(Business $business): InferenceRequestData
    {
        $synthetic = new LoanApplication([
            'business_id' => $business->id,
            'requested_tenure_months' => 12,
        ]);
        $synthetic->setRelation('business', $business);

        return $this->buildRequest($synthetic);
    }
}
