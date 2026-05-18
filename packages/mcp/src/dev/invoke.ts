#!/usr/bin/env node
import path from 'node:path';
import { z } from 'zod/v4';
import { AureliaMcpSemanticRuntimeAdapter } from '../runtime-adapter.js';
import {
  appDiagnosticsInputSchema,
  appOverviewInputSchema,
  appQueryCatalogInputSchema,
  appQueryBatchInputSchema,
  appQueryInputSchema,
  analysisCacheOverviewInputSchema,
  authoringCatalogInputSchema,
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
import type {
  AureliaMcpAppDiagnosticsInput,
  AureliaMcpAppOverviewInput,
  AureliaMcpAppQueryBatchInput,
  AureliaMcpAppQueryInput,
  AureliaMcpAppQueryCatalogInput,
  AureliaMcpAnalysisCacheOverviewInput,
  AureliaMcpAuthoringCatalogInput,
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

const adapter = new AureliaMcpSemanticRuntimeAdapter();
const rawArgs = process.argv.slice(2);
if (rawArgs.length === 0 || rawArgs[0] === '--help' || rawArgs[0] === '-h') {
  process.stdout.write(`${usage()}\n`);
  process.exit(0);
}
try {
  const { command, input } = parseInvocation(rawArgs);
  normalizeInvocationPaths(input);
  const result = await invoke(command, validateCommandInput(command, input));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
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

function parseInvocation(args: readonly string[]): { command: string; input: Record<string, unknown> } {
  const [command, ...rest] = args;
  if (command == null || command === '--help' || command === '-h') {
    throw new Error(usage());
  }
  const input: Record<string, unknown> = {};
  let projectRootDir: string | null = null;
  for (let index = 0; index < rest.length; index += 1) {
    const key = rest[index];
    if (key === '--input') {
      const raw = requireValue(rest, index, key);
      Object.assign(input, JSON.parse(raw));
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
      input.includeText = parseBoolean(requireValue(rest, index, key), key);
      index += 1;
      continue;
    }
    if (key === '--includeKernelBreakdowns') {
      input.includeKernelBreakdowns = parseBoolean(requireValue(rest, index, key), key);
      index += 1;
      continue;
    }
    if (key === '--includeDetailDensity') {
      input.includeDetailDensity = parseBoolean(requireValue(rest, index, key), key);
      index += 1;
      continue;
    }
    if (key === '--includeQueryClaimRows') {
      input.includeQueryClaimRows = parseBoolean(requireValue(rest, index, key), key);
      index += 1;
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
      input.includeAuthoringTemplates = parseBoolean(requireValue(rest, index, key), key);
      index += 1;
      continue;
    }
    if (key === '--includeAuthoringOrientation') {
      input.includeAuthoringOrientation = parseBoolean(requireValue(rest, index, key), key);
      index += 1;
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
    if (key === '--pageSize') {
      input.page = {
        ...(typeof input.page === 'object' && input.page != null ? input.page : {}),
        size: Number.parseInt(requireValue(rest, index, key), 10),
      };
      index += 1;
      continue;
    }
    if (key === '--pageCursor') {
      input.page = {
        ...(typeof input.page === 'object' && input.page != null ? input.page : {}),
        cursor: requireValue(rest, index, key),
      };
      index += 1;
      continue;
    }
    if (key === '--projectPageSize') {
      input.projectPage = {
        ...(typeof input.projectPage === 'object' && input.projectPage != null ? input.projectPage : {}),
        size: parseNonNegativeInteger(requireValue(rest, index, key), key),
      };
      index += 1;
      continue;
    }
    if (key === '--projectPageCursor') {
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
  return { command, input };
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

function usage(): string {
  return [
    'Usage: pnpm --filter @aurelia-ls/mcp dev:invoke -- <command> --workspaceRoot <path> [options]',
    'Commands: workspace-overview, analysis-cache-overview, clear-analysis-cache, authoring-catalog, authoring-recipe-plan, app-query-catalog, app-overview, router-overview, app-query, app-query-batch, authoring-orientation, open-seam-overview, diagnostic-overview, app-diagnostics, template-cursor-info, template-completions, template-diagnostics',
    'Use --input <json> for full adapter input, or common flags such as --projectKey, --projectRootDir, --projectDiscovery, --analysisDepth, --includeAuthoringTemplates, --includeAuthoringOrientation, --includeKernelBreakdowns, --includeDetailDensity, --includeQueryClaimRows, --typeSystemDependencyCacheClearPolicy, --group, --queryKind, --sourceFile, --cursor file:line:character[:offset], --diagnosticProjection, --appRetention, --pageSize, --pageCursor, --projectPageSize, --projectPageCursor, --rowPageSize, and --rowLimit.',
  ].join('\n');
}

function addStringListValue(input: Record<string, unknown>, key: string, value: string): void {
  const existing = input[key];
  if (Array.isArray(existing)) {
    existing.push(value);
    return;
  }
  input[key] = [value];
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
