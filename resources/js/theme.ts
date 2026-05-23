export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'ui.theme';

/** Default theme for new visitors and when no preference is stored. */
export const DEFAULT_THEME: ThemeMode = 'light';

export function getStoredTheme(): ThemeMode {
    if (typeof window === 'undefined') {
        return DEFAULT_THEME;
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (raw === 'dark') {
        return 'dark';
    }

    // `light`, legacy `system`, or missing → light (product default)
    return 'light';
}

export function setStoredTheme(theme: ThemeMode): void {
    window.localStorage.setItem(STORAGE_KEY, theme);
}

export function resolveTheme(theme: ThemeMode): ThemeMode {
    return theme === 'dark' ? 'dark' : 'light';
}

export function applyThemeClass(theme: ThemeMode): void {
    if (typeof document === 'undefined') {
        return;
    }

    const resolved = resolveTheme(theme);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.documentElement.style.colorScheme = resolved;
}

export function initTheme(): void {
    if (typeof window === 'undefined') {
        return;
    }

    applyThemeClass(getStoredTheme());

    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY) {
            applyThemeClass(getStoredTheme());
        }
    });
}
