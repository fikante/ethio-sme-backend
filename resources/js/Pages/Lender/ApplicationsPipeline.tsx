import EvaluationPanel from "@/Components/Lender/EvaluationPanel";
import type { PipelineApplication } from "@/features/valuation/types";
import { formatEtb, formatPercentFraction } from "@/lib/format";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { PageProps } from "@/types";
import { Head, router, usePage } from "@inertiajs/react";
import { axios } from "@/bootstrap";
import {
    AlertCircle,
    Brain,
    CheckCircle,
    Clock,
    Loader2,
    Search,
    X,
    XCircle,
    Zap,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

type Props = PageProps<{
    applications: PipelineApplication[];
}>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_STATUSES = [
    "draft",
    "submitted",
    "pending_psychometric",
    "pending_data_sync",
    "queued_for_ai",
    "processing",
    "evaluated",
    "approved",
    "rejected",
    "withdrawn",
] as const;

type SortField = "submitted_at" | "ai_risk_score";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 15;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function coverageBadgeClass(days: number): string {
    if (days >= 180) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
    if (days >= 45)  return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
    return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function humaniseStatus(status: string): string {
    return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function humaniseSector(sector: string | null): string {
    if (!sector) return "—";
    return sector.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// State-machine action cell
// ---------------------------------------------------------------------------

function getActionForStatus(
    app: PipelineApplication,
    onOpenPanel: (id: number) => void,
    onEvaluate: (id: number) => void,
): React.ReactNode {
    const { status, id } = app;

    const notReadyStatuses = [
        "draft",
        "pending_psychometric",
        "pending_data_sync",
    ];

    if (notReadyStatuses.includes(status)) {
        return (
            <span
                title="Application is not yet ready for AI evaluation"
                className="cursor-default text-sm font-medium text-zinc-400 dark:text-zinc-600"
            >
                Not Ready
            </span>
        );
    }

    if (status === "queued_for_ai") {
        return (
            <button
                type="button"
                onClick={() => onEvaluate(id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 focus:outline-none"
            >
                <Zap className="h-3.5 w-3.5" />
                Run AI Evaluation
            </button>
        );
    }

    if (status === "submitted" && app.psychometric_complete && app.data_coverage_days >= 45) {
        return (
            <button
                type="button"
                onClick={() => onEvaluate(id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none"
            >
                <Zap className="h-3.5 w-3.5" />
                Run AI Evaluation
            </button>
        );
    }

    if (status === "submitted") {
        return (
            <span
                title="Application is not yet ready for AI evaluation"
                className="cursor-default text-sm font-medium text-zinc-400 dark:text-zinc-600"
            >
                Not Ready
            </span>
        );
    }

    if (status === "processing") {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                <Loader2 className="h-3 w-3 animate-spin" />
                Processing&hellip;
            </span>
        );
    }

    if (status === "evaluated") {
        return (
            <button
                type="button"
                onClick={() => onOpenPanel(id)}
                className={`inline-flex rounded-lg px-3 py-1.5 text-sm font-medium ${
                    app.is_degraded
                        ? "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200"
                        : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
                }`}
            >
                {app.is_degraded ? "Review (Degraded) →" : "Review →"}
            </button>
        );
    }

    if (status === "approved") {
        return (
            <div className="flex flex-col gap-0.5">
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Approved
                </span>
                <button
                    type="button"
                    onClick={() => onOpenPanel(id)}
                    className="text-xs text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-300"
                >
                    View Results &rarr;
                </button>
            </div>
        );
    }

    if (status === "rejected") {
        return (
            <div className="flex flex-col gap-0.5">
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-700 dark:text-red-400">
                    <XCircle className="h-3.5 w-3.5" />
                    Rejected
                </span>
                <button
                    type="button"
                    onClick={() => onOpenPanel(id)}
                    className="text-xs text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-300"
                >
                    View Results &rarr;
                </button>
            </div>
        );
    }

    if (status === "withdrawn") {
        return (
            <span className="text-sm font-medium text-zinc-400 dark:text-zinc-600">
                Withdrawn
            </span>
        );
    }

    return null;
}

// ---------------------------------------------------------------------------
// Sort indicator
// ---------------------------------------------------------------------------

function SortIndicator({ field, sortField, sortDir }: {
    field: SortField;
    sortField: SortField;
    sortDir: SortDir;
}) {
    if (sortField !== field) {
        return <span className="ml-1 text-zinc-300 dark:text-zinc-600">&#8645;</span>;
    }
    return (
        <span className="ml-1 text-zinc-700 dark:text-zinc-300">
            {sortDir === "asc" ? "▲" : "▼"}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ApplicationsPipeline() {
    const { applications, flash } = usePage<Props>().props;

    // Panel state
    const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);

    // Evaluate loading state
    const [evaluatingId, setEvaluatingId] = useState<number | null>(null);
    const [evalError, setEvalError] = useState<string | null>(null);

    // Filter state
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [riskBandFilter, setRiskBandFilter] = useState<string>("all");
    const [sectorFilter, setSectorFilter] = useState<string>("all");

    // Sort state — default newest first
    const [sortField, setSortField] = useState<SortField>("submitted_at");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    // Pagination state
    const [page, setPage] = useState(1);

    // Derive unique sectors for the dropdown
    const uniqueSectors = useMemo(() => {
        const sectors = new Set<string>();
        applications.forEach((app) => {
            if (app.sector) sectors.add(app.sector);
        });
        return Array.from(sectors).sort();
    }, [applications]);

    // Toggle a status in the multi-select
    function toggleStatus(status: string) {
        setPage(1);
        setStatusFilter((prev) =>
            prev.includes(status)
                ? prev.filter((s) => s !== status)
                : [...prev, status],
        );
    }

    function handleSortToggle(field: SortField) {
        if (sortField === field) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortDir("desc");
        }
        setPage(1);
    }

    const handleOpenPanel = useCallback((id: number) => {
        setSelectedApplicationId(id);
    }, []);

    const handleClosePanel = useCallback(() => {
        setSelectedApplicationId(null);
    }, []);

    const handleDecision = useCallback(() => {
        // Refresh the pipeline data via Inertia after a decision is made
        router.reload({ only: ["applications"] });
    }, []);

    const handleEvaluate = useCallback(async (applicationId: number) => {
        setEvaluatingId(applicationId);
        setEvalError(null);
        try {
            await axios.post(
                `/applications/${applicationId}/evaluate`,
                {},
                { headers: { Accept: "application/json" } },
            );
            router.reload({ only: ["applications"] });
            setSelectedApplicationId(applicationId);
        } catch (err: unknown) {
            const axErr = err as { response?: { data?: { error?: string } }; message?: string };
            setEvalError(axErr?.response?.data?.error ?? axErr?.message ?? "AI evaluation failed.");
        } finally {
            setEvaluatingId(null);
        }
    }, []);

    // Filter + sort
    const filtered = useMemo(() => {
        let result = applications;

        if (search.trim()) {
            const lower = search.trim().toLowerCase();
            result = result.filter(
                (a) => (a.business_name ?? "").toLowerCase().includes(lower),
            );
        }

        if (statusFilter.length > 0) {
            result = result.filter((a) => statusFilter.includes(a.status));
        }

        if (riskBandFilter !== "all") {
            if (riskBandFilter === "not_scored") {
                result = result.filter((a) => !a.ai_risk_band);
            } else {
                result = result.filter(
                    (a) => (a.ai_risk_band ?? "").toLowerCase() === riskBandFilter,
                );
            }
        }

        if (sectorFilter !== "all") {
            result = result.filter((a) => a.sector === sectorFilter);
        }

        return [...result].sort((a, b) => {
            let cmp = 0;
            if (sortField === "submitted_at") {
                cmp = new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
            } else {
                const aScore = a.ai_risk_score !== null ? Number(a.ai_risk_score) : -1;
                const bScore = b.ai_risk_score !== null ? Number(b.ai_risk_score) : -1;
                cmp = aScore - bScore;
            }
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [applications, search, statusFilter, riskBandFilter, sectorFilter, sortField, sortDir]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageStart = (safePage - 1) * PAGE_SIZE;
    const pageEnd = Math.min(pageStart + PAGE_SIZE, filtered.length);
    const paginated = filtered.slice(pageStart, pageEnd);

    const hasActiveFilters =
        search.trim() !== "" ||
        statusFilter.length > 0 ||
        riskBandFilter !== "all" ||
        sectorFilter !== "all";

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-zinc-900 dark:text-white">
                    Loan Applications
                </h2>
            }
        >
            <Head title="Loan Applications" />

            {/* Full-page AI evaluation overlay */}
            {evaluatingId !== null && (
                <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-6 rounded-2xl border border-gray-700 bg-gray-800 p-10 shadow-2xl max-w-md text-center">
                        <div className="relative">
                            <div className="h-16 w-16 rounded-full border-4 border-gray-600 border-t-emerald-500 animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Brain className="h-6 w-6 text-emerald-400" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">AI Evaluation in Progress</h3>
                            <p className="mt-2 text-sm text-gray-400">
                                The AI engine is analysing cash flow patterns, psychometric scores, and macroeconomic factors to compute the NPV credit limit and risk band.
                            </p>
                            <p className="mt-3 text-xs text-gray-500">This typically takes 10–30 seconds…</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Eval error toast */}
            {evalError && (
                <div className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 rounded-xl border border-red-700 bg-red-900/80 px-4 py-3 shadow-2xl">
                    <AlertCircle className="h-5 w-5 text-red-300" />
                    <p className="text-sm text-white">{evalError}</p>
                    <button
                        type="button"
                        onClick={() => setEvalError(null)}
                        className="ml-2 text-red-300 hover:text-white"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            <div className="py-8 space-y-4">
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

                {/* Filter bar */}
                <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                    {/* Search */}
                    <div className="relative min-w-[220px] flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search by business name..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full rounded-lg border border-zinc-200 bg-transparent py-1.5 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:text-white dark:placeholder:text-zinc-500 dark:focus:ring-zinc-300/20"
                        />
                    </div>

                    {/* Status multi-select */}
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Status</span>
                        <div className="flex flex-wrap gap-1">
                            {ALL_STATUSES.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => toggleStatus(s)}
                                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                                        statusFilter.includes(s)
                                            ? "border-zinc-800 bg-zinc-900 text-white dark:border-zinc-200 dark:bg-zinc-100 dark:text-zinc-900"
                                            : "border-zinc-200 bg-transparent text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500"
                                    }`}
                                >
                                    {humaniseStatus(s)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Risk band */}
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Risk Band</span>
                        <select
                            value={riskBandFilter}
                            onChange={(e) => { setRiskBandFilter(e.target.value); setPage(1); }}
                            className="rounded-lg border border-zinc-200 bg-transparent px-3 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus:ring-zinc-300/20"
                        >
                            <option value="all">All</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="not_scored">Not Scored</option>
                        </select>
                    </div>

                    {/* Sector */}
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Sector</span>
                        <select
                            value={sectorFilter}
                            onChange={(e) => { setSectorFilter(e.target.value); setPage(1); }}
                            className="rounded-lg border border-zinc-200 bg-transparent px-3 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus:ring-zinc-300/20"
                        >
                            <option value="all">All Sectors</option>
                            {uniqueSectors.map((s) => (
                                <option key={s} value={s}>{humaniseSector(s)}</option>
                            ))}
                        </select>
                    </div>

                    {/* Clear filters */}
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch("");
                                setStatusFilter([]);
                                setRiskBandFilter("all");
                                setSectorFilter("all");
                                setPage(1);
                            }}
                            className="self-end rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* Table */}
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
                                    Sector
                                </th>
                                <th
                                    className="cursor-pointer select-none px-4 py-3 font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                    onClick={() => handleSortToggle("submitted_at")}
                                >
                                    Submitted
                                    <SortIndicator
                                        field="submitted_at"
                                        sortField={sortField}
                                        sortDir={sortDir}
                                    />
                                </th>
                                <th className="px-4 py-3 font-medium text-zinc-500">
                                    Requested
                                </th>
                                <th
                                    className="cursor-pointer select-none px-4 py-3 font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                    onClick={() => handleSortToggle("ai_risk_score")}
                                >
                                    Risk
                                    <SortIndicator
                                        field="ai_risk_score"
                                        sortField={sortField}
                                        sortDir={sortDir}
                                    />
                                </th>
                                <th className="px-4 py-3 font-medium text-zinc-500">
                                    Credit Limit
                                </th>
                                <th className="px-4 py-3 font-medium text-zinc-500">
                                    Data Coverage
                                </th>
                                <th className="px-4 py-3 font-medium text-zinc-500">
                                    Psychometric
                                </th>
                                <th className="px-4 py-3 font-medium text-zinc-500">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={10}
                                        className="px-4 py-12 text-center"
                                    >
                                        <div className="flex flex-col items-center gap-2 text-zinc-400 dark:text-zinc-600">
                                            <Search className="h-8 w-8" />
                                            <p className="text-sm font-medium">
                                                {hasActiveFilters
                                                    ? "No applications match your filters"
                                                    : "No applications in the pipeline yet."}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginated.map((app) => (
                                    <tr
                                        key={app.id}
                                        className={`border-b border-zinc-100 last:border-0 dark:border-zinc-800 ${
                                            selectedApplicationId === app.id
                                                ? "bg-zinc-50 dark:bg-zinc-800/50"
                                                : ""
                                        }`}
                                    >
                                        {/* Business */}
                                        <td className="px-4 py-3 text-zinc-900 dark:text-white">
                                            <div className="font-medium">
                                                {app.business_name ?? "—"}
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-3 capitalize text-zinc-700 dark:text-zinc-300">
                                            {app.status.replace(/_/g, " ")}
                                        </td>

                                        {/* Sector */}
                                        <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                                            {humaniseSector(app.sector)}
                                        </td>

                                        {/* Submitted */}
                                        <td className="px-4 py-3 tabular-nums text-zinc-700 dark:text-zinc-300">
                                            {formatDate(app.submitted_at)}
                                        </td>

                                        {/* Requested */}
                                        <td className="px-4 py-3 tabular-nums">
                                            {formatEtb(app.requested_amount)}
                                        </td>

                                        {/* Risk */}
                                        <td className="px-4 py-3">
                                            {app.ai_risk_band ? (
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${riskBandClass(app.ai_risk_band)}`}
                                                >
                                                    {app.ai_risk_band}{" "}
                                                    {app.ai_risk_score !== null &&
                                                        `(${formatPercentFraction(app.ai_risk_score)})`}
                                                </span>
                                            ) : (
                                                "—"
                                            )}
                                        </td>

                                        {/* Credit Limit */}
                                        <td className="px-4 py-3 tabular-nums">
                                            {app.npv_credit_limit !== null
                                                ? formatEtb(app.npv_credit_limit)
                                                : app.is_degraded
                                                  ? "Pending Full Data"
                                                  : "—"}
                                        </td>

                                        {/* Data Coverage */}
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${coverageBadgeClass(app.data_coverage_days)}`}
                                            >
                                                {app.data_coverage_days} days
                                            </span>
                                        </td>

                                        {/* Psychometric */}
                                        <td className="px-4 py-3">
                                            {app.psychometric_complete ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                                    <CheckCircle className="h-3 w-3" />
                                                    Complete
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                                    <Clock className="h-3 w-3" />
                                                    Pending
                                                </span>
                                            )}
                                        </td>

                                        {/* Action — state machine */}
                                        <td className="px-4 py-3">
                                            {getActionForStatus(app, handleOpenPanel, handleEvaluate)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filtered.length > 0 && (
                    <div className="flex items-center justify-between px-1">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Showing {pageStart + 1}–{pageEnd} of {filtered.length} application{filtered.length !== 1 ? "s" : ""}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={safePage <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                {safePage} / {totalPages}
                            </span>
                            <button
                                type="button"
                                disabled={safePage >= totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Evaluation slide-over panel */}
            {selectedApplicationId !== null && (
                <EvaluationPanel
                    applicationId={selectedApplicationId}
                    onClose={handleClosePanel}
                    onDecision={handleDecision}
                />
            )}
        </AuthenticatedLayout>
    );
}
