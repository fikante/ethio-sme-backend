import { Brain } from 'lucide-react';

export default function PsychometricTest() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-black text-white">
            <div className="px-6 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/30 bg-black">
                    <Brain className="h-10 w-10 text-white" />
                </div>
                <h1 className="mb-2 text-2xl font-bold text-white">
                    Psychometric Assessment
                </h1>
                <p className="text-sm text-white/60">
                    This assessment module is coming soon.
                </p>
                <p className="mt-4 text-xs text-white/50">
                    Return to the application and check &quot;I have completed the test.&quot;
                </p>
            </div>
        </div>
    );
}
