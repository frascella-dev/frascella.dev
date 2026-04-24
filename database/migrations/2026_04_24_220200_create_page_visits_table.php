<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('page_visits', function (Blueprint $table) {
            $table->id();

            // Request shape
            $table->string('path', 2048);
            $table->text('query_string')->nullable();
            $table->string('method', 10);
            $table->unsignedSmallInteger('status_code')->nullable();
            $table->unsignedInteger('response_time_ms')->nullable();

            // Source attribution
            $table->text('referrer')->nullable();
            // Parsed host of the referrer — denormalized for cheap GROUP BY
            // (indexing a full-length URL column is expensive).
            $table->string('referrer_host', 255)->nullable();

            // Client fingerprint. User-agent is stored raw + parsed into a
            // coarse device_type / browser / os for fast slicing.
            $table->text('user_agent')->nullable();
            $table->string('device_type', 16)->nullable();
            $table->string('browser', 64)->nullable();
            $table->string('os', 64)->nullable();

            // IP is hashed (sha256 + app key salt) so we can count uniques
            // without retaining PII.
            $table->char('ip_hash', 64);
            $table->char('country', 2)->nullable();

            // UTM parameters carried in the query string
            $table->string('utm_source', 255)->nullable();
            $table->string('utm_medium', 255)->nullable();
            $table->string('utm_campaign', 255)->nullable();
            $table->string('utm_content', 255)->nullable();
            $table->string('utm_term', 255)->nullable();

            // Identity (nullable — most visits are anonymous)
            $table->string('session_id', 64)->nullable();
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // Append-only log — no updated_at.
            $table->timestamp('created_at')->useCurrent()->index();

            // Composite indexes covering the dashboard's hot queries.
            $table->index(['referrer_host', 'created_at']);
            $table->index(['session_id', 'created_at']);
            $table->index(['ip_hash', 'created_at']);
            $table->index(['utm_source', 'created_at']);
            $table->index(['device_type', 'created_at']);
            $table->index(['country', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('page_visits');
    }
};
