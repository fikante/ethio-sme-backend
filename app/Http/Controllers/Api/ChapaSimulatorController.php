<?php

namespace App\Http\Controllers\Api;

use App\Domain\Transactions\Services\ChapaWebhookSimulatorService;
use App\Domain\Transactions\Services\TransactionAggregatorService;
use App\Http\Controllers\Controller;
use App\Models\Business;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChapaSimulatorController extends Controller
{
    public function __construct(
        private readonly ChapaWebhookSimulatorService $simulator,
        private readonly TransactionAggregatorService $aggregator
    ) {}

    /**
     * Simulate 60 days of Chapa transactions for a business,
     * then aggregate them into the time-series heartbeat table.
     */
    public function simulate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id' => 'required|exists:businesses,id',
            'days'        => 'nullable|integer|min:30|max:90',
        ]);

        $business = Business::findOrFail($data['business_id']);
        $days     = $data['days'] ?? 60;

        $transactions = $this->simulator->simulate($business, $days);
        $this->aggregator->aggregateAll($business, $days);

        // Update application status
        $application = $business->loanApplications()
            ->where('status', 'pending_data_sync')
            ->latest()
            ->first();

        $application?->update(['status' => 'queued_for_ai']);

        return response()->json([
            'message'            => "Simulated {$days} days of transaction data",
            'transactions_count' => count($transactions),
            'heartbeat_days'     => $days,
            'application_status' => $application?->status,
        ]);
    }

    /**
     * Receive a single webhook payload (for real-time simulation during demo).
     */
    public function webhook(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'event'              => 'required|string',
            'data'               => 'required|array',
            'data.trx_ref'       => 'required|string',
            'data.amount'        => 'required|numeric',
            'data.status'        => 'required|in:success,failed,pending',
            'data.payment_method'=> 'required|string',
            'data.created_at'    => 'required|date',
        ]);

        // In a real system, verify Chapa webhook signature here

        return response()->json(['received' => true], 200);
    }
}

