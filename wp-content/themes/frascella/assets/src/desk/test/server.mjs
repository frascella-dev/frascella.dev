/**
 * A static server for the desk's measurements, rooted at the repository, that compresses
 * text the way the production web server does (brotli, else gzip). Without it the
 * prototype's three.js would travel uncompressed and every comparison would flatter the port.
 *
 *   node server.mjs [port]      (default 8790)
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { brotliCompressSync, gzipSync, constants } from "node:zlib";

const root = resolve(import.meta.dirname, "../../../../../../..");
const port = Number(process.argv[2] ?? 8790);
const TYPES = {
    ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
    ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp", ".avif": "image/avif",
    ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".ktx2": "image/ktx2", ".bin": "application/octet-stream",
};
const TEXT = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg"]);
const cache = new Map();

createServer(async (req, res) => {
    try {
        let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
        let file = normalize(join(root, path));
        if (!file.startsWith(root)) throw new Error("outside");
        if ((await stat(file)).isDirectory()) file = join(file, "index.html");
        const ext = extname(file), body = await readFile(file), mtime = (await stat(file)).mtimeMs, enc = String(req.headers["accept-encoding"] ?? "");
        const headers = { "Content-Type": TYPES[ext] ?? "application/octet-stream", "Cache-Control": "no-cache" };
        let out = body;
        if (TEXT.has(ext)) {
            const kind = enc.includes("br") ? "br" : enc.includes("gzip") ? "gzip" : null;
            if (kind) {
                const key = file + "|" + kind + "|" + body.length + "|" + mtime;
                if (!cache.has(key)) cache.set(key, kind === "br" ? brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } }) : gzipSync(body, { level: 9 }));
                out = cache.get(key); headers["Content-Encoding"] = kind; headers["Vary"] = "Accept-Encoding";
            }
        }
        headers["Content-Length"] = out.length;
        res.writeHead(200, headers); res.end(req.method === "HEAD" ? undefined : out);
    } catch {
        res.writeHead(404); res.end("not found");
    }
}).listen(port, "127.0.0.1", () => console.log(`desk test server: http://127.0.0.1:${port}/ (root ${root})`));
