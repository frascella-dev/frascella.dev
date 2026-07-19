<?php

namespace App\Providers;

use App\Models\ContactSubmission;
use App\Notifications\ContactMessageNotification;
use Carbon\CarbonImmutable;
use Illuminate\Notifications\Events\NotificationFailed;
use Illuminate\Notifications\Events\NotificationSent;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Mirror the queued-notification outcome onto the contact_submissions
        // row so the admin list can show "Sent" / "Failed" instead of just
        // "we asked the queue to do something".
        Event::listen(NotificationSent::class, function (NotificationSent $event) {
            if (!$event->notification instanceof ContactMessageNotification) {
                return;
            }
            ContactSubmission::where('id', $event->notification->submissionId)
                ->whereNull('sent_at')
                ->update(['sent_at' => CarbonImmutable::now()]);
        });

        Event::listen(NotificationFailed::class, function (NotificationFailed $event) {
            if (!$event->notification instanceof ContactMessageNotification) {
                return;
            }
            ContactSubmission::where('id', $event->notification->submissionId)
                ->whereNull('failed_at')
                ->update(['failed_at' => CarbonImmutable::now()]);
        });
    }
}
