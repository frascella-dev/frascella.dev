<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class PortfolioController extends Controller
{
    /**
     * First {@see self::PROJECT_LIMIT} projects from config land on the Work
     * grid. Anything beyond stays in the config but isn't shipped over the
     * wire to the public page.
     */
    private const PROJECT_LIMIT = 5;

    /**
     * Where the timeline's first node sits along the spline path.
     */
    private const FRACTION_START = 0.16;
    private const FRACTION_END = 0.84;

    public function __invoke(): Response
    {
        return Inertia::render('Public/Portfolio', [
            'timeline' => $this->timeline(),
            'projects' => $this->projects(),
        ]);
    }

    /**
     * Hydrate the configured timeline entries with synthetic ids and the
     * fraction value the spline path consumes for placement.
     *
     * @return array<int, array<string, mixed>>
     */
    private function timeline(): array
    {
        $entries = array_values((array) config('portfolio.timeline', []));
        $count = count($entries);

        if ($count === 0) {
            return [];
        }

        $hydrated = [];
        foreach ($entries as $i => $entry) {
            $hydrated[] = array_merge(
                [
                    'pictures' => [],
                ],
                $entry,
                [
                    'id' => $i + 1,
                    'fraction' => $this->fractionFor($i, $count),
                ],
            );
        }

        return $hydrated;
    }

    /**
     * Take the top N configured projects, attach a synthetic id, and pass
     * them through unchanged otherwise.
     *
     * @return array<int, array<string, mixed>>
     */
    private function projects(): array
    {
        return collect(config('portfolio.projects', []))
            ->take(self::PROJECT_LIMIT)
            ->values()
            ->map(fn(array $project, int $i) => array_merge(
                ['stack' => [], 'preview' => null],
                $project,
                ['id' => $i + 1],
            ))
            ->all();
    }

    private function fractionFor(int $index, int $count): float
    {
        if ($count === 1) {
            return (self::FRACTION_START + self::FRACTION_END) / 2;
        }

        $step = (self::FRACTION_END - self::FRACTION_START) / ($count - 1);

        return self::FRACTION_START + ($index * $step);
    }
}
