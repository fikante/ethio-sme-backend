import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <>
            <Head title="Register" />

            <div className="relative min-h-screen bg-black text-white">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute left-1/2 top-[-10rem] h-[26rem] w-[52rem] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
                    <div className="absolute left-1/2 top-[-2rem] h-[18rem] w-[18rem] -translate-x-1/2 rounded-full bg-white/10 blur-2xl [animation:slowPulse_6s_ease-in-out_infinite]" />
                    <div className="absolute bottom-[-10rem] left-[-12rem] h-[26rem] w-[26rem] rounded-full bg-white/5 blur-3xl" />
                </div>

                <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 sm:px-6 lg:px-8">
                    <div className="w-full max-w-md my-10">
                        <div className="mb-6 text-center">
                            <div className="inline-flex items-center justify-center rounded-2xl bg-white/5 p-3 ring-1 ring-inset ring-white/10">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-6 w-6 text-white/85"
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

                            <h1 className="mt-5 text-balance text-2xl font-semibold tracking-tight text-white">
                                Create your account
                            </h1>
                            <p className="mt-2 text-sm text-white/60">
                                Start a thesis‑grade valuation profile in minutes.
                            </p>
                        </div>

                        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.05)] backdrop-blur sm:p-8">
                            <div className="pointer-events-none absolute inset-0 opacity-40">
                                <div className="absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent [animation:sheen_3.6s_ease-in-out_infinite]" />
                            </div>

                            <form onSubmit={submit} className="relative">
                                <div>
                                    <InputLabel
                                        htmlFor="name"
                                        value="Name"
                                        className="text-white/80"
                                    />

                                    <TextInput
                                        id="name"
                                        name="name"
                                        value={data.name}
                                        className="mt-2 block w-full border-white/10 bg-black/30 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-white/30"
                                        autoComplete="name"
                                        isFocused={true}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="Your name"
                                        required
                                    />

                                    <InputError message={errors.name} className="mt-2 text-red-300" />
                                </div>

                                <div className="mt-4">
                                    <InputLabel
                                        htmlFor="email"
                                        value="Email"
                                        className="text-white/80"
                                    />

                                    <TextInput
                                        id="email"
                                        type="email"
                                        name="email"
                                        value={data.email}
                                        className="mt-2 block w-full border-white/10 bg-black/30 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-white/30"
                                        autoComplete="username"
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="you@bank.com"
                                        required
                                    />

                                    <InputError message={errors.email} className="mt-2 text-red-300" />
                                </div>

                                <div className="mt-4">
                                    <InputLabel
                                        htmlFor="password"
                                        value="Password"
                                        className="text-white/80"
                                    />

                                    <TextInput
                                        id="password"
                                        type="password"
                                        name="password"
                                        value={data.password}
                                        className="mt-2 block w-full border-white/10 bg-black/30 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-white/30"
                                        autoComplete="new-password"
                                        onChange={(e) => setData('password', e.target.value)}
                                        placeholder="••••••••"
                                        required
                                    />

                                    <InputError message={errors.password} className="mt-2 text-red-300" />
                                </div>

                                <div className="mt-4">
                                    <InputLabel
                                        htmlFor="password_confirmation"
                                        value="Confirm Password"
                                        className="text-white/80"
                                    />

                                    <TextInput
                                        id="password_confirmation"
                                        type="password"
                                        name="password_confirmation"
                                        value={data.password_confirmation}
                                        className="mt-2 block w-full border-white/10 bg-black/30 text-white placeholder:text-white/30 focus:border-white/30 focus:ring-white/30"
                                        autoComplete="new-password"
                                        onChange={(e) =>
                                            setData('password_confirmation', e.target.value)
                                        }
                                        placeholder="••••••••"
                                        required
                                    />

                                    <InputError
                                        message={errors.password_confirmation}
                                        className="mt-2 text-red-300"
                                    />
                                </div>

                                <div className="mt-6">
                                    <PrimaryButton
                                        className="w-full justify-center border border-white/15 bg-white/10 text-white hover:bg-white/15 focus:ring-white/40 focus:ring-offset-black active:bg-white/20"
                                        disabled={processing}
                                    >
                                        Sign up
                                    </PrimaryButton>
                                </div>

                                <div className="mt-6 text-center text-sm text-white/60">
                                    Already registered?{' '}
                                    <Link
                                        href={route('login')}
                                        className="font-semibold text-white underline-offset-4 hover:underline"
                                    >
                                        Sign in
                                    </Link>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
