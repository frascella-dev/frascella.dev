<?php

/**
 * Accounts for the dashboard.
 *
 *   php bin/admin-user.php create <email>     make an account (prompts, enrols TOTP)
 *   php bin/admin-user.php list               who exists, and their state
 *   php bin/admin-user.php password <email>   change a password
 *   php bin/admin-user.php reset-mfa <email>  new TOTP secret + new recovery codes
 *   php bin/admin-user.php disable <email>    revoke access, keep the row
 *   php bin/admin-user.php enable <email>
 *   php bin/admin-user.php delete <email>
 *
 * Two-factor is not optional and there is no flag to skip it: `create` always
 * generates a secret, and the account cannot sign in without answering it.
 * The secret and the recovery codes are printed once, here, and never again —
 * the database only ever holds the secret and the codes' hashes.
 */

declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

use Api\AdminUser;
use Api\Db;
use Api\Env;
use Api\Totp;

const MIN_PASSWORD = 12;

$command = $argv[1] ?? 'help';
$email = $argv[2] ?? null;

if (!Db::isReady()) {
    fail("The schema is not there yet. Run:\n\n    php bin/migrate.php\n");
}

match ($command) {
    'create' => create(need($email, 'create <email>')),
    'list' => listUsers(),
    'password' => changePassword(need($email, 'password <email>')),
    'reset-mfa' => resetMfa(need($email, 'reset-mfa <email>')),
    'disable' => setDisabled(need($email, 'disable <email>'), true),
    'enable' => setDisabled(need($email, 'enable <email>'), false),
    'delete' => deleteUser(need($email, 'delete <email>')),
    default => usage(),
};

// --- commands ---------------------------------------------------------------

function create(string $email): void
{
    if (AdminUser::findByEmail($email) !== null) {
        fail("An account already exists for {$email}.");
    }
    if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
        fail("{$email} is not an email address.");
    }

    $name = trim(prompt('Name: '));
    if ($name === '') {
        fail('A name is required — the dashboard greets somebody.');
    }

    $password = askPassword();
    $created = AdminUser::create($email, $name, $password);

    echo "\n\033[1mAccount created for {$email}.\033[0m\n";
    showEnrolment($email, $created['secret'], $created['recovery']);
}

function listUsers(): void
{
    $users = AdminUser::all();
    if ($users === []) {
        echo "No accounts yet. Create one:\n\n    php bin/admin-user.php create you@example.com\n\n";
        return;
    }

    printf("\n%-32s %-20s %-9s %-8s %s\n", 'EMAIL', 'NAME', 'STATE', 'CODES', 'LAST SIGN-IN');
    echo str_repeat('─', 88) . "\n";
    foreach ($users as $user) {
        $id = (int) $user['id'];
        printf(
            "%-32s %-20s %-9s %-8s %s\n",
            $user['email'],
            mb_substr((string) $user['name'], 0, 20),
            $user['disabled_at'] !== null
                ? 'disabled'
                : ($user['totp_confirmed_at'] === null ? 'enrolling' : 'active'),
            AdminUser::unusedRecoveryCodes($id) . '/8',
            $user['last_login_at'] === null ? 'never' : date('Y-m-d H:i', (int) $user['last_login_at']),
        );
    }
    echo "\n";
}

function changePassword(string $email): void
{
    $user = mustFind($email);
    AdminUser::setPassword((int) $user['id'], askPassword());
    echo "\nPassword changed for {$email}. Existing sessions still stand — use\n";
    echo "`disable` then `enable` to end them.\n\n";
}

function resetMfa(string $email): void
{
    $user = mustFind($email);
    $reset = AdminUser::resetMfa((int) $user['id']);

    echo "\n\033[1mTwo-factor reset for {$email}.\033[0m The old secret and the old recovery\n";
    echo "codes are dead. Enrol again now:\n";
    showEnrolment($email, $reset['secret'], $reset['recovery']);
}

function setDisabled(string $email, bool $disabled): void
{
    $user = mustFind($email);
    AdminUser::setDisabled((int) $user['id'], $disabled);
    echo $disabled
        ? "\n{$email} is disabled, and any session it held has been ended.\n\n"
        : "\n{$email} can sign in again.\n\n";
}

function deleteUser(string $email): void
{
    $user = mustFind($email);
    if (AdminUser::count() <= 1 && $user['disabled_at'] === null) {
        fail("{$email} is the only account left — deleting it locks everybody out.\nCreate another one first.");
    }
    if (strtolower(trim(prompt("Delete {$email} for good? [y/N] "))) !== 'y') {
        echo "Left alone.\n";
        return;
    }
    AdminUser::delete((int) $user['id']);
    echo "\n{$email} is gone.\n\n";
}

// --- output -----------------------------------------------------------------

/** @param list<string> $recovery */
function showEnrolment(string $email, string $secret, array $recovery): void
{
    $issuer = Env::get('APP_NAME', 'frascella.dev') ?? 'frascella.dev';
    $uri = Totp::uri($secret, $email, $issuer);

    echo "\n\033[1mScan this with your authenticator\033[0m\n";
    // qrencode is not a dependency, just a nicety when it happens to be
    // installed — every authenticator app also takes the secret by hand.
    $qr = trim((string) @shell_exec('command -v qrencode 2>/dev/null'));
    if ($qr !== '') {
        echo "\n";
        passthru('qrencode -t ANSIUTF8 -m 2 ' . escapeshellarg($uri));
    } else {
        echo "  (install `qrencode` to get a QR code here)\n";
    }

    echo "\n  secret : \033[1m{$secret}\033[0m\n";
    echo "  uri    : {$uri}\n";

    echo "\n\033[1mRecovery codes\033[0m — each works once, and they are the only way back\n";
    echo "in if you lose the authenticator. They are not stored in readable form,\n";
    echo "so this is the only time you will see them. Put them somewhere safe now.\n\n";
    foreach (array_chunk($recovery, 2) as $pair) {
        echo '    ' . implode('    ', $pair) . "\n";
    }

    echo "\n  The first code you enter at sign-in confirms the enrolment.\n\n";
}

// --- input ------------------------------------------------------------------

function askPassword(): string
{
    $first = prompt('Password: ', hidden: true);
    if (strlen($first) < MIN_PASSWORD) {
        fail('Use at least ' . MIN_PASSWORD . ' characters.');
    }
    if ($first !== prompt('Again: ', hidden: true)) {
        fail('Those do not match.');
    }

    return $first;
}

function prompt(string $label, bool $hidden = false): string
{
    echo $label;
    // `stty -echo` is what keeps a password off the screen; without a tty
    // (a pipe, a CI job) there is nothing to turn off and reading is enough.
    $tty = stream_isatty(STDIN);
    if ($hidden && $tty) {
        shell_exec('stty -echo');
    }
    $value = rtrim((string) fgets(STDIN), "\r\n");
    if ($hidden && $tty) {
        shell_exec('stty echo');
        echo "\n";
    }

    return $value;
}

// --- plumbing ---------------------------------------------------------------

/** @return array<string, mixed> */
function mustFind(string $email): array
{
    $user = AdminUser::findByEmail($email);
    if ($user === null) {
        fail("No account for {$email}. `list` shows what exists.");
    }

    return $user;
}

function need(?string $value, string $shape): string
{
    if ($value === null || trim($value) === '') {
        fail("Usage: php bin/admin-user.php {$shape}");
    }

    return trim($value);
}

function fail(string $message): never
{
    fwrite(STDERR, "\n{$message}\n\n");
    exit(1);
}

function usage(): void
{
    echo <<<TXT

        Dashboard accounts.

          create <email>      make an account — prompts for name and password,
                              then prints the TOTP secret and recovery codes
          list                who exists, and their state
          password <email>    change a password
          reset-mfa <email>   new TOTP secret and new recovery codes
          disable <email>     revoke access and end its sessions
          enable <email>      undo that
          delete <email>      remove the account for good

        Two-factor is required and cannot be skipped.


        TXT;
}
