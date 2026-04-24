<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Holds the *replacement* secret while a user rotates their 2FA
            // device. Login still verifies against two_factor_secret until the
            // user confirms the new code, at which point this column's value
            // is promoted to two_factor_secret and cleared. That way a failed
            // or abandoned rotation never locks anyone out.
            $table->text('two_factor_secret_pending')->nullable()->after('two_factor_confirmed_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('two_factor_secret_pending');
        });
    }
};
