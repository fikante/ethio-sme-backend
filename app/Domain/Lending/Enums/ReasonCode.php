<?php

namespace App\Domain\Lending\Enums;

/**
 * Canonical NBE adverse action reason codes from PRD §14.3.
 * Officers must select at least one primary code on reject.
 */
enum ReasonCode: string
{
    case FailureRateHigh = 'FAILURE_RATE_HIGH';
    case CashflowP10Insufficient = 'CASHFLOW_P10_INSUFFICIENT';
    case RiskScoreThreshold = 'RISK_SCORE_THRESHOLD';
    case PsychometricLowConscientiousness = 'PSYCHOMETRIC_LOW_CONSCIENTIOUSNESS';
    case MacroStress = 'MACRO_STRESS';

    public function template(): string
    {
        return match ($this) {
            self::FailureRateHigh => 'Approval denied due to extreme transaction failure rate in the trailing {{days}} days',
            self::CashflowP10Insufficient => 'Approved limit reduced due to pessimistic (P10) cash flow trajectory',
            self::RiskScoreThreshold => 'Application exceeded institutional risk score threshold',
            self::PsychometricLowConscientiousness => 'Risk premium increased due to conscientiousness score below threshold',
            self::MacroStress => 'Limit constrained due to elevated macro discount rate environment',
        };
    }

    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
