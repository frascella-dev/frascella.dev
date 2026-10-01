export interface Pool {
    workers: number;
    stats: Array<[string, number]>;
    prefetch(): void;
    run(job: string, args?: unknown[], options?: { transfer?: Transferable[]; cost?: number; flip?: boolean; tag?: string | null }): Promise<Record<string, ImageBitmap | HTMLCanvasElement>>;
    seed(name: string): number | undefined;
    close(): void;
}
export function createPool(options?: { shot?: boolean; workers?: number }): Pool;
