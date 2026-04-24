<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auth_failures', function (Blueprint $table) {
            $table->id();

            // Salted sha256 of the source IP — same scheme page_visits uses.
            $table->char('ip_hash', 64)->index();

            // Nullable because a password attempt against an unknown email
            // still counts toward the IP budget but not any account.
            $table->string('email', 255)->nullable()->index();

            // password | otp
            $table->string('kind', 16);

            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('created_at')->useCurrent()->index();

            // Composite indexes matching the guard's count-over-window queries.
            $table->index(['ip_hash', 'created_at']);
            $table->index(['email', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auth_failures');
    }
};
