/**
 * Elementor's preview: behaviour for what Elementor draws after the page has loaded.
 *
 * In the editor a section is rendered again every time a field changes, long after this
 * bundle ran. Elementor announces each rendered element on `frontend/element_ready/global`;
 * whatever needs a script is bound again there, on that element only.
 */

type Scope = ArrayLike<HTMLElement>;
interface Frontend {
    hooks: { addAction: (name: string, callback: (scope: Scope) => void) => void };
}

export function onElementorRender(init: (root: HTMLElement) => void): void {
    if (!document.documentElement.classList.contains("editing")) return;
    const hook = () => {
        const frontend = (window as unknown as { elementorFrontend?: Frontend }).elementorFrontend;
        frontend?.hooks.addAction("frontend/element_ready/global", (scope) => {
            if (scope[0]) init(scope[0]);
        });
    };
    const jq = (window as unknown as { jQuery?: (w: Window) => { on: (e: string, fn: () => void) => void } }).jQuery;
    if (jq) jq(window).on("elementor/frontend/init", hook);
}
