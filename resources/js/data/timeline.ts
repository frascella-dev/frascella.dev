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

const FRACTION_START = 0.16;
const FRACTION_END = 0.84;

const entries = [
    // append entries here
];

function fractionFor(index, count) {
    if (count === 1) {
        return (FRACTION_START + FRACTION_END) / 2;
    }
    const step = (FRACTION_END - FRACTION_START) / (count - 1);
    return FRACTION_START + index * step;
}

export const timeline = entries.map((entry, i) => ({
    pictures: [],
    ...entry,
    id: i + 1,
    fraction: fractionFor(i, entries.length),
}));
