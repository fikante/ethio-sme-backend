<?php

namespace App\Domain\Payments\Enums;

enum TransactionSource: string
{
    case ChapaWebhook = 'chapa_webhook';
    case ChapaSimulated = 'chapa_simulated';
}
