import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { handleApiRequest } from "./api.js";
import { host, mimeTypes, port, publicDir } from "./config.js";
import { send, sendJson } from "./http.js";

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    if (await handleApiRequest(request, response, url.pathname)) return;

    if (request.method !== "GET") {
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    const requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
    const file = path.resolve(publicDir, requested);
    if (!file.startsWith(`${publicDir}${path.sep}`) && file !== path.join(publicDir, "index.html")) {
      send(response, 403, "Forbidden", "text/plain; charset=utf-8");
      return;
    }

    const content = await readFile(file);
    send(response, 200, content, mimeTypes[path.extname(file)] || "application/octet-stream");
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unexpected server error";
    sendJson(response, error instanceof SyntaxError ? 400 : 500, { error: message });
  }
});

server.listen(port, host, () => {
  console.log(`RUN-EU tracker: http://${host}:${port}`);
});