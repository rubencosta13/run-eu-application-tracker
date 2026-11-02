const $ = (s) => document.querySelector(s);
const state = {
  apps: [],
  participation: { entries: [] },
  library: { entries: [] },
  common: { questions: [] },
  view: "overview",
  activeFile: null,
};
const esc = (v = "") =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (v) => {
  if (!v) return "Not set";
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(+d)
    ? v
    : new Intl.DateTimeFormat(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(d);
};
const slug = (v) =>
  String(v || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");
const statusName = (s = "preparing") =>
  ({
    preparing: "Preparing",
    draft: "Draft",
    submitted: "Submitted",
    awaiting_decision: "Awaiting decision",
    accepted: "Accepted",
    waitlisted: "Waitlisted",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
    not_selected: "Not selected",
    pending: "Pending",
    participated: "Participated",
    completed: "Completed",
  })[s] || s;
const badge = (s = "preparing") => {
  const c = ["accepted", "completed", "participated"].includes(s)
    ? "green"
    : ["submitted", "awaiting_decision"].includes(s)
      ? "blue"
      : ["rejected", "withdrawn"].includes(s)
        ? "red"
        : ["preparing", "draft", "waitlisted"].includes(s)
          ? "amber"
          : "slate";
  return `<span class="badge badge-${c}">${esc(statusName(s))}</span>`;
};

async function api(url, method = "GET", data) {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
    cache: "no-store",
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(result.error || `Request failed (${res.status})`);
  return result;
}
async function load() {
  const [apps, participation, library, common] = await Promise.all([
    api("/api/applications"),
    api("/api/participation-history"),
    api("/api/answer-library"),
    api("/api/common-questions"),
  ]);
  state.apps = apps;
  state.participation = participation;
  state.library = library;
  state.common = common;
  render();
}
function notify(message) {
  const t = $("#toast");
  t.textContent = message;
  t.classList.remove("opacity-0", "translate-y-4");
  setTimeout(() => t.classList.add("opacity-0", "translate-y-4"), 2400);
}
function appParts(item) {
  return {
    p: item.programme || {},
    a: item.application || {},
    q: item.questions || [],
  };
}
function saveDownload(filename, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
function stat(label, value, sub, icon) {
  return `<div class="card p-5"><div class="mb-3 flex items-center justify-between"><span class="text-xs font-medium text-slate-400">${label}</span><span class="text-lg text-blue-300">${icon}</span></div><div class="text-3xl font-semibold tracking-tight">${value}</div><div class="mt-1 text-xs text-slate-500">${sub}</div></div>`;
}
function render() {
  $("#nav-app-count").textContent = state.apps.length || "";
  const submitted = state.apps.filter((x) =>
    [
      "submitted",
      "awaiting_decision",
      "accepted",
      "waitlisted",
      "rejected",
    ].includes(x.application?.status),
  ).length;
  const accepted = state.apps.filter(
    (x) => x.application?.outcome === "accepted",
  ).length;
  const questionCount = state.apps.reduce(
    (n, x) => n + (x.questions || []).length,
    0,
  );
  $("#stats").innerHTML = [
    stat("OPPORTUNITIES", state.apps.length, "Tracked applications", "▤"),
    stat("SUBMITTED", submitted, "Applications sent", "↗"),
    stat(
      "PARTICIPATED",
      state.participation.entries?.length || 0,
      "Previous experiences",
      "✦",
    ),
    stat("QUESTIONS", questionCount, "Programme-specific prompts", "☷"),
  ].join("");
  renderOverview();
  renderApps();
  renderParticipation();
  renderLibrary();
}
function renderOverview() {
  $("#overview-list").innerHTML = state.apps.length
    ? state.apps
        .map((item) => {
          const { p, a } = appParts(item);
          return `<button data-open-app="${esc(item._file)}" class="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-left hover:border-slate-600"><div class="min-w-0"><div class="truncate text-sm font-semibold">${esc(p.name)}</div><div class="mt-1 text-xs text-slate-500">${esc([p.location, p.country].filter(Boolean).join(", "))} · ${p.ects ?? "—"} ECTS</div></div>${badge(a.status)}</button>`;
        })
        .join("")
    : '<p class="text-sm text-slate-500">No applications yet. Add your first opportunity.</p>';
  $("#overview-participation").innerHTML = (state.participation.entries || [])
    .length
    ? state.participation.entries
        .map(
          (e) =>
            `<div class="rounded-xl border border-slate-800 bg-slate-900/60 p-3"><div class="font-semibold text-sm">${esc(e.name)}</div><div class="mt-1 text-xs text-slate-500">${esc([e.location, e.country, e.participation_period].filter(Boolean).join(" · "))}</div></div>`,
        )
        .join("")
    : '<p class="text-sm text-slate-500">No participation records yet.</p>';
  const deadlines = state.apps
    .map((x) => ({ p: x.programme || {}, a: x.application || {} }))
    .filter((x) => x.p.application_deadline)
    .sort((a, b) =>
      a.p.application_deadline.localeCompare(b.p.application_deadline),
    );
  $("#deadlines").innerHTML = deadlines.length
    ? deadlines
        .map(
          ({ p, a }) =>
            `<div class="flex items-center justify-between gap-3 py-3"><div><div class="text-sm font-medium">${esc(p.name)}</div><div class="text-xs text-slate-500">${esc(p.id)}</div></div><div class="text-right"><div class="text-sm font-semibold">${fmtDate(p.application_deadline)}</div><div class="mt-1">${badge(a.status)}</div></div></div>`,
        )
        .join("")
    : '<p class="text-sm text-slate-500">No deadlines recorded.</p>';
}
function appCard(item) {
  const { p, a, q } = appParts(item);
  const needsVerify = p.verification?.status === "verify_before_submission";
  return `<article class="card p-5"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><div class="font-mono text-[10px] tracking-wide text-slate-500">${esc(p.id)}</div><h3 class="mt-2 text-lg font-semibold">${esc(p.name)}</h3><p class="mt-1 text-xs text-slate-400">${esc([p.location, p.country].filter(Boolean).join(", "))}</p></div>${badge(a.status)}</div><div class="my-4 grid grid-cols-3 gap-2 border-y border-slate-800 py-3"><div><div class="text-[10px] text-slate-500">ECTS</div><div class="mt-1 text-sm font-semibold">${p.ects ?? "—"}</div></div><div><div class="text-[10px] text-slate-500">DEADLINE</div><div class="mt-1 text-sm font-semibold">${fmtDate(p.application_deadline)}</div></div><div><div class="text-[10px] text-slate-500">QUESTIONS</div><div class="mt-1 text-sm font-semibold">${q.length}</div></div></div><div class="flex items-center justify-between gap-3"><span class="text-xs ${needsVerify ? "text-amber-300" : "text-slate-500"}">${needsVerify ? "⚑ Verify programme details" : `Outcome: ${statusName(a.outcome)}`}</span><button class="text-xs font-semibold text-blue-300 hover:text-blue-200" data-open-app="${esc(item._file)}">Manage application →</button></div></article>`;
}
function renderApps() {
  const q = ($("#search")?.value || "").toLowerCase();
  const status = $("#status-filter")?.value || "all";
  const items = state.apps.filter((x) => {
    const { p, a } = appParts(x);
    return (
      (!q ||
        [p.name, p.id, p.country, p.location]
          .join(" ")
          .toLowerCase()
          .includes(q)) &&
      (status === "all" || a.status === status)
    );
  });
  $("#application-grid").innerHTML = items.length
    ? items.map(appCard).join("")
    : '<div class="card col-span-full p-10 text-center text-sm text-slate-500">No matching applications. Add a new opportunity to get started.</div>';
}
function renderParticipation() {
  const entries = state.participation.entries || [];
  $("#participation-list").innerHTML = entries.length
    ? entries
        .map(
          (e, i) =>
            `<article class="card flex flex-wrap items-center justify-between gap-4 p-5"><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><h3 class="font-semibold">${esc(e.name)}</h3>${badge(e.participation_status || "participated")}</div><p class="mt-1 text-xs text-slate-400">${esc([e.programme_type, e.location, e.country, e.participation_period].filter(Boolean).join(" · "))}</p><p class="mt-2 text-xs text-slate-500">${e.ects ?? "—"} ECTS${e.ects_awarded === true ? " · awarded" : e.ects_awarded === false ? " · not awarded" : ""}</p></div><div class="flex gap-2"><button class="btn btn-secondary" data-edit-part="${i}">Edit</button><button class="btn btn-danger" data-delete-part="${i}">Delete</button></div></article>`,
        )
        .join("")
    : '<div class="card p-10 text-center text-sm text-slate-500">No participation records yet.</div>';
}
function renderLibrary() {
  const entries = state.library.entries || [];
  $("#library-list").innerHTML = entries.length
    ? entries
        .map(
          (e, i) =>
            `<article class="card p-5"><div class="flex items-start justify-between gap-3"><div><div class="text-[10px] font-mono text-slate-500">${esc(e.topic || "GENERAL")}</div><h3 class="mt-1 font-semibold">${esc(e.title || "Untitled entry")}</h3></div><div class="flex gap-2"><button class="text-xs text-blue-300" data-edit-lib="${i}">Edit</button><button class="text-xs text-rose-300" data-delete-lib="${i}">Delete</button></div></div><p class="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">${esc(e.content || "")}</p><div class="mt-3">${(e.tags || []).map((t) => `<span class="mr-1 inline-block rounded-full border border-slate-700 px-2 py-1 text-[10px] text-slate-400">${esc(t)}</span>`).join("")}</div></article>`,
        )
        .join("")
    : '<div class="card p-10 text-center text-sm text-slate-500">Your reusable answer library is empty. Add reusable background material here.</div>';
}

function switchView(view) {
  state.view = view;
  document
    .querySelectorAll(".view")
    .forEach((el) => el.classList.add("hidden"));
  $(`#view-${view}`).classList.remove("hidden");
  document
    .querySelectorAll(".nav-item")
    .forEach((el) => el.classList.toggle("active", el.dataset.view === view));
  $("#page-title").textContent = {
    overview: "Overview",
    applications: "Applications",
    "application-detail": "Application workspace",
    participation: "Participation history",
    library: "Answer library",
  }[view];
  $("#primary-action").classList.toggle("hidden", view !== "applications");
  $("#primary-action").textContent =
    view === "applications" ? "＋ Add opportunity" : "＋ Add opportunity";
}
function showModal(title, kicker, body, action, submitText = "Save changes") {
  $("#modal-title").textContent = title;
  $("#modal-kicker").textContent = kicker;
  $("#modal-body").innerHTML = body;
  $("#modal-form").dataset.action = action;
  $("#modal-form").querySelector("[type=submit]").textContent = submitText;
  $("#modal").showModal();
}
function closeModal() {
  $("#modal").close();
  $("#modal-form").dataset.action = "";
}
const input = (name, label, value = "", type = "text", placeholder = "") =>
  `<label><span class="label">${label}</span><input class="field" name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}"></label>`;
const textarea = (name, label, value = "", placeholder = "") =>
  `<label><span class="label">${label}</span><textarea class="field min-h-28 resize-y" name="${name}" placeholder="${esc(placeholder)}">${esc(value)}</textarea></label>`;
const select = (name, label, value, options) =>
  `<label><span class="label">${label}</span><select class="field" name="${name}">${options.map(([v, l]) => `<option value="${esc(v)}" ${v === value ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;
function openAppForm(item = null) {
  const p = item?.programme || {},
    a = item?.application || {};
  showModal(
    item ? "Edit opportunity" : "Add opportunity",
    "PROGRAMME DETAILS",
    `<div class="grid gap-4 sm:grid-cols-2">${input("id", "Programme ID", p.id || "")}${input("name", "Programme name", p.name || "")}${input("type", "Programme type", p.type || "BIP")}${input("country", "Country", p.country || "")}${input("location", "City / location", p.location || "")}${input("ects", "ECTS", p.ects ?? "", "number")}${input("deadline", "Application deadline", p.application_deadline || "", "date")}${input("url", "Programme URL", p.url || "", "url")}${input("start", "In-person start", p.in_person?.start || "", "date")}${input("end", "In-person end", p.in_person?.end || "", "date")}</div>${textarea("notes", "Notes / eligibility", p.verification?.notes || "")}`,
    item ? `edit-app:${item._file}` : "create-app",
  );
}
function openAppDetail(item) {
  state.activeFile = item._file;
  const { p, a, q } = appParts(item);
  const questions = q
    .map((question, i) => {
      const revisions = question.answer_history || [];
      const submitted = revisions.filter((r) => r.submitted).length;

      return `<article class="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="text-[10px] font-mono text-slate-500">
            ${esc(question.id)} · ${esc(question.type || "text")} · ${question.required ? "Required" : "Optional"}
          </div>
          <h4 class="mt-2 text-sm font-semibold leading-6">${esc(question.wording)}</h4>
        </div>

        <div class="flex gap-2">
          <button type="button" class="btn btn-secondary" data-edit-question="${i}">Edit question</button>
          <button type="button" class="btn btn-secondary" data-add-revision="${i}">＋ Add answer</button>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
        <span>${revisions.length} revision${revisions.length === 1 ? "" : "s"}</span>
        <span>${submitted} submitted version${submitted === 1 ? "" : "s"}</span>
      </div>

      <div class="mt-4 space-y-3">
        ${
          revisions
            .map(
              (r, revisionIndex) => `
          <div class="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap gap-2 text-[10px] text-slate-500">
                <span>Revision ${r.revision} · ${fmtDate(r.created_at)}</span>
                <span class="${r.submitted ? "text-emerald-300" : "text-amber-300"}">
                  ${r.submitted ? "✓ SUBMITTED" : "DRAFT"}
                </span>
              </div>

              <button
                type="button"
                class="text-xs font-semibold text-blue-300 hover:text-blue-200"
                data-edit-revision="${i}:${revisionIndex}"
              >
                Edit answer
              </button>
            </div>

            <p class="whitespace-pre-wrap text-sm leading-6 text-slate-300">${esc(r.answer)}</p>

            ${
              r.notes
                ? `
              <p class="mt-3 border-t border-slate-800 pt-2 text-xs text-slate-500">
                ${esc(r.notes)}
              </p>
            `
                : ""
            }
          </div>
        `,
            )
            .join("") ||
          `
          <p class="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-500">
            No answer yet. Add your first draft or submitted version.
          </p>
        `
        }
      </div>
    </article>`;
    })
    .join("");

  $("#application-detail-content").innerHTML = `
    <div class="card p-6 sm:p-8">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0"><div class="font-mono text-xs tracking-wide text-slate-500">${esc(p.id)} · ${esc(p.type || "Programme")}</div><h2 class="mt-2 text-2xl font-semibold tracking-tight">${esc(p.name)}</h2><p class="mt-2 text-sm text-slate-400">${esc([p.location, p.country].filter(Boolean).join(", "))}</p></div>
        <div class="flex flex-wrap items-center gap-2">${badge(a.status)}<button type="button" class="btn btn-secondary" id="edit-programme">Edit programme details</button></div>
      </div>
      <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl bg-slate-950/70 p-4"><div class="text-[10px] tracking-wide text-slate-500">ECTS</div><div class="mt-1 text-lg font-semibold">${p.ects ?? "—"}</div></div>
        <div class="rounded-xl bg-slate-950/70 p-4"><div class="text-[10px] tracking-wide text-slate-500">APPLICATION DEADLINE</div><div class="mt-1 text-sm font-semibold">${fmtDate(p.application_deadline)}</div></div>
        <div class="rounded-xl bg-slate-950/70 p-4"><div class="text-[10px] tracking-wide text-slate-500">IN-PERSON PERIOD</div><div class="mt-1 text-sm font-semibold">${p.in_person?.start ? fmtDate(p.in_person.start) : "Not set"}${p.in_person?.end ? ` – ${fmtDate(p.in_person.end)}` : ""}</div></div>
        <div class="rounded-xl bg-slate-950/70 p-4"><div class="text-[10px] tracking-wide text-slate-500">QUESTIONS</div><div class="mt-1 text-lg font-semibold">${q.length}</div></div>
      </div>
      ${p.verification?.status === "verify_before_submission" ? '<p class="mt-5 rounded-lg border border-amber-900/70 bg-amber-950/30 p-3 text-xs leading-5 text-amber-200">⚑ Programme details are marked for verification. Confirm dates, eligibility, ECTS and funding before submitting.</p>' : ""}
      <div class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4"><a class="text-sm text-blue-300 hover:text-blue-200" href="${esc(p.url || "#")}" target="_blank" rel="noreferrer">Open programme page ↗</a><span class="text-[10px] text-slate-600">YAML: data/applications/${esc(item._file)}</span></div>
    </div>

    <form id="app-detail-form" data-file="${esc(item._file)}" class="card space-y-5 p-6">
      <div class="flex flex-wrap items-center justify-between gap-3"><div><h3 class="text-lg font-semibold">Application tracking</h3><p class="mt-1 text-xs text-slate-500">Keep your application status, submission details and correspondence up to date.</p></div><button class="btn btn-primary" type="submit">Save application</button></div>
      <div class="grid gap-4 sm:grid-cols-2">${select(
        "status",
        "Application status",
        a.status || "preparing",
        [
          ["researching", "Researching"],
          ["preparing", "Preparing"],
          ["draft", "Draft"],
          ["submitted", "Submitted"],
          ["awaiting_decision", "Awaiting decision"],
          ["accepted", "Accepted"],
          ["waitlisted", "Waitlisted"],
          ["rejected", "Rejected"],
          ["withdrawn", "Withdrawn"],
        ],
      )}${select("outcome", "Outcome", a.outcome || "pending", [
        ["pending", "Pending"],
        ["accepted", "Accepted"],
        ["waitlisted", "Waitlisted"],
        ["rejected", "Rejected"],
        ["withdrawn", "Withdrawn"],
        ["not_selected", "Not selected"],
      ])}${input("submitted_at", "Submitted date", a.submitted_at || "", "date")}${input("outcome_received_at", "Outcome received date", a.outcome_received_at || "", "date")}${input("reference", "Application reference", a.application_reference || "")}${input("contact", "Contact person", a.contact_person || "")}</div>
      <div class="grid gap-4 lg:grid-cols-2">${textarea("feedback", "Outcome feedback", a.outcome_feedback || "")}${textarea("appnotes", "Application notes", a.notes || "")}</div>
      <div class="flex justify-end border-t border-slate-800 pt-4"><button class="btn btn-primary" type="submit">Save application</button></div>
    </form>

    <section class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3"><div><h3 class="text-lg font-semibold">Application questions</h3><p class="mt-1 text-sm text-slate-500">Keep each prompt and every answer revision together. Previous drafts are preserved.</p></div><button type="button" class="btn btn-primary" id="add-question">＋ Add question</button></div>
      <div class="space-y-4">${questions || '<div class="card p-8 text-center text-sm text-slate-500">No questions recorded yet. Add the exact wording from the application form.</div>'}</div>
    </section>
    <div class="flex justify-end border-t border-slate-800 pt-4"><button type="button" class="btn btn-danger" id="delete-programme">Delete application</button></div>`;

  switchView("application-detail");
  $("#edit-programme").addEventListener("click", () => openAppForm(item));
  $("#delete-programme").addEventListener("click", async () => {
    if (
      confirm(
        `Delete ${p.name} and its application history? This cannot be undone.`,
      )
    ) {
      await api(
        `/api/applications/${encodeURIComponent(item._file)}`,
        "DELETE",
      );
      state.activeFile = null;
      await load();
      switchView("applications");
      notify("Application deleted.");
    }
  });
  $("#add-question").addEventListener("click", () =>
    openQuestionForm(item, null),
  );
  $("#application-detail-content")
    .querySelectorAll("[data-edit-question]")
    .forEach((btn) =>
      btn.addEventListener("click", () =>
        openQuestionForm(item, Number(btn.dataset.editQuestion)),
      ),
    );
  $("#application-detail-content")
    .querySelectorAll("[data-add-revision]")
    .forEach((btn) =>
      btn.addEventListener("click", () =>
        openRevisionForm(item, Number(btn.dataset.addRevision)),
      ),
    );
}

function openQuestionForm(item, index) {
  closeModal();
  const existing = index === null ? null : item.questions[index];
  showModal(
    existing ? "Edit question" : "Add application question",
    "QUESTION DETAILS",
    `${input("qid", "Question ID", existing?.id || `Q-${String((item.questions?.length || 0) + 1).padStart(3, "0")}`)}${input("order", "Display order", existing?.order ?? (item.questions?.length || 0) + 1, "number")}${select(
      "type",
      "Question type",
      existing?.type || "long_text",
      [
        ["short_text", "Short text"],
        ["long_text", "Long text"],
        ["single_choice", "Single choice"],
        ["multi_choice", "Multiple choice"],
        ["boolean", "Yes / No"],
        ["date", "Date"],
        ["file", "File"],
        ["other", "Other"],
      ],
    )}${textarea("wording", "Exact question wording", existing?.wording || "")}${select(
      "required",
      "Required?",
      String(existing?.required ?? true),
      [
        ["true", "Required"],
        ["false", "Optional"],
      ],
    )}`,
    `question:${item._file}:${index === null ? "new" : index}`,
  );
}

function openRevisionForm(item, index, revisionIndex = null) {
  closeModal();

  const question = item.questions[index];

  const existing =
    revisionIndex === null ? null : question.answer_history?.[revisionIndex];

  const heading = existing
    ? `Edit revision ${existing.revision}`
    : "Add answer revision";

  const help = existing
    ? "Changes update this saved revision in place. Other revisions are left untouched."
    : "A new revision is appended. Previous drafts and submitted answers are preserved.";

  const body = `
    <p class="text-xs text-slate-400">${help}</p>

    ${textarea("answer", "Answer text", existing?.answer || "")}

    ${input(
      "created_at",
      "Revision date",
      existing?.created_at || today(),
      "date",
    )}

    ${textarea("revision_notes", "Notes (optional)", existing?.notes || "")}

    ${select(
      "submitted",
      "Is this the exact submitted answer?",
      String(existing?.submitted ?? false),
      [
        ["false", "No — draft / revision"],
        ["true", "Yes — submitted exactly as written"],
      ],
    )}

    ${input(
      "submitted_at",
      "Submission date",
      existing?.submitted_at || "",
      "date",
    )}
  `;

  const action = existing
    ? `revision-edit:${item._file}:${index}:${revisionIndex}`
    : `revision:${item._file}:${index}`;

  showModal(
    heading,
    question.wording,
    body,
    action,
    existing ? "Save answer" : "Add revision",
  );
}

function openParticipationForm(index = null) {
  const e = index === null ? {} : state.participation.entries[index];
  showModal(
    e.name ? "Edit participation" : "Add participation",
    "PARTICIPATION HISTORY",
    `<div class="grid gap-4 sm:grid-cols-2">${input("name", "Programme name", e.name || "")}${input("programme_id", "Programme ID", e.programme_id || "")}${input("programme_type", "Programme type", e.programme_type || "BIP")}${input("country", "Country", e.country || "")}${input("location", "City", e.location || "")}${input("period", "Participation period", e.participation_period || "", "text", "e.g. 2025-11")}${input("ects", "ECTS", e.ects ?? "", "number")}${input("url", "Programme URL", e.programme_url || "", "url")}</div>${select(
      "participation_status",
      "Participation status",
      e.participation_status || "participated",
      [
        ["participated", "Participated"],
        ["completed", "Completed"],
      ],
    )}${select(
      "ects_awarded",
      "ECTS awarded?",
      e.ects_awarded === true
        ? "true"
        : e.ects_awarded === false
          ? "false"
          : "unknown",
      [
        ["unknown", "Unknown / not confirmed"],
        ["true", "Yes"],
        ["false", "No"],
      ],
    )}${textarea("description", "Description", e.description || "")}${textarea("learning", "Skills and learning", Array.isArray(e.skills_and_learning) ? e.skills_and_learning.join("\n") : "")}${textarea("notes", "Notes", e.notes || "")}`,
    `participation:${index === null ? "new" : index}`,
  );
}
function openLibraryForm(index = null) {
  const e = index === null ? {} : state.library.entries[index];
  showModal(
    e.title ? "Edit library entry" : "Add reusable answer",
    "ANSWER LIBRARY",
    `${input("title", "Title", e.title || "")}${input("topic", "Topic", e.topic || "")}${input("source", "Source context", e.source_context || "")}${textarea("content", "Reusable source material", e.content || "")}${input("tags", "Tags (comma separated)", (e.tags || []).join(", "))}${textarea("notes", "Notes", e.notes || "")}`,
    `library:${index === null ? "new" : index}`,
  );
}

$("#application-detail-content").addEventListener("submit", async (ev) => {
  if (ev.target.id !== "app-detail-form") return;
  ev.preventDefault();
  const form = new FormData(ev.target);
  const v = Object.fromEntries(form.entries());
  const file = ev.target.dataset.file;
  const item = state.apps.find((x) => x._file === file);
  if (!item) return;
  item.application = {
    ...item.application,
    status: v.status,
    outcome: v.outcome,
    submitted_at: v.submitted_at || null,
    outcome_received_at: v.outcome_received_at || null,
    application_reference: v.reference || "",
    contact_person: v.contact || "",
    outcome_feedback: v.feedback || "",
    notes: v.appnotes || "",
  };
  try {
    await api(`/api/applications/${encodeURIComponent(file)}`, "PUT", item);
    await load();
    const refreshed = state.apps.find((x) => x._file === file);
    if (refreshed) openAppDetail(refreshed);
    notify("Application saved to YAML.");
  } catch (error) {
    notify(error.message);
  }
});

$("#modal-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const form = new FormData(ev.currentTarget);
  const v = Object.fromEntries(form.entries());
  const action = ev.currentTarget.dataset.action;
  try {
    if (action === "create-app" || action.startsWith("edit-app:")) {
      const old = action.startsWith("edit-app:")
        ? state.apps.find((x) => x._file === action.split(":")[1])
        : null;
      const data = old
        ? structuredClone(old)
        : {
            programme: {},
            application: {
              id: `APP-${new Date().getFullYear()}-${String(state.apps.length + 1).padStart(3, "0")}`,
              status: "preparing",
              outcome: "pending",
            },
            questions: [],
            shared_question_refs: ["participation-history"],
          };
      data.programme = {
        ...data.programme,
        id: v.id,
        name: v.name,
        type: v.type,
        country: v.country,
        location: v.location,
        ects: v.ects === "" ? null : Number(v.ects),
        application_deadline: v.deadline || null,
        url: v.url || "",
        in_person: { start: v.start || null, end: v.end || null },
        verification: {
          status: "verify_before_submission",
          last_checked: null,
          notes: v.notes || "",
        },
        tags: data.programme.tags || [],
      };
      if (old) {
        await api(
          `/api/applications/${encodeURIComponent(old._file)}`,
          "PUT",
          data,
        );
      } else {
        await api("/api/applications", "POST", data);
      }
    } else if (action.startsWith("save-app:")) {
      const file = action.slice(9);
      const item = state.apps.find((x) => x._file === file);
      item.application = {
        ...item.application,
        status: v.status,
        outcome: v.outcome,
        submitted_at: v.submitted_at || null,
        outcome_received_at: v.outcome_received_at || null,
        application_reference: v.reference || "",
        contact_person: v.contact || "",
        outcome_feedback: v.feedback || "",
        notes: v.appnotes || "",
      };
      await api(`/api/applications/${encodeURIComponent(file)}`, "PUT", item);
    } else if (action.startsWith("question:")) {
      const [, file, indexText] = action.split(":");
      const item = state.apps.find((x) => x._file === file);
      const idx = indexText === "new" ? -1 : Number(indexText);
      const q = {
        id: v.qid,
        order: Number(v.order),
        wording: v.wording,
        type: v.type,
        required: v.required === "true",
        options: idx >= 0 ? item.questions[idx].options || [] : [],
        answer_history:
          idx >= 0 ? item.questions[idx].answer_history || [] : [],
        current_revision:
          idx >= 0 ? item.questions[idx].current_revision || 0 : 0,
      };
      if (idx < 0) item.questions.push(q);
      else item.questions[idx] = q;
      item.questions.sort((a, b) => (a.order || 0) - (b.order || 0));
      await api(`/api/applications/${encodeURIComponent(file)}`, "PUT", item);
    } else if (action.startsWith("revision-edit:")) {
      const [, file, indexText, revisionIndexText] = action.split(":");

      const item = state.apps.find((x) => x._file === file);
      const question = item.questions[Number(indexText)];
      const revisionIndex = Number(revisionIndexText);

      const existing = question.answer_history[revisionIndex];

      const updated = {
        ...existing,
        created_at: v.created_at || existing.created_at || today(),
        answer: v.answer,
        submitted: v.submitted === "true",
        notes: v.revision_notes || "",
      };

      if (updated.submitted) {
        updated.submitted_at =
          v.submitted_at || existing.submitted_at || today();
      } else {
        delete updated.submitted_at;
      }

      question.answer_history[revisionIndex] = updated;

      await api(`/api/applications/${encodeURIComponent(file)}`, "PUT", item);
    } else if (action.startsWith("revision:")) {
      const [, file, indexText] = action.split(":");
      const item = state.apps.find((x) => x._file === file);
      const q = item.questions[Number(indexText)];
      const revision =
        (q.answer_history || []).reduce(
          (m, r) => Math.max(m, Number(r.revision) || 0),
          0,
        ) + 1;
      const entry = {
        revision,
        created_at: v.created_at || today(),
        answer: v.answer,
        submitted: v.submitted === "true",
        notes: v.revision_notes || "",
      };
      if (entry.submitted) entry.submitted_at = v.submitted_at || today();
      q.answer_history = [...(q.answer_history || []), entry];
      q.current_revision = revision;
      await api(`/api/applications/${encodeURIComponent(file)}`, "PUT", item);
    } else if (action.startsWith("participation:")) {
      const idx =
        action.split(":")[1] === "new" ? -1 : Number(action.split(":")[1]);
      const entry = {
        participation_id:
          idx < 0
            ? `PART-${Date.now()}`
            : state.participation.entries[idx].participation_id,
        programme_id: v.programme_id,
        name: v.name,
        programme_type: v.programme_type,
        country: v.country,
        location: v.location,
        participation_period: v.period,
        ects: v.ects === "" ? null : Number(v.ects),
        ects_awarded:
          v.ects_awarded === "unknown" ? null : v.ects_awarded === "true",
        participation_status: v.participation_status,
        programme_url: v.url,
        description: v.description,
        skills_and_learning: v.learning
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        notes: v.notes,
      };
      if (idx < 0) state.participation.entries.push(entry);
      else state.participation.entries[idx] = entry;
      await api("/api/participation-history", "PUT", state.participation);
    } else if (action.startsWith("library:")) {
      const idx =
        action.split(":")[1] === "new" ? -1 : Number(action.split(":")[1]);
      const entry = {
        id: idx < 0 ? `LIB-${Date.now()}` : state.library.entries[idx].id,
        title: v.title,
        topic: v.topic,
        source_context: v.source,
        content: v.content,
        tags: v.tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        last_updated: today(),
        notes: v.notes,
      };
      if (idx < 0) state.library.entries.push(entry);
      else state.library.entries[idx] = entry;
      await api("/api/answer-library", "PUT", state.library);
    }
    closeModal();
    await load();
    if (
      action.startsWith("question:") ||
      action.startsWith("revision:") ||
      action.startsWith("revision-edit:") ||
      action.startsWith("edit-app:")
    ) {
      const file = action.split(":")[1];
      const refreshed = state.apps.find((x) => x._file === file);
      if (refreshed) openAppDetail(refreshed);
    } else if (action === "create-app") {
      switchView("applications");
    }
    notify("Changes saved to YAML.");
  } catch (error) {
    notify(error.message);
  }
});

$("#modal-close").addEventListener("click", closeModal);
$("#modal-cancel").addEventListener("click", closeModal);
$("#refresh").addEventListener("click", () =>
  load()
    .then(() => notify("Data refreshed."))
    .catch((e) => notify(e.message)),
);
$("#primary-action").addEventListener("click", () => openAppForm());
$("#add-participation").addEventListener("click", () =>
  openParticipationForm(),
);
$("#add-library").addEventListener("click", () => openLibraryForm());
$("#search").addEventListener("input", renderApps);
$("#status-filter").addEventListener("change", renderApps);
document
  .querySelectorAll(".nav-item")
  .forEach((b) =>
    b.addEventListener("click", () => switchView(b.dataset.view)),
  );
document.addEventListener("click", async (ev) => {
  const open = ev.target.closest("[data-open-app]");
  if (open) {
    const item = state.apps.find((x) => x._file === open.dataset.openApp);
    if (item) openAppDetail(item);
  }
  const go = ev.target.closest("[data-go]");
  if (go) switchView(go.dataset.go);
  const ep = ev.target.closest("[data-edit-part]");
  if (ep) openParticipationForm(Number(ep.dataset.editPart));
  const dp = ev.target.closest("[data-delete-part]");
  if (dp && confirm("Delete this participation record?")) {
    state.participation.entries.splice(Number(dp.dataset.deletePart), 1);
    await api("/api/participation-history", "PUT", state.participation);
    await load();
    notify("Participation deleted.");
  }
  const el = ev.target.closest("[data-edit-lib]");
  if (el) openLibraryForm(Number(el.dataset.editLib));
  const dl = ev.target.closest("[data-delete-lib]");
  if (dl && confirm("Delete this library entry?")) {
    state.library.entries.splice(Number(dl.dataset.deleteLib), 1);
    await api("/api/answer-library", "PUT", state.library);
    await load();
    notify("Library entry deleted.");
  }
});
$("#export-md").addEventListener("click", () => {
  const entries = state.participation.entries || [];
  const md = [
    "# Previous RUN-EU opportunities",
    "",
    ...entries
      .filter((e) =>
        ["participated", "completed"].includes(e.participation_status),
      )
      .map(
        (e) =>
          `## ${e.name}\n- Programme: ${e.programme_type || "—"}\n- Location: ${[e.location, e.country].filter(Boolean).join(", ") || "—"}\n- Period: ${e.participation_period || "—"}\n- ECTS: ${e.ects ?? "—"}${e.ects_awarded === true ? " (awarded)" : e.ects_awarded === false ? " (not awarded)" : ""}\n${e.description || ""}`,
      ),
  ].join("\n\n");
  saveDownload("run-eu-participation-history.md", md, "text/markdown");
});
$("#export-csv").addEventListener("click", () => {
  const entries = (state.participation.entries || []).filter((e) =>
    ["participated", "completed"].includes(e.participation_status),
  );
  const cols = [
    "name",
    "programme_type",
    "location",
    "country",
    "participation_period",
    "ects",
    "ects_awarded",
    "programme_id",
    "programme_url",
  ];
  const quote = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    cols.join(","),
    ...entries.map((e) => cols.map((c) => quote(e[c])).join(",")),
  ].join("\n");
  saveDownload("run-eu-participation-history.csv", csv, "text/csv");
});
$("#modal").addEventListener("click", (ev) => {
  if (ev.target === $("#modal")) closeModal();
});

switchView("overview");
load().catch((e) => notify(e.message));
