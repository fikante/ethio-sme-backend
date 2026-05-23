import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import PublicPageChrome from '@/Components/PublicPageChrome';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

const labelClass = 'text-gray-600 dark:text-zinc-300';
const inputClass =
    'mt-2 block w-full border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:ring-gray-500/30 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/30';
const mutedClass = 'text-gray-500 dark:text-zinc-400';
const linkClass =
    'font-semibold text-gray-900 underline-offset-4 hover:underline dark:text-white';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Log in" />

            <PublicPageChrome>
                <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl items-center justify-center px-4 pb-12 sm:px-6 lg:px-8">
                    <div className="w-full max-w-md">
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
                                Sign in to Ethio‑SME Valuation System
                            </h1>
                            <p className={`mt-2 text-sm ${mutedClass}`}>
                                Secure access for banks, SME owners, and auditors.
                            </p>
                        </div>

                        <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
                            {status && (
                                <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                    {status}
                                </div>
                            )}

                            <form onSubmit={submit}>
                                <div>
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
                                        isFocused={true}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="you@bank.com"
                                    />

                                    <InputError
                                        message={errors.email}
                                        className="mt-2 text-red-600 dark:text-red-400"
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
                                        autoComplete="current-password"
                                        onChange={(e) => setData('password', e.target.value)}
                                        placeholder="••••••••"
                                    />

                                    <InputError
                                        message={errors.password}
                                        className="mt-2 text-red-600 dark:text-red-400"
                                    />
                                </div>

                                <div className="mt-5 flex items-center justify-between gap-3">
                                    <label
                                        className={`flex items-center gap-2 text-sm ${mutedClass}`}
                                    >
                                        <Checkbox
                                            name="remember"
                                            checked={data.remember}
                                            className="border-gray-300 text-gray-900 focus:ring-gray-500/30 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:focus:ring-zinc-500/30"
                                            onChange={(e) =>
                                                setData(
                                                    'remember',
                                                    (e.target.checked || false) as false,
                                                )
                                            }
                                        />
                                        Remember me
                                    </label>

                                    {canResetPassword && (
                                        <Link
                                            href={route('password.request')}
                                            className={`text-sm underline-offset-4 hover:underline ${mutedClass}`}
                                        >
                                            Forgot password?
                                        </Link>
                                    )}
                                </div>

                                <div className="mt-6">
                                    <PrimaryButton
                                        className="w-full justify-center bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-500/40 focus:ring-offset-gray-50 dark:border dark:border-zinc-600 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 dark:focus:ring-zinc-500/40 dark:focus:ring-offset-zinc-950"
                                        disabled={processing}
                                    >
                                        Log in
                                    </PrimaryButton>
                                </div>

                                <div className={`mt-6 text-center text-sm ${mutedClass}`}>
                                    New to the system?{' '}
                                    <Link href={route('register')} className={linkClass}>
                                        Create an account
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
