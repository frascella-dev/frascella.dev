import type { Pool } from "./texpool.js";

export interface StartOptions {
    canvas: HTMLCanvasElement;
    pool: Pool;
    progress?: (fraction: number) => void;
    allowSoftware?: boolean;
    shot?: boolean;
}
/** Builds the desk; resolves when its first frame is on screen, rejects if it cannot run. */
export function start(options: StartOptions): Promise<{ renderer: unknown; stats: Array<[string, number]> }>;
