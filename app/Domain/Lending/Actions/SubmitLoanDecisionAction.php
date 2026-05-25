<?php

namespace App\Domain\Lending\Actions;

use App\Domain\Lending\Data\LoanDecisionData;
use App\Domain\Lending\Enums\DecisionOutcome;
use App\Models\AdverseActionNotice;
use App\Models\LoanApplication;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Persists the officer's terminal decision on an application. Reject path
 * additionally writes an immutable adverse_action_notices row containing the
 * SHAP-derived reason codes per PRD §7.9 and §10.2.
 */
class SubmitLoanDecisionAction
{
    public function execute(LoanApplication $application, LoanDecisionData $decision): LoanApplication
    {
        if ($application->isTerminal()) {
            throw new \DomainException("Application {$application->id} is already terminal ({$application->status})");
        }

        if ($decision->outcome === DecisionOutcome::Rejected && count($decision->reasonCodes) === 0) {
            throw ValidationException::withMessages([
                'reason_codes' => ['At least one reason code is required when rejecting an application.'],
            ]);
        }

        $terminalStatus = match ($decision->outcome) {
            DecisionOutcome::Approved => LoanApplication::STATUS_APPROVED,
            DecisionOutcome::Rejected => LoanApplication::STATUS_REJECTED,
        };

        return DB::transaction(function () use ($application, $decision, $terminalStatus): LoanApplication {
            $application->update([
                'status' => $terminalStatus,
                'reviewed_by' => $decision->officerId,
                'rejection_narrative' => $decision->narrative,
                'reason_codes' => $decision->reasonCodes,
                'decided_at' => now(),
            ]);

            if ($decision->outcome === DecisionOutcome::Rejected) {
                AdverseActionNotice::create([
                    'loan_application_id' => $application->id,
                    'officer_id' => $decision->officerId,
                    'reason_codes' => $decision->reasonCodes,
                    'narrative' => $decision->narrative,
                    'apr' => $decision->apr ?? $application->apr,
                ]);
            }

            return $application->fresh();
        });
    }
}
