<?php

namespace App\Domain\Governance\Services;

use App\Domain\Governance\Data\FairnessMetricsData;
use App\Models\LoanApplication;

/**
 * Computes the SPD and EOD audit numbers from the loan_applications outcomes
 * across a cohort definition. The cohort definition is a list of cohort filters
 * — each entry has `label`, `protected`, and `match` arrays of attribute filters.
 *
 * No DB writes here — RunFairnessAuditAction persists results.
 */
class FairnessMetricsCalculatorService
{
    /**
     * @param  array{cohorts: list<array{label:string, protected?:bool, match: array<string,mixed>}>}  $cohortDefinition
     */
    public function calculate(array $cohortDefinition, int $runBy, ?string $notes = null): FairnessMetricsData
    {
        $cohorts = $cohortDefinition['cohorts'] ?? [];
        $approvalRates = [];
        $tprByCohort = [];

        foreach ($cohorts as $cohort) {
            $label = (string) ($cohort['label'] ?? 'unknown');
            $matches = (array) ($cohort['match'] ?? []);

            $base = LoanApplication::query();
            $base->whereHas('business', function ($q) use ($matches): void {
                foreach ($matches as $col => $value) {
                    $q->where($col, $value);
                }
            });

            $total = (clone $base)->whereIn('status', ['approved', 'rejected'])->count();
            $approved = (clone $base)->where('status', 'approved')->count();

            $approvalRates[$label] = $total > 0 ? $approved / $total : 0.0;

            $positive = (clone $base)->where('snapshot_risk_score', '<=', 0.5)->count();
            $tp = (clone $base)
                ->where('snapshot_risk_score', '<=', 0.5)
                ->where('status', 'approved')
                ->count();

            $tprByCohort[$label] = $positive > 0 ? $tp / $positive : 0.0;
        }

        $rates = array_values($approvalRates);
        $tprs = array_values($tprByCohort);

        $spd = (count($rates) >= 2) ? (max($rates) - min($rates)) : 0.0;
        $eod = (count($tprs) >= 2) ? (max($tprs) - min($tprs)) : 0.0;

        return new FairnessMetricsData(
            runBy: $runBy,
            cohortDefinition: $cohortDefinition,
            spd: round($spd, 6),
            eod: round($eod, 6),
            notes: $notes,
        );
    }
}
