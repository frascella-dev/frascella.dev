<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactSubmission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactSubmissionsController extends Controller
{
    private const MAX_PER_PAGE = 50;
    private const DEFAULT_PER_PAGE = 20;

    /**
     * Paginated list of contact submissions, newest first. Status is derived
     * from sent_at / failed_at timestamps so the frontend doesn't have to
     * care about the queue mechanics.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', self::DEFAULT_PER_PAGE);
        $perPage = max(1, min(self::MAX_PER_PAGE, $perPage));

        $status = $request->query('status'); // optional: 'sent' | 'failed' | 'queued'
        $search = trim((string) $request->query('search', ''));
        $order = $request->query('order') === 'asc' ? 'asc' : 'desc';

        $query = ContactSubmission::query()->orderBy('id', $order);

        if ($status === 'sent') {
            $query->whereNotNull('sent_at');
        } elseif ($status === 'failed') {
            $query->whereNotNull('failed_at')->whereNull('sent_at');
        } elseif ($status === 'queued') {
            $query->whereNull('sent_at')->whereNull('failed_at');
        }

        if ($search !== '') {
            $needle = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $search) . '%';
            $query->where(function ($q) use ($needle) {
                $q->where('name', 'like', $needle)
                    ->orWhere('email', 'like', $needle)
                    ->orWhere('message', 'like', $needle);
            });
        }

        $page = $query->paginate($perPage);

        return response()->json([
            'data' => $page->getCollection()->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'email' => $s->email,
                'message' => $s->message,
                'status' => $this->statusOf($s),
                'created_at' => $s->created_at?->toIso8601String(),
                'sent_at' => $s->sent_at?->toIso8601String(),
                'failed_at' => $s->failed_at?->toIso8601String(),
            ])->all(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'last_page' => $page->lastPage(),
                'total' => $page->total(),
                'totals_by_status' => [
                    'sent' => ContactSubmission::whereNotNull('sent_at')->count(),
                    'failed' => ContactSubmission::whereNotNull('failed_at')
                        ->whereNull('sent_at')
                        ->count(),
                    'queued' => ContactSubmission::whereNull('sent_at')
                        ->whereNull('failed_at')
                        ->count(),
                ],
            ],
        ]);
    }

    private function statusOf(ContactSubmission $s): string
    {
        if ($s->sent_at !== null) {
            return 'sent';
        }
        if ($s->failed_at !== null) {
            return 'failed';
        }
        return 'queued';
    }
}
