<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('contact_submissions', function (Blueprint $table) {
            $table->id();
            // The user's own input — the contact form's whole point — kept
            // verbatim because we need to reply to them.
            $table->string('name');
            $table->string('email');
            $table->text('message');
            // sha256(daily_salt + ip + ua), same scheme as analytics_events.
            // Salt rotates every 24h and falls out of the cache after 48h,
            // so this hash cannot be reversed back to a visitor afterwards.
            $table->char('visitor_hash', 64)->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            // Cooldown lookups hit (email, created_at) and
            // (visitor_hash, created_at).
            $table->index(['email', 'created_at']);
            $table->index(['visitor_hash', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_submissions');
    }
};
