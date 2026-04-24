<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TimelineController extends Controller
{
    public function __invoke(Request $request): Response
    {
        return Inertia::render('Admin/Timeline');
    }
}
