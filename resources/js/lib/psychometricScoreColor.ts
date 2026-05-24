export type ScoreColor = {
    bar: string;
    text: string;
    badge: string;
    label: string;
    ring: string;
    glow: string;
};

export function getScoreColor(score: number): ScoreColor {
    if (score >= 70) {
        return {
            bar: 'bg-green-500',
            text: 'text-green-500',
            badge: 'bg-green-500/10 text-green-500 border-green-500/20',
            label: 'Strong',
            ring: 'ring-green-500/30',
            glow: '0 0 20px rgba(34,197,94,0.15)',
        };
    }
    if (score >= 45) {
        return {
            bar: 'bg-amber-400',
            text: 'text-amber-400',
            badge: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
            label: 'Moderate',
            ring: 'ring-amber-400/30',
            glow: '0 0 20px rgba(251,191,36,0.15)',
        };
    }
    return {
        bar: 'bg-red-500',
        text: 'text-red-500',
        badge: 'bg-red-500/10 text-red-500 border-red-500/20',
        label: 'Developing',
        ring: 'ring-red-500/30',
        glow: '0 0 20px rgba(239,68,68,0.15)',
    };
}

export function compositeLabel(score: number): string {
    if (score >= 70) return 'Strong Creditworthiness';
    if (score >= 45) return 'Moderate Creditworthiness';
    return 'Developing Creditworthiness';
}

export function compositeInterpretation(score: number): string {
    if (score >= 70) {
        return 'Your profile indicates a reliable repayment pattern and strong financial discipline.';
    }
    if (score >= 45) {
        return 'Your profile shows moderate financial responsibility with room for improvement.';
    }
    return 'Your profile suggests some financial risk. This will be considered in your evaluation.';
}
