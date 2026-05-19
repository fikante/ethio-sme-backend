export type ShapDriver = {
    feature: string;
    value: number;
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

export type BusinessSummary = {
    id: number;
    uuid: string;
    business_name: string;
    sector: string;
    sub_city: string;
};

export type ApplicationRiskRow = {
    id: number;
    status: string;
    business_name: string | null;
    business_uuid: string | null;
    ai_risk_score: string | number | null;
    npv_credit_limit: string | number | null;
    p10: (string | number)[] | null;
    p50: (string | number)[] | null;
    valuation_status: string | null;
    inferred_at: string | null;
};

export type TrainingJobRow = {
    id: string;
    external_job_id: string | null;
    status: string;
    created_at: string;
    completed_at: string | null;
    error_message: string | null;
};
