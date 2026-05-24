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
    Hourglass,
    Lock,
    Scale,
    ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type V1AssessmentData = {
    version: "v1";
    integrity: number;
    conscientiousness: number;
    risk_tolerance: number;
    composite: number;
    completed_at: string;
    raw_answers: Record<string, number> | null;
};

type V2AssessmentData = {
    version: "v2";
    integrity: number;
    conscientiousness: number;
    delayed_gratification: number;
    financial_risk: number;
    composite: number;
    social_desirability_flagged: boolean;
    completed_at: string;
    raw_answers: Record<string, number> | null;
};

type AssessmentData = V1AssessmentData | V2AssessmentData;

type Props = PageProps<{
    assessment: AssessmentData | null;
}>;

const BENCHMARK_V1 = {
    integrity: 68,
    conscientiousness: 62,
    risk_tolerance: 58,
} as const;

const BENCHMARK_V2 = {
    integrity: 68,
    conscientiousness: 62,
    delayed_gratification: 60,
    financial_risk: 58,
} as const;

type V1TraitKey = keyof typeof BENCHMARK_V1;
type V2TraitKey = keyof typeof BENCHMARK_V2;
type TraitKey = V1TraitKey | V2TraitKey;

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
    delayed_gratification: {
        title: "Delayed Gratification & Control",
        displayName: "DELAYED GRATIFICATION",
        icon: Hourglass,
        descriptions: {
            Strong: "You prioritize long-term business stability over short-term spending — a strong credit signal.",
            Moderate:
                "You balance present needs with future goals. Strengthening savings habits would improve your profile.",
            Developing:
                "Improving patience and internal locus of control would strengthen your creditworthiness assessment.",
        },
    },
    financial_risk: {
        title: "Financial Risk Awareness",
        displayName: "FINANCIAL RISK AWARENESS",
        icon: Scale,
        descriptions: {
            Strong: "You evaluate financial risks carefully before committing — lenders view this favorably.",
            Moderate:
                "You show reasonable caution with loans and investments. Continue verifying terms before signing.",
            Developing:
                "Taking time to understand loan terms and investment risks would improve your credit profile.",
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

/** Weighted composite on 0–100 scale (matches trait cards and v2 DB weights). */
function computeComposite(assessment: AssessmentData): number {
    if (assessment.version === "v2") {
        return Math.round(
            assessment.integrity * 0.35 +
                assessment.conscientiousness * 0.3 +
                assessment.delayed_gratification * 0.2 +
                assessment.financial_risk * 0.15,
        );
    }

    return Math.round(
        assessment.integrity * 0.4 +
            assessment.conscientiousness * 0.4 +
            assessment.risk_tolerance * 0.2,
    );
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
            animation: false,
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
                    {Math.round(score)}%
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
    const isV2 = assessment.version === "v2";
    const composite = useMemo(
        () => computeComposite(assessment),
        [assessment],
    );
    const compositeColor = getScoreColor(composite);

    const traitKeys = useMemo(
        (): TraitKey[] =>
            isV2
                ? [
                      "integrity",
                      "conscientiousness",
                      "delayed_gratification",
                      "financial_risk",
                  ]
                : ["integrity", "conscientiousness", "risk_tolerance"],
        [isV2],
    );

    const traitScores = useMemo((): Record<string, number> => {
        if (isV2) {
            return {
                integrity: assessment.integrity,
                conscientiousness: assessment.conscientiousness,
                delayed_gratification: assessment.delayed_gratification,
                financial_risk: assessment.financial_risk,
            };
        }

        return {
            integrity: assessment.integrity,
            conscientiousness: assessment.conscientiousness,
            risk_tolerance: assessment.risk_tolerance,
        };
    }, [assessment, isV2]);

    const benchmarks: Record<string, number> = isV2
        ? BENCHMARK_V2
        : BENCHMARK_V1;

    const animationKey = `${assessment.version}-${assessment.completed_at}-${composite}`;

    const [donutScore, setDonutScore] = useState(0);
    const [barWidths, setBarWidths] = useState<Record<string, number>>({});
    const [benchmarkWidths, setBenchmarkWidths] = useState<
        Record<string, { you: number; avg: number }>
    >({});
    const [showRadar, setShowRadar] = useState(false);

    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = [];
        let rafId = 0;
        let cancelled = false;

        setDonutScore(0);
        setBarWidths({});
        setBenchmarkWidths({});
        setShowRadar(false);

        const donutStart = performance.now();
        const donutDuration = 1200;
        const animateDonut = (now: number) => {
            if (cancelled) {
                return;
            }
            const t = Math.min(1, (now - donutStart) / donutDuration);
            const eased = 1 - (1 - t) ** 3;
            setDonutScore(composite * eased);
            if (t < 1) {
                rafId = requestAnimationFrame(animateDonut);
            } else {
                setDonutScore(composite);
            }
        };
        rafId = requestAnimationFrame(animateDonut);

        traitKeys.forEach((key, index) => {
            timers.push(
                setTimeout(
                    () => {
                        if (!cancelled) {
                            setBarWidths((prev) => ({
                                ...prev,
                                [key]: traitScores[key],
                            }));
                        }
                    },
                    200 + index * 200,
                ),
            );
        });

        timers.push(
            setTimeout(() => {
                if (!cancelled) {
                    setShowRadar(true);
                }
            }, 800),
        );
        timers.push(
            setTimeout(() => {
                if (cancelled) {
                    return;
                }
                const widths: Record<string, { you: number; avg: number }> = {};
                traitKeys.forEach((key) => {
                    widths[key] = {
                        you: traitScores[key],
                        avg: benchmarks[key],
                    };
                });
                setBenchmarkWidths(widths);
            }, 1000),
        );

        return () => {
            cancelled = true;
            cancelAnimationFrame(rafId);
            timers.forEach(clearTimeout);
        };
    }, [animationKey, composite, traitKeys, traitScores, benchmarks]);

    const radarIndicators = isV2
        ? [
              { name: "Integrity", max: 100 },
              { name: "Conscientiousness", max: 100 },
              { name: "Delayed Gratification", max: 100 },
              { name: "Financial Risk", max: 100 },
          ]
        : [
              { name: "Integrity", max: 100 },
              { name: "Conscientiousness", max: 100 },
              { name: "Risk Tolerance", max: 100 },
          ];

    const radarValues = isV2
        ? [
              assessment.integrity,
              assessment.conscientiousness,
              assessment.delayed_gratification,
              assessment.financial_risk,
          ]
        : [
              assessment.integrity,
              assessment.conscientiousness,
              assessment.risk_tolerance,
          ];

    const radarOption: EChartsOption = useMemo(
        () => ({
            backgroundColor: "transparent",
            radar: {
                indicator: radarIndicators,
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
                            value: showRadar ? radarValues : radarValues.map(() => 0),
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
        [isDark, showRadar, radarIndicators, radarValues],
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
            <section
                className={`grid gap-6 ${isV2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}
            >
                {traitKeys.map((traitKey, index) => (
                    <TraitCard
                        key={traitKey}
                        traitKey={traitKey}
                        score={traitScores[traitKey]}
                        animatedWidth={barWidths[traitKey] ?? 0}
                        delayMs={200 + index * 200}
                    />
                ))}
            </section>

            {/* Radar */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-[#162820]">
                <h2 className="text-lg font-medium text-zinc-900 dark:text-white">
                    Your Credit Profile at a Glance
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Compared across all {traitKeys.length} dimensions
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
                    {traitKeys.map((traitKey) => (
                        <BenchmarkBar
                            key={traitKey}
                            label={TRAIT_META[traitKey].title}
                            yourScore={traitScores[traitKey]}
                            avgScore={benchmarks[traitKey]}
                            animatedYour={benchmarkWidths[traitKey]?.you ?? 0}
                            animatedAvg={benchmarkWidths[traitKey]?.avg ?? 0}
                        />
                    ))}
                </div>
                <p className="mt-6 text-xs italic text-zinc-500 dark:text-zinc-400">
                    Benchmarks are based on anonymized aggregate data and do not
                    affect your individual score.
                </p>
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
