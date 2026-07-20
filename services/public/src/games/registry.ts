// Game metadata only — deliberately free of any React or game code so the
// shell can list games (`play list`) without pulling a single game into the
// main bundle. The actual components are lazy-loaded, see ./index.ts.

export type GameId = "pong";

export type GameMeta = {
    id: GameId;
    name: string;
    desc: string;
    /** Initial window size for this game. */
    window: { width: number; height: number };
};

export const GAMES: GameMeta[] = [
    {
        id: "pong",
        name: "pong",
        desc: "the classic — you vs. the machine",
        window: { width: 860, height: 580 },
    },
];

export const getGame = (id: string): GameMeta | undefined =>
    GAMES.find((g) => g.id === id);
