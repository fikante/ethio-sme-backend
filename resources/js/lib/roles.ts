/** Canonical + legacy Spatie role names for loan provider users. */
export const LOAN_PROVIDER_ROLES = [
    'loan_provider',
    'loan_officer',
    'loan-provider',
] as const;

export function isLoanProviderRole(role: string | null | undefined): boolean {
    if (!role) return false;
    return (LOAN_PROVIDER_ROLES as readonly string[]).includes(role);
}
