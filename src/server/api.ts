import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  applicationsDir,
  commonQuestionsFile,
  libraryFile,
  participationFile,
} from "./config.js";
import { readJsonBody, sendJson } from "./http.js";
import {
  applicationPath,
  deleteApplication,
  readApplications,
  readYaml,
  writeYaml,
  type ApplicationRecord,
} from "./yaml-store.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasProgrammeDetails(value: unknown): value is ApplicationRecord {
  if (!isRecord(value) || !isRecord(value.programme)) return false;
  return Boolean(value.programme.id && value.programme.name);
}

function withoutFilename(record: ApplicationRecord): ApplicationRecord {
  const { _file, ...stored } = record;
  return stored;
}

function safeId(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

async function saveCollection(
  request: IncomingMessage,
  response: ServerResponse,
  file: string,
  fallback: Record<string, unknown>,
): Promise<void> {
  if (request.method === "GET") {
    sendJson(response, 200, await readYaml(file, fallback));
  } else if (request.method === "PUT") {
    const data = await readJsonBody(request);
    await writeYaml(file, data);
    sendJson(response, 200, data);
  } else {
    sendJson(response, 405, { error: "Method not allowed" });
  }
}

export async function handleApiRequest(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
): Promise<boolean> {
  const method = request.method;

  if (pathname === "/api/applications" && method === "GET") {
    sendJson(response, 200, await readApplications());
    return true;
  }

  if (pathname === "/api/applications" && method === "POST") {
    const data = await readJsonBody(request);
    if (!hasProgrammeDetails(data)) {
      sendJson(response, 400, {
        error: "Programme ID and name are required.",
      });
      return true;
    }

    const filename = `${safeId(data.programme?.id)}.yaml`;
    const file = applicationPath(filename);
    try {
      await readFile(file);
      sendJson(response, 409, {
        error: "An application with this programme ID already exists.",
      });
      return true;
    } catch (error) {
      if (
        !error ||
        typeof error !== "object" ||
        !("code" in error) ||
        error.code !== "ENOENT"
      ) {
        throw error;
      }
    }

    const stored = withoutFilename(data);
    await writeYaml(file, stored);
    sendJson(response, 201, { ...stored, _file: filename });
    return true;
  }

  const applicationMatch = pathname.match(/^\/api\/applications\/([^/]+)$/);
  if (applicationMatch && (method === "PUT" || method === "DELETE")) {
    const filename = decodeURIComponent(applicationMatch[1]);
    if (method === "DELETE") {
      await deleteApplication(filename);
      sendJson(response, 200, { ok: true });
      return true;
    }

    const data = await readJsonBody(request);
    if (!hasProgrammeDetails(data)) {
      sendJson(response, 400, {
        error: "Programme ID and name are required.",
      });
      return true;
    }
    const stored = withoutFilename(data);
    await writeYaml(applicationPath(filename), stored);
    sendJson(response, 200, { ...stored, _file: filename });
    return true;
  }

  if (pathname === "/api/participation-history") {
    await saveCollection(request, response, participationFile, { entries: [] });
    return true;
  }
  if (pathname === "/api/answer-library") {
    await saveCollection(request, response, libraryFile, { entries: [] });
    return true;
  }
  if (pathname === "/api/common-questions") {
    await saveCollection(request, response, commonQuestionsFile, {
      questions: [],
    });
    return true;
  }

  if (pathname.startsWith("/api/")) {
    sendJson(response, 404, { error: "Not found" });
    return true;
  }
  return false;
}