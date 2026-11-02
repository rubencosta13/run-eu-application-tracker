import type { ApplicationRecord, AppState } from "./types.js";

export async function api<T>(
  url: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || `Request failed (${response.status})`);
  }
  return result as T;
}

export async function loadData(): Promise<Pick<AppState, "apps" | "participation" | "library" | "common">> {
  const [apps, participation, library, common] = await Promise.all([
    api<ApplicationRecord[]>("/api/applications"),
    api<AppState["participation"]>("/api/participation-history"),
    api<AppState["library"]>("/api/answer-library"),
    api<AppState["common"]>("/api/common-questions"),
  ]);
  return { apps, participation, library, common };
}