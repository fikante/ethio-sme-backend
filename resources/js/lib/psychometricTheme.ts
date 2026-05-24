export type PsychometricThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'psychometric-theme';

export function getPsychometricTheme(): PsychometricThemeMode {
    if (typeof window === 'undefined') {
        return 'light';
    }

    return window.localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
}

export function setPsychometricTheme(theme: PsychometricThemeMode): void {
    window.localStorage.setItem(STORAGE_KEY, theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
}

export function initPsychometricTheme(): PsychometricThemeMode {
    const theme = getPsychometricTheme();
    setPsychometricTheme(theme);

    return theme;
}

export function restoreAppTheme(): void {
    const appTheme = window.localStorage.getItem('ui.theme') === 'dark' ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', appTheme === 'dark');
    document.documentElement.style.colorScheme = appTheme;
}
