import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import PublicPageChrome from '@/Components/PublicPageChrome';
import TextInput from '@/Components/TextInput';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';

const labelClass = 'text-gray-600 dark:text-zinc-300';
const inputClass =
    'mt-2 block w-full border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:ring-gray-500/30 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/30';
const mutedClass = 'text-gray-500 dark:text-zinc-400';
const linkClass =
    'font-semibold text-gray-900 underline-offset-4 hover:underline dark:text-white';

export default function Register() {
    const [submitting, setSubmitting] = useState(false);
    const { data, setData, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const pageErrors = (usePage().props.errors ?? {}) as Record<string, string>;
    const fieldErrors = { ...pageErrors, ...errors };

    /** Sync browser/password-manager autofill into React state (Chrome often skips onChange). */
    const syncAutofillFromDom = () => {
        const passwordEl = document.getElementById('password') as HTMLInputElement | null;
        const confirmEl = document.getElementById(
            'password_confirmation',
        ) as HTMLInputElement | null;

        if (passwordEl?.value && passwordEl.value !== data.password) {
            setData('password', passwordEl.value);
        }
        if (confirmEl?.value && confirmEl.value !== data.password_confirmation) {
            setData('password_confirmation', confirmEl.value);
        }
    };

    useEffect(() => {
        const timers = [100, 300, 600].map((ms) => window.setTimeout(syncAutofillFromDom, ms));
        const onAnimation = (event: AnimationEvent) => {
            if (event.animationName === 'onAutoFillStart') {
                syncAutofillFromDom();
            }
        };
        document.addEventListener('animationstart', onAnimation);

        return () => {
            timers.forEach((id) => window.clearTimeout(id));
            document.removeEventListener('animationstart', onAnimation);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- run on mount for autofill detection
    }, []);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const form = e.currentTarget as HTMLFormElement;
        const formData = new FormData(form);

        const payload = {
            name: String(formData.get('name') ?? data.name).trim(),
            email: String(formData.get('email') ?? data.email).trim(),
            password: String(formData.get('password') ?? data.password),
            password_confirmation: String(
                formData.get('password_confirmation') ?? data.password_confirmation,
            ),
        };

        setData(payload);

        router.post(route('register'), payload, {
            onStart: () => setSubmitting(true),
            onFinish: () => {
                setSubmitting(false);
                reset('password', 'password_confirmation');
            },
        });
    };

    return (
        <>
            <Head title="Register" />

            <PublicPageChrome>
                <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
                    <div className="my-10 w-full max-w-md">
                        <div className="mb-6 text-center">
                            <div className="inline-flex items-center justify-center rounded-2xl bg-gray-100 p-3 ring-1 ring-inset ring-gray-200 dark:bg-zinc-800 dark:ring-zinc-700">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-6 w-6 text-gray-700 dark:text-zinc-200"
                                    aria-hidden="true"
                                >
                                    <path d="M12 2v4" />
                                    <path d="M7 6h10" />
                                    <path d="M6 10h12" />
                                    <path d="M6 14h12" />
                                    <path d="M7 18h10" />
                                    <path d="M12 18v4" />
                                </svg>
                            </div>

                            <h1 className="mt-5 text-balance text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                                Create your account
                            </h1>
                            <p className={`mt-2 text-sm ${mutedClass}`}>
                                Start a thesis‑grade valuation profile in minutes.
                            </p>
                        </div>

                        <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
                            <form onSubmit={submit} autoComplete="on">
                                <div>
                                    <InputLabel
                                        htmlFor="name"
                                        value="Name"
                                        className={labelClass}
                                    />

                                    <TextInput
                                        id="name"
                                        name="name"
                                        value={data.name}
                                        className={inputClass}
                                        autoComplete="name"
                                        isFocused={true}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="Your name"
                                        required
                                    />

                                    <InputError
                                        message={fieldErrors.name}
                                        className="mt-2 text-red-600 dark:text-red-300"
                                    />
                                </div>

                                <div className="mt-4">
                                    <InputLabel
                                        htmlFor="email"
                                        value="Email"
                                        className={labelClass}
                                    />

                                    <TextInput
                                        id="email"
                                        type="email"
                                        name="email"
                                        value={data.email}
                                        className={inputClass}
                                        autoComplete="username"
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="you@bank.com"
                                        required
                                    />

                                    <InputError
                                        message={fieldErrors.email}
                                        className="mt-2 text-red-600 dark:text-red-300"
                                    />
                                </div>

                                <div className="mt-4">
                                    <InputLabel
                                        htmlFor="password"
                                        value="Password"
                                        className={labelClass}
                                    />

                                    <TextInput
                                        id="password"
                                        type="password"
                                        name="password"
                                        value={data.password}
                                        className={inputClass}
                                        autoComplete="new-password"
                                        onChange={(e) => setData('password', e.target.value)}
                                        onInput={(e) =>
                                            setData('password', e.currentTarget.value)
                                        }
                                        placeholder="At least 8 characters"
                                        required
                                        minLength={8}
                                    />

                                    <InputError
                                        message={fieldErrors.password}
                                        className="mt-2 text-red-600 dark:text-red-400"
                                    />
                                </div>

                                <div className="mt-4">
                                    <InputLabel
                                        htmlFor="password_confirmation"
                                        value="Confirm Password"
                                        className={labelClass}
                                    />

                                    <TextInput
                                        id="password_confirmation"
                                        type="password"
                                        name="password_confirmation"
                                        value={data.password_confirmation}
                                        className={inputClass}
                                        autoComplete="off"
                                        onChange={(e) =>
                                            setData('password_confirmation', e.target.value)
                                        }
                                        onInput={(e) =>
                                            setData(
                                                'password_confirmation',
                                                e.currentTarget.value,
                                            )
                                        }
                                        placeholder="Repeat your password"
                                        required
                                        minLength={8}
                                    />

                                    <InputError
                                        message={fieldErrors.password_confirmation}
                                        className="mt-2 text-red-600 dark:text-red-400"
                                    />
                                </div>

                                <div className="mt-6">
                                    <PrimaryButton
                                        className="w-full justify-center bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-500/40 focus:ring-offset-gray-50 dark:border dark:border-zinc-600 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 dark:focus:ring-zinc-500/40 dark:focus:ring-offset-zinc-950"
                                        disabled={submitting}
                                    >
                                        Sign up
                                    </PrimaryButton>
                                </div>

                                <div className={`mt-6 text-center text-sm ${mutedClass}`}>
                                    Already registered?{' '}
                                    <Link href={route('login')} className={linkClass}>
                                        Sign in
                                    </Link>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </PublicPageChrome>
        </>
    );
}
