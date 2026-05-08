<?php

namespace App\Http\Controllers\Api\V1\Payments;

use App\Domain\Payments\Actions\InjectSyntheticStatementAction;
use App\Domain\Payments\Data\SimulationRequestData;
use App\Domain\Payments\Requests\SimulateStatementRequest;
use App\Domain\TimeSeries\Services\DailyHeartbeatAggregatorService;
use App\Http\Controllers\Controller;
use App\Models\Business;
use Illuminate\Http\JsonResponse;

class ChapaSimulatorController extends Controller
{
    public function store(
        SimulateStatementRequest $request,
        InjectSyntheticStatementAction $action,
        DailyHeartbeatAggregatorService $aggregator
    ): JsonResponse {
        $business = Business::findOrFail((int) $request->input('business_id'));

        $this->authorize('simulate', $business);

        $simulation = SimulationRequestData::fromRequest($request);
        $result = $action->execute($business, $simulation);
        $aggregator->aggregateWindow($business, $simulation->days);

        return response()->json([
            'message' => "Simulated {$simulation->days} days of transaction data",
            'transactions_count' => $result['transactions_count'],
            'heartbeat_days' => $simulation->days,
        ]);
    }
}
