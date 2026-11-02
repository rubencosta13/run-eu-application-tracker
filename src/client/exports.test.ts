import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSubmittedAnswersMarkdown } from "./exports.js";
import type { ApplicationRecord } from "./types.js";

describe("buildSubmittedAnswersMarkdown", () => {
  it("exports each prompt and its submitted answers, excluding drafts and notes", () => {
    const item: ApplicationRecord = {
      _file: "programme.yaml",
      programme: {
        id: "BIP-2026",
        name: "RUN-EU Programme",
        type: "BIP",
        country: "Portugal",
        location: "Aveiro",
      },
      application: { status: "submitted", submitted_at: "2026-10-28" },
      questions: [
        {
          id: "Q1",
          wording: "Why do you want to participate?",
          type: "long_text",
          required: true,
          answer_history: [
            { revision: 1, answer: "Draft answer", submitted: false },
            {
              revision: 2,
              answer: "Submitted answer with ``` inside",
              submitted: true,
              submitted_at: "2026-10-28",
              notes: "Private note",
            },
            {
              revision: 3,
              answer: "Corrected submitted answer",
              submitted: true,
              submitted_at: "2026-10-29",
            },
          ],
        },
        {
          id: "Q2",
          wording: "What do you hope to learn?",
          answer_history: [{ revision: 1, answer: "Still drafting", submitted: false }],
        },
      ],
    };

    const markdown = buildSubmittedAnswersMarkdown(item, "2026-11-02");

    assert.match(markdown, /# Submitted answers: RUN-EU Programme/);
    assert.match(markdown, /- \*\*Application submitted:\*\* 2026-10-28/);
    assert.match(markdown, /- \*\*Exported:\*\* 2026-11-02/);
    assert.match(markdown, /Why do you want to participate\?/);
    assert.match(markdown, /Submitted answer with ``` inside/);
    assert.match(markdown, /Corrected submitted answer/);
    assert.match(markdown, /What do you hope to learn\?/);
    assert.match(markdown, /\*No submitted answer recorded\.\*/);
    assert.doesNotMatch(markdown, /Draft answer|Still drafting|Private note/);
  });

  it("reports when a programme has no recorded questions", () => {
    const item: ApplicationRecord = {
      _file: "empty.yaml",
      programme: {},
      application: {},
      questions: [],
    };

    assert.match(buildSubmittedAnswersMarkdown(item, "2026-11-02"), /\*No questions recorded\.\*/);
  });
});
