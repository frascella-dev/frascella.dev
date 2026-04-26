<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'path',
    'referrer_host',
    'country_code',
    'device',
    'browser',
    'os',
    'visitor_hash',
    'created_at',
])]
class AnalyticsEvent extends Model
{
    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }
}
