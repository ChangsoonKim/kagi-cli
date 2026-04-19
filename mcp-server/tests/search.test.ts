import { describe, expect, it } from "vitest";

import { buildQuickArgs, buildSearchArgs } from "../src/tools/search.js";

describe("buildSearchArgs", () => {
  it("builds a JSON search command with optional flags", () => {
    expect(
      buildSearchArgs({
        query: "rust",
        snap: "reddit",
        lens: "2",
        region: "us",
        time: "month",
        fromDate: "2026-03-01",
        toDate: "2026-03-31",
        order: "recency",
        verbatim: true,
        personalized: false
      })
    ).toEqual([
      "search",
      "rust",
      "--format",
      "json",
      "--snap",
      "reddit",
      "--lens",
      "2",
      "--region",
      "us",
      "--time",
      "month",
      "--from-date",
      "2026-03-01",
      "--to-date",
      "2026-03-31",
      "--order",
      "recency",
      "--verbatim",
      "--no-personalized"
    ]);
  });
});

describe("buildQuickArgs", () => {
  it("builds a quick-answer command", () => {
    expect(buildQuickArgs({ query: "what is rust", lens: "1" })).toEqual([
      "quick",
      "what is rust",
      "--format",
      "json",
      "--lens",
      "1"
    ]);
  });
});
