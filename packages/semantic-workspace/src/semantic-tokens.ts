import type {
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
import { analyzeAttributeName, createAttributeParserFromRegistry } from "@aurelia-ls/compiler";
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
  syntax: TemplateSyntaxRegistry,
  attrParser?: AttributeParser,
): WorkspaceToken[] {
  const template = compilation.linked.templates[0];
  if (!template) return [];
  const parser = attrParser ?? createAttributeParserFromRegistry(syntax);

  const nodeMap = buildNodeMap(template.dom);
  const elementTokens = extractElementTokens(text, template.rows, nodeMap);
  const exprTokens = extractExpressionTokens(text, compilation.exprTable ?? [], compilation.exprSpans ?? new Map());
  const commandTokens = extractBindingCommandTokens(text, template.rows, syntax, parser);
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
    const element = node as ElementNode;
    const loc = element.loc;
    if (!loc) continue;

    const tagStart = loc.start + 1;
    const tagLength = element.tag.length;
    if (element.tag === "let") {
      tokens.push({
        type: "aureliaMetaElement",
        span: sliceSpan(tagStart, tagStart + tagLength, loc),
      });

      if (!element.selfClosed) {
        const closeTagPattern = `</${element.tag}>`;
        const closeTagStart = text.lastIndexOf(closeTagPattern, loc.end);
        if (closeTagStart !== -1) {
          const closeNameStart = closeTagStart + 2;
          tokens.push({
            type: "aureliaMetaElement",
            span: sliceSpan(closeNameStart, closeNameStart + tagLength, loc),
          });
        }
      }
      continue;
    }

    if (!nodeSem.custom) continue;
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
      target?: { kind?: string } | null;
      instructions?: unknown[];
      props?: unknown[];
      def?: { rows?: { instructions: unknown[] }[] };
    };

function extractBindingCommandTokens(
  text: string,
  rows: LinkedRow[],
  syntax: TemplateSyntaxRegistry,
  parser: AttributeParser,
): WorkspaceToken[] {
  const tokens: WorkspaceToken[] = [];
  for (const row of rows) {
    for (const ins of row.instructions) {
      extractBindingTokensFromIR(ins, text, tokens, syntax, parser);
    }
  }
  return tokens;
}

function extractBindingTokensFromIR(
  ins: InstructionLike,
  text: string,
  tokens: WorkspaceToken[],
  syntax: TemplateSyntaxRegistry,
  parser: AttributeParser,
): void {
  const kind = instructionKind(ins);
  if (!kind) return;

  if (kind === "hydrateLetElement") {
    const nested = "instructions" in ins ? ins.instructions : undefined;
    if (Array.isArray(nested)) {
      for (const letIns of nested) {
        extractBindingTokensFromIR(letIns as InstructionLike, text, tokens, syntax, parser);
      }
    }
    return;
  }

  const loc = ins.loc;
  if (!loc) return;

  const attrInfo = getAttributeNameInfo(text, loc);
  if (!attrInfo) return;
  const { attrName, nameStart } = attrInfo;
  const analysis = analyzeAttributeName(attrName, syntax, parser);
  const commandSpan = analysis.commandSpan;
  const targetSpan = resolveTargetSpan(attrName, analysis);

  const targetKind = "target" in ins ? ins.target?.kind ?? null : null;
  const isElementBindable = targetKind === "element.bindable";

  if (kind === "hydrateTemplateController") {
    const res = instructionResName(hasRes(ins) ? ins.res : null);
    if (!res) return;
    const controllerPos = attrName.indexOf(res);
    if (controllerPos !== -1) {
      const start = nameStart + controllerPos;
      tokens.push({
        type: "aureliaController",
        span: sliceSpan(start, start + res.length, loc),
      });
    }

    if (commandSpan && analysis.syntax.command && analysis.syntax.command !== res) {
      emitCommandToken(nameStart + commandSpan.start, commandSpan.end - commandSpan.start, loc, tokens);
    }

    const nestedRows = nestedInstructionRows(ins);
    if (nestedRows) {
      for (const row of nestedRows) {
        for (const nestedIns of row.instructions) {
          extractBindingTokensFromIR(nestedIns as InstructionLike, text, tokens, syntax, parser);
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
    const props = "props" in ins ? ins.props : undefined;
    if (Array.isArray(props)) {
      for (const prop of props) {
        extractBindingTokensFromIR(prop as InstructionLike, text, tokens, syntax, parser);
      }
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
    const fromAttr = findMetaAttributeName(text, imp.from.loc, "from");
    if (fromAttr) {
      tokens.push({ type: "aureliaMetaAttribute", span: fromAttr });
    }
    if (imp.from.loc && imp.from.loc.start < imp.from.loc.end) {
      tokens.push({ type: "string", span: imp.from.loc });
    }
    if (imp.defaultAlias?.loc && imp.defaultAlias.loc.start < imp.defaultAlias.loc.end) {
      const asAttr = findMetaAttributeName(text, imp.defaultAlias.loc, "as");
      if (asAttr) {
        tokens.push({ type: "aureliaMetaAttribute", span: asAttr });
      }
      tokens.push({ type: "variable", modifiers: ["declaration"], span: imp.defaultAlias.loc });
    }
    for (const na of imp.namedAliases) {
      const asSpan = findNamedAliasAttributeSpan(text, na.exportName.loc);
      if (asSpan) {
        tokens.push({ type: "aureliaMetaAttribute", span: asSpan });
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
    const nameAttr = findMetaAttributeName(text, bindable.name.loc, "name");
    if (nameAttr) {
      tokens.push({ type: "aureliaMetaAttribute", span: nameAttr });
    }
    if (bindable.name.loc && bindable.name.loc.start < bindable.name.loc.end) {
      tokens.push({ type: "aureliaBindable", modifiers: ["declaration"], span: bindable.name.loc });
    }
    if (bindable.mode?.loc && bindable.mode.loc.start < bindable.mode.loc.end) {
      const modeAttr = findMetaAttributeName(text, bindable.mode.loc, "mode");
      if (modeAttr) {
        tokens.push({ type: "aureliaMetaAttribute", span: modeAttr });
      }
      tokens.push({ type: "keyword", span: bindable.mode.loc });
    }
    if (bindable.attribute?.loc && bindable.attribute.loc.start < bindable.attribute.loc.end) {
      const attributeAttr = findMetaAttributeName(text, bindable.attribute.loc, "attribute");
      if (attributeAttr) {
        tokens.push({ type: "aureliaMetaAttribute", span: attributeAttr });
      }
      tokens.push({ type: "aureliaAttribute", span: bindable.attribute.loc });
    }
  }

  if (meta.shadowDom?.tagLoc) {
    tokens.push({ type: "aureliaMetaElement", span: meta.shadowDom.tagLoc });
  }
  if (meta.shadowDom?.mode?.loc) {
    const modeAttr = findMetaAttributeName(text, meta.shadowDom.mode.loc, "mode");
    if (modeAttr) {
      tokens.push({ type: "aureliaMetaAttribute", span: modeAttr });
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
        const aliasAttr = findMetaAttributeName(text, name.loc, "name");
        if (aliasAttr) {
          tokens.push({ type: "aureliaMetaAttribute", span: aliasAttr });
        }
        tokens.push({ type: "variable", modifiers: ["declaration"], span: name.loc });
      }
    }
  }

  return tokens;
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

function tokenKey(token: WorkspaceToken): string {
  const mods = token.modifiers ? token.modifiers.join(",") : "";
  return `${token.type}:${token.span.start}:${token.span.end}:${mods}`;
}

function getAttributeNameInfo(
  text: string,
  loc: SourceSpan,
): { attrName: string; nameStart: number } | null {
  const attrText = text.slice(loc.start, loc.end);
  const eqPos = attrText.indexOf("=");
  const rawAttrName = eqPos !== -1 ? attrText.slice(0, eqPos) : attrText;
  const attrName = rawAttrName.trim();
  if (!attrName) return null;
  const whitespaceOffset = rawAttrName.indexOf(attrName);
  return { attrName, nameStart: loc.start + whitespaceOffset };
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

function findMetaAttributeName(
  text: string,
  valueLoc: SourceSpan,
  expectedName?: string,
): SourceSpan | null {
  if (valueLoc.start <= 0) return null;
  const eqPos = text.lastIndexOf("=", valueLoc.start);
  if (eqPos === -1) return null;
  let end = eqPos;
  while (end > 0 && /\s/.test(text[end - 1]!)) {
    end -= 1;
  }
  let start = end;
  while (start > 0 && /[A-Za-z0-9_.:-]/.test(text[start - 1]!)) {
    start -= 1;
  }
  if (start >= end) return null;
  const name = text.slice(start, end);
  if (expectedName && name.toLowerCase() !== expectedName.toLowerCase()) {
    return null;
  }
  return valueLoc.file ? { start, end, file: valueLoc.file } : { start, end };
}

function findNamedAliasAttributeSpan(text: string, exportLoc: SourceSpan): SourceSpan | null {
  const start = exportLoc.end;
  if (text.slice(start, start + 3) !== ".as") return null;
  return exportLoc.file ? { start, end: start + 3, file: exportLoc.file } : { start, end: start + 3 };
}
