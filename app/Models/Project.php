<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Project extends Model
{
    use HasFactory;

    public const TONE_INK = 'ink';
    public const TONE_PAPER = 'paper';
    public const TONE_ACCENT = 'accent';
    public const TONE_OUTLINE = 'outline';

    public const PICTURE_ROLE_PREVIEW = 'preview';
    public const PICTURE_ROLE_OTHER = 'other';

    protected $fillable = [
        'slug',
        'title',
        'tagline',
        'subtitle',
        'year',
        'duration',
        'client',
        'role',
        'team',
        'tone',
        'stack',
        'featured_metric_value',
        'featured_metric_label',
        'metrics',
        'credits',
        'context',
        'approach',
        'outcome',
        'external_url',
        'sort_order',
        'published_at',
    ];

    protected $casts = [
        'year' => 'integer',
        'sort_order' => 'integer',
        'stack' => 'array',
        'metrics' => 'array',
        'credits' => 'array',
        'published_at' => 'datetime',
    ];

    public function pictures(): BelongsToMany
    {
        return $this->belongsToMany(Picture::class, 'picture_project')
            ->withPivot('role', 'sort_order')
            ->withTimestamps()
            ->orderByPivot('sort_order');
    }

    /**
     * Single preview picture (DB guarantees at most one exists).
     */
    public function preview(): BelongsToMany
    {
        return $this->pictures()->wherePivot('role', self::PICTURE_ROLE_PREVIEW);
    }

    /**
     * Only projects that have been published (published_at in the past).
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }

    /**
     * Canonical listing order: respect explicit sort_order when set,
     * otherwise most-recent year first, then id.
     */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query
            ->orderByRaw('sort_order IS NULL')
            ->orderBy('sort_order')
            ->orderByDesc('year')
            ->orderByDesc('id');
    }
}
