import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

export function registerAureliaSemanticRuntimePrompts(
  server: McpServer,
): void {
  server.registerPrompt(
    'aurelia_orient_workspace',
    {
      title: 'Orient To Aurelia Workspace',
      description: 'Guide an MCP client through the stable overview tools for an Aurelia workspace or monorepo app.',
      argsSchema: {
        workspaceRoot: z.string().describe('Absolute workspace root to inspect.'),
        projectKey: z.string().optional().describe('Optional project key selected from aurelia_workspace_overview.'),
        includeRouter: z.string().optional().describe('Pass true when route/viewport facts are part of the question.'),
      },
    },
    ({ workspaceRoot, projectKey, includeRouter }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Orient to the Aurelia workspace at ${workspaceRoot}.`,
              'Call aurelia_workspace_overview first and use its project shape rows to select the app project.',
              projectKey == null || projectKey.length === 0
                ? 'If multiple app candidates are present, choose the app project from the overview before deeper calls.'
                : `Use projectKey ${projectKey} for deeper app calls unless the overview disproves it.`,
              'Then call aurelia_app_overview with a small diagnostic/open-seam budget and summarize app shape, major diagnostics, open seams, and the next precise tool calls.',
              'When the current task has a clear posture, pass continuationIntents such as inspect, diagnose, repair, verify, or profile so semantic-runtime narrows the typed follow-up continuations instead of making the MCP client infer next moves from prose.',
              'If you expect to call several app tools in this session, pass appRetention=retain-app on the first app call and clear or inspect the analysis cache when done; otherwise leave the default dispose-app posture.',
              'For large or dependency-heavy workspaces, start app overview with analysisDepth=runtime-topology and deepen only when binding/type details are needed.',
              'For code-shape questions, inspect binding summaries, observed dependencies, proxy-observation escapes, state stores, and diagnostics through aurelia_app_query or aurelia_app_query_batch rather than using a separate recipe lane.',
              'For form/control explanations, use one aurelia_app_query_batch for binding-value-channel-summary, binding-data-flow-summary, and binding-observed-dependency-summary before paging raw binding rows; use page.size=0 for issue/source-state rollup first passes, leave includeAppProfile/includeAppQueryClaimProfiles unset unless profiling, and treat issue kinds such as source-type-unresolved or target-empty-array-inferred as repair-routing signals.',
              'For repair work, use aurelia_diagnostic_overview or aurelia_app_diagnostics as the unified diagnostic surface; explicit diagnostic calls include ordinary TypeScript project diagnostics as well as modeled Aurelia/template diagnostics.',
              'For focused repair or verification loops, pass continuationIntents=repair or continuationIntents=verify on app-query, diagnostics, and batches, then follow returned targetQuery rows rather than reconstructing related diagnostic or source reads locally.',
              'Use aurelia_app_query_catalog before aurelia_app_query when the needed queryKind is not already obvious from a curated tool.',
              includeRouter === 'true'
                ? 'Because routing is in scope, also call aurelia_router_overview with a small rowPageSize and report route, viewport, route-context, route-context-parameter-read, and router issue pressure.'
                : 'Call aurelia_router_overview only if the app overview or user task makes route/viewport facts relevant.',
              'Do not ask for Atlas, Work Router, corpus, or legacy-map internals; this MCP surface is the public semantic-runtime shell.',
            ].join(' '),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    'aurelia_inspect_app_feature',
    {
      title: 'Inspect Aurelia App Feature',
      description: 'Guide an MCP client through read-only semantic-runtime app inspection for a feature or repair task.',
      argsSchema: {
        workspaceRoot: z.string().describe('Absolute workspace root to inspect.'),
        featureGoal: z.string().describe('Short description of the feature, issue, or slice under inspection.'),
        includeRouter: z.string().optional().describe('Pass true when route/viewport facts are part of the question.'),
        includeDiagnostics: z.string().optional().describe('Pass true when diagnostics should lead the inspection.'),
      },
    },
    ({ workspaceRoot, featureGoal, includeRouter, includeDiagnostics }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Inspect the Aurelia app at ${workspaceRoot} for this feature or issue: ${featureGoal}.`,
              'Call aurelia_workspace_overview first and select the app project when the workspace contains multiple candidates.',
              'Call aurelia_app_overview at runtime-topology depth first; deepen to binding-observation only when binding, observer, or TypeScript projection facts are needed.',
              includeDiagnostics === 'true'
                ? 'Because diagnostics are in scope, call aurelia_diagnostic_overview or aurelia_app_diagnostics early; these surfaces include ordinary TypeScript project diagnostics as well as modeled Aurelia/template diagnostics.'
                : 'Use diagnostics when the overview, source edits, or formatter/linter follow-up suggests weak typing, missing members, invalid commands, assignment pressure, or stale TypeScript facts.',
              includeRouter === 'true'
                ? 'Because routing is in scope, call aurelia_router_overview with a small rowPageSize and follow route-context or viewport continuations before editing route config, links, route parameters, or viewports.'
                : 'Call aurelia_router_overview only if the feature goal or app overview makes route/viewport facts relevant.',
              'For binding-heavy feature work, batch binding-value-channel-summary, binding-data-flow-summary, and binding-observed-dependency-summary before paging raw rows.',
              'Pass continuationIntents such as inspect, diagnose, repair, or verify on focused follow-up calls and prefer returned targetQuery continuations over local tool-order heuristics.',
              'Summarize the observed app facts, risks, and the next source files or query families to inspect; do not call Atlas or development-only Work Router tools through the public MCP shell.',
            ].join(' '),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    'aurelia_build_app_feature',
    {
      title: 'Build Aurelia App Feature',
      description: 'Guide an MCP client through low-boilerplate Aurelia feature planning, app inspection, and source edits.',
      argsSchema: {
        workspaceRoot: z.string().optional().describe('Absolute workspace root when modifying or inspecting an existing app.'),
        featureGoal: z.string().describe('Short description of the app feature or slice to build.'),
        focus: z.string().optional().describe('Optional task focus such as forms, state, routing, plugins, composition, or diagnostics.'),
        includeRouter: z.string().optional().describe('Pass true when route/viewport facts are part of the feature.'),
        includeDiagnostics: z.string().optional().describe('Pass true when the feature is repairing or extending an existing app with known issues.'),
      },
    },
    ({ workspaceRoot, featureGoal, focus, includeRouter, includeDiagnostics }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Plan and implement this Aurelia feature: ${featureGoal}.`,
              'Use the MCP surface as semantic guidance, then edit source files directly in the workspace; the MCP tools are read-only.',
              workspaceRoot == null || workspaceRoot.length === 0
                ? 'If an existing workspace is involved, ask for or infer the absolute workspaceRoot before app inspection.'
                : `Use workspaceRoot ${workspaceRoot} for app inspection calls.`,
              focus == null || focus.length === 0
                ? 'Use the feature goal itself as the inspection posture.'
                : `Treat ${focus} as the primary inspection posture while still checking adjacent facts that the app overview or diagnostics make relevant.`,
              workspaceRoot == null || workspaceRoot.length === 0
                ? 'For a new app, the current MCP shell does not yet expose a public generator; use framework knowledge and keep source edits explicit until app-builder becomes a public semantic-runtime API.'
                : 'For an existing app, call aurelia_workspace_overview, select the app project when needed, then call aurelia_app_overview before editing.',
              'When following app-query or diagnostic answers, use returned continuations as typed next moves. Pass continuationIntents to keep those follow-ups aligned with the current task instead of using generic next-tool prose as a ranking signal.',
              'For forms/control bindings, call one aurelia_app_query_batch for binding-value-channel-summary, binding-data-flow-summary, and binding-observed-dependency-summary before raw rows; use page.size=0 for rollup-first reads and leave profiling fields off unless measuring cost.',
              includeRouter === 'true'
                ? 'Because routing is in scope, call aurelia_router_overview with a small rowPageSize before editing route config, links, route params, or viewport layout; page route-context-parameter-reads when checking whether IRouteContext.getRouteParameters keys are route-backed or query/open.'
                : 'Call aurelia_router_overview only if the guidance, app overview, or feature goal makes route/viewport facts relevant.',
              includeDiagnostics === 'true'
                ? 'Because diagnostics are in scope, call aurelia_diagnostic_overview or aurelia_app_diagnostics before edits and use diagnostics as repair pressure; these explicit diagnostic calls include TypeScript project diagnostics, so do not treat lint success as typecheck success.'
                : 'Use diagnostics after editing when the app overview or template work indicates weak typings, missing members, invalid commands, binding assignability pressure, or when lint/formatter autofixes may have changed TypeScript types.',
              'Prefer DI-owned state/domain classes, direct state/domain template reads, ordinary source-backed getters for real derived behavior, sparse component bindables, and decision-row guidance for ID/object handoff or proxy exits.',
              'Avoid one-hop view-model getters, callback bindables for non-leaf composition, broad observation disabling, and @computed unless explicit dependency or trackable-method semantics are intended.',
              'After editing, reopen the app through aurelia_app_overview or focused app-query calls and compare the observed facts with the feature intent; after lint or formatter autofixes, rerun aurelia_diagnostic_overview or query typescript-diagnostic-summary before declaring the app clean.',
              'Do not ask for Atlas, Work Router, corpus, or development-only memory through MCP; those are internal development tools outside the public shell.',
            ].join(' '),
          },
        },
      ],
    }),
  );
}
