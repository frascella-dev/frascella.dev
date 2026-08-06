/**
 * The seam between "something happened" and "somebody is listening".
 *
 * Every module on the page can call `track()` unconditionally — the form,
 * the nav, the corridor. Nothing is sent until `connect()` hands over a real
 * sink, which only happens once consent has been granted and the analytics
 * module has loaded. Before that, events sit in a small capped buffer; if
 * consent never arrives they are dropped and nothing was ever collected.
 *
 * That inversion is the point: the callers don't have to know about consent,
 * and there is exactly one place where a refusal has to be honoured.
 */

export type TrackEvent = {
    /** Event name — the API only accepts names it knows. */
    n: string;
    /** Optional label: a section, a project, a destination host. */
    l?: string;
    /** Optional number: scroll depth, milliseconds, an index. */
    v?: number;
    /** Stamped when it happened, not when it was sent. */
    t: number;
};

type Sink = (event: TrackEvent) => void;

let sink: Sink | null = null;
const pending: TrackEvent[] = [];

/** Enough to cover the splash and the first screen, and no more. */
const BUFFER_LIMIT = 40;

export function track(n: string, l?: string, v?: number): void {
    const event: TrackEvent = { n, t: Date.now() };
    if (l !== undefined) event.l = l;
    if (v !== undefined) event.v = v;

    if (sink) sink(event);
    else if (pending.length < BUFFER_LIMIT) pending.push(event);
}

/** Called by the analytics module once it is allowed to run. */
export function connect(next: Sink): void {
    sink = next;
    const buffered = pending.splice(0, pending.length);
    for (const event of buffered) next(event);
}

/** Called when consent is withdrawn: stop listening, forget the buffer. */
export function disconnect(): void {
    sink = null;
    pending.length = 0;
}
