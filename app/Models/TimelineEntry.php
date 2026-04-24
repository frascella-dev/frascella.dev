<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class TimelineEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'year',
        'kind',
        'title',
        'body',
        'sort_order',
    ];

    protected $casts = [
        'year' => 'integer',
        'sort_order' => 'integer',
    ];

    public function pictures(): BelongsToMany
    {
        return $this->belongsToMany(Picture::class, 'picture_timeline_entry')
            ->withPivot('sort_order')
            ->withTimestamps()
            ->orderByPivot('sort_order');
    }

    /**
     * Canonical chronological scope: respect explicit sort_order when set,
     * otherwise fall back to (year, id).
     */
    public function scopeChronological($query)
    {
        return $query
            ->orderByRaw('sort_order IS NULL')
            ->orderBy('sort_order')
            ->orderBy('year')
            ->orderBy('id');
    }
}
