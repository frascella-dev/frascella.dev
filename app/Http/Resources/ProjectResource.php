<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Project
 */
class ProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'tagline' => $this->tagline,
            'year' => $this->year,
            'client' => $this->client,
            'role' => $this->role,
            'tone' => $this->tone,
            'stack' => $this->stack ?? [],
            'metric' => $this->featured_metric_value
                ? [
                    'n' => $this->featured_metric_value,
                    'l' => $this->featured_metric_label,
                ]
                : null,
            'preview' => $this->whenLoaded(
                'preview',
                fn () => optional($this->preview->first(), function ($picture) {
                    return (new PictureResource($picture))->resolve();
                })
            ),
        ];
    }
}
