import type { ValuationView } from "@/features/valuation/types";

type Props = {
    valuation: ValuationView | null;
};

export default function ForecastBands({ valuation }: Props) {
    if (!valuation?.p10_series?.length) {
        return null;
    }

    const days = valuation.p10_series.map((_, i) => `D${i + 1}`);
    const p10 = valuation.p10_series.map(Number);
    const p50 = (valuation.p50_series ?? []).map(Number);
    const p90 = (valuation.p90_series ?? []).map(Number);

    return (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
            <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-200 dark:border-zinc-700">
                    <tr>
                        <th className="px-4 py-3 font-medium text-zinc-500">Day</th>
                        <th className="px-4 py-3 font-medium text-zinc-500">P10</th>
                        <th className="px-4 py-3 font-medium text-zinc-500">P50</th>
                        <th className="px-4 py-3 font-medium text-zinc-500">P90</th>
                    </tr>
                </thead>
                <tbody>
                    {days.slice(0, 14).map((day, i) => (
                        <tr
                            key={day}
                            className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                        >
                            <td className="px-4 py-2 text-zinc-900 dark:text-white">
                                {day}
                            </td>
                            <td className="px-4 py-2 tabular-nums text-zinc-700 dark:text-zinc-300">
                                {p10[i]?.toLocaleString() ?? "—"}
                            </td>
                            <td className="px-4 py-2 tabular-nums text-zinc-700 dark:text-zinc-300">
                                {p50[i]?.toLocaleString() ?? "—"}
                            </td>
                            <td className="px-4 py-2 tabular-nums text-zinc-700 dark:text-zinc-300">
                                {p90[i]?.toLocaleString() ?? "—"}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {days.length > 14 && (
                <p className="px-4 py-2 text-xs text-zinc-500">
                    Showing first 14 of {days.length} forecast days
                </p>
            )}
        </div>
    );
}
