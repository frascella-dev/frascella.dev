/**
 * The shape of one language.
 *
 * Both `en.ts` and `it.ts` are declared `satisfies Content`, so a key added to
 * one and forgotten in the other is a type error rather than a hole on the
 * page. That is the entire reason this file exists — a translation that is
 * silently 90% done looks finished until a visitor finds the English sentence.
 *
 * What is *not* here is as deliberate as what is. Anything identical in both
 * languages stays in `data/site.ts`: the name, the VAT number, the
 * coordinates, the profile URLs, the stack chips. Duplicating those into two
 * files would create two places to correct a VAT number.
 *
 * Where a sentence has a fact inside it — the name, the role, the city — the
 * entry is a function taking that fact rather than a string with the fact
 * typed into it. Italian puts the words in a different order, so a split
 * "before"/"after" pair would not survive the translation; a function lets
 * each language write its own sentence around the same single source.
 */

export type Project = {
    /** A proper noun — the same in both languages, and the JSON-LD keys on it. */
    title: string;
    desc: string;
    /** Year · stack. Language-neutral in practice, but it reads under prose. */
    meta: string;
};

export type BioRow = {
    /** Shown in the tile that follows the cursor over the row. */
    tile: string;
    /** The headline, split so the second half renders dimmed. */
    lead: string;
    trail: string;
    /** Right-hand meta on the row. */
    meta: string;
    /**
     * Names a set of photographs in `Bio.astro`. Not translatable — it is a
     * key, not a word — so it stays the same string in both files.
     */
    gallery?: string;
    /** Two-column body revealed when the row opens. */
    body: [string, string];
};

export type Cookie = {
    /** The cookie's actual name. Never translated. */
    name: string;
    purpose: string;
    life: string;
    consent: string;
};

export type Revision = {
    date: string;
    /** Must match `CONSENT_VERSION` in lib/consent.ts. */
    scope: number;
    what: string;
    /** `null` on the first entry: there was no previous answer to keep. */
    reasked: boolean | null;
};

/** The identity fields a sentence might need to wrap itself around. */
export type Who = { name: string; role: string; city: string; vat: string };

export type Content = {
    /** BCP 47, for `<html lang>`. */
    htmlLang: string;
    /** Underscored, for `og:locale`. */
    ogLocale: string;
    /** What the switcher calls this language, in this language. */
    endonym: string;

    owner: {
        /** Job title. Read by the <title>, the h1, the footer and the JSON-LD. */
        role: string;
        /** "Taranto, Italy" / "Taranto, Italia". */
        city: string;
    };

    meta: {
        description: (who: Who) => string;
        privacyTitle: (who: Who) => string;
        privacyDescription: string;
    };

    nav: {
        /** Section labels, in the order the header renders them. */
        links: { label: string; href: string }[];
        /** aria-label on the two <nav>s and the drawer. */
        sections: string;
        openMenu: string;
        closeMenu: string;
        menu: string;
        /** aria-label on the monogram, which is also a back-to-top link. */
        markLabel: (who: Who) => string;
    };

    hero: {
        /** The h1 is: name · role · <dim>titleDim</dim> · titleAfter. */
        titleDim: string;
        titleAfter: string;
        lede: string;
        portraitAlt: (who: Who) => string;
    };

    bio: {
        eyebrow: string;
        hint: string;
        /** The tile's resting label, before any row is hovered. */
        tileDefault: string;
        rows: BioRow[];
        /** Photo alt text, keyed `<gallery>.<index>`. */
        alt: Record<string, string>;
    };

    work: {
        eyebrow: string;
        introLead: string;
        introDim: string;
        introAside: string;
        progressHint: string;
        outroEyebrow: string;
        outroLine: string;
        /** "02 projects" — takes the zero-padded count. */
        projectCount: (n: string) => string;
        projects: Project[];
    };

    contact: {
        eyebrow: string;
        titleLead: string;
        titleDim: string;
        lede: string;
        fields: { name: string; email: string; message: string };
        placeholders: { name: string; email: string; message: string };
        honeypot: string;
        submit: string;
        /** Set by lib/contact.ts, which reads them off the form's dataset. */
        status: {
            sending: string;
            sent: string;
            checkHighlighted: string;
            checkForm: string;
            tooMany: string;
            failed: string;
        };
        /** The client-side rules, checked before anything is sent. */
        errors: { name: string; email: string; message: string };
    };

    footer: {
        tagline: (who: Who) => string;
        columns: { index: string; elsewhere: string; legal: string; language: string };
        privacy: string;
        cookies: string;
        backToTop: string;
        /** aria-label on the <nav> of link columns. */
        label: string;
        /** aria-label on the language switcher. */
        language: string;
    };

    consent: {
        label: string;
        /** Split around the link so the anchor stays markup, not interpolation. */
        copyBefore: string;
        privacyLink: string;
        copyAfter: string;
        accept: string;
        decline: string;
    };

    privacy: {
        back: string;
        title: string;
        lede: string;
        /** Every h2, in document order. */
        headings: {
            responsible: string;
            collected: string;
            form: string;
            notCollected: string;
            cookies: string;
            leaves: string;
            basis: string;
            account: string;
            rights: string;
            revisions: string;
        };
        controller: (who: Who) => string;
        /** With an address on file, and without — the page picks at build time. */
        contactWithEmail: { before: string; after: string };
        contactViaForm: {
            before: string;
            rightsLink: string;
            mid: string;
            formLink: string;
            after: string;
        };
        collectedLede: string;
        /** what → why. */
        collected: [string, string][];
        formBody: [string, string];
        notCollected: [string, string, string];
        cookiesTable: { name: string; purpose: string; life: string; consent: string };
        cookies: Cookie[];
        cookiesNote: string;
        leaves: [string, string, string];
        basis: [string, string, string, string, string];
        account: [string, string, string];
        rights: [string, string, string];
        choice: {
            checking: string;
            granted: string;
            denied: string;
            unset: string;
            allow: string;
            turnOff: string;
        };
        revisionsLede: [string, string];
        revisionLabel: (date: string, scope: string) => string;
        revisionFirst: string;
        revisionReasked: string;
        revisionWordingOnly: string;
        revisions: Revision[];
    };
};
