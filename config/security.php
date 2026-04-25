<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Security alert recipient
    |--------------------------------------------------------------------------
    | BruteForceGuard mails this address when a new lockout is triggered.
    | We deliberately reuse MAIL_FROM_ADDRESS so there's a single mailbox
    | the site uses for any internal communication — easier to monitor,
    | one less env var to keep in sync. Leave the from address empty to
    | disable alerts entirely.
    */
    'alert_email' => env('MAIL_FROM_ADDRESS'),

    /*
    |--------------------------------------------------------------------------
    | Lockout thresholds
    |--------------------------------------------------------------------------
    | IP tiers are evaluated top-down — list the most severe one first.
    | Windows + durations are in minutes.
    */
    'lockouts' => [
        'ip' => [
            [
                'threshold' => 20,
                'window_minutes' => 60,
                'duration_minutes' => 1440,   // 24 hours
                'label' => 'sustained attack',
            ],
            [
                'threshold' => 10,
                'window_minutes' => 15,
                'duration_minutes' => 60,     // 1 hour
                'label' => 'burst',
            ],
        ],

        'account' => [
            'threshold' => 10,
            'window_minutes' => 30,
            'duration_minutes' => 60,         // 1 hour
        ],
    ],
];
