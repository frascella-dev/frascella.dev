<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PageVisit extends Model
{
    // Append-only log — we never update an existing visit row.
    public $timestamps = false;

    protected $fillable = [
        'path',
        'query_string',
        'method',
        'status_code',
        'response_time_ms',
        'referrer',
        'referrer_host',
        'user_agent',
        'device_type',
        'browser',
        'os',
        'ip_hash',
        'country',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
        'session_id',
        'user_id',
        'created_at',
    ];

    protected $casts = [
        'status_code' => 'integer',
        'response_time_ms' => 'integer',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(AnalyticsEvent::class);
    }
}
