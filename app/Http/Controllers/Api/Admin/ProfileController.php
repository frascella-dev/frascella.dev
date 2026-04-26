<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Admin\ProfileService;
use App\Services\AvatarService;
use App\Services\TwoFactorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function __construct(
        private readonly ProfileService $profiles,
        private readonly TwoFactorService $twoFactor,
        private readonly AvatarService $avatars,
    ) {
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json($this->payload($request->user()));
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
        ]);

        $this->profiles->updateProfile($user, $data);

        return response()->json($this->payload($user->fresh()));
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $this->profiles->changePassword(
            $request->user(),
            $data['current_password'],
            $data['password'],
        );

        return response()->json(['status' => 'ok']);
    }

    public function resetTwoFactor(Request $request): JsonResponse
    {
        $this->twoFactor->beginRotation($request->user());

        return response()->json($this->payload($request->user()->fresh()));
    }

    public function confirmTwoFactor(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $confirmed = $this->twoFactor->confirmRotation($request->user(), $data['code']);

        if (!$confirmed) {
            throw ValidationException::withMessages([
                'code' => 'The code is invalid or has expired. Try again.',
            ]);
        }

        return response()->json($this->payload($request->user()->fresh()));
    }

    public function cancelTwoFactor(Request $request): JsonResponse
    {
        $this->twoFactor->cancelRotation($request->user());

        return response()->json($this->payload($request->user()->fresh()));
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $data = $request->validate([
            // Cap to whatever the running PHP build accepts — using a higher
            // limit just surfaces as a silent UPLOAD_ERR_INI_SIZE with a
            // confusing "field is required" fallback message.
            'avatar' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp,avif,gif',
                'max:' . self::uploadLimitKb(),
            ],
        ]);

        $this->avatars->set($request->user(), $data['avatar']);

        return response()->json($this->payload($request->user()->fresh()));
    }

    public function deleteAvatar(Request $request): JsonResponse
    {
        $this->avatars->remove($request->user());

        return response()->json($this->payload($request->user()->fresh()));
    }

    /**
     * Canonical JSON shape returned by every endpoint that touches the
     * profile — keeps the React side free of "did this mutation also
     * change the avatar?" branching.
     *
     * @return array<string, mixed>
     */
    private function payload(User $user): array
    {
        $user->loadMissing('avatar');

        return [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar_url' => $user->avatar?->url(),
            ],
            'twoFactor' => [
                'confirmed_at' => $user->two_factor_confirmed_at?->toIso8601String(),
                'pending' => $this->twoFactor->pendingRotationPayload($user),
            ],
            'avatarUploadLimitKb' => self::uploadLimitKb(),
        ];
    }

    public static function uploadLimitKb(): int
    {
        $bytes = min(
            self::parseIniBytes((string) ini_get('upload_max_filesize')),
            self::parseIniBytes((string) ini_get('post_max_size')),
        );

        return max(256, (int) floor(($bytes - 2048) / 1024));
    }

    private static function parseIniBytes(string $value): int
    {
        $value = trim($value);
        if ($value === '') {
            return 0;
        }

        $unit = strtolower(substr($value, -1));
        $number = (int) $value;

        return match ($unit) {
            'g' => $number * 1024 * 1024 * 1024,
            'm' => $number * 1024 * 1024,
            'k' => $number * 1024,
            default => $number,
        };
    }
}
