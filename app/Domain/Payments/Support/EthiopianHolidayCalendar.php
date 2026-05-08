<?php

namespace App\Domain\Payments\Support;

use Carbon\CarbonInterface;

/**
 * Static fixed-date holidays for the PoC. Replace with a configurable table
 * in Phase 2 if Ethiopian movable feasts (e.g. Easter) need accurate handling.
 */
class EthiopianHolidayCalendar
{
    /**
     * @var list<array{month:int, day:int}>
     */
    private const HOLIDAYS = [
        ['month' => 1,  'day' => 7],
        ['month' => 1,  'day' => 19],
        ['month' => 3,  'day' => 2],
        ['month' => 4,  'day' => 23],
        ['month' => 5,  'day' => 1],
        ['month' => 5,  'day' => 5],
        ['month' => 5,  'day' => 28],
        ['month' => 9,  'day' => 11],
        ['month' => 9,  'day' => 27],
    ];

    public function isHoliday(CarbonInterface $date): bool
    {
        foreach (self::HOLIDAYS as $holiday) {
            if ($date->month === $holiday['month'] && $date->day === $holiday['day']) {
                return true;
            }
        }

        return false;
    }
}
