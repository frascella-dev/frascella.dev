<?php

use App\Http\Controllers\Api\Admin\AnalyticsController;
use App\Http\Controllers\Api\Admin\ContactSubmissionsController;
use App\Http\Controllers\Api\Admin\LoginController;
use App\Http\Controllers\Api\Admin\LogoutController;
use App\Http\Controllers\Api\Admin\ProfileController;
use App\Http\Controllers\Api\Admin\RegisterController;
use App\Http\Controllers\Api\Admin\TwoFactorController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Middleware\EnsurePendingTwoFactor;
use Illuminate\Support\Facades\Route;

// Public contact form — DB-side cooldowns layered on top of the throttle.
Route::post('contact', ContactController::class)
    ->middleware('throttle:5,60')
    ->name('api.contact.store');

Route::prefix('admin')->name('api.admin.')->group(function () {
    Route::middleware('guest')->group(function () {
        Route::post('login', LoginController::class)
            ->middleware('throttle:5,1')
            ->name('login');
        Route::post('register/{token}', RegisterController::class)
            ->middleware('throttle:5,1')
            ->name('register.store');
    });

    Route::middleware(EnsurePendingTwoFactor::class)->group(function () {
        Route::post('2fa', TwoFactorController::class)
            ->middleware('throttle:5,1')
            ->name('two-factor.store');
    });

    Route::middleware('auth')->group(function () {
        Route::get('profile', [ProfileController::class, 'show'])->name('profile.show');
        Route::patch('profile', [ProfileController::class, 'update'])->name('profile.update');
        Route::put('profile/password', [ProfileController::class, 'updatePassword'])
            ->name('profile.password');
        Route::post('profile/2fa/reset', [ProfileController::class, 'resetTwoFactor'])
            ->name('profile.2fa.reset');
        Route::post('profile/2fa/confirm', [ProfileController::class, 'confirmTwoFactor'])
            ->middleware('throttle:5,1')
            ->name('profile.2fa.confirm');
        Route::delete('profile/2fa', [ProfileController::class, 'cancelTwoFactor'])
            ->name('profile.2fa.cancel');
        Route::post('profile/avatar', [ProfileController::class, 'uploadAvatar'])
            ->name('profile.avatar.store');
        Route::delete('profile/avatar', [ProfileController::class, 'deleteAvatar'])
            ->name('profile.avatar.delete');
        Route::post('logout', LogoutController::class)->name('logout');

        Route::prefix('contact-submissions')->name('contact-submissions.')->group(function () {
            Route::get('/', [ContactSubmissionsController::class, 'index'])->name('index');
        });

        Route::prefix('analytics')->name('analytics.')->group(function () {
            Route::get('overview', [AnalyticsController::class, 'overview'])->name('overview');
            Route::get('visits', [AnalyticsController::class, 'visits'])->name('visits');
            Route::get('geo', [AnalyticsController::class, 'geo'])->name('geo');
            Route::get('devices', [AnalyticsController::class, 'devices'])->name('devices');
            Route::get('referrers', [AnalyticsController::class, 'referrers'])->name('referrers');
        });
    });
});
