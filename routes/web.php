<?php

use App\Domain\Auth\Support\WebRoleAlias;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Web\Admin\ModelTrainingController;
use App\Http\Controllers\Web\Admin\UserManagementController;
use App\Http\Controllers\Web\Borrower\SmeValuationController;
use App\Http\Controllers\Web\DashboardController;
use App\Http\Controllers\Web\Lender\ApplicationDetailController;
use App\Http\Controllers\Web\Lender\ApplicationsPipelineController;
use App\Http\Controllers\Web\Lender\DecisioningController;
use App\Http\Controllers\Web\Lender\RiskAndForecastController;
use App\Http\Controllers\Web\LoanApplicationWebController;
use App\Http\Controllers\Web\PsychometricWebController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Landing', [
        'canLogin' => Route::has('login'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
})->name('landing');

Route::get('/dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::get('/psychometric-test', [PsychometricWebController::class, 'test'])
    ->name('psychometric.test');

Route::post('/psychometric-test/submit', [PsychometricWebController::class, 'storeFromToken'])
    ->name('psychometric.submit');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // SME Owner (Borrower) portal
    Route::middleware('role:'.implode('|', WebRoleAlias::middlewareRoleList('sme-owner')))->group(function () {
        Route::get('/loan-application', [LoanApplicationWebController::class, 'show'])
            ->name('loan-application');
        Route::post('/loan-application/submit', [LoanApplicationWebController::class, 'store'])
            ->name('loan-application.submit');
        Route::post('/loan-application/ensure-business', [LoanApplicationWebController::class, 'ensureBusiness'])
            ->name('loan-application.ensure-business');

        Route::get('/psychometrics', [PsychometricWebController::class, 'show'])
            ->name('psychometrics');
        Route::get('/integrations', [App\Http\Controllers\Web\Borrower\IntegrationsController::class, 'show'])
            ->name('integrations');
        Route::post('/integrations/simulate-chapa', [App\Http\Controllers\Web\Borrower\IntegrationsController::class, 'simulateChapa'])
            ->name('integrations.simulate-chapa');
        Route::get('/sme-valuation', [SmeValuationController::class, 'index'])
            ->name('sme.valuation');
        Route::post('/sme-valuation/{business}/run', [SmeValuationController::class, 'run'])
            ->name('sme.valuation.run');
    });

    // Loan provider (lender) portal
    Route::middleware('role:'.implode('|', WebRoleAlias::middlewareRoleList('loan_provider')))->group(function () {
        Route::get('/applications-pipeline', [ApplicationsPipelineController::class, 'index'])
            ->name('applications.pipeline');
        Route::post('/applications/{application}/evaluate', [ApplicationsPipelineController::class, 'evaluate'])
            ->name('applications.evaluate');
        Route::get('/lender/applications/{application}/detail', [ApplicationDetailController::class, 'show'])
            ->name('lender.application.detail');
        Route::get('/risk-forecast', [RiskAndForecastController::class, 'index'])
            ->name('risk.forecast');
        Route::get('/risk-forecast/{application}', [RiskAndForecastController::class, 'show'])
            ->name('risk.forecast.show');
        Route::post('/decisioning/{application}/decide', [DecisioningController::class, 'decide'])
            ->name('decisioning.decide');
        Route::get('/decisioning-xai', [DecisioningController::class, 'xaiDashboard'])
            ->name('decisioning.xai');
        Route::get('/decisioning-xai/{application}', [DecisioningController::class, 'show'])
            ->name('decisioning.xai.application');
    });

    // Super admin / audit
    Route::middleware('role:'.implode('|', WebRoleAlias::middlewareRoleList('super-admin')))->group(function () {
        Route::get('/admin/users', [UserManagementController::class, 'index'])
            ->name('admin.users');
        Route::post('/admin/users', [UserManagementController::class, 'store'])
            ->name('admin.users.store');
        Route::patch('/admin/users/{user}', [UserManagementController::class, 'update'])
            ->name('admin.users.update');
        Route::delete('/admin/users/{user}', [UserManagementController::class, 'destroy'])
            ->name('admin.users.destroy');

        Route::get('/admin/macroeconomic-factors', fn () => Inertia::render('Placeholders/MacroeconomicFactors'))
            ->name('admin.macroeconomic');
        Route::get('/admin/fairness-audit', fn () => Inertia::render('Placeholders/FairnessAudit'))
            ->name('admin.fairness');
        Route::get('/admin/model-training', [ModelTrainingController::class, 'index'])
            ->name('admin.model-training');
        Route::post('/admin/model-training', [ModelTrainingController::class, 'store'])
            ->name('admin.model-training.store');
        Route::post('/admin/model-training/{jobId}/sync', [ModelTrainingController::class, 'sync'])
            ->name('admin.model-training.sync');
    });
});

require __DIR__.'/auth.php';
