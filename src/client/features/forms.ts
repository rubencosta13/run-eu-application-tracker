import { state, type ApplicationRecord } from "../types.js";
import { input, select, showModal, textarea, today } from "../ui.js";

export function openApplicationForm(item: ApplicationRecord | null = null): void {
  const programme = item?.programme || {};
  showModal(
    item ? "Edit opportunity" : "Add opportunity",
    "PROGRAMME DETAILS",
    `<div class="grid gap-4 sm:grid-cols-2">${input("id", "Programme ID", programme.id || "")}${input("name", "Programme name", programme.name || "")}${input("type", "Programme type", programme.type || "BIP")}${input("country", "Country", programme.country || "")}${input("location", "City / location", programme.location || "")}${input("ects", "ECTS", programme.ects ?? "", "number")}${input("deadline", "Application deadline", programme.application_deadline || "", "date")}${input("url", "Programme URL", programme.url || "", "url")}${input("start", "In-person start", programme.in_person?.start || "", "date")}${input("end", "In-person end", programme.in_person?.end || "", "date")}</div>${textarea("notes", "Notes / eligibility", programme.verification?.notes || "")}`,
    item ? `edit-app:${item._file}` : "create-app",
  );
}

export function openQuestionForm(
  item: ApplicationRecord,
  index: number | null,
): void {
  const existing = index === null ? null : item.questions[index];
  const nextId = `Q-${String((item.questions?.length || 0) + 1).padStart(3, "0")}`;
  showModal(
    existing ? "Edit question" : "Add application question",
    "QUESTION DETAILS",
    `${input("qid", "Question ID", existing?.id || nextId)}${input("order", "Display order", existing?.order ?? (item.questions.length || 0) + 1, "number")}${select("type", "Question type", existing?.type || "long_text", [["short_text", "Short text"], ["long_text", "Long text"], ["single_choice", "Single choice"], ["multi_choice", "Multiple choice"], ["boolean", "Yes / No"], ["date", "Date"], ["file", "File"], ["other", "Other"]])}${textarea("wording", "Exact question wording", existing?.wording || "")}${select("required", "Required?", String(existing?.required ?? true), [["true", "Required"], ["false", "Optional"]])}`,
    `question:${item._file}:${index === null ? "new" : index}`,
  );
}

export function openRevisionForm(
  item: ApplicationRecord,
  questionIndex: number,
  revisionIndex: number | null = null,
): void {
  const question = item.questions[questionIndex];
  const existing =
    revisionIndex === null
      ? null
      : question.answer_history?.[revisionIndex];
  const heading = existing
    ? `Edit revision ${existing.revision}`
    : "Add answer revision";
  const help = existing
    ? "Changes update this saved revision in place. Other revisions are left untouched."
    : "A new revision is appended. Previous drafts and submitted answers are preserved.";
  const revisionDate = existing?.submitted ? existing.created_at : today();
  const body = `<p class="text-xs text-slate-400">${help}</p>${textarea("answer", "Answer text", existing?.answer || "")}${input("created_at", "Revision date", revisionDate || today(), "date")}${textarea("revision_notes", "Notes (optional)", existing?.notes || "")}${select("submitted", "Is this the exact submitted answer?", String(existing?.submitted ?? false), [["false", "No — draft / revision"], ["true", "Yes — submitted exactly as written"]])}${input("submitted_at", "Submission date", existing?.submitted_at || "", "date")}`;
  const action = existing
    ? `revision-edit:${item._file}:${questionIndex}:${revisionIndex}`
    : `revision:${item._file}:${questionIndex}`;
  showModal(heading, question.wording || "Question", body, action, existing ? "Save answer" : "Add revision");
}

export function openParticipationForm(index: number | null = null): void {
  const entry = index === null ? {} : state.participation.entries[index];
  showModal(
    entry.name ? "Edit participation" : "Add participation",
    "PARTICIPATION HISTORY",
    `<div class="grid gap-4 sm:grid-cols-2">${input("name", "Programme name", entry.name || "")}${input("programme_id", "Programme ID", entry.programme_id || "")}${input("programme_type", "Programme type", entry.programme_type || "BIP")}${input("country", "Country", entry.country || "")}${input("location", "City", entry.location || "")}${input("period", "Participation period", entry.participation_period || "", "text", "e.g. 2025-11")}${input("ects", "ECTS", entry.ects ?? "", "number")}${input("url", "Programme URL", entry.programme_url || "", "url")}</div>${select("participation_status", "Participation status", entry.participation_status || "participated", [["participated", "Participated"], ["completed", "Completed"]])}${select("ects_awarded", "ECTS awarded?", entry.ects_awarded === true ? "true" : entry.ects_awarded === false ? "false" : "unknown", [["unknown", "Unknown / not confirmed"], ["true", "Yes"], ["false", "No"]])}${textarea("description", "Description", entry.description || "")}${textarea("learning", "Skills and learning", Array.isArray(entry.skills_and_learning) ? entry.skills_and_learning.join("\n") : "")}${textarea("notes", "Notes", entry.notes || "")}`,
    `participation:${index === null ? "new" : index}`,
  );
}

export function openLibraryForm(index: number | null = null): void {
  const entry = index === null ? {} : state.library.entries[index];
  showModal(
    entry.title ? "Edit library entry" : "Add reusable answer",
    "ANSWER LIBRARY",
    `${input("title", "Title", entry.title || "")}${input("topic", "Topic", entry.topic || "")}${input("source", "Source context", entry.source_context || "")}${textarea("content", "Reusable source material", entry.content || "")}${input("tags", "Tags (comma separated)", (entry.tags || []).join(", "))}${textarea("notes", "Notes", entry.notes || "")}`,
    `library:${index === null ? "new" : index}`,
  );
}