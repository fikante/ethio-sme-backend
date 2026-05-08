<?php

namespace App\Http\Controllers\Api\V1\Business;

use App\Domain\Business\Actions\CreateBusinessAction;
use App\Domain\Business\Actions\UpdateBusinessAction;
use App\Domain\Business\Data\BusinessData;
use App\Domain\Business\Data\BusinessUpdateData;
use App\Domain\Business\Requests\StoreBusinessRequest;
use App\Domain\Business\Requests\UpdateBusinessRequest;
use App\Http\Controllers\Controller;
use App\Models\Business;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BusinessController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Business::class);

        $query = Business::query();

        if (! $request->user()->hasAnyRole(['loan_officer', 'super_admin'])) {
            $query->ownedBy($request->user()->id);
        }

        return response()->json($query->orderByDesc('created_at')->paginate(20));
    }

    public function show(Business $business): JsonResponse
    {
        $this->authorize('view', $business);

        return response()->json($business->load(['owner', 'psychometricAssessment']));
    }

    public function store(StoreBusinessRequest $request, CreateBusinessAction $action): JsonResponse
    {
        $this->authorize('create', Business::class);

        $business = $action->execute(BusinessData::fromRequest($request, $request->user()->id));

        return response()->json($business, 201);
    }

    public function update(
        UpdateBusinessRequest $request,
        Business $business,
        UpdateBusinessAction $action
    ): JsonResponse {
        $this->authorize('update', $business);

        $business = $action->execute($business, BusinessUpdateData::fromRequest($request));

        return response()->json($business);
    }
}
