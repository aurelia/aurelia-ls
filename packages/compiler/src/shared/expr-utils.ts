import type {
  BindingSourceIR,
  ExprId,
  ExprRef,
  ExprTableEntry,
  InterpIR,
  IrModule,
  SourceSpan,
  IsBindingBehavior,
  BindingPattern,
  Interpolation,
  ForOfStatement,
  AttributeBindableIR,
  ControllerBindableIR,
  ElementBindableIR,
  IteratorBindingIR,
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
  const visitBindable = (bindable: ElementBindableIR | AttributeBindableIR | ControllerBindableIR | IteratorBindingIR) => {
    switch (bindable.type) {
      case "propertyBinding":
      case "attributeBinding":
      case "stylePropertyBinding":
        visitSource(bindable.from);
        break;
      case "multiAttr":
        if (bindable.from) visitSource(bindable.from);
        break;
      case "iteratorBinding":
        // Record the ForOfStatement expression span. The ForOfStatement
        // carries the full iterator header span (e.g., "item of items").
        recordExprSpan(bindable.forOf.astId, bindable.forOf.loc);
        // Also visit tail props (semicolon params like key/contextual)
        for (const p of bindable.props ?? []) {
          if (p.from) visitSource(p.from);
        }
        break;
      default:
        break;
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
          case "hydrateElement":
          case "hydrateAttribute":
            for (const p of ins.props ?? []) visitBindable(p);
            break;
          case "hydrateTemplateController":
            for (const p of ins.props ?? []) visitBindable(p);
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
        const parentPath = parentChain(node.ancestor);
        if (parentPath) {
          const parentSpan = node.name.span
            ? { start: node.span.start, end: Math.max(node.span.start, node.name.span.start - 1), file: node.span.file }
            : node.span;
          acc.push({ path: parentPath, span: toHtmlSpan(parentSpan, base) });
        }
        const path = parentPath ? `${parentPath}.${node.name.name}` : node.name.name;
        acc.push({ path, span: toHtmlSpan(node.name.span, base) });
        return path;
      }
      case "AccessThis": {
        const path = node.ancestor === 0 ? "$this" : parentChain(node.ancestor);
        acc.push({ path, span: toHtmlSpan(node.span, base) });
        return path;
      }
      case "AccessMember": {
        const parentPath = walk(node.object, base, acc, inheritedPath);
        const path = parentPath ? `${parentPath}.${node.name.name}` : undefined;
        if (path) {
          // Extend span to include the '.' operator by starting from object's end.
          // Preserve the file property so toHtmlSpan recognizes this as an absolute span.
          const objectSpan = (node.object as { span?: SourceSpan }).span;
          const objectEnd = objectSpan?.end;
          const memberSpan = objectEnd != null && node.name.span
            ? { start: objectEnd, end: node.name.span.end, file: node.name.span.file }
            : node.name.span;
          acc.push({ path, span: toHtmlSpan(memberSpan, base) });
        }
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
      case "BindingBehavior":
        walk(node.expression, base, acc, inheritedPath);
        for (const arg of node.args ?? []) walk(arg, base, acc, undefined);
        return inheritedPath;
      case "ValueConverter":
        walk(node.expression, base, acc, inheritedPath);
        for (const arg of node.args ?? []) walk(arg, base, acc, undefined);
        return inheritedPath;
      case "CallScope":
        for (const a of node.args ?? []) walk(a, base, acc, undefined);
        return walk({ $kind: "AccessScope", name: node.name, ancestor: node.ancestor, span: node.name.span }, base, acc, inheritedPath);
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

  function parentChain(ancestor: number): string {
    if (ancestor <= 0) return "";
    return Array.from({ length: ancestor }, () => "$parent").join(".");
  }
}

export function isInterpolation(x: BindingSourceIR): x is InterpIR {
  return (x as InterpIR).kind === "interp";
}

/* ============================================================================
 * Expression Resource Extraction
 * ============================================================================
 * Walk expression AST to extract binding behavior and value converter names.
 * Used by 20-link for unknown resource + invalid binding pattern diagnostics.
 */

export interface ExprResourceRef {
  kind: "bindingBehavior" | "valueConverter";
  name: string;
  span: SourceSpan;
  /** The expression ID this ref came from (for duplicate detection) */
  exprId: ExprId;
}

export interface HostAssignmentRef {
  span: SourceSpan;
  exprId: ExprId;
}

/**
 * Extract all binding behavior and value converter references from an expression table.
 * Returns refs with name, span, and source expression ID for validation.
 */
export function extractExprResources(table: readonly ExprTableEntry[]): ExprResourceRef[] {
  const refs: ExprResourceRef[] = [];
  for (const entry of table) {
    walkAst(entry.ast, refs, entry.id);
  }
  return refs;
}

/**
 * Extract all assignments to `$host` from an expression table.
 * Used by 20-link for invalid binding pattern diagnostics.
 *
 * Detects patterns like:
 * - `$host = x`
 * - `$host.prop = x`
 * - `$host[key] = x`
 */
export function extractHostAssignments(table: readonly ExprTableEntry[]): HostAssignmentRef[] {
  const refs: HostAssignmentRef[] = [];
  for (const entry of table) {
    walkAstForHostAssign(entry.ast, refs, entry.id);
  }
  return refs;
}

type AstNode = ExprTableEntry["ast"];

/** Walk AST to extract binding behaviors and value converters, using forEachExprChild. */
function walkAst(node: AstNode | undefined, refs: ExprResourceRef[], exprId: ExprId): void {
  if (!node || typeof node !== "object") return;
  const kind = (node as { $kind?: string }).$kind;
  if (!kind) return;

  // Collect binding behavior / value converter at current node
  if (kind === "BindingBehavior") {
    const n = node as { name: { name: string; span: SourceSpan } };
    refs.push({ kind: "bindingBehavior", name: n.name.name, span: n.name.span, exprId });
  } else if (kind === "ValueConverter") {
    const n = node as { name: { name: string; span: SourceSpan } };
    refs.push({ kind: "valueConverter", name: n.name.name, span: n.name.span, exprId });
  }

  // Recurse into children using the unified walker
  forEachExprChild(node as WalkableExpr, child => walkAst(child, refs, exprId));
}

/** Walk AST to find assignments to $host, using forEachExprChild. */
function walkAstForHostAssign(node: AstNode | undefined, refs: HostAssignmentRef[], exprId: ExprId): void {
  if (!node || typeof node !== "object") return;
  const kind = (node as { $kind?: string }).$kind;
  if (!kind) return;

  // Check for $host assignment at current node
  if (kind === "Assign") {
    const n = node as { target: AstNode; span?: SourceSpan };
    if (isHostTarget(n.target)) {
      refs.push({ span: n.span ?? { start: 0, end: 0 }, exprId });
    }
  }

  // Recurse into children using the unified walker
  forEachExprChild(node as WalkableExpr, child => walkAstForHostAssign(child, refs, exprId));
}

/**
 * Check if an AST node is $host or an access chain rooted at $host.
 */
function isHostTarget(node: AstNode | undefined): boolean {
  if (!node || typeof node !== "object") return false;
  const kind = (node as { $kind?: string }).$kind;
  if (!kind) return false;

  // Direct $host access (AccessBoundary represents $host)
  if (kind === "AccessBoundary") {
    return true;
  }

  // AccessScope with name "$host" (in case parser represents it this way)
  if (kind === "AccessScope") {
    const n = node as { name: { name: string } };
    return n.name.name === "$host";
  }

  // Property/key access on $host (e.g., $host.prop or $host[key])
  if (kind === "AccessMember" || kind === "AccessKeyed") {
    const n = node as { object: AstNode };
    return isHostTarget(n.object);
  }

  return false;
}

function firstFileFromSpans(spans: ReadonlyExprIdMap<SourceSpan>): SourceFileId | undefined {
  for (const span of spans.values()) {
    if (span?.file) return span.file;
  }
  return undefined;
}

/* =============================================================================
 * Generic Expression Tree Traversal (TypeScript forEachChild pattern)
 * =============================================================================
 * Single source of truth for AST structure. All expression walkers should use
 * these primitives instead of duplicating switch statements.
 *
 * Usage:
 *   function myWalker(node: IsBindingBehavior, acc: MyAcc): void {
 *     // Process current node
 *     if (node.$kind === "BindingBehavior") acc.bbs.push(node.name.name);
 *     // Recurse into children
 *     forEachExprChild(node, child => myWalker(child, acc));
 *   }
 */

/**
 * Any expression-like AST node that can be walked.
 * Includes IsBindingBehavior, Interpolation, and ForOfStatement.
 */
export type WalkableExpr = IsBindingBehavior | Interpolation | ForOfStatement;

/**
 * Visit each immediate child expression of a node.
 * Does NOT recurse - caller is responsible for recursion if needed.
 *
 * This is the single source of truth for expression AST structure.
 * All walkers should use this instead of duplicating switch statements.
 */
export function forEachExprChild(
  node: WalkableExpr | undefined,
  cb: (child: IsBindingBehavior) => void,
): void {
  if (!node || typeof node !== "object") return;
  const kind = (node as { $kind?: string }).$kind;
  if (!kind) return;

  switch (kind) {
    // === Wrapper expressions ===
    case "BindingBehavior": {
      const n = node as { expression: IsBindingBehavior; args?: IsBindingBehavior[] };
      cb(n.expression);
      for (const a of n.args ?? []) cb(a);
      break;
    }
    case "ValueConverter": {
      const n = node as { expression: IsBindingBehavior; args?: IsBindingBehavior[] };
      cb(n.expression);
      for (const a of n.args ?? []) cb(a);
      break;
    }

    // === Assignment/Conditional ===
    case "Assign": {
      const n = node as { target: IsBindingBehavior; value: IsBindingBehavior };
      cb(n.target);
      cb(n.value);
      break;
    }
    case "Conditional": {
      const n = node as { condition: IsBindingBehavior; yes: IsBindingBehavior; no: IsBindingBehavior };
      cb(n.condition);
      cb(n.yes);
      cb(n.no);
      break;
    }

    // === Access expressions ===
    case "AccessMember":
    case "AccessKeyed": {
      const n = node as { object: IsBindingBehavior; key?: IsBindingBehavior };
      cb(n.object);
      if (n.key) cb(n.key);
      break;
    }

    // === Call expressions ===
    case "CallScope":
    case "CallGlobal": {
      const n = node as { args?: IsBindingBehavior[] };
      for (const a of n.args ?? []) cb(a);
      break;
    }
    case "CallMember":
    case "CallFunction": {
      const n = node as { object?: IsBindingBehavior; func?: IsBindingBehavior; args?: IsBindingBehavior[] };
      if (n.object) cb(n.object);
      if (n.func) cb(n.func);
      for (const a of n.args ?? []) cb(a);
      break;
    }

    // === Operators ===
    case "Binary": {
      const n = node as { left: IsBindingBehavior; right: IsBindingBehavior };
      cb(n.left);
      cb(n.right);
      break;
    }
    case "Unary":
    case "Paren": {
      const n = node as { expression: IsBindingBehavior };
      cb(n.expression);
      break;
    }

    // === Constructors ===
    case "New": {
      const n = node as { func: IsBindingBehavior; args?: IsBindingBehavior[] };
      cb(n.func);
      for (const a of n.args ?? []) cb(a);
      break;
    }

    // === Literals (with nested expressions) ===
    case "ArrayLiteral": {
      const n = node as { elements?: IsBindingBehavior[] };
      for (const el of n.elements ?? []) cb(el);
      break;
    }
    case "ObjectLiteral": {
      const n = node as { values?: IsBindingBehavior[] };
      for (const v of n.values ?? []) cb(v);
      break;
    }

    // === Templates ===
    case "Template": {
      const n = node as { expressions?: IsBindingBehavior[] };
      for (const e of n.expressions ?? []) cb(e);
      break;
    }
    case "TaggedTemplate": {
      const n = node as { func: IsBindingBehavior; expressions?: IsBindingBehavior[] };
      cb(n.func);
      for (const e of n.expressions ?? []) cb(e);
      break;
    }

    // === Interpolation ===
    case "Interpolation": {
      const n = node as { expressions?: IsBindingBehavior[] };
      for (const e of n.expressions ?? []) cb(e);
      break;
    }

    // === ForOfStatement (iterator header) ===
    case "ForOfStatement": {
      const n = node as { iterable: IsBindingBehavior };
      cb(n.iterable);
      // Note: declaration is a BindingPattern, use forEachPatternChild for that
      break;
    }

    // === Arrow function ===
    case "ArrowFunction": {
      const n = node as { body: IsBindingBehavior };
      cb(n.body);
      break;
    }

    // === Destructuring assignment ===
    case "DestructuringAssignment": {
      const n = node as { source: IsBindingBehavior };
      cb(n.source);
      // Note: pattern is a BindingPattern, use forEachPatternChild for that
      break;
    }

    // === Terminal nodes (no children) ===
    case "AccessScope":
    case "AccessThis":
    case "AccessBoundary":
    case "AccessGlobal":
    case "PrimitiveLiteral":
    case "Custom":
    case "BadExpression":
      break;

    // === Binding patterns (handled by forEachPatternChild) ===
    case "BindingIdentifier":
    case "BindingPatternDefault":
    case "BindingPatternHole":
    case "ArrayBindingPattern":
    case "ObjectBindingPattern":
      break;

    default:
      // Unknown node type - skip silently for forward compatibility
      break;
  }
}

/**
 * Visit each immediate child pattern of a binding pattern.
 * Does NOT recurse - caller is responsible for recursion if needed.
 *
 * This is the single source of truth for binding pattern structure.
 */
export function forEachPatternChild(
  pattern: BindingPattern | undefined,
  cb: (child: BindingPattern) => void,
): void {
  if (!pattern || typeof pattern !== "object") return;
  const kind = (pattern as { $kind?: string }).$kind;
  if (!kind) return;

  switch (kind) {
    case "BindingPatternDefault": {
      const p = pattern as { target: BindingPattern };
      cb(p.target);
      break;
    }
    case "ArrayBindingPattern": {
      const p = pattern as { elements?: BindingPattern[]; rest?: BindingPattern | null };
      for (const el of p.elements ?? []) cb(el);
      if (p.rest) cb(p.rest);
      break;
    }
    case "ObjectBindingPattern": {
      const p = pattern as { properties?: Array<{ value: BindingPattern }>; rest?: BindingPattern | null };
      for (const prop of p.properties ?? []) cb(prop.value);
      if (p.rest) cb(p.rest);
      break;
    }
    // Terminal patterns (no children)
    case "BindingIdentifier":
    case "BindingPatternHole":
    case "BadExpression":
      break;
    default:
      break;
  }
}

/**
 * Recursively walk all expression children (depth-first).
 * Convenience wrapper when you don't need control over recursion.
 */
export function walkExprTree(
  node: WalkableExpr | undefined,
  visit: (node: IsBindingBehavior) => void,
): void {
  if (!node) return;
  // Visit current node (cast is safe for terminal check)
  visit(node as IsBindingBehavior);
  // Recurse into children
  forEachExprChild(node, child => walkExprTree(child, visit));
}

/**
 * Recursively walk all pattern children (depth-first).
 * Convenience wrapper when you don't need control over recursion.
 */
export function walkPatternTree(
  pattern: BindingPattern | undefined,
  visit: (pattern: BindingPattern) => void,
): void {
  if (!pattern) return;
  visit(pattern);
  forEachPatternChild(pattern, child => walkPatternTree(child, visit));
}

/**
 * Collect all binding names from a pattern (destructuring).
 * Single implementation used by bind, plan, type-analysis.
 */
export function collectBindingNames(pattern: BindingPattern | undefined): string[] {
  const names: string[] = [];
  walkPatternTree(pattern, p => {
    if ((p as { $kind?: string }).$kind === "BindingIdentifier") {
      const name = (p as { name?: { name: string } }).name;
      if (name) names.push(name.name);
    }
  });
  return names;
}

/**
 * BadExpression node type (for return type of findBadInPattern).
 */
export interface BadExpressionNode {
  $kind: "BadExpression";
  span?: SourceSpan;
  message?: string;
}

/**
 * Find the first BadExpression in a pattern tree (for error reporting).
 * Returns the full BadExpression node for span/message access.
 */
export function findBadInPattern(pattern: BindingPattern | undefined): BadExpressionNode | null {
  if (!pattern) return null;
  const kind = (pattern as { $kind?: string }).$kind;
  if (kind === "BadExpression") {
    return pattern as unknown as BadExpressionNode;
  }
  // Check children
  let found: BadExpressionNode | null = null;
  forEachPatternChild(pattern, child => {
    if (!found) found = findBadInPattern(child);
  });
  return found;
}
