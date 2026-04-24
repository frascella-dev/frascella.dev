<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Security alert recipient
    |--------------------------------------------------------------------------
    | Where BruteForceGuard sends mail when a new lockout is triggered.
    | Leave empty to disable alerts entirely.
    */
    'alert_email' => env('SECURITY_ALERT_EMAIL'),

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
