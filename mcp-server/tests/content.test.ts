import { describe, expect, it } from "vitest";

import {
  buildFastGptArgs,
  buildNewsArgs,
  buildSummarizeArgs
} from "../src/tools/content.js";

describe("buildSummarizeArgs", () => {
  it("builds subscriber summarize args", () => {
    expect(
      buildSummarizeArgs({
        url: "https://example.com/article",
        subscriber: true,
        length: "overview",
        summaryType: "summary",
        targetLanguage: "EN"
      })
    ).toEqual([
      "summarize",
      "--url",
      "https://example.com/article",
      "--subscriber",
      "--length",
      "overview",
      "--summary-type",
      "summary",
      "--target-language",
      "EN"
    ]);
  });
});

describe("buildNewsArgs", () => {
  it("builds a filtered news request", () => {
    expect(
      buildNewsArgs({
        category: "tech",
        limit: 5,
        lang: "en",
        filterPresetIds: ["politics"],
        filterKeywords: ["spoiler"],
        filterMode: "hide",
        filterScope: "title"
      })
    ).toEqual([
      "news",
      "--category",
      "tech",
      "--limit",
      "5",
      "--lang",
      "en",
      "--filter-preset",
      "politics",
      "--filter-keyword",
      "spoiler",
      "--filter-mode",
      "hide",
      "--filter-scope",
      "title"
    ]);
  });
});

describe("buildFastGptArgs", () => {
  it("builds a fastgpt command with bool values", () => {
    expect(
      buildFastGptArgs({
        query: "What is Rust?",
        cache: false,
        webSearch: true
      })
    ).toEqual(["fastgpt", "What is Rust?", "--cache", "false", "--web-search", "true"]);
  });
});
