import ApplicationJourneyPanel from '@/Components/Sme/ApplicationJourneyPanel';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { buildSmeJourneySteps } from '@/lib/smeJourneySteps';
import type { PageProps } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Check, ChevronRight, X } from 'lucide-react';
import { FormEventHandler } from 'react';

type ExistingApplication = {
    id: number;
    status: string;
    requested_amount: string | number;
    tenure_months: number;
    npv_credit_limit: string | number | null;
    apr: string | number | null;
    ai_risk_band: string | null;
    created_at: string;
};

type Props = PageProps<{
    business: { id: number; name: string; sector: string } | null;
    heartbeatDays: number;
    canApply: boolean;
    prerequisites: { heartbeatReady: boolean; psychometricReady: boolean };
    checklist: {
        businessRegistered: boolean;
        heartbeatLoaded: boolean;
        assessmentCompleted: boolean;
        applicationSubmitted: boolean;
        aiEvaluated: boolean;
        decisionReceived: boolean;
    };
    existingApplication: ExistingApplication | null;
}>;

const cardClass =
    'rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900';
const mutedClass = 'text-gray-500 dark:text-zinc-400';

const etbFormatter = new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 });

function formatEtb(amount: string | number | null | undefined): string {
    if (amount === null || amount === undefined || amount === '') return '—';
    const n = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (Number.isNaN(n)) return '—';
    return `${etbFormatter.format(n)} ETB`;
}

export default function LoanApplication() {
    const {
        business,
        heartbeatDays,
        canApply,
        prerequisites,
        checklist,
        existingApplication,
    } = usePage<Props>().props;

    const flash = usePage().props.flash as { success?: string; error?: string };
    const steps = buildSmeJourneySteps(checklist, {
        businessName: business?.name,
        heartbeatDays,
    });

    const { data, setData, post, processing, errors, reset } = useForm({
        requested_amount: '',
        requested_tenure_months: '12',
        purpose: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('loan-application.store'), {
            onSuccess: () => reset(),
        });
    };

    const showResults =
        existingApplication &&
        ['evaluated', 'approved', 'rejected'].includes(existingApplication.status);

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-900 dark:text-zinc-100">
                    Loan Application
                </h2>
            }
        >
            <Head title="Loan Application" />

            <div className="min-h-full bg-gray-50 py-6 text-gray-900 dark:bg-zinc-950 dark:text-zinc-100">
                <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row lg:items-start">
                    <ApplicationJourneyPanel
                        steps={steps}
                        className="hidden lg:block"
                    />

                    <div className="min-w-0 flex-1 space-y-6">
                        {flash?.success && (
                            <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
                                {flash.success}
                            </p>
                        )}
                        {flash?.error && (
                            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                                {flash.error}
                            </p>
                        )}

                        {business && (
                            <div className={`${cardClass} lg:hidden`}>
                                <ApplicationJourneyPanel steps={steps} />
                            </div>
                        )}

                        {!business ? (
                            <div className={cardClass}>
                                <p className="text-sm font-medium">No business profile found</p>
                                <p className={`mt-1 text-sm ${mutedClass}`}>
                                    Contact support to link your SME business before applying.
                                </p>
                            </div>
                        ) : existingApplication ? (
                            <div className={cardClass}>
                                <h3 className="text-base font-semibold">Your application</h3>
                                <p className={`mt-1 text-sm capitalize ${mutedClass}`}>
                                    Status: {existingApplication.status.replace(/_/g, ' ')}
                                </p>
                                <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <dt className={`text-xs ${mutedClass}`}>Requested</dt>
                                        <dd className="mt-1 text-lg font-semibold">
                                            {formatEtb(existingApplication.requested_amount)}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className={`text-xs ${mutedClass}`}>Tenure</dt>
                                        <dd className="mt-1 text-lg font-semibold">
                                            {existingApplication.tenure_months} months
                                        </dd>
                                    </div>
                                    {showResults && (
                                        <div>
                                            <dt className={`text-xs ${mutedClass}`}>NPV limit</dt>
                                            <dd className="mt-1 text-lg font-semibold">
                                                {formatEtb(existingApplication.npv_credit_limit)}
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                                <Link
                                    href={route('sme.valuation')}
                                    className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-gray-900 hover:underline dark:text-white"
                                >
                                    View full valuation
                                    <ChevronRight className="h-4 w-4" />
                                </Link>
                            </div>
                        ) : (
                            <div className={cardClass}>
                                <h3 className="text-base font-semibold">Submit your loan request</h3>
                                <p className={`mt-1 text-sm ${mutedClass}`}>
                                    Enter the amount and duration you need. We will queue your
                                    application for AI evaluation.
                                </p>

                                <ul className="mt-6 space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800/50">
                                    <PrerequisiteRow
                                        ok={prerequisites.heartbeatReady}
                                        label="Transaction data loaded (45+ days)"
                                        href={route('integrations')}
                                    />
                                    <PrerequisiteRow
                                        ok={prerequisites.psychometricReady}
                                        label="Psychometric assessment completed"
                                        href={route('psychometrics')}
                                    />
                                </ul>

                                <form onSubmit={submit} className="mt-6 space-y-5">
                                    <div>
                                        <InputLabel
                                            htmlFor="requested_amount"
                                            value="Requested loan amount (ETB)"
                                        />
                                        <TextInput
                                            id="requested_amount"
                                            type="number"
                                            min={10000}
                                            max={5000000}
                                            className="mt-1 block w-full"
                                            value={data.requested_amount}
                                            onChange={(e) =>
                                                setData('requested_amount', e.target.value)
                                            }
                                            required
                                            disabled={!canApply || processing}
                                        />
                                        <InputError
                                            message={errors.requested_amount}
                                            className="mt-1"
                                        />
                                    </div>

                                    <div>
                                        <InputLabel
                                            htmlFor="requested_tenure_months"
                                            value="Loan duration"
                                        />
                                        <select
                                            id="requested_tenure_months"
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500/30 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                                            value={data.requested_tenure_months}
                                            onChange={(e) =>
                                                setData(
                                                    'requested_tenure_months',
                                                    e.target.value,
                                                )
                                            }
                                            required
                                            disabled={!canApply || processing}
                                        >
                                            <option value="6">6 months</option>
                                            <option value="12">12 months</option>
                                            <option value="18">18 months</option>
                                            <option value="24">24 months</option>
                                        </select>
                                        <InputError
                                            message={errors.requested_tenure_months}
                                            className="mt-1"
                                        />
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="purpose" value="Purpose of loan" />
                                        <textarea
                                            id="purpose"
                                            rows={4}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500/30 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                                            value={data.purpose}
                                            onChange={(e) => setData('purpose', e.target.value)}
                                            required
                                            disabled={!canApply || processing}
                                        />
                                        <InputError message={errors.purpose} className="mt-1" />
                                    </div>

                                    <PrimaryButton
                                        type="submit"
                                        disabled={!canApply || processing}
                                    >
                                        Submit application for AI evaluation
                                    </PrimaryButton>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function PrerequisiteRow({
    ok,
    label,
    href,
}: {
    ok: boolean;
    label: string;
    href: string;
}) {
    return (
        <li className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
                <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${
                        ok
                            ? 'bg-green-600 text-white'
                            : 'border border-gray-300 dark:border-zinc-600'
                    }`}
                >
                    {ok ? (
                        <Check className="h-3 w-3" strokeWidth={3} />
                    ) : (
                        <X className="h-3 w-3 text-gray-400" />
                    )}
                </span>
                <span className={ok ? '' : mutedClass}>{label}</span>
            </span>
            {!ok && (
                <Link
                    href={href}
                    className="text-xs font-medium text-gray-900 hover:underline dark:text-white"
                >
                    Complete →
                </Link>
            )}
        </li>
    );
}
