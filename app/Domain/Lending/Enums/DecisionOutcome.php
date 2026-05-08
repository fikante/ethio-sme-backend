<?php

namespace App\Domain\Lending\Enums;

enum DecisionOutcome: string
{
    case Approved = 'approved';
    case Rejected = 'rejected';
}
