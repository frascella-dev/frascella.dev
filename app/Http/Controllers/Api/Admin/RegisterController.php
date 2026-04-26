<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Admin\AdminInvitationService;
use App\Services\TwoFactorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class RegisterController extends Controller
{
    public function __construct(
        private readonly AdminInvitationService $invitations,
        private readonly TwoFactorService $twoFactor,
    ) {
    }

    public function __invoke(Request $request, string $token): JsonResponse
    {
        $invitation = $this->invitations->findOpen($token);

        if (!$invitation) {
            return response()->json([
                'status' => 'invitation_invalid',
                'next' => route('admin.login'),
            ], 410);
        }

        $invitation = $this->invitations->ensureSecret($invitation);

        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'password' => [
                'required',
                'string',
                'min:' . AdminInvitationService::MIN_PASSWORD_LENGTH,
                'confirmed',
            ],
            'code' => ['required', 'string', 'size:6'],
            // Block races where someone created a user under this email
            // between the invitation and the form submit.
            'email' => [
                Rule::prohibitedIf(
                    fn () => User::where('email', $invitation->email)->exists(),
                ),
            ],
        ]);

        if (!$this->twoFactor->verify($invitation->two_factor_secret, $data['code'])) {
            throw ValidationException::withMessages([
                'code' => 'The code is invalid or has expired. Try again.',
            ]);
        }

        $this->invitations->consume(
            $invitation,
            $data['name'],
            $data['password'],
        );

        return response()->json([
            'status' => 'ok',
            'next' => route('admin.login'),
        ]);
    }
}
