import ThemeToggle from '@/Components/ThemeToggle';
import { Link } from '@inertiajs/react';
import { PropsWithChildren, ReactNode } from 'react';

type PublicPageChromeProps = PropsWithChildren<{
    showHomeLink?: boolean;
    topRight?: ReactNode;
}>;

/**
 * Shared shell for marketing + auth pages: persisted theme, toggle, light/dark surfaces.
 */
export default function PublicPageChrome({
    children,
    showHomeLink = true,
    topRight,
}: PublicPageChromeProps) {
    return (
        <div className="relative min-h-screen bg-gray-50 text-gray-900 dark:bg-zinc-950 dark:text-zinc-100">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute left-1/2 top-[-10rem] h-[26rem] w-[52rem] -translate-x-1/2 rounded-full bg-gray-200/60 blur-3xl dark:bg-white/5" />
                <div className="absolute bottom-[-10rem] right-[-12rem] h-[26rem] w-[26rem] rounded-full bg-gray-300/40 blur-3xl dark:bg-zinc-800/30" />
            </div>

            <div className="relative z-50 flex items-center justify-end gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
                {showHomeLink && (
                    <Link
                        href={route('landing')}
                        className="mr-auto text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                    >
                        ← Home
                    </Link>
                )}
                {topRight}
                <ThemeToggle />
            </div>

            <div className="relative z-10">{children}</div>
        </div>
    );
}
