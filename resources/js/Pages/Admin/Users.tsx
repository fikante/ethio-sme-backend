import Modal from "@/Components/Modal";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { isLoanProviderRole } from "@/lib/roles";
import {
    avatarCircle,
    btnPrimary,
    btnPrimarySm,
    inputField,
    labelMuted,
    roleCardSelected,
    roleCardUnselected,
    surfaceCard,
    surfaceModal,
    surfaceModalFooter,
    surfacePage,
} from "@/lib/uiTheme";
import type { PageProps } from "@/types";
import { Head, router, useForm, usePage } from "@inertiajs/react";
import {
    AlertCircle,
    Building2,
    CheckCircle,
    Eye,
    EyeOff,
    Loader2,
    Pencil,
    Scale,
    Search,
    Shield,
    ShieldCheck,
    Trash2,
    UserCog,
    UserPlus,
    Users as UsersIcon,
    X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type CreateRole = "sme_owner" | "loan_officer" | "super_admin";

type LoanProviderOption = {
    id: number;
    name: string;
    short_code: string;
    label: string;
};

type UserRow = {
    id: number;
    name: string;
    email: string;
    role: string;
    role_value: string;
    loan_provider_id: number | null;
    loan_provider: LoanProviderOption | null;
    created_at: string;
};

type RoleOption = { value: string; label: string };

type Props = PageProps<{
    users: UserRow[];
    loanProviders: LoanProviderOption[];
    roleOptions: RoleOption[];
    stats: {
        total: number;
        sme_owners: number;
        loan_provider_users: number;
        super_admins: number;
        partner_institutions: number;
    };
    currentUserId: number;
}>;

const SECTORS = [
    { value: "5411", label: "5411 — Grocery" },
    { value: "5812", label: "5812 — Cafe" },
    { value: "5912", label: "5912 — Pharmacy" },
    { value: "5732", label: "5732 — Electronics" },
    { value: "5651", label: "5651 — Retail Apparel" },
] as const;

const SUB_CITIES = [
    "Addis Ketema",
    "Akaki Kaliti",
    "Arada",
    "Bole",
    "Gullele",
    "Kirkos",
    "Kolfe Keranio",
    "Lideta",
    "Nifas Silk-Lafto",
    "Yeka",
] as const;

const CREATE_ROLES = [
    {
        key: "sme_owner" as const,
        label: "SME Owner",
        icon: Building2,
        description: "Business owner applying for credit",
    },
    {
        key: "loan_officer" as const,
        label: "Loan Officer",
        icon: Scale,
        description: "Reviews and decides on applications",
    },
    {
        key: "super_admin" as const,
        label: "Super Admin",
        icon: ShieldCheck,
        description: "Full platform administration access",
    },
];

const roleBadgeStyles: Record<string, string> = {
    sme_owner:
        "bg-gray-100 text-gray-800 border-gray-200 dark:bg-white/10 dark:text-white/90 dark:border-white/20",
    loan_provider:
        "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700/50",
    super_admin:
        "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700/50",
};

function initials(name: string): string {
    return name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{message}</p>
    );
}

type EditFormData = {
    name: string;
    email: string;
    password: string;
    role: string;
    loan_provider_id: string;
};

function EditUserModal({
    show,
    onClose,
    user,
    roleOptions,
    loanProviders,
    processing,
    onSubmit,
}: {
    show: boolean;
    onClose: () => void;
    user: UserRow;
    roleOptions: RoleOption[];
    loanProviders: LoanProviderOption[];
    processing: boolean;
    onSubmit: (data: EditFormData) => void;
}) {
    const [form, setForm] = useState<EditFormData>({
        name: user.name,
        email: user.email,
        password: "",
        role: user.role_value,
        loan_provider_id: user.loan_provider_id
            ? String(user.loan_provider_id)
            : "",
    });

    useEffect(() => {
        if (show) {
            setForm({
                name: user.name,
                email: user.email,
                password: "",
                role: user.role_value,
                loan_provider_id: user.loan_provider_id
                    ? String(user.loan_provider_id)
                    : "",
            });
        }
    }, [show, user]);

    const showProvider = isLoanProviderRole(form.role);

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit(form);
                }}
                className="bg-white dark:bg-black"
            >
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/10">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Edit user
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:text-white/60 dark:hover:bg-white/10"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="space-y-4 px-6 py-5">
                    <div>
                        <label className={labelMuted}>Full name</label>
                        <input
                            required
                            value={form.name}
                            onChange={(e) =>
                                setForm({ ...form, name: e.target.value })
                            }
                            className={inputField()}
                        />
                    </div>
                    <div>
                        <label className={labelMuted}>Email</label>
                        <input
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) =>
                                setForm({ ...form, email: e.target.value })
                            }
                            className={inputField()}
                        />
                    </div>
                    <div>
                        <label className={labelMuted}>
                            Password{" "}
                            <span className="font-normal normal-case text-gray-400">
                                (leave blank to keep)
                            </span>
                        </label>
                        <input
                            type="password"
                            minLength={8}
                            value={form.password}
                            onChange={(e) =>
                                setForm({ ...form, password: e.target.value })
                            }
                            className={inputField()}
                        />
                    </div>
                    <div>
                        <label className={labelMuted}>Role</label>
                        <select
                            required
                            value={form.role}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    role: e.target.value,
                                    loan_provider_id: "",
                                })
                            }
                            className={inputField()}
                        >
                            {roleOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    {showProvider && (
                        <div>
                            <label className={labelMuted}>Institution</label>
                            <select
                                required
                                value={form.loan_provider_id}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        loan_provider_id: e.target.value,
                                    })
                                }
                                className={inputField()}
                            >
                                <option value="">Select institution</option>
                                {loanProviders.map((p) => (
                                    <option key={p.id} value={String(p.id)}>
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <div
                    className={`flex justify-end gap-3 px-6 py-4 ${surfaceModalFooter}`}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-white/10 dark:bg-black dark:text-white dark:hover:bg-white/5"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={processing}
                        className={`${btnPrimarySm} disabled:opacity-50`}
                    >
                        Save changes
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function AddUserModal({
    open,
    onClose,
    loanProviders,
}: {
    open: boolean;
    onClose: () => void;
    loanProviders: LoanProviderOption[];
}) {
    const [selectedRole, setSelectedRole] = useState<CreateRole>("sme_owner");
    const [showPassword, setShowPassword] = useState(false);
    const [roleAnimKey, setRoleAnimKey] = useState(0);

    const form = useForm({
        role: "sme_owner" as CreateRole,
        name: "",
        email: "",
        password: "",
        phone: "",
        business_name: "",
        sector: "",
        sub_city: "",
        established_year: String(new Date().getFullYear() - 3),
        loan_provider_id: "",
        employee_id: "",
        admin_code: "",
    });

    useEffect(() => {
        if (!open) return;
        form.reset();
        form.clearErrors();
        setSelectedRole("sme_owner");
        setShowPassword(false);
    }, [open]);

    const selectRole = (role: CreateRole) => {
        setSelectedRole(role);
        form.setData("role", role);
        setRoleAnimKey((k) => k + 1);
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route("admin.users.store"), {
            preserveScroll: true,
            onSuccess: () => {
                onClose();
                form.reset();
            },
        });
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
            <button
                type="button"
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                aria-label="Close modal"
                onClick={onClose}
            />
            <div
                className={`relative z-10 mt-8 w-full max-w-lg sm:mt-16 ${surfaceModal}`}
            >
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/10">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Add New User
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:text-white/60 dark:hover:bg-white/10"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/50">
                        Select role
                    </p>
                    <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {CREATE_ROLES.map((role) => {
                            const Icon = role.icon;
                            const selected = selectedRole === role.key;
                            return (
                                <button
                                    key={role.key}
                                    type="button"
                                    onClick={() => selectRole(role.key)}
                                    className={`w-full cursor-pointer rounded-xl border px-3 py-3 text-left transition-all duration-200 ${selected ? roleCardSelected : roleCardUnselected}`}
                                >
                                    <Icon className="mb-1.5 h-5 w-5" />
                                    <p className="text-sm font-semibold">
                                        {role.label}
                                    </p>
                                    <p
                                        className={`mt-0.5 text-xs ${selected ? 'text-white/80 dark:text-black/70' : 'text-gray-500 dark:text-white/50'}`}
                                    >
                                        {role.description}
                                    </p>
                                </button>
                            );
                        })}
                    </div>

                    <div
                        key={roleAnimKey}
                        className="space-y-4 transition-all duration-200"
                    >
                        <div>
                            <label className={labelMuted}>Full name</label>
                            <input
                                required
                                value={form.data.name}
                                onChange={(e) =>
                                    form.setData("name", e.target.value)
                                }
                                className={inputField(!!form.errors.name)}
                            />
                            <FieldError message={form.errors.name} />
                        </div>

                        <div>
                            <label className={labelMuted}>Email</label>
                            <input
                                type="email"
                                required
                                value={form.data.email}
                                onChange={(e) =>
                                    form.setData("email", e.target.value)
                                }
                                className={inputField(!!form.errors.email)}
                            />
                            <FieldError message={form.errors.email} />
                        </div>

                        <div>
                            <label className={labelMuted}>Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    minLength={8}
                                    value={form.data.password}
                                    onChange={(e) =>
                                        form.setData("password", e.target.value)
                                    }
                                    className={`${inputField(!!form.errors.password)} pr-10`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-white/40 dark:hover:text-white/70"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            <FieldError message={form.errors.password} />
                        </div>

                        {selectedRole === "sme_owner" && (
                            <>
                                <div>
                                    <label className={labelMuted}>
                                        Phone number
                                    </label>
                                    <input
                                        type="tel"
                                        placeholder="+251 9XX XXX XXXX"
                                        value={form.data.phone}
                                        onChange={(e) =>
                                            form.setData(
                                                "phone",
                                                e.target.value,
                                            )
                                        }
                                        className={inputField(
                                            !!form.errors.phone,
                                        )}
                                    />
                                    <FieldError message={form.errors.phone} />
                                </div>
                                <div>
                                    <label className={labelMuted}>
                                        Business name
                                    </label>
                                    <input
                                        required
                                        value={form.data.business_name}
                                        onChange={(e) =>
                                            form.setData(
                                                "business_name",
                                                e.target.value,
                                            )
                                        }
                                        className={inputField(
                                            !!form.errors.business_name,
                                        )}
                                    />
                                    <FieldError
                                        message={form.errors.business_name}
                                    />
                                </div>
                                <div>
                                    <label className={labelMuted}>Sector</label>
                                    <select
                                        required
                                        value={form.data.sector}
                                        onChange={(e) =>
                                            form.setData(
                                                "sector",
                                                e.target.value,
                                            )
                                        }
                                        className={inputField(
                                            !!form.errors.sector,
                                        )}
                                    >
                                        <option value="">Select sector</option>
                                        {SECTORS.map((s) => (
                                            <option
                                                key={s.value}
                                                value={s.value}
                                            >
                                                {s.label}
                                            </option>
                                        ))}
                                    </select>
                                    <FieldError message={form.errors.sector} />
                                </div>
                                <div>
                                    <label className={labelMuted}>
                                        Sub-city
                                    </label>
                                    <select
                                        required
                                        value={form.data.sub_city}
                                        onChange={(e) =>
                                            form.setData(
                                                "sub_city",
                                                e.target.value,
                                            )
                                        }
                                        className={inputField(
                                            !!form.errors.sub_city,
                                        )}
                                    >
                                        <option value="">
                                            Select sub-city
                                        </option>
                                        {SUB_CITIES.map((city) => (
                                            <option key={city} value={city}>
                                                {city}
                                            </option>
                                        ))}
                                    </select>
                                    <FieldError
                                        message={form.errors.sub_city}
                                    />
                                </div>
                                <div>
                                    <label className={labelMuted}>
                                        Established year
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min={1990}
                                        max={new Date().getFullYear()}
                                        value={form.data.established_year}
                                        onChange={(e) =>
                                            form.setData(
                                                "established_year",
                                                e.target.value,
                                            )
                                        }
                                        className={inputField(
                                            !!form.errors.established_year,
                                        )}
                                    />
                                    <FieldError
                                        message={form.errors.established_year}
                                    />
                                </div>
                            </>
                        )}

                        {selectedRole === "loan_officer" && (
                            <>
                                <div>
                                    <label className={labelMuted}>
                                        Institution
                                    </label>
                                    <select
                                        required
                                        value={form.data.loan_provider_id}
                                        onChange={(e) =>
                                            form.setData(
                                                "loan_provider_id",
                                                e.target.value,
                                            )
                                        }
                                        className={inputField(
                                            !!form.errors.loan_provider_id,
                                        )}
                                    >
                                        <option value="">
                                            Select institution
                                        </option>
                                        {loanProviders.map((p) => (
                                            <option
                                                key={p.id}
                                                value={String(p.id)}
                                            >
                                                {p.label}
                                            </option>
                                        ))}
                                    </select>
                                    <FieldError
                                        message={form.errors.loan_provider_id}
                                    />
                                </div>
                                <div>
                                    <label className={labelMuted}>
                                        Employee ID
                                    </label>
                                    <input
                                        placeholder="e.g. CBE-2024-001"
                                        value={form.data.employee_id}
                                        onChange={(e) =>
                                            form.setData(
                                                "employee_id",
                                                e.target.value,
                                            )
                                        }
                                        className={inputField(
                                            !!form.errors.employee_id,
                                        )}
                                    />
                                    <FieldError
                                        message={form.errors.employee_id}
                                    />
                                </div>
                            </>
                        )}

                        {selectedRole === "super_admin" && (
                            <div>
                                <label className={labelMuted}>Admin code</label>
                                <input
                                    required
                                    placeholder="Internal admin authorization code"
                                    value={form.data.admin_code}
                                    onChange={(e) =>
                                        form.setData(
                                            "admin_code",
                                            e.target.value,
                                        )
                                    }
                                    className={inputField(
                                        !!form.errors.admin_code,
                                    )}
                                />
                                <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
                                    Contact your system administrator for this
                                    code.
                                </p>
                                <FieldError message={form.errors.admin_code} />
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 dark:border-white/10 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-white/70 dark:hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className={`${btnPrimary} w-full disabled:opacity-60 sm:w-auto`}
                        >
                            {form.processing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                "Create User →"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function FlashBanner({
    type,
    message,
    onDismiss,
}: {
    type: "success" | "error";
    message: string;
    onDismiss: () => void;
}) {
    const isSuccess = type === "success";
    return (
        <div
            className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                isSuccess
                    ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800/50 dark:bg-green-900/20 dark:text-green-200"
                    : "border-red-200 bg-red-50 text-red-800 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-200"
            }`}
        >
            {isSuccess ? (
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            )}
            <p className="flex-1">{message}</p>
            <button
                type="button"
                onClick={onDismiss}
                className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

export default function Users() {
    const { users, loanProviders, roleOptions, stats, currentUserId } =
        usePage<Props>().props;
    const pageFlash = usePage().props.flash as {
        success?: string;
        error?: string;
    };

    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [modalOpen, setModalOpen] = useState(false);
    const [editUser, setEditUser] = useState<UserRow | null>(null);
    const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
    const [formProcessing, setFormProcessing] = useState(false);
    const [flashBanner, setFlashBanner] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    useEffect(() => {
        if (pageFlash?.success) {
            setFlashBanner({ type: "success", message: pageFlash.success });
        } else if (pageFlash?.error) {
            setFlashBanner({ type: "error", message: pageFlash.error });
        }
    }, [pageFlash?.success, pageFlash?.error]);

    useEffect(() => {
        if (!flashBanner) return;
        const timer = setTimeout(() => setFlashBanner(null), 5000);
        return () => clearTimeout(timer);
    }, [flashBanner]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return users.filter((u) => {
            const matchesSearch =
                !q ||
                u.name.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                u.role.toLowerCase().includes(q) ||
                u.loan_provider?.name.toLowerCase().includes(q);
            const matchesRole =
                roleFilter === "all" || u.role_value === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [users, search, roleFilter]);

    const submitEdit = (data: EditFormData) => {
        if (!editUser) return;
        setFormProcessing(true);
        const payload: {
            name: string;
            email: string;
            role: string;
            loan_provider_id: number | null;
            password?: string;
        } = {
            name: data.name,
            email: data.email,
            role: data.role,
            loan_provider_id: data.loan_provider_id
                ? Number(data.loan_provider_id)
                : null,
        };
        if (data.password) {
            payload.password = data.password;
        }
        router.patch(route("admin.users.update", editUser.id), payload, {
            onSuccess: () => setEditUser(null),
            onFinish: () => setFormProcessing(false),
        });
    };

    const confirmDelete = () => {
        if (!deleteUser) return;
        router.delete(route("admin.users.destroy", deleteUser.id), {
            onSuccess: () => setDeleteUser(null),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
                    User management
                </h2>
            }
        >
            <Head title="Users" />

            <div className={`min-h-full p-6 ${surfacePage}`}>
                {flashBanner && (
                    <FlashBanner
                        type={flashBanner.type}
                        message={flashBanner.message}
                        onDismiss={() => setFlashBanner(null)}
                    />
                )}

                <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Users
                        </h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-white/60">
                            Manage platform accounts, roles, and loan provider
                            assignments.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setModalOpen(true)}
                        className={`${btnPrimary} self-start shadow-sm`}
                    >
                        <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
                        Add User
                    </button>
                </header>

                <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
                    {[
                        {
                            label: "Total users",
                            value: stats.total,
                            icon: UsersIcon,
                        },
                        {
                            label: "SME owners",
                            value: stats.sme_owners,
                            icon: UsersIcon,
                        },
                        {
                            label: "Loan providers",
                            value: stats.loan_provider_users,
                            icon: UserCog,
                        },
                        {
                            label: "Super admins",
                            value: stats.super_admins,
                            icon: Shield,
                        },
                        {
                            label: "Partner institutions",
                            value: stats.partner_institutions,
                            icon: Building2,
                        },
                    ].map((card) => (
                        <div key={card.label} className={`p-4 ${surfaceCard}`}>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/10">
                                    <card.icon className="h-5 w-5 text-gray-700 dark:text-white/70" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-white/50">
                                        {card.label}
                                    </p>
                                    <p className="text-2xl font-bold tabular-nums">
                                        {card.value}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative max-w-md flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="search"
                            placeholder="Search by name, email, or institution…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-white/10 dark:bg-black dark:text-white dark:placeholder:text-white/40 dark:focus:border-white dark:focus:ring-white"
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-white/10 dark:bg-black dark:text-white dark:focus:border-white dark:focus:ring-white"
                    >
                        <option value="all">All roles</option>
                        {roleOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={`overflow-hidden ${surfaceCard}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px] text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-white/10 dark:bg-black dark:text-white/50">
                                    <th className="px-5 py-4">User</th>
                                    <th className="px-5 py-4">Role</th>
                                    <th className="px-5 py-4">Institution</th>
                                    <th className="px-5 py-4">Joined</th>
                                    <th className="px-5 py-4 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-5 py-12 text-center text-gray-500 dark:text-white/50"
                                        >
                                            No users match your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="border-b border-gray-100 transition-colors hover:bg-gray-50/80 dark:border-white/5 dark:hover:bg-white/5"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={avatarCircle}
                                                    >
                                                        {initials(user.name)}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">
                                                            {user.name}
                                                            {user.id ===
                                                                currentUserId && (
                                                                <span className="ml-2 text-xs font-normal text-gray-500 dark:text-white/50">
                                                                    (you)
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-white/50">
                                                            {user.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span
                                                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                                        roleBadgeStyles[
                                                            user.role_value
                                                        ] ??
                                                        "bg-gray-100 text-gray-800 border-gray-200"
                                                    }`}
                                                >
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-gray-600 dark:text-white/70">
                                                {user.loan_provider ? (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Building2 className="h-3.5 w-3.5 text-gray-400" />
                                                        {
                                                            user.loan_provider
                                                                .short_code
                                                        }{" "}
                                                        ·{" "}
                                                        {
                                                            user.loan_provider
                                                                .name
                                                        }
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-white/30">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-gray-600 dark:text-white/70">
                                                {user.created_at
                                                    ? new Date(
                                                          user.created_at,
                                                      ).toLocaleDateString(
                                                          "en-ET",
                                                          {
                                                              year: "numeric",
                                                              month: "short",
                                                              day: "numeric",
                                                          },
                                                      )
                                                    : "—"}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setEditUser(user)
                                                        }
                                                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-800/50 dark:bg-blue-900/30 dark:text-blue-200"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setDeleteUser(user)
                                                        }
                                                        disabled={
                                                            user.id ===
                                                            currentUserId
                                                        }
                                                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-800/50 dark:bg-red-900/30 dark:text-red-200"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="border-t border-gray-200 bg-gray-50 px-5 py-3 text-xs text-gray-500 dark:border-white/10 dark:bg-black dark:text-white/50">
                        Showing {filtered.length} of {users.length} users
                    </div>
                </div>
            </div>

            <AddUserModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                loanProviders={loanProviders}
            />

            {editUser && (
                <EditUserModal
                    show={!!editUser}
                    onClose={() => setEditUser(null)}
                    user={editUser}
                    roleOptions={roleOptions}
                    loanProviders={loanProviders}
                    processing={formProcessing}
                    onSubmit={submitEdit}
                />
            )}

            <Modal show={!!deleteUser} onClose={() => setDeleteUser(null)}>
                <div className="bg-white p-6 dark:bg-black">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Delete user?
                    </h3>
                    <p className="mt-2 text-sm text-gray-600 dark:text-white/70">
                        This will permanently remove{" "}
                        <strong>{deleteUser?.name}</strong> ({deleteUser?.email}
                        ). This action cannot be undone.
                    </p>
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setDeleteUser(null)}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={confirmDelete}
                            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
