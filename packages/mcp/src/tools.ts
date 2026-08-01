import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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
    async (input) => jsonResultFrom(() => adapter.workspaceOverview(input as AureliaMcpWorkspaceOverviewInput)),
  );

  server.registerTool(
    aureliaMcpToolNames.clearAnalysisCache,
    {
      title: 'Aurelia Clear Analysis Cache',
      description: 'Clear semantic-runtime sessions cached inside this MCP server process after source edits or rebuilds.',
      inputSchema: strictInputSchema(clearAnalysisCacheInputSchema),
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: cacheManagementToolAnnotations,
    },
    async (input) => jsonResultFrom(() => adapter.clearAnalysisCache(input as AureliaMcpClearAnalysisCacheInput)),
  );

  server.registerTool(
    aureliaMcpToolNames.analysisCacheOverview,
    {
      title: 'Aurelia Analysis Cache Overview',
      description: 'Summarize semantic-runtime analysis sessions currently cached inside this MCP server process.',
      inputSchema: strictInputSchema(analysisCacheOverviewInputSchema),
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    async (input) => jsonResultFrom(() => adapter.analysisCacheOverview(input as AureliaMcpAnalysisCacheOverviewInput)),
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
    async (input) => jsonResultFrom(async () => patternMenu(input as AureliaMcpPatternMenuInput)),
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
    async (input) => jsonResultFrom(async () => patternExample(input as AureliaMcpPatternExampleInput)),
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
    async (input) => jsonResultFrom(async () => docsSearch(input as AureliaMcpDocsSearchInput)),
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
    async (input) => jsonResultFrom(async () => docsFetch(input as AureliaMcpDocsFetchInput)),
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
    async (input) => jsonResultFrom(() => adapter.appOverview(input as AureliaMcpAppOverviewInput)),
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
    async (input) => jsonResultFrom(() => adapter.routerOverview(input as AureliaMcpRouterOverviewInput)),
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
    async (input) => jsonResultFrom(() => adapter.appQuery(input as AureliaMcpAppQueryInput)),
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
    async (input) => jsonResultFrom(() => adapter.appQueryBatch(input as AureliaMcpAppQueryBatchInput)),
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
    async (input) => jsonResultFrom(() => adapter.openSeamOverview(input as AureliaMcpOpenSeamOverviewInput)),
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
    async (input) => jsonResultFrom(() => adapter.diagnosticOverview(input as AureliaMcpDiagnosticOverviewInput)),
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
    async (input) => jsonResultFrom(() => adapter.appDiagnostics(input as AureliaMcpAppDiagnosticsInput)),
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
    async (input) => jsonResultFrom(() => adapter.templateCursorInfo(input as AureliaMcpTemplateCursorInput)),
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
    async (input) => jsonResultFrom(() => adapter.templateCompletions(input as AureliaMcpTemplateCompletionsInput)),
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
    async (input) => jsonResultFrom(() => adapter.templateDiagnostics(input as AureliaMcpTemplateDiagnosticsInput)),
  );
}

async function jsonResultFrom(read: () => Promise<unknown>) {
  try {
    return jsonResult(await read());
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ error: serializeError(error) }, null, 2),
        },
      ],
    };
  }
}

function jsonResult(value: unknown) {
  return {
    structuredContent: structuredContent(value),
    content: [
      {
        type: 'text' as const,
        text: aureliaMcpResultText(value),
      },
      ...resourceLinksForResult(value),
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
