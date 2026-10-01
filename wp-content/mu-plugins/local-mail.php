<?php

/**
 * On a development machine no email leaves, ever.
 *
 * With WP_ENVIRONMENT_TYPE = local every message the site sends goes to Mailpit (the
 * `mail` container, http://localhost:8135), whatever any plugin's SMTP settings say: this
 * hook runs last and overrides them. And the project's own addresses are rewritten to a
 * test one, so a configuration mistake cannot deliver anything to the people who run the
 * business.
 *
 * Only on this machine: production never loads this folder (it is not in any release
 * zip), and the checks below make sure of it anyway.
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

// `local` is declared only by the web container; WP-CLI runs the same site on the same
// address, so the address decides too.
$frascella_host = (string) wp_parse_url((string) get_option('home'), PHP_URL_HOST);
if (wp_get_environment_type() !== 'local' && !in_array($frascella_host, ['localhost', '127.0.0.1'], true)) {
    return;
}
unset($frascella_host);

/** The domain whose addresses are rewritten (bin/init sets it). */
const FRASCELLA_LOCAL_MAIL_DOMAIN = 'frascella.dev';

add_action('phpmailer_init', static function ($mailer): void {
    $mailer->isSMTP();
    $mailer->Host = 'mail';
    $mailer->Port = 1025;
    $mailer->SMTPAuth = false;
    $mailer->Username = '';
    $mailer->Password = '';
    $mailer->SMTPSecure = '';
    $mailer->SMTPAutoTLS = false;
}, PHP_INT_MAX);

// WordPress sends from wordpress@{host}, and `localhost` has no dot: PHPMailer refuses the
// address and the email is never written. A sender that is valid and obviously a test.
add_filter('wp_mail_from', static fn (string $from): string => str_ends_with($from, '@localhost') ? 'wordpress@example.com' : $from, PHP_INT_MAX);

add_filter('wp_mail', static function (array $args): array {
    $domain = preg_quote(FRASCELLA_LOCAL_MAIL_DOMAIN, '/');
    $rewrite = static function ($to) use ($domain) {
        $list = is_array($to) ? $to : explode(',', (string) $to);
        $out = [];
        foreach ($list as $address) {
            $out[] = preg_match('/@' . $domain . '\s*>?\s*$/i', trim((string) $address)) ? 'owner-test@example.com' : $address;
        }

        return is_array($to) ? $out : implode(',', $out);
    };
    $args['to'] = $rewrite($args['to']);

    return $args;
}, PHP_INT_MAX);
