<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('admin_invitations', function (Blueprint $table) {
            $table->id();
            $table->string('email')->index();
            // sha256 of the raw token — the raw token only ever lives in
            // the email link, never on disk.
            $table->char('token_hash', 64)->unique();
            // Generated server-side on the first GET of the register page
            // and reused across reloads so the QR stays scannable.
            $table->text('two_factor_secret')->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_invitations');
    }
};
