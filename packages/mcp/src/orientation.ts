export const AURELIA_MCP_ORIENTATION_RESOURCE_URI = 'aurelia://semantic-runtime/orientation' as const;

export const AURELIA_MCP_SERVER_INSTRUCTIONS = [
  'Use aurelia_workspace_overview first for a cheap project/app map.',
  'Open the selected app with aurelia_app_overview; pass appRetention=retain-app when several app calls will share the session, and keep diagnosticPageSize/openSeamPageSize small on first reads.',
  'Use aurelia_app_query_catalog as the authority for queryKind, minimumAnalysisDepth, paging, detail, source-file support, and continuation affordances.',
  'Prefer clusters before rows: diagnostics/open-seam summaries first, then page exact rows for the chosen cluster.',
  'Use page.size=0 on summary queries for rollup-only reads when row payload is not yet needed.',
  'For aurelia_template_cursor_info, cursor position matters: call names identify expression sites; member tokens identify expression-member owner types.',
  'Do not pre-pass analysisDepth for ordinary query calls; semantic-runtime auto-selects the required depth per query and reports the depth used.',
  'Check supportsSourceFile in aurelia_app_query_catalog before scoping by sourceFile/sourceFilePath; unsupported selectors return outcome=unsupported and should not be retried blindly.',
].join(' ');

export const AURELIA_MCP_ORIENTATION_RESOURCE_TEXT = [
  '# Aurelia MCP Orientation',
  '',
  'This MCP is a read-only semantic-runtime shell for Aurelia apps. It is meant to give an AI the same semantic facts a future IDE/LSP surface should expose: workspace shape, app topology, diagnostics, template/cursor context, router facts, binding/value-flow facts, open semantic seams, and app-builder menus.',
  '',
  '## Golden Path',
  '',
  '1. Call `aurelia_workspace_overview` first. It is cheap and deterministic, and returns discovered project frames plus the default app candidate.',
  '2. Call `aurelia_app_overview` next. Use `appRetention=retain-app` when several follow-up app calls should share one app epoch; otherwise omit it. Keep `diagnosticPageSize` and `openSeamPageSize` small on first reads.',
  '3. Call `aurelia_app_query_catalog` before improvising generic `aurelia_app_query` calls. Catalog rows are the authority for `queryKind`, `minimumAnalysisDepth`, paging, detail, source-file support, and continuation behavior.',
  '4. Use `aurelia_app_query_batch` when several related app summaries belong to one inspection move, especially with `page.size=0` rollup queries.',
  '5. Prefer pressure clusters before rows: `aurelia_diagnostic_overview`, `open-seam-summary`, and `open-seam-sites` before paging raw rows. Follow returned continuations when they fit the task.',
  '6. Use `page.size=0` on summary queries when the caller needs counts/clusters without row payload.',
  '7. For `aurelia_template_cursor_info`, position is semantic: cursor on a call name returns expression-site context; cursor on a member token returns expression-member owner type context.',
  '8. Omit `analysisDepth` unless intentionally controlling cache or cost. Query calls auto-select the smallest required app-world depth, and answers report the depth used when an app world is opened.',
  '9. Check `supportsSourceFile` before file-scoping a query with `sourceFile` or `sourceFilePath`. Unsupported selectors return `outcome=unsupported` with accepted query families; trust that answer instead of retrying blindly.',
  '',
  '## Worked Shape',
  '',
  'A typical repair-oriented flow is: workspace overview -> app overview -> diagnostic/open-seam summary with `page.size=0` -> focused row page or template cursor. The final drill-down should name the exact source locus, diagnostic authority, and next query or source span when semantic-runtime has that evidence.',
  '',
  '## Release Guardrails',
  '',
  'Orientation content is app-agnostic. It teaches sequencing and affordances, not expectations about any particular app. If a public claim here stops matching runtime behavior, update the contract or weaken the claim before release.',
  '',
  'Early adopter feedback is useful, but this orientation resource does not transmit reports. If the user wants to share a reproducible MCP finding, ask them before preparing any external issue or report.',
].join('\n');

export function aureliaOrientWorkspacePromptText(input: {
  readonly workspaceRoot: string;
  readonly projectKey?: string | null;
  readonly includeRouter?: string | null;
}): string {
  return [
    `Orient to the Aurelia workspace at ${input.workspaceRoot}.`,
    'Follow the Aurelia MCP golden path: workspace overview first, app overview second, catalog before generic app-query calls, then summary clusters before row pages.',
    input.projectKey == null || input.projectKey.length === 0
      ? 'If multiple app candidates are present, select the project from aurelia_workspace_overview before deeper app calls.'
      : `Use projectKey ${input.projectKey} for deeper app calls unless aurelia_workspace_overview disproves it.`,
    'Use aurelia_app_overview with small diagnostic/open-seam budgets. Pass appRetention=retain-app only if several app calls will share this session.',
    'Do not manually deepen analysisDepth for ordinary calls; semantic-runtime auto-selects the required query depth and reports the app-world depth used.',
    'Use page.size=0 on summary queries for rollup-only first reads, then follow continuations or page rows for the chosen cluster.',
    'Use aurelia_app_query_batch when several related summaries belong to one orientation move.',
    input.includeRouter === 'true'
      ? 'Because routing is in scope, call aurelia_router_overview after app overview with a small rowPageSize.'
      : 'Call aurelia_router_overview only if the overview or user task makes route/viewport facts relevant.',
    'Do not ask for Atlas, Work Router, corpus, or development-only memory; this MCP surface is the public semantic-runtime shell.',
  ].join(' ');
}

export function aureliaInspectAppFeaturePromptText(input: {
  readonly workspaceRoot: string;
  readonly featureGoal: string;
  readonly includeRouter?: string | null;
  readonly includeDiagnostics?: string | null;
}): string {
  return [
    `Inspect the Aurelia app at ${input.workspaceRoot} for this feature or issue: ${input.featureGoal}.`,
    'Start with aurelia_workspace_overview and aurelia_app_overview. Then use aurelia_app_query_catalog to choose focused query families instead of guessing.',
    input.includeDiagnostics === 'true'
      ? 'Because diagnostics are in scope, use aurelia_diagnostic_overview or aurelia_app_diagnostics early; these include ordinary TypeScript diagnostics as well as modeled Aurelia/template diagnostics.'
      : 'Use diagnostics when the overview, source edits, lint/formatter follow-up, or template work suggests weak typing, invalid commands, binding assignment pressure, or stale TypeScript facts.',
    input.includeRouter === 'true'
      ? 'Because routing is in scope, call aurelia_router_overview and follow route-context or viewport continuations before editing routing code.'
      : 'Call aurelia_router_overview only when the feature goal or app overview makes route/viewport facts relevant.',
    'For binding-heavy work, batch binding-value-channel-summary, binding-data-flow-summary, and binding-observed-dependency-summary; use page.size=0 for rollup-first reads.',
    'Pass continuationIntents such as inspect, diagnose, repair, or verify on focused follow-up calls and prefer returned targetQuery continuations over local tool-order heuristics.',
  ].join(' ');
}

export function aureliaBuildAppFeaturePromptText(input: {
  readonly workspaceRoot?: string | null;
  readonly featureGoal: string;
  readonly focus?: string | null;
  readonly includeRouter?: string | null;
  readonly includeDiagnostics?: string | null;
}): string {
  return [
    `Plan and implement this Aurelia feature: ${input.featureGoal}.`,
    'The MCP tools are read-only. Use them for semantic guidance, then edit files directly in the workspace.',
    input.workspaceRoot == null || input.workspaceRoot.length === 0
      ? 'For a new app, start with aurelia_app_builder_catalog and use app-builder preflight/detail queries before source lowering. For an existing app, first obtain the absolute workspaceRoot.'
      : `Use workspaceRoot ${input.workspaceRoot}; start with aurelia_workspace_overview and aurelia_app_overview before editing.`,
    input.focus == null || input.focus.length === 0
      ? 'Use the feature goal as the inspection posture.'
      : `Treat ${input.focus} as the primary inspection posture while checking adjacent facts made relevant by overview, diagnostics, or continuations.`,
    'Use returned continuations as typed next moves, and pass continuationIntents to keep follow-ups aligned with the task.',
    'For forms/control bindings, query the binding summary triad before raw rows. Use page.size=0 for rollup-first reads.',
    input.includeRouter === 'true'
      ? 'Because routing is in scope, inspect router overview before editing route config, route params, links, or viewport layout.'
      : 'Inspect router facts only when the feature or app overview makes routing relevant.',
    input.includeDiagnostics === 'true'
      ? 'Because diagnostics are in scope, run aurelia_diagnostic_overview before and after edits.'
      : 'After source edits or lint/formatter autofixes, rerun diagnostics before declaring the app clean.',
    'For post-edit type safety, call aurelia_app_query with queryKind=typescript-diagnostic-summary or use the unified diagnostic overview before declaring the workspace clean.',
    'Prefer compact idiomatic Aurelia: DI-owned state/domain classes, direct state/domain template reads, source-backed getters for real derived behavior, sparse bindables, and explicit domain boundaries.',
    'Avoid one-hop view-model forwarding getters, callback bindables for non-leaf composition, broad observation disabling, and @computed unless explicit dependency or trackable-method semantics are intended.',
  ].join(' ');
}
