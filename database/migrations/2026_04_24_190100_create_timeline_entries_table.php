<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('timeline_entries', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('year');
            $table->string('kind', 32); // life | code | work | now | ...
            $table->string('title');
            $table->text('body');

            // Optional explicit ordering override — if null, the service
            // orders by (year ASC, id ASC).
            $table->unsignedInteger('sort_order')->nullable();

            $table->timestamps();

            $table->index(['year', 'id']);
            $table->index('sort_order');
            $table->index('kind');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('timeline_entries');
    }
};
