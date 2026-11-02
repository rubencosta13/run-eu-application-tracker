import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { applicationsDir } from "./config.js";

export interface ApplicationRecord extends Record<string, unknown> {
  programme?: Record<string, unknown>;
  _file?: string;
}

export async function readYaml<T>(file: string, fallback: T): Promise<T> {
  try {
    return (YAML.parse(await readFile(file, "utf8")) ?? fallback) as T;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return fallback;
    }
    throw error;
  }
}

export async function writeYaml(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const content = YAML.stringify(value, {
    lineWidth: 100,
    defaultStringType: "QUOTE_DOUBLE",
  });
  await writeFile(file, content, "utf8");
}

export async function readApplications(): Promise<ApplicationRecord[]> {
  await mkdir(applicationsDir, { recursive: true });
  const filenames = (await readdir(applicationsDir))
    .filter((name) => /^[-a-z0-9_]+\.ya?ml$/i.test(name))
    .sort();
  return Promise.all(
    filenames.map(async (filename) => ({
      ...(await readYaml<ApplicationRecord>(
        path.join(applicationsDir, filename),
        {},
      )),
      _file: filename,
    })),
  );
}

export function applicationPath(filename: string): string {
  if (!/^[-a-z0-9_]+\.ya?ml$/i.test(filename)) {
    throw new Error("Invalid application filename");
  }
  return path.join(applicationsDir, filename);
}

export async function deleteApplication(filename: string): Promise<void> {
  await unlink(applicationPath(filename));
}