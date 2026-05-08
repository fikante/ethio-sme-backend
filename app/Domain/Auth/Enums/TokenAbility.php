<?php

namespace App\Domain\Auth\Enums;

enum TokenAbility: string
{
    case Access = 'access';
    case Refresh = 'refresh';
}
