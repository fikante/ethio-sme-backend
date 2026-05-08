<?php

namespace App\Domain\Psychometric\Enums;

enum AssessmentVersion: string
{
    case V1 = 'v1';

    public static function current(): self
    {
        return self::V1;
    }
}
