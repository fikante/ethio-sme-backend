import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function Dashboard() {
    return (
        <AuthenticatedLayout
            header={
                <h2>Dashboard</h2>
            }
        >
            <Head title="Dashboard" />

            <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
                        <div className="text-sm font-medium text-gray-500 dark:text-white/60">
                            Today’s Sales
                        </div>
                        <div className="mt-2 text-3xl font-semibold tabular-nums text-gray-900 dark:text-white">
                            ETB 0.00
                        </div>
                        <div className="mt-2 text-sm text-gray-600 dark:text-white/70">
                            No completed sales yet today.
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
                        <div className="text-sm font-medium text-gray-500 dark:text-white/60">
                            Alerts
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-200 dark:bg-white/10 dark:text-white/80 dark:ring-white/10">
                                No critical alerts
                            </span>
                        </div>
                        <div className="mt-3 text-sm text-gray-600 dark:text-white/70">
                            Inventory and expiry alerts will show up here.
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
                        <div className="text-sm font-medium text-gray-500 dark:text-white/60">
                            Quick actions
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/40"
                            >
                                New sale
                            </button>
                            <button
                                type="button"
                                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10 dark:focus:ring-white/40"
                            >
                                Stock levels
                            </button>
                        </div>
                        <div className="mt-3 text-xs text-gray-500 dark:text-white/50">
                            Hook these up to real routes when ready.
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <div className="text-sm font-medium text-gray-500 dark:text-white/60">
                                Activity
                            </div>
                            <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                                Overview
                            </div>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-white/60">
                            Last refreshed: just now
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                            <div className="h-64 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white dark:border-white/10 dark:from-white/10 dark:to-transparent" />
                            <div className="mt-3 text-sm text-gray-600 dark:text-white/70">
                                This area can become a sales trend chart or
                                recent sales list.
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    Recent sales
                                </div>
                                <div className="mt-1 text-sm text-gray-600 dark:text-white/70">
                                    Nothing yet.
                                </div>
                            </div>
                            <div className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    Pending operations
                                </div>
                                <div className="mt-1 text-sm text-gray-600 dark:text-white/70">
                                    No pending items.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
