import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { PageProps } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Building2,
    Check,
    ChevronDown,
    Edit2,
    Plus,
    Power,
    X,
} from 'lucide-react';
import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type LoanProviderRow = {
    id: number;
    uuid: string;
    name: string;
    short_code: string;
    type: string;
    nbe_license_no: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    website: string | null;
    address: string | null;
    accepted_risk_bands: string[];
    min_loan_amount_etb: number;
    max_loan_amount_etb: number;
    base_interest_rate: number;
    logo_url: string | null;
    status: string;
    application_count: number;
    officer_count: number;
    created_at: string | null;
};

type Props = PageProps<{
    providers: LoanProviderRow[];
}>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROVIDER_TYPES: Record<string, string> = {
    commercial_bank: 'Commercial Bank',
    development_bank: 'Development Bank',
    microfinance: 'Microfinance',
    cooperative: 'Cooperative',
};

const RISK_BANDS = ['low', 'medium', 'high'];

function formatPct(value: number): string {
    return `${(value * 100).toFixed(2)}%`;
}

function formatEtb(value: number): string {
    return `ETB ${value.toLocaleString('en-ET', { maximumFractionDigits: 0 })}`;
}

// ─── Provider Form Modal ──────────────────────────────────────────────────────

type ProviderFormData = {
    name: string;
    short_code: string;
    type: string;
    nbe_license_no: string;
    contact_email: string;
    contact_phone: string;
    website: string;
    address: string;
    accepted_risk_bands: string[];
    min_loan_amount_etb: string;
    max_loan_amount_etb: string;
    base_interest_rate: string;
    logo_url: string;
    status: string;
};

function ProviderModal({
    provider,
    onClose,
}: {
    provider: LoanProviderRow | null;
    onClose: () => void;
}) {
    const isEdit = provider !== null;

    const { data, setData, post, patch, transform, processing, errors } =
        useForm<ProviderFormData>({
            name: provider?.name ?? '',
            short_code: provider?.short_code ?? '',
            type: provider?.type ?? 'commercial_bank',
            nbe_license_no: provider?.nbe_license_no ?? '',
            contact_email: provider?.contact_email ?? '',
            contact_phone: provider?.contact_phone ?? '',
            website: provider?.website ?? '',
            address: provider?.address ?? '',
            accepted_risk_bands: provider?.accepted_risk_bands ?? ['low', 'medium'],
            min_loan_amount_etb: String(provider?.min_loan_amount_etb ?? 5000),
            max_loan_amount_etb: String(provider?.max_loan_amount_etb ?? 5000000),
            base_interest_rate: String(
                provider ? (provider.base_interest_rate * 100).toFixed(2) : '15.00',
            ),
            logo_url: provider?.logo_url ?? '',
            status: provider?.status ?? 'active',
        });

    const toggleBand = (band: string) => {
        const current = data.accepted_risk_bands;
        setData(
            'accepted_risk_bands',
            current.includes(band)
                ? current.filter((b) => b !== band)
                : [...current, band],
        );
    };

    // Transform base_interest_rate from display-percent (e.g. "15.00") to decimal (0.15)
    // before the form data is sent. This is the idiomatic Inertia approach.
    transform((values) => ({
        ...values,
        base_interest_rate: String(parseFloat(values.base_interest_rate) / 100),
    }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isEdit) {
            patch(route('admin.loan-providers.update', { loanProvider: provider.id }), {
                onSuccess: onClose,
                preserveScroll: true,
            });
        } else {
            post(route('admin.loan-providers.store'), {
                onSuccess: onClose,
                preserveScroll: true,
            });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
                    <h2 className="text-base font-semibold text-gray-900">
                        {isEdit ? 'Edit Loan Provider' : 'Add Loan Provider'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto px-6 py-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        {/* Name */}
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Institution Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                                placeholder="e.g. Commercial Bank of Ethiopia"
                            />
                            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                        </div>

                        {/* Short Code */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Short Code <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.short_code}
                                onChange={(e) => setData('short_code', e.target.value.toUpperCase())}
                                maxLength={20}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                                placeholder="e.g. CBE"
                            />
                            {errors.short_code && <p className="mt-1 text-xs text-red-600">{errors.short_code}</p>}
                        </div>

                        {/* Type */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={data.type}
                                onChange={(e) => setData('type', e.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                            >
                                {Object.entries(PROVIDER_TYPES).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>

                        {/* NBE License */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">NBE License No.</label>
                            <input
                                type="text"
                                value={data.nbe_license_no}
                                onChange={(e) => setData('nbe_license_no', e.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                                placeholder="e.g. NBE/LB/001/2023"
                            />
                        </div>

                        {/* Contact Email */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">Contact Email</label>
                            <input
                                type="email"
                                value={data.contact_email}
                                onChange={(e) => setData('contact_email', e.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                            />
                        </div>

                        {/* Contact Phone */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">Contact Phone</label>
                            <input
                                type="text"
                                value={data.contact_phone}
                                onChange={(e) => setData('contact_phone', e.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                            />
                        </div>

                        {/* Website */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">Website</label>
                            <input
                                type="url"
                                value={data.website}
                                onChange={(e) => setData('website', e.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                                placeholder="https://"
                            />
                        </div>

                        {/* Logo URL */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">Logo URL</label>
                            <input
                                type="url"
                                value={data.logo_url}
                                onChange={(e) => setData('logo_url', e.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                                placeholder="https://"
                            />
                        </div>

                        {/* Min Loan */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Min Loan Amount (ETB) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={data.min_loan_amount_etb}
                                onChange={(e) => setData('min_loan_amount_etb', e.target.value)}
                                min={0}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                            />
                            {errors.min_loan_amount_etb && <p className="mt-1 text-xs text-red-600">{errors.min_loan_amount_etb}</p>}
                        </div>

                        {/* Max Loan */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Max Loan Amount (ETB) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={data.max_loan_amount_etb}
                                onChange={(e) => setData('max_loan_amount_etb', e.target.value)}
                                min={0}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                            />
                            {errors.max_loan_amount_etb && <p className="mt-1 text-xs text-red-600">{errors.max_loan_amount_etb}</p>}
                        </div>

                        {/* Base Interest Rate */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">
                                Base Interest Rate (%) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={data.base_interest_rate}
                                onChange={(e) => setData('base_interest_rate', e.target.value)}
                                step="0.01"
                                min="0"
                                max="100"
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                            />
                            {errors.base_interest_rate && <p className="mt-1 text-xs text-red-600">{errors.base_interest_rate}</p>}
                        </div>

                        {/* Status */}
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">Status</label>
                            <select
                                value={data.status}
                                onChange={(e) => setData('status', e.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </div>

                        {/* Accepted Risk Bands */}
                        <div className="sm:col-span-2">
                            <label className="mb-2 block text-xs font-medium text-gray-700">
                                Accepted Risk Bands <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-3">
                                {RISK_BANDS.map((band) => {
                                    const selected = data.accepted_risk_bands.includes(band);
                                    return (
                                        <button
                                            key={band}
                                            type="button"
                                            onClick={() => toggleBand(band)}
                                            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                                                selected
                                                    ? band === 'low'
                                                        ? 'border-green-300 bg-green-50 text-green-700'
                                                        : band === 'medium'
                                                          ? 'border-amber-300 bg-amber-50 text-amber-700'
                                                          : 'border-red-300 bg-red-50 text-red-700'
                                                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                                            }`}
                                        >
                                            {selected && <Check className="h-3.5 w-3.5" />}
                                            {band.charAt(0).toUpperCase() + band.slice(1)} Risk
                                        </button>
                                    );
                                })}
                            </div>
                            {errors.accepted_risk_bands && (
                                <p className="mt-1 text-xs text-red-600">{errors.accepted_risk_bands}</p>
                            )}
                        </div>

                        {/* Address */}
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs font-medium text-gray-700">Address</label>
                            <textarea
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                                rows={2}
                                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                            />
                        </div>
                    </div>
                </form>

                <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="provider-form"
                        disabled={processing}
                        onClick={handleSubmit}
                        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
                    >
                        {processing ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Provider'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LoanProviders() {
    const { providers } = usePage<Props>().props;
    const [modalProvider, setModalProvider] = useState<LoanProviderRow | null | undefined>(undefined);
    // undefined = closed, null = create, LoanProviderRow = edit

    const openCreate = () => setModalProvider(null);
    const openEdit = (p: LoanProviderRow) => setModalProvider(p);
    const closeModal = () => setModalProvider(undefined);

    const handleToggle = (provider: LoanProviderRow) => {
        router.post(
            route('admin.loan-providers.toggle-active', { loanProvider: provider.id }),
            {},
            { preserveScroll: true },
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-zinc-100">
                    Loan Providers
                </h2>
            }
        >
            <Head title="Loan Providers" />

            <div className="min-h-full bg-gray-50 p-6">
                {/* Page header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                            Loan Providers
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Manage lending institutions registered on the EthioSME platform.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={openCreate}
                        className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Add Provider
                    </button>
                </div>

                {/* Stats strip */}
                <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Total</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{providers.length}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Active</p>
                        <p className="mt-1 text-2xl font-bold text-green-600">
                            {providers.filter((p) => p.status === 'active').length}
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Total Applications</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">
                            {providers.reduce((s, p) => s + p.application_count, 0)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Loan Officers</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">
                            {providers.reduce((s, p) => s + p.officer_count, 0)}
                        </p>
                    </div>
                </div>

                {/* Provider cards grid */}
                {providers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
                        <Building2 className="mb-4 h-12 w-12 text-gray-300" />
                        <p className="text-sm font-medium text-gray-700">No loan providers registered</p>
                        <p className="mt-1 text-xs text-gray-400">
                            Add the first lending institution to enable the loan matching workflow.
                        </p>
                        <button
                            type="button"
                            onClick={openCreate}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                        >
                            <Plus className="h-4 w-4" />
                            Add First Provider
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                        {providers.map((provider) => (
                            <div
                                key={provider.id}
                                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                            >
                                {/* Card header */}
                                <div className="mb-4 flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        {provider.logo_url ? (
                                            <img
                                                src={provider.logo_url}
                                                alt={provider.name}
                                                className="h-10 w-10 rounded-lg object-contain"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                                                <Building2 className="h-5 w-5 text-gray-400" />
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="font-semibold text-gray-900 leading-tight">
                                                {provider.name}
                                            </h3>
                                            <p className="text-xs text-gray-400">{provider.short_code}</p>
                                        </div>
                                    </div>
                                    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                        provider.status === 'active'
                                            ? 'bg-green-100 text-green-700'
                                            : provider.status === 'suspended'
                                              ? 'bg-red-100 text-red-700'
                                              : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        {provider.status}
                                    </span>
                                </div>

                                {/* Stats row */}
                                <div className="mb-4 grid grid-cols-2 gap-3">
                                    <div className="rounded-lg bg-gray-50 p-3">
                                        <p className="text-xs text-gray-400">Applications</p>
                                        <p className="text-lg font-bold text-gray-900">{provider.application_count}</p>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 p-3">
                                        <p className="text-xs text-gray-400">Officers</p>
                                        <p className="text-lg font-bold text-gray-900">{provider.officer_count}</p>
                                    </div>
                                </div>

                                {/* Details */}
                                <dl className="mb-4 space-y-1.5 text-xs">
                                    <div className="flex justify-between text-gray-500">
                                        <dt>Type</dt>
                                        <dd className="font-medium text-gray-700">{PROVIDER_TYPES[provider.type] ?? provider.type}</dd>
                                    </div>
                                    <div className="flex justify-between text-gray-500">
                                        <dt>Loan Range</dt>
                                        <dd className="font-medium text-gray-700">
                                            {formatEtb(provider.min_loan_amount_etb)} – {formatEtb(provider.max_loan_amount_etb)}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between text-gray-500">
                                        <dt>Base Rate</dt>
                                        <dd className="font-medium text-gray-700">{formatPct(provider.base_interest_rate)}</dd>
                                    </div>
                                    <div className="flex justify-between text-gray-500">
                                        <dt>Risk Bands</dt>
                                        <dd className="flex gap-1">
                                            {provider.accepted_risk_bands.map((band) => (
                                                <span
                                                    key={band}
                                                    className={`rounded px-1.5 py-0.5 font-semibold capitalize ${
                                                        band === 'low'
                                                            ? 'bg-green-100 text-green-700'
                                                            : band === 'medium'
                                                              ? 'bg-amber-100 text-amber-700'
                                                              : 'bg-red-100 text-red-700'
                                                    }`}
                                                >
                                                    {band}
                                                </span>
                                            ))}
                                        </dd>
                                    </div>
                                    {provider.contact_email && (
                                        <div className="flex justify-between text-gray-500">
                                            <dt>Email</dt>
                                            <dd className="font-medium text-gray-700 truncate max-w-[160px]">{provider.contact_email}</dd>
                                        </div>
                                    )}
                                </dl>

                                {/* Actions */}
                                <div className="flex gap-2 border-t border-gray-100 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => openEdit(provider)}
                                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                        <Edit2 className="h-3.5 w-3.5" />
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleToggle(provider)}
                                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                            provider.status === 'active'
                                                ? 'border-red-200 text-red-600 hover:bg-red-50'
                                                : 'border-green-200 text-green-600 hover:bg-green-50'
                                        }`}
                                    >
                                        <Power className="h-3.5 w-3.5" />
                                        {provider.status === 'active' ? 'Deactivate' : 'Activate'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {modalProvider !== undefined && (
                <ProviderModal provider={modalProvider} onClose={closeModal} />
            )}
        </AuthenticatedLayout>
    );
}
