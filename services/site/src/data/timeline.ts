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
        body: "Taranto — a port town on the Ionian sea. 2000: the year everyone thought computers would break. Nobody warned me I'd spend a career making sure they didn't.",
        fraction: 0.16,
    },
    {
        year: 2006,
        kind: "life",
        title: "First PC",
        body: "A Pentium 4 running Windows XP — the point of no return. I took it apart more times than I ever fixed it, and learned how it worked in the process.",
        fraction: 0.28,
    },
    {
        year: 2019,
        kind: "life",
        title: "Diploma",
        body: "Graduated liceo scientifico — five years of physics and math that felt like homework at the time, and turned out to matter more than I expected.",
        fraction: 0.42,
    },
    {
        year: 2021,
        kind: "work",
        title: "La Termica srl",
        body: "Designing photovoltaic plants — CAD, sun-path math, all of it suddenly useful. And a first lesson in how hardware survives real weather, not simulations.",
        fraction: 0.5,
    },
    {
        year: 2023,
        kind: "work",
        title: "SMED srl",
        body: "Telemedicine, this time — clinical data, APIs, integrations. No weather to survive here, just records that had to be right and code nobody notices until it breaks.",
        fraction: 0.66,
    },
    {
        year: 2026,
        kind: "now",
        title: "Giocaonline srl",
        body: "Building casino games, now — real-time engines, fairness rules, and a lot of state that has to stay honest, because real money sits on the other side of every bug.",
        fraction: 0.84,
    },
];

export const timeline = entries.map((entry, i) => ({
    pictures: [],
    ...entry,
    id: i + 1,
}));
