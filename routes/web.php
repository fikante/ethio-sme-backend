<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Landing', [
        'canLogin' => Route::has('login'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    // PRD-derived placeholder routes (empty implementation)
    Route::get('/integrations', fn () => Inertia::render('Placeholders/Integrations'))->name('integrations');
    Route::get('/psychometrics', fn () => Inertia::render('Placeholders/Psychometrics'))->name('psychometrics');
    Route::get('/sme-valuation', fn () => Inertia::render('Placeholders/SMEValuation'))->name('sme.valuation');
    Route::get('/applications/pipeline', fn () => Inertia::render('Placeholders/ApplicationsPipeline'))->name('applications.pipeline');
    Route::get('/risk-forecast', fn () => Inertia::render('Placeholders/RiskAndForecast'))->name('risk.forecast');
    Route::get('/decisioning-xai', fn () => Inertia::render('Placeholders/DecisioningAndXAI'))->name('decisioning.xai');
    Route::get('/macroeconomic-factors', fn () => Inertia::render('Placeholders/MacroeconomicFactors'))->name('admin.macroeconomic');
    Route::get('/fairness-audit', fn () => Inertia::render('Placeholders/FairnessAudit'))->name('admin.fairness');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
