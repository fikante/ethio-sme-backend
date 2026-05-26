import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { PageProps } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    Banknote,
    CheckCircle2,
    CreditCard,
    Shield,
    WifiOff,
} from 'lucide-react';
import { useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChapaData {
    connected: boolean;
    days_synced: number;
    date_from?: string;
    date_to?: string;
}

interface CbeData {
    active: boolean;
    record_count: number;
    days: number;
    date_from?: string;
    date_to?: string;
}

interface SyncEvent {
    source: string;
    sync_date: string;
    records_added: number;
}

type Props = PageProps<{
    hasBusiness: boolean;
    businessUuid: string | null;
    chapaData: ChapaData | null;
    cbeData: CbeData | null;
    syncHistory: SyncEvent[];
}>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSourceLabel(source: string): string {
    const labels: Record<string, string> = {
        chapa_simulation: 'Chapa (Simulated)',
        chapa_webhook: 'Chapa (Webhook)',
        manual_upload: 'Manual Upload',
        csv_import: 'CSV Import',
        app_upload: 'App Upload',
    };
    return labels[source] ?? source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(raw: string | undefined): string {
    if (!raw) return '—';
    try {
        return new Date(raw).toLocaleDateString('en-ET', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return raw;
    }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusDot({ active }: { active: boolean }) {
    return (
        <span
            className={`inline-block h-2 w-2 rounded-full ${active ? 'bg-green-400' : 'bg-gray-300 dark:bg-zinc-600'}`}
        />
    );
}

function SyncTimeline({ events }: { events: SyncEvent[] }) {
    if (events.length === 0) return null;

    return (
        <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                Recent Data Sync Activity
            </h2>
            <ol className="relative border-l border-gray-200 dark:border-zinc-700">
                {events.map((event, idx) => (
                    <li key={idx} className="mb-6 ml-4 last:mb-0">
                        <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900" />
                        <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                            {formatSourceLabel(event.source)}
                            <span className="ml-2 font-normal text-gray-500 dark:text-zinc-400">
                                · {event.records_added} records
                            </span>
                        </p>
                        <time className="mt-0.5 block text-xs text-gray-400 dark:text-zinc-500">
                            {formatDate(event.sync_date)}
                        </time>
                    </li>
                ))}
            </ol>
        </div>
    );
}

function PrivacyNotice() {
    return (
        <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-zinc-900/50 p-6">
            <div className="mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-blue-700 dark:text-blue-300">Your Data, Your Rights</h2>
            </div>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-zinc-400">
                <li className="flex gap-2">
                    <span className="mt-0.5 shrink-0 text-blue-400">•</span>
                    All data is stored securely in compliance with Ethiopia's Personal Data
                    Protection Proclamation No.&nbsp;1321/2024.
                </li>
                <li className="flex gap-2">
                    <span className="mt-0.5 shrink-0 text-blue-400">•</span>
                    Your financial data is used solely for credit evaluation purposes and is never
                    shared with third parties.
                </li>
                <li className="flex gap-2">
                    <span className="mt-0.5 shrink-0 text-blue-400">•</span>
                    You have the right to request data erasure at any time — contact your loan
                    officer to initiate a data erasure request.
                </li>
            </ul>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Integrations({
    hasBusiness,
    chapaData,
    cbeData,
    syncHistory,
}: Props) {
    const [simulating, setSimulating] = useState(false);
    const [simSuccess, setSimSuccess] = useState(false);
    const [simError, setSimError] = useState<string | null>(null);

    const handleSimulate = () => {
        setSimulating(true);
        setSimError(null);

        router.post(
            route('integrations.simulate-chapa'),
            {},
            {
                onSuccess: () => {
                    setSimulating(false);
                    setSimSuccess(true);
                    setTimeout(() => router.reload(), 1500);
                },
                onError: () => {
                    setSimulating(false);
                    setSimError('Simulation failed. Please try again.');
                },
                preserveState: true,
            },
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Integrations" />

            <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
                {/* Page header */}
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">
                        Financial Data Connections
                    </h1>
                    <p className="mt-1.5 text-sm text-gray-500 dark:text-zinc-400">
                        Linking your payment data allows the AI to evaluate your cash flow without
                        requiring physical collateral. The more data you connect, the stronger your
                        evaluation.
                    </p>
                </div>

                {/* Success banner */}
                {simSuccess && (
                    <div className="flex items-center gap-2 rounded-lg border border-green-200 dark:border-green-700/50 bg-green-50 dark:bg-green-900/30 p-3 text-sm text-green-700 dark:text-green-300">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        Chapa connected — 30 days of data imported. Reloading…
                    </div>
                )}

                {/* Error banner */}
                {simError && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-700/50 bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-300">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {simError}
                    </div>
                )}

                {/* No business state */}
                {!hasBusiness ? (
                    <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center">
                        <WifiOff className="mx-auto mb-3 h-8 w-8 text-gray-300 dark:text-zinc-600" />
                        <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">No business registered yet</p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">
                            You need to register your business before connecting integrations.
                        </p>
                        <a
                            href={route('loan-application')}
                            className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100"
                        >
                            Go to Loan Application
                        </a>
                    </div>
                ) : (
                    <>
                        {/* Chapa card */}
                        <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800">
                                        <CreditCard className="h-5 w-5 text-gray-500 dark:text-zinc-300" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                                            Chapa Payment Gateway
                                        </h2>
                                        <p className="mt-1 max-w-sm text-xs text-gray-500 dark:text-zinc-400">
                                            Connect your Chapa merchant account to automatically
                                            import your transaction history for AI-powered credit
                                            evaluation.
                                        </p>
                                    </div>
                                </div>

                                {/* Action button */}
                                <div className="shrink-0">
                                    {chapaData?.connected ? (
                                        <button
                                            disabled
                                            className="cursor-not-allowed rounded-lg bg-gray-100 dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-gray-400 dark:text-zinc-500"
                                        >
                                            Connected ✓
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleSimulate}
                                            disabled={simulating || simSuccess}
                                            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {simulating ? 'Connecting…' : 'Simulate Connection'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Status row */}
                            <div className="mt-4 border-t border-gray-200 dark:border-zinc-800 pt-4">
                                {chapaData?.connected ? (
                                    <>
                                        <p className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300">
                                            <StatusDot active />
                                            Connected ·{' '}
                                            <span className="font-medium">
                                                {chapaData.days_synced} days
                                            </span>{' '}
                                            of data synced
                                        </p>
                                        <p className="mt-0.5 text-xs text-gray-400 dark:text-zinc-500">
                                            {formatDate(chapaData.date_from)} –{' '}
                                            {formatDate(chapaData.date_to)}
                                        </p>
                                    </>
                                ) : (
                                    <p className="flex items-center gap-2 text-sm text-gray-400 dark:text-zinc-500">
                                        <StatusDot active={false} />
                                        Not connected
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* CBE card */}
                        <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800">
                                    <Banknote className="h-5 w-5 text-gray-500 dark:text-zinc-300" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                                        Commercial Bank of Ethiopia (CBE)
                                    </h2>
                                    <p className="mt-1 max-w-sm text-xs text-gray-500 dark:text-zinc-400">
                                        Your CBE transaction account is the primary source of your
                                        financial heartbeat data. Data is loaded directly from your
                                        account records.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 border-t border-gray-200 dark:border-zinc-800 pt-4">
                                {cbeData?.active ? (
                                    <>
                                        <p className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300">
                                            <StatusDot active />
                                            Active ·{' '}
                                            <span className="font-medium">{cbeData.days} days</span>{' '}
                                            · {cbeData.record_count} records
                                        </p>
                                        <p className="mt-0.5 text-xs text-gray-400 dark:text-zinc-500">
                                            {formatDate(cbeData.date_from)} –{' '}
                                            {formatDate(cbeData.date_to)}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="flex items-center gap-2 text-sm text-gray-400 dark:text-zinc-500">
                                            <StatusDot active={false} />
                                            No data loaded yet
                                        </p>
                                        <p className="mt-0.5 text-xs text-gray-400 dark:text-zinc-500">
                                            Upload your CBE transaction history in the{' '}
                                            <a
                                                href={route('loan-application')}
                                                className="text-gray-500 dark:text-zinc-400 underline underline-offset-2 hover:text-gray-900 dark:hover:text-zinc-200"
                                            >
                                                Loan Application
                                            </a>{' '}
                                            page.
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Sync history */}
                        <SyncTimeline events={syncHistory} />

                        {/* Privacy notice */}
                        <PrivacyNotice />
                    </>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
