<?php

namespace App\Domain\Lending\Actions;

use App\Domain\Lending\Data\LoanProviderData;
use App\Models\LoanProvider;

class CreateLoanProviderAction
{
    public function execute(LoanProviderData $data): LoanProvider
    {
        return LoanProvider::create([
            'name'               => $data->name,
            'short_code'         => $data->short_code,
            'type'               => $data->type,
            'nbe_license_no'     => $data->nbe_license_no,
            'contact_email'      => $data->contact_email,
            'contact_phone'      => $data->contact_phone,
            'website'            => $data->website,
            'address'            => $data->address,
            'accepted_risk_bands' => $data->accepted_risk_bands,
            'min_loan_amount_etb' => $data->min_loan_amount_etb,
            'max_loan_amount_etb' => $data->max_loan_amount_etb,
            'base_interest_rate'  => $data->base_interest_rate,
            'logo_url'           => $data->logo_url,
            'status'             => $data->status,
        ]);
    }
}
