import { api, loadData } from "./api.js";
import { state, type AnswerRevision, type ApplicationRecord } from "./types.js";
import { saveAnswerRevision } from "./revisions.js";
import { renderApplicationDetail } from "./features/application-detail.js";
import {
  openApplicationForm,
  openLibraryForm,
  openParticipationForm,
  openQuestionForm,
  openRevisionForm,
} from "./features/forms.js";
import { renderDashboard } from "./features/dashboard.js";
import { $, closeModal, notify, switchView, today } from "./ui.js";

type FormValues = Record<string, string>;

function formValues(form: HTMLFormElement): FormValues {
  return Object.fromEntries(new FormData(form).entries()) as FormValues;
}

function requireApplication(filename: string): ApplicationRecord {
  const item = state.apps.find((application) => application._file === filename);
  if (!item) throw new Error("Application not found. Refresh and try again.");
  item.questions ||= [];
  item.application ||= {};
  item.programme ||= {};
  return item;
}

function setApplicationDetails(item: ApplicationRecord, values: FormValues): void {
  item.application = {
    ...item.application,
    status: values.status,
    outcome: values.outcome,
    submitted_at: values.submitted_at || null,
    outcome_received_at: values.outcome_received_at || null,
    application_reference: values.reference || "",
    contact_person: values.contact || "",
    outcome_feedback: values.feedback || "",
    notes: values.appnotes || "",
  };
}

export async function load(): Promise<void> {
  Object.assign(state, await loadData());
  renderDashboard();
}

export function openApplicationDetail(item: ApplicationRecord): void {
  state.activeFile = item._file;
  renderApplicationDetail(item);
  switchView("application-detail");
}

export async function saveApplicationForm(event: Event): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const values = formValues(form);
  const filename = form.dataset.file || "";
  const item = requireApplication(filename);
  setApplicationDetails(item, values);

  try {
    await api(`/api/applications/${encodeURIComponent(filename)}`, "PUT", item);
    await load();
    const refreshed = state.apps.find((application) => application._file === filename);
    if (refreshed) openApplicationDetail(refreshed);
    notify("Application saved to YAML.");
  } catch (error) {
    notify(error instanceof Error ? error.message : "Unable to save application.");
  }
}

function newApplication(): ApplicationRecord {
  const sequence = String(state.apps.length + 1).padStart(3, "0");
  return {
    _file: "",
    programme: {},
    application: {
      id: `APP-${new Date().getFullYear()}-${sequence}`,
      status: "preparing",
      outcome: "pending",
    },
    questions: [],
    shared_question_refs: ["participation-history"],
  };
}

async function saveProgramme(values: FormValues, action: string): Promise<void> {
  const isEdit = action.startsWith("edit-app:");
  const old = isEdit ? requireApplication(action.slice("edit-app:".length)) : null;
  const data = old ? structuredClone(old) : newApplication();
  data.programme = {
    ...data.programme,
    id: values.id,
    name: values.name,
    type: values.type,
    country: values.country,
    location: values.location,
    ects: values.ects === "" ? null : Number(values.ects),
    application_deadline: values.deadline || null,
    url: values.url || "",
    in_person: { start: values.start || null, end: values.end || null },
    verification: {
      status: "verify_before_submission",
      last_checked: null,
      notes: values.notes || "",
    },
    tags: data.programme.tags || [],
  };

  if (old) {
    await api(`/api/applications/${encodeURIComponent(old._file)}`, "PUT", data);
  } else {
    await api("/api/applications", "POST", data);
  }
}

async function saveQuestion(values: FormValues, action: string): Promise<void> {
  const [, filename, indexText] = action.split(":");
  const item = requireApplication(filename);
  const index = indexText === "new" ? -1 : Number(indexText);
  const existing = index < 0 ? null : item.questions[index];
  const question = {
    id: values.qid,
    order: Number(values.order),
    wording: values.wording,
    type: values.type,
    required: values.required === "true",
    options: existing?.options || [],
    answer_history: existing?.answer_history || [],
    current_revision: existing?.current_revision || 0,
  };
  if (index < 0) item.questions.push(question);
  else item.questions[index] = question;
  item.questions.sort((left, right) => (left.order || 0) - (right.order || 0));
  await api(`/api/applications/${encodeURIComponent(filename)}`, "PUT", item);
}

async function saveRevision(values: FormValues, action: string): Promise<void> {
  const [, filename, questionText, revisionText] = action.split(":");
  const item = requireApplication(filename);
  const questionIndex = Number(questionText);
  const question = item.questions[questionIndex];
  if (!question) throw new Error("Question not found. Refresh and try again.");
  const editIndex = action.startsWith("revision-edit:")
    ? Number(revisionText)
    : null;
  saveAnswerRevision(
    question,
    editIndex,
    {
      created_at: values.created_at || "",
      answer: values.answer || "",
      submitted: values.submitted === "true",
      submitted_at: values.submitted_at || "",
      notes: values.revision_notes || "",
    },
    today(),
  );
  await api(`/api/applications/${encodeURIComponent(filename)}`, "PUT", item);
}

async function saveParticipation(values: FormValues, action: string): Promise<void> {
  const indexText = action.split(":")[1];
  const index = indexText === "new" ? -1 : Number(indexText);
  const existing = index < 0 ? null : state.participation.entries[index];
  const entry = {
    participation_id: existing?.participation_id || `PART-${Date.now()}`,
    programme_id: values.programme_id,
    name: values.name,
    programme_type: values.programme_type,
    country: values.country,
    location: values.location,
    participation_period: values.period,
    ects: values.ects === "" ? null : Number(values.ects),
    ects_awarded:
      values.ects_awarded === "unknown" ? null : values.ects_awarded === "true",
    participation_status: values.participation_status,
    programme_url: values.url,
    description: values.description,
    skills_and_learning: (values.learning || "")
      .split("\n")
      .map((skill) => skill.trim())
      .filter(Boolean),
    notes: values.notes,
  };
  if (index < 0) state.participation.entries.push(entry);
  else state.participation.entries[index] = entry;
  await api("/api/participation-history", "PUT", state.participation);
}

async function saveLibraryEntry(values: FormValues, action: string): Promise<void> {
  const indexText = action.split(":")[1];
  const index = indexText === "new" ? -1 : Number(indexText);
  const existing = index < 0 ? null : state.library.entries[index];
  const entry = {
    id: existing?.id || `LIB-${Date.now()}`,
    title: values.title,
    topic: values.topic,
    source_context: values.source,
    content: values.content,
    tags: (values.tags || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    last_updated: today(),
    notes: values.notes,
  };
  if (index < 0) state.library.entries.push(entry);
  else state.library.entries[index] = entry;
  await api("/api/answer-library", "PUT", state.library);
}

export async function saveModalForm(event: Event): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const values = formValues(form);
  const action = form.dataset.action || "";

  try {
    if (action === "create-app" || action.startsWith("edit-app:")) {
      await saveProgramme(values, action);
    } else if (action.startsWith("save-app:")) {
      const filename = action.slice("save-app:".length);
      const item = requireApplication(filename);
      setApplicationDetails(item, values);
      await api(`/api/applications/${encodeURIComponent(filename)}`, "PUT", item);
    } else if (action.startsWith("question:")) {
      await saveQuestion(values, action);
    } else if (action.startsWith("revision-edit:") || action.startsWith("revision:")) {
      await saveRevision(values, action);
    } else if (action.startsWith("participation:")) {
      await saveParticipation(values, action);
    } else if (action.startsWith("library:")) {
      await saveLibraryEntry(values, action);
    } else {
      throw new Error("Unknown form action.");
    }

    closeModal();
    await load();
    if (
      action.startsWith("question:") ||
      action.startsWith("revision:") ||
      action.startsWith("revision-edit:") ||
      action.startsWith("edit-app:")
    ) {
      const filename = action.split(":")[1];
      const refreshed = state.apps.find((item) => item._file === filename);
      if (refreshed) openApplicationDetail(refreshed);
    } else if (action === "create-app") {
      switchView("applications");
    }
    notify("Changes saved to YAML.");
  } catch (error) {
    notify(error instanceof Error ? error.message : "Unable to save changes.");
  }
}

export async function deleteApplication(item: ApplicationRecord): Promise<void> {
  if (!confirm(`Delete ${item.programme.name} and its application history? This cannot be undone.`)) {
    return;
  }
  try {
    await api(`/api/applications/${encodeURIComponent(item._file)}`, "DELETE");
    state.activeFile = null;
    await load();
    switchView("applications");
    notify("Application deleted.");
  } catch (error) {
    notify(error instanceof Error ? error.message : "Unable to delete application.");
  }
}

export async function deleteParticipation(index: number): Promise<void> {
  if (!confirm("Delete this participation record?")) return;
  try {
    state.participation.entries.splice(index, 1);
    await api("/api/participation-history", "PUT", state.participation);
    await load();
    notify("Participation deleted.");
  } catch (error) {
    notify(error instanceof Error ? error.message : "Unable to delete participation.");
  }
}

export async function deleteLibraryEntry(index: number): Promise<void> {
  if (!confirm("Delete this library entry?")) return;
  try {
    state.library.entries.splice(index, 1);
    await api("/api/answer-library", "PUT", state.library);
    await load();
    notify("Library entry deleted.");
  } catch (error) {
    notify(error instanceof Error ? error.message : "Unable to delete library entry.");
  }
}

export function handleFeatureClick(target: Element): boolean {
  const active = state.apps.find((item) => item._file === state.activeFile);
  if (target.closest("#edit-programme") && active) {
    openApplicationForm(active);
    return true;
  }
  if (target.closest("#delete-programme") && active) {
    void deleteApplication(active);
    return true;
  }
  if (target.closest("#add-question") && active) {
    openQuestionForm(active, null);
    return true;
  }
  const editQuestion = target.closest<HTMLElement>("[data-edit-question]");
  if (editQuestion && active) {
    openQuestionForm(active, Number(editQuestion.dataset.editQuestion));
    return true;
  }
  const addRevision = target.closest<HTMLElement>("[data-add-revision]");
  if (addRevision && active) {
    openRevisionForm(active, Number(addRevision.dataset.addRevision));
    return true;
  }
  const editRevision = target.closest<HTMLElement>("[data-edit-revision]");
  if (editRevision && active) {
    const [questionIndex, revisionIndex] = (editRevision.dataset.editRevision || "").split(":").map(Number);
    openRevisionForm(active, questionIndex, revisionIndex);
    return true;
  }
  return false;
}

export function handleCollectionClick(target: Element): boolean {
  const editParticipation = target.closest<HTMLElement>("[data-edit-part]");
  if (editParticipation) {
    openParticipationForm(Number(editParticipation.dataset.editPart));
    return true;
  }
  const removeParticipation = target.closest<HTMLElement>("[data-delete-part]");
  if (removeParticipation) {
    void deleteParticipation(Number(removeParticipation.dataset.deletePart));
    return true;
  }
  const editLibrary = target.closest<HTMLElement>("[data-edit-lib]");
  if (editLibrary) {
    openLibraryForm(Number(editLibrary.dataset.editLib));
    return true;
  }
  const removeLibrary = target.closest<HTMLElement>("[data-delete-lib]");
  if (removeLibrary) {
    void deleteLibraryEntry(Number(removeLibrary.dataset.deleteLib));
    return true;
  }
  return false;
}

export function handleApplicationClick(target: Element): boolean {
  const button = target.closest<HTMLElement>("[data-open-app]");
  if (!button) return false;
  const item = state.apps.find((application) => application._file === button.dataset.openApp);
  if (item) openApplicationDetail(item);
  return true;
}