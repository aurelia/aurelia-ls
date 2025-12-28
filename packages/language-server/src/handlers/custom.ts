/**
 * Custom Aurelia request handlers: aurelia/getOverlay, aurelia/getMapping, etc.
 */
import type { Position } from "vscode-languageserver/node.js";
import { canonicalDocumentUri, deriveTemplatePaths } from "@aurelia-ls/compiler";
import type { ServerContext } from "../context.js";

type MaybeUriParam = { uri?: string } | string | null;

function uriFromParam(params: MaybeUriParam): string | undefined {
  if (typeof params === "string") return params;
  if (params && typeof params === "object" && typeof params.uri === "string") return params.uri;
  return undefined;
}

export function handleGetOverlay(ctx: ServerContext, params: MaybeUriParam) {
  const uri = uriFromParam(params);
  ctx.logger.log(`RPC aurelia/getOverlay params=${JSON.stringify(params)}`);
  if (!uri) return null;
  ctx.syncWorkspaceWithIndex();
  const artifact = ctx.materializeOverlay(uri);
  return artifact
    ? { fingerprint: ctx.workspace.fingerprint, artifact }
    : null;
}

export function handleGetMapping(ctx: ServerContext, params: MaybeUriParam) {
  const uri = uriFromParam(params);
  if (!uri) return null;
  ctx.syncWorkspaceWithIndex();
  const canonical = canonicalDocumentUri(uri);
  const doc = ctx.ensureProgramDocument(uri);
  if (!doc) return null;
  const mapping = ctx.workspace.program.getMapping(canonical.uri);
  if (!mapping) return null;
  const derived = deriveTemplatePaths(canonical.uri, ctx.overlayPathOptions());
  return { overlayPath: derived.overlay.path, mapping };
}

export function handleQueryAtPosition(ctx: ServerContext, params: { uri: string; position: Position }) {
  const uri = params?.uri;
  if (!uri || !params.position) return null;
  ctx.syncWorkspaceWithIndex();
  const doc = ctx.ensureProgramDocument(uri);
  if (!doc) return null;
  const canonical = canonicalDocumentUri(uri);
  const query = ctx.workspace.program.getQuery(canonical.uri);
  const offset = doc.offsetAt(params.position);
  return {
    expr: query.exprAt(offset),
    node: query.nodeAt(offset),
    controller: query.controllerAt(offset),
    bindables: query.nodeAt(offset) ? query.bindablesFor(query.nodeAt(offset)!) : null,
    mappingSize: ctx.workspace.program.getMapping(canonical.uri)?.entries.length ?? 0,
  };
}

export function handleGetSsr(ctx: ServerContext, params: MaybeUriParam) {
  const uri = uriFromParam(params);
  if (!uri) return null;
  ctx.logger.info(`aurelia/getSsr: SSR not yet available for ${uri}`);
  return null;
}

export function handleDumpState(ctx: ServerContext) {
  const roots = ctx.tsService.getService().getProgram()?.getRootFileNames() ?? [];
  return {
    workspaceRoot: ctx.workspaceRoot,
    caseSensitive: ctx.paths.isCaseSensitive(),
    projectVersion: ctx.tsService.getProjectVersion(),
    overlayRoots: ctx.overlayFs.listScriptRoots(),
    overlays: ctx.overlayFs.listOverlays(),
    programRoots: roots,
    programCache: ctx.workspace.program.getCacheStats(),
  };
}

/**
 * Registers all custom Aurelia request handlers on the connection.
 */
export function registerCustomHandlers(ctx: ServerContext): void {
  ctx.connection.onRequest("aurelia/getOverlay", (params: MaybeUriParam) => handleGetOverlay(ctx, params));
  ctx.connection.onRequest("aurelia/getMapping", (params: MaybeUriParam) => handleGetMapping(ctx, params));
  ctx.connection.onRequest("aurelia/queryAtPosition", (params: { uri: string; position: Position }) => handleQueryAtPosition(ctx, params));
  ctx.connection.onRequest("aurelia/getSsr", (params: MaybeUriParam) => handleGetSsr(ctx, params));
  ctx.connection.onRequest("aurelia/dumpState", () => handleDumpState(ctx));
}
