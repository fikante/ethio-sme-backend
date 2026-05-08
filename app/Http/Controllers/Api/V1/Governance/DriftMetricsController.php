<?php

namespace App\Http\Controllers\Api\V1\Governance;

use App\Http\Controllers\Controller;
use App\Models\DriftMetric;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class DriftMetricsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', DriftMetric::class);

        $metrics = QueryBuilder::for(DriftMetric::class)
            ->allowedFilters([
                AllowedFilter::exact('business_id'),
                AllowedFilter::exact('horizon_days'),
            ])
            ->allowedSorts(['evaluated_at', 'mape'])
            ->paginate(50);

        return response()->json($metrics);
    }
}
