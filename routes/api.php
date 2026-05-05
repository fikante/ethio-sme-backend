<?php

use App\Http\Controllers\Api\Admin\ExogenousFactorController;
use App\Http\Controllers\Api\ApplicationController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\ChapaSimulatorController;
use App\Http\Controllers\Api\PsychometricController;
use Illuminate\Support\Facades\Route;

// ──────────────── Public Auth Routes ────────────────
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login',    [AuthController::class, 'login']);
});

// ──────────────── Protected Routes ────────────────
Route::middleware('auth:api')->group(function () {

    // Auth
    Route::prefix('auth')->group(function () {
        Route::post('logout',  [AuthController::class, 'logout']);
        Route::post('refresh', [AuthController::class, 'refresh']);
        Route::get('me',       [AuthController::class, 'me']);
    });

    // Psychometric (SME Owner)
    Route::prefix('psychometric')->group(function () {
        Route::get('questions',   [PsychometricController::class, 'questions']);
        Route::post('submit',     [PsychometricController::class, 'submit']);
    });

    // Chapa Simulation
    Route::prefix('chapa')->group(function () {
        Route::post('simulate',  [ChapaSimulatorController::class, 'simulate']);
        Route::post('webhook',   [ChapaSimulatorController::class, 'webhook']);
    });

    // Loan Applications (Loan Officer + SME Owner)
    Route::prefix('applications')->group(function () {
        Route::get('/',                                    [ApplicationController::class, 'index']);
        Route::post('/',                                   [ApplicationController::class, 'store']);
        Route::get('/{application}',                       [ApplicationController::class, 'show']);
        Route::post('/{application}/evaluate',             [ApplicationController::class, 'evaluate']);
        Route::patch('/{application}/decision',            [ApplicationController::class, 'decision']);
    });

    // Super Admin Routes
    Route::middleware('role:super_admin')->prefix('admin')->group(function () {
        Route::get('exogenous-factors',  [ExogenousFactorController::class, 'index']);
        Route::post('exogenous-factors', [ExogenousFactorController::class, 'store']);
    });
});

