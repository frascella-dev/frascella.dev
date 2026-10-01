<?php

/**
 * frascella.dev, composed: everything the site is made of that lives in the database.
 *
 *   bin/wp eval-file /var/www/html/tools/site.php [rebuild]
 *
 * - the facts (Settings → frascella.dev): the business's own, never invented;
 * - the projects (Projects), each in Italian and in English, with its screenshot;
 * - the home page in Elementor: native containers and widgets with the theme's classes for
 *   the words, the plugin's widgets where there is data or behaviour (the cut-out words,
 *   the desk, the work), Agenda's widget for the form;
 * - the privacy notice; the «Primary» menu per language;
 * - the header and the footer as Theme Builder documents, with an English copy each;
 * - Agenda's contact form (tools/agenda/contatti.json), hosted by the home page.
 *
 * The words are the owner's (COPY.md). **English is not written yet**: the English pages,
 * projects and form carry the Italian words as placeholders (TODO(en)), in the structure
 * the English will fill, and are written separately once the Italian is approved.
 *
 * Agenda's form uses addresses with a query (`?agenda_step=…`), because its host is the front
 * page, which has no path of its own; and its one step's slug is its key (`message`):
 * WordPress refuses, with a 400, a request whose `agenda_step` differs between the address
 * and the posted fields, and Agenda posts the step's key.
 *
 * Idempotent: what is already there is left alone, unless `rebuild`, which writes the
 * pages, the documents, the projects and the form again from this file.
 */

if (!defined('ABSPATH')) {
    exit(1);
}

$rebuild = in_array('rebuild', (array) ($args ?? []), true);
$say = static fn (string $line) => print($line . "\n");

/* The pieces an Elementor document is made of --------------------------------------------- */

$id = static fn (): string => substr(bin2hex(random_bytes(4)), 0, 7);
$zero = ['unit' => 'px', 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'isLinked' => true];
/** A container: its classes, its children; `tag`, `id` (an anchor), `stop` (a station of the desk's camera). */
$box = static function (string $classes, array $children, array $o = []) use ($id, $zero): array {
    $settings = ['content_width' => 'full', 'html_tag' => $o['tag'] ?? 'div', 'css_classes' => $classes, 'padding' => $zero, 'margin' => $zero];
    if (!empty($o['id'])) {
        $settings['_element_id'] = $o['id'];
    }
    if (!empty($o['stop'])) {
        $settings['frascella_stop'] = $o['stop'];
    }

    return ['id' => $id(), 'elType' => 'container', 'isInner' => !empty($o['inner']), 'settings' => $settings, 'elements' => $children];
};
$widget = static fn (string $type, array $settings, string $classes = '') => [
    'id' => $id(), 'elType' => 'widget', 'widgetType' => $type,
    'settings' => $classes !== '' ? $settings + ['_css_classes' => $classes] : $settings, 'elements' => [],
];
$heading = static fn (string $title, string $tag, string $classes) => $widget('heading', ['title' => $title, 'header_size' => $tag], $classes);
$text = static fn (string $html, string $classes) => $widget('text-editor', ['editor' => $html], $classes);
$button = static fn (string $label, string $url, string $classes) => $widget('button', ['text' => $label, 'link' => ['url' => $url, 'is_external' => '', 'nofollow' => '']], $classes);
$cut = static fn (string $word, array $o = [], string $classes = '') => $widget('frascella-cut', [
    'word' => $word, 'tag' => $o['tag'] ?? '', 'lines' => $o['lines'] ?? '', 'lines_n' => $o['lines_n'] ?? '', 'label' => $o['label'] ?? '',
], $classes);

/* The words, per language (COPY.md) --------------------------------------------------------- */

$it = [
    'home' => 'Home',
    'hero' => [
        'cut' => 'piattaforme, app e integrazioni',
        'lines' => 'piattaforme,|app e integrazioni',
        'lines_n' => 'piattaforme,|app e|integrazioni',
        'rest' => 'dall’architettura al rilascio',
        'where' => 'Taranto · CET · da remoto',
        'lede' => 'Sono un software engineer freelance di Taranto e seguo progetti per aziende, agenzie e startup. Vengo dalla telemedicina, dove ho lavorato con dati sanitari e GDPR; oggi mi occupo dei motori di gioco di casinò online, dove girano soldi veri e i servizi non possono andare giù.',
        'button' => 'Scrivimi →',
    ],
    'services' => [
        'label' => 'Servizi',
        'title' => 'Cosa faccio.',
        'items' => [
            ['piattaforme', 'Siti e piattaforme web', 'Sviluppo siti in WordPress oppure da zero, senza CMS. Per le piattaforme più complesse progetto anche la parte server, con API, database e autenticazione, e quando ha senso la divido in microservizi.'],
            ['app', 'App mobile e web app', 'App per iOS e Android in Flutter, web app in React o Nuxt. Le sviluppo insieme alla parte server, oppure le collego a quella che c’è già.'],
            ['integrazioni', 'Integrazioni e IA', 'Collego gestionali, CRM, sistemi di pagamento e servizi esterni, in modo che i dati passino da uno all’altro senza ricopiarli a mano, con gestione degli errori e un registro di ogni scambio. Integro anche modelli linguistici e agenti nel software esistente, collegandoli ai dati dell’azienda.'],
        ],
    ],
    'works' => ['cut' => 'lavori', 'label' => 'Lavori', 'title' => 'Tre progetti recenti.'],
    'bio' => [
        'cut' => 'chi sono',
        'title' => 'Mi piace costruire le cose che uso.',
        'text' => [
            'Molti dei miei progetti nascono da un’esigenza mia, quando uno strumento non esiste o non fa quello che mi serve. Usarli tutti i giorni mi obbliga a curare anche quello che in una demo non si vede, come i tempi di risposta, i casi limite e cosa succede quando qualcosa va storto. In questo periodo mi sto concentrando sull’IA applicata al software, in particolare su agenti e knowledge graph, e su come farli lavorare con dati reali invece che con esempi di prova.',
            'Da freelance lavoro da solo, quindi parli direttamente con chi scrive il codice. Nel tempo libero vado in palestra e progetto tatuaggi su Procreate.',
        ],
        'facts' => [['CET', 'da remoto, anche su fusi diversi'], ['NDA', 'lo firmo prima di vedere il progetto'], ['2 giorni', 'lavorativi per risponderti']],
    ],
    'contact' => [
        'cut' => 'scrivimi',
        'lede' => 'Raccontami cosa ti serve, cosa esiste già ed entro quando. Bastano poche righe, i dettagli li vediamo insieme in una call.',
        'or' => 'oppure',
        'email' => 'emanuele@frascella.dev',
    ],
    'menu' => [['servizi', '#servizi'], ['lavori', '#lavori'], ['chi sono', '#chi-sono']],
    'privacy' => 'Informativa privacy',
    // The notice's own description (search results), instead of its first lines.
    'privacyExcerpt' => 'Cosa fa questo sito con i dati di chi lo visita: il modulo di contatto, un solo cookie tecnico, nessuna statistica e nessun servizio di terze parti.',
    'projects' => [
        ['seveninktattoo-it', 'seveninktattoo.it', 'cliente', 'Sito per uno studio di tatuaggi di Taranto, in WordPress ed Elementor. Gestisce richieste di appuntamento, recensioni, newsletter e FAQ senza appoggiarsi a servizi esterni, quindi i dati restano sul server dello studio.', 'WordPress · Elementor', 'online', 'https://seveninktattoo.it', 'sevenink-home.webp', 'La home page di seveninktattoo.it'],
        // A proprietary project: no technologies (COPY.md, Registro); the card leaves the line out.
        ['skeda-fit', 'skeda.fit', 'cofondatore', 'App per personal trainer freelance, con schede di allenamento, registrazione delle serie in palestra, chat, check-in e un profilo pubblico sulla mappa. Non è ancora uscita e la lista d’attesa è aperta.', '', 'in sviluppo', 'https://skeda.fit', 'skeda-home.webp', 'La home page di skeda.fit'],
        ['vitrine', 'vitrine', 'mio', 'Un overlay trasparente che sta dietro le icone del desktop di Windows, con i temi scritti come pagine React. Su Ubuntu usavo Conky e su Windows non c’era niente di simile. Parte con il PC e lo uso tutti i giorni.', 'C# · WPF · WebView2', 'codice pubblico su GitHub', 'https://github.com/manuto276/vitrine', 'vitrine-hero.webp', 'vitrine sul desktop di Windows'],
    ],
];
// TODO(en): the English words, written separately once the Italian is approved. Until
// then the Italian ones stand in, so the structure is there to fill.
$words = ['it' => $it, 'en' => $it];

/* The privacy notice: written from the code (docs/guidelines/08-privacy.md) ----------------- */

$privacy = [
    'it' => <<<'HTML'
<p class="note">Aggiornata il 1° ottobre 2026.</p>
<p>La presente informativa descrive quello che questo sito fa con i dati di chi lo visita. È scritta a partire dal codice del sito e cambia insieme a esso.</p>
<h2>Titolare del trattamento</h2>
<p>Il titolare del trattamento è Emanuele Frascella, software engineer, Taranto (Italia), P. IVA 03462650734. Il sito è gestito da una sola persona fisica. Le richieste relative alla presente informativa possono essere inviate a <a href="mailto:emanuele@frascella.dev">emanuele@frascella.dev</a> oppure tramite il <a href="/#contatti">modulo di contatto</a>.</p>
<h2>Il modulo di contatto</h2>
<p>Il modulo «scrivimi» raccoglie <strong>nome</strong>, <strong>indirizzo email</strong> e <strong>messaggio</strong>, necessari, e il nome dell’<strong>azienda</strong>, facoltativo. Insieme a essi il sito registra la data e l’ora dell’invio, la lingua della pagina e l’indirizzo della pagina dalla quale è stato inviato.</p>
<ul>
<li><strong>Finalità e base giuridica:</strong> rispondere al messaggio ed eventualmente preparare un preventivo; misure precontrattuali adottate su richiesta dell’interessato (art. 6, par. 1, lett. b) GDPR). Non è richiesto alcun consenso.</li>
<li><strong>Dove:</strong> nel database del sito, sul server che lo ospita. Una copia del messaggio è inviata per email all’indirizzo del titolare, emanuele@frascella.dev.</li>
<li><strong>Chi li legge:</strong> soltanto il titolare.</li>
<li><strong>Per quanto tempo:</strong> il messaggio e i dati che lo accompagnano sono cancellati automaticamente dopo <strong>12 mesi</strong>; la copia dell’email di notifica conservata nel registro di invio del sito dopo <strong>90 giorni</strong>. Possono essere cancellati prima, su richiesta.</li>
<li>Il sito non invia email automatiche a chi scrive: la risposta è scritta dal titolare.</li>
</ul>
<p>Per proteggere il modulo da invii automatici il sito usa un campo nascosto, un controllo sul tempo di compilazione e un limite al numero di invii. Il limite si basa sull’indirizzo IP, che non viene mai salvato: è trasformato in un codice (un hash con una chiave che cambia ogni giorno) conservato al massimo per un’ora. Per evitare doppi invii, un secondo messaggio dallo stesso indirizzo email nei 15 minuti successivi non viene accettato.</p>
<h2>Il fruscio del vinile</h2>
<p>Il suono del giradischi sulla scrivania («audio on / off») è generato dal browser, sul momento: il sito non scarica alcun file audio, non registra nulla e non riceve nulla.</p>
<h2 id="cookie">Cookie</h2>
<p>Il sito usa un solo cookie per chi lo visita. È un cookie tecnico, impostato soltanto da chi invia il modulo, e per questo non richiede consenso né un banner (art. 122 Codice Privacy; Garante, linee guida cookie del 10 giugno 2021).</p>
<table>
<thead><tr><th scope="col">Nome</th><th scope="col">Funzione</th><th scope="col">Durata</th></tr></thead>
<tbody><tr><td><code>agenda_draft</code></td><td>Collega l’invio del modulo alla conferma che segue. Contiene un codice casuale; il server ne conserva soltanto un hash.</td><td>Fino alla conferma dell’invio, o alla chiusura del browser.</td></tr></tbody>
</table>
<p>Chi accede al pannello di amministrazione riceve inoltre i cookie di accesso di WordPress; i visitatori no.</p>
<h2>Quello che il sito non fa</h2>
<ul>
<li>Non misura le visite: non ci sono statistiche né strumenti di analisi.</li>
<li>Non carica nulla da altri siti: caratteri tipografici, script e immagini sono serviti da questo dominio. Nessuna pubblicità, nessun pulsante social, nessun video o mappa di terze parti.</li>
<li>Non usa cookie di profilazione o di terze parti, e non conserva altro nel browser.</li>
<li>Non cede né vende i dati a nessuno.</li>
</ul>
<h2>Il server</h2>
<p>[Da completare dal titolare: il fornitore che ospita il server, il paese in cui si trova e per quanto tempo il server conserva i propri registri di accesso, che come per ogni sito web contengono l’indirizzo IP, la pagina richiesta e l’ora.]</p>
<h2>Diritti dell’interessato</h2>
<p>Ai sensi degli articoli da 15 a 22 del GDPR l’interessato può chiedere l’accesso ai dati che lo riguardano, la loro rettifica o cancellazione, la limitazione del trattamento o una copia in formato portabile, e può opporsi al trattamento. Le richieste possono essere inviate a <a href="mailto:emanuele@frascella.dev">emanuele@frascella.dev</a> oppure tramite il <a href="/#contatti">modulo di contatto</a>. Ai sensi dell’art. 77 è possibile proporre reclamo al Garante per la protezione dei dati personali, <a href="https://www.garanteprivacy.it" rel="noopener noreferrer">garanteprivacy.it</a>.</p>
HTML,
];
// TODO(en): written separately once the Italian is approved; the Italian notice stands in,
// with the addresses of the English pages.
$privacy['en'] = str_replace('href="/#contatti"', 'href="/en/#contatti"', $privacy['it']);

/* The facts: the business's own --------------------------------------------------------------- */

update_option('frascella_facts', [
    'name' => 'Emanuele Frascella',
    'street' => '',
    'postcode' => '',
    'city' => 'Taranto',
    'region' => '',
    'country' => 'IT',
    'phone' => '',
    // Who receives the requests (inc/agenda.php). On this machine local-mail.php sends it
    // to Mailpit, whatever the address.
    'email' => 'emanuele@frascella.dev',
    'vat' => '03462650734',
    'github' => 'https://github.com/manuto276',
    'linkedin' => 'https://www.linkedin.com/in/efrascella256/',
]);
update_option('blogname', 'frascella.dev');
update_option('blogdescription', '');
$say('✓ facts');

/* Pages ---------------------------------------------------------------------------------------- */

// WordPress's own sample content and draft privacy page, which no site keeps.
foreach ([get_page_by_path('sample-page'), get_page_by_path('hello-world', OBJECT, 'post'), get_page_by_path('privacy-policy')] as $sample) {
    if ($sample && $sample->post_status !== 'publish') {
        wp_delete_post($sample->ID, true);
    } elseif ($sample && in_array($sample->post_name, ['sample-page', 'hello-world'], true)) {
        wp_delete_post($sample->ID, true);
    }
}

/** A post of a type in a language, by slug: found, or created. */
$post = static function (string $type, string $slug, string $title, string $lang) use ($say): int {
    // By slug, then by language: under WP-CLI Polylang's query filter does not run, and a
    // `lang` argument to get_posts() is silently ignored.
    foreach (get_posts(['post_type' => $type, 'name' => $slug, 'lang' => '', 'numberposts' => -1, 'fields' => 'ids', 'post_status' => 'any']) as $found) {
        if (!function_exists('pll_get_post_language') || pll_get_post_language((int) $found) === $lang) {
            return (int) $found;
        }
    }
    $new = (int) wp_insert_post(['post_type' => $type, 'post_status' => 'publish', 'post_title' => $title, 'post_name' => $slug]);
    if (function_exists('pll_set_post_language')) {
        pll_set_post_language($new, $lang);
        // Saved again now that it has a language, so the plugin keeps the same slug in every
        // language (inc/polylang.php): WordPress gave it `slug-2` at insert time.
        wp_update_post(['ID' => $new, 'post_name' => $slug]);
    }
    $say("  + $type $slug ($lang)");

    return $new;
};

/* The screenshots ----------------------------------------------------------------------------- */

require_once ABSPATH . 'wp-admin/includes/image.php';
$image = static function (string $file, string $alt) use ($say): int {
    $found = get_posts(['post_type' => 'attachment', 'meta_key' => '_frascella_seed', 'meta_value' => $file, 'fields' => 'ids', 'numberposts' => 1, 'post_status' => 'any', 'lang' => '']);
    if ($found) {
        return (int) $found[0];
    }
    $source = ABSPATH . 'tools/content/' . $file;
    $bits = wp_upload_bits($file, null, (string) file_get_contents($source));
    if (!empty($bits['error'])) {
        $say("! $file: {$bits['error']}");

        return 0;
    }
    $attachment = (int) wp_insert_attachment(['post_mime_type' => 'image/webp', 'post_title' => pathinfo($file, PATHINFO_FILENAME), 'post_status' => 'inherit'], $bits['file']);
    wp_update_attachment_metadata($attachment, wp_generate_attachment_metadata($attachment, $bits['file']));
    update_post_meta($attachment, '_wp_attachment_image_alt', $alt);
    // TODO(en): the English alt text, written with the rest of the English.
    update_post_meta($attachment, '_frascella_alt_en', $alt);
    update_post_meta($attachment, '_frascella_seed', $file);
    $say("  + image $file");

    return $attachment;
};

/* The projects --------------------------------------------------------------------------------- */

$projects = [];
foreach ($words as $lang => $w) {
    foreach ($w['projects'] as $order => [$slug, $title, $role, $body, $stack, $status, $url, $file, $alt]) {
        $pid = $post('frascella_project', $slug, $title, $lang);
        if ($rebuild || get_post_meta($pid, '_frascella_role', true) === '') {
            wp_update_post(['ID' => $pid, 'post_title' => $title, 'post_content' => $body, 'menu_order' => $order + 1]);
            update_post_meta($pid, '_frascella_role', $role);
            update_post_meta($pid, '_frascella_stack', $stack);
            update_post_meta($pid, '_frascella_status', $status);
            update_post_meta($pid, '_frascella_url', $url);
            $img = $image($file, $alt);
            if ($img > 0) {
                set_post_thumbnail($pid, $img);
            }
        }
        $projects[$slug][$lang] = $pid;
    }
}
if (function_exists('pll_save_post_translations')) {
    foreach ($projects as $pair) {
        pll_save_post_translations($pair);
    }
}
$say('✓ projects');

/* The home page ---------------------------------------------------------------------------------- */

$layout = static function (array $w, string $lang) use ($box, $widget, $heading, $text, $button, $cut): array {
    $services = [];
    foreach ($w['services']['items'] as $i => [$word, $title, $body]) {
        $n = sprintf('%02d', $i + 1);
        $services[] = $box('poster svc' . ($i === 1 ? ' poster--flip' : ''), [
            $cut($word, [], $i === 1 ? 'cut-r' : ''),
            $box('band pane frascella-reveal', [
                $heading('<span class="no">' . $n . '</span><br>' . $title, 'h3', 'display'),
                $text('<p>' . $body . '</p>', 'txt'),
            ], ['inner' => true]),
        ], ['inner' => true, 'stop' => 's' . ($i + 1)]);
    }
    $facts = '<div class="facts">' . implode('', array_map(static fn (array $f): string => "<div><b>{$f[0]}</b><span>{$f[1]}</span></div>", $w['bio']['facts'])) . '</div>';

    return [
        // 1. The opening.
        $box('poster hero', [
            $box('hero-title', [
                $cut($w['hero']['cut'], ['tag' => 'h1', 'lines' => $w['hero']['lines'], 'lines_n' => $w['hero']['lines_n']], 'cut-l'),
                $heading($w['hero']['rest'], 'p', 'hero-rest'),
            ], ['inner' => true]),
            $box('band pane', [
                $heading($w['hero']['where'], 'p', 'rh'),
                $text('<p>' . $w['hero']['lede'] . '</p>', 'txt'),
                $button($w['hero']['button'], '#contatti', 'cta cta--big'),
            ], ['inner' => true]),
        ], ['tag' => 'section', 'stop' => 'hero']),

        // 2. The desk.
        $widget('frascella-desk', []),

        // 3. Services.
        $box('services', [
            $box('intro pane', [
                $heading($w['services']['label'], 'p', 'rh'),
                $heading($w['services']['title'], 'h2', 'intro-title'),
            ], ['inner' => true]),
            ...$services,
        ], ['tag' => 'section', 'id' => 'servizi']),

        // 4. Work.
        $box('work', [
            $box('poster window', [
                $cut($w['works']['cut']),
                $box('band pane', [
                    $heading($w['works']['label'], 'p', 'rh'),
                    $heading($w['works']['title'], 'h2', 'display'),
                ], ['inner' => true]),
            ], ['inner' => true, 'stop' => 'w0']),
            $widget('frascella-works', ['count' => 0]),
        ], ['tag' => 'section', 'id' => 'lavori']),

        // 5. Bio.
        $box('poster bio', [
            $cut($w['bio']['cut']),
            $box('band pane frascella-reveal', [
                $heading($w['bio']['title'], 'h2', 'display'),
                $text(implode('', array_map(static fn (string $p): string => "<p>$p</p>", $w['bio']['text'])), 'txt'),
                $text($facts, 'bio-facts'),
            ], ['inner' => true]),
        ], ['tag' => 'section', 'id' => 'chi-sono', 'stop' => 'bio']),

        // 6. Contact.
        $box('poster contact', [
            $cut($w['contact']['cut'], ['tag' => 'h2']),
            $box('band band--wide pane', [
                $box('contact-text', [
                    $text('<p>' . $w['contact']['lede'] . '</p>', 'contact-lede'),
                    $text('<p>' . $w['contact']['or'] . ' <a href="mailto:' . $w['contact']['email'] . '">' . $w['contact']['email'] . '</a></p>', 'contact-where'),
                ], ['inner' => true]),
                $widget('agenda-form', ['form' => 'contatti']),
            ], ['inner' => true]),
        ], ['tag' => 'section', 'id' => 'contatti', 'stop' => 'contact']),
    ];
};

$homes = [];
$privacies = [];
foreach ($words as $lang => $w) {
    $homes[$lang] = $post('page', 'home', $w['home'], $lang);
    $privacies[$lang] = $post('page', 'privacy', $w['privacy'], $lang);
    $built = get_post_meta($homes[$lang], '_frascella_built', true) === '1';
    if ($rebuild || !$built) {
        update_post_meta($homes[$lang], '_elementor_data', wp_slash((string) wp_json_encode($layout($w, $lang))));
        update_post_meta($homes[$lang], '_elementor_edit_mode', 'builder');
        update_post_meta($homes[$lang], '_elementor_template_type', 'wp-page');
        update_post_meta($homes[$lang], '_elementor_version', defined('ELEMENTOR_VERSION') ? ELEMENTOR_VERSION : '3.0.0');
        update_post_meta($homes[$lang], '_wp_page_template', 'default');
        update_post_meta($homes[$lang], '_frascella_built', '1');
        $say("✓ home ($lang)");
    }
    if ($rebuild || get_post_meta($privacies[$lang], '_frascella_built', true) !== '1') {
        wp_update_post(['ID' => $privacies[$lang], 'post_title' => $w['privacy'], 'post_content' => $privacy[$lang], 'post_excerpt' => $w['privacyExcerpt']]);
        update_post_meta($privacies[$lang], '_frascella_built', '1');
        $say("✓ privacy ($lang)");
    }
}
if (function_exists('pll_save_post_translations')) {
    pll_save_post_translations($homes);
    pll_save_post_translations($privacies);
}
update_option('show_on_front', 'page');
update_option('page_on_front', $homes['it']);
update_option('wp_page_for_privacy_policy', $privacies['it']);

/* The «Primary» menu, per language: the header, the drawer and the footer read it ------------ */

$menus = [];
foreach ($words as $lang => $w) {
    $name = 'Primary (' . strtoupper($lang) . ')';
    $menu = wp_get_nav_menu_object($name);
    $menuId = $menu ? (int) $menu->term_id : (int) wp_create_nav_menu($name);
    $root = $lang === 'it' ? '/' : "/$lang/";
    $want = array_map(static fn (array $item): string => $item[0] . '|' . $root . $item[1], $w['menu']);
    $have = array_map(static fn ($item): string => $item->title . '|' . $item->url, (array) wp_get_nav_menu_items($menuId));
    if ($want !== $have) {
        foreach ((array) wp_get_nav_menu_items($menuId) as $old) {
            wp_delete_post((int) $old->ID, true);
        }
        // Addresses without the host: the same menu works on this machine and in production.
        foreach ($w['menu'] as $i => [$title, $anchor]) {
            wp_update_nav_menu_item($menuId, 0, ['menu-item-title' => $title, 'menu-item-url' => $root . $anchor, 'menu-item-type' => 'custom', 'menu-item-status' => 'publish', 'menu-item-position' => $i + 1]);
        }
        $say("✓ menu ($lang)");
    }
    $menus[$lang] = $menuId;
}
set_theme_mod('nav_menu_locations', ['primary' => $menus['it']] + (array) get_theme_mod('nav_menu_locations', []));
if (function_exists('PLL')) {
    $options = (array) get_option('polylang', []);
    $options['nav_menus'][get_stylesheet()]['primary'] = $menus;
    update_option('polylang', $options);
}

/* The header and the footer: Theme Builder documents, one copy per language ------------------- */

if (defined('ELEMENTOR_PRO_VERSION')) {
    foreach (['header' => 'frascella-header', 'footer' => 'frascella-footer'] as $type => $widgetType) {
        $found = get_posts(['post_type' => 'elementor_library', 'meta_key' => '_frascella_seed', 'meta_value' => $type, 'fields' => 'ids', 'numberposts' => 1, 'post_status' => 'any', 'lang' => '']);
        $doc = (int) ($found[0] ?? 0);
        if ($doc === 0) {
            $doc = (int) wp_insert_post(['post_type' => 'elementor_library', 'post_status' => 'publish', 'post_title' => ucfirst($type)]);
            wp_set_object_terms($doc, $type, 'elementor_library_type');
            update_post_meta($doc, '_elementor_template_type', $type);
            update_post_meta($doc, '_elementor_edit_mode', 'builder');
            update_post_meta($doc, '_frascella_seed', $type);
            update_post_meta($doc, '_frascella_lang', 'it');
            $say("  + $type document");
        }
        if ($rebuild || get_post_meta($doc, '_elementor_data', true) === '') {
            update_post_meta($doc, '_elementor_data', wp_slash((string) wp_json_encode([$widget($widgetType, [])])));
            update_post_meta($doc, '_elementor_version', defined('ELEMENTOR_VERSION') ? ELEMENTOR_VERSION : '3.0.0');
        }
        // Shown on the whole site; only the default language's document carries conditions.
        update_post_meta($doc, '_elementor_conditions', ['include/general']);
        $conditions = (array) get_option('elementor_pro_theme_builder_conditions', []);
        $conditions[$type][$doc] = ['include/general'];
        update_option('elementor_pro_theme_builder_conditions', $conditions);
        // The English copy: duplicated once, then its own (its fields start from the English words).
        if (function_exists('frascella_translate_template')) {
            $copy = frascella_translate_template($doc, 'en');
            if (!is_wp_error($copy) && $rebuild) {
                update_post_meta((int) $copy, '_elementor_data', wp_slash((string) wp_json_encode([$widget($widgetType, [])])));
            }
        }
        $say("✓ $type (Theme Builder)");
    }
}

/* The contact form (Agenda), hosted by the home page ------------------------------------------- */

if (function_exists('agenda_import_form') && function_exists('agenda_get_form')) {
    if ($rebuild || !agenda_get_form('contatti')) {
        $schema = json_decode((string) file_get_contents(ABSPATH . 'tools/agenda/contatti.json'), true);
        $result = agenda_import_form((array) $schema, ['page_id' => $homes['it'], 'status' => 'active']);
        $say(is_wp_error($result) ? '! form: ' . implode(' ', $result->get_error_messages()) : '✓ contact form (Agenda)');
    }
} else {
    $say('· Agenda is not active: the contact poster has no form until it is.');
}

if (class_exists('\Elementor\Plugin')) {
    \Elementor\Plugin::$instance->files_manager->clear_cache();
}
flush_rewrite_rules();
$say('Site ready.');
