<?php

namespace App\Domain\Compliance\Data;

use App\Models\DataSubjectRequest;
use Illuminate\Http\Request;
use Spatie\LaravelData\Data;

class ErasureRequestData extends Data
{
    public function __construct(
        public readonly int $userId,
        public readonly string $type,
        public readonly ?string $notes,
    ) {}

    public static function fromRequest(Request $request, int $userId): self
    {
        return new self(
            userId: $userId,
            type: (string) $request->input('type', DataSubjectRequest::TYPE_ERASURE),
            notes: $request->filled('notes') ? (string) $request->input('notes') : null,
        );
    }
}
