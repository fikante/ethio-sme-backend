import type { ReasonCodeRow } from "@/features/valuation/types";
import { formatEtb, formatPercentFraction } from "@/lib/format";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { PageProps } from "@/types";
import { Head, Link, usePage } from "@inertiajs/react";

type ApplicationSummary = {
    id: number;
    status: string;
    requested_amount: string | number;
    business_name: string | null;
    ai_risk_band: string | null;
    ai_risk_score: string | number | null;
    prob_default: string | number | null;
    npv_credit_limit: string | number | null;
    reason_codes: ReasonCodeRow[] | string[];
    decided_at: string | null;
    rejection_narrative: string | null;
};

type Props = PageProps<{
    application: ApplicationSummary;
}>;

export default function DecisioningAndXAI() {
    const { application } = usePage<Props>().props;

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                    Decisioning & XAI
                </h2>
            }
        >
            <Head title="Decisioning & XAI" />
            <div className="py-8">
                <p className="mb-4 text-sm text-zinc-600">
                    Summary for {application.business_name}. Full charts and
                    decisions are on Risk & Forecast.
                </p>
                <dl className="mb-6 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                        <dt className="text-zinc-500">Status</dt>
                        <dd className="capitalize">{application.status}</dd>
                    </div>
                    <div>
                        <dt className="text-zinc-500">Risk band</dt>
                        <dd className="capitalize">
                            {application.ai_risk_band ?? "—"}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-zinc-500">Risk score</dt>
                        <dd>
                            {formatPercentFraction(application.ai_risk_score)}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-zinc-500">Credit limit</dt>
                        <dd>
                            {application.npv_credit_limit !== null
                                ? formatEtb(application.npv_credit_limit)
                                : "Pending Full Data"}
                        </dd>
                    </div>
                </dl>
                <Link
                    href={route("risk.forecast.show", application.id)}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                >
                    Open Risk & Forecast →
                </Link>
            </div>
        </AuthenticatedLayout>
    );
}
