import ApplyModal, { type LoanProviderOption } from "@/Components/ApplyModal";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import {
    chartFont,
    ensureChartsRegistered,
    getChartPalette,
    useIsDarkMode,
} from "@/lib/chartTheme";
import type { PageProps } from "@/types";
import { Head, usePage } from "@inertiajs/react";
import { type ChartData, type ChartOptions } from "chart.js";
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    CalendarDays,
    ChevronDown,
    ChevronRight,
    Clock,
    Plus,
    TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, Line } from "react-chartjs-2";

ensureChartsRegistered();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HeartbeatRecord {
    date: string;
    inflow: number;
    outflow: number;
    net: number;
    txn: number;
}

interface TransactionRow {
    date: string;
    inflow: string | number;
    outflow: string | number;
    net: number;
    txn_count: number;
}

interface WeeklyTxn {
    week: string;
    total: number;
}

interface CashflowStats {
    avg_inflow_30d: number;
    avg_outflow_30d: number;
    avg_net_30d: number;
    total_days: number;
    positive_days: number;
    negative_days: number;
    positive_ratio: number;
    cashflow_volatility: "Low" | "Moderate" | "High" | "Insufficient data";
}

interface ExistingApplication {
    status: string;
    requested_amount: string | number;
    requested_tenure_months: number;
    apr: string | number | null;
    ai_risk_band: string | null;
    created_at: string;
}

type Props = PageProps<{
    loanProviders: LoanProviderOption[];
    transactions: TransactionRow[];
    existingApplication: ExistingApplication | null;
    hasBusiness: boolean;
    heartbeatDays: number;
    transactionDateRange: { from: string; to: string } | null;
    businessUuid: string | null;
    psychometricCompleted: boolean;
    heartbeatRecords: HeartbeatRecord[];
    weeklyTxnCounts: WeeklyTxn[];
    cashflowStats: CashflowStats | null;
}>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const APPLICATION_STATUS_LABELS: Record<
    string,
    { label: string; color: string; bg: string }
> = {
    draft: {
        label: "Draft",
        color: "text-gray-500 dark:text-zinc-400",
        bg: "bg-gray-100 dark:bg-zinc-800",
    },
    submitted: {
        label: "Under Review",
        color: "text-blue-400",
        bg: "bg-blue-50 dark:bg-blue-900/30",
    },
    pending_psychometric: {
        label: "Action Required",
        color: "text-amber-400",
        bg: "bg-amber-50 dark:bg-amber-900/30",
    },
    pending_data_sync: {
        label: "Syncing Data",
        color: "text-blue-400",
        bg: "bg-blue-50 dark:bg-blue-900/30",
    },
    queued_for_ai: {
        label: "In AI Queue",
        color: "text-purple-400",
        bg: "bg-purple-50 dark:bg-purple-900/30",
    },
    processing: {
        label: "AI Evaluating",
        color: "text-purple-400",
        bg: "bg-purple-50 dark:bg-purple-900/30",
    },
    evaluated: {
        label: "Evaluated",
        color: "text-green-400",
        bg: "bg-green-50 dark:bg-green-900/30",
    },
    approved: {
        label: "Approved",
        color: "text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-900/30",
    },
    rejected: {
        label: "Not Approved",
        color: "text-red-400",
        bg: "bg-red-50 dark:bg-red-900/30",
    },
    withdrawn: {
        label: "Withdrawn",
        color: "text-gray-400 dark:text-zinc-500",
        bg: "bg-gray-100 dark:bg-zinc-800",
    },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const etbFormatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
});

function formatETB(amount: string | number | null | undefined): string {
    if (amount === null || amount === undefined) return "—";
    const n = typeof amount === "string" ? parseFloat(amount) : amount;
    if (Number.isNaN(n)) return "—";
    return `ETB ${etbFormatter.format(Math.round(n))}`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function normalizePageErrors(
    raw: Record<string, string | string[] | undefined> | undefined,
): Record<string, string> {
    if (!raw) return {};
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
        if (value === undefined) continue;
        normalized[key] = Array.isArray(value) ? value[0] : value;
    }
    return normalized;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
    const meta = APPLICATION_STATUS_LABELS[status] ?? {
        label: status.replace(/_/g, " "),
        color: "text-gray-500 dark:text-zinc-400",
        bg: "bg-gray-100 dark:bg-zinc-800",
    };
    return (
        <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${meta.bg} ${meta.color}`}
        >
            {meta.label}
        </span>
    );
}

function StatCard({
    label,
    value,
    sub,
    accent,
}: {
    label: string;
    value: string;
    sub?: string;
    accent?: "green" | "red" | "neutral";
}) {
    const valueColor =
        accent === "green"
            ? "text-emerald-400"
            : accent === "red"
              ? "text-red-400"
              : "text-gray-900 dark:text-zinc-100";
    return (
        <div className="rounded-xl border border-gray-200 dark:border-zinc-700/50 bg-gray-100 dark:bg-zinc-800/60 p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                {label}
            </p>
            <p className={`mt-1 text-xl font-bold tabular-nums ${valueColor}`}>
                {value}
            </p>
            {sub && (
                <p className="mt-0.5 text-xs text-gray-400 dark:text-zinc-500">
                    {sub}
                </p>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Daily Cash Flow Line Chart
// ---------------------------------------------------------------------------

function DailyCashFlowChart({ records }: { records: HeartbeatRecord[] }) {
    const isDark = useIsDarkMode();
    const palette = useMemo(() => getChartPalette(isDark), [isDark]);

    const labels = records.map((r) => r.date);

    const data: ChartData<"line"> = useMemo(
        () => ({
            labels,
            datasets: [
                {
                    label: "Daily Inflow",
                    data: records.map((r) => r.inflow),
                    borderColor: "#22c55e",
                    backgroundColor: "#22c55e33",
                    fill: true,
                    tension: 0.3,
                    borderWidth: 1.5,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                },
                {
                    label: "Daily Outflow",
                    data: records.map((r) => r.outflow),
                    borderColor: "#ef4444",
                    backgroundColor: "#ef444433",
                    fill: true,
                    tension: 0.3,
                    borderWidth: 1.5,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                },
                {
                    label: "Net Cash Flow",
                    data: records.map((r) => r.net),
                    borderColor: "#fafafa",
                    backgroundColor: "transparent",
                    fill: false,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                },
            ],
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [records, palette],
    );

    const options: ChartOptions<"line"> = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            animation: { duration: 400, easing: "easeOutQuart" },
            plugins: {
                legend: {
                    position: "top",
                    labels: {
                        color: palette.textMuted,
                        padding: 16,
                        usePointStyle: true,
                        pointStyle: "circle",
                        font: chartFont(),
                    },
                },
                tooltip: {
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    borderWidth: 1,
                    titleColor: palette.text,
                    bodyColor: palette.textMuted,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) =>
                            `${ctx.dataset.label}: ${formatETB(ctx.parsed.y)}`,
                    },
                },
                datalabels: { display: false },
                zoom: {
                    zoom: {
                        wheel: { enabled: false },
                        pinch: { enabled: false },
                        drag: { enabled: false },
                        mode: "x",
                    },
                    pan: { enabled: false, mode: "x" },
                },
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { color: palette.border },
                    ticks: {
                        color: palette.textMuted,
                        maxRotation: 0,
                        maxTicksLimit: 10,
                        font: chartFont(),
                    },
                },
                y: {
                    grid: { color: palette.grid },
                    border: { display: false },
                    ticks: {
                        color: palette.textMuted,
                        callback: (value) =>
                            `ETB ${Number(value).toLocaleString("en-US")}`,
                        font: chartFont(),
                    },
                },
            },
        }),
        [palette],
    );

    return (
        <div style={{ height: 300 }}>
            <Line data={data} options={options} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Weekly Transaction Volume Bar Chart
// ---------------------------------------------------------------------------

function WeeklyTxnChart({ weeks }: { weeks: WeeklyTxn[] }) {
    const isDark = useIsDarkMode();
    const palette = useMemo(() => getChartPalette(isDark), [isDark]);

    const data: ChartData<"bar"> = useMemo(
        () => ({
            labels: weeks.map((w) => w.week),
            datasets: [
                {
                    label: "Weekly Transactions",
                    data: weeks.map((w) => w.total),
                    backgroundColor: "#3b82f6cc",
                    borderColor: "#3b82f6",
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false,
                },
            ],
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [weeks, palette],
    );

    const options: ChartOptions<"bar"> = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 400, easing: "easeOutQuart" },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    borderWidth: 1,
                    titleColor: palette.text,
                    bodyColor: palette.textMuted,
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => `Transactions: ${ctx.parsed.y}`,
                    },
                },
                datalabels: { display: false },
                zoom: {
                    zoom: {
                        wheel: { enabled: false },
                        pinch: { enabled: false },
                        drag: { enabled: false },
                        mode: "x",
                    },
                    pan: { enabled: false, mode: "x" },
                },
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { color: palette.border },
                    ticks: {
                        color: palette.textMuted,
                        maxRotation: 0,
                        maxTicksLimit: 8,
                        font: chartFont(),
                    },
                },
                y: {
                    grid: { color: palette.grid },
                    border: { display: false },
                    ticks: {
                        color: palette.textMuted,
                        font: chartFont(),
                        stepSize: 1,
                    },
                },
            },
        }),
        [palette],
    );

    return (
        <div style={{ height: 200 }}>
            <Bar data={data} options={options} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function LoanApplication() {
    const {
        loanProviders = [],
        transactions = [],
        existingApplication = null,
        heartbeatDays = 0,
        transactionDateRange = null,
        businessUuid = null,
        psychometricCompleted = false,
        heartbeatRecords = [],
        weeklyTxnCounts = [],
        cashflowStats = null,
    } = usePage<Props>().props;

    const page = usePage();
    const flash = page.props.flash as { success?: string; error?: string };
    const pageErrors = normalizePageErrors(
        page.props.errors as
            | Record<string, string | string[] | undefined>
            | undefined,
    );
    const authUser = page.props.auth.user;

    const [modalOpen, setModalOpen] = useState(false);
    const [showSuccess, setShowSuccess] = useState(!!flash?.success);
    const [txTableOpen, setTxTableOpen] = useState(false);

    const hasActiveApp =
        existingApplication !== null && existingApplication.status !== "draft";

    const hasSubmitErrors = Object.keys(pageErrors).length > 0;

    // Re-open modal on validation errors
    if (hasSubmitErrors && !modalOpen && !showSuccess) {
        // handled via initial state; errors re-open modal via effect
    }

    const hasNoData =
        existingApplication === null && heartbeatRecords.length === 0;

    const volatilityConfig = {
        Low: {
            color: "text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-900/30",
            desc: "Your revenue is very stable",
        },
        Moderate: {
            color: "text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-900/30",
            desc: "Some variation in your revenue pattern",
        },
        High: {
            color: "text-red-400",
            bg: "bg-red-50 dark:bg-red-900/30",
            desc: "Significant revenue variation detected",
        },
        "Insufficient data": {
            color: "text-gray-500 dark:text-zinc-400",
            bg: "bg-gray-100 dark:bg-zinc-800",
            desc: "Not enough data to assess stability",
        },
    } as const;

    const consistencyMeta =
        cashflowStats !== null
            ? cashflowStats.positive_ratio >= 70
                ? { label: "Strong consistency", dot: "bg-emerald-400" }
                : cashflowStats.positive_ratio >= 40
                  ? { label: "Moderate", dot: "bg-amber-400" }
                  : { label: "Needs attention", dot: "bg-red-400" }
            : null;

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-zinc-100">
                    Loan Application
                </h2>
            }
        >
            <Head title="Loan Application & Financial Analytics" />

            <div className="space-y-6">
                {/* Flash messages */}
                {flash?.success && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                        {flash.error}
                    </div>
                )}

                {/* Page header */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
                            Loan Application &amp; Financial Analytics
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                            Review your application details and financial
                            performance data
                        </p>
                        {heartbeatDays > 0 && (
                            <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">
                                {heartbeatDays} days of transaction data
                                {transactionDateRange && (
                                    <>
                                        {" "}
                                        ·{" "}
                                        {formatDate(
                                            transactionDateRange.from,
                                        )}{" "}
                                        – {formatDate(transactionDateRange.to)}
                                    </>
                                )}
                            </p>
                        )}
                    </div>
                    {/* {!hasActiveApp && (
                        <button
                            type="button"
                            onClick={() => setModalOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-white"
                        >
                            <Plus className="h-4 w-4" />
                            Apply for a Loan
                        </button>
                    )} */}
                </div>

                {/* Empty state */}
                {hasNoData && (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900 px-6 py-16 text-center">
                        <TrendingUp className="mb-4 h-10 w-10 text-gray-300 dark:text-zinc-600" />
                        <h3 className="text-base font-semibold text-gray-900 dark:text-zinc-200">
                            No application data yet
                        </h3>
                        <p className="mt-2 max-w-sm text-sm text-gray-400 dark:text-zinc-500">
                            Submit your first loan application to see your
                            financial analytics here.
                        </p>
                        <button
                            type="button"
                            onClick={() => setModalOpen(true)}
                            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-white"
                        >
                            <Plus className="h-4 w-4" />
                            Apply Now
                        </button>
                    </div>
                )}

                {/* ------------------------------------------------------------------ */}
                {/* Section A: Application Overview                                    */}
                {/* ------------------------------------------------------------------ */}
                {existingApplication && (
                    <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900 shadow-sm">
                        <div className="border-b border-gray-200 dark:border-zinc-800 px-6 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                                    Application Overview
                                </h2>
                                <StatusBadge
                                    status={existingApplication.status}
                                />
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* 4-column stat cards */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <StatCard
                                    label="Requested Amount"
                                    value={formatETB(
                                        existingApplication.requested_amount,
                                    )}
                                />
                                <StatCard
                                    label="Tenure"
                                    value={`${existingApplication.requested_tenure_months} months`}
                                />
                                <StatCard
                                    label="APR"
                                    value={
                                        existingApplication.apr !== null &&
                                        existingApplication.apr !== undefined
                                            ? `${(Number(existingApplication.apr) * 100).toFixed(2)}%`
                                            : "Pending evaluation"
                                    }
                                    sub={
                                        existingApplication.apr !== null
                                            ? "Annual percentage rate"
                                            : undefined
                                    }
                                />
                                <StatCard
                                    label="AI Risk Band"
                                    value={
                                        existingApplication.ai_risk_band ??
                                        "Pending"
                                    }
                                    accent={
                                        existingApplication.ai_risk_band ===
                                        "Low"
                                            ? "green"
                                            : existingApplication.ai_risk_band ===
                                                "High"
                                              ? "red"
                                              : "neutral"
                                    }
                                />
                            </div>

                            {/* Submission date */}
                            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-zinc-500">
                                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                                <span>
                                    Submitted{" "}
                                    {formatDate(existingApplication.created_at)}
                                </span>
                            </div>

                            {/* Psychometric CTA */}
                            {existingApplication.status ===
                                "pending_psychometric" && (
                                <div className="flex items-center justify-between gap-4 rounded-xl border border-blue-700/50 bg-blue-900/20 px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle className="h-4 w-4 shrink-0 text-blue-400" />
                                        <p className="text-sm text-blue-300">
                                            Complete your psychometric
                                            assessment to advance your
                                            application.
                                        </p>
                                    </div>
                                    <a
                                        href="/psychometric-test"
                                        className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-600"
                                    >
                                        Start assessment
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ------------------------------------------------------------------ */}
                {/* Section B: Cash Flow Analytics                                     */}
                {/* ------------------------------------------------------------------ */}
                {heartbeatRecords.length > 0 && cashflowStats && (
                    <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900 shadow-sm">
                        <div className="border-b border-gray-200 dark:border-zinc-800 px-6 py-4">
                            <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                                Cash Flow Analytics
                            </h2>
                            <p className="mt-0.5 text-xs text-gray-400 dark:text-zinc-500">
                                Based on your uploaded transaction history
                            </p>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Chart 1: Daily Cash Flow */}
                            <div>
                                <p className="mb-3 text-xs font-medium text-gray-500 dark:text-zinc-400">
                                    Daily Cash Flow Overview
                                </p>
                                <DailyCashFlowChart
                                    records={heartbeatRecords}
                                />
                            </div>

                            {/* Stat cards below Chart 1 */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-zinc-700/50 bg-gray-100 dark:bg-zinc-800/60 p-4">
                                    <ArrowUpRight className="h-5 w-5 shrink-0 text-emerald-400" />
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-zinc-400">
                                            Avg Daily Inflow (30d)
                                        </p>
                                        <p className="mt-0.5 text-base font-bold tabular-nums text-emerald-400">
                                            {formatETB(
                                                cashflowStats.avg_inflow_30d,
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-zinc-700/50 bg-gray-100 dark:bg-zinc-800/60 p-4">
                                    <ArrowDownRight className="h-5 w-5 shrink-0 text-red-400" />
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-zinc-400">
                                            Avg Daily Outflow (30d)
                                        </p>
                                        <p className="mt-0.5 text-base font-bold tabular-nums text-red-400">
                                            {formatETB(
                                                cashflowStats.avg_outflow_30d,
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-zinc-700/50 bg-gray-100 dark:bg-zinc-800/60 p-4">
                                    <TrendingUp className="h-5 w-5 shrink-0 text-gray-400 dark:text-zinc-400" />
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-zinc-400">
                                            Avg Net Cash Flow (30d)
                                        </p>
                                        <p
                                            className={`mt-0.5 text-base font-bold tabular-nums ${
                                                cashflowStats.avg_net_30d >= 0
                                                    ? "text-emerald-400"
                                                    : "text-red-400"
                                            }`}
                                        >
                                            {formatETB(
                                                cashflowStats.avg_net_30d,
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Positive cashflow ratio bar */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 dark:text-zinc-400">
                                        Positive Cash Flow Days
                                    </span>
                                    <span className="font-semibold text-gray-700 dark:text-zinc-300">
                                        {cashflowStats.positive_ratio}%
                                        <span className="ml-1.5 text-gray-400 dark:text-zinc-500">
                                            ({cashflowStats.positive_days}{" "}
                                            positive /{" "}
                                            {cashflowStats.negative_days}{" "}
                                            negative)
                                        </span>
                                    </span>
                                </div>
                                <div className="flex h-2 w-full overflow-hidden rounded-full bg-red-900/60">
                                    <div
                                        className="h-full rounded-full bg-emerald-500 transition-all"
                                        style={{
                                            width: `${cashflowStats.positive_ratio}%`,
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Chart 2: Weekly Transaction Volume */}
                            {weeklyTxnCounts.length > 0 && (
                                <div>
                                    <p className="mb-3 text-xs font-medium text-gray-500 dark:text-zinc-400">
                                        Weekly Transaction Volume
                                    </p>
                                    <WeeklyTxnChart weeks={weeklyTxnCounts} />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ------------------------------------------------------------------ */}
                {/* Section C: Transaction Health Metrics                              */}
                {/* ------------------------------------------------------------------ */}
                {cashflowStats && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {/* Cash Flow Consistency */}
                        {consistencyMeta && (
                            <div className="rounded-2xl border border-gray-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900 p-5">
                                <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                                    Cash Flow Consistency
                                </p>
                                <p className="mt-2 text-2xl font-bold tabular-nums text-gray-900 dark:text-zinc-100">
                                    {cashflowStats.positive_ratio}%
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                    <span
                                        className={`h-2 w-2 rounded-full ${consistencyMeta.dot}`}
                                    />
                                    <span className="text-xs text-gray-500 dark:text-zinc-400">
                                        {consistencyMeta.label}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Revenue Stability */}
                        <div className="rounded-2xl border border-gray-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900 p-5">
                            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                                Revenue Stability
                            </p>
                            <div className="mt-2">
                                <span
                                    className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                                        volatilityConfig[
                                            cashflowStats.cashflow_volatility
                                        ].bg
                                    } ${
                                        volatilityConfig[
                                            cashflowStats.cashflow_volatility
                                        ].color
                                    }`}
                                >
                                    {cashflowStats.cashflow_volatility}
                                </span>
                            </div>
                            <p className="mt-2 text-xs text-gray-400 dark:text-zinc-500">
                                {
                                    volatilityConfig[
                                        cashflowStats.cashflow_volatility
                                    ].desc
                                }
                            </p>
                        </div>

                        {/* Total Transaction Days */}
                        <div className="rounded-2xl border border-gray-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900 p-5">
                            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                                Total Transaction Days
                            </p>
                            <p className="mt-2 text-2xl font-bold tabular-nums text-gray-900 dark:text-zinc-100">
                                {cashflowStats.total_days}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-500" />
                                <span className="text-xs text-gray-400 dark:text-zinc-500">
                                    Transaction history on record
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ------------------------------------------------------------------ */}
                {/* Section D: Raw Transaction Data (Collapsible)                      */}
                {/* ------------------------------------------------------------------ */}
                {transactions.length > 0 && (
                    <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900 shadow-sm">
                        <button
                            type="button"
                            onClick={() => setTxTableOpen((v) => !v)}
                            className="flex w-full items-center justify-between px-6 py-4 text-left"
                        >
                            <div>
                                <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                                    Raw Transaction Data
                                </span>
                                <span className="ml-2 text-xs text-gray-400 dark:text-zinc-500">
                                    {transactions.length} record
                                    {transactions.length === 1 ? "" : "s"}
                                </span>
                            </div>
                            {txTableOpen ? (
                                <ChevronDown className="h-4 w-4 text-gray-400 dark:text-zinc-400" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-gray-400 dark:text-zinc-400" />
                            )}
                        </button>

                        {txTableOpen && (
                            <div className="border-t border-gray-200 dark:border-zinc-800">
                                <div className="max-h-[32rem] overflow-auto">
                                    <table className="w-full min-w-[640px] text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-zinc-800 bg-gray-100 dark:bg-zinc-800/50 text-xs uppercase tracking-wide text-gray-500 dark:text-zinc-400">
                                                <th className="px-6 py-3 font-medium">
                                                    Date
                                                </th>
                                                <th className="px-6 py-3 font-medium">
                                                    Daily Inflow (ETB)
                                                </th>
                                                <th className="px-6 py-3 font-medium">
                                                    Daily Outflow (ETB)
                                                </th>
                                                <th className="px-6 py-3 font-medium">
                                                    Net
                                                </th>
                                                <th className="px-6 py-3 font-medium">
                                                    Transactions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.map((row, i) => (
                                                <tr
                                                    key={`${row.date}-${i}`}
                                                    className={`border-b border-gray-200/80 dark:border-zinc-800/80 ${
                                                        i % 2 === 0
                                                            ? "bg-white dark:bg-zinc-900"
                                                            : "bg-gray-50 dark:bg-zinc-800/30"
                                                    }`}
                                                >
                                                    <td className="px-6 py-3 text-gray-700 dark:text-zinc-300">
                                                        {formatDate(row.date)}
                                                    </td>
                                                    <td className="px-6 py-3 tabular-nums text-gray-900 dark:text-zinc-100">
                                                        {formatETB(row.inflow)}
                                                    </td>
                                                    <td className="px-6 py-3 tabular-nums text-gray-900 dark:text-zinc-100">
                                                        {formatETB(row.outflow)}
                                                    </td>
                                                    <td
                                                        className={`px-6 py-3 font-medium tabular-nums ${
                                                            Number(row.net) >= 0
                                                                ? "text-emerald-400"
                                                                : "text-red-400"
                                                        }`}
                                                    >
                                                        {formatETB(row.net)}
                                                    </td>
                                                    <td className="px-6 py-3 tabular-nums text-gray-500 dark:text-zinc-400">
                                                        {row.txn_count}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ApplyModal
                isOpen={
                    modalOpen ||
                    showSuccess ||
                    (hasSubmitErrors && !showSuccess)
                }
                onClose={() => {
                    setModalOpen(false);
                    setShowSuccess(false);
                }}
                userName={authUser?.name ?? ""}
                businessUuid={businessUuid}
                psychometricCompleted={psychometricCompleted}
                initialSuccess={showSuccess}
                initialErrors={pageErrors}
                flashError={flash?.error ?? null}
                loanProviders={loanProviders}
            />
        </AuthenticatedLayout>
    );
}
