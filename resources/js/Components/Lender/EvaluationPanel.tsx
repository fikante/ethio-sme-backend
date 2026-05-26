import CashFlowForecastChart from "@/features/valuation/components/CashFlowForecastChart";
import ShapAttributionChart from "@/features/valuation/components/ShapAttributionChart";
import { formatEtb, formatPercentFraction } from "@/lib/format";
import { axios } from "@/bootstrap";
import { router } from "@inertiajs/react";
import {
    AlertCircle,
    BadgeCheck,
    CheckCircle,
    TriangleAlert,
    X,
    XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ApplicationDetailData = {
    id: number;
    status: string;
    requested_amount: string | number;
    requested_tenure_months: number;
    is_degraded: boolean;
    ai_risk_band: string | null;
    ai_risk_score: string | number | null;
    prob_default: string | number | null;
    npv_credit_limit: string | number | null;
    p10_cashflow_forecast: (string | number)[];
    p50_cashflow_forecast: (string | number)[];
    p90_cashflow_forecast: (string | number)[];
    shap_values: Record<string, number>;
    reason_codes: Array<string | { code: string; message?: string | null }>;
    shap_integrity_passed: boolean | null;
    contract_version: string;
    model_versions: Record<string, string>;
    feature_snapshot_hash: string | null;
    inferred_at: string | null;
    forecaster_mode: string | null;
    horizon_reliability_warning: boolean;
    horizon_reliability_message: string | null;
    decided_at: string | null;
    reviewer_name: string | null;
    rejection_narrative: string | null;
    rejection_reason_code: string | null;
    officer_notes: string | null;
    business_name: string | null;
    sector: string | null;
    sub_city: string | null;
    established_year: number | null;
    employee_count: number | null;
    premises_status: string | null;
    data_coverage_days: number;
    loan_provider_name: string | null;
    created_at: string | null;
    psychometric: {
        integrity_score: number | null;
        conscientiousness_score: number | null;
        delayed_gratification_score: number | null;
        financial_risk_score: number | null;
    } | null;
};

type NormalizedReasonCode = {
    code: string;
    message: string;
    direction: "risk-increasing" | "risk-reducing";
};

type ToastState = {
    message: string;
    variant: "success" | "error";
} | null;

type Props = {
    applicationId: number;
    onClose: () => void;
    onDecision: () => void;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REASON_CODE_LABELS: Record<string, string> = {
    FAILURE_RATE_HIGH: "High transaction failure rate detected",
    CASHFLOW_P10_INSUFFICIENT: "P10 cash flow below required debt service threshold",
    RISK_SCORE_THRESHOLD: "AI risk score exceeds high-risk threshold",
    PSYCHOMETRIC_LOW_CONSCIENTIOUSNESS: "Below-average financial conscientiousness score",
    MACRO_STRESS: "Elevated macroeconomic risk environment",
};

// Codes that indicate risk-increasing (adverse) findings
const RISK_INCREASING_CODES = new Set([
    "FAILURE_RATE_HIGH",
    "CASHFLOW_P10_INSUFFICIENT",
    "RISK_SCORE_THRESHOLD",
    "PSYCHOMETRIC_LOW_CONSCIENTIOUSNESS",
    "MACRO_STRESS",
]);

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function normalizeReasonCodes(
    codes: Array<string | { code: string; message?: string | null }>,
): NormalizedReasonCode[] {
    return codes.map((item) => {
        let code: string;
        let rawMessage: string;
        if (typeof item === "string") {
            const parts = item.split(":", 2);
            code = parts[0].trim();
            rawMessage = parts[1]?.trim() ?? item;
        } else {
            code = item.code;
            rawMessage = item.message ?? item.code;
        }

        const message = REASON_CODE_LABELS[code] ?? rawMessage;
        const direction: "risk-increasing" | "risk-reducing" = RISK_INCREASING_CODES.has(code)
            ? "risk-increasing"
            : "risk-reducing";

        return { code, message, direction };
    });
}

function riskBandColors(band: string | null): {
    badge: string;
    text: string;
    border: string;
} {
    switch (band?.toLowerCase()) {
        case "low":
            return {
                badge: "bg-emerald-600 text-white",
                text: "text-emerald-400",
                border: "border-emerald-500",
            };
        case "medium":
            return {
                badge: "bg-amber-500 text-white",
                text: "text-amber-400",
                border: "border-amber-500",
            };
        case "high":
            return {
                badge: "bg-red-600 text-white",
                text: "text-red-400",
                border: "border-red-500",
            };
        default:
            return {
                badge: "bg-zinc-600 text-white",
                text: "text-zinc-400",
                border: "border-zinc-500",
            };
    }
}

function coverageRatioClass(ratio: number): string {
    if (ratio >= 100) return "text-emerald-400";
    if (ratio >= 75) return "text-amber-400";
    return "text-red-400";
}

function aiRecommendation(band: string | null): {
    text: string;
    className: string;
} {
    switch (band?.toLowerCase()) {
        case "low":
            return {
                text: "AI Recommendation: Consider Approval",
                className: "text-emerald-400",
            };
        case "medium":
            return {
                text: "AI Recommendation: Review Carefully",
                className: "text-amber-400",
            };
        case "high":
            return {
                text: "AI Recommendation: High Risk — Exercise Caution",
                className: "text-red-400",
            };
        default:
            return {
                text: "AI Recommendation: Insufficient data to recommend",
                className: "text-zinc-400",
            };
    }
}

function humaniseSector(sector: string | null): string {
    if (!sector) return "—";
    return sector.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function humanisePremises(status: string | null): string {
    if (!status) return "—";
    return status.charAt(0).toUpperCase() + status.slice(1);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SkeletonLoader() {
    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-8 animate-pulse">
            <div className="space-y-3">
                <div className="h-8 w-64 rounded-lg bg-zinc-700" />
                <div className="h-4 w-48 rounded bg-zinc-800" />
            </div>
            <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-xl bg-zinc-800" />
                ))}
            </div>
            <div className="h-72 rounded-xl bg-zinc-800" />
            <div className="h-64 rounded-xl bg-zinc-800" />
            <div className="grid grid-cols-2 gap-3">
                <div className="h-20 rounded-lg bg-zinc-800" />
                <div className="h-20 rounded-lg bg-zinc-800" />
                <div className="h-20 rounded-lg bg-zinc-800" />
            </div>
        </div>
    );
}

function PsychometricBar({
    label,
    value,
}: {
    label: string;
    value: number | null;
}) {
    const pct = value ?? 0;
    const color =
        pct >= 70
            ? "bg-emerald-500"
            : pct >= 40
              ? "bg-amber-500"
              : "bg-red-500";

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">{label}</span>
                <span className="font-mono text-zinc-300">
                    {value !== null ? `${pct.toFixed(0)}%` : "—"}
                </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-700">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${color}`}
                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                />
            </div>
        </div>
    );
}

function ApproveConfirmModal({
    data,
    onConfirm,
    onCancel,
    submitting,
    error,
}: {
    data: ApplicationDetailData;
    onConfirm: (notes: string) => void;
    onCancel: () => void;
    submitting: boolean;
    error: string | null;
}) {
    const [notes, setNotes] = useState("");

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onCancel}
            />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
                <div className="mb-5 flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-white">
                            Confirm Loan Approval
                        </h3>
                        <p className="mt-1 text-sm text-zinc-400">
                            This action is permanent and cannot be undone.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="ml-4 rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="mb-5 space-y-2 rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm">
                    <p className="text-zinc-300">
                        <span className="font-medium text-white">Business:</span>{" "}
                        {data.business_name ?? "—"}
                    </p>
                    <p className="text-zinc-300">
                        <span className="font-medium text-white">
                            Requested Amount:
                        </span>{" "}
                        {formatEtb(data.requested_amount)}
                    </p>
                    <p className="text-zinc-300">
                        <span className="font-medium text-white">
                            NPV Credit Limit:
                        </span>{" "}
                        <span className="text-emerald-400 font-semibold">
                            {formatEtb(data.npv_credit_limit)}
                        </span>
                    </p>
                </div>

                <div className="mb-5">
                    <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                        Add a note{" "}
                        <span className="font-normal text-zinc-500">(optional)</span>
                    </label>
                    <textarea
                        className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                        rows={3}
                        placeholder="e.g. Strong cash flow trajectory supports approval..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                {error && (
                    <p className="mb-4 rounded-lg border border-red-800 bg-red-950/30 px-3 py-2 text-sm text-red-400">
                        {error}
                    </p>
                )}

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => onConfirm(notes)}
                        disabled={submitting}
                        className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting ? "Approving…" : "Confirm Approval"}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={submitting}
                        className="flex-1 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

function RejectConfirmModal({
    data,
    reasonCodes,
    onConfirm,
    onCancel,
    submitting,
    error,
}: {
    data: ApplicationDetailData;
    reasonCodes: NormalizedReasonCode[];
    onConfirm: (primaryCode: string, notes: string) => void;
    onCancel: () => void;
    submitting: boolean;
    error: string | null;
}) {
    const [selectedCode, setSelectedCode] = useState("");
    const [notes, setNotes] = useState("");

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onCancel}
            />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
                <div className="mb-5 flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-white">
                            Confirm Loan Rejection
                        </h3>
                        <p className="mt-1 text-sm text-zinc-400">
                            A primary reason code is required by regulation.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="ml-4 rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="mb-5">
                    <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                        Primary Reason Code{" "}
                        <span className="text-red-400">*</span>
                    </label>
                    <select
                        value={selectedCode}
                        onChange={(e) => setSelectedCode(e.target.value)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                    >
                        <option value="">Select a reason code…</option>
                        {reasonCodes.length > 0 ? (
                            reasonCodes.map((rc) => (
                                <option key={rc.code} value={rc.code}>
                                    {rc.code} — {rc.message}
                                </option>
                            ))
                        ) : (
                            Object.entries(REASON_CODE_LABELS).map(([code, label]) => (
                                <option key={code} value={code}>
                                    {code} — {label}
                                </option>
                            ))
                        )}
                    </select>
                </div>

                <div className="mb-5">
                    <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                        Additional notes{" "}
                        <span className="font-normal text-zinc-500">(optional)</span>
                    </label>
                    <textarea
                        className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                        rows={3}
                        placeholder="e.g. Cash flow volatility exceeds institutional threshold..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                {error && (
                    <p className="mb-4 rounded-lg border border-red-800 bg-red-950/30 px-3 py-2 text-sm text-red-400">
                        {error}
                    </p>
                )}

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => onConfirm(selectedCode, notes)}
                        disabled={submitting || !selectedCode}
                        className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting ? "Rejecting…" : "Confirm Rejection"}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={submitting}
                        className="flex-1 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

function Toast({
    toast,
    onDismiss,
}: {
    toast: NonNullable<ToastState>;
    onDismiss: () => void;
}) {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 4000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 shadow-2xl">
            {toast.variant === "success" ? (
                <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
            ) : (
                <XCircle className="h-5 w-5 shrink-0 text-red-400" />
            )}
            <p className="text-sm font-medium text-white">{toast.message}</p>
            <button
                type="button"
                onClick={onDismiss}
                className="ml-1 rounded p-0.5 text-zinc-400 hover:text-white"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main EvaluationPanel component
// ---------------------------------------------------------------------------

export default function EvaluationPanel({
    applicationId,
    onClose,
    onDecision,
}: Props) {
    const [data, setData] = useState<ApplicationDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [decisionError, setDecisionError] = useState<string | null>(null);
    const [toast, setToast] = useState<ToastState>(null);
    const abortRef = useRef<AbortController | null>(null);

    const dismissToast = useCallback(() => setToast(null), []);

    const fetchData = useCallback(() => {
        setLoading(true);
        setFetchError(null);

        try {
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            axios
                .get<ApplicationDetailData>(`/lender/applications/${applicationId}/detail`, {
                    signal: controller.signal,
                })
                .then(({ data: json }) => {
                    setData(json);
                    setLoading(false);
                })
                .catch((err: unknown) => {
                    const axErr = err as { code?: string; message?: string };
                    if (axErr?.code === "ERR_CANCELED") return;
                    setFetchError(axErr?.message ?? "Failed to load application data.");
                    setLoading(false);
                });
        } catch (err: unknown) {
            const e = err as { message?: string };
            setFetchError(e?.message ?? "Failed to initialize request.");
            setLoading(false);
        }
    }, [applicationId]);

    useEffect(() => {
        fetchData();
        return () => abortRef.current?.abort();
    }, [fetchData]);

    // Close on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    // Derived data
    const reasonCodes = useMemo(
        () => (data ? normalizeReasonCodes(data.reason_codes) : []),
        [data],
    );

    const shapEntries = useMemo(() => {
        if (!data?.shap_values) return [];
        return Object.entries(data.shap_values)
            .map(([feature, value]) => ({ feature, value: Number(value) }))
            .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
            .slice(0, 12);
    }, [data]);

    const forecastAllZero = useMemo(() => {
        if (!data) return true;
        const all = [
            ...data.p10_cashflow_forecast,
            ...data.p50_cashflow_forecast,
            ...data.p90_cashflow_forecast,
        ].map(Number);
        return all.length === 0 || all.every((v) => v === 0);
    }, [data]);

    const coverageRatio = useMemo(() => {
        if (!data?.npv_credit_limit || !data?.requested_amount) return null;
        const limit = Number(data.npv_credit_limit);
        const requested = Number(data.requested_amount);
        if (requested === 0) return null;
        return (limit / requested) * 100;
    }, [data]);

    function handleApproveConfirm(notes: string) {
        if (!data) return;
        setSubmitting(true);
        setDecisionError(null);

        router.post(
            route("decisioning.decide", { application: data.id }),
            {
                decision: "approved",
                reason_codes: [],
                officer_notes: notes || undefined,
            },
            {
                onSuccess: () => {
                    setSubmitting(false);
                    setShowApproveModal(false);
                    setToast({
                        message: "Application approved successfully.",
                        variant: "success",
                    });
                    onDecision();
                    onClose();
                },
                onError: (errors) => {
                    setSubmitting(false);
                    const msg = Object.values(errors).flat().join(" ");
                    setDecisionError(msg || "Approval failed. Please try again.");
                },
            },
        );
    }

    function handleRejectConfirm(primaryCode: string, notes: string) {
        if (!data) return;
        setSubmitting(true);
        setDecisionError(null);

        router.post(
            route("decisioning.decide", { application: data.id }),
            {
                decision: "rejected",
                reason_codes: [primaryCode],
                rejection_reason_code: primaryCode,
                narrative: notes || undefined,
                officer_notes: notes || undefined,
            },
            {
                onSuccess: () => {
                    setSubmitting(false);
                    setShowRejectModal(false);
                    setToast({
                        message: "Application rejected.",
                        variant: "error",
                    });
                    onDecision();
                    onClose();
                },
                onError: (errors) => {
                    setSubmitting(false);
                    const msg = Object.values(errors).flat().join(" ");
                    setDecisionError(msg || "Rejection failed. Please try again.");
                },
            },
        );
    }

    const bandColors = riskBandColors(data?.ai_risk_band ?? null);
    const recommendation = aiRecommendation(data?.ai_risk_band ?? null);

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-4xl flex-col bg-zinc-900 shadow-2xl">
                {/* Sticky header */}
                <div className="flex shrink-0 items-start justify-between border-b border-zinc-800 px-6 py-5">
                    <div className="min-w-0 flex-1 pr-4">
                        {loading ? (
                            <div className="space-y-2 animate-pulse">
                                <div className="h-7 w-72 rounded-lg bg-zinc-700" />
                                <div className="h-4 w-48 rounded bg-zinc-800" />
                            </div>
                        ) : data ? (
                            <>
                                <h2 className="truncate text-xl font-bold text-white">
                                    {data.business_name ?? "Unknown Business"}
                                </h2>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                                    <span>{humaniseSector(data.sector)}</span>
                                    <span className="text-zinc-600">&bull;</span>
                                    <span className="font-mono text-xs">
                                        App #{data.id}
                                    </span>
                                    {data.loan_provider_name && (
                                        <>
                                            <span className="text-zinc-600">&bull;</span>
                                            <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs">
                                                {data.loan_provider_name}
                                            </span>
                                        </>
                                    )}
                                    {data.is_degraded && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-700 bg-amber-950/40 px-2 py-0.5 text-xs text-amber-400">
                                            <TriangleAlert className="h-3 w-3" />
                                            Degraded Mode
                                        </span>
                                    )}
                                </div>
                                <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-zinc-500">
                                    {data.created_at && (
                                        <span>
                                            Submitted:{" "}
                                            {new Date(data.created_at).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </span>
                                    )}
                                    {data.inferred_at && (
                                        <span>
                                            Evaluated:{" "}
                                            {new Date(data.inferred_at).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </span>
                                    )}
                                </div>
                            </>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                        aria-label="Close panel"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Scrollable content */}
                {loading ? (
                    <SkeletonLoader />
                ) : fetchError ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                        <AlertCircle className="h-12 w-12 text-red-400" />
                        <div>
                            <p className="text-lg font-semibold text-white">
                                Failed to load evaluation data
                            </p>
                            <p className="mt-1 text-sm text-zinc-400">{fetchError}</p>
                        </div>
                        <button
                            type="button"
                            onClick={fetchData}
                            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                        >
                            Try Again
                        </button>
                    </div>
                ) : data ? (
                    <div className="flex-1 overflow-y-auto">
                        <div className="space-y-8 p-6">
                            {/* ── Section 1: Risk Summary KPI cards ── */}
                            <section>
                                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                                    Risk Summary
                                </h3>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    {/* Risk Band */}
                                    <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-4">
                                        <p className="text-xs font-medium uppercase text-zinc-500">
                                            Risk Band
                                        </p>
                                        <p
                                            className={`mt-2 inline-flex rounded-lg px-3 py-1.5 text-xl font-bold capitalize ${bandColors.badge}`}
                                        >
                                            {data.ai_risk_band ?? "—"}
                                        </p>
                                    </div>

                                    {/* AI Risk Score */}
                                    <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-4">
                                        <p className="text-xs font-medium uppercase text-zinc-500">
                                            AI Risk Score
                                        </p>
                                        <p
                                            className={`mt-2 text-2xl font-bold tabular-nums ${bandColors.text}`}
                                        >
                                            {formatPercentFraction(data.ai_risk_score)}
                                        </p>
                                    </div>

                                    {/* Probability of Default */}
                                    <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-4">
                                        <p className="text-xs font-medium uppercase text-zinc-500">
                                            Prob. of Default
                                        </p>
                                        <p className="mt-2 text-2xl font-bold tabular-nums text-white">
                                            {formatPercentFraction(data.prob_default)}
                                        </p>
                                    </div>

                                    {/* NPV Credit Limit */}
                                    <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-4">
                                        <p className="text-xs font-medium uppercase text-zinc-500">
                                            NPV Credit Limit
                                        </p>
                                        <p
                                            className={`mt-2 text-xl font-bold ${data.npv_credit_limit === null ? "text-amber-400" : "text-white"}`}
                                        >
                                            {formatEtb(data.npv_credit_limit)}
                                        </p>
                                    </div>

                                    {/* Requested Amount */}
                                    <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-4">
                                        <p className="text-xs font-medium uppercase text-zinc-500">
                                            Requested Amount
                                        </p>
                                        <p className="mt-2 text-xl font-bold text-white">
                                            {formatEtb(data.requested_amount)}
                                        </p>
                                    </div>

                                    {/* Coverage Ratio */}
                                    <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-4">
                                        <p className="text-xs font-medium uppercase text-zinc-500">
                                            Coverage Ratio
                                        </p>
                                        {coverageRatio !== null ? (
                                            <p
                                                className={`mt-2 text-2xl font-bold tabular-nums ${coverageRatioClass(coverageRatio)}`}
                                            >
                                                {coverageRatio.toFixed(0)}%
                                            </p>
                                        ) : (
                                            <p className="mt-2 text-xl font-bold text-zinc-500">
                                                —
                                            </p>
                                        )}
                                        <p className="mt-0.5 text-xs text-zinc-600">
                                            Limit / Requested
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* ── Section 2: Cash Flow Forecast ── */}
                            <section>
                                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                                    30-Day Cash Flow Forecast
                                </h3>
                                <div className="relative rounded-xl border border-zinc-800 bg-zinc-800/30 p-4">
                                    {forecastAllZero ? (
                                        <div className="flex h-64 items-center justify-center">
                                            <p className="text-sm font-medium text-zinc-500">
                                                Forecast unavailable — insufficient heartbeat data
                                            </p>
                                        </div>
                                    ) : (
                                        <CashFlowForecastChart
                                            p10={data.p10_cashflow_forecast}
                                            p50={data.p50_cashflow_forecast}
                                            p90={data.p90_cashflow_forecast}
                                            height={320}
                                        />
                                    )}
                                </div>
                                <p className="mt-1.5 text-xs text-zinc-600">
                                    P10 = Pessimistic floor &nbsp;&bull;&nbsp; P50 = Median
                                    forecast &nbsp;&bull;&nbsp; P90 = Optimistic scenario
                                </p>
                            </section>

                            {/* ── Section 3: SHAP Feature Attribution ── */}
                            <section>
                                <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                                    SHAP Feature Attribution
                                </h3>
                                <p className="mb-3 text-xs text-zinc-600">
                                    <span className="font-medium text-red-400">Red bars</span>{" "}
                                    increase risk &nbsp;&bull;&nbsp;
                                    <span className="font-medium text-emerald-400">
                                        Green bars
                                    </span>{" "}
                                    reduce risk
                                </p>
                                <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-4">
                                    {shapEntries.length > 0 ? (
                                        <ShapAttributionChart entries={shapEntries} />
                                    ) : (
                                        <p className="py-8 text-center text-sm text-zinc-500">
                                            No SHAP values available for this application.
                                        </p>
                                    )}
                                </div>
                            </section>

                            {/* ── Section 4: Reason Codes ── */}
                            <section>
                                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                                    Reason Codes
                                </h3>
                                {reasonCodes.length === 0 ? (
                                    <p className="text-sm text-zinc-500">
                                        No reason codes flagged for this application.
                                    </p>
                                ) : (
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {reasonCodes.map((rc) => (
                                            <div
                                                key={rc.code}
                                                className={`flex gap-3 rounded-lg border bg-zinc-800/50 p-4 ${
                                                    rc.direction === "risk-increasing"
                                                        ? "border-l-4 border-zinc-800 border-l-red-500"
                                                        : "border-l-4 border-zinc-800 border-l-emerald-500"
                                                }`}
                                            >
                                                <AlertCircle
                                                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                                                        rc.direction === "risk-increasing"
                                                            ? "text-red-400"
                                                            : "text-emerald-400"
                                                    }`}
                                                />
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="rounded bg-zinc-700 px-2 py-0.5 font-mono text-xs text-zinc-200">
                                                            {rc.code}
                                                        </span>
                                                        <span
                                                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                                                rc.direction === "risk-increasing"
                                                                    ? "bg-red-950/60 text-red-400"
                                                                    : "bg-emerald-950/60 text-emerald-400"
                                                            }`}
                                                        >
                                                            {rc.direction === "risk-increasing"
                                                                ? "Risk-Increasing"
                                                                : "Risk-Reducing"}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1.5 text-sm text-zinc-300">
                                                        {rc.message}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* SHAP Integrity Badge */}
                                <div className="mt-4 flex items-center gap-2">
                                    {data.shap_integrity_passed === true ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800 bg-emerald-950/40 px-3 py-1 text-xs font-medium text-emerald-400">
                                            <BadgeCheck className="h-3.5 w-3.5" />
                                            SHAP Verified
                                        </span>
                                    ) : data.shap_integrity_passed === false ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-800 bg-amber-950/40 px-3 py-1 text-xs font-medium text-amber-400">
                                            <TriangleAlert className="h-3.5 w-3.5" />
                                            SHAP Warning
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-400">
                                            SHAP Not Checked
                                        </span>
                                    )}
                                </div>
                            </section>

                            {/* ── Section 5: Business Profile Context ── */}
                            <section>
                                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                                    Business Profile
                                </h3>
                                <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-5">
                                    <dl className="mb-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                                        <div>
                                            <dt className="text-zinc-500">Business Name</dt>
                                            <dd className="font-medium text-white">
                                                {data.business_name ?? "—"}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-zinc-500">Sector</dt>
                                            <dd className="font-medium text-white">
                                                {humaniseSector(data.sector)}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-zinc-500">Sub-city / Region</dt>
                                            <dd className="font-medium text-white">
                                                {data.sub_city ?? "—"}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-zinc-500">Established</dt>
                                            <dd className="font-medium text-white">
                                                {data.established_year ?? "—"}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-zinc-500">Employees</dt>
                                            <dd className="font-medium text-white">
                                                {data.employee_count ?? "—"}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-zinc-500">Premises</dt>
                                            <dd className="font-medium text-white">
                                                {humanisePremises(data.premises_status)}
                                            </dd>
                                        </div>
                                    </dl>

                                    {/* Psychometric mini bars */}
                                    {data.psychometric ? (
                                        <div className="space-y-3 border-t border-zinc-700 pt-4">
                                            <p className="text-xs font-medium uppercase text-zinc-500">
                                                Psychometric Profile
                                            </p>
                                            <PsychometricBar
                                                label="Integrity Score"
                                                value={data.psychometric.integrity_score}
                                            />
                                            <PsychometricBar
                                                label="Conscientiousness Score"
                                                value={data.psychometric.conscientiousness_score}
                                            />
                                            <PsychometricBar
                                                label="Risk Tolerance"
                                                value={data.psychometric.financial_risk_score}
                                            />
                                            <PsychometricBar
                                                label="Delayed Gratification"
                                                value={data.psychometric.delayed_gratification_score}
                                            />
                                        </div>
                                    ) : (
                                        <p className="mt-3 border-t border-zinc-700 pt-4 text-sm text-zinc-500">
                                            Psychometric assessment not completed.
                                        </p>
                                    )}

                                    {/* Data coverage */}
                                    <div className="mt-4 border-t border-zinc-700 pt-4">
                                        <p className="text-sm text-zinc-400">
                                            <span
                                                className={`font-semibold ${
                                                    data.data_coverage_days >= 180
                                                        ? "text-emerald-400"
                                                        : data.data_coverage_days >= 45
                                                          ? "text-amber-400"
                                                          : "text-red-400"
                                                }`}
                                            >
                                                {data.data_coverage_days} days
                                            </span>{" "}
                                            of heartbeat data available
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* ── Section 6: Credit Decision ── */}
                            <section className="pb-6">
                                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                                    Credit Decision
                                </h3>

                                {data.status === "evaluated" ? (
                                    <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-5">
                                        {/* AI recommendation hint */}
                                        <p
                                            className={`mb-5 text-sm font-medium ${recommendation.className}`}
                                        >
                                            {recommendation.text}
                                        </p>
                                        <div className="flex gap-4">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDecisionError(null);
                                                    setShowApproveModal(true);
                                                }}
                                                disabled={submitting}
                                                className="flex-1 rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDecisionError(null);
                                                    setShowRejectModal(true);
                                                }}
                                                disabled={submitting}
                                                className="flex-1 rounded-xl bg-red-600 px-6 py-3 text-base font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-5 space-y-3">
                                        {/* Terminal outcome display */}
                                        <div className="flex items-center gap-3">
                                            {data.status === "approved" ? (
                                                <CheckCircle className="h-6 w-6 text-emerald-400" />
                                            ) : data.status === "rejected" ? (
                                                <XCircle className="h-6 w-6 text-red-400" />
                                            ) : null}
                                            <span
                                                className={`text-lg font-semibold capitalize ${
                                                    data.status === "approved"
                                                        ? "text-emerald-400"
                                                        : data.status === "rejected"
                                                          ? "text-red-400"
                                                          : "text-zinc-400"
                                                }`}
                                            >
                                                {data.status}
                                            </span>
                                        </div>

                                        <div className="space-y-1.5 text-sm text-zinc-400">
                                            {data.reviewer_name && (
                                                <p>
                                                    <span className="text-zinc-500">
                                                        Decided by:
                                                    </span>{" "}
                                                    <span className="text-zinc-300">
                                                        {data.reviewer_name}
                                                    </span>
                                                </p>
                                            )}
                                            {data.decided_at && (
                                                <p>
                                                    <span className="text-zinc-500">
                                                        Decision date:
                                                    </span>{" "}
                                                    <span className="text-zinc-300">
                                                        {new Date(
                                                            data.decided_at,
                                                        ).toLocaleString()}
                                                    </span>
                                                </p>
                                            )}
                                            {data.rejection_reason_code && (
                                                <p>
                                                    <span className="text-zinc-500">
                                                        Rejection code:
                                                    </span>{" "}
                                                    <span className="rounded bg-zinc-700 px-1.5 py-0.5 font-mono text-xs text-zinc-200">
                                                        {data.rejection_reason_code}
                                                    </span>
                                                </p>
                                            )}
                                            {data.officer_notes && (
                                                <div>
                                                    <span className="text-zinc-500">
                                                        Officer notes:
                                                    </span>
                                                    <p className="mt-1 rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-xs leading-relaxed text-zinc-300">
                                                        {data.officer_notes}
                                                    </p>
                                                </div>
                                            )}
                                            {data.rejection_narrative &&
                                                !data.officer_notes && (
                                                    <div>
                                                        <span className="text-zinc-500">
                                                            Rejection narrative:
                                                        </span>
                                                        <p className="mt-1 rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-xs leading-relaxed text-zinc-300">
                                                            {data.rejection_narrative}
                                                        </p>
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Confirmation modals */}
            {showApproveModal && data && (
                <ApproveConfirmModal
                    data={data}
                    onConfirm={handleApproveConfirm}
                    onCancel={() => setShowApproveModal(false)}
                    submitting={submitting}
                    error={decisionError}
                />
            )}

            {showRejectModal && data && (
                <RejectConfirmModal
                    data={data}
                    reasonCodes={reasonCodes}
                    onConfirm={handleRejectConfirm}
                    onCancel={() => setShowRejectModal(false)}
                    submitting={submitting}
                    error={decisionError}
                />
            )}

            {/* Toast */}
            {toast && <Toast toast={toast} onDismiss={dismissToast} />}
        </>
    );
}
