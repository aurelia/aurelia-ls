/**
 * Semantic tokens handler for Aurelia templates.
 *
 * Provides rich, context-aware syntax highlighting via LSP semantic tokens.
 * This handler walks the compiled template and emits tokens for:
 * - Custom element tags (distinguished from HTML tags)
 * - Expression variables, properties, and method calls
 * - Aurelia built-in contextual variables ($index, $first, $event, etc.)
 * - Binding commands (.bind, .trigger, .two-way, etc.)
 * - Interpolation delimiters (${ and })
 *
 * See vscode-roadmap.md Phase 6 for the full vision.
 */
import type {
  SemanticTokens,
  SemanticTokensParams,
  SemanticTokensLegend,
} from "vscode-languageserver/node.js";
import { canonicalDocumentUri } from "@aurelia-ls/compiler";
import type { ServerContext } from "../context.js";
import type { LinkedRow, NodeSem, ExprTableEntry, SourceSpan, LinkedInstruction, TemplateMetaIR } from "@aurelia-ls/compiler";
import type { DOMNode, ElementNode } from "@aurelia-ls/compiler";

/* ===========================
 * Token Legend
 * =========================== */

/**
 * Token types - each maps to a VS Code theme color.
 * Order matters: index in array = token type ID.
 */
export const TOKEN_TYPES = [
  "namespace",   // 0: Custom element tag names, custom attributes
  "type",        // 1: Component class references
  "class",       // 2: Class names
  "parameter",   // 3: (reserved)
  "variable",    // 4: Template variables
  "property",    // 5: Property access, bindables
  "function",    // 6: Method calls in expressions
  "keyword",     // 7: Binding commands AND template controllers (for better theme colors)
] as const;

/**
 * Token modifiers - can be combined via bitmask.
 * Order matters: index in array = bit position.
 */
export const TOKEN_MODIFIERS = [
  "declaration",     // 0: Being defined (item in repeat.for)
  "readonly",        // 1: One-way binding
  "modification",    // 2: Two-way binding
  "deprecated",      // 3: Deprecated API
  "defaultLibrary",  // 4: Aurelia built-in ($index, $event)
] as const;

export const SEMANTIC_TOKENS_LEGEND: SemanticTokensLegend = {
  tokenTypes: [...TOKEN_TYPES],
  tokenModifiers: [...TOKEN_MODIFIERS],
};

/* ===========================
 * Token Type Helpers
 * =========================== */

const TokenType = {
  namespace: 0,
  type: 1,
  class: 2,
  parameter: 3,
  variable: 4,
  property: 5,
  function: 6,
  keyword: 7,
} as const;

const TokenModifier = {
  declaration: 1 << 0,
  readonly: 1 << 1,
  modification: 1 << 2,
  deprecated: 1 << 3,
  defaultLibrary: 1 << 4,
} as const;

/* ===========================
 * Token Collection
 * =========================== */

export interface RawToken {
  line: number;      // 0-based line
  char: number;      // 0-based character
  length: number;
  type: number;
  modifiers: number;
}

/**
 * Encodes tokens into LSP's delta format.
 * Each token is 5 integers: [deltaLine, deltaChar, length, tokenType, tokenModifiers]
 */
export function encodeTokens(tokens: RawToken[]): number[] {
  // Sort by position (line, then character)
  tokens.sort((a, b) => a.line - b.line || a.char - b.char);

  const data: number[] = [];
  let prevLine = 0;
  let prevChar = 0;

  for (const token of tokens) {
    const deltaLine = token.line - prevLine;
    const deltaChar = deltaLine === 0 ? token.char - prevChar : token.char;

    data.push(deltaLine, deltaChar, token.length, token.type, token.modifiers);

    prevLine = token.line;
    prevChar = token.char;
  }

  return data;
}

/* ===========================
 * DOM Walking
 * =========================== */

/**
 * Builds a map from NodeId to DOMNode for quick lookup.
 */
export function buildNodeMap(root: DOMNode): Map<string, DOMNode> {
  const map = new Map<string, DOMNode>();

  function walk(node: DOMNode): void {
    map.set(node.id, node);
    if ("children" in node) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  walk(root);
  return map;
}

/**
 * Converts a source offset to line/character using the document text.
 */
export function offsetToLineChar(text: string, offset: number): { line: number; char: number } {
  let line = 0;
  let char = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === "\n") {
      line++;
      char = 0;
    } else {
      char++;
    }
  }
  return { line, char };
}

/* ===========================
 * Token Extraction
 * =========================== */

/**
 * Extracts semantic tokens from a compiled template.
 *
 * Currently supports:
 * - Custom element tags (namespace token type)
 *
 * TODO:
 * - Binding commands
 * - Expression variables/properties/methods
 * - Template controller keywords
 */
export function extractTokens(
  text: string,
  rows: LinkedRow[],
  nodeMap: Map<string, DOMNode>
): RawToken[] {
  const tokens: RawToken[] = [];

  for (const row of rows) {
    const node = nodeMap.get(row.target);
    if (!node) continue;

    // Only process element nodes
    if (row.node.kind !== "element") continue;
    const nodeSem = row.node as NodeSem & { kind: "element" };

    // Check if it's a custom element
    if (nodeSem.custom) {
      const element = node as ElementNode;
      const loc = element.loc;
      if (!loc) continue;

      // Tag name starts after '<', so offset is loc.start + 1
      const tagStart = loc.start + 1;
      const tagLength = element.tag.length;

      const { line, char } = offsetToLineChar(text, tagStart);

      tokens.push({
        line,
        char,
        length: tagLength,
        type: TokenType.namespace,
        modifiers: 0,
      });

      // Also highlight closing tag if not self-closed
      if (!element.selfClosed) {
        // Find closing tag position: </tagname>
        // The closing tag is at the end of the element's content
        // We need to find it by searching backwards from loc.end
        const closeTagPattern = `</${element.tag}>`;
        const closeTagStart = text.lastIndexOf(closeTagPattern, loc.end);
        if (closeTagStart !== -1) {
          // Tag name starts after '</'
          const closeTagNameStart = closeTagStart + 2;
          const closePos = offsetToLineChar(text, closeTagNameStart);
          tokens.push({
            line: closePos.line,
            char: closePos.char,
            length: tagLength,
            type: TokenType.namespace,
            modifiers: 0,
          });
        }
      }
    }
  }

  return tokens;
}

/* ===========================
 * Expression Token Extraction
 * =========================== */

/**
 * Aurelia built-in contextual variables that get the defaultLibrary modifier.
 */
const AURELIA_BUILTINS = new Set([
  "$index",
  "$first",
  "$last",
  "$even",
  "$odd",
  "$length",
  "$event",
  "$host",
  "$this",
  "$parent",
]);

/**
 * Expression AST node types we care about for semantic tokens.
 * These are the $kind values from the expression AST.
 */
type ExpressionAst = {
  $kind: string;
  span?: SourceSpan;
  name?: string;
  object?: ExpressionAst;
  expression?: ExpressionAst;
  func?: ExpressionAst;
  args?: ExpressionAst[];
  condition?: ExpressionAst;
  yes?: ExpressionAst;
  no?: ExpressionAst;
  target?: ExpressionAst;
  value?: ExpressionAst;
  key?: ExpressionAst;
  left?: ExpressionAst;
  right?: ExpressionAst;
  parts?: ExpressionAst[];
  expressions?: ExpressionAst[];
  declaration?: ExpressionAst;
  iterable?: ExpressionAst;
  ancestor?: number;
  optional?: boolean;
};

/**
 * Extract semantic tokens from expression ASTs.
 */
export function extractExpressionTokens(
  text: string,
  exprTable: readonly ExprTableEntry[],
  exprSpans: ReadonlyMap<string, SourceSpan>,
): RawToken[] {
  const tokens: RawToken[] = [];

  for (const entry of exprTable) {
    const exprSpan = exprSpans.get(entry.id);
    if (!exprSpan) continue;

    // Walk the AST and collect tokens
    walkExpression(entry.ast as ExpressionAst, text, exprSpan, tokens);
  }

  return tokens;
}

/**
 * Recursively walk an expression AST and emit tokens.
 */
function walkExpression(
  node: ExpressionAst | null | undefined,
  text: string,
  baseSpan: SourceSpan,
  tokens: RawToken[],
): void {
  if (!node || !node.$kind) return;

  switch (node.$kind) {
    case "AccessScope": {
      // Variable access: name, items, etc.
      const span = node.span;
      if (span && node.name) {
        const isBuiltin = AURELIA_BUILTINS.has(node.name);
        const { line, char } = offsetToLineChar(text, span.start);
        tokens.push({
          line,
          char,
          length: node.name.length,
          type: TokenType.variable,
          modifiers: isBuiltin ? TokenModifier.defaultLibrary : 0,
        });
      }
      break;
    }

    case "AccessMember": {
      // Property access: user.name -> emit token for "name"
      walkExpression(node.object, text, baseSpan, tokens);
      const span = node.span;
      if (span && node.name) {
        // Property name position: find it after the dot
        // The span covers the whole expression, but we want just the property name
        // We need to find where the property name starts
        const propStart = findPropertyStart(text, span, node.name);
        if (propStart !== -1) {
          const { line, char } = offsetToLineChar(text, propStart);
          tokens.push({
            line,
            char,
            length: node.name.length,
            type: TokenType.property,
            modifiers: 0,
          });
        }
      }
      break;
    }

    case "CallScope": {
      // Function call on scope: save(), doSomething()
      const span = node.span;
      if (span && node.name) {
        const isBuiltin = AURELIA_BUILTINS.has(node.name);
        const { line, char } = offsetToLineChar(text, span.start);
        tokens.push({
          line,
          char,
          length: node.name.length,
          type: TokenType.function,
          modifiers: isBuiltin ? TokenModifier.defaultLibrary : 0,
        });
      }
      // Walk arguments
      for (const arg of node.args ?? []) {
        walkExpression(arg, text, baseSpan, tokens);
      }
      break;
    }

    case "CallMember": {
      // Method call: user.getName() -> emit token for "getName"
      walkExpression(node.object, text, baseSpan, tokens);
      const span = node.span;
      if (span && node.name) {
        const propStart = findPropertyStart(text, span, node.name);
        if (propStart !== -1) {
          const { line, char } = offsetToLineChar(text, propStart);
          tokens.push({
            line,
            char,
            length: node.name.length,
            type: TokenType.function,
            modifiers: 0,
          });
        }
      }
      // Walk arguments
      for (const arg of node.args ?? []) {
        walkExpression(arg, text, baseSpan, tokens);
      }
      break;
    }

    case "AccessThis": {
      // $this or $parent
      const span = node.span;
      if (span) {
        const ancestor = node.ancestor ?? 0;
        const name = ancestor === 0 ? "$this" : "$parent";
        const { line, char } = offsetToLineChar(text, span.start);
        tokens.push({
          line,
          char,
          length: name.length,
          type: TokenType.variable,
          modifiers: TokenModifier.defaultLibrary,
        });
      }
      break;
    }

    case "AccessBoundary": {
      // $host
      const span = node.span;
      if (span) {
        const { line, char } = offsetToLineChar(text, span.start);
        tokens.push({
          line,
          char,
          length: "$host".length,
          type: TokenType.variable,
          modifiers: TokenModifier.defaultLibrary,
        });
      }
      break;
    }

    case "Conditional": {
      // condition ? yes : no
      walkExpression(node.condition, text, baseSpan, tokens);
      walkExpression(node.yes, text, baseSpan, tokens);
      walkExpression(node.no, text, baseSpan, tokens);
      break;
    }

    case "Binary": {
      // left op right
      walkExpression(node.left, text, baseSpan, tokens);
      walkExpression(node.right, text, baseSpan, tokens);
      break;
    }

    case "Unary": {
      // !expr, -expr, etc.
      walkExpression(node.expression, text, baseSpan, tokens);
      break;
    }

    case "Assign": {
      // target = value
      walkExpression(node.target, text, baseSpan, tokens);
      walkExpression(node.value, text, baseSpan, tokens);
      break;
    }

    case "AccessKeyed": {
      // obj[key]
      walkExpression(node.object, text, baseSpan, tokens);
      walkExpression(node.key, text, baseSpan, tokens);
      break;
    }

    case "CallFunction": {
      // func(args)
      walkExpression(node.func, text, baseSpan, tokens);
      for (const arg of node.args ?? []) {
        walkExpression(arg, text, baseSpan, tokens);
      }
      break;
    }

    case "ValueConverter": {
      // expr | converter:arg
      walkExpression(node.expression, text, baseSpan, tokens);
      // Emit token for the converter name
      if (node.name && node.span) {
        const namePos = findPipeOrAmpName(text, node.span, "|", node.name);
        if (namePos !== -1) {
          const { line, char } = offsetToLineChar(text, namePos);
          tokens.push({
            line,
            char,
            length: node.name.length,
            type: TokenType.function, // value converters are like functions
            modifiers: 0,
          });
        }
      }
      for (const arg of node.args ?? []) {
        walkExpression(arg, text, baseSpan, tokens);
      }
      break;
    }

    case "BindingBehavior": {
      // expr & behavior:arg
      walkExpression(node.expression, text, baseSpan, tokens);
      // Emit token for the behavior name
      if (node.name && node.span) {
        const namePos = findPipeOrAmpName(text, node.span, "&", node.name);
        if (namePos !== -1) {
          const { line, char } = offsetToLineChar(text, namePos);
          tokens.push({
            line,
            char,
            length: node.name.length,
            type: TokenType.function, // binding behaviors are like functions
            modifiers: 0,
          });
        }
      }
      for (const arg of node.args ?? []) {
        walkExpression(arg, text, baseSpan, tokens);
      }
      break;
    }

    case "ArrayLiteral": {
      // [a, b, c]
      for (const el of (node as ExpressionAst & { elements?: ExpressionAst[] }).elements ?? []) {
        walkExpression(el, text, baseSpan, tokens);
      }
      break;
    }

    case "ObjectLiteral": {
      // { key: value }
      for (const val of (node as ExpressionAst & { values?: ExpressionAst[] }).values ?? []) {
        walkExpression(val, text, baseSpan, tokens);
      }
      break;
    }

    case "Template": {
      // Template literals with expressions
      for (const expr of node.expressions ?? []) {
        walkExpression(expr, text, baseSpan, tokens);
      }
      break;
    }

    case "Interpolation": {
      // Interpolation with parts and expressions
      for (const expr of node.expressions ?? []) {
        walkExpression(expr, text, baseSpan, tokens);
      }
      break;
    }

    case "ForOfStatement": {
      // repeat.for="item of items"
      // The declaration (item) is a variable being declared
      const decl = node.declaration;
      if (decl && decl.$kind === "BindingIdentifier" && decl.span && decl.name) {
        const { line, char } = offsetToLineChar(text, decl.span.start);
        tokens.push({
          line,
          char,
          length: decl.name.length,
          type: TokenType.variable,
          modifiers: TokenModifier.declaration,
        });
      } else if (decl) {
        // Array or object destructuring pattern
        walkBindingPattern(decl, text, tokens);
      }
      // The iterable is an expression
      walkExpression(node.iterable, text, baseSpan, tokens);
      break;
    }

    case "ArrowFunction": {
      // (x) => x + 1
      const fn = node as ExpressionAst & { params?: ExpressionAst[]; body?: ExpressionAst };
      for (const param of fn.params ?? []) {
        walkBindingPattern(param, text, tokens);
      }
      walkExpression(fn.body, text, baseSpan, tokens);
      break;
    }

    case "Paren": {
      // (expr)
      walkExpression(node.expression, text, baseSpan, tokens);
      break;
    }

    case "TaggedTemplate": {
      // tag`template`
      walkExpression(node.func, text, baseSpan, tokens);
      const cooked = (node as ExpressionAst & { cooked?: ExpressionAst }).cooked;
      if (cooked) {
        for (const expr of cooked.expressions ?? []) {
          walkExpression(expr, text, baseSpan, tokens);
        }
      }
      break;
    }

    case "New": {
      // new Constructor()
      walkExpression(node.func, text, baseSpan, tokens);
      for (const arg of node.args ?? []) {
        walkExpression(arg, text, baseSpan, tokens);
      }
      break;
    }

    // Primitive literals, AccessGlobal - no tokens to emit for these
    case "PrimitiveLiteral":
    case "AccessGlobal":
    default:
      // No tokens for literals or unrecognized nodes
      break;
  }
}

/**
 * Walk a binding pattern (used in destructuring and for-of declarations).
 */
function walkBindingPattern(
  node: ExpressionAst,
  text: string,
  tokens: RawToken[],
): void {
  if (!node || !node.$kind) return;

  switch (node.$kind) {
    case "BindingIdentifier": {
      if (node.span && node.name) {
        const { line, char } = offsetToLineChar(text, node.span.start);
        tokens.push({
          line,
          char,
          length: node.name.length,
          type: TokenType.variable,
          modifiers: TokenModifier.declaration,
        });
      }
      break;
    }

    case "ArrayBindingPattern": {
      const pattern = node as ExpressionAst & { elements?: ExpressionAst[] };
      for (const el of pattern.elements ?? []) {
        walkBindingPattern(el, text, tokens);
      }
      break;
    }

    case "ObjectBindingPattern": {
      const pattern = node as ExpressionAst & { properties?: ExpressionAst[] };
      for (const prop of pattern.properties ?? []) {
        walkBindingPattern(prop, text, tokens);
      }
      break;
    }

    case "BindingPatternDefault": {
      // pattern = defaultValue
      const def = node as ExpressionAst & { binding?: ExpressionAst; defaultValue?: ExpressionAst };
      walkBindingPattern(def.binding as ExpressionAst, text, tokens);
      // Don't walk defaultValue - it's evaluated at runtime, not a declaration
      break;
    }
  }
}

/**
 * Find the start position of a value converter or binding behavior name.
 * The name appears after '|' (for converters) or '&' (for behaviors).
 */
function findPipeOrAmpName(text: string, span: SourceSpan, separator: "|" | "&", name: string): number {
  // Search within the span for the separator followed by the name
  const searchText = text.slice(span.start, span.end);
  const sepIndex = searchText.lastIndexOf(separator);
  if (sepIndex === -1) return -1;

  // Find the name after the separator (skipping whitespace)
  const afterSep = searchText.slice(sepIndex + 1);
  const nameMatch = afterSep.match(/^\s*/);
  const whitespaceLen = nameMatch ? nameMatch[0].length : 0;

  // Verify the name is there
  if (afterSep.slice(whitespaceLen, whitespaceLen + name.length) === name) {
    return span.start + sepIndex + 1 + whitespaceLen;
  }

  return -1;
}

/**
 * Find the start position of a property name within a member access span.
 * The property appears after a '.' (or '?.') in the source.
 */
function findPropertyStart(text: string, span: SourceSpan, propName: string): number {
  // Search backwards from the end of the span for the property name
  const end = span.end;
  const searchStart = Math.max(span.start, end - propName.length - 10); // Allow some buffer for . or ?.

  // Find the last occurrence of the property name before span.end
  let pos = end - propName.length;
  while (pos >= searchStart) {
    if (text.slice(pos, pos + propName.length) === propName) {
      // Verify it's preceded by . or ?. (not part of another identifier)
      const prevChar = pos > 0 ? text[pos - 1] : "";
      if (prevChar === "." || (pos > 1 && text.slice(pos - 2, pos) === "?.")) {
        return pos;
      }
    }
    pos--;
  }

  return -1;
}

/* ===========================
 * Binding Command Token Extraction
 * =========================== */

/**
 * Binding commands that can appear after a dot in attribute names.
 */
const BINDING_COMMANDS = new Set([
  "bind", "to-view", "two-way", "from-view", "one-time",
  "trigger", "capture", "delegate",
  "ref", "call", "for", // "for" is used in repeat.for
]);

/**
 * Shorthand prefixes for binding commands.
 * @click = click.trigger, :value = value.bind
 */
const SHORTHAND_PREFIXES: Record<string, string> = {
  "@": "trigger",
  ":": "bind",
};

/**
 * Extract semantic tokens for binding commands and template controllers.
 * Handles property bindings, listener bindings, custom attributes, and template controllers.
 */
export function extractBindingCommandTokens(
  text: string,
  rows: LinkedRow[],
): RawToken[] {
  const tokens: RawToken[] = [];

  for (const row of rows) {
    for (const ins of row.instructions) {
      extractBindingTokensFromInstruction(ins, text, tokens);
    }
  }

  return tokens;
}

/**
 * Extract binding tokens from a single instruction.
 */
function extractBindingTokensFromInstruction(
  ins: LinkedInstruction,
  text: string,
  tokens: RawToken[],
): void {
  const loc = (ins as { loc?: SourceSpan | null }).loc;
  if (!loc) {
    return;
  }

  // Get the raw attribute text from the source
  const attrText = text.slice(loc.start, loc.end);
  const eqPos = attrText.indexOf("=");
  const rawAttrName = eqPos !== -1 ? attrText.slice(0, eqPos) : attrText;

  // Trim whitespace from attribute name (handles formatting variations)
  const attrName = rawAttrName.trim();
  const whitespaceOffset = rawAttrName.indexOf(attrName);

  switch (ins.kind) {
    case "propertyBinding":
    case "attributeBinding":
    case "stylePropertyBinding": {
      // Check for : shorthand first (e.g., :value)
      if (attrName.startsWith(":")) {
        // : shorthand for .bind - highlight the : symbol
        emitCommandToken(text, loc.start + whitespaceOffset, 1, tokens);
        break;
      }
      // Look for binding commands like .bind, .two-way, .to-view
      const cmdInfo = findBindingCommandInAttr(attrName);
      if (cmdInfo) {
        emitCommandToken(text, loc.start + whitespaceOffset + cmdInfo.position, cmdInfo.command.length, tokens);
      }
      break;
    }

    case "listenerBinding": {
      // Look for .trigger or .capture, or @ shorthand
      if (attrName.startsWith("@")) {
        // @ shorthand for .trigger - highlight the @ symbol
        emitCommandToken(text, loc.start + whitespaceOffset, 1, tokens);
        return;
      }
      const cmdInfo = findBindingCommandInAttr(attrName);
      if (cmdInfo) {
        const finalOffset = loc.start + whitespaceOffset + cmdInfo.position;
        emitCommandToken(text, finalOffset, cmdInfo.command.length, tokens);
      }
      break;
    }

    case "refBinding": {
      // ref or target.ref
      if (attrName === "ref") {
        emitCommandToken(text, loc.start + whitespaceOffset, 3, tokens);
      } else {
        const cmdInfo = findBindingCommandInAttr(attrName);
        if (cmdInfo) {
          emitCommandToken(text, loc.start + whitespaceOffset + cmdInfo.position, cmdInfo.command.length, tokens);
        }
      }
      break;
    }

    case "hydrateAttribute": {
      // Custom attribute - highlight the attribute name and any binding command
      // e.g., focus, tooltip.bind
      const cmdInfo = findBindingCommandInAttr(attrName);
      if (cmdInfo) {
        emitCommandToken(text, loc.start + whitespaceOffset + cmdInfo.position, cmdInfo.command.length, tokens);
      }
      // Also highlight the custom attribute name itself
      const attrNameOnly = cmdInfo ? attrName.slice(0, cmdInfo.position - 1) : attrName;
      if (attrNameOnly.length > 0) {
        const { line, char } = offsetToLineChar(text, loc.start + whitespaceOffset);
        tokens.push({
          line,
          char,
          length: attrNameOnly.length,
          type: TokenType.namespace, // Custom attributes like custom elements
          modifiers: 0,
        });
      }
      break;
    }

    case "hydrateTemplateController": {
      // Template controller - highlight the controller keyword and binding command
      // e.g., if.bind, repeat.for, else
      const res = ins.res; // "repeat", "if", "else", etc.

      // Find the controller name in the attribute
      const controllerPos = attrName.indexOf(res);
      if (controllerPos !== -1) {
        const { line, char } = offsetToLineChar(text, loc.start + whitespaceOffset + controllerPos);
        tokens.push({
          line,
          char,
          length: res.length,
          type: TokenType.keyword, // Template controllers as keywords
          modifiers: 0,
        });
      }

      // Also highlight any binding command (bind, for, etc.)
      const cmdInfo = findBindingCommandInAttr(attrName);
      if (cmdInfo && cmdInfo.command !== res) { // Don't double-highlight
        emitCommandToken(text, loc.start + whitespaceOffset + cmdInfo.position, cmdInfo.command.length, tokens);
      }

      // Recursively process nested template (case, default-case inside switch, etc.)
      const def = ins.def;
      if (def?.rows) {
        for (const row of def.rows) {
          for (const nestedIns of row.instructions) {
            extractBindingTokensFromIR(nestedIns, text, tokens);
          }
        }
      }
      break;
    }
  }
}

/**
 * Extract binding tokens from an IR instruction (nested inside template controllers).
 * IR instructions use `type` instead of `kind`.
 */
function extractBindingTokensFromIR(
  ins: { type?: string; res?: string; loc?: SourceSpan | null; def?: { rows: { instructions: unknown[] }[] } },
  text: string,
  tokens: RawToken[],
): void {
  const loc = ins.loc;
  if (!loc) return;

  const attrText = text.slice(loc.start, loc.end);
  const eqPos = attrText.indexOf("=");
  const rawAttrName = eqPos !== -1 ? attrText.slice(0, eqPos) : attrText;
  const attrName = rawAttrName.trim();
  const whitespaceOffset = rawAttrName.indexOf(attrName);

  // Handle hydrateTemplateController (case, default-case, etc.)
  if (ins.type === "hydrateTemplateController" && ins.res) {
    const res = ins.res;
    const controllerPos = attrName.indexOf(res);
    if (controllerPos !== -1) {
      const { line, char } = offsetToLineChar(text, loc.start + whitespaceOffset + controllerPos);
      tokens.push({
        line,
        char,
        length: res.length,
        type: TokenType.keyword,
        modifiers: 0,
      });
    }

    // Also highlight any binding command
    const cmdInfo = findBindingCommandInAttr(attrName);
    if (cmdInfo && cmdInfo.command !== res) {
      emitCommandToken(text, loc.start + whitespaceOffset + cmdInfo.position, cmdInfo.command.length, tokens);
    }

    // Recurse into nested templates
    if (ins.def?.rows) {
      for (const row of ins.def.rows) {
        for (const nestedIns of row.instructions) {
          extractBindingTokensFromIR(nestedIns as typeof ins, text, tokens);
        }
      }
    }
    return;
  }

  // Handle hydrateAttribute (custom attributes like focus, tooltip)
  if (ins.type === "hydrateAttribute" && ins.res) {
    const cmdInfo = findBindingCommandInAttr(attrName);
    if (cmdInfo) {
      emitCommandToken(text, loc.start + whitespaceOffset + cmdInfo.position, cmdInfo.command.length, tokens);
    }
    // Also highlight the custom attribute name itself
    const attrNameOnly = cmdInfo ? attrName.slice(0, cmdInfo.position - 1) : attrName;
    if (attrNameOnly.length > 0) {
      const { line, char } = offsetToLineChar(text, loc.start + whitespaceOffset);
      tokens.push({
        line,
        char,
        length: attrNameOnly.length,
        type: TokenType.namespace, // Custom attributes
        modifiers: 0,
      });
    }
    return;
  }

  // Handle refBinding (ref, element.ref, view-model.ref)
  if (ins.type === "refBinding") {
    if (attrName === "ref") {
      emitCommandToken(text, loc.start + whitespaceOffset, 3, tokens);
    } else {
      const cmdInfo = findBindingCommandInAttr(attrName);
      if (cmdInfo) {
        emitCommandToken(text, loc.start + whitespaceOffset + cmdInfo.position, cmdInfo.command.length, tokens);
      }
    }
    return;
  }

  // Handle hydrateElement (custom element inside template controller)
  if (ins.type === "hydrateElement" && ins.res) {
    const elementName = ins.res as string;

    // Opening tag: <element-name
    // Tag name starts at loc.start + 1 (after '<')
    const openTagStart = loc.start + 1;
    const { line: openLine, char: openChar } = offsetToLineChar(text, openTagStart);
    tokens.push({
      line: openLine,
      char: openChar,
      length: elementName.length,
      type: TokenType.namespace,
      modifiers: 0,
    });

    // Closing tag: </element-name>
    const closeTagPattern = `</${elementName}>`;
    const closeTagStart = text.lastIndexOf(closeTagPattern, loc.end);
    if (closeTagStart !== -1 && closeTagStart > loc.start) {
      const closeTagNameStart = closeTagStart + 2; // after '</'
      const { line: closeLine, char: closeChar } = offsetToLineChar(text, closeTagNameStart);
      tokens.push({
        line: closeLine,
        char: closeChar,
        length: elementName.length,
        type: TokenType.namespace,
        modifiers: 0,
      });
    }
    // Note: Also handle binding commands on the custom element's attributes
    // The hydrateElement may have its own props that need highlighting
    return;
  }

  // Handle other IR instruction types that may have binding commands
  if (ins.type === "propertyBinding" || ins.type === "attributeBinding" ||
      ins.type === "stylePropertyBinding") {
    // Check for : shorthand first
    if (attrName.startsWith(":")) {
      emitCommandToken(text, loc.start + whitespaceOffset, 1, tokens);
      return;
    }
    const cmdInfo = findBindingCommandInAttr(attrName);
    if (cmdInfo) {
      emitCommandToken(text, loc.start + whitespaceOffset + cmdInfo.position, cmdInfo.command.length, tokens);
    }
    return;
  }

  // Handle listener bindings with @ shorthand
  if (ins.type === "listenerBinding") {
    if (attrName.startsWith("@")) {
      emitCommandToken(text, loc.start + whitespaceOffset, 1, tokens);
      return;
    }
    const cmdInfo = findBindingCommandInAttr(attrName);
    if (cmdInfo) {
      emitCommandToken(text, loc.start + whitespaceOffset + cmdInfo.position, cmdInfo.command.length, tokens);
    }
  }
}

/**
 * Find a binding command in an attribute name.
 * Returns the command and its position, or null if not found.
 */
function findBindingCommandInAttr(attrName: string): { command: string; position: number } | null {
  // Split by dots and find the last segment that is a command
  const parts = attrName.split(".");
  let position = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (i > 0 && BINDING_COMMANDS.has(part)) {
      // Found a command - return its position (after the dot)
      return { command: part, position };
    }
    position += part.length + 1; // +1 for the dot
  }

  return null;
}

/**
 * Emit a token for a binding command (bind, trigger, for, :, @).
 * Uses 'keyword' type intentionally — VS Code's default themes style keywords
 * distinctly, giving better visual differentiation than 'parameter'.
 */
function emitCommandToken(
  text: string,
  offset: number,
  length: number,
  tokens: RawToken[],
): void {
  const { line, char } = offsetToLineChar(text, offset);
  tokens.push({
    line,
    char,
    length,
    type: TokenType.keyword, // Intentionally keyword for better theme colors
    modifiers: 0,
  });
}

/* ===========================
 * Interpolation Delimiter Token Extraction
 * =========================== */

/**
 * InterpIR shape from the compiler - interpolation with expression references.
 */
interface InterpIRShape {
  kind: "interp";
  exprs: { loc?: SourceSpan | null }[];
}

/**
 * Extract semantic tokens for interpolation delimiters (${ and }).
 * Uses the compiler's InterpIR structure which has pre-computed expression spans.
 * The expression loc points to the expression content, so:
 *   - ${ is at loc.start - 2 (length 2)
 *   - } is at loc.end (length 1)
 */
export function extractInterpolationDelimiterTokens(
  text: string,
  rows: LinkedRow[],
): RawToken[] {
  const tokens: RawToken[] = [];

  for (const row of rows) {
    for (const ins of row.instructions) {
      extractDelimitersFromInstruction(ins, text, tokens);
    }
  }

  return tokens;
}

/**
 * Extract interpolation delimiter tokens from a linked instruction.
 */
function extractDelimitersFromInstruction(
  ins: LinkedInstruction,
  text: string,
  tokens: RawToken[],
): void {
  // Check for interpolation in 'from' field (attributeBinding, textBinding, etc.)
  const from = (ins as { from?: { kind?: string; exprs?: { loc?: SourceSpan | null }[] } }).from;
  if (from?.kind === "interp") {
    emitDelimiterTokensFromInterp(from as InterpIRShape, text, tokens);
  }

  // Handle template controllers that may have nested interpolations
  if (ins.kind === "hydrateTemplateController") {
    const def = ins.def;
    if (def?.rows) {
      for (const nestedRow of def.rows) {
        for (const nestedIns of nestedRow.instructions) {
          extractDelimitersFromIR(nestedIns, text, tokens);
        }
      }
    }
  }
}

/**
 * Extract interpolation delimiter tokens from an IR instruction (nested inside template controllers).
 */
function extractDelimitersFromIR(
  ins: { type?: string; from?: unknown; def?: { rows: { instructions: unknown[] }[] } },
  text: string,
  tokens: RawToken[],
): void {
  // Check if from is an InterpIR (has kind: "interp" and exprs array)
  const from = ins.from as { kind?: string; exprs?: { loc?: SourceSpan | null }[] } | undefined;
  if (from?.kind === "interp") {
    emitDelimiterTokensFromInterp(from as InterpIRShape, text, tokens);
  }

  // Recurse into nested template controllers
  if (ins.type === "hydrateTemplateController" && ins.def?.rows) {
    for (const nestedRow of ins.def.rows) {
      for (const nestedIns of nestedRow.instructions) {
        extractDelimitersFromIR(nestedIns as typeof ins, text, tokens);
      }
    }
  }
}

/**
 * Emit delimiter tokens for an InterpIR's expressions.
 * Uses the pre-computed expression locations from the compiler.
 */
function emitDelimiterTokensFromInterp(
  interp: InterpIRShape,
  text: string,
  tokens: RawToken[],
): void {
  for (const expr of interp.exprs) {
    if (!expr.loc) continue;

    // ${ is 2 characters before the expression start
    const openStart = expr.loc.start - 2;
    if (openStart >= 0) {
      const { line, char } = offsetToLineChar(text, openStart);
      tokens.push({
        line,
        char,
        length: 2,
        type: TokenType.keyword,
        modifiers: TokenModifier.defaultLibrary,
      });
    }

    // } is at the expression end
    const { line: closeLine, char: closeChar } = offsetToLineChar(text, expr.loc.end);
    tokens.push({
      line: closeLine,
      char: closeChar,
      length: 1,
      type: TokenType.keyword,
      modifiers: TokenModifier.defaultLibrary,
    });
  }
}

/* ===========================
 * Meta Element Token Extraction
 * =========================== */

/**
 * Extract semantic tokens from template meta elements.
 * Meta elements are <import>, <require>, <bindable>, <use-shadow-dom>,
 * <containerless>, <capture>, and <alias>.
 *
 * Token types:
 * - Tag names (import, bindable, etc.) → keyword
 * - Module specifier values → namespace (module reference)
 * - Alias values → variable (local name declaration)
 * - Property names (name, mode, attribute) → property
 */
export function extractMetaElementTokens(
  text: string,
  meta: TemplateMetaIR | undefined,
): RawToken[] {
  if (!meta) return [];

  const tokens: RawToken[] = [];

  // Process <import> and <require> elements
  for (const imp of meta.imports) {
    // Tag name (import/require) → keyword
    if (imp.tagLoc && imp.tagLoc.start < imp.tagLoc.end) {
      const { line, char } = offsetToLineChar(text, imp.tagLoc.start);
      tokens.push({
        line,
        char,
        length: imp.tagLoc.end - imp.tagLoc.start,
        type: TokenType.keyword,
        modifiers: TokenModifier.defaultLibrary,
      });
    }

    // Module specifier (from="./path") → namespace (module reference)
    if (imp.from.loc && imp.from.loc.start < imp.from.loc.end) {
      const { line, char } = offsetToLineChar(text, imp.from.loc.start);
      tokens.push({
        line,
        char,
        length: imp.from.loc.end - imp.from.loc.start,
        type: TokenType.namespace,
        modifiers: 0,
      });
    }

    // Default alias (as="bar") → variable (declaration)
    if (imp.defaultAlias?.loc && imp.defaultAlias.loc.start < imp.defaultAlias.loc.end) {
      const { line, char } = offsetToLineChar(text, imp.defaultAlias.loc.start);
      tokens.push({
        line,
        char,
        length: imp.defaultAlias.loc.end - imp.defaultAlias.loc.start,
        type: TokenType.variable,
        modifiers: TokenModifier.declaration,
      });
    }

    // Named aliases (X.as="y")
    for (const na of imp.namedAliases) {
      // Export name (X) → namespace (reference to exported symbol)
      if (na.exportName.loc && na.exportName.loc.start < na.exportName.loc.end) {
        const { line, char } = offsetToLineChar(text, na.exportName.loc.start);
        tokens.push({
          line,
          char,
          length: na.exportName.loc.end - na.exportName.loc.start,
          type: TokenType.namespace,
          modifiers: 0,
        });
      }

      // Alias (y) → variable (declaration)
      if (na.alias.loc && na.alias.loc.start < na.alias.loc.end) {
        const { line, char } = offsetToLineChar(text, na.alias.loc.start);
        tokens.push({
          line,
          char,
          length: na.alias.loc.end - na.alias.loc.start,
          type: TokenType.variable,
          modifiers: TokenModifier.declaration,
        });
      }
    }
  }

  // Process <bindable> elements
  for (const bindable of meta.bindables) {
    // Tag name → keyword
    if (bindable.tagLoc && bindable.tagLoc.start < bindable.tagLoc.end) {
      const { line, char } = offsetToLineChar(text, bindable.tagLoc.start);
      tokens.push({
        line,
        char,
        length: bindable.tagLoc.end - bindable.tagLoc.start,
        type: TokenType.keyword,
        modifiers: TokenModifier.defaultLibrary,
      });
    }

    // Property name (name="value") → property
    if (bindable.name.loc && bindable.name.loc.start < bindable.name.loc.end) {
      const { line, char } = offsetToLineChar(text, bindable.name.loc.start);
      tokens.push({
        line,
        char,
        length: bindable.name.loc.end - bindable.name.loc.start,
        type: TokenType.property,
        modifiers: TokenModifier.declaration,
      });
    }

    // Mode value → keyword
    if (bindable.mode?.loc && bindable.mode.loc.start < bindable.mode.loc.end) {
      const { line, char } = offsetToLineChar(text, bindable.mode.loc.start);
      tokens.push({
        line,
        char,
        length: bindable.mode.loc.end - bindable.mode.loc.start,
        type: TokenType.keyword,
        modifiers: 0,
      });
    }

    // Attribute alias → property
    if (bindable.attribute?.loc && bindable.attribute.loc.start < bindable.attribute.loc.end) {
      const { line, char } = offsetToLineChar(text, bindable.attribute.loc.start);
      tokens.push({
        line,
        char,
        length: bindable.attribute.loc.end - bindable.attribute.loc.start,
        type: TokenType.property,
        modifiers: 0,
      });
    }
  }

  // Process <use-shadow-dom>
  if (meta.shadowDom) {
    // Tag name → keyword
    if (meta.shadowDom.tagLoc && meta.shadowDom.tagLoc.start < meta.shadowDom.tagLoc.end) {
      const { line, char } = offsetToLineChar(text, meta.shadowDom.tagLoc.start);
      tokens.push({
        line,
        char,
        length: meta.shadowDom.tagLoc.end - meta.shadowDom.tagLoc.start,
        type: TokenType.keyword,
        modifiers: TokenModifier.defaultLibrary,
      });
    }
  }

  // Process <containerless>
  if (meta.containerless) {
    if (meta.containerless.tagLoc && meta.containerless.tagLoc.start < meta.containerless.tagLoc.end) {
      const { line, char } = offsetToLineChar(text, meta.containerless.tagLoc.start);
      tokens.push({
        line,
        char,
        length: meta.containerless.tagLoc.end - meta.containerless.tagLoc.start,
        type: TokenType.keyword,
        modifiers: TokenModifier.defaultLibrary,
      });
    }
  }

  // Process <capture>
  if (meta.capture) {
    if (meta.capture.tagLoc && meta.capture.tagLoc.start < meta.capture.tagLoc.end) {
      const { line, char } = offsetToLineChar(text, meta.capture.tagLoc.start);
      tokens.push({
        line,
        char,
        length: meta.capture.tagLoc.end - meta.capture.tagLoc.start,
        type: TokenType.keyword,
        modifiers: TokenModifier.defaultLibrary,
      });
    }
  }

  // Process <alias>
  for (const alias of meta.aliases) {
    // Tag name → keyword
    if (alias.tagLoc && alias.tagLoc.start < alias.tagLoc.end) {
      const { line, char } = offsetToLineChar(text, alias.tagLoc.start);
      tokens.push({
        line,
        char,
        length: alias.tagLoc.end - alias.tagLoc.start,
        type: TokenType.keyword,
        modifiers: TokenModifier.defaultLibrary,
      });
    }

    // Each alias name → variable (declaration)
    for (const name of alias.names) {
      if (name.loc && name.loc.start < name.loc.end) {
        const { line, char } = offsetToLineChar(text, name.loc.start);
        tokens.push({
          line,
          char,
          length: name.loc.end - name.loc.start,
          type: TokenType.variable,
          modifiers: TokenModifier.declaration,
        });
      }
    }
  }

  return tokens;
}

/* ===========================
 * Handler
 * =========================== */

function formatError(e: unknown): string {
  if (e instanceof Error) return e.stack ?? e.message;
  return String(e);
}

export function handleSemanticTokensFull(
  ctx: ServerContext,
  params: SemanticTokensParams
): SemanticTokens | null {
  return ctx.trace.span("lsp.semanticTokens", () => {
    try {
      ctx.trace.setAttribute("lsp.semanticTokens.uri", params.textDocument.uri);

      const doc = ctx.ensureProgramDocument(params.textDocument.uri);
      if (!doc) {
        return null;
      }

      const canonical = canonicalDocumentUri(doc.uri);
      const compilation = ctx.workspace.getCompilation(canonical.uri);

      if (!compilation?.linked?.templates?.length) {
        return null;
      }

      // Use source store text (not doc.getText) to match compiler's loc offsets.
      // VS Code normalizes CRLF→LF in TextDocument, but source store preserves original.
      const snap = ctx.workspace.sources.get(canonical.uri);
      const text = snap?.text ?? doc.getText();
      const template = compilation.linked.templates[0];
      if (!template) return null;

      ctx.trace.event("lsp.semanticTokens.extract");
      const nodeMap = buildNodeMap(template.dom);
      const elementTokens = extractTokens(text, template.rows, nodeMap);

      // Extract expression tokens if we have expression data
      const exprTable = compilation.exprTable ?? [];
      const exprSpans = compilation.exprSpans ?? new Map();
      const exprTokens = extractExpressionTokens(text, exprTable, exprSpans);

      // Extract binding command tokens (.bind, .trigger, etc.)
      const commandTokens = extractBindingCommandTokens(text, template.rows);

      // Extract interpolation delimiter tokens (${ and })
      const delimiterTokens = extractInterpolationDelimiterTokens(text, template.rows);

      // Extract meta element tokens (<import>, <bindable>, etc.)
      const metaTokens = extractMetaElementTokens(text, template.templateMeta);

      // Merge all tokens
      const tokens = [...elementTokens, ...exprTokens, ...commandTokens, ...delimiterTokens, ...metaTokens];

      if (tokens.length === 0) {
        return null;
      }

      ctx.trace.setAttributes({
        "lsp.semanticTokens.count": tokens.length,
        "lsp.semanticTokens.elementCount": elementTokens.length,
        "lsp.semanticTokens.exprCount": exprTokens.length,
        "lsp.semanticTokens.commandCount": commandTokens.length,
        "lsp.semanticTokens.metaCount": metaTokens.length,
      });

      const encoded = encodeTokens(tokens);
      return {
        data: encoded,
      };
    } catch (e) {
      ctx.logger.error(`[semanticTokens] failed for ${params.textDocument.uri}: ${formatError(e)}`);
      return null;
    }
  });
}
