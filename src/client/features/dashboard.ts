import { state, type ApplicationRecord } from "../types.js";
import { $, badge, escapeHtml, formatDate, statusName } from "../ui.js";

export function appParts(item: ApplicationRecord) {
  return {
    programme: item.programme || {},
    application: item.application || {},
    questions: item.questions || [],
  };
}

function stat(label: string, value: number, description: string, icon: string): string {
  return `<div class="card p-5"><div class="mb-3 flex items-center justify-between"><span class="text-xs font-medium text-slate-400">${escapeHtml(label)}</span><span class="text-lg text-blue-300">${icon}</span></div><div class="text-3xl font-semibold tracking-tight">${value}</div><div class="mt-1 text-xs text-slate-500">${escapeHtml(description)}</div></div>`;
}

function renderStats(): void {
  const submittedStatuses = [
    "submitted",
    "awaiting_decision",
    "accepted",
    "waitlisted",
    "rejected",
  ];
  const submitted = state.apps.filter((item) =>
    submittedStatuses.includes(item.application?.status),
  ).length;
  const questionCount = state.apps.reduce(
    (count, item) => count + (item.questions || []).length,
    0,
  );

  $("#nav-app-count").textContent = String(state.apps.length || "");
  $("#stats").innerHTML = [
    stat("OPPORTUNITIES", state.apps.length, "Tracked applications", "▤"),
    stat("SUBMITTED", submitted, "Applications sent", "↗"),
    stat(
      "PARTICIPATED",
      state.participation.entries.length,
      "Previous experiences",
      "✦",
    ),
    stat("QUESTIONS", questionCount, "Programme-specific prompts", "☷"),
  ].join("");
}

function renderOverview(): void {
  $("#overview-list").innerHTML = state.apps.length
    ? state.apps
        .map((item) => {
          const { programme, application } = appParts(item);
          const place = [programme.location, programme.country]
            .filter(Boolean)
            .join(", ");
          return `<button data-open-app="${escapeHtml(item._file)}" class="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-left hover:border-slate-600"><div class="min-w-0"><div class="truncate text-sm font-semibold">${escapeHtml(programme.name)}</div><div class="mt-1 text-xs text-slate-500">${escapeHtml(place)} · ${programme.ects ?? "—"} ECTS</div></div>${badge(application.status)}</button>`;
        })
        .join("")
    : '<p class="text-sm text-slate-500">No applications yet. Add your first opportunity.</p>';

  const participation = state.participation.entries;
  $("#overview-participation").innerHTML = participation.length
    ? participation
        .map((entry) => {
          const place = [entry.location, entry.country, entry.participation_period]
            .filter(Boolean)
            .join(" · ");
          return `<div class="rounded-xl border border-slate-800 bg-slate-900/60 p-3"><div class="font-semibold text-sm">${escapeHtml(entry.name)}</div><div class="mt-1 text-xs text-slate-500">${escapeHtml(place)}</div></div>`;
        })
        .join("")
    : '<p class="text-sm text-slate-500">No participation records yet.</p>';

  const deadlines = state.apps
    .map((item) => ({ programme: item.programme || {}, application: item.application || {} }))
    .filter(({ programme }) => programme.application_deadline)
    .sort((left, right) =>
      (left.programme.application_deadline || "").localeCompare(
        right.programme.application_deadline || "",
      ),
    );
  $("#deadlines").innerHTML = deadlines.length
    ? deadlines
        .map(({ programme, application }) =>
          `<div class="flex items-center justify-between gap-3 py-3"><div><div class="text-sm font-medium">${escapeHtml(programme.name)}</div><div class="text-xs text-slate-500">${escapeHtml(programme.id)}</div></div><div class="text-right"><div class="text-sm font-semibold">${formatDate(programme.application_deadline)}</div><div class="mt-1">${badge(application.status)}</div></div></div>`,
        )
        .join("")
    : '<p class="text-sm text-slate-500">No deadlines recorded.</p>';
}

function renderApplicationCard(item: ApplicationRecord): string {
  const { programme, application, questions } = appParts(item);
  const needsVerify = programme.verification?.status === "verify_before_submission";
  const place = [programme.location, programme.country]
    .filter(Boolean)
    .join(", ");
  return `<article class="card p-5"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><div class="font-mono text-[10px] tracking-wide text-slate-500">${escapeHtml(programme.id)}</div><h3 class="mt-2 text-lg font-semibold">${escapeHtml(programme.name)}</h3><p class="mt-1 text-xs text-slate-400">${escapeHtml(place)}</p></div>${badge(application.status)}</div><div class="my-4 grid grid-cols-3 gap-2 border-y border-slate-800 py-3"><div><div class="text-[10px] text-slate-500">ECTS</div><div class="mt-1 text-sm font-semibold">${programme.ects ?? "—"}</div></div><div><div class="text-[10px] text-slate-500">DEADLINE</div><div class="mt-1 text-sm font-semibold">${formatDate(programme.application_deadline)}</div></div><div><div class="text-[10px] text-slate-500">QUESTIONS</div><div class="mt-1 text-sm font-semibold">${questions.length}</div></div></div><div class="flex items-center justify-between gap-3"><span class="text-xs ${needsVerify ? "text-amber-300" : "text-slate-500"}">${needsVerify ? "⚑ Verify programme details" : `Outcome: ${statusName(application.outcome)}`}</span><button class="text-xs font-semibold text-blue-300 hover:text-blue-200" data-open-app="${escapeHtml(item._file)}">Manage application →</button></div></article>`;
}

export function renderApplications(): void {
  const query = $<HTMLInputElement>("#search").value.toLowerCase();
  const status = $<HTMLSelectElement>("#status-filter").value || "all";
  const items = state.apps.filter((item) => {
    const { programme, application } = appParts(item);
    const matchesQuery =
      !query ||
      [programme.name, programme.id, programme.country, programme.location]
        .join(" ")
        .toLowerCase()
        .includes(query);
    return matchesQuery && (status === "all" || application.status === status);
  });
  $("#application-grid").innerHTML = items.length
    ? items.map(renderApplicationCard).join("")
    : '<div class="card col-span-full p-10 text-center text-sm text-slate-500">No matching applications. Add a new opportunity to get started.</div>';
}

function renderParticipation(): void {
  const entries = state.participation.entries;
  $("#participation-list").innerHTML = entries.length
    ? entries
        .map((entry, index) => {
          const details = [
            entry.programme_type,
            entry.location,
            entry.country,
            entry.participation_period,
          ]
            .filter(Boolean)
            .join(" · ");
          const ects = entry.ects_awarded === true
            ? " · awarded"
            : entry.ects_awarded === false
              ? " · not awarded"
              : "";
          return `<article class="card flex flex-wrap items-center justify-between gap-4 p-5"><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><h3 class="font-semibold">${escapeHtml(entry.name)}</h3>${badge(entry.participation_status || "participated")}</div><p class="mt-1 text-xs text-slate-400">${escapeHtml(details)}</p><p class="mt-2 text-xs text-slate-500">${entry.ects ?? "—"} ECTS${ects}</p></div><div class="flex gap-2"><button class="btn btn-secondary" data-edit-part="${index}">Edit</button><button class="btn btn-danger" data-delete-part="${index}">Delete</button></div></article>`;
        })
        .join("")
    : '<div class="card p-10 text-center text-sm text-slate-500">No participation records yet.</div>';
}

function renderLibrary(): void {
  const entries = state.library.entries;
  $("#library-list").innerHTML = entries.length
    ? entries
        .map((entry, index) => {
          const tags = (entry.tags || [])
            .map((tag: string) => `<span class="mr-1 inline-block rounded-full border border-slate-700 px-2 py-1 text-[10px] text-slate-400">${escapeHtml(tag)}</span>`)
            .join("");
          return `<article class="card p-5"><div class="flex items-start justify-between gap-3"><div><div class="text-[10px] font-mono text-slate-500">${escapeHtml(entry.topic || "GENERAL")}</div><h3 class="mt-1 font-semibold">${escapeHtml(entry.title || "Untitled entry")}</h3></div><div class="flex gap-2"><button class="text-xs text-blue-300" data-edit-lib="${index}">Edit</button><button class="text-xs text-rose-300" data-delete-lib="${index}">Delete</button></div></div><p class="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">${escapeHtml(entry.content || "")}</p><div class="mt-3">${tags}</div></article>`;
        })
        .join("")
    : '<div class="card p-10 text-center text-sm text-slate-500">Your reusable answer library is empty. Add reusable background material here.</div>';
}

export function renderDashboard(): void {
  renderStats();
  renderOverview();
  renderApplications();
  renderParticipation();
  renderLibrary();
}