<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Admin\DashboardMetricsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(private readonly DashboardMetricsService $metrics)
    {
    }

    public function __invoke(Request $request): Response
    {
        $range = (string) $request->query('range', DashboardMetricsService::DEFAULT_RANGE);
        $includeBots = filter_var(
            $request->query('bots', false),
            FILTER_VALIDATE_BOOL,
        );

        return Inertia::render('Admin/Dashboard', [
            'metrics' => $this->metrics->compute($range, $includeBots),
        ]);
    }
}
