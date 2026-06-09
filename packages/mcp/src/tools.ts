import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { AureliaMcpSemanticRuntimeAdapter } from './runtime-adapter.js';
import {
  appDiagnosticsInputSchema,
  appBuilderCatalogInputSchema,
  appBuilderQueryInputSchema,
  appOverviewInputSchema,
  appQueryCatalogInputSchema,
  appQueryBatchInputSchema,
  appQueryInputSchema,
  analysisCacheOverviewInputSchema,
  aureliaMcpResponseOutputSchema,
  clearAnalysisCacheInputSchema,
  diagnosticOverviewInputSchema,
  openSeamOverviewInputSchema,
  routerOverviewInputSchema,
  templateCursorInputSchema,
  templateDiagnosticsInputSchema,
  workspaceOverviewInputSchema,
} from './tool-schemas.js';
import {
  aureliaMcpToolNames,
  type AureliaMcpAnalysisCacheOverviewInput,
  type AureliaMcpAppBuilderCatalogInput,
  type AureliaMcpAppBuilderQueryInput,
  type AureliaMcpAppDiagnosticsInput,
  type AureliaMcpAppOverviewInput,
  type AureliaMcpAppQueryBatchInput,
  type AureliaMcpAppQueryInput,
  type AureliaMcpAppQueryCatalogInput,
  type AureliaMcpClearAnalysisCacheInput,
  type AureliaMcpDiagnosticOverviewInput,
  type AureliaMcpOpenSeamOverviewInput,
  type AureliaMcpRouterOverviewInput,
  type AureliaMcpTemplateCursorInput,
  type AureliaMcpTemplateDiagnosticsInput,
  type AureliaMcpWorkspaceOverviewInput,
} from './tool-contracts.js';
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

export function registerAureliaSemanticRuntimeTools(
  server: McpServer,
  adapter = new AureliaMcpSemanticRuntimeAdapter(),
): void {
  server.registerTool(
    aureliaMcpToolNames.workspaceOverview,
    {
      title: 'Aurelia Workspace Overview',
      description: 'Boot a workspace through semantic-runtime and summarize discovered projects, app candidates, and paged project rows.',
      inputSchema: workspaceOverviewInputSchema,
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
      inputSchema: clearAnalysisCacheInputSchema,
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
      inputSchema: analysisCacheOverviewInputSchema,
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
      inputSchema: appQueryCatalogInputSchema,
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    async (input) => jsonResultFrom(() => adapter.appQueryCatalog(input as AureliaMcpAppQueryCatalogInput)),
  );

  server.registerTool(
    aureliaMcpToolNames.appBuilderCatalog,
    {
      title: 'Aurelia App Builder Catalog',
      description: 'Return supported semantic-runtime app-builder query kinds for app-builder ontology, recommendation policy, input readiness, source lowering, and reusable part source lowering.',
      inputSchema: appBuilderCatalogInputSchema,
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    async (input) => jsonResultFrom(() => adapter.appBuilderCatalog(input as AureliaMcpAppBuilderCatalogInput)),
  );

  server.registerTool(
    aureliaMcpToolNames.appBuilderQuery,
    {
      title: 'Aurelia App Builder Query',
      description: 'Forward one semantic-runtime app-builder query. Use aurelia_app_builder_catalog for supported query kinds and then ask catalog/detail/preflight answers for field-level request contracts; this tool keeps nested envelopes compact so startup does not advertise every app-builder schema inline.',
      inputSchema: appBuilderQueryInputSchema,
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    async (input) => jsonResultFrom(() => adapter.appBuilderQuery(input as AureliaMcpAppBuilderQueryInput)),
  );

  server.registerTool(
    aureliaMcpToolNames.appOverview,
    {
      title: 'Aurelia App Overview',
      description: 'Open an Aurelia app and return compact summary, topology, diagnostics, and open seams.',
      inputSchema: appOverviewInputSchema,
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
      inputSchema: routerOverviewInputSchema,
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
      inputSchema: appQueryInputSchema,
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
      inputSchema: appQueryBatchInputSchema,
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    async (input) => jsonResultFrom(() => adapter.appQueryBatch(input as AureliaMcpAppQueryBatchInput)),
  );

  server.registerTool(
    aureliaMcpToolNames.openSeamOverview,
    {
      title: 'Aurelia Open Seam Overview',
      description: 'Group open semantic seams by seam kind and reason-kind signature before paging raw seam rows.',
      inputSchema: openSeamOverviewInputSchema,
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
      inputSchema: diagnosticOverviewInputSchema,
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
      inputSchema: appDiagnosticsInputSchema,
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    async (input) => jsonResultFrom(() => adapter.appDiagnostics(input as AureliaMcpAppDiagnosticsInput)),
  );

  server.registerTool(
    aureliaMcpToolNames.templateCursorInfo,
    {
      title: 'Aurelia Template Cursor Info',
      description: 'Read the semantic template site, selected resource/member, and cursor diagnostics at a source cursor.',
      inputSchema: templateCursorInputSchema,
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
      inputSchema: templateCursorInputSchema,
      outputSchema: aureliaMcpResponseOutputSchema,
      annotations: readOnlyClosedWorldToolAnnotations,
    },
    async (input) => jsonResultFrom(() => adapter.templateCompletions(input as AureliaMcpTemplateCursorInput)),
  );

  server.registerTool(
    aureliaMcpToolNames.templateDiagnostics,
    {
      title: 'Aurelia Template Diagnostics',
      description: 'Read template diagnostics for a source file or opened app.',
      inputSchema: templateDiagnosticsInputSchema,
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
    case aureliaMcpToolNames.appQuery:
      return [
        semanticRuntimeResourceLink('app-queries'),
      ];
    case aureliaMcpToolNames.appQueryCatalog:
      return [
        semanticRuntimeResourceLink('app-queries'),
      ];
    case aureliaMcpToolNames.appBuilderQuery:
      return [
        semanticRuntimeResourceLink('app-builder'),
      ];
    case aureliaMcpToolNames.appBuilderCatalog:
      return [
        semanticRuntimeResourceLink('app-builder'),
      ];
    default:
      return [];
  }
}

function semanticRuntimeResourceLink(view: 'app-queries' | 'app-builder') {
  const isAppBuilder = view === 'app-builder';
  return {
    type: 'resource_link' as const,
    uri: `aurelia://semantic-runtime/${view}`,
    name: isAppBuilder ? 'Aurelia App Builder Catalog' : 'Aurelia App Query Catalog',
    mimeType: 'application/json',
    description: isAppBuilder
      ? 'Supported semantic-runtime app-builder query kinds for app-builder ontology, input readiness, source lowering, and opinionated part source lowering.'
      : 'Supported semantic-runtime app query kinds and their locus, paging, detail, and router-product affordances.',
  };
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
