import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { GameId } from "./registry";

/**
 * Each game is a dynamic import, so Vite emits it as its own JS/CSS chunk that
 * is only fetched the first time the player launches it. Adding a game here
 * costs the portfolio bundle nothing.
 */
export const GAME_COMPONENTS: Record<
    GameId,
    LazyExoticComponent<ComponentType>
> = {
    pong: lazy(() => import("./Pong.tsx")),
};
