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
    // Legacy keys retained for backwards compatibility
    business: { name: string; sector: string } | null;
    heartbeatDays: number;
    hasAssessment: boolean;
    application: {
        id: number;
        status: string;
        requested_amount: string | number;
        tenure_months: number;
        /** Retained for SmeLatestApplicationCard — not shown in redesigned SME dashboard */
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

    // Redesigned dashboard keys
    hasBusiness: boolean;
    latestApplication: {
        status: string;
        requested_amount: number;
        apr: number | null;
        risk_band: string | null;
        submitted_at: string | null;
    } | null;
    psychometricAssessment: {
        completed: boolean;
        completed_at: string | null;
        composite_score: number | null;
    } | null;
    cashflowTrend: Array<{ date: string; net: number }>;
    txnActivity: {
        avg_recent: number;
        trend_pct: number;
        direction: 'up' | 'down';
    } | null;
    coverageDays: number;
    healthScore: number;
    shapDrivers: {
        boosters: Array<{ label: string; value: number; feature: string }>;
        drags: Array<{ label: string; value: number; feature: string; tip?: string }>;
    };
};

export type LoanProviderAnalytics = {
    statusDistribution: Record<string, number>;
    riskBandDistribution: { low: number; medium: number; high: number };
    volumeTrend: Array<{ date: string; count: number }>;
    creditLimitDistribution: Record<string, number>;
    sectorBreakdown: Record<string, number>;
};

export type LoanOfficerStats = {
    counts: Record<string, number>;
    attentionCount: number;
    todayApproved: number;
    todayRejected: number;
    totalActive: number;
    evaluatedThisMonth: number;
    avgRiskScore: number | null;
    avgNpvLimit: number | null;
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
    analytics: LoanProviderAnalytics;
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
