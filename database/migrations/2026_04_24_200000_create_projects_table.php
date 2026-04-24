<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 120)->unique();

            // Headline / card content
            $table->string('title');
            $table->string('tagline')->nullable();     // short one-liner shown on the Work grid
            $table->string('subtitle', 500)->nullable(); // longer description for the detail page

            // Timeframe
            $table->unsignedSmallInteger('year')->nullable();
            $table->string('duration', 100)->nullable(); // free-form, e.g. "8 months"

            // Credits & context
            $table->string('client')->nullable();
            $table->string('role')->nullable();
            $table->string('team')->nullable();

            // Visual variant on the Work grid: 'ink' | 'paper' | 'accent' | 'outline'
            $table->string('tone', 32)->default('paper');

            // Technology labels, rendered as pills on the card and detail page
            $table->json('stack')->nullable();

            // Featured metric — the single punchy stat shown on the Work card.
            // Kept as dedicated columns (not derived from `metrics`) because its
            // wording is usually tighter than any of the detail-page entries.
            $table->string('featured_metric_value', 50)->nullable();
            $table->string('featured_metric_label', 150)->nullable();

            // Full metrics list for the detail page: [{k,v}, ...]
            $table->json('metrics')->nullable();

            // People credits for the detail page: [{role,name}, ...]
            $table->json('credits')->nullable();

            // Narrative sections
            $table->text('context')->nullable();
            $table->text('approach')->nullable();
            $table->text('outcome')->nullable();

            // Optional outbound link (case study, git repo, live site)
            $table->string('external_url', 500)->nullable();

            // Ordering: when null, fall back to (year DESC, id DESC)
            $table->unsignedInteger('sort_order')->nullable();

            // Drafts vs published — null means draft/hidden
            $table->timestamp('published_at')->nullable();

            $table->timestamps();

            $table->index('sort_order');
            $table->index('year');
            $table->index('published_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
