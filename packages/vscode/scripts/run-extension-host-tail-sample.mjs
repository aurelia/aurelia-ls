#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const invocationSchemaVersion = "aurelia-ls/extension-host-tail-electron-invocation/v1";
export const resultSchemaVersion = "aurelia-ls/extension-host-tail-electron-result/v1";

function readInvocation(filePath) {
  const resolvedPath = path.resolve(filePath);
  const value = JSON.parse(readFileSync(resolvedPath, "utf8"));
  if (value?.schemaVersion !== invocationSchemaVersion) {
    throw new Error("Extension Host tail Electron invocation schema drifted.");
  }
  if (value.invocation == null || typeof value.invocation !== "object" || Array.isArray(value.invocation)) {
    throw new Error("Extension Host tail Electron invocation must be an object.");
  }
  if (typeof value.resultPath !== "string" || !path.isAbsolute(value.resultPath)) {
    throw new Error("Extension Host tail Electron result path must be absolute.");
  }
  const resultPath = path.resolve(value.resultPath);
  if (path.dirname(resultPath) !== path.dirname(resolvedPath)) {
    throw new Error("Extension Host tail Electron result must remain beside its invocation.");
  }
  if (existsSync(resultPath)) {
    throw new Error(`Refusing to overwrite Extension Host tail Electron result: ${resultPath}`);
  }
  return { invocation: value.invocation, resultPath };
}

function errorEvidence(error) {
  return {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack ?? null : null,
  };
}

export async function runInvocation(filePath) {
  const { invocation, resultPath } = readInvocation(filePath);
  const { runTests } = await import("@vscode/test-electron");
  let runTestsReturn = null;
  let exitCode = null;
  let signal = null;
  let runTestsError = null;
  try {
    runTestsReturn = await runTests(invocation);
    exitCode = runTestsReturn;
  } catch (error) {
    exitCode = typeof error?.code === "number" ? error.code : null;
    signal = typeof error?.signal === "string" ? error.signal : null;
    runTestsError = errorEvidence(error);
  }
  const result = {
    schemaVersion: resultSchemaVersion,
    runTestsReturn,
    exitCode,
    signal,
    runTestsError,
  };
  writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  return result;
}

async function main() {
  if (process.argv.length !== 3 || process.argv[2] == null) {
    throw new Error("Usage: node run-extension-host-tail-sample.mjs <absolute-invocation.json>");
  }
  await runInvocation(process.argv[2]);
}

if (process.argv[1] != null && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
