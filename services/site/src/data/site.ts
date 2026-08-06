// Single source of truth for every piece of copy the page renders twice —
// once in the static Astro markup, once from the client scripts (the work
// corridor paints its slab labels into a 2D canvas, and swaps the caption
// as you scroll). Keeping both readers on one module is what stops the
// canvas and the DOM from drifting apart.

export const owner = {
    name: "Emanuele Frascella",
    role: "Software engineer",
    city: "Taranto, Italy",
    /** Italian VAT number — a legal identifier, so it stays in its native form. */
    vat: "03462650734",
    /**
     * Where data-protection requests should go. The privacy page falls back
     * to pointing at the contact form while this is empty — which is a valid
     * contact channel, just a slower one than an address.
     */
    email: "",
    timezone: "CET / CEST",
    coords: "40.4644° n / 17.2470° e",
    github: "https://github.com/manuto276",
    linkedin: "https://www.linkedin.com/in/efrascella256/",
};

/** The one list the header and the mobile drawer both render. */
export const navLinks = [
    { label: "home", href: "#top" },
    { label: "bio", href: "#bio" },
    { label: "work", href: "#work" },
    { label: "contact", href: "#contact" },
];

export type Project = {
    /** Corridor caption + the big serif title. */
    title: string;
    desc: string;
    /** Year · stack, rendered as the meta line under the description. */
    meta: string;
};

export const projects: Project[] = [
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
];

export type BioRow = {
    /** Shown in the floating tile that follows the cursor over the row. */
    tile: string;
    /** The headline, split so the second half renders dimmed. */
    lead: string;
    trail: string;
    /** Right-hand meta on the row. */
    meta: string;
    /**
     * Names a set of photographs in `Bio.astro`. A row with one shows them in
     * the tile that follows the cursor instead of the hatched placeholder,
     * cycling to the next one each time the row is hovered afresh.
     */
    gallery?: string;
    /** Two-column body revealed when the row opens. */
    body: [string, string];
};

export const bioRows: BioRow[] = [
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
            "I've been writing code since 2013 — Android apps first, then C++ through high school. Before that I was already taking things apart: decompiling Android APKs, poking through Minecraft mods, anything I could get inside.",
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
            "Most evenings end in Procreate. Mostly tattoo designs — flash sheets, lettering, things people might actually wear.",
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
];

export const heroChips = ["javascript", "python", "php", "docker", "aws"];

export const footerFacts = ["born in taranto", "mostly backend", "freelance only", "remote since 2026"];
