<?php

namespace App\Http\Controllers\Api\V1\Payments;

use App\Domain\Payments\Actions\IngestChapaWebhookAction;
use App\Domain\Payments\Data\ChapaPayloadData;
use App\Domain\Payments\Requests\ChapaWebhookRequest;
use App\Http\Controllers\Controller;
use App\Models\Business;
use Illuminate\Http\JsonResponse;

class ChapaWebhookController extends Controller
{
    public function store(ChapaWebhookRequest $request, IngestChapaWebhookAction $action): JsonResponse
    {
        $business = Business::findOrFail((int) $request->input('business_id'));

        $this->authorize('ingestWebhook', $business);

        $payload = ChapaPayloadData::fromRequest($request);
        $idempotencyKey = $request->header('Idempotency-Key');

        $transaction = $action->execute($business, $payload, $idempotencyKey);

        return response()->json([
            'received' => true,
            'transaction_id' => $transaction->id,
        ], 200);
    }
}
