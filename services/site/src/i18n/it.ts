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
        privacyTitle: (who) => `Privacy — ${who.name}`,
        privacyDescription:
            "Cosa raccoglie questo sito, perché, per quanto tempo li conserva, e come dire di no.",
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
        // Domanda, non affermazione: le linee guida del Garante di giugno 2021
        // chiedono che l'informativa breve dica che il sito *può*, previo
        // consenso, usare questi cookie — non che li stia già usando.
        copyBefore:
            "Questo sito può usare cookie propri per contare le visite e capire come usi la pagina? Niente viene condiviso con terze parti e niente viene usato per pubblicità. I dettagli sulla",
        privacyLink: "pagina privacy",
        copyAfter: ".",
        accept: "accetta",
        decline: "rifiuta",
    },

    privacy: {
        back: "← torna al sito",
        title: "Privacy",
        lede: "Questo sito misura sé stesso. Non c'è Google Analytics, non c'è un circuito pubblicitario, non c'è nessuno script di terze parti, e non c'è niente sulla pagina che il tuo browser vada a prendere da qualcun altro — né un font, né un player video, né un pulsante social. Il codice che conta fa parte del sito, e quello che conta finisce in un database sullo stesso server che serve la pagina. Una cosa sola esce, e solo se la mandi tu: il tuo messaggio, che parte come email.",
        headings: {
            responsible: "Chi è il titolare",
            collected: "Cosa viene raccolto, e perché",
            form: "Il modulo di contatto",
            notCollected: "Cosa non viene raccolto",
            cookies: "Cookie",
            leaves: "Cosa esce da questo server",
            basis: "Base giuridica, e per quanto le cose restano",
            account: "Il mio account",
            rights: "I tuoi diritti",
            revisions: "Revisioni",
        },
        controller: (who) =>
            `${who.name}, ${who.city} — P. IVA ${who.vat}. Sono io il titolare del trattamento di tutto quanto descritto qui. Questo sito è gestito da una persona sola: non c'è un'organizzazione dietro e non c'è un responsabile della protezione dei dati, perché a questa scala non è richiesto né l'uno né l'altro.`,
        contactWithEmail: {
            before: "Per qualsiasi cosa riguardi questa pagina, scrivi a ",
            after: ".",
        },
        contactViaForm: {
            before: "Per qualsiasi cosa riguardi questa pagina — comprese le richieste elencate sotto ",
            rightsLink: "i tuoi diritti",
            mid: " — usa il ",
            formLink: "modulo di contatto",
            after: ". Arriva direttamente nella mia casella, e rispondendoti ti metto davanti il mio indirizzo.",
        },
        collectedLede:
            "Solo con il tuo consenso, e solo dopo che lo dai. Niente di quanto segue viene misurato finché non rispondi al banner; se rispondi di no, resta così — il codice che misura non viene nemmeno scaricato. Rifiutare non ti costa nulla: il sito si comporta esattamente allo stesso modo.",
        collected: [
            ["Quali sezioni hai raggiunto, e per quanto tempo ciascuna è rimasta a schermo", "Per capire se la pagina vale lo scroll."],
            ["Quanto sei sceso nella pagina — 25%, 50%, 75%, 100%", "Stessa domanda, più brutale."],
            ["Se hai aperto una riga della bio, se hai attraversato il corridoio dei lavori, o se hai seguito un link verso l'esterno", "Per capire quali parti tengono l'attenzione."],
            ["Se hai visto il modulo di contatto, se hai iniziato a scrivere, e se l'hai inviato", "Per capire dove il modulo perde le persone."],
            ["Tipo di dispositivo, sistema operativo e browser — tre etichette brevi, per esempio mobile, ios, safari. La stringa completa con cui il tuo browser si identifica viene letta, ridotta a queste tre, e poi scartata.", "Per sapere su cosa il sito deve funzionare bene."],
            ["Dimensioni dello schermo e della finestra, lingua, fuso orario", "Stessa domanda, più in dettaglio."],
            ["Il nome del sito da cui sei arrivato — l'host e nient'altro, quindi google.com e non la ricerca che hai scritto — e le eventuali etichette di campagna sul link. L'indirizzo completo che il tuo browser offre viene letto per ricavarne l'host, e poi scartato.", "Per sapere da dove arrivano i visitatori."],
            ["Un codice paese di due lettere, ma solo quando la rete davanti al sito lo ha già ricavato e lo dichiara. Qui non c'è nessuna ricerca né un database per farla, quindi il campo è spesso semplicemente vuoto.", "Per sapere in quali paesi il sito viene letto. Nessuna città, nessuna coordinata, nulla di più preciso."],
        ],
        formBody: [
            "Questo non riguarda il consenso. Scrivi un nome, un indirizzo email e un messaggio, e l'invio è la richiesta — se mi rifiutassi di leggerlo ti starei ignorando, non proteggendo. Tutti e tre i campi sono obbligatori: un messaggio che non posso leggere o a cui non posso rispondere non è un messaggio, e il modulo non parte senza. Non c'è nessun altro campo, nascosto o meno, a parte un'esca che compilano solo i bot.",
            "Quello che mandi mi arriva per email e <strong>non viene mai scritto nel database</strong>. Poi resta nella mia casella finché la conversazione vale la pena di essere tenuta — è un giudizio, non una scadenza — e se mi chiedi di cancellarla lo faccio. Il tuo indirizzo email serve anche a tenere un blocco di quindici minuti, così un doppio clic non invia due volte — lo stesso tipo di piccolo file usato dal limitatore per IP descritto sotto, il cui nome è l'hash dell'indirizzo e non l'indirizzo stesso.",
        ],
        notCollected: [
            "<strong>Il tuo indirizzo IP non viene mai scritto nel database.</strong> Nessuna tabella che registra una visita ha una colonna per contenerlo. Serve a una cosa sola: contare le richieste, perché una macchina da sola non possa inondare il modulo di contatto o il contatore. E anche lì l'indirizzo non viene scritto — viene sottoposto a hash, e l'hash è il nome di un piccolo file che contiene un numero. Quei file vengono ripuliti dopo un paio d'ore di inattività.",
            "Per essere precisi fino in fondo — è il tipo di affermazione che vale la pena verificare — il web server davanti all'applicazione tiene il proprio log di accesso, come fa ogni web server su internet, e una riga di quel log contiene un indirizzo. Quella è idraulica, non misurazione: non viene mai incrociata con nulla di quello che sta su questa pagina, e c'è una sola riga, in questo database, che contiene un indirizzo IP — il mio, dai miei accessi, descritto più sotto.",
            "Non c'è profilazione, non c'è nessun processo decisionale automatizzato, non c'è tracciamento su altri siti, e non c'è nessun tentativo di capire chi sei. L'identificativo dentro <code>pf_vid</code> è un numero casuale che non significa niente fuori da questo sito. Nessun nome, nessun indirizzo email e nessun account gli è collegato, perché qui non ci sono account dei visitatori a cui collegarlo.",
        ],
        cookiesTable: {
            name: "Nome",
            purpose: "Cosa fa",
            life: "Durata",
            consent: "Richiede consenso",
        },
        cookies: [
            {
                name: "pf_consent",
                purpose: "Registra la tua risposta al banner — sì o no, e a quale richiesta numerata stavi rispondendo — così non ti viene chiesto di nuovo finché quella richiesta non cambia. Lo scrive la pagina stessa, ed è l'unico cookie che esiste prima che tu abbia risposto.",
                life: "6 mesi",
                consent: "No. Esiste per ricordare una scelta, rifiuto compreso.",
            },
            {
                name: "pf_vid",
                purpose: "Un numero casuale che distingue un browser da un altro, così una seconda visita non viene contata come una seconda persona. Lo scrive il server, e solo dopo che hai detto di sì.",
                life: "13 mesi, rinnovati a ogni visita",
                consent: "Sì",
            },
            {
                name: "pf_sid",
                purpose: "Raggruppa gli eventi di una stessa visita. Ne comincia uno nuovo dopo 30 minuti di silenzio.",
                life: "30 minuti",
                consent: "Sì",
            },
            {
                name: "pf_admin",
                purpose: "Mi autentica sulla mia dashboard. Viene emesso solo a fronte di una password corretta, quindi non arriva mai al browser di un visitatore.",
                life: "7 giorni",
                consent: "No. Tecnico, e non è un cookie del visitatore.",
            },
        ],
        cookiesNote:
            "Tutti e quattro sono di prima parte: impostati su questo dominio, rimandati solo a questo dominio, e illeggibili da chiunque altro. Non ce ne sono altri — nessun cookie pubblicitario, nessun player video incorporato, nessun pulsante social — e non c'è niente della tua visita messo da parte nel local storage del browser al posto loro.",
        leaves: [
            "<strong>Il tuo messaggio, se ne mandi uno.</strong> Esce via SMTP e arriva nella mia casella. Il provider che lo trasporta e quello che ospita la casella lo trattano come le poste trattano una lettera — sono nel percorso perché non esiste un modo di spedire posta senza di loro. La lista finisce qui.",
            "Aprire una pagina qui non contatta nessun altro. Ogni file di cui la pagina ha bisogno — fogli di stile, script, immagini, e i due caratteri tipografici in cui è composta — arriva da questo dominio, quindi il tuo browser non si annuncia mai a un server che non gestisco io. Non c'è nessun fornitore di analytics, nessun partner pubblicitario, nessun CRM, nessuno strumento di newsletter, e nessuna lista a cui viene aggiunto il tuo indirizzo. L'azienda che ospita il server può ovviamente accedere ai propri dischi, com'è naturale per qualsiasi sito ospitato da qualcuno, e se davanti al sito c'è una rete che gli passa un codice paese, quella rete vede anche il traffico — vedi l'ultima riga di cosa viene raccolto.",
            "Niente di quanto sta qui viene deliberatamente trasferito fuori dallo Spazio economico europeo. Il percorso della posta è l'unico punto in cui potrebbe succedere, e dipende da quale provider trasporta il messaggio.",
        ],
        basis: [
            "<strong>Analytics — il tuo consenso</strong>, art. 6, par. 1, lett. a) GDPR, insieme all'art. 122 del Codice Privacy per i cookie in sé. Puoi revocarlo in qualsiasi momento, qui sotto, e revocarlo è esattamente facile quanto darlo.",
            "Qui girano due orologi diversi, e vale la pena tenerli separati. L'identificativo nel tuo browser, <code>pf_vid</code>, dura <strong>13 mesi</strong> — il tetto che il Garante pone a un identificativo di analytics — e viene rinnovato ogni volta che torni. Le righe sul server vengono cancellate dopo <strong>400 giorni</strong>, da un processo che gira ogni notte. Il secondo numero non è il primo arrotondato: governano cose diverse, ed è per questo che la pagina li dà entrambi.",
            "<strong>Il modulo di contatto — art. 6, par. 1, lett. b)</strong>: misure adottate su tua richiesta, prima che esista qualcosa di simile a un contratto. Non viene conservato niente lato server; l'email vive nella mia casella, come descritto sopra.",
            "<strong>Protezione dal flooding — art. 6, par. 1, lett. f)</strong>, il mio legittimo interesse a un sito che resti in piedi. Solo contatori, e scadono nel giro di ore.",
            "<strong>Il cookie di consenso e quello di accesso</strong> non richiedono alcun consenso: l'art. 122 del Codice Privacy esenta il cookie strettamente necessario a fare la cosa che hai chiesto, e ricordare che hai detto di no è esattamente quello.",
        ],
        account: [
            "I numeri si leggono su una dashboard dietro un accesso, e quell'accesso è un account: un nome, un indirizzo email, una password conservata solo come hash, e il secondo fattore — il segreto che usa un'app di autenticazione, e una serie di codici di recupero, anch'essi conservati come hash. Nessuno di questi elementi, da solo, può essere riutilizzato per accedere, e un codice già usato viene segnato come tale — quindi non può essere presentato una seconda volta.",
            "Accedere registra l'accesso — quando è avvenuto, da quale indirizzo, con quale browser — così la sessione può essere riconosciuta più tardi e revocata. Quelle righe se ne vanno quando la sessione scade, entro sette giorni.",
            "Niente di tutto questo è un tuo dato — è mio, su di me, e una persona non deve un'informativa a sé stessa. È scritto qui per una ragione sola: una pagina che dice che il tuo indirizzo non viene mai conservato ti deve l'unico punto di questo database in cui un indirizzo <em>c'è</em>.",
        ],
        rights: [
            'In base agli articoli da 15 a 22 del GDPR puoi chiedere quali tuoi dati sono conservati, la loro rettifica o cancellazione, la limitazione del loro uso, oppure una copia in un formato portabile; puoi anche opporti al trattamento. In base all\'art. 7, par. 3 puoi revocare il consenso quando vuoi, senza che questo renda illecito quanto raccolto prima. In base all\'art. 77 puoi presentare reclamo al Garante per la protezione dei dati personali — <a href="https://www.garanteprivacy.it" rel="noopener noreferrer">garanteprivacy.it</a> — senza passare prima da me.',
            "In pratica, la strada più rapida è il pulsante qui sotto. Anche il link “cookie” nel piè di pagina porta lì — sulla pagina del portfolio riapre il banner sul posto; qui, e sulla dashboard, salta direttamente a questo stesso blocco. Dire di no, in un modo o nell'altro, cancella subito gli identificativi dal tuo browser, dopodiché niente di ulteriore può essere collegato a te.",
            "Le righe già scritte restano, e non contengono nessun nome, nessun indirizzo, niente che riporti a una persona. In base all'art. 11 del GDPR, un titolare che non ha motivo di conservare le informazioni aggiuntive necessarie a individuare una persona dentro un insieme anonimo non è obbligato a procurarsele solo per rispondere a una richiesta — è esattamente questo caso, ed è anche il motivo per cui non posso isolare le tue di mia iniziativa. Se vuoi che spariscano anche quelle, mandami il valore del tuo cookie <code>pf_vid</code> prima di cancellarlo: è l'unica chiave che esiste, e con quella posso eliminarle a mano.",
        ],
        choice: {
            checking: "Controllo…",
            granted: "Gli analytics sono attivi. Le tue visite vengono contate, sotto gli identificativi descritti sopra.",
            denied: "Gli analytics sono spenti. Non viene raccolto niente, e gli identificativi sono stati rimossi.",
            unset: "Non ti è ancora stato chiesto — non viene raccolto niente finché non scegli.",
            allow: "attiva gli analytics",
            turnOff: "spegni gli analytics",
        },
        revisionsLede: [
            "Riscrivere questa pagina non rimette in discussione la tua risposta. Il consenso si dà a cosa viene raccolto e perché, non a un documento — quindi correggere una frase, o spiegare meglio qualcosa, lascia un sì o un no già dato, valido esattamente come prima. Quello che invece rimette la domanda è un cambiamento della richiesta in sé: un nuovo cookie che ha bisogno di permesso, una terza parte che compare sulla pagina, una nuova finalità, un nuovo tipo di cosa contata.",
            "Perciò la richiesta è numerata, e il numero a cui hai risposto è conservato nel tuo cookie <code>pf_consent</code> insieme alla risposta. Quando si muove, ogni risposta conservata smette di valere e il banner torna — ed è per questo che si muove solo per i motivi qui sopra. L'elenco qui sotto dice, per ogni revisione, di che tipo è stata.",
        ],
        revisionLabel: (date, scope) => `${date} · richiesta ${scope}`,
        revisionFirst: "La prima richiesta — non c'era niente da chiedere di nuovo.",
        revisionReasked: "La richiesta è cambiata, quindi il banner è stato mostrato di nuovo.",
        revisionWordingOnly: "Solo formulazione. Le risposte già date sono rimaste valide.",
        revisions: [
            {
                date: "7 agosto 2026",
                scope: 1,
                what: "Prima pubblicazione, insieme al conteggio che descrive.",
                reasked: null,
            },
            {
                date: "10 agosto 2026",
                scope: 1,
                what: "Pubblicata in italiano accanto all'inglese. Non è cambiato niente di cosa viene raccolto — solo il numero di lingue in cui è spiegato.",
                reasked: false,
            },
        ],
    },
} satisfies Content;
