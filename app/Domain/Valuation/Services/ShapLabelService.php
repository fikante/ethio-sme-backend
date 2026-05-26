<?php

namespace App\Domain\Valuation\Services;

class ShapLabelService
{
    /** Map raw XGBoost/LSTM feature keys to SME-owner-friendly labels */
    private static array $labelMap = [
        // Core cashflow features
        'missed_payment_ratio'        => 'Past payment consistency',
        'payment_completion_rate'     => 'Payment completion track record',
        'avg_net_cashflow_30d'        => 'Recent cash flow strength',
        'avg_net_cashflow_14d'        => 'Two-week cash flow strength',
        'avg_net_cashflow_7d'         => 'Short-term cash flow',
        'min_net_cashflow_30d'        => 'Minimum daily cash flow stability',
        'negative_cashflow_days_30d'  => 'Frequency of negative cash flow days',
        'cashflow_volatility_30d'     => 'Revenue stability',
        'cashflow_volatility_7d'      => 'Short-term revenue stability',
        'cashflow_trend'              => 'Cash flow growth trend',
        'positive_cashflow_ratio'     => 'Cash flow consistency',
        // Transaction activity
        'txn_count_avg_30d'           => 'Transaction activity level',
        'avg_txn_count_30d'           => 'Transaction activity level',
        'txn_count_avg_7d'            => 'Recent transaction activity',
        'unique_cust_avg_30d'         => 'Customer base breadth',
        // Inflow / balance
        'avg_inflow_30d'              => 'Average monthly revenue',
        'avg_balance_30d'             => 'Average account balance',
        'balance_trend'               => 'Account balance trend',
        'inflow_trend'                => 'Revenue growth trend',
        'outflow_trend'               => 'Expense trend',
        // Psychometric
        'integrity_score'             => 'Financial integrity profile',
        'conscientiousness_score'     => 'Financial discipline',
        'delayed_gratification_score' => 'Long-term planning ability',
        'financial_risk_score'        => 'Risk management approach',
        'risk_tolerance_score'        => 'Risk tolerance profile',
        'composite_score'             => 'Overall psychometric profile',
        // Business profile
        'sector_risk'                 => 'Sector risk level',
        'months_in_operation'         => 'Business tenure',
        'business_age_years'          => 'Business maturity',
        'employee_count'              => 'Business workforce size',
        'loan_count'                  => 'Credit history length',
        'outstanding_ratio'           => 'Existing debt level',
        'has_default_history'         => 'Previous default history',
        'premises_status_encoded'     => 'Business premises stability',
        'coverage_days'               => 'Financial history coverage',
        'dscr'                        => 'Debt service coverage',
        'loan_amount_to_revenue'      => 'Loan-to-revenue ratio',
        // LSTM signals
        'lstm_risk_signal'            => 'AI trend risk signal',
        'lstm_trend_signal'           => 'AI growth trend signal',
        'lstm_volatility_signal'      => 'AI volatility signal',
        // Macro
        'usd_etb_rate'                => 'Exchange rate environment',
        'nbe_policy_rate'             => 'Central bank interest rate',
        'inflation_composite'         => 'Inflation environment',
        // Legacy aliases
        'net_cashflow_trend'          => 'Cash flow growth trend',
    ];

    /** Actionable improvement tips for top negative drivers */
    private static array $tipMap = [
        'cashflow_volatility_30d'    => 'More consistent daily transactions strengthen your credit profile.',
        'cashflow_volatility_7d'     => 'Aim for steady revenue over the coming weeks.',
        'missed_payment_ratio'       => 'Maintaining a clean payment record significantly boosts your profile.',
        'payment_completion_rate'    => 'Ensure all obligations are paid on time to improve this score.',
        'avg_net_cashflow_30d'       => 'Increasing your monthly net income improves your evaluation.',
        'avg_net_cashflow_14d'       => 'Focus on growing net income over the next two weeks.',
        'min_net_cashflow_30d'       => 'Avoid days where expenses exceed revenue to stabilise your profile.',
        'negative_cashflow_days_30d' => 'Reduce the number of days where expenses exceed revenue.',
        'txn_count_avg_30d'          => 'Higher transaction volume signals an active business to our AI.',
        'avg_txn_count_30d'          => 'Higher transaction volume signals an active business to our AI.',
        'unique_cust_avg_30d'        => 'Growing your customer base diversifies your revenue risk.',
        'positive_cashflow_ratio'    => 'Aim for more days with positive net cash flow.',
        'conscientiousness_score'    => 'Completing the psychometric assessment helps build your profile.',
        'integrity_score'            => 'Consistent financial behavior improves your integrity score.',
        'coverage_days'              => 'Uploading more transaction history gives the AI better data to evaluate.',
        'has_default_history'        => 'Resolve any outstanding obligations to clear your default history.',
        'outstanding_ratio'          => 'Reducing existing debt obligations improves this factor.',
        'cashflow_trend'             => 'A consistent upward trend in cash flow strengthens your profile.',
        'avg_inflow_30d'             => 'Growing your monthly revenue positively impacts this factor.',
        'lstm_risk_signal'           => 'Improving your recent transaction patterns will reduce this signal.',
        'lstm_volatility_signal'     => 'More predictable daily cash flows will lower this volatility signal.',
        'risk_tolerance_score'       => 'Completing the full psychometric assessment provides more data to work with.',
    ];

    public static function toLabel(string $featureKey): string
    {
        return self::$labelMap[$featureKey] ?? ucwords(str_replace('_', ' ', $featureKey));
    }

    public static function toTip(string $featureKey): ?string
    {
        return self::$tipMap[$featureKey] ?? null;
    }

    /**
     * Transform raw shap_values dict into categorised driver arrays.
     *
     * Returns:
     *   [
     *     'boosters' => [['label'=>..., 'value'=>..., 'feature'=>...], ...],  // top 3 positive
     *     'drags'    => [['label'=>..., 'value'=>..., 'feature'=>..., 'tip'=>...], ...],  // top 3 negative
     *   ]
     */
    public static function categorise(array $shapValues, int $topN = 3): array
    {
        $boosters = [];
        $drags    = [];

        foreach ($shapValues as $feature => $value) {
            $entry = [
                'label'   => self::toLabel($feature),
                'value'   => $value,
                'feature' => $feature,
            ];

            if ($value >= 0) {
                $boosters[] = $entry;
            } else {
                $entry['tip'] = self::toTip($feature);
                $drags[]      = $entry;
            }
        }

        usort($boosters, fn ($a, $b) => $b['value'] <=> $a['value']);
        usort($drags, fn ($a, $b) => $a['value'] <=> $b['value']); // most negative first

        return [
            'boosters' => array_slice($boosters, 0, $topN),
            'drags'    => array_slice($drags, 0, $topN),
        ];
    }
}
