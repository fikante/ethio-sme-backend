import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { PageProps } from "@/types";
import { Head, Link, usePage } from "@inertiajs/react";
import {
    CheckCircle,
    Circle,
    Clock,
    FileText,
    Loader2,
    XCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApplicationData {
    id: number;
    status: string;
    requested_amount: number | string;
    requested_tenure_months: number;
    loan_provider_name: string | null;
    created_at: string;
    decided_at: string | null;
}

interface BusinessSummary {
    id: number;
    uuid: string;
    business_name: string;
    sector: string | null;
    sub_city: string | null;
}

type Props = PageProps<{
    businesses: BusinessSummary[];
    application: ApplicationData | null;
    psychometricComplete: boolean;
    dataCoverageDays: number;
    canRunValuation: boolean;
}>;

// ---------------------------------------------------------------------------
// Status timeline configuration
// ---------------------------------------------------------------------------

type StepState = "complete" | "current" | "pending";

interface TimelineStep {
    label: string;
    description: string;
    state: StepState;
}

function buildTimeline(
    status: string,
    psychometricComplete: boolean,
    dataCoverageDays: number,
    hasBusiness: boolean,
): TimelineStep[] {
    const terminalStatuses = ["approved", "rejected", "withdrawn"];
    const dataComplete = dataCoverageDays >= 45;

    const currentIndex = getCurrentStepIndex(
        status,
        psychometricComplete,
        dataCoverageDays,
        hasBusiness,
    );

    const businessReg = toStepState(0, currentIndex);
    const psychometric = toStepState(1, currentIndex);
    const dataSync = toStepState(2, currentIndex);
    const submitted = toStepState(3, currentIndex);
    const aiEval = toStepState(4, currentIndex);
    const officerReview = toStepState(5, currentIndex);
    const finalDecision = toStepState(6, currentIndex);

    return [
        {
            label: "Business Registered",
            description: hasBusiness
                ? "Your business profile is set up."
                : "Register your business details to begin.",
            state: businessReg,
        },
        {
            label: "Psychometric Assessment",
            description: psychometricComplete
                ? "Assessment completed successfully."
                : "Complete your creditworthiness assessment.",
            state: psychometric,
        },
        {
            label: "Transaction Data Loaded",
            description: dataComplete
                ? `${dataCoverageDays} days of transaction data available.`
                : "Upload at least 45 days of transaction history.",
            state: dataSync,
        },
        {
            label: "Application Submitted",
            description: "Your loan application has been received.",
            state: submitted,
        },
        {
            label: "AI Evaluation",
            description:
                status === "queued_for_ai"
                    ? "Your application is queued for AI analysis."
                    : status === "processing"
                      ? "The AI engine is analysing your profile now."
                      : aiEval === "complete"
                        ? "AI evaluation completed."
                        : "Pending AI evaluation.",
            state: aiEval,
        },
        {
            label: "Officer Review",
            description:
                status === "evaluated"
                    ? "A loan officer is reviewing your evaluation results."
                    : officerReview === "complete"
                      ? "Officer review completed."
                      : "Pending officer review.",
            state: officerReview,
        },
        {
            label: "Final Decision",
            description:
                status === "approved"
                    ? "Your application has been approved."
                    : status === "rejected"
                      ? "Application not approved."
                      : status === "withdrawn"
                        ? "Application withdrawn."
                        : "Awaiting final decision.",
            state: finalDecision,
        },
    ];
}

function getCurrentStepIndex(
    status: string,
    psychometricComplete: boolean,
    dataCoverageDays: number,
    hasBusiness: boolean,
): number {
    const terminalStatuses = ["approved", "rejected", "withdrawn"];

    if (terminalStatuses.includes(status)) {
        return 7;
    }
    if (status === "evaluated") {
        return 5;
    }
    if (status === "processing" || status === "queued_for_ai") {
        return 4;
    }
    if (!hasBusiness) {
        return 0;
    }
    if (status === "pending_psychometric" || !psychometricComplete) {
        return 1;
    }
    if (status === "pending_data_sync") {
        return 2;
    }
    if (dataCoverageDays < 45) {
        return 2;
    }
    if (status === "draft") {
        return 3;
    }

    return 4;
}

function toStepState(stepIndex: number, currentIndex: number): StepState {
    if (currentIndex >= 7 || stepIndex < currentIndex) {
        return "complete";
    }
    if (stepIndex === currentIndex) {
        return "current";
    }

    return "pending";
}

// ---------------------------------------------------------------------------
// Step icon
// ---------------------------------------------------------------------------

function StepIcon({ state }: { state: StepState }) {
    if (state === "complete") {
        return (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600">
                <CheckCircle className="h-5 w-5 text-white" />
            </div>
        );
    }
    if (state === "current") {
        return (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/40">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
        );
    }
    return (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white dark:border-zinc-700 dark:bg-zinc-900">
            <Circle className="h-4 w-4 text-gray-300 dark:text-zinc-600" />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Next steps helper
// ---------------------------------------------------------------------------

function getNextStepMessage(
    status: string,
    psychometricComplete: boolean,
    dataCoverageDays: number,
): { message: string; linkLabel?: string; linkHref?: string } | null {
    if (status === "pending_psychometric" || !psychometricComplete) {
        return {
            message: "Complete your psychometric assessment to move your application forward.",
            linkLabel: "Take Assessment",
            linkHref: "/psychometrics",
        };
    }
    if (status === "pending_data_sync" || dataCoverageDays < 45) {
        return {
            message: "Upload at least 45 days of transaction history to proceed.",
            linkLabel: "Connect Data",
            linkHref: "/integrations",
        };
    }
    if (status === "queued_for_ai") {
        return {
            message: "Your application is queued. The loan officer will trigger the AI evaluation shortly.",
        };
    }
    if (status === "processing") {
        return {
            message: "The AI engine is currently processing your application. This takes 10–30 seconds.",
        };
    }
    if (status === "evaluated") {
        return {
            message: "Your evaluation is complete. A loan officer is reviewing your results and will contact you soon.",
        };
    }
    if (status === "approved") {
        return {
            message: "Your loan officer will contact you with the next steps. Ensure your contact details are up to date.",
        };
    }
    if (status === "rejected") {
        return {
            message: "You may re-apply after 90 days. Consider improving your cash flow consistency and completing the psychometric assessment.",
        };
    }
    return null;
}

// ---------------------------------------------------------------------------
// ETB formatter
// ---------------------------------------------------------------------------

const etbFormatter = new Intl.NumberFormat("en-ET", { maximumFractionDigits: 0 });

function formatEtb(amount: number | string | null | undefined): string {
    if (amount === null || amount === undefined) return "—";
    const n = Number(amount);
    if (isNaN(n)) return "—";
    return `ETB ${etbFormatter.format(n)}`;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SmeValuation() {
    const {
        businesses,
        application,
        psychometricComplete,
        dataCoverageDays,
    } = usePage<Props>().props;

    const flash = usePage().props.flash as {
        success?: string;
        error?: string;
    } | undefined;

    const primary = businesses[0] ?? null;
    const status = application?.status ?? null;

    const timeline =
        status !== null
            ? buildTimeline(
                  status,
                  psychometricComplete,
                  dataCoverageDays,
                  businesses.length > 0,
              )
            : null;

    const nextStep =
        status !== null
            ? getNextStepMessage(status, psychometricComplete, dataCoverageDays)
            : null;

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-900 dark:text-white">
                    Application Status
                </h2>
            }
        >
            <Head title="Application Status" />

            <div className="space-y-6 py-8">
                {/* Flash messages */}
                {flash?.success && (
                    <p className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/60 dark:text-green-300">
                        {flash.success}
                    </p>
                )}
                {flash?.error && (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
                        {flash.error}
                    </p>
                )}

                {/* No application */}
                {application === null && (
                    <div className="rounded-xl border border-gray-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
                        <FileText className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-zinc-600" />
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            No loan application yet
                        </p>
                        <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500 dark:text-zinc-400">
                            You haven&apos;t submitted a loan application yet. Start the process to get your AI-driven credit evaluation.
                        </p>
                        <Link
                            href="/loan-application"
                            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-gray-900 bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                            Apply for a Loan
                        </Link>
                    </div>
                )}

                {/* Application exists */}
                {application !== null && (
                    <>
                        {/* Header */}
                        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                        Application Under Review
                                    </h3>
                                    <p className="mt-0.5 text-sm text-gray-500 dark:text-zinc-400">
                                        Your loan application is being processed.
                                    </p>
                                </div>
                                {/* Terminal outcome badge */}
                                {status === "approved" && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                        <CheckCircle className="h-4 w-4" />
                                        Approved
                                    </span>
                                )}
                                {status === "rejected" && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800 dark:bg-red-900/40 dark:text-red-300">
                                        <XCircle className="h-4 w-4" />
                                        Not Approved
                                    </span>
                                )}
                                {status === "evaluated" && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                                        <Clock className="h-4 w-4" />
                                        Under Review
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Outcome messages */}
                        {status === "approved" && (
                            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-6 dark:border-emerald-800/50 dark:bg-emerald-950/40">
                                <div className="flex items-start gap-4">
                                    <CheckCircle className="mt-0.5 h-8 w-8 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                    <div>
                                        <h3 className="text-base font-semibold text-emerald-800 dark:text-emerald-300">
                                            Congratulations! Your loan application has been approved.
                                        </h3>
                                        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400/90">
                                            Your loan officer will contact you shortly with the next steps. Please ensure your contact details and business registration documents are up to date.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {status === "rejected" && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800/50 dark:bg-red-950/40">
                                <div className="flex items-start gap-4">
                                    <XCircle className="mt-0.5 h-8 w-8 shrink-0 text-red-500 dark:text-red-400" />
                                    <div>
                                        <h3 className="text-base font-semibold text-red-800 dark:text-red-300">
                                            Application not approved
                                        </h3>
                                        <p className="mt-1 text-sm text-red-700 dark:text-red-400/90">
                                            We regret to inform you that your loan application was not approved at this time. You may re-apply after 90 days. Focus on improving your cash flow consistency to strengthen a future application.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {status === "evaluated" && (
                            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800/50 dark:bg-blue-950/40">
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    Your application has been evaluated by our AI engine. A loan officer is now reviewing the results and will make a final decision shortly.
                                </p>
                            </div>
                        )}

                        {/* Application Summary */}
                        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                                Application Summary
                            </h3>
                            <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm sm:grid-cols-4">
                                <div>
                                    <dt className="text-gray-500 dark:text-zinc-500">Requested Amount</dt>
                                    <dd className="mt-0.5 font-semibold text-gray-900 dark:text-white">
                                        {formatEtb(application.requested_amount)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-gray-500 dark:text-zinc-500">Tenure</dt>
                                    <dd className="mt-0.5 font-semibold text-gray-900 dark:text-white">
                                        {application.requested_tenure_months} months
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-gray-500 dark:text-zinc-500">Applied To</dt>
                                    <dd className="mt-0.5 font-semibold text-gray-900 dark:text-white">
                                        {application.loan_provider_name ?? "—"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-gray-500 dark:text-zinc-500">Date Submitted</dt>
                                    <dd className="mt-0.5 font-semibold text-gray-900 dark:text-white">
                                        {new Date(application.created_at).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </dd>
                                </div>
                                {primary && (
                                    <div>
                                        <dt className="text-gray-500 dark:text-zinc-500">Business</dt>
                                        <dd className="mt-0.5 font-semibold text-gray-900 dark:text-white">
                                            {primary.business_name}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </div>

                        {/* Status Timeline */}
                        {timeline !== null && (
                            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                                <h3 className="mb-6 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                                    Application Progress
                                </h3>
                                <ol className="relative space-y-6">
                                    {timeline.map((step, idx) => (
                                        <li key={step.label} className="flex gap-4">
                                            <div className="flex flex-col items-center">
                                                <StepIcon state={step.state} />
                                                {idx < timeline.length - 1 && (
                                                    <div
                                                        className={`mt-1 w-0.5 flex-1 ${
                                                            step.state === "complete"
                                                                ? "bg-emerald-400"
                                                                : step.state === "current"
                                                                  ? "bg-blue-300 dark:bg-blue-700"
                                                                  : "bg-gray-200 dark:bg-zinc-700"
                                                        }`}
                                                        style={{ minHeight: 24 }}
                                                    />
                                                )}
                                            </div>
                                            <div className="pb-2 pt-1">
                                                <p
                                                    className={`text-sm font-semibold ${
                                                        step.state === "complete"
                                                            ? "text-emerald-700 dark:text-emerald-400"
                                                            : step.state === "current"
                                                              ? "text-blue-700 dark:text-blue-400"
                                                              : "text-gray-400 dark:text-zinc-500"
                                                    }`}
                                                >
                                                    {step.label}
                                                </p>
                                                <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-500">
                                                    {step.description}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}

                        {/* Next Steps */}
                        {nextStep !== null && (
                            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                                    What to do next
                                </h3>
                                <p className="text-sm text-gray-700 dark:text-zinc-300">
                                    {nextStep.message}
                                </p>
                                {nextStep.linkLabel && nextStep.linkHref && (
                                    <Link
                                        href={nextStep.linkHref}
                                        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-900 bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                    >
                                        {nextStep.linkLabel}
                                    </Link>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
