import ThemeToggle from '@/Components/ThemeToggle';
import { Head, Link } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

type RevealProps = {
    children: React.ReactNode;
    delayMs?: number;
    className?: string;
};

function useInView<T extends Element>(options?: IntersectionObserverInit) {
    const ref = useRef<T | null>(null);
    const [isInView, setIsInView] = useState(false);

    useEffect(() => {
        if (!ref.current || isInView) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry?.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15, rootMargin: '0px 0px -10% 0px', ...options },
        );

        observer.observe(ref.current);

        return () => observer.disconnect();
    }, [isInView, options]);

    return { ref, isInView } as const;
}

function Reveal({ children, delayMs = 0, className = '' }: RevealProps) {
    const { ref, isInView } = useInView<HTMLDivElement>();

    return (
        <div
            ref={ref}
            style={{ transitionDelay: `${delayMs}ms` }}
            className={[
                'transition-all duration-700 ease-out will-change-transform',
                isInView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
                className,
            ].join(' ')}
        >
            {children}
        </div>
    );
}

function Icon({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={[
                'grid h-10 w-10 place-items-center rounded-xl bg-[#085041]/10 text-[#085041] ring-1 ring-inset ring-[#085041]/20 dark:bg-white/5 dark:text-[#4B7A64] dark:text-white/80 dark:ring-white/10',
                className,
            ].join(' ')}
        >
            {children}
        </div>
    );
}

export default function Landing() {
    const animatedPhrases = useMemo(
        () => [
            'Break Free from the Collateral Trap',
            "AI‑Powered Cash‑Flow Lending for Ethiopia’s Missing Middle",
        ],
        [],
    );

    const rotatingWords = useMemo(
        () => ['Transparent.', 'Compliant.', 'Dynamic.'],
        [],
    );

    const [rotatingIndex, setRotatingIndex] = useState(0);

    useEffect(() => {
        const id = window.setInterval(() => {
            setRotatingIndex((i: number) => (i + 1) % rotatingWords.length);
        }, 1600);

        return () => window.clearInterval(id);
    }, [rotatingWords.length]);

    return (
        <>
            <Head title="Ethio‑SME Valuation System" />

            <div className="min-h-screen bg-[#F4F7F5] text-[#0F1A16] dark:bg-[#0A0F0D] dark:text-white">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div
                        className="absolute inset-0 bg-[url('/photos/image.png')] bg-cover bg-center opacity-[0.12] [animation:heroKenBurns_18s_ease-in-out_infinite] dark:opacity-[0.28]"
                        aria-hidden="true"
                    />
                    {/* Vignette + readability overlays */}
                    <div
                        className="absolute inset-0 bg-gradient-to-b from-[#F4F7F5]/95 via-[#F0F7F4]/85 to-[#F4F7F5]/95 dark:from-black/80 dark:via-black/55 dark:to-black/90"
                        aria-hidden="true"
                    />
                    <div
                        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.10),transparent_55%)]"
                        aria-hidden="true"
                    />
                    {/* Subtle animated highlight blob */}
                    <div
                        className="absolute -left-24 top-24 h-[30rem] w-[30rem] rounded-full bg-white/10 blur-3xl [animation:heroFloat_9s_ease-in-out_infinite]"
                        aria-hidden="true"
                    />

                    <div className="absolute left-1/2 top-[-14rem] h-[30rem] w-[60rem] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
                    <div className="absolute right-[-10rem] top-[8rem] h-[22rem] w-[22rem] rounded-full bg-white/5 blur-3xl" />
                    <div className="absolute bottom-[-14rem] left-[-12rem] h-[28rem] w-[28rem] rounded-full bg-white/5 blur-3xl" />
                </div>

                <header className="sticky top-0 z-50 border-b border-[#D1E8DF] bg-white/85 backdrop-blur dark:border-white/10 dark:bg-black/70">
                    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#085041]/10 ring-1 ring-inset ring-[#085041]/20 dark:bg-white/5 dark:ring-white/10">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-5 w-5 text-[#085041] dark:text-[#4B7A64] dark:text-white/80"
                                    aria-hidden="true"
                                >
                                    <path d="M12 2v4" />
                                    <path d="M7 6h10" />
                                    <path d="M6 10h12" />
                                    <path d="M6 14h12" />
                                    <path d="M7 18h10" />
                                    <path d="M12 18v4" />
                                </svg>
                            </span>
                            <div className="leading-tight">
                                <div className="text-sm font-semibold tracking-tight text-[#0F1A16] dark:text-white">
                                    Ethio‑SME Valuation System
                                </div>
                                <div className="text-xs text-[#4B7A64] dark:text-[#4B7A64] dark:text-white/60">
                                    Fintech AI • Cash‑flow lending • Ethiopia
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <ThemeToggle />
                            <Link
                                href={route('login')}
                                className="inline-flex items-center justify-center rounded-lg bg-[#085041] px-4 py-2 text-sm font-semibold text-[#0F1A16] dark:text-white shadow-sm transition hover:bg-[#085041]/90 focus:outline-none focus:ring-2 focus:ring-[#085041]/40 focus:ring-offset-2 focus:ring-offset-[#F4F7F5] dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/60 dark:focus:ring-offset-black"
                            >
                                Login
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="relative">
                    <section className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pb-24 lg:pt-20">
                        <div className="grid items-center gap-12 lg:grid-cols-12">
                            <div className="lg:col-span-7">
                                <div className="inline-flex items-center gap-2 rounded-full bg-[#085041]/10 px-4 py-2 text-sm text-[#085041] ring-1 ring-inset ring-[#085041]/20 dark:bg-white/5 dark:text-[#4B7A64] dark:text-white/80 dark:ring-white/10">
                                    <span className="h-2 w-2 rounded-full bg-[#5DCAA5] dark:bg-white/60" />
                                    Replace collateral with continuous valuation
                                </div>

                                <div className="mt-6">
                                    <h1 className="text-balance text-4xl font-semibold tracking-tight text-[#0F1A16] dark:text-white sm:text-5xl lg:text-6xl">
                                        <span className="block">
                                            <span
                                                className="inline-block translate-y-2 animate-[fadeUp_700ms_ease-out_forwards] opacity-0"
                                                style={{ animationDelay: '0ms' }}
                                            >
                                                {animatedPhrases[0]}
                                            </span>
                                        </span>
                                        <span className="mt-3 block">
                                            <span
                                                className="inline-block translate-y-2 animate-[fadeUp_700ms_ease-out_forwards] opacity-0"
                                                style={{ animationDelay: '180ms' }}
                                            >
                                                {animatedPhrases[1]}
                                            </span>
                                        </span>
                                        <span className="mt-4 block text-white/90">
                                            <span
                                                key={rotatingWords[rotatingIndex]}
                                                className="inline-block translate-y-2 animate-[fadeUp_500ms_ease-out_forwards] opacity-0"
                                            >
                                                {rotatingWords[rotatingIndex]}
                                            </span>
                                        </span>
                                    </h1>

                                    <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-white/75 sm:text-lg">
                                        A thesis‑grade fintech AI platform that helps Ethiopian banks lend to SMEs
                                        without physical collateral—by combining probabilistic cash‑flow forecasting,
                                        psychometric willingness profiling, and explainable AI reason codes that are
                                        transparent and legally defensible.
                                    </p>

                                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                                        <Link
                                            href={route('register')}
                                            className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black shadow-sm transition hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-black"
                                        >
                                            Get Started Free
                                        </Link>
                                        <a
                                            href="#how-it-works"
                                            className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-[#0F1A16] dark:text-white/90 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-[#071a2b]"
                                        >
                                            See how it works
                                        </a>
                                    </div>

                                    <div className="mt-10 flex flex-wrap gap-3 text-xs text-[#4B7A64] dark:text-white/60">
                                        <span className="rounded-full bg-white/5 px-3 py-2 ring-1 ring-inset ring-white/10">
                                            DeepAR P10 downside protection
                                        </span>
                                        <span className="rounded-full bg-white/5 px-3 py-2 ring-1 ring-inset ring-white/10">
                                            SHAP reason codes for compliance
                                        </span>
                                        <span className="rounded-full bg-white/5 px-3 py-2 ring-1 ring-inset ring-white/10">
                                            PDPP local‑first data storage
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-5">
                                <Reveal>
                                    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
                                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                                        <div className="relative">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="text-sm font-semibold text-[#0F1A16] dark:text-white">
                                                    Live Valuation Snapshot (PoC)
                                                </div>
                                                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-[#4B7A64] dark:text-white/80 ring-1 ring-inset ring-white/15">
                                                    Explainable
                                                </span>
                                            </div>

                                            <div className="mt-5 grid grid-cols-2 gap-4">
                                                <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-inset ring-white/10">
                                                    <div className="text-xs text-[#4B7A64] dark:text-white/60">
                                                        Max loan limit (ETB)
                                                    </div>
                                                    <div className="mt-2 text-2xl font-semibold tabular-nums text-white">
                                                        1,250,000
                                                    </div>
                                                    <div className="mt-1 text-xs text-[#4B7A64] dark:text-white/70">
                                                        Dynamic NPV‑based cap
                                                    </div>
                                                </div>
                                                <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-inset ring-white/10">
                                                    <div className="text-xs text-[#4B7A64] dark:text-white/60">
                                                        Worst‑case revenue (P10)
                                                    </div>
                                                    <div className="mt-2 text-2xl font-semibold tabular-nums text-white">
                                                        84,300
                                                    </div>
                                                    <div className="mt-1 text-xs text-[#4B7A64] dark:text-white/60">
                                                        30‑day forecast window
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4 rounded-2xl bg-black/30 p-4 ring-1 ring-inset ring-white/10">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-xs font-semibold text-[#4B7A64] dark:text-white/70">
                                                        Reason codes (SHAP)
                                                    </div>
                                                    <div className="text-xs text-white/50">
                                                        NBE‑aligned audit trail
                                                    </div>
                                                </div>
                                                <ul className="mt-3 space-y-2 text-sm text-[#4B7A64] dark:text-white/80">
                                                    <li className="flex items-start gap-2">
                                                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/70" />
                                                        Strong transaction success rate (14‑day)
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/70" />
                                                        Consistent inflow stability across paydays
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/40" />
                                                        Improve: reduce volatility during holiday spikes
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </Reveal>
                            </div>
                        </div>
                    </section>

                    <section className="border-y border-[#D1E8DF] bg-[#F0F7F4]/80 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                            <div className="grid gap-4 text-sm text-[#4B7A64] dark:text-white/70 md:grid-cols-3">
                                <div className="flex items-start gap-3">
                                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-[#4B7A64] dark:text-white/80 ring-1 ring-inset ring-white/15">
                                        1
                                    </span>
                                    <div>
                                        Built for <span className="font-semibold text-[#0F1A16] dark:text-white">NBE Risk‑Based Capital</span>{' '}
                                        Directives (SBB/95/2025)
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-[#4B7A64] dark:text-white/80 ring-1 ring-inset ring-white/15">
                                        2
                                    </span>
                                    <div>
                                        Local‑first storage under <span className="font-semibold text-[#0F1A16] dark:text-white">PDPP</span>{' '}
                                        Proclamation 1321/2024
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-[#4B7A64] dark:text-white/80 ring-1 ring-inset ring-white/15">
                                        3
                                    </span>
                                    <div>
                                        Fairness audit metrics: <span className="font-semibold text-[#0F1A16] dark:text-white">SPD</span>{' '}
                                        & <span className="font-semibold text-[#0F1A16] dark:text-white">Equalized Odds</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
                        <Reveal>
                            <div className="flex items-end justify-between gap-6">
                                <div>
                                    <div className="text-sm font-semibold text-[#4B7A64] dark:text-white/80">
                                        Core capabilities
                                    </div>
                                    <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#0F1A16] dark:text-white sm:text-4xl">
                                        Underwrite without collateral—safely.
                                    </h2>
                                    <p className="mt-4 max-w-2xl text-[#4B7A64] dark:text-white/70">
                                        Ethio‑SME Valuation System combines “ability to repay” signals from cash‑flow
                                        forecasts with “willingness to repay” psychometrics, then explains every decision
                                        with SHAP‑based reason codes.
                                    </p>
                                </div>
                            </div>
                        </Reveal>

                        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                            <Reveal delayMs={0} className="h-full">
                                <div className="h-full rounded-2xl border border-[#D1E8DF] bg-white shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none p-6 shadow-sm">
                                    <Icon>
                                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 15l3-3 3 2 5-7" />
                                        </svg>
                                    </Icon>
                                    <h3 className="mt-4 text-base font-semibold text-[#0F1A16] dark:text-white">
                                        Probabilistic Cash‑Flow Forecasting
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-[#4B7A64] dark:text-white/70">
                                        DeepAR and LSTM models predict worst‑case revenue (P10) to protect lenders under
                                        volatility.
                                    </p>
                                </div>
                            </Reveal>

                            <Reveal delayMs={80} className="h-full">
                                <div className="h-full rounded-2xl border border-[#D1E8DF] bg-white shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none p-6 shadow-sm">
                                    <Icon>
                                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 1 0 9 9" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5L20 7" />
                                        </svg>
                                    </Icon>
                                    <h3 className="mt-4 text-base font-semibold text-[#0F1A16] dark:text-white">
                                        Psychometric Willingness Profiling
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-[#4B7A64] dark:text-white/70">
                                        Gamified assessment of integrity, conscientiousness, and risk tolerance to
                                        quantify repayment willingness.
                                    </p>
                                </div>
                            </Reveal>

                            <Reveal delayMs={160} className="h-full">
                                <div className="h-full rounded-2xl border border-[#D1E8DF] bg-white shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none p-6 shadow-sm">
                                    <Icon>
                                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l9 4.5-9 4.5-9-4.5L12 3z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9 4.5 9-4.5" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5l9 4.5 9-4.5" />
                                        </svg>
                                    </Icon>
                                    <h3 className="mt-4 text-base font-semibold text-[#0F1A16] dark:text-white">
                                        Explainable AI (SHAP)
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-[#4B7A64] dark:text-white/70">
                                        Every decision backed by transparent, legally defensible reason codes for adverse
                                        actions.
                                    </p>
                                </div>
                            </Reveal>

                            <Reveal delayMs={240} className="h-full">
                                <div className="h-full rounded-2xl border border-[#D1E8DF] bg-white shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none p-6 shadow-sm">
                                    <Icon>
                                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v22" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
                                        </svg>
                                    </Icon>
                                    <h3 className="mt-4 text-base font-semibold text-[#0F1A16] dark:text-white">
                                        Dynamic Credit Limits
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-[#4B7A64] dark:text-white/70">
                                        Real‑time NPV calculation adjusts automatically to NBE policy rates and borrower
                                        behavior.
                                    </p>
                                </div>
                            </Reveal>
                        </div>
                    </section>

                    <section id="how-it-works" className="border-y border-[#D1E8DF] bg-[#F0F7F4]/80 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
                            <Reveal>
                                <div className="max-w-2xl">
                                    <div className="text-sm font-semibold text-[#4B7A64] dark:text-white/80">How it works</div>
                                    <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#0F1A16] dark:text-white sm:text-4xl">
                                        From footprint to limit—in 3 steps.
                                    </h2>
                                    <p className="mt-4 text-[#4B7A64] dark:text-white/70">
                                        Designed for thesis demonstration and bank‑grade compliance: we simulate Chapa‑style
                                        payment footprints, run the AI valuation engines, then return a clear maximum loan
                                        limit with improvement tips.
                                    </p>
                                </div>
                            </Reveal>

                            <div className="mt-10 grid gap-6 lg:grid-cols-3">
                                {[
                                    {
                                        title: 'Connect digital payment footprint',
                                        body: 'Chapa mock integration connects a payment footprint without live network dependency for deterministic PoC demos.',
                                    },
                                    {
                                        title: 'AI assesses ability & willingness',
                                        body: 'DeepAR/LSTM forecast worst‑case cash flow (P10) while psychometrics quantify integrity, conscientiousness, and risk tolerance.',
                                    },
                                    {
                                        title: 'Get an instant compliant loan limit',
                                        body: 'Receive a maximum ETB limit with SHAP reason codes and improve‑score tips aligned to regulatory expectations.',
                                    },
                                ].map((step, i) => (
                                    <Reveal key={step.title} delayMs={i * 90} className="h-full">
                                        <div className="relative h-full overflow-hidden rounded-2xl border border-[#D1E8DF] bg-white dark:border-white/10 dark:bg-black/30 p-6">
                                            <div className="flex items-start gap-4">
                                                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-black ring-1 ring-inset ring-white/20">
                                                    <span className="text-sm font-bold">{i + 1}</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-semibold text-[#0F1A16] dark:text-white">
                                                        {step.title}
                                                    </h3>
                                                    <p className="mt-2 text-sm leading-relaxed text-[#4B7A64] dark:text-white/70">
                                                        {step.body}
                                                    </p>
                                                </div>
                                            </div>

                                            {i < 2 && (
                                                <div className="pointer-events-none absolute right-6 top-6 hidden lg:block">
                                                    <svg viewBox="0 0 36 36" className="h-10 w-10 text-white/15" fill="none">
                                                        <path d="M6 18h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                        <path d="M22 10l8 8-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    </Reveal>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
                        <Reveal>
                            <div className="rounded-3xl border border-[#D1E8DF] bg-gradient-to-br from-white to-[#F0F7F4]/50 dark:border-white/10 dark:from-white/5 dark:to-transparent p-8 lg:p-10">
                                <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
                                    <div className="lg:col-span-7">
                                        <div className="text-sm font-semibold text-[#4B7A64] dark:text-white/80">
                                            Call to action
                                        </div>
                                        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#0F1A16] dark:text-white sm:text-4xl">
                                            Ready to Unlock Unsecured Lending?
                                        </h2>
                                        <p className="mt-4 max-w-2xl text-[#4B7A64] dark:text-white/70">
                                            Whether you’re an SME owner building a digital footprint, or a bank evaluating
                                            risk‑based capital efficiency, Ethio‑SME Valuation System provides a clear,
                                            explainable underwriting pathway—without relying on real‑estate collateral.
                                        </p>
                                    </div>

                                    <div className="lg:col-span-5">
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                                            <a
                                                href="#"
                                                className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black shadow-sm transition hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-black"
                                            >
                                                For SME Owners: Start Your Psychometric Assessment
                                            </a>
                                            <a
                                                href="#"
                                                className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-[#0F1A16] dark:text-white/90 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-[#071a2b]"
                                            >
                                                For Banks: Schedule a Demo
                                            </a>
                                        </div>
                                        <div className="mt-3 text-xs text-white/55">
                                            Demo buttons are placeholders in this PoC landing page.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Reveal>
                    </section>
                </main>

                <footer className="border-t border-[#D1E8DF] bg-white dark:border-white/10 dark:bg-black">
                    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="text-sm font-semibold text-[#0F1A16] dark:text-white">
                                    Ethio‑SME Valuation System
                                </div>
                                <div className="mt-1 text-xs text-[#4B7A64] dark:text-white/55">
                                    © {new Date().getFullYear()} Ethio‑SME Valuation System. All rights reserved.
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#4B7A64] dark:text-[#4B7A64] dark:text-white/70">
                                <a href="#features" className="hover:text-[#085041] dark:hover:text-white">
                                    About
                                </a>
                                <a href="#" className="hover:text-[#085041] dark:hover:text-white">
                                    Thesis Context
                                </a>
                                <a href="#" className="hover:text-[#085041] dark:hover:text-white">
                                    Contact
                                </a>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}

