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
import type { LinkedRow, NodeSem, ExprTableEntry, SourceSpan, LinkedInstruction } from "@aurelia-ls/compiler";
import type { DOMNode, ElementNode } from "@aurelia-ls/compiler";

/* ===========================
 * Token Legend
 * =========================== */

/**
 * Token types - each maps to a VS Code theme color.
 * Order matters: index in array = token type ID.
 */
export const TOKEN_TYPES = [
  "namespace",   // 0: Custom element tag names
  "type",        // 1: Component class references
  "class",       // 2: Class names
  "parameter",   // 3: Binding commands (bind, trigger, for)
  "variable",    // 4: Template variables
  "property",    // 5: Property access, bindables
  "function",    // 6: Method calls in expressions
  "keyword",     // 7: Template controllers (if, repeat, else)
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
 * Template controller names for keyword highlighting.
 */
const TEMPLATE_CONTROLLERS = new Set([
  "repeat", "if", "else", "switch", "with", "promise", "portal",
  "case", "default-case", "then", "catch", "pending",
]);

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
  if (!loc) return;

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
      // Look for binding commands like .bind, .two-way, .to-view
      const cmdInfo = findBindingCommandInAttr(attrName);
      if (cmdInfo) {
        emitCommandToken(text, loc.start + whitespaceOffset + cmdInfo.position, cmdInfo.command.length, tokens);
      }
      break;
    }

    case "listenerBinding": {
      // Look for .trigger or .capture
      if (attrName.startsWith("@")) {
        // @ shorthand - no explicit command to highlight
        return;
      }
      const cmdInfo = findBindingCommandInAttr(attrName);
      if (cmdInfo) {
        emitCommandToken(text, loc.start + whitespaceOffset + cmdInfo.position, cmdInfo.command.length, tokens);
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
      break;
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
 * Emit a token for a binding command.
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
    type: TokenType.parameter,
    modifiers: 0,
  });
}

/* ===========================
 * Interpolation Delimiter Token Extraction
 * =========================== */

/**
 * Extract semantic tokens for interpolation delimiters (${ and }).
 * Walks through the expression table to find interpolation expressions.
 */
export function extractInterpolationDelimiterTokens(
  text: string,
  exprTable: readonly ExprTableEntry[],
  exprSpans: ReadonlyMap<string, SourceSpan>,
): RawToken[] {
  const tokens: RawToken[] = [];

  for (const entry of exprTable) {
    if (entry.expressionType !== "Interpolation") continue;

    const exprSpan = exprSpans.get(entry.id);
    if (!exprSpan) continue;

    // The interpolation AST has parts and expressions arrays
    // parts[i] is the text before expressions[i], parts[last] is after all expressions
    // We need to find ${ before each expression and } after each expression
    const ast = entry.ast as {
      $kind: string;
      span?: SourceSpan;
      parts?: string[];
      expressions?: ExpressionAst[];
    };

    if (!ast.expressions || ast.expressions.length === 0) continue;

    // Find delimiters by looking for ${ and } in the text around expression spans
    for (const expr of ast.expressions) {
      if (!expr.span) continue;

      // Find ${ before the expression
      const openSearch = text.lastIndexOf("${", expr.span.start);
      if (openSearch !== -1 && openSearch >= exprSpan.start) {
        const { line, char } = offsetToLineChar(text, openSearch);
        tokens.push({
          line,
          char,
          length: 2, // ${
          type: TokenType.keyword, // Use keyword for delimiters
          modifiers: TokenModifier.defaultLibrary,
        });
      }

      // Find } after the expression
      const closeSearch = text.indexOf("}", expr.span.end);
      if (closeSearch !== -1 && closeSearch < exprSpan.end + 5) { // Allow some slack
        const { line, char } = offsetToLineChar(text, closeSearch);
        tokens.push({
          line,
          char,
          length: 1, // }
          type: TokenType.keyword,
          modifiers: TokenModifier.defaultLibrary,
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
  try {
    ctx.logger.log(`[semanticTokens] request for ${params.textDocument.uri}`);

    const doc = ctx.ensureProgramDocument(params.textDocument.uri);
    if (!doc) {
      ctx.logger.log(`[semanticTokens] no document found`);
      return null;
    }

    const canonical = canonicalDocumentUri(doc.uri);
    const compilation = ctx.workspace.program.getCompilation(canonical.uri);

    if (!compilation?.linked?.templates?.length) {
      ctx.logger.log(`[semanticTokens] no linked templates found`);
      return null;
    }

    const text = doc.getText();
    const template = compilation.linked.templates[0];
    if (!template) return null;

    ctx.logger.log(`[semanticTokens] found ${template.rows.length} rows`);

    // Log row details for debugging
    for (const row of template.rows) {
      if (row.node.kind === "element") {
        const nodeSem = row.node as NodeSem & { kind: "element" };
        ctx.logger.log(`[semanticTokens] element: ${nodeSem.tag}, custom=${!!nodeSem.custom}, native=${!!nodeSem.native}`);
      }
    }

    const nodeMap = buildNodeMap(template.dom);
    const elementTokens = extractTokens(text, template.rows, nodeMap);

    // Extract expression tokens if we have expression data
    const exprTable = compilation.exprTable ?? [];
    const exprSpans = compilation.exprSpans ?? new Map();
    const exprTokens = extractExpressionTokens(text, exprTable, exprSpans);

    // Extract binding command tokens (.bind, .trigger, etc.)
    const commandTokens = extractBindingCommandTokens(text, template.rows);

    // Extract interpolation delimiter tokens (${ and })
    const delimiterTokens = extractInterpolationDelimiterTokens(text, exprTable, exprSpans);

    // Merge all tokens
    const tokens = [...elementTokens, ...exprTokens, ...commandTokens, ...delimiterTokens];

    ctx.logger.log(`[semanticTokens] extracted ${elementTokens.length} element, ${exprTokens.length} expression, ${commandTokens.length} command, ${delimiterTokens.length} delimiter tokens`);

    if (tokens.length === 0) {
      return null;
    }

    const encoded = encodeTokens(tokens);
    ctx.logger.log(`[semanticTokens] returning ${encoded.length / 5} tokens`);

    return {
      data: encoded,
    };
  } catch (e) {
    ctx.logger.error(`[semanticTokens] failed for ${params.textDocument.uri}: ${formatError(e)}`);
    return null;
  }
}
