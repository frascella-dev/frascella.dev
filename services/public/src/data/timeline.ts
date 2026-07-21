// Hard-coded source of truth for the public Portfolio timeline.
// Append entries to `entries` — order matters; the spline `fraction` is
// derived from the index so you don't need to set it manually.
//
// Entry shape:
//   {
//       year: 2024,
//       kind: "work",          // life | code | work | now | study | travel
//       title: "Headline…",
//       body: "Longer copy…",
//       pictures: [             // optional
//           { url: "/img/x.jpg", alt: "…", width: 800, height: 600 },
//       ],
//   }

const entries = [
    {
        year: 2000,
        kind: "life",
        title: "Born",
        body: "My story starts in Taranto — a port town on the Ionian sea.",
        fraction: 0.16,
    },
    {
        year: 2006,
        kind: "life",
        title: "First PC",
        body: "A Pentium 4 running Windows XP — the point of no return. Taking things apart, reinstalling, breaking stuff, and figuring out how it all worked.",
        fraction: 0.28,
    },
    {
        year: 2019,
        kind: "life",
        title: "High School Diploma",
        body: "Graduated from liceo scientifico. Five years of physics and math that would only start making sense later.",
        fraction: 0.42,
    },
    {
        year: 2021,
        kind: "work",
        title: "La Termica srl",
        body: "Designing photovoltaic plants. CAD, sun-path math, and a first lesson in how real hardware survives the weather.",
        fraction: 0.5,
    },
    {
        year: 2023,
        kind: "work",
        title: "SMED srl",
        body: "Telemedicine. Backend-heavy work on clinical data, APIs, and integrations.",
        fraction: 0.66,
    },
    {
        year: 2026,
        kind: "now",
        title: "Giocaonline srl",
        body: "Building casino games — real-time systems, fairness, and a lot of state to keep honest.",
        fraction: 0.84,
    },
];

export const timeline = entries.map((entry, i) => ({
    pictures: [],
    ...entry,
    id: i + 1,
}));
