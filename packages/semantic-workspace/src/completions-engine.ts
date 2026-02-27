import type { TemplateCompilation } from "@aurelia-ls/compiler/facade.js";
import type { ExpressionSemanticModel } from "@aurelia-ls/compiler/model/expression-semantic.js";
import type { DOMNode, ElementNode } from "@aurelia-ls/compiler/model/ir.js";
import type { SourceSpan } from "@aurelia-ls/compiler/model/span.js";
import { createAttributeParserFromRegistry, type PredictiveMatchResult } from "@aurelia-ls/compiler/parsing/attribute-parser.js";
import { Scanner, TokenType } from "@aurelia-ls/compiler/parsing/expression-scanner.js";
import type { DocumentUri } from "@aurelia-ls/compiler/program/primitives.js";
import { deriveResourceConfidence } from "@aurelia-ls/compiler/schema/confidence.js";
import { resolveCursorEntity, type CursorResolutionResult } from "@aurelia-ls/compiler/schema/cursor-resolve.js";
import type { SemanticModelQuery } from "@aurelia-ls/compiler/schema/model.js";
import { unwrapSourced } from "@aurelia-ls/compiler/schema/sourced.js";
import type {
  CustomAttributeDef,
  CustomElementDef,
  ProjectSemantics,
  ResourceCatalog,
  ResourceDef,
  Sourced,
  TemplateControllerDef,
  TemplateSyntaxRegistry,
} from "@aurelia-ls/compiler/schema/types.js";
import type {
  WorkspaceCompletionItem,
} from "./types.js";
import type {
  ResourceDefinitionIndex,
  ResourceDefinitionEntry,
} from "./definition.js";

// ============================================================================
// Public API
// ============================================================================

export interface CompletionEngineContext {
  readonly text: string;
  readonly uri: DocumentUri;
  readonly offset: number;
  readonly compilation: TemplateCompilation | null;
  readonly definitions: ResourceDefinitionIndex;
  readonly query: SemanticModelQuery;
  readonly syntax: TemplateSyntaxRegistry;
  readonly catalog: ResourceCatalog;
  readonly semantics: ProjectSemantics;
  /** Base completions from the workspace kernel (TypeScript overlay). */
  readonly baseCompletions: readonly WorkspaceCompletionItem[];
  /** Expression semantic model for Tier 1-3 expression completions. */
  readonly expressionModel?: ExpressionSemanticModel | null;
}

export function computeCompletions(ctx: CompletionEngineContext): readonly WorkspaceCompletionItem[] {
  const pos = resolveCompletionPosition(ctx);
  if (pos.kind === "not-applicable") return ctx.baseCompletions;

  const items: WorkspaceCompletionItem[] = [];

  switch (pos.kind) {
    case "tag-name":
      items.push(...generateTagNameItems(pos, ctx));
      break;
    case "attr-name":
      items.push(...generateAttributeNameItems(pos, ctx));
      break;
    case "binding-command":
      items.push(...generateBindingCommandItems(pos, ctx));
      break;
    case "attr-value":
      items.push(...generateAttributeValueItems(pos, ctx));
      break;
    case "expression-root":
      items.push(...generateExpressionRootItems(pos, ctx));
      break;
    case "vc-pipe":
      items.push(...generateValueConverterItems(pos, ctx));
      break;
    case "bb-pipe":
      items.push(...generateBindingBehaviorItems(pos, ctx));
      break;
    case "as-element-value":
      items.push(...generateAsElementValueItems(pos, ctx));
      break;
  }

  // Merge TypeScript-provided expression completions for member access etc.
  // The base completions handle overlay-projected TS completions. We include
  // them for expression positions where our template completions don't cover
  // member access (which requires full TS type resolution).
  if (pos.kind === "expression-root") {
    for (const base of ctx.baseCompletions) {
      if (!items.some((item) => item.label === base.label)) {
        items.push(base);
      }
    }
  }

  // Sort: confidence → origin → sortText → label (matching workspace contract)
  return sortCompletionItems(items);
}

function sortCompletionItems(items: WorkspaceCompletionItem[]): WorkspaceCompletionItem[] {
  return items.slice().sort((a, b) => {
    const ca = confidenceRank(a.confidence);
    const cb = confidenceRank(b.confidence);
    if (ca !== cb) return ca - cb;
    const oa = originRank(a.origin);
    const ob = originRank(b.origin);
    if (oa !== ob) return oa - ob;
    const ak = a.sortText ?? a.label;
    const bk = b.sortText ?? b.label;
    const kd = ak.localeCompare(bk);
    if (kd !== 0) return kd;
    return a.label.localeCompare(b.label);
  });
}

function confidenceRank(c: WorkspaceCompletionItem["confidence"]): number {
  switch (c) {
    case "exact": return 0;
    case "high": return 1;
    case "partial": return 2;
    case "low": return 3;
    default: return 1;
  }
}

function originRank(o: WorkspaceCompletionItem["origin"]): number {
  switch (o) {
    case "source": return 0;
    case "config": return 1;
    case "builtin": return 2;
    case "unknown": return 3;
    default: return 2;
  }
}

// ============================================================================
// Position Resolution
// ============================================================================

type CompletionPosition =
  | { kind: "tag-name"; prefix: string; nameStart: number; nameEnd: number }
  | { kind: "attr-name"; tagName: string; prefix: string; attrStart: number; attrEnd: number; existingAttrs: string[] }
  | { kind: "binding-command"; attrTarget: string; prefix: string; commandStart: number; commandEnd: number; predictions?: readonly PredictiveMatchResult[] }
  | { kind: "attr-value"; tagName: string; attrName: string; prefix: string; valueStart: number; valueEnd: number }
  | { kind: "expression-root"; prefix: string; exprStart: number; exprEnd: number; isInterpolation: boolean; isMemberAccess?: boolean }
  | { kind: "vc-pipe"; prefix: string; nameStart: number; nameEnd: number }
  | { kind: "bb-pipe"; prefix: string; nameStart: number; nameEnd: number }
  | { kind: "as-element-value"; prefix: string; valueStart: number; valueEnd: number }
  | { kind: "not-applicable" };

// ============================================================================
// Position Resolution — CursorEntity-based + text-scanning fallback
// ============================================================================

/**
 * Resolve the completion position.
 *
 * Two phases:
 *
 * 1. **CursorEntity dispatch**: When a compilation is available, use the
 *    shared CursorEntity resolver (same as hover, definition, rename) to
 *    identify what semantic entity the cursor is on. Map entity kind to
 *    completion position type. This handles ALL compiled positions correctly
 *    because CursorEntity already handles expression spans, controller spans,
 *    tag name spans, attribute spans, and instruction-level resolution.
 *
 * 2. **Text-scanning fallback**: When no compilation is available (template
 *    not yet compiled, mid-edit broken state) OR the CursorEntity returns
 *    null (cursor at a non-semantic position like whitespace in an open tag),
 *    fall back to text scanning to determine the structural context.
 *
 * The CursorEntity resolver eliminates the need for a custom IR walker.
 * It already handles: nameLoc vs valueLoc priority, span containment,
 * expression classification, controller span detection — all the bugs
 * that the custom walker had.
 */
function resolveCompletionPosition(ctx: CompletionEngineContext): CompletionPosition {
  const { text, offset, compilation, syntax } = ctx;

  // Phase 1: CursorEntity dispatch
  if (compilation) {
    const resolution = resolveCursorEntity({
      compilation,
      offset,
      syntax,
    });

    if (resolution) {
      const mapped = mapCursorEntityToCompletionPosition(resolution, text, offset, compilation, syntax);
      if (mapped) return mapped;
    }

    // CursorEntity returned null — cursor is at a non-semantic position.
    // Use nodeAt to determine if we're inside an element's open tag
    // (whitespace between attributes, new attribute being typed).
    const node = compilation.query.nodeAt(offset);
    if (node) {
      const tagPos = resolveNonSemanticTagPosition(node, text, offset, compilation, syntax);
      if (tagPos) {
        // Verify the tag name was resolved. If empty, the compilation is stale
        // and we should fall through to text scanning.
        if (tagPos.kind !== "attr-name" || tagPos.tagName) return tagPos;
      }
    }
  }

  // Phase 2: Text-scanning fallback for genuinely uncompiled content.
  return resolveFromText(text, offset, syntax);
}

/**
 * Map a CursorEntity to a CompletionPosition.
 *
 * The CursorEntity tells us WHAT is at the cursor. Completions needs to
 * know WHAT COULD BE at the cursor. We use the entity to determine the
 * position TYPE, then the generators produce the full universe for that type.
 */
function mapCursorEntityToCompletionPosition(
  resolution: CursorResolutionResult,
  text: string,
  offset: number,
  compilation: TemplateCompilation,
  syntax: TemplateSyntaxRegistry,
): CompletionPosition | null {
  const entity = resolution.entity;
  const span = entity.span;

  switch (entity.kind) {
    // --- Tag-name positions ---
    case "ce-tag":
    case "local-template-name": {
      // The entity span covers the full element. Use nodeAt to get the tag name span.
      const node = compilation.query.nodeAt(offset);
      const tagLoc = node?.tagLoc;
      const nameStart = tagLoc ? tagLoc.start : span.start;
      return {
        kind: "tag-name",
        prefix: text.slice(nameStart, offset),
        nameStart,
        nameEnd: offset,
      };
    }

    // --- Attribute-name positions ---
    case "ca-attr":
    case "tc-attr":
    case "bindable":
    case "plain-attr-binding":
    case "plain-attr-fallback":
    case "spread": {
      // Cursor is on an attribute name. Check for binding command via DFA first.
      const partialName = text.slice(span.start, offset);
      const cmdPos = resolveAttributeNameWithDFA(partialName, span.start, offset, syntax);
      if (cmdPos) return cmdPos;

      // Determine the enclosing element tag name.
      // Use the entity's own data when available (more reliable than nodeAt,
      // which may not find the element in TC-wrapped templates).
      let tagName = "";
      if (entity.kind === "bindable") tagName = entity.parentName;
      if (!tagName) {
        const node = compilation.query.nodeAt(offset);
        tagName = resolveTagNameFromNode(node, text);
      }
      return {
        kind: "attr-name",
        tagName,
        prefix: partialName,
        attrStart: span.start,
        attrEnd: offset,
        existingAttrs: [], // Inside an existing attr name — user is editing, no exclusion
      };
    }

    // --- Binding command position ---
    case "command": {
      // The command entity's span covers the full attribute name (e.g., "count.bind").
      // The command name starts after the last separator (dot). Extract the command prefix.
      const fullAttrText = text.slice(span.start, offset);
      const sepIdx = findLastSeparator(fullAttrText, syntax);
      const cmdStart = span.start + (sepIdx >= 0 ? sepIdx + 1 : 0);
      const cmdPrefix = sepIdx >= 0 ? fullAttrText.slice(sepIdx + 1) : fullAttrText;
      const attrTarget = sepIdx >= 0 ? fullAttrText.slice(0, sepIdx) : "";
      return {
        kind: "binding-command",
        attrTarget,
        prefix: cmdPrefix,
        commandStart: cmdStart,
        commandEnd: offset,
        predictions: resolveCommandPredictions(text, span, offset, syntax),
      };
    }

    // --- Expression positions ---
    // For ALL expression entity types, use the expression scanner to determine
    // the precise completion sub-position. The CursorEntity tells us we're in
    // an expression, but the scanner's token-level analysis correctly handles:
    // - Cursor on root identifier of `item.name` → expression-root (not member-access)
    // - Cursor after `|` → vc-pipe
    // - Cursor after `&` → bb-pipe
    // - Cursor after `.` → not-applicable (delegate to TS overlay)
    case "scope-identifier":
    case "contextual-var":
    case "scope-token":
    case "iterator-decl":
    case "global-access":
    case "member-access":
    case "value-converter":
    case "binding-behavior": {
      const exprHit = compilation.query.exprAt(offset);
      if (exprHit) {
        return scanExpressionPosition(text, offset, exprHit.span);
      }
      // Fallback: use the entity span as the expression span
      return scanExpressionPosition(text, offset, span);
    }

    // --- Template structure positions ---
    case "as-element":
      return {
        kind: "as-element-value",
        prefix: text.slice(span.start, offset),
        valueStart: span.start,
        valueEnd: offset,
      };

    case "import-from":
      // Import module specifier — resolve as attr-value with import tag context
      return {
        kind: "attr-value",
        tagName: "import",
        attrName: "from",
        prefix: text.slice(span.start, offset),
        valueStart: span.start,
        valueEnd: offset,
      };

    case "au-slot":
      // au-slot value — could offer slot name completions
      return {
        kind: "attr-value",
        tagName: "",
        attrName: "au-slot",
        prefix: text.slice(span.start, offset),
        valueStart: span.start,
        valueEnd: offset,
      };

    case "interpolation":
      // Interpolation wraps an inner entity — recurse on the inner entity
      if (entity.innerEntity) {
        return mapCursorEntityToCompletionPosition(
          { ...resolution, entity: entity.innerEntity },
          text, offset, compilation, syntax,
        );
      }
      return {
        kind: "expression-root",
        prefix: "",
        exprStart: span.start,
        exprEnd: offset,
        isInterpolation: true,
      };

    case "ref-target":
    case "let-binding":
      // These positions have specific value contexts but aren't general completions
      return { kind: "not-applicable" };

    default:
      return null;
  }
}

/**
 * Resolve a non-semantic position within an element's open tag.
 *
 * When CursorEntity returns null but nodeAt finds an element, the cursor
 * is at a position without a compiled semantic entity — typically whitespace
 * between attributes where the user is about to type a new attribute.
 */
function resolveNonSemanticTagPosition(
  node: { id: string; kind: string; span: SourceSpan; tagLoc?: SourceSpan | null; templateIndex: number },
  text: string,
  offset: number,
  compilation: TemplateCompilation,
  syntax: TemplateSyntaxRegistry,
): CompletionPosition | null {
  if (node.kind !== "element") return null;

  // If cursor is within the tag name span, it's a tag-name position
  if (node.tagLoc && offset >= node.tagLoc.start && offset <= node.tagLoc.end) {
    return {
      kind: "tag-name",
      prefix: text.slice(node.tagLoc.start, offset),
      nameStart: node.tagLoc.start,
      nameEnd: offset,
    };
  }

  // Cursor is inside the element but not on the tag name and not on a semantic
  // entity. This means it's in the attribute region (whitespace, new attribute).
  const tagName = resolveTagNameFromNode(node, text);

  // Check if the cursor is inside (or at the start of) an existing attribute's
  // name span in the IR. If so, the user is editing that attribute — don't
  // exclude any attrs from completions.
  const insideExistingAttr = isOffsetInsideAttrName(compilation, node, offset);
  if (insideExistingAttr) {
    const prefix = text.slice(insideExistingAttr.start, offset);
    // Check for binding command via DFA
    const cmdPos = resolveAttributeNameWithDFA(prefix, insideExistingAttr.start, offset, syntax);
    if (cmdPos) return cmdPos;

    return {
      kind: "attr-name",
      tagName,
      prefix,
      attrStart: insideExistingAttr.start,
      attrEnd: offset,
      existingAttrs: [], // Inside existing attr → no exclusion
    };
  }

  // Extract the token being typed (backward from cursor to whitespace)
  const currentToken = extractCurrentToken(text, offset);

  // Check if the partial token matches a binding command pattern
  if (currentToken.token && !currentToken.token.includes("=")) {
    const cmdPos = resolveAttributeNameWithDFA(currentToken.token, currentToken.start, offset, syntax);
    if (cmdPos) return cmdPos;
  }

  // Check if we're inside a quoted value (user typed an attr value without
  // the attr being in the IR yet — e.g., editing a new attribute)
  const quoteResult = detectQuotedExpression(text.slice(0, offset), offset, syntax);
  if (quoteResult) return quoteResult;

  // Collect existing attributes to exclude from suggestions
  const existingAttrs = collectExistingAttrs(compilation, node);

  return {
    kind: "attr-name",
    tagName,
    prefix: currentToken.token?.trim() ?? "",
    attrStart: currentToken.start,
    attrEnd: offset,
    existingAttrs,
  };
}

/** Resolve the tag name from a nodeAt result. */
function resolveTagNameFromNode(
  node: { tagLoc?: SourceSpan | null; span: SourceSpan } | null,
  text: string,
): string {
  if (!node) return "";
  if (node.tagLoc) {
    return text.slice(node.tagLoc.start, node.tagLoc.end);
  }
  // Fallback: extract from the span start (skip `<`)
  const match = text.slice(node.span.start).match(/^<([a-zA-Z][a-zA-Z0-9-]*)/);
  return match?.[1] ?? "";
}

/** Collect existing attribute names from the compilation's IR for an element. */
function collectExistingAttrs(
  compilation: TemplateCompilation,
  node: { id: string; templateIndex: number },
): string[] {
  const templates = compilation.ir?.templates;
  if (!templates) return [];
  const tmpl = templates[node.templateIndex];
  if (!tmpl) return [];

  // Walk the template's DOM to find the element by id and collect its attrs
  const attrs: string[] = [];
  walkDOMForAttrs(tmpl.dom.children, node.id, attrs);
  return attrs;
}

/** Check if the offset is inside any attribute's nameLoc in the IR element. */
function isOffsetInsideAttrName(
  compilation: TemplateCompilation,
  node: { id: string; templateIndex: number },
  offset: number,
): SourceSpan | null {
  const templates = compilation.ir?.templates;
  if (!templates) return null;
  const tmpl = templates[node.templateIndex];
  if (!tmpl) return null;

  const found = findDOMNodeById(tmpl.dom.children, node.id);
  if (!found || !("attrs" in found)) return null;

  for (const attr of (found as ElementNode).attrs) {
    if (attr.nameLoc && offset >= attr.nameLoc.start && offset <= attr.nameLoc.end) {
      return attr.nameLoc;
    }
  }
  return null;
}

function findDOMNodeById(nodes: readonly DOMNode[], targetId: string): DOMNode | null {
  for (const n of nodes) {
    if (n.id === targetId) return n;
    if ("children" in n && n.children) {
      const found = findDOMNodeById(n.children, targetId);
      if (found) return found;
    }
  }
  return null;
}

function walkDOMForAttrs(nodes: readonly DOMNode[], targetId: string, out: string[]): void {
  for (const n of nodes) {
    if (n.id === targetId && "attrs" in n) {
      for (const attr of (n as ElementNode).attrs) {
        out.push(attr.name.split(".")[0] ?? attr.name);
      }
      return;
    }
    if ("children" in n && n.children) {
      walkDOMForAttrs(n.children, targetId, out);
    }
  }
}

// --- Predictive DFA for attribute names ---

/**
 * Use the attribute parser's predictive DFA to determine if a partial
 * attribute name is in a binding-command position.
 */
function resolveAttributeNameWithDFA(
  partialName: string,
  nameStart: number,
  offset: number,
  syntax: TemplateSyntaxRegistry,
): CompletionPosition | null {
  const attrParser = createAttributeParserFromRegistry(syntax);
  const predictions = attrParser.predictCompletions(partialName);
  if (predictions.length === 0) return null;

  // Policy gate: only count predictions where at least one literal separator
  // has been consumed. Without a separator, a bare identifier like "class"
  // matches PART in PART.PART but shows no intent for a binding command.
  const commandPredictions = predictions.filter((p) => {
    if (p.consumedLiterals === 0) return false;
    const interpret = p.config.interpret;
    if (interpret.kind === "target-command" && p.state === "expects-part") return true;
    if (interpret.kind === "target-command" && p.state === "partial-literal") return true;
    if (interpret.kind === "mapped-fixed-command" && p.state === "expects-literal") return true;
    if (interpret.kind === "event-modifier" && (p.state === "expects-literal" || p.state === "partial-literal")) return true;
    if (interpret.kind === "fixed" && p.state === "partial-literal") return true;
    return false;
  });

  if (commandPredictions.length === 0) return null;

  const lastSepIdx = findLastSeparator(partialName, syntax);
  const attrTarget = lastSepIdx >= 0 ? partialName.slice(0, lastSepIdx) : partialName;
  const prefix = lastSepIdx >= 0 ? partialName.slice(lastSepIdx + 1) : "";

  return {
    kind: "binding-command",
    attrTarget,
    prefix,
    commandStart: nameStart + lastSepIdx + 1,
    commandEnd: offset,
    predictions: commandPredictions,
  };
}

/** Resolve command predictions for a known command entity span. */
function resolveCommandPredictions(
  text: string,
  commandSpan: SourceSpan,
  offset: number,
  syntax: TemplateSyntaxRegistry,
): readonly PredictiveMatchResult[] {
  // Walk backward from command span to find the full attribute name for DFA
  let attrStart = commandSpan.start;
  while (attrStart > 0 && !/[\s>]/.test(text[attrStart - 1] ?? "")) attrStart--;
  const fullAttrName = text.slice(attrStart, offset);
  const attrParser = createAttributeParserFromRegistry(syntax);
  return attrParser.predictCompletions(fullAttrName).filter((p) => p.consumedLiterals > 0);
}

function findLastSeparator(name: string, syntax: TemplateSyntaxRegistry): number {
  const allSymbols = new Set<string>();
  for (const p of syntax.attributePatterns) {
    for (const ch of p.symbols) allSymbols.add(ch);
  }
  for (let i = name.length - 1; i >= 0; i--) {
    if (allSymbols.has(name[i] ?? "")) return i;
  }
  return -1;
}

/** Extract the current token being typed (backward from cursor to whitespace). */
function extractCurrentToken(text: string, offset: number): { token: string; start: number } {
  let i = offset - 1;
  while (i >= 0 && !/[\s>]/.test(text[i] ?? "")) i--;
  const start = i + 1;
  const token = text.slice(start, offset);
  return { token, start };
}

// --- Phase 3: Text-scanning fallback ---

/**
 * Text-based fallback for positions the IR doesn't cover.
 * Used when the cursor is in content not yet compiled (e.g., just typed `<`).
 */
function resolveFromText(
  text: string,
  offset: number,
  syntax: TemplateSyntaxRegistry,
): CompletionPosition {
  const before = text.slice(0, offset);

  // Check for interpolation: ${...}
  let depth = 0;
  for (let i = before.length - 1; i >= 0; i--) {
    if (before[i] === "}" && i > 0 && before[i - 1] !== "$") depth++;
    if (before[i] === "{" && i > 0 && before[i - 1] === "$") {
      if (depth === 0) {
        const exprText = before.slice(i + 1);
        return resolveExpressionPositionFromText(exprText, i + 1, offset);
      }
      depth--;
    }
  }

  // Find last unclosed < tag. Track nesting so that closed tags (like
  // </aut-pagination>) don't prevent finding the enclosing open tag.
  let angleBracketPos = -1;
  let inQuote = false;
  let quoteChar = "";
  let closedTagDepth = 0;
  for (let i = before.length - 1; i >= 0; i--) {
    const ch = before[i];
    if (inQuote) { if (ch === quoteChar) inQuote = false; continue; }
    if (ch === '"' || ch === "'") { inQuote = true; quoteChar = ch!; continue; }
    if (ch === ">") {
      // Check if this is a closing tag's `>` or a self-closing `/>`.
      // Look backward to find the matching `<` to determine tag type.
      closedTagDepth++;
      continue;
    }
    if (ch === "<") {
      const isClosingTag = i + 1 < before.length && before[i + 1] === "/";
      if (isClosingTag) {
        // `</tag>` — the `<` matches a `>` we already counted
        if (closedTagDepth > 0) closedTagDepth--;
        continue;
      }
      // Opening `<tag...` — if no unmatched `>` remains, this is our target
      if (closedTagDepth > 0) {
        closedTagDepth--;
        continue;
      }
      angleBracketPos = i;
      break;
    }
  }
  if (angleBracketPos < 0) return { kind: "not-applicable" };

  const tagContent = before.slice(angleBracketPos + 1);
  const tagNameMatch = tagContent.match(/^([a-zA-Z][a-zA-Z0-9-]*)?/);
  const tagName = tagNameMatch?.[1] ?? "";
  const tagNameEnd = angleBracketPos + 1 + (tagNameMatch?.[0]?.length ?? 0);

  if (offset <= tagNameEnd) {
    return {
      kind: "tag-name",
      prefix: tagContent.slice(0, offset - angleBracketPos - 1),
      nameStart: angleBracketPos + 1,
      nameEnd: offset,
    };
  }

  // Attribute region — extract current token
  const { token: currentToken, start: tokenStart } = extractCurrentToken(before, offset);

  // Check for expression inside quotes
  const quoteResult = detectQuotedExpression(before, offset, syntax);
  if (quoteResult) return quoteResult;

  // Check for DFA-predicted binding command
  if (currentToken && !currentToken.includes("=")) {
    const attrParser = createAttributeParserFromRegistry(syntax);
    const predictions = attrParser.predictCompletions(currentToken);
    const cmdPredictions = predictions.filter((p) => {
      if (p.consumedLiterals === 0) return false;
      const interpret = p.config.interpret;
      return (
        (interpret.kind === "target-command" && p.state === "expects-part") ||
        (interpret.kind === "event-modifier" && (p.state === "expects-literal" || p.state === "partial-literal")) ||
        (interpret.kind === "mapped-fixed-command" && p.state === "expects-literal") ||
        (interpret.kind === "fixed" && p.state === "partial-literal")
      );
    });
    if (cmdPredictions.length > 0) {
      const lastSepIdx = findLastSeparator(currentToken, syntax);
      return {
        kind: "binding-command",
        attrTarget: lastSepIdx >= 0 ? currentToken.slice(0, lastSepIdx) : currentToken,
        prefix: lastSepIdx >= 0 ? currentToken.slice(lastSepIdx + 1) : "",
        commandStart: tokenStart + (lastSepIdx >= 0 ? lastSepIdx + 1 : 0),
        commandEnd: offset,
        predictions: cmdPredictions,
      };
    }
  }

  return {
    kind: "attr-name",
    tagName,
    prefix: currentToken?.trim() ?? "",
    attrStart: tokenStart,
    attrEnd: offset,
    existingAttrs: [],
  };
}

/**
 * Tokenize expression text to determine expression-internal completion context.
 * Used by both CursorEntity dispatch (for expression entities) and text-scanning fallback.
 */
function scanExpressionPosition(
  text: string,
  offset: number,
  exprSpan: SourceSpan,
): CompletionPosition {
  const exprText = text.slice(exprSpan.start, Math.min(offset, exprSpan.end));
  if (!exprText) {
    return { kind: "expression-root", prefix: "", exprStart: exprSpan.start, exprEnd: offset, isInterpolation: false };
  }

  const scanner = new Scanner(exprText);
  let lastTokenType: TokenType = TokenType.EOF;
  let lastTokenEnd = 0;
  let lastIdentifier = "";

  while (true) {
    const token = scanner.next();
    if (token.type === TokenType.EOF) break;
    if (token.start >= exprText.length) break;
    lastTokenType = token.type;
    lastTokenEnd = token.end;
    if (token.type === TokenType.Identifier ||
        token.type === TokenType.KeywordDollarThis ||
        token.type === TokenType.KeywordDollarParent ||
        token.type === TokenType.KeywordThis) {
      lastIdentifier = typeof token.value === "string" ? token.value : exprText.slice(token.start, token.end);
    } else {
      lastIdentifier = "";
    }
  }

  switch (lastTokenType) {
    case TokenType.Bar:
      return { kind: "vc-pipe", prefix: "", nameStart: exprSpan.start + lastTokenEnd, nameEnd: offset };
    case TokenType.Ampersand:
      return { kind: "bb-pipe", prefix: "", nameStart: exprSpan.start + lastTokenEnd, nameEnd: offset };
    case TokenType.Dot:
    case TokenType.QuestionDot:
      // Member access: `item.` — the expression model resolves members
      // of the left-hand expression's type at the cursor position.
      return { kind: "expression-root", prefix: "", exprStart: exprSpan.start, exprEnd: offset, isInterpolation: false, isMemberAccess: true };
    case TokenType.Identifier: {
      const beforeIdent = exprText.slice(0, lastTokenEnd - lastIdentifier.length).trimEnd();
      if (beforeIdent.endsWith("|")) {
        return { kind: "vc-pipe", prefix: lastIdentifier, nameStart: exprSpan.start + lastTokenEnd - lastIdentifier.length, nameEnd: offset };
      }
      if (beforeIdent.endsWith("&")) {
        return { kind: "bb-pipe", prefix: lastIdentifier, nameStart: exprSpan.start + lastTokenEnd - lastIdentifier.length, nameEnd: offset };
      }
      return { kind: "expression-root", prefix: lastIdentifier, exprStart: exprSpan.start, exprEnd: offset, isInterpolation: false };
    }
    default:
      return { kind: "expression-root", prefix: "", exprStart: exprSpan.start, exprEnd: offset, isInterpolation: false };
  }
}

/** Resolve expression position from raw text (fallback path). */
function resolveExpressionPositionFromText(
  exprText: string,
  exprStart: number,
  offset: number,
): CompletionPosition {
  if (!exprText.trim()) {
    return { kind: "expression-root", prefix: "", exprStart, exprEnd: offset, isInterpolation: false };
  }
  // scanExpressionPosition expects text to be sliceable at exprSpan offsets.
  // The exprText is already extracted — use zero-based span so the slice works.
  const result = scanExpressionPosition(exprText + " ", exprText.length, { start: 0, end: exprText.length } as SourceSpan);
  // Rebase the result offsets back to template-relative positions.
  if (result.kind === "expression-root") {
    return { ...result, exprStart, exprEnd: offset };
  }
  if (result.kind === "vc-pipe" || result.kind === "bb-pipe") {
    return { ...result, nameStart: result.nameStart + exprStart, nameEnd: offset };
  }
  return result;
}

/**
 * Find the expression text before the cursor by searching backwards for
 * the expression boundary (${ for interpolations, opening quote for bindings).
 * Returns the expression text and its template-relative start position.
 */
function findExpressionTextBeforeCursor(
  templateText: string,
  cursorOffset: number,
): { text: string; templateStart: number } | null {
  const before = templateText.slice(0, cursorOffset);

  // Check for interpolation: find matching ${
  let depth = 0;
  for (let i = before.length - 1; i >= 0; i--) {
    if (before[i] === "}" && i > 0 && before[i - 1] !== "$") { depth++; continue; }
    if (before[i] === "{" && i > 0 && before[i - 1] === "$") {
      if (depth === 0) {
        return { text: before.slice(i + 1), templateStart: i + 1 };
      }
      depth--;
    }
  }

  // Check for quoted attribute value: find matching opening quote
  for (let i = before.length - 1; i >= 0; i--) {
    const ch = before[i]!;
    if (ch === '"' || ch === "'") {
      // Found potential opening quote — verify it's an attribute value
      // by checking if there's an `=` before it (possibly with whitespace).
      const beforeQuote = before.slice(0, i).trimEnd();
      if (beforeQuote.endsWith("=")) {
        return { text: before.slice(i + 1), templateStart: i + 1 };
      }
      break;
    }
    // Stop at angle brackets (we've left the attribute)
    if (ch === ">" || ch === "<") break;
  }

  return null;
}

/** Detect if the cursor is inside a quoted attribute value with a binding command. */
function detectQuotedExpression(
  before: string,
  offset: number,
  syntax: TemplateSyntaxRegistry,
): CompletionPosition | null {
  // Scan backward for opening quote
  let quotePos = -1;
  for (let i = before.length - 1; i >= 0; i--) {
    const ch = before[i];
    if ((ch === '"' || ch === "'") && (i === 0 || before[i - 1] !== "\\")) {
      quotePos = i;
      break;
    }
    if (ch === ">" || ch === "\n") return null;
  }
  if (quotePos < 0) return null;

  const beforeQuote = before.slice(0, quotePos).trimEnd();
  if (!beforeQuote.endsWith("=")) return null;

  // Extract attribute name before =
  let attrStart = beforeQuote.length - 2;
  while (attrStart >= 0 && /[a-zA-Z0-9._\-:]/.test(beforeQuote[attrStart] ?? "")) attrStart--;
  attrStart++;
  const fullAttrName = beforeQuote.slice(attrStart, beforeQuote.length - 1).trim();

  // Parse with attribute parser to check for binding command
  const attrParser = createAttributeParserFromRegistry(syntax);
  const analysis = attrParser.parseWithConfig(fullAttrName, "");

  if (analysis.syntax.command) {
    const exprText = before.slice(quotePos + 1);
    return resolveExpressionPositionFromText(exprText, quotePos + 1, offset);
  }

  if (fullAttrName === "as-element" || analysis.syntax.target === "as-element") {
    return {
      kind: "as-element-value",
      prefix: before.slice(quotePos + 1),
      valueStart: quotePos + 1,
      valueEnd: offset,
    };
  }

  // Plain attribute value (no binding command) — find the enclosing tag for context.
  // Use the nearest unclosed opening tag, not the first in the file.
  const beforeAttr = before.slice(0, attrStart);
  let tagName = "";
  for (let j = beforeAttr.length - 1; j >= 0; j--) {
    if (beforeAttr[j] === "<" && j + 1 < beforeAttr.length && beforeAttr[j + 1] !== "/") {
      const tagMatch = beforeAttr.slice(j + 1).match(/^([a-zA-Z][a-zA-Z0-9-]*)/);
      if (tagMatch) tagName = tagMatch[1]!;
      break;
    }
    // Stop at > — this means we've exited the current tag context
    if (beforeAttr[j] === ">") break;
  }
  return {
    kind: "attr-value",
    tagName,
    attrName: analysis.syntax.target || fullAttrName,
    prefix: before.slice(quotePos + 1),
    valueStart: quotePos + 1,
    valueEnd: offset,
  };
}

// ============================================================================
// Sort Text Encoding
// ============================================================================

const CONFIDENCE_SORT: Record<string, string> = {
  exact: "0",
  high: "1",
  partial: "2",
  low: "3",
};

const SCOPE_SORT = {
  local: "0",
  global: "1",
} as const;

const CATEGORY_SORT = {
  bindable: "0",
  resource: "1",
  command: "2",
  contextualVar: "3",
  scopeProperty: "4",
  htmlAttribute: "5",
  htmlElement: "6",
  scopeToken: "7",
  global: "8",
  gap: "9",
} as const;

/**
 * Encode sort text for within-tier ordering.
 *
 * The workspace layer's comparator sorts by confidence → origin first (from
 * the item's confidence/origin fields), then uses sortText as a tiebreaker.
 * So sortText should encode only the SECONDARY sort dimensions: scope
 * proximity, category priority, and name.
 *
 * Do NOT encode confidence/origin into sortText — that creates a double-sort
 * conflict with the workspace comparator.
 */
function encodeSortText(
  _confidence: string,
  scope: keyof typeof SCOPE_SORT,
  category: keyof typeof CATEGORY_SORT,
  name: string,
): string {
  return `${SCOPE_SORT[scope]}~${CATEGORY_SORT[category]}~${name}`;
}

// ============================================================================
// Confidence Derivation
// ============================================================================

type CompletionTrust = {
  confidence: WorkspaceCompletionItem["confidence"];
  origin: WorkspaceCompletionItem["origin"];
};

type TrustOrigin = "builtin" | "config" | "source" | "unknown";

function deriveTrust(
  kind: string,
  name: string,
  def: ResourceDef | null,
  catalog: ResourceCatalog,
): CompletionTrust {
  const origin = resolveOrigin(def);
  const canonicalName = def ? (unwrapSourced(def.name) ?? name) : name;
  const gapKey = `${kind}:${canonicalName}`;
  const gaps = catalog.gapsByResource?.[gapKey] ?? [];
  // Map to the origin format expected by deriveResourceConfidence
  const confidenceOrigin: "builtin" | "config" | "source" | undefined =
    origin === "unknown" ? undefined : origin;
  const result = deriveResourceConfidence(gaps, confidenceOrigin);
  const confidence = result.level as WorkspaceCompletionItem["confidence"];
  return { confidence, origin };
}

function resolveOrigin(def: ResourceDef | null): TrustOrigin {
  if (!def) return "unknown";
  const nameField = def.name;
  if (!nameField || typeof nameField !== "object") return "unknown";
  const origin = (nameField).origin;
  if (origin === "source") return "source";
  if (origin === "config") return "config";
  if (origin === "builtin") return "builtin";
  return "unknown";
}

function bestEntry(entries: readonly ResourceDefinitionEntry[] | undefined): ResourceDef | null {
  if (!entries || entries.length === 0) return null;
  const first = entries[0];
  return first ? first.def : null;
}

function defName(def: ResourceDef): string {
  return unwrapSourced(def.name) ?? "";
}

// ============================================================================
// Position Type 1: Tag Name
// ============================================================================

function generateTagNameItems(
  pos: Extract<CompletionPosition, { kind: "tag-name" }>,
  ctx: CompletionEngineContext,
): WorkspaceCompletionItem[] {
  const prefix = pos.prefix.toLowerCase();
  const items: WorkspaceCompletionItem[] = [];
  const seen = new Set<string>();

  // Custom elements from the resource definition index
  for (const [name, entries] of ctx.definitions.elements) {
    if (!matchesPrefix(name, prefix)) continue;
    if (seen.has(name)) continue;
    seen.add(name);

    const def = bestEntry(entries);
    const trust = deriveTrust("custom-element", name, def, ctx.catalog);
    const bindableCount = countBindables(def);
    const detailParts: string[] = ["Custom Element"];
    if (bindableCount > 0) {
      detailParts.push(trust.confidence === "partial" || trust.confidence === "low"
        ? `${bindableCount}+ bindables`
        : `${bindableCount} bindables`);
    }

    items.push({
      label: name,
      kind: "custom-element",
      detail: detailParts.join(" · "),
      sortText: encodeSortText(trust.confidence ?? "high", "global", "resource", name),
      confidence: trust.confidence,
      origin: trust.origin,
      insertText: buildTagSnippet(name, def, trust.confidence ?? "high"),
    });

    // Also add aliases
    if (def) {
      for (const alias of extractAliases(def)) {
        if (!matchesPrefix(alias, prefix) || seen.has(alias)) continue;
        seen.add(alias);
        items.push({
          label: alias,
          kind: "custom-element",
          detail: `Custom Element (alias of ${name})`,
          sortText: encodeSortText(trust.confidence ?? "high", "global", "resource", alias),
          confidence: trust.confidence,
          origin: trust.origin,
          insertText: buildTagSnippet(alias, def, trust.confidence ?? "high"),
        });
      }
    }
  }

  // HTML elements
  const htmlElements = ctx.semantics?.dom?.elements;
  if (htmlElements) {
    for (const htmlName of Object.keys(htmlElements)) {
      if (!matchesPrefix(htmlName, prefix) || seen.has(htmlName)) continue;
      seen.add(htmlName);
      items.push({
        label: htmlName,
        kind: "html-element",
        detail: "HTML Element",
        sortText: encodeSortText("high", "global", "htmlElement", htmlName),
      });
    }
  }

  // Special elements
  for (const special of ["let", "template"]) {
    if (!matchesPrefix(special, prefix) || seen.has(special)) continue;
    seen.add(special);
    items.push({
      label: special,
      kind: "keyword",
      detail: special === "let" ? "Scope binding element" : "Template wrapper",
      sortText: encodeSortText("exact", "global", "resource", special),
    });
  }

  return items;
}

function buildTagSnippet(
  tagName: string,
  def: ResourceDef | null,
  confidence: string,
): string {
  if (confidence === "low") return tagName;

  // High/exact confidence with known bindables: full snippet
  if (confidence === "exact" || confidence === "high") {
    const requiredBindables = getRequiredBindables(def);
    if (requiredBindables.length > 0) {
      const attrParts = requiredBindables.map((b, i) => {
        const attrName = b.attribute ?? b.name;
        return `${attrName}="\${${i + 1}:}"`;
      });
      return `${tagName} ${attrParts.join(" ")}>\${0}</${tagName}>`;
    }
  }

  // Medium/partial confidence or no required bindables: tag with closing
  return `${tagName}>\${0}</${tagName}>`;
}

// ============================================================================
// Position Type 2/3: Attribute Name
// ============================================================================

function generateAttributeNameItems(
  pos: Extract<CompletionPosition, { kind: "attr-name" }>,
  ctx: CompletionEngineContext,
): WorkspaceCompletionItem[] {
  const prefix = pos.prefix.toLowerCase();
  const items: WorkspaceCompletionItem[] = [];
  const seen = new Set<string>(pos.existingAttrs.map((a) => a.toLowerCase()));

  // If the element is a custom element, show its bindables first
  const elEntries = pos.tagName ? ctx.definitions.elements.get(pos.tagName) : undefined;
  const elDef = bestEntry(elEntries);
  if (elDef) {
    const trust = deriveTrust("custom-element", pos.tagName, elDef, ctx.catalog);
    const bindables = extractBindables(elDef);
    for (const bindable of bindables) {
      const attrName = bindable.attribute ?? bindable.name;
      if (!attrName) continue;
      if (!matchesPrefix(attrName, prefix)) continue;
      if (seen.has(attrName.toLowerCase())) continue;
      seen.add(attrName.toLowerCase());

      const mode = bindable.mode;
      const modeLabel = describeBindingMode(mode);
      const typeLabel = bindable.type ? `: ${formatTypeRef(bindable.type)}` : "";

      items.push({
        label: attrName,
        kind: "bindable-property",
        detail: `Bindable${typeLabel}${modeLabel ? ` (${modeLabel})` : ""}`,
        sortText: encodeSortText(trust.confidence ?? "high", "local", "bindable", attrName),
        confidence: trust.confidence,
        origin: trust.origin,
        insertText: buildBindableSnippet(attrName, mode, trust.confidence ?? "high"),
      });
    }
  }

  // Custom attributes and template controllers
  for (const [name, entries] of ctx.definitions.attributes) {
    if (!matchesPrefix(name, prefix)) continue;
    if (seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());

    const def = bestEntry(entries);
    const isTC = isTemplateController(def);
    const kind = isTC ? "template-controller" : "custom-attribute";
    const trust = deriveTrust(kind, name, def, ctx.catalog);
    const detail = isTC ? "Template Controller" : "Custom Attribute";

    items.push({
      label: name,
      kind,
      detail,
      sortText: encodeSortText(trust.confidence ?? "high", "global", "resource", name),
      confidence: trust.confidence,
      origin: trust.origin,
      insertText: buildAttributeSnippet(name, isTC, def, trust.confidence ?? "high"),
    });

    // Aliases
    if (def) {
      for (const alias of extractAliases(def)) {
        if (!matchesPrefix(alias, prefix) || seen.has(alias.toLowerCase())) continue;
        seen.add(alias.toLowerCase());
        items.push({
          label: alias,
          kind,
          detail: `${detail} (alias of ${name})`,
          sortText: encodeSortText(trust.confidence ?? "high", "global", "resource", alias),
          confidence: trust.confidence,
          origin: trust.origin,
        });
      }
    }
  }

  // Template controllers from the controllers index
  for (const [name, entries] of ctx.definitions.controllers) {
    if (!matchesPrefix(name, prefix)) continue;
    if (seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());

    const def = bestEntry(entries);
    const trust = deriveTrust("template-controller", name, def, ctx.catalog);

    items.push({
      label: name,
      kind: "template-controller",
      detail: "Template Controller",
      sortText: encodeSortText(trust.confidence ?? "high", "global", "resource", name),
      confidence: trust.confidence,
      origin: trust.origin,
      insertText: buildAttributeSnippet(name, true, def, trust.confidence ?? "high"),
    });
  }

  // HTML attributes for this element
  const domInfo = pos.tagName ? ctx.semantics?.dom?.elements?.[pos.tagName] : null;
  if (domInfo) {
    // Element-specific props
    for (const propName of Object.keys(domInfo.props ?? {})) {
      if (!matchesPrefix(propName, prefix) || seen.has(propName.toLowerCase())) continue;
      seen.add(propName.toLowerCase());
      items.push({
        label: propName,
        kind: "html-attribute",
        detail: "Native Attribute",
        sortText: encodeSortText("high", "global", "htmlAttribute", propName),
      });
    }
    // attrToProp mappings
    for (const attrName of Object.keys(domInfo.attrToProp ?? {})) {
      if (!matchesPrefix(attrName, prefix) || seen.has(attrName.toLowerCase())) continue;
      seen.add(attrName.toLowerCase());
      items.push({
        label: attrName,
        kind: "html-attribute",
        detail: "Native Attribute",
        sortText: encodeSortText("high", "global", "htmlAttribute", attrName),
      });
    }
  }

  // Global attributes
  const globalAttrs = ctx.semantics?.naming?.attrToPropGlobal;
  if (globalAttrs) {
    for (const attrName of Object.keys(globalAttrs)) {
      if (!matchesPrefix(attrName, prefix) || seen.has(attrName.toLowerCase())) continue;
      seen.add(attrName.toLowerCase());
      items.push({
        label: attrName,
        kind: "html-attribute",
        detail: "Global Attribute",
        sortText: encodeSortText("high", "global", "htmlAttribute", attrName),
      });
    }
  }

  // Per-tag specific attributes
  const perTag = pos.tagName ? ctx.semantics?.naming?.perTag?.[pos.tagName] : null;
  if (perTag) {
    for (const attrName of Object.keys(perTag)) {
      if (!matchesPrefix(attrName, prefix) || seen.has(attrName.toLowerCase())) continue;
      seen.add(attrName.toLowerCase());
      items.push({
        label: attrName,
        kind: "html-attribute",
        detail: "Element Attribute",
        sortText: encodeSortText("high", "global", "htmlAttribute", attrName),
      });
    }
  }

  // Special attributes
  for (const [name, detail] of SPECIAL_ATTRIBUTES) {
    if (!matchesPrefix(name, prefix) || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    items.push({
      label: name,
      kind: "keyword",
      detail,
      sortText: encodeSortText("exact", "local", "resource", name),
    });
  }

  return items;
}

const SPECIAL_ATTRIBUTES: [string, string][] = [
  ["as-element", "Override element identity"],
  ["au-slot", "Content projection target"],
  ["containerless", "Render without host element"],
  ["...$attrs", "Spread transferred bindings"],
];

function buildBindableSnippet(
  attrName: string,
  mode: number | string | undefined,
  confidence: string,
): string {
  if (confidence === "low" || confidence === "partial") return attrName;

  // Determine the appropriate binding command from the declared mode
  const command = bindingCommandForMode(mode);
  return `${attrName}.${command}="\${1:}"`;
}

function buildAttributeSnippet(
  name: string,
  isTC: boolean,
  def: ResourceDef | null,
  confidence: string,
): string {
  if (confidence === "low") return name;

  // Built-in TCs get idiomatic snippets
  const tcSnippet = isTC ? builtInTcSnippet(name) : null;
  if (tcSnippet) return tcSnippet;

  // CAs with a default property
  if (!isTC && def) {
    return `${name}="\${1:}"`;
  }

  return `${name}="\${1:}"`;
}

function builtInTcSnippet(name: string): string | null {
  switch (name) {
    case "repeat": return `repeat.for="\${1:item} of \${2:items}"`;
    case "if": return `if.bind="\${1:condition}"`;
    case "else": return "else";
    case "with": return `with.bind="\${1:value}"`;
    case "switch": return `switch.bind="\${1:value}"`;
    case "case": return `case.bind="\${1:value}"`;
    case "default-case": return "default-case";
    case "portal": return `portal="\${1:}"`;
    case "promise": return `promise.bind="\${1:promise}"`;
    case "pending": return "pending";
    case "then": return `then.from-view="\${1:value}"`;
    case "catch": return `catch.from-view="\${1:error}"`;
    default: return null;
  }
}

function bindingCommandForMode(mode: number | string | undefined): string {
  switch (mode) {
    case 1: return "one-time";
    case 2: return "bind";    // toView — .bind resolves to toView for bindables
    case 4: return "from-view";
    case 6: return "bind";    // twoWay — .bind resolves to twoWay when bindable declares it
    default: return "bind";   // default (0) — .bind is idiomatic
  }
}

function describeBindingMode(mode: number | string | undefined): string {
  switch (mode) {
    case 1: return "oneTime";
    case 2: return "toView";
    case 4: return "fromView";
    case 6: return "twoWay";
    default: return "";
  }
}

// ============================================================================
// Position Type 4: Binding Command (pattern-driven)
// ============================================================================

/**
 * Pattern prefix matching for binding command completions.
 *
 * The attribute pattern registry defines which syntactic shapes are valid for
 * attribute names (e.g., `PART.PART` with symbol `.`). Each pattern carries an
 * `interpret` field that tells us what each segment means. Instead of hard-coding
 * which commands to offer, we match the user's partial input against the pattern
 * registry and use the interpret semantics to determine valid continuations.
 *
 * The core insight: `PART.PART` is a recognition grammar (matches complete inputs),
 * but completions needs a prediction grammar (predicts from partial inputs). This
 * function bridges that gap by doing prefix matching on the pattern segments.
 */
/**
 * Generate binding command completions using DFA predictions.
 *
 * Multiple attribute patterns may match the partial input. Each prediction
 * yields zero-to-many valid commands. We collect all candidates from all
 * predictions, deduplicating by name but preserving the fact that a command
 * may be valid through multiple patterns.
 *
 * The ranking depends on the validity of the command in the specific context:
 * - Commands from `target-command` patterns (PART.PART) are general-purpose
 * - Commands from `event-modifier` patterns are context-specific (events)
 * - Commands from `mapped-fixed-command` patterns are special (e.g., ref)
 *
 * We cannot assume intent — we must produce the full list of valid candidates.
 */
function generateBindingCommandItems(
  pos: Extract<CompletionPosition, { kind: "binding-command" }>,
  ctx: CompletionEngineContext,
): WorkspaceCompletionItem[] {
  const prefix = pos.prefix.toLowerCase();
  const items: WorkspaceCompletionItem[] = [];
  const seen = new Set<string>();
  const commands = ctx.syntax?.bindingCommands;
  if (!commands) return items;

  // Derive command candidates from the DFA predictions.
  // Each prediction tells us what the pattern expects at this position.
  const predictions = pos.predictions ?? [];

  // Collect all valid command names from all predictions
  const candidateSet = new Set<string>();
  let hasOpenSlot = false; // Does any prediction accept any command?

  for (const pred of predictions) {
    const interpret = pred.config.interpret;

    switch (interpret.kind) {
      case "target-command":
        // PART.PART — the next PART accepts any registered command
        hasOpenSlot = true;
        break;
      case "mapped-fixed-command":
        // PART.ref — only the fixed command
        if (interpret.command) candidateSet.add(interpret.command);
        break;
      case "event-modifier":
        // PART.trigger:PART — only the fixed command name
        if (interpret.command) candidateSet.add(interpret.command);
        break;
      case "fixed":
        // Literal match (e.g., "resolve" in "promise.resolve") — add if it's
        // also a registered command, or add as a literal completion
        if (pred.nextToken.kind === "LIT" && pred.nextToken.value) {
          candidateSet.add(pred.nextToken.value);
        }
        break;
    }
  }

  // If any prediction has an open slot (target-command), include ALL
  // registered binding commands as candidates
  if (hasOpenSlot) {
    for (const name of Object.keys(commands)) {
      candidateSet.add(name);
    }
  }

  // Build completion items from the candidate set
  for (const candidate of candidateSet) {
    if (!matchesPrefix(candidate, prefix)) continue;
    if (seen.has(candidate)) continue;

    // Skip dot-separated command names — they're registered as separate patterns
    if (candidate.includes(".")) continue;

    // Skip translation commands — they have their own dedicated patterns
    const cmdConfig = commands[candidate];
    if (cmdConfig && (cmdConfig as { kind?: string }).kind === "translation") continue;

    seen.add(candidate);

    const detail = cmdConfig
      ? formatCommandDetail(candidate, cmdConfig as { kind?: string })
      : `Binding command: .${candidate}`;
    const contextSort = commandContextSortFromKind(
      candidate,
      cmdConfig as { kind?: string } | undefined,
    );

    items.push({
      label: candidate,
      kind: "binding-command",
      detail,
      sortText: encodeSortText("exact", "global", "command", `${contextSort}~${candidate}`),
      insertText: buildCommandSnippet(candidate),
    });
  }

  // If no predictions were available (fallback path without DFA), enumerate
  // all registered commands as a safe default
  if (predictions.length === 0 && items.length === 0) {
    for (const [name, cmdConfig] of Object.entries(commands)) {
      if (!matchesPrefix(name, prefix)) continue;
      if (seen.has(name) || name.includes(".")) continue;
      if ((cmdConfig as { kind?: string }).kind === "translation") continue;
      seen.add(name);
      const detail = formatCommandDetail(name, cmdConfig as { kind?: string });
      const contextSort = commandContextSortFromKind(name, cmdConfig as { kind?: string });
      items.push({
        label: name,
        kind: "binding-command",
        detail,
        sortText: encodeSortText("exact", "global", "command", `${contextSort}~${name}`),
        insertText: buildCommandSnippet(name),
      });
    }
  }

  return items;
}

function formatCommandDetail(name: string, cmd: { kind?: string }): string {
  const kind = cmd.kind;
  if (kind === "property") return `Property binding: .${name}`;
  if (kind === "listener") return `Event listener: .${name}`;
  if (kind === "attribute") return `Attribute binding: .${name}`;
  if (kind === "style") return `Style binding: .${name}`;
  if (kind === "iterator") return `Iterator: .${name}`;
  if (kind === "ref") return `Reference: .${name}`;
  return `Binding command: .${name}`;
}

function commandContextSortFromKind(
  name: string,
  cmd: { kind?: string } | undefined,
): string {
  // Sort by command kind — property commands first (most common),
  // then listeners, then special commands
  const kind = cmd?.kind;
  if (kind === "property") return "0";
  if (kind === "listener") return "1";
  if (kind === "iterator") return "2";
  if (kind === "ref") return "3";
  if (kind === "attribute" || kind === "style") return "4";
  return "5";
}

function buildCommandSnippet(name: string): string {
  if (name === "for") return `for="\${1:item} of \${2:items}"`;
  return `${name}="\${1:}"`;
}

// ============================================================================
// Position Type 5: Attribute Value
// ============================================================================

function generateAttributeValueItems(
  pos: Extract<CompletionPosition, { kind: "attr-value" }>,
  ctx: CompletionEngineContext,
): WorkspaceCompletionItem[] {
  // For plain attribute values (no binding command), offer string literal completions
  // if the bindable type is a string literal union.
  const prefix = pos.prefix.toLowerCase();
  const items: WorkspaceCompletionItem[] = [];

  // Resolve the element and find the bindable
  const elEntries = pos.tagName ? ctx.definitions.elements.get(pos.tagName) : undefined;
  const elDef = bestEntry(elEntries);
  if (elDef) {
    const bindable = findBindableByAttribute(elDef, pos.attrName);
    if (bindable?.type && typeof bindable.type === "string") {
      // Simple heuristic: if the type looks like a literal union, extract values
      const literals = extractStringLiteralsFromTypeString(bindable.type);
      for (const lit of literals) {
        if (!matchesPrefix(lit, prefix)) continue;
        items.push({
          label: lit,
          kind: "value",
          detail: "Allowed value",
          sortText: encodeSortText("exact", "local", "bindable", lit),
        });
      }
    }
  }

  return items;
}

// ============================================================================
// Position Type 5a: Expression Root (Scope Identifiers)
// ============================================================================

function generateExpressionRootItems(
  pos: Extract<CompletionPosition, { kind: "expression-root" }>,
  ctx: CompletionEngineContext,
): WorkspaceCompletionItem[] {
  const prefix = pos.prefix.toLowerCase();
  const items: WorkspaceCompletionItem[] = [];
  const seen = new Set<string>();

  // ── Member access: return ONLY members of the left-hand type ──
  // The expression scanner confirmed this is after a dot. Resolve the
  // expression before the dot and enumerate its type's members.
  if (pos.isMemberAccess && ctx.expressionModel) {
    // Strategy 1: AST-based — works when the parser produced a complete AccessMember.
    let memberCompletions = ctx.expressionModel.getMemberCompletionsAt(pos.exprEnd);

    // Strategy 2: Text-based — works when the parser produced a recovery node
    // or BadExpression (e.g., `obj.` with no identifier after the dot).
    // Use the Scanner to tokenize the expression text and extract everything
    // before the final dot/question-dot.
    if (memberCompletions.length === 0) {
      // Find the expression text by searching backwards for the expression
      // boundary (${, opening quote, or expression attribute start).
      const exprText = findExpressionTextBeforeCursor(ctx.text, pos.exprEnd);
      if (exprText) {
        const scanner = new Scanner(exprText.text);
        const tokens: { type: TokenType; start: number; end: number }[] = [];
        while (true) {
          const tok = scanner.next();
          if (tok.type === TokenType.EOF) break;
          if (tok.start >= exprText.text.length) break;
          tokens.push({ type: tok.type, start: tok.start, end: tok.end });
        }

        // Find the last Dot or QuestionDot token.
        let dotIdx = -1;
        for (let i = tokens.length - 1; i >= 0; i--) {
          if (tokens[i]!.type === TokenType.Dot || tokens[i]!.type === TokenType.QuestionDot) {
            dotIdx = i;
            break;
          }
        }

        if (dotIdx >= 0 && dotIdx > 0) {
          // Everything before the dot token is the left-hand expression.
          const dotToken = tokens[dotIdx]!;
          const chainText = exprText.text.slice(0, dotToken.start).trim();
          if (chainText) {
            // Normalize ?. to . for chain splitting
            const normalized = chainText.replace(/\?\./g, ".");
            memberCompletions = ctx.expressionModel.getMemberCompletionsForChain(
              normalized, exprText.templateStart,
            );
          }
        }
      }
    }

    if (memberCompletions.length > 0) {
      for (const c of memberCompletions) {
        if (!matchesPrefix(c.label, prefix)) continue;
        const typeSuffix = c.type ? `: ${c.type}` : "";
        items.push({
          label: c.label,
          kind: c.kind === "method" ? "method" : "property",
          detail: `${c.label}${typeSuffix}`,
          sortText: `0~${String(c.sortPriority).padStart(2, "0")}~${c.label}`,
        });
      }
      if (items.length > 0) return items;
    }
    // Fall through to scope-root if both strategies failed.
  } else {
  }

  // ── Scope root ──
  // The expression model is the PRIMARY source for scope-root completions.
  // It provides: iterator locals, let bindings, aliases, overlay value members,
  // VM class properties, and contextual variables — all in the correct order
  // (inner scope → VM properties → contextuals).
  //
  // The completions engine adds only: scope tokens ($this, $parent, this)
  // and the global allow-list, which the expression model doesn't provide.

  // Scope tokens ($this, $parent, this)
  for (const [token, detail] of SCOPE_TOKENS) {
    if (!matchesPrefix(token, prefix) || seen.has(token)) continue;
    seen.add(token);
    items.push({
      label: token,
      kind: "keyword",
      detail,
      sortText: encodeSortText("exact", "local", "scopeToken", token),
    });
  }

  // Expression model completions (the primary source).
  if (ctx.expressionModel) {
    const exprCompletions = ctx.expressionModel.getCompletionsAt(pos.exprEnd);
    for (const c of exprCompletions) {
      if (!matchesPrefix(c.label, prefix) || seen.has(c.label)) continue;
      seen.add(c.label);
      const typeSuffix = c.type ? `: ${c.type}` : "";
      const priorityKey = String(c.sortPriority).padStart(2, "0");
      items.push({
        label: c.label,
        kind: c.kind === "method" ? "method" : c.kind === "contextual" ? "variable" : "property",
        detail: `${c.label}${typeSuffix}`,
        sortText: `0~${priorityKey}~${c.label}`,
      });
    }
  }

  // Global allow-list
  for (const name of GLOBAL_ALLOW_LIST) {
    if (!matchesPrefix(name, prefix) || seen.has(name)) continue;
    seen.add(name);
    items.push({
      label: name,
      kind: "variable",
      detail: "Global",
      sortText: encodeSortText("high", "global", "global", name),
    });
  }

  return items;
}

const SCOPE_TOKENS: [string, string][] = [
  ["$this", "Current scope binding context"],
  ["$parent", "Parent scope binding context"],
  ["this", "Nearest CE boundary scope"],
];

const CONTEXTUAL_VARIABLES: Record<string, [string, string][]> = {
  repeat: [
    ["$index", "Current iteration index"],
    ["$first", "Is first item"],
    ["$last", "Is last item"],
    ["$even", "Is even index"],
    ["$odd", "Is odd index"],
    ["$middle", "Is neither first nor last"],
    ["$length", "Collection length"],
    ["$previous", "Previous item"],
  ],
  "virtual-repeat": [
    ["$index", "Current iteration index"],
    ["$first", "Is first item"],
    ["$last", "Is last item"],
    ["$even", "Is even index"],
    ["$odd", "Is odd index"],
    ["$middle", "Is neither first nor last"],
    ["$length", "Collection length"],
  ],
};

const GLOBAL_ALLOW_LIST = [
  "Infinity", "NaN", "isFinite", "isNaN", "parseFloat", "parseInt",
  "decodeURI", "decodeURIComponent", "encodeURI", "encodeURIComponent",
  "Array", "BigInt", "Boolean", "Date", "Map", "Number", "Object", "RegExp", "Set", "String",
  "JSON", "Math", "Intl",
];

type EnclosingController = {
  kind: string;
  localName?: string;
};

function collectEnclosingControllers(
  compilation: TemplateCompilation,
  offset: number,
): EnclosingController[] {
  const controllers: EnclosingController[] = [];

  // Use the query facade to find the immediately enclosing controller at this offset.
  // controllerAt() uses span containment (pickNarrowestContaining) so it correctly
  // identifies which controller scope the cursor is physically inside.
  const controllerInfo = compilation.query.controllerAt(offset);
  if (controllerInfo) {
    controllers.push({ kind: controllerInfo.kind });
  }

  // Scope-aware collection: use the scope module to find iterator locals and
  // contextual variables, but ONLY for frames that are ancestors of the cursor's
  // expression position. This prevents variables from leaking outside their scope.
  if (compilation.scope?.templates) {
    const exprInfo = compilation.query.exprAt(offset);
    const cursorFrameId = exprInfo?.frameId;

    // Try to resolve the cursor's expression to a specific scope frame
    let resolvedFrameId = cursorFrameId;
    if (!resolvedFrameId && exprInfo?.exprId) {
      // exprAt returned an expression but no frameId directly.
      // Try to resolve via exprToFrame maps.
      for (const tmpl of compilation.scope.templates) {
        const mapped = tmpl.exprToFrame.get(exprInfo.exprId);
        if (mapped) { resolvedFrameId = mapped; break; }
      }
    }

    if (resolvedFrameId) {
      // Walk from the cursor's frame up to the root, collecting only ancestor frames
      for (const tmpl of compilation.scope.templates) {
        const frameById = new Map(tmpl.frames.map((f) => [f.id, f]));
        const cursorFrame = frameById.get(resolvedFrameId);
        if (!cursorFrame) continue;

        let current: typeof cursorFrame | undefined = cursorFrame;
        while (current) {
          if (current.symbols) {
            for (const sym of current.symbols) {
              if (sym.kind === "iteratorLocal") {
                if (!controllers.some((c) => c.localName === sym.name)) {
                  controllers.push({ kind: "repeat", localName: sym.name });
                }
              }
            }
          }
          current = current.parent ? frameById.get(current.parent) : undefined;
        }
        break;
      }
    } else if (controllerInfo) {
      // Fallback: controllerAt found a controller via span containment but
      // we couldn't resolve a specific scope frame. This happens when the
      // scope module doesn't map the expression to a frame (e.g., some
      // inline array repeats). controllerAt's span containment guarantees
      // the cursor IS inside a TC, so adding that TC's scope locals is safe.
      for (const tmpl of compilation.scope.templates) {
        for (const frame of tmpl.frames) {
          if (frame.kind === "overlay" && frame.symbols) {
            for (const sym of frame.symbols) {
              if (sym.kind === "iteratorLocal") {
                if (!controllers.some((c) => c.localName === sym.name)) {
                  controllers.push({ kind: "repeat", localName: sym.name });
                }
              }
            }
          }
        }
      }
    }
    // When neither exprAt nor controllerAt finds the cursor in a scoped context,
    // no scope-based controllers are added. This correctly prevents contextual
    // variables from appearing at positions outside any expression scope.
  }

  return controllers;
}

// ============================================================================
// Position Type 5c: Value Converter Pipe
// ============================================================================

function generateValueConverterItems(
  pos: Extract<CompletionPosition, { kind: "vc-pipe" }>,
  ctx: CompletionEngineContext,
): WorkspaceCompletionItem[] {
  const prefix = pos.prefix.toLowerCase();
  const items: WorkspaceCompletionItem[] = [];

  for (const [name, entries] of ctx.definitions.valueConverters) {
    if (!matchesPrefix(name, prefix)) continue;
    const def = bestEntry(entries);
    const trust = deriveTrust("value-converter", name, def, ctx.catalog);

    items.push({
      label: name,
      kind: "value-converter",
      detail: "Value Converter",
      sortText: encodeSortText(trust.confidence ?? "high", "global", "resource", name),
      confidence: trust.confidence,
      origin: trust.origin,
    });

    // Aliases
    if (def) {
      for (const alias of extractAliases(def)) {
        if (!matchesPrefix(alias, prefix)) continue;
        items.push({
          label: alias,
          kind: "value-converter",
          detail: `Value Converter (alias of ${name})`,
          sortText: encodeSortText(trust.confidence ?? "high", "global", "resource", alias),
          confidence: trust.confidence,
          origin: trust.origin,
        });
      }
    }
  }

  return items;
}

// ============================================================================
// Position Type 5d: Binding Behavior Pipe
// ============================================================================

function generateBindingBehaviorItems(
  pos: Extract<CompletionPosition, { kind: "bb-pipe" }>,
  ctx: CompletionEngineContext,
): WorkspaceCompletionItem[] {
  const prefix = pos.prefix.toLowerCase();
  const items: WorkspaceCompletionItem[] = [];

  for (const [name, entries] of ctx.definitions.bindingBehaviors) {
    if (!matchesPrefix(name, prefix)) continue;
    const def = bestEntry(entries);
    const trust = deriveTrust("binding-behavior", name, def, ctx.catalog);

    const insertText = behaviorInsertText(name);

    items.push({
      label: name,
      kind: "binding-behavior",
      detail: "Binding Behavior",
      sortText: encodeSortText(trust.confidence ?? "high", "global", "resource", name),
      confidence: trust.confidence,
      origin: trust.origin,
      ...(insertText ? { insertText } : {}),
    });

    if (def) {
      for (const alias of extractAliases(def)) {
        if (!matchesPrefix(alias, prefix)) continue;
        items.push({
          label: alias,
          kind: "binding-behavior",
          detail: `Binding Behavior (alias of ${name})`,
          sortText: encodeSortText(trust.confidence ?? "high", "global", "resource", alias),
          confidence: trust.confidence,
          origin: trust.origin,
        });
      }
    }
  }

  return items;
}

function behaviorInsertText(name: string): string | undefined {
  // Behaviors that commonly take arguments get snippets
  switch (name) {
    case "debounce": return "debounce:${1:300}";
    case "throttle": return "throttle:${1:300}";
    case "signal": return "signal:${1:signalName}";
    case "updateTrigger": return "updateTrigger:${1:event}";
    default: return undefined;
  }
}

// ============================================================================
// Position Type 8: as-element Value
// ============================================================================

function generateAsElementValueItems(
  pos: Extract<CompletionPosition, { kind: "as-element-value" }>,
  ctx: CompletionEngineContext,
): WorkspaceCompletionItem[] {
  const prefix = pos.prefix.toLowerCase();
  const items: WorkspaceCompletionItem[] = [];

  for (const [name, entries] of ctx.definitions.elements) {
    if (!matchesPrefix(name, prefix)) continue;
    const def = bestEntry(entries);
    const trust = deriveTrust("custom-element", name, def, ctx.catalog);

    items.push({
      label: name,
      kind: "custom-element",
      detail: "Custom Element",
      sortText: encodeSortText(trust.confidence ?? "high", "global", "resource", name),
      confidence: trust.confidence,
      origin: trust.origin,
    });
  }

  return items;
}

// ============================================================================
// Helpers
// ============================================================================

function matchesPrefix(name: string, prefix: string): boolean {
  if (!prefix) return true;
  return name.toLowerCase().startsWith(prefix);
}

function hasBindables(def: ResourceDef): def is CustomElementDef | CustomAttributeDef | TemplateControllerDef {
  return "bindables" in def;
}

function countBindables(def: ResourceDef | null): number {
  if (!def || !hasBindables(def)) return 0;
  return Object.keys(def.bindables).length;
}

interface BindableInfo {
  name: string;
  attribute: string;
  mode?: number | string;
  type?: string;
  primary?: boolean;
}

function extractBindables(def: ResourceDef): BindableInfo[] {
  if (!hasBindables(def)) return [];
  return Object.entries(def.bindables).map(([key, b]) => ({
    name: key,
    attribute: unwrapSourced(b.attribute) ?? key,
    mode: unwrapSourced(b.mode),
    type: b.type ? unwrapSourced(b.type) : undefined,
    primary: unwrapSourced(b.primary) ?? false,
  }));
}

function getRequiredBindables(def: ResourceDef | null): BindableInfo[] {
  if (!def) return [];
  const all = extractBindables(def);
  const primary = all.filter((b) => b.primary);
  return primary.length > 0 ? primary : [];
}

function findBindableByAttribute(def: ResourceDef, attrName: string): BindableInfo | null {
  const bindables = extractBindables(def);
  return bindables.find((b) => b.attribute === attrName || b.name === attrName) ?? null;
}

function extractAliases(def: ResourceDef): string[] {
  if (!("aliases" in def)) return [];
  const aliases = def.aliases;
  if (!aliases) return [];
  if (Array.isArray(aliases)) {
    // CE and CA have readonly Sourced<string>[]
    return aliases.map((a: Sourced<unknown> | undefined) => unwrapSourced(a)).filter((a): a is string => !!a);
  }
  // TC has Sourced<readonly string[]>
  const unwrapped = unwrapSourced(aliases as Sourced<readonly string[]>);
  if (Array.isArray(unwrapped)) return unwrapped.filter((a): a is string => !!a);
  return [];
}

function isTemplateController(def: ResourceDef | null): boolean {
  if (!def) return false;
  return def.kind === "template-controller";
}

function formatTypeRef(type: string | undefined): string {
  return type ?? "unknown";
}

function extractStringLiteralsFromTypeString(typeStr: string): string[] {
  // Parse type strings like '"open" | "closed"' or "'left' | 'right' | 'center'"
  // TypeScript's checker.typeToString() produces double-quoted literals.
  const matches = typeStr.match(/["']([^"']+)["']/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(1, -1));
}
