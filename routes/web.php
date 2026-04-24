<?php

use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\LoginController;
use App\Http\Controllers\Admin\LogoutController;
use App\Http\Controllers\Admin\ProfileController;
use App\Http\Controllers\Admin\ProjectsController;
use App\Http\Controllers\Admin\TimelineController;
use App\Http\Controllers\Admin\TwoFactorController;
use App\Http\Controllers\PortfolioController;
use App\Http\Middleware\EnsurePendingTwoFactor;
use Illuminate\Support\Facades\Route;

Route::get('/', PortfolioController::class);

Route::prefix('admin')->name('admin.')->group(function () {
    Route::middleware('guest')->group(function () {
        Route::get('login', [LoginController::class, 'show'])->name('login');
        Route::post('login', [LoginController::class, 'store'])
            ->middleware('throttle:5,1');
    });

    Route::middleware(EnsurePendingTwoFactor::class)->group(function () {
        Route::get('2fa', [TwoFactorController::class, 'show'])->name('two-factor.show');
        Route::post('2fa', [TwoFactorController::class, 'store'])
            ->name('two-factor.store')
            ->middleware('throttle:5,1');
    });

    Route::middleware('auth')->group(function () {
        Route::redirect('/', '/admin/dashboard');
        Route::get('dashboard', DashboardController::class)->name('dashboard');
        Route::get('projects', ProjectsController::class)->name('projects');
        Route::get('timeline', TimelineController::class)->name('timeline');
        Route::get('profile', [ProfileController::class, 'show'])->name('profile.show');
        Route::patch('profile', [ProfileController::class, 'update'])->name('profile.update');
        Route::put('profile/password', [ProfileController::class, 'updatePassword'])
            ->name('profile.password');
        Route::post('profile/2fa/reset', [ProfileController::class, 'resetTwoFactor'])
            ->name('profile.2fa.reset');
        Route::post('profile/2fa/confirm', [ProfileController::class, 'confirmTwoFactor'])
            ->name('profile.2fa.confirm')
            ->middleware('throttle:5,1');
        Route::delete('profile/2fa', [ProfileController::class, 'cancelTwoFactor'])
            ->name('profile.2fa.cancel');
        Route::post('profile/avatar', [ProfileController::class, 'uploadAvatar'])
            ->name('profile.avatar.store');
        Route::delete('profile/avatar', [ProfileController::class, 'deleteAvatar'])
            ->name('profile.avatar.delete');
        Route::post('logout', LogoutController::class)->name('logout');
    });
});
