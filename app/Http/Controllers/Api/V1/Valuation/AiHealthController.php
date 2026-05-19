<?php

namespace App\Http\Controllers\Api\V1\Valuation;

use App\Domain\Valuation\Actions\CheckAiEngineHealthAction;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class AiHealthController extends Controller
{
    public function __invoke(CheckAiEngineHealthAction $action): JsonResponse
    {
        return response()->json($action->execute());
    }
}
