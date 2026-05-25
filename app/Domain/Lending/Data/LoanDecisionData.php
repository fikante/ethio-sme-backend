<?php

namespace App\Domain\Lending\Data;

use App\Domain\Lending\Enums\DecisionOutcome;
use Illuminate\Http\Request;
use Spatie\LaravelData\Data;

class LoanDecisionData extends Data
{
    /**
     * @param  list<string>  $reasonCodes
     */
    public function __construct(
        public readonly DecisionOutcome $outcome,
        public readonly array $reasonCodes,
        public readonly ?string $narrative,
        public readonly int $officerId,
        public readonly ?float $apr = null,
    ) {}

    public static function fromRequest(Request $request, int $officerId): self
    {
        return new self(
            outcome: DecisionOutcome::from((string) $request->input('status')),
            reasonCodes: (array) $request->input('reason_codes', []),
            narrative: $request->filled('rejection_narrative')
                ? (string) $request->input('rejection_narrative')
                : null,
            officerId: $officerId,
            apr: $request->filled('apr') ? (float) $request->input('apr') : null,
        );
    }

    public static function fromWebRequest(Request $request, int $officerId): self
    {
        $narrative = $request->filled('narrative')
            ? (string) $request->input('narrative')
            : ($request->filled('rejection_narrative') ? (string) $request->input('rejection_narrative') : null);

        return new self(
            outcome: DecisionOutcome::from((string) $request->input('decision')),
            reasonCodes: (array) $request->input('reason_codes', []),
            narrative: $narrative,
            officerId: $officerId,
            apr: $request->filled('apr') ? (float) $request->input('apr') : null,
        );
    }
}
