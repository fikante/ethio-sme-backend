export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'ui.theme';

function prefersDark(): boolean {
    return (
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-color-scheme: dark)').matches === true
    );
}

export function getStoredTheme(): ThemeMode {
    if (typeof window === 'undefined') {
        return 'system';
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') {
        return raw;
    }

    return 'system';
}

export function setStoredTheme(theme: ThemeMode) {
    window.localStorage.setItem(STORAGE_KEY, theme);
}

export function resolveTheme(theme: ThemeMode): 'light' | 'dark' {
    if (theme === 'system') {
        return prefersDark() ? 'dark' : 'light';
    }

    return theme;
}

export function applyThemeClass(theme: ThemeMode) {
    if (typeof document === 'undefined') {
        return;
    }

    const resolved = resolveTheme(theme);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export function initTheme() {
    if (typeof window === 'undefined') {
        return;
    }

    const current = getStoredTheme();
    applyThemeClass(current);

    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) {
        return;
    }

    const onChange = () => {
        if (getStoredTheme() === 'system') {
            applyThemeClass('system');
        }
    };

    media.addEventListener?.('change', onChange);
}

