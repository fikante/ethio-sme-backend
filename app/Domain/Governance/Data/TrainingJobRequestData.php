<?php

namespace App\Domain\Governance\Data;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Spatie\LaravelData\Data;

class TrainingJobRequestData extends Data
{
    public function __construct(
        public readonly string $requestId,
        public readonly array $datasetSelection,
        /** @var list<string> */
        public readonly array $modelTypes,
        public readonly string $trainingMode,
        public readonly string $contractVersion = 'v2',
    ) {}

    public static function fromRequest(Request $request): self
    {
        return new self(
            requestId: (string) ($request->input('request_id') ?: Str::uuid()),
            datasetSelection: (array) $request->input('dataset_selection', []),
            modelTypes: array_values((array) $request->input('model_types', ['xgboost', 'lstm'])),
            trainingMode: (string) $request->input('training_mode', 'full_retrain'),
        );
    }

    public function toPayload(): array
    {
        return [
            'contract_version' => $this->contractVersion,
            'request_id' => $this->requestId,
            'dataset_selection' => $this->datasetSelection,
            'model_types' => $this->modelTypes,
            'training_mode' => $this->trainingMode,
        ];
    }
}
