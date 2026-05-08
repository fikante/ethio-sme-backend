<?php

use App\Http\Controllers\Api\V1\Admin\ExogenousFactorController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Business\BusinessController;
use App\Http\Controllers\Api\V1\Compliance\AuditLogController;
use App\Http\Controllers\Api\V1\Compliance\ConsentController;
use App\Http\Controllers\Api\V1\Compliance\ErasureRequestController;
use App\Http\Controllers\Api\V1\Governance\DriftMetricsController;
use App\Http\Controllers\Api\V1\Governance\FairnessAuditController;
use App\Http\Controllers\Api\V1\Lending\LoanApplicationController;
use App\Http\Controllers\Api\V1\Lending\LoanDecisionController;
use App\Http\Controllers\Api\V1\Payments\ChapaSimulatorController;
use App\Http\Controllers\Api\V1\Payments\ChapaWebhookController;
use App\Http\Controllers\Api\V1\Psychometric\PsychometricController;
use App\Http\Controllers\Api\V1\Valuation\ValuationController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API V1 Routes
|--------------------------------------------------------------------------
| Surface defined in PRD §8.5. Controllers stay thin: they authorise via
| policies, delegate to Actions/Services, and shape responses only.
*/

Route::prefix('v1')->group(function (): void {
    Route::prefix('auth')->group(function (): void {
        Route::post('register', [AuthController::class, 'register']);
        Route::post('login', [AuthController::class, 'login']);
        Route::post('refresh', [AuthController::class, 'refresh']);
    });

    Route::middleware('auth:api')->group(function (): void {
        Route::prefix('auth')->group(function (): void {
            Route::post('logout', [AuthController::class, 'logout'])
                ->middleware('permission:auth.logout');
            Route::get('me', [AuthController::class, 'me']);
        });

        Route::prefix('businesses')->group(function (): void {
            Route::get('/', [BusinessController::class, 'index']);
            Route::post('/', [BusinessController::class, 'store'])
                ->middleware('permission:businesses.self.manage');
            Route::get('/{business}', [BusinessController::class, 'show']);
            Route::patch('/{business}', [BusinessController::class, 'update'])
                ->middleware('permission:businesses.self.manage');

            Route::post('/{business}/psychometric-assessments', [PsychometricController::class, 'store'])
                ->middleware('permission:psychometric.submit');
            Route::post('/{business}/valuate', [ValuationController::class, 'run'])
                ->middleware('permission:valuations.run');
            Route::get('/{business}/valuation/latest', [ValuationController::class, 'latest'])
                ->middleware('permission:valuations.read');
        });

        Route::get('/psychometric/questions', [PsychometricController::class, 'questions']);

        Route::prefix('payments/chapa')->group(function (): void {
            Route::post('webhook', [ChapaWebhookController::class, 'store'])
                ->middleware('permission:payments.simulate.inject');
            Route::post('simulate', [ChapaSimulatorController::class, 'store'])
                ->middleware('permission:payments.simulate.inject');
        });

        Route::prefix('applications')->group(function (): void {
            Route::get('/', [LoanApplicationController::class, 'index']);
            Route::post('/', [LoanApplicationController::class, 'store'])
                ->middleware('permission:businesses.self.manage');
            Route::get('/{application}', [LoanApplicationController::class, 'show']);
            Route::post('/{application}/decision', LoanDecisionController::class)
                ->middleware('permission:applications.decide');
        });

        Route::prefix('me')->group(function (): void {
            Route::post('consents', [ConsentController::class, 'store'])
                ->middleware('permission:consents.manage');
            Route::post('privacy/erasure-requests', [ErasureRequestController::class, 'store'])
                ->middleware('permission:privacy.erasure.request');
        });

        // Governance read endpoints accessible to loan_officer + super_admin
        Route::prefix('admin')->group(function (): void {
            Route::get('fairness-audits', [FairnessAuditController::class, 'index'])
                ->middleware('permission:fairness.audit.read');
            Route::get('drift-metrics', [DriftMetricsController::class, 'index'])
                ->middleware('permission:drift.metrics.read');
        });

        // Super admin only mutation/audit surface
        Route::prefix('admin')->middleware('role:super_admin')->group(function (): void {
            Route::get('exogenous-factors', [ExogenousFactorController::class, 'index'])
                ->middleware('permission:macroeconomics.manage');
            Route::post('exogenous-factors', [ExogenousFactorController::class, 'store'])
                ->middleware('permission:macroeconomics.manage');

            Route::post('fairness-audits', [FairnessAuditController::class, 'store'])
                ->middleware('permission:fairness.audit.run');

            Route::get('audit-logs', [AuditLogController::class, 'index'])
                ->middleware('permission:audit.read');
        });
    });
});
