import type { ShapDriver } from "@/features/valuation/types";

type Props = {
    drivers: ShapDriver[];
};

export default function ShapDrivers({ drivers }: Props) {
    if (!drivers.length) {
        return (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No explainability drivers recorded for this valuation.
            </p>
        );
    }

    const maxAbs = Math.max(...drivers.map((d) => Math.abs(d.value)), 0.01);

    return (
        <ul className="space-y-3">
            {drivers.map((driver) => {
                const pct = Math.min(100, (Math.abs(driver.value) / maxAbs) * 100);
                const negative = driver.value < 0;

                return (
                    <li key={driver.feature}>
                        <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="font-medium text-zinc-900 dark:text-white">
                                {driver.feature.replace(/_/g, " ")}
                            </span>
                            <span
                                className={
                                    negative
                                        ? "text-red-600 dark:text-red-400"
                                        : "text-emerald-600 dark:text-emerald-400"
                                }
                            >
                                {driver.value > 0 ? "+" : ""}
                                {driver.value.toFixed(3)}
                            </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                            <div
                                className={`h-full rounded-full ${
                                    negative ? "bg-red-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
