import {
    ANSWER_LABELS,
    PsychometricQuestion,
    usePsychometricTest,
} from '@/hooks/usePsychometricTest';
import {
    initPsychometricTheme,
    restoreAppTheme,
    setPsychometricTheme,
} from '@/lib/psychometricTheme';
import type { PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import { CheckCircle2, Clock, Loader2, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

type Props = PageProps<{
    submitUrl: string;
    questions: PsychometricQuestion[];
    questionCount: number;
    alreadyCompleted: boolean;
}>;

export default function PsychometricTest({
    submitUrl,
    questions,
    questionCount,
    alreadyCompleted,
}: Props) {
    const [isDark, setIsDark] = useState(false);

    const {
        businessToken,
        screen,
        currentIndex,
        currentQuestion,
        answers,
        isSubmitting,
        direction,
        progress,
        totalQuestions,
        submitError,
        startTest,
        selectAnswer,
        goBack,
        continueManual,
    } = usePsychometricTest({ questions, submitUrl, alreadyCompleted });

    useEffect(() => {
        setIsDark(initPsychometricTheme() === 'dark');

        return () => restoreAppTheme();
    }, []);

    const toggleTheme = () => {
        const next = isDark ? 'light' : 'dark';
        setPsychometricTheme(next);
        setIsDark(next === 'dark');
    };

    const selectedAnswer = currentQuestion
        ? answers[currentQuestion.id]
        : undefined;

    const isLastQuestion = currentIndex >= totalQuestions - 1;

    const questionTransitionClass =
        direction === 'forward'
            ? 'animate-[psychForward_250ms_ease-out_forwards]'
            : 'animate-[psychBackward_250ms_ease-out_forwards]';

    return (
        <>
            <Head title="Psychometric Assessment" />

            <style>{`
                @keyframes psychForward {
                    from { opacity: 0; transform: translateX(30px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes psychBackward {
                    from { opacity: 0; transform: translateX(-30px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes checkBounce {
                    0% { transform: scale(0); opacity: 0; }
                    60% { transform: scale(1.12); }
                    100% { transform: scale(1); opacity: 1; }
                }
                .check-bounce { animation: checkBounce 650ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            `}</style>

            <div className="min-h-screen bg-white text-[#0A0A0A] transition-colors duration-300 dark:bg-[#0A0A0A] dark:text-[#FAFAFA]">
                <button
                    type="button"
                    onClick={toggleTheme}
                    aria-label="Toggle dark mode"
                    className="fixed top-4 right-4 z-50 rounded-lg border border-[#E5E5E5] p-2.5 text-[#0A0A0A] transition hover:border-[#0A0A0A] dark:border-[#262626] dark:text-[#FAFAFA] dark:hover:border-[#FAFAFA]"
                >
                    {isDark ? (
                        <Sun className="h-5 w-5" />
                    ) : (
                        <Moon className="h-5 w-5" />
                    )}
                </button>

                {screen === 'questions' && (
                    <div className="fixed top-0 right-0 left-0 z-40 h-1 bg-[#E5E5E5] dark:bg-[#262626]">
                        <div
                            className="h-full bg-[#0A0A0A] transition-all duration-500 ease-out dark:bg-[#FAFAFA]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
                    <div className="w-full max-w-xl">
                        {screen === 'intro' && (
                            <IntroScreen
                                onStart={startTest}
                                error={submitError}
                                hasToken={Boolean(businessToken)}
                                alreadyCompleted={alreadyCompleted}
                                questionCount={questionCount}
                            />
                        )}

                        {screen === 'questions' && currentQuestion && (
                            <div
                                key={`${currentQuestion.id}-${currentIndex}`}
                                className={questionTransitionClass}
                            >
                                <div className="mb-6 flex items-center justify-between gap-3">
                                    <p className="text-xs tracking-wider text-[#737373] uppercase dark:text-[#A3A3A3]">
                                        Question {currentIndex + 1} of{' '}
                                        {totalQuestions}
                                    </p>
                                    {currentQuestion.type === 'choice' && (
                                        <span className="rounded-full border border-[#E5E5E5] px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#737373] uppercase dark:border-[#262626] dark:text-[#A3A3A3]">
                                            Scenario
                                        </span>
                                    )}
                                </div>

                                <h2 className="mb-8 text-2xl leading-snug font-semibold text-[#0A0A0A] dark:text-[#FAFAFA]">
                                    {currentQuestion.text}
                                </h2>

                                <div className="space-y-3">
                                    {currentQuestion.type === 'choice' &&
                                    currentQuestion.options ? (
                                        currentQuestion.options.map(
                                            (option) => {
                                                const selected =
                                                    selectedAnswer ===
                                                    option.score;

                                                return (
                                                    <button
                                                        key={option.text}
                                                        type="button"
                                                        onClick={() =>
                                                            selectAnswer(
                                                                currentQuestion.id,
                                                                option.score,
                                                            )
                                                        }
                                                        className={[
                                                            'w-full rounded-xl border-[1.5px] px-4 py-3.5 text-left text-sm font-medium transition-[border-color,background-color,color] duration-150',
                                                            selected
                                                                ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white dark:border-[#FAFAFA] dark:bg-[#FAFAFA] dark:text-black'
                                                                : 'border-[#E5E5E5] bg-white text-[#0A0A0A] hover:border-[#0A0A0A] dark:border-[#262626] dark:bg-[#171717] dark:text-[#FAFAFA] dark:hover:border-[#FAFAFA]',
                                                        ].join(' ')}
                                                    >
                                                        {option.text}
                                                    </button>
                                                );
                                            },
                                        )
                                    ) : (
                                        ANSWER_LABELS.map((label, index) => {
                                            const value = index + 1;
                                            const selected =
                                                selectedAnswer === value;

                                            return (
                                                <button
                                                    key={label}
                                                    type="button"
                                                    onClick={() =>
                                                        selectAnswer(
                                                            currentQuestion.id,
                                                            value,
                                                        )
                                                    }
                                                    className={[
                                                        'w-full rounded-xl border-[1.5px] py-3.5 text-sm font-medium transition-[border-color,background-color,color] duration-150',
                                                        selected
                                                            ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white dark:border-[#FAFAFA] dark:bg-[#FAFAFA] dark:text-black'
                                                            : 'border-[#E5E5E5] bg-white text-[#0A0A0A] hover:border-[#0A0A0A] dark:border-[#262626] dark:bg-[#171717] dark:text-[#FAFAFA] dark:hover:border-[#FAFAFA]',
                                                    ].join(' ')}
                                                >
                                                    {label}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>

                                {submitError && (
                                    <p className="mt-4 text-sm text-[#737373] dark:text-[#A3A3A3]">
                                        {submitError}
                                    </p>
                                )}

                                <div className="mt-8 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={goBack}
                                        className="text-sm font-medium text-[#737373] transition hover:text-[#0A0A0A] dark:text-[#A3A3A3] dark:hover:text-[#FAFAFA]"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={continueManual}
                                        disabled={
                                            selectedAnswer === undefined ||
                                            isSubmitting
                                        }
                                        className="rounded-xl bg-[#0A0A0A] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#FAFAFA] dark:text-black"
                                    >
                                        {isSubmitting
                                            ? 'Submitting…'
                                            : isLastQuestion
                                              ? 'Submit Assessment'
                                              : 'Continue →'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {screen === 'submitted' && <SubmittingScreen />}

                        {screen === 'complete' && <CompleteScreen />}
                    </div>
                </div>
            </div>
        </>
    );
}

function IntroScreen({
    onStart,
    error,
    hasToken,
    alreadyCompleted,
    questionCount,
}: {
    onStart: () => void;
    error: string | null;
    hasToken: boolean;
    alreadyCompleted: boolean;
    questionCount: number;
}) {
    return (
        <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-[#0A0A0A] dark:text-[#FAFAFA]">
                EthioSME Credit Assessment
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base text-[#737373] dark:text-[#A3A3A3]">
                This assessment will help us understand your business profile and
                behavioral patterns. It includes statement and scenario-based
                questions — please answer honestly.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] px-4 py-2 text-sm text-[#737373] dark:border-[#262626] dark:text-[#A3A3A3]">
                <Clock className="h-4 w-4" />
                {questionCount} questions · about 15 minutes
            </div>

            {error && (
                <p className="mt-4 text-sm text-[#737373] dark:text-[#A3A3A3]">
                    {error}
                </p>
            )}

            {!hasToken && (
                <p className="mt-4 text-sm text-[#737373] dark:text-[#A3A3A3]">
                    Open this page from your loan application to receive a
                    valid access link.
                </p>
            )}

            <button
                type="button"
                onClick={onStart}
                disabled={!hasToken && !alreadyCompleted}
                className="mt-8 w-full rounded-xl bg-[#0A0A0A] py-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#FAFAFA] dark:text-black"
            >
                {alreadyCompleted ? 'View confirmation' : 'Get Started'}
            </button>

            <p className="mt-6 text-xs text-[#737373] dark:text-[#A3A3A3]">
                Your responses are confidential and used only for credit
                scoring purposes.
            </p>

            <p className="mt-12 text-xs tracking-widest text-[#737373] uppercase dark:text-[#A3A3A3]">
                EthioSME
            </p>
        </div>
    );
}

function SubmittingScreen() {
    return (
        <div className="py-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#737373] dark:text-[#A3A3A3]" />
            <p className="mt-4 text-sm text-[#737373] dark:text-[#A3A3A3]">
                Submitting your responses…
            </p>
        </div>
    );
}

function CompleteScreen() {
    return (
        <div className="py-8 text-center">
            <div className="check-bounce mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#0A0A0A] dark:border-[#FAFAFA]">
                <CheckCircle2
                    className="h-11 w-11 text-[#0A0A0A] dark:text-[#FAFAFA]"
                    strokeWidth={1.75}
                />
            </div>

            <h2 className="mt-6 text-2xl font-semibold tracking-tight text-[#0A0A0A] dark:text-[#FAFAFA]">
                Assessment Taken
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#737373] dark:text-[#A3A3A3]">
                Thank you. Your responses have been recorded and submitted for
                credit review.
            </p>

            <button
                type="button"
                onClick={() => window.close()}
                className="mt-10 w-full rounded-xl bg-[#0A0A0A] py-4 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-[#FAFAFA] dark:text-black"
            >
                Return to your application
            </button>

            <p className="mt-4 text-xs text-[#737373] dark:text-[#A3A3A3]">
                You can safely close this tab and continue your loan application.
            </p>
        </div>
    );
}
