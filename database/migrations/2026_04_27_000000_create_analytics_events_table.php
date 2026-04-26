<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('analytics_events', function (Blueprint $table) {
            $table->id();
            $table->string('path', 255)->nullable();
            // Only the host part of the referrer — not the full URL. Stops
            // us from accidentally storing query strings that could carry
            // PII.
            $table->string('referrer_host', 255)->nullable();
            $table->char('country_code', 2)->nullable();
            $table->string('device', 16)->nullable();
            $table->string('browser', 32)->nullable();
            $table->string('os', 32)->nullable();
            // sha256(daily_salt + ip + ua). Salt rotates every 24h and is
            // discarded after 48h, so this hash cannot be reversed back to a
            // person after that window.
            $table->char('visitor_hash', 64);
            $table->timestamp('created_at')->useCurrent();

            $table->index('created_at');
            $table->index(['visitor_hash', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analytics_events');
    }
};
