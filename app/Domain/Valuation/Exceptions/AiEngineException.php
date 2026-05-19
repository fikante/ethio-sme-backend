<?php

namespace App\Domain\Valuation\Exceptions;

use RuntimeException;

class AiEngineException extends RuntimeException
{
    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly ?array $details = null,
        public readonly ?string $requestId = null,
        public readonly int $httpStatus = 502,
    ) {
        parent::__construct($message, $httpStatus);
    }

    public static function fromResponse(int $status, array $body): self
    {
        $error = (array) ($body['error'] ?? []);
        $code = (string) ($error['code'] ?? 'INTERNAL_ERROR');
        $message = (string) ($error['message'] ?? 'AI engine request failed');
        $details = isset($error['details']) ? (array) $error['details'] : null;
        $requestId = isset($body['request_id']) ? (string) $body['request_id'] : null;

        return new self($code, $message, $details, $requestId, $status);
    }
}
