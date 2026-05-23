import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/ThemeToggle';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="relative flex min-h-screen flex-col items-center bg-gray-50 pt-6 text-gray-900 dark:bg-zinc-950 dark:text-zinc-100 sm:justify-center sm:pt-0">
            <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
                <ThemeToggle />
            </div>

            <div className="mt-8">
                <Link href="/">
                    <ApplicationLogo className="h-20 w-20 fill-current text-gray-700 dark:text-zinc-200" />
                </Link>
            </div>

            <div className="mt-6 w-full overflow-hidden border border-gray-200 bg-white px-6 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:max-w-md sm:rounded-2xl">
                {children}
            </div>
        </div>
    );
}
