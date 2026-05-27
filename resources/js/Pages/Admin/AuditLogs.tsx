import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { PageProps } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    Download,
    Filter,
    Search,
    X,
} from 'lucide-react';
import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type AuditLogEntry = {
    id: number;
    created_at: string | null;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    ip_address: string | null;
    actor: { id: number; name: string; email: string } | null;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
};

type PaginationLinks = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginatedLogs = {
    data: AuditLogEntry[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: PaginationLinks[];
    from: number | null;
    to: number | null;
};

type FilterState = {
    action: string;
    entity_type: string;
    actor: string;
    date_from: string;
    date_to: string;
};

type Props = PageProps<{
    logs: PaginatedLogs;
    eventTypes: string[];
    filters: Partial<FilterState>;
}>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-ET', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function actionBadgeColor(action: string): string {
    const a = action.toLowerCase();
    if (a.includes('create') || a.includes('register') || a.includes('store')) {
        return 'bg-green-100 text-green-700';
    }
    if (a.includes('delete') || a.includes('destroy') || a.includes('erase')) {
        return 'bg-red-100 text-red-700';
    }
    if (a.includes('update') || a.includes('patch') || a.includes('edit')) {
        return 'bg-blue-100 text-blue-700';
    }
    if (a.includes('login') || a.includes('logout') || a.includes('auth')) {
        return 'bg-purple-100 text-purple-700';
    }
    return 'bg-gray-100 text-gray-600';
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────

function FilterPanel({
    filters,
    eventTypes,
    onApply,
    onClear,
}: {
    filters: Partial<FilterState>;
    eventTypes: string[];
    onApply: (f: Partial<FilterState>) => void;
    onClear: () => void;
}) {
    const [local, setLocal] = useState<Partial<FilterState>>({ ...filters });

    const set = (key: keyof FilterState, value: string) =>
        setLocal((prev) => ({ ...prev, [key]: value }));

    const hasFilters = Object.values(local).some((v) => v && v !== '');

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
                </div>
                {hasFilters && (
                    <button
                        type="button"
                        onClick={() => {
                            setLocal({});
                            onClear();
                        }}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-3.5 w-3.5" />
                        Clear all
                    </button>
                )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Event Type</label>
                    <select
                        value={local.action ?? ''}
                        onChange={(e) => set('action', e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-gray-400 focus:outline-none"
                    >
                        <option value="">All events</option>
                        {eventTypes.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Entity Type</label>
                    <input
                        type="text"
                        value={local.entity_type ?? ''}
                        onChange={(e) => set('entity_type', e.target.value)}
                        placeholder="e.g. LoanApplication"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-gray-400 focus:outline-none"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Actor</label>
                    <input
                        type="text"
                        value={local.actor ?? ''}
                        onChange={(e) => set('actor', e.target.value)}
                        placeholder="Name or email"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-gray-400 focus:outline-none"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Date From</label>
                    <input
                        type="date"
                        value={local.date_from ?? ''}
                        onChange={(e) => set('date_from', e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-gray-400 focus:outline-none"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Date To</label>
                    <input
                        type="date"
                        value={local.date_to ?? ''}
                        onChange={(e) => set('date_to', e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-gray-400 focus:outline-none"
                    />
                </div>
            </div>
            <div className="mt-4 flex gap-2">
                <button
                    type="button"
                    onClick={() => onApply(local)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800"
                >
                    <Search className="h-3.5 w-3.5" />
                    Apply Filters
                </button>
            </div>
        </div>
    );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function LogDetailDrawer({
    log,
    onClose,
}: {
    log: AuditLogEntry;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="w-full max-w-md border-l border-gray-200 bg-white shadow-2xl overflow-y-auto">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <h2 className="text-base font-semibold text-gray-900">Log Detail</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Timestamp</dt>
                            <dd className="font-medium text-gray-900">{formatDateTime(log.created_at)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Action</dt>
                            <dd>
                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${actionBadgeColor(log.action)}`}>
                                    {log.action}
                                </span>
                            </dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Actor</dt>
                            <dd className="text-right">
                                {log.actor ? (
                                    <>
                                        <p className="font-medium text-gray-900">{log.actor.name}</p>
                                        <p className="text-xs text-gray-400">{log.actor.email}</p>
                                    </>
                                ) : (
                                    <span className="text-gray-400">System</span>
                                )}
                            </dd>
                        </div>
                        {log.entity_type && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Entity</dt>
                                <dd className="font-medium text-gray-900">
                                    {log.entity_type}
                                    {log.entity_id && <span className="ml-1 text-gray-400">#{log.entity_id}</span>}
                                </dd>
                            </div>
                        )}
                        {log.ip_address && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">IP Address</dt>
                                <dd className="font-mono text-xs text-gray-700">{log.ip_address}</dd>
                            </div>
                        )}
                    </dl>

                    {log.old_values && Object.keys(log.old_values).length > 0 && (
                        <div>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Before</h4>
                            <pre className="overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
                                {JSON.stringify(log.old_values, null, 2)}
                            </pre>
                        </div>
                    )}
                    {log.new_values && Object.keys(log.new_values).length > 0 && (
                        <div>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">After</h4>
                            <pre className="overflow-x-auto rounded-lg bg-green-50 p-3 text-xs text-green-800">
                                {JSON.stringify(log.new_values, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex-1 bg-black/20" onClick={onClose} />
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AuditLogs() {
    const { logs, eventTypes, filters } = usePage<Props>().props;
    const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

    const applyFilters = (f: Partial<FilterState>) => {
        router.get(route('admin.audit-logs'), f, { preserveScroll: true });
    };

    const clearFilters = () => {
        router.get(route('admin.audit-logs'), {}, { preserveScroll: true });
    };

    const exportUrl = () => {
        const params = new URLSearchParams(
            Object.entries(filters).filter(([, v]) => v) as [string, string][],
        );
        return `${route('admin.audit-logs.export')}?${params.toString()}`;
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-zinc-100">
                    Audit Logs
                </h2>
            }
        >
            <Head title="Audit Logs" />

            <div className="min-h-full bg-gray-50 p-6 space-y-5">
                {/* Page header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                            Platform Audit Log
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            All system events, decisions, and data access activities.
                        </p>
                    </div>
                    <a
                        href={exportUrl()}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </a>
                </div>

                {/* Filter panel */}
                <FilterPanel
                    filters={filters}
                    eventTypes={eventTypes}
                    onApply={applyFilters}
                    onClear={clearFilters}
                />

                {/* Results summary */}
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        {logs.total > 0 ? (
                            <>
                                Showing <strong className="text-gray-900">{logs.from}</strong>–<strong className="text-gray-900">{logs.to}</strong> of <strong className="text-gray-900">{logs.total.toLocaleString()}</strong> entries
                            </>
                        ) : (
                            'No log entries match your filters.'
                        )}
                    </p>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    {logs.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Search className="mb-3 h-10 w-10 text-gray-200" />
                            <p className="text-sm text-gray-500">No audit log entries found.</p>
                            <p className="mt-1 text-xs text-gray-400">Try adjusting your filters.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <th className="px-4 py-3 w-44">Timestamp</th>
                                        <th className="px-4 py-3">Action</th>
                                        <th className="px-4 py-3">Actor</th>
                                        <th className="px-4 py-3">Entity</th>
                                        <th className="px-4 py-3">IP</th>
                                        <th className="px-4 py-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {logs.data.map((log) => (
                                        <tr
                                            key={log.id}
                                            className="cursor-pointer hover:bg-gray-50/60 transition-colors"
                                            onClick={() => setSelectedLog(log)}
                                        >
                                            <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                                {formatDateTime(log.created_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${actionBadgeColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {log.actor ? (
                                                    <div>
                                                        <p className="font-medium text-gray-900">{log.actor.name}</p>
                                                        <p className="text-xs text-gray-400">{log.actor.email}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">System</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-600">
                                                {log.entity_type ? (
                                                    <>
                                                        <span className="font-medium">{log.entity_type}</span>
                                                        {log.entity_id && (
                                                            <span className="ml-1 text-gray-400">#{log.entity_id}</span>
                                                        )}
                                                    </>
                                                ) : '—'}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-500">
                                                {log.ip_address ?? '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <ChevronRight className="h-4 w-4 text-gray-300" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {logs.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            Page {logs.current_page} of {logs.last_page}
                        </p>
                        <div className="flex items-center gap-1">
                            {logs.links.map((link, i) => {
                                if (link.label === '&laquo; Previous') {
                                    return (
                                        <button
                                            key={i}
                                            disabled={!link.url}
                                            onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true })}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                    );
                                }
                                if (link.label === 'Next &raquo;') {
                                    return (
                                        <button
                                            key={i}
                                            disabled={!link.url}
                                            onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true })}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    );
                                }
                                return (
                                    <button
                                        key={i}
                                        disabled={!link.url || link.active}
                                        onClick={() => link.url && !link.active && router.get(link.url, {}, { preserveScroll: true })}
                                        className={`flex h-8 min-w-[2rem] items-center justify-center rounded-lg border px-2 text-sm transition-colors ${
                                            link.active
                                                ? 'border-gray-900 bg-gray-900 text-white'
                                                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                        } disabled:cursor-default`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Detail drawer */}
            {selectedLog !== null && (
                <LogDetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
            )}
        </AuthenticatedLayout>
    );
}
