<?php

namespace App\Http\Controllers\Web;

use App\Domain\Auth\Enums\RoleName;
use App\Domain\Valuation\Actions\CheckAiEngineHealthAction;
use App\Http\Controllers\Controller;
use App\Models\AiTrainingJob;
use App\Models\AuditLog;
use App\Models\Business;
use App\Models\FairnessAudit;
use App\Models\LoanApplication;
use App\Models\SmeDailyHeartbeat;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        /** @var User $user */
        $user = auth()->user();
        $role = $user->getRoleNames()->first();

        $stats = match ($role) {
            RoleName::SmeOwner->value => $this->smeOwnerStats($user),
            RoleName::LoanOfficer->value => $this->loanOfficerStats(),
            RoleName::SuperAdmin->value => $this->superAdminStats(),
            default => [],
        };

        return Inertia::render('Dashboard', [
            'role' => $role,
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
            ],
            'stats' => $stats,
        ]);
    }

    private function smeOwnerStats(User $user): array
    {
        $business = $user->businesses()->first();
        $application = $business
            ? LoanApplication::query()
                ->where('business_id', $business->id)
                ->latest()
                ->first()
            : null;
        $heartbeatCount = $business
            ? SmeDailyHeartbeat::query()->where('business_id', $business->id)->count()
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

    private function loanOfficerStats(): array
    {
        $counts = LoanApplication::query()
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $todayApproved = LoanApplication::query()
            ->where('status', LoanApplication::STATUS_APPROVED)
            ->whereDate('updated_at', today())
            ->count();

        $todayRejected = LoanApplication::query()
            ->where('status', LoanApplication::STATUS_REJECTED)
            ->whereDate('updated_at', today())
            ->count();

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
            'todayApproved' => $todayApproved,
            'todayRejected' => $todayRejected,
            'recentApps' => $recent,
            'aiHealth' => $this->checkAiHealth(),
        ];
    }

    private function superAdminStats(): array
    {
        $appsByStatus = LoanApplication::query()
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $lastAudit = FairnessAudit::query()->latest()->first();
        $lastTraining = AiTrainingJob::query()->latest()->first();
        $aiHealth = $this->checkAiHealth();

        $recentActivity = AuditLog::query()
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
            ->all();

        return [
            'totalBusinesses' => Business::query()->count(),
            'totalApplications' => LoanApplication::query()->count(),
            'appsByStatus' => $appsByStatus,
            'lastAuditDate' => $lastAudit?->created_at?->toDateTimeString(),
            'lastTraining' => $lastTraining ? [
                'status' => $lastTraining->status,
                'updated_at' => $lastTraining->updated_at->toDateTimeString(),
            ] : null,
            'aiHealth' => $aiHealth,
            'recentActivity' => $recentActivity,
        ];
    }

    private function checkAiHealth(): array
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
}
