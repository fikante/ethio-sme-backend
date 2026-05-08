<?php

namespace App\Domain\Valuation\Actions;

use App\Models\ShapExplanation;
use App\Models\Valuation;
use Illuminate\Support\Facades\DB;

class PersistShapExplanationsAction
{
    /**
     * @param  array<string, float>  $shapValues
     * @return list<ShapExplanation>
     */
    public function execute(Valuation $valuation, array $shapValues): array
    {
        return DB::transaction(function () use ($valuation, $shapValues): array {
            ShapExplanation::query()->where('valuation_id', $valuation->id)->delete();

            $sorted = $shapValues;
            uasort($sorted, static fn ($a, $b) => abs((float) $b) <=> abs((float) $a));

            $created = [];
            $sortOrder = 0;
            foreach ($sorted as $featureKey => $shapValue) {
                $created[] = ShapExplanation::create([
                    'valuation_id' => $valuation->id,
                    'feature_key' => (string) $featureKey,
                    'shap_value' => (float) $shapValue,
                    'sort_order' => $sortOrder++,
                ]);
            }

            return $created;
        });
    }
}
