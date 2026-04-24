<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\TimelineEntry
 */
class TimelineEntryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'year' => $this->year,
            'kind' => $this->kind,
            'title' => $this->title,
            'body' => $this->body,
            'fraction' => $this->fraction,
            'pictures' => PictureResource::collection($this->whenLoaded('pictures')),
        ];
    }
}
