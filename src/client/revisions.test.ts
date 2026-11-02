import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { saveAnswerRevision } from "./revisions.js";
import type { ApplicationQuestion } from "./types.js";

describe("saveAnswerRevision", () => {
  it("appends an edited draft and keeps the previous revision", () => {
    const previous = {
      revision: 3,
      created_at: "2026-10-28",
      answer: "Earlier draft",
      submitted: false,
      notes: "Initial thoughts",
    };
    const question: ApplicationQuestion = {
      answer_history: [previous],
      current_revision: 3,
    };

    saveAnswerRevision(
      question,
      0,
      {
        created_at: "2026-11-02",
        answer: "Revised draft",
        submitted: false,
        submitted_at: "",
        notes: "Updated wording",
      },
      "2026-11-02",
    );

    assert.deepEqual(question.answer_history, [
      previous,
      {
        revision: 4,
        created_at: "2026-11-02",
        answer: "Revised draft",
        submitted: false,
        notes: "Updated wording",
      },
    ]);
    assert.equal(question.current_revision, 4);
  });

  it("updates a submitted revision in place", () => {
    const question: ApplicationQuestion = {
      answer_history: [
        {
          revision: 2,
          answer: "Submitted answer",
          submitted: true,
          submitted_at: "2026-10-29",
        },
      ],
      current_revision: 2,
    };

    saveAnswerRevision(
      question,
      0,
      {
        created_at: "2026-10-29",
        answer: "Corrected answer",
        submitted: true,
        submitted_at: "2026-10-29",
        notes: "",
      },
      "2026-11-02",
    );

    assert.equal(question.answer_history?.length, 1);
    assert.equal(question.answer_history?.[0].answer, "Corrected answer");
  });
});