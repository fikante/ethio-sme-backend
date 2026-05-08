<?php

namespace App\Domain\Governance\Actions;

use App\Domain\Governance\Services\FairnessMetricsCalculatorService;
use App\Models\FairnessAudit;
use Illuminate\Support\Facades\DB;

class RunFairnessAuditAction
{
    public function __construct(private readonly FairnessMetricsCalculatorService $calculator) {}

    public function execute(array $cohortDefinition, int $runBy, ?string $notes = null): FairnessAudit
    {
        $metrics = $this->calculator->calculate($cohortDefinition, $runBy, $notes);

        return DB::transaction(function () use ($metrics): FairnessAudit {
            return FairnessAudit::create([
                'run_by' => $metrics->runBy,
                'cohort_definition' => $metrics->cohortDefinition,
                'spd' => $metrics->spd,
                'eod' => $metrics->eod,
                'notes' => $metrics->notes,
            ]);
        });
    }
}
