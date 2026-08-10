/**
 * English. The original, and the reference the Italian file is checked
 * against — every string here was already on the page before this file
 * existed, and was moved rather than rewritten.
 *
 * A few of the privacy paragraphs carry inline markup: `<strong>` where the
 * emphasis is the claim ("your IP address is **never** written to the
 * database"), `<code>` for cookie names, one external `<a>`. They are stored
 * as HTML and rendered with `set:html`, which is safe here and only here:
 * these are build-time constants in this repository, no visitor input reaches
 * them, and the alternative — splitting each sentence into three fragments —
 * would put the words in an order Italian cannot follow.
 */

import type { Content } from "./types.ts";

export const en = {
    htmlLang: "en",
    ogLocale: "en_US",
    endonym: "English",

    owner: {
        role: "Software engineer",
        city: "Taranto, Italy",
    },

    meta: {
        description: (who) =>
            `Portfolio of ${who.name}, a ${who.role.toLowerCase()} born in ${who.city}. Backend and the game engines behind online casino platforms — before that, telemedicine and solar panel design.`,
        privacyTitle: (who) => `Privacy — ${who.name}`,
        privacyDescription:
            "What this site collects, why, how long it keeps it, and how to say no.",
    },

    nav: {
        links: [
            { label: "home", href: "#top" },
            { label: "bio", href: "#bio" },
            { label: "work", href: "#work" },
            { label: "contact", href: "#contact" },
        ],
        sections: "Sections",
        openMenu: "Open menu",
        closeMenu: "Close menu",
        menu: "Menu",
        markLabel: (who) => `${who.name} — back to top`,
    },

    hero: {
        titleDim: "who takes things apart",
        titleAfter: "for a living.",
        // Not a CV. The three-industries line was a career summary standing
        // where an introduction belongs, and it spent its best sentence on
        // solar panels.
        //
        // It deliberately does not open on "taking things apart" — the h1
        // two lines above already says that, and hearing it twice in one
        // breath reads as a page with one idea rather than a person with a
        // habit. The Italian h1 went elsewhere, so the Italian lede is free
        // to say it outright.
        lede: "Before it was a job it was curiosity — APKs, Minecraft mods, anything with a seam in it. Now the things are production systems, and the interesting part isn't building them. It's that they stay up.",
        portraitAlt: (who) => `Portrait of ${who.name}`,
    },

    bio: {
        eyebrow: "01 — bio",
        hint: "open any line",
        tileDefault: "taranto, italy",
        rows: [
            {
                tile: "taranto, italy",
                lead: "born in",
                trail: "taranto",
                meta: "italy",
                gallery: "taranto",
                body: [
                    "Born in Taranto, on the Ionian coast, and working in CET — which lands me inside the working day for most of Europe.",
                    "The shape of a day: coffee, work, the gym — never skip a leg day — dinner, then whatever side project is currently open.",
                ],
            },
            {
                tile: "things break",
                lead: "broke it,",
                trail: "fixed it",
                meta: "in production",
                gallery: "repair",
                body: [
                    "Things break in production. That isn't the interesting part — the interesting part is how long they stay broken, and whether the same thing breaks again next month.",
                    "Knowing whose fault it was has never made a fix land any sooner. Sort it, write down what happened so it doesn't happen twice, get on with it. You win as a team.",
                ],
            },
            {
                tile: "apks and mods",
                lead: "coding since",
                trail: "2013",
                meta: "as a kid",
                gallery: "coding",
                body: [
                    // The teardown story lives in the hero now — APKs, mods, anything
                    // with a seam. It was here too until the lede was rewritten,
                    // and a reader met the same three examples twice in one
                    // scroll. This row keeps the part the hero does not have:
                    // when it started and in what order.
                    "I've been writing code since 2013 — Android apps first, then C++ through high school.",
                    "It was never about building something. It was about finding out how the thing in front of me had been built.",
                ],
            },
            {
                tile: "procreate",
                lead: "ink,",
                trail: "not code",
                meta: "off hours",
                gallery: "drawing",
                body: [
                    "Every now and then a night ends in Procreate. Mostly tattoo designs — flash sheets, lettering, things people might actually wear.",
                    "It's the opposite motion to the day job, and I think that's the point: nothing to take apart, nothing to debug, just a line that either works or doesn't.",
                ],
            },
            {
                tile: "microservices & containers",
                lead: "microservices",
                trail: "& containers",
                meta: "focus",
                gallery: "containers",
                body: [
                    "Node, PHP, and Python services behind an API boundary, Docker underneath. Small pieces are easier to build and test — including across teams sharing the same repo — and if one goes down, the rest stay up.",
                    "The opinion that puts me in the minority: hygiene matters more than the framework — submodules done properly, a directory layout that doesn't need relearning, .env files that never touch git, devcontainers when they've earned it.",
                ],
            },
        ],
        alt: {
            "taranto.0": "The swing bridge and the Aragonese castle in Taranto at sunset",
            "taranto.1": "The Marinai d'Italia monument in Taranto against an evening sky",
            "taranto.2": "An alley in Taranto's old town opening onto the sea",
            "drawing.0": "A koi tattoo design drawn in Procreate on an iPad, Apple Pencil alongside",
            "repair.0": "An old phone opened up under a desk lamp, its back cover and screws set aside next to a screwdriver",
            "coding.0": "A laptop on a wooden desk with a Python file open in the editor",
            "containers.0": "Stacked shipping containers and gantry cranes at a port at sunset",
        },
    },

    work: {
        eyebrow: "02 — selected work",
        introLead: "a few things i built",
        introDim: "and still maintain",
        introAside: "worth the scroll",
        progressHint: "still going",
        outroEyebrow: "that's the shortlist",
        outroLine: "more projects on",
        projectCount: (n) => `${n} projects`,
        projects: [
            {
                title: "vitrine",
                desc: "A transparent overlay that lives behind the desktop icons, built the week work swapped my Ubuntu box (and Conky with it) for Windows 11. Themes in React, and it still starts with the PC every morning.",
                meta: "2026 · c# · wpf · webview2",
            },
            {
                title: "proxima",
                desc: "Started as a way to plan and log my own gym programs instead of a spreadsheet, then grew an MCP server so Claude could read my progress, exercises, and stats directly. Since opened up to other people too — each connecting a Claude of their own, with real MFA behind it.",
                meta: "2026 · flutter · python · mysql",
            },
        ],
    },

    contact: {
        eyebrow: "03 — contact",
        titleLead: "say",
        titleDim: "hello.",
        lede: "Freelance work, mostly. If you just want to talk about something on this page, that works too — I reply within two working days.",
        fields: { name: "name", email: "email", message: "message" },
        placeholders: {
            name: "Mario Rossi",
            email: "mario@studio.it",
            message: "What are you building?",
        },
        honeypot: "Leave this field empty",
        submit: "send message",
        status: {
            sending: "sending…",
            sent: "received — i'll reply shortly.",
            checkHighlighted: "check the highlighted fields",
            checkForm: "check the form",
            tooMany: "too many requests — give it a minute.",
            failed: "something went wrong — try again later.",
        },
        errors: {
            name: "please enter your name",
            email: "please enter a valid email",
            message: "at least 10 characters",
        },
    },

    footer: {
        tagline: (who) =>
            `${who.role} in ${who.city}. This page, the counting behind it, and the occasional thing built for no reason at all.`,
        columns: { index: "index", elsewhere: "elsewhere", legal: "legal", language: "language" },
        privacy: "privacy",
        cookies: "cookies",
        backToTop: "back to top",
        label: "Footer",
        language: "Language",
    },

    consent: {
        label: "Cookies",
        copyBefore:
            "Can this site use its own cookies to count visits and see how the page is used? Nothing is shared with third parties and nothing is used for advertising. Details on the",
        privacyLink: "privacy page",
        copyAfter: ".",
        accept: "accept",
        decline: "decline",
    },

    privacy: {
        back: "← back to the site",
        title: "Privacy",
        lede: "This site measures itself. There is no Google Analytics, no advertising network, no third-party script, and nothing on the page that your browser fetches from anybody else — not a font, not a video player, not a social button. The code that counts is part of the site, and what it counts lands in a database on the same server that serves the page. One thing leaves, and only if you send it: your message, which goes out as an email.",
        headings: {
            responsible: "Who is responsible",
            collected: "What is collected, and why",
            form: "The contact form",
            notCollected: "What is not collected",
            cookies: "Cookies",
            leaves: "What leaves this server",
            basis: "Legal basis, and how long things are kept",
            account: "My own account",
            rights: "Your rights",
            revisions: "Revisions",
        },
        controller: (who) =>
            `${who.name}, ${who.city} — VAT no. ${who.vat}. I am the controller of everything described here. This site is run by one person; there is no organization behind it and no data protection officer, because neither is required at this scale.`,
        contactWithEmail: {
            before: "For anything on this page, write to ",
            after: ".",
        },
        contactViaForm: {
            before: "For anything on this page — including any of the requests listed under ",
            rightsLink: "your rights",
            mid: " — use the ",
            formLink: "contact form",
            after: ". It reaches my inbox directly, and replying to it puts my address in front of you.",
        },
        collectedLede:
            "Only with your consent, and only after you have given it. Nothing in the list below is measured until you answer the banner, and answering no keeps it that way — the code that does the measuring is not even downloaded. Declining costs you nothing: the site behaves identically either way.",
        collected: [
            ["Which sections you reached, and how long each one was on screen", "To find out whether the page is worth scrolling."],
            ["How far down the page you got — 25%, 50%, 75%, 100%", "Same question, blunter."],
            ["Whether you opened a bio row, moved through the work corridor, or followed a link out", "To tell which parts hold attention."],
            ["Whether you saw the contact form, started writing, and sent it", "To find out where the form loses people."],
            ["Your device type, operating system and browser — three short labels like mobile, ios, safari. The full identifying string your browser sends is read, sorted into those three, and thrown away.", "To know what the site has to look right on."],
            ["Screen and window size, language, time zone", "Same question, in more detail."],
            ["The name of the site you arrived from — its host and nothing more, so google.com rather than the search you typed — and any campaign tags on the link. The full address your browser offers is read to find the host, and then dropped.", "To know where visitors come from."],
            ["A two-letter country code, but only when the network in front of the site has already worked one out and says so. There is no lookup here and no database to do one with, so this is often simply blank.", "To know which countries the site is read in. No city, no coordinates, nothing finer."],
        ],
        formBody: [
            "This one is not about consent. You type a name, an email address and a message, and sending it is the request — I would be ignoring you, not protecting you, if I refused to read it. All three fields are required: a message I cannot read or reply to is not a message, and the form will not send without them. There is no other field, hidden or otherwise, except a decoy input that only a spam bot fills in.",
            "What you send is emailed to me and <strong>never written to the database</strong>. It then sits in my mailbox for as long as the conversation is worth keeping, which is a judgment and not a schedule — ask me to delete it and I will. Your email address is also used to hold a fifteen-minute cooldown, so a double-click does not send twice — the same kind of small file the IP throttle below uses, named after a hash of the address rather than the address itself.",
        ],
        notCollected: [
            "<strong>Your IP address is never written to the database.</strong> No table that records a visit has a column for it. It is used for one thing: counting requests, so that one machine cannot flood the contact form or the counter. Even there the address itself is not written down — it is hashed, and the hash is the name of a small file holding a number. Those files are swept once they go a couple of hours untouched.",
            "Being exact about the edges of that, because it is the kind of claim worth checking: the web server in front of the application keeps its own access log, the way every web server on the internet does, and a line in a web server log has an address in it. That is plumbing, not measurement. It is never joined to anything on this page, and there is one row in this database that holds an IP address — mine, from my own sign-ins, described below.",
            "There is no profiling, no automated decision-making, no tracking across other websites, and no attempt to work out who you are. The identifier in <code>pf_vid</code> is a random number that means nothing outside this site. No name, no email address and no account is attached to it, because there are no visitor accounts here to attach.",
        ],
        cookiesTable: {
            name: "Name",
            purpose: "What it does",
            life: "Lifetime",
            consent: "Needs consent",
        },
        cookies: [
            {
                name: "pf_consent",
                purpose: "Records your answer to the banner — yes or no, and which numbered request you were answering — so you are not asked again until that request changes. Written by the page itself, and it is the only cookie that exists before you have answered.",
                life: "6 months",
                consent: "No. It exists to remember a choice, including a refusal.",
            },
            {
                name: "pf_vid",
                purpose: "A random number that tells one browser from another, so a second visit is not counted as a second person. Written by the server, and only once you have said yes.",
                life: "13 months, renewed on each visit",
                consent: "Yes",
            },
            {
                name: "pf_sid",
                purpose: "Groups the events of one visit together. A new one starts after 30 minutes of silence.",
                life: "30 minutes",
                consent: "Yes",
            },
            {
                name: "pf_admin",
                purpose: "Signs me in to my own dashboard. It is only ever issued against a correct password, so it never reaches a visitor's browser.",
                life: "7 days",
                consent: "No. Technical, and not a visitor's cookie.",
            },
        ],
        cookiesNote:
            "All four are first-party: set on this domain, sent back only to this domain, and unreadable by anybody else. There are no others — no advertising cookie, no embedded video player, no social button — and nothing about your visit is tucked away in your browser's local storage instead.",
        leaves: [
            "<strong>Your message, if you send one.</strong> It leaves over SMTP and lands in my mailbox. The provider that carries it and the provider that hosts that mailbox handle it the way the postal service handles a letter — they are in the path because there is no way to send mail without one. That is the whole list.",
            "Loading a page here contacts no one else. Every file the page needs — stylesheets, scripts, images, and the two typefaces it is set in — comes from this domain, so your browser never announces itself to a server I do not run. There is no analytics vendor, no advertising partner, no CRM, no newsletter tool, and no list your address is added to. The company that hosts the server can of course reach its disks, as is true of every hosted site anywhere, and if a network sits in front of the site and hands it a country code, that network sees the traffic too — see the last row of what is collected.",
            "Nothing here is deliberately sent outside the EEA. The mail path is the only place it could happen at all, and that depends on which provider is carrying the message.",
        ],
        basis: [
            "<strong>Analytics — your consent</strong>, art. 6(1)(a) GDPR, together with art. 122 of the Codice Privacy for the cookies themselves. You can withdraw it at any moment, below, and withdrawing is exactly as easy as giving it.",
            "Two different clocks run here, and they are worth keeping apart. The identifier in your browser, <code>pf_vid</code>, lasts <strong>13 months</strong> — the ceiling the Garante puts on an analytics identifier — and is renewed each time you come back. The rows on the server are deleted after <strong>400 days</strong>, by a job that runs nightly. The second number is not the first one rounded off; they govern different things, which is why the page gives both.",
            "<strong>The contact form — art. 6(1)(b)</strong>: steps taken at your own request, before anything like a contract exists. Nothing is stored server side; the email lives in my mailbox, as described above.",
            "<strong>Flood protection — art. 6(1)(f)</strong>, my legitimate interest in a site that stays up. Counters only, and they expire within hours.",
            "<strong>The consent cookie and the sign-in cookie</strong> need no consent at all: art. 122 of the Codice Privacy exempts a cookie that is strictly necessary to do the thing you asked for, and remembering that you said no is exactly that.",
        ],
        account: [
            "The numbers are read on a dashboard behind a login, and that login is an account: a name, an email address, a password kept only as a hash, and the second factor — the secret an authenticator app uses, and a set of recovery codes, also stored as hashes. Nothing there can be replayed as a login on its own, and a code that has been used once is remembered as used, so it cannot be presented twice.",
            "Signing in records the sign-in — when it happened, the address it came from, the browser it used — so the session can be recognized later and revoked. Those rows go when the session expires, within seven days.",
            "None of that is your data — it is mine, about me, and a person does not owe himself an informativa. It is written down here for one reason: a page that says your address is never stored owes you the one place in this database where an address <em>is</em>.",
        ],
        rights: [
            'Under articles 15 to 22 GDPR you may ask what is held about you, ask for it to be corrected or deleted, ask for its use to be restricted, object to it, or ask for a copy in a portable form. Under art. 7(3) you may withdraw your consent whenever you like, and doing so does not make what was collected before it unlawful. Under art. 77 you may complain to the Garante per la protezione dei dati personali — <a href="https://www.garanteprivacy.it" rel="noopener noreferrer">garanteprivacy.it</a> — without going through me first.',
            "In practice, the fastest route is the button below. The footer's “cookies” link goes there too — on the portfolio page it reopens the banner in place; here, and on the dashboard, it jumps straight down to this same block. Saying no either way deletes the identifiers from your browser on the spot, after which nothing further can be linked to you.",
            "Rows already written stay, and they carry no name, no address and nothing that points back at a person. Under art. 11 GDPR, a controller who has no reason to hold the extra information needed to pick one person out of an anonymous set is not obliged to go get it just to answer a request — which is exactly this case, and is also why I cannot single out yours unprompted. If you want those rows gone too, send me the value of your <code>pf_vid</code> cookie before you clear it; that is the only key that exists, and with it I can delete them by hand.",
        ],
        choice: {
            checking: "Checking…",
            granted: "Analytics is on. Your visits are counted, under the identifiers described above.",
            denied: "Analytics is off. Nothing is being collected, and the identifiers have been removed.",
            unset: "You have not been asked yet — nothing is being collected until you choose.",
            allow: "allow analytics",
            turnOff: "turn analytics off",
        },
        revisionsLede: [
            "Rewriting this page does not put your answer back in question. Consent is given to what is collected and why, not to a document — so correcting a sentence, or explaining something better, leaves an existing yes or no exactly as valid as it was. What does put the question back is a change to the request itself: a new cookie that needs permission, a third party appearing on the page, a new purpose, a new kind of thing counted.",
            "So the request is numbered, and the number you answered is stored in your <code>pf_consent</code> cookie alongside the answer. When it moves, every stored answer stops counting and the banner comes back — which is why it only ever moves for the reasons above. The list below says, for each revision, which kind it was.",
        ],
        revisionLabel: (date, scope) => `${date} · request ${scope}`,
        revisionFirst: "The first request — there was nothing to ask again.",
        revisionReasked: "The request changed, so the banner was shown again.",
        revisionWordingOnly: "Wording only. Answers already given stayed valid.",
        revisions: [
            {
                date: "7 August 2026",
                scope: 1,
                what: "First published, with the counting it describes.",
                reasked: null,
            },
            {
                date: "10 August 2026",
                scope: 1,
                what: "Published in Italian alongside English. Nothing about what is collected changed — only the number of languages it is explained in.",
                reasked: false,
            },
        ],
    },
} satisfies Content;
