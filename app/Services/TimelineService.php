<?php

namespace App\Services;

use App\Models\TimelineEntry;
use Illuminate\Support\Collection;

class TimelineService
{
    /**
     * First node sits at this fraction of the spline path.
     */
    public const FRACTION_START = 0.16;

    /**
     * Last node sits at this fraction.
     */
    public const FRACTION_END = 0.84;

    /**
     * Return all timeline entries in chronological order, each enriched with
     * a `fraction` attribute equidistantly distributed between FRACTION_START
     * and FRACTION_END.
     *
     * Shape: Collection<TimelineEntry> with `fraction` accessor populated and
     * `pictures` relationship eager-loaded.
     */
    public function getTimeline(): Collection
    {
        $entries = TimelineEntry::query()
            ->with('pictures')
            ->chronological()
            ->get();

        return $this->withFractions($entries);
    }

    /**
     * Attach a `fraction` attribute to each entry. Pure function on the
     * collection's count — swap the source (DB, cache, fixture) without
     * touching this logic.
     */
    protected function withFractions(Collection $entries): Collection
    {
        $count = $entries->count();

        if ($count === 0) {
            return $entries;
        }

        if ($count === 1) {
            // Single node sits at the midpoint of [START, END] rather than
            // forcing it onto an edge.
            $entries->first()->setAttribute(
                'fraction',
                (self::FRACTION_START + self::FRACTION_END) / 2
            );
            return $entries;
        }

        $step = (self::FRACTION_END - self::FRACTION_START) / ($count - 1);

        foreach ($entries as $i => $entry) {
            $entry->setAttribute('fraction', self::FRACTION_START + ($i * $step));
        }

        return $entries;
    }
}
