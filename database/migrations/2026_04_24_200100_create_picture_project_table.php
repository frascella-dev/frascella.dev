<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('picture_project', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')
                ->constrained('projects')
                ->cascadeOnDelete();
            $table->foreignId('picture_id')
                ->constrained('pictures')
                ->cascadeOnDelete();

            // Role slots — deliberately minimal for now. `preview` is the
            // single card thumbnail shown on the Work grid; `other` is a
            // catch-all for future roles (hero, gallery, og-image…) that
            // we'll split when the detail page is built.
            $table->enum('role', ['preview', 'other'])->default('other');

            // Ordering within a given role (e.g. gallery #1, #2, …)
            $table->unsignedInteger('sort_order')->default(0);

            $table->timestamps();

            // Same picture can't be attached twice to the same project
            $table->unique(['project_id', 'picture_id']);

            // Fast lookup path for "get all pictures for project X in role Y, ordered"
            $table->index(['project_id', 'role', 'sort_order']);
        });

        // Enforce at most ONE preview per project at the DB level.
        // Generated column: equals project_id when role='preview', else NULL.
        // NULLs don't collide in a UNIQUE index, so multiple non-previews are fine.
        // VIRTUAL (not STORED) because MySQL disallows STORED generated columns
        // referencing a column used in an ON DELETE CASCADE foreign key.
        DB::statement(<<<'SQL'
            ALTER TABLE picture_project
            ADD COLUMN preview_project_id BIGINT UNSIGNED
                GENERATED ALWAYS AS (CASE WHEN role = 'preview' THEN project_id END) VIRTUAL,
            ADD UNIQUE KEY picture_project_single_preview_unique (preview_project_id)
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('picture_project');
    }
};
