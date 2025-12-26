import type {
  BindingSourceIR,
  ExprId,
  ExprRef,
  ExprTableEntry,
  InterpIR,
  IrModule,
  SourceSpan,
} from "../model/ir.js";
import type { SourceFile } from "../model/source.js";
import { absoluteSpan, fallbackSpan, resolveSourceSpan, resolveSourceSpanMaybe } from "../model/source.js";
import type { ExprIdMap, ReadonlyExprIdMap, SourceFileId } from "../model/identity.js";
import { normalizeSpan, normalizeSpanMaybe } from "../model/span.js";

/**
 * Collect authored spans for every expression occurrence in an IR module.
 * Useful for diagnostics and overlay/mapping back to HTML.
 */
export function collectExprSpans(ir: IrModule): ExprIdMap<SourceSpan> {
  const out: ExprIdMap<SourceSpan> = new Map();
  const recordExprSpan = (id: ExprId, span: SourceSpan | null | undefined) => {
    if (out.has(id)) return;
    const normalized = normalizeSpanMaybe(span);
    if (normalized) out.set(id, normalized);
  };
  const visitSource = (src: BindingSourceIR) => {
    if (isInterpolation(src)) {
      for (const ref of src.exprs) recordExprSpan(ref.id, ref.loc);
    } else {
      const ref = src;
      recordExprSpan(ref.id, ref.loc);
    }
  };

  for (const t of ir.templates) {
    for (const row of t.rows ?? []) {
      for (const ins of row.instructions ?? []) {
        switch (ins.type) {
          case "propertyBinding":
          case "attributeBinding":
          case "stylePropertyBinding":
          case "textBinding":
            visitSource(ins.from);
            break;
          case "listenerBinding":
          case "refBinding":
            recordExprSpan(ins.from.id, ins.from?.loc);
            break;
          case "hydrateTemplateController":
            for (const p of ins.props ?? []) {
              if (p.type === "iteratorBinding") {
                continue;
              } else if (p.type === "propertyBinding") {
                visitSource(p.from);
              }
            }
            if (ins.branch?.kind === "case") {
              recordExprSpan(ins.branch.expr.id, ins.branch.expr.loc);
            }
            break;
          case "hydrateLetElement":
            for (const lb of ins.instructions ?? []) visitSource(lb.from);
            break;
          default:
            break;
        }
      }
    }
  }
  return out;
}

/** Index an expression table by ExprId with normalized Map semantics. */
export function indexExprTable(table: readonly ExprTableEntry[] | undefined): ExprIdMap<ExprTableEntry> {
  const m: ExprIdMap<ExprTableEntry> = new Map();
  if (!table) return m;
  for (const e of table) m.set(e.id, e);
  return m;
}

export function ensureExprSpan(
  span: SourceSpan | null | undefined,
  fallback: SourceFile | SourceFileId | string,
): SourceSpan {
  return resolveSourceSpan(span ?? null, fallback);
}

export function resolveExprSpanIndex(
  spans: ReadonlyExprIdMap<SourceSpan>,
  fallback?: SourceFile | SourceFileId | string,
): ExprIdMap<SourceSpan> {
  const out: ExprIdMap<SourceSpan> = new Map();
  const inferredFallback = fallback ?? firstFileFromSpans(spans);
  for (const [id, span] of spans.entries()) {
    const resolved = inferredFallback
      ? resolveSourceSpanMaybe(span ?? null, inferredFallback)
      : resolveSourceSpanMaybe(span ?? null, null);
    if (resolved) {
      out.set(id, resolved);
      continue;
    }
    if (inferredFallback) {
      const start = span?.start ?? 0;
      const end = span?.end ?? start;
      out.set(id, fallbackSpan(inferredFallback, start, end));
      continue;
    }
    out.set(id, normalizeSpan(span ?? { start: 0, end: 0 }));
  }
  return out;
}

export type HtmlMemberSegment = { path: string; span: SourceSpan };

export interface ExprSpanIndex {
  readonly spans: ExprIdMap<SourceSpan>;
  readonly fallback?: SourceFile | SourceFileId | string;
  get(id: ExprId): SourceSpan | null;
  ensure(id: ExprId, fallback?: SourceFile | SourceFileId | string): SourceSpan;
}

/** Build a normalized, file-aware span index for all expressions in an IR module. */
export function buildExprSpanIndex(ir: IrModule, fallback?: SourceFile | SourceFileId | string): ExprSpanIndex {
  const collected = collectExprSpans(ir);
  const resolved = resolveExprSpanIndex(collected, fallback);
  const defaultFallback = fallback ?? firstFileFromSpans(resolved);

  const get = (id: ExprId): SourceSpan | null => resolved.get(id) ?? null;
  const ensure = (id: ExprId, fb?: SourceFile | SourceFileId | string): SourceSpan => {
    const span = get(id);
    const source = fb ?? defaultFallback ?? span?.file;
    if (source) return resolveSourceSpan(span, source);
    return normalizeSpan(span ?? { start: 0, end: 0 });
  };

  const base: Pick<ExprSpanIndex, "spans" | "get" | "ensure"> = { spans: resolved, get, ensure };
  return defaultFallback ? { ...base, fallback: defaultFallback } : base;
}

/** Extract all ExprIds from a BindingSourceIR (ExprRef | InterpIR). */
export function exprIdsOf(src: BindingSourceIR | ExprRef | InterpIR): readonly ExprId[] {
  return isInterpolation(src) ? src.exprs.map((e) => e.id) : [src.id];
}

/** First ExprId from a binding source (handy for singleton bindings). */
export function primaryExprId(src: BindingSourceIR | ExprRef | InterpIR): ExprId | undefined {
  const ids = exprIdsOf(src);
  return ids[0];
}

/**
 * Collect member access spans within expressions for richer mapping/diagnostics.
 */
export function collectExprMemberSegments(
  table: readonly ExprTableEntry[],
  exprSpans: ReadonlyExprIdMap<SourceSpan>,
): ExprIdMap<HtmlMemberSegment[]> {
  const out: ExprIdMap<HtmlMemberSegment[]> = new Map();
  for (const entry of table) {
    const base = exprSpans.get(entry.id);
    if (!base) continue;
    if (entry.expressionType !== "IsProperty" && entry.expressionType !== "IsFunction") continue;
    const segments: HtmlMemberSegment[] = [];
    walk(entry.ast, base, segments, undefined);
    if (segments.length > 0) out.set(entry.id, segments);
  }
  return out;

  function walk(
    node: ExprTableEntry["ast"] | undefined,
    base: SourceSpan,
    acc: HtmlMemberSegment[],
    inheritedPath: string | undefined,
  ): string | undefined {
    if (!node || !node.$kind) return inheritedPath;
    switch (node.$kind) {
      case "AccessScope": {
        const pathBase = node.ancestor === 0 ? "" : `$parent^${node.ancestor}.`;
        if (node.name) {
          const path = `${pathBase}${node.name}`;
          acc.push({ path, span: toHtmlSpan(node.span, base) });
          return path;
        }
        return pathBase ? pathBase.slice(0, -1) : undefined;
      }
      case "AccessThis": {
        const path = node.ancestor === 0 ? "$this" : `$parent^${node.ancestor}`;
        acc.push({ path, span: toHtmlSpan(node.span, base) });
        return path;
      }
      case "AccessMember": {
        const parentPath = walk(node.object, base, acc, inheritedPath);
        const path = parentPath ? `${parentPath}.${node.name}` : undefined;
        if (path) acc.push({ path, span: toHtmlSpan(node.span, base) });
        return path;
      }
      case "AccessKeyed": {
        const parentPath = walk(node.object, base, acc, inheritedPath);
        walk(node.key, base, acc, undefined);
        if (node.key?.$kind === "PrimitiveLiteral") {
          const key = String(node.key.value ?? "");
          const path = parentPath ? `${parentPath}[${JSON.stringify(key)}]` : undefined;
          if (path) acc.push({ path, span: toHtmlSpan(node.span, base) });
          return path;
        }
        return parentPath;
      }
      case "CallScope":
        for (const a of node.args ?? []) walk(a, base, acc, undefined);
        return walk({ $kind: "AccessScope", name: node.name, ancestor: node.ancestor, span: node.span }, base, acc, inheritedPath);
      case "CallMember":
        for (const a of node.args ?? []) walk(a, base, acc, undefined);
        return walk(node.object, base, acc, inheritedPath);
      case "CallFunction":
        for (const a of node.args ?? []) walk(a, base, acc, inheritedPath);
        return walk(node.func, base, acc, inheritedPath);
      case "Binary":
        walk(node.left, base, acc, inheritedPath);
        walk(node.right, base, acc, inheritedPath);
        return undefined;
      case "Unary":
        walk(node.expression, base, acc, inheritedPath);
        return inheritedPath;
      case "Assign":
        walk(node.target, base, acc, inheritedPath);
        walk(node.value, base, acc, inheritedPath);
        return inheritedPath;
      case "Conditional":
        walk(node.condition, base, acc, inheritedPath);
        walk(node.yes, base, acc, inheritedPath);
        walk(node.no, base, acc, inheritedPath);
        return inheritedPath;
      case "ArrayLiteral":
        for (const el of node.elements ?? []) walk(el, base, acc, inheritedPath);
        return inheritedPath;
      case "ObjectLiteral":
        for (const v of node.values ?? []) walk(v, base, acc, inheritedPath);
        return inheritedPath;
      case "Template":
        for (const e of node.expressions ?? []) walk(e, base, acc, inheritedPath);
        return inheritedPath;
      case "TaggedTemplate":
        walk(node.func, base, acc, inheritedPath);
        for (const e of node.expressions ?? []) walk(e, base, acc, inheritedPath);
        return inheritedPath;
      default:
        return inheritedPath;
    }
  }

  function toHtmlSpan(span: { start: number; end: number } | undefined, base: SourceSpan): SourceSpan {
    const normalizedBase = normalizeSpan(base);
    if (!span) return normalizedBase;
    const normalizedSpan: SourceSpan = normalizeSpan({ ...span });
    if (normalizedSpan.file) return normalizedSpan;
    return absoluteSpan(normalizedSpan, normalizedBase) ?? normalizedBase;
  }
}

export function isInterpolation(x: BindingSourceIR): x is InterpIR {
  return (x as InterpIR).kind === "interp";
}

// TODO: Add utility to extract binding behavior and value converter names from expression AST.
// Used by 20-resolve for AU0101/AU0103 diagnostics.
//
// interface ExprResourceRef {
//   kind: 'bindingBehavior' | 'valueConverter';
//   name: string;
//   span: SourceSpan;
// }
//
// export function extractExprResources(table: readonly ExprTableEntry[]): ExprResourceRef[] {
//   const refs: ExprResourceRef[] = [];
//   for (const entry of table) {
//     walkAst(entry.ast, refs, entry);
//   }
//   return refs;
// }
//
// Walk AST nodes, matching $kind === 'BindingBehavior' and $kind === 'ValueConverter'.
// Extract .name and .span for each. Note: expressions can be nested, so walk recursively.

function firstFileFromSpans(spans: ReadonlyExprIdMap<SourceSpan>): SourceFileId | undefined {
  for (const span of spans.values()) {
    if (span?.file) return span.file;
  }
  return undefined;
}
