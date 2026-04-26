// Hard-coded source of truth for the public Portfolio Work grid.
// Append entries to `entries` — only the first PROJECT_LIMIT show on the page.
//
// Project shape:
//   {
//       slug: "unique-slug",
//       title: "Project title",
//       tagline: "One-liner for the Work card",
//       year: 2024,
//       client: "Acme Co.",
//       role: "Lead engineer",
//       tone: "paper",       // ink | paper | accent | outline
//       stack: ["Laravel", "React", "PostgreSQL"],
//       metric: { n: "3.2×", l: "checkout completion" },
//       preview: {
//           url: "/img/preview.jpg",
//           alt: "…",
//           width: 1200,
//           height: 800,
//       },
//   }

const PROJECT_LIMIT = 5;

const entries = [
    {
        slug: "vitrine",
        title: "Vitrine",
        tagline: "A cool system monitor for your desktop",
        year: 2026,
        role: "Creator",
        tone: "ink",
        stack: ["C#", "WPF", "WebView2", "React"],
        metric: { n: "∞", l: "themes via React" },
    },
];

export const projects = entries.slice(0, PROJECT_LIMIT).map((project, i) => ({
    stack: [],
    preview: null,
    ...project,
    id: i + 1,
}));
