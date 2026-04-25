<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Picture extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'disk',
        'path',
        'original_filename',
        'mime_type',
        'size',
        'width',
        'height',
        'checksum',
        'alt',
        'caption',
        'variants',
        'meta',
    ];

    protected $casts = [
        'size' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
        'variants' => 'array',
        'meta' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $picture) {
            if (empty($picture->uuid)) {
                $picture->uuid = (string) Str::uuid();
            }
        });
    }

    public function avatarUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'pictures_avatars')
            ->withTimestamps();
    }

    public function url(): ?string
    {
        return Storage::disk($this->disk)->url($this->path);
    }
}
