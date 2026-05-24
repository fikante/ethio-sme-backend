<?php

namespace App\Domain\Dashboard\Services;

use App\Domain\Auth\Enums\RoleName;
use App\Domain\Valuation\Actions\CheckAiEngineHealthAction;
use App\Models\AiTrainingJob;
use App\Models\AuditLog;
use App\Models\Business;
use App\Models\FairnessAudit;
use App\Models\LoanApplication;
use App\Models\SmeDailyHeartbeat;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DashboardStatsService
{
    public static function getForRole(User $user): array
    {
        return match (self::resolveRole($user)) {
            RoleName::SmeOwner->value => self::smeOwner($user),
            RoleName::LoanOfficer->value => self::loanOfficer(),
            RoleName::SuperAdmin->value => self::superAdmin(),
            default => [],
        };
    }

    public static function resolveRole(User $user): string
    {
        $names = $user->getRoleNames();

        if (self::hasAnyRole($names, ['super_admin', 'super-admin'])) {
            return RoleName::SuperAdmin->value;
        }

        if (self::hasAnyRole($names, ['loan_officer', 'loan-provider'])) {
            return RoleName::LoanOfficer->value;
        }

        return RoleName::SmeOwner->value;
    }

    /** @param  Collection<int, string>  $names */
    private static function hasAnyRole(Collection $names, array $candidates): bool
    {
        return $names->contains(fn (string $name) => in_array($name, $candidates, true));
    }

    private static function smeOwner(User $user): array
    {
        $business = $user->businesses()->first();
        $application = $business
            ? LoanApplication::query()
                ->with('valuation')
                ->where('business_id', $business->id)
                ->latest()
                ->first()
            : null;
        $heartbeatCount = $business
            ? SmeDailyHeartbeat::query()->forBusiness($business)->count()
            : 0;
        $hasAssessment = $business
            ? $business->psychometricAssessments()->exists()
            : false;

        return [
            'business' => $business ? [
                'name' => $business->business_name,
                'sector' => $business->sector,
            ] : null,
            'heartbeatDays' => $heartbeatCount,
            'hasAssessment' => $hasAssessment,
            'application' => $application ? [
                'id' => $application->id,
                'status' => $application->status,
                'requested_amount' => $application->requested_amount,
                'tenure_months' => $application->requested_tenure_months,
                'npv_credit_limit' => $application->npv_credit_limit,
                'apr' => $application->apr,
                'ai_risk_band' => $application->ai_risk_band,
                'ai_risk_score' => $application->ai_risk_score,
                'created_at' => $application->created_at->toDateTimeString(),
            ] : null,
            'checklist' => [
                'businessRegistered' => (bool) $business,
                'heartbeatLoaded' => $heartbeatCount >= 45,
                'assessmentCompleted' => $hasAssessment,
                'applicationSubmitted' => (bool) $application,
                'aiEvaluated' => $application && in_array($application->status, [
                    LoanApplication::STATUS_EVALUATED,
                    LoanApplication::STATUS_APPROVED,
                    LoanApplication::STATUS_REJECTED,
                ], true),
                'decisionReceived' => $application && in_array($application->status, [
                    LoanApplication::STATUS_APPROVED,
                    LoanApplication::STATUS_REJECTED,
                ], true),
            ],
        ];
    }

    private static function loanOfficer(): array
    {
        $counts = LoanApplication::query()
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $attentionCount = ($counts[LoanApplication::STATUS_EVALUATED] ?? 0)
            + ($counts[LoanApplication::STATUS_QUEUED_FOR_AI] ?? 0)
            + ($counts[LoanApplication::STATUS_PROCESSING] ?? 0);

        $recent = LoanApplication::query()
            ->with('business')
            ->orderByRaw("CASE status
                WHEN 'evaluated' THEN 1
                WHEN 'queued_for_ai' THEN 2
                WHEN 'processing' THEN 3
                ELSE 4 END")
            ->orderByDesc('created_at')
            ->limit(8)
            ->get()
            ->map(fn (LoanApplication $application) => [
                'id' => $application->id,
                'business_id' => $application->business_id,
                'business_name' => $application->business?->business_name,
                'sector' => $application->business?->sector,
                'requested_amount' => $application->requested_amount,
                'status' => $application->status,
                'ai_risk_band' => $application->ai_risk_band,
                'created_at' => $application->created_at->toDateTimeString(),
            ])
            ->values()
            ->all();

        return [
            'counts' => $counts,
            'attentionCount' => $attentionCount,
            'todayApproved' => LoanApplication::query()
                ->where('status', LoanApplication::STATUS_APPROVED)
                ->whereDate('updated_at', today())
                ->count(),
            'todayRejected' => LoanApplication::query()
                ->where('status', LoanApplication::STATUS_REJECTED)
                ->whereDate('updated_at', today())
                ->count(),
            'recentApps' => $recent,
            'aiHealth' => self::checkAiHealth(),
            'dbHealth' => self::checkDbHealth(),
        ];
    }

    private static function superAdmin(): array
    {
        $appsByStatus = LoanApplication::query()
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $lastAudit = FairnessAudit::query()->latest()->first();
        $lastTraining = AiTrainingJob::query()->latest()->first();

        return [
            'totalBusinesses' => Business::query()->count(),
            'totalApplications' => LoanApplication::query()->count(),
            'appsByStatus' => $appsByStatus,
            'lastAuditDate' => $lastAudit?->created_at?->toDateTimeString(),
            'lastTraining' => $lastTraining ? [
                'status' => $lastTraining->status,
                'updated_at' => $lastTraining->updated_at->toDateTimeString(),
            ] : null,
            'aiHealth' => self::checkAiHealth(),
            'recentActivity' => AuditLog::query()
                ->with('actor')
                ->orderByDesc('created_at')
                ->limit(5)
                ->get()
                ->map(fn (AuditLog $log) => [
                    'created_at' => $log->created_at?->toDateTimeString(),
                    'action' => $log->action,
                    'actor_name' => $log->actor?->name ?? 'System',
                    'entity_type' => $log->entity_type,
                ])
                ->values()
                ->all(),
        ];
    }

    private static function checkAiHealth(): array
    {
        try {
            $start = microtime(true);
            $payload = app(CheckAiEngineHealthAction::class)->execute();
            $latency = (int) round((microtime(true) - $start) * 1000);
            $rawStatus = strtolower((string) ($payload['status'] ?? 'unknown'));

            return [
                'status' => in_array($rawStatus, ['healthy', 'ok'], true) ? 'healthy' : 'degraded',
                'latency' => $latency,
            ];
        } catch (\Throwable) {
            return [
                'status' => 'unreachable',
                'latency' => null,
            ];
        }
    }

    /**
     * @return array{status: string, latency: int|null, host: string}
     */
    private static function checkDbHealth(): array
    {
        try {
            $start = microtime(true);
            DB::select('SELECT 1');
            $latency = (int) round((microtime(true) - $start) * 1000);

            return [
                'status' => 'connected',
                'latency' => $latency,
                'host' => 'Supabase',
            ];
        } catch (\Throwable) {
            return [
                'status' => 'error',
                'latency' => null,
                'host' => 'Supabase',
            ];
        }
    }
}
