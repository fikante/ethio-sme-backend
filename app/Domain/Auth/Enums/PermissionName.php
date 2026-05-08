<?php

namespace App\Domain\Auth\Enums;

enum PermissionName: string
{
    case AuthLogout = 'auth.logout';
    case BusinessesSelfManage = 'businesses.self.manage';
    case PsychometricSubmit = 'psychometric.submit';
    case PaymentsSimulateInject = 'payments.simulate.inject';
    case ApplicationsSelfRead = 'applications.self.read';
    case ApplicationsPipelineView = 'applications.pipeline.view';
    case ApplicationsDetailView = 'applications.detail.view';
    case ApplicationsDecide = 'applications.decide';
    case ApplicationsRejectWithReason = 'applications.reject_with_reason';
    case ValuationsRun = 'valuations.run';
    case ValuationsRead = 'valuations.read';
    case MacroeconomicsManage = 'macroeconomics.manage';
    case FairnessAuditRun = 'fairness.audit.run';
    case FairnessAuditRead = 'fairness.audit.read';
    case DriftMetricsRead = 'drift.metrics.read';
    case AuditRead = 'audit.read';
    case ConsentsManage = 'consents.manage';
    case PrivacyErasureRequest = 'privacy.erasure.request';

    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
