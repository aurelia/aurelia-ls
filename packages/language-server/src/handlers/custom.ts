/**
 * Custom Aurelia request handlers: aurelia/getOverlay, aurelia/getMapping, etc.
 *
 * Each handler is wrapped in try/catch to prevent exceptions from destabilizing
 * the LSP connection. Errors are logged and graceful fallbacks are returned.
 */
import type { Position } from "vscode-languageserver/node.js";
import { canonicalDocumentUri } from "@aurelia-ls/compiler";
import type {
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

export type ResourceExplorerItem = {
  name: string;
  kind: string;
  className?: string;
  file?: string;
  package?: string;
  bindableCount: number;
  bindables: ResourceExplorerBindable[];
  gapCount: number;
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
    const collections = catalog.resources;
    const resources: ResourceExplorerItem[] = [];

    // Walk elements
    for (const [name, res] of Object.entries(collections.elements)) {
      resources.push(mapCatalogResource(name, "custom-element", res, catalog));
    }
    // Walk attributes (includes template controllers flagged as isTemplateController)
    for (const [name, res] of Object.entries(collections.attributes)) {
      const kind = res.isTemplateController ? "template-controller" : "custom-attribute";
      resources.push(mapCatalogResource(name, kind, res, catalog));
    }
    // Walk controllers
    for (const [name, res] of Object.entries(collections.controllers)) {
      resources.push(mapCatalogResource(name, "template-controller", res, catalog));
    }
    // Walk value converters
    for (const [name, res] of Object.entries(collections.valueConverters)) {
      resources.push(mapCatalogResource(name, "value-converter", res, catalog));
    }
    // Walk binding behaviors
    for (const [name, res] of Object.entries(collections.bindingBehaviors)) {
      resources.push(mapCatalogResource(name, "binding-behavior", res, catalog));
    }

    // Sort: elements first, then alphabetically within each kind
    const kindOrder = ["custom-element", "template-controller", "custom-attribute", "value-converter", "binding-behavior"];
    resources.sort((a, b) => {
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

function mapCatalogResource(
  name: string,
  kind: string,
  res: { className?: string; file?: string; package?: string; bindables?: Readonly<Record<string, import("@aurelia-ls/compiler").Bindable>> },
  catalog: import("@aurelia-ls/compiler").ResourceCatalog,
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
  const gapKey = `${kind}:${name}`;
  const gaps = catalog.gapsByResource?.[gapKey] ?? [];
  return {
    name,
    kind,
    className: res.className,
    file: res.file,
    package: res.package,
    bindableCount: bindables.length,
    bindables,
    gapCount: Array.isArray(gaps) ? gaps.length : 0,
  };
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
  ctx.connection.onRequest("aurelia/capabilities", () => handleCapabilities(ctx));
}
