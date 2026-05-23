import type { SmeOwnerStats } from '@/types/dashboard';
import { Link } from '@inertiajs/react';
import { ChevronRight, FileText } from 'lucide-react';
import { ReactNode } from 'react';

const cardClass =
    'rounded-2xl border shadow-sm transition-shadow duration-200 hover:shadow-md ' +
    'bg-white border-gray-200 dark:bg-zinc-900 dark:border-zinc-800';

const mutedClass = 'text-gray-500 dark:text-zinc-400';

type App = NonNullable<SmeOwnerStats['application']>;

type Props = {
    app: App | null;
    showResults: boolean;
    formatDate: (iso: string | null | undefined) => string;
    formatEtb: (amount: string | number | null | undefined) => string;
    formatApr: (apr: string | number | null | undefined) => string;
    statusBadge: (status: string) => ReactNode;
    riskBadge: (band: string | null | undefined) => ReactNode;
};

export default function SmeLatestApplicationCard({
    app,
    showResults,
    formatDate,
    formatEtb,
    formatApr,
    statusBadge,
    riskBadge,
}: Props) {
    return (
        <div className={`${cardClass} flex min-h-[22rem] flex-col p-8 sm:min-h-[26rem] sm:p-10`}>
            <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">
                Latest Application
            </h2>

            {app ? (
                <div className="mt-6 flex flex-1 flex-col justify-between gap-8">
                    <div className="space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            {statusBadge(app.status)}
                            <span className={`text-sm ${mutedClass}`}>
                                Submitted {formatDate(app.created_at)}
                            </span>
                        </div>
                        <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <dt className={`text-xs font-medium uppercase tracking-wide ${mutedClass}`}>
                                    Requested
                                </dt>
                                <dd className="mt-1 text-xl font-semibold tabular-nums">
                                    {formatEtb(app.requested_amount)}
                                </dd>
                            </div>
                            <div>
                                <dt className={`text-xs font-medium uppercase tracking-wide ${mutedClass}`}>
                                    Tenure
                                </dt>
                                <dd className="mt-1 text-xl font-semibold">
                                    {app.tenure_months} months
                                </dd>
                            </div>
                            {showResults && (
                                <>
                                    <div>
                                        <dt className={`text-xs font-medium uppercase tracking-wide ${mutedClass}`}>
                                            NPV Limit
                                        </dt>
                                        <dd className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                                            {formatEtb(app.npv_credit_limit)}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className={`text-xs font-medium uppercase tracking-wide ${mutedClass}`}>
                                            APR
                                        </dt>
                                        <dd className="mt-1 text-xl font-semibold">
                                            {formatApr(app.apr)}
                                        </dd>
                                    </div>
                                </>
                            )}
                        </dl>
                        {showResults && (
                            <div>
                                <dt className={`text-xs font-medium uppercase tracking-wide ${mutedClass}`}>
                                    Risk band
                                </dt>
                                <dd className="mt-2">{riskBadge(app.ai_risk_band)}</dd>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 border-t border-gray-200 pt-6 dark:border-zinc-800">
                        <Link
                            href={route('sme.valuation')}
                            className="inline-flex items-center gap-1 text-sm font-medium text-gray-900 hover:underline dark:text-white"
                        >
                            View Full Result
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                        <Link
                            href={route('loan-application')}
                            className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:underline dark:text-zinc-400"
                        >
                            Manage application
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 dark:bg-zinc-800">
                        <FileText className="h-10 w-10 text-gray-600 dark:text-zinc-300" />
                    </div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
                        No application yet
                    </p>
                    <p className={`mt-2 max-w-md text-sm ${mutedClass}`}>
                        Start your loan application to unlock AI-powered credit scoring.
                    </p>
                    <Link
                        href={route('loan-application')}
                        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                    >
                        Start Your Application
                        <ChevronRight className="h-5 w-5" />
                    </Link>
                </div>
            )}
        </div>
    );
}
