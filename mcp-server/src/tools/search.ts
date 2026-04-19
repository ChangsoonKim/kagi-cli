import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { RunKagiOptions } from "../runner.js";
import { runKagiJson } from "../runner.js";
import {
  jsonToolResponse,
  pushBooleanChoiceFlag,
  pushOptionalFlag
} from "../tool-utils.js";

const searchTimeSchema = z.enum(["day", "week", "month", "year"]);
const searchOrderSchema = z.enum(["default", "recency", "website", "trackers"]);

export interface SearchToolInput {
  query: string;
  snap?: string;
  lens?: string;
  region?: string;
  time?: z.infer<typeof searchTimeSchema>;
  fromDate?: string;
  toDate?: string;
  order?: z.infer<typeof searchOrderSchema>;
  verbatim?: boolean;
  personalized?: boolean;
}

export interface QuickToolInput {
  query: string;
  lens?: string;
}

export function buildSearchArgs(input: SearchToolInput): string[] {
  const args = ["search", input.query, "--format", "json"];

  pushOptionalFlag(args, "--snap", input.snap);
  pushOptionalFlag(args, "--lens", input.lens);
  pushOptionalFlag(args, "--region", input.region);
  pushOptionalFlag(args, "--time", input.time);
  pushOptionalFlag(args, "--from-date", input.fromDate);
  pushOptionalFlag(args, "--to-date", input.toDate);
  pushOptionalFlag(args, "--order", input.order);

  if (input.verbatim) {
    args.push("--verbatim");
  }

  pushBooleanChoiceFlag(args, "--personalized", "--no-personalized", input.personalized);

  return args;
}

export function buildQuickArgs(input: QuickToolInput): string[] {
  const args = ["quick", input.query, "--format", "json"];
  pushOptionalFlag(args, "--lens", input.lens);
  return args;
}

export async function executeSearchTool(input: SearchToolInput, options: RunKagiOptions = {}) {
  const result = await runKagiJson(buildSearchArgs(input), options);
  return jsonToolResponse(result);
}

export async function executeQuickTool(input: QuickToolInput, options: RunKagiOptions = {}) {
  const result = await runKagiJson(buildQuickArgs(input), options);
  return jsonToolResponse(result);
}

export function registerSearchTools(server: McpServer, runOptions: RunKagiOptions = {}) {
  server.tool(
    "kagi_search",
    {
      query: z.string().trim().min(1),
      snap: z.string().trim().min(1).optional(),
      lens: z.string().trim().min(1).optional(),
      region: z.string().trim().min(1).optional(),
      time: searchTimeSchema.optional(),
      fromDate: z.string().trim().min(1).optional(),
      toDate: z.string().trim().min(1).optional(),
      order: searchOrderSchema.optional(),
      verbatim: z.boolean().optional(),
      personalized: z.boolean().optional()
    },
    (input) => executeSearchTool(input, runOptions)
  );

  server.tool(
    "kagi_quick",
    {
      query: z.string().trim().min(1),
      lens: z.string().trim().min(1).optional()
    },
    (input) => executeQuickTool(input, runOptions)
  );
}
