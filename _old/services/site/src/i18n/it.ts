/**
 * Italiano.
 *
 * Scritta in italiano, non ricalcata sull'inglese: le due pagine raccontano
 * la stessa persona, ma con frasi che un madrelingua avrebbe scritto di suo,
 * non tradotto frase per frase. Dove l'ordine delle parole o l'immagine
 * dell'inglese qui suonerebbero da manuale, sono state riscritte da capo.
 * Quello che resta identico è il *significato* — in particolare ogni
 * affermazione della pagina privacy, verificabile leggendo il codice, e
 * quindi non negoziabile passando da una lingua all'altra: stessi numeri,
 * stessi articoli di legge, stesse esclusioni.
 *
 * La terminologia legale è quella italiana, non il calco dall'inglese:
 * "titolare del trattamento" e non "controllore", "base giuridica", "legittimo
 * interesse", "reclamo al Garante". Gli articoli del GDPR sono citati nella
 * forma italiana — art. 6, par. 1, lett. a) — perché è quella che un lettore
 * italiano ritrova nel testo ufficiale.
 *
 * `owner.role` resta "Software engineer": è il titolo che uno sviluppatore
 * italiano usa di sé, non un'omissione di traduzione — il perché è nel
 * commento accanto al campo.
 */

import type { Content } from "./types.ts";

export const it = {
    htmlLang: "it",
    ogLocale: "it_IT",
    endonym: "Italiano",

    owner: {
        // Lasciato in inglese di proposito: è il titolo che gli sviluppatori
        // italiani usano di sé, e "sviluppatore software" leggerebbe come una
        // rivendicazione diversa e leggermente più piccola.
        role: "Software engineer",
        city: "Taranto, Italia",
    },

    meta: {
        description: (who) =>
            `Portfolio di ${who.name}, ${who.role.toLowerCase()} nato a ${who.city}. Backend e motori di gioco dietro le piattaforme di casinò online — prima, telemedicina e progettazione di impianti fotovoltaici.`,
        privacyTitle: (who) => `Informativa privacy — ${who.name}`,
        privacyDescription:
            "Quali dati raccoglie questo sito, per quali finalità, per quanto tempo li conserva e come negare il consenso.",
    },

    nav: {
        links: [
            { label: "home", href: "#top" },
            { label: "chi sono", href: "#bio" },
            { label: "progetti", href: "#work" },
            { label: "contatti", href: "#contact" },
        ],
        sections: "Sezioni",
        openMenu: "Apri il menu",
        closeMenu: "Chiudi il menu",
        menu: "Menu",
        markLabel: (who) => `${who.name} — torna su`,
    },

    hero: {
        // The Italian headline names the specialty where the English one
        // names the habit. They are allowed to differ — each is written for
        // its own reader, not translated for the other — and the split is
        // what makes the difference work: the connective is the dimmed half,
        // so "microservizi e orchestrazione" lands solid, in full weight,
        // which is the whole point of saying it here rather than in the bio.
        titleDim: "specializzato in",
        titleAfter: "microservizi e orchestrazione.",
        // The English lede avoids opening on "taking things apart" because
        // its own h1 already says it. This one has no such neighbour, so it
        // keeps the image the Italian headline gave up.
        lede: "Ho iniziato smontando le cose — APK, mod, qualunque cosa avesse una fessura — e poi è diventato un lavoro. Adesso le cose sono sistemi in produzione, e la parte interessante non è costruirli. È che restino in piedi.",
        portraitAlt: (who) => `Ritratto di ${who.name}`,
    },

    bio: {
        eyebrow: "01 — bio",
        hint: "apri una riga qualsiasi",
        tileDefault: "taranto, italia",
        rows: [
            {
                tile: "taranto, italia",
                lead: "la città",
                trail: "dei due mari",
                meta: "taranto",
                gallery: "taranto",
                body: [
                    "Nato a Taranto, sulla costa ionica. Lavoro in CET, lo stesso fuso orario di quasi tutta Europa.",
                    "Una giornata tipo: caffè, lavoro, palestra — mai saltare il leg day — cena, e poi il progetto personale del momento.",
                ],
            },
            {
                tile: "le cose si rompono",
                // Over Lavoisier — "nulla si crea, nulla si distrugge, tutto
                // si trasforma", the line every Italian meets at school. The
                // joke is in the swap, and it is the only headline in this
                // column that has one. A literal "l'ho rotto, l'ho aggiustato"
                // was tried first and died on the clitic: Italian forces the
                // pronoun where English can just say "broke it, fixed it".
                lead: "niente si crea,",
                trail: "tutto si rompe",
                meta: "in produzione",
                gallery: "repair",
                body: [
                    "Le cose si rompono in produzione. Non è quella la parte interessante — lo è quanto restano rotte, e se la stessa cosa torna a rompersi il mese dopo.",
                    "Sapere di chi fosse la colpa non ha mai accelerato una fix di un solo minuto. Risolvi il problema, scrivi cos'è successo perché non si ripeta, e vai avanti. Si vince in squadra.",
                ],
            },
            {
                // The year in letters, which in Italian moves a date out of
                // the register of a CV and into that of a story. The tile
                // followed the headline: it said "apk e mod" until the
                // teardown examples moved up into the hero, and a label
                // promising something the row no longer says is a label
                // pointing at nothing.
                tile: "duemilatredici",
                lead: "la prima riga,",
                trail: "duemilatredici",
                meta: "la genesi",
                gallery: "coding",
                body: [
                    "Scrivo codice dal 2013 — prima app Android, poi C++ per tutto il liceo.",
                    "Non è mai stato per costruire qualcosa. Era per scoprire come era stata costruita la cosa che avevo davanti.",
                ],
            },
            {
                tile: "procreate",
                // The pun the English cannot make: "linee" is what you
                // write code in and what you draw with. Saying "le stesse"
                // is what turns it from a statement into a joke, and it does
                // not have to name the code for the reader to hear it.
                lead: "stesse linee,",
                trail: "altro inchiostro",
                meta: "fuori orario",
                gallery: "drawing",
                body: [
                    "Ogni tanto una sera finisce su Procreate. Soprattutto disegni per tatuaggi — flash, lettering, cose che qualcuno potrebbe davvero portarsi addosso.",
                    "È il contrario esatto di quello che faccio di giorno, e credo sia proprio questo il punto: niente da smontare, niente da debuggare, solo una linea che funziona o non funziona.",
                ],
            },
            {
                tile: "microservizi e container",
                lead: "microservizi",
                trail: "e container",
                meta: "focus",
                gallery: "containers",
                body: [
                    "Servizi Node, PHP e Python dietro un layer di API, Docker sotto. I pezzi piccoli sono più facili da costruire e da testare — anche tra team che condividono lo stesso repo — e se ne cade uno, gli altri restano in piedi.",
                    "L'opinione che mi mette in minoranza: l'igiene conta più del framework — submodule fatti come si deve, un albero di cartelle che non va reimparato ogni volta, file .env che non toccano mai git, devcontainer quando se li sono guadagnati.",
                ],
            },
        ],
        alt: {
            "taranto.0": "Il ponte girevole e il castello aragonese di Taranto al tramonto",
            "taranto.1": "Il monumento ai Marinai d'Italia a Taranto contro un cielo serale",
            "taranto.2": "Un vicolo della città vecchia di Taranto che si apre sul mare",
            "drawing.0": "Un disegno per un tatuaggio a tema koi fatto in Procreate su iPad, con l'Apple Pencil accanto",
            "repair.0": "Un vecchio telefono aperto sotto una lampada da scrivania, scocca e viti posate accanto a un cacciavite",
            "coding.0": "Un portatile su una scrivania di legno con un file Python aperto nell'editor",
            "containers.0": "Container impilati e gru di banchina in un porto al tramonto",
        },
    },

    work: {
        eyebrow: "02 — progetti scelti",
        introLead: "un po' di cose che ho costruito",
        introDim: "e che mantengo ancora",
        introAside: "ne vale la pena",
        progressHint: "c'è dell'altro",
        outroEyebrow: "questa è la lista corta",
        outroLine: "altri progetti su",
        projectCount: (n) => `${n} progetti`,
        projects: [
            {
                title: "vitrine",
                desc: "Un overlay trasparente che vive dietro le icone del desktop, costruito la settimana in cui al lavoro hanno sostituito la mia Ubuntu — Conky compreso — con Windows 11. I temi si scrivono in React, e parte ancora insieme al PC tutte le mattine.",
                meta: "2026 · c# · wpf · webview2",
            },
            {
                title: "proxima",
                desc: "Nato come un modo per pianificare e registrare i miei allenamenti al posto di un foglio di calcolo, poi gli è cresciuto attorno un server MCP perché Claude potesse leggere direttamente progressi, esercizi e statistiche. Da allora è aperto anche ad altre persone — ognuna collega un Claude suo, con vera MFA dietro.",
                meta: "2026 · flutter · python · mysql",
            },
        ],
    },

    contact: {
        eyebrow: "03 — contatti",
        titleLead: "fatti",
        titleDim: "sentire.",
        lede: "Lavoro da freelance, quindi le proposte sono benvenute. Ma va benissimo anche solo scrivermi che qualcosa qui sopra ti è piaciuto — o che l'ho sbagliato. Rispondo entro due giorni lavorativi.",
        fields: { name: "nome", email: "email", message: "messaggio" },
        placeholders: {
            name: "Mario Rossi",
            email: "mario@studio.it",
            message: "Cosa stai costruendo?",
        },
        honeypot: "Lascia questo campo vuoto",
        submit: "invia messaggio",
        status: {
            sending: "invio…",
            sent: "ricevuto — ti rispondo a breve.",
            checkHighlighted: "controlla i campi evidenziati",
            checkForm: "controlla il modulo",
            tooMany: "troppe richieste — aspetta un minuto.",
            failed: "qualcosa è andato storto — riprova più tardi.",
        },
        errors: {
            name: "inserisci il tuo nome",
            email: "inserisci un'email valida",
            message: "almeno 10 caratteri",
        },
    },

    footer: {
        tagline: (who) =>
            `${who.role} a ${who.city}. Questa pagina, il conteggio che le sta dietro, e ogni tanto qualcosa costruito senza un vero motivo.`,
        columns: { index: "indice", elsewhere: "altrove", legal: "legale", language: "lingua" },
        privacy: "privacy",
        cookies: "cookie",
        backToTop: "torna su",
        label: "Piè di pagina",
        language: "Lingua",
    },

    consent: {
        label: "Cookie",
        // Affermazione, non domanda — ma "previo consenso" resta, e resta per
        // una ragione precisa: le linee guida del Garante di giugno 2021
        // chiedono che l'informativa breve dica che il sito *può*, subordinato
        // al consenso, usare questi cookie, non che li stia già usando. È
        // quell'inciso a soddisfare il requisito, non il punto interrogativo.
        copyBefore:
            "Questo sito utilizza, previo consenso, cookie propri per contare le visite e rilevare l'utilizzo della pagina. Nessun dato è condiviso con terze parti né impiegato per finalità pubblicitarie. Informazioni complete nella",
        privacyLink: "pagina privacy",
        copyAfter: ".",
        accept: "accetta",
        decline: "rifiuta",
    },

    privacy: {
        back: "\u2190 torna al sito",
        title: "Informativa privacy",
        lede: "Il presente sito misura il proprio traffico. Non sono presenti Google Analytics, circuiti pubblicitari o script di terze parti, e nessun elemento della pagina viene prelevato da server diversi da questo: n\u00e9 un carattere tipografico, n\u00e9 un lettore video, n\u00e9 un pulsante social. Il codice che effettua la misurazione fa parte del sito, e i dati che produce sono conservati in un database ospitato sullo stesso server che serve la pagina. Una sola categoria di dati lascia questo server, e solo su iniziativa dell\u2019utente: il contenuto di un messaggio inviato tramite il modulo di contatto, trasmesso per posta elettronica.",
        headings: {
            responsible: "Titolare del trattamento",
            collected: "Dati raccolti e finalit\u00e0",
            form: "Il modulo di contatto",
            notCollected: "Dati non raccolti",
            cookies: "Cookie",
            leaves: "Dati che lasciano questo server",
            basis: "Base giuridica e conservazione",
            account: "Account del titolare",
            rights: "Diritti dell\u2019interessato",
            revisions: "Revisioni",
        },
        controller: (who) =>
            `Il titolare del trattamento \u00e8 ${who.name}, ${who.city}, P. IVA ${who.vat}. Il sito \u00e8 gestito da una sola persona fisica: non vi \u00e8 alcuna organizzazione alle spalle e non \u00e8 stato designato un responsabile della protezione dei dati, non essendo l\u2019uno n\u00e9 l\u2019altro richiesti a questa scala.`,
        contactWithEmail: {
            before: "Le richieste relative a quanto descritto nella presente informativa possono essere indirizzate a ",
            after: ".",
        },
        contactViaForm: {
            before: "Le richieste relative a quanto descritto nella presente informativa, comprese quelle elencate al paragrafo ",
            rightsLink: "diritti dell\u2019interessato",
            mid: ", possono essere inoltrate tramite il ",
            formLink: "modulo di contatto",
            after: ". I messaggi giungono direttamente alla casella del titolare, e la risposta ne rende noto l\u2019indirizzo.",
        },
        collectedLede:
            "La raccolta avviene esclusivamente previo consenso dell\u2019interessato e solo successivamente alla sua prestazione. Nessuno degli elementi elencati di seguito viene misurato prima che il banner abbia ricevuto risposta, e il diniego mantiene tale condizione: il codice di misurazione non viene nemmeno scaricato. Il rifiuto non comporta alcuna conseguenza \u2014 il sito si comporta in modo identico in entrambi i casi.",
        collected: [
            ["Sezioni raggiunte e tempo di permanenza a schermo di ciascuna", "Per determinare se la pagina meriti lo scorrimento."],
            ["Profondit\u00e0 di scorrimento raggiunta \u2014 25%, 50%, 75%, 100%", "La medesima verifica, in forma pi\u00f9 diretta."],
            ["Se sia stata aperta una riga della biografia, se sia stato attraversato il corridoio dei progetti e se sia stato seguito un collegamento esterno", "Per determinare quali parti della pagina trattengano l\u2019attenzione."],
            ["Se il modulo di contatto sia stato visualizzato, se ne sia iniziata la compilazione e se sia stato inviato", "Per determinare in quale punto il modulo perda gli utenti."],
            ["Tipo di dispositivo, sistema operativo e browser, registrati come tre etichette brevi quali mobile, ios, safari. La stringa identificativa completa trasmessa dal browser viene letta, ridotta a tali etichette e scartata.", "Per conoscere gli ambienti nei quali il sito deve essere reso correttamente."],
            ["Dimensioni dello schermo e della finestra, lingua, fuso orario", "La medesima verifica, in maggiore dettaglio."],
            ["Il nome del sito di provenienza \u2014 il solo host, quindi google.com e non la ricerca effettuata \u2014 unitamente agli eventuali parametri di campagna presenti nel collegamento. L\u2019indirizzo completo offerto dal browser viene letto al fine di estrarne l\u2019host e successivamente scartato.", "Per conoscere la provenienza delle visite."],
            ["Un codice paese di due lettere, e soltanto qualora la rete posta dinanzi al sito lo abbia gi\u00e0 determinato e lo dichiari. Non viene effettuata alcuna ricerca e non esiste alcun database a tale scopo, sicch\u00e9 il campo risulta frequentemente vuoto.", "Per conoscere i paesi nei quali il sito viene consultato. Nessuna citt\u00e0, nessuna coordinata, nessun dato pi\u00f9 granulare."],
        ],
        formBody: [
            "Il consenso non trova applicazione in questo caso. L\u2019utente inserisce un nome, un indirizzo di posta elettronica e un messaggio; l\u2019invio costituisce esso stesso la richiesta, e il rifiuto di leggerlo equivarrebbe a ignorare l\u2019utente, non a tutelarlo. Tutti e tre i campi sono obbligatori: un messaggio che non possa essere n\u00e9 letto n\u00e9 riscontrato non \u00e8 un messaggio, e il modulo non ne consente l\u2019invio in loro assenza. Non \u00e8 presente alcun altro campo, occulto o meno, fatta eccezione per un campo esca compilato unicamente da agenti automatici.",
            "Il contenuto del messaggio \u00e8 trasmesso per posta elettronica al titolare e <strong>non viene mai scritto nel database</strong>. Permane quindi nella casella del titolare per il tempo in cui la corrispondenza lo giustifichi, secondo valutazione e non secondo scadenza prestabilita, e viene cancellato su richiesta. L\u2019indirizzo di posta elettronica \u00e8 altres\u00ec impiegato per mantenere un intervallo di attesa di quindici minuti, affinch\u00e9 un doppio invio non venga trasmesso due volte \u2014 il medesimo tipo di file utilizzato dal limitatore per IP descritto oltre, denominato mediante un hash dell\u2019indirizzo e non mediante l\u2019indirizzo stesso.",
        ],
        notCollected: [
            "<strong>Gli indirizzi IP non vengono mai scritti nel database.</strong> Nessuna tabella che registri una visita prevede una colonna destinata a contenerli. Sono impiegati per una sola finalit\u00e0: il conteggio delle richieste, affinch\u00e9 una singola macchina non possa saturare il modulo di contatto o il contatore. Anche in tale sede l\u2019indirizzo non viene registrato: \u00e8 sottoposto ad hash, e l\u2019hash costituisce il nome di un file di piccole dimensioni contenente un numero. Tali file vengono rimossi decorse un paio d\u2019ore dall\u2019ultimo accesso.",
            "Per esattezza, trattandosi di affermazione che merita verifica: il web server posto dinanzi all\u2019applicazione conserva il proprio registro di accesso, come ogni web server in rete, e una riga di tale registro contiene un indirizzo. Si tratta di infrastruttura, non di misurazione: non viene mai posta in relazione con alcunch\u00e9 di quanto descritto nella presente informativa, e in questo database esiste una sola riga contenente un indirizzo IP \u2014 quella relativa agli accessi del titolare, descritta oltre.",
            "Non \u00e8 effettuata alcuna profilazione, alcun processo decisionale automatizzato, alcun tracciamento su altri siti n\u00e9 alcun tentativo di identificare l\u2019utente. L\u2019identificativo contenuto in <code>pf_vid</code> \u00e8 un numero casuale privo di significato al di fuori del presente sito. Ad esso non \u00e8 associato alcun nome, alcun indirizzo di posta elettronica n\u00e9 alcun account, non esistendo account dei visitatori cui associarlo.",
        ],
        cookiesTable: {
            name: "Nome",
            purpose: "Funzione",
            life: "Conservazione",
            consent: "Consenso richiesto",
        },
        cookies: [
            {
                name: "pf_consent",
                purpose: "Registra la risposta fornita al banner \u2014 affermativa o negativa, e la richiesta numerata cui si riferisce \u2014 affinch\u00e9 la domanda non venga riproposta fino a che tale richiesta non muti. \u00c8 scritto dalla pagina stessa ed \u00e8 l\u2019unico cookie presente prima che sia stata fornita una risposta.",
                life: "6 mesi",
                consent: "No. Esiste al fine di registrare una scelta, ivi compreso il rifiuto.",
            },
            {
                name: "pf_vid",
                purpose: "Numero casuale che distingue un browser da un altro, affinch\u00e9 una visita di ritorno non venga computata come seconda persona. \u00c8 scritto dal server e soltanto dopo la prestazione del consenso.",
                life: "13 mesi, rinnovati a ogni visita",
                consent: "S\u00ec",
            },
            {
                name: "pf_sid",
                purpose: "Raggruppa gli eventi di una singola visita. Ne inizia uno nuovo decorsi 30 minuti di inattivit\u00e0.",
                life: "30 minuti",
                consent: "S\u00ec",
            },
            {
                name: "pf_admin",
                purpose: "Autentica il titolare presso il pannello di amministrazione. \u00c8 emesso soltanto a fronte di una password corretta e pertanto non raggiunge mai il browser di un visitatore.",
                life: "7 giorni",
                consent: "No. Tecnico, e non riferibile al visitatore.",
            },
        ],
        cookiesNote:
            "Tutti e quattro sono di prima parte: impostati su questo dominio, restituiti unicamente a questo dominio e non leggibili da altri soggetti. Non ve ne sono altri \u2014 nessun cookie pubblicitario, nessun lettore video incorporato, nessun pulsante social \u2014 e nessuna informazione relativa alla visita \u00e8 conservata in loro vece nel local storage del browser.",
        leaves: [
            "<strong>Il contenuto di un messaggio, qualora ne venga inviato uno.</strong> Esce tramite SMTP e perviene alla casella del titolare. Il provider che lo trasporta e quello che ospita tale casella lo trattano come il servizio postale tratta una lettera: si trovano nel percorso perch\u00e9 non \u00e8 possibile inviare posta senza. L\u2019elenco si esaurisce qui.",
            "Il caricamento di una pagina non comporta il contatto con alcun altro soggetto. Ogni file necessario alla pagina \u2014 fogli di stile, script, immagini e i due caratteri tipografici impiegati \u2014 \u00e8 servito da questo dominio, sicch\u00e9 il browser non si annuncia mai a un server non gestito dal titolare. Non vi \u00e8 alcun fornitore di analytics, alcun partner pubblicitario, alcun CRM, alcuno strumento di newsletter n\u00e9 alcun elenco cui l\u2019indirizzo venga aggiunto. La societ\u00e0 che ospita il server ha accesso ai propri dischi, come avviene per qualunque sito ospitato, e ove dinanzi al sito sia posta una rete che ne fornisca il codice paese, tale rete vede altres\u00ec il traffico \u2014 si veda l\u2019ultima riga dei dati raccolti.",
            "Nessun dato viene deliberatamente trasferito al di fuori dello Spazio economico europeo. Il percorso della posta elettronica costituisce l\u2019unico punto in cui ci\u00f2 potrebbe verificarsi, e dipende dal provider che trasporta il messaggio.",
        ],
        basis: [
            "<strong>Analytics \u2014 consenso dell\u2019interessato</strong>, art. 6, par. 1, lett. a) GDPR, unitamente all\u2019art. 122 del Codice Privacy quanto ai cookie in s\u00e9. Il consenso \u00e8 revocabile in qualsiasi momento, di seguito, e la revoca \u00e8 agevole esattamente quanto la prestazione.",
            "Operano due distinti periodi, che \u00e8 opportuno tenere separati. L\u2019identificativo conservato nel browser, <code>pf_vid</code>, ha durata di <strong>13 mesi</strong> \u2014 il limite posto dal Garante a un identificativo di analytics \u2014 ed \u00e8 rinnovato a ogni ritorno. Le righe conservate sul server sono cancellate decorsi <strong>400 giorni</strong>, mediante procedura notturna. Il secondo valore non costituisce arrotondamento del primo: disciplinano oggetti diversi, ed \u00e8 per questo che entrambi sono indicati.",
            "<strong>Il modulo di contatto \u2014 art. 6, par. 1, lett. b)</strong>: misure precontrattuali adottate su richiesta dell\u2019interessato. Nulla \u00e8 conservato lato server; il messaggio risiede nella casella del titolare, come sopra descritto.",
            "<strong>Protezione da sovraccarico \u2014 art. 6, par. 1, lett. f)</strong>, legittimo interesse del titolare alla disponibilit\u00e0 del sito. Soli contatori, con scadenza nell\u2019ordine delle ore.",
            "<strong>Il cookie di consenso e quello di accesso</strong> non richiedono alcun consenso: l\u2019art. 122 del Codice Privacy esenta il cookie strettamente necessario alla prestazione del servizio richiesto, e la registrazione di un rifiuto rientra precisamente in tale ipotesi.",
        ],
        account: [
            "I dati statistici sono consultati su un pannello protetto da accesso, e tale accesso corrisponde a un account: un nome, un indirizzo di posta elettronica, una password conservata unicamente sotto forma di hash e il secondo fattore \u2014 il segreto impiegato da un\u2019applicazione di autenticazione, unitamente a una serie di codici di recupero, parimenti conservati come hash. Nessuno di tali elementi \u00e8 di per s\u00e9 sufficiente a effettuare l\u2019accesso, e un codice gi\u00e0 utilizzato \u00e8 registrato come tale e non pu\u00f2 essere presentato una seconda volta.",
            "L\u2019accesso viene registrato \u2014 momento, indirizzo di provenienza e browser impiegato \u2014 affinch\u00e9 la sessione possa essere successivamente riconosciuta e revocata. Tali righe sono rimosse alla scadenza della sessione, entro sette giorni.",
            "Nulla di quanto precede costituisce dato riferibile al visitatore: riguarda il titolare, e a s\u00e9 stessi non \u00e8 dovuta alcuna informativa. \u00c8 riportato in questa sede per una sola ragione: una pagina che dichiara che gli indirizzi dei visitatori non vengono mai conservati deve dare conto dell\u2019unico punto di questo database nel quale un indirizzo <em>\u00e8</em> conservato.",
        ],
        rights: [
            'Ai sensi degli articoli da 15 a 22 del GDPR l\u2019interessato pu\u00f2 chiedere l\u2019accesso ai dati che lo riguardano, la loro rettifica o cancellazione, la limitazione del trattamento o una copia in formato portabile, nonch\u00e9 opporsi al trattamento. Ai sensi dell\u2019art. 7, par. 3 il consenso \u00e8 revocabile in qualsiasi momento, senza che ci\u00f2 pregiudichi la liceit\u00e0 del trattamento effettuato anteriormente. Ai sensi dell\u2019art. 77 \u00e8 possibile proporre reclamo al Garante per la protezione dei dati personali \u2014 <a href="https://www.garanteprivacy.it" rel="noopener noreferrer">garanteprivacy.it</a> \u2014 senza previo ricorso al titolare.',
            "La via pi\u00f9 rapida \u00e8, in concreto, il comando riportato di seguito. Anche il collegamento \u201ccookie\u201d nel pi\u00e8 di pagina vi conduce: nella pagina del portfolio riapre il banner in loco, mentre in questa pagina e nel pannello di amministrazione conduce direttamente al presente blocco. Il diniego, per entrambe le vie, comporta l\u2019immediata cancellazione degli identificativi dal browser, dopo la quale nulla di ulteriore \u00e8 collegabile al visitatore.",
            "Le righe gi\u00e0 scritte permangono e non contengono alcun nome, alcun indirizzo n\u00e9 alcun elemento riconducibile a una persona. Ai sensi dell\u2019art. 11 del GDPR il titolare che non abbia motivo di conservare le informazioni aggiuntive necessarie a identificare una persona all\u2019interno di un insieme anonimo non \u00e8 tenuto ad acquisirle al solo fine di dare riscontro a una richiesta \u2014 ipotesi che ricorre nel caso di specie, e che \u00e8 altres\u00ec la ragione per cui tali righe non possono essere isolate d\u2019ufficio. Ove se ne richieda del pari la cancellazione, il valore del cookie <code>pf_vid</code> deve essere comunicato al titolare prima della sua rimozione: esso costituisce l\u2019unica chiave esistente e ne consente la cancellazione manuale.",
        ],
        choice: {
            checking: "Verifica in corso\u2026",
            granted: "Gli analytics sono attivi. Le visite sono computate sotto gli identificativi sopra descritti.",
            denied: "Gli analytics sono disattivati. Non viene raccolto alcun dato e gli identificativi sono stati rimossi.",
            unset: "Non \u00e8 ancora stata fornita alcuna risposta. Nessun dato viene raccolto fino alla scelta.",
            allow: "attiva gli analytics",
            turnOff: "disattiva gli analytics",
        },
        revisionsLede: [
            "La riscrittura della presente informativa non rimette in discussione la risposta gi\u00e0 fornita. Il consenso \u00e8 prestato in relazione a ci\u00f2 che viene raccolto e alle relative finalit\u00e0, non a un documento: la correzione di una frase, o una spiegazione pi\u00f9 chiara, lascia un assenso o un diniego gi\u00e0 espressi validi esattamente come prima. Rimette invece in discussione la domanda una modifica della richiesta stessa: un nuovo cookie che necessiti di permesso, la comparsa di una terza parte nella pagina, una nuova finalit\u00e0, una nuova categoria di dati computati.",
            "La richiesta \u00e8 pertanto numerata, e il numero cui \u00e8 stata fornita risposta \u00e8 conservato nel cookie <code>pf_consent</code> unitamente alla risposta stessa. Al suo mutare, ogni risposta conservata cessa di avere effetto e il banner viene riproposto \u2014 ragione per cui esso muta soltanto nei casi sopra indicati. L\u2019elenco che segue indica, per ciascuna revisione, di quale tipo si sia trattato.",
        ],
        revisionLabel: (date, scope) => `${date} \u00b7 richiesta ${scope}`,
        revisionFirst: "Prima richiesta: non vi era alcunch\u00e9 da riproporre.",
        revisionReasked: "La richiesta \u00e8 mutata, e il banner \u00e8 stato nuovamente esposto.",
        revisionWordingOnly: "Sola formulazione. Le risposte gi\u00e0 fornite sono rimaste valide.",
        revisions: [
            {
                date: "7 agosto 2026",
                scope: 1,
                what: "Prima pubblicazione, unitamente al conteggio che descrive.",
                reasked: null,
            },
            {
                date: "10 agosto 2026",
                scope: 1,
                what: "Pubblicata in italiano accanto all\u2019inglese. Nulla \u00e8 mutato quanto ai dati raccolti: soltanto il numero di lingue in cui \u00e8 esposta.",
                reasked: false,
            },
            {
                date: "10 agosto 2026",
                scope: 1,
                what: "Riscritta integralmente in registro impersonale. Nessuna modifica ai dati raccolti, alle finalit\u00e0 o ai periodi di conservazione.",
                reasked: false,
            },
        ],
    },
} satisfies Content;
