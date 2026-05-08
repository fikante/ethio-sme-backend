<?php

namespace App\Http\Controllers\Api\V1\Compliance;

use App\Domain\Compliance\Actions\RecordConsentAction;
use App\Domain\Compliance\Data\ConsentData;
use App\Domain\Compliance\Requests\ConsentRequest;
use App\Http\Controllers\Controller;
use App\Models\Consent;
use Illuminate\Http\JsonResponse;

class ConsentController extends Controller
{
    public function store(ConsentRequest $request, RecordConsentAction $action): JsonResponse
    {
        $this->authorize('manage', Consent::class);

        $consent = $action->execute(ConsentData::fromRequest($request, $request->user()->id));

        return response()->json($consent, 201);
    }
}
