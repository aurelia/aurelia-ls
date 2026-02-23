#!/usr/bin/env node
import readline from "node:readline";
import { createSemanticAuthorityHostRuntime } from "../host/runtime.js";
import type { SemanticAuthorityCommandInvocation } from "../host/types.js";

type CliOptions = {
  help: boolean;
  stdio: boolean;
  request: string | null;
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  const host = createSemanticAuthorityHostRuntime();
  if (options.stdio) {
    await runStdio(host);
    return;
  }

  if (!options.request) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  let invocation: SemanticAuthorityCommandInvocation;
  try {
    invocation = JSON.parse(options.request) as SemanticAuthorityCommandInvocation;
  } catch (error) {
    console.error(`Invalid JSON in --request: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
    return;
  }

  const envelope = await host.execute(invocation);
  process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
  if (envelope.status === "error") {
    process.exitCode = 1;
  }
}

async function runStdio(
  host: ReturnType<typeof createSemanticAuthorityHostRuntime>,
): Promise<void> {
  const input = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  for await (const line of input) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const invocation = JSON.parse(trimmed) as SemanticAuthorityCommandInvocation;
      const envelope = await host.execute(invocation);
      process.stdout.write(`${JSON.stringify(envelope)}\n`);
    } catch (error) {
      process.stdout.write(JSON.stringify({
        schemaVersion: "v1alpha1",
        status: "error",
        error: {
          message: error instanceof Error ? error.message : String(error),
        },
      }) + "\n");
    }
  }
}

function parseArgs(args: string[]): CliOptions {
  let help = false;
  let stdio = false;
  let request: string | null = null;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case "--help":
      case "-h":
        help = true;
        break;
      case "--stdio":
        stdio = true;
        break;
      case "--request":
        request = args[i + 1] ?? null;
        i += 1;
        break;
      default:
        break;
    }
  }

  return { help, stdio, request };
}

function printUsage(): void {
  process.stdout.write([
    "semantic-authority-host",
    "",
    "Usage:",
    "  semantic-authority-host --stdio",
    "  semantic-authority-host --request '<json>'",
    "",
    "Options:",
    "  --stdio          Run newline-delimited JSON command loop over stdin/stdout.",
    "  --request <json> Execute one command and print the response envelope.",
    "  --help, -h       Show this message.",
    "",
    "Command shape:",
    "  {\"command\":\"session.open\",\"args\":{\"workspaceRoot\":\"C:/project\",\"policy\":{\"profile\":\"ai.product\"}}}",
    "",
  ].join("\n"));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
