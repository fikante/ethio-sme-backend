export type ShapDriver = {
    feature: string;
    value: number;
};

export type ReasonCodeRow = {
    code: string;
    message?: string | null;
};

export type ValuationView = {
    id: number;
    status: string;
    inferred_at: string | null;
    npv_etb: string | number | null;
    mapped_limit_etb: string | number | null;
    xgboost_score: string | number | null;
    xgboost_class: string | null;
    p10_series: (string | number)[] | null;
    p50_series: (string | number)[] | null;
    p90_series: (string | number)[] | null;
    model_versions: Record<string, string> | null;
    shap: ShapDriver[];
};

export type PipelineApplication = {
    id: number;
    status: string;
    business_name: string | null;
    sector: string | null;
    requested_amount: string | number;
    requested_tenure_months: number;
    ai_risk_band: string | null;
    ai_risk_score: string | number | null;
    npv_credit_limit: string | number | null;
    is_degraded: boolean;
    created_at: string;
    can_run_ai: boolean;
    can_review: boolean;
};

export type RiskForecastDetail = {
    id: number;
    status: string;
    requested_amount: string | number;
    business_name: string | null;
    business_uuid: string | null;
    ai_risk_band: string | null;
    ai_risk_score: string | number | null;
    prob_default: string | number | null;
    npv_credit_limit: string | number | null;
    forecaster_mode: string | null;
    is_degraded: boolean;
    p10_cashflow_forecast: (string | number)[];
    p50_cashflow_forecast: (string | number)[];
    p90_cashflow_forecast: (string | number)[];
    shap_values: Record<string, number>;
    reason_codes: ReasonCodeRow[] | string[];
    contract_version: string;
    model_versions: Record<string, string>;
    shap_integrity_passed: boolean | null;
    feature_snapshot_hash: string | null;
    inferred_at: string | null;
    horizon_reliability_warning: boolean;
    horizon_reliability_message: string | null;
    decided_at: string | null;
    reviewer_name: string | null;
    rejection_narrative: string | null;
};

export type ApplicationRiskRow = {
    id: number;
    status: string;
    business_name: string | null;
};

export type TrainingJobRow = {
    id: string;
    external_job_id: string | null;
    status: string;
    created_at: string;
    completed_at: string | null;
    error_message: string | null;
};
