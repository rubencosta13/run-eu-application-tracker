import type { IncomingMessage, ServerResponse } from "node:http";

export function send(
  response: ServerResponse,
  status: number,
  body: string | Buffer,
  contentType = "application/json; charset=utf-8",
): void {
  response.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(body);
}

export function sendJson(
  response: ServerResponse,
  status: number,
  value: unknown,
): void {
  send(response, status, JSON.stringify(value));
}

export async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 1_000_000) {
      throw new Error("Request body too large");
    }
  }
  return raw ? JSON.parse(raw) : {};
}