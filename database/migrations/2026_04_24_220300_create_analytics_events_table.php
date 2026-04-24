<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('analytics_events', function (Blueprint $table) {
            $table->id();

            // Optional link to the page visit the event fired on.
            $table->foreignId('page_visit_id')
                ->nullable()
                ->constrained('page_visits')
                ->cascadeOnDelete();

            // Event name + free-form payload. Examples: "project.view",
            // "form.submit", "nav.click" with { project_id: 42 }.
            $table->string('name', 128);
            $table->json('properties')->nullable();

            // Identity
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->string('session_id', 64)->nullable();

            $table->timestamp('created_at')->useCurrent();

            $table->index(['name', 'created_at']);
            $table->index(['session_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analytics_events');
    }
};
