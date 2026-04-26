<?php

use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\LoginController;
use App\Http\Controllers\Admin\ProfileController;
use App\Http\Controllers\Admin\RegisterController;
use App\Http\Controllers\Admin\TwoFactorController;
use App\Http\Controllers\PortfolioController;
use App\Http\Middleware\EnsurePendingTwoFactor;
use App\Http\Middleware\TrackPageView;
use Illuminate\Support\Facades\Route;

Route::get('/', PortfolioController::class)->middleware(TrackPageView::class);

Route::prefix('admin')->name('admin.')->group(function () {
    Route::middleware('guest')->group(function () {
        Route::get('login', LoginController::class)->name('login');
        Route::get('register/{token}', [RegisterController::class, 'show'])
            ->name('register.show');
    });

    Route::middleware(EnsurePendingTwoFactor::class)->group(function () {
        Route::get('2fa', TwoFactorController::class)->name('two-factor.show');
    });

    Route::middleware('auth')->group(function () {
        Route::redirect('/', '/admin/dashboard');
        Route::get('dashboard', DashboardController::class)->name('dashboard');
        Route::get('profile', ProfileController::class)->name('profile.show');
    });
});
