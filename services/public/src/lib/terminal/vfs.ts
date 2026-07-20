// A tiny in-browser filesystem for the guest console, persisted to
// localStorage. Deliberately simple: a tree of directories and text files,
// enough to make ls/cd/mkdir/rm/touch/cat/nano feel like a real shell.

export type VFile = { type: "file"; content: string };
export type VDir = { type: "dir"; children: Record<string, VNode> };
export type VNode = VFile | VDir;

const STORAGE_KEY = "ef-guest-fs";
export const HOME = "/home/guest";

export class FsError extends Error {}

function dir(children: Record<string, VNode> = {}): VDir {
    return { type: "dir", children };
}
function file(content = ""): VFile {
    return { type: "file", content };
}

function seed(): VDir {
    return dir({
        home: dir({
            guest: dir({
                "readme.txt": file(
                    [
                        "Welcome to the guest console.",
                        "",
                        "This is a sandboxed filesystem stored in your browser's",
                        "localStorage — nothing leaves your machine, and it survives",
                        "a page reload. Try: ls, cd, mkdir, touch, nano, rm.",
                        "",
                        "Run `help` for the full command list, or `play list` for games.",
                    ].join("\n"),
                ),
                projects: dir({}),
            }),
        }),
        tmp: dir({}),
        etc: dir({
            "motd": file("guestsh 1.0 — be nice, it's a sandbox.\n"),
        }),
    });
}

function isDir(node: VNode): node is VDir {
    return node.type === "dir";
}

/** Split a path into normalized segments, resolving . and .. against cwd. */
function normalize(path: string, cwd: string): string {
    let base: string[];
    if (path.startsWith("/")) base = [];
    else if (path === "~" || path.startsWith("~/")) {
        base = HOME.split("/").filter(Boolean);
        path = path.slice(1).replace(/^\//, "");
    } else base = cwd.split("/").filter(Boolean);

    const out = [...base];
    for (const part of path.split("/")) {
        if (!part || part === ".") continue;
        if (part === "..") out.pop();
        else out.push(part);
    }
    return "/" + out.join("/");
}

export class Vfs {
    private root: VDir;
    cwd: string = HOME;

    constructor() {
        this.root = this.load();
        // If the persisted home is gone, fall back to /
        if (!this.tryGet(this.cwd)) this.cwd = "/";
    }

    private load(): VDir {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.type === "dir") return parsed as VDir;
            }
        } catch {
            /* corrupted or unavailable storage — start fresh */
        }
        const fresh = seed();
        this.root = fresh;
        this.save();
        return fresh;
    }

    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.root));
        } catch {
            /* storage full or blocked — the session still works in memory */
        }
    }

    reset() {
        this.root = seed();
        this.cwd = HOME;
        this.save();
    }

    resolve(path: string): string {
        return normalize(path, this.cwd);
    }

    /** Get a node by absolute path, or null. */
    tryGet(abs: string): VNode | null {
        const parts = abs.split("/").filter(Boolean);
        let node: VNode = this.root;
        for (const part of parts) {
            if (!isDir(node)) return null;
            const next = node.children[part];
            if (!next) return null;
            node = next;
        }
        return node;
    }

    get(abs: string): VNode {
        const node = this.tryGet(abs);
        if (!node) throw new FsError(`${abs}: No such file or directory`);
        return node;
    }

    private parentOf(abs: string): { parent: VDir; name: string } {
        const parts = abs.split("/").filter(Boolean);
        const name = parts.pop();
        if (!name) throw new FsError("Operation not permitted on /");
        const parentNode = this.tryGet("/" + parts.join("/"));
        if (!parentNode || !isDir(parentNode))
            throw new FsError(`/${parts.join("/")}: No such directory`);
        return { parent: parentNode, name };
    }

    list(path = "."): { name: string; isDir: boolean }[] {
        const abs = this.resolve(path);
        const node = this.get(abs);
        if (!isDir(node)) return [{ name: abs.split("/").pop()!, isDir: false }];
        return Object.entries(node.children)
            .map(([name, n]) => ({ name, isDir: isDir(n) }))
            .sort((a, b) =>
                a.isDir === b.isDir
                    ? a.name.localeCompare(b.name)
                    : a.isDir
                      ? -1
                      : 1,
            );
    }

    changeDir(path: string) {
        const abs = this.resolve(path);
        const node = this.get(abs);
        if (!isDir(node)) throw new FsError(`${path}: Not a directory`);
        this.cwd = abs;
    }

    makeDir(path: string, parents = false) {
        const abs = this.resolve(path);
        if (this.tryGet(abs)) throw new FsError(`${path}: File exists`);
        const parts = abs.split("/").filter(Boolean);
        let node: VDir = this.root;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const last = i === parts.length - 1;
            const child = node.children[part];
            if (!child) {
                if (!last && !parents)
                    throw new FsError(`${path}: No such file or directory`);
                node.children[part] = dir();
            } else if (!isDir(child)) {
                throw new FsError(`${part}: Not a directory`);
            }
            node = node.children[part] as VDir;
        }
        this.save();
    }

    remove(path: string, recursive = false) {
        const abs = this.resolve(path);
        if (abs === "/") throw new FsError("refusing to remove /");
        if (abs === this.cwd)
            throw new FsError(`${path}: cannot remove the current directory`);
        const node = this.get(abs);
        if (isDir(node) && Object.keys(node.children).length && !recursive)
            throw new FsError(`${path}: Is a directory (use rm -r)`);
        const { parent, name } = this.parentOf(abs);
        delete parent.children[name];
        this.save();
    }

    touch(path: string) {
        const abs = this.resolve(path);
        if (this.tryGet(abs)) return; // exists — real touch just bumps mtime
        const { parent, name } = this.parentOf(abs);
        parent.children[name] = file("");
        this.save();
    }

    readFile(path: string): string {
        const abs = this.resolve(path);
        const node = this.get(abs);
        if (isDir(node)) throw new FsError(`${path}: Is a directory`);
        return node.content;
    }

    writeFile(path: string, content: string) {
        const abs = this.resolve(path);
        const existing = this.tryGet(abs);
        if (existing && isDir(existing)) throw new FsError(`${path}: Is a directory`);
        const { parent, name } = this.parentOf(abs);
        parent.children[name] = file(content);
        this.save();
    }

    move(from: string, to: string) {
        const src = this.resolve(from);
        const node = this.get(src);
        let dest = this.resolve(to);
        const destNode = this.tryGet(dest);
        if (destNode && isDir(destNode)) dest = `${dest}/${src.split("/").pop()}`;
        const { parent: sp, name: sn } = this.parentOf(src);
        const { parent: dp, name: dn } = this.parentOf(dest);
        dp.children[dn] = node;
        delete sp.children[sn];
        this.save();
    }

    copy(from: string, to: string) {
        const src = this.resolve(from);
        const node = this.get(src);
        let dest = this.resolve(to);
        const destNode = this.tryGet(dest);
        if (destNode && isDir(destNode)) dest = `${dest}/${src.split("/").pop()}`;
        const { parent: dp, name: dn } = this.parentOf(dest);
        dp.children[dn] = JSON.parse(JSON.stringify(node));
        this.save();
    }

    /** Pretty cwd with ~ for the home directory. */
    prettyCwd(): string {
        return this.cwd === HOME
            ? "~"
            : this.cwd.startsWith(HOME + "/")
              ? "~" + this.cwd.slice(HOME.length)
              : this.cwd;
    }
}
