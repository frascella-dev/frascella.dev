<?php

namespace App\Services\Admin;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ProfileService
{
    /**
     * Apply name/email changes. Relies on the caller having validated the
     * shape — uniqueness, email format, length — since those are request
     * concerns, not domain concerns.
     */
    public function updateProfile(User $user, array $attributes): User
    {
        $user->fill($attributes)->save();

        return $user;
    }

    /**
     * Replace the password after verifying the current one. Throws
     * ValidationException so callers can rethrow transparently from a
     * controller action.
     */
    public function changePassword(User $user, string $currentPassword, string $newPassword): void
    {
        if (!Hash::check($currentPassword, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => 'The current password is incorrect.',
            ]);
        }

        $user->forceFill(['password' => Hash::make($newPassword)])->save();
    }
}
