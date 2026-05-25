<?php

namespace App\Domain\TimeSeries\Actions;

use App\Domain\TimeSeries\Services\ImportTransactionHeartbeatService;
use App\Models\Business;
use Illuminate\Http\UploadedFile;

class ImportTransactionHeartbeatAction
{
    public function __construct(
        private readonly ImportTransactionHeartbeatService $importer,
    ) {}

    public function execute(Business $business, UploadedFile $file): int
    {
        return $this->importer->import($business, $file);
    }
}
