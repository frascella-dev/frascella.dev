<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnalyticsEvent extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'page_visit_id',
        'name',
        'properties',
        'user_id',
        'session_id',
        'created_at',
    ];

    protected $casts = [
        'properties' => 'array',
        'created_at' => 'datetime',
    ];

    public function pageVisit(): BelongsTo
    {
        return $this->belongsTo(PageVisit::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
