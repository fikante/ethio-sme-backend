import type { ApplicationRiskRow } from "@/features/valuation/types";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { PageProps } from "@/types";
import { Head, usePage } from "@inertiajs/react";

type Props = PageProps<{
    applications: ApplicationRiskRow[];
}>;

export default function RiskAndForecast() {
    const { applications } = usePage<Props>().props;

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-zinc-900 dark:text-white">
                    Risk & Forecast
                </h2>
            }
        >
            <Head title="Risk & Forecast" />

            <div className="py-8">
                <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
                    Pipeline view of applications with ML risk scores and cashflow
                    forecasts from the Financial Predictions service (v2).
                </p>

                <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                    <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-zinc-200 dark:border-zinc-700">
                            <tr>
                                <th className="px-4 py-3 font-medium text-zinc-500">
                                    Business
                                </th>
                                <th className="px-4 py-3 font-medium text-zinc-500">
                                    Status
                                </th>
                                <th className="px-4 py-3 font-medium text-zinc-500">
                                    Risk score
                                </th>
                                <th className="px-4 py-3 font-medium text-zinc-500">
                                    Credit limit
                                </th>
                                <th className="px-4 py-3 font-medium text-zinc-500">
                                    Valuation
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {applications.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-8 text-center text-zinc-500"
                                    >
                                        No applications in the pipeline yet.
                                    </td>
                                </tr>
                            ) : (
                                applications.map((app) => (
                                    <tr
                                        key={app.id}
                                        className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                                    >
                                        <td className="px-4 py-3 text-zinc-900 dark:text-white">
                                            {app.business_name ?? "—"}
                                        </td>
                                        <td className="px-4 py-3 capitalize text-zinc-700 dark:text-zinc-300">
                                            {app.status.replace(/_/g, " ")}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums">
                                            {app.ai_risk_score !== null
                                                ? Number(app.ai_risk_score).toFixed(2)
                                                : "—"}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums">
                                            {app.npv_credit_limit !== null
                                                ? Number(
                                                      app.npv_credit_limit,
                                                  ).toLocaleString()
                                                : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                                            {app.valuation_status ?? "—"}
                                            {app.inferred_at && (
                                                <span className="block text-xs">
                                                    {new Date(
                                                        app.inferred_at,
                                                    ).toLocaleString()}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
