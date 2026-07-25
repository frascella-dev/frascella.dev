import type { ReactNode } from "react";

/**
 * The shared frame every experiment renders inside. It carries the portfolio's
 * abstract-line language — mono labels, thin rules, corner ticks, a coordinate
 * readout — so all experiments read as one system. Put your <Canvas> (and any
 * HUD/overlay) as children; it fills the framed stage.
 */
export default function LabStage({
    idx,
    title,
    tag = "experiment",
    hint,
    children,
}: {
    /** Two-digit index shown top-left, e.g. "01". */
    idx: string;
    /** Experiment title, shown bottom-left. */
    title: string;
    /** Short kind label, shown top-right. */
    tag?: string;
    /** Optional hint / controls, shown bottom-right. */
    hint?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="lab-stage">
            <header className="lab-stage-head">
                <span className="ef-label">IDX — {idx}</span>
                <span className="ef-label">{tag}</span>
            </header>

            <div className="lab-stage-frame">
                <span className="lab-tick lab-tick-tl" aria-hidden />
                <span className="lab-tick lab-tick-tr" aria-hidden />
                <span className="lab-tick lab-tick-bl" aria-hidden />
                <span className="lab-tick lab-tick-br" aria-hidden />
                <div className="lab-stage-canvas">{children}</div>
            </div>

            <footer className="lab-stage-foot">
                <span className="ef-label">{title}</span>
                {hint ? <span className="ef-label">{hint}</span> : <span />}
            </footer>
        </section>
    );
}
