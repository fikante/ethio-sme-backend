import Modal from '@/Components/Modal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { PageProps } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { isLoanProviderRole } from '@/lib/roles';
import {
    Building2,
    Pencil,
    Plus,
    Search,
    Shield,
    Trash2,
    UserCog,
    Users as UsersIcon,
    X,
} from 'lucide-react';
import {
    type ButtonHTMLAttributes,
    FormEvent,
    useEffect,
    useMemo,
    useState,
} from 'react';

type LoanProviderOption = {
    id: number;
    name: string;
    short_code: string;
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

const roleBadgeStyles: Record<string, string> = {
    sme_owner: 'bg-gray-100 text-gray-800 border-gray-200',
    loan_provider: 'bg-blue-50 text-blue-800 border-blue-200',
    super_admin: 'bg-amber-50 text-amber-900 border-amber-200',
};

function initials(name: string): string {
    return name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

function BlackButton({
    children,
    className = '',
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            type="button"
            className={`inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
            {...props}
        />
    );
}

function ComingSoonModal({
    show,
    onClose,
    title,
}: {
    show: boolean;
    onClose: () => void;
    title: string;
}) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className="bg-white p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                    <Building2 className="h-7 w-7 text-gray-700" />
                </div>
                <h3 className="text-lg font-semibold text-black">{title}</h3>
                <p className="mt-2 text-sm text-gray-600">Coming soon</p>
                <p className="mt-1 text-xs text-gray-500">
                    Loan provider registration will be available in a future
                    release.
                </p>
                <BlackButton className="mt-6 w-full" onClick={onClose}>
                    Close
                </BlackButton>
            </div>
        </Modal>
    );
}

type UserFormData = {
    name: string;
    email: string;
    password: string;
    role: string;
    loan_provider_id: string;
};

function UserFormModal({
    show,
    onClose,
    title,
    submitLabel,
    roleOptions,
    loanProviders,
    initial,
    onSubmit,
    processing,
}: {
    show: boolean;
    onClose: () => void;
    title: string;
    submitLabel: string;
    roleOptions: RoleOption[];
    loanProviders: LoanProviderOption[];
    initial: UserFormData;
    onSubmit: (data: UserFormData) => void;
    processing: boolean;
}) {
    const [form, setForm] = useState<UserFormData>(initial);

    useEffect(() => {
        if (show) {
            setForm(initial);
        }
        // Only reset when the modal opens, not on every parent re-render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show]);

    const showProvider =
        isLoanProviderRole(form.role);

    const handleClose = () => {
        setForm(initial);
        onClose();
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSubmit(form);
    };

    return (
        <Modal show={show} onClose={handleClose} maxWidth="lg">
            <form onSubmit={handleSubmit} className="bg-white">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <h3 className="text-lg font-semibold text-black">
                        {title}
                    </h3>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="space-y-4 px-6 py-5">
                    <div>
                        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                            Full name
                        </label>
                        <input
                            required
                            value={form.name}
                            onChange={(e) =>
                                setForm({ ...form, name: e.target.value })
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                            Email
                        </label>
                        <input
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) =>
                                setForm({ ...form, email: e.target.value })
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                            Password
                            {submitLabel === 'Save changes' && (
                                <span className="ml-1 font-normal normal-case text-gray-400">
                                    (leave blank to keep)
                                </span>
                            )}
                        </label>
                        <input
                            type="password"
                            required={submitLabel === 'Create user'}
                            minLength={8}
                            value={form.password}
                            onChange={(e) =>
                                setForm({ ...form, password: e.target.value })
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                            Role
                        </label>
                        <select
                            required
                            value={form.role}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    role: e.target.value,
                                    loan_provider_id: '',
                                })
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
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
                            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                                Loan provider
                            </label>
                            <select
                                required
                                value={form.loan_provider_id}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        loan_provider_id: e.target.value,
                                    })
                                }
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                            >
                                <option value="">Select institution</option>
                                {loanProviders.map((p) => (
                                    <option key={p.id} value={String(p.id)}>
                                        {p.name} ({p.short_code})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-50"
                    >
                        {submitLabel}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export default function Users() {
    const {
        users,
        loanProviders,
        roleOptions,
        stats,
        currentUserId,
    } = usePage<Props>().props;
    const flash = usePage().props.flash as {
        success?: string;
        error?: string;
    };

    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [createOpen, setCreateOpen] = useState(false);
    const [providerModalOpen, setProviderModalOpen] = useState(false);
    const [editUser, setEditUser] = useState<UserRow | null>(null);
    const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);

    const emptyForm: UserFormData = {
        name: '',
        email: '',
        password: '',
        role: roleOptions[0]?.value ?? 'sme_owner',
        loan_provider_id: '',
    };

    const [formProcessing, setFormProcessing] = useState(false);

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
                roleFilter === 'all' || u.role_value === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [users, search, roleFilter]);

    const toPayload = (data: UserFormData, requirePassword = false) => {
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
        if (data.password || requirePassword) {
            payload.password = data.password;
        }
        return payload;
    };

    const openEdit = (user: UserRow) => {
        setEditUser(user);
    };

    const submitCreate = (data: UserFormData) => {
        setFormProcessing(true);
        router.post(route('admin.users.store'), toPayload(data, true), {
            onSuccess: () => {
                setCreateOpen(false);
                setFormProcessing(false);
            },
            onError: () => setFormProcessing(false),
            onFinish: () => setFormProcessing(false),
        });
    };

    const submitEdit = (data: UserFormData) => {
        if (!editUser) return;
        setFormProcessing(true);
        router.patch(
            route('admin.users.update', editUser.id),
            toPayload(data, false),
            {
                onSuccess: () => {
                    setEditUser(null);
                    setFormProcessing(false);
                },
                onError: () => setFormProcessing(false),
                onFinish: () => setFormProcessing(false),
            },
        );
    };

    const confirmDelete = () => {
        if (!deleteUser) return;
        router.delete(route('admin.users.destroy', deleteUser.id), {
            onSuccess: () => setDeleteUser(null),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold tracking-tight text-black">
                    User management
                </h2>
            }
        >
            <Head title="Users" />

            <div className="min-h-full bg-white p-6 text-black">
                {flash?.success && (
                    <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                        {flash.success}
                    </p>
                )}
                {flash?.error && (
                    <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        {flash.error}
                    </p>
                )}

                <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Users
                        </h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Manage platform accounts, roles, and loan provider
                            assignments.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <BlackButton onClick={() => setProviderModalOpen(true)}>
                            <Building2 className="h-4 w-4" />
                            Create loan provider
                        </BlackButton>
                        <BlackButton onClick={() => setCreateOpen(true)}>
                            <Plus className="h-4 w-4" />
                            Add user
                        </BlackButton>
                    </div>
                </header>

                <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
                    {[
                        {
                            label: 'Total users',
                            value: stats.total,
                            icon: UsersIcon,
                        },
                        {
                            label: 'SME owners',
                            value: stats.sme_owners,
                            icon: UsersIcon,
                        },
                        {
                            label: 'Loan providers',
                            value: stats.loan_provider_users,
                            icon: UserCog,
                        },
                        {
                            label: 'Super admins',
                            value: stats.super_admins,
                            icon: Shield,
                        },
                        {
                            label: 'Partner institutions',
                            value: stats.partner_institutions,
                            icon: Building2,
                        },
                    ].map((card) => (
                        <div
                            key={card.label}
                            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                                    <card.icon className="h-5 w-5 text-gray-700" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
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
                            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-black placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    >
                        <option value="all">All roles</option>
                        {roleOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px] text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
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
                                            className="px-5 py-12 text-center text-gray-500"
                                        >
                                            No users match your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="border-b border-gray-100 transition-colors hover:bg-gray-50/80"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
                                                        {initials(user.name)}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-black">
                                                            {user.name}
                                                            {user.id ===
                                                                currentUserId && (
                                                                <span className="ml-2 text-xs font-normal text-gray-500">
                                                                    (you)
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
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
                                                        'bg-gray-100 text-gray-800 border-gray-200'
                                                    }`}
                                                >
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-gray-600">
                                                {user.loan_provider ? (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Building2 className="h-3.5 w-3.5 text-gray-400" />
                                                        {
                                                            user.loan_provider
                                                                .short_code
                                                        }{' '}
                                                        ·{' '}
                                                        {
                                                            user.loan_provider
                                                                .name
                                                        }
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-gray-600">
                                                {user.created_at
                                                    ? new Date(
                                                          user.created_at,
                                                      ).toLocaleDateString(
                                                          'en-ET',
                                                          {
                                                              year: 'numeric',
                                                              month: 'short',
                                                              day: 'numeric',
                                                          },
                                                      )
                                                    : '—'}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEdit(user)
                                                        }
                                                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                                                        title="Edit user"
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
                                                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                                                        title="Delete user"
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
                    <div className="border-t border-gray-200 bg-gray-50 px-5 py-3 text-xs text-gray-500">
                        Showing {filtered.length} of {users.length} users
                    </div>
                </div>
            </div>

            <UserFormModal
                show={createOpen}
                onClose={() => setCreateOpen(false)}
                title="Add user"
                submitLabel="Create user"
                roleOptions={roleOptions}
                loanProviders={loanProviders}
                initial={emptyForm}
                onSubmit={submitCreate}
                processing={formProcessing}
            />

            {editUser && (
                <UserFormModal
                    show={!!editUser}
                    onClose={() => setEditUser(null)}
                    title="Edit user"
                    submitLabel="Save changes"
                    roleOptions={roleOptions}
                    loanProviders={loanProviders}
                    initial={{
                        name: editUser.name,
                        email: editUser.email,
                        password: '',
                        role: editUser.role_value,
                        loan_provider_id: editUser.loan_provider_id
                            ? String(editUser.loan_provider_id)
                            : '',
                    }}
                    onSubmit={submitEdit}
                    processing={formProcessing}
                />
            )}

            <ComingSoonModal
                show={providerModalOpen}
                onClose={() => setProviderModalOpen(false)}
                title="Create loan provider"
            />

            <Modal show={!!deleteUser} onClose={() => setDeleteUser(null)}>
                <div className="bg-white p-6">
                    <h3 className="text-lg font-semibold text-black">
                        Delete user?
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">
                        This will permanently remove{' '}
                        <strong>{deleteUser?.name}</strong> (
                        {deleteUser?.email}). This action cannot be undone.
                    </p>
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setDeleteUser(null)}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-50"
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
