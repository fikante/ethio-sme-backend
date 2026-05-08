<?php

namespace App\Domain\Compliance\Enums;

enum AuditAction: string
{
    case AuthLogin = 'auth.login';
    case AuthLogout = 'auth.logout';
    case AuthRefresh = 'auth.refresh';
    case AuthRegister = 'auth.register';
    case BusinessCreated = 'business.created';
    case BusinessUpdated = 'business.updated';
    case PsychometricSubmitted = 'psychometric.submitted';
    case PaymentsSimulated = 'payments.simulated';
    case PaymentsWebhookIngested = 'payments.webhook_ingested';
    case ValuationRun = 'valuation.run';
    case LoanApplicationCreated = 'lending.application_created';
    case LoanDecisionApproved = 'lending.decision_approved';
    case LoanDecisionRejected = 'lending.decision_rejected';
    case ExogenousFactorsUpserted = 'macroeconomics.upserted';
    case FairnessAuditRun = 'governance.fairness_audit_run';
    case DriftMetricsRecorded = 'governance.drift_metrics_recorded';
    case ConsentGranted = 'compliance.consent_granted';
    case ConsentWithdrawn = 'compliance.consent_withdrawn';
    case ErasureRequested = 'compliance.erasure_requested';
    case SecurityIncidentLogged = 'compliance.security_incident_logged';
}
