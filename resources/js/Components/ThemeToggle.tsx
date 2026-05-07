import { useEffect, useState } from 'react';
import { applyThemeClass, getStoredTheme, resolveTheme, setStoredTheme } from '@/theme';

export default function ThemeToggle({ className = '' }: { className?: string }) {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const stored = getStoredTheme();
        setIsDark(resolveTheme(stored) === 'dark');
    }, []);

    return (
        <button
            type="button"
            onClick={() => {
                const nextIsDark = !isDark;
                setIsDark(nextIsDark);
                setStoredTheme(nextIsDark ? 'dark' : 'light');
                applyThemeClass(nextIsDark ? 'dark' : 'light');
            }}
            className={[
                'relative inline-flex h-9 w-14 items-center rounded-full border border-black/10 bg-gray-100 p-1 shadow-sm transition',
                'hover:bg-gray-200/70 focus:outline-none focus:ring-2 focus:ring-gray-900',
                'dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15 dark:focus:ring-white/40',
                className,
            ].join(' ')}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            <span
                className={[
                    'pointer-events-none grid h-7 w-7 place-items-center rounded-full bg-white text-gray-700 shadow transition-transform duration-300',
                    'dark:bg-black dark:text-white/80',
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

