export type AiHealth = {
    status: 'healthy' | 'degraded' | 'unreachable';
    latency: number | null;
};

export type DbHealth = {
    status: 'connected' | 'error';
    latency: number | null;
    host: string;
};

export type DashboardUser = {
    name: string;
    email: string;
};

export type SmeOwnerStats = {
    business: { name: string; sector: string } | null;
    heartbeatDays: number;
    hasAssessment: boolean;
    application: {
        id: number;
        status: string;
        requested_amount: string | number;
        tenure_months: number;
        npv_credit_limit: string | number | null;
        apr: string | number | null;
        ai_risk_band: string | null;
        ai_risk_score: string | number | null;
        created_at: string;
    } | null;
    checklist: {
        businessRegistered: boolean;
        heartbeatLoaded: boolean;
        assessmentCompleted: boolean;
        applicationSubmitted: boolean;
        aiEvaluated: boolean;
        decisionReceived: boolean;
    };
};

export type LoanOfficerStats = {
    counts: Record<string, number>;
    attentionCount: number;
    todayApproved: number;
    todayRejected: number;
    recentApps: Array<{
        id: number;
        business_id: number;
        business_name: string | null;
        sector: string | null;
        requested_amount: string | number;
        status: string;
        ai_risk_band: string | null;
        created_at: string;
    }>;
    aiHealth: AiHealth;
    dbHealth: DbHealth;
};

export type SuperAdminStats = {
    totalBusinesses: number;
    totalApplications: number;
    appsByStatus: Record<string, number>;
    lastAuditDate: string | null;
    lastTraining: { status: string; updated_at: string } | null;
    aiHealth: AiHealth;
    dbHealth: DbHealth;
    recentActivity: Array<{
        created_at: string | null;
        action: string;
        actor_name: string;
        entity_type: string;
    }>;
};

export type DashboardPageProps = {
    role: string;
    user: DashboardUser;
    stats: SmeOwnerStats | LoanOfficerStats | SuperAdminStats | Record<string, never>;
};
