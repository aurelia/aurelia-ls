import type {
  DOMNode,
  ElementNode,
  ExprTableEntry,
  LinkedInstruction,
  LinkedRow,
  NodeSem,
  SourceSpan,
  TemplateCompilation,
  TemplateMetaIR,
} from "@aurelia-ls/compiler";
import type { WorkspaceToken } from "./types.js";

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

export function collectSemanticTokens(
  text: string,
  compilation: TemplateCompilation,
): WorkspaceToken[] {
  const template = compilation.linked.templates[0];
  if (!template) return [];

  const nodeMap = buildNodeMap(template.dom);
  const elementTokens = extractElementTokens(text, template.rows, nodeMap);
  const exprTokens = extractExpressionTokens(text, compilation.exprTable ?? [], compilation.exprSpans ?? new Map());
  const commandTokens = extractBindingCommandTokens(text, template.rows);
  const delimiterTokens = extractInterpolationDelimiterTokens(text, template.rows);
  const metaTokens = extractMetaElementTokens(text, template.templateMeta);

  const all = [...elementTokens, ...exprTokens, ...commandTokens, ...delimiterTokens, ...metaTokens];
  all.sort((a, b) => {
    const delta = a.span.start - b.span.start;
    if (delta !== 0) return delta;
    const aLen = a.span.end - a.span.start;
    const bLen = b.span.end - b.span.start;
    return aLen - bLen;
  });
  return all;
}

function buildNodeMap(root: DOMNode): Map<string, DOMNode> {
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

function extractElementTokens(
  text: string,
  rows: LinkedRow[],
  nodeMap: Map<string, DOMNode>,
): WorkspaceToken[] {
  const tokens: WorkspaceToken[] = [];

  for (const row of rows) {
    const node = nodeMap.get(row.target);
    if (!node) continue;
    if (row.node.kind !== "element") continue;

    const nodeSem = row.node as NodeSem & { kind: "element" };
    if (!nodeSem.custom) continue;

    const element = node as ElementNode;
    const loc = element.loc;
    if (!loc) continue;

    const tagStart = loc.start + 1;
    const tagLength = element.tag.length;
    tokens.push({
      type: "aureliaElement",
      span: sliceSpan(tagStart, tagStart + tagLength, loc),
    });

    if (!element.selfClosed) {
      const closeTagPattern = `</${element.tag}>`;
      const closeTagStart = text.lastIndexOf(closeTagPattern, loc.end);
      if (closeTagStart !== -1) {
        const closeNameStart = closeTagStart + 2;
        tokens.push({
          type: "aureliaElement",
          span: sliceSpan(closeNameStart, closeNameStart + tagLength, loc),
        });
      }
    }
  }

  return tokens;
}

function extractExpressionTokens(
  text: string,
  exprTable: readonly ExprTableEntry[],
  exprSpans: ReadonlyMap<string, SourceSpan>,
): WorkspaceToken[] {
  const tokens: WorkspaceToken[] = [];
  for (const entry of exprTable) {
    const exprSpan = exprSpans.get(entry.id);
    if (!exprSpan) continue;
    walkExpression(entry.ast as ExpressionAst, text, tokens);
  }
  return tokens;
}

function walkExpression(
  node: ExpressionAst | null | undefined,
  text: string,
  tokens: WorkspaceToken[],
): void {
  if (!node || !node.$kind) return;

  switch (node.$kind) {
    case "AccessScope": {
      if (node.span && node.name) {
        const modifiers = AURELIA_BUILTINS.has(node.name) ? ["defaultLibrary"] : undefined;
        tokens.push({
          type: "variable",
          modifiers,
          span: sliceSpan(node.span.start, node.span.start + node.name.length, node.span),
        });
      }
      break;
    }

    case "AccessMember": {
      walkExpression(node.object, text, tokens);
      if (node.span && node.name) {
        const propStart = findPropertyStart(text, node.span, node.name);
        if (propStart !== -1) {
          tokens.push({
            type: "property",
            span: sliceSpan(propStart, propStart + node.name.length, node.span),
          });
        }
      }
      break;
    }

    case "CallScope": {
      if (node.span && node.name) {
        const modifiers = AURELIA_BUILTINS.has(node.name) ? ["defaultLibrary"] : undefined;
        tokens.push({
          type: "function",
          modifiers,
          span: sliceSpan(node.span.start, node.span.start + node.name.length, node.span),
        });
      }
      for (const arg of node.args ?? []) {
        walkExpression(arg, text, tokens);
      }
      break;
    }

    case "CallMember": {
      walkExpression(node.object, text, tokens);
      if (node.span && node.name) {
        const propStart = findPropertyStart(text, node.span, node.name);
        if (propStart !== -1) {
          tokens.push({
            type: "function",
            span: sliceSpan(propStart, propStart + node.name.length, node.span),
          });
        }
      }
      for (const arg of node.args ?? []) {
        walkExpression(arg, text, tokens);
      }
      break;
    }

    case "AccessThis": {
      if (node.span) {
        const ancestor = node.ancestor ?? 0;
        const name = ancestor === 0 ? "$this" : "$parent";
        tokens.push({
          type: "variable",
          modifiers: ["defaultLibrary"],
          span: sliceSpan(node.span.start, node.span.start + name.length, node.span),
        });
      }
      break;
    }

    case "AccessBoundary": {
      if (node.span) {
        tokens.push({
          type: "variable",
          modifiers: ["defaultLibrary"],
          span: sliceSpan(node.span.start, node.span.start + "$host".length, node.span),
        });
      }
      break;
    }

    case "Conditional": {
      walkExpression(node.condition, text, tokens);
      walkExpression(node.yes, text, tokens);
      walkExpression(node.no, text, tokens);
      break;
    }

    case "Binary": {
      walkExpression(node.left, text, tokens);
      walkExpression(node.right, text, tokens);
      break;
    }

    case "Unary": {
      walkExpression(node.expression, text, tokens);
      break;
    }

    case "Assign": {
      walkExpression(node.target, text, tokens);
      walkExpression(node.value, text, tokens);
      break;
    }

    case "AccessKeyed": {
      walkExpression(node.object, text, tokens);
      walkExpression(node.key, text, tokens);
      break;
    }

    case "CallFunction": {
      walkExpression(node.func, text, tokens);
      for (const arg of node.args ?? []) {
        walkExpression(arg, text, tokens);
      }
      break;
    }

    case "ValueConverter": {
      walkExpression(node.expression, text, tokens);
      if (node.name && node.span) {
        const namePos = findPipeOrAmpName(text, node.span, "|", node.name);
        if (namePos !== -1) {
          tokens.push({
            type: "aureliaConverter",
            span: sliceSpan(namePos, namePos + node.name.length, node.span),
          });
        }
      }
      for (const arg of node.args ?? []) {
        walkExpression(arg, text, tokens);
      }
      break;
    }

    case "BindingBehavior": {
      walkExpression(node.expression, text, tokens);
      if (node.name && node.span) {
        const namePos = findPipeOrAmpName(text, node.span, "&", node.name);
        if (namePos !== -1) {
          tokens.push({
            type: "aureliaBehavior",
            span: sliceSpan(namePos, namePos + node.name.length, node.span),
          });
        }
      }
      for (const arg of node.args ?? []) {
        walkExpression(arg, text, tokens);
      }
      break;
    }

    case "ArrayLiteral": {
      const arr = node as ExpressionAst & { elements?: ExpressionAst[] };
      for (const el of arr.elements ?? []) {
        walkExpression(el, text, tokens);
      }
      break;
    }

    case "ObjectLiteral": {
      const obj = node as ExpressionAst & { values?: ExpressionAst[] };
      for (const val of obj.values ?? []) {
        walkExpression(val, text, tokens);
      }
      break;
    }

    case "Template": {
      for (const expr of node.expressions ?? []) {
        walkExpression(expr, text, tokens);
      }
      break;
    }

    case "Interpolation": {
      for (const expr of node.expressions ?? []) {
        walkExpression(expr, text, tokens);
      }
      break;
    }

    case "ForOfStatement": {
      const decl = node.declaration;
      if (decl && decl.$kind === "BindingIdentifier" && decl.span && decl.name) {
        tokens.push({
          type: "variable",
          modifiers: ["declaration"],
          span: sliceSpan(decl.span.start, decl.span.start + decl.name.length, decl.span),
        });
      } else if (decl) {
        walkBindingPattern(decl, text, tokens);
      }
      walkExpression(node.iterable, text, tokens);
      break;
    }

    case "ArrowFunction": {
      const fn = node as ExpressionAst & { params?: ExpressionAst[]; body?: ExpressionAst };
      for (const param of fn.params ?? []) {
        walkBindingPattern(param, text, tokens);
      }
      walkExpression(fn.body, text, tokens);
      break;
    }

    case "Paren": {
      walkExpression(node.expression, text, tokens);
      break;
    }

    case "TaggedTemplate": {
      walkExpression(node.func, text, tokens);
      const cooked = (node as ExpressionAst & { cooked?: ExpressionAst }).cooked;
      if (cooked) {
        for (const expr of cooked.expressions ?? []) {
          walkExpression(expr, text, tokens);
        }
      }
      break;
    }

    case "New": {
      walkExpression(node.func, text, tokens);
      for (const arg of node.args ?? []) {
        walkExpression(arg, text, tokens);
      }
      break;
    }

    case "PrimitiveLiteral":
    case "AccessGlobal":
    default:
      break;
  }
}

function walkBindingPattern(
  node: ExpressionAst,
  text: string,
  tokens: WorkspaceToken[],
): void {
  if (!node || !node.$kind) return;

  switch (node.$kind) {
    case "BindingIdentifier": {
      if (node.span && node.name) {
        tokens.push({
          type: "variable",
          modifiers: ["declaration"],
          span: sliceSpan(node.span.start, node.span.start + node.name.length, node.span),
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
      const def = node as ExpressionAst & { binding?: ExpressionAst };
      walkBindingPattern(def.binding as ExpressionAst, text, tokens);
      break;
    }
  }
}

type InstructionRes = string | { def?: { name?: string } } | null | undefined;

type InstructionLike =
  | LinkedInstruction
  | {
      kind?: string;
      type?: string;
      res?: InstructionRes;
      loc?: SourceSpan | null;
      def?: { rows?: { instructions: unknown[] }[] };
    };

function extractBindingCommandTokens(text: string, rows: LinkedRow[]): WorkspaceToken[] {
  const tokens: WorkspaceToken[] = [];
  for (const row of rows) {
    for (const ins of row.instructions) {
      extractBindingTokensFromIR(ins, text, tokens);
    }
  }
  return tokens;
}

function extractBindingTokensFromIR(ins: InstructionLike, text: string, tokens: WorkspaceToken[]): void {
  const loc = ins.loc;
  if (!loc) return;

  const attrText = text.slice(loc.start, loc.end);
  const eqPos = attrText.indexOf("=");
  const rawAttrName = eqPos !== -1 ? attrText.slice(0, eqPos) : attrText;
  const attrName = rawAttrName.trim();
  const whitespaceOffset = rawAttrName.indexOf(attrName);

  const kind = instructionKind(ins);
  if (!kind) return;

  if (kind === "hydrateTemplateController") {
    const res = instructionResName(hasRes(ins) ? ins.res : null);
    if (!res) return;
    const controllerPos = attrName.indexOf(res);
    if (controllerPos !== -1) {
      const start = loc.start + whitespaceOffset + controllerPos;
      tokens.push({
        type: "aureliaController",
        span: sliceSpan(start, start + res.length, loc),
      });
    }

    const cmdInfo = findBindingCommandInAttr(attrName);
    if (cmdInfo && cmdInfo.command !== res) {
      emitCommandToken(loc.start + whitespaceOffset + cmdInfo.position, cmdInfo.command.length, loc, tokens);
    }

    const nestedRows = nestedInstructionRows(ins);
    if (nestedRows) {
      for (const row of nestedRows) {
        for (const nestedIns of row.instructions) {
          extractBindingTokensFromIR(nestedIns as InstructionLike, text, tokens);
        }
      }
    }
    return;
  }

  if (kind === "hydrateAttribute") {
    const res = instructionResName(hasRes(ins) ? ins.res : null);
    if (!res) return;
    const cmdInfo = findBindingCommandInAttr(attrName);
    if (cmdInfo) {
      emitCommandToken(loc.start + whitespaceOffset + cmdInfo.position, cmdInfo.command.length, loc, tokens);
    }
    const attrNameOnly = cmdInfo ? attrName.slice(0, cmdInfo.position - 1) : attrName;
    if (attrNameOnly.length > 0) {
      const start = loc.start + whitespaceOffset;
      tokens.push({
        type: "aureliaAttribute",
        span: sliceSpan(start, start + attrNameOnly.length, loc),
      });
    }
    return;
  }

  if (kind === "refBinding") {
    if (attrName === "ref") {
      emitCommandToken(loc.start + whitespaceOffset, 3, loc, tokens);
    } else {
      const cmdInfo = findBindingCommandInAttr(attrName);
      if (cmdInfo) {
        emitCommandToken(loc.start + whitespaceOffset + cmdInfo.position, cmdInfo.command.length, loc, tokens);
      }
    }
    return;
  }

  if (kind === "hydrateElement") {
    const elementName = instructionResName(hasRes(ins) ? ins.res : null);
    if (!elementName) return;
    const openTagStart = loc.start + 1;
    tokens.push({
      type: "aureliaElement",
      span: sliceSpan(openTagStart, openTagStart + elementName.length, loc),
    });

    const closeTagPattern = `</${elementName}>`;
    const closeTagStart = text.lastIndexOf(closeTagPattern, loc.end);
    if (closeTagStart !== -1 && closeTagStart > loc.start) {
      const closeNameStart = closeTagStart + 2;
      tokens.push({
        type: "aureliaElement",
        span: sliceSpan(closeNameStart, closeNameStart + elementName.length, loc),
      });
    }
    return;
  }

  if (kind === "propertyBinding" || kind === "attributeBinding" ||
      kind === "stylePropertyBinding") {
    if (attrName.startsWith(":")) {
      emitCommandToken(loc.start + whitespaceOffset, 1, loc, tokens);
      return;
    }
    const cmdInfo = findBindingCommandInAttr(attrName);
    if (cmdInfo) {
      emitCommandToken(loc.start + whitespaceOffset + cmdInfo.position, cmdInfo.command.length, loc, tokens);
    }
    return;
  }

  if (kind === "listenerBinding") {
    if (attrName.startsWith("@")) {
      emitCommandToken(loc.start + whitespaceOffset, 1, loc, tokens);
      return;
    }
    const cmdInfo = findBindingCommandInAttr(attrName);
    if (cmdInfo) {
      emitCommandToken(loc.start + whitespaceOffset + cmdInfo.position, cmdInfo.command.length, loc, tokens);
    }
  }
}

function instructionKind(ins: InstructionLike): string | undefined {
  if ("kind" in ins && typeof ins.kind === "string") return ins.kind;
  if ("type" in ins && typeof ins.type === "string") return ins.type;
  return undefined;
}

function hasRes(ins: InstructionLike): ins is InstructionLike & { res?: InstructionRes } {
  return "res" in ins;
}

function instructionResName(res: InstructionRes): string | null {
  if (!res) return null;
  if (typeof res === "string") return res;
  if (typeof res === "object") {
    const name = res.def?.name;
    if (name) return name;
  }
  return null;
}

function nestedInstructionRows(ins: InstructionLike): { instructions: unknown[] }[] | null {
  if (!("def" in ins)) return null;
  const def = ins.def;
  if (!def || typeof def !== "object") return null;
  const rows = def.rows;
  return Array.isArray(rows) ? rows : null;
}

function emitCommandToken(
  offset: number,
  length: number,
  base: SourceSpan,
  tokens: WorkspaceToken[],
): void {
  tokens.push({
    type: "aureliaCommand",
    span: sliceSpan(offset, offset + length, base),
  });
}

function extractInterpolationDelimiterTokens(text: string, rows: LinkedRow[]): WorkspaceToken[] {
  const tokens: WorkspaceToken[] = [];
  for (const row of rows) {
    for (const ins of row.instructions) {
      extractDelimitersFromInstruction(ins, text, tokens);
    }
  }
  return tokens;
}

function extractDelimitersFromInstruction(
  ins: LinkedInstruction,
  text: string,
  tokens: WorkspaceToken[],
): void {
  const from = (ins as { from?: { kind?: string; exprs?: { loc?: SourceSpan | null }[] } }).from;
  if (from?.kind === "interp") {
    emitDelimiterTokensFromInterp(from as { exprs: { loc?: SourceSpan | null }[] }, tokens);
  }
  if (ins.kind === "hydrateTemplateController") {
    const def = (ins as { def?: { rows?: { instructions: unknown[] }[] } }).def;
    if (def?.rows) {
      for (const nestedRow of def.rows) {
        for (const nestedIns of nestedRow.instructions) {
          extractDelimitersFromIR(nestedIns as { type?: string; from?: unknown; def?: { rows: { instructions: unknown[] }[] } }, text, tokens);
        }
      }
    }
  }
}

function extractDelimitersFromIR(
  ins: { type?: string; from?: unknown; def?: { rows: { instructions: unknown[] }[] } },
  _text: string,
  tokens: WorkspaceToken[],
): void {
  const from = ins.from as { kind?: string; exprs?: { loc?: SourceSpan | null }[] } | undefined;
  if (from?.kind === "interp") {
    emitDelimiterTokensFromInterp(from as { exprs: { loc?: SourceSpan | null }[] }, tokens);
  }
  if (ins.type === "hydrateTemplateController" && ins.def?.rows) {
    for (const nestedRow of ins.def.rows) {
      for (const nestedIns of nestedRow.instructions) {
        extractDelimitersFromIR(nestedIns as typeof ins, "", tokens);
      }
    }
  }
}

function emitDelimiterTokensFromInterp(
  interp: { exprs: { loc?: SourceSpan | null }[] },
  tokens: WorkspaceToken[],
): void {
  for (const expr of interp.exprs) {
    if (!expr.loc) continue;
    const openStart = expr.loc.start - 2;
    if (openStart >= 0) {
      tokens.push({
        type: "aureliaExpression",
        span: sliceSpan(openStart, openStart + 2, expr.loc),
      });
    }
    tokens.push({
      type: "aureliaExpression",
      span: sliceSpan(expr.loc.end, expr.loc.end + 1, expr.loc),
    });
  }
}

function extractMetaElementTokens(text: string, meta: TemplateMetaIR | undefined): WorkspaceToken[] {
  if (!meta) return [];
  const tokens: WorkspaceToken[] = [];

  for (const imp of meta.imports) {
    if (imp.tagLoc && imp.tagLoc.start < imp.tagLoc.end) {
      tokens.push({ type: "aureliaMetaElement", span: imp.tagLoc });
    }
    if (imp.from.loc && imp.from.loc.start < imp.from.loc.end) {
      tokens.push({ type: "string", span: imp.from.loc });
    }
    if (imp.defaultAlias?.loc && imp.defaultAlias.loc.start < imp.defaultAlias.loc.end) {
      tokens.push({ type: "variable", modifiers: ["declaration"], span: imp.defaultAlias.loc });
    }
    for (const na of imp.namedAliases) {
      if (na.exportName.loc && na.exportName.loc.start < na.exportName.loc.end) {
        tokens.push({ type: "variable", span: na.exportName.loc });
      }
      if (na.alias.loc && na.alias.loc.start < na.alias.loc.end) {
        tokens.push({ type: "variable", modifiers: ["declaration"], span: na.alias.loc });
      }
    }
  }

  for (const bindable of meta.bindables) {
    if (bindable.tagLoc && bindable.tagLoc.start < bindable.tagLoc.end) {
      tokens.push({ type: "aureliaMetaElement", span: bindable.tagLoc });
    }
    if (bindable.name.loc && bindable.name.loc.start < bindable.name.loc.end) {
      tokens.push({ type: "aureliaBindable", modifiers: ["declaration"], span: bindable.name.loc });
    }
    if (bindable.mode?.loc && bindable.mode.loc.start < bindable.mode.loc.end) {
      tokens.push({ type: "keyword", span: bindable.mode.loc });
    }
    if (bindable.attribute?.loc && bindable.attribute.loc.start < bindable.attribute.loc.end) {
      tokens.push({ type: "aureliaAttribute", span: bindable.attribute.loc });
    }
  }

  if (meta.shadowDom?.tagLoc) {
    tokens.push({ type: "aureliaMetaElement", span: meta.shadowDom.tagLoc });
  }
  if (meta.containerless?.tagLoc) {
    tokens.push({ type: "aureliaMetaElement", span: meta.containerless.tagLoc });
  }
  if (meta.capture?.tagLoc) {
    tokens.push({ type: "aureliaMetaElement", span: meta.capture.tagLoc });
  }
  for (const alias of meta.aliases) {
    if (alias.tagLoc) {
      tokens.push({ type: "aureliaMetaElement", span: alias.tagLoc });
    }
    for (const name of alias.names) {
      if (name.loc) {
        tokens.push({ type: "variable", modifiers: ["declaration"], span: name.loc });
      }
    }
  }

  return tokens;
}

function findBindingCommandInAttr(attrName: string): { command: string; position: number } | null {
  const parts = attrName.split(".");
  let position = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (i > 0 && BINDING_COMMANDS.has(part)) {
      return { command: part, position };
    }
    position += part.length + 1;
  }
  return null;
}

function findPropertyStart(text: string, span: SourceSpan, name: string): number {
  const slice = text.slice(span.start, span.end);
  const idx = slice.lastIndexOf(`.${name}`);
  if (idx === -1) return -1;
  return span.start + idx + 1;
}

function findPipeOrAmpName(text: string, span: SourceSpan, separator: "|" | "&", name: string): number {
  const searchText = text.slice(span.start, span.end);
  const sepIndex = searchText.lastIndexOf(separator);
  if (sepIndex === -1) return -1;
  const afterSep = searchText.slice(sepIndex + 1);
  const whitespaceLen = afterSep.match(/^\s*/)?.[0].length ?? 0;
  const nameStart = span.start + sepIndex + 1 + whitespaceLen;
  const candidate = text.slice(nameStart, nameStart + name.length);
  return candidate === name ? nameStart : -1;
}

function sliceSpan(start: number, end: number, base?: SourceSpan): SourceSpan {
  if (base?.file) {
    return { start, end, file: base.file };
  }
  return { start, end };
}

const BINDING_COMMANDS = new Set([
  "bind",
  "two-way",
  "from-view",
  "to-view",
  "one-time",
  "one-way",
  "trigger",
  "delegate",
  "capture",
  "call",
  "ref",
  "for",
  "as-element",
  "spread",
  "attr",
  "style",
]);
