<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password', 'two_factor_secret', 'two_factor_secret_pending', 'two_factor_confirmed_at'])]
#[Hidden(['password', 'remember_token', 'two_factor_secret', 'two_factor_secret_pending'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_secret' => 'encrypted',
            'two_factor_secret_pending' => 'encrypted',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function hasConfirmedTwoFactor(): bool
    {
        return !is_null($this->two_factor_confirmed_at)
            && !is_null($this->two_factor_secret);
    }

    public function hasPendingTwoFactorRotation(): bool
    {
        return !is_null($this->two_factor_secret_pending);
    }

    public function pictureAvatar(): HasOne
    {
        return $this->hasOne(PicturesAvatar::class);
    }

    /**
     * Short-circuit through the pivot to the actual Picture row.
     * Access via $user->avatar (singular).
     */
    public function avatar(): HasOneThrough
    {
        return $this->hasOneThrough(
            Picture::class,
            PicturesAvatar::class,
            'user_id',
            'id',
            'id',
            'picture_id',
        );
    }
}
