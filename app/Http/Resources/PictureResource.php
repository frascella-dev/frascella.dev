<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Picture
 */
class PictureResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'url' => $this->url(),
            'alt' => $this->alt,
            'caption' => $this->caption,
            'width' => $this->width,
            'height' => $this->height,
            'mime_type' => $this->mime_type,
            'variants' => $this->variants,
        ];
    }
}
