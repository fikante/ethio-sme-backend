<?php

namespace App\Domain\AI\Services;

use App\Models\AiEvaluationLog;
use App\Models\LoanApplication;
use App\Models\SmeDailyHeartbeat;
use App\Models\ExogenousFactor;
use Illuminate\Support\Facades\Http;

class AiEngineService
{
    private string $baseUrl;
    private int $timeout;

    public function __construct()
    {
        $this->baseUrl = config('services.ai_engine.url', 'http://localhost:8001');
        $this->timeout = (int) config('services.ai_engine.timeout', 30);
    }

    /**
     * Call Leykun's /forecast endpoint.
     * Returns probabilistic cash flow arrays + SHAP values.
     */
    public function forecast(LoanApplication $application): array
    {
        $heartbeat = SmeDailyHeartbeat::where('business_id', $application->business_id)
            ->orderBy('heartbeat_date')
            ->get(['heartbeat_date', 'inflow_total', 'transaction_failure_rate', 'is_payday', 'is_holiday'])
            ->toArray();

        $macroFactors = ExogenousFactor::latest();

        $requestPayload = [
            'business_id'   => $application->business_id,
            'time_series'   => $heartbeat,
            'tenure_months' => $application->requested_tenure_months,
            'sector'        => $application->business->sector,
            'sub_city'      => $application->business->sub_city,
            'exogenous'     => [
                'nbe_policy_rate' => $macroFactors?->nbe_policy_rate ?? 0.15,
                'inflation_rate'  => $macroFactors?->inflation_rate ?? 0.28,
            ],
        ];

        $startTime = microtime(true);

        try {
            $response = Http::timeout($this->timeout)
                ->post("{$this->baseUrl}/forecast", $requestPayload);

            $latencyMs = (int) ((microtime(true) - $startTime) * 1000);

            if ($response->failed()) {
                throw new \RuntimeException("AI service error: " . $response->body());
            }

            $responseData = $response->json();

            AiEvaluationLog::create([
                'loan_application_id' => $application->id,
                'request_payload'     => $requestPayload,
                'response_payload'    => $responseData,
                'latency_ms'          => $latencyMs,
                'success'             => true,
            ]);

            return $responseData;
        } catch (\Throwable $e) {
            $latencyMs = (int) ((microtime(true) - $startTime) * 1000);

            AiEvaluationLog::create([
                'loan_application_id' => $application->id,
                'request_payload'     => $requestPayload,
                'response_payload'    => [],
                'latency_ms'          => $latencyMs,
                'success'             => false,
                'error_message'       => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}

