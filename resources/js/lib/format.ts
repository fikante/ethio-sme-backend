export function formatEtb(value: number | string | null | undefined): string {
    if (value === null || value === undefined) {
        return "Pending Full Data";
    }
    const n = Number(value);
    if (Number.isNaN(n)) {
        return String(value);
    }
    return `ETB ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/** Display risk scores stored as 0–1 fractions as percentages with one decimal. */
export function formatPercentFraction(
    value: number | string | null | undefined,
): string {
    if (value === null || value === undefined) {
        return "—";
    }
    const n = Number(value);
    if (Number.isNaN(n)) {
        return "—";
    }
    return `${(n * 100).toFixed(1)}%`;
}

export function formatFeatureName(key: string): string {
    return key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}
