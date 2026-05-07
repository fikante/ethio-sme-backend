<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json([
    'ok' => true,
    'service' => 'ethio-sme-backend',
    'ts' => now()->toIso8601String(),
]));

// Catch-all: serve the SPA shell for every route
Route::get('/{any}', fn () => view('app'))->where('any', '.*');
