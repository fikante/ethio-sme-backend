import ApplyModal from '@/Components/ApplyModal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { PageProps } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

type TransactionRow = {
    date: string;
    inflow: string | number;
    outflow: string | number;
    net: number;
    txn_count: number;
};

type ExistingApplication = {
    status: string;
    requested_amount: string | number;
    tenure_months: number;
    created_at: string;
};

type Props = PageProps<{
    transactions: TransactionRow[];
    existingApplication: ExistingApplication | null;
    hasBusiness: boolean;
    heartbeatDays: number;
    businessUuid: string | null;
    psychometricCompleted: boolean;
}>;

const etbFormatter = new Intl.NumberFormat('en-ET', {
    maximumFractionDigits: 0,
});

function formatEtb(amount: string | number): string {
    const n = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (Number.isNaN(n)) return '—';
    return `${etbFormatter.format(n)} ETB`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-ET', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

const statusLabels: Record<string, string> = {
    draft: 'Draft',
    queued_for_ai: 'Queued for AI',
    processing: 'Processing',
    evaluated: 'Evaluated',
    approved: 'Approved',
    rejected: 'Rejected',
};

function StatusBadge({ status }: { status: string }) {
    return (
        <span className="inline-flex rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-900 dark:border-zinc-600 dark:text-zinc-100">
            {statusLabels[status] ?? status.replace(/_/g, ' ')}
        </span>
    );
}

export default function LoanApplication() {
    const {
        transactions = [],
        existingApplication = null,
        heartbeatDays = 0,
        businessUuid = null,
        psychometricCompleted = false,
    } = usePage<Props>().props;
    const flash = usePage().props.flash as { success?: string; error?: string };
    const authUser = usePage().props.auth.user;

    const [modalOpen, setModalOpen] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const hasActiveApp =
        existingApplication !== null &&
        existingApplication.status !== 'draft';

    useEffect(() => {
        if (flash?.success) {
            setShowSuccess(true);
        }
    }, [flash?.success]);

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-zinc-100">
                    Loan Application
                </h2>
            }
        >
            <Head title="Loan Application" />

            <div className="space-y-6">
                {flash?.success && (
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        {flash.error}
                    </div>
                )}

                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
                            Loan Application
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                            Apply for AI-powered credit scoring
                        </p>
                        {heartbeatDays > 0 && (
                            <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">
                                {heartbeatDays} days of transaction data on file
                            </p>
                        )}
                    </div>
                    {hasActiveApp ? (
                        <StatusBadge status={existingApplication!.status} />
                    ) : (
                        <button
                            type="button"
                            onClick={() => setModalOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                            <Plus className="h-4 w-4" />
                            Apply Now
                        </button>
                    )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="border-b border-gray-200 px-6 py-4 dark:border-zinc-800">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                            Your Past Transactions
                        </h2>
                    </div>

                    {transactions.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <p className="text-sm text-gray-500 dark:text-zinc-400">
                                No transaction history yet. Load your data in
                                the application form.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
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
                                            className={`border-b border-gray-100 dark:border-zinc-800/80 ${
                                                i % 2 === 0
                                                    ? 'bg-white dark:bg-zinc-900'
                                                    : 'bg-gray-50/80 dark:bg-zinc-800/30'
                                            }`}
                                        >
                                            <td className="px-6 py-3 text-gray-700 dark:text-zinc-300">
                                                {formatDate(row.date)}
                                            </td>
                                            <td className="px-6 py-3 tabular-nums text-gray-900 dark:text-zinc-100">
                                                {formatEtb(row.inflow)}
                                            </td>
                                            <td className="px-6 py-3 tabular-nums text-gray-900 dark:text-zinc-100">
                                                {formatEtb(row.outflow)}
                                            </td>
                                            <td className="px-6 py-3 font-medium tabular-nums text-gray-900 dark:text-zinc-100">
                                                {formatEtb(row.net)}
                                            </td>
                                            <td className="px-6 py-3 tabular-nums text-gray-600 dark:text-zinc-400">
                                                {row.txn_count}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <ApplyModal
                isOpen={modalOpen || showSuccess}
                onClose={() => {
                    setModalOpen(false);
                    setShowSuccess(false);
                }}
                userName={authUser?.name ?? ''}
                businessUuid={businessUuid}
                psychometricCompleted={psychometricCompleted}
                initialSuccess={showSuccess}
            />
        </AuthenticatedLayout>
    );
}
