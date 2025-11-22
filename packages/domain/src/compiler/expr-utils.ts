import type {
  BindingSourceIR,
  ExprId,
  ExprRef,
  ExprTableEntry,
  InterpIR,
  IrModule,
  SourceSpan,
} from "./model/ir.js";
import type { SourceFile } from "./model/source.js";
import { absoluteSpan, resolveSourceSpan } from "./model/source.js";
import type { SourceFileId } from "./model/identity.js";

/**
 * Collect authored spans for every expression occurrence in an IR module.
 * Useful for diagnostics and overlay/mapping back to HTML.
 */
export function collectExprSpans(ir: IrModule): Map<ExprId, SourceSpan> {
  const out = new Map<ExprId, SourceSpan>();
  const visitSource = (src: BindingSourceIR) => {
    if (isInterp(src)) {
      for (const ref of src.exprs) if (!out.has(ref.id) && ref.loc) out.set(ref.id, ref.loc);
    } else {
      const ref = src as ExprRef;
      if (!out.has(ref.id) && ref.loc) out.set(ref.id, ref.loc);
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
            if (ins.from?.loc) out.set(ins.from.id, ins.from.loc);
            break;
          case "hydrateTemplateController":
            for (const p of ins.props ?? []) {
              if (p.type === "iteratorBinding") {
                continue;
              } else if (p.type === "propertyBinding") {
                visitSource(p.from);
              }
            }
            if (ins.branch?.kind === "case" && ins.branch.expr.loc) {
              out.set(ins.branch.expr.id, ins.branch.expr.loc);
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

export function ensureExprSpan(
  span: SourceSpan | null | undefined,
  fallback: SourceFile | SourceFileId | string,
): SourceSpan {
  return resolveSourceSpan(span ?? null, fallback);
}

export function resolveExprSpanIndex(
  spans: ReadonlyMap<ExprId, SourceSpan>,
  fallback: SourceFile | SourceFileId | string,
): Map<ExprId, SourceSpan> {
  const out = new Map<ExprId, SourceSpan>();
  for (const [id, span] of spans.entries()) {
    out.set(id, resolveSourceSpan(span ?? null, fallback));
  }
  return out;
}

export type HtmlMemberSegment = { path: string; span: SourceSpan };

/**
 * Collect member access spans within expressions for richer mapping/diagnostics.
 */
export function collectExprMemberSegments(
  table: readonly ExprTableEntry[],
  exprSpans: Map<ExprId, SourceSpan>,
): Map<ExprId, HtmlMemberSegment[]> {
  const out = new Map<ExprId, HtmlMemberSegment[]>();
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
    return absoluteSpan(span ?? null, base) ?? base;
  }
}

function isInterp(x: BindingSourceIR): x is InterpIR {
  return (x as InterpIR).kind === "interp";
}
