import { Link } from '@inertiajs/react';
import { Check, ChevronRight } from 'lucide-react';

export type JourneyStep = {
    done: boolean;
    label: string;
    detail?: string | null;
    href: string | null;
    action: string | null;
};

type Props = {
    steps: JourneyStep[];
    className?: string;
    embedded?: boolean;
};

const mutedClass = 'text-gray-500 dark:text-zinc-400';

export default function ApplicationJourneyPanel({
    steps,
    className = '',
    embedded = true,
}: Props) {
    const nextStep = steps.find((s) => !s.done && s.href);

    return (
        <aside
            className={`flex w-full shrink-0 flex-col lg:w-80 xl:w-96 ${className}`}
            aria-label="Application journey"
        >
            <div
                className={`flex min-h-0 flex-col overflow-hidden bg-white dark:bg-zinc-900 ${
                    embedded
                        ? 'sticky top-6 max-h-[calc(100vh-8rem)] rounded-2xl border border-gray-200 shadow-sm dark:border-zinc-800'
                        : ''
                }`}
            >
                <div className="border-b border-gray-200 px-5 py-4 dark:border-zinc-800">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                        Your Application Journey
                    </h2>
                    <p className={`mt-0.5 text-xs ${mutedClass}`}>
                        Complete each step to submit your loan application.
                    </p>
                </div>

                <ul className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
                    {steps.map((item) => (
                        <li key={item.label} className="flex items-start gap-3 rounded-lg px-2 py-2.5">
                            <span
                                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                                    item.done
                                        ? 'bg-green-600 text-white dark:bg-green-500'
                                        : 'border-2 border-gray-300 bg-transparent dark:border-zinc-600'
                                }`}
                            >
                                {item.done && (
                                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                )}
                            </span>
                            <div className="min-w-0 flex-1 text-sm">
                                <span
                                    className={
                                        item.done
                                            ? 'font-medium text-gray-900 dark:text-zinc-100'
                                            : mutedClass
                                    }
                                >
                                    {item.label}
                                </span>
                                {item.detail && (
                                    <span className={`mt-0.5 block text-xs ${mutedClass}`}>
                                        {item.detail}
                                    </span>
                                )}
                                {!item.done && item.href && item.action && (
                                    <Link
                                        href={item.href}
                                        className="mt-1 inline-flex items-center gap-0.5 text-xs font-medium text-gray-900 hover:underline dark:text-white"
                                    >
                                        {item.action}
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </Link>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>

                {nextStep?.href && nextStep.action && (
                    <div className="border-t border-gray-200 p-4 dark:border-zinc-800">
                        <Link
                            href={nextStep.href}
                            className="flex w-full items-center justify-center gap-1 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                        >
                            Continue: {nextStep.action}
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </div>
                )}
            </div>
        </aside>
    );
}
