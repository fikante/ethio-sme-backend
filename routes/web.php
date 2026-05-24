<?php

use App\Domain\Auth\Support\WebRoleAlias;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Web\Admin\ModelTrainingController;
use App\Http\Controllers\Web\Borrower\SmeValuationController;
use App\Http\Controllers\Web\DashboardController;
use App\Http\Controllers\Web\LoanApplicationWebController;
use App\Http\Controllers\Web\Lender\RiskAndForecastController;
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

Route::get('/psychometric-test', fn () => Inertia::render('Borrower/PsychometricTest'))
    ->name('psychometric-test');

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

        Route::get('/psychometrics', fn () => Inertia::render('Placeholders/Psychometrics'))
            ->name('psychometrics');
        Route::get('/integrations', fn () => Inertia::render('Placeholders/Integrations'))
            ->name('integrations');
        Route::get('/sme-valuation', [SmeValuationController::class, 'index'])
            ->name('sme.valuation');
        Route::post('/sme-valuation/{business}/run', [SmeValuationController::class, 'run'])
            ->name('sme.valuation.run');
    });

    // Loan Provider (Lender) portal
    Route::middleware('role:'.implode('|', WebRoleAlias::middlewareRoleList('loan-provider')))->group(function () {
        Route::get('/applications-pipeline', fn () => Inertia::render('Placeholders/ApplicationsPipeline'))
            ->name('applications.pipeline');
        Route::get('/risk-forecast', [RiskAndForecastController::class, 'index'])
            ->name('risk.forecast');
        Route::get('/decisioning-xai', fn () => Inertia::render('Placeholders/DecisioningAndXAI'))
            ->name('decisioning.xai');
    });

    // Super admin / audit
    Route::middleware('role:'.implode('|', WebRoleAlias::middlewareRoleList('super-admin')))->group(function () {
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
