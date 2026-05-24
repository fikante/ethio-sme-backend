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
        <span className="inline-flex rounded-full border border-white/40 px-3 py-1 text-xs font-semibold text-white">
            {statusLabels[status] ?? status.replace(/_/g, ' ')}
        </span>
    );
}

export default function LoanApplication() {
    const {
        transactions = [],
        existingApplication = null,
        heartbeatDays = 0,
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
                <h2 className="text-xl font-semibold tracking-tight text-white">
                    Loan Application
                </h2>
            }
        >
            <Head title="Loan Application" />

            <div className="space-y-6 text-white">
                {flash?.success && (
                    <div className="rounded-xl border border-white/30 px-4 py-3 text-sm text-white">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="rounded-xl border border-white/30 px-4 py-3 text-sm text-white/80">
                        {flash.error}
                    </div>
                )}

                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            Loan Application
                        </h1>
                        <p className="mt-1 text-sm text-white/60">
                            Apply for AI-powered credit scoring
                        </p>
                        {heartbeatDays > 0 && (
                            <p className="mt-1 text-xs text-white/50">
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
                            className="inline-flex items-center gap-2 rounded-xl border border-white bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
                        >
                            <Plus className="h-4 w-4" />
                            Apply Now
                        </button>
                    )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/20 bg-black">
                    <div className="border-b border-white/20 px-6 py-4">
                        <h2 className="text-sm font-semibold text-white">
                            Your Past Transactions
                        </h2>
                    </div>

                    {transactions.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <p className="text-sm text-white/60">
                                No transaction history yet. Load your data in
                                the application form.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-white/20 text-xs uppercase tracking-wide text-white/50">
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
                                            className="border-b border-white/10"
                                        >
                                            <td className="px-6 py-3 text-white/80">
                                                {formatDate(row.date)}
                                            </td>
                                            <td className="px-6 py-3 tabular-nums text-white">
                                                {formatEtb(row.inflow)}
                                            </td>
                                            <td className="px-6 py-3 tabular-nums text-white">
                                                {formatEtb(row.outflow)}
                                            </td>
                                            <td className="px-6 py-3 font-medium tabular-nums text-white">
                                                {formatEtb(row.net)}
                                            </td>
                                            <td className="px-6 py-3 tabular-nums text-white/70">
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
                initialSuccess={showSuccess}
            />
        </AuthenticatedLayout>
    );
}
