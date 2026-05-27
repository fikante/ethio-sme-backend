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

// ─── Super Admin: Platform Health Bar ────────────────────────────────────────

function PlatformHealthBar({
    aiHealth,
    dbHealth,
    lastTraining,
}: {
    aiHealth: SuperAdminStats['aiHealth'];
    dbHealth: SuperAdminStats['dbHealth'];
    lastTraining: SuperAdminStats['lastTraining'];
}) {
    const aiOk = aiHealth.status === 'healthy';
    const dbOk = dbHealth.status === 'connected';

    return (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <span className="mr-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
                Platform Health
            </span>

            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                aiOk
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-red-200 bg-red-50 text-red-700'
            }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${aiOk ? 'animate-pulse bg-green-500' : 'bg-red-500'}`} style={aiOk ? { animationDuration: '3s' } : undefined} />
                AI Service: {aiOk ? 'Online' : aiHealth.status === 'degraded' ? 'Degraded' : 'Offline'}
                {aiHealth.latency !== null && aiOk && <span className="text-green-500">· {aiHealth.latency}ms</span>}
            </div>

            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                dbOk
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-red-200 bg-red-50 text-red-700'
            }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${dbOk ? 'bg-green-500' : 'bg-red-500'}`} />
                Database: {dbOk ? 'Connected' : 'Error'}
                {dbHealth.latency !== null && dbOk && <span className="text-green-500">· {dbHealth.latency}ms</span>}
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                <Brain className="h-3 w-3" />
                Last Training:{' '}
                {lastTraining
                    ? `${formatDate(lastTraining.updated_at)} (${lastTraining.status})`
                    : 'Never'}
            </div>
        </div>
    );
}

// ─── Super Admin: Applications Over Time Chart ────────────────────────────────

function ApplicationsOverTimeChart({
    data,
}: {
    data: SuperAdminStats['applicationsOverTime'];
}) {
    const isDark = useIsDarkMode();
    const palette = useMemo(() => getChartPalette(isDark), [isDark]);
    const isEmpty = data.submitted.every((v) => v === 0) && data.evaluated.every((v) => v === 0);

    // Show every 7th label to avoid crowding on 60-day view
    const displayLabels = data.labels.map((l, i) =>
        i % 7 === 0 ? new Date(l).toLocaleDateString('en-ET', { month: 'short', day: 'numeric' }) : '',
    );

    const chartData: ChartData<'line'> = useMemo(() => ({
        labels: displayLabels,
        datasets: [
            {
                label: 'Submitted',
                data: data.submitted,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59,130,246,0.08)',
                pointRadius: 0,
                tension: 0.4,
                fill: true,
            },
            {
                label: 'Evaluated',
                data: data.evaluated,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139,92,246,0.06)',
                pointRadius: 0,
                tension: 0.4,
                fill: true,
            },
            {
                label: 'Decided',
                data: data.decided,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16,185,129,0.06)',
                pointRadius: 0,
                tension: 0.4,
                fill: true,
            },
        ],
    }), [data, displayLabels]);

    const options: ChartOptions<'line'> = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        animation: { duration: 500 },
        scales: {
            x: {
                grid: { color: isDark ? '#27272a' : '#f3f4f6' },
                ticks: { color: palette.textMuted, font: chartFont() },
            },
            y: {
                beginAtZero: true,
                grid: { color: isDark ? '#27272a' : '#f3f4f6' },
                ticks: { color: palette.textMuted, font: chartFont(), precision: 0 },
            },
        },
        plugins: {
            legend: {
                position: 'top',
                labels: { color: palette.text, font: chartFont(), boxWidth: 12, padding: 12 },
            },
            tooltip: {
                backgroundColor: palette.tooltipBg,
                borderColor: palette.tooltipBorder,
                borderWidth: 1,
                titleColor: palette.text,
                bodyColor: palette.textMuted,
                callbacks: {
                    title: (items) => data.labels[items[0].dataIndex] ?? '',
                },
            },
            datalabels: { display: false },
        },
    }), [palette, isDark, data.labels]);

    return (
        <ChartCard
            title="Application Pipeline — Last 60 Days"
            isEmpty={isEmpty}
            emptyMessage="No application data in the last 60 days"
            height={280}
        >
            <Line data={chartData} options={options} />
        </ChartCard>
    );
}

// ─── Super Admin: Risk Band by Provider Chart ─────────────────────────────────

function RiskBandByProviderChart({
    data,
}: {
    data: SuperAdminStats['riskBandByProvider'];
}) {
    const isDark = useIsDarkMode();
    const palette = useMemo(() => getChartPalette(isDark), [isDark]);
    const isEmpty = data.providers.length === 0;

    const chartData: ChartData<'bar'> = useMemo(() => ({
        labels: data.providers,
        datasets: [
            { label: 'Low Risk',    data: data.low,    backgroundColor: '#10b981', borderRadius: 3 },
            { label: 'Medium Risk', data: data.medium, backgroundColor: '#f59e0b', borderRadius: 3 },
            { label: 'High Risk',   data: data.high,   backgroundColor: '#ef4444', borderRadius: 3 },
        ],
    }), [data]);

    const options: ChartOptions<'bar'> = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        animation: { duration: 500 },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: palette.textMuted, font: chartFont() },
            },
            y: {
                beginAtZero: true,
                grid: { color: isDark ? '#27272a' : '#f3f4f6' },
                ticks: { color: palette.textMuted, font: chartFont(), precision: 0 },
                title: { display: true, text: 'Applications', color: palette.textMuted, font: chartFont() },
            },
        },
        plugins: {
            legend: {
                position: 'top',
                labels: { color: palette.text, font: chartFont(), boxWidth: 12, padding: 12 },
            },
            tooltip: {
                backgroundColor: palette.tooltipBg,
                borderColor: palette.tooltipBorder,
                borderWidth: 1,
                titleColor: palette.text,
                bodyColor: palette.textMuted,
            },
            datalabels: { display: false },
        },
    }), [palette, isDark]);

    return (
        <ChartCard
            title="Risk Band Distribution by Provider"
            isEmpty={isEmpty}
            emptyMessage="No evaluated applications with provider data yet"
            height={260}
        >
            <Bar data={chartData} options={options} />
        </ChartCard>
    );
}

// ─── Super Admin: Avg NPV by Sector Chart ─────────────────────────────────────

function AvgNpvBySectorChart({
    data,
}: {
    data: SuperAdminStats['avgNpvBySector'];
}) {
    const isDark = useIsDarkMode();
    const palette = useMemo(() => getChartPalette(isDark), [isDark]);
    const isEmpty = data.sectors.length === 0;

    const chartData: ChartData<'bar'> = useMemo(() => ({
        labels: data.sectors,
        datasets: [
            {
                label: 'Avg NPV Credit Limit (ETB)',
                data: data.avgLimits,
                backgroundColor: 'rgba(59,130,246,0.7)',
                borderColor: '#3b82f6',
                borderWidth: 1,
                borderRadius: 4,
            },
        ],
    }), [data]);

    const options: ChartOptions<'bar'> = useMemo(() => ({
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        scales: {
            x: {
                beginAtZero: true,
                grid: { color: isDark ? '#27272a' : '#f3f4f6' },
                ticks: {
                    color: palette.textMuted,
                    font: chartFont(),
                    callback: (v) => formatEtbAbbrev(typeof v === 'number' ? v : null),
                },
            },
            y: {
                grid: { display: false },
                ticks: { color: palette.textMuted, font: chartFont() },
            },
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: palette.tooltipBg,
                borderColor: palette.tooltipBorder,
                borderWidth: 1,
                titleColor: palette.text,
                bodyColor: palette.textMuted,
                callbacks: {
                    label: (ctx) => `Avg: ${formatEtb(ctx.parsed.x)}`,
                },
            },
            datalabels: { display: false },
        },
    }), [palette, isDark]);

    return (
        <ChartCard
            title="Average NPV Credit Limit by Sector"
            isEmpty={isEmpty}
            emptyMessage="No sector data available yet"
            height={260}
        >
            <Bar data={chartData} options={options} />
        </ChartCard>
    );
}

// ─── Super Admin: Risk Score Distribution ────────────────────────────────────

function RiskScoreDistributionChart({
    data,
}: {
    data: SuperAdminStats['riskScoreDistribution'];
}) {
    const isDark = useIsDarkMode();
    const palette = useMemo(() => getChartPalette(isDark), [isDark]);
    const isEmpty = data.counts.every((c) => c === 0);

    const chartData: ChartData<'bar'> = useMemo(() => ({
        labels: data.labels,
        datasets: [
            {
                label: 'Applications',
                data: data.counts,
                backgroundColor: data.labels.map((_, i) => {
                    const mid = (i + 0.5) / 10;
                    if (mid < 0.35) return 'rgba(16,185,129,0.75)';
                    if (mid < 0.65) return 'rgba(245,158,11,0.75)';
                    return 'rgba(239,68,68,0.75)';
                }),
                borderWidth: 0,
                borderRadius: 3,
            },
        ],
    }), [data]);

    const options: ChartOptions<'bar'> = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: palette.textMuted, font: chartFont() },
                title: { display: true, text: 'XGBoost Risk Score', color: palette.textMuted, font: chartFont() },
            },
            y: {
                beginAtZero: true,
                grid: { color: isDark ? '#27272a' : '#f3f4f6' },
                ticks: { color: palette.textMuted, font: chartFont(), precision: 0 },
                title: { display: true, text: 'Count', color: palette.textMuted, font: chartFont() },
            },
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: palette.tooltipBg,
                borderColor: palette.tooltipBorder,
                borderWidth: 1,
                titleColor: palette.text,
                bodyColor: palette.textMuted,
            },
            datalabels: { display: false },
            annotation: {
                annotations: {
                    lowLine: {
                        type: 'line' as const,
                        scaleID: 'x',
                        value: 3.5,
                        borderColor: '#10b981',
                        borderWidth: 1,
                        borderDash: [4, 4],
                        label: { content: '0.35', enabled: true, position: 'end', color: '#10b981', font: { size: 10 } },
                    },
                    highLine: {
                        type: 'line' as const,
                        scaleID: 'x',
                        value: 6.5,
                        borderColor: '#ef4444',
                        borderWidth: 1,
                        borderDash: [4, 4],
                        label: { content: '0.65', enabled: true, position: 'end', color: '#ef4444', font: { size: 10 } },
                    },
                },
            },
        },
    }), [palette, isDark]);

    return (
        <ChartCard
            title="XGBoost Risk Score Distribution"
            isEmpty={isEmpty}
            emptyMessage="No evaluated applications yet"
            height={260}
        >
            <>
                <p className="mb-2 text-xs text-gray-400">
                    AUC-ROC: <strong className="text-gray-700 dark:text-zinc-300">0.8842</strong> · KS Stat: <strong className="text-gray-700 dark:text-zinc-300">0.6942</strong> · F1: <strong className="text-gray-700 dark:text-zinc-300">0.8140</strong>
                </p>
                <div style={{ height: 220 }}>
                    <Bar data={chartData} options={options} />
                </div>
            </>
        </ChartCard>
    );
}

// ─── Super Admin: NPV Credit Limit Distribution ───────────────────────────────

function NpvCreditLimitDistributionChart({
    data,
}: {
    data: SuperAdminStats['npvCreditLimitDistribution'];
}) {
    const isDark = useIsDarkMode();
    const palette = useMemo(() => getChartPalette(isDark), [isDark]);
    const isEmpty = data.counts.every((c) => c === 0);

    const chartData: ChartData<'bar'> = useMemo(() => ({
        labels: data.labels,
        datasets: [
            {
                label: 'Businesses',
                data: data.counts,
                backgroundColor: 'rgba(59,130,246,0.65)',
                borderColor: '#3b82f6',
                borderWidth: 1,
                borderRadius: 4,
            },
        ],
    }), [data]);

    const medianBucketIndex = useMemo(() => {
        if (data.median === null) return null;
        const limits = [50000, 100000, 200000, 300000, 500000, 1000000, 2000000, Infinity];
        return limits.findIndex((upper) => (data.median ?? 0) < upper);
    }, [data.median]);

    const options: ChartOptions<'bar'> = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: palette.textMuted, font: chartFont() },
                title: { display: true, text: 'Credit Limit (ETB)', color: palette.textMuted, font: chartFont() },
            },
            y: {
                beginAtZero: true,
                grid: { color: isDark ? '#27272a' : '#f3f4f6' },
                ticks: { color: palette.textMuted, font: chartFont(), precision: 0 },
                title: { display: true, text: 'Count', color: palette.textMuted, font: chartFont() },
            },
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: palette.tooltipBg,
                borderColor: palette.tooltipBorder,
                borderWidth: 1,
                titleColor: palette.text,
                bodyColor: palette.textMuted,
            },
            datalabels: { display: false },
            ...(medianBucketIndex !== null ? {
                annotation: {
                    annotations: {
                        medianLine: {
                            type: 'line' as const,
                            scaleID: 'x',
                            value: medianBucketIndex,
                            borderColor: '#f59e0b',
                            borderWidth: 2,
                            borderDash: [6, 3],
                            label: {
                                content: `Median: ${formatEtbAbbrev(data.median)}`,
                                enabled: true,
                                position: 'start',
                                color: '#f59e0b',
                                font: { size: 10 },
                            },
                        },
                    },
                },
            } : {}),
        },
    }), [palette, isDark, medianBucketIndex, data.median]);

    return (
        <ChartCard
            title="NPV Credit Limit Distribution"
            isEmpty={isEmpty}
            emptyMessage="No credit limit data yet"
            height={260}
        >
            <Bar data={chartData} options={options} />
        </ChartCard>
    );
}

// ─── Super Admin: Data Coverage Health ───────────────────────────────────────

function DataCoverageHealthBar({
    data,
}: {
    data: SuperAdminStats['dataCoverageHealth'];
}) {
    const total = data.tier_excellent + data.tier_good + data.tier_marginal + data.tier_insufficient;

    const tiers = [
        { key: 'tier_excellent',    label: '≥365 days',   color: 'bg-green-500',  count: data.tier_excellent },
        { key: 'tier_good',         label: '180–364 days', color: 'bg-blue-500',   count: data.tier_good },
        { key: 'tier_marginal',     label: '45–179 days',  color: 'bg-amber-500',  count: data.tier_marginal },
        { key: 'tier_insufficient', label: '<45 days',     color: 'bg-red-500',    count: data.tier_insufficient },
    ];

    if (total === 0) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Data Coverage Health</h3>
                <p className="text-xs text-gray-400">No heartbeat data ingested yet.</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Data Coverage Health</h3>
            <div className="flex h-5 overflow-hidden rounded-full bg-gray-100">
                {tiers.map((tier) =>
                    tier.count > 0 ? (
                        <div
                            key={tier.key}
                            className={`${tier.color} transition-all`}
                            style={{ width: `${(tier.count / total) * 100}%` }}
                            title={`${tier.label}: ${tier.count} businesses`}
                        />
                    ) : null,
                )}
            </div>
            <ul className="mt-3 flex flex-wrap gap-4 text-xs">
                {tiers.map((tier) => (
                    <li key={tier.key} className="flex items-center gap-1.5">
                        <span className={`h-2.5 w-2.5 rounded-full ${tier.color}`} />
                        <span className="text-gray-500">{tier.label}:</span>
                        <strong className="text-gray-800">{tier.count}</strong>
                    </li>
                ))}
            </ul>
            <p className="mt-2 text-xs text-gray-400">Total businesses with heartbeat data: <strong className="text-gray-700">{total}</strong></p>
        </div>
    );
}

// ─── Super Admin: PDPP Compliance Card ───────────────────────────────────────

function PdppComplianceCard() {
    const items = [
        { label: 'Data minimisation principle applied',         done: true },
        { label: 'Informed consent collected at onboarding',    done: true },
        { label: 'Adverse action notice system implemented',    done: true },
        { label: 'Data subject erasure endpoint available',     done: true },
        { label: 'Audit trail for all model decisions',         done: true },
        { label: 'SHAP explanations stored per valuation',      done: true },
        { label: 'NBE-compliant reason codes on rejections',    done: true },
        { label: 'External audit scheduled',                    done: false },
    ];

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">PDPP Compliance Checklist</h3>
            <ul className="space-y-2">
                {items.map((item) => (
                    <li key={item.label} className="flex items-start gap-2.5 text-xs">
                        {item.done ? (
                            <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                        ) : (
                            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                        )}
                        <span className={item.done ? 'text-gray-700' : 'text-amber-700'}>{item.label}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ─── Super Admin: Provider Overview Table ────────────────────────────────────

function ProviderOverviewTable({
    rows,
}: {
    rows: SuperAdminStats['providerOverview'];
}) {
    if (rows.length === 0) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
                <Building2 className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-400">No loan providers registered yet.</p>
                <Link
                    href="/admin/loan-providers"
                    className="mt-3 inline-flex items-center gap-1 rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800"
                >
                    Manage Providers <ChevronRight className="h-3.5 w-3.5" />
                </Link>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <h3 className="text-sm font-semibold text-gray-900">Loan Provider Overview</h3>
                <Link
                    href="/admin/loan-providers"
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                    Manage all →
                </Link>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            <th className="px-4 py-3">Provider</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-right">Applications</th>
                            <th className="px-4 py-3 text-right">Officers</th>
                            <th className="px-4 py-3 text-right">Avg Risk</th>
                            <th className="px-4 py-3">Last Activity</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {rows.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="font-medium text-gray-900">{row.name}</div>
                                    <div className="text-gray-400">{row.short_code}</div>
                                </td>
                                <td className="px-4 py-3 capitalize text-gray-600">
                                    {row.type.replace(/_/g, ' ')}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                        row.status === 'active'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-red-100 text-red-700'
                                    }`}>
                                        {row.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                                    {row.application_count}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                                    {row.officer_count}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums">
                                    {row.avg_risk_score !== null ? (
                                        <span className={
                                            row.avg_risk_score < 0.35
                                                ? 'text-green-600'
                                                : row.avg_risk_score < 0.65
                                                  ? 'text-amber-600'
                                                  : 'text-red-600'
                                        }>
                                            {(row.avg_risk_score * 100).toFixed(1)}%
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-gray-500">
                                    {row.last_activity ? formatDate(row.last_activity) : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Super Admin: Main Dashboard ─────────────────────────────────────────────

function SuperAdminDashboard({ stats }: { stats: SuperAdminStats }) {
    const aiHealth = stats.aiHealth ?? { status: 'unreachable' as const, latency: null };
    const dbHealth = stats.dbHealth ?? { status: 'error' as const, latency: null, host: 'Supabase' };
    const drift = stats.drift ?? { mape: null, p10_coverage: null, ks_stat: null, auc_roc: null, alert: false, source: 'validated' as const };

    const aiRiskColor =
        stats.avgRiskScore === null
            ? 'text-gray-500'
            : stats.avgRiskScore < 0.35
              ? 'text-green-600'
              : stats.avgRiskScore < 0.65
                ? 'text-amber-600'
                : 'text-red-600';

    return (
        <div className="space-y-6">
            {/* Header */}
            <header>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                    System Overview
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    EthioSME Valuation Platform — Administration
                </p>
            </header>

            {/* Section 1: Platform Health Bar */}
            <PlatformHealthBar
                aiHealth={aiHealth}
                dbHealth={dbHealth}
                lastTraining={stats.lastTraining ?? null}
            />

            {/* Section 2: KPI Row — 4 columns × 2 rows */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KpiCard
                    label="Total Businesses"
                    numericValue={stats.totalBusinesses}
                    icon={<Building2 className="h-6 w-6" />}
                    color="green"
                />
                <KpiCard
                    label="Active Applications"
                    numericValue={stats.totalApplications}
                    icon={<FileStack className="h-6 w-6" />}
                    color="blue"
                />
                <KpiCard
                    label="Total Evaluations Run"
                    numericValue={stats.totalEvaluations}
                    icon={<Brain className="h-6 w-6" />}
                    color="gold"
                />
                <KpiCard
                    label="Approval Rate"
                    displayValue={
                        <span className="text-2xl font-bold text-gray-900">
                            {stats.approvalRate !== null ? `${stats.approvalRate}%` : '—'}
                        </span>
                    }
                    icon={<CheckCircle className="h-6 w-6" />}
                    color="green"
                    subtext="Approved / (Approved + Rejected)"
                />
                <KpiCard
                    label="Avg AI Risk Score"
                    displayValue={
                        <span className={`text-2xl font-bold ${aiRiskColor}`}>
                            {stats.avgRiskScore !== null
                                ? `${(stats.avgRiskScore * 100).toFixed(1)}%`
                                : '—'}
                        </span>
                    }
                    icon={<Scale className="h-6 w-6" />}
                    color={
                        stats.avgRiskScore === null
                            ? 'blue'
                            : stats.avgRiskScore < 0.35
                              ? 'green'
                              : stats.avgRiskScore < 0.65
                                ? 'gold'
                                : 'red'
                    }
                    subtext={
                        stats.avgRiskScore !== null
                            ? stats.avgRiskScore < 0.35 ? 'Low risk portfolio' : stats.avgRiskScore < 0.65 ? 'Medium risk portfolio' : 'High risk portfolio'
                            : undefined
                    }
                />
                <KpiCard
                    label="SHAP Integrity Pass Rate"
                    displayValue={
                        <span className="text-2xl font-bold text-gray-900">
                            {stats.shapPassRate !== null ? `${stats.shapPassRate}%` : '—'}
                        </span>
                    }
                    icon={<ShieldCheck className="h-6 w-6" />}
                    color="green"
                    subtext="Valuations with valid SHAP explanations"
                />
                <KpiCard
                    label="Avg NPV Credit Limit"
                    displayValue={
                        <span className="text-2xl font-bold text-gray-900">
                            {formatEtbAbbrev(stats.avgNpvLimit)}
                        </span>
                    }
                    icon={<Banknote className="h-6 w-6" />}
                    color="blue"
                    subtext="Across all evaluated applications"
                />
                <KpiCard
                    label="Last Fairness Audit"
                    displayValue={
                        <span className="text-2xl font-bold text-gray-900">
                            {stats.lastAuditDays !== null
                                ? `${stats.lastAuditDays}d ago`
                                : 'Never run'}
                        </span>
                    }
                    icon={<FileText className="h-6 w-6" />}
                    color={stats.lastAuditDays !== null && stats.lastAuditDays > 90 ? 'red' : 'blue'}
                    subtext={stats.lastAuditDate ? formatDate(stats.lastAuditDate) : undefined}
                />
            </div>

            {/* Section 3: Enhanced System Health Panel */}
            <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <h3 className="mb-4 text-sm font-semibold text-gray-900">System Health</h3>
                    <ul className="space-y-3 text-sm">
                        <li className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-gray-600">
                                <Building2 className="h-4 w-4 text-blue-500" />
                                Active Loan Providers
                            </span>
                            <strong className="text-gray-900">{stats.activeLoanProviders}</strong>
                        </li>
                        <li className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-gray-600">
                                <FileText className="h-4 w-4 text-purple-500" />
                                Registered Loan Officers
                            </span>
                            <strong className="text-gray-900">{stats.loanOfficerCount}</strong>
                        </li>
                        <li className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-gray-600">
                                <ShieldCheck className="h-4 w-4 text-green-500" />
                                PDPP Compliance
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                                <CheckCircle className="h-3 w-3" /> Compliant
                            </span>
                        </li>
                        <li className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-gray-600">
                                <AlertTriangle className={`h-4 w-4 ${drift.alert ? 'text-red-500' : 'text-gray-400'}`} />
                                Model Drift Alert
                            </span>
                            {drift.alert ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                                    MAPE {drift.mape?.toFixed(1)}% — Review
                                </span>
                            ) : (
                                <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                                    Within threshold
                                </span>
                            )}
                        </li>
                    </ul>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
                    <h3 className="mb-4 text-sm font-semibold text-gray-900">Application Status Breakdown</h3>
                    <ApplicationBreakdown appsByStatus={stats.appsByStatus ?? {}} />
                </div>
            </div>

            {/* Section 4: Application Pipeline Analytics */}
            <div>
                <SectionDivider title="Application Pipeline Analytics" />
                <div className="grid gap-4 lg:grid-cols-2">
                    <ApplicationsOverTimeChart data={stats.applicationsOverTime ?? { labels: [], submitted: [], evaluated: [], decided: [] }} />
                    <StatusDistributionChart data={stats.statusDistribution ?? {}} />
                    <RiskBandByProviderChart data={stats.riskBandByProvider ?? { providers: [], low: [], medium: [], high: [] }} />
                    <AvgNpvBySectorChart data={stats.avgNpvBySector ?? { sectors: [], avgLimits: [] }} />
                </div>
            </div>

            {/* Section 5: AI Model Performance Panel */}
            <div>
                <SectionDivider title="AI Model Performance" />
                <div className="mb-4 grid gap-4 lg:grid-cols-3">
                    {/* Validated thesis metrics card */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <h3 className="mb-3 text-sm font-semibold text-gray-900">Validated Performance</h3>
                        <dl className="space-y-2 text-xs">
                            <div className="flex justify-between"><dt className="text-gray-500">DeepAR MAPE</dt><dd className="font-semibold text-gray-900">2.94%</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">P10 Coverage</dt><dd className="font-semibold text-gray-900">94.20%</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">XGBoost AUC-ROC</dt><dd className="font-semibold text-gray-900">0.8842</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">XGBoost F1 Score</dt><dd className="font-semibold text-gray-900">0.8140</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">KS Statistic</dt><dd className="font-semibold text-gray-900">0.6942</dd></div>
                        </dl>
                        <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${drift.source === 'live' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-500'}`}>
                            {drift.source === 'live' ? (
                                <>Live MAPE: <strong>{drift.mape?.toFixed(2)}%</strong> · AUC-ROC: <strong>{drift.auc_roc?.toFixed(4)}</strong></>
                            ) : (
                                'Using thesis-validated baseline metrics'
                            )}
                        </div>
                    </div>
                    {/* Psychometric vs Risk scatter — simplified as a summary stat card */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <h3 className="mb-3 text-sm font-semibold text-gray-900">Psychometric vs Risk Score</h3>
                        {stats.psychometricVsRisk && stats.psychometricVsRisk.length > 0 ? (
                            <>
                                <p className="mb-3 text-xs text-gray-500">
                                    {stats.psychometricVsRisk.length} data points sampled. Higher psychometric composite correlates with lower AI risk score.
                                </p>
                                <div className="space-y-2 text-xs">
                                    {(['low', 'medium', 'high'] as const).map((band) => {
                                        const pts = stats.psychometricVsRisk.filter((p) => p.band === band);
                                        const avgPsych = pts.length > 0 ? pts.reduce((s, p) => s + p.x, 0) / pts.length : null;
                                        return (
                                            <div key={band} className="flex items-center justify-between">
                                                <span className="text-gray-500 capitalize">{band} risk</span>
                                                <span className={`font-semibold ${band === 'low' ? 'text-green-600' : band === 'medium' ? 'text-amber-600' : 'text-red-600'}`}>
                                                    {pts.length} pts · avg psych {avgPsych !== null ? (avgPsych * 100).toFixed(1) : '—'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <p className="text-xs text-gray-400">Requires both psychometric assessments and completed valuations.</p>
                        )}
                    </div>
                    {/* Forecast model performance */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <h3 className="mb-3 text-sm font-semibold text-gray-900">Forecast Model (DeepAR)</h3>
                        <dl className="space-y-2 text-xs">
                            <div className="flex justify-between"><dt className="text-gray-500">Architecture</dt><dd className="font-semibold text-gray-900">DeepAR</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">Horizon</dt><dd className="font-semibold text-gray-900">90 days</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">MAPE (test)</dt><dd className="font-semibold text-green-700">2.94%</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">vs ARIMA</dt><dd className="font-semibold text-green-700">−70.7%</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">vs Prophet</dt><dd className="font-semibold text-green-700">−67.0%</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">P10 coverage</dt><dd className="font-semibold text-gray-900">94.20%</dd></div>
                        </dl>
                    </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                    <RiskScoreDistributionChart data={stats.riskScoreDistribution ?? { labels: [], counts: [] }} />
                    <NpvCreditLimitDistributionChart data={stats.npvCreditLimitDistribution ?? { labels: [], counts: [], median: null }} />
                </div>
            </div>

            {/* Section 6: Compliance & Governance */}
            <div>
                <SectionDivider title="Compliance and Governance" />
                <div className="grid gap-4 lg:grid-cols-3">
                    <DataCoverageHealthBar data={stats.dataCoverageHealth ?? { tier_excellent: 0, tier_good: 0, tier_marginal: 0, tier_insufficient: 0 }} />
                    <PdppComplianceCard />
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-900">Recent Audit Log</h3>
                            <Link
                                href="/admin/audit-logs"
                                className="text-xs font-medium text-blue-600 hover:text-blue-800"
                            >
                                View all →
                            </Link>
                        </div>
                        {stats.recentActivity.length === 0 ? (
                            <p className="text-xs text-gray-400">No audit log entries yet.</p>
                        ) : (
                            <ul className="space-y-2.5">
                                {stats.recentActivity.slice(0, 8).map((entry, i) => (
                                    <li
                                        key={`${entry.created_at}-${i}`}
                                        className="border-b border-gray-50 pb-2.5 last:border-0 last:pb-0"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="truncate text-xs font-medium text-gray-800">{entry.action}</p>
                                                <p className="text-xs text-gray-400">{entry.actor_name}{entry.entity_type ? ` · ${entry.entity_type}` : ''}</p>
                                            </div>
                                            <time className="shrink-0 text-xs text-gray-400">{formatDate(entry.created_at)}</time>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {/* Section 7: Loan Provider Overview Table */}
            <div>
                <SectionDivider title="Loan Provider Overview" />
                <ProviderOverviewTable rows={stats.providerOverview ?? []} />
            </div>
        </div>
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
