<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sends the one-time registration link to a freshly invited admin. The raw
 * token is composed into the URL here and only here — it never hits disk.
 */
class AdminInvitationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly string $registrationUrl,
        public readonly \DateTimeInterface $expiresAt,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $app = config('app.name', 'Laravel');

        return (new MailMessage())
            ->subject("[{$app}] Set up your admin account")
            ->greeting('Welcome to ' . $app)
            ->line('You have been invited to create an admin account.')
            ->line('Click the button below to choose your password and enroll your authenticator.')
            ->action('Set up account', $this->registrationUrl)
            ->line('This link is single-use and expires '
                . $this->expiresAt->format('Y-m-d H:i') . ' UTC.')
            ->line('If you did not expect this email, ignore it — the link will quietly expire.');
    }
}
