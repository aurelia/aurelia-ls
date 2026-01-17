/**
 * Custom Aurelia request handlers: aurelia/getOverlay, aurelia/getMapping, etc.
 *
 * Each handler is wrapped in try/catch to prevent exceptions from destabilizing
 * the LSP connection. Errors are logged and graceful fallbacks are returned.
 */
import type { Position } from "vscode-languageserver/node.js";
import { canonicalDocumentUri } from "@aurelia-ls/compiler";
import type { ServerContext } from "../context.js";

type MaybeUriParam = { uri?: string } | string | null;

function uriFromParam(params: MaybeUriParam): string | undefined {
  if (typeof params === "string") return params;
  if (params && typeof params === "object" && typeof params.uri === "string") return params.uri;
  return undefined;
}

function formatError(e: unknown): string {
  if (e instanceof Error) return e.stack ?? e.message;
  return String(e);
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
