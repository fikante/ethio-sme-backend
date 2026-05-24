import { markPsychometricComplete } from '@/lib/psychometricCompletion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type PsychometricQuestion = {
    id: string;
    text: string;
    dimension: string;
    type: 'likert' | 'choice';
    is_reverse_scored?: boolean;
    options?: Array<{ text: string; score: number }> | null;
};

export type PsychometricScreen = 'intro' | 'questions' | 'submitted' | 'complete';

export const ANSWER_LABELS = [
    'Strongly Disagree',
    'Disagree',
    'Neutral',
    'Agree',
    'Strongly Agree',
] as const;

function seededRandom(seed: string): () => number {
    let hash = 0;

    for (let i = 0; i < seed.length; i++) {
        hash = Math.imul(31, hash) + seed.charCodeAt(i);
    }

    return () => {
        hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
        hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
        hash ^= hash >>> 16;

        return (hash >>> 0) / 4294967296;
    };
}

function shuffleQuestions(
    questions: PsychometricQuestion[],
    seed: string,
): PsychometricQuestion[] {
    const rng = seededRandom(seed || 'default-seed');
    const copy = [...questions];

    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
}

function getBusinessToken(): string | null {
    if (typeof window === 'undefined') {
        return null;
    }

    return new URLSearchParams(window.location.search).get('token');
}

type UsePsychometricTestOptions = {
    questions: PsychometricQuestion[];
    submitUrl: string;
    alreadyCompleted?: boolean;
};

export function usePsychometricTest({
    questions,
    submitUrl,
    alreadyCompleted = false,
}: UsePsychometricTestOptions) {
    const businessToken = useMemo(() => getBusinessToken(), []);
    const shuffledQuestions = useMemo(
        () => shuffleQuestions(questions, businessToken ?? 'anonymous'),
        [questions, businessToken],
    );

    const [screen, setScreen] = useState<PsychometricScreen>(
        alreadyCompleted ? 'complete' : 'intro',
    );
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
    const [submitError, setSubmitError] = useState<string | null>(null);
    const answersRef = useRef<Record<string, number>>({});

    const totalQuestions = shuffledQuestions.length;
    const currentQuestion = shuffledQuestions[currentIndex] ?? null;

    const progress =
        screen === 'questions' && totalQuestions > 0
            ? ((currentIndex + 1) / totalQuestions) * 100
            : 0;

    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    useEffect(() => {
        if (alreadyCompleted && businessToken) {
            markPsychometricComplete(businessToken);
        }
    }, [alreadyCompleted, businessToken]);

    const postAnswers = useCallback(
        async (payload: Record<string, number>) => {
            if (!businessToken) {
                throw new Error('Missing business token.');
            }

            const response = await fetch(submitUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN':
                        document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute('content') ?? '',
                },
                body: JSON.stringify({
                    business_token: businessToken,
                    answers: payload,
                }),
            });

            if (!response.ok) {
                const body = (await response.json().catch(() => null)) as {
                    message?: string;
                } | null;
                throw new Error(body?.message ?? 'Submission failed.');
            }

            return (await response.json()) as { success: boolean };
        },
        [businessToken, submitUrl],
    );

    const submitTest = useCallback(async () => {
        const toSubmit = answersRef.current;

        if (Object.keys(toSubmit).length < totalQuestions) {
            setSubmitError('Please answer all questions before submitting.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);
        setScreen('submitted');

        try {
            await postAnswers(toSubmit);

            if (businessToken) {
                markPsychometricComplete(businessToken);
            }

            setScreen('complete');
        } catch (error) {
            setScreen('questions');
            setSubmitError(
                error instanceof Error
                    ? error.message
                    : 'Could not submit your assessment.',
            );
        } finally {
            setIsSubmitting(false);
        }
    }, [businessToken, postAnswers, totalQuestions]);

    const startTest = useCallback(() => {
        if (!businessToken) {
            setSubmitError(
                'Missing business token. Return to your application and try again.',
            );
            return;
        }

        if (alreadyCompleted) {
            setScreen('complete');
            return;
        }

        setSubmitError(null);
        setDirection('forward');
        setCurrentIndex(0);
        setScreen('questions');
    }, [alreadyCompleted, businessToken]);

    const selectAnswer = useCallback((questionId: string, value: number) => {
        const nextAnswers = { ...answersRef.current, [questionId]: value };
        answersRef.current = nextAnswers;
        setAnswers(nextAnswers);
        setSubmitError(null);
    }, []);

    const goBack = useCallback(() => {
        if (screen === 'questions' && currentIndex === 0) {
            setDirection('backward');
            setScreen('intro');
            return;
        }

        if (screen === 'questions' && currentIndex > 0) {
            setDirection('backward');
            setCurrentIndex((i) => i - 1);
        }
    }, [currentIndex, screen]);

    const continueManual = useCallback(() => {
        if (currentQuestion && answersRef.current[currentQuestion.id] === undefined) {
            setSubmitError('Please select an answer before continuing.');
            return;
        }

        if (currentIndex >= totalQuestions - 1) {
            void submitTest();
            return;
        }

        setDirection('forward');
        setCurrentIndex((i) => i + 1);
        setSubmitError(null);
    }, [currentIndex, currentQuestion, submitTest, totalQuestions]);

    return {
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
        submitTest,
    };
}
