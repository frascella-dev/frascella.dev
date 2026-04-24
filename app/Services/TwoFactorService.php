<?php

namespace App\Services;

use App\Models\User;
use chillerlan\QRCode\Common\EccLevel;
use chillerlan\QRCode\Output\QRMarkupSVG;
use chillerlan\QRCode\Output\QRStringText;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorService
{
    /**
     * Allow one 30-second step of clock drift in either direction.
     */
    private const VERIFICATION_WINDOW = 1;

    public function __construct(private readonly Google2FA $google2fa)
    {
    }

    /**
     * Generate a fresh base32-encoded shared secret.
     */
    public function generateSecret(): string
    {
        return $this->google2fa->generateSecretKey();
    }

    /**
     * Build the otpauth:// URI that authenticator apps consume.
     */
    public function buildOtpauthUri(User $user, string $secret): string
    {
        return $this->google2fa->getQRCodeUrl(
            config('app.name', 'Laravel'),
            $user->email,
            $secret
        );
    }

    /**
     * Render the otpauth URI as a QR code using Unicode half-block
     * characters — prints 2× denser than plain ASCII, which matters
     * a lot on a typical terminal where the minimum cell is wide.
     */
    public function renderQrForTerminal(string $otpauthUri): string
    {
        $options = new QROptions([
            'outputInterface' => QRStringText::class,
            'eccLevel' => EccLevel::L,
            'textLineStart' => '',
            'addQuietzone' => true,
            'quietzoneSize' => 2,
        ]);

        return (new QRCode($options))->render($otpauthUri);
    }

    /**
     * Render the otpauth URI as an SVG QR code wrapped in a data URI so it
     * can be dropped straight into an <img src="..."> tag.
     */
    public function renderQrForBrowser(string $otpauthUri): string
    {
        $options = new QROptions([
            'outputInterface' => QRMarkupSVG::class,
            'eccLevel' => EccLevel::L,
            'addQuietzone' => true,
            'quietzoneSize' => 2,
        ]);

        $svg = (new QRCode($options))->render($otpauthUri);

        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }

    /**
     * Verify a 6-digit OTP against a secret.
     * Accepts ±1 step (30s) of clock drift.
     */
    public function verify(string $secret, string $code): bool
    {
        $code = preg_replace('/\s+/', '', $code);

        if (!preg_match('/^\d{6}$/', $code)) {
            return false;
        }

        return (bool) $this->google2fa->verifyKey($secret, $code, self::VERIFICATION_WINDOW);
    }
}
