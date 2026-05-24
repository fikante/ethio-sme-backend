/** App-wide monochrome surfaces and buttons (light: black / white; dark: inverted). */

/** Solid black button — use CSS class to beat @tailwindcss/forms resets */
export const btnPrimary = 'ui-btn-primary';

export const btnPrimarySm = 'ui-btn-primary ui-btn-primary-sm';

export const surfacePage = 'bg-white text-gray-900 dark:bg-black dark:text-white';

export const surfaceCard =
    'rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-black';

export const surfaceModal =
    'rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-black';

export const surfaceModalFooter =
    'border-t border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black';

export const inputField = (hasError?: boolean) =>
    `w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 dark:bg-black dark:text-white dark:placeholder:text-white/40 ${
        hasError
            ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30'
            : 'border-gray-300 focus:border-black focus:ring-black/20 dark:border-white/10 dark:focus:border-white dark:focus:ring-white/20'
    }`;

export const labelMuted =
    'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/50';

/** Selected role card — solid black (light) / white (dark) */
export const roleCardSelected = 'ui-role-selected';

export const roleCardUnselected =
    'border border-gray-200 bg-white text-gray-900 hover:border-gray-400 dark:border-white/10 dark:bg-black dark:text-white/90 dark:hover:border-white/30';

/** User avatar / profile circle */
export const avatarCircle = 'ui-avatar ui-avatar--md';

export const avatarCircleSm = 'ui-avatar ui-avatar--sm';
