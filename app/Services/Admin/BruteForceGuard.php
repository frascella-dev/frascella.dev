<?php

namespace App\Services\Admin;

use App\Models\AuthFailure;
use App\Models\IpLockout;
use App\Models\User;
use App\Notifications\SecurityAlertNotification;
use App\Support\IpHasher;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;

/**
 * Owns the persistent lockout state for the admin auth flow.
 *
 * Controllers / services hand it an (email, ip) before every auth attempt via
 * {@see assertAllowed()}, a failure via {@see recordFailure()}, and a success
 * via {@see clearForIp()}. The thresholds themselves live in
 * config/security.php so they can be tuned without code changes.
 */
class BruteForceGuard
{
    public function assertAllowed(?string $email, string $ip): void
    {
        $now = CarbonImmutable::now();

        $ipHash = IpHasher::hash($ip);
        $ipLock = IpLockout::where('ip_hash', $ipHash)
            ->where('locked_until', '>', $now)
            ->first();

        if ($ipLock) {
            throw ValidationException::withMessages([
                'email' => 'Too many failed attempts from your location. Please try again in '
                    . $ipLock->locked_until->diffForHumans(null, true) . '.',
            ]);
        }

        if ($email !== null) {
            $user = User::where('email', strtolower($email))->first();
            if ($user && $user->locked_until && $user->locked_until->isFuture()) {
                throw ValidationException::withMessages([
                    'email' => 'This account is temporarily locked. Please try again in '
                        . $user->locked_until->diffForHumans(null, true) . '.',
                ]);
            }
        }
    }

    /**
     * Record a failed attempt, then evaluate whether that crossed an IP or
     * account threshold and install the lockout + fire an alert if so.
     *
     * @param  'password'|'otp'  $kind
     */
    public function recordFailure(string $kind, string $ip, ?string $email = null, ?User $user = null): void
    {
        $normalizedEmail = $email !== null ? strtolower($email) : null;
        $ipHash = IpHasher::hash($ip);

        AuthFailure::create([
            'ip_hash' => $ipHash,
            'email' => $normalizedEmail,
            'kind' => $kind,
            'user_id' => $user?->id,
            'created_at' => CarbonImmutable::now(),
        ]);

        $this->evaluateIpLockout($ipHash, $ip);

        if ($normalizedEmail !== null) {
            $this->evaluateAccountLockout($normalizedEmail, $user, $ip);
        }
    }

    /**
     * Wipe recent failures attributable to a given IP after a successful auth.
     * Prevents a user who mistyped a couple times from eating into their own
     * future budget.
     */
    public function clearForIp(string $ip): void
    {
        AuthFailure::where('ip_hash', IpHasher::hash($ip))->delete();
    }

    private function evaluateIpLockout(string $ipHash, string $ip): void
    {
        $tiers = config('security.lockouts.ip', []);

        foreach ($tiers as $tier) {
            $since = CarbonImmutable::now()->subMinutes($tier['window_minutes']);
            $count = AuthFailure::where('ip_hash', $ipHash)
                ->where('created_at', '>=', $since)
                ->count();

            if ($count < $tier['threshold']) {
                continue;
            }

            $lockedUntil = CarbonImmutable::now()->addMinutes($tier['duration_minutes']);
            $reason = sprintf(
                '%d failures in %d min (%s)',
                $count,
                $tier['window_minutes'],
                $tier['label'] ?? 'threshold',
            );

            $existing = IpLockout::where('ip_hash', $ipHash)->first();
            $wasActive = $existing && $existing->locked_until && $existing->locked_until->isFuture();

            IpLockout::updateOrCreate(
                ['ip_hash' => $ipHash],
                ['locked_until' => $lockedUntil, 'reason' => $reason],
            );

            // Only alert on a transition into (or escalation of) an active
            // lockout — silently extending doesn't warrant another email.
            if (!$wasActive
                || ($existing && $lockedUntil->greaterThan($existing->locked_until))
            ) {
                $this->alert('IP lockout triggered', [
                    'ip' => $ip,
                    'ip_hash_prefix' => substr($ipHash, 0, 12),
                    'failures_in_window' => $count,
                    'window_minutes' => $tier['window_minutes'],
                    'tier' => $tier['label'] ?? null,
                    'locked_until' => $lockedUntil,
                ]);
            }

            return;
        }
    }

    private function evaluateAccountLockout(string $email, ?User $user, string $ip): void
    {
        $cfg = config('security.lockouts.account');
        if (!$cfg) {
            return;
        }

        $since = CarbonImmutable::now()->subMinutes($cfg['window_minutes']);
        $count = AuthFailure::where('email', $email)
            ->where('created_at', '>=', $since)
            ->count();

        if ($count < $cfg['threshold']) {
            return;
        }

        $resolved = $user ?? User::where('email', $email)->first();
        if (!$resolved) {
            // Failures against unknown emails only raise IP locks — nothing
            // to lock here.
            return;
        }

        $lockedUntil = CarbonImmutable::now()->addMinutes($cfg['duration_minutes']);
        $wasActive = $resolved->locked_until && $resolved->locked_until->isFuture();

        $resolved->forceFill(['locked_until' => $lockedUntil])->save();

        if (!$wasActive || $lockedUntil->greaterThan($resolved->getOriginal('locked_until'))) {
            $this->alert('Account lockout triggered', [
                'email' => $email,
                'ip' => $ip,
                'failures_in_window' => $count,
                'window_minutes' => $cfg['window_minutes'],
                'locked_until' => $lockedUntil,
            ]);
        }
    }

    private function alert(string $title, array $details): void
    {
        $to = config('security.alert_email');
        if (!$to) {
            return;
        }

        Notification::route('mail', $to)
            ->notify(new SecurityAlertNotification($title, $details));
    }
}
