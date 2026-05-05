<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ExogenousFactor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExogenousFactorController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(ExogenousFactor::orderByDesc('effective_date')->paginate(30));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'effective_date'  => 'required|date|after_or_equal:today',
            'nbe_policy_rate' => 'required|numeric|min:0|max:1',
            'inflation_rate'  => 'required|numeric|min:0|max:1',
            'usd_etb_rate'    => 'nullable|numeric|min:0',
            'notes'           => 'nullable|string',
        ]);

        $factor = ExogenousFactor::create([
            ...$data,
            'updated_by' => auth('api')->id(),
        ]);

        return response()->json($factor, 201);
    }
}

