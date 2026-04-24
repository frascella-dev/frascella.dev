<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pictures', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            // Storage coordinates (Laravel disk + path within the disk)
            $table->string('disk', 32)->default('public');
            $table->string('path');

            // File metadata captured at upload time
            $table->string('original_filename')->nullable();
            $table->string('mime_type', 127);
            $table->unsignedBigInteger('size');
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();

            // sha256 hex (64 chars) — lets us dedupe identical uploads
            $table->char('checksum', 64)->nullable()->index();

            // Editorial fields
            $table->string('alt')->nullable();
            $table->string('caption')->nullable();

            // Variants: webp/avif/thumbnail URLs keyed by format or size preset.
            // e.g. { "webp": { "disk": "public", "path": "..." }, "avif": {...} }
            $table->json('variants')->nullable();

            // Free-form metadata slot (exif, dominant color, focal point, etc.)
            $table->json('meta')->nullable();

            $table->timestamps();

            $table->unique(['disk', 'path']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pictures');
    }
};
