<?php

namespace Tests\Unit;

use App\Domain\TimeSeries\Services\ImportTransactionHeartbeatService;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

class ImportTransactionHeartbeatServiceTest extends TestCase
{
    public function test_parses_daily_csv_format(): void
    {
        $service = new ImportTransactionHeartbeatService;
        $csv = implode("\n", [
            'Transaction_Date,Daily_Total_Inflow,Daily_Total_Outflow',
            ...array_map(
                fn (int $i) => sprintf('2025-01-%02d,1000,500', $i),
                range(1, 15)
            ),
        ]);

        $tmp = tempnam(sys_get_temp_dir(), 'csv');
        file_put_contents($tmp, $csv);

        $parsed = $this->invokePrivate($service, 'parseCsv', [$tmp]);
        $daily = $this->invokePrivate($service, 'normalizeToDailyAggregates', [$parsed]);

        unlink($tmp);

        $this->assertCount(15, $parsed);
        $this->assertCount(15, $daily);
        $this->assertSame(1000.0, $daily['2025-01-01']['inflow']);
        $this->assertSame(500.0, $daily['2025-01-01']['outflow']);
    }

    public function test_aggregates_transaction_level_rows_by_date(): void
    {
        $service = new ImportTransactionHeartbeatService;
        $rows = [
            [
                'transaction_date' => '2025-02-01',
                'credit' => '1000',
                'debit' => '0',
            ],
            [
                'transaction_date' => '2025-02-01',
                'credit' => '0',
                'debit' => '200',
            ],
            [
                'transaction_date' => '2025-02-02',
                'credit' => '0',
                'debit' => '150',
            ],
        ];

        $daily = $this->invokePrivate($service, 'normalizeToDailyAggregates', [$rows]);

        $this->assertSame(1000.0, $daily['2025-02-01']['inflow']);
        $this->assertSame(200.0, $daily['2025-02-01']['outflow']);
        $this->assertSame(0.0, $daily['2025-02-02']['inflow']);
        $this->assertSame(150.0, $daily['2025-02-02']['outflow']);
    }

    /**
     * @param  array<int, mixed>  $args
     */
    private function invokePrivate(object $object, string $method, array $args): mixed
    {
        $reflection = new ReflectionClass($object);
        $callable = $reflection->getMethod($method);
        $callable->setAccessible(true);

        return $callable->invoke($object, ...$args);
    }
}
