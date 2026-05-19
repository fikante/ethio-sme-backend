import ForecastBands from "@/features/valuation/components/ForecastBands";
import ShapDrivers from "@/features/valuation/components/ShapDrivers";
import ValuationSummary from "@/features/valuation/components/ValuationSummary";
import type { BusinessSummary, ValuationView } from "@/features/valuation/types";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { PageProps } from "@/types";
import { Head, router, usePage } from "@inertiajs/react";
import PrimaryButton from "@/Components/PrimaryButton";

type Props = PageProps<{
    businesses: BusinessSummary[];
    valuation: ValuationView | null;
    canRunValuation: boolean;
}>;

export default function SmeValuation() {
    const { businesses, valuation, canRunValuation } = usePage<Props>().props;
    const primary = businesses[0];
    const flash = usePage().props.flash as { success?: string; error?: string };

    const runValuation = () => {
        if (!primary) return;
        router.post(route("sme.valuation.run", primary.id));
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-zinc-900 dark:text-white">
                    SME Valuation
                </h2>
            }
        >
            <Head title="SME Valuation" />

            <div className="space-y-8 py-8">
                {flash?.success && (
                    <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                        {flash.success}
                    </p>
                )}
                {flash?.error && (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                        {flash.error}
                    </p>
                )}

                {primary && (
                    <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Business
                        </p>
                        <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                            {primary.business_name}
                        </p>
                        <p className="text-xs text-zinc-500">
                            {primary.sector} · {primary.sub_city} ·{" "}
                            <span className="font-mono">{primary.uuid}</span>
                        </p>
                    </section>
                )}

                <section className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                            Valuation summary
                        </h3>
                        {canRunValuation && primary && (
                            <PrimaryButton onClick={runValuation} type="button">
                                Run AI valuation
                            </PrimaryButton>
                        )}
                    </div>
                    <ValuationSummary valuation={valuation} />
                </section>

                {valuation && (
                    <>
                        <section className="space-y-3">
                            <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                                Cashflow forecast (P10 / P50 / P90)
                            </h3>
                            <ForecastBands valuation={valuation} />
                        </section>

                        <section className="space-y-3">
                            <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                                Score drivers (SHAP)
                            </h3>
                            <ShapDrivers drivers={valuation.shap} />
                        </section>
                    </>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
