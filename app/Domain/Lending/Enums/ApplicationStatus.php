<?php

namespace App\Domain\Lending\Enums;

enum ApplicationStatus: string
{
    case Draft = 'draft';
    case PendingPsychometric = 'pending_psychometric';
    case PendingDataSync = 'pending_data_sync';
    case QueuedForAi = 'queued_for_ai';
    case Processing = 'processing';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Withdrawn = 'withdrawn';

    public function isTerminal(): bool
    {
        return in_array($this, [self::Approved, self::Rejected, self::Withdrawn], true);
    }
}
