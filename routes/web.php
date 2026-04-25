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

        Route::prefix('settings')->name('settings.')->group(function () {
            // Bare /admin/settings lands on the default sub-page.
            Route::redirect('/', '/admin/settings/projects');
            Route::get('projects', ProjectsController::class)->name('projects');

            Route::prefix('timelines')->name('timelines.')->group(function () {
                Route::get('/', [TimelineController::class, 'index'])->name('index');
                Route::get('create', [TimelineController::class, 'create'])->name('create');
                Route::post('/', [TimelineController::class, 'store'])->name('store');
                Route::get('{timeline}/edit', [TimelineController::class, 'edit'])->name('edit');
                Route::patch('{timeline}', [TimelineController::class, 'update'])->name('update');
                Route::delete('{timeline}', [TimelineController::class, 'destroy'])->name('destroy');
                Route::patch('{timeline}/move', [TimelineController::class, 'move'])->name('move');
            });
        });
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
