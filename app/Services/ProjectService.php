<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Collection;

class ProjectService
{
    /**
     * Max number of projects rendered on the Work grid. The frontend can
     * further slice this down on mobile, but we never ship more than this
     * over the wire.
     */
    public const LISTING_LIMIT = 5;

    /**
     * Projects to render on the Work grid — published only, ordered,
     * with their (at most one) preview picture eager-loaded.
     */
    public function getForListing(): Collection
    {
        return Project::query()
            ->with('preview')
            ->published()
            ->ordered()
            ->limit(self::LISTING_LIMIT)
            ->get();
    }
}
