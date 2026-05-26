import type { PipelineApplication } from "@/features/valuation/types";
import { formatEtb, formatPercentFraction } from "@/lib/format";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { PageProps } from "@/types";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";

type Props = PageProps<{
    applications: PipelineApplication[];
}>;

function riskBandClass(band: string | null): string {
    switch (band?.toLowerCase()) {
        case "low":
            return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
        case "medium":
            return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
        case "high":
            return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
        default:
            return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
    }
}

export default function ApplicationsPipeline() {
    const { applications, flash } = usePage<Props>().props;
    const [evaluatingId, setEvaluatingId] = useState<number | null>(null);

    const runAi = (id: number) => {
        setEvaluatingId(id);
        router.post(
            route("applications.evaluate", id),
            {},
            {
                preserveScroll: true,
                onFinish: () => setEvaluatingId(null),
            },
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-zinc-900 dark:text-white">
                    Applications Pipeline
                </h2>
            }
        >
            <Head title="Applications Pipeline" />

            <div className="py-8">
                {flash?.success && (
                    <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                        {flash.success}
                    </p>
                )}
                {flash?.error && (
                    <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
                        {flash.error}
                    </p>
                )}

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
                                    Requested
                                </th>
                                <th className="px-4 py-3 font-medium text-zinc-500">
                                    Risk
                                </th>
                                <th className="px-4 py-3 font-medium text-zinc-500">
                                    Credit limit
                                </th>
                                <th className="px-4 py-3 font-medium text-zinc-500">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {applications.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-4 py-8 text-center text-zinc-500"
                                    >
                                        No applications in the pipeline yet.
                                    </td>
                                </tr>
                            ) : (
                                applications.map((app) => {
                                    const isEvaluating =
                                        evaluatingId === app.id ||
                                        app.status === "processing";

                                    return (
                                        <tr
                                            key={app.id}
                                            className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                                        >
                                            <td className="px-4 py-3 text-zinc-900 dark:text-white">
                                                <div className="font-medium">
                                                    {app.business_name ?? "—"}
                                                </div>
                                                <div className="text-xs text-zinc-500">
                                                    {app.sector}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 capitalize text-zinc-700 dark:text-zinc-300">
                                                {app.status.replace(/_/g, " ")}
                                            </td>
                                            <td className="px-4 py-3 tabular-nums">
                                                {formatEtb(app.requested_amount)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {app.ai_risk_band ? (
                                                    <span
                                                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${riskBandClass(app.ai_risk_band)}`}
                                                    >
                                                        {app.ai_risk_band}{" "}
                                                        {app.ai_risk_score !==
                                                            null &&
                                                            `(${formatPercentFraction(app.ai_risk_score)})`}
                                                    </span>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                            <td className="px-4 py-3 tabular-nums">
                                                {app.npv_credit_limit !== null
                                                    ? formatEtb(
                                                          app.npv_credit_limit,
                                                      )
                                                    : app.is_degraded
                                                      ? "Pending Full Data"
                                                      : "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                {app.can_run_ai && (
                                                    <button
                                                        type="button"
                                                        disabled={isEvaluating}
                                                        onClick={() =>
                                                            runAi(app.id)
                                                        }
                                                        className="inline-flex min-w-[7.5rem] items-center justify-center gap-2 rounded-lg bg-emerald-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-80"
                                                    >
                                                        {isEvaluating ? (
                                                            <>
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                Evaluating...
                                                            </>
                                                        ) : (
                                                            "Run AI →"
                                                        )}
                                                    </button>
                                                )}
                                                {app.is_reviewed &&
                                                    !app.can_review &&
                                                    !app.can_view_review && (
                                                        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                                            Reviewed
                                                        </span>
                                                    )}
                                                {app.can_review && (
                                                    <Link
                                                        href={route(
                                                            "risk.forecast.show",
                                                            app.id,
                                                        )}
                                                        className={`inline-flex rounded-lg px-3 py-1.5 text-sm font-medium ${
                                                            app.is_degraded
                                                                ? "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200"
                                                                : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
                                                        }`}
                                                    >
                                                        {app.is_degraded
                                                            ? "Review (Degraded) →"
                                                            : "Review →"}
                                                    </Link>
                                                )}
                                                {app.can_view_review && (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                                            Reviewed
                                                        </span>
                                                        <Link
                                                            href={route(
                                                                "risk.forecast.show",
                                                                app.id,
                                                            )}
                                                            className="text-xs text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-300"
                                                        >
                                                            Open to decide →
                                                        </Link>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
