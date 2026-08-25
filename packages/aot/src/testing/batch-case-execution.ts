import { format } from "node:util";
import type { BatchCase, BatchCaseExecution, BatchFailure } from "./batch-contracts.js";

/** Result of one case body with synchronous console output captured. */
export interface CapturedCaseExecution {
  readonly outcome: "passed" | "failed";
  readonly value: void | BatchCaseExecution;
  readonly error: unknown;
  readonly logs: readonly string[];
  readonly logsTruncated: boolean;
}

/** Execute one sequential case without allowing console output to corrupt machine receipts. */
export async function executeWithCapturedConsole(
  action: () => void | BatchCaseExecution | Promise<void | BatchCaseExecution>,
  characterLimit: number,
): Promise<CapturedCaseExecution> {
  const original = {
    log: console.log,
    info: console.info,
    debug: console.debug,
    warn: console.warn,
    error: console.error,
    dir: console.dir,
    table: console.table,
  };
  const logs: string[] = [];
  let logCharacters = 0;
  let logsTruncated = false;
  const capture = (kind: string, args: readonly unknown[]): void => {
    const line = `[${kind}] ${format(...args)}`;
    const remaining = characterLimit - logCharacters;
    if (remaining <= 0) {
      logsTruncated = true;
      return;
    }
    const retained = line.length <= remaining ? line : line.slice(0, remaining);
    logs.push(retained);
    logCharacters += retained.length;
    logsTruncated ||= retained.length !== line.length;
  };
  console.log = (...args: unknown[]) => { capture("log", args); };
  console.info = (...args: unknown[]) => { capture("info", args); };
  console.debug = (...args: unknown[]) => { capture("debug", args); };
  console.warn = (...args: unknown[]) => { capture("warn", args); };
  console.error = (...args: unknown[]) => { capture("error", args); };
  console.dir = ((item: unknown, options?: object) => { capture("dir", [item, options]); }) as typeof console.dir;
  console.table = ((data: unknown, properties?: readonly string[]) => {
    capture("table", [data, properties]);
  }) as typeof console.table;

  try {
    return { outcome: "passed", value: await action(), error: undefined, logs, logsTruncated };
  } catch (error) {
    return { outcome: "failed", value: undefined, error, logs, logsTruncated };
  } finally {
    console.log = original.log;
    console.info = original.info;
    console.debug = original.debug;
    console.warn = original.warn;
    console.error = original.error;
    console.dir = original.dir;
    console.table = original.table;
  }
}

/** Project one bounded failure detail under the remaining aggregate character budget. */
export function batchFailure<TContext>(
  candidate: BatchCase<TContext>,
  iteration: number,
  durationMs: number,
  execution: CapturedCaseExecution,
  characterLimit: number,
): BatchFailure {
  const errorName = execution.error instanceof Error ? execution.error.name : "ThrownValue";
  const message = execution.error instanceof Error ? execution.error.message : String(execution.error);
  const retainedMessage = boundedText(message, Math.min(2048, characterLimit));
  const stackBudget = Math.max(0, Math.min(4096, characterLimit - retainedMessage.length));
  const stack = boundedLines(
    execution.error instanceof Error ? execution.error.stack?.split(/\r?\n/u) ?? [] : [],
    stackBudget,
  );
  const used = retainedMessage.length + stack.reduce((sum, line) => sum + line.length, 0);
  const retainedLogs = boundedLines(execution.logs, Math.max(0, characterLimit - used));
  return {
    id: candidate.id,
    family: candidate.family,
    iteration,
    durationMs,
    errorName,
    message: retainedMessage,
    stack,
    logs: retainedLogs,
    logsTruncated: execution.logsTruncated || retainedLogs.length !== execution.logs.length,
  };
}

export function failureCharacterCount(failure: BatchFailure): number {
  return failure.message.length
    + failure.stack.reduce((sum, line) => sum + line.length, 0)
    + failure.logs.reduce((sum, line) => sum + line.length, 0);
}

function boundedText(value: string, limit: number): string {
  return value.length <= limit ? value : value.slice(0, limit);
}

function boundedLines(lines: readonly string[], limit: number): readonly string[] {
  const retained: string[] = [];
  let characters = 0;
  for (const line of lines) {
    const remaining = limit - characters;
    if (remaining <= 0) {
      break;
    }
    const value = line.length <= remaining ? line : line.slice(0, remaining);
    retained.push(value);
    characters += value.length;
  }
  return retained;
}
