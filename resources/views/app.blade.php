<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>Emanuele Frascella — Backend engineer</title>
        <meta name="description" content="Portfolio of Emanuele Frascella, backend engineer based in Taranto, Italy.">

        {{-- Favicons — served on every page. --}}
        <link rel="icon" type="image/png" href="{{ asset('favicon-96x96.png') }}" sizes="96x96">
        <link rel="icon" type="image/svg+xml" href="{{ asset('favicon.svg') }}">
        <link rel="shortcut icon" href="{{ asset('favicon.ico') }}">

        {{-- PWA metadata — intentionally only emitted on /admin so the
             public portfolio can't offer an "Add to Home Screen" prompt.
             The manifest's `scope` reinforces this at the browser level. --}}
        @if (request()->is('admin', 'admin/*'))
            <link rel="apple-touch-icon" sizes="180x180" href="{{ asset('apple-touch-icon.png') }}">
            <meta name="apple-mobile-web-app-title" content="Emanuele Frascella Admin">
            <meta name="apple-mobile-web-app-capable" content="yes">
            <meta name="mobile-web-app-capable" content="yes">
            <link rel="manifest" href="{{ asset('site.webmanifest') }}">
        @endif

        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Courier+Prime:wght@400;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @inertiaHead
    </head>
    <body>
        @inertia
    </body>
</html>
