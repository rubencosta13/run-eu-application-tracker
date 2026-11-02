import path from "node:path";

export const host = process.env.HOST || "127.0.0.1";
export const port = Number(process.env.PORT || 4173);
export const publicDir = path.resolve(process.cwd(), "dist");
export const dataDir = path.resolve(process.cwd(), "data");
export const applicationsDir = path.join(dataDir, "applications");
export const libraryFile = path.join(dataDir, "answer-library.yaml");
export const participationFile = path.join(dataDir, "participation-history.yaml");
export const commonQuestionsFile = path.join(dataDir, "common-questions.yaml");

export const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};