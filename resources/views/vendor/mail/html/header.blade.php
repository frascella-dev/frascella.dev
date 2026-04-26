@props(['url'])
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block;">
{{-- Inline the SVG as a data URI so it renders without an external
     fetch — most clients block remote images by default until the
     recipient opts in. Source of truth: public/logo.svg. --}}
<img src="data:image/svg+xml;base64,{{ base64_encode(file_get_contents(public_path('logo.svg'))) }}"
     class="logo"
     alt="{{ config('app.name') }}"
     width="75"
     height="75">
</a>
</td>
</tr>
