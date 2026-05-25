<?php

namespace App\Domain\Valuation\Actions;

use App\Domain\Valuation\Services\InferenceOrchestratorService;
use App\Domain\Valuation\Support\ReasonCodeBuilder;
use App\Domain\Valuation\Support\SupabaseValuationSchema;
use App\Models\LoanApplication;
use App\Models\Valuation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Orchestrates valuation via live Hugging Face /predict (contract v1).
 */
class RunValuationAction
{
    public function __construct(
        private readonly InferenceOrchestratorService $orchestrator,
        private readonly PersistShapExplanationsAction $persistShap,
        private readonly ReasonCodeBuilder $reasonCodes,
    ) {}

    public function execute(LoanApplication $application, ?string $idempotencyKey = null): Valuation
    {
        if ($idempotencyKey !== null) {
            $existing = $application->valuation;
            if ($existing !== null && $existing->isCompleted()) {
                return $existing;
            }
        }

        if (! $application->isReadyForValuation() && $application->status !== LoanApplication::STATUS_PROCESSING) {
            throw new \DomainException(
                "Application {$application->id} is not ready for valuation (status={$application->status})"
            );
        }

        if ($application->status === LoanApplication::STATUS_PROCESSING) {
            Log::warning('Retrying valuation for application stuck in processing', [
                'application_id' => $application->id,
            ]);
        }

        DB::transaction(fn () => $application->update(['status' => LoanApplication::STATUS_PROCESSING]));

        try {
            $response = $this->orchestrator->call($application);
        } catch (\Throwable $e) {
            Log::error('RunValuationAction failed', [
                'application_id' => $application->id,
                'message' => $e->getMessage(),
                'class' => $e::class,
            ]);
            $this->rollbackToQueued($application);

            throw $e;
        }

        $reasonCodes = $response->reasonCodes !== []
            ? $this->reasonCodes->fromMlResponse($response->reasonCodes)
            : $this->reasonCodes->build($response->shapValues);

        $contractVersion = $response->contractVersion
            ?: (string) config('services.ai_engine.contract_version', 'v1');

        $npvLimit = $response->npvCreditLimit;

        try {
            return DB::transaction(function () use (
                $application,
                $response,
                $reasonCodes,
                $contractVersion,
                $npvLimit,
                $idempotencyKey
            ): Valuation {
                $valuation = Valuation::create(
                    SupabaseValuationSchema::valuationInsertAttributes(
                        $application,
                        $response,
                        $reasonCodes,
                        $contractVersion,
                        $npvLimit,
                        $idempotencyKey,
                    )
                );

                $this->persistShap->execute($valuation, $response->shapValues);

                $application->update(
                    SupabaseValuationSchema::loanApplicationUpdateAttributes(
                        $application,
                        $valuation->id,
                        $response,
                        $reasonCodes,
                        $contractVersion,
                        $npvLimit,
                    )
                );

                // #region agent log
                @file_put_contents(base_path('.cursor/debug-054501.log'), json_encode([
                    'sessionId' => '054501',
                    'hypothesisId' => 'C',
                    'location' => 'RunValuationAction::execute',
                    'message' => 'valuation persisted',
                    'data' => [
                        'applicationId' => $application->id,
                        'valuationId' => $valuation->id,
                        'supabaseLayout' => SupabaseValuationSchema::isSupabaseLayout(),
                        'forecasterMode' => $valuation->forecaster_mode,
                    ],
                    'timestamp' => (int) round(microtime(true) * 1000),
                ])."\n", FILE_APPEND | LOCK_EX);
                // #endregion

                Log::info('Valuation completed', [
                    'application_id' => $application->id,
                    'valuation_id' => $valuation->id,
                    'forecaster_mode' => $response->forecasterMode,
                    'degraded' => $response->isDegraded(),
                ]);

                return $valuation->fresh(['shapExplanations']);
            });
        } catch (\Throwable $e) {
            Log::error('RunValuationAction persist failed', [
                'application_id' => $application->id,
                'message' => $e->getMessage(),
            ]);
            $this->rollbackToQueued($application);

            throw $e;
        }
    }

    private function rollbackToQueued(LoanApplication $application): void
    {
        DB::transaction(fn () => $application->update([
            'status' => LoanApplication::STATUS_QUEUED_FOR_AI,
        ]));
    }
}
