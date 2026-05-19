<?php

namespace App\Domain\Valuation\Actions;

use App\Domain\Valuation\Services\InferenceOrchestratorService;

class CheckAiEngineHealthAction
{
    public function __construct(
        private readonly InferenceOrchestratorService $orchestrator,
    ) {}

    public function execute(): array
    {
        return $this->orchestrator->health();
    }
}
