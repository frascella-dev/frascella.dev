<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Delivers a contact form submission to the site owner. The reply-to is set
 * to the submitter so a hit-reply works straight from the inbox. We don't
 * pass IP / user agent through — that data is anonymised at the storage
 * layer and never needs to leave the server.
 */
class ContactMessageNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly int $submissionId,
        public readonly string $senderName,
        public readonly string $senderEmail,
        public readonly string $body,
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
            ->subject("[{$app}] New contact message from {$this->senderName}")
            ->replyTo($this->senderEmail, $this->senderName)
            ->markdown('emails.contact', [
                'senderName' => $this->senderName,
                'senderEmail' => $this->senderEmail,
                'body' => $this->body,
                'receivedAt' => now(),
            ]);
    }
}
