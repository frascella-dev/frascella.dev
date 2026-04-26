<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['email', 'token_hash', 'two_factor_secret', 'expires_at', 'used_at'])]
class AdminInvitation extends Model
{
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'used_at' => 'datetime',
            'two_factor_secret' => 'encrypted',
        ];
    }

    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isUsed(): bool
    {
        return $this->used_at !== null;
    }

    public function isOpen(): bool
    {
        return !$this->isExpired() && !$this->isUsed();
    }

    public function markUsed(): void
    {
        $this->forceFill(['used_at' => CarbonImmutable::now()])->save();
    }
}
