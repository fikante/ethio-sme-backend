import { Link, router } from '@inertiajs/react';
import { isPsychometricComplete } from '@/lib/psychometricCompletion';
import {
    Brain,
    Check,
    CheckCircle,
    FileUp,
    Loader2,
    Send,
    Shield,
    X,
} from 'lucide-react';
import {
    ChangeEvent,
    DragEvent,
    ReactNode,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

const SECTORS = [
    { code: '5411', label: 'Grocery', icon: '🛒' },
    { code: '5812', label: 'Cafe', icon: '☕' },
    { code: '5912', label: 'Pharmacy', icon: '💊' },
    { code: '5732', label: 'Electronics', icon: '📱' },
    { code: '5651', label: 'Apparel', icon: '👕' },
] as const;

const SUB_CITIES = [
    'Addis Ketema', 'Akaki Kaliti', 'Arada', 'Bole', 'Gullele',
    'Kirkos', 'Kolfe Keranio', 'Lideta', 'Nifas Silk-Lafto', 'Yeka',
] as const;

const TENURE_OPTIONS = [6, 12, 18, 24] as const;
const STEP_LABELS = ['Personal', 'Business', 'Psych', 'Submit'];

const etbFormatter = new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 });

function formatEtb(amount: number): string {
    return `ETB ${etbFormatter.format(amount)}`;
}

function getInitials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

type FormState = {
    fullName: string;
    phone: string;
    businessName: string;
    sector: string;
    subCity: string;
    establishedYear: string;
    psychometricDone: boolean;
    transactionFile: File | null;
    requestedAmount: number;
    tenureMonths: number;
    purpose: string;
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    userName: string;
    businessUuid?: string | null;
    initialSuccess?: boolean;
};

export default function ApplyModal({ isOpen, onClose, userName, businessUuid = null, initialSuccess = false }: Props) {
    const [visible, setVisible] = useState(false);
    const [animating, setAnimating] = useState(false);
    const [step, setStep] = useState<number | 'success'>(1);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [data, setData] = useState<FormState>({
        fullName: userName,
        phone: '',
        businessName: '',
        sector: '',
        subCity: '',
        establishedYear: String(new Date().getFullYear() - 3),
        psychometricDone: false,
        transactionFile: null,
        requestedAmount: 100_000,
        tenureMonths: 12,
        purpose: '',
    });

    const numericStep = step === 'success' ? 4 : step;
    const progressWidth = `${((numericStep - 1) / 3) * 100}%`;

    useEffect(() => {
        if (isOpen) {
            setVisible(true);
            setStep(initialSuccess ? 'success' : 1);
            setData((prev) => ({ ...prev, fullName: userName }));
            requestAnimationFrame(() => setAnimating(true));
        } else {
            setAnimating(false);
            const timer = setTimeout(() => setVisible(false), 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen, userName, initialSuccess]);

    const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
        setData((prev) => ({ ...prev, [key]: value }));
    }, []);

    const validateStep1 = () => {
        const next: Record<string, string> = {};
        if (!data.fullName.trim()) next.fullName = 'Full name is required.';
        if (!data.phone.trim()) next.phone = 'Phone number is required.';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const validateStep2 = () => {
        const next: Record<string, string> = {};
        if (!data.businessName.trim()) next.businessName = 'Business name is required.';
        if (!data.sector) next.sector = 'Select a sector.';
        if (!data.subCity) next.subCity = 'Select a sub-city.';
        if (!data.establishedYear) next.establishedYear = 'Year is required.';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleFile = (file: File | null) => {
        if (!file) { update('transactionFile', null); return; }
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        if (!['csv', 'xlsx', 'xls'].includes(ext)) {
            setErrors({ transaction_file: 'Accepted formats: .csv, .xlsx, .xls' });
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setErrors({ transaction_file: 'File must be under 10MB.' });
            return;
        }
        setErrors({});
        update('transactionFile', file);
    };

    const handleFinalSubmit = () => {
        const next: Record<string, string> = {};
        if (!data.purpose.trim()) next.purpose = 'Purpose is required.';
        setErrors(next);
        if (Object.keys(next).length > 0) return;

        setSubmitting(true);
        const formData = new FormData();
        formData.append('full_name', data.fullName);
        formData.append('phone', data.phone);
        formData.append('business_name', data.businessName);
        formData.append('sector', data.sector);
        formData.append('sub_city', data.subCity);
        formData.append('established_year', data.establishedYear);
        formData.append('requested_amount', String(data.requestedAmount));
        formData.append('tenure_months', String(data.tenureMonths));
        formData.append('purpose', data.purpose);
        if (data.transactionFile) formData.append('transaction_file', data.transactionFile);

        router.post(route('loan-application.submit'), formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => setStep('success'),
            onError: (errs) => {
                const mapped: Record<string, string> = {};
                Object.entries(errs).forEach(([k, v]) => {
                    mapped[k] = Array.isArray(v) ? v[0] : String(v);
                });
                setErrors(mapped);
            },
            onFinish: () => setSubmitting(false),
        });
    };

    if (!visible) return null;

    const inputClass =
        'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 ' +
        'placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-0 ' +
        'dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-300';
    const labelClass =
        'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400';
    const ghostBtn =
        'rounded-xl border border-transparent px-5 py-2.5 text-sm font-medium text-gray-600 ' +
        'transition hover:border-gray-300 hover:text-gray-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100';
    const primaryBtn =
        'inline-flex items-center gap-2 rounded-xl border border-gray-900 bg-gray-900 px-6 py-2.5 ' +
        'text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60 ' +
        'dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200';

    return (
        <>
            <div
                className={`fixed inset-0 z-50 flex justify-center overflow-y-auto p-4 transition-opacity duration-150 ${animating ? 'opacity-100' : 'opacity-0'}`}
            >
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                    onClick={onClose}
                    aria-hidden
                />
                <div
                    className={`relative z-10 mt-20 w-full max-w-xl transition-all duration-[250ms] ease-out ${animating ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}
                >
                    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white text-gray-900 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                        {step !== 'success' && (
                            <>
                                <StepIndicator current={numericStep} />
                                <div className="h-px bg-gray-200 dark:bg-zinc-700">
                                    <div
                                        className="h-full bg-gray-900 transition-all dark:bg-zinc-100 duration-500 ease-out"
                                        style={{ width: progressWidth }}
                                    />
                                </div>
                            </>
                        )}
                        <div className="px-6 pb-6 pt-5">
                            {step === 'success' ? (
                                <SuccessView onClose={onClose} />
                            ) : (
                                <>
                                    <div className="mb-4 flex items-center justify-between">
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100">
                                            {step === 1 && 'Personal Information'}
                                            {step === 2 && 'Business Details'}
                                            {step === 3 && 'Psychometric Assessment'}
                                            {step === 4 && 'Submit Application'}
                                        </h2>
                                        <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 transition hover:text-gray-900 dark:text-zinc-500 dark:hover:text-zinc-100"><X className="h-5 w-5" /></button>
                                    </div>
                                    {step === 1 && <Step1 data={data} errors={errors} inputClass={inputClass} labelClass={labelClass} ghostBtn={ghostBtn} primaryBtn={primaryBtn} onChange={update} onNext={() => validateStep1() && setStep(2)} onCancel={onClose} />}
                                    {step === 2 && <Step2 data={data} errors={errors} inputClass={inputClass} labelClass={labelClass} ghostBtn={ghostBtn} primaryBtn={primaryBtn} onChange={update} onBack={() => setStep(1)} onNext={() => validateStep2() && setStep(3)} />}
                                    {step === 3 && <Step3 data={data} businessUuid={businessUuid} ghostBtn={ghostBtn} primaryBtn={primaryBtn} onChange={update} onBack={() => setStep(2)} onNext={() => setStep(4)} />}
                                    {step === 4 && (
                                        <Step4
                                            data={data} errors={errors} submitting={submitting} dragOver={dragOver}
                                            fileInputRef={fileInputRef} inputClass={inputClass} labelClass={labelClass}
                                            ghostBtn={ghostBtn} onChange={update} onBack={() => setStep(3)}
                                            onSubmit={handleFinalSubmit}
                                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                            onDragLeave={() => setDragOver(false)}
                                            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0] ?? null); }}
                                            onFileInput={(e) => handleFile(e.target.files?.[0] ?? null)}
                                            onRemoveFile={() => handleFile(null)}
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes checkBounce { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
                .check-bounce { animation: checkBounce 600ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
                input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #171717; cursor: pointer; border: 2px solid #ffffff; }
                input[type=range]::-webkit-slider-runnable-track { height: 6px; border-radius: 9999px; background: #e5e7eb; }
                input[type=range]::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: #171717; cursor: pointer; border: 2px solid #ffffff; }
                input[type=range]::-moz-range-track { height: 6px; border-radius: 9999px; background: #e5e7eb; }
                .dark input[type=range]::-webkit-slider-thumb { background: #f4f4f5; border-color: #18181b; }
                .dark input[type=range]::-webkit-slider-runnable-track { background: #3f3f46; }
                .dark input[type=range]::-moz-range-thumb { background: #f4f4f5; border-color: #18181b; }
                .dark input[type=range]::-moz-range-track { background: #3f3f46; }
            `}</style>
        </>
    );
}

function StepIndicator({ current }: { current: number }) {
    return (
        <div className="px-6 py-5">
            <div className="flex items-center justify-between">
                {STEP_LABELS.map((label, i) => {
                    const n = i + 1;
                    const done = n < current;
                    const active = n === current;
                    return (
                        <div key={label} className="flex flex-1 flex-col items-center">
                            <div className="flex w-full items-center">
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done ? 'border border-gray-900 bg-gray-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900' : active ? 'border-2 border-gray-900 bg-white text-gray-900 dark:border-zinc-100 dark:bg-zinc-900 dark:text-zinc-100' : 'border border-gray-300 bg-white text-gray-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-500'}`}>
                                    {done ? <Check className="h-4 w-4" /> : n}
                                </div>
                                {n < 4 && <div className={`mx-1 h-px flex-1 ${n < current ? 'bg-gray-900 dark:bg-zinc-100' : 'bg-gray-200 dark:bg-zinc-700'}`} />}
                            </div>
                            <span className={`mt-2 text-[10px] uppercase tracking-wider ${active ? 'font-semibold text-gray-900 dark:text-zinc-100' : 'text-gray-400 dark:text-zinc-500'}`}>{label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function StepActions({ left, right }: { left: ReactNode; right: ReactNode }) {
    return <div className="mt-6 flex items-center justify-between">{left}{right}</div>;
}

function Step1({ data, errors, inputClass, labelClass, ghostBtn, primaryBtn, onChange, onNext, onCancel }: {
    data: FormState; errors: Record<string, string>; inputClass: string; labelClass: string;
    ghostBtn: string; primaryBtn: string;
    onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
    onNext: () => void; onCancel: () => void;
}) {
    return (
        <div className="space-y-4">
            <div className="flex justify-center py-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-xl font-bold text-gray-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100">{getInitials(data.fullName)}</div>
            </div>
            <div>
                <label className={labelClass} htmlFor="fullName">Full Name</label>
                <input id="fullName" className={inputClass} value={data.fullName} onChange={(e) => onChange('fullName', e.target.value)} />
                {errors.fullName && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.fullName}</p>}
            </div>
            <div>
                <label className={labelClass} htmlFor="phone">Phone Number</label>
                <input id="phone" className={inputClass} placeholder="+251 9XX XXX XXX" value={data.phone} onChange={(e) => onChange('phone', e.target.value)} />
                {errors.phone && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.phone}</p>}
            </div>
            <StepActions left={<button type="button" onClick={onCancel} className={ghostBtn}>Cancel</button>} right={<button type="button" onClick={onNext} className={primaryBtn}>Continue →</button>} />
        </div>
    );
}

function Step2({ data, errors, inputClass, labelClass, ghostBtn, primaryBtn, onChange, onBack, onNext }: {
    data: FormState; errors: Record<string, string>; inputClass: string; labelClass: string;
    ghostBtn: string; primaryBtn: string;
    onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
    onBack: () => void; onNext: () => void;
}) {
    return (
        <div className="space-y-4">
            <div>
                <label className={labelClass} htmlFor="businessName">Business Name</label>
                <input id="businessName" className={inputClass} value={data.businessName} onChange={(e) => onChange('businessName', e.target.value)} />
                {errors.businessName && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.businessName}</p>}
            </div>
            <div>
                <span className={labelClass}>Sector</span>
                {errors.sector && <p className="text-xs text-red-600 dark:text-red-400">{errors.sector}</p>}
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {SECTORS.map((s) => (
                        <button key={s.code} type="button" onClick={() => onChange('sector', s.code)}
                            className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-medium transition-all ${data.sector === s.code ? 'border-gray-900 bg-gray-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-300'}`}>
                            <span className="text-xl">{s.icon}</span>{s.label}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <label className={labelClass} htmlFor="subCity">Sub-city</label>
                <select id="subCity" className={inputClass} value={data.subCity} onChange={(e) => onChange('subCity', e.target.value)}>
                    <option value="">Select sub-city</option>
                    {SUB_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.subCity && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.subCity}</p>}
            </div>
            <div>
                <label className={labelClass} htmlFor="year">Year Established</label>
                <input id="year" type="number" min={1990} max={new Date().getFullYear()} className={inputClass} value={data.establishedYear} onChange={(e) => onChange('establishedYear', e.target.value)} />
                {errors.establishedYear && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.establishedYear}</p>}
            </div>
            <StepActions left={<button type="button" onClick={onBack} className={ghostBtn}>Back</button>} right={<button type="button" onClick={onNext} className={primaryBtn}>Continue →</button>} />
        </div>
    );
}

function Step3({ data, businessUuid, ghostBtn, primaryBtn, onChange, onBack, onNext }: {
    data: FormState; businessUuid: string | null; ghostBtn: string; primaryBtn: string;
    onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
    onBack: () => void; onNext: () => void;
}) {
    const [opening, setOpening] = useState(false);
    const [openError, setOpenError] = useState<string | null>(null);

    useEffect(() => {
        const syncCompletion = () => {
            if (businessUuid && isPsychometricComplete(businessUuid)) {
                onChange('psychometricDone', true);
            }
        };

        syncCompletion();

        const onStorage = (event: StorageEvent) => {
            if (event.key?.startsWith('psychometric-completed:')) {
                syncCompletion();
            }
        };

        window.addEventListener('storage', onStorage);
        window.addEventListener('psychometric-completed', syncCompletion);
        const intervalId = window.setInterval(syncCompletion, 1500);

        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('psychometric-completed', syncCompletion);
            window.clearInterval(intervalId);
        };
    }, [businessUuid, onChange]);

    const openPsychometricTest = async () => {
        setOpening(true);
        setOpenError(null);

        try {
            let token = businessUuid;

            if (!token) {
                const response = await fetch(route('loan-application.ensure-business'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-CSRF-TOKEN':
                            document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
                    },
                    body: JSON.stringify({
                        business_name: data.businessName || undefined,
                        sector: data.sector || undefined,
                        sub_city: data.subCity || undefined,
                        established_year: data.establishedYear
                            ? Number(data.establishedYear)
                            : undefined,
                    }),
                });

                if (!response.ok) {
                    throw new Error('Could not prepare your business profile.');
                }

                const payload = (await response.json()) as { businessUuid?: string };
                token = payload.businessUuid ?? null;
            }

            if (!token) {
                throw new Error('Missing business access token. Refresh the page and try again.');
            }

            window.open(
                `${route('psychometric.test')}?token=${encodeURIComponent(token)}`,
                '_blank',
            );
        } catch (error) {
            setOpenError(
                error instanceof Error
                    ? error.message
                    : 'Could not open the psychometric test.',
            );
        } finally {
            setOpening(false);
        }
    };

    return (
        <div className="space-y-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-gray-50 dark:border-zinc-600 dark:bg-zinc-800">
                <Shield className="h-8 w-8 text-gray-900 dark:text-zinc-100" />
            </div>
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Creditworthiness Assessment</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500 dark:text-zinc-400">This test evaluates your integrity, conscientiousness, and risk tolerance. It takes about 3 minutes.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
                {['🤝 Integrity', '📊 Conscientiousness', '⚖️ Risk Tolerance'].map((pill) => (
                    <span key={pill} className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 dark:border-zinc-600 dark:text-zinc-400">{pill}</span>
                ))}
            </div>
            <button type="button" onClick={() => void openPsychometricTest()} disabled={opening} className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-900 bg-gray-900 py-4 text-sm font-semibold text-white hover:bg-gray-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-60">
                {opening ? <Loader2 className="h-5 w-5 animate-spin" /> : <Brain className="h-5 w-5" />}
                {opening ? 'Opening test…' : 'Take Psychometric Test'}
            </button>
            {openError && <p className="text-xs text-gray-500 dark:text-zinc-400">{openError}</p>}
            {!data.psychometricDone && (
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Finish the psychometric test in the opened tab to continue.
                </p>
            )}
            <StepActions left={<button type="button" onClick={onBack} className={ghostBtn}>Back</button>} right={<button type="button" onClick={onNext} disabled={!data.psychometricDone} className={`${primaryBtn} disabled:cursor-not-allowed disabled:opacity-50`}>Continue →</button>} />
        </div>
    );
}

function Step4({ data, errors, submitting, dragOver, fileInputRef, inputClass, labelClass, ghostBtn, onChange, onBack, onSubmit, onDragOver, onDragLeave, onDrop, onFileInput, onRemoveFile }: {
    data: FormState; errors: Record<string, string>; submitting: boolean; dragOver: boolean;
    fileInputRef: React.RefObject<HTMLInputElement>; inputClass: string; labelClass: string; ghostBtn: string;
    onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
    onBack: () => void; onSubmit: () => void;
    onDragOver: (e: DragEvent) => void; onDragLeave: () => void; onDrop: (e: DragEvent) => void;
    onFileInput: (e: ChangeEvent<HTMLInputElement>) => void; onRemoveFile: () => void;
}) {
    const min = 10_000, max = 5_000_000;
    const clamp = (n: number) => Math.min(max, Math.max(min, n));
    return (
        <div className="space-y-5">
            <div>
                <span className={labelClass}>Upload your CBE transaction history (CSV or Excel)</span>
                <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onClick={() => fileInputRef.current?.click()}
                    className={`mt-2 cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${dragOver ? 'border-gray-900 bg-gray-50 dark:border-zinc-300 dark:bg-zinc-800' : 'border-gray-300 bg-gray-50 dark:border-zinc-600 dark:bg-zinc-900'}`}>
                    <FileUp className="mx-auto h-8 w-8 text-gray-900 dark:text-zinc-100/60" />
                    <p className="mt-3 text-sm font-medium text-gray-900 dark:text-zinc-100">Drag & drop your file here</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">or click to browse</p>
                    <p className="mt-2 text-xs text-gray-500 dark:text-zinc-400">Accepted: .csv, .xlsx — Max 10MB</p>
                    <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFileInput} />
                </div>
                {data.transactionFile && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-900 dark:text-zinc-100">
                        <Check className="h-4 w-4" />
                        <span>{data.transactionFile.name} ({(data.transactionFile.size / 1024).toFixed(1)} KB)</span>
                        <button type="button" onClick={onRemoveFile} className="text-xs text-gray-500 underline dark:text-zinc-400">Remove</button>
                    </div>
                )}
                {errors.transaction_file && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.transaction_file}</p>}
            </div>
            <div>
                <span className={labelClass}>How much do you need? (ETB)</span>
                <p className="my-2 text-center text-3xl font-bold tabular-nums text-gray-900 dark:text-zinc-100">{formatEtb(data.requestedAmount)}</p>
                <input type="range" min={min} max={max} step={5000} value={data.requestedAmount} onChange={(e) => onChange('requestedAmount', clamp(Number(e.target.value)))} className="w-full cursor-pointer" />
            </div>
            <div>
                <span className={labelClass}>Repayment Period</span>
                <div className="mt-2 grid grid-cols-4 gap-2">
                    {TENURE_OPTIONS.map((months) => (
                        <button key={months} type="button" onClick={() => onChange('tenureMonths', months)}
                            className={`rounded-xl border py-3 text-xs font-semibold sm:text-sm ${data.tenureMonths === months ? 'border-gray-900 bg-gray-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-300'}`}>
                            {months} mo
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <label className={labelClass} htmlFor="purpose">Purpose of Loan</label>
                <textarea id="purpose" rows={3} maxLength={500} className={inputClass} placeholder="e.g., Purchase additional inventory for the upcoming holiday season" value={data.purpose} onChange={(e) => onChange('purpose', e.target.value)} />
                <p className="mt-1 text-right text-xs text-gray-500 dark:text-zinc-400">{data.purpose.length} / 500</p>
                {errors.purpose && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.purpose}</p>}
            </div>
            <button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-900 bg-gray-900 py-5 text-base font-semibold text-white hover:bg-gray-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-60"
            >
                {submitting ? <><Loader2 className="h-5 w-5 animate-spin" />Submitting...</> : <>Submit Application for AI Evaluation<Send className="h-5 w-5" /></>}
            </button>
            <StepActions left={<button type="button" onClick={onBack} className={ghostBtn}>Back</button>} right={null} />
        </div>
    );
}

function SuccessView({ onClose }: { onClose: () => void }) {
    const steps = [{ label: 'Submitted', done: true }, { label: 'AI Processing', done: false }, { label: 'Officer Review', done: false }, { label: 'Decision', done: false }];
    return (
        <div className="py-6 text-center">
            <div className="check-bounce mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-gray-200 bg-gray-50 dark:border-zinc-600 dark:bg-zinc-800">
                <CheckCircle className="h-10 w-10 text-gray-900 dark:text-zinc-100" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-zinc-100">Application Submitted!</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500 dark:text-zinc-400">Your application is queued for AI evaluation. The loan officer will review your results shortly.</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs">
                {steps.map((s, i) => (
                    <div key={s.label} className="flex items-center gap-2">
                        <span className={s.done ? 'font-semibold text-gray-900 dark:text-zinc-100' : 'text-gray-400 dark:text-zinc-500'}>{s.done ? '✓' : '○'} {s.label}</span>
                        {i < steps.length - 1 && <span className="text-gray-300 dark:text-zinc-600">────</span>}
                    </div>
                ))}
            </div>
            <div className="mt-8 flex flex-col items-center gap-3">
                <button type="button" onClick={onClose} className="rounded-xl border border-gray-900 bg-gray-900 px-8 py-3 text-sm font-semibold text-white hover:bg-gray-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">Close</button>
                <Link href={route('sme.valuation')} className="text-sm font-medium text-gray-900 hover:underline dark:text-zinc-100">View Status →</Link>
            </div>
        </div>
    );
}
