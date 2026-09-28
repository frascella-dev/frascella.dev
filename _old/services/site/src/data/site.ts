// Identity, and nothing that changes with the language.
//
// The copy that does — every sentence, the project descriptions, the bio
// rows, the whole privacy notice — lives in `src/i18n/en.ts` and `it.ts`,
// checked against one another by `src/i18n/types.ts`. What stays here is what
// would be the same in any language: a VAT number, a pair of coordinates, two
// profile URLs, five stack labels. Splitting those across two files would
// create two places to correct a VAT number, which is the whole argument.
//
// The role and the city are the exception, and they live in the content tree
// rather than here: "Software engineer" is kept in English by both, but
// "Taranto, Italy" is "Taranto, Italia", and a field that is a word rather
// than an identifier belongs with the words.

export const owner = {
    name: "Emanuele Frascella",
    /** Italian VAT number — a legal identifier, so it stays in its native form. */
    vat: "03462650734",
    /**
     * Where data-protection requests should go. Both privacy pages fall back
     * to pointing at the contact form while this is empty — which is a valid
     * contact channel, just a slower one than an address.
     */
    email: "",
    timezone: "CET / CEST",
    coords: "40.4644° n / 17.2470° e",
    github: "https://github.com/manuto276",
    linkedin: "https://www.linkedin.com/in/efrascella256/",
};

/** Language-neutral by construction: they are the names the tools go by. */
export const heroChips = ["javascript", "python", "php", "docker", "aws"];

/**
 * The strip of short claims closing the bio. The first renders emphasised.
 *
 * English on both pages, deliberately. Three of the four are the terms the
 * trade actually uses — an Italian developer says "mostly backend" and
 * "freelance only", and "soprattutto backend" is a calque nobody writes. They
 * lived in the content tree once and were identical there, which is the one
 * thing this file exists to prevent: two places to edit a single string.
 * Translating them means moving the field back, not editing it twice.
 */
export const bioFacts = ["born in taranto", "mostly backend", "freelance only", "remote since 2026"];

export type { Project, BioRow } from "../i18n/types.ts";
