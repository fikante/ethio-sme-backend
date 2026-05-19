import type { TrainingJobRow } from "@/features/valuation/types";
import PrimaryButton from "@/Components/PrimaryButton";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { PageProps } from "@/types";
import { Head, router, usePage } from "@inertiajs/react";

type Props = PageProps<{
    aiHealth: Record<string, unknown>;
    jobs: TrainingJobRow[];
}>;

export default function ModelTraining() {
    const { aiHealth, jobs } = usePage<Props>().props;
    const flash = usePage().props.flash as { success?: string; error?: string };

    const submitDefaultJob = () => {
        router.post(route("admin.model-training.store"), {
            dataset_selection: {
                business_uuids: null,
                sector_mcc: ["5411", "5812"],
                location_regions: null,
                transaction_date_from: "2024-01-01",
                transaction_date_to: new Date().toISOString().slice(0, 10),
                min_days_per_business: 60,
            },
            model_types: ["xgboost", "lstm"],
            training_mode: "full_retrain",
        });
    };

    const syncJob = (jobId: string) => {
        router.post(route("admin.model-training.sync", jobId));
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-zinc-900 dark:text-white">
                    Model training
                </h2>
            }
        >
            <Head title="Model training" />

            <div className="space-y-8 py-8">
                {flash?.success && (
                    <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                        {flash.success}
                    </p>
                )}

                <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                        AI service health
                    </h3>
                    <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-100 p-4 text-xs text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                        {JSON.stringify(aiHealth, null, 2)}
                    </pre>
                </section>

                <section className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                            Training jobs
                        </h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Submit cohort retrain jobs to FastAPI{" "}
                            <code className="text-xs">POST /api/v1/training/jobs</code>
                        </p>
                    </div>
                    <PrimaryButton type="button" onClick={submitDefaultJob}>
                        Queue default retrain
                    </PrimaryButton>
                </section>

                <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                    <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-zinc-200 dark:border-zinc-700">
                            <tr>
                                <th className="px-4 py-3 font-medium text-zinc-500">
                                    Job ID
                                </th>
                                <th className="px-4 py-3 font-medium text-zinc-500">
                                    Status
                                </th>
                                <th className="px-4 py-3 font-medium text-zinc-500">
                                    Created
                                </th>
                                <th className="px-4 py-3 font-medium text-zinc-500" />
                            </tr>
                        </thead>
                        <tbody>
                            {jobs.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-4 py-8 text-center text-zinc-500"
                                    >
                                        No training jobs submitted yet.
                                    </td>
                                </tr>
                            ) : (
                                jobs.map((job) => (
                                    <tr
                                        key={job.id}
                                        className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                                    >
                                        <td className="px-4 py-3 font-mono text-xs text-zinc-800 dark:text-zinc-200">
                                            {job.external_job_id ?? job.id}
                                        </td>
                                        <td className="px-4 py-3 capitalize">
                                            {job.status}
                                        </td>
                                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                                            {new Date(job.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => syncJob(job.id)}
                                                className="text-sm font-medium text-zinc-900 underline dark:text-white"
                                            >
                                                Refresh
                                            </button>
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
