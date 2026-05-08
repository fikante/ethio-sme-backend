<?php

namespace App\Domain\Compliance\Data;

use Illuminate\Http\Request;
use Spatie\LaravelData\Data;

class ConsentData extends Data
{
    public function __construct(
        public readonly int $userId,
        public readonly string $purpose,
        public readonly string $documentVersion,
        public readonly bool $granted,
    ) {}

    public static function fromRequest(Request $request, int $userId): self
    {
        return new self(
            userId: $userId,
            purpose: (string) $request->input('purpose'),
            documentVersion: (string) $request->input('document_version'),
            granted: (bool) $request->input('granted', true),
        );
    }
}
