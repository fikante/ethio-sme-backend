import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { PageProps } from '@/types';
import type {
    AiHealth,
    DbHealth,
    LoanOfficerStats,
    LoanProviderAnalytics,
    SmeOwnerStats,
    SuperAdminStats,
} from '@/types/dashboard';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { isLoanProviderRole } from '@/lib/roles';
import {
    ensureChartsRegistered,
    getChartPalette,
    chartFont,
    useIsDarkMode,
} from '@/lib/chartTheme';
import {
    ArcElement,
    DoughnutController,
    BarElement,
    CategoryScale,
    LinearScale,
    Chart as ChartJS,
    type ChartData,
    type ChartOptions,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
    Activity,
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    BarChart2,
    Banknote,
    Brain,
    Building2,
    CheckCircle,
    ChevronRight,
    Clock,
    Database,
    FileStack,
    FileText,
    Loader2,
    Minus,
    Scale,
    ShieldCheck,
    TrendingDown,
    TrendingUp,
    XCircle,
} from 'lucide-react';
import {
    ReactNode,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

// Register Chart.js components needed for SME owner dashboard
// (ArcElement/DoughnutController are not in ensureChartsRegistered — register them here)
ChartJS.register(ArcElement, DoughnutController);
// Also ensure the shared set (CategoryScale, LinearScale, Line, etc.) is registered
ensureChartsRegistered();

// ─── Formatters ───────────────────────────────────────────────────────────────

const etbFormatter = new Intl.NumberFormat('en-ET', {
    maximumFractionDigits: 0,
});

export function formatEtb(amount: string | number | null | undefined): string {
    if (amount === null || amount === undefined || amount === '') {
        return 'Pending';
    }
    const n = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (Number.isNaN(n)) return 'Pending';
    return `${etbFormatter.format(n)} ETB`;
}

function formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-ET', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function formatApr(apr: string | number | null | undefined): string {
    if (apr === null || apr === undefined || apr === '') return '—';
    const n = typeof apr === 'string' ? parseFloat(apr) : apr;
    if (Number.isNaN(n)) return '—';
    return `${(n * 100).toFixed(1)}%`;
}

function greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 800): number {
    const [value, setValue] = useState(0);

    useEffect(() => {
        if (target <= 0) {
            setValue(0);
            return;
        }
        const start = performance.now();
        let frameId: number;

        const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            setValue(Math.round(progress * target));
            if (progress < 1) {
                frameId = requestAnimationFrame(tick);
            }
        };

        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
    }, [target, duration]);

    return value;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const cardClass =
    'rounded-2xl border shadow-sm transition-shadow duration-200 hover:shadow-md ' +
    'bg-white border-gray-200 dark:bg-zinc-900 dark:border-zinc-800';

const pageClass =
    'min-h-full bg-gray-50 p-6 text-gray-900 dark:bg-zinc-950 dark:text-zinc-100';

const mutedClass = 'text-gray-500 dark:text-zinc-400';

// ─── Status & risk badges ─────────────────────────────────────────────────────

const statusConfig: Record<
    string,
    { label: string; bg: string; text: string; dot: string }
> = {
    draft: {
        label: 'Draft',
        bg: 'bg-gray-500/10',
        text: 'text-gray-500 dark:text-gray-400',
        dot: 'bg-gray-400',
    },
    submitted: {
        label: 'Submitted',
        bg: 'bg-gray-500/10',
        text: 'text-gray-500 dark:text-gray-400',
        dot: 'bg-gray-400',
    },
    queued_for_ai: {
        label: 'Queued',
        bg: 'bg-blue-500/10',
        text: 'text-blue-600 dark:text-blue-400',
        dot: 'bg-blue-400',
    },
    processing: {
        label: 'Processing',
        bg: 'bg-amber-500/10',
        text: 'text-amber-600 dark:text-amber-400',
        dot: 'bg-amber-400 animate-pulse',
    },
    evaluated: {
        label: 'Evaluated',
        bg: 'bg-purple-500/10',
        text: 'text-purple-600 dark:text-purple-400',
        dot: 'bg-purple-400',
    },
    approved: {
        label: 'Approved',
        bg: 'bg-green-500/10',
        text: 'text-green-600 dark:text-green-400',
        dot: 'bg-green-400',
    },
    rejected: {
        label: 'Rejected',
        bg: 'bg-red-500/10',
        text: 'text-red-600 dark:text-red-400',
        dot: 'bg-red-400',
    },
};

function StatusBadge({ status }: { status: string }) {
    const cfg = statusConfig[status] ?? {
        label: status.replace(/_/g, ' '),
        bg: 'bg-gray-500/10',
        text: 'text-gray-500',
        dot: 'bg-gray-400',
    };
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

const riskConfig: Record<string, { label: string; color: string }> = {
    low: {
        label: 'Low Risk',
        color: 'text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20',
    },
    medium: {
        label: 'Medium Risk',
        color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    high: {
        label: 'High Risk',
        color: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20',
    },
};

function RiskBandBadge({ band }: { band: string | null | undefined }) {
    if (!band) {
        return (
            <span className={`text-sm font-medium ${mutedClass}`}>
                Not yet scored
            </span>
        );
    }
    const key = band.toLowerCase();
    const cfg = riskConfig[key] ?? {
        label: band,
        color: 'text-gray-600 bg-gray-500/10 border-gray-500/20',
    };
    return (
        <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}
        >
            {cfg.label}
        </span>
    );
}

function SectionDivider({ title }: { title: string }) {
    return (
        <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-800" />
            <span
                className={`text-xs font-semibold uppercase tracking-widest ${mutedClass}`}
            >
                {title}
            </span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-800" />
        </div>
    );
}

function EmptyState({
    icon,
    title,
    description,
    actionHref,
    actionLabel,
}: {
    icon: ReactNode;
    title: string;
    description: string;
    actionHref: string;
    actionLabel: string;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-zinc-800">
                {icon}
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                {title}
            </p>
            <p className={`mt-1 mb-4 text-xs ${mutedClass}`}>{description}</p>
            <Link
                href={actionHref}
                className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
                {actionLabel}
                <ChevronRight className="h-4 w-4" />
            </Link>
        </div>
    );
}

function SkeletonCard() {
    return (
        <div className={`${cardClass} animate-pulse p-5`}>
            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-zinc-800" />
            <div className="mt-4 h-8 w-32 rounded bg-gray-200 dark:bg-zinc-800" />
        </div>
    );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

type KpiColor = 'green' | 'blue' | 'gold' | 'red';

const kpiColorStyles: Record<
    KpiColor,
    { iconBg: string; iconText: string; border: string }
> = {
    green: {
        iconBg: 'bg-[#085041]/20 dark:bg-[#5DCAA5]/10',
        iconText: 'text-[#085041] dark:text-[#5DCAA5]',
        border: 'border-[#085041]/30 dark:border-[#5DCAA5]/30',
    },
    blue: {
        iconBg: 'bg-[#0C447C]/20 dark:bg-[#85B7EB]/10',
        iconText: 'text-[#0C447C] dark:text-[#85B7EB]',
        border: 'border-[#0C447C]/30 dark:border-[#85B7EB]/30',
    },
    gold: {
        iconBg: 'bg-[#D4A017]/20',
        iconText: 'text-[#D4A017]',
        border: 'border-[#D4A017]/30',
    },
    red: {
        iconBg: 'bg-red-500/10',
        iconText: 'text-red-500 dark:text-red-400',
        border: 'border-red-500/30',
    },
};

function KpiCard({
    label,
    displayValue,
    numericValue,
    subtext,
    icon,
    trend,
    color,
}: {
    label: string;
    displayValue?: ReactNode;
    numericValue?: number;
    subtext?: string;
    icon: ReactNode;
    trend?: { direction: 'up' | 'down' | 'neutral'; value: string };
    color: KpiColor;
}) {
    const animated = useCountUp(numericValue ?? 0);
    const styles = kpiColorStyles[color];

    const valueContent =
        numericValue !== undefined ? (
            <span className="text-3xl font-bold tabular-nums text-gray-900 dark:text-zinc-100">
                {etbFormatter.format(animated)}
            </span>
        ) : (
            <div className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
                {displayValue}
            </div>
        );

    return (
        <div
            className={`${cardClass} border ${styles.border} bg-gradient-to-br from-white to-gray-50/80 p-5 dark:from-zinc-900 dark:to-zinc-800/50`}
        >
            <div className="flex items-start gap-4">
                <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${styles.iconBg} ${styles.iconText}`}
                >
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    <p
                        className={`text-xs font-medium uppercase tracking-wide ${mutedClass}`}
                    >
                        {label}
                    </p>
                    <div className="mt-1">{valueContent}</div>
                    {subtext && (
                        <p className={`mt-1 text-xs ${mutedClass}`}>{subtext}</p>
                    )}
                </div>
            </div>
            {trend && (
                <div className="mt-3 flex items-center gap-1 text-xs">
                    {trend.direction === 'up' && (
                        <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
                    )}
                    {trend.direction === 'down' && (
                        <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                    )}
                    {trend.direction === 'neutral' && (
                        <Minus className="h-3.5 w-3.5 text-gray-400" />
                    )}
                    <span
                        className={
                            trend.direction === 'up'
                                ? 'text-green-600 dark:text-green-400'
                                : trend.direction === 'down'
                                  ? 'text-red-600 dark:text-red-400'
                                  : mutedClass
                        }
                    >
                        {trend.value}
                    </span>
                </div>
            )}
        </div>
    );
}

function DataCoverageValue({ days }: { days: number }) {
    const animated = useCountUp(days);
    return (
        <span className="text-3xl font-bold tabular-nums text-[#0F1A16] dark:text-[#F0FDF4]">
            {animated}{' '}
            <span className="text-lg font-semibold">days</span>
        </span>
    );
}

function AiHealthPill({ health }: { health: AiHealth }) {
    const online = health.status === 'healthy';
    return (
        <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                online
                    ? 'border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400'
                    : 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400'
            }`}
        >
            <span
                className={`h-2 w-2 rounded-full ${
                    online ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}
                style={online ? { animationDuration: '3s' } : undefined}
            />
            {online ? 'AI Service Online' : 'AI Service Offline'}
            {health.latency !== null && online && (
                <span className={mutedClass}>· {health.latency}ms</span>
            )}
        </div>
    );
}

function DbHealthPill({ health }: { health: DbHealth }) {
    const online = health.status === 'connected';
    return (
        <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                online
                    ? 'border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400'
                    : 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400'
            }`}
        >
            <span
                className={`h-2 w-2 rounded-full ${
                    online ? 'bg-green-500' : 'bg-red-500'
                }`}
            />
            {online ? `${health.host} Connected` : `${health.host} Error`}
            {health.latency !== null && online && (
                <span className={mutedClass}>· {health.latency}ms</span>
            )}
        </div>
    );
}

// ─── SME Owner ────────────────────────────────────────────────────────────────

const APPLICATION_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    draft:                { label: 'Draft — complete your application',     color: 'text-zinc-400' },
    submitted:            { label: 'Submitted — under review',              color: 'text-blue-400' },
    pending_psychometric: { label: 'Action Required — complete assessment', color: 'text-amber-400' },
    pending_data_sync:    { label: 'Syncing your financial data…',          color: 'text-blue-400' },
    queued_for_ai:        { label: 'In queue for AI evaluation',            color: 'text-blue-400' },
    processing:           { label: 'AI is evaluating your application',     color: 'text-purple-400' },
    evaluated:            { label: 'Evaluation complete',                   color: 'text-green-400' },
    approved:             { label: 'Congratulations — Approved!',           color: 'text-emerald-400' },
    rejected:             { label: 'Decision: Not approved at this time',   color: 'text-red-400' },
    withdrawn:            { label: 'Application withdrawn',                 color: 'text-zinc-500' },
};

// ─── SME Owner: Application Status Card ──────────────────────────────────────

function AppStatusCard({
    latestApplication,
}: {
    latestApplication: SmeOwnerStats['latestApplication'];
}) {
    const cfg = latestApplication
        ? (APPLICATION_STATUS_LABELS[latestApplication.status] ?? {
              label: latestApplication.status.replace(/_/g, ' '),
              color: 'text-zinc-400',
          })
        : null;

    return (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
                Application Status
            </p>
            {latestApplication && cfg ? (
                <div className="space-y-3">
                    <p className={`text-sm font-semibold ${cfg.color}`}>
                        {cfg.label}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-400 dark:text-zinc-500">
                        <span>
                            Requested:{' '}
                            <span className="text-gray-700 dark:text-zinc-300 font-medium">
                                ETB {latestApplication.requested_amount.toLocaleString('en-ET')}
                            </span>
                        </span>
                        {latestApplication.submitted_at && (
                            <span>{formatDate(latestApplication.submitted_at)}</span>
                        )}
                    </div>
                    {latestApplication.status === 'pending_psychometric' && (
                        <Link
                            href="/psychometrics"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-amber-400 transition"
                        >
                            Complete Assessment →
                        </Link>
                    )}
                    {latestApplication.apr !== null && (
                        <p className="text-xs text-gray-400 dark:text-zinc-500">
                            Indicative APR:{' '}
                            <span className="text-gray-700 dark:text-zinc-300">{formatApr(latestApplication.apr)}</span>
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-sm text-gray-400 dark:text-zinc-500">No active application.</p>
                    <Link
                        href="/loan-application"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 transition"
                    >
                        Start Your Application →
                    </Link>
                </div>
            )}
        </div>
    );
}

// ─── SME Owner: Financial Health Score Donut ─────────────────────────────────

function HealthScoreCard({ score }: { score: number }) {
    const isDark = useIsDarkMode();
    const palette = useMemo(() => getChartPalette(isDark), [isDark]);

    const ringColor =
        score >= 70 ? '#4ade80' : score >= 40 ? '#fbbf24' : '#f87171';
    const trackColor = isDark ? '#27272a' : '#e4e4e7';

    const data: ChartData<'doughnut'> = useMemo(
        () => ({
            datasets: [
                {
                    data: [score, 100 - score],
                    backgroundColor: [ringColor, trackColor],
                    borderWidth: 0,
                    hoverBackgroundColor: [ringColor, trackColor],
                },
            ],
        }),
        [score, ringColor, trackColor],
    );

    const centerTextPlugin = useMemo(
        () => ({
            id: 'centerText',
            afterDraw(chart: ChartJS) {
                const { ctx, chartArea } = chart;
                if (!chartArea) return;
                const x = (chartArea.left + chartArea.right) / 2;
                const y = (chartArea.top + chartArea.bottom) / 2;
                ctx.save();
                ctx.font = `bold 28px ${chartFont().family}`;
                ctx.fillStyle = palette.text;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(score), x, y);
                ctx.restore();
            },
        }),
        [score, palette.text],
    );

    const options: ChartOptions<'doughnut'> = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: true,
            cutout: '72%',
            animation: { duration: 700, easing: 'easeOutQuart' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    borderWidth: 1,
                    titleColor: palette.text,
                    bodyColor: palette.textMuted,
                    callbacks: {
                        label: (ctx) =>
                            ctx.dataIndex === 0
                                ? `Score: ${score}/100`
                                : `Remaining: ${100 - score}`,
                    },
                },
            },
        }),
        [palette, score],
    );

    return (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col items-center">
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-3 self-start">
                Financial Health Score
            </p>
            <div className="w-36 h-36">
                <Doughnut
                    data={data}
                    options={options}
                    plugins={[centerTextPlugin]}
                />
            </div>
            <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">{score}/100</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500 text-center">
                Based on cash flow, transactions &amp; assessment
            </p>
        </div>
    );
}

// ─── SME Owner: Cash Flow Trend Sparkline ────────────────────────────────────

function CashflowTrendCard({
    trend,
}: {
    trend: SmeOwnerStats['cashflowTrend'];
}) {
    const isDark = useIsDarkMode();
    const palette = useMemo(() => getChartPalette(isDark), [isDark]);

    const values = useMemo(() => trend.map((t) => t.net), [trend]);
    const labels = useMemo(() => trend.map((t) => t.date), [trend]);
    const minVal  = values.length ? Math.min(...values) : 0;
    const maxVal  = values.length ? Math.max(...values) : 0;

    const data: ChartData<'line'> = useMemo(
        () => ({
            labels,
            datasets: [
                {
                    label: 'Net Cash Flow',
                    data: values,
                    borderColor: palette.positive,
                    backgroundColor: `${palette.positive}22`,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderWidth: 1.5,
                },
                {
                    label: 'Zero line',
                    data: values.map(() => 0),
                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                    borderDash: [4, 4],
                    pointRadius: 0,
                    borderWidth: 1,
                    fill: false,
                },
            ],
        }),
        [labels, values, palette, isDark],
    );

    const options: ChartOptions<'line'> = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 500 },
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    borderWidth: 1,
                    titleColor: palette.text,
                    bodyColor: palette.textMuted,
                    callbacks: {
                        title: (items) => items[0]?.label ?? '',
                        label: (ctx) =>
                            ctx.datasetIndex === 0
                                ? `ETB ${Number(ctx.parsed.y).toLocaleString('en-ET')}`
                                : '',
                    },
                },
                datalabels: { display: false },
            },
            scales: {
                x: { display: false },
                y: { display: false },
            },
        }),
        [palette],
    );

    return (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
                Recent Cash Flow Activity
            </p>
            {trend.length > 1 ? (
                <>
                    <div style={{ height: 80 }}>
                        <Line data={data} options={options} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-400 dark:text-zinc-500">
                        <span>
                            Low:{' '}
                            <span className="text-red-400 font-medium">
                                ETB {minVal.toLocaleString('en-ET')}
                            </span>
                        </span>
                        <span className="text-gray-400 dark:text-zinc-600">Last 30 days</span>
                        <span>
                            High:{' '}
                            <span className="text-green-400 font-medium">
                                ETB {maxVal.toLocaleString('en-ET')}
                            </span>
                        </span>
                    </div>
                </>
            ) : (
                <p className="text-sm text-gray-400 dark:text-zinc-500">
                    No cash flow data available yet.
                </p>
            )}
        </div>
    );
}

// ─── SME Owner: Transaction Activity Card ────────────────────────────────────

function TxnActivityCard({
    txnActivity,
}: {
    txnActivity: SmeOwnerStats['txnActivity'];
}) {
    return (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
                Daily Transaction Activity
            </p>
            {txnActivity ? (
                <div className="space-y-2">
                    <div>
                        <span className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
                            {txnActivity.avg_recent}
                        </span>
                        <span className="ml-2 text-sm text-gray-400 dark:text-zinc-500">
                            avg. daily transactions
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                        {txnActivity.direction === 'up' ? (
                            <>
                                <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                                <span className="text-green-400 font-medium">
                                    ↑ {txnActivity.trend_pct}% vs prior 14 days
                                </span>
                            </>
                        ) : (
                            <>
                                <TrendingDown className="h-3.5 w-3.5 text-amber-400" />
                                <span className="text-amber-400 font-medium">
                                    ↓ {Math.abs(txnActivity.trend_pct)}% vs prior 14 days
                                </span>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <p className="text-sm text-gray-400 dark:text-zinc-500">No data yet.</p>
            )}
        </div>
    );
}

// ─── SME Owner: Data Coverage Card ───────────────────────────────────────────

function DataCoverageCard({ days }: { days: number }) {
    const pct = Math.min(Math.round((days / 365) * 100), 100);
    const animated = useCountUp(pct);

    return (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
                Financial History Coverage
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
                {days}{' '}
                <span className="text-lg font-semibold text-gray-500 dark:text-zinc-400">days</span>
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">
                {pct}% toward full 365-day coverage
            </p>
            <div className="mt-3 h-1.5 w-full rounded-full bg-gray-200 dark:bg-zinc-700">
                <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-700"
                    style={{ width: `${animated}%` }}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${pct}% financial history coverage`}
                />
            </div>
        </div>
    );
}

// ─── SME Owner: Psychometric Assessment Card ──────────────────────────────────

function PsychometricCard({
    psychometricAssessment,
}: {
    psychometricAssessment: SmeOwnerStats['psychometricAssessment'];
}) {
    const done = psychometricAssessment?.completed ?? false;

    return (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
                Psychometric Assessment
            </p>
            {done ? (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
                        <span className="text-sm font-semibold text-green-400">
                            Assessment Complete
                        </span>
                    </div>
                    {psychometricAssessment?.completed_at && (
                        <p className="text-xs text-gray-400 dark:text-zinc-500">
                            Completed {formatDate(psychometricAssessment.completed_at)}
                        </p>
                    )}
                    {psychometricAssessment?.composite_score !== null &&
                        psychometricAssessment?.composite_score !== undefined && (
                            <p className="text-xs text-gray-500 dark:text-zinc-400">
                                Score:{' '}
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    {Math.round(psychometricAssessment.composite_score)}/100
                                </span>
                            </p>
                        )}
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                        <span className="text-sm font-semibold text-amber-400">
                            Assessment Pending
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-zinc-500">
                        Completing the assessment strengthens your credit profile.
                    </p>
                    <Link
                        href="/psychometrics"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-amber-400 transition"
                    >
                        Complete Now →
                    </Link>
                </div>
            )}
        </div>
    );
}

// ─── SME Owner: Score Boosters & Drags ────────────────────────────────────────

function ShapDriversPanel({
    shapDrivers,
}: {
    shapDrivers: SmeOwnerStats['shapDrivers'];
}) {
    const hasAny =
        shapDrivers.boosters.length > 0 || shapDrivers.drags.length > 0;

    return (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
                Your Credit Profile Analysis
            </p>
            {hasAny ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Boosters */}
                    <div>
                        <p className="text-xs font-semibold text-green-400 mb-3">
                            What&apos;s Working For You
                        </p>
                        {shapDrivers.boosters.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {shapDrivers.boosters.map((b) => (
                                    <span
                                        key={b.feature}
                                        className="inline-flex items-center rounded-full bg-green-50 border border-green-200 dark:bg-green-900/40 dark:border-green-700/50 text-green-700 dark:text-green-300 px-3 py-1 text-xs font-medium"
                                    >
                                        {b.label}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 dark:text-zinc-500">
                                No positive drivers identified yet.
                            </p>
                        )}
                    </div>

                    {/* Drags */}
                    <div>
                        <p className="text-xs font-semibold text-amber-400 mb-3">
                            Areas to Watch
                        </p>
                        {shapDrivers.drags.length > 0 ? (
                            <div className="space-y-2">
                                {shapDrivers.drags.map((d) => (
                                    <div key={d.feature}>
                                        <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 dark:bg-amber-900/40 dark:border-amber-700/50 text-amber-700 dark:text-amber-300 px-3 py-1 text-xs font-medium">
                                            {d.label}
                                        </span>
                                        {d.tip && (
                                            <p className="mt-1 ml-1 text-xs text-gray-400 dark:text-zinc-500">
                                                {d.tip}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 dark:text-zinc-500">
                                No drag factors identified.
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-4">
                    Submit your application to see your personalized financial profile analysis.
                </p>
            )}
        </div>
    );
}

// ─── SME Owner: Main Dashboard ────────────────────────────────────────────────

function SmeOwnerDashboard({
    userName,
    stats,
}: {
    userName: string;
    stats: SmeOwnerStats;
}) {
    return (
        <>
            <header className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {greeting()}, {userName.split(' ')[0]}.
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                    Here is your business financial overview.
                </p>
            </header>

            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <AppStatusCard latestApplication={stats.latestApplication} />
                <HealthScoreCard score={stats.healthScore} />
                <CashflowTrendCard trend={stats.cashflowTrend} />
            </div>

            {/* Row 2 */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
                <TxnActivityCard txnActivity={stats.txnActivity} />
                <DataCoverageCard days={stats.coverageDays} />
                <PsychometricCard psychometricAssessment={stats.psychometricAssessment} />
            </div>

            {/* Row 3 — full width */}
            <div className="mt-5">
                <ShapDriversPanel shapDrivers={stats.shapDrivers} />
            </div>
        </>
    );
}

// ─── Loan Officer ─────────────────────────────────────────────────────────────

// Colours for each application status (doughnut chart)
const STATUS_CHART_COLORS: Record<string, string> = {
    draft:                '#6B7280',
    submitted:            '#3B82F6',
    pending_psychometric: '#8B5CF6',
    pending_data_sync:    '#F59E0B',
    queued_for_ai:        '#06B6D4',
    processing:           '#F97316',
    evaluated:            '#10B981',
    approved:             '#059669',
    rejected:             '#EF4444',
    withdrawn:            '#374151',
};

const STATUS_LABELS: Record<string, string> = {
    draft:                'Draft',
    submitted:            'Submitted',
    pending_psychometric: 'Pending Psychometric',
    pending_data_sync:    'Pending Data Sync',
    queued_for_ai:        'Queued for AI',
    processing:           'Processing',
    evaluated:            'Evaluated',
    approved:             'Approved',
    rejected:             'Rejected',
    withdrawn:            'Withdrawn',
};

const SECTOR_PALETTE = [
    '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#F97316', '#EC4899', '#6B7280',
];

function formatEtbAbbrev(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    if (value >= 1_000_000) return `ETB ${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `ETB ${(value / 1_000).toFixed(0)}K`;
    return `ETB ${Math.round(value)}`;
}

// Chart card container with title and empty state support
function ChartCard({
    title,
    isEmpty,
    emptyMessage,
    height = 240,
    children,
}: {
    title: string;
    isEmpty: boolean;
    emptyMessage: string;
    height?: number;
    children: ReactNode;
}) {
    return (
        <div className={`${cardClass} p-5`}>
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                {title}
            </h3>
            {isEmpty ? (
                <div
                    className="flex flex-col items-center justify-center gap-3 text-center"
                    style={{ height }}
                >
                    <BarChart2 className="h-10 w-10 text-gray-300 dark:text-zinc-700" />
                    <p className={`text-xs ${mutedClass}`}>{emptyMessage}</p>
                </div>
            ) : (
                <div style={{ height }}>{children}</div>
            )}
        </div>
    );
}

// A) Status Distribution Doughnut
function StatusDistributionChart({
    data: rawData,
}: {
    data: Record<string, number>;
}) {
    const isDark = useIsDarkMode();
    const palette = useMemo(() => getChartPalette(isDark), [isDark]);
    const entries = Object.entries(rawData).filter(([, v]) => v > 0);
    const isEmpty = entries.length === 0;

    const chartData: ChartData<'doughnut'> = useMemo(
        () => ({
            labels: entries.map(([k]) => STATUS_LABELS[k] ?? k),
            datasets: [
                {
                    data: entries.map(([, v]) => v),
                    backgroundColor: entries.map(([k]) => STATUS_CHART_COLORS[k] ?? '#6B7280'),
                    borderWidth: 2,
                    borderColor: isDark ? '#18181b' : '#ffffff',
                    hoverOffset: 6,
                },
            ],
        }),
        [entries, isDark],
    );

    const options: ChartOptions<'doughnut'> = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            animation: { duration: 600 },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: palette.textMuted,
                        font: chartFont(),
                        boxWidth: 12,
                        padding: 12,
                    },
                },
                tooltip: {
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    borderWidth: 1,
                    titleColor: palette.text,
                    bodyColor: palette.textMuted,
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ${ctx.parsed}`,
                    },
                },
                datalabels: { display: false },
            },
        }),
        [palette],
    );

    return (
        <ChartCard title="Application Status Distribution" isEmpty={isEmpty} emptyMessage="No applications yet" height={300}>
            <Doughnut data={chartData} options={options} />
        </ChartCard>
    );
}

// B) Risk Band Distribution Horizontal Bar
function RiskBandChart({
    data: rawData,
}: {
    data: { low: number; medium: number; high: number };
}) {
    const isDark = useIsDarkMode();
    const palette = useMemo(() => getChartPalette(isDark), [isDark]);
    const total = rawData.low + rawData.medium + rawData.high;
    const isEmpty = total === 0;

    const chartData: ChartData<'bar'> = useMemo(
        () => ({
            labels: ['Low Risk', 'Medium Risk', 'High Risk'],
            datasets: [
                {
                    label: 'Applications',
                    data: [rawData.low, rawData.medium, rawData.high],
                    backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
                    borderRadius: 4,
                    borderSkipped: false,
                },
            ],
        }),
        [rawData],
    );

    const options: ChartOptions<'bar'> = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y' as const,
            animation: { duration: 600 },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    borderWidth: 1,
                    titleColor: palette.text,
                    bodyColor: palette.textMuted,
                    callbacks: {
                        label: (ctx) => `Count: ${ctx.parsed.x}`,
                    },
                },
                datalabels: { display: false },
            },
            scales: {
                x: {
                    ticks: { color: palette.textMuted, font: chartFont() },
                    grid: { color: palette.grid },
                    border: { color: palette.border },
                    title: {
                        display: true,
                        text: 'Number of Applications',
                        color: palette.textMuted,
                        font: chartFont(),
                    },
                },
                y: {
                    ticks: { color: palette.textMuted, font: chartFont() },
                    grid: { display: false },
                    border: { display: false },
                },
            },
        }),
        [palette],
    );

    return (
        <ChartCard title="Risk Band Distribution" isEmpty={isEmpty} emptyMessage="No evaluated applications yet" height={300}>
            <Bar data={chartData} options={options} />
        </ChartCard>
    );
}

// C) Application Volume Trend Bar
function VolumeTrendChart({
    data: rawData,
}: {
    data: Array<{ date: string; count: number }>;
}) {
    const isDark = useIsDarkMode();
    const palette = useMemo(() => getChartPalette(isDark), [isDark]);
    const isEmpty = rawData.every((d) => d.count === 0);

    const labels = useMemo(
        () =>
            rawData.map((d) =>
                new Date(d.date + 'T00:00:00').toLocaleDateString('en-ET', {
                    month: 'short',
                    day: 'numeric',
                }),
            ),
        [rawData],
    );

    const chartData: ChartData<'bar'> = useMemo(
        () => ({
            labels,
            datasets: [
                {
                    label: 'Applications Submitted',
                    data: rawData.map((d) => d.count),
                    backgroundColor: '#3B82F6',
                    borderRadius: 3,
                    borderSkipped: false,
                },
            ],
        }),
        [rawData, labels],
    );

    const options: ChartOptions<'bar'> = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 600 },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    borderWidth: 1,
                    titleColor: palette.text,
                    bodyColor: palette.textMuted,
                    callbacks: {
                        label: (ctx) => `Submitted: ${ctx.parsed.y}`,
                    },
                },
                datalabels: { display: false },
            },
            scales: {
                x: {
                    ticks: {
                        color: palette.textMuted,
                        font: chartFont(),
                        maxTicksLimit: 10,
                        maxRotation: 0,
                    },
                    grid: { display: false },
                    border: { display: false },
                    title: {
                        display: true,
                        text: 'Date',
                        color: palette.textMuted,
                        font: chartFont(),
                    },
                },
                y: {
                    ticks: { color: palette.textMuted, font: chartFont(), stepSize: 1 },
                    grid: { color: palette.grid },
                    border: { color: palette.border },
                    title: {
                        display: true,
                        text: 'Applications',
                        color: palette.textMuted,
                        font: chartFont(),
                    },
                },
            },
        }),
        [palette],
    );

    return (
        <ChartCard title="Application Volume Trend (Last 30 Days)" isEmpty={isEmpty} emptyMessage="No application data yet" height={240}>
            <Bar data={chartData} options={options} />
        </ChartCard>
    );
}

// D) Credit Limit Distribution Bar (histogram)
function CreditLimitDistributionChart({
    data: rawData,
}: {
    data: Record<string, number>;
}) {
    const isDark = useIsDarkMode();
    const palette = useMemo(() => getChartPalette(isDark), [isDark]);
    const bucketOrder = ['0-50K', '50-100K', '100-200K', '200-500K', '500K+'];
    const values = bucketOrder.map((k) => rawData[k] ?? 0);
    const isEmpty = values.every((v) => v === 0);

    const chartData: ChartData<'bar'> = useMemo(
        () => ({
            labels: bucketOrder,
            datasets: [
                {
                    label: 'Applications',
                    data: values,
                    backgroundColor: '#10B981',
                    borderRadius: 4,
                    borderSkipped: false,
                },
            ],
        }),
        [values],
    );

    const options: ChartOptions<'bar'> = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 600 },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    borderWidth: 1,
                    titleColor: palette.text,
                    bodyColor: palette.textMuted,
                    callbacks: {
                        label: (ctx) => `Count: ${ctx.parsed.y}`,
                    },
                },
                datalabels: { display: false },
            },
            scales: {
                x: {
                    ticks: { color: palette.textMuted, font: chartFont() },
                    grid: { display: false },
                    border: { display: false },
                    title: {
                        display: true,
                        text: 'Credit Limit Range (ETB)',
                        color: palette.textMuted,
                        font: chartFont(),
                    },
                },
                y: {
                    ticks: { color: palette.textMuted, font: chartFont(), stepSize: 1 },
                    grid: { color: palette.grid },
                    border: { color: palette.border },
                    title: {
                        display: true,
                        text: 'Applications',
                        color: palette.textMuted,
                        font: chartFont(),
                    },
                },
            },
        }),
        [palette],
    );

    return (
        <ChartCard title="Credit Limit Distribution" isEmpty={isEmpty} emptyMessage="No credit limit data yet" height={300}>
            <Bar data={chartData} options={options} />
        </ChartCard>
    );
}

// E) Sector Breakdown Doughnut
function SectorBreakdownChart({
    data: rawData,
}: {
    data: Record<string, number>;
}) {
    const isDark = useIsDarkMode();
    const palette = useMemo(() => getChartPalette(isDark), [isDark]);
    const entries = Object.entries(rawData).filter(([, v]) => v > 0);
    const isEmpty = entries.length === 0;

    const chartData: ChartData<'doughnut'> = useMemo(
        () => ({
            labels: entries.map(([k]) => k),
            datasets: [
                {
                    data: entries.map(([, v]) => v),
                    backgroundColor: entries.map((_, i) => SECTOR_PALETTE[i % SECTOR_PALETTE.length]),
                    borderWidth: 2,
                    borderColor: isDark ? '#18181b' : '#ffffff',
                    hoverOffset: 6,
                },
            ],
        }),
        [entries, isDark],
    );

    const options: ChartOptions<'doughnut'> = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            animation: { duration: 600 },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: palette.textMuted,
                        font: chartFont(),
                        boxWidth: 12,
                        padding: 12,
                    },
                },
                tooltip: {
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    borderWidth: 1,
                    titleColor: palette.text,
                    bodyColor: palette.textMuted,
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ${ctx.parsed}`,
                    },
                },
                datalabels: { display: false },
            },
        }),
        [palette],
    );

    return (
        <ChartCard title="Sector Breakdown" isEmpty={isEmpty} emptyMessage="No sector data yet" height={300}>
            <Doughnut data={chartData} options={options} />
        </ChartCard>
    );
}

// Portfolio Analytics section
function PortfolioAnalytics({ analytics }: { analytics: LoanProviderAnalytics }) {
    return (
        <section className="mt-8">
            <SectionDivider title="Portfolio Analytics" />

            {/* Row 1: Status + Risk Bands */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <StatusDistributionChart data={analytics.statusDistribution} />
                <RiskBandChart data={analytics.riskBandDistribution} />
            </div>

            {/* Row 2: Volume Trend — full width */}
            <div className="mt-5">
                <VolumeTrendChart data={analytics.volumeTrend} />
            </div>

            {/* Row 3: Credit Limit + Sector */}
            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
                <CreditLimitDistributionChart data={analytics.creditLimitDistribution} />
                <SectorBreakdownChart data={analytics.sectorBreakdown} />
            </div>
        </section>
    );
}

function LoanOfficerDashboard({
    stats,
    analytics,
}: {
    stats: LoanOfficerStats;
    analytics: LoanProviderAnalytics;
}) {
    const dbHealth = stats.dbHealth ?? {
        status: 'error' as const,
        latency: null,
        host: 'Supabase',
    };
    const aiHealth = stats.aiHealth ?? {
        status: 'unreachable' as const,
        latency: null,
    };
    const counts = stats.counts ?? {};
    const queued = counts['queued_for_ai'] ?? 0;
    const evaluated = counts['evaluated'] ?? 0;

    return (
        <>
            <header className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight">
                    Loan Applications Pipeline
                </h1>
                <p className={`mt-1 text-sm ${mutedClass}`}>
                    {stats.attentionCount} application
                    {stats.attentionCount === 1 ? '' : 's'} require your
                    attention today.
                </p>
            </header>

            {/* 8 KPI cards in 2 rows of 4 */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KpiCard
                    label="Awaiting Evaluation"
                    numericValue={queued}
                    subtext="Ready to run AI"
                    icon={<Clock className="h-6 w-6" />}
                    color="blue"
                />
                <KpiCard
                    label="Pending Decision"
                    numericValue={evaluated}
                    subtext="AI complete, needs review"
                    icon={<Scale className="h-6 w-6" />}
                    color="gold"
                />
                <KpiCard
                    label="Approved Today"
                    numericValue={stats.todayApproved}
                    icon={<CheckCircle className="h-6 w-6" />}
                    color="green"
                />
                <KpiCard
                    label="Rejected Today"
                    numericValue={stats.todayRejected}
                    icon={<XCircle className="h-6 w-6" />}
                    color="red"
                />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KpiCard
                    label="Total Active"
                    numericValue={stats.totalActive ?? 0}
                    subtext="All non-terminal statuses"
                    icon={<FileStack className="h-6 w-6" />}
                    color="blue"
                />
                <KpiCard
                    label="Evaluated This Month"
                    numericValue={stats.evaluatedThisMonth ?? 0}
                    subtext="AI decisions completed"
                    icon={<Brain className="h-6 w-6" />}
                    color="gold"
                />
                <KpiCard
                    label="Avg. AI Risk Score"
                    displayValue={
                        stats.avgRiskScore !== null && stats.avgRiskScore !== undefined
                            ? <span className="text-2xl font-bold">{stats.avgRiskScore}%</span>
                            : <span className="text-lg font-semibold text-gray-400 dark:text-zinc-500">No data</span>
                    }
                    subtext="Across evaluated portfolio"
                    icon={<Activity className="h-6 w-6" />}
                    color="red"
                />
                <KpiCard
                    label="Avg. NPV Credit Limit"
                    displayValue={
                        stats.avgNpvLimit !== null && stats.avgNpvLimit !== undefined
                            ? <span className="text-2xl font-bold">{formatEtbAbbrev(stats.avgNpvLimit)}</span>
                            : <span className="text-lg font-semibold text-gray-400 dark:text-zinc-500">No data</span>
                    }
                    subtext="Across evaluated portfolio"
                    icon={<Banknote className="h-6 w-6" />}
                    color="green"
                />
            </div>

            <PortfolioAnalytics analytics={analytics} />

            <div className="mt-6 flex flex-wrap justify-end gap-2">
                <DbHealthPill health={dbHealth} />
                <AiHealthPill health={aiHealth} />
            </div>
        </>
    );
}

function PipelineAction({
    applicationId,
    status,
}: {
    applicationId: number;
    status: string;
}) {
    const [evaluating, setEvaluating] = useState(false);

    if (status === 'queued_for_ai' || status === 'submitted') {
        return (
            <button
                type="button"
                disabled={evaluating}
                onClick={() => {
                    setEvaluating(true);
                    router.post(
                        route('applications.evaluate', applicationId),
                        {},
                        {
                            preserveScroll: true,
                            onFinish: () => setEvaluating(false),
                        },
                    );
                }}
                className="inline-flex min-w-[7.5rem] items-center justify-center gap-1 rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-900 disabled:opacity-80 dark:bg-emerald-700"
            >
                {evaluating ? (
                    <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Evaluating...
                    </>
                ) : (
                    'Run AI →'
                )}
            </button>
        );
    }
    if (status === 'evaluated') {
        return (
            <Link
                href={route('risk.forecast.show', applicationId)}
                className="inline-flex items-center gap-1 rounded-lg bg-[#0C447C] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0C447C]/90 dark:bg-[#85B7EB] dark:text-[#0F1A16]"
            >
                Review →
            </Link>
        );
    }
    if (status === 'processing') {
        return (
            <span className={`inline-flex items-center gap-1.5 text-xs ${mutedClass}`}>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Evaluating...
            </span>
        );
    }
    if (status === 'approved' || status === 'rejected') {
        return (
            <Link
                href={route('risk.forecast.show', applicationId)}
                className="text-xs font-medium text-gray-600 hover:underline dark:text-zinc-400"
            >
                View
            </Link>
        );
    }
    return <span className={`text-xs ${mutedClass}`}>—</span>;
}

// ─── Super Admin ──────────────────────────────────────────────────────────────

function ApplicationBreakdown({
    appsByStatus,
}: {
    appsByStatus: Record<string, number>;
}) {
    const segments = [
        {
            key: 'approved',
            label: 'Approved',
            color: 'bg-green-500',
            count: appsByStatus['approved'] ?? 0,
        },
        {
            key: 'evaluated',
            label: 'Evaluated',
            color: 'bg-purple-500',
            count: appsByStatus['evaluated'] ?? 0,
        },
        {
            key: 'queued_for_ai',
            label: 'Queued',
            color: 'bg-blue-500',
            count: appsByStatus['queued_for_ai'] ?? 0,
        },
        {
            key: 'rejected',
            label: 'Rejected',
            color: 'bg-red-500',
            count: appsByStatus['rejected'] ?? 0,
        },
    ];
    const total = segments.reduce((s, x) => s + x.count, 0);

    if (total === 0) {
        return (
            <p className={`text-sm ${mutedClass}`}>No applications yet.</p>
        );
    }

    return (
        <div>
            <div className="flex h-4 overflow-hidden rounded-full">
                {segments.map(
                    (seg) =>
                        seg.count > 0 && (
                            <div
                                key={seg.key}
                                className={`${seg.color} transition-all`}
                                style={{
                                    width: `${(seg.count / total) * 100}%`,
                                }}
                                title={`${seg.label}: ${seg.count}`}
                            />
                        ),
                )}
            </div>
            <ul className="mt-4 flex flex-wrap gap-4 text-xs">
                {segments.map((seg) => (
                    <li key={seg.key} className="flex items-center gap-2">
                        <span
                            className={`h-2.5 w-2.5 rounded-full ${seg.color}`}
                        />
                        <span className={mutedClass}>
                            {seg.label}:{' '}
                            <strong className="text-gray-900 dark:text-zinc-100">
                                {seg.count}
                            </strong>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function SuperAdminDashboard({ stats }: { stats: SuperAdminStats }) {
    const aiHealth = stats.aiHealth ?? {
        status: 'unreachable' as const,
        latency: null,
    };
    const dbHealth = stats.dbHealth ?? {
        status: 'error' as const,
        latency: null,
        host: 'Supabase',
    };
    const aiOk = aiHealth.status === 'healthy';
    const dbOk = dbHealth.status === 'connected';
    const modelsLabel = aiOk ? 'XGBoost + LSTM' : 'Degraded';

    return (
        <>
            <header className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight">
                    System Overview
                </h1>
                <p className={`mt-1 text-sm ${mutedClass}`}>
                    EthioSME Valuation Platform — Administration
                </p>
            </header>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KpiCard
                    label="Total Businesses"
                    numericValue={stats.totalBusinesses}
                    icon={<Building2 className="h-6 w-6" />}
                    color="green"
                />
                <KpiCard
                    label="Total Applications"
                    numericValue={stats.totalApplications}
                    icon={<FileStack className="h-6 w-6" />}
                    color="blue"
                />
                <KpiCard
                    label="AI Models Active"
                    displayValue={
                        <span className="text-lg font-bold">{modelsLabel}</span>
                    }
                    icon={<Brain className="h-6 w-6" />}
                    color="gold"
                />
                <KpiCard
                    label="Last Fairness Audit"
                    displayValue={
                        <span className="text-lg font-bold">
                            {stats.lastAuditDate
                                ? formatDate(stats.lastAuditDate)
                                : 'Never run'}
                        </span>
                    }
                    icon={<ShieldCheck className="h-6 w-6" />}
                    color="blue"
                />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className={`${cardClass} p-6`}>
                    <h2 className="text-sm font-semibold">System Status</h2>
                    <ul className="mt-4 space-y-4 text-sm">
                        <li className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-[#85B7EB]" />
                                AI Service
                            </span>
                            <span className="flex items-center gap-2">
                                <span
                                    className={`h-2 w-2 rounded-full ${
                                        aiOk ? 'bg-green-500' : 'bg-red-500'
                                    }`}
                                />
                                <span className="font-medium capitalize">
                                    {aiOk ? 'Healthy' : 'Unreachable'}
                                </span>
                                {aiHealth.latency !== null && (
                                    <span className={`text-xs ${mutedClass}`}>
                                        {aiHealth.latency}ms
                                    </span>
                                )}
                            </span>
                        </li>
                        <li className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-2">
                                <Database className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
                                Database ({dbHealth.host})
                            </span>
                            <span className="flex items-center gap-2">
                                <span
                                    className={`h-2 w-2 rounded-full ${
                                        dbOk ? 'bg-green-500' : 'bg-red-500'
                                    }`}
                                />
                                <span
                                    className={`font-medium capitalize ${
                                        dbOk
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-red-600 dark:text-red-400'
                                    }`}
                                >
                                    {dbOk ? 'Connected' : 'Error'}
                                </span>
                                {dbHealth.latency !== null && (
                                    <span className={`text-xs ${mutedClass}`}>
                                        {dbHealth.latency}ms
                                    </span>
                                )}
                            </span>
                        </li>
                        <li className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-2">
                                <Brain className="h-4 w-4 text-[#D4A017]" />
                                Last Model Training
                            </span>
                            <span className="text-right">
                                {stats.lastTraining ? (
                                    <>
                                        <span className="block text-xs font-medium">
                                            {formatDate(
                                                stats.lastTraining.updated_at,
                                            )}
                                        </span>
                                        <StatusBadge
                                            status={
                                                stats.lastTraining.status ===
                                                'completed'
                                                    ? 'approved'
                                                    : stats.lastTraining.status ===
                                                        'failed'
                                                      ? 'rejected'
                                                      : 'processing'
                                            }
                                        />
                                    </>
                                ) : (
                                    <span className={mutedClass}>No jobs yet</span>
                                )}
                            </span>
                        </li>
                    </ul>
                </div>

                <div className={`${cardClass} p-6`}>
                    <h2 className="text-sm font-semibold">
                        Application Breakdown
                    </h2>
                    <div className="mt-4">
                        <ApplicationBreakdown
                            appsByStatus={stats.appsByStatus ?? {}}
                        />
                    </div>
                </div>
            </div>

            <div className={`${cardClass} mt-6 p-6`}>
                <SectionDivider title="Recent Activity" />
                {stats.recentActivity.length === 0 ? (
                    <p className={`text-center text-sm ${mutedClass}`}>
                        No audit log entries yet.
                    </p>
                ) : (
                    <ul className="space-y-3">
                        {stats.recentActivity.map((entry, i) => (
                            <li
                                key={`${entry.created_at}-${i}`}
                                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-200/80 py-2 text-sm last:border-0 dark:border-zinc-800/80"
                            >
                                <div>
                                    <span className="font-medium">
                                        {entry.action}
                                    </span>
                                    <span className={`ml-2 text-xs ${mutedClass}`}>
                                        {entry.entity_type}
                                    </span>
                                </div>
                                <div className={`text-xs ${mutedClass}`}>
                                    {entry.actor_name} ·{' '}
                                    {formatDate(entry.created_at)}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Props = PageProps<{
    role: string;
    user: { name: string; email: string };
    stats: SmeOwnerStats | LoanOfficerStats | SuperAdminStats | Record<string, never>;
    analytics?: LoanProviderAnalytics;
}>;

const emptyAnalytics: LoanProviderAnalytics = {
    statusDistribution: {},
    riskBandDistribution: { low: 0, medium: 0, high: 0 },
    volumeTrend: [],
    creditLimitDistribution: {},
    sectorBreakdown: {},
};

export default function Dashboard() {
    const { role, user, stats, analytics } = usePage<Props>().props;

    const content = useMemo(() => {
        if (role === 'sme_owner' || role === 'sme-owner') {
            return (
                <SmeOwnerDashboard
                    userName={user.name}
                    stats={stats as SmeOwnerStats}
                />
            );
        }
        if (isLoanProviderRole(role)) {
            return (
                <LoanOfficerDashboard
                    stats={stats as LoanOfficerStats}
                    analytics={analytics ?? emptyAnalytics}
                />
            );
        }
        if (role === 'super_admin' || role === 'super-admin') {
            return (
                <SuperAdminDashboard stats={stats as SuperAdminStats} />
            );
        }
        return (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <SkeletonCard key={i} />
                ))}
            </div>
        );
    }, [role, user.name, stats, analytics]);

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-zinc-100">
                    Dashboard
                </h2>
            }
        >
            <Head title="Dashboard" />
            <div className={pageClass}>{content}</div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </AuthenticatedLayout>
    );
}
