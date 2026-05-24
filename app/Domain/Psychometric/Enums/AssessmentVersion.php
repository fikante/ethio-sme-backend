<?php

namespace App\Domain\Psychometric\Enums;

enum AssessmentVersion: string
{
    case V1 = 'v1';
    case V2 = 'v2';

    public static function current(): self
    {
        return self::V2;
    }
}
