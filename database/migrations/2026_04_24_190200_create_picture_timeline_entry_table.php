<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('picture_timeline_entry', function (Blueprint $table) {
            $table->id();
            $table->foreignId('timeline_entry_id')
                ->constrained('timeline_entries')
                ->cascadeOnDelete();
            $table->foreignId('picture_id')
                ->constrained('pictures')
                ->cascadeOnDelete();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['timeline_entry_id', 'picture_id']);
            $table->index(['timeline_entry_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('picture_timeline_entry');
    }
};
