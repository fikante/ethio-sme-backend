<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'ai_engine' => [
        'url' => env('AI_SERVICE_URL', 'http://localhost:8000'),
        'key' => env('AI_SERVICE_KEY', env('AI_SERVICE_TOKEN')),
        'token' => env('AI_SERVICE_KEY', env('AI_SERVICE_TOKEN')),
        'timeout' => (int) env('AI_SERVICE_TIMEOUT', 60),
        'retries' => (int) env('AI_SERVICE_RETRIES', 1),
        'contract_version' => env('AI_SERVICE_CONTRACT_VERSION', 'v1'),
        'fallback_enabled' => filter_var(env('AI_SERVICE_FALLBACK_ENABLED', true), FILTER_VALIDATE_BOOLEAN),
        // Connection string for the external Python FastAPI service (same Supabase DB as Laravel).
        'database_url' => env('DATABASE_URL') ?: sprintf(
            'postgresql://%s:%s@%s:%s/%s?sslmode=%s',
            rawurlencode((string) env('DB_USERNAME', '')),
            rawurlencode((string) env('DB_PASSWORD', '')),
            env('DB_HOST', '127.0.0.1'),
            env('DB_PORT', '5432'),
            env('DB_DATABASE', 'postgres'),
            env('DB_SSLMODE', 'require'),
        ),
    ],

];
