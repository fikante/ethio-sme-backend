import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { PageProps } from '@/types';
import type {
    AiHealth,
    LoanOfficerStats,
    SmeOwnerStats,
    SuperAdminStats,
} from '@/types/dashboard';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    Activity,
    ArrowDownRight,
    ArrowUpRight,
    Banknote,
    Brain,
    Building2,
    Check,
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
    XCircle,
} from 'lucide-react';
import {
    ReactNode,
    useEffect,
    useMemo,
    useState,
} from 'react';

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

// ─── SME Owner ────────────────────────────────────────────────────────────────

function SmeOwnerDashboard({
    userName,
    stats,
}: {
    userName: string;
    stats: SmeOwnerStats;
}) {
    const app = stats.application;
    const showResults =
        app &&
        ['evaluated', 'approved', 'rejected'].includes(app.status);

    const checklistItems = [
        {
            done: stats.checklist.businessRegistered,
            label: 'Business registered',
            detail: stats.business?.name,
            href: null as string | null,
            action: null as string | null,
        },
        {
            done: stats.checklist.heartbeatLoaded,
            label: 'Transaction data loaded',
            detail: stats.heartbeatDays > 0 ? `${stats.heartbeatDays} days` : null,
            href: null,
            action: null,
        },
        {
            done: stats.checklist.assessmentCompleted,
            label: 'Psychometric assessment',
            href: route('psychometrics'),
            action: 'Complete now',
        },
        {
            done: stats.checklist.applicationSubmitted,
            label: 'Loan application submitted',
            href: route('sme.valuation'),
            action: 'Apply now',
        },
        {
            done: stats.checklist.aiEvaluated,
            label: 'AI evaluation complete',
            href: null,
            action: null,
        },
        {
            done: stats.checklist.decisionReceived,
            label: 'Decision received',
            href: null,
            action: null,
        },
    ];

    return (
        <>
            <header className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight">
                    {greeting()}, {userName.split(' ')[0]}. 👋
                </h1>
                <p className={`mt-1 text-sm ${mutedClass}`}>
                    Here is your loan application status.
                </p>
            </header>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KpiCard
                    label="Application Status"
                    displayValue={
                        app ? (
                            <StatusBadge status={app.status} />
                        ) : (
                            <span className={`text-sm ${mutedClass}`}>
                                No application
                            </span>
                        )
                    }
                    icon={<FileText className="h-6 w-6" />}
                    color="blue"
                />
                <KpiCard
                    label="Credit Limit"
                    displayValue={
                        <span className="text-xl font-bold tabular-nums">
                            {app?.npv_credit_limit
                                ? formatEtb(app.npv_credit_limit)
                                : 'Pending'}
                        </span>
                    }
                    icon={<Banknote className="h-6 w-6" />}
                    color="green"
                />
                <KpiCard
                    label="Risk Score"
                    displayValue={<RiskBandBadge band={app?.ai_risk_band} />}
                    icon={<ShieldCheck className="h-6 w-6" />}
                    color="gold"
                />
                <KpiCard
                    label="Data Coverage"
                    displayValue={
                        <DataCoverageValue days={stats.heartbeatDays} />
                    }
                    icon={<Database className="h-6 w-6" />}
                    color="blue"
                />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div
                    className={`${cardClass} border-l-4 border-l-gray-400 p-6 dark:border-l-zinc-500`}
                >
                    <h2 className="text-sm font-semibold text-[#0F1A16] dark:text-[#F0FDF4]">
                        Your Application Journey
                    </h2>
                    <ul className="mt-5 space-y-3">
                        {checklistItems.map((item, i) => (
                            <li
                                key={item.label}
                                className="flex items-start gap-3 opacity-0 translate-y-1 animate-[fadeIn_0.4s_ease_forwards]"
                                style={{
                                    animationDelay: `${i * 50}ms`,
                                    animationFillMode: 'forwards',
                                }}
                            >
                                <span
                                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                                        item.done
                                            ? 'bg-[#16A34A] text-white'
                                            : 'border-2 border-gray-300 bg-transparent dark:border-zinc-600'
                                    }`}
                                >
                                    {item.done && (
                                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                    )}
                                </span>
                                <div className="min-w-0 flex-1 text-sm">
                                    <span
                                        className={
                                            item.done
                                                ? 'text-gray-900 dark:text-zinc-100'
                                                : mutedClass
                                        }
                                    >
                                        {item.label}
                                    </span>
                                    {item.detail && (
                                        <span className={`ml-2 text-xs ${mutedClass}`}>
                                            ({item.detail})
                                        </span>
                                    )}
                                    {!item.done && item.href && item.action && (
                                        <Link
                                            href={item.href}
                                            className="ml-2 text-xs font-medium text-gray-900 hover:underline dark:text-white"
                                        >
                                            → {item.action}
                                        </Link>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className={`${cardClass} p-6`}>
                    <h2 className="text-sm font-semibold">Latest Application</h2>
                    {app ? (
                        <div className="mt-4 space-y-4 text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <StatusBadge status={app.status} />
                                <span className={`text-xs ${mutedClass}`}>
                                    Submitted {formatDate(app.created_at)}
                                </span>
                            </div>
                            <dl className="grid grid-cols-2 gap-3">
                                <div>
                                    <dt className={`text-xs ${mutedClass}`}>
                                        Requested
                                    </dt>
                                    <dd className="font-semibold tabular-nums">
                                        {formatEtb(app.requested_amount)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className={`text-xs ${mutedClass}`}>
                                        Tenure
                                    </dt>
                                    <dd className="font-semibold">
                                        {app.tenure_months} months
                                    </dd>
                                </div>
                            </dl>
                            {showResults && (
                                <dl className="grid grid-cols-2 gap-3 border-t border-gray-200 pt-4 dark:border-zinc-800">
                                    <div>
                                        <dt className={`text-xs ${mutedClass}`}>
                                            NPV Limit
                                        </dt>
                                        <dd className="font-semibold text-gray-900 dark:text-white">
                                            {formatEtb(app.npv_credit_limit)}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className={`text-xs ${mutedClass}`}>
                                            APR
                                        </dt>
                                        <dd className="font-semibold">
                                            {formatApr(app.apr)}
                                        </dd>
                                    </div>
                                    <div className="col-span-2">
                                        <dt className={`text-xs ${mutedClass}`}>
                                            Risk band
                                        </dt>
                                        <dd className="mt-1">
                                            <RiskBandBadge band={app.ai_risk_band} />
                                        </dd>
                                    </div>
                                </dl>
                            )}
                            <Link
                                href={route('sme.valuation')}
                                className="inline-flex items-center gap-1 text-sm font-medium text-gray-900 hover:underline dark:text-white"
                            >
                                View Full Result
                                <ChevronRight className="h-4 w-4" />
                            </Link>
                        </div>
                    ) : (
                        <EmptyState
                            icon={
                                <FileText className="h-8 w-8 text-gray-600 dark:text-zinc-300" />
                            }
                            title="No application yet"
                            description="Start your loan application to unlock AI-powered credit scoring."
                            actionHref={route('sme.valuation')}
                            actionLabel="Start Your Application"
                        />
                    )}
                </div>
            </div>
        </>
    );
}

// ─── Loan Officer ─────────────────────────────────────────────────────────────

function LoanOfficerDashboard({ stats }: { stats: LoanOfficerStats }) {
    const counts = stats.counts;
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

            <div className={`${cardClass} mt-6 p-6`}>
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Recent Applications</h2>
                    <Link
                        href={route('applications.pipeline')}
                        className="text-xs font-medium text-gray-900 hover:underline dark:text-white"
                    >
                        View All →
                    </Link>
                </div>
                <div className="-mx-4 overflow-x-auto sm:mx-0">
                    <table className="w-full min-w-[640px] text-left text-sm">
                        <thead>
                            <tr className={`border-b border-gray-200 text-xs uppercase tracking-wide ${mutedClass} dark:border-zinc-800`}>
                                <th className="px-4 py-3 font-medium">Business</th>
                                <th className="px-4 py-3 font-medium">Sector</th>
                                <th className="px-4 py-3 font-medium">Amount</th>
                                <th className="px-4 py-3 font-medium">Submitted</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">Risk</th>
                                <th className="px-4 py-3 font-medium">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentApps.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className={`px-4 py-8 text-center ${mutedClass}`}
                                    >
                                        No applications in the pipeline yet.
                                    </td>
                                </tr>
                            ) : (
                                stats.recentApps.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="border-b border-gray-200/80 transition-colors duration-150 hover:bg-gray-100 dark:border-zinc-800/80 dark:hover:bg-zinc-800/50"
                                    >
                                        <td className="px-4 py-3 font-medium">
                                            {row.business_name ?? '—'}
                                        </td>
                                        <td className={`px-4 py-3 ${mutedClass}`}>
                                            {row.sector ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums">
                                            {formatEtb(row.requested_amount)}
                                        </td>
                                        <td className={`px-4 py-3 ${mutedClass}`}>
                                            {formatDate(row.created_at)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={row.status} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <RiskBandBadge band={row.ai_risk_band} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <PipelineAction status={row.status} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-6 flex justify-end">
                <AiHealthPill health={stats.aiHealth} />
            </div>
        </>
    );
}

function PipelineAction({ status }: { status: string }) {
    if (status === 'queued_for_ai') {
        return (
            <Link
                href={route('risk.forecast')}
                className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
                Run AI →
            </Link>
        );
    }
    if (status === 'evaluated') {
        return (
            <Link
                href={route('decisioning.xai')}
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
                Running...
            </span>
        );
    }
    if (status === 'approved' || status === 'rejected') {
        return (
            <Link
                href={route('applications.pipeline')}
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
    const aiOk = stats.aiHealth.status === 'healthy';
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
                                {stats.aiHealth.latency !== null && (
                                    <span className={`text-xs ${mutedClass}`}>
                                        {stats.aiHealth.latency}ms
                                    </span>
                                )}
                            </span>
                        </li>
                        <li className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-2">
                                <Database className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
                                Database
                            </span>
                            <span className="flex items-center gap-2 font-medium text-green-600 dark:text-green-400">
                                <span className="h-2 w-2 rounded-full bg-green-500" />
                                Connected
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
                            appsByStatus={stats.appsByStatus}
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
}>;

export default function Dashboard() {
    const { role, user, stats } = usePage<Props>().props;

    const content = useMemo(() => {
        if (role === 'sme_owner') {
            return (
                <SmeOwnerDashboard
                    userName={user.name}
                    stats={stats as SmeOwnerStats}
                />
            );
        }
        if (role === 'loan_officer') {
            return (
                <LoanOfficerDashboard stats={stats as LoanOfficerStats} />
            );
        }
        if (role === 'super_admin') {
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
    }, [role, user.name, stats]);

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
