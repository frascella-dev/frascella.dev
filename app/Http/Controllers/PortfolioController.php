<?php

namespace App\Http\Controllers;

use App\Http\Resources\TimelineEntryResource;
use App\Services\TimelineService;
use Inertia\Inertia;
use Inertia\Response;

class PortfolioController extends Controller
{
    public function __construct(private readonly TimelineService $timeline)
    {
    }

    public function __invoke(): Response
    {
        return Inertia::render('Portfolio', [
            'timeline' => TimelineEntryResource::collection(
                $this->timeline->getTimeline()
            )->resolve(),
        ]);
    }
}
