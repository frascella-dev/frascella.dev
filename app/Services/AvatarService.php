<?php

namespace App\Services;

use App\Models\PicturesAvatar;
use App\Models\Picture;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AvatarService
{
    /**
     * Replace the user's avatar with the uploaded file.
     *
     * The old Picture row + file are deleted after the new record is
     * attached, so a mid-flight failure leaves the user with the previous
     * avatar intact rather than none at all.
     */
    public function set(User $user, UploadedFile $file): Picture
    {
        [$width, $height] = @getimagesize($file->getRealPath()) ?: [null, null];

        $path = $file->store('avatars', 'public');

        $picture = Picture::create([
            'disk' => 'public',
            'path' => $path,
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'width' => $width,
            'height' => $height,
            'checksum' => hash_file('sha256', $file->getRealPath()),
        ]);

        $previous = $user->pictureAvatar()->first();

        DB::transaction(function () use ($user, $picture, $previous) {
            $previous?->delete();
            PicturesAvatar::create([
                'user_id' => $user->id,
                'picture_id' => $picture->id,
            ]);
        });

        // File cleanup happens *after* the DB swap committed — avoids
        // deleting the only copy of the picture if the pivot write fails.
        if ($previous) {
            $this->forgetPicture($previous->picture_id);
        }

        return $picture;
    }

    public function remove(User $user): void
    {
        $avatar = $user->pictureAvatar()->first();
        if (!$avatar) {
            return;
        }

        $pictureId = $avatar->picture_id;
        $avatar->delete();
        $this->forgetPicture($pictureId);
    }

    private function forgetPicture(int $pictureId): void
    {
        $picture = Picture::find($pictureId);
        if (!$picture) {
            return;
        }

        Storage::disk($picture->disk)->delete($picture->path);
        $picture->delete();
    }
}
