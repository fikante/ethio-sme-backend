import type { JourneyStep } from '@/Components/Sme/ApplicationJourneyPanel';

type Checklist = {
    businessRegistered: boolean;
    heartbeatLoaded: boolean;
    assessmentCompleted: boolean;
    applicationSubmitted: boolean;
    aiEvaluated: boolean;
    decisionReceived: boolean;
};

export function buildSmeJourneySteps(
    checklist: Checklist,
    options: { businessName?: string | null; heartbeatDays?: number } = {},
): JourneyStep[] {
    const { businessName, heartbeatDays = 0 } = options;

    return [
        {
            done: checklist.businessRegistered,
            label: 'Business registered',
            detail: businessName ?? null,
            href: null,
            action: null,
        },
        {
            done: checklist.heartbeatLoaded,
            label: 'Transaction data loaded',
            detail: heartbeatDays > 0 ? `${heartbeatDays} days` : null,
            href: route('integrations'),
            action: 'Connect data',
        },
        {
            done: checklist.assessmentCompleted,
            label: 'Psychometric assessment',
            href: route('psychometrics'),
            action: 'Complete now',
        },
        {
            done: checklist.applicationSubmitted,
            label: 'Loan application submitted',
            href: route('loan-application'),
            action: 'Apply now',
        },
        {
            done: checklist.aiEvaluated,
            label: 'AI evaluation complete',
            href: route('sme.valuation'),
            action: 'View results',
        },
        {
            done: checklist.decisionReceived,
            label: 'Decision received',
            href: null,
            action: null,
        },
    ];
}
