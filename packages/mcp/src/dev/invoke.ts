#!/usr/bin/env node
import path from 'node:path';
import { z } from 'zod/v4';
import { AureliaMcpSemanticRuntimeAdapter } from '../runtime-adapter.js';
import { aureliaMcpResultText } from '../result-text.js';
import {
  appDiagnosticsInputSchema,
  appOverviewInputSchema,
  appQueryCatalogInputSchema,
  appQueryBatchInputSchema,
  appQueryInputSchema,
  analysisCacheOverviewInputSchema,
  authoringCatalogInputSchema,
  authoringGuidanceInputSchema,
  authoringOrientationInputSchema,
  authoringRecipePlanInputSchema,
  clearAnalysisCacheInputSchema,
  diagnosticOverviewInputSchema,
  openSeamOverviewInputSchema,
  routerOverviewInputSchema,
  templateCursorInputSchema,
  templateDiagnosticsInputSchema,
  workspaceOverviewInputSchema,
} from '../tool-schemas.js';
import { aureliaMcpToolNames } from '../tool-contracts.js';
import type {
  AureliaMcpAppDiagnosticsInput,
  AureliaMcpAppOverviewInput,
  AureliaMcpAppQueryBatchInput,
  AureliaMcpAppQueryInput,
  AureliaMcpAppQueryCatalogInput,
  AureliaMcpAnalysisCacheOverviewInput,
  AureliaMcpAuthoringCatalogInput,
  AureliaMcpAuthoringGuidanceInput,
  AureliaMcpAuthoringOrientationInput,
  AureliaMcpAuthoringRecipePlanInput,
  AureliaMcpClearAnalysisCacheInput,
  AureliaMcpDiagnosticOverviewInput,
  AureliaMcpOpenSeamOverviewInput,
  AureliaMcpRouterOverviewInput,
  AureliaMcpTemplateCursorInput,
  AureliaMcpTemplateDiagnosticsInput,
  AureliaMcpWorkspaceOverviewInput,
} from '../tool-contracts.js';

const commandInputSchemas = {
  'workspace-overview': z.object(workspaceOverviewInputSchema).strict(),
  'analysis-cache-overview': z.object(analysisCacheOverviewInputSchema).strict(),
  'clear-analysis-cache': z.object(clearAnalysisCacheInputSchema).strict(),
  'authoring-catalog': z.object(authoringCatalogInputSchema).strict(),
  'app-building-guidance': z.object(authoringGuidanceInputSchema).strict(),
  'authoring-recipe-plan': z.object(authoringRecipePlanInputSchema).strict(),
  'app-query-catalog': z.object(appQueryCatalogInputSchema).strict(),
  'app-overview': z.object(appOverviewInputSchema).strict(),
  'router-overview': z.object(routerOverviewInputSchema).strict(),
  'app-query': z.object(appQueryInputSchema).strict(),
  'app-query-batch': z.object(appQueryBatchInputSchema).strict(),
  'authoring-orientation': z.object(authoringOrientationInputSchema).strict(),
  'open-seam-overview': z.object(openSeamOverviewInputSchema).strict(),
  'diagnostic-overview': z.object(diagnosticOverviewInputSchema).strict(),
  'app-diagnostics': z.object(appDiagnosticsInputSchema).strict(),
  'template-cursor-info': z.object(templateCursorInputSchema).strict(),
  'template-completions': z.object(templateCursorInputSchema).strict(),
  'template-diagnostics': z.object(templateDiagnosticsInputSchema).strict(),
} as const;

const publicToolCommandAliases: Record<string, keyof typeof commandInputSchemas> = {
  [aureliaMcpToolNames.workspaceOverview]: 'workspace-overview',
  [aureliaMcpToolNames.analysisCacheOverview]: 'analysis-cache-overview',
  [aureliaMcpToolNames.clearAnalysisCache]: 'clear-analysis-cache',
  [aureliaMcpToolNames.authoringCatalog]: 'authoring-catalog',
  [aureliaMcpToolNames.authoringGuidance]: 'app-building-guidance',
  [aureliaMcpToolNames.authoringRecipePlan]: 'authoring-recipe-plan',
  [aureliaMcpToolNames.appQueryCatalog]: 'app-query-catalog',
  [aureliaMcpToolNames.appOverview]: 'app-overview',
  [aureliaMcpToolNames.routerOverview]: 'router-overview',
  [aureliaMcpToolNames.appQuery]: 'app-query',
  [aureliaMcpToolNames.appQueryBatch]: 'app-query-batch',
  [aureliaMcpToolNames.authoringOrientation]: 'authoring-orientation',
  [aureliaMcpToolNames.openSeamOverview]: 'open-seam-overview',
  [aureliaMcpToolNames.diagnosticOverview]: 'diagnostic-overview',
  [aureliaMcpToolNames.appDiagnostics]: 'app-diagnostics',
  [aureliaMcpToolNames.templateCursorInfo]: 'template-cursor-info',
  [aureliaMcpToolNames.templateCompletions]: 'template-completions',
  [aureliaMcpToolNames.templateDiagnostics]: 'template-diagnostics',
};

const adapter = new AureliaMcpSemanticRuntimeAdapter();
const rawArgs = process.argv.slice(2);
if (rawArgs.length === 0 || rawArgs[0] === '--help' || rawArgs[0] === '-h') {
  process.stdout.write(`${usage()}\n`);
  process.exit(0);
}
try {
  const { command, input, outputMode } = parseInvocation(rawArgs);
  normalizeInvocationPaths(input);
  const result = await invoke(command, validateCommandInput(command, input));
  process.stdout.write(outputMode === 'text'
    ? `${aureliaMcpResultText(result)}\n`
    : `${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ error: serializeError(error) }, null, 2)}\n`);
  process.exitCode = 1;
}

function validateCommandInput(command: string, input: Record<string, unknown>): Record<string, unknown> {
  const schema = commandInputSchemas[command as keyof typeof commandInputSchemas];
  if (schema == null) {
    throw new Error(`Unknown command '${command}'. ${usage()}`);
  }
  return schema.parse(input) as Record<string, unknown>;
}

async function invoke(command: string, input: Record<string, unknown>): Promise<unknown> {
  switch (command) {
    case 'workspace-overview':
      return adapter.workspaceOverview(input as unknown as AureliaMcpWorkspaceOverviewInput);
    case 'analysis-cache-overview':
      return adapter.analysisCacheOverview(input as unknown as AureliaMcpAnalysisCacheOverviewInput);
    case 'clear-analysis-cache':
      return adapter.clearAnalysisCache(input as unknown as AureliaMcpClearAnalysisCacheInput);
    case 'authoring-catalog':
      return adapter.authoringCatalog(input as unknown as AureliaMcpAuthoringCatalogInput);
    case 'app-building-guidance':
      return adapter.authoringGuidance(input as unknown as AureliaMcpAuthoringGuidanceInput);
    case 'authoring-recipe-plan':
      return adapter.authoringRecipePlan(input as unknown as AureliaMcpAuthoringRecipePlanInput);
    case 'app-query-catalog':
      return adapter.appQueryCatalog(input as unknown as AureliaMcpAppQueryCatalogInput);
    case 'app-query':
      return adapter.appQuery(input as unknown as AureliaMcpAppQueryInput);
    case 'app-query-batch':
      return adapter.appQueryBatch(input as unknown as AureliaMcpAppQueryBatchInput);
    case 'app-overview':
      return adapter.appOverview(input as unknown as AureliaMcpAppOverviewInput);
    case 'router-overview':
      return adapter.routerOverview(input as unknown as AureliaMcpRouterOverviewInput);
    case 'authoring-orientation':
      return adapter.authoringOrientation(input as unknown as AureliaMcpAuthoringOrientationInput);
    case 'open-seam-overview':
      return adapter.openSeamOverview(input as unknown as AureliaMcpOpenSeamOverviewInput);
    case 'app-diagnostics':
      return adapter.appDiagnostics(input as unknown as AureliaMcpAppDiagnosticsInput);
    case 'diagnostic-overview':
      return adapter.diagnosticOverview(input as unknown as AureliaMcpDiagnosticOverviewInput);
    case 'template-cursor-info':
      return adapter.templateCursorInfo(input as unknown as AureliaMcpTemplateCursorInput);
    case 'template-completions':
      return adapter.templateCompletions(input as unknown as AureliaMcpTemplateCursorInput);
    case 'template-diagnostics':
      return adapter.templateDiagnostics(input as unknown as AureliaMcpTemplateDiagnosticsInput);
    default:
      throw new Error(`Unknown command '${command}'. ${usage()}`);
  }
}

type DevInvokeOutputMode = 'json' | 'text';

function parseInvocation(args: readonly string[]): {
  command: string;
  input: Record<string, unknown>;
  outputMode: DevInvokeOutputMode;
} {
  const [rawCommand, ...rest] = args;
  if (rawCommand == null || rawCommand === '--help' || rawCommand === '-h') {
    throw new Error(usage());
  }
  const command = publicToolCommandAliases[rawCommand] ?? rawCommand;
  const input: Record<string, unknown> = {};
  let outputMode: DevInvokeOutputMode = 'json';
  let projectRootDir: string | null = null;
  for (let index = 0; index < rest.length; index += 1) {
    const key = rest[index];
    if (key == null) {
      continue;
    }
    if (!key.startsWith('--') && looksLikeJsonObject(key)) {
      Object.assign(input, parseJsonInput(key));
      continue;
    }
    if (key === '--text') {
      outputMode = 'text';
      continue;
    }
    if (key === '--output') {
      outputMode = parseOutputMode(requireValue(rest, index, key), key);
      index += 1;
      continue;
    }
    if (key === '--input') {
      const raw = requireValue(rest, index, key);
      Object.assign(input, parseJsonInput(raw));
      index += 1;
      continue;
    }
    if (key === '--workspaceRoot') {
      input.workspaceRoot = requireValue(rest, index, key);
      index += 1;
      continue;
    }
    if (key === '--storeKey') {
      input.storeKey = requireValue(rest, index, key);
      index += 1;
      continue;
    }
    if (key === '--projectKey') {
      input.projectKey = requireValue(rest, index, key);
      index += 1;
      continue;
    }
    if (key === '--projectRootDir') {
      projectRootDir = requireValue(rest, index, key);
      index += 1;
      continue;
    }
    if (key === '--sourceFile') {
      input.sourceFile = { filePath: requireValue(rest, index, key) };
      index += 1;
      continue;
    }
    if (key === '--sourceFilePath') {
      input.sourceFilePath = requireValue(rest, index, key);
      index += 1;
      continue;
    }
    if (key === '--queryKind') {
      input.queryKind = requireValue(rest, index, key);
      index += 1;
      continue;
    }
    if (key === '--group') {
      input.group = requireValue(rest, index, key);
      index += 1;
      continue;
    }
    if (key === '--recipeKey') {
      input.recipeKey = requireValue(rest, index, key);
      index += 1;
      continue;
    }
    if (key === '--focus') {
      input.focus = requireValue(rest, index, key);
      index += 1;
      continue;
    }
    if (key === '--featureGoal') {
      input.featureGoal = requireValue(rest, index, key);
      index += 1;
      continue;
    }
    if (key === '--recipeLimit') {
      input.recipeLimit = parseNonNegativeInteger(requireValue(rest, index, key), key);
      index += 1;
      continue;
    }
    if (key === '--principleLimit') {
      input.principleLimit = parseNonNegativeInteger(requireValue(rest, index, key), key);
      index += 1;
      continue;
    }
    if (key === '--decisionLimit') {
      input.decisionLimit = parseNonNegativeInteger(requireValue(rest, index, key), key);
      index += 1;
      continue;
    }
    if (key === '--catalogView') {
      input.catalogView = requireValue(rest, index, key);
      index += 1;
      continue;
    }
    if (key === '--rootDir') {
      input.rootDir = requireValue(rest, index, key);
      index += 1;
      continue;
    }
    if (key === '--appName') {
      input.appName = requireValue(rest, index, key);
      index += 1;
      continue;
    }
    if (key === '--includeText') {
      const option = readBooleanOption(rest, index, key);
      input.includeText = option.value;
      index = option.nextIndex;
      continue;
    }
    if (key === '--recipeSourceFile' || key === '--sourceFilePaths') {
      addStringListValues(input, 'sourceFilePaths', requireValue(rest, index, key));
      index += 1;
      continue;
    }
    if (key === '--sourceTextRequestHint' || key === '--sourceTextRequestHintKey' || key === '--sourceTextRequestHintKeys') {
      addStringListValues(input, 'sourceTextRequestHintKeys', requireValue(rest, index, key));
      index += 1;
      continue;
    }
    if (key === '--sourceParameterValues') {
      addSourceParameterValues(input, parseSourceParameterValues(requireValue(rest, index, key), key));
      index += 1;
      continue;
    }
    if (key === '--sourceParameterValue') {
      addSourceParameterValues(input, [parseSourceParameterAssignment(requireValue(rest, index, key), key)]);
      index += 1;
      continue;
    }
    if (key === '--effectDetail') {
      input.effectDetail = requireValue(rest, index, key);
      index += 1;
      continue;
    }
    if (key === '--usage') {
      input.usage = requireValue(rest, index, key);
      index += 1;
      continue;
    }
    if (key === '--includeKernelBreakdowns') {
      const option = readBooleanOption(rest, index, key);
      input.includeKernelBreakdowns = option.value;
      index = option.nextIndex;
      continue;
    }
    if (key === '--includeDetailDensity') {
      const option = readBooleanOption(rest, index, key);
      input.includeDetailDensity = option.value;
      index = option.nextIndex;
      continue;
    }
    if (key === '--includeQueryClaimRows') {
      const option = readBooleanOption(rest, index, key);
      input.includeQueryClaimRows = option.value;
      index = option.nextIndex;
      continue;
    }
    if (key === '--includeAppProfile') {
      const option = readBooleanOption(rest, index, key);
      input.includeAppProfile = option.value;
      index = option.nextIndex;
      continue;
    }
    if (key === '--includeAppQueryClaimProfiles') {
      const option = readBooleanOption(rest, index, key);
      input.includeAppQueryClaimProfiles = option.value;
      index = option.nextIndex;
      continue;
    }
    if (key === '--typeSystemDependencyCacheClearPolicy') {
      input.typeSystemDependencyCacheClearPolicy = requireValue(rest, index, key);
      index += 1;
      continue;
    }
    if (key === '--analysisDepth') {
      input.analysisDepth = requireValue(rest, index, key);
      index += 1;
      continue;
    }
    if (key === '--includeAuthoringTemplates') {
      const option = readBooleanOption(rest, index, key);
      input.includeAuthoringTemplates = option.value;
      index = option.nextIndex;
      continue;
    }
    if (key === '--includeAuthoringOrientation') {
      const option = readBooleanOption(rest, index, key);
      input.includeAuthoringOrientation = option.value;
      index = option.nextIndex;
      continue;
    }
    if (key === '--authoringTemplateSourceFile') {
      addStringListValue(input, 'authoringTemplateSourceFiles', requireValue(rest, index, key));
      index += 1;
      continue;
    }
    if (key === '--authoringTemplateLimit') {
      input.authoringTemplateLimit = parseNonNegativeInteger(requireValue(rest, index, key), key);
      index += 1;
      continue;
    }
    if (key === '--projectDiscovery') {
      input.projectDiscovery = requireValue(rest, index, key);
      index += 1;
      continue;
    }
    if (key === '--detail') {
      input.detail = requireValue(rest, index, key);
      index += 1;
      continue;
    }
    if (key === '--diagnosticProjection') {
      input.diagnosticProjection = requireValue(rest, index, key);
      index += 1;
      continue;
    }
    if (key === '--appRetention') {
      input.appRetention = requireValue(rest, index, key);
      index += 1;
      continue;
    }
    if (key === '--pageSize' || key === '--page.size') {
      input.page = {
        ...(typeof input.page === 'object' && input.page != null ? input.page : {}),
        size: Number.parseInt(requireValue(rest, index, key), 10),
      };
      index += 1;
      continue;
    }
    if (key === '--pageCursor' || key === '--page.cursor') {
      input.page = {
        ...(typeof input.page === 'object' && input.page != null ? input.page : {}),
        cursor: requireValue(rest, index, key),
      };
      index += 1;
      continue;
    }
    if (key === '--projectPageSize' || key === '--projectPage.size') {
      input.projectPage = {
        ...(typeof input.projectPage === 'object' && input.projectPage != null ? input.projectPage : {}),
        size: parseNonNegativeInteger(requireValue(rest, index, key), key),
      };
      index += 1;
      continue;
    }
    if (key === '--projectPageCursor' || key === '--projectPage.cursor') {
      input.projectPage = {
        ...(typeof input.projectPage === 'object' && input.projectPage != null ? input.projectPage : {}),
        cursor: requireValue(rest, index, key),
      };
      index += 1;
      continue;
    }
    if (key === '--rowPageSize') {
      input.rowPageSize = parseNonNegativeInteger(requireValue(rest, index, key), key);
      index += 1;
      continue;
    }
    if (key === '--rowLimit') {
      input.rowLimit = parseNonNegativeInteger(requireValue(rest, index, key), key);
      index += 1;
      continue;
    }
    if (key === '--diagnosticPageSize') {
      input.diagnosticPageSize = parsePositiveInteger(requireValue(rest, index, key), key);
      index += 1;
      continue;
    }
    if (key === '--openSeamPageSize') {
      input.openSeamPageSize = parsePositiveInteger(requireValue(rest, index, key), key);
      index += 1;
      continue;
    }
    if (key === '--cursor') {
      input.cursor = parseCursor(requireValue(rest, index, key));
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument '${key}'. ${usage()}`);
  }
  applyProjectRootShortcut(input, projectRootDir);
  validateInvocationInput(command, input);
  return { command, input, outputMode };
}

function parseOutputMode(value: string, key: string): DevInvokeOutputMode {
  if (value === 'json' || value === 'text') {
    return value;
  }
  throw new Error(`${key} expects json or text.`);
}

function validateInvocationInput(command: string, input: Record<string, unknown>): void {
  if (command === 'router-overview' && input.page != null) {
    throw new Error('router-overview uses --rowPageSize because it samples multiple row families; use app-query with a specific router query kind when you need cursor paging.');
  }
}

function applyProjectRootShortcut(input: Record<string, unknown>, projectRootDir: string | null): void {
  if (projectRootDir == null) {
    return;
  }
  if (input.projects != null) {
    throw new Error('--projectRootDir cannot be combined with projects supplied through --input.');
  }
  input.projects = [
    {
      rootDir: projectRootDir,
      ...(typeof input.projectKey === 'string' ? { projectKey: input.projectKey } : {}),
    },
  ];
}

function parseCursor(raw: string): { filePath: string; line: number; character: number; offset?: number } {
  const parts = raw.split(':');
  const trailingNumbers: string[] = [];
  while (parts.length > 0 && trailingNumbers.length < 3) {
    const value = parts.at(-1);
    if (value == null || !/^\d+$/.test(value)) {
      break;
    }
    trailingNumbers.unshift(value);
    parts.pop();
  }
  if (trailingNumbers.length < 2 || parts.length === 0) {
    throw new Error(`Cursor must use file:line:character[:offset], received '${raw}'.`);
  }
  const filePath = parts.join(':');
  const [line, character, offset] = trailingNumbers.length === 3
    ? trailingNumbers
    : [trailingNumbers[0], trailingNumbers[1], undefined];
  return {
    filePath,
    line: Number.parseInt(line ?? '', 10),
    character: Number.parseInt(character ?? '', 10),
    ...(offset == null ? {} : { offset: Number.parseInt(offset, 10) }),
  };
}

function normalizeInvocationPaths(input: Record<string, unknown>): void {
  if (typeof input.workspaceRoot === 'string') {
    input.workspaceRoot = resolveFromInvocationCwd(input.workspaceRoot);
  }
}

function resolveFromInvocationCwd(value: string): string {
  return path.isAbsolute(value)
    ? value
    : path.resolve(process.env.INIT_CWD ?? process.cwd(), value);
}

function requireValue(args: readonly string[], index: number, key: string): string {
  const value = args[index + 1];
  if (value == null) {
    throw new Error(`Missing value for ${key}.`);
  }
  return value;
}

function readBooleanOption(
  args: readonly string[],
  index: number,
  key: string,
): { value: boolean; nextIndex: number } {
  const value = args[index + 1];
  if (value == null || value.startsWith('--')) {
    return { value: true, nextIndex: index };
  }
  return { value: parseBoolean(value, key), nextIndex: index + 1 };
}

function usage(): string {
  return [
    'Usage: pnpm --filter @aurelia-ls/mcp dev:invoke -- <command> --workspaceRoot <path> [options]',
    'Commands: workspace-overview, analysis-cache-overview, clear-analysis-cache, authoring-catalog, app-building-guidance, authoring-recipe-plan, app-query-catalog, app-overview, router-overview, app-query, app-query-batch, authoring-orientation, open-seam-overview, diagnostic-overview, app-diagnostics, template-cursor-info, template-completions, template-diagnostics',
    'Public tool names such as aurelia_app_building_guidance and aurelia_authoring_recipe_plan are accepted as aliases.',
    'Use --text or --output text to print the same compact text returned through MCP content; JSON remains the default for structured inspection.',
    'Use --input <json> or a positional JSON object for full adapter input, plus common flags such as --projectKey, --projectRootDir, --projectDiscovery, --analysisDepth, --includeText [true|false], --includeAuthoringTemplates [true|false], --includeAuthoringOrientation [true|false], --includeKernelBreakdowns [true|false], --includeDetailDensity [true|false], --includeQueryClaimRows [true|false], --includeAppProfile [true|false], --includeAppQueryClaimProfiles [true|false], --typeSystemDependencyCacheClearPolicy, --focus, --featureGoal, --recipeLimit, --principleLimit, --decisionLimit, --group, --queryKind, --sourceFile, --sourceFilePath, --recipeSourceFile, --sourceFilePaths <comma-separated paths>, --sourceTextRequestHintKey <hint>, --sourceParameterValue key=value, --sourceParameterValues <json-array or semicolon-separated key=value list>, --cursor file:line:character[:offset], --diagnosticProjection, --appRetention, --effectDetail, --usage, --pageSize/--page.size, --pageCursor/--page.cursor, --projectPageSize/--projectPage.size, --projectPageCursor/--projectPage.cursor, --rowPageSize, and --rowLimit.',
  ].join('\n');
}

function looksLikeJsonObject(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith('{') && trimmed.endsWith('}');
}

function parseJsonInput(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value);
  if (parsed == null || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('JSON input must be an object.');
  }
  return parsed as Record<string, unknown>;
}

function addStringListValue(input: Record<string, unknown>, key: string, value: string): void {
  const existing = input[key];
  if (Array.isArray(existing)) {
    existing.push(value);
    return;
  }
  input[key] = [value];
}

function addStringListValues(input: Record<string, unknown>, key: string, value: string): void {
  // PowerShell can hand pnpm an unquoted comma-separated path list as one space-joined token.
  // Recipe source paths are repo-relative and should not contain spaces, so accept both separators here.
  for (const part of value.split(/[,\s]+/u)) {
    const trimmed = part.trim();
    if (trimmed !== '') {
      addStringListValue(input, key, trimmed);
    }
  }
}

function addSourceParameterValues(
  input: Record<string, unknown>,
  values: readonly { readonly key: string; readonly value: string }[],
): void {
  const existing = input.sourceParameterValues;
  if (Array.isArray(existing)) {
    existing.push(...values);
    return;
  }
  input.sourceParameterValues = [...values];
}

function parseSourceParameterValues(
  value: string,
  key: string,
): readonly { readonly key: string; readonly value: string }[] {
  const trimmed = value.trim();
  if (trimmed.startsWith('[')) {
    return parseSourceParameterValuesJson(trimmed, key);
  }
  return trimmed
    .split(/[\r\n;]+/u)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => parseSourceParameterAssignment(part, key));
}

function parseSourceParameterValuesJson(
  value: string,
  key: string,
): readonly { readonly key: string; readonly value: string }[] {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) {
    throw new Error(`${key} JSON must be an array of { key, value } objects.`);
  }
  return parsed.map((row, index) => {
    if (row == null || Array.isArray(row) || typeof row !== 'object') {
      throw new Error(`${key}[${index}] must be an object.`);
    }
    const candidate = row as { readonly key?: unknown; readonly value?: unknown };
    if (typeof candidate.key !== 'string' || typeof candidate.value !== 'string') {
      throw new Error(`${key}[${index}] must contain string key and value fields.`);
    }
    return normalizeSourceParameterValue(candidate.key, candidate.value, `${key}[${index}]`);
  });
}

function parseSourceParameterAssignment(
  value: string,
  key: string,
): { readonly key: string; readonly value: string } {
  const separatorIndex = value.indexOf('=');
  if (separatorIndex <= 0) {
    throw new Error(`${key} expects key=value.`);
  }
  return normalizeSourceParameterValue(
    value.slice(0, separatorIndex),
    value.slice(separatorIndex + 1),
    key,
  );
}

function normalizeSourceParameterValue(
  rawKey: string,
  rawValue: string,
  source: string,
): { readonly key: string; readonly value: string } {
  const parameterKey = rawKey.trim();
  const parameterValue = rawValue.trim();
  if (parameterKey.length === 0 || parameterValue.length === 0) {
    throw new Error(`${source} must contain a non-empty key and value.`);
  }
  return {
    key: parameterKey,
    value: parameterValue,
  };
}

function parseBoolean(value: string, key: string): boolean {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  throw new Error(`${key} expects true or false.`);
}

function parsePositiveInteger(value: string, key: string): number {
  const parsed = /^\d+$/.test(value) ? Number.parseInt(value, 10) : Number.NaN;
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }
  throw new Error(`${key} expects a positive integer.`);
}

function parseNonNegativeInteger(value: string, key: string): number {
  const parsed = /^\d+$/.test(value) ? Number.parseInt(value, 10) : Number.NaN;
  if (Number.isInteger(parsed) && parsed >= 0) {
    return parsed;
  }
  throw new Error(`${key} expects a non-negative integer.`);
}

function serializeError(error: unknown): { name: string; message: string } {
  if (error instanceof z.ZodError) {
    return {
      name: 'ZodError',
      message: formatZodError(error),
    };
  }
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

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length === 0 ? 'input' : issue.path.join('.');
      if (issue.code === 'invalid_value') {
        if (path === 'queryKind') {
          return 'queryKind: unsupported query kind; run app-query-catalog for supported values.';
        }
        if (path === 'projectDiscovery') {
          return 'projectDiscovery: unsupported mode; use single-root or package-tsconfig.';
        }
        if (path === 'analysisDepth') {
          return 'analysisDepth: unsupported depth; use runtime-topology, binding-targets, or binding-observation.';
        }
        if (path === 'detail') {
          return 'detail: unsupported projection detail; use compact or handles.';
        }
        if (path === 'diagnosticProjection') {
          return 'diagnosticProjection: unsupported policy; use available-products or type-projection.';
        }
        if (path === 'appRetention') {
          return 'appRetention: unsupported policy; use profile-default, retain-app, or dispose-app.';
        }
        if (path === 'catalogView') {
          return 'catalogView: unsupported view; use overview, operations, recipes, or full.';
        }
        if (path === 'recipeKey') {
          return 'recipeKey: unsupported recipe; run authoring-catalog --catalogView recipes for supported values.';
        }
        return `${path}: invalid value.`;
      }
      if (issue.code === 'unrecognized_keys') {
        return `${path}: unrecognized key(s) ${issue.keys.join(', ')}.`;
      }
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}
