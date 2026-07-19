<?php

namespace App\Services;

use App\Models\ContactSubmission;
use App\Notifications\ContactMessageNotification;
use App\Support\VisitorHasher;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Notification;

class ContactService
{
    /** Cooldown window between two submissions for the same email. */
    public const PER_EMAIL_COOLDOWN_MINUTES = 15;

    /**
     * Daily cap per visitor — covers spambots that rotate fields but not
     * networks. Visitors are identified by a daily-rotating hash, never by
     * raw IP, so the limit naturally lifts after the salt rolls over.
     */
    public const PER_VISITOR_DAILY_LIMIT = 5;

    /**
     * Persist the submission, then dispatch the email to the configured
     * recipient. Mailing happens via the queue so the HTTP request returns
     * immediately and a temporarily-down SMTP host doesn't fail the form.
     *
     * @return array{ok: bool, reason?: string}
     */
    public function submit(
        string $name,
        string $email,
        string $body,
        ?string $ip,
        ?string $userAgent,
    ): array {
        $email = strtolower(trim($email));

        $visitorHash = ($ip || $userAgent)
            ? VisitorHasher::hash((string) $ip, (string) $userAgent)
            : null;

        if ($cooldown = $this->cooldownReason($email, $visitorHash)) {
            return ['ok' => false, 'reason' => $cooldown];
        }

        $recipient = config('mail.contact_to');
        if (!$recipient) {
            // Misconfiguration is a server fault, never a 4xx for the user.
            // Mark the row as failed straight away so it shows up red in the
            // admin list without waiting for a queue event that never fires.
            ContactSubmission::create([
                'name' => $name,
                'email' => $email,
                'message' => $body,
                'visitor_hash' => $visitorHash,
                'failed_at' => CarbonImmutable::now(),
            ]);

            return ['ok' => false, 'reason' => 'mail_not_configured'];
        }

        // sent_at / failed_at start null and get filled in by the listener
        // wired in AppServiceProvider when the queued notification finishes.
        $submission = ContactSubmission::create([
            'name' => $name,
            'email' => $email,
            'message' => $body,
            'visitor_hash' => $visitorHash,
        ]);

        Notification::route('mail', $recipient)->notify(
            new ContactMessageNotification(
                submissionId: $submission->id,
                senderName: $submission->name,
                senderEmail: $submission->email,
                body: $submission->message,
            ),
        );

        return ['ok' => true];
    }

    /**
     * Why the submission should be rejected based on prior history, or null
     * when the request is within all the allowed windows.
     */
    private function cooldownReason(string $email, ?string $visitorHash): ?string
    {
        $now = CarbonImmutable::now();

        $sameEmail = ContactSubmission::where('email', $email)
            ->where('created_at', '>=', $now->subMinutes(self::PER_EMAIL_COOLDOWN_MINUTES))
            ->exists();

        if ($sameEmail) {
            return 'cooldown';
        }

        if ($visitorHash) {
            $sameVisitor = ContactSubmission::where('visitor_hash', $visitorHash)
                ->where('created_at', '>=', $now->subDay())
                ->count();

            if ($sameVisitor >= self::PER_VISITOR_DAILY_LIMIT) {
                return 'daily_limit';
            }
        }

        return null;
    }
}
