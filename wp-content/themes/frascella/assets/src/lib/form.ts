/**
 * The contact form, sent without leaving the page.
 *
 * Agenda's form works with no script at all: it posts, and the server answers with the
 * form again (with its refusals) or redirects to the confirmation. On this page a reload
 * would also reload the desk scene, so here the same request is made with `fetch`, asking
 * Agenda for JSON (it answers `{ok, redirect}` or `{ok: false, html}`):
 * - refused: the form Agenda rendered with its refusals replaces this one, and the first
 *   refused field gets the focus;
 * - sent: the confirmation page is fetched and its confirmation replaces the form, and gets
 *   the focus.
 * Any failure on the way falls back to the plain submit.
 *
 * Bound on the document, so a form that has just replaced another is handled the same.
 */

const FORM = "form[data-agenda-form]";

function swap(current: Element, html: string): Element | null {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const key = current.getAttribute("data-agenda");
    const next = doc.querySelector(`[data-agenda="${CSS.escape(key ?? "")}"]`) ?? doc.querySelector("[data-agenda]");
    if (!next) return null;
    const node = document.importNode(next, true);
    current.replaceWith(node);
    return node;
}

export function initForm(): void {
    document.addEventListener("submit", async (event) => {
        const form = (event.target as Element).closest<HTMLFormElement>(FORM);
        const box = form?.closest("[data-agenda]");
        if (!form || !box || form.dataset.plain === "1") return;
        event.preventDefault();
        form.setAttribute("aria-busy", "true");
        try {
            const sent = await fetch(form.action, {
                method: "POST",
                body: new FormData(form),
                headers: { Accept: "application/json" },
                credentials: "same-origin",
            });
            const answer = (await sent.json()) as { ok: boolean; redirect?: string; html?: string };
            if (answer.ok && answer.redirect) {
                const page = await fetch(answer.redirect, { credentials: "same-origin" });
                const done = swap(box, await page.text());
                if (!done) throw new Error("no confirmation");
                const focus = done.querySelector<HTMLElement>("[data-agenda-done]") ?? (done as HTMLElement);
                focus.setAttribute("tabindex", "-1");
                focus.focus();
                return;
            }
            if (!answer.ok && answer.html) {
                const again = swap(box, answer.html);
                if (!again) throw new Error("no form");
                (again.querySelector<HTMLElement>('[aria-invalid="true"]') ?? again.querySelector<HTMLElement>("[role=alert]"))?.focus();
                return;
            }
            throw new Error("unexpected answer");
        } catch {
            // The plain way: post the form and let the server answer with a page.
            form.dataset.plain = "1";
            form.removeAttribute("aria-busy");
            form.submit();
        }
    });
}
