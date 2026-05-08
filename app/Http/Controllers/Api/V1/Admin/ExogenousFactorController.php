<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Macroeconomics\Actions\UpsertExogenousFactorsAction;
use App\Domain\Macroeconomics\Data\ExogenousFactorsData;
use App\Domain\Macroeconomics\Requests\StoreExogenousFactorsRequest;
use App\Http\Controllers\Controller;
use App\Models\ExogenousFactor;
use Illuminate\Http\JsonResponse;

class ExogenousFactorController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', ExogenousFactor::class);

        return response()->json(
            ExogenousFactor::query()
                ->orderByDesc('effective_date')
                ->paginate(30)
        );
    }

    public function store(
        StoreExogenousFactorsRequest $request,
        UpsertExogenousFactorsAction $action
    ): JsonResponse {
        $this->authorize('manage', ExogenousFactor::class);

        $factor = $action->execute(ExogenousFactorsData::fromRequest($request, $request->user()->id));

        return response()->json($factor, 201);
    }
}
