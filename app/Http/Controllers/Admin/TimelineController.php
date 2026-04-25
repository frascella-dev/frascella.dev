<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Picture;
use App\Models\TimelineEntry;
use App\Services\Admin\TimelinePictureService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TimelineController extends Controller
{
    /**
     * Pre-defined kind values shown in the form. New values can be
     * introduced ad-hoc via the API but the dropdown stays curated.
     */
    private const KINDS = ['life', 'code', 'work', 'now', 'study', 'travel'];

    public function __construct(
        private readonly TimelinePictureService $pictures,
    ) {
    }

    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $kind = (string) $request->query('kind', '');

        $query = TimelineEntry::query()
            ->with(['pictures' => fn ($q) => $q->limit(1)])
            ->withCount('pictures');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('body', 'like', "%{$search}%");
            });
        }

        if ($kind !== '' && in_array($kind, self::KINDS, true)) {
            $query->where('kind', $kind);
        }

        $entries = $query
            ->chronological()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (TimelineEntry $e) => [
                'id' => $e->id,
                'year' => $e->year,
                'kind' => $e->kind,
                'title' => $e->title,
                'body_excerpt' => mb_substr($e->body, 0, 140),
                'sort_order' => $e->sort_order,
                'pictures_count' => $e->pictures_count,
                'cover_url' => $e->pictures->first()?->url(),
                'updated_at' => $e->updated_at?->toIso8601String(),
            ]);

        return Inertia::render('Admin/Timelines/Index', [
            'entries' => $entries,
            'filters' => [
                'search' => $search,
                'kind' => $kind ?: null,
            ],
            'kinds' => self::KINDS,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Timelines/Create', [
            'kinds' => self::KINDS,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validatePayload($request);

        $entry = DB::transaction(function () use ($data, $request) {
            $entry = TimelineEntry::create([
                'year' => $data['year'],
                'kind' => $data['kind'],
                'title' => $data['title'],
                'body' => $data['body'],
            ]);

            foreach ($request->file('pictures', []) as $i => $file) {
                $this->pictures->attach($entry, $file, $i);
            }

            return $entry;
        });

        return redirect()
            ->route('admin.settings.timelines.edit', $entry)
            ->with('flash', 'Timeline entry created.');
    }

    public function edit(TimelineEntry $timeline): Response
    {
        $timeline->load('pictures');

        return Inertia::render('Admin/Timelines/Edit', [
            'entry' => [
                'id' => $timeline->id,
                'year' => $timeline->year,
                'kind' => $timeline->kind,
                'title' => $timeline->title,
                'body' => $timeline->body,
                'pictures' => $timeline->pictures->map(fn (Picture $p) => [
                    'id' => $p->id,
                    'url' => $p->url(),
                    'alt' => $p->alt,
                    'original_filename' => $p->original_filename,
                ])->values(),
            ],
            'kinds' => self::KINDS,
        ]);
    }

    public function update(Request $request, TimelineEntry $timeline): RedirectResponse
    {
        $data = $this->validatePayload($request);
        $removedIds = $request->validate([
            'removed_picture_ids' => ['array'],
            'removed_picture_ids.*' => ['integer'],
        ])['removed_picture_ids'] ?? [];

        DB::transaction(function () use ($data, $request, $timeline, $removedIds) {
            $timeline->fill([
                'year' => $data['year'],
                'kind' => $data['kind'],
                'title' => $data['title'],
                'body' => $data['body'],
            ])->save();

            foreach ($removedIds as $id) {
                $picture = Picture::find($id);
                if ($picture) {
                    $this->pictures->detach($timeline, $picture);
                }
            }

            $existingMax = (int) $timeline->pictures()
                ->max('picture_timeline_entry.sort_order');

            foreach ($request->file('pictures', []) as $i => $file) {
                $this->pictures->attach($timeline, $file, $existingMax + 1 + $i);
            }
        });

        return redirect()
            ->route('admin.settings.timelines.edit', $timeline)
            ->with('flash', 'Timeline entry updated.');
    }

    public function destroy(TimelineEntry $timeline): RedirectResponse
    {
        DB::transaction(function () use ($timeline) {
            // Detach all pictures first so orphan cleanup runs and the file
            // disk doesn't end up with abandoned blobs.
            foreach ($timeline->pictures()->get() as $picture) {
                $this->pictures->detach($timeline, $picture);
            }
            $timeline->delete();
        });

        return redirect()
            ->route('admin.settings.timelines.index')
            ->with('flash', 'Timeline entry deleted.');
    }

    /**
     * Swap an entry's sort_order with the row immediately above or below it
     * in the chronological order. Up/down arrows drive this from the list.
     */
    public function move(Request $request, TimelineEntry $timeline): RedirectResponse
    {
        $direction = $request->validate([
            'direction' => ['required', Rule::in(['up', 'down'])],
        ])['direction'];

        $ordered = TimelineEntry::query()
            ->chronological()
            ->get();

        $index = $ordered->search(fn ($e) => $e->id === $timeline->id);
        if ($index === false) {
            return back();
        }

        $neighborIndex = $direction === 'up' ? $index - 1 : $index + 1;
        if ($neighborIndex < 0 || $neighborIndex >= $ordered->count()) {
            return back();
        }

        // Normalize sort_order across the full list so swaps are stable
        // even when some rows still have NULL sort_order.
        DB::transaction(function () use ($ordered, $index, $neighborIndex) {
            foreach ($ordered as $i => $entry) {
                $entry->forceFill(['sort_order' => $i])->save();
            }
            $a = $ordered[$index];
            $b = $ordered[$neighborIndex];
            [$a->sort_order, $b->sort_order] = [$b->sort_order, $a->sort_order];
            $a->save();
            $b->save();
        });

        return back();
    }

    /**
     * Validation rules shared by store/update.
     *
     * @return array{year:int, kind:string, title:string, body:string}
     */
    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'year' => ['required', 'integer', 'min:1900', 'max:2100'],
            'kind' => ['required', 'string', 'max:32'],
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:8000'],
            'pictures' => ['nullable', 'array'],
            'pictures.*' => [
                'image',
                'mimes:jpg,jpeg,png,webp,avif,gif',
                'max:' . ProfileController::uploadLimitKb(),
            ],
        ]);
    }
}
