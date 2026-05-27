import Dropdown from "@/Components/Dropdown";
import ThemeToggle from "@/Components/ThemeToggle";
import { isLoanProviderRole } from "@/lib/roles";
import { avatarCircleSm } from "@/lib/uiTheme";
import { Link, usePage } from "@inertiajs/react";
import {
    Dialog,
    DialogPanel,
    Transition,
    TransitionChild,
} from "@headlessui/react";
import {
    Fragment,
    PropsWithChildren,
    ReactNode,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

export default function Authenticated({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const auth = usePage().props.auth as {
        user?: {
            id: number;
            name: string;
            email: string;
            roles?: string[];
            permissions?: string[];
        } | null;
        primaryRole?: string | null;
    };
    const user = auth.user ?? null;
    const primaryRole = auth.primaryRole ?? null;
    const userName = user?.name ?? "User";
    const userEmail = user?.email ?? "";

    const safeRoute = (name: string) => {
        try {
            return route(name);
        } catch {
            return "#";
        }
    };

    const safeCurrent = (name: string) => {
        try {
            return route().current(name);
        } catch {
            return false;
        }
    };

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState<number>(288);
    const isResizingRef = useRef(false);

    const BrandMark = ({ className = "h-6 w-6" }: { className?: string }) => (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M12 2v4" />
            <path d="M7 6h10" />
            <path d="M6 10h12" />
            <path d="M6 14h12" />
            <path d="M7 18h10" />
            <path d="M12 18v4" />
        </svg>
    );

    type NavItem = {
        name: string;
        href: string;
        active: boolean;
        icon: ReactNode;
    };

    type NavSection = {
        label: string;
        items: NavItem[];
    };

    const navigation = useMemo(
        () => [
            {
                name: "Dashboard",
                href: safeRoute("dashboard"),
                active: safeCurrent("dashboard"),
                icon: (
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5"
                        aria-hidden="true"
                    >
                        <path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" />
                    </svg>
                ),
            },
        ],
        [],
    );

    const borrowerSection: NavSection = {
        label: "SME Portal",
        items: [
            {
                name: "Loan Application",
                href: safeRoute("loan-application"),
                active: safeCurrent("loan-application"),
                icon: (
                    <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"
                        />
                    </svg>
                ),
            },
            {
                name: "Psychometric Assessment",
                href: safeRoute("psychometrics"),
                active: safeCurrent("psychometrics"),
                icon: (
                    <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 21s7-4.5 7-10a4 4 0 0 0-7-2 4 4 0 0 0-7 2c0 5.5 7 10 7 10z"
                        />
                    </svg>
                ),
            },
            {
                name: "Application Status",
                href: safeRoute("sme.valuation"),
                active: safeCurrent("sme.valuation"),
                icon: (
                    <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12h6M9 16h4"
                        />
                    </svg>
                ),
            },
        ],
    };

    const lenderLendingSection: NavSection = {
        label: "LENDING",
        items: [
            {
                name: "Loan Applications",
                href: safeRoute("applications.pipeline"),
                active: safeCurrent("applications.pipeline"),
                icon: (
                    <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 6h16"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 12h10"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 18h7"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M18 10v10"
                        />
                    </svg>
                ),
            },
        ],
    };

    const lenderAnalyticsSection: NavSection = {
        label: "ANALYTICS",
        items: [
            {
                name: "Decisioning & XAI",
                href: safeRoute("decisioning.xai"),
                active:
                    safeCurrent("decisioning.xai") ||
                    safeCurrent("decisioning.decide"),
                icon: (
                    <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 2a7 7 0 0 0-4 12.75V18a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-3.25A7 7 0 0 0 12 2z"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10 22h4"
                        />
                    </svg>
                ),
            },
        ],
    };

    const adminSection: NavSection = {
        label: "Administration",
        items: [
            {
                name: "Users",
                href: safeRoute("admin.users"),
                active: safeCurrent("admin.users"),
                icon: (
                    <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                        />
                        <circle cx="9" cy="7" r="4" />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                        />
                    </svg>
                ),
            },
            {
                name: "Loan Providers",
                href: safeRoute("admin.loan-providers"),
                active: safeCurrent("admin.loan-providers"),
                icon: (
                    <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 21V8l9-5 9 5v13"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 21v-6h6v6"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 8h18"
                        />
                    </svg>
                ),
            },
            {
                name: "Macroeconomic Factors",
                href: safeRoute("admin.macroeconomic"),
                active: safeCurrent("admin.macroeconomic"),
                icon: (
                    <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 19h16"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 15l3-3 3 2 5-7"
                        />
                    </svg>
                ),
            },
            {
                name: "Model Training",
                href: safeRoute("admin.model-training"),
                active: safeCurrent("admin.model-training"),
                icon: (
                    <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 3v4m0 10v4M5 8h14M7 16h10M9 12h6"
                        />
                    </svg>
                ),
            },
            {
                name: "Fairness Audit",
                href: safeRoute("admin.fairness"),
                active: safeCurrent("admin.fairness"),
                icon: (
                    <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 3v18"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 8h14"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M7 8l-2 4a4 4 0 0 0 8 0l-2-4"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17 8l-2 4a4 4 0 0 0 8 0l-2-4"
                        />
                    </svg>
                ),
            },
            {
                name: "Audit Logs",
                href: safeRoute("admin.audit-logs"),
                active: safeCurrent("admin.audit-logs"),
                icon: (
                    <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M7 8h10M7 12h6M7 16h4"
                        />
                    </svg>
                ),
            },
        ],
    };

    const sections: NavSection[] = useMemo(() => {
        const overview: NavSection = {
            label: "OVERVIEW",
            items: [...navigation],
        };

        if (primaryRole === "sme_owner") {
            return [overview, borrowerSection];
        }
        if (isLoanProviderRole(primaryRole)) {
            return [overview, lenderLendingSection, lenderAnalyticsSection];
        }
        if (primaryRole === "super_admin") {
            return [overview, adminSection];
        }

        return [overview];
    }, [primaryRole, navigation]);

    const SidebarNav = ({ className = "" }: { className?: string }) => (
        <nav
            className={`flex flex-col gap-5 ${className}`}
            aria-label="Sidebar"
        >
            {sections.map((section) => (
                <div key={section.label}>
                    {!sidebarCollapsed && (
                        <div className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-white/40">
                            {section.label}
                        </div>
                    )}
                    <div
                        className={[
                            "mt-2 flex flex-col gap-1",
                            sidebarCollapsed ? "items-center" : "",
                        ].join(" ")}
                    >
                        {section.items.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={[
                                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                                    item.active
                                        ? "bg-gray-900 text-white dark:bg-white/10"
                                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white",
                                    sidebarCollapsed
                                        ? "w-11 justify-center px-0"
                                        : "",
                                    "focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20",
                                    "active:bg-gray-200/70 dark:active:bg-white/15",
                                ].join(" ")}
                                title={sidebarCollapsed ? item.name : undefined}
                            >
                                <span
                                    className={[
                                        "shrink-0",
                                        item.active
                                            ? "text-white dark:text-white"
                                            : "text-gray-400 group-hover:text-gray-600 dark:text-white/40 dark:group-hover:text-white/70",
                                    ].join(" ")}
                                >
                                    {item.icon}
                                </span>
                                {!sidebarCollapsed && (
                                    <span className="truncate">
                                        {item.name}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>
                </div>
            ))}
        </nav>
    );

    useEffect(() => {
        const storedCollapsed = window.localStorage.getItem(
            "ui.sidebarCollapsed",
        );
        const storedWidth = window.localStorage.getItem("ui.sidebarWidth");

        if (storedCollapsed === "true") {
            setSidebarCollapsed(true);
        }

        if (storedWidth) {
            const w = Number(storedWidth);
            if (!Number.isNaN(w)) {
                setSidebarWidth(Math.min(360, Math.max(240, w)));
            }
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem(
            "ui.sidebarCollapsed",
            String(sidebarCollapsed),
        );
    }, [sidebarCollapsed]);

    useEffect(() => {
        window.localStorage.setItem("ui.sidebarWidth", String(sidebarWidth));
    }, [sidebarWidth]);

    useEffect(() => {
        const handleMove = (e: PointerEvent) => {
            if (!isResizingRef.current || sidebarCollapsed) {
                return;
            }

            const next = Math.min(360, Math.max(240, e.clientX));
            setSidebarWidth(next);
        };

        const handleUp = () => {
            isResizingRef.current = false;
        };

        window.addEventListener("pointermove", handleMove);
        window.addEventListener("pointerup", handleUp);

        return () => {
            window.removeEventListener("pointermove", handleMove);
            window.removeEventListener("pointerup", handleUp);
        };
    }, [sidebarCollapsed]);

    return (
        <div className="h-screen bg-gray-50 text-gray-900 dark:bg-black dark:text-white">
            <Transition show={sidebarOpen} as={Fragment}>
                <Dialog
                    className="relative z-50 lg:hidden"
                    onClose={setSidebarOpen}
                >
                    <TransitionChild
                        as={Fragment}
                        enter="transition-opacity ease-linear duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="transition-opacity ease-linear duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-gray-900/50" />
                    </TransitionChild>

                    <div className="fixed inset-0 flex">
                        <TransitionChild
                            as={Fragment}
                            enter="transition ease-in-out duration-200 transform"
                            enterFrom="-translate-x-full"
                            enterTo="translate-x-0"
                            leave="transition ease-in-out duration-200 transform"
                            leaveFrom="translate-x-0"
                            leaveTo="-translate-x-full"
                        >
                            <DialogPanel className="relative flex w-full max-w-xs flex-1 flex-col bg-white">
                                <div className="flex h-16 items-center justify-between px-4">
                                    <Link
                                        href="/"
                                        className="flex items-center gap-3"
                                    >
                                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-white">
                                            <BrandMark className="h-5 w-5" />
                                        </span>
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {import.meta.env.VITE_APP_NAME ??
                                                "EthioSME"}
                                        </span>
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => setSidebarOpen(false)}
                                        className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/30"
                                    >
                                        <span className="sr-only">
                                            Close sidebar
                                        </span>
                                        <svg
                                            viewBox="0 0 24 24"
                                            className="h-6 w-6"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto px-3 pb-4">
                                    <SidebarNav />
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </Dialog>
            </Transition>

            <div className="flex h-screen overflow-hidden">
                <aside
                    className="relative hidden shrink-0 border-r border-gray-200 bg-white dark:border-white/10 dark:bg-black lg:flex lg:flex-col"
                    style={{ width: sidebarCollapsed ? 80 : sidebarWidth }}
                >
                    <div className="flex h-16 items-center justify-between gap-3 px-4">
                        <Link href="/" className="flex items-center gap-3">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-white">
                                <BrandMark className="h-5 w-5" />
                            </span>
                            {!sidebarCollapsed && (
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {import.meta.env.VITE_APP_NAME ??
                                        "EthioSME"}
                                </span>
                            )}
                        </Link>
                    </div>

                    <div
                        className={[
                            "flex-1 overflow-y-auto pb-4",
                            sidebarCollapsed ? "px-2" : "px-3",
                        ].join(" ")}
                    >
                        <SidebarNav className="mt-2" />
                    </div>

                    {!sidebarCollapsed && (
                        <div
                            onPointerDown={(e) => {
                                isResizingRef.current = true;
                                (
                                    e.currentTarget as HTMLDivElement
                                ).setPointerCapture(e.pointerId);
                            }}
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent"
                            title="Drag to resize"
                            role="separator"
                            aria-orientation="vertical"
                            aria-label="Resize sidebar"
                        />
                    )}
                </aside>

                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <div className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/80 px-4 backdrop-blur dark:border-white/10 dark:bg-black/60 sm:px-6">
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(true)}
                            className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/30 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white dark:focus:ring-white/20 lg:hidden"
                        >
                            <span className="sr-only">Open sidebar</span>
                            <svg
                                viewBox="0 0 24 24"
                                className="h-6 w-6"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            </svg>
                        </button>

                        <button
                            type="button"
                            onClick={() => setSidebarCollapsed((v) => !v)}
                            className="hidden items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 lg:inline-flex"
                            title={
                                sidebarCollapsed
                                    ? "Expand sidebar"
                                    : "Collapse sidebar"
                            }
                        >
                            <span className="sr-only">
                                {sidebarCollapsed
                                    ? "Expand sidebar"
                                    : "Collapse sidebar"}
                            </span>
                            {/* Panel / sidebar toggle icon (matches screenshot style) */}
                            <svg
                                viewBox="0 0 24 24"
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden="true"
                            >
                                <rect
                                    x="3"
                                    y="4"
                                    width="18"
                                    height="16"
                                    rx="2"
                                />
                                <path d="M9 4v16" />
                            </svg>
                        </button>

                        <div className="min-w-0 flex-1">
                            {header ? (
                                <div className="min-w-0 truncate text-gray-900 [&_h2]:truncate [&_h2]:text-base [&_h2]:font-semibold [&_h2]:leading-tight [&_h2]:text-gray-900">
                                    {header}
                                </div>
                            ) : (
                                <div className="truncate text-base font-semibold text-gray-900">
                                    {safeCurrent("dashboard")
                                        ? "Dashboard"
                                        : "Overview"}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <ThemeToggle />
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10 dark:focus:ring-white/40"
                                    >
                                        <span className={avatarCircleSm}>
                                            {String(userName ?? "U")
                                                .trim()
                                                .slice(0, 1)
                                                .toUpperCase()}
                                        </span>
                                        <span className="min-w-0 text-left">
                                            <span className="block max-w-[12rem] truncate text-sm font-semibold text-gray-900 dark:text-white">
                                                {userName}
                                            </span>
                                            <span className="block max-w-[12rem] truncate text-xs text-gray-500 dark:text-white/60">
                                                {userEmail}
                                            </span>
                                        </span>
                                    </button>
                                </Dropdown.Trigger>
                                <Dropdown.Content
                                    align="right"
                                    contentClasses="py-0 bg-white dark:bg-black"
                                >
                                    <div className="w-48">
                                        <div className="border-b border-gray-100 px-4 py-3 dark:border-white/10">
                                            <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                                {userName}
                                            </div>
                                            <div className="truncate text-xs text-gray-500 dark:text-white/60">
                                                {userEmail}
                                            </div>
                                        </div>

                                        <div className="p-1">
                                            <Dropdown.Link
                                                href={safeRoute("profile.edit")}
                                                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-white/80 dark:hover:bg-white/10"
                                            >
                                                <svg
                                                    viewBox="0 0 24 24"
                                                    className="h-4 w-4 text-gray-500 dark:text-white/60"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    aria-hidden="true"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5z"
                                                    />
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M20 21a8 8 0 0 0-16 0"
                                                    />
                                                </svg>
                                                Profile Settings
                                            </Dropdown.Link>

                                            <Dropdown.Link
                                                href={safeRoute("logout")}
                                                method="post"
                                                as="button"
                                                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-white/10"
                                            >
                                                <svg
                                                    viewBox="0 0 24 24"
                                                    className="h-4 w-4 text-red-500"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    aria-hidden="true"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M10 16l-4-4 4-4"
                                                    />
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M6 12h9"
                                                    />
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"
                                                    />
                                                </svg>
                                                Log Out
                                            </Dropdown.Link>
                                        </div>
                                    </div>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </div>

                    <main className="flex-1 overflow-y-auto">
                        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
