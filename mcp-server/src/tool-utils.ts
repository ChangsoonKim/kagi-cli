import { KagiCliError } from "./errors.js";

export function pushOptionalFlag(
  args: string[],
  flag: string,
  value: string | number | boolean | null | undefined
): void {
  if (value === undefined || value === null || value === "") {
    return;
  }

  args.push(flag, String(value));
}

export function pushBooleanChoiceFlag(
  args: string[],
  trueFlag: string,
  falseFlag: string,
  value: boolean | undefined
): void {
  if (value === true) {
    args.push(trueFlag);
  } else if (value === false) {
    args.push(falseFlag);
  }
}

export function requireExactlyOneField(
  label: string,
  fields: Record<string, unknown>
): void {
  const present = Object.entries(fields).filter(([, value]) => {
    if (typeof value === "string") {
      return value.trim().length > 0;
    }

    return value !== undefined && value !== null;
  });

  if (present.length !== 1) {
    throw new KagiCliError(`${label} requires exactly one of: ${Object.keys(fields).join(", ")}`);
  }
}

export function jsonToolResponse(result: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2)
      }
    ],
    structuredContent: {
      result
    }
  };
}

export function textToolResponse(text: string, extra: Record<string, unknown> = {}) {
  return {
    content: [
      {
        type: "text" as const,
        text
      }
    ],
    structuredContent: {
      result: text,
      ...extra
    }
  };
}
