import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { RunKagiOptions } from "../runner.js";
import { runKagiJson, runKagiText } from "../runner.js";
import {
  jsonToolResponse,
  pushBooleanChoiceFlag,
  pushOptionalFlag,
  textToolResponse
} from "../tool-utils.js";

const exportFormatSchema = z.enum(["json", "markdown"]);

export interface AssistantPromptToolInput {
  query: string;
  threadId?: string;
  assistant?: string;
  model?: string;
  lens?: number;
  webAccess?: boolean;
  personalized?: boolean;
}

export interface AssistantThreadGetToolInput {
  threadId: string;
}

export interface AssistantThreadExportToolInput {
  threadId: string;
  format?: z.infer<typeof exportFormatSchema>;
}

export interface AskPageToolInput {
  url: string;
  question: string;
}

export interface TranslateToolInput {
  text: string;
  from?: string;
  to?: string;
  quality?: string;
  model?: string;
  prediction?: string;
  predictedLanguage?: string;
  formality?: string;
  speakerGender?: string;
  addresseeGender?: string;
  languageComplexity?: string;
  translationStyle?: string;
  context?: string;
  dictionaryLanguage?: string;
  timeFormat?: string;
  useDefinitionContext?: boolean;
  enableLanguageFeatures?: boolean;
  preserveFormatting?: boolean;
  contextMemory?: unknown[];
  alternatives?: boolean;
  wordInsights?: boolean;
  suggestions?: boolean;
  alignments?: boolean;
}

export function buildAssistantPromptArgs(input: AssistantPromptToolInput): string[] {
  const args = ["assistant", input.query, "--format", "json"];

  pushOptionalFlag(args, "--thread-id", input.threadId);
  pushOptionalFlag(args, "--assistant", input.assistant);
  pushOptionalFlag(args, "--model", input.model);
  pushOptionalFlag(args, "--lens", input.lens);
  pushBooleanChoiceFlag(args, "--web-access", "--no-web-access", input.webAccess);
  pushBooleanChoiceFlag(args, "--personalized", "--no-personalized", input.personalized);

  return args;
}

export function buildAssistantThreadGetArgs(input: AssistantThreadGetToolInput): string[] {
  return ["assistant", "thread", "get", input.threadId];
}

export function buildAssistantThreadExportArgs(input: AssistantThreadExportToolInput): string[] {
  const format = input.format ?? "json";
  return ["assistant", "thread", "export", input.threadId, "--format", format];
}

export function buildAskPageArgs(input: AskPageToolInput): string[] {
  return ["ask-page", input.url, input.question];
}

export function buildTranslateArgs(input: TranslateToolInput): string[] {
  const args = ["translate", input.text];

  pushOptionalFlag(args, "--from", input.from);
  pushOptionalFlag(args, "--to", input.to);
  pushOptionalFlag(args, "--quality", input.quality);
  pushOptionalFlag(args, "--model", input.model);
  pushOptionalFlag(args, "--prediction", input.prediction);
  pushOptionalFlag(args, "--predicted-language", input.predictedLanguage);
  pushOptionalFlag(args, "--formality", input.formality);
  pushOptionalFlag(args, "--speaker-gender", input.speakerGender);
  pushOptionalFlag(args, "--addressee-gender", input.addresseeGender);
  pushOptionalFlag(args, "--language-complexity", input.languageComplexity);
  pushOptionalFlag(args, "--translation-style", input.translationStyle);
  pushOptionalFlag(args, "--context", input.context);
  pushOptionalFlag(args, "--dictionary-language", input.dictionaryLanguage);
  pushOptionalFlag(args, "--time-format", input.timeFormat);
  pushOptionalFlag(args, "--use-definition-context", input.useDefinitionContext);
  pushOptionalFlag(args, "--enable-language-features", input.enableLanguageFeatures);
  pushOptionalFlag(args, "--preserve-formatting", input.preserveFormatting);

  if (input.contextMemory && input.contextMemory.length > 0) {
    args.push("--context-memory-json", JSON.stringify(input.contextMemory));
  }

  if (input.alternatives === false) {
    args.push("--no-alternatives");
  }
  if (input.wordInsights === false) {
    args.push("--no-word-insights");
  }
  if (input.suggestions === false) {
    args.push("--no-suggestions");
  }
  if (input.alignments === false) {
    args.push("--no-alignments");
  }

  return args;
}

export async function executeAssistantPromptTool(
  input: AssistantPromptToolInput,
  options: RunKagiOptions = {}
) {
  const result = await runKagiJson(buildAssistantPromptArgs(input), options);
  return jsonToolResponse(result);
}

export async function executeAssistantThreadListTool(options: RunKagiOptions = {}) {
  const result = await runKagiJson(["assistant", "thread", "list"], options);
  return jsonToolResponse(result);
}

export async function executeAssistantThreadGetTool(
  input: AssistantThreadGetToolInput,
  options: RunKagiOptions = {}
) {
  const result = await runKagiJson(buildAssistantThreadGetArgs(input), options);
  return jsonToolResponse(result);
}

export async function executeAssistantThreadExportTool(
  input: AssistantThreadExportToolInput,
  options: RunKagiOptions = {}
) {
  const format = input.format ?? "json";

  if (format === "markdown") {
    const result = await runKagiText(buildAssistantThreadExportArgs(input), options);
    return textToolResponse(result, { format });
  }

  const result = await runKagiJson(buildAssistantThreadExportArgs(input), options);
  return jsonToolResponse(result);
}

export async function executeAskPageTool(input: AskPageToolInput, options: RunKagiOptions = {}) {
  const result = await runKagiJson(buildAskPageArgs(input), options);
  return jsonToolResponse(result);
}

export async function executeTranslateTool(
  input: TranslateToolInput,
  options: RunKagiOptions = {}
) {
  const result = await runKagiJson(buildTranslateArgs(input), options);
  return jsonToolResponse(result);
}

export function registerAssistantTools(server: McpServer, runOptions: RunKagiOptions = {}) {
  server.tool(
    "kagi_assistant_prompt",
    {
      query: z.string().trim().min(1),
      threadId: z.string().trim().min(1).optional(),
      assistant: z.string().trim().min(1).optional(),
      model: z.string().trim().min(1).optional(),
      lens: z.number().int().nonnegative().optional(),
      webAccess: z.boolean().optional(),
      personalized: z.boolean().optional()
    },
    (input) => executeAssistantPromptTool(input, runOptions)
  );

  server.tool("kagi_assistant_thread_list", {}, () => executeAssistantThreadListTool(runOptions));

  server.tool(
    "kagi_assistant_thread_get",
    {
      threadId: z.string().trim().min(1)
    },
    (input) => executeAssistantThreadGetTool(input, runOptions)
  );

  server.tool(
    "kagi_assistant_thread_export",
    {
      threadId: z.string().trim().min(1),
      format: exportFormatSchema.optional()
    },
    (input) => executeAssistantThreadExportTool(input, runOptions)
  );

  server.tool(
    "kagi_ask_page",
    {
      url: z.string().trim().url(),
      question: z.string().trim().min(1)
    },
    (input) => executeAskPageTool(input, runOptions)
  );

  server.tool(
    "kagi_translate",
    {
      text: z.string().trim().min(1),
      from: z.string().trim().min(1).optional(),
      to: z.string().trim().min(1).optional(),
      quality: z.string().trim().min(1).optional(),
      model: z.string().trim().min(1).optional(),
      prediction: z.string().trim().min(1).optional(),
      predictedLanguage: z.string().trim().min(1).optional(),
      formality: z.string().trim().min(1).optional(),
      speakerGender: z.string().trim().min(1).optional(),
      addresseeGender: z.string().trim().min(1).optional(),
      languageComplexity: z.string().trim().min(1).optional(),
      translationStyle: z.string().trim().min(1).optional(),
      context: z.string().trim().min(1).optional(),
      dictionaryLanguage: z.string().trim().min(1).optional(),
      timeFormat: z.string().trim().min(1).optional(),
      useDefinitionContext: z.boolean().optional(),
      enableLanguageFeatures: z.boolean().optional(),
      preserveFormatting: z.boolean().optional(),
      contextMemory: z.array(z.unknown()).optional(),
      alternatives: z.boolean().optional(),
      wordInsights: z.boolean().optional(),
      suggestions: z.boolean().optional(),
      alignments: z.boolean().optional()
    },
    (input) => executeTranslateTool(input, runOptions)
  );
}
