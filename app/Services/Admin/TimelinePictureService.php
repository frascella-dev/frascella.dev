<?php

namespace App\Services\Admin;

use App\Models\Picture;
use App\Models\TimelineEntry;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Owns the file → Picture → picture_timeline_entry pivot dance for timeline
 * attachments. Mirrors the AvatarService pattern but allows multiple
 * pictures per entry, with a stable per-entry sort_order.
 */
class TimelinePictureService
{
    public function attach(TimelineEntry $entry, UploadedFile $file, ?int $sortOrder = null): Picture
    {
        [$width, $height] = @getimagesize($file->getRealPath()) ?: [null, null];

        $path = $file->store('timelines', 'public');

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

        // Append at the end of the entry's existing pictures unless the
        // caller wants a specific position.
        $sortOrder ??= ((int) $entry->pictures()->max('picture_timeline_entry.sort_order')) + 1;

        $entry->pictures()->attach($picture->id, [
            'sort_order' => $sortOrder,
        ]);

        return $picture;
    }

    /**
     * Detach a picture from the entry. The picture row + file are wiped iff
     * no other entries are using it (orphan cleanup).
     */
    public function detach(TimelineEntry $entry, Picture $picture): void
    {
        $entry->pictures()->detach($picture->id);

        $stillReferenced = $picture
            ->timelineEntries()
            ->whereKeyNot($entry->id)
            ->exists();

        if ($stillReferenced) {
            return;
        }

        $stillOnProjects = $picture->projects()->exists();
        $stillOnAvatars = $picture->avatarUsers()->exists();
        if ($stillOnProjects || $stillOnAvatars) {
            return;
        }

        Storage::disk($picture->disk)->delete($picture->path);
        $picture->delete();
    }
}
