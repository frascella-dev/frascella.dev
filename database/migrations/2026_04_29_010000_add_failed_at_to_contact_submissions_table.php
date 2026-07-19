<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('contact_submissions', function (Blueprint $table) {
            // Set when the queued notification fails terminally. If both
            // sent_at and failed_at are null the row is still queued.
            $table->timestamp('failed_at')->nullable()->after('sent_at');
        });
    }

    public function down(): void
    {
        Schema::table('contact_submissions', function (Blueprint $table) {
            $table->dropColumn('failed_at');
        });
    }
};
