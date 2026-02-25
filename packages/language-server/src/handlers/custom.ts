/**
 * Custom Aurelia request handlers: aurelia/getOverlay, aurelia/getMapping, etc.
 *
 * Each handler is wrapped in try/catch to prevent exceptions from destabilizing
 * the LSP connection. Errors are logged and graceful fallbacks are returned.
 */
import type { Position } from "vscode-languageserver/node.js";
import { canonicalDocumentUri, computeBuiltinDiscrepancies } from "@aurelia-ls/compiler";
import type {
  BuiltinDiscrepancy,
  DiagnosticActionability,
  DiagnosticCategory,
  DiagnosticImpact,
  DiagnosticSeverity,
  DiagnosticStage,
  DiagnosticStatus,
  DiagnosticSurface,
  SourceSpan,
} from "@aurelia-ls/compiler";
import type { WorkspaceDiagnostic, WorkspaceDiagnostics } from "@aurelia-ls/semantic-workspace";
import type { ServerContext } from "../context.js";
import { buildCapabilities, buildCapabilitiesFallback, type CapabilitiesResponse } from "../capabilities.js";

type MaybeUriParam = { uri?: string } | string | null;

type DiagnosticsSnapshotRelated = {
  code?: string;
  message: string;
  span?: SourceSpan;
};

type DiagnosticsSnapshotIssue = {
  kind: string;
  message: string;
  code?: string;
  rawCode?: string;
  field?: string;
};

type DiagnosticsSnapshotItem = {
  code: string;
  message: string;
  severity?: DiagnosticSeverity;
  impact?: DiagnosticImpact;
  actionability?: DiagnosticActionability;
  category?: DiagnosticCategory;
  status?: DiagnosticStatus;
  stage?: DiagnosticStage;
  source?: string;
  uri?: string;
  span?: SourceSpan;
  data?: Readonly<Record<string, unknown>>;
  related?: readonly DiagnosticsSnapshotRelated[];
  surfaces?: readonly DiagnosticSurface[];
  suppressed?: boolean;
  suppressionReason?: string;
  issues?: readonly DiagnosticsSnapshotIssue[];
};

type DiagnosticsSnapshotBundle = {
  bySurface: Record<string, readonly DiagnosticsSnapshotItem[]>;
  suppressed: readonly DiagnosticsSnapshotItem[];
};

type DiagnosticsSnapshotResponse = {
  uri: string;
  fingerprint: string;
  diagnostics: DiagnosticsSnapshotBundle;
};

function uriFromParam(params: MaybeUriParam): string | undefined {
  if (typeof params === "string") return params;
  if (params && typeof params === "object" && typeof params.uri === "string") return params.uri;
  return undefined;
}

function formatError(e: unknown): string {
  if (e instanceof Error) return e.stack ?? e.message;
  return String(e);
}

function toSnapshotRelated(diag: WorkspaceDiagnostic): DiagnosticsSnapshotRelated[] | undefined {
  if (!diag.related?.length) return undefined;
  return diag.related.map((entry) => ({
    code: entry.code,
    message: entry.message,
    span: entry.span ?? undefined,
  }));
}

function toSnapshotItem(diag: WorkspaceDiagnostic): DiagnosticsSnapshotItem {
  return {
    code: diag.code,
    message: diag.message,
    severity: diag.severity,
    impact: diag.impact,
    actionability: diag.actionability,
    category: diag.spec.category,
    status: diag.spec.status,
    stage: diag.stage,
    source: diag.source,
    uri: diag.uri,
    span: diag.span ?? undefined,
    data: diag.data,
    related: toSnapshotRelated(diag),
    surfaces: diag.spec.surfaces,
    suppressed: diag.suppressed,
    suppressionReason: diag.suppressionReason,
    issues: diag.issues,
  };
}

function serializeDiagnosticsSnapshot(diagnostics: WorkspaceDiagnostics): DiagnosticsSnapshotBundle {
  const bySurface: Record<string, readonly DiagnosticsSnapshotItem[]> = {};
  const entries = Array.from(diagnostics.bySurface.entries()).sort(([a], [b]) => a.localeCompare(b));
  for (const [surface, items] of entries) {
    bySurface[surface] = items.map(toSnapshotItem);
  }
  return {
    bySurface,
    suppressed: diagnostics.suppressed.map(toSnapshotItem),
  };
}

export function handleGetOverlay(ctx: ServerContext, params: MaybeUriParam) {
  try {
    const uri = uriFromParam(params);
    ctx.logger.log(`RPC aurelia/getOverlay params=${JSON.stringify(params)}`);
    if (!uri) return null;
    const canonical = canonicalDocumentUri(uri);
    ctx.ensureProgramDocument(uri);
    const artifact = ctx.workspace.getOverlay(canonical.uri);
    return artifact
      ? { fingerprint: ctx.workspace.snapshot().meta.fingerprint, artifact }
      : null;
  } catch (e) {
    ctx.logger.error(`[getOverlay] failed: ${formatError(e)}`);
    return null;
  }
}

export function handleGetMapping(ctx: ServerContext, params: MaybeUriParam) {
  try {
    const uri = uriFromParam(params);
    if (!uri) return null;
    const canonical = canonicalDocumentUri(uri);
    const doc = ctx.ensureProgramDocument(uri);
    if (!doc) return null;
    const mapping = ctx.workspace.getMapping(canonical.uri);
    if (!mapping) return null;
    const overlay = ctx.workspace.getOverlay(canonical.uri);
    return { overlayPath: overlay.overlay.path, mapping };
  } catch (e) {
    ctx.logger.error(`[getMapping] failed: ${formatError(e)}`);
    return null;
  }
}

export function handleQueryAtPosition(ctx: ServerContext, params: { uri: string; position: Position }) {
  try {
    const uri = params?.uri;
    if (!uri || !params.position) return null;
    const doc = ctx.ensureProgramDocument(uri);
    if (!doc) return null;
    const canonical = canonicalDocumentUri(uri);
    const query = ctx.workspace.getQueryFacade(canonical.uri);
    if (!query) return null;
    const offset = doc.offsetAt(params.position);
    return {
      expr: query.exprAt(offset),
      node: query.nodeAt(offset),
      controller: query.controllerAt(offset),
      bindables: query.nodeAt(offset) ? query.bindablesFor(query.nodeAt(offset)!) : null,
      mappingSize: ctx.workspace.getMapping(canonical.uri)?.entries.length ?? 0,
    };
  } catch (e) {
    ctx.logger.error(`[queryAtPosition] failed for ${params?.uri}: ${formatError(e)}`);
    return null;
  }
}

export function handleGetSsr(ctx: ServerContext, params: MaybeUriParam) {
  const uri = uriFromParam(params);
  if (!uri) return null;
  ctx.logger.info(`aurelia/getSsr: SSR not yet available for ${uri}`);
  return null;
}

export function handleGetDiagnostics(
  ctx: ServerContext,
  params: MaybeUriParam,
): DiagnosticsSnapshotResponse | null {
  try {
    const uri = uriFromParam(params);
    if (!uri) return null;
    const canonical = canonicalDocumentUri(uri);
    ctx.ensureProgramDocument(uri);
    const diagnostics = serializeDiagnosticsSnapshot(ctx.workspace.diagnostics(canonical.uri));
    const fingerprint = ctx.workspace.snapshot().meta.fingerprint;
    return { uri: canonical.uri, fingerprint, diagnostics };
  } catch (e) {
    ctx.logger.error(`[getDiagnostics] failed: ${formatError(e)}`);
    return null;
  }
}

export function handleDumpState(ctx: ServerContext) {
  try {
    return {
      workspaceRoot: ctx.workspaceRoot,
      fingerprint: ctx.workspace.snapshot().meta.fingerprint,
      templateCount: ctx.workspace.templates.length,
      inlineTemplateCount: ctx.workspace.inlineTemplates.length,
      programCache: ctx.workspace.getCacheStats(),
    };
  } catch (e) {
    ctx.logger.error(`[dumpState] failed: ${formatError(e)}`);
    return { error: formatError(e) };
  }
}

export type ResourceExplorerBindable = {
  name: string;
  attribute?: string;
  mode?: string;
  primary?: boolean;
  type?: string;
};

export type ResourceOrigin = "framework" | "project" | "package";
export type ResourceScope = "global" | "local";

export type ResourceExplorerItem = {
  name: string;
  kind: string;
  className?: string;
  file?: string;
  package?: string;
  bindableCount: number;
  bindables: ResourceExplorerBindable[];
  gapCount: number;
  gapIntrinsicCount: number;
  origin: ResourceOrigin;
  scope: ResourceScope;
  scopeOwner?: string;
  declarationForm?: string;
  staleness?: { fieldsFromAnalysis: number; membersNotInSemantics: number };
};

export type ResourceExplorerResponse = {
  fingerprint: string;
  resources: ResourceExplorerItem[];
  templateCount: number;
  inlineTemplateCount: number;
};

export function handleGetResources(ctx: ServerContext): ResourceExplorerResponse {
  try {
    const snapshot = ctx.workspace.snapshot();
    const catalog = snapshot.catalog;
    const semantics = snapshot.semantics;
    const graph = snapshot.resourceGraph;

    // Build scope index from ResourceGraph
    const scopeIndex = buildScopeIndex(graph);

    // Compute builtin staleness (encoding vs analysis discrepancies)
    let discrepancies: Map<string, BuiltinDiscrepancy> | null = null;
    try {
      discrepancies = computeBuiltinDiscrepancies(semantics);
    } catch { /* may fail if semantics shape is unexpected */ }

    const collections = catalog.resources;
    const resources: ResourceExplorerItem[] = [];

    // Walk elements
    for (const [name, res] of Object.entries(collections.elements)) {
      resources.push(mapCatalogResource(name, "custom-element", res, catalog, scopeIndex, discrepancies));
    }
    // Walk attributes — skip template controllers (they appear in controllers too)
    for (const [name, res] of Object.entries(collections.attributes)) {
      if (res.isTemplateController) continue;
      resources.push(mapCatalogResource(name, "custom-attribute", res, catalog, scopeIndex, discrepancies));
    }
    // Walk controllers — ControllerConfig lacks origin/declarationForm/gaps/package,
    // so merge from the corresponding AttrRes entry (which always exists for TCs).
    const seenControllers = new Set<string>();
    for (const [name, controllerRes] of Object.entries(collections.controllers)) {
      if (seenControllers.has(name)) continue;
      seenControllers.add(name);
      const attrRes = collections.attributes[name];
      const merged = attrRes ? { ...controllerRes, origin: attrRes.origin, declarationForm: attrRes.declarationForm, gaps: attrRes.gaps, package: attrRes.package, className: attrRes.className ?? controllerRes.className, file: attrRes.file ?? controllerRes.file, bindables: attrRes.bindables } : controllerRes;
      resources.push(mapCatalogResource(name, "template-controller", merged, catalog, scopeIndex, discrepancies));
    }
    // Pick up any TCs that are only in attributes (not in controllers)
    for (const [name, res] of Object.entries(collections.attributes)) {
      if (!res.isTemplateController) continue;
      if (seenControllers.has(name)) continue;
      resources.push(mapCatalogResource(name, "template-controller", res, catalog, scopeIndex, discrepancies));
    }
    // Walk value converters
    for (const [name, res] of Object.entries(collections.valueConverters)) {
      resources.push(mapCatalogResource(name, "value-converter", res, catalog, scopeIndex, discrepancies));
    }
    // Walk binding behaviors
    for (const [name, res] of Object.entries(collections.bindingBehaviors)) {
      resources.push(mapCatalogResource(name, "binding-behavior", res, catalog, scopeIndex, discrepancies));
    }

    // Sort: by origin (project first, package second, framework last), then by kind, then alphabetically
    const originOrder: ResourceOrigin[] = ["project", "package", "framework"];
    const kindOrder = ["custom-element", "template-controller", "custom-attribute", "value-converter", "binding-behavior"];
    resources.sort((a, b) => {
      const oa = originOrder.indexOf(a.origin);
      const ob = originOrder.indexOf(b.origin);
      if (oa !== ob) return oa - ob;
      const ka = kindOrder.indexOf(a.kind);
      const kb = kindOrder.indexOf(b.kind);
      if (ka !== kb) return ka - kb;
      return a.name.localeCompare(b.name);
    });

    return {
      fingerprint: snapshot.meta.fingerprint,
      resources,
      templateCount: ctx.workspace.templates.length,
      inlineTemplateCount: ctx.workspace.inlineTemplates.length,
    };
  } catch (e) {
    ctx.logger.error(`[getResources] failed: ${formatError(e)}`);
    return { fingerprint: "", resources: [], templateCount: 0, inlineTemplateCount: 0 };
  }
}

type ScopeEntry = { scope: ResourceScope; scopeOwner?: string };

/**
 * Build an index of resource name → scope info from the ResourceGraph.
 *
 * Resource visibility is two-level (L1 scope-resolution): local container
 * then root container. A resource in the root scope is visible everywhere.
 * A resource is only "local" if it appears in a non-root scope AND is NOT
 * in the root scope. Resources in both root and local scopes are global —
 * the local copy is a pre-seeded duplicate, not an independent registration.
 */
function buildScopeIndex(
  graph: import("@aurelia-ls/compiler").ResourceGraph | undefined | null,
): Map<string, ScopeEntry> {
  const index = new Map<string, ScopeEntry>();
  if (!graph) return index;

  const categories = ["elements", "attributes", "controllers", "valueConverters", "bindingBehaviors"] as const;

  // Collect root scope resources — these are global everywhere
  const rootResources = new Set<string>();
  const rootScope = graph.scopes[graph.root];
  if (rootScope?.resources) {
    for (const category of categories) {
      const records = rootScope.resources[category];
      if (!records) continue;
      for (const name of Object.keys(records)) {
        rootResources.add(name);
      }
    }
  }

  // Walk non-root scopes — only mark resources as local if they're NOT in root
  for (const [scopeId, scope] of Object.entries(graph.scopes)) {
    if (scopeId === graph.root) continue;

    const resources = scope.resources;
    if (!resources) continue;
    const owner = scope.label ?? scopeId;

    for (const category of categories) {
      const records = resources[category];
      if (!records) continue;
      for (const name of Object.keys(records)) {
        if (rootResources.has(name)) continue;
        index.set(name, { scope: "local" as ResourceScope, scopeOwner: owner });
      }
    }
  }
  return index;
}

type FlatResourceLike = {
  className?: string;
  file?: string;
  package?: string;
  origin?: import("@aurelia-ls/compiler").ResourceOrigin;
  declarationForm?: import("@aurelia-ls/compiler").DeclarationForm;
  gaps?: import("@aurelia-ls/compiler").ResourceGapSummary;
  bindables?: Readonly<Record<string, import("@aurelia-ls/compiler").Bindable>>;
};

function detectOrigin(res: FlatResourceLike): ResourceOrigin {
  // Check package first: a resource from an npm package is "package"
  // regardless of how it was discovered (builtin encoding or source analysis).
  if (res.package) return "package";
  if (res.origin === "builtin") return "framework";
  if (res.origin === "config") return "framework";
  return "project";
}

function mapCatalogResource(
  name: string,
  kind: string,
  res: FlatResourceLike,
  catalog: import("@aurelia-ls/compiler").ResourceCatalog,
  scopeIndex: Map<string, ScopeEntry>,
  discrepancies: Map<string, BuiltinDiscrepancy> | null,
): ResourceExplorerItem {
  const bindables: ResourceExplorerBindable[] = [];
  if (res.bindables) {
    for (const [, b] of Object.entries(res.bindables)) {
      bindables.push({
        name: b.name,
        attribute: b.attribute,
        mode: b.mode,
        primary: b.primary,
        type: b.type?.kind === "ts" ? b.type.name : b.type?.kind,
      });
    }
  }

  // Use direct gaps when available, fall back to catalog cross-reference
  const gapTotal = res.gaps?.total ?? 0;
  const gapIntrinsic = res.gaps?.intrinsic ?? 0;
  const fallbackGapCount = gapTotal > 0 ? gapTotal : (() => {
    const gapKey = `${kind}:${name}`;
    const catalogGaps = catalog.gapsByResource?.[gapKey] ?? [];
    return Array.isArray(catalogGaps) ? catalogGaps.length : 0;
  })();

  const origin = detectOrigin(res);
  const scopeEntry = scopeIndex.get(name);

  const item: ResourceExplorerItem = {
    name,
    kind,
    className: res.className,
    file: res.file,
    package: res.package,
    bindableCount: bindables.length,
    bindables,
    gapCount: fallbackGapCount,
    gapIntrinsicCount: gapIntrinsic,
    origin,
    scope: scopeEntry ? "local" : "global",
    scopeOwner: scopeEntry?.scopeOwner,
    declarationForm: res.declarationForm,
  };

  // Attach staleness for builtin resources
  if (origin === "framework" && discrepancies) {
    const disc = discrepancies.get(name);
    if (disc) {
      item.staleness = {
        fieldsFromAnalysis: disc.fieldsFromAnalysis.length,
        membersNotInSemantics: disc.membersNotInSemantics.length,
      };
    }
  }

  return item;
}

export type InspectEntityResponse = {
  uri: string;
  entityKind: string;
  confidence: {
    resource: string;
    type: string;
    scope: string;
    expression: string;
    composite: string;
  };
  expressionLabel?: string;
  exprId?: string | number;
  nodeId?: string | number;
  detail: Record<string, unknown>;
} | null;

export function handleInspectEntity(
  ctx: ServerContext,
  params: { uri: string; position: Position },
): InspectEntityResponse {
  try {
    const uri = params?.uri;
    if (!uri || !params.position) return null;
    const doc = ctx.ensureProgramDocument(uri);
    if (!doc) return null;
    const canonical = canonicalDocumentUri(uri);
    const result = ctx.workspace.query(canonical.uri).inspect(params.position);
    if (!result) return null;

    const resolution = result.resolution;
    const entity = resolution.entity;

    // Extract key fields from the entity for display
    const detail: Record<string, unknown> = { kind: entity.kind };
    if ("name" in entity) detail.name = (entity as { name: string }).name;
    if ("view" in entity) {
      const view = entity.view as { name?: string; kind?: string; className?: string };
      detail.resourceName = view?.name;
      detail.resourceKind = view?.kind;
      detail.className = view?.className;
    }
    if ("bindable" in entity) {
      const b = entity.bindable as { property?: string; attribute?: { value?: string } };
      detail.bindableProperty = b?.property;
    }
    if ("symbol" in entity) {
      const sym = entity.symbol as { kind?: string; name?: string; type?: string };
      detail.symbolKind = sym?.kind;
      detail.symbolName = sym?.name;
      detail.symbolType = sym?.type;
    }

    return {
      uri: result.uri,
      entityKind: entity.kind,
      confidence: {
        resource: resolution.confidence.resource,
        type: resolution.confidence.type,
        scope: resolution.confidence.scope,
        expression: resolution.confidence.expression,
        composite: resolution.compositeConfidence,
      },
      expressionLabel: resolution.expressionLabel,
      exprId: resolution.exprId,
      nodeId: resolution.nodeId,
      detail,
    };
  } catch (e) {
    ctx.logger.error(`[inspectEntity] failed for ${params?.uri}: ${formatError(e)}`);
    return null;
  }
}

export function handleCapabilities(ctx: ServerContext): CapabilitiesResponse {
  try {
    return buildCapabilities(ctx);
  } catch (e) {
    ctx.logger.error(`[capabilities] failed: ${formatError(e)}`);
    return buildCapabilitiesFallback();
  }
}

/**
 * Registers all custom Aurelia request handlers on the connection.
 */
export function registerCustomHandlers(ctx: ServerContext): void {
  ctx.connection.onRequest("aurelia/getOverlay", (params: MaybeUriParam) => handleGetOverlay(ctx, params));
  ctx.connection.onRequest("aurelia/getMapping", (params: MaybeUriParam) => handleGetMapping(ctx, params));
  ctx.connection.onRequest("aurelia/queryAtPosition", (params: { uri: string; position: Position }) => handleQueryAtPosition(ctx, params));
  ctx.connection.onRequest("aurelia/getSsr", (params: MaybeUriParam) => handleGetSsr(ctx, params));
  ctx.connection.onRequest("aurelia/getDiagnostics", (params: MaybeUriParam) => handleGetDiagnostics(ctx, params));
  ctx.connection.onRequest("aurelia/dumpState", () => handleDumpState(ctx));
  ctx.connection.onRequest("aurelia/getResources", () => handleGetResources(ctx));
  ctx.connection.onRequest("aurelia/inspectEntity", (params: { uri: string; position: Position }) => handleInspectEntity(ctx, params));
  ctx.connection.onRequest("aurelia/capabilities", () => handleCapabilities(ctx));
}
