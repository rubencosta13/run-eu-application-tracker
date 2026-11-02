const statusNames: Record<string, string> = {
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
};

export function $<T extends HTMLElement = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing page element: ${selector}`);
  return element;
}

export function escapeHtml(value: unknown = ""): string {
  const escaped: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return String(value ?? "").replace(/[&<>"']/g, (character) => escaped[character] || character);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(value?: string | null): string {
  if (!value) return "Not set";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(+date)
    ? value
    : new Intl.DateTimeFormat(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
}

export function statusName(status = "preparing"): string {
  return statusNames[status] || status;
}

export function badge(status = "preparing"): string {
  const color = ["accepted", "completed", "participated"].includes(status)
    ? "green"
    : ["submitted", "awaiting_decision"].includes(status)
      ? "blue"
      : ["rejected", "withdrawn"].includes(status)
        ? "red"
        : ["preparing", "draft", "waitlisted"].includes(status)
          ? "amber"
          : "slate";
  return `<span class="badge badge-${color}">${escapeHtml(statusName(status))}</span>`;
}

export function notify(message: string): void {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.remove("opacity-0", "translate-y-4");
  setTimeout(() => toast.classList.add("opacity-0", "translate-y-4"), 2400);
}

export function saveDownload(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

export function input(
  name: string,
  label: string,
  value: unknown = "",
  type = "text",
  placeholder = "",
): string {
  return `<label><span class="label">${escapeHtml(label)}</span><input class="field" name="${escapeHtml(name)}" type="${escapeHtml(type)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}"></label>`;
}

export function textarea(
  name: string,
  label: string,
  value: unknown = "",
  placeholder = "",
): string {
  return `<label><span class="label">${escapeHtml(label)}</span><textarea class="field min-h-28 resize-y" name="${escapeHtml(name)}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea></label>`;
}

export function select(
  name: string,
  label: string,
  value: string,
  options: [string, string][],
): string {
  const items = options
    .map(
      ([optionValue, optionLabel]) =>
        `<option value="${escapeHtml(optionValue)}" ${optionValue === value ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`,
    )
    .join("");
  return `<label><span class="label">${escapeHtml(label)}</span><select class="field" name="${escapeHtml(name)}">${items}</select></label>`;
}

export function showModal(
  title: string,
  kicker: string,
  body: string,
  action: string,
  submitText = "Save changes",
): void {
  $("#modal-title").textContent = title;
  $("#modal-kicker").textContent = kicker;
  $("#modal-body").innerHTML = body;
  $("#modal-form").dataset.action = action;
  $("#modal-form [type=submit]").textContent = submitText;
  $<HTMLDialogElement>("#modal").showModal();
}

export function closeModal(): void {
  $<HTMLDialogElement>("#modal").close();
  $("#modal-form").dataset.action = "";
}

export function switchView(view: string): void {
  document.querySelectorAll<HTMLElement>(".view").forEach((element) => {
    element.classList.toggle("hidden", element.id !== `view-${view}`);
  });
  document.querySelectorAll<HTMLElement>(".nav-item").forEach((element) => {
    element.classList.toggle("active", element.dataset.view === view);
  });
  $("#page-title").textContent =
    ({
      overview: "Overview",
      applications: "Applications",
      "application-detail": "Application workspace",
      participation: "Participation history",
      library: "Answer library",
    })[view] || "RUN-EU Tracker";
  $("#primary-action").classList.toggle("hidden", view !== "applications");
  $("#primary-action").textContent = "＋ Add opportunity";
}