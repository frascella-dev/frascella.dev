<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pictures_avatars', function (Blueprint $table) {
            $table->id();
            // One avatar per user — the unique index lets us upsert on user_id
            // without a separate select.
            $table->foreignId('user_id')
                ->unique()
                ->constrained('users')
                ->cascadeOnDelete();
            $table->foreignId('picture_id')
                ->constrained('pictures')
                ->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pictures_avatars');
    }
};
