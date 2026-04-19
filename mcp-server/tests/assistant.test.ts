import { describe, expect, it } from "vitest";

import {
  buildAskPageArgs,
  buildAssistantPromptArgs,
  buildAssistantThreadExportArgs,
  buildTranslateArgs
} from "../src/tools/assistant.js";

describe("buildAssistantPromptArgs", () => {
  it("builds assistant prompt args", () => {
    expect(
      buildAssistantPromptArgs({
        query: "plan a research session",
        threadId: "thread-1",
        assistant: "research",
        model: "gpt-5-mini",
        lens: 2,
        webAccess: true,
        personalized: false
      })
    ).toEqual([
      "assistant",
      "plan a research session",
      "--format",
      "json",
      "--thread-id",
      "thread-1",
      "--assistant",
      "research",
      "--model",
      "gpt-5-mini",
      "--lens",
      "2",
      "--web-access",
      "--no-personalized"
    ]);
  });
});

describe("buildAssistantThreadExportArgs", () => {
  it("defaults thread export to JSON", () => {
    expect(buildAssistantThreadExportArgs({ threadId: "thread-1" })).toEqual([
      "assistant",
      "thread",
      "export",
      "thread-1",
      "--format",
      "json"
    ]);
  });
});

describe("buildAskPageArgs", () => {
  it("builds ask-page args", () => {
    expect(
      buildAskPageArgs({
        url: "https://example.com",
        question: "What changed?"
      })
    ).toEqual(["ask-page", "https://example.com", "What changed?"]);
  });
});

describe("buildTranslateArgs", () => {
  it("builds translate args with optional sections", () => {
    expect(
      buildTranslateArgs({
        text: "hello",
        from: "en",
        to: "ko",
        useDefinitionContext: true,
        preserveFormatting: false,
        contextMemory: [{ role: "system", content: "keep it concise" }],
        alternatives: false,
        suggestions: false
      })
    ).toEqual([
      "translate",
      "hello",
      "--from",
      "en",
      "--to",
      "ko",
      "--use-definition-context",
      "true",
      "--preserve-formatting",
      "false",
      "--context-memory-json",
      "[{\"role\":\"system\",\"content\":\"keep it concise\"}]",
      "--no-alternatives",
      "--no-suggestions"
    ]);
  });
});
