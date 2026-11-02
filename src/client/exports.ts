import type { ApplicationRecord } from "./types.js";

function codeFence(value: string): string {
  const longestBacktickRun = Math.max(
    0,
    ...Array.from(value.matchAll(/`+/g), ([run]) => run.length),
  );
  const fence = "`".repeat(Math.max(3, longestBacktickRun + 1));
  return `${fence}\n${value}\n${fence}`;
}

export function buildSubmittedAnswersMarkdown(
  item: ApplicationRecord,
  exportedAt = new Date().toISOString().slice(0, 10),
): string {
  const { programme, application, questions = [] } = item;
  const questionSections = questions.map((question, index) => {
    const submittedAnswers = (question.answer_history || []).filter(
      (revision) => revision.submitted,
    );
    const questionDetails = [
      question.id ? `- **Question ID:** ${question.id}` : "",
      `- **Type:** ${question.type || "text"}`,
      `- **Required:** ${question.required ? "Yes" : "No"}`,
    ].filter(Boolean);
    const answerSections = submittedAnswers.length
      ? submittedAnswers.map(
          (revision) =>
            `**Submitted answer — revision ${revision.revision}${revision.submitted_at ? ` · submitted ${revision.submitted_at}` : ""}**\n\n${codeFence(revision.answer || "")}`,
        )
      : ["*No submitted answer recorded.*"];

    return [
      `### Question ${index + 1}`,
      "",
      ...questionDetails,
      "",
      "**Prompt**",
      "",
      codeFence(question.wording || ""),
      "",
      ...answerSections.flatMap((section) => [section, ""]),
    ].join("\n").trimEnd();
  });

  return [
    `# Submitted answers: ${programme.name || "Unnamed programme"}`,
    "",
    `- **Programme ID:** ${programme.id || "Not recorded"}`,
    `- **Type:** ${programme.type || "Not recorded"}`,
    `- **Location:** ${[programme.location, programme.country].filter(Boolean).join(", ") || "Not recorded"}`,
    `- **Application status:** ${application.status || "Not recorded"}`,
    `- **Application submitted:** ${application.submitted_at || "Not recorded"}`,
    `- **Exported:** ${exportedAt}`,
    "",
    "## Questions and submitted answers",
    "",
    ...(questionSections.length
      ? questionSections.flatMap((section) => [section, ""])
      : ["*No questions recorded.*"]),
  ].join("\n").trimEnd() + "\n";
}
