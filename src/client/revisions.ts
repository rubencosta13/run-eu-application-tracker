import type { ApplicationQuestion, AnswerRevision } from "./types.js";

export interface RevisionFormValues {
  created_at: string;
  answer: string;
  submitted: boolean;
  submitted_at: string;
  notes: string;
}

export function saveAnswerRevision(
  question: ApplicationQuestion,
  editIndex: number | null,
  values: RevisionFormValues,
  currentDate: string,
): void {
  question.answer_history ||= [];
  const existing = editIndex === null ? undefined : question.answer_history[editIndex];
  if (editIndex !== null && !existing) {
    throw new Error("Answer revision not found.");
  }

  if (existing?.submitted && editIndex !== null) {
    const updated: AnswerRevision = {
      ...existing,
      created_at: values.created_at || existing.created_at || currentDate,
      answer: values.answer,
      submitted: values.submitted,
      notes: values.notes,
    };
    if (updated.submitted) {
      updated.submitted_at = values.submitted_at || existing.submitted_at || currentDate;
    } else {
      delete updated.submitted_at;
    }
    question.answer_history[editIndex] = updated;
    return;
  }

  const revision =
    question.answer_history.reduce(
      (maximum, entry) => Math.max(maximum, Number(entry.revision) || 0),
      0,
    ) + 1;
  const next: AnswerRevision = {
    revision,
    created_at: values.created_at || currentDate,
    answer: values.answer,
    submitted: values.submitted,
    notes: values.notes,
  };
  if (next.submitted) next.submitted_at = values.submitted_at || currentDate;
  question.answer_history.push(next);
  question.current_revision = revision;
}