<?php

namespace App\Domain\Compliance\Data;

use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Spatie\LaravelData\Data;

class SecurityIncidentData extends Data
{
    public function __construct(
        public readonly CarbonInterface $detectedAt,
        public readonly string $summary,
        public readonly string $severity,
        public readonly ?CarbonInterface $reportedToEcaAt = null,
        public readonly ?array $payload = null,
    ) {}

    public static function fromRequest(Request $request): self
    {
        return new self(
            detectedAt: Carbon::parse((string) $request->input('detected_at', now()->toIso8601String())),
            summary: (string) $request->input('summary'),
            severity: (string) $request->input('severity', 'medium'),
            reportedToEcaAt: $request->filled('reported_to_eca_at')
                ? Carbon::parse((string) $request->input('reported_to_eca_at'))
                : null,
            payload: $request->filled('payload') ? (array) $request->input('payload') : null,
        );
    }
}
