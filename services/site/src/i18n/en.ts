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
        privacyTitle: (who) => `Privacy policy — ${who.name}`,
        privacyDescription:
            "What this website collects, for what purposes, how long it is retained, and how to refuse.",
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
        back: "\u2190 back to the site",
        title: "Privacy policy",
        lede: "This website measures its own traffic. There is no Google Analytics, no advertising network and no third-party script, and no element of the page is fetched from any other server \u2014 no typeface, no video player, no social button. The code performing the measurement forms part of the website, and the data it produces is held in a database on the same server that serves the page. One category of data leaves this server, and only where the user sends it: the content of a message submitted through the contact form, which is transmitted by email.",
        headings: {
            responsible: "Data controller",
            collected: "Data collected, and the purposes",
            form: "The contact form",
            notCollected: "Data not collected",
            cookies: "Cookies",
            leaves: "Data leaving this server",
            basis: "Legal basis and retention",
            account: "The controller\u2019s own account",
            rights: "Rights of the data subject",
            revisions: "Revisions",
        },
        controller: (who) =>
            `The data controller is ${who.name}, ${who.city}, VAT no. ${who.vat}. The website is operated by a single natural person; no organisation stands behind it and no data protection officer has been appointed, neither being required at this scale.`,
        contactWithEmail: {
            before: "Requests concerning any matter described in this notice may be addressed to ",
            after: ".",
        },
        contactViaForm: {
            before: "Requests concerning any matter described in this notice, including those listed under ",
            rightsLink: "rights of the data subject",
            mid: ", may be submitted through the ",
            formLink: "contact form",
            after: ". Messages are delivered directly to the controller\u2019s mailbox, and a reply discloses the controller\u2019s address.",
        },
        collectedLede:
            "Collection takes place only with the consent of the data subject, and only after that consent has been given. None of the items listed below is measured before the banner has been answered, and a refusal maintains that condition: the measurement code is not downloaded at all. Refusal carries no consequence \u2014 the website behaves identically in either case.",
        collected: [
            ["Sections reached, and the length of time each remained on screen", "To determine whether the page merits scrolling."],
            ["Scroll depth reached \u2014 25%, 50%, 75%, 100%", "The same question, stated more bluntly."],
            ["Whether a biography row was opened, whether the work corridor was traversed, and whether an outbound link was followed", "To determine which parts of the page hold attention."],
            ["Whether the contact form was displayed, whether entry began, and whether it was submitted", "To determine at which point the form loses users."],
            ["Device type, operating system and browser, recorded as three short labels such as mobile, ios, safari. The full identifying string transmitted by the browser is read, reduced to those three labels, and discarded.", "To establish the environments in which the website must render correctly."],
            ["Screen and window dimensions, language, time zone", "The same question, in greater detail."],
            ["The name of the referring website \u2014 its host alone, therefore google.com rather than the query entered \u2014 together with any campaign parameters present on the link. The full address offered by the browser is read in order to extract the host, and is then discarded.", "To establish the origin of visits."],
            ["A two-letter country code, and only where the network placed in front of the website has already determined one and declares it. No lookup is performed and no database exists for that purpose, so this field is frequently empty.", "To establish the countries in which the website is read. No city, no coordinates, nothing more granular."],
        ],
        formBody: [
            "Consent does not apply here. The user enters a name, an email address and a message; submission constitutes the request itself, and a refusal to read it would disregard the user rather than protect them. All three fields are mandatory: a message that can be neither read nor answered is not a message, and the form will not submit without them. No other field exists, concealed or otherwise, save for a decoy input completed only by automated agents.",
            "The content of the message is transmitted by email to the controller and <strong>is never written to the database</strong>. It then remains in the controller\u2019s mailbox for as long as the correspondence warrants, which is a matter of judgement rather than a fixed schedule, and it is deleted on request. The email address is also used to maintain a fifteen-minute cooldown, so that a repeated submission is not sent twice \u2014 the same kind of small file used by the IP throttle described below, named after a hash of the address rather than the address itself.",
        ],
        notCollected: [
            "<strong>IP addresses are never written to the database.</strong> No table recording a visit provides a column to hold one. They serve a single purpose: counting requests, so that no single machine can flood the contact form or the counter. Even there the address is not recorded \u2014 it is hashed, and the hash is the name of a small file holding a number. Those files are removed once they have gone a couple of hours untouched.",
            "Stated precisely, this being a claim worth verifying: the web server placed in front of the application keeps its own access log, as does every web server on the internet, and a line in such a log contains an address. That is infrastructure, not measurement. It is never joined to anything described in this notice, and this database holds one row containing an IP address \u2014 that of the controller, from the controller\u2019s own sign-ins, described below.",
            "There is no profiling, no automated decision-making, no tracking across other websites and no attempt to establish the identity of the user. The identifier held in <code>pf_vid</code> is a random number without meaning outside this website. No name, no email address and no account is associated with it, there being no visitor accounts to associate.",
        ],
        cookiesTable: {
            name: "Name",
            purpose: "Function",
            life: "Retention",
            consent: "Consent required",
        },
        cookies: [
            {
                name: "pf_consent",
                purpose: "Records the answer given to the banner \u2014 affirmative or negative, and the numbered request to which it relates \u2014 so that the question is not put again until that request changes. Written by the page itself, and the only cookie present before an answer has been given.",
                life: "6 months",
                consent: "No. It exists in order to record a choice, a refusal included.",
            },
            {
                name: "pf_vid",
                purpose: "A random number distinguishing one browser from another, so that a return visit is not counted as a second person. Written by the server, and only once consent has been given.",
                life: "13 months, renewed on each visit",
                consent: "Yes",
            },
            {
                name: "pf_sid",
                purpose: "Groups the events of a single visit. A new one begins after 30 minutes of inactivity.",
                life: "30 minutes",
                consent: "Yes",
            },
            {
                name: "pf_admin",
                purpose: "Authenticates the controller to the administrative dashboard. It is issued only against a correct password and therefore never reaches a visitor\u2019s browser.",
                life: "7 days",
                consent: "No. Technical, and not a visitor\u2019s cookie.",
            },
        ],
        cookiesNote:
            "All four are first-party: set on this domain, returned only to this domain, and unreadable by any other party. There are no others \u2014 no advertising cookie, no embedded video player, no social button \u2014 and no information concerning the visit is held in the browser\u2019s local storage in their place.",
        leaves: [
            "<strong>The content of a message, where one is submitted.</strong> It leaves by SMTP and arrives in the controller\u2019s mailbox. The provider carrying it and the provider hosting that mailbox handle it as a postal service handles a letter; they are in the path because mail cannot be sent without one. That is the entire list.",
            "Loading a page here contacts no other party. Every file the page requires \u2014 stylesheets, scripts, images, and the two typefaces in which it is set \u2014 is served from this domain, so the browser never announces itself to a server the controller does not operate. There is no analytics vendor, no advertising partner, no CRM, no newsletter tool and no list to which the address is added. The company hosting the server has access to its own disks, as is true of every hosted website, and where a network placed in front of the website supplies a country code, that network sees the traffic as well \u2014 see the final row of the data collected.",
            "No data is deliberately transferred outside the European Economic Area. The mail path is the only point at which this could occur, and that depends on the provider carrying the message.",
        ],
        basis: [
            "<strong>Analytics \u2014 consent of the data subject</strong>, art. 6(1)(a) GDPR, together with art. 122 of the Codice Privacy in respect of the cookies themselves. Consent may be withdrawn at any time, below, and withdrawal is exactly as straightforward as the giving of it.",
            "Two distinct periods apply, and are worth keeping apart. The identifier held in the browser, <code>pf_vid</code>, lasts <strong>13 months</strong> \u2014 the ceiling placed by the Garante on an analytics identifier \u2014 and is renewed on each return. The rows held on the server are deleted after <strong>400 days</strong>, by a job running nightly. The second figure is not the first one rounded; they govern different things, which is why both are stated.",
            "<strong>The contact form \u2014 art. 6(1)(b)</strong>: steps taken at the request of the data subject, prior to the existence of any contract. Nothing is stored server-side; the message resides in the controller\u2019s mailbox, as described above.",
            "<strong>Flood protection \u2014 art. 6(1)(f)</strong>, the legitimate interest of the controller in a website that remains available. Counters only, expiring within hours.",
            "<strong>The consent cookie and the sign-in cookie</strong> require no consent at all: art. 122 of the Codice Privacy exempts a cookie strictly necessary to provide the service requested, and recording a refusal is precisely that.",
        ],
        account: [
            "The figures are read on a dashboard behind a sign-in, and that sign-in is an account: a name, an email address, a password held only as a hash, and the second factor \u2014 the secret used by an authenticator application, together with a set of recovery codes, likewise held as hashes. None of those elements can be replayed as a sign-in on its own, and a code once used is recorded as used and cannot be presented a second time.",
            "Signing in records the sign-in \u2014 the time, the address it originated from, the browser used \u2014 so that the session may later be recognised and revoked. Those rows are removed when the session expires, within seven days.",
            "None of that constitutes data concerning the visitor: it concerns the controller, and no informativa is owed to oneself. It is set out here for one reason \u2014 a notice stating that visitors\u2019 addresses are never stored owes an account of the single place in this database where an address <em>is</em> held.",
        ],
        rights: [
            'Under articles 15 to 22 GDPR the data subject may request access to the data held concerning them, its rectification or erasure, or the restriction of its processing, may object to the processing, and may request a copy in a portable format. Under art. 7(3) consent may be withdrawn at any time, without affecting the lawfulness of processing carried out beforehand. Under art. 77 a complaint may be lodged with the Garante per la protezione dei dati personali \u2014 <a href="https://www.garanteprivacy.it" rel="noopener noreferrer">garanteprivacy.it</a> \u2014 without prior recourse to the controller.',
            "In practice the quickest route is the control below. The \u201ccookies\u201d link in the footer leads there as well: on the portfolio page it reopens the banner in place, while here, and on the dashboard, it moves directly to this block. A refusal by either route deletes the identifiers from the browser immediately, after which nothing further can be linked to the visitor.",
            "Rows already written remain, and carry no name, no address and nothing pointing back to a person. Under art. 11 GDPR a controller who has no reason to hold the additional information required to identify one person within an anonymous set is not obliged to obtain it solely in order to answer a request \u2014 which is precisely the present case, and is also why such rows cannot be isolated unprompted. Where their deletion is also sought, the value of the <code>pf_vid</code> cookie should be sent to the controller before it is cleared: it is the only key in existence, and with it the rows can be deleted manually.",
        ],
        choice: {
            checking: "Checking\u2026",
            granted: "Analytics is enabled. Visits are counted under the identifiers described above.",
            denied: "Analytics is disabled. Nothing is being collected, and the identifiers have been removed.",
            unset: "No answer has been given yet. Nothing is collected until a choice is made.",
            allow: "allow analytics",
            turnOff: "turn analytics off",
        },
        revisionsLede: [
            "Rewriting this notice does not place an answer already given back in question. Consent is given to what is collected and why, not to a document, so correcting a sentence or explaining a matter more clearly leaves an existing assent or refusal exactly as valid as it was. What does place the question back is a change to the request itself: a new cookie requiring permission, a third party appearing on the page, a new purpose, a new category of data counted.",
            "The request is therefore numbered, and the number answered is held in the <code>pf_consent</code> cookie alongside the answer. When it changes, every stored answer ceases to have effect and the banner is put again \u2014 which is why it changes only for the reasons above. The list below states, for each revision, which kind it was.",
        ],
        revisionLabel: (date, scope) => `${date} \u00b7 request ${scope}`,
        revisionFirst: "The first request \u2014 there was nothing to put again.",
        revisionReasked: "The request changed, and the banner was put again.",
        revisionWordingOnly: "Wording only. Answers already given remained valid.",
        revisions: [
            {
                date: "7 August 2026",
                scope: 1,
                what: "First published, together with the counting it describes.",
                reasked: null,
            },
            {
                date: "10 August 2026",
                scope: 1,
                what: "Published in Italian alongside English. Nothing collected changed \u2014 only the number of languages in which it is set out.",
                reasked: false,
            },
            {
                date: "10 August 2026",
                scope: 1,
                what: "Rewritten throughout in an impersonal register. No change to what is collected, to the purposes, or to the retention periods.",
                reasked: false,
            },
        ],
    },
} satisfies Content;
