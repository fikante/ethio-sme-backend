<?php

namespace App\Domain\TimeSeries\Services;

use App\Domain\TimeSeries\Exceptions\TransactionImportException;
use App\Domain\TimeSeries\Support\SupabaseHeartbeatSchema;
use App\Models\Business;
use App\Models\SmeDailyHeartbeat;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class ImportTransactionHeartbeatService
{
    public const MIN_DAILY_ROWS = 45;

    public const SOURCE_TYPE_APPLICATION_UPLOAD = SupabaseHeartbeatSchema::SOURCE_TYPE_APP_UPLOAD;

    /**
     * Parse upload, replace prior application uploads for this business, persist daily heartbeat rows.
     *
     * @return int Number of daily rows stored
     */
    public function import(Business $business, UploadedFile $file): int
    {
        $parsedRows = $this->parseUpload($file);

        if ($parsedRows === []) {
            throw new TransactionImportException(
                'No transaction rows found. Check that your file has a header row and data.'
            );
        }

        $dailyRows = $this->normalizeToDailyAggregates($parsedRows);

        if (count($dailyRows) < self::MIN_DAILY_ROWS) {
            throw new TransactionImportException(
                'At least '.self::MIN_DAILY_ROWS.' days of transaction history are required for AI forecasting. '.
                'Your file only produced '.count($dailyRows).' day(s).'
            );
        }

        $now = now();

        DB::transaction(function () use ($business, $dailyRows, $now): void {
            SmeDailyHeartbeat::query()
                ->forBusiness($business)
                ->where('source_type', self::SOURCE_TYPE_APPLICATION_UPLOAD)
                ->delete();

            $omitNetCashflow = SupabaseHeartbeatSchema::omitNetCashflowOnInsert();

            $payload = [];
            foreach ($dailyRows as $date => $metrics) {
                $inflow = round($metrics['inflow'], 2);
                $outflow = round($metrics['outflow'], 2);

                $row = [
                    'business_uuid' => $business->uuid,
                    'transaction_date' => $date,
                    'daily_total_inflow' => $inflow,
                    'daily_total_outflow' => $outflow,
                    'end_of_day_balance' => round($metrics['balance'] ?? 0, 2),
                    'txn_count' => (int) $metrics['txn_count'],
                    'unique_cust_count' => (int) ($metrics['unique_cust_count'] ?? 0),
                    'channel' => $this->truncateForColumn(
                        $metrics['channel'] ?? 'cbe_upload',
                        SupabaseHeartbeatSchema::MAX_CHANNEL_LENGTH,
                    ),
                    'sector_mcc' => $this->truncateForColumn(
                        $business->sector,
                        SupabaseHeartbeatSchema::MAX_SECTOR_MCC_LENGTH,
                    ),
                    'location_region' => $this->truncateForColumn($business->sub_city, 64),
                    'source_type' => self::SOURCE_TYPE_APPLICATION_UPLOAD,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];

                if (! $omitNetCashflow) {
                    $row['net_cashflow'] = round($inflow - $outflow, 2);
                }

                $payload[] = $row;
            }

            foreach (array_chunk($payload, 500) as $chunk) {
                SmeDailyHeartbeat::insert($chunk);
            }
        });

        return count($dailyRows);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function parseUpload(UploadedFile $file): array
    {
        $extension = strtolower($file->getClientOriginalExtension());

        return match ($extension) {
            'csv', 'txt' => $this->parseCsv($file->getRealPath() ?: ''),
            'xlsx', 'xls' => $this->parseSpreadsheet($file->getRealPath() ?: ''),
            default => throw new TransactionImportException('Unsupported file type. Upload CSV or Excel (.csv, .xlsx).'),
        };
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function parseCsv(string $path): array
    {
        $handle = fopen($path, 'r');
        if ($handle === false) {
            throw new TransactionImportException('Could not read the uploaded CSV file.');
        }

        $headers = fgetcsv($handle, escape: '\\');
        if ($headers === false) {
            fclose($handle);
            throw new TransactionImportException('CSV file has no header row.');
        }

        $normalizedHeaders = $this->normalizeHeaders($headers);
        $rows = [];

        while (($line = fgetcsv($handle, escape: '\\')) !== false) {
            if ($this->isEmptyLine($line)) {
                continue;
            }

            $row = [];
            foreach ($normalizedHeaders as $index => $key) {
                $row[$key] = $line[$index] ?? null;
            }
            $rows[] = $row;
        }

        fclose($handle);

        return $rows;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function parseSpreadsheet(string $path): array
    {
        try {
            $spreadsheet = IOFactory::load($path);
        } catch (\Throwable $e) {
            throw new TransactionImportException('Could not read the Excel file. Try saving as CSV and upload again.');
        }

        $sheet = $spreadsheet->getActiveSheet();
        $matrix = $sheet->toArray(null, true, true, false);

        if ($matrix === [] || ! isset($matrix[0])) {
            throw new TransactionImportException('Excel file is empty.');
        }

        $headers = array_map(
            fn ($cell) => is_string($cell) ? $cell : (string) $cell,
            $matrix[0],
        );
        $normalizedHeaders = $this->normalizeHeaders($headers);
        $rows = [];

        for ($i = 1, $count = count($matrix); $i < $count; $i++) {
            $line = $matrix[$i];
            if ($this->isEmptyLine($line)) {
                continue;
            }

            $row = [];
            foreach ($normalizedHeaders as $index => $key) {
                $row[$key] = $line[$index] ?? null;
            }
            $rows[] = $row;
        }

        return $rows;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, array{inflow: float, outflow: float, txn_count: int, balance: float}>
     */
    private function normalizeToDailyAggregates(array $rows): array
    {
        if ($this->isPreAggregatedDailyFormat($rows)) {
            return $this->fromPreAggregatedRows($rows);
        }

        return $this->aggregateTransactionRows($rows);
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    private function isPreAggregatedDailyFormat(array $rows): bool
    {
        $sample = $rows[0] ?? [];

        return isset($sample['daily_total_inflow'], $sample['daily_total_outflow'])
            || isset($sample['daily_inflow'], $sample['daily_outflow'])
            || (isset($sample['inflow'], $sample['outflow']) && ! isset($sample['amount']));
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, array{inflow: float, outflow: float, txn_count: int, balance: float, unique_cust_count: int, channel: string}>
     */
    private function fromPreAggregatedRows(array $rows): array
    {
        $daily = [];

        foreach ($rows as $row) {
            $date = $this->parseDate($row['transaction_date'] ?? $row['date'] ?? null);
            if ($date === null) {
                continue;
            }

            $inflow = $this->toFloat($row['daily_total_inflow'] ?? $row['daily_inflow'] ?? $row['inflow'] ?? 0);
            $outflow = $this->toFloat($row['daily_total_outflow'] ?? $row['daily_outflow'] ?? $row['outflow'] ?? 0);

            $daily[$date] = [
                'inflow' => $inflow,
                'outflow' => $outflow,
                'txn_count' => (int) ($row['txn_count'] ?? $row['transaction_count'] ?? 1),
                'balance' => $this->toFloat($row['end_of_day_balance'] ?? $row['balance'] ?? 0),
                'unique_cust_count' => (int) ($row['unique_cust_count'] ?? $row['unique_customers'] ?? 0),
                'channel' => trim((string) ($row['channel'] ?? '')) ?: 'cbe_upload',
            ];
        }

        return $daily;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, array{inflow: float, outflow: float, txn_count: int, balance: float, unique_cust_count: int, channel: string}>
     */
    private function aggregateTransactionRows(array $rows): array
    {
        $daily = [];

        foreach ($rows as $row) {
            $date = $this->parseDate($row['transaction_date'] ?? $row['date'] ?? $row['trans_date'] ?? null);
            if ($date === null) {
                continue;
            }

            if (! isset($daily[$date])) {
                $daily[$date] = [
                    'inflow' => 0.0,
                    'outflow' => 0.0,
                    'txn_count' => 0,
                    'balance' => 0.0,
                    'unique_cust_count' => 0,
                    'channel' => trim((string) ($row['channel'] ?? '')) ?: 'cbe_upload',
                ];
            }

            $credit = $this->toFloat($row['credit'] ?? $row['deposit'] ?? 0);
            $debit = $this->toFloat($row['debit'] ?? $row['withdrawal'] ?? 0);
            $amount = $this->toFloat($row['amount'] ?? $row['value'] ?? 0);
            $type = strtolower(trim((string) ($row['type'] ?? $row['dr_cr'] ?? $row['credit_debit'] ?? '')));

            if ($credit > 0) {
                $daily[$date]['inflow'] += $credit;
            } elseif ($debit > 0) {
                $daily[$date]['outflow'] += $debit;
            } elseif ($amount > 0) {
                if (in_array($type, ['credit', 'cr', 'in', 'deposit', 'inflow'], true)) {
                    $daily[$date]['inflow'] += $amount;
                } elseif (in_array($type, ['debit', 'dr', 'out', 'withdrawal', 'outflow'], true)) {
                    $daily[$date]['outflow'] += $amount;
                } else {
                    // Unknown type: treat positive amount as inflow (common for CBE credits)
                    $daily[$date]['inflow'] += $amount;
                }
            }

            $daily[$date]['txn_count']++;
            $balance = $this->toFloat($row['balance'] ?? $row['end_of_day_balance'] ?? 0);
            if ($balance > 0) {
                $daily[$date]['balance'] = $balance;
            }
        }

        return $daily;
    }

    private function truncateForColumn(string $value, int $maxLength): string
    {
        $trimmed = trim($value);

        return mb_strlen($trimmed) <= $maxLength
            ? $trimmed
            : mb_substr($trimmed, 0, $maxLength);
    }

    /**
     * @param  list<string|null>  $headers
     * @return array<int, string>
     */
    private function normalizeHeaders(array $headers): array
    {
        $map = [
            'transaction_date' => 'transaction_date',
            'date' => 'transaction_date',
            'trans_date' => 'transaction_date',
            'daily_total_inflow' => 'daily_total_inflow',
            'daily_inflow' => 'daily_total_inflow',
            'inflow' => 'inflow',
            'total_inflow' => 'daily_total_inflow',
            'credit' => 'credit',
            'daily_total_outflow' => 'daily_total_outflow',
            'daily_outflow' => 'daily_total_outflow',
            'outflow' => 'outflow',
            'total_outflow' => 'daily_total_outflow',
            'debit' => 'debit',
            'amount' => 'amount',
            'value' => 'amount',
            'type' => 'type',
            'dr_cr' => 'dr_cr',
            'credit_debit' => 'credit_debit',
            'txn_count' => 'txn_count',
            'transaction_count' => 'txn_count',
            'end_of_day_balance' => 'end_of_day_balance',
            'balance' => 'balance',
            'net_cashflow' => 'net_cashflow',
            'net_cash_flow' => 'net_cashflow',
            'unique_cust_count' => 'unique_cust_count',
            'unique_customers' => 'unique_cust_count',
            'channel' => 'channel',
        ];

        $normalized = [];
        foreach ($headers as $index => $header) {
            $key = preg_replace('/[^a-z0-9]+/', '_', strtolower(trim((string) $header)));
            $key = trim($key, '_');
            $normalized[$index] = $map[$key] ?? $key;
        }

        return $normalized;
    }

    private function parseDate(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_numeric($value)) {
            try {
                return ExcelDate::excelToDateTimeObject((float) $value)->format('Y-m-d');
            } catch (\Throwable) {
                return null;
            }
        }

        try {
            return Carbon::parse((string) $value)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    private function toFloat(mixed $value): float
    {
        if ($value === null || $value === '') {
            return 0.0;
        }

        if (is_numeric($value)) {
            return (float) $value;
        }

        $cleaned = preg_replace('/[^0-9.\-]/', '', (string) $value) ?? '0';

        return (float) $cleaned;
    }

    /**
     * @param  list<mixed>  $line
     */
    private function isEmptyLine(array $line): bool
    {
        foreach ($line as $cell) {
            if ($cell !== null && trim((string) $cell) !== '') {
                return false;
            }
        }

        return true;
    }
}
