import type { ValuationView } from "@/features/valuation/types";

type Props = {
    valuation: ValuationView | null;
};

function formatEtb(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return "—";
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    return new Intl.NumberFormat("en-ET", {
        style: "currency",
        currency: "ETB",
        maximumFractionDigits: 0,
    }).format(n);
}

export default function ValuationSummary({ valuation }: Props) {
    if (!valuation) {
        return (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No completed valuation yet. Run valuation when your application is
                queued for AI.
            </p>
        );
    }

    const stats = [
        { label: "Approved limit", value: formatEtb(valuation.mapped_limit_etb) },
        { label: "NPV (ETB)", value: formatEtb(valuation.npv_etb) },
        {
            label: "Risk score",
            value:
                valuation.xgboost_score !== null
                    ? Number(valuation.xgboost_score).toFixed(2)
                    : "—",
        },
        {
            label: "Risk band",
            value: valuation.xgboost_class ?? "—",
            capitalize: true,
        },
    ];

    return (
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
                <div
                    key={stat.label}
                    className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
                >
                    <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        {stat.label}
                    </dt>
                    <dd
                        className={`mt-1 text-2xl font-semibold text-zinc-900 dark:text-white ${
                            stat.capitalize ? "capitalize" : ""
                        }`}
                    >
                        {stat.value}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
