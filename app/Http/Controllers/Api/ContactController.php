<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ContactService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ContactController extends Controller
{
    public function __construct(private readonly ContactService $contacts)
    {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['required', 'email:rfc,dns', 'max:180'],
            'message' => ['required', 'string', 'min:10', 'max:5000'],
            // Honeypot — bots happily fill any visible-looking field.
            'website' => ['nullable', 'string', 'max:0'],
        ]);

        $result = $this->contacts->submit(
            name: $data['name'],
            email: $data['email'],
            body: $data['message'],
            ip: $request->ip(),
            userAgent: $request->userAgent() ?: null,
        );

        if (!$result['ok']) {
            $reason = $result['reason'] ?? 'rejected';

            if ($reason === 'mail_not_configured') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Mail is not configured on the server.',
                ], 503);
            }

            throw ValidationException::withMessages([
                'message' => match ($reason) {
                    'cooldown' => 'You sent a message recently — please wait a bit before sending another.',
                    'daily_limit' => 'Too many messages from your network today. Try again tomorrow.',
                    default => 'Could not deliver your message right now.',
                },
            ]);
        }

        return response()->json([
            'status' => 'ok',
            'message' => 'Message sent.',
        ]);
    }
}
