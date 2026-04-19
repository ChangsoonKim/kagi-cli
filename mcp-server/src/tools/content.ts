import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { RunKagiOptions } from "../runner.js";
import { runKagiJson } from "../runner.js";
import { KagiCliError } from "../errors.js";
import { jsonToolResponse, pushOptionalFlag, requireExactlyOneField } from "../tool-utils.js";

const newsFilterModeSchema = z.enum(["hide", "blur"]);
const newsFilterScopeSchema = z.enum(["title", "summary", "all"]);

export interface SummarizeToolInput {
  url?: string;
  text?: string;
  subscriber?: boolean;
  length?: string;
  engine?: string;
  summaryType?: string;
  targetLanguage?: string;
  cache?: boolean;
}

export interface NewsToolInput {
  category?: string;
  limit?: number;
  lang?: string;
  listCategories?: boolean;
  chaos?: boolean;
  listFilterPresets?: boolean;
  filterPresetIds?: string[];
  filterKeywords?: string[];
  filterMode?: z.infer<typeof newsFilterModeSchema>;
  filterScope?: z.infer<typeof newsFilterScopeSchema>;
}

export interface SmallWebToolInput {
  limit?: number;
}

export interface FastGptToolInput {
  query: string;
  cache?: boolean;
  webSearch?: boolean;
}

export interface EnrichToolInput {
  query: string;
}

export interface RegisterContentToolOptions {
  mode?: "all" | "session-only";
  runOptions?: RunKagiOptions;
}

export function buildSummarizeArgs(input: SummarizeToolInput): string[] {
  requireExactlyOneField("kagi_summarize", {
    url: input.url,
    text: input.text
  });

  const args = ["summarize"];

  pushOptionalFlag(args, "--url", input.url);
  pushOptionalFlag(args, "--text", input.text);

  if (input.subscriber) {
    args.push("--subscriber");
  }

  pushOptionalFlag(args, "--length", input.length);
  pushOptionalFlag(args, "--engine", input.engine);
  pushOptionalFlag(args, "--summary-type", input.summaryType);
  pushOptionalFlag(args, "--target-language", input.targetLanguage);
  pushOptionalFlag(args, "--cache", input.cache);

  return args;
}

export function buildNewsArgs(input: NewsToolInput): string[] {
  const args = ["news"];

  pushOptionalFlag(args, "--category", input.category);
  pushOptionalFlag(args, "--limit", input.limit);
  pushOptionalFlag(args, "--lang", input.lang);

  if (input.listCategories) {
    args.push("--list-categories");
  }
  if (input.chaos) {
    args.push("--chaos");
  }
  if (input.listFilterPresets) {
    args.push("--list-filter-presets");
  }

  for (const presetId of input.filterPresetIds ?? []) {
    args.push("--filter-preset", presetId);
  }
  for (const keyword of input.filterKeywords ?? []) {
    args.push("--filter-keyword", keyword);
  }

  pushOptionalFlag(args, "--filter-mode", input.filterMode);
  pushOptionalFlag(args, "--filter-scope", input.filterScope);

  return args;
}

export function buildSmallWebArgs(input: SmallWebToolInput): string[] {
  const args = ["smallweb"];
  pushOptionalFlag(args, "--limit", input.limit);
  return args;
}

export function buildFastGptArgs(input: FastGptToolInput): string[] {
  const args = ["fastgpt", input.query];
  pushOptionalFlag(args, "--cache", input.cache);
  pushOptionalFlag(args, "--web-search", input.webSearch);
  return args;
}

export function buildEnrichArgs(kind: "web" | "news", input: EnrichToolInput): string[] {
  return ["enrich", kind, input.query];
}

function validateNewsToolInput(input: NewsToolInput) {
  const hasListingMode = input.listCategories || input.chaos || input.listFilterPresets;
  const hasFilterValues =
    (input.filterPresetIds?.length ?? 0) > 0 || (input.filterKeywords?.length ?? 0) > 0;

  if (hasListingMode && hasFilterValues) {
    throw new KagiCliError(
      "news filter inputs cannot be combined with list-categories, chaos, or list-filter-presets"
    );
  }
}

export async function executeSummarizeTool(
  input: SummarizeToolInput,
  options: RunKagiOptions = {}
) {
  const result = await runKagiJson(buildSummarizeArgs(input), options);
  return jsonToolResponse(result);
}

export async function executeNewsTool(input: NewsToolInput, options: RunKagiOptions = {}) {
  validateNewsToolInput(input);
  const result = await runKagiJson(buildNewsArgs(input), options);
  return jsonToolResponse(result);
}

export async function executeSmallWebTool(
  input: SmallWebToolInput,
  options: RunKagiOptions = {}
) {
  const result = await runKagiJson(buildSmallWebArgs(input), options);
  return jsonToolResponse(result);
}

export async function executeFastGptTool(
  input: FastGptToolInput,
  options: RunKagiOptions = {}
) {
  const result = await runKagiJson(buildFastGptArgs(input), options);
  return jsonToolResponse(result);
}

export async function executeEnrichTool(
  kind: "web" | "news",
  input: EnrichToolInput,
  options: RunKagiOptions = {}
) {
  const result = await runKagiJson(buildEnrichArgs(kind, input), options);
  return jsonToolResponse(result);
}

export function registerContentTools(server: McpServer, options: RegisterContentToolOptions = {}) {
  const mode = options.mode ?? "all";
  const runOptions = options.runOptions ?? {};

  if (mode === "session-only") {
    server.tool(
      "kagi_summarize",
      {
        url: z.string().trim().min(1).optional(),
        text: z.string().trim().min(1).optional(),
        length: z.string().trim().min(1).optional(),
        summaryType: z.string().trim().min(1).optional(),
        targetLanguage: z.string().trim().min(1).optional()
      },
      (input) =>
        executeSummarizeTool(
          {
            ...input,
            subscriber: true
          },
          runOptions
        )
    );
  } else {
    server.tool(
      "kagi_summarize",
      {
        url: z.string().trim().min(1).optional(),
        text: z.string().trim().min(1).optional(),
        subscriber: z.boolean().optional(),
        length: z.string().trim().min(1).optional(),
        engine: z.string().trim().min(1).optional(),
        summaryType: z.string().trim().min(1).optional(),
        targetLanguage: z.string().trim().min(1).optional(),
        cache: z.boolean().optional()
      },
      (input) => executeSummarizeTool(input, runOptions)
    );
  }

  server.tool(
    "kagi_news",
    {
      category: z.string().trim().min(1).optional(),
      limit: z.number().int().positive().optional(),
      lang: z.string().trim().min(1).optional(),
      listCategories: z.boolean().optional(),
      chaos: z.boolean().optional(),
      listFilterPresets: z.boolean().optional(),
      filterPresetIds: z.array(z.string().trim().min(1)).optional(),
      filterKeywords: z.array(z.string().trim().min(1)).optional(),
      filterMode: newsFilterModeSchema.optional(),
      filterScope: newsFilterScopeSchema.optional()
    },
    (input) => executeNewsTool(input, runOptions)
  );

  server.tool(
    "kagi_smallweb",
    {
      limit: z.number().int().positive().optional()
    },
    (input) => executeSmallWebTool(input, runOptions)
  );

  if (mode === "all") {
    server.tool(
      "kagi_fastgpt",
      {
        query: z.string().trim().min(1),
        cache: z.boolean().optional(),
        webSearch: z.boolean().optional()
      },
      (input) => executeFastGptTool(input, runOptions)
    );

    server.tool(
      "kagi_enrich_web",
      {
        query: z.string().trim().min(1)
      },
      (input) => executeEnrichTool("web", input, runOptions)
    );

    server.tool(
      "kagi_enrich_news",
      {
        query: z.string().trim().min(1)
      },
      (input) => executeEnrichTool("news", input, runOptions)
    );
  }
}
