const PREFIX = 'psychometric-completed:';

export function markPsychometricComplete(businessToken: string): void {
    localStorage.setItem(`${PREFIX}${businessToken}`, String(Date.now()));
    window.dispatchEvent(
        new CustomEvent('psychometric-completed', {
            detail: { token: businessToken },
        }),
    );
}

export function isPsychometricComplete(businessToken: string | null): boolean {
    if (!businessToken) {
        return false;
    }

    return localStorage.getItem(`${PREFIX}${businessToken}`) !== null;
}
