<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ip_lockouts', function (Blueprint $table) {
            $table->id();
            // Unique: at most one active lockout row per IP. We upsert rather
            // than stacking.
            $table->char('ip_hash', 64)->unique();
            $table->timestamp('locked_until')->index();
            $table->string('reason', 255)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ip_lockouts');
    }
};
