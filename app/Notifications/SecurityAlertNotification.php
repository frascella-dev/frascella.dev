<?php

namespace App\Notifications;

use Carbon\CarbonInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Outbound email to the operator whenever BruteForceGuard trips a new
 * lockout. Queued so the failing login response doesn't wait on SMTP.
 */
class SecurityAlertNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly string $title,
        public readonly array $details,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $app = config('app.name', 'Laravel');

        $message = (new MailMessage())
            ->subject("[{$app}] Security alert · {$this->title}")
            ->greeting('Security alert')
            ->line($this->title);

        foreach ($this->details as $key => $value) {
            $message->line(sprintf(
                '%s: %s',
                $this->humanKey($key),
                $this->formatValue($value),
            ));
        }

        return $message
            ->line('Use the `admin:unlock-account` or `admin:unlock-ip` artisan commands to clear the lockout early if this was a false positive.');
    }

    private function humanKey(string $key): string
    {
        return ucfirst(str_replace('_', ' ', $key));
    }

    private function formatValue(mixed $value): string
    {
        if ($value instanceof CarbonInterface) {
            return $value->toDayDateTimeString();
        }
        if (is_bool($value)) {
            return $value ? 'yes' : 'no';
        }
        if (is_array($value)) {
            return json_encode($value, JSON_UNESCAPED_SLASHES);
        }

        return (string) $value;
    }
}
