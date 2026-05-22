#!/usr/bin/env node
import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const packageRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const rawArgs = process.argv.slice(2);
const booleanPromptArgumentNames = new Set(['includeRouter', 'includeDiagnostics']);

if (rawArgs.length === 0 || rawArgs[0] === '--help' || rawArgs[0] === '-h') {
  process.stdout.write(`${usage()}\n`);
  process.exit(0);
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['out/server.js'],
  cwd: packageRoot,
});
const client = new Client({ name: 'au-mcp-dev-prompt', version: '0.0.0' });

try {
  const invocation = parseInvocation(rawArgs);
  await client.connect(transport);
  const result = await client.getPrompt({
    name: invocation.promptName,
    arguments: invocation.input,
  });
  process.stdout.write(invocation.outputMode === 'json'
    ? `${JSON.stringify(result, null, 2)}\n`
    : `${promptText(result)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ error: serializeError(error) }, null, 2)}\n`);
  process.exitCode = 1;
} finally {
  await client.close();
}

type DevPromptOutputMode = 'json' | 'text';

interface DevPromptInvocation {
  readonly promptName: string;
  readonly input: Record<string, string>;
  readonly outputMode: DevPromptOutputMode;
}

function parseInvocation(args: readonly string[]): DevPromptInvocation {
  const [promptName, ...rest] = args;
  if (promptName == null || promptName === '--help' || promptName === '-h') {
    throw new Error(usage());
  }
  const input: Record<string, string> = {};
  let outputMode: DevPromptOutputMode = 'text';
  for (let index = 0; index < rest.length; index += 1) {
    const key = rest[index];
    if (key == null) {
      continue;
    }
    if (!key.startsWith('--') && looksLikeJsonObject(key)) {
      Object.assign(input, parseJsonInput(key));
      continue;
    }
    if (key === '--json') {
      outputMode = 'json';
      continue;
    }
    if (key === '--output') {
      outputMode = parseOutputMode(requireValue(rest, index, key), key);
      index += 1;
      continue;
    }
    if (key === '--input') {
      Object.assign(input, parseJsonInput(requireValue(rest, index, key)));
      index += 1;
      continue;
    }
    if (key.startsWith('--')) {
      const argumentName = key.slice(2);
      if (booleanPromptArgumentNames.has(argumentName)) {
        const option = readBooleanStringOption(rest, index, key);
        input[argumentName] = option.value;
        index = option.nextIndex;
        continue;
      }
      input[argumentName] = requireValue(rest, index, key);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument '${key}'. ${usage()}`);
  }
  return { promptName, input, outputMode };
}

function promptText(result: { readonly messages?: readonly unknown[] }): string {
  const messages = result.messages ?? [];
  if (messages.length === 0) {
    return 'MCP prompt returned no messages.';
  }
  return messages.map((message, index) => {
    if (!isRecord(message)) {
      return `${index + 1}. ${JSON.stringify(message)}`;
    }
    const role = typeof message.role === 'string' ? message.role : 'message';
    const content = isRecord(message.content) ? message.content : null;
    const text = content != null && content.type === 'text' && typeof content.text === 'string'
      ? content.text
      : JSON.stringify(message);
    return `${index + 1}. ${role}: ${text}`;
  }).join('\n\n');
}

function parseOutputMode(value: string, key: string): DevPromptOutputMode {
  if (value === 'json' || value === 'text') {
    return value;
  }
  throw new Error(`${key} expects json or text.`);
}

function requireValue(args: readonly string[], index: number, key: string): string {
  const value = args[index + 1];
  if (value == null) {
    throw new Error(`Missing value for ${key}.`);
  }
  return value;
}

function readBooleanStringOption(
  args: readonly string[],
  index: number,
  key: string,
): { value: string; nextIndex: number } {
  const value = args[index + 1];
  if (value == null || value.startsWith('--')) {
    return { value: 'true', nextIndex: index };
  }
  if (value === 'true' || value === 'false') {
    return { value, nextIndex: index + 1 };
  }
  throw new Error(`${key} expects true or false.`);
}

function usage(): string {
  return [
    'Usage: pnpm --filter @aurelia-ls/mcp dev:prompt -- <prompt-name> [json-or-flags]',
    'Prompts: aurelia_orient_workspace, aurelia_plan_authoring_recipe, aurelia_build_app_feature',
    'Examples:',
    '  pnpm --filter @aurelia-ls/mcp dev:prompt -- aurelia_build_app_feature --featureGoal "Add a routed form" --focus forms --includeRouter',
    '  pnpm --filter @aurelia-ls/mcp dev:prompt -- aurelia_plan_authoring_recipe {"recipeKey":"state-backed-form"} --json',
    'Boolean prompt arguments such as --includeRouter and --includeDiagnostics accept a bare flag or an explicit true/false value.',
    'Use --output json for raw MCP prompt JSON; text is the default for prompt review.',
  ].join('\n');
}

function looksLikeJsonObject(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith('{') && trimmed.endsWith('}');
}

function parseJsonInput(value: string): Record<string, string> {
  const parsed: unknown = JSON.parse(value);
  if (!isRecord(parsed)) {
    throw new Error('JSON input must be an object.');
  }
  const input: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(parsed)) {
    if (rawValue != null) {
      input[key] = String(rawValue);
    }
  }
  return input;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function serializeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }
  return {
    name: 'Error',
    message: String(error),
  };
}
