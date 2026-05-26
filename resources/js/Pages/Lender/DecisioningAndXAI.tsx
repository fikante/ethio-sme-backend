import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { formatEtb } from "@/lib/format";
import {
    ensureChartsRegistered,
    getChartPalette,
    chartFont,
    useIsDarkMode,
} from "@/lib/chartTheme";
import { PageProps } from "@/types";
import { Head, usePage } from "@inertiajs/react";
import {
    ScatterController,
    Chart as ChartJS,
    type ChartData,
    type ChartDataset,
    type ChartOptions,
    type LegendItem,
    type TooltipItem,
} from "chart.js";
import { Bar, Scatter } from "react-chartjs-2";
import {
    Activity,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    Shield,
    TrendingDown,
    TrendingUp,
    XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Register Chart.js controllers not covered by ensureChartsRegistered
// ---------------------------------------------------------------------------
ChartJS.register(ScatterController);
ensureChartsRegistered();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatsShape {
    totalEvaluated: number;
    avgRiskScore: number | null;
    approvalRate: number | null;
    avgApprovedLimit: number | null;
    shapIntegrityPassRate: number | null;
}

interface HistogramBucket {
    bucket: string;
    count: number;
    min: number;
}

interface ShapFeature {
    feature_key: string;
    feature_label: string;
    mean_abs_shap: number;
    mean_shap: number;
}

interface CalibrationPoint {
    id: number;
    requested: number;
    limit: number;
    band: string;
    business: string | null;
}

interface DecisionRow {
    id: number;
    decided_at: string | null;
    business_name: string | null;
    requested_amount: number;
    ai_risk_band: string | null;
    npv_credit_limit: number | null;
    status: string;
    reviewer_name: string | null;
    rejection_reason_code: string | null;
    officer_notes: string | null;
}

interface PaginatedDecisions {
    data: DecisionRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface SectorStat {
    sector: string;
    total: number;
    approved: number;
    approval_rate: number;
}

type Props = PageProps<{
    stats: StatsShape;
    riskHistogram: HistogramBucket[];
    shapImportance: ShapFeature[];
    calibrationData: CalibrationPoint[];
    decisions: PaginatedDecisions;
    sectorStats: SectorStat[];
}>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatStatPercent(value: number | null): string {
    if (value === null) return "—";
    return `${value.toFixed(1)}%`;
}

function formatEtbAbbrev(value: number | null): string {
    if (value === null) return "—";
    if (value >= 1_000_000) return `ETB ${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `ETB ${(value / 1_000).toFixed(0)}K`;
    return formatEtb(value);
}

function riskBandColor(band: string | null): string {
    switch (band?.toLowerCase()) {
        case "low":
            return "#10B981";
        case "medium":
            return "#F59E0B";
        case "high":
            return "#EF4444";
        default:
            return "#6B7280";
    }
}

function riskBandBadgeClass(band: string | null): string {
    switch (band?.toLowerCase()) {
        case "low":
            return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
        case "medium":
            return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
        case "high":
            return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
        default:
            return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
    }
}

function histogramBarColor(min: number): string {
    if (min < 0.35) return "#10B981";
    if (min < 0.65) return "#F59E0B";
    return "#EF4444";
}

function sectorBarColor(rate: number): string {
    if (rate >= 70) return "#10B981";
    if (rate >= 40) return "#F59E0B";
    return "#EF4444";
}

function humaniseSector(sector: string): string {
    return sector.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

const DECISION_PAGE_SIZE = 15;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
    label,
    value,
    icon,
    sub,
}: {
    label: string;
    value: string;
    icon: React.ReactNode;
    sub?: string;
}) {
    return (
        <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {label}
                </span>
                <span className="text-zinc-400 dark:text-zinc-500">{icon}</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</p>
            {sub && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500">{sub}</p>
            )}
        </div>
    );
}

function Section({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                    {title}
                </h2>
                {subtitle && (
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                        {subtitle}
                    </p>
                )}
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DecisioningAndXAI() {
    const { stats, riskHistogram, shapImportance, calibrationData, decisions, sectorStats } =
        usePage<Props>().props;

    const isDark = useIsDarkMode();
    const palette = getChartPalette(isDark);

    // ---- Decision audit local filter state ----
    const [decisionFilter, setDecisionFilter] = useState<"all" | "approved" | "rejected">("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [localPage, setLocalPage] = useState(1);

    const filteredDecisions = useMemo(() => {
        let rows = decisions.data;
        if (decisionFilter !== "all") {
            rows = rows.filter((r) => r.status === decisionFilter);
        }
        if (dateFrom) {
            rows = rows.filter((r) => r.decided_at != null && r.decided_at >= dateFrom);
        }
        if (dateTo) {
            rows = rows.filter((r) => r.decided_at != null && r.decided_at <= dateTo);
        }
        return rows;
    }, [decisions.data, decisionFilter, dateFrom, dateTo]);

    const totalLocalPages = Math.max(1, Math.ceil(filteredDecisions.length / DECISION_PAGE_SIZE));
    const safeLocalPage = Math.min(localPage, totalLocalPages);
    const pageStart = (safeLocalPage - 1) * DECISION_PAGE_SIZE;
    const pagedDecisions = filteredDecisions.slice(pageStart, pageStart + DECISION_PAGE_SIZE);

    // ---- Risk Histogram chart data ----
    const histogramChartData = useMemo<ChartData<"bar">>(() => ({
        labels: riskHistogram.map((b) => b.bucket),
        datasets: [
            {
                label: "Applications",
                data: riskHistogram.map((b) => b.count),
                backgroundColor: riskHistogram.map((b) => histogramBarColor(b.min)),
                borderWidth: 0,
                borderRadius: 4,
            },
        ],
    }), [riskHistogram]);

    const histogramOptions = useMemo<ChartOptions<"bar">>(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            datalabels: { display: false },
            tooltip: {
                backgroundColor: palette.tooltipBg,
                borderColor: palette.tooltipBorder,
                borderWidth: 1,
                titleColor: palette.text,
                bodyColor: palette.textMuted,
                callbacks: {
                    label: (item: TooltipItem<"bar">) =>
                        `${item.raw as number} application${(item.raw as number) !== 1 ? "s" : ""}`,
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: palette.textMuted, font: chartFont() },
                border: { display: false },
            },
            y: {
                grid: { color: palette.grid },
                ticks: { color: palette.textMuted, font: chartFont(), precision: 0 },
                border: { display: false },
                title: {
                    display: true,
                    text: "Number of Applications",
                    color: palette.textMuted,
                    font: chartFont(),
                },
            },
        },
    }), [palette]);

    // ---- SHAP Feature Importance chart data ----
    const shapChartData = useMemo<ChartData<"bar">>(() => ({
        labels: shapImportance.map((f) => f.feature_label),
        datasets: [
            {
                label: "Mean |SHAP|",
                data: shapImportance.map((f) => f.mean_abs_shap),
                backgroundColor: shapImportance.map((f) =>
                    f.mean_shap > 0 ? "#EF4444" : "#10B981",
                ),
                borderWidth: 0,
                borderRadius: 4,
            },
        ],
    }), [shapImportance]);

    const shapOptions = useMemo<ChartOptions<"bar">>(() => ({
        indexAxis: "y" as const,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            datalabels: { display: false },
            tooltip: {
                backgroundColor: palette.tooltipBg,
                borderColor: palette.tooltipBorder,
                borderWidth: 1,
                titleColor: palette.text,
                bodyColor: palette.textMuted,
                callbacks: {
                    label: (item: TooltipItem<"bar">) => {
                        const feat = shapImportance[item.dataIndex];
                        const direction = feat
                            ? feat.mean_shap > 0
                                ? "Increases risk"
                                : "Reduces risk"
                            : "";
                        return `${(item.raw as number).toFixed(4)} — ${direction}`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: { color: palette.grid },
                ticks: { color: palette.textMuted, font: chartFont() },
                border: { display: false },
                title: {
                    display: true,
                    text: "Mean Absolute SHAP Value",
                    color: palette.textMuted,
                    font: chartFont(),
                },
            },
            y: {
                grid: { display: false },
                ticks: { color: palette.textMuted, font: chartFont("normal", 11) },
                border: { display: false },
            },
        },
    }), [palette, shapImportance]);

    // ---- Scatter calibration chart data ----
    const maxScatterVal = useMemo(() => {
        if (!calibrationData.length) return 1_000_000;
        return Math.max(...calibrationData.map((d) => Math.max(d.requested, d.limit)));
    }, [calibrationData]);

    // CalibrationPoint extended with x/y for Chart.js scatter
    type ScatterPoint = CalibrationPoint & { x: number; y: number };

    const scatterChartData = useMemo(() => {
        const byBand: Record<string, ScatterPoint[]> = { low: [], medium: [], high: [], unknown: [] };
        calibrationData.forEach((d) => {
            const key = d.band?.toLowerCase() ?? "unknown";
            const pt: ScatterPoint = { ...d, x: d.requested, y: d.limit };
            if (key in byBand) byBand[key].push(pt);
            else byBand["unknown"].push(pt);
        });

        const scatterDatasets: ChartDataset<"scatter", ScatterPoint[]>[] = (
            ["low", "medium", "high", "unknown"] as const
        )
            .filter((band) => byBand[band].length > 0)
            .map((band) => ({
                type: "scatter" as const,
                label:
                    band === "unknown"
                        ? "Unknown Risk"
                        : `${band.charAt(0).toUpperCase() + band.slice(1)} Risk`,
                data: byBand[band],
                backgroundColor: riskBandColor(band === "unknown" ? null : band) + "cc",
                pointRadius: 5,
                pointHoverRadius: 7,
            }));

        // Diagonal reference line (x = y) — scatter with showLine=true draws a connecting line
        const refLine = {
            type: "scatter" as const,
            label: "Limit = Request",
            data: [
                { x: 0, y: 0 },
                { x: maxScatterVal, y: maxScatterVal },
            ] as { x: number; y: number }[],
            backgroundColor: "transparent" as const,
            borderColor: palette.textMuted,
            borderWidth: 1.5,
            borderDash: [6, 4],
            pointRadius: 0,
            showLine: true,
        } satisfies ChartDataset<"scatter", { x: number; y: number }[]>;

        return { datasets: [...scatterDatasets, refLine] };
    }, [calibrationData, maxScatterVal, palette.textMuted]);

    const scatterOptions = useMemo<ChartOptions<"scatter">>(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                labels: {
                    color: palette.textMuted,
                    font: chartFont(),
                    boxWidth: 10,
                    boxHeight: 10,
                },
                filter: (item: LegendItem) => item.text !== "Limit = Request",
            },
            datalabels: { display: false },
            tooltip: {
                backgroundColor: palette.tooltipBg,
                borderColor: palette.tooltipBorder,
                borderWidth: 1,
                titleColor: palette.text,
                bodyColor: palette.textMuted,
                callbacks: {
                    title: (items: TooltipItem<"scatter">[]) => {
                        const d = items[0]?.raw as CalibrationPoint & { x: number; y: number };
                        return d?.business ?? `App #${(d as { id?: number })?.id ?? ""}`;
                    },
                    label: (item: TooltipItem<"scatter">) => {
                        const d = item.raw as CalibrationPoint & { x: number; y: number };
                        return [
                            `Requested: ${formatEtb(d.x)}`,
                            `AI Limit: ${formatEtb(d.y)}`,
                            `Band: ${d.band ?? "—"}`,
                        ];
                    },
                },
            },
        },
        scales: {
            x: {
                grid: { color: palette.grid },
                ticks: {
                    color: palette.textMuted,
                    font: chartFont(),
                    callback: (value: number | string) =>
                        formatEtbAbbrev(Number(value)).replace("ETB ", ""),
                },
                border: { display: false },
                title: {
                    display: true,
                    text: "Requested Amount (ETB)",
                    color: palette.textMuted,
                    font: chartFont(),
                },
            },
            y: {
                grid: { color: palette.grid },
                ticks: {
                    color: palette.textMuted,
                    font: chartFont(),
                    callback: (value: number | string) =>
                        formatEtbAbbrev(Number(value)).replace("ETB ", ""),
                },
                border: { display: false },
                title: {
                    display: true,
                    text: "NPV Credit Limit (ETB)",
                    color: palette.textMuted,
                    font: chartFont(),
                },
            },
        },
    }), [palette]);

    // ---- Sector approval chart data ----
    const sectorChartData = useMemo<ChartData<"bar">>(() => ({
        labels: sectorStats.map((s) => humaniseSector(s.sector)),
        datasets: [
            {
                label: "Approval Rate (%)",
                data: sectorStats.map((s) => s.approval_rate),
                backgroundColor: sectorStats.map((s) => sectorBarColor(s.approval_rate)),
                borderWidth: 0,
                borderRadius: 4,
            },
        ],
    }), [sectorStats]);

    const sectorChartOptions = useMemo<ChartOptions<"bar">>(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            datalabels: { display: false },
            tooltip: {
                backgroundColor: palette.tooltipBg,
                borderColor: palette.tooltipBorder,
                borderWidth: 1,
                titleColor: palette.text,
                bodyColor: palette.textMuted,
                callbacks: {
                    label: (item: TooltipItem<"bar">) => {
                        const stat = sectorStats[item.dataIndex];
                        return stat
                            ? `${item.raw as number}% (${stat.approved}/${stat.total} approved)`
                            : `${item.raw as number}%`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: palette.textMuted, font: chartFont() },
                border: { display: false },
            },
            y: {
                grid: { color: palette.grid },
                ticks: {
                    color: palette.textMuted,
                    font: chartFont(),
                    callback: (value: number | string) => `${value}%`,
                },
                border: { display: false },
                min: 0,
                max: 100,
            },
        },
    }), [palette, sectorStats]);

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-xl font-semibold leading-tight text-zinc-900 dark:text-white">
                        AI Decisioning & Explainability
                    </h2>
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                        Understanding how the AI model makes credit decisions across your portfolio
                    </p>
                </div>
            }
        >
            <Head title="AI Decisioning & XAI" />

            <div className="space-y-6 py-8">
                {/* -------------------------------------------------------- */}
                {/* Section 1 — Model Performance Summary                    */}
                {/* -------------------------------------------------------- */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    <StatCard
                        label="Total Evaluated"
                        value={stats.totalEvaluated.toLocaleString()}
                        icon={<Activity className="h-4 w-4" />}
                        sub="Applications scored by AI"
                    />
                    <StatCard
                        label="Avg AI Risk Score"
                        value={formatStatPercent(stats.avgRiskScore)}
                        icon={<BarChart3 className="h-4 w-4" />}
                        sub="Mean probability of default"
                    />
                    <StatCard
                        label="Approval Rate"
                        value={formatStatPercent(stats.approvalRate)}
                        icon={<TrendingUp className="h-4 w-4" />}
                        sub="Of decided applications"
                    />
                    <StatCard
                        label="Avg NPV Credit Limit"
                        value={formatEtbAbbrev(stats.avgApprovedLimit)}
                        icon={<TrendingDown className="h-4 w-4" />}
                        sub="Approved applications"
                    />
                    <StatCard
                        label="SHAP Integrity Pass"
                        value={formatStatPercent(stats.shapIntegrityPassRate)}
                        icon={<Shield className="h-4 w-4" />}
                        sub="Explanations verified"
                    />
                </div>

                {/* -------------------------------------------------------- */}
                {/* Section 2 — Risk Score Distribution                      */}
                {/* -------------------------------------------------------- */}
                <Section
                    title="Risk Score Distribution"
                    subtitle="Distribution of AI credit risk scores across all evaluated applications"
                >
                    {riskHistogram.every((b) => b.count === 0) ? (
                        <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
                            No scored applications yet.
                        </p>
                    ) : (
                        <div className="h-64">
                            <Bar data={histogramChartData} options={histogramOptions} />
                        </div>
                    )}
                    <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                            Low risk (0.0–0.35)
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-400" />
                            Medium risk (0.35–0.65)
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500" />
                            High risk (0.65–1.0)
                        </span>
                    </div>
                </Section>

                {/* -------------------------------------------------------- */}
                {/* Section 3 — Global SHAP Feature Importance               */}
                {/* -------------------------------------------------------- */}
                <Section
                    title="Global Feature Importance"
                    subtitle="Features with larger bars have more influence on credit risk decisions across your portfolio."
                >
                    {shapImportance.length === 0 ? (
                        <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
                            No SHAP explanations available yet. Applications must be fully
                            evaluated to generate feature importance data.
                        </p>
                    ) : (
                        <>
                            <div style={{ height: Math.max(280, shapImportance.length * 30) }}>
                                <Bar data={shapChartData} options={shapOptions} />
                            </div>
                            <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                                <span className="flex items-center gap-1.5">
                                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500" />
                                    Increases risk
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                                    Reduces risk
                                </span>
                            </div>
                        </>
                    )}
                </Section>

                {/* -------------------------------------------------------- */}
                {/* Section 4 — Credit Limit Calibration (Scatter)           */}
                {/* -------------------------------------------------------- */}
                <Section
                    title="Credit Limit Calibration"
                    subtitle="AI-computed NPV credit limits vs. requested loan amounts. Points above the diagonal: AI capacity exceeds the request."
                >
                    {calibrationData.length === 0 ? (
                        <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
                            No evaluated applications with credit limits yet.
                        </p>
                    ) : (
                        <div className="h-80">
                            <Scatter data={scatterChartData} options={scatterOptions} />
                        </div>
                    )}
                </Section>

                {/* -------------------------------------------------------- */}
                {/* Section 5 — Decision Audit Trail                         */}
                {/* -------------------------------------------------------- */}
                <Section
                    title="Decision Audit Trail"
                    subtitle="Complete record of loan officer decisions with AI scores and reasoning"
                >
                    {/* Filter bar */}
                    <div className="mb-4 flex flex-wrap items-end gap-3">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                Decision
                            </span>
                            <div className="flex gap-1">
                                {(["all", "approved", "rejected"] as const).map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => {
                                            setDecisionFilter(opt);
                                            setLocalPage(1);
                                        }}
                                        className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                                            decisionFilter === opt
                                                ? "border-zinc-800 bg-zinc-900 text-white dark:border-zinc-200 dark:bg-zinc-100 dark:text-zinc-900"
                                                : "border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400"
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                From
                            </span>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => {
                                    setDateFrom(e.target.value);
                                    setLocalPage(1);
                                }}
                                className="rounded-lg border border-zinc-200 bg-transparent px-3 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:text-white dark:focus:ring-zinc-300/20"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                To
                            </span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => {
                                    setDateTo(e.target.value);
                                    setLocalPage(1);
                                }}
                                className="rounded-lg border border-zinc-200 bg-transparent px-3 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:text-white dark:focus:ring-zinc-300/20"
                            />
                        </div>
                        {(decisionFilter !== "all" || dateFrom || dateTo) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setDecisionFilter("all");
                                    setDateFrom("");
                                    setDateTo("");
                                    setLocalPage(1);
                                }}
                                className="self-end rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
                        <table className="min-w-full text-left text-sm">
                            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                                        Date
                                    </th>
                                    <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                                        Business
                                    </th>
                                    <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                                        Requested
                                    </th>
                                    <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                                        AI Risk Band
                                    </th>
                                    <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                                        AI NPV Limit
                                    </th>
                                    <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                                        Decision
                                    </th>
                                    <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                                        Officer
                                    </th>
                                    <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">
                                        Reason Code
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagedDecisions.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-4 py-12 text-center text-sm text-zinc-400 dark:text-zinc-500"
                                        >
                                            No decisions have been recorded yet.
                                        </td>
                                    </tr>
                                ) : (
                                    pagedDecisions.map((row) => (
                                        <tr
                                            key={row.id}
                                            className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                                        >
                                            <td className="px-4 py-3 tabular-nums text-zinc-700 dark:text-zinc-300">
                                                {formatDate(row.decided_at)}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">
                                                {row.business_name ?? "—"}
                                            </td>
                                            <td className="px-4 py-3 tabular-nums text-zinc-700 dark:text-zinc-300">
                                                {formatEtb(row.requested_amount)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.ai_risk_band ? (
                                                    <span
                                                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${riskBandBadgeClass(row.ai_risk_band)}`}
                                                    >
                                                        {row.ai_risk_band}
                                                    </span>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                            <td className="px-4 py-3 tabular-nums text-zinc-700 dark:text-zinc-300">
                                                {row.npv_credit_limit !== null
                                                    ? formatEtb(row.npv_credit_limit)
                                                    : "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.status === "approved" ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                                        <CheckCircle className="h-3 w-3" />
                                                        Approved
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-900/40 dark:text-red-300">
                                                        <XCircle className="h-3 w-3" />
                                                        Rejected
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                                                {row.reviewer_name ?? "—"}
                                            </td>
                                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                                                {row.rejection_reason_code
                                                    ? row.rejection_reason_code
                                                    : row.status === "rejected"
                                                      ? "—"
                                                      : null}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {filteredDecisions.length > DECISION_PAGE_SIZE && (
                        <div className="mt-3 flex items-center justify-between px-1">
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Showing {pageStart + 1}–
                                {Math.min(
                                    pageStart + DECISION_PAGE_SIZE,
                                    filteredDecisions.length,
                                )}{" "}
                                of {filteredDecisions.length}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={safeLocalPage <= 1}
                                    onClick={() => setLocalPage((p) => Math.max(1, p - 1))}
                                    className="rounded-lg border border-zinc-200 p-1.5 text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                    {safeLocalPage} / {totalLocalPages}
                                </span>
                                <button
                                    type="button"
                                    disabled={safeLocalPage >= totalLocalPages}
                                    onClick={() =>
                                        setLocalPage((p) => Math.min(totalLocalPages, p + 1))
                                    }
                                    className="rounded-lg border border-zinc-200 p-1.5 text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </Section>

                {/* -------------------------------------------------------- */}
                {/* Section 6 — Algorithmic Fairness Panel                   */}
                {/* -------------------------------------------------------- */}
                <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                            Algorithmic Fairness Monitoring
                        </h2>
                        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                            Understanding potential systematic bias in AI credit decisions
                        </p>
                    </div>
                    <div className="space-y-6 p-6">
                        {/* Metric explanations */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                    Statistical Parity Difference (SPD)
                                </p>
                                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                    Measures the difference in approval rates between demographic
                                    groups. A value of 0 indicates perfect parity.
                                </p>
                                <p className="mt-2 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                                    SPD = P(Approved | Group A) &minus; P(Approved | Group B)
                                </p>
                            </div>
                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                    Equalized Odds Difference (EOD)
                                </p>
                                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                    Measures whether the AI makes equally accurate predictions for
                                    different groups. Ensures true positive rates are similar across
                                    groups.
                                </p>
                            </div>
                        </div>

                        {/* Sector approval rate chart */}
                        {sectorStats.length === 0 ? (
                            <p className="py-4 text-center text-sm text-zinc-400 dark:text-zinc-500">
                                No sector data available yet.
                            </p>
                        ) : (
                            <div>
                                <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Approval Rate by Business Sector
                                </p>
                                <div className="h-56">
                                    <Bar data={sectorChartData} options={sectorChartOptions} />
                                </div>
                            </div>
                        )}

                        {/* Fairness status badge */}
                        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-800/50 dark:bg-emerald-950/30">
                            <Shield className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <div>
                                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                                    ACTIVE — Model outputs are monitored for systematic bias
                                </p>
                                <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                                    Fairness audits run continuously across all loan decisions
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                            Data shown is based on completed loan decisions. This analysis uses
                            business sector as a proxy grouping since protected demographic
                            attributes are not stored.
                        </p>
                    </div>
                </div>

                {/* -------------------------------------------------------- */}
                {/* Section 7 — Model Information Card                       */}
                {/* -------------------------------------------------------- */}
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-700 dark:bg-zinc-800/50">
                    <div className="mb-5 flex items-center gap-3">
                        <Activity className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                            Model Information
                        </h2>
                    </div>
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Left: metadata table */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                    Engine
                                </p>
                                <p className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-white">
                                    EthioSME Credit Risk Engine v2
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                    Architecture
                                </p>
                                <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                                    XGBoost (classification) + DeepAR (forecasting)
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                    Training Data
                                </p>
                                <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                                    100 CBE businesses · 731 days of transactions
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                    XGBoost AUC-ROC
                                </p>
                                <p className="mt-0.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                    0.8842
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                    DeepAR MAPE (30d)
                                </p>
                                <p className="mt-0.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                    2.94%
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                    P10 Coverage Rate
                                </p>
                                <p className="mt-0.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                    94.20%
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                    Last Updated
                                </p>
                                <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                                    May 2026
                                </p>
                            </div>
                        </div>
                        {/* Right: disclaimer */}
                        <div className="flex flex-col justify-center rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
                            <div className="mb-3 flex items-center gap-2">
                                <Shield className="h-5 w-5 flex-shrink-0 text-zinc-500 dark:text-zinc-400" />
                                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                                    AI Decision Disclaimer
                                </p>
                            </div>
                            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                All credit decisions are AI-assisted recommendations and require
                                human officer review before disbursement. This system complies
                                with NBE adverse action notice requirements.
                            </p>
                            <p className="mt-3 text-xs italic text-zinc-400 dark:text-zinc-500">
                                Model outputs are probabilistic estimates based on historical
                                transaction patterns and psychometric indicators. Outputs should
                                be considered alongside officer judgment and regulatory guidelines.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
