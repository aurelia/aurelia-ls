import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { z, type ZodRawShape } from 'zod/v4';
import {
  aureliaPatternExamples,
  fetchAureliaDocs,
  getAureliaPatternExample,
  searchAureliaPatternMenuItems,
  searchAureliaDocs,
  type AureliaDocsFetchResult,
  type AureliaDocsSearchResult,
} from '@aurelia-ls/patterns';
import { readAureliaDocsCorpusForMcp } from './docs-runtime.js';
import { AureliaMcpSemanticRuntimeAdapter } from './runtime-adapter.js';
import { aureliaMcpErrorResult } from './tool-errors.js';
import {
  appDiagnosticsInputSchema,
  appOverviewInputSchema,
  appQueryCatalogInputSchema,
  appQueryBatchInputSchema,
  appQueryInputSchema,
  analysisCacheOverviewInputSchema,
  aureliaMcpResponseOutputSchema,
  clearAnalysisCacheInputSchema,
  diagnosticOverviewInputSchema,
  docsFetchInputSchema,
  docsSearchInputSchema,
  openSeamOverviewInputSchema,
  patternExampleInputSchema,
  patternMenuInputSchema,
  projectConfigurationsInputSchema,
  routerOverviewInputSchema,
  templateCompletionsInputSchema,
  templateCursorInfoInputSchema,
  templateDiagnosticsInputSchema,
  workspaceOverviewInputSchema,
} from './tool-schemas.js';
import {
  aureliaMcpToolNames,
  type AureliaMcpAnalysisCacheOverviewInput,
  type AureliaMcpAppDiagnosticsInput,
  type AureliaMcpAppOverviewInput,
  type AureliaMcpAppQueryBatchInput,
  type AureliaMcpAppQueryInput,
  type AureliaMcpAppQueryCatalogInput,
  type AureliaMcpClearAnalysisCacheInput,
  type AureliaMcpDiagnosticOverviewInput,
  type AureliaMcpDocsFetchInput,
  type AureliaMcpDocsSearchInput,
  type AureliaMcpOpenSeamOverviewInput,
  type AureliaMcpPatternExampleInput,
  type AureliaMcpPatternMenuInput,
  type AureliaMcpProjectConfigurationsInput,
  type AureliaMcpResponse,
  type AureliaMcpRouterOverviewInput,
  type AureliaMcpTemplateCompletionsInput,
  type AureliaMcpTemplateCursorInput,
  type AureliaMcpTemplateDiagnosticsInput,
  type AureliaMcpWorkspaceOverviewInput,
} from './tool-contracts.js';
import { AURELIA_MCP_ORIENTATION_RESOURCE_URI } from './orientation.js';
import { aureliaMcpResultText, isRecord } from './result-text.js';

const readOnlyClosedWorldToolAnnotations: ToolAnnotations = {
  readOnlyHint: true,
  openWorldHint: false,
};

const cacheManagementToolAnnotations: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

function strictInputSchema<TShape extends ZodRawShape>(shape: TShape) {
  return z.object(shape).strict();
}

export function registerAureliaSemanticRuntimeTools(
  server: McpServer,
  adapter = new AureliaMcpSemanticRuntimeAdapter(),
): void {
  server.registerTool(
    aureliaMcpToolNames.workspaceOverview,
    {
      title: 'Aurelia Workspace Overview',
      description: 'Boot a workspace through semantic-runtime and summarize discovered projects, app candidates, and paged project rows.',
      inputSchema: strictInputSchema(workspaceOverviewInputSchema),
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    async (input) => toolResultFrom(() => adapter.workspaceOverview(
      input as AureliaMcpWorkspaceOverviewInput,
      projectAureliaMcpToolResult,
    )),
  );

  server.registerTool(
    aureliaMcpToolNames.projectConfigurations,
    {
      title: 'Aurelia Project Configurations',
      description: 'Return native aurelia.project.json inventory/applied exclusions or exact diagnostic rows without opening an Aurelia app world, with optional project/path filters and paging.',
      inputSchema: strictInputSchema(projectConfigurationsInputSchema),
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    async (input) => toolResultFrom(() => adapter.projectConfigurations(
      input as AureliaMcpProjectConfigurationsInput,
      projectAureliaMcpToolResult,
    )),
  );

  server.registerTool(
    aureliaMcpToolNames.clearAnalysisCache,
    {
      title: 'Aurelia Clear Analysis Cache',
      description: 'Reclaim session-local retained semantic analysis when memory pressure outweighs warm reuse; dependency SourceFile policy is process-global even with a workspace selector, and managed sessions reconcile edits automatically.',
      inputSchema: strictInputSchema(clearAnalysisCacheInputSchema),
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: cacheManagementToolAnnotations,
    },
    async (input) => toolResultFrom(() => adapter.clearAnalysisCache(
      input as AureliaMcpClearAnalysisCacheInput,
      projectAureliaMcpToolResult,
    )),
  );

  server.registerTool(
    aureliaMcpToolNames.analysisCacheOverview,
    {
      title: 'Aurelia Analysis Cache Overview',
      description: 'Summarize managed semantic workspace retention plus process-global dependency-cache and memory telemetry.',
      inputSchema: strictInputSchema(analysisCacheOverviewInputSchema),
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    async (input) => toolResultFrom(() => adapter.analysisCacheOverview(
      input as AureliaMcpAnalysisCacheOverviewInput,
      projectAureliaMcpToolResult,
    )),
  );

  server.registerTool(
    aureliaMcpToolNames.appQueryCatalog,
    {
      title: 'Aurelia App Query Catalog',
      description: 'Return supported semantic-runtime app query kinds and their locus/paging/detail affordances, optionally filtered by group or queryKind.',
      inputSchema: strictInputSchema(appQueryCatalogInputSchema),
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    async (input) => jsonResultFrom(() => adapter.appQueryCatalog(input as AureliaMcpAppQueryCatalogInput)),
  );

  server.registerTool(
    aureliaMcpToolNames.patternMenu,
    {
      title: 'Aurelia Pattern Menu',
      description: 'Search the compact Aurelia Patterns menu for curated examples you can fetch by stable patternId.',
      inputSchema: strictInputSchema(patternMenuInputSchema),
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    (input) => jsonResultFrom(() => patternMenu(input)),
  );

  server.registerTool(
    aureliaMcpToolNames.patternExample,
    {
      title: 'Aurelia Pattern Example',
      description: 'Fetch one curated Aurelia pattern example by stable patternId, including guidance, source files, assumptions, handoff notes, semantic-runtime follow-up hints, and stable docs refs.',
      inputSchema: strictInputSchema(patternExampleInputSchema),
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    (input) => jsonResultFrom(() => patternExample(input)),
  );

  server.registerTool(
    aureliaMcpToolNames.docsSearch,
    {
      title: 'Aurelia Docs Search',
      description: 'Search the bundled Aurelia docs corpus with compact section-level results; use aurelia_docs_fetch to fetch a returned documentPath and optional sectionAnchor.',
      inputSchema: strictInputSchema(docsSearchInputSchema),
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    (input) => jsonResultFrom(() => docsSearch(input)),
  );

  server.registerTool(
    aureliaMcpToolNames.docsFetch,
    {
      title: 'Aurelia Docs Fetch',
      description: 'Fetch a compact bundled Aurelia docs page or section by documentPath and optional sectionAnchor returned from aurelia_docs_search.',
      inputSchema: strictInputSchema(docsFetchInputSchema),
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    (input) => jsonResultFrom(() => docsFetch(input)),
  );

  server.registerTool(
    aureliaMcpToolNames.appOverview,
    {
      title: 'Aurelia App Overview',
      description: 'Open an Aurelia app and return compact summary, topology, diagnostics, and open seams.',
      inputSchema: strictInputSchema(appOverviewInputSchema),
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    async (input) => toolResultFrom(() => adapter.appOverview(
      input as AureliaMcpAppOverviewInput,
      projectAureliaMcpToolResult,
    )),
  );

  server.registerTool(
    aureliaMcpToolNames.routerOverview,
    {
      title: 'Aurelia Router Overview',
      description: 'Open an Aurelia app and summarize route, route-context, viewport, route-tree, navigation, and router-issue row families; pass rowPageSize for samples.',
      inputSchema: strictInputSchema(routerOverviewInputSchema),
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    async (input) => toolResultFrom(() => adapter.routerOverview(
      input as AureliaMcpRouterOverviewInput,
      projectAureliaMcpToolResult,
    )),
  );

  server.registerTool(
    aureliaMcpToolNames.appQuery,
    {
      title: 'Aurelia App Query',
      description: 'Forward a semantic-runtime app query kind against an opened Aurelia app, including focused drill-downs such as typescript-diagnostics after a diagnostic overview cluster.',
      inputSchema: strictInputSchema(appQueryInputSchema),
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    async (input) => toolResultFrom(() => adapter.appQuery(
      input as AureliaMcpAppQueryInput,
      projectAureliaMcpToolResult,
    )),
  );

  server.registerTool(
    aureliaMcpToolNames.appQueryBatch,
    {
      title: 'Aurelia App Query Batch',
      description: 'Forward several semantic-runtime app query kinds through one opened Aurelia app and one query-claim disposal boundary, including diagnostics plus focused TypeScript drill-downs.',
      inputSchema: strictInputSchema(appQueryBatchInputSchema),
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    async (input) => toolResultFrom(() => adapter.appQueryBatch(
      input as AureliaMcpAppQueryBatchInput,
      projectAureliaMcpToolResult,
    )),
  );

  server.registerTool(
    aureliaMcpToolNames.openSeamOverview,
    {
      title: 'Aurelia Open Seam Overview',
      description: 'Group open semantic seams by unique authored source site while preserving raw derivation counts and causal facets. Use generic open-seam-summary or open-seams app queries for causal clusters or raw rows.',
      inputSchema: strictInputSchema(openSeamOverviewInputSchema),
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    async (input) => toolResultFrom(() => adapter.openSeamOverview(
      input as AureliaMcpOpenSeamOverviewInput,
      projectAureliaMcpToolResult,
    )),
  );

  server.registerTool(
    aureliaMcpToolNames.diagnosticOverview,
    {
      title: 'Aurelia Diagnostic Overview',
      description: 'Group app diagnostics, including ordinary TypeScript project diagnostics, by domain, kind, authority, severity, framework code, and owning query. Use this after lint, formatter, or autofix tools before declaring an app clean.',
      inputSchema: strictInputSchema(diagnosticOverviewInputSchema),
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    async (input) => toolResultFrom(() => adapter.diagnosticOverview(
      input as AureliaMcpDiagnosticOverviewInput,
      projectAureliaMcpToolResult,
    )),
  );

  server.registerTool(
    aureliaMcpToolNames.appDiagnostics,
    {
      title: 'Aurelia App Diagnostics',
      description: 'Read semantic-runtime diagnostics for an app or source file, including ordinary TypeScript project diagnostics unless diagnosticProjection=available-products. Use after source-changing tools when exact rows are needed.',
      inputSchema: strictInputSchema(appDiagnosticsInputSchema),
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    async (input) => toolResultFrom(() => adapter.appDiagnostics(
      input as AureliaMcpAppDiagnosticsInput,
      projectAureliaMcpToolResult,
    )),
  );

  server.registerTool(
    aureliaMcpToolNames.templateCursorInfo,
    {
      title: 'Aurelia Template Cursor Info',
      description: 'Read the semantic template site, selected resource/member, and cursor diagnostics at a source cursor. Place the cursor on the member token when you need expression-member owner type answers.',
      inputSchema: strictInputSchema(templateCursorInfoInputSchema),
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    async (input) => toolResultFrom(() => adapter.templateCursorInfo(
      input as AureliaMcpTemplateCursorInput,
      projectAureliaMcpToolResult,
    )),
  );

  server.registerTool(
    aureliaMcpToolNames.templateCompletions,
    {
      title: 'Aurelia Template Completions',
      description: 'Read semantic-runtime template completion candidates at a source cursor.',
      inputSchema: strictInputSchema(templateCompletionsInputSchema),
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    async (input) => toolResultFrom(() => adapter.templateCompletions(
      input as AureliaMcpTemplateCompletionsInput,
      projectAureliaMcpToolResult,
    )),
  );

  server.registerTool(
    aureliaMcpToolNames.templateDiagnostics,
    {
      title: 'Aurelia Template Diagnostics',
      description: 'Read template diagnostics for a source file or opened app.',
      inputSchema: strictInputSchema(templateDiagnosticsInputSchema),
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    async (input) => toolResultFrom(() => adapter.templateDiagnostics(
      input as AureliaMcpTemplateDiagnosticsInput,
      projectAureliaMcpToolResult,
    )),
  );
}

async function jsonResultFrom(read: () => unknown) {
  return toolResultFrom(async () => projectAureliaMcpToolResult(await read()));
}

async function toolResultFrom<TResult>(read: () => Promise<TResult>) {
  try {
    return await read();
  } catch (error) {
    return aureliaMcpErrorResult(error);
  }
}

export function projectAureliaMcpToolResult(value: unknown) {
  const detached = jsonDetachedValue(value);
  return {
    structuredContent: structuredContent(detached),
    content: [
      {
        type: 'text' as const,
        text: aureliaMcpResultText(detached),
      },
      ...resourceLinksForResult(detached),
    ],
  };
}

function resourceLinksForResult(value: unknown) {
  if (!isRecord(value) || typeof value.tool !== 'string') {
    return [];
  }
  switch (value.tool) {
    case aureliaMcpToolNames.workspaceOverview:
    case aureliaMcpToolNames.appOverview:
      return [
        semanticRuntimeResourceLink('orientation'),
        semanticRuntimeResourceLink('app-queries'),
      ];
    case aureliaMcpToolNames.projectConfigurations:
      return [
        semanticRuntimeResourceLink('orientation'),
      ];
    case aureliaMcpToolNames.appQuery:
      return [
        semanticRuntimeResourceLink('app-queries'),
      ];
    case aureliaMcpToolNames.appQueryCatalog:
      return [
        semanticRuntimeResourceLink('app-queries'),
      ];
    case aureliaMcpToolNames.patternMenu:
    case aureliaMcpToolNames.patternExample:
      return [
        semanticRuntimeResourceLink('patterns'),
      ];
    case aureliaMcpToolNames.docsSearch:
    case aureliaMcpToolNames.docsFetch:
      return [
        semanticRuntimeResourceLink('docs'),
      ];
    default:
      return [];
  }
}

function semanticRuntimeResourceLink(view: 'orientation' | 'app-queries' | 'patterns' | 'docs') {
  if (view === 'orientation') {
    return {
      type: 'resource_link' as const,
      uri: AURELIA_MCP_ORIENTATION_RESOURCE_URI,
      name: 'Aurelia MCP Orientation',
      mimeType: 'text/markdown',
      description: 'Golden-path orientation for fresh Aurelia MCP sessions.',
    };
  }
  const isPatterns = view === 'patterns';
  const isDocs = view === 'docs';
  return {
    type: 'resource_link' as const,
    uri: isPatterns ? 'aurelia://patterns/menu' : isDocs ? 'aurelia://docs/index' : `aurelia://semantic-runtime/${view}`,
    name: isPatterns ? 'Aurelia Pattern Menu' : isDocs ? 'Aurelia Docs Index' : 'Aurelia App Query Catalog',
    mimeType: 'application/json',
    description: isPatterns
      ? 'Curated Aurelia Patterns menu rows fetchable by stable patternId; examples include support.followUp semantic-runtime hints.'
      : isDocs
        ? 'Bundled Aurelia docs corpus summary; search and fetch through aurelia_docs_search and aurelia_docs_fetch.'
      : 'Supported semantic-runtime app query kinds and their locus, paging, detail, and router-product affordances.',
  };
}

function patternMenu(input: AureliaMcpPatternMenuInput): AureliaMcpResponse<{
  readonly items: ReturnType<typeof searchAureliaPatternMenuItems>;
}> {
  const items = searchAureliaPatternMenuItems(input.query);
  return localToolResponse(aureliaMcpToolNames.patternMenu, { items });
}

function patternExample(input: AureliaMcpPatternExampleInput): AureliaMcpResponse<unknown> {
  const pattern = getAureliaPatternExample(input.patternId);
  if (pattern === undefined) {
    const supported = aureliaPatternExamples.map((candidate) => candidate.patternId).join(', ');
    throw new Error(`Unknown Aurelia patternId '${input.patternId}'. Use aurelia_pattern_menu first. Available patternId values: ${supported}`);
  }
  return localToolResponse(aureliaMcpToolNames.patternExample, pattern);
}

function docsSearch(input: AureliaMcpDocsSearchInput): AureliaMcpResponse<AureliaDocsSearchResult & { readonly displayText: string }> {
  const result = searchAureliaDocs(readAureliaDocsCorpusForMcp(), input);
  return localToolResponse(aureliaMcpToolNames.docsSearch, {
    ...result,
    displayText: docsSearchDisplayText(result),
  });
}

function docsFetch(input: AureliaMcpDocsFetchInput): AureliaMcpResponse<AureliaDocsFetchResult & { readonly displayText: string }> {
  const result = fetchAureliaDocs(readAureliaDocsCorpusForMcp(), input);
  return localToolResponse(aureliaMcpToolNames.docsFetch, {
    ...result,
    displayText: docsFetchDisplayText(result),
  });
}

function localToolResponse<TValue>(tool: string, value: TValue): AureliaMcpResponse<TValue> {
  return {
    tool,
    generatedAt: new Date().toISOString(),
    workspaceRoot: null,
    workspaceDescriptor: null,
    value,
  };
}

function docsSearchDisplayText(result: AureliaDocsSearchResult): string {
  if (result.items.length === 0 && result.page.size === 0) {
    return `Docs search for "${result.query}" returned no rows because page.size=0.`;
  }
  if (result.items.length === 0) {
    return `No bundled Aurelia docs results for "${result.query}".`;
  }
  const rows = result.items
    .slice(0, 5)
    .map((item) => `${item.documentPath}${item.sectionAnchor === undefined ? '' : `#${item.sectionAnchor}`}: ${item.heading ?? item.title}`);
  const next = result.page.nextCursor === undefined ? '' : ` nextCursor=${result.page.nextCursor}.`;
  return `Docs results for "${result.query}": ${rows.join(' | ')}.${next}`;
}

function docsFetchDisplayText(result: AureliaDocsFetchResult): string {
  const sectionRows = result.sections
    .slice(0, 3)
    .map((section) => section.heading ?? result.title);
  const cautions = result.cautions.length === 0 ? '' : ` Caution: ${result.cautions.join(' ')}`;
  return `Fetched ${result.mode} docs for ${result.documentPath}: ${sectionRows.join(' | ') || result.title}.${result.truncated ? ' Truncated.' : ''}${cautions}`;
}

function structuredContent(value: unknown): Record<string, unknown> {
  if (value != null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return { value };
}

function jsonDetachedValue(value: unknown): unknown {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new TypeError('Aurelia MCP tool results must be JSON-serializable values.');
  }
  return JSON.parse(serialized) as unknown;
}
