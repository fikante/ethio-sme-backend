import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function PlaceholderPage({
    title,
    description,
}: {
    title: string;
    description?: string;
}) {
    return (
        <AuthenticatedLayout header={<h2>{title}</h2>}>
            <Head title={title} />

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
                <div className="text-sm font-medium text-gray-500 dark:text-white/60">Placeholder</div>
                <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{title}</div>
                <div className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-white/70">
                    {description ?? 'This page is scaffolded from the PRD and will be implemented next.'}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

