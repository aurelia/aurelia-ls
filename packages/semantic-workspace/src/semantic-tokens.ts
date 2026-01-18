import type {
  Attr,
  AttributeParser,
  DOMNode,
  ElementNode,
  ExprTableEntry,
  LinkedInstruction,
  LinkedRow,
  NodeSem,
  SourceSpan,
  TemplateCompilation,
  TemplateMetaIR,
  TemplateSyntaxRegistry,
} from "@aurelia-ls/compiler";
import { analyzeAttributeName, createAttributeParserFromRegistry, spanContainsOffset, spanLength } from "@aurelia-ls/compiler";
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

type IdentifierAst = {
  $kind: "Identifier";
  span: SourceSpan;
  name: string;
};

type ExpressionAst = {
  $kind: string;
  span?: SourceSpan;
  name?: IdentifierAst;
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
  elements?: ExpressionAst[];
  values?: ExpressionAst[];
  properties?: { value?: ExpressionAst }[];
  body?: ExpressionAst;
  declaration?: ExpressionAst;
  iterable?: ExpressionAst;
  ancestor?: number;
  optional?: boolean;
};

export function collectSemanticTokens(
  text: string,
  compilation: TemplateCompilation,
  syntax: TemplateSyntaxRegistry,
  attrParser?: AttributeParser,
): WorkspaceToken[] {
  const template = compilation.linked.templates[0];
  if (!template) return [];
  const parser = attrParser ?? createAttributeParserFromRegistry(syntax);

  const nodeMap = buildNodeMap(template.dom);
  const attrIndex = buildAttrIndex(template.dom);
  const elementIndex = buildElementIndex(template.dom);
  const elementTokens = extractElementTokens(template.rows, nodeMap);
  const exprTokens = extractExpressionTokens(compilation.exprTable ?? [], compilation.exprSpans ?? new Map());
  const commandTokens = extractBindingCommandTokens(template.rows, syntax, parser, attrIndex, elementIndex);
  const delimiterTokens = extractInterpolationDelimiterTokens(template.rows);
  const metaTokens = extractMetaElementTokens(template.templateMeta);

  const all = [...elementTokens, ...exprTokens, ...commandTokens, ...delimiterTokens, ...metaTokens];
  all.sort((a, b) => {
    const delta = a.span.start - b.span.start;
    if (delta !== 0) return delta;
    const aLen = a.span.end - a.span.start;
    const bLen = b.span.end - b.span.start;
    return aLen - bLen;
  });
  const seen = new Set<string>();
  const deduped: WorkspaceToken[] = [];
  for (const token of all) {
    const key = tokenKey(token);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(token);
  }
  return deduped;
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

type AttrIndexEntry = { attr: Attr; loc: SourceSpan; nameLoc: SourceSpan | null };

function buildAttrIndex(root: DOMNode): AttrIndexEntry[] {
  const entries: AttrIndexEntry[] = [];
  const stack: DOMNode[] = [root];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.kind === "element" || node.kind === "template") {
      for (const attr of node.attrs ?? []) {
        if (!attr.loc) continue;
        entries.push({ attr, loc: attr.loc, nameLoc: attr.nameLoc ?? null });
      }
      for (let i = node.children.length - 1; i >= 0; i -= 1) {
        stack.push(node.children[i]!);
      }
    }
  }
  return entries;
}

function findAttrByLoc(entries: AttrIndexEntry[], loc: SourceSpan): Attr | null {
  let best: Attr | null = null;
  let bestLen = Number.POSITIVE_INFINITY;
  for (const entry of entries) {
    if (!spanContainsOffset(entry.loc, loc.start)) continue;
    const len = spanLength(entry.loc);
    if (len < bestLen) {
      bestLen = len;
      best = entry.attr;
    }
  }
  return best;
}

function buildElementIndex(root: DOMNode): ElementNode[] {
  const elements: ElementNode[] = [];
  const stack: DOMNode[] = [root];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.kind === "element") {
      elements.push(node as ElementNode);
    }
    if (node.kind === "element" || node.kind === "template") {
      for (let i = node.children.length - 1; i >= 0; i -= 1) {
        stack.push(node.children[i]!);
      }
    }
  }
  return elements;
}

function findElementByLoc(elements: ElementNode[], loc: SourceSpan): ElementNode | null {
  let best: ElementNode | null = null;
  let bestLen = Number.POSITIVE_INFINITY;
  for (const el of elements) {
    const span = el.loc ?? null;
    if (!span) continue;
    if (!spanContainsOffset(span, loc.start)) continue;
    const len = spanLength(span);
    if (len < bestLen) {
      bestLen = len;
      best = el;
    }
  }
  return best;
}

function extractElementTokens(
  rows: LinkedRow[],
  nodeMap: Map<string, DOMNode>,
): WorkspaceToken[] {
  const tokens: WorkspaceToken[] = [];

  for (const row of rows) {
    const node = nodeMap.get(row.target);
    if (!node) continue;
    if (row.node.kind !== "element") continue;

    const nodeSem = row.node as NodeSem & { kind: "element" };
    const element = node as ElementNode;
    if (element.tag === "let") {
      if (element.tagLoc) {
        tokens.push({
          type: "aureliaMetaElement",
          span: element.tagLoc,
        });
      }
      if (element.closeTagLoc) {
        tokens.push({
          type: "aureliaMetaElement",
          span: element.closeTagLoc,
        });
      }
      continue;
    }

    if (!nodeSem.custom) continue;
    if (element.tagLoc) {
      tokens.push({
        type: "aureliaElement",
        span: element.tagLoc,
      });
    }
    if (element.closeTagLoc) {
      tokens.push({
        type: "aureliaElement",
        span: element.closeTagLoc,
      });
    }
  }

  return tokens;
}

function extractExpressionTokens(
  exprTable: readonly ExprTableEntry[],
  exprSpans: ReadonlyMap<string, SourceSpan>,
): WorkspaceToken[] {
  const tokens: WorkspaceToken[] = [];
  for (const entry of exprTable) {
    const exprSpan = exprSpans.get(entry.id);
    if (!exprSpan) continue;
    walkExpression(entry.ast as ExpressionAst, tokens);
  }
  return tokens;
}

function walkExpression(
  node: ExpressionAst | null | undefined,
  tokens: WorkspaceToken[],
): void {
  if (!node || !node.$kind) return;

  switch (node.$kind) {
    case "AccessScope": {
      if (node.name?.span) {
        const modifiers = AURELIA_BUILTINS.has(node.name.name) ? ["defaultLibrary"] : undefined;
        tokens.push({
          type: "variable",
          modifiers,
          span: node.name.span,
        });
      }
      break;
    }

    case "AccessMember": {
      walkExpression(node.object, tokens);
      if (node.name?.span) {
        tokens.push({
          type: "property",
          span: node.name.span,
        });
      }
      break;
    }

    case "CallScope": {
      if (node.name?.span) {
        const modifiers = AURELIA_BUILTINS.has(node.name.name) ? ["defaultLibrary"] : undefined;
        tokens.push({
          type: "function",
          modifiers,
          span: node.name.span,
        });
      }
      for (const arg of node.args ?? []) {
        walkExpression(arg, tokens);
      }
      break;
    }

    case "CallMember": {
      walkExpression(node.object, tokens);
      if (node.name?.span) {
        tokens.push({
          type: "function",
          span: node.name.span,
        });
      }
      for (const arg of node.args ?? []) {
        walkExpression(arg, tokens);
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
      walkExpression(node.condition, tokens);
      walkExpression(node.yes, tokens);
      walkExpression(node.no, tokens);
      break;
    }

    case "Binary": {
      walkExpression(node.left, tokens);
      walkExpression(node.right, tokens);
      break;
    }

    case "Unary": {
      walkExpression(node.expression, tokens);
      break;
    }

    case "Assign": {
      walkExpression(node.target, tokens);
      walkExpression(node.value, tokens);
      break;
    }

    case "AccessKeyed": {
      walkExpression(node.object, tokens);
      walkExpression(node.key, tokens);
      break;
    }

    case "CallFunction": {
      walkExpression(node.func, tokens);
      for (const arg of node.args ?? []) {
        walkExpression(arg, tokens);
      }
      break;
    }

    case "ValueConverter": {
      walkExpression(node.expression, tokens);
      if (node.name?.span) {
        tokens.push({
          type: "aureliaConverter",
          span: node.name.span,
        });
      }
      for (const arg of node.args ?? []) {
        walkExpression(arg, tokens);
      }
      break;
    }

    case "BindingBehavior": {
      walkExpression(node.expression, tokens);
      if (node.name?.span) {
        tokens.push({
          type: "aureliaBehavior",
          span: node.name.span,
        });
      }
      for (const arg of node.args ?? []) {
        walkExpression(arg, tokens);
      }
      break;
    }

    case "ArrayLiteral": {
      for (const el of node.elements ?? []) {
        walkExpression(el, tokens);
      }
      break;
    }

    case "ObjectLiteral": {
      for (const val of node.values ?? []) {
        walkExpression(val, tokens);
      }
      break;
    }

    case "Template": {
      for (const expr of node.expressions ?? []) {
        walkExpression(expr, tokens);
      }
      break;
    }

    case "Interpolation": {
      for (const expr of node.expressions ?? []) {
        walkExpression(expr, tokens);
      }
      break;
    }

    case "ForOfStatement": {
      const decl = node.declaration;
      if (decl && decl.$kind === "BindingIdentifier" && decl.name?.span) {
        tokens.push({
          type: "variable",
          modifiers: ["declaration"],
          span: decl.name.span,
        });
      } else if (decl) {
        walkBindingPattern(decl, tokens);
      }
      walkExpression(node.iterable, tokens);
      break;
    }

    case "ArrowFunction": {
      for (const param of node.args ?? []) {
        walkBindingPattern(param, tokens);
      }
      walkExpression(node.body, tokens);
      break;
    }

    case "Paren": {
      walkExpression(node.expression, tokens);
      break;
    }

    case "TaggedTemplate": {
      walkExpression(node.func, tokens);
      for (const expr of node.expressions ?? []) {
        walkExpression(expr, tokens);
      }
      break;
    }

    case "New": {
      walkExpression(node.func, tokens);
      for (const arg of node.args ?? []) {
        walkExpression(arg, tokens);
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
  tokens: WorkspaceToken[],
): void {
  if (!node || !node.$kind) return;

  switch (node.$kind) {
    case "BindingIdentifier": {
      if (node.name?.span) {
        tokens.push({
          type: "variable",
          modifiers: ["declaration"],
          span: node.name.span,
        });
      }
      break;
    }

    case "ArrayBindingPattern": {
      for (const el of node.elements ?? []) {
        walkBindingPattern(el, tokens);
      }
      break;
    }

    case "ObjectBindingPattern": {
      for (const prop of node.properties ?? []) {
        if (prop.value) {
          walkBindingPattern(prop.value, tokens);
        }
      }
      break;
    }

    case "BindingPatternDefault": {
      const def = node as ExpressionAst & { target?: ExpressionAst };
      if (def.target) {
        walkBindingPattern(def.target, tokens);
      }
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
      target?: { kind?: string } | null;
      instructions?: unknown[];
      props?: unknown[];
      def?: { rows?: { instructions: unknown[] }[] };
    };

function extractBindingCommandTokens(
  rows: LinkedRow[],
  syntax: TemplateSyntaxRegistry,
  parser: AttributeParser,
  attrIndex: AttrIndexEntry[],
  elementIndex: ElementNode[],
): WorkspaceToken[] {
  const tokens: WorkspaceToken[] = [];
  for (const row of rows) {
    for (const ins of row.instructions) {
      extractBindingTokensFromIR(ins, tokens, syntax, parser, attrIndex, elementIndex);
    }
  }
  return tokens;
}

function extractBindingTokensFromIR(
  ins: InstructionLike,
  tokens: WorkspaceToken[],
  syntax: TemplateSyntaxRegistry,
  parser: AttributeParser,
  attrIndex: AttrIndexEntry[],
  elementIndex: ElementNode[],
): void {
  const kind = instructionKind(ins);
  if (!kind) return;

  if (kind === "hydrateLetElement") {
    const nested = "instructions" in ins ? ins.instructions : undefined;
    if (Array.isArray(nested)) {
      for (const letIns of nested) {
        extractBindingTokensFromIR(letIns as InstructionLike, tokens, syntax, parser, attrIndex, elementIndex);
      }
    }
    return;
  }

  const loc = ins.loc;
  if (!loc) return;

  if (kind === "hydrateElement") {
    if (!instructionResName(hasRes(ins) ? ins.res : null)) return;
    const element = findElementByLoc(elementIndex, loc);
    if (element?.tagLoc) {
      tokens.push({ type: "aureliaElement", span: element.tagLoc });
    }
    if (element?.closeTagLoc) {
      tokens.push({ type: "aureliaElement", span: element.closeTagLoc });
    }
    const props = "props" in ins ? ins.props : undefined;
    if (Array.isArray(props)) {
      for (const prop of props) {
        extractBindingTokensFromIR(prop as InstructionLike, tokens, syntax, parser, attrIndex, elementIndex);
      }
    }
    return;
  }

  const attr = findAttrByLoc(attrIndex, loc);
  const attrName = attr?.name ?? null;
  const nameSpan = attr?.nameLoc ?? null;
  if (!attrName || !nameSpan) return;
  const nameStart = nameSpan.start;
  const analysis = analyzeAttributeName(attrName, syntax, parser);
  const commandSpan = analysis.commandSpan;
  const targetSpan = resolveTargetSpan(attrName, analysis);

  const targetKind = "target" in ins ? ins.target?.kind ?? null : null;
  const isElementBindable = targetKind === "element.bindable";

  if (kind === "hydrateTemplateController") {
    const res = instructionResName(hasRes(ins) ? ins.res : null);
    if (!res) return;
    if (targetSpan) {
      tokens.push({
        type: "aureliaController",
        span: sliceSpan(nameStart + targetSpan.start, nameStart + targetSpan.end, loc),
      });
    }

    if (commandSpan && analysis.syntax.command && analysis.syntax.command !== res) {
      emitCommandToken(nameStart + commandSpan.start, commandSpan.end - commandSpan.start, loc, tokens);
    }

    const nestedRows = nestedInstructionRows(ins);
    if (nestedRows) {
      for (const row of nestedRows) {
        for (const nestedIns of row.instructions) {
          extractBindingTokensFromIR(nestedIns as InstructionLike, tokens, syntax, parser, attrIndex, elementIndex);
        }
      }
    }
    return;
  }

  if (kind === "hydrateAttribute") {
    const res = instructionResName(hasRes(ins) ? ins.res : null);
    if (!res) return;
    if (commandSpan) {
      emitCommandToken(nameStart + commandSpan.start, commandSpan.end - commandSpan.start, loc, tokens);
    }
    if (targetSpan) {
      const start = nameStart + targetSpan.start;
      tokens.push({
        type: "aureliaAttribute",
        span: sliceSpan(start, start + (targetSpan.end - targetSpan.start), loc),
      });
    }
    return;
  }

  if (kind === "letBinding") {
    if (targetSpan) {
      tokens.push({
        type: "variable",
        modifiers: ["declaration"],
        span: sliceSpan(nameStart + targetSpan.start, nameStart + targetSpan.end, loc),
      });
    }
    if (commandSpan) {
      emitCommandToken(nameStart + commandSpan.start, commandSpan.end - commandSpan.start, loc, tokens);
    }
    return;
  }

  if (kind === "refBinding") {
    if (commandSpan) {
      emitCommandToken(nameStart + commandSpan.start, commandSpan.end - commandSpan.start, loc, tokens);
    }
    return;
  }

  if (kind === "propertyBinding" || kind === "attributeBinding" ||
      kind === "stylePropertyBinding" || kind === "setProperty") {
    if (isElementBindable) {
      if (targetSpan) {
        tokens.push({
          type: "aureliaBindable",
          span: sliceSpan(nameStart + targetSpan.start, nameStart + targetSpan.end, loc),
        });
      }
    }
    if (commandSpan) {
      emitCommandToken(nameStart + commandSpan.start, commandSpan.end - commandSpan.start, loc, tokens);
    }
    return;
  }

  if (kind === "listenerBinding") {
    if (commandSpan) {
      emitCommandToken(nameStart + commandSpan.start, commandSpan.end - commandSpan.start, loc, tokens);
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

function extractInterpolationDelimiterTokens(rows: LinkedRow[]): WorkspaceToken[] {
  const tokens: WorkspaceToken[] = [];
  for (const row of rows) {
    for (const ins of row.instructions) {
      extractDelimitersFromInstruction(ins, tokens);
    }
  }
  return tokens;
}

function extractDelimitersFromInstruction(
  ins: LinkedInstruction,
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
          extractDelimitersFromIR(nestedIns as { type?: string; from?: unknown; def?: { rows: { instructions: unknown[] }[] } }, tokens);
        }
      }
    }
  }
}

function extractDelimitersFromIR(
  ins: { type?: string; from?: unknown; def?: { rows: { instructions: unknown[] }[] } },
  tokens: WorkspaceToken[],
): void {
  const from = ins.from as { kind?: string; exprs?: { loc?: SourceSpan | null }[] } | undefined;
  if (from?.kind === "interp") {
    emitDelimiterTokensFromInterp(from as { exprs: { loc?: SourceSpan | null }[] }, tokens);
  }
  if (ins.type === "hydrateTemplateController" && ins.def?.rows) {
    for (const nestedRow of ins.def.rows) {
      for (const nestedIns of nestedRow.instructions) {
        extractDelimitersFromIR(nestedIns as typeof ins, tokens);
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

function extractMetaElementTokens(meta: TemplateMetaIR | undefined): WorkspaceToken[] {
  if (!meta) return [];
  const tokens: WorkspaceToken[] = [];

  for (const imp of meta.imports) {
    if (imp.tagLoc && imp.tagLoc.start < imp.tagLoc.end) {
      tokens.push({ type: "aureliaMetaElement", span: imp.tagLoc });
    }
    if (imp.from.nameLoc) {
      tokens.push({ type: "aureliaMetaAttribute", span: imp.from.nameLoc });
    }
    if (imp.from.loc && imp.from.loc.start < imp.from.loc.end) {
      tokens.push({ type: "string", span: imp.from.loc });
    }
    if (imp.defaultAlias?.loc && imp.defaultAlias.loc.start < imp.defaultAlias.loc.end) {
      if (imp.defaultAlias.nameLoc) {
        tokens.push({ type: "aureliaMetaAttribute", span: imp.defaultAlias.nameLoc });
      }
      tokens.push({ type: "variable", modifiers: ["declaration"], span: imp.defaultAlias.loc });
    }
    for (const na of imp.namedAliases) {
      if (na.asLoc) {
        tokens.push({ type: "aureliaMetaAttribute", span: na.asLoc });
      }
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
    if (bindable.name.nameLoc) {
      tokens.push({ type: "aureliaMetaAttribute", span: bindable.name.nameLoc });
    }
    if (bindable.name.loc && bindable.name.loc.start < bindable.name.loc.end) {
      tokens.push({ type: "aureliaBindable", modifiers: ["declaration"], span: bindable.name.loc });
    }
    if (bindable.mode?.loc && bindable.mode.loc.start < bindable.mode.loc.end) {
      if (bindable.mode.nameLoc) {
        tokens.push({ type: "aureliaMetaAttribute", span: bindable.mode.nameLoc });
      }
      tokens.push({ type: "keyword", span: bindable.mode.loc });
    }
    if (bindable.attribute?.loc && bindable.attribute.loc.start < bindable.attribute.loc.end) {
      if (bindable.attribute.nameLoc) {
        tokens.push({ type: "aureliaMetaAttribute", span: bindable.attribute.nameLoc });
      }
      tokens.push({ type: "aureliaAttribute", span: bindable.attribute.loc });
    }
  }

  if (meta.shadowDom?.tagLoc) {
    tokens.push({ type: "aureliaMetaElement", span: meta.shadowDom.tagLoc });
  }
  if (meta.shadowDom?.mode?.loc) {
    if (meta.shadowDom.mode.nameLoc) {
      tokens.push({ type: "aureliaMetaAttribute", span: meta.shadowDom.mode.nameLoc });
    }
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
        if (name.nameLoc) {
          tokens.push({ type: "aureliaMetaAttribute", span: name.nameLoc });
        }
        tokens.push({ type: "variable", modifiers: ["declaration"], span: name.loc });
      }
    }
  }

  return tokens;
}

function sliceSpan(start: number, end: number, base?: SourceSpan): SourceSpan {
  if (base?.file) {
    return { start, end, file: base.file };
  }
  return { start, end };
}

function tokenKey(token: WorkspaceToken): string {
  const mods = token.modifiers ? token.modifiers.join(",") : "";
  return `${token.type}:${token.span.start}:${token.span.end}:${mods}`;
}

function resolveTargetSpan(
  attrName: string,
  analysis: ReturnType<typeof analyzeAttributeName>,
): { start: number; end: number } | null {
  if (analysis.targetSpan) return analysis.targetSpan;
  if (analysis.syntax.command) return null;
  if (!attrName) return null;
  return { start: 0, end: attrName.length };
}
