<?php

namespace App\Domain\Lending\Actions;

use App\Models\LoanProvider;

class UpdateLoanProviderAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(LoanProvider $provider, array $data): LoanProvider
    {
        $provider->update($data);

        return $provider->fresh();
    }
}
