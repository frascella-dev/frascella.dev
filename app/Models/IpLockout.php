<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IpLockout extends Model
{
    protected $fillable = [
        'ip_hash',
        'locked_until',
        'reason',
    ];

    protected $casts = [
        'locked_until' => 'datetime',
    ];

    public function isActive(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }
}
