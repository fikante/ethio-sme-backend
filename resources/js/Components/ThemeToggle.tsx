import {
    applyThemeClass,
    getStoredTheme,
    resolveTheme,
    setStoredTheme,
    type ThemeMode,
} from '@/theme';
import { useEffect, useState } from 'react';

export default function ThemeToggle({ className = '' }: { className?: string }) {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const sync = () => {
            setIsDark(resolveTheme(getStoredTheme()) === 'dark');
        };

        sync();

        window.addEventListener('storage', sync);
        return () => window.removeEventListener('storage', sync);
    }, []);

    const setTheme = (mode: ThemeMode) => {
        setStoredTheme(mode);
        applyThemeClass(mode);
        setIsDark(mode === 'dark');
    };

    return (
        <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={[
                'relative inline-flex h-9 w-14 items-center rounded-full border p-1 shadow-sm transition',
                'border-gray-200 bg-white hover:bg-gray-100',
                'focus:outline-none focus:ring-2 focus:ring-gray-400/50',
                'dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700',
                'dark:focus:ring-zinc-500/50',
                className,
            ].join(' ')}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            <span
                className={[
                    'pointer-events-none grid h-7 w-7 place-items-center rounded-full shadow transition-transform duration-300',
                    'bg-gray-100 text-gray-700',
                    'dark:bg-zinc-950 dark:text-zinc-200',
                    isDark ? 'translate-x-5' : 'translate-x-0',
                ].join(' ')}
            >
                {isDark ? (
                    <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"
                        />
                    </svg>
                ) : (
                    <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 18a6 6 0 1 0-6-6 6 6 0 0 0 6 6z"
                        />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20v2" />
                    </svg>
                )}
            </span>
        </button>
    );
}
