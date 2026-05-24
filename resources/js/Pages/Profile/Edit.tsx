import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { surfaceCard } from '@/lib/uiTheme';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({
    mustVerifyEmail,
    status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-900 dark:text-white">
                    Profile
                </h2>
            }
        >
            <Head title="Profile" />

            <div className="bg-white py-12 dark:bg-black">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    <div className={`p-4 sm:rounded-lg sm:p-8 ${surfaceCard}`}>
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                            className="max-w-xl"
                        />
                    </div>

                    <div className={`p-4 sm:rounded-lg sm:p-8 ${surfaceCard}`}>
                        <UpdatePasswordForm className="max-w-xl" />
                    </div>

                    <div className={`p-4 sm:rounded-lg sm:p-8 ${surfaceCard}`}>
                        <DeleteUserForm className="max-w-xl" />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
