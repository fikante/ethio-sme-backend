<?php

namespace App\Http\Controllers\Api\V1\Compliance;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class AuditLogController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', AuditLog::class);

        $logs = QueryBuilder::for(AuditLog::class)
            ->allowedFilters([
                AllowedFilter::exact('action'),
                AllowedFilter::exact('actor_id'),
                AllowedFilter::exact('entity_type'),
                AllowedFilter::exact('entity_id'),
            ])
            ->orderByDesc('created_at')
            ->paginate(50);

        return response()->json($logs);
    }
}
