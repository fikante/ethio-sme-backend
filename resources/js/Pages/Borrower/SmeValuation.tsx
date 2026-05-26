import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { PageProps } from "@/types";
import { Head, router, usePage } from "@inertiajs/react";
import {
    ArcElement,
    DoughnutController,
    Chart as ChartJS,
    type ChartData,
    type ChartOptions,
} from "chart.js";
import {
    chartFont,
    ensureChartsRegistered,
    getChartPalette,
    useIsDarkMode,
} from "@/lib/chartTheme";
import { useMemo } from "react";
import { Doughnut, Line } from "react-chartjs-2";
import { CheckCircle, AlertTriangle, BarChart2, ChevronRight } from "lucide-react";
import { formatEtb } from "@/lib/format";

// Register Doughnut-specific elements not covered by ensureChartsRegistered()
ChartJS.register(ArcElement, DoughnutController);
ensureChartsRegistered();

// ---- Types ----------------------------------------------------------------

interface ForecastPoint {
    day: string;
    expected: number | null;
    range_low: number | null;
    range_high: number | null;
}

interface ShapDriver {
    label: string;
    value: number;
    feature: string;
    tip?: string | null;
}

interface SmeValuationData {
    evaluated_at: string;
    band_label: string;
    band_color: "green" | "amber" | "red" | "zinc";
    band_score_hint: string;
    forecast_chart: ForecastPoint[];
    horizon_days: number;
    shap_drivers: {
        boosters: ShapDriver[];
        drags: ShapDriver[];
    };
    avg_net_30d: number;
    positive_ratio: number;
    avg_txn_14d: number;
    psycho_score: number | null;
    next_steps: string[];
    app_status: string;
    horizon_warning: boolean;
}

interface BusinessSummary {
    id: number;
    uuid: string;
    business_name: string;
    sector: string | null;
    sub_city: string | null;
}

type Props = PageProps<{
    businesses: BusinessSummary[];
    valuation: SmeValuationData | null;
    canRunValuation: boolean;
}>;

// ---- Band helpers ---------------------------------------------------------

type BandColor = "green" | "amber" | "red" | "zinc";

function bandBg(color: BandColor): string {
    return {
        green: "bg-green-50 border border-green-300 dark:bg-green-950/60 dark:border-green-800/50",
        amber: "bg-amber-50 border border-amber-300 dark:bg-amber-950/60 dark:border-amber-800/50",
        red:   "bg-red-50 border border-red-200 dark:bg-red-950/60 dark:border-red-800/50",
        zinc:  "bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800",
    }[color];
}

function bandText(color: BandColor): string {
    return {
        green: "text-green-700 dark:text-green-300",
        amber: "text-amber-700 dark:text-amber-300",
        red:   "text-red-700 dark:text-red-300",
        zinc:  "text-gray-700 dark:text-zinc-300",
    }[color];
}

// ---- Sub-components -------------------------------------------------------

function CashFlowStrengthCard({ avgNet30d }: { avgNet30d: number }) {
    const { label, dot } =
        avgNet30d > 5000
            ? { label: "Strong",          dot: "bg-green-400" }
            : avgNet30d >= 0
            ? { label: "Moderate",        dot: "bg-amber-400" }
            : { label: "Needs attention", dot: "bg-red-400" };

    return (
        <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-2">
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
                Cash Flow Strength
            </p>
            <div className="flex items-center gap-2 mt-1">
                <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                <span className="text-base font-semibold text-gray-900 dark:text-white">{label}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
                {formatEtb(avgNet30d)} avg. daily net
            </p>
        </div>
    );
}

function RevenueConsistencyCard({
    positiveRatio,
    isDark,
    palette,
}: {
    positiveRatio: number;
    isDark: boolean;
    palette: ReturnType<typeof getChartPalette>;
}) {
    const remainder = Math.max(0, 100 - positiveRatio);

    const chartData: ChartData<"doughnut"> = {
        datasets: [
            {
                data: [positiveRatio, remainder],
                backgroundColor: [
                    isDark ? "rgba(74,222,128,0.85)" : "rgba(22,163,74,0.85)",
                    isDark ? "rgba(63,63,70,0.6)" : "rgba(212,212,216,0.6)",
                ],
                borderWidth: 0,
                hoverOffset: 0,
            },
        ],
    };

    const chartOptions: ChartOptions<"doughnut"> = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "72%",
        animation: { duration: 500 },
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
            datalabels: { display: false },
        },
    };

    return (
        <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-2">
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
                Revenue Consistency
            </p>
            <div className="relative mx-auto" style={{ width: 80, height: 80 }}>
                <Doughnut data={chartData} options={chartOptions} />
                <span
                    className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900 dark:text-white"
                    style={{ pointerEvents: "none" }}
                >
                    {positiveRatio}%
                </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-zinc-400 text-center">
                positive cash flow days
            </p>
        </div>
    );
}

function FinancialDisciplineCard({ psychoScore }: { psychoScore: number | null }) {
    if (psychoScore === null) {
        return (
            <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-2">
                <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
                    Financial Discipline
                </p>
                <p className="text-sm text-gray-400 dark:text-zinc-500 mt-2">
                    Complete your psychometric assessment to see this score.
                </p>
            </div>
        );
    }

    const barColor =
        psychoScore >= 70
            ? "bg-green-500"
            : psychoScore >= 40
            ? "bg-amber-500"
            : "bg-red-500";

    return (
        <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-2">
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
                Financial Discipline
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                {psychoScore}
                <span className="text-sm font-normal text-gray-500 dark:text-zinc-400">/100</span>
            </p>
            <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                <div
                    className={`h-2 rounded-full ${barColor} transition-all duration-500`}
                    style={{ width: `${Math.min(100, psychoScore)}%` }}
                />
            </div>
            <p className="text-xs text-gray-400 dark:text-zinc-500">Financial Discipline Score</p>
        </div>
    );
}

function TransactionActivityCard({ avgTxn14d }: { avgTxn14d: number }) {
    return (
        <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-2">
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
                Transaction Activity
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {avgTxn14d.toLocaleString("en-US")}
            </p>
            <p className="text-sm text-gray-500 dark:text-zinc-400">avg. daily transactions (14-day)</p>
        </div>
    );
}

function ForecastChart({
    data: forecastData,
    horizonDays,
    horizonWarning,
    palette,
}: {
    data: ForecastPoint[];
    horizonDays: number;
    horizonWarning: boolean;
    palette: ReturnType<typeof getChartPalette>;
}) {
    const labels = useMemo(
        () => forecastData.map((p) => p.day),
        [forecastData],
    );

    const expectedValues = useMemo(
        () => forecastData.map((p) => p.expected),
        [forecastData],
    );
    const highValues = useMemo(
        () => forecastData.map((p) => p.range_high),
        [forecastData],
    );
    const lowValues = useMemo(
        () => forecastData.map((p) => p.range_low),
        [forecastData],
    );

    const chartData: ChartData<"line"> = useMemo(
        () => ({
            labels,
            datasets: [
                {
                    label: "Forecast Range (High)",
                    data: highValues,
                    borderColor: "rgba(59,130,246,0.4)",
                    backgroundColor: "rgba(59,130,246,0.1)",
                    fill: true,
                    borderDash: [4, 4],
                    borderWidth: 1.5,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0.3,
                },
                {
                    label: "Expected Cash Flow",
                    data: expectedValues,
                    borderColor: "#ffffff",
                    backgroundColor: "transparent",
                    fill: false,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    tension: 0.3,
                },
                {
                    label: "Forecast Range (Low)",
                    data: lowValues,
                    borderColor: "rgba(59,130,246,0.4)",
                    backgroundColor: "transparent",
                    fill: false,
                    borderDash: [4, 4],
                    borderWidth: 1.5,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0.3,
                },
            ],
        }),
        [labels, expectedValues, highValues, lowValues],
    );

    const maxTicks = Math.ceil(horizonDays / 5);

    const chartOptions: ChartOptions<"line"> = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false,
            },
            animation: { duration: 500, easing: "easeOutQuart" },
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
                        label: (ctx) => {
                            const v = ctx.parsed.y;
                            return `${ctx.dataset.label}: ${formatEtb(v)}`;
                        },
                    },
                },
                datalabels: { display: false },
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { color: palette.border },
                    ticks: {
                        color: palette.textMuted,
                        maxRotation: 0,
                        maxTicksLimit: maxTicks,
                        font: chartFont(),
                    },
                },
                y: {
                    title: {
                        display: true,
                        text: "ETB",
                        color: palette.textMuted,
                        font: chartFont("bold"),
                    },
                    grid: { color: palette.grid },
                    border: { display: false },
                    ticks: {
                        color: palette.textMuted,
                        callback: (value) =>
                            Number(value).toLocaleString("en-US"),
                        font: chartFont(),
                    },
                },
            },
        }),
        [palette, maxTicks],
    );

    return (
        <div className="space-y-3">
            {horizonWarning && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>
                        Note: This forecast is based on limited data and may be
                        less precise than usual.
                    </span>
                </div>
            )}
            <div style={{ height: 280 }}>
                <Line data={chartData} options={chartOptions} />
            </div>
        </div>
    );
}

function ShapSection({
    boosters,
    drags,
}: {
    boosters: ShapDriver[];
    drags: ShapDriver[];
}) {
    const noData = boosters.length === 0 && drags.length === 0;

    if (noData) {
        return (
            <p className="text-sm text-gray-400 dark:text-zinc-500">
                No detailed analysis available yet.
            </p>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Strengths */}
            <div className="space-y-2">
                <p className="text-sm font-semibold text-green-400 flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" />
                    Strengths
                </p>
                {boosters.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-zinc-500">
                        No positive drivers identified yet.
                    </p>
                ) : (
                    boosters.map((d) => (
                        <div
                            key={d.feature}
                            className="bg-green-50 border border-green-200 dark:bg-green-950/40 dark:border-green-800/40 rounded-lg p-3 flex items-center gap-2 text-green-700 dark:text-green-300 text-sm"
                        >
                            <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{d.label}</span>
                        </div>
                    ))
                )}
            </div>

            {/* Areas to improve */}
            <div className="space-y-2">
                <p className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    Areas to Improve
                </p>
                {drags.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-zinc-500">
                        No negative drivers identified.
                    </p>
                ) : (
                    drags.map((d) => (
                        <div
                            key={d.feature}
                            className="bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/40 rounded-lg p-3 space-y-1"
                        >
                            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm">
                                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>{d.label}</span>
                            </div>
                            {d.tip && (
                                <p className="text-xs text-gray-500 dark:text-zinc-400 pl-5">
                                    Tip: {d.tip}
                                </p>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function NextStepsCard({ steps }: { steps: string[] }) {
    return (
        <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ChevronRight className="h-5 w-5 text-gray-400 dark:text-zinc-400" />
                Your Next Steps
            </h3>
            <ol className="space-y-3">
                {steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-zinc-400">
                            {idx + 1}
                        </span>
                        <span className="text-sm text-gray-900 dark:text-white leading-relaxed">
                            {step}
                        </span>
                    </li>
                ))}
            </ol>
        </div>
    );
}

// ---- Main page ------------------------------------------------------------

export default function SmeValuation() {
    const { businesses, valuation, canRunValuation } =
        usePage<Props>().props;
    const flash = usePage().props.flash as {
        success?: string;
        error?: string;
    };

    const isDark  = useIsDarkMode();
    const palette = useMemo(() => getChartPalette(isDark), [isDark]);

    const primary = businesses[0];

    const runValuation = () => {
        if (!primary) return;
        router.post(route("sme.valuation.run", primary.id));
    };

    const formattedDate = valuation?.evaluated_at
        ? new Date(valuation.evaluated_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
          })
        : "";

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-900 dark:text-white">
                    My Valuation
                </h2>
            }
        >
            <Head title="My Valuation" />

            <div className="space-y-6 py-8">
                {/* Flash messages */}
                {flash?.success && (
                    <p className="rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/60 px-4 py-3 text-sm text-green-700 dark:text-green-300">
                        {flash.success}
                    </p>
                )}
                {flash?.error && (
                    <p className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/60 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                        {flash.error}
                    </p>
                )}

                {/* Business header */}
                {primary && (
                    <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 p-4">
                        <p className="text-xs text-gray-400 dark:text-zinc-500 uppercase tracking-wide">
                            Business
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white mt-0.5">
                            {primary.business_name}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                            {primary.sector && <>{primary.sector} · </>}
                            {primary.sub_city && <>{primary.sub_city} · </>}
                            <span className="font-mono">{primary.uuid}</span>
                        </p>
                    </div>
                )}

                {/* ── No valuation yet ── */}
                {!valuation && !canRunValuation && (
                    <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center space-y-3">
                        <BarChart2 className="mx-auto h-10 w-10 text-gray-300 dark:text-zinc-600" />
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            No valuation data yet
                        </p>
                        <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-md mx-auto">
                            Submit your loan application and complete your
                            psychometric assessment to get your evaluation
                            results.
                        </p>
                    </div>
                )}

                {/* ── Ready to run but no valuation ── */}
                {!valuation && canRunValuation && (
                    <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center space-y-4">
                        <BarChart2 className="mx-auto h-10 w-10 text-gray-300 dark:text-zinc-400" />
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            Your application is ready for AI evaluation
                        </p>
                        <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-md mx-auto">
                            Our AI engine will analyse your transaction history
                            and business profile to generate your evaluation
                            report.
                        </p>
                        <button
                            type="button"
                            onClick={runValuation}
                            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 transition-colors"
                        >
                            Run AI Evaluation
                        </button>
                    </div>
                )}

                {/* ── Valuation exists ── */}
                {valuation && (
                    <>
                        {/* Section 1: Evaluation Status Banner */}
                        <div
                            className={`rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${bandBg(valuation.band_color)}`}
                        >
                            <CheckCircle
                                className={`h-8 w-8 flex-shrink-0 ${bandText(valuation.band_color)}`}
                            />
                            <div className="flex-1">
                                <p
                                    className={`text-base font-semibold ${bandText(valuation.band_color)}`}
                                >
                                    Your Application Has Been Evaluated
                                </p>
                                <p
                                    className={`text-sm ${bandText(valuation.band_color)} opacity-80`}
                                >
                                    {valuation.band_label} · Evaluated{" "}
                                    {formattedDate}
                                </p>
                                {valuation.band_score_hint && (
                                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                                        {valuation.band_score_hint}
                                    </p>
                                )}
                            </div>
                            {canRunValuation && (
                                <button
                                    type="button"
                                    onClick={runValuation}
                                    className="flex-shrink-0 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                                >
                                    Re-run Evaluation
                                </button>
                            )}
                        </div>

                        {/* Section 2: Financial Health Scorecard */}
                        <div>
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400 mb-3">
                                Financial Health Scorecard
                            </h3>
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                <CashFlowStrengthCard
                                    avgNet30d={valuation.avg_net_30d}
                                />
                                <RevenueConsistencyCard
                                    positiveRatio={valuation.positive_ratio}
                                    isDark={isDark}
                                    palette={palette}
                                />
                                <FinancialDisciplineCard
                                    psychoScore={valuation.psycho_score}
                                />
                                <TransactionActivityCard
                                    avgTxn14d={valuation.avg_txn_14d}
                                />
                            </div>
                        </div>

                        {/* Section 3: Cash Flow Forecast Chart */}
                        {valuation.forecast_chart.length > 0 && (
                            <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                        Your Projected Cash Flow
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
                                        This shows our projection of your
                                        business's daily cash flow over the
                                        coming period, based on your transaction
                                        history.
                                    </p>
                                </div>
                                <ForecastChart
                                    data={valuation.forecast_chart}
                                    horizonDays={valuation.horizon_days}
                                    horizonWarning={valuation.horizon_warning}
                                    palette={palette}
                                />
                            </div>
                        )}

                        {/* Section 4: What's Helping / What Needs Attention */}
                        <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                What's Helping &amp; What Needs Attention
                            </h3>
                            <ShapSection
                                boosters={valuation.shap_drivers.boosters}
                                drags={valuation.shap_drivers.drags}
                            />
                        </div>

                        {/* Section 5: Next Steps */}
                        {valuation.next_steps.length > 0 && (
                            <NextStepsCard steps={valuation.next_steps} />
                        )}
                    </>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
