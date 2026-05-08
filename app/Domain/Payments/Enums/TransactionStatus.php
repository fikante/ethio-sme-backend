<?php

namespace App\Domain\Payments\Enums;

enum TransactionStatus: string
{
    case Success = 'success';
    case Failed = 'failed';
    case Pending = 'pending';
    case Reversed = 'reversed';
}
