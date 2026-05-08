<?php

namespace App\Http\Controllers\Api\V1\Compliance;

use App\Domain\Compliance\Actions\RequestErasureAction;
use App\Domain\Compliance\Data\ErasureRequestData;
use App\Domain\Compliance\Requests\ErasureRequest;
use App\Http\Controllers\Controller;
use App\Models\DataSubjectRequest;
use Illuminate\Http\JsonResponse;

class ErasureRequestController extends Controller
{
    public function store(ErasureRequest $request, RequestErasureAction $action): JsonResponse
    {
        $this->authorize('request', DataSubjectRequest::class);

        $record = $action->execute(ErasureRequestData::fromRequest($request, $request->user()->id));

        return response()->json($record, 201);
    }
}
