import {
  handleApplicationClick,
  handleCollectionClick,
  handleFeatureClick,
  load,
  saveApplicationForm,
  saveModalForm,
} from "./actions.js";
import { openApplicationForm, openLibraryForm, openParticipationForm } from "./features/forms.js";
import { renderApplications } from "./features/dashboard.js";
import { state } from "./types.js";
import { $, closeModal, notify, saveDownload, switchView } from "./ui.js";

function exportParticipationMarkdown(): void {
  const entries = state.participation.entries.filter((entry) =>
    entry.participation_status === "participated" ||
    entry.participation_status === "completed",
  );
  const markdown = [
    "# Previous RUN-EU opportunities",
    "",
    ...entries.map(
      (entry) =>
        `## ${entry.name}\n- Programme: ${entry.programme_type || "—"}\n- Location: ${[entry.location, entry.country].filter(Boolean).join(", ") || "—"}\n- Period: ${entry.participation_period || "—"}\n- ECTS: ${entry.ects ?? "—"}${entry.ects_awarded === true ? " (awarded)" : entry.ects_awarded === false ? " (not awarded)" : ""}\n${entry.description || ""}`,
    ),
  ].join("\n\n");
  saveDownload("run-eu-participation-history.md", markdown, "text/markdown");
}

function exportParticipationCsv(): void {
  const entries = state.participation.entries.filter((entry) =>
    entry.participation_status === "participated" ||
    entry.participation_status === "completed",
  );
  const columns = [
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
  const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [
    columns.join(","),
    ...entries.map((entry) => columns.map((column) => quote(entry[column])).join(",")),
  ].join("\n");
  saveDownload("run-eu-participation-history.csv", csv, "text/csv");
}

function handleDocumentClick(event: MouseEvent): void {
  if (!(event.target instanceof Element)) return;
  const target = event.target;

  if (handleFeatureClick(target)) return;
  if (handleApplicationClick(target)) return;
  if (handleCollectionClick(target)) return;

  const viewButton = target.closest<HTMLElement>("[data-view]");
  if (viewButton?.dataset.view) switchView(viewButton.dataset.view);
  const goButton = target.closest<HTMLElement>("[data-go]");
  if (goButton?.dataset.go) switchView(goButton.dataset.go);
}

function initializeEvents(): void {
  $("#application-detail-content").addEventListener("submit", (event) => {
    if ((event.target as HTMLElement).id === "app-detail-form") {
      void saveApplicationForm(event);
    }
  });
  $("#modal-form").addEventListener("submit", (event) => void saveModalForm(event));
  $("#modal-close").addEventListener("click", closeModal);
  $("#modal-cancel").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", (event) => {
    if (event.target === $("#modal")) closeModal();
  });
  $("#refresh").addEventListener("click", () => {
    void load()
      .then(() => notify("Data refreshed."))
      .catch((error: unknown) => notify(error instanceof Error ? error.message : "Unable to refresh data."));
  });
  $("#primary-action").addEventListener("click", () => openApplicationForm());
  $("#add-participation").addEventListener("click", () => openParticipationForm());
  $("#add-library").addEventListener("click", () => openLibraryForm());
  $("#search").addEventListener("input", renderApplications);
  $("#status-filter").addEventListener("change", renderApplications);
  $("#export-md").addEventListener("click", exportParticipationMarkdown);
  $("#export-csv").addEventListener("click", exportParticipationCsv);
  document.addEventListener("click", handleDocumentClick);
}

initializeEvents();
switchView("overview");
void load().catch((error: unknown) => {
  notify(error instanceof Error ? error.message : "Unable to load application data.");
});