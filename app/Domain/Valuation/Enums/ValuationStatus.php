<?php

namespace App\Domain\Valuation\Enums;

enum ValuationStatus: string
{
    case Pending = 'pending';
    case Completed = 'completed';
    case Failed = 'failed';
}
