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
              'If you expect to call several app tools in this session, pass appRetention=retain-app on the first app call and clear or inspect the analysis cache when done; otherwise leave the default dispose-app posture.',
              'For large or dependency-heavy workspaces, start app overview with analysisDepth=runtime-topology and deepen only when binding/type details are needed.',
              'Use aurelia_authoring_orientation with analysisDepth=binding-observation when deciding code-shape taste, recipe fit, direct state/domain binding, getter observation, or forwarding-accessor pressure.',
              'For form/control explanations, use one aurelia_app_query_batch for binding-value-channel-summary, binding-data-flow-summary, and binding-observed-dependency-summary before paging raw binding rows; use page.size=0 for issue/source-state rollup first passes, leave includeAppProfile/includeAppQueryClaimProfiles unset unless profiling, and treat issue kinds such as source-type-unresolved or target-empty-array-inferred as repair-routing signals.',
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
    'aurelia_plan_authoring_recipe',
    {
      title: 'Plan Aurelia Authoring Recipe',
      description: 'Guide an MCP client through read-only authoring catalog and recipe-plan calls.',
      argsSchema: {
        recipeKey: z.string().optional().describe('Optional recipe key such as state-backed-form.'),
        usage: z.string().optional().describe('Optional recipe usage such as source-plan-start or pattern-reference.'),
        rootDir: z.string().optional().describe('Target root directory to pass to aurelia_authoring_recipe_plan.'),
        appName: z.string().optional().describe('Optional generated app/display name for the recipe plan.'),
      },
    },
    ({ recipeKey, usage, rootDir, appName }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Plan an Aurelia authoring operation through the MCP read-only recipe surface.',
              recipeKey == null || recipeKey.length === 0
                ? 'Start with aurelia_app_building_guidance for compact design guidance unless the caller already supplied an exact recipe plan.'
                : `Start with aurelia_app_building_guidance using recipeKey ${recipeKey} so the selected recipe policy rows are visible before source-plan text.`,
              recipeKey == null || recipeKey.length === 0
                ? 'Then call aurelia_authoring_catalog using catalogView=recipes, choose a fitting recipe key, then call aurelia_authoring_recipe_plan.'
                : `Call aurelia_authoring_recipe_plan for recipeKey ${recipeKey}${usage == null || usage.length === 0 ? '' : ` with usage ${usage}`}.`,
              rootDir == null || rootDir.length === 0
                ? 'Use rootDir only when the caller supplied a concrete target directory.'
                : `Use rootDir ${rootDir}.`,
              appName == null || appName.length === 0
                ? 'Use appName only when the caller supplied a desired app name.'
                : `Use appName ${appName}.`,
              'Keep includeText=false and effectDetail=compact unless concrete source text or row-level verification contracts are explicitly needed; when only a few files are needed, use sourcePlan.textRequestHints or sourceTextRequestHintKeys instead of requesting every file, and use implementation-source when the caller needs app source without reference CSS. Summarize intent, preconditions, expected-effect counts/kinds, source edit plan, source file roles such as domain-model/state-model/service, sourcePlan.pattern.role, usePolicy/useSummary, dataPolicy, codeEconomyPolicy, sourcePlan.pattern.modules reusable architecture, sourcePlan.pattern.parameters adaptation slots with valueShape, sourcePlan.pattern.adaptationGroups group policy, which slots have applicationPolicy=source-text-input, host-adapted/advisory slots that still require caller-domain adaptation, any sourceParameterApplications, and product-open reasons.',
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
      description: 'Guide an MCP client through low-boilerplate Aurelia feature planning, app inspection, and recipe-backed source edits.',
      argsSchema: {
        workspaceRoot: z.string().optional().describe('Absolute workspace root when modifying or inspecting an existing app.'),
        featureGoal: z.string().describe('Short description of the app feature or slice to build.'),
        focus: z.string().optional().describe('Optional authoring focus such as app-building, forms, state, routing, plugins, composition, or diagnostics.'),
        recipeKey: z.string().optional().describe('Optional recipe key when the caller already selected a recipe.'),
        includeRouter: z.string().optional().describe('Pass true when route/viewport facts are part of the feature.'),
        includeDiagnostics: z.string().optional().describe('Pass true when the feature is repairing or extending an existing app with known issues.'),
      },
    },
    ({ workspaceRoot, featureGoal, focus, recipeKey, includeRouter, includeDiagnostics }) => ({
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
              `Call aurelia_app_building_guidance first${focus == null || focus.length === 0 ? '' : ` with focus ${focus}`} and featureGoal "${featureGoal}"${recipeKey == null || recipeKey.length === 0 ? '' : ` and recipeKey ${recipeKey}`}.`,
              'Use returned decision keys as the code-shape checklist. If no feature-goal signals matched, treat recipes as fallback context and narrow the goal before large source edits.',
              'When recipePlanSequence exists, follow it in order: source-plan-start is the baseline, pattern-reference rows are selective companions. The recipes array is comparison context, not a scaffold checklist.',
              'Before passing suggestedSourceParameterValues, inspect suggestedSourceParameterContracts: source-text-input may be applied by semantic-runtime, advisory-only is caller-domain adaptation work you must carry into your own edits.',
              'For suggested values, trust suggestedSourceParameterContracts over static compact recipe-row slots because some contracts become source-applied only after field schemas or route sections are parameterized.',
              'For recipe source, read sourcePlan.pattern.usePolicy first. apply-as-source-start can scaffold; adapt-before-emitting is transfer material; merge-selectively is companion material; analysis-pressure-only is not app output.',
              'For scenario-reference plans, keep modules and expected-effect highlights as the reusable Aurelia architecture, but adapt or trim sample class names, fields, records, copy, and CSS. Source roles tell you where: domain-model, state-model, service, template, component, and presentation.',
              'For sourceParameterValues, infer only obvious values that match valueShape. Trust applied-to-source-plan; treat not-applied-to-source-plan as product pressure. Use option-schema-list values such as request-options or table-options only when the pattern exposes option domains as source-text-input; adapt advisory-only field schema, option-domain, sample-data, copy, action-model, validation-message, and presentation slots yourself. Use adaptationGroups to avoid partial domain rewrites.',
              recipeKey == null || recipeKey.length === 0
                ? 'Choose a recipe only after reading guidance; use aurelia_authoring_catalog with catalogView=recipes if comparing the full set is useful.'
                : `Then call aurelia_authoring_recipe_plan for recipeKey ${recipeKey}.`,
              'Keep recipe-plan includeText=false and effectDetail=compact until concrete file text or row-level verification contracts are needed; use sourceTextRequestHintKeys such as implementation-source, state-domain-service, templates, or project-tooling when editing by role, and use exact sourceFilePaths only for a smaller custom selection. Prefer implementation-source for app source without reference CSS, and skip presentation hints unless the caller wants reference CSS/copy.',
              workspaceRoot == null || workspaceRoot.length === 0
                ? 'For a new app, use recipe source-plan files as the main structure and keep package/build-tool choices explicit in the host plan.'
                : 'For an existing app, call aurelia_workspace_overview, select the app project when needed, then call aurelia_app_overview before editing.',
              'For existing-app code shape, call aurelia_authoring_orientation with analysisDepth=binding-observation before editing.',
              'For forms/control bindings, call one aurelia_app_query_batch for binding-value-channel-summary, binding-data-flow-summary, and binding-observed-dependency-summary before raw rows; use page.size=0 for rollup-first reads and leave profiling fields off unless measuring cost.',
              includeRouter === 'true'
                ? 'Because routing is in scope, call aurelia_router_overview with a small rowPageSize before editing route config, links, route params, or viewport layout; page route-context-parameter-reads when checking whether IRouteContext.getRouteParameters keys are route-backed or query/open.'
                : 'Call aurelia_router_overview only if the guidance, app overview, or feature goal makes route/viewport facts relevant.',
              includeDiagnostics === 'true'
                ? 'Because diagnostics are in scope, call aurelia_diagnostic_overview or aurelia_template_diagnostics before edits and use diagnostics as repair pressure.'
                : 'Use diagnostics after editing only when the app overview or template work indicates weak typings, missing members, invalid commands, or binding assignability pressure.',
              'Prefer DI-owned state/domain classes, direct state/domain template reads, ordinary source-backed getters for real derived behavior, sparse component bindables, and decision-row guidance for ID/object handoff or proxy exits.',
              'Avoid one-hop view-model getters, callback bindables for non-leaf composition, broad observation disabling, and @computed unless explicit dependency or trackable-method semantics are intended.',
              'After editing, reopen the app through aurelia_app_overview or focused app-query calls and compare the observed facts with the selected recipe intent.',
              'Do not ask for Atlas, Work Router, corpus, or development-only memory through MCP; those are internal development tools outside the public shell.',
            ].join(' '),
          },
        },
      ],
    }),
  );
}
