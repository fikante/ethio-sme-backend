<?php

namespace App\Domain\Dashboard\Services;

use App\Domain\Auth\Enums\RoleName;
use App\Domain\Valuation\Actions\CheckAiEngineHealthAction;
use App\Domain\Valuation\Services\ShapLabelService;
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
            RoleName::LoanProvider->value => self::loanProvider(),
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

        if (self::hasAnyRole($names, RoleName::loanProviderRoleNames())) {
            return RoleName::LoanProvider->value;
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
        $business = $user->businesses()->latest()->first();

        $application        = null;
        $valuation          = null;
        $shapDrivers        = ['boosters' => [], 'drags' => []];
        $psychoAssessment   = null;
        $cashflowTrend      = [];
        $txnActivity        = null;
        $coverageDays       = 0;
        $healthScore        = 0;

        if ($business) {
            // Latest loan application with its associated valuation
            $application = LoanApplication::query()
                ->with('valuation')
                ->where('business_id', $business->id)
                ->latest()
                ->first();

            // Latest completed valuation (prefer the one linked to application)
            $valuation = $application?->valuation
                ?? $business->valuations()->latest('inferred_at')->first();

            // SHAP drivers — categorised into friendly booster/drag buckets
            if ($valuation && ! empty($valuation->shap_values)) {
                $raw = is_array($valuation->shap_values)
                    ? $valuation->shap_values
                    : json_decode((string) $valuation->shap_values, true) ?? [];

                if (! empty($raw)) {
                    $shapDrivers = ShapLabelService::categorise($raw);
                }
            }

            // Most recently completed psychometric assessment
            $psychoAssessment = $business->psychometricAssessments()
                ->latest('completed_at')
                ->first();

            // Cash flow trend: last 30 calendar days, ascending order for chart
            $dateCol = \App\Domain\TimeSeries\Support\SupabaseHeartbeatSchema::dateColumn();
            $cashflowTrend = SmeDailyHeartbeat::query()
                ->forBusiness($business)
                ->orderByDesc($dateCol)
                ->limit(30)
                ->get([$dateCol, 'net_cashflow'])
                ->reverse()
                ->values()
                ->map(fn (SmeDailyHeartbeat $h) => [
                    'date' => ($h->heartbeat_date ?? $h->transaction_date)?->toDateString() ?? '',
                    'net'  => (float) ($h->net_cashflow ?? 0),
                ])
                ->toArray();

            // Transaction activity: avg txn_count last 14 days vs prior 14 days
            $txnCountCol = \App\Domain\TimeSeries\Support\SupabaseHeartbeatSchema::txnCountColumn();
            $recent14 = (float) (SmeDailyHeartbeat::query()
                ->forBusiness($business)
                ->orderByDesc($dateCol)
                ->limit(14)
                ->avg($txnCountCol) ?? 0);

            $prior14 = (float) (SmeDailyHeartbeat::query()
                ->forBusiness($business)
                ->orderByDesc($dateCol)
                ->skip(14)
                ->limit(14)
                ->avg($txnCountCol) ?? 0);

            $txnActivity = [
                'avg_recent' => round($recent14, 1),
                'trend_pct'  => $prior14 > 0
                    ? round((($recent14 - $prior14) / $prior14) * 100, 1)
                    : 0,
                'direction'  => $recent14 >= $prior14 ? 'up' : 'down',
            ];

            // Data coverage: distinct calendar days with heartbeat records
            $coverageDays = SmeDailyHeartbeat::query()
                ->forBusiness($business)
                ->distinct($dateCol)
                ->count($dateCol);

            // Financial health composite (0–100)
            // Weights: cash-flow consistency 40%, cash-flow strength 35%, psychometric 25%
            $totalDays = max($coverageDays, 1);
            $positiveDays = SmeDailyHeartbeat::query()
                ->forBusiness($business)
                ->where('net_cashflow', '>', 0)
                ->count();
            $consistencyPct   = $positiveDays / $totalDays;

            $avgNet = (float) (SmeDailyHeartbeat::query()
                ->forBusiness($business)
                ->avg('net_cashflow') ?? 0);
            $cashflowStrength = min(max($avgNet / 50000, 0), 1);

            $psychoScore = $psychoAssessment?->composite_score
                ? ((float) $psychoAssessment->composite_score / 100)
                : 0.5;

            $healthScore = (int) round(
                ($consistencyPct * 40) + ($cashflowStrength * 35) + ($psychoScore * 25)
            );
        }

        $hasAssessment    = $psychoAssessment !== null;
        $heartbeatCount   = $coverageDays;

        return [
            // Legacy keys retained so existing Dashboard code that still references them keeps working
            'business' => $business ? [
                'name'   => $business->business_name,
                'sector' => $business->sector,
            ] : null,
            'heartbeatDays'  => $heartbeatCount,
            'hasAssessment'  => $hasAssessment,
            'application'    => $application ? [
                'id'               => $application->id,
                'status'           => $application->status,
                'requested_amount' => $application->requested_amount,
                'tenure_months'    => $application->requested_tenure_months,
                // npv_credit_limit retained for SmeLatestApplicationCard — not shown in new SME dashboard
                'npv_credit_limit' => null,
                'apr'              => $application->apr,
                'ai_risk_band'     => $application->ai_risk_band,
                'ai_risk_score'    => $application->ai_risk_score,
                'created_at'       => $application->created_at->toDateTimeString(),
            ] : null,
            'checklist' => [
                'businessRegistered'  => (bool) $business,
                'heartbeatLoaded'     => $heartbeatCount >= 45,
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

            // New keys for redesigned SME owner dashboard
            'latestApplication' => $application ? [
                'status'           => $application->status,
                'requested_amount' => (float) $application->requested_amount,
                'apr'              => $application->apr !== null ? (float) $application->apr : null,
                'risk_band'        => $application->ai_risk_band,
                'submitted_at'     => $application->created_at?->toDateString(),
            ] : null,
            'psychometricAssessment' => $psychoAssessment ? [
                'completed'       => (bool) $psychoAssessment->completed_at,
                'completed_at'    => $psychoAssessment->completed_at?->toDateString(),
                'composite_score' => $psychoAssessment->composite_score !== null
                    ? (float) $psychoAssessment->composite_score
                    : null,
            ] : null,
            'cashflowTrend'  => $cashflowTrend,
            'txnActivity'    => $txnActivity,
            'coverageDays'   => $coverageDays,
            'healthScore'    => $healthScore,
            'shapDrivers'    => $shapDrivers,
            'hasBusiness'    => (bool) $business,
        ];
    }

    private static function loanProvider(): array
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
            'dbHealth' => self::checkDbHealth(),
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
