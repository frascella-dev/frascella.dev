@component('mail::message')
# New contact message

You received a new message via the contact form on **{{ config('app.name') }}**.

@component('mail::panel')
**From:** {{ $senderName }}
**Email:** [{{ $senderEmail }}](mailto:{{ $senderEmail }})
**Received:** {{ $receivedAt->format('Y-m-d H:i') }} UTC
@endcomponent

## Message

{{ $body }}

@component('mail::button', ['url' => 'mailto:' . $senderEmail])
Reply to {{ $senderName }}
@endcomponent

@component('mail::subcopy')
Sender identity is anonymised in storage — no IP or user agent is kept.
@endcomponent

— {{ config('app.name') }}
@endcomponent
