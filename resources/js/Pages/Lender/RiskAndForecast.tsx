import type { ReasonCodeRow, RiskForecastDetail } from "@/features/valuation/types";
import {
    formatEtb,
    formatFeatureName,
    formatPercentFraction,
} from "@/lib/format";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { PageProps } from "@/types";
import { Head, router, usePage } from "@inertiajs/react";
import ReactECharts from "echarts-for-react";
import { AlertCircle, Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { useMemo, useState } from "react";

type Props = PageProps<{
    applications: { id: number; status: string; business_name: string | null }[];
    application: RiskForecastDetail | null;
}>;

function riskBandClass(band: string | null): string {
    switch (band?.toLowerCase()) {
        case "low":
            return "bg-emerald-600 text-white";
        case "medium":
            return "bg-amber-500 text-white";
        case "high":
            return "bg-red-600 text-white";
        default:
            return "bg-zinc-500 text-white";
    }
}

function normalizeReasonCodes(
    codes: ReasonCodeRow[] | string[],
): ReasonCodeRow[] {
    return codes.map((item) => {
        if (typeof item === "string") {
            const parts = item.split(":", 2);
            return {
                code: parts[0].trim(),
                message: parts[1]?.trim() ?? item,
            };
        }
        return {
            code: item.code,
            message: item.message ?? item.code,
        };
    });
}

export default function RiskAndForecast() {
    const { application, flash } = usePage<Props>().props;
    const [metadataOpen, setMetadataOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
    const [narrative, setNarrative] = useState("");
    const [confirmApprove, setConfirmApprove] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const reasonCodes = useMemo(
        () =>
            application
                ? normalizeReasonCodes(application.reason_codes)
                : [],
        [application],
    );

    const shapEntries = useMemo(() => {
        if (!application?.shap_values) return [];
        return Object.entries(application.shap_values)
            .map(([feature, value]) => ({ feature, value: Number(value) }))
            .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
            .slice(0, 10);
    }, [application]);

    const forecastAllZero = useMemo(() => {
        if (!application) return true;
        const all = [
            ...application.p10_cashflow_forecast,
            ...application.p50_cashflow_forecast,
            ...application.p90_cashflow_forecast,
        ].map(Number);
        return all.length === 0 || all.every((v) => v === 0);
    }, [application]);

    const forecastChartOption = useMemo(() => {
        if (!application) return {};
        const days = Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);
        return {
            tooltip: { trigger: "axis" },
            legend: { data: ["P10", "P50", "P90"] },
            xAxis: { type: "category", data: days },
            yAxis: { type: "value", name: "ETB" },
            series: [
                {
                    name: "P10",
                    type: "line",
                    data: application.p10_cashflow_forecast.map(Number),
                    lineStyle: { color: "#dc2626" },
                    itemStyle: { color: "#dc2626" },
                },
                {
                    name: "P50",
                    type: "line",
                    data: application.p50_cashflow_forecast.map(Number),
                    lineStyle: { color: "#2563eb" },
                    itemStyle: { color: "#2563eb" },
                },
                {
                    name: "P90",
                    type: "line",
                    data: application.p90_cashflow_forecast.map(Number),
                    lineStyle: { color: "#16a34a" },
                    itemStyle: { color: "#16a34a" },
                },
            ],
        };
    }, [application]);

    const shapChartOption = useMemo(() => {
        const features = shapEntries.map((e) => formatFeatureName(e.feature));
        const values = shapEntries.map((e) => e.value);
        return {
            tooltip: { trigger: "axis" },
            grid: { left: 120, right: 40 },
            xAxis: { type: "value" },
            yAxis: {
                type: "category",
                data: features,
                inverse: true,
            },
            series: [
                {
                    type: "bar",
                    data: values.map((v) => ({
                        value: v,
                        itemStyle: { color: v >= 0 ? "#16a34a" : "#dc2626" },
                    })),
                    label: {
                        show: true,
                        position: "right",
                        formatter: (p: { value: number }) => p.value.toFixed(3),
                    },
                },
            ],
        };
    }, [shapEntries]);

    const decide = (decision: "approved" | "rejected") => {
        if (!application) return;
        setSubmitting(true);
        router.post(
            route("decisioning.decide", application.id),
            {
                decision,
                reason_codes: decision === "rejected" ? selectedReasons : [],
                narrative: decision === "rejected" ? narrative : undefined,
            },
            {
                onFinish: () => {
                    setSubmitting(false);
                    setConfirmApprove(false);
                    setRejectOpen(false);
                },
            },
        );
    };

    if (!application) {
        return (
            <AuthenticatedLayout
                header={
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                        Risk & Forecast
                    </h2>
                }
            >
                <Head title="Risk & Forecast" />
                <p className="py-8 text-sm text-zinc-600">
                    Select an application from the pipeline and click Review.
                </p>
            </AuthenticatedLayout>
        );
    }

    const isTerminal = ["approved", "rejected"].includes(application.status);
    const creditDisplay =
        application.npv_credit_limit !== null
            ? formatEtb(application.npv_credit_limit)
            : "Pending Full Data";

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                    Risk & Forecast — {application.business_name}
                </h2>
            }
        >
            <Head title={`Risk & Forecast — ${application.business_name}`} />

            <div className="space-y-8 py-8">
                {flash?.success && (
                    <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {flash.success}
                    </p>
                )}

                {application.is_degraded && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
                        ⚠️ Running in Degraded Mode — Insufficient transaction
                        history for full LSTM forecast. Risk score is based on
                        available features only. Credit limit calculation
                        requires more transaction data.
                    </div>
                )}

                {isTerminal && (
                    <div className="rounded-lg border border-zinc-300 bg-zinc-100 px-4 py-3 text-sm dark:border-zinc-600 dark:bg-zinc-800">
                        Decision locked:{" "}
                        <strong className="capitalize">
                            {application.status}
                        </strong>
                        {application.reviewer_name &&
                            ` by ${application.reviewer_name}`}
                        {application.decided_at &&
                            ` on ${new Date(application.decided_at).toLocaleString()}`}
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                        <p className="text-xs font-medium uppercase text-zinc-500">
                            Risk Band
                        </p>
                        <p
                            className={`mt-2 inline-flex rounded-lg px-3 py-2 text-2xl font-bold capitalize ${riskBandClass(application.ai_risk_band)}`}
                        >
                            {application.ai_risk_band ?? "—"}
                        </p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                        <p className="text-xs font-medium uppercase text-zinc-500">
                            AI Risk Score
                        </p>
                        <p className="mt-2 text-2xl font-bold tabular-nums">
                            {formatPercentFraction(application.ai_risk_score)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                        <p className="text-xs font-medium uppercase text-zinc-500">
                            Probability of Default
                        </p>
                        <p className="mt-2 text-2xl font-bold tabular-nums">
                            {formatPercentFraction(application.prob_default)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                        <p className="text-xs font-medium uppercase text-zinc-500">
                            NPV Credit Limit
                        </p>
                        <p
                            className={`mt-2 text-2xl font-bold ${application.npv_credit_limit === null ? "text-amber-600" : ""}`}
                        >
                            {creditDisplay}
                        </p>
                    </div>
                </div>

                <section>
                    <h3 className="mb-3 text-lg font-semibold">
                        30-Day Cash Flow Forecast
                    </h3>
                    <div className="relative rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                        <ReactECharts
                            option={forecastChartOption}
                            style={{ height: 360 }}
                        />
                        {forecastAllZero && (
                            <p className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm font-medium text-zinc-600 dark:bg-zinc-900/80">
                                Forecast unavailable — insufficient data
                            </p>
                        )}
                    </div>
                </section>

                <section>
                    <h3 className="mb-3 text-lg font-semibold">
                        SHAP Feature Attribution
                    </h3>
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                        {shapEntries.length > 0 ? (
                            <ReactECharts
                                option={shapChartOption}
                                style={{ height: Math.max(280, shapEntries.length * 36) }}
                            />
                        ) : (
                            <p className="text-sm text-zinc-500">
                                No SHAP values available.
                            </p>
                        )}
                    </div>
                </section>

                <section>
                    <h3 className="mb-3 text-lg font-semibold">Reason Codes</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {reasonCodes.map((rc) => (
                            <div
                                key={rc.code}
                                className="flex gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
                            >
                                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
                                <div>
                                    <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs font-mono dark:bg-zinc-700">
                                        {rc.code}
                                    </span>
                                    <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                                        {rc.message}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                    <button
                        type="button"
                        onClick={() => setMetadataOpen(!metadataOpen)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left font-medium"
                    >
                        Inference Details
                        {metadataOpen ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                    </button>
                    {metadataOpen && (
                        <dl className="grid gap-2 border-t border-zinc-200 px-4 py-3 text-sm dark:border-zinc-700 sm:grid-cols-2">
                            <div>
                                <dt className="text-zinc-500">Contract Version</dt>
                                <dd>{application.contract_version}</dd>
                            </div>
                            <div>
                                <dt className="text-zinc-500">Forecaster Mode</dt>
                                <dd className="capitalize">
                                    {application.forecaster_mode ?? "—"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-zinc-500">Forecaster Model</dt>
                                <dd>
                                    {application.model_versions?.forecaster ??
                                        "—"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-zinc-500">Scorer Model</dt>
                                <dd>
                                    {application.model_versions?.scorer ?? "—"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-zinc-500">LSTM Model</dt>
                                <dd>
                                    {application.model_versions?.lstm ?? "—"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-zinc-500">SHAP Integrity</dt>
                                <dd>
                                    {application.shap_integrity_passed ? (
                                        <span className="text-emerald-600">
                                            ✓ Passed
                                        </span>
                                    ) : (
                                        <span className="text-red-600">
                                            ✗ Failed
                                        </span>
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-zinc-500">Feature Hash</dt>
                                <dd className="font-mono text-xs">
                                    {application.feature_snapshot_hash
                                        ? application.feature_snapshot_hash.slice(
                                              0,
                                              12,
                                          )
                                        : "—"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-zinc-500">Inferred At</dt>
                                <dd>
                                    {application.inferred_at
                                        ? new Date(
                                              application.inferred_at,
                                          ).toLocaleString()
                                        : "—"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-zinc-500">
                                    Horizon Reliability
                                </dt>
                                <dd>
                                    {application.horizon_reliability_warning
                                        ? "Warning"
                                        : "OK"}
                                </dd>
                            </div>
                        </dl>
                    )}
                </section>

                {application.status === "evaluated" && (
                    <section className="sticky bottom-0 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                        <h3 className="mb-4 text-lg font-semibold">
                            Credit Decision
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmApprove(true)}
                                disabled={submitting}
                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                            >
                                <Check className="h-4 w-4" /> Approve
                            </button>
                            <button
                                type="button"
                                onClick={() => setRejectOpen(!rejectOpen)}
                                disabled={submitting}
                                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                            >
                                <X className="h-4 w-4" /> Reject
                            </button>
                        </div>

                        {confirmApprove && (
                            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
                                <p className="text-sm">
                                    Confirm approval of {creditDisplay} credit
                                    limit?
                                </p>
                                <div className="mt-3 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => decide("approved")}
                                        disabled={submitting}
                                        className="rounded bg-emerald-700 px-3 py-1.5 text-sm text-white"
                                    >
                                        Confirm Approve
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmApprove(false)}
                                        className="rounded border px-3 py-1.5 text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {rejectOpen && (
                            <div className="mt-4 space-y-3 rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/20">
                                <p className="text-sm font-medium">
                                    Select at least one reason code:
                                </p>
                                {reasonCodes.map((rc) => (
                                    <label
                                        key={rc.code}
                                        className="flex items-start gap-2 text-sm"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedReasons.includes(
                                                rc.code,
                                            )}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedReasons([
                                                        ...selectedReasons,
                                                        rc.code,
                                                    ]);
                                                } else {
                                                    setSelectedReasons(
                                                        selectedReasons.filter(
                                                            (c) => c !== rc.code,
                                                        ),
                                                    );
                                                }
                                            }}
                                        />
                                        <span>
                                            <strong>{rc.code}</strong> —{" "}
                                            {rc.message}
                                        </span>
                                    </label>
                                ))}
                                <textarea
                                    className="w-full rounded border border-zinc-300 p-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                                    rows={3}
                                    placeholder="Additional narrative (optional)"
                                    value={narrative}
                                    onChange={(e) => setNarrative(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => decide("rejected")}
                                    disabled={
                                        submitting ||
                                        selectedReasons.length === 0
                                    }
                                    className="rounded bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                                >
                                    Confirm Reject
                                </button>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
