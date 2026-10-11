/**
 * Every word the site says, per language, and who the site belongs to.
 *
 * The words are the owner's: COPY.md in Italian, COPY.en.md in English, written separately
 * (a line says the same thing, not the same words). Each language has its own anchors
 * (`#servizi`, `#services`…); the intermezzo keeps `#scrivania`, which the desk scene reads.
 *
 * **Never invent a fact.** The name, the VAT number and the profiles are typed once, below.
 */
import sevenink from "./projects/sevenink-home.webp";
import cloudground from "./projects/cloudground-home.webp";
import skeda from "./projects/skeda-home.webp";
import vitrine from "./projects/vitrine-hero.webp";

export const who = {
    name: "Emanuele Frascella",
    city: "Taranto",
    country: "IT",
    email: "emanuele@frascella.dev",
    vat: "03462650734",
    github: "https://github.com/manuto276",
    linkedin: "https://www.linkedin.com/in/efrascella256/",
} as const;

export type Lang = "it" | "en";
export const langs: Lang[] = ["it", "en"];

const year = new Date().getFullYear();

const it = {
    htmlLang: "it-IT",
    hreflang: "it",
    ogLocale: "it_IT",
    endonym: "Italiano",
    prefix: "",

    meta: {
        title: "Emanuele Frascella · Software engineer freelance, Taranto",
        description:
            "Software engineer freelance a Taranto. Piattaforme web, app e integrazioni con IA e agenti per aziende, agenzie e startup, anche da remoto.",
        jobTitle: "Software engineer freelance",
    },

    nav: {
        skip: "Vai al contenuto",
        menu: "principale",
        drawer: "menu",
        languages: "Lingua",
        logo: "frascella.dev, torna all’inizio",
        brand: "frascella.dev",
        cta: "scrivimi",
        open: "menu",
        close: "chiudi",
        links: [
            ["servizi", "#servizi"],
            ["lavori", "#lavori"],
            ["chi sono", "#chi-sono"],
        ] as [string, string][],
    },

    ids: { services: "servizi", works: "lavori", bio: "chi-sono", contact: "contatti" },

    desk: {
        label: "la scrivania",
        controls: "oggetti della scrivania",
        cue: "scorri",
        lamp: "luce della lampada:",
        lampFull: "piena",
        turntable: "giradischi: avvia o ferma",
        turntableShort: "giradischi",
        mug: "tazza: fai ondeggiare",
        mugShort: "tazza",
        plant: "pianta: fai scintillare",
        plantShort: "pianta",
        phone: "telefono: incrina lo schermo",
        phoneShort: "telefono",
        pad: "tablet: disegna",
        padShort: "tablet",
        owl: "gufo: fallo volare",
        owlShort: "gufo",
        padHint: "Disegna sullo schermo del tablet. Premi «fatto» o Esc per tornare.",
    },

    hero: {
        cut: "piattaforme, app e integrazioni",
        lines: "piattaforme, app|e integrazioni",
        linesN: "piattaforme,|app e|integrazioni",
        rest: "dall’architettura al rilascio",
        where: "Taranto · CET · da remoto",
        lede: "Sono un software engineer freelance di Taranto e seguo progetti per aziende, agenzie e startup. Vengo dalla telemedicina, dove ho lavorato con dati sanitari e GDPR; oggi mi occupo dei motori di gioco di casinò online, dove girano soldi veri e i servizi non possono andare giù.",
        button: "Scrivimi →",
    },

    services: {
        label: "Servizi",
        title: "Cosa faccio.",
        items: [
            { cut: "piattaforme", linesN: "piatta|forme", title: "Siti e piattaforme web", text: "Sviluppo siti in WordPress oppure da zero, senza CMS. Per le piattaforme più complesse progetto anche la parte server, con API, database e autenticazione, e quando ha senso la divido in microservizi." },
            { cut: "app", linesN: "", title: "App mobile e web app", text: "App per iOS e Android in Flutter, web app in React o Nuxt. Le sviluppo insieme alla parte server, oppure le collego a quella che c’è già." },
            { cut: "integrazioni", linesN: "integra|zioni", title: "Integrazioni e IA", text: "Collego gestionali, CRM, sistemi di pagamento e servizi esterni, in modo che i dati passino da uno all’altro senza ricopiarli a mano, con gestione degli errori e un registro di ogni scambio. Integro anche modelli linguistici e agenti nel software esistente, collegandoli ai dati dell’azienda." },
        ],
    },

    works: { cut: "lavori", label: "Lavori", title: "Quattro progetti recenti." },

    projects: [
        { slug: "seveninktattoo-it", title: "seveninktattoo.it", role: "cliente", text: "Sito per uno studio di tatuaggi di Taranto, in WordPress ed Elementor. Gestisce richieste di appuntamento, recensioni, newsletter e FAQ senza appoggiarsi a servizi esterni, quindi i dati restano sul server dello studio.", stack: "WordPress · Elementor", state: "online", url: "https://seveninktattoo.it", image: sevenink, alt: "La home page di seveninktattoo.it" },
        { slug: "cloudground", title: "CloudGround", role: "mio", text: "Un pannello di controllo per gestire siti su un server Ubuntu: WordPress, WooCommerce, PHP, Laravel o statici. Ogni sito nasce con la sua cache di pagina, il suo PHP isolato e i backup fuori dal server, e una modifica passa prima da una copia di staging, che non va in produzione se risulta più lenta.", stack: "Go · Vue", state: "versione 0.1, codice pubblico su GitHub", url: "https://cloudground.it", image: cloudground, alt: "La home page di cloudground.it" },
        // A proprietary project: no technologies (COPY.md, Registro); the card leaves the line out.
        { slug: "skeda-fit", title: "skeda.fit", role: "cofondatore", text: "App per personal trainer freelance, con schede di allenamento, registrazione delle serie in palestra, chat, check-in e un profilo pubblico sulla mappa. Non è ancora uscita e la lista d’attesa è aperta.", stack: "", state: "in sviluppo", url: "https://skeda.fit", image: skeda, alt: "La home page di skeda.fit" },
        { slug: "vitrine", title: "vitrine", role: "mio", text: "Un overlay trasparente che sta dietro le icone del desktop di Windows, con i temi scritti come pagine React. Su Ubuntu usavo Conky e su Windows non c’era niente di simile. Parte con il PC e lo uso tutti i giorni.", stack: "C# · WPF · WebView2", state: "codice pubblico su GitHub", url: "https://github.com/manuto276/vitrine", image: vitrine, alt: "vitrine sul desktop di Windows" },
    ],

    bio: {
        cut: "chi sono",
        title: "Mi piace costruire le cose che uso.",
        text: [
            "Molti dei miei progetti nascono da un’esigenza mia, quando uno strumento non esiste o non fa quello che mi serve. Usarli tutti i giorni mi obbliga a curare anche quello che in una demo non si vede, come i tempi di risposta, i casi limite e cosa succede quando qualcosa va storto. In questo periodo mi sto concentrando sull’IA applicata al software, in particolare su agenti e knowledge graph, e su come farli lavorare con dati reali invece che con esempi di prova.",
            "Da freelance lavoro da solo, quindi parli direttamente con chi scrive il codice. Nel tempo libero vado in palestra e progetto tatuaggi su Procreate.",
        ],
        facts: [
            ["CET", "da remoto, anche su fusi diversi"],
            ["NDA", "lo firmo prima di vedere il progetto"],
            ["2 giorni", "lavorativi per risponderti"],
        ] as [string, string][],
    },

    contact: {
        cut: "scrivimi",
        lede: "Raccontami cosa ti serve, cosa esiste già ed entro quando. Bastano poche righe, i dettagli li vediamo insieme in una call.",
    },

    footer: {
        role: `Software engineer freelance · ${who.city}, CET`,
        legal: `© ${year} ${who.name} · P. IVA ${who.vat}`,
        index: "Indice",
        elsewhere: "Altrove",
        legalHeading: "Legale",
        privacy: "privacy",
    },

    privacy: {
        title: "Informativa privacy",
        description: "Cosa fa questo sito con i dati di chi lo visita: nessun cookie, nessuna statistica, nessun modulo. Il sito è ospitato da GitHub Pages.",
    },

    notFound: { title: "Questa pagina non c’è", back: "Torna alla home" },
};

type Words = typeof it;

const en: Words = {
    htmlLang: "en",
    hreflang: "en",
    ogLocale: "en_GB",
    endonym: "English",
    prefix: "en/",

    meta: {
        title: "Emanuele Frascella · Freelance software engineer, Taranto",
        description:
            "Freelance software engineer in Taranto, Italy, also working remotely. Web platforms, apps, and integrations with AI and agents for companies, agencies and startups.",
        jobTitle: "Freelance software engineer",
    },

    nav: {
        skip: "Skip to content",
        menu: "main",
        drawer: "menu",
        languages: "Language",
        logo: "frascella.dev, back to top",
        brand: "frascella.dev",
        cta: "contact",
        open: "menu",
        close: "close",
        links: [
            ["services", "#services"],
            ["work", "#work"],
            ["about", "#about"],
        ],
    },

    ids: { services: "services", works: "work", bio: "about", contact: "contact" },

    desk: {
        label: "the desk",
        controls: "desk objects",
        cue: "scroll",
        lamp: "lamp light:",
        lampFull: "full",
        turntable: "record player: start or stop",
        turntableShort: "record player",
        mug: "mug: make it wobble",
        mugShort: "mug",
        plant: "plant: make it sparkle",
        plantShort: "plant",
        phone: "phone: crack the screen",
        phoneShort: "phone",
        pad: "tablet: draw",
        padShort: "tablet",
        owl: "owl: make it fly",
        owlShort: "owl",
        padHint: "Draw on the tablet screen. Press \"done\" or Esc to go back.",
    },

    hero: {
        cut: "platforms, apps and integrations",
        lines: "platforms, apps|and integrations",
        linesN: "platforms,|apps and|integrations",
        rest: "from architecture to release",
        where: "Taranto · CET · remote",
        lede: "I’m a freelance software engineer based in Taranto, working on projects for companies, agencies and startups. I come from telemedicine, where I worked with health data under GDPR. Today I work on the game engines behind online casino platforms, where the money is real and the services can’t go down.",
        button: "Contact →",
    },

    services: {
        label: "Services",
        title: "What I do.",
        items: [
            { cut: "platforms", linesN: "", title: "Websites and web platforms", text: "I build websites in WordPress or from scratch, without a CMS. For more complex platforms I also design the server side, with APIs, databases and authentication, and split it into microservices when that makes sense." },
            { cut: "apps", linesN: "", title: "Mobile and web apps", text: "iOS and Android apps in Flutter, web apps in React or Nuxt. I build them together with the server side, or connect them to the one already in place." },
            { cut: "integrations", linesN: "", title: "Integrations and AI", text: "I connect ERPs, CRMs, payment systems and third-party services so that data moves from one to the next without anyone copying it by hand, with error handling and a log of every exchange. I also integrate LLMs and agents into existing software and connect them to the company’s own data." },
        ],
    },

    works: { cut: "work", label: "Work", title: "Four recent projects." },

    projects: [
        { slug: "seveninktattoo-it", title: "seveninktattoo.it", role: "client", text: "Website for a tattoo studio in Taranto, built with WordPress and Elementor. It handles appointment requests, reviews, the newsletter and the FAQ without relying on external services, so the data stays on the studio’s own server.", stack: "WordPress · Elementor", state: "live", url: "https://seveninktattoo.it", image: sevenink, alt: "The seveninktattoo.it home page" },
        { slug: "cloudground", title: "CloudGround", role: "personal", text: "A control panel for running websites on an Ubuntu server: WordPress, WooCommerce, PHP, Laravel or static. Each site starts with its own page cache, its own isolated PHP and backups off the server, and a change goes through a staging copy first, which is not promoted if it measures slower than production.", stack: "Go · Vue", state: "version 0.1, public on GitHub", url: "https://cloudground.it", image: cloudground, alt: "The cloudground.it home page" },
        { slug: "skeda-fit", title: "skeda.fit", role: "co-founder", text: "An app for freelance personal trainers, with workout plans, set logging at the gym, chat, check-ins and a public profile on a map. It hasn’t launched yet, and the waitlist is open.", stack: "", state: "in development", url: "https://skeda.fit", image: skeda, alt: "The skeda.fit home page" },
        { slug: "vitrine", title: "vitrine", role: "personal", text: "A transparent overlay that sits behind the Windows desktop icons, with themes written as React pages. On Ubuntu I used Conky, and Windows had nothing like it. It starts with the PC and I use it every day.", stack: "C# · WPF · WebView2", state: "public on GitHub", url: "https://github.com/manuto276/vitrine", image: vitrine, alt: "vitrine on the Windows desktop" },
    ],

    bio: {
        cut: "about",
        title: "I like building the things I use.",
        text: [
            "Many of my projects start from a need of my own, when a tool doesn’t exist or doesn’t do what I need. Using them every day means I also have to get right what a demo never shows, such as response times, edge cases and what happens when something fails. Right now I’m focusing on AI in software, agents and knowledge graphs in particular, and on getting them to work with real data rather than sample data.",
            "As a freelancer I work on my own, so you talk directly to the person who writes the code. Outside work I go to the gym and design tattoos in Procreate.",
        ],
        facts: [
            ["CET", "remote, other time zones included"],
            ["NDA", "signed before I see the project"],
            ["2 working days", "to get back to you"],
        ],
    },

    contact: {
        cut: "contact",
        lede: "Tell me what you need, what already exists and when you need it by. A few lines are enough; we can go through the details on a call.",
    },

    footer: {
        role: `Freelance software engineer · ${who.city}, CET`,
        legal: `© ${year} ${who.name} · VAT no. ${who.vat}`,
        index: "Index",
        elsewhere: "Elsewhere",
        legalHeading: "Legal",
        privacy: "privacy",
    },

    privacy: {
        title: "Privacy notice",
        description: "What this site does with its visitors’ data: no cookies, no statistics, no forms. The site is hosted by GitHub Pages.",
    },

    notFound: { title: "This page is not here", back: "Back to the home page" },
};

export const words: Record<Lang, Words> = { it, en };
