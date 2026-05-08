<?php

return [
    'base_risk_premium' => env('VALUATION_BASE_RISK_PREMIUM', 0.08),
    'psychometric_relief' => env('VALUATION_PSYCHOMETRIC_RELIEF', 0.05),
    'xgboost_uplift' => env('VALUATION_XGBOOST_UPLIFT', 0.06),
    'limit_multiple_of_avg_cf' => env('VALUATION_LIMIT_MULTIPLE', 10.0),
    'fallback_policy_rate' => env('VALUATION_FALLBACK_POLICY_RATE', 0.15),
    'min_effective_rate' => env('VALUATION_MIN_RATE', 0.05),
    'max_effective_rate' => env('VALUATION_MAX_RATE', 0.60),
];
