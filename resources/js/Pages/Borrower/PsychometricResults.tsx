import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import {
    compositeInterpretation,
    compositeLabel,
    getScoreColor,
    type ScoreColor,
} from "@/lib/psychometricScoreColor";
import { PageProps } from "@/types";
import { Head, Link } from "@inertiajs/react";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import {
    BarChart3,
    Brain,
    ClipboardList,
    Info,
    Lock,
    Scale,
    ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type AssessmentData = {
    integrity: number;
    conscientiousness: number;
    risk_tolerance: number;
    completed_at: string;
    raw_answers: Record<string, number> | null;
};

type Props = PageProps<{
    assessment: AssessmentData | null;
}>;

const BENCHMARK_AVG = {
    integrity: 68,
    conscientiousness: 62,
    risk_tolerance: 58,
} as const;

type TraitKey = "integrity" | "conscientiousness" | "risk_tolerance";

const TRAIT_META: Record<
    TraitKey,
    {
        title: string;
        displayName: string;
        icon: typeof ShieldCheck;
        descriptions: Record<ScoreColor["label"], string>;
    }
> = {
    integrity: {
        title: "Integrity",
        displayName: "INTEGRITY",
        icon: ShieldCheck,
        descriptions: {
            Strong: "You demonstrate a strong commitment to honoring financial obligations. This significantly strengthens your credit application.",
            Moderate:
                "You show reasonable financial integrity. Consistent repayment history would further strengthen your profile.",
            Developing:
                "Lenders may require additional assurance regarding your commitment to repayment obligations.",
        },
    },
    conscientiousness: {
        title: "Financial Conscientiousness",
        displayName: "FINANCIAL CONSCIENTIOUSNESS",
        icon: BarChart3,
        descriptions: {
            Strong: "You manage your finances carefully and systematically. This reduces the lender's risk significantly.",
            Moderate:
                "You demonstrate moderate financial planning habits. Maintaining organized records will improve your score.",
            Developing:
                "Improving financial record-keeping and planning habits would strengthen future applications.",
        },
    },
    risk_tolerance: {
        title: "Risk Tolerance",
        displayName: "RISK TOLERANCE",
        icon: Scale,
        descriptions: {
            Strong: "You have a healthy relationship with financial risk — confident but measured.",
            Moderate:
                "You approach risk with reasonable caution, which is appropriate for most loan products.",
            Developing:
                "A lower risk tolerance may limit loan product options but signals conservative financial behavior.",
        },
    },
};

function useIsDark(): boolean {
    const [isDark, setIsDark] = useState(() =>
        typeof document !== "undefined"
            ? document.documentElement.classList.contains("dark")
            : false,
    );

    useEffect(() => {
        const root = document.documentElement;
        const observer = new MutationObserver(() => {
            setIsDark(root.classList.contains("dark"));
        });
        observer.observe(root, {
            attributes: true,
            attributeFilter: ["class"],
        });
        return () => observer.disconnect();
    }, []);

    return isDark;
}

function scoreHex(color: ScoreColor): string {
    if (color.bar.includes("green")) return "#22c55e";
    if (color.bar.includes("amber")) return "#fbbf24";
    return "#ef4444";
}

function DonutChart({
    score,
    animatedScore,
    isDark,
}: {
    score: number;
    animatedScore: number;
    isDark: boolean;
}) {
    const color = getScoreColor(score);
    const track = isDark ? "#1E3A2F" : "#D1E8DF";
    const fill = scoreHex(color);

    const option: EChartsOption = useMemo(
        () => ({
            backgroundColor: "transparent",
            animation: true,
            animationDuration: 1200,
            animationEasing: "cubicOut",
            series: [
                {
                    type: "pie",
                    radius: ["72%", "88%"],
                    center: ["50%", "50%"],
                    silent: true,
                    label: { show: false },
                    labelLine: { show: false },
                    data: [
                        {
                            value: animatedScore,
                            itemStyle: { color: fill, borderRadius: 8 },
                        },
                        {
                            value: Math.max(0, 100 - animatedScore),
                            itemStyle: { color: track },
                            emphasis: { disabled: true },
                        },
                    ],
                },
            ],
        }),
        [animatedScore, fill, track],
    );

    return (
        <div className="relative mx-auto h-52 w-52">
            <ReactECharts
                option={option}
                style={{ height: "100%", width: "100%" }}
                opts={{ renderer: "svg" }}
            />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span
                    className={`text-5xl font-bold tabular-nums ${color.text}`}
                >
                    {Math.round(animatedScore)}%
                </span>
            </div>
        </div>
    );
}

function TraitCard({
    traitKey,
    score,
    animatedWidth,
    delayMs,
}: {
    traitKey: TraitKey;
    score: number;
    animatedWidth: number;
    delayMs: number;
}) {
    const meta = TRAIT_META[traitKey];
    const color = getScoreColor(score);
    const Icon = meta.icon;

    return (
        <div
            className={`rounded-2xl border border-zinc-200 border-l-4 bg-white shadow-sm dark:border-zinc-700 dark:bg-[#162820] ${color.bar.replace("bg-", "border-l-")}`}
            style={{ boxShadow: color.glow }}
        >
            <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${color.text}`} />
                        <span className="text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">
                            {meta.displayName}
                        </span>
                    </div>
                    <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${color.badge}`}
                    >
                        {color.label} ✓
                    </span>
                </div>

                <p
                    className={`mt-4 text-4xl font-bold tabular-nums ${color.text}`}
                >
                    {score}%
                </p>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-[#1E3A2F]">
                    <div
                        className={`h-full rounded-full ${color.bar} transition-[width] ease-out`}
                        style={{
                            width: `${animatedWidth}%`,
                            transitionDuration: "1000ms",
                            transitionDelay: `${delayMs}ms`,
                        }}
                    />
                </div>

                <hr className="my-5 border-zinc-200 dark:border-zinc-700" />

                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    What this means:
                </p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {meta.descriptions[color.label]}
                </p>
            </div>
        </div>
    );
}

function BenchmarkBar({
    label,
    yourScore,
    avgScore,
    animatedYour,
    animatedAvg,
}: {
    label: string;
    yourScore: number;
    avgScore: number;
    animatedYour: number;
    animatedAvg: number;
}) {
    const color = getScoreColor(yourScore);

    return (
        <div className="space-y-3">
            <p className="text-sm font-medium text-zinc-900 dark:text-white">
                {label}
            </p>
            <div className="space-y-2">
                <div className="flex items-center gap-3 text-xs">
                    <span className="w-24 shrink-0 text-zinc-500">You</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-[#1E3A2F]">
                        <div
                            className={`h-full rounded-full ${color.bar} transition-[width] ease-out`}
                            style={{
                                width: `${animatedYour}%`,
                                transitionDuration: "800ms",
                            }}
                        />
                    </div>
                    <span
                        className={`w-10 text-right font-semibold tabular-nums ${color.text}`}
                    >
                        {yourScore}%
                    </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                    <span className="w-24 shrink-0 text-zinc-500">
                        Avg Applicant
                    </span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#D1E8DF] dark:bg-[#1E3A2F]">
                        <div
                            className="h-full rounded-full bg-zinc-400 transition-[width] ease-out dark:bg-zinc-600"
                            style={{
                                width: `${animatedAvg}%`,
                                transitionDuration: "800ms",
                            }}
                        />
                    </div>
                    <span className="w-10 text-right font-semibold tabular-nums text-zinc-500">
                        {avgScore}%
                    </span>
                </div>
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="mx-auto max-w-xl">
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-[#162820]">
                <div className="bg-gradient-to-b from-[#085041]/8 to-transparent px-8 pb-2 pt-10 text-center dark:from-[#085041]/20">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#5DCAA5]/15 ring-4 ring-[#5DCAA5]/10">
                        <Brain className="h-10 w-10 text-[#5DCAA5]" />
                    </div>
                    <h2 className="mt-6 text-xl font-semibold text-zinc-900 dark:text-white">
                        Assessment Not Yet Completed
                    </h2>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        You have not taken the creditworthiness assessment yet.
                    </p>
                </div>

                <div className="space-y-5 px-8 py-8">
                    <div className="flex items-center gap-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-4 dark:border-zinc-600 dark:bg-zinc-900/40">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-200/80 dark:bg-zinc-700">
                            <ClipboardList className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                        </div>
                        <p className="text-left text-sm text-zinc-500 dark:text-zinc-400">
                            Ready to apply? Start or continue your loan
                            application to complete the ~3 minute assessment.
                        </p>
                    </div>

                    <div className="pt-2 text-center">
                        <Link
                            href={route("loan-application")}
                            className="inline-flex items-center gap-2 text-sm font-medium text-[#085041] transition hover:text-[#0a6350] dark:text-[#6EBF9A] dark:hover:text-[#5DCAA5]"
                        >
                            Go to Loan Application
                            <span aria-hidden>→</span>
                        </Link>
                    </div>
                </div>
            </div>

            <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
                This page is read-only. Results cannot be edited or retaken
                after submission.
            </p>
        </div>
    );
}

function ResultsView({ assessment }: { assessment: AssessmentData }) {
    const isDark = useIsDark();
    const composite = useMemo(
        () =>
            Math.round(
                (assessment.integrity +
                    assessment.conscientiousness +
                    assessment.risk_tolerance) /
                    3,
            ),
        [assessment],
    );
    const compositeColor = getScoreColor(composite);

    const [donutScore, setDonutScore] = useState(0);
    const [barWidths, setBarWidths] = useState({
        integrity: 0,
        conscientiousness: 0,
        risk_tolerance: 0,
    });
    const [benchmarkWidths, setBenchmarkWidths] = useState({
        integrity: { you: 0, avg: 0 },
        conscientiousness: { you: 0, avg: 0 },
        risk_tolerance: { you: 0, avg: 0 },
    });
    const [showRadar, setShowRadar] = useState(false);

    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = [];

        const donutStart = performance.now();
        const donutDuration = 1200;
        const animateDonut = (now: number) => {
            const t = Math.min(1, (now - donutStart) / donutDuration);
            const eased = 1 - (1 - t) ** 3;
            setDonutScore(composite * eased);
            if (t < 1) {
                requestAnimationFrame(animateDonut);
            }
        };
        requestAnimationFrame(animateDonut);
        timers.push(
            setTimeout(
                () =>
                    setBarWidths((prev) => ({
                        ...prev,
                        integrity: assessment.integrity,
                    })),
                200,
            ),
        );
        timers.push(
            setTimeout(
                () =>
                    setBarWidths((prev) => ({
                        ...prev,
                        conscientiousness: assessment.conscientiousness,
                    })),
                400,
            ),
        );
        timers.push(
            setTimeout(
                () =>
                    setBarWidths((prev) => ({
                        ...prev,
                        risk_tolerance: assessment.risk_tolerance,
                    })),
                600,
            ),
        );
        timers.push(setTimeout(() => setShowRadar(true), 800));
        timers.push(
            setTimeout(
                () =>
                    setBenchmarkWidths({
                        integrity: {
                            you: assessment.integrity,
                            avg: BENCHMARK_AVG.integrity,
                        },
                        conscientiousness: {
                            you: assessment.conscientiousness,
                            avg: BENCHMARK_AVG.conscientiousness,
                        },
                        risk_tolerance: {
                            you: assessment.risk_tolerance,
                            avg: BENCHMARK_AVG.risk_tolerance,
                        },
                    }),
                1000,
            ),
        );

        return () => timers.forEach(clearTimeout);
    }, [assessment, composite]);

    const radarOption: EChartsOption = useMemo(
        () => ({
            backgroundColor: "transparent",
            radar: {
                indicator: [
                    { name: "Integrity", max: 100 },
                    { name: "Conscientiousness", max: 100 },
                    { name: "Risk Tolerance", max: 100 },
                ],
                shape: "polygon",
                splitNumber: 4,
                axisName: {
                    color: isDark ? "#6EBF9A" : "#4B7A64",
                    fontSize: 13,
                    fontWeight: 500,
                },
                splitLine: {
                    lineStyle: { color: isDark ? "#1E3A2F" : "#D1E8DF" },
                },
                splitArea: {
                    areaStyle: {
                        color: [
                            isDark ? "rgba(8,80,65,0.1)" : "rgba(8,80,65,0.05)",
                            "transparent",
                        ],
                    },
                },
                axisLine: {
                    lineStyle: { color: isDark ? "#1E3A2F" : "#D1E8DF" },
                },
            },
            series: [
                {
                    type: "radar",
                    data: [
                        {
                            value: showRadar
                                ? [
                                      assessment.integrity,
                                      assessment.conscientiousness,
                                      assessment.risk_tolerance,
                                  ]
                                : [0, 0, 0],
                            name: "Your Profile",
                            areaStyle: {
                                color: "rgba(93, 202, 165, 0.15)",
                            },
                            lineStyle: {
                                color: "#5DCAA5",
                                width: 2,
                            },
                            itemStyle: {
                                color: "#5DCAA5",
                            },
                        },
                    ],
                    animation: true,
                    animationDuration: 1000,
                    animationEasing: "cubicOut",
                },
            ],
        }),
        [assessment, isDark, showRadar],
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
                        Creditworthiness Assessment
                    </h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Your psychometric profile used for AI credit scoring
                    </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    <Lock className="h-3.5 w-3.5" />
                    Locked · Completed {assessment.completed_at}
                </span>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-[#5DCAA5]/20 bg-[#085041]/10 px-4 py-3 text-sm text-[#6EBF9A]">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                    Your responses have been recorded and submitted to the loan
                    officer. Results are final and cannot be modified.
                </p>
            </div>

            {/* Composite score */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-700 dark:bg-[#162820]">
                <h2 className="text-lg font-medium text-zinc-900 dark:text-white">
                    Overall Creditworthiness Score
                </h2>
                <div className="mt-6">
                    <DonutChart
                        score={composite}
                        animatedScore={donutScore}
                        isDark={isDark}
                    />
                </div>
                <p
                    className={`mt-2 text-lg font-semibold ${compositeColor.text}`}
                >
                    {compositeLabel(composite)}
                </p>
                <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-600 dark:text-zinc-400">
                    {compositeInterpretation(composite)}
                </p>
            </section>

            {/* Trait cards */}
            <section className="grid gap-6 md:grid-cols-3">
                <TraitCard
                    traitKey="integrity"
                    score={assessment.integrity}
                    animatedWidth={barWidths.integrity}
                    delayMs={200}
                />
                <TraitCard
                    traitKey="conscientiousness"
                    score={assessment.conscientiousness}
                    animatedWidth={barWidths.conscientiousness}
                    delayMs={400}
                />
                <TraitCard
                    traitKey="risk_tolerance"
                    score={assessment.risk_tolerance}
                    animatedWidth={barWidths.risk_tolerance}
                    delayMs={600}
                />
            </section>

            {/* Radar */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-[#162820]">
                <h2 className="text-lg font-medium text-zinc-900 dark:text-white">
                    Your Credit Profile at a Glance
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Compared across all three dimensions
                </p>
                <div className="mt-6 flex justify-center">
                    <div className="w-full max-w-md">
                        <ReactECharts
                            option={radarOption}
                            style={{ height: 320 }}
                            opts={{ renderer: "svg" }}
                        />
                    </div>
                </div>
            </section>

            {/* Benchmark */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-[#162820]">
                <h2 className="text-lg font-medium text-zinc-900 dark:text-white">
                    How You Compare
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Anonymous benchmark against other Ethiopian SME applicants
                </p>
                <div className="mt-6 space-y-8">
                    <BenchmarkBar
                        label="Integrity"
                        yourScore={assessment.integrity}
                        avgScore={BENCHMARK_AVG.integrity}
                        animatedYour={benchmarkWidths.integrity.you}
                        animatedAvg={benchmarkWidths.integrity.avg}
                    />
                    <BenchmarkBar
                        label="Conscientiousness"
                        yourScore={assessment.conscientiousness}
                        avgScore={BENCHMARK_AVG.conscientiousness}
                        animatedYour={benchmarkWidths.conscientiousness.you}
                        animatedAvg={benchmarkWidths.conscientiousness.avg}
                    />
                    <BenchmarkBar
                        label="Risk Tolerance"
                        yourScore={assessment.risk_tolerance}
                        avgScore={BENCHMARK_AVG.risk_tolerance}
                        animatedYour={benchmarkWidths.risk_tolerance.you}
                        animatedAvg={benchmarkWidths.risk_tolerance.avg}
                    />
                </div>
                <p className="mt-6 text-xs italic text-zinc-500 dark:text-zinc-400">
                    Benchmarks are based on anonymized aggregate data and do not
                    affect your individual score.
                </p>
            </section>

            {/* Locked footer */}
            <section className="rounded-2xl border border-[#1E3A2F] bg-[#F0F7F4] p-6 dark:bg-[#0F1A16]">
                <div className="flex items-start gap-3">
                    <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[#6EBF9A]" />
                    <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-white">
                            Assessment Locked
                        </h3>
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                            Completed on {assessment.completed_at}
                        </p>
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                            Your responses have been recorded and submitted.
                            Results are final and used in your loan evaluation.
                        </p>
                        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-500">
                            Questions about your results? Contact your loan
                            officer.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default function PsychometricResults({ assessment }: Props) {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-zinc-900 dark:text-white">
                    Psychometric Assessment
                </h2>
            }
        >
            <Head title="Psychometric Results" />

            <div className="py-8">
                {assessment ? (
                    <ResultsView assessment={assessment} />
                ) : (
                    <EmptyState />
                )}
            </div>
        </AuthenticatedLayout>
    );
}
