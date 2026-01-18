import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import {
  analyzeAttributeName,
  canonicalDocumentUri,
  extractTemplateMeta,
  normalizePathForId,
  offsetAtPosition,
  spanContainsOffset,
  spanLength,
  toSourceFileId,
  type AttributeParser,
  type BindableDef,
  type DocumentUri,
  type LinkedInstruction,
  type LinkedRow,
  type ResourceDef,
  type ResourceScopeId,
  type SourceLocation,
  type SourceSpan,
  type TemplateCompilation,
  type TemplateMetaIR,
  type TemplateSyntaxRegistry,
} from "@aurelia-ls/compiler";
import type { InlineTemplateInfo, TemplateInfo } from "@aurelia-ls/resolution";
import type { ResourceDefinitionIndex } from "./definition.js";
import type {
  WorkspaceCodeAction,
  WorkspaceCodeActionRequest,
  WorkspaceDiagnostic,
  WorkspaceRenameRequest,
  WorkspaceTextEdit,
} from "./types.js";
import { inlineTemplatePath } from "./templates.js";

export interface TemplateIndex {
  readonly templates: readonly TemplateInfo[];
  readonly inlineTemplates: readonly InlineTemplateInfo[];
  readonly templateToComponent: ReadonlyMap<DocumentUri, string>;
  readonly templateToScope: ReadonlyMap<DocumentUri, ResourceScopeId>;
}

export type AttributeSyntaxContext = {
  syntax: TemplateSyntaxRegistry;
  parser: AttributeParser;
};

type ResourceDefinitionEntry = {
  def: ResourceDef;
  symbolId?: string;
};

type ResourceTarget = {
  kind: "element" | "attribute" | "value-converter" | "binding-behavior";
  name: string;
  file: string | null;
};

type BindableTarget = {
  ownerKind: "element" | "attribute";
  ownerName: string;
  ownerFile: string | null;
  ownerDef: ResourceDef;
  bindable: BindableDef;
  property: string;
};

type InstructionOwner =
  | { kind: "element"; name: string; file: string | null }
  | { kind: "attribute"; name: string; file: string | null; isTemplateController?: boolean }
  | { kind: "controller"; name: string };

export type InstructionHit = {
  instruction: LinkedInstruction;
  loc: SourceSpan;
  len: number;
  hostTag?: string;
  hostKind?: "custom" | "native" | "none";
  owner?: InstructionOwner | null;
};

type ExpressionAst = {
  $kind?: string;
  span?: SourceSpan;
  name?: string;
  ancestor?: number;
  expression?: ExpressionAst;
  object?: ExpressionAst;
  func?: ExpressionAst;
  args?: ExpressionAst[];
  left?: ExpressionAst;
  right?: ExpressionAst;
  condition?: ExpressionAst;
  yes?: ExpressionAst;
  no?: ExpressionAst;
  target?: ExpressionAst;
  value?: ExpressionAst;
  key?: ExpressionAst;
  parts?: ExpressionAst[];
  expressions?: ExpressionAst[];
  declaration?: ExpressionAst;
  iterable?: ExpressionAst;
};

type CodeActionContext = {
  request: WorkspaceCodeActionRequest;
  uri: DocumentUri;
  text: string;
  compilation: TemplateCompilation;
  diagnostics: readonly WorkspaceDiagnostic[];
  syntax: AttributeSyntaxContext;
  templateIndex: TemplateIndex;
  definitionIndex: ResourceDefinitionIndex;
  workspaceRoot: string;
  compilerOptions: ts.CompilerOptions;
  lookupText: (uri: DocumentUri) => string | null;
};

type BindableCandidate = {
  ownerKind: "element" | "attribute";
  ownerName: string;
  ownerFile: string | null;
  propertyName: string;
  attributeName: string | null;
};

type ImportCandidate = {
  kind: "element" | "attribute" | "controller" | "value-converter" | "binding-behavior";
  name: string;
};

type InsertContext = {
  offset: number;
  indent: string;
};

export interface TemplateEditEngineContext {
  readonly workspaceRoot: string;
  readonly templateIndex: TemplateIndex;
  readonly definitionIndex: ResourceDefinitionIndex;
  readonly compilerOptions: ts.CompilerOptions;
  readonly lookupText: (uri: DocumentUri) => string | null;
  readonly getCompilation: (uri: DocumentUri) => TemplateCompilation | null;
  readonly getAttributeSyntax: () => AttributeSyntaxContext;
}

export class TemplateEditEngine {
  constructor(private readonly ctx: TemplateEditEngineContext) {}

  renameAt(request: WorkspaceRenameRequest): WorkspaceTextEdit[] | null {
    const text = this.ctx.lookupText(request.uri);
    if (!text) return null;
    const offset = offsetAtPosition(text, request.position);
    if (offset == null) return null;
    const compilation = this.ctx.getCompilation(request.uri);
    if (!compilation) return null;

    const syntax = this.ctx.getAttributeSyntax();
    const preferRoots = [this.ctx.workspaceRoot];

    const elementEdits = this.#renameElementAt(compilation, text, offset, request.newName, preferRoots);
    if (elementEdits?.length) return finalizeWorkspaceEdits(elementEdits);

    const bindableEdits = this.#renameBindableAttributeAt(compilation, text, offset, request.newName, syntax, preferRoots);
    if (bindableEdits?.length) return finalizeWorkspaceEdits(bindableEdits);

    const converterEdits = this.#renameValueConverterAt(compilation, text, offset, request.newName, preferRoots);
    if (converterEdits?.length) return finalizeWorkspaceEdits(converterEdits);

    const behaviorEdits = this.#renameBindingBehaviorAt(compilation, text, offset, request.newName, preferRoots);
    if (behaviorEdits?.length) return finalizeWorkspaceEdits(behaviorEdits);

    return null;
  }

  codeActions(
    request: WorkspaceCodeActionRequest,
    diagnostics: readonly WorkspaceDiagnostic[],
  ): readonly WorkspaceCodeAction[] {
    const text = this.ctx.lookupText(request.uri);
    if (!text) return [];
    const compilation = this.ctx.getCompilation(request.uri);
    if (!compilation) return [];
    const targetSpan = resolveActionSpan(request, text);
    if (!targetSpan) return [];

    const syntax = this.ctx.getAttributeSyntax();
    return collectWorkspaceCodeActions({
      request,
      uri: request.uri,
      text,
      compilation,
      diagnostics,
      syntax,
      templateIndex: this.ctx.templateIndex,
      definitionIndex: this.ctx.definitionIndex,
      workspaceRoot: this.ctx.workspaceRoot,
      compilerOptions: this.ctx.compilerOptions,
      lookupText: this.ctx.lookupText,
    }, targetSpan);
  }

  #renameElementAt(
    compilation: TemplateCompilation,
    text: string,
    offset: number,
    newName: string,
    preferRoots: readonly string[],
  ): WorkspaceTextEdit[] | null {
    const node = compilation.query.nodeAt(offset);
    if (!node || node.kind !== "element") return null;
    const row = findLinkedRow(compilation.linked.templates, node.templateIndex, node.id);
    if (!row || row.node.kind !== "element") return null;
    const tagSpan = elementTagSpanAtOffset(text, node.span, row.node.tag, offset);
    if (!tagSpan) return null;
    const res = row.node.custom?.def ?? null;
    if (!res) return null;

    const target: ResourceTarget = { kind: "element", name: res.name, file: res.file ?? null };
    const edits: WorkspaceTextEdit[] = [];
    this.#collectElementTagEdits(target, newName, edits);

    const entry = findResourceEntry(this.ctx.definitionIndex.elements, target.name, target.file, preferRoots);
    const nameEdit = entry ? buildResourceNameEdit(entry.def, target.name, newName, this.ctx.lookupText) : null;
    if (nameEdit) edits.push(nameEdit);

    return edits.length ? edits : null;
  }

  #renameBindableAttributeAt(
    compilation: TemplateCompilation,
    text: string,
    offset: number,
    newName: string,
    syntax: AttributeSyntaxContext,
    preferRoots: readonly string[],
  ): WorkspaceTextEdit[] | null {
    const hits = findInstructionsAtOffset(compilation.linked.templates, offset);
    for (const hit of hits) {
      const nameSpan = attributeNameSpan(text, hit.loc);
      if (!nameSpan || !spanContainsOffset(nameSpan, offset)) continue;
      const attrName = text.slice(nameSpan.start, nameSpan.end);
      const target = resolveBindableTarget(hit.instruction, this.ctx.definitionIndex, preferRoots);
      if (!target) continue;

      const edits: WorkspaceTextEdit[] = [];
      this.#collectBindableAttributeEdits(target, newName, syntax, edits);

      const attrValue = target.bindable.attribute.value ?? target.property;
      const attrEdit = buildBindableAttributeEdit(target.bindable, attrValue, newName, this.ctx.lookupText);
      if (attrEdit) edits.push(attrEdit);

      if (!edits.length) return null;
      return edits;
    }
    return null;
  }

  #renameValueConverterAt(
    compilation: TemplateCompilation,
    text: string,
    offset: number,
    newName: string,
    preferRoots: readonly string[],
  ): WorkspaceTextEdit[] | null {
    const hit = findValueConverterAtOffset(compilation.exprTable ?? [], text, offset);
    if (!hit) return null;

    const edits: WorkspaceTextEdit[] = [];
    this.#collectConverterEdits(hit.name, newName, edits);

    const entry = findResourceEntry(this.ctx.definitionIndex.valueConverters, hit.name, null, preferRoots);
    const nameEdit = entry ? buildResourceNameEdit(entry.def, hit.name, newName, this.ctx.lookupText) : null;
    if (nameEdit) edits.push(nameEdit);

    return edits.length ? edits : null;
  }

  #renameBindingBehaviorAt(
    compilation: TemplateCompilation,
    text: string,
    offset: number,
    newName: string,
    preferRoots: readonly string[],
  ): WorkspaceTextEdit[] | null {
    const hit = findBindingBehaviorAtOffset(compilation.exprTable ?? [], text, offset);
    if (!hit) return null;

    const edits: WorkspaceTextEdit[] = [];
    this.#collectBehaviorEdits(hit.name, newName, edits);

    const entry = findResourceEntry(this.ctx.definitionIndex.bindingBehaviors, hit.name, null, preferRoots);
    const nameEdit = entry ? buildResourceNameEdit(entry.def, hit.name, newName, this.ctx.lookupText) : null;
    if (nameEdit) edits.push(nameEdit);

    return edits.length ? edits : null;
  }

  #collectElementTagEdits(target: ResourceTarget, newName: string, out: WorkspaceTextEdit[]): void {
    this.#forEachTemplateCompilation((uri, text, compilation) => {
      const spans = collectElementTagSpans(compilation, text, target);
      for (const span of spans) {
        out.push({ uri, span, newText: newName });
      }
    });
  }

  #collectBindableAttributeEdits(
    target: BindableTarget,
    newName: string,
    syntax: AttributeSyntaxContext,
    out: WorkspaceTextEdit[],
  ): void {
    this.#forEachTemplateCompilation((uri, text, compilation) => {
      const matches = collectBindableAttributeMatches(compilation, text, target);
      for (const match of matches) {
        const replacement = renameAttributeName(match.attrName, newName, syntax);
        out.push({ uri, span: match.span, newText: replacement });
      }
    });
  }

  #collectConverterEdits(name: string, newName: string, out: WorkspaceTextEdit[]): void {
    this.#forEachTemplateCompilation((uri, text, compilation) => {
      const spans = collectConverterSpans(compilation.exprTable ?? [], text, name);
      for (const span of spans) {
        out.push({ uri, span, newText: newName });
      }
    });
  }

  #collectBehaviorEdits(name: string, newName: string, out: WorkspaceTextEdit[]): void {
    this.#forEachTemplateCompilation((uri, text, compilation) => {
      const spans = collectBehaviorSpans(compilation.exprTable ?? [], text, name);
      for (const span of spans) {
        out.push({ uri, span, newText: newName });
      }
    });
  }

  #forEachTemplateCompilation(
    visit: (uri: DocumentUri, text: string, compilation: TemplateCompilation) => void,
  ): void {
    const visited = new Set<DocumentUri>();
    const iterate = (uri: DocumentUri) => {
      if (visited.has(uri)) return;
      visited.add(uri);
      const text = this.ctx.lookupText(uri);
      if (!text) return;
      const compilation = this.ctx.getCompilation(uri);
      if (!compilation) return;
      visit(uri, text, compilation);
    };

    for (const entry of this.ctx.templateIndex.templates) {
      const canonical = canonicalDocumentUri(entry.templatePath);
      iterate(canonical.uri);
    }

    for (const entry of this.ctx.templateIndex.inlineTemplates) {
      const inlinePath = inlineTemplatePath(entry.componentPath);
      const canonical = canonicalDocumentUri(inlinePath);
      iterate(canonical.uri);
    }
  }
}

function resolveActionSpan(request: WorkspaceCodeActionRequest, text: string): SourceSpan | null {
  if (request.range) return normalizeSpan(request.range);
  if (!request.position) return null;
  const offset = offsetAtPosition(text, request.position);
  if (offset == null) return null;
  return { start: offset, end: offset };
}

function normalizeSpan(span: SourceSpan): SourceSpan {
  const start = Math.min(span.start, span.end);
  const end = Math.max(span.start, span.end);
  return { start, end, ...(span.file ? { file: span.file } : {}) };
}

function collectWorkspaceCodeActions(ctx: CodeActionContext, targetSpan: SourceSpan): WorkspaceCodeAction[] {
  if (ctx.request.kinds && !ctx.request.kinds.some((kind) => kind === "quickfix" || kind.startsWith("quickfix."))) {
    return [];
  }
  const results: WorkspaceCodeAction[] = [];
  const seen = new Set<string>();
  for (const diagnostic of ctx.diagnostics) {
    if (!diagnostic.span || !spanIntersects(diagnostic.span, targetSpan)) continue;
    let action: WorkspaceCodeAction | null = null;
    switch (diagnostic.code) {
      case "aurelia/unknown-bindable":
        action = buildAddBindableAction(diagnostic, ctx);
        break;
      case "aurelia/unknown-element":
      case "aurelia/unknown-attribute":
      case "aurelia/unknown-controller":
      case "aurelia/unknown-converter":
      case "aurelia/unknown-behavior":
      case "aurelia/expr-symbol-not-found":
        action = buildAddImportAction(diagnostic, ctx, targetSpan);
        break;
      default:
        break;
    }
    if (!action || seen.has(action.id)) continue;
    seen.add(action.id);
    results.push(action);
  }
  return results;
}

function spanIntersects(a: SourceSpan, b: SourceSpan): boolean {
  const aStart = Math.min(a.start, a.end);
  const aEnd = Math.max(a.start, a.end);
  const bStart = Math.min(b.start, b.end);
  const bEnd = Math.max(b.start, b.end);
  if (aStart === aEnd) return bStart <= aStart && aStart <= bEnd;
  if (bStart === bEnd) return aStart <= bStart && bStart <= aEnd;
  return aStart < bEnd && bStart < aEnd;
}

export function resolveBindableCandidate(
  hit: InstructionHit,
  text: string,
  syntax: AttributeSyntaxContext,
  definitionIndex?: ResourceDefinitionIndex | null,
  preferRoots: readonly string[] = [],
): BindableCandidate | null {
  const attrName = attributeNameFromHit(text, hit);
  const base = attributeTargetName(attrName, syntax);
  if (!base) return null;
  const propertyName = dashToCamel(base);
  const attributeName = base !== propertyName ? base : null;

  if (hit.owner && (hit.owner.kind === "element" || hit.owner.kind === "attribute")) {
    return {
      ownerKind: hit.owner.kind,
      ownerName: hit.owner.name,
      ownerFile: hit.owner.file,
      propertyName,
      attributeName,
    };
  }

  if (hit.hostKind === "custom" && hit.hostTag) {
    const entry = definitionIndex
      ? findResourceEntry(definitionIndex.elements, hit.hostTag.toLowerCase(), null, preferRoots)
      : null;
    return {
      ownerKind: "element",
      ownerName: hit.hostTag,
      ownerFile: entry?.def.file ?? null,
      propertyName,
      attributeName,
    };
  }

  return null;
}

export function attributeNameFromHit(text: string, hit: InstructionHit): string | null {
  const span = attributeNameSpan(text, hit.loc);
  if (!span) return null;
  return text.slice(span.start, span.end);
}

export function attributeTargetName(attrName: string | null, syntax: AttributeSyntaxContext): string | null {
  if (!attrName) return null;
  const analysis = analyzeAttributeName(attrName, syntax.syntax, syntax.parser);
  if (analysis.targetSpan) {
    return attrName.slice(analysis.targetSpan.start, analysis.targetSpan.end);
  }
  const target = analysis.syntax.target?.trim();
  if (target && attrName.includes(target)) return target;
  if (analysis.syntax.command) return null;
  return attrName;
}

export function attributeCommandName(attrName: string | null, syntax: AttributeSyntaxContext): string | null {
  if (!attrName) return null;
  const analysis = analyzeAttributeName(attrName, syntax.syntax, syntax.parser);
  if (analysis.commandSpan?.kind === "text") {
    return attrName.slice(analysis.commandSpan.start, analysis.commandSpan.end);
  }
  return null;
}

function resolveImportCandidate(
  diagnostic: WorkspaceDiagnostic,
  ctx: CodeActionContext,
  targetSpan: SourceSpan,
): ImportCandidate | null {
  const data = diagnostic.data as Record<string, unknown> | undefined;
  const dataKind = typeof data?.resourceKind === "string" ? data.resourceKind : null;
  const dataName = typeof data?.name === "string" ? data.name : null;
  if (dataKind && dataName) {
    return { kind: dataKind as ImportCandidate["kind"], name: dataName };
  }

  const offset = Number.isFinite(targetSpan.start) ? targetSpan.start : diagnostic.span?.start ?? null;
  if (offset == null) return null;

  switch (diagnostic.code) {
    case "aurelia/unknown-element": {
      const name = findElementNameAtOffset(ctx.compilation, offset);
      return name ? { kind: "element", name } : null;
    }
    case "aurelia/unknown-attribute": {
      const hit = findInstructionHit(ctx.compilation, offset);
      const attrName = hit ? attributeNameFromHit(ctx.text, hit) : null;
      const base = attributeTargetName(attrName, ctx.syntax);
      return base ? { kind: "attribute", name: base } : null;
    }
    case "aurelia/unknown-controller": {
      const name = findControllerNameAtOffset(ctx.compilation, ctx.text, offset, ctx.syntax);
      return name ? { kind: "controller", name } : null;
    }
    case "aurelia/unknown-converter": {
      const hit = findValueConverterAtOffset(ctx.compilation.exprTable ?? [], ctx.text, offset);
      return hit ? { kind: "value-converter", name: hit.name } : null;
    }
    case "aurelia/unknown-behavior": {
      const hit = findBindingBehaviorAtOffset(ctx.compilation.exprTable ?? [], ctx.text, offset);
      return hit ? { kind: "binding-behavior", name: hit.name } : null;
    }
    case "aurelia/expr-symbol-not-found": {
      const symbolKind = typeof data?.symbolKind === "string" ? data.symbolKind : null;
      if (symbolKind === "binding-behavior") {
        const hit = findBindingBehaviorAtOffset(ctx.compilation.exprTable ?? [], ctx.text, offset);
        return hit ? { kind: "binding-behavior", name: hit.name } : null;
      }
      if (symbolKind === "value-converter") {
        const hit = findValueConverterAtOffset(ctx.compilation.exprTable ?? [], ctx.text, offset);
        return hit ? { kind: "value-converter", name: hit.name } : null;
      }
      const converter = findValueConverterAtOffset(ctx.compilation.exprTable ?? [], ctx.text, offset);
      if (converter) return { kind: "value-converter", name: converter.name };
      const behavior = findBindingBehaviorAtOffset(ctx.compilation.exprTable ?? [], ctx.text, offset);
      return behavior ? { kind: "binding-behavior", name: behavior.name } : null;
    }
    default:
      return null;
  }
}

function buildAddImportAction(
  diagnostic: WorkspaceDiagnostic,
  ctx: CodeActionContext,
  targetSpan: SourceSpan,
): WorkspaceCodeAction | null {
  const candidate = resolveImportCandidate(diagnostic, ctx, targetSpan);
  if (!candidate) return null;

  const map = resourceMapForKind(ctx.definitionIndex, candidate.kind);
  const entry = findResourceEntry(map, candidate.name.toLowerCase(), null, [ctx.workspaceRoot]);
  if (!entry?.def.file) return null;

  const containingFile = ctx.templateIndex.templateToComponent.get(ctx.uri) ?? canonicalDocumentUri(ctx.uri).path;
  const targetFile = resolveFilePath(entry.def.file, ctx.workspaceRoot);
  const specifier = moduleSpecifierFromFile(targetFile, containingFile);
  if (!specifier) return null;

  const templatePath = canonicalDocumentUri(ctx.uri).path;
  const meta = extractTemplateMeta(ctx.text, templatePath);
  if (hasImportForFile(meta, targetFile, containingFile, ctx.compilerOptions)) return null;

  const insertion = computeImportInsertion(ctx.text, meta);
  const line = `${insertion.indent}<import from="${specifier}"></import>`;
  const edit = buildInsertionEdit(ctx.uri, ctx.text, insertion.offset, line);
  const name = candidate.name;
  const id = `aurelia/add-import:${candidate.kind}:${name}`;
  return {
    id,
    title: `Add <import> for '${name}'`,
    kind: "quickfix",
    edit: { edits: finalizeWorkspaceEdits([edit]) },
  };
}

function buildAddBindableAction(
  diagnostic: WorkspaceDiagnostic,
  ctx: CodeActionContext,
): WorkspaceCodeAction | null {
  const offset = diagnostic.span?.start ?? null;
  if (offset == null) return null;
  const hit = findInstructionHit(ctx.compilation, offset);
  if (!hit) return null;

  const candidate = resolveBindableCandidate(hit, ctx.text, ctx.syntax, ctx.definitionIndex, [ctx.workspaceRoot]);
  if (!candidate || candidate.ownerKind !== "element" || !candidate.ownerFile) return null;

  const target = resolveExternalTemplateForComponent(candidate.ownerFile, ctx.templateIndex);
  if (!target) return null;
  const templateText = ctx.lookupText(target.uri);
  if (!templateText) return null;

  const meta = extractTemplateMeta(templateText, target.path);
  const insertion = computeBindableInsertion(templateText, meta);
  const attributePart = candidate.attributeName ? ` attribute="${candidate.attributeName}"` : "";
  const line = `${insertion.indent}<bindable name="${candidate.propertyName}"${attributePart}></bindable>`;
  const edit = buildInsertionEdit(target.uri, templateText, insertion.offset, line);

  const id = `aurelia/add-bindable:${candidate.ownerName}:${candidate.propertyName}`;
  return {
    id,
    title: `Add <bindable> '${candidate.propertyName}' to ${candidate.ownerName}`,
    kind: "quickfix",
    edit: { edits: finalizeWorkspaceEdits([edit]) },
  };
}

function buildInsertionEdit(uri: DocumentUri, text: string, offset: number, line: string): WorkspaceTextEdit {
  const canonical = canonicalDocumentUri(uri);
  const newText = buildLineInsertion(text, offset, line);
  const span: SourceSpan = { start: offset, end: offset, file: canonical.file };
  return { uri: canonical.uri, span, newText };
}

function buildLineInsertion(text: string, offset: number, line: string): string {
  const newline = detectNewline(text);
  const before = offset > 0 ? text[offset - 1] : "";
  const after = offset < text.length ? text[offset] : "";
  const needsLeading = offset > 0 && before !== "\n" && before !== "\r";
  const needsTrailing = offset < text.length && after !== "\n" && after !== "\r";
  return `${needsLeading ? newline : ""}${line}${needsTrailing ? newline : ""}`;
}

function computeImportInsertion(text: string, meta: TemplateMetaIR): InsertContext {
  const lastImport = pickLastByEnd(meta.imports);
  if (lastImport) {
    return { offset: lastImport.elementLoc.end, indent: lineIndentAt(text, lastImport.elementLoc.start) };
  }
  const firstBindable = pickFirstByStart(meta.bindables);
  if (firstBindable) {
    return { offset: firstBindable.elementLoc.start, indent: lineIndentAt(text, firstBindable.elementLoc.start) };
  }
  return findTemplateRootInsert(text) ?? { offset: 0, indent: "" };
}

function computeBindableInsertion(text: string, meta: TemplateMetaIR): InsertContext {
  const lastBindable = pickLastByEnd(meta.bindables);
  if (lastBindable) {
    return { offset: lastBindable.elementLoc.end, indent: lineIndentAt(text, lastBindable.elementLoc.start) };
  }
  const lastImport = pickLastByEnd(meta.imports);
  if (lastImport) {
    return { offset: lastImport.elementLoc.end, indent: lineIndentAt(text, lastImport.elementLoc.start) };
  }
  return findTemplateRootInsert(text) ?? { offset: 0, indent: "" };
}

function pickLastByEnd<T extends { elementLoc: SourceSpan }>(items: readonly T[]): T | null {
  let best: T | null = null;
  for (const item of items) {
    if (!best || item.elementLoc.end > best.elementLoc.end) {
      best = item;
    }
  }
  return best;
}

function pickFirstByStart<T extends { elementLoc: SourceSpan }>(items: readonly T[]): T | null {
  let best: T | null = null;
  for (const item of items) {
    if (!best || item.elementLoc.start < best.elementLoc.start) {
      best = item;
    }
  }
  return best;
}

function findTemplateRootInsert(text: string): InsertContext | null {
  const match = text.match(/^[\s\r\n]*<template\b[^>]*>/i);
  if (!match) return null;
  const offset = match[0].length;
  const tagStart = match[0].search(/<template\b/i);
  const openIndent = lineIndentAt(text, Math.max(0, tagStart));
  const after = text.slice(offset);
  const childIndentMatch = after.match(/\r?\n([ \t]*)\S/);
  const childIndent = childIndentMatch?.[1] ?? `${openIndent}${detectIndentUnit(text)}`;
  return { offset, indent: childIndent };
}

function lineIndentAt(text: string, offset: number): string {
  const lineStart = Math.max(0, text.lastIndexOf("\n", offset - 1) + 1);
  const line = text.slice(lineStart, offset);
  return line.match(/^[ \t]*/)?.[0] ?? "";
}

function detectIndentUnit(text: string): string {
  const lines = text.split(/\r?\n/);
  let minSpaces = Number.POSITIVE_INFINITY;
  for (const line of lines) {
    const tabMatch = line.match(/^\t+\S/);
    if (tabMatch) return "\t";
    const spaceMatch = line.match(/^( +)\S/);
    const spaces = spaceMatch?.[1];
    if (spaces) {
      minSpaces = Math.min(minSpaces, spaces.length);
    }
  }
  if (minSpaces !== Number.POSITIVE_INFINITY) {
    return " ".repeat(minSpaces);
  }
  return "  ";
}

function detectNewline(text: string): string {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

function moduleSpecifierFromFile(targetFile: string, containingFile: string): string | null {
  if (!targetFile || !containingFile) return null;
  const fromDir = path.dirname(containingFile);
  let relative = path.relative(fromDir, targetFile);
  if (!relative) return null;
  relative = normalizePathSlashes(relative);
  relative = stripKnownExtension(relative);
  if (!relative.startsWith(".")) {
    relative = `./${relative}`;
  }
  return relative;
}

function stripKnownExtension(filePath: string): string {
  const lower = filePath.toLowerCase();
  const extensions = [
    ".d.mts",
    ".d.cts",
    ".d.ts",
    ".inline.html",
    ".html",
    ".mts",
    ".cts",
    ".mjs",
    ".cjs",
    ".tsx",
    ".jsx",
    ".ts",
    ".js",
  ];
  for (const ext of extensions) {
    if (lower.endsWith(ext)) {
      return filePath.slice(0, -ext.length);
    }
  }
  return filePath;
}

function normalizePathSlashes(filePath: string): string {
  return filePath.split("\\").join("/");
}

function resolveFilePath(filePath: string, workspaceRoot: string): string {
  return path.isAbsolute(filePath) ? filePath : path.resolve(workspaceRoot, filePath);
}

function resolveExternalTemplateForComponent(
  componentFile: string,
  templateIndex: TemplateIndex,
): { uri: DocumentUri; path: string } | null {
  const normalized = normalizePathForId(componentFile);
  for (const entry of templateIndex.templates) {
    if (normalizePathForId(entry.componentPath) === normalized) {
      return { uri: canonicalDocumentUri(entry.templatePath).uri, path: entry.templatePath };
    }
  }
  return null;
}

function resourceMapForKind(
  index: ResourceDefinitionIndex,
  kind: ImportCandidate["kind"],
): ReadonlyMap<string, ResourceDefinitionEntry[]> {
  switch (kind) {
    case "element":
      return index.elements;
    case "attribute":
      return index.attributes;
    case "controller":
      return index.controllers;
    case "value-converter":
      return index.valueConverters;
    case "binding-behavior":
      return index.bindingBehaviors;
  }
}

function hasImportForFile(
  meta: TemplateMetaIR,
  targetFile: string,
  containingFile: string,
  compilerOptions: ts.CompilerOptions,
): boolean {
  const targetNormalized = normalizePathForId(targetFile);
  for (const imp of meta.imports) {
    const resolved = resolveModuleSpecifier(imp.from.value, containingFile, compilerOptions);
    if (!resolved) continue;
    if (normalizePathForId(resolved) === targetNormalized) return true;
  }
  return false;
}

export function findInstructionHit(compilation: TemplateCompilation, offset: number): InstructionHit | null {
  const hits = findInstructionsAtOffset(compilation.linked.templates, offset);
  return hits[0] ?? null;
}

export function findElementNameAtOffset(
  compilation: TemplateCompilation,
  offset: number,
): string | null {
  const node = compilation.query.nodeAt(offset);
  if (!node || node.kind !== "element") return null;
  const row = findLinkedRow(compilation.linked.templates, node.templateIndex, node.id);
  if (!row || row.node.kind !== "element") return null;
  return row.node.tag;
}

export function findControllerNameAtOffset(
  compilation: TemplateCompilation,
  text: string,
  offset: number,
  syntax: AttributeSyntaxContext,
): string | null {
  const controller = compilation.query.controllerAt(offset);
  if (controller?.kind) return controller.kind;
  const hit = findInstructionHit(compilation, offset);
  const attrName = hit ? attributeNameFromHit(text, hit) : null;
  const base = attributeTargetName(attrName, syntax);
  return base ?? null;
}

function findInstructionsAtOffset(
  templates: readonly { rows: readonly LinkedRow[] }[],
  offset: number,
): InstructionHit[] {
  const hits: InstructionHit[] = [];
  const addHit = (
    instruction: LinkedInstruction,
    host: { hostTag?: string; hostKind?: "custom" | "native" | "none" },
    owner?: InstructionOwner | null,
  ) => {
    const loc = instruction.loc ?? null;
    if (!loc) return;
    if (!spanContainsOffset(loc, offset)) return;
    hits.push({
      instruction,
      loc,
      len: spanLength(loc),
      hostTag: host.hostTag,
      hostKind: host.hostKind,
      ...(owner ? { owner } : {}),
    });
  };

  for (const template of templates) {
    for (const row of template.rows ?? []) {
      const host: { hostTag?: string; hostKind?: "custom" | "native" | "none" } =
        row.node.kind === "element"
          ? {
            hostTag: row.node.tag,
            hostKind: row.node.custom ? "custom" : row.node.native ? "native" : "none",
          }
          : {};
      const elementOwner: InstructionOwner | null = row.node.kind === "element" && row.node.custom?.def
        ? { kind: "element", name: row.node.custom.def.name, file: row.node.custom.def.file ?? null }
        : null;
      for (const instruction of row.instructions ?? []) {
        addHit(instruction, host, elementOwner);
        if (
          instruction.kind === "hydrateElement"
          || instruction.kind === "hydrateAttribute"
          || instruction.kind === "hydrateTemplateController"
        ) {
          const owner: InstructionOwner | null =
            instruction.kind === "hydrateElement"
              ? instruction.res?.def
                ? { kind: "element", name: instruction.res.def.name, file: instruction.res.def.file ?? null }
                : elementOwner
              : instruction.kind === "hydrateAttribute"
                ? instruction.res?.def
                  ? {
                    kind: "attribute",
                    name: instruction.res.def.name,
                    file: instruction.res.def.file ?? null,
                    isTemplateController: instruction.res.def.isTemplateController,
                  }
                  : null
                : instruction.kind === "hydrateTemplateController"
                  ? { kind: "controller", name: instruction.res }
                  : null;
          for (const prop of instruction.props ?? []) {
            addHit(prop, host, owner);
          }
        }
      }
    }
  }

  hits.sort((a, b) => a.len - b.len);
  return hits;
}

function resolveBindableTarget(
  instruction: LinkedInstruction,
  resources: ResourceDefinitionIndex,
  preferRoots: readonly string[],
): BindableTarget | null {
  if (instruction.kind !== "propertyBinding" && instruction.kind !== "attributeBinding" && instruction.kind !== "setProperty") {
    return null;
  }
  const target = instruction.target as { kind?: string } | null | undefined;
  if (!target || typeof target !== "object" || !("kind" in target)) return null;

  switch (target.kind) {
    case "element.bindable": {
      const t = target as { element: { def: { name: string; file?: string } } };
      const entry = findResourceEntry(resources.elements, t.element.def.name, t.element.def.file ?? null, preferRoots);
      if (!entry) return null;
      const bindable = findBindableDef(entry.def, instruction.to);
      if (!bindable) return null;
      return {
        ownerKind: "element",
        ownerName: t.element.def.name,
        ownerFile: t.element.def.file ?? null,
        ownerDef: entry.def,
        bindable,
        property: instruction.to,
      };
    }
    case "attribute.bindable": {
      const t = target as { attribute: { def: { name: string; file?: string; isTemplateController?: boolean } } };
      const map = t.attribute.def.isTemplateController ? resources.controllers : resources.attributes;
      const entry = findResourceEntry(map, t.attribute.def.name, t.attribute.def.file ?? null, preferRoots);
      if (!entry) return null;
      const bindable = findBindableDef(entry.def, instruction.to);
      if (!bindable) return null;
      return {
        ownerKind: "attribute",
        ownerName: t.attribute.def.name,
        ownerFile: t.attribute.def.file ?? null,
        ownerDef: entry.def,
        bindable,
        property: instruction.to,
      };
    }
    default:
      return null;
  }
}

function collectBindableAttributeMatches(
  compilation: TemplateCompilation,
  text: string,
  target: BindableTarget,
): Array<{ span: SourceSpan; attrName: string }> {
  const results: Array<{ span: SourceSpan; attrName: string }> = [];
  for (const template of compilation.linked.templates ?? []) {
    for (const row of template.rows ?? []) {
      for (const instruction of row.instructions ?? []) {
        collectBindableInstructionMatches(instruction, target, text, results);
        if (
          instruction.kind === "hydrateElement"
          || instruction.kind === "hydrateAttribute"
          || instruction.kind === "hydrateTemplateController"
        ) {
          for (const prop of instruction.props ?? []) {
            collectBindableInstructionMatches(prop, target, text, results);
          }
        }
      }
    }
  }
  return results;
}

function collectBindableInstructionMatches(
  instruction: LinkedInstruction,
  target: BindableTarget,
  text: string,
  results: Array<{ span: SourceSpan; attrName: string }>,
): void {
  if (instruction.kind !== "propertyBinding" && instruction.kind !== "attributeBinding" && instruction.kind !== "setProperty") {
    return;
  }
  const loc = instruction.loc ?? null;
  if (!loc) return;

  const targetInfo = instruction.target as { kind?: string } | null | undefined;
  if (!targetInfo || typeof targetInfo !== "object" || !("kind" in targetInfo)) return;

  if (target.ownerKind === "element" && targetInfo.kind === "element.bindable") {
    const t = targetInfo as { element: { def: { name: string; file?: string } } };
    if (!resourceRefMatches(t.element.def, target.ownerName, target.ownerFile)) return;
  } else if (target.ownerKind === "attribute" && targetInfo.kind === "attribute.bindable") {
    const t = targetInfo as { attribute: { def: { name: string; file?: string } } };
    if (!resourceRefMatches(t.attribute.def, target.ownerName, target.ownerFile)) return;
  } else {
    return;
  }

  if (instruction.to !== target.property) return;
  const nameSpan = attributeNameSpan(text, loc);
  if (!nameSpan) return;
  const attrName = text.slice(nameSpan.start, nameSpan.end);
  results.push({ span: nameSpan, attrName });
}

function renameAttributeName(attrName: string, newBase: string, syntax: AttributeSyntaxContext): string {
  if (!attrName) return newBase;
  const analysis = analyzeAttributeName(attrName, syntax.syntax, syntax.parser);
  const targetSpan = analysis.targetSpan ?? (analysis.syntax.command ? null : { start: 0, end: attrName.length });
  if (!targetSpan) return newBase;
  return `${attrName.slice(0, targetSpan.start)}${newBase}${attrName.slice(targetSpan.end)}`;
}

function collectElementTagSpans(
  compilation: TemplateCompilation,
  text: string,
  target: ResourceTarget,
): SourceSpan[] {
  const results: SourceSpan[] = [];
  const irTemplates = (compilation.ir as { templates?: Array<{ dom: { id: string; kind: string; tag?: string; loc?: SourceSpan | null; children?: unknown[] } }> } | null)?.templates ?? [];
  const linkedTemplates = compilation.linked.templates ?? [];

  for (let i = 0; i < irTemplates.length; i += 1) {
    const irTemplate = irTemplates[i];
    const linked = linkedTemplates[i];
    if (!irTemplate || !linked) continue;
    const rowsByTarget = new Map<string, LinkedRow>();
    for (const row of linked.rows ?? []) {
      rowsByTarget.set(row.target, row);
    }

    const stack: Array<{ id: string; kind: string; tag?: string; loc?: SourceSpan | null; children?: unknown[] }> = [irTemplate.dom];
    while (stack.length) {
      const node = stack.pop();
      if (!node) continue;
      if (node.kind === "element") {
        const row = rowsByTarget.get(node.id);
        if (row?.node.kind === "element" && row.node.custom?.def && node.loc) {
          if (resourceRefMatches(row.node.custom.def, target.name, target.file)) {
            results.push(...elementTagNameSpans(text, node.loc, row.node.tag));
          }
        }
      }
      if (node.kind === "element" || node.kind === "template") {
        const children = node.children as Array<{ id: string; kind: string; tag?: string; loc?: SourceSpan | null; children?: unknown[] }> | undefined;
        if (children?.length) {
          for (let c = children.length - 1; c >= 0; c -= 1) {
            stack.push(children[c]!);
          }
        }
      }
    }
  }

  return results;
}

function collectConverterSpans(
  exprTable: readonly { id: string; ast: unknown }[],
  text: string,
  name: string,
): SourceSpan[] {
  const spans: SourceSpan[] = [];
  for (const entry of exprTable) {
    collectConverterNodes(entry.ast as ExpressionAst, text, name, spans);
  }
  return spans;
}

function collectConverterNodes(
  node: ExpressionAst | null | undefined,
  text: string,
  name: string,
  spans: SourceSpan[],
): void {
  if (!node || !node.$kind) return;
  if (node.$kind === "ValueConverter" && node.name === name && node.span) {
    const start = findPipeOrAmpName(text, node.span, "|", name);
    if (start !== -1) {
      spans.push({ start, end: start + name.length, ...(node.span.file ? { file: node.span.file } : {}) });
    }
  }
  walkAstChildren(node, text, name, spans, collectConverterNodes);
}

function collectBehaviorSpans(
  exprTable: readonly { id: string; ast: unknown }[],
  text: string,
  name: string,
): SourceSpan[] {
  const spans: SourceSpan[] = [];
  for (const entry of exprTable) {
    collectBehaviorNodes(entry.ast as ExpressionAst, text, name, spans);
  }
  return spans;
}

function collectBehaviorNodes(
  node: ExpressionAst | null | undefined,
  text: string,
  name: string,
  spans: SourceSpan[],
): void {
  if (!node || !node.$kind) return;
  if (node.$kind === "BindingBehavior" && node.name === name && node.span) {
    const start = findPipeOrAmpName(text, node.span, "&", name);
    if (start !== -1) {
      spans.push({ start, end: start + name.length, ...(node.span.file ? { file: node.span.file } : {}) });
    }
  }
  walkAstChildren(node, text, name, spans, collectBehaviorNodes);
}

function walkAstChildren(
  node: ExpressionAst,
  text: string,
  name: string,
  spans: SourceSpan[],
  visitor: (node: ExpressionAst | null | undefined, text: string, name: string, spans: SourceSpan[]) => void,
): void {
  const queue: (ExpressionAst | null | undefined)[] = [];
  queue.push(node.expression, node.object, node.func, node.left, node.right, node.condition, node.yes, node.no, node.target, node.value, node.key, node.declaration, node.iterable);
  if (node.args) queue.push(...node.args);
  if (node.parts) queue.push(...node.parts);
  if (node.expressions) queue.push(...node.expressions);
  for (const child of queue) {
    if (!child) continue;
    visitor(child, text, name, spans);
  }
}

export function findValueConverterAtOffset(
  exprTable: readonly { id: string; ast: unknown }[],
  text: string,
  offset: number,
): { name: string; exprId: string } | null {
  for (const entry of exprTable) {
    const hit = findConverterInAst(entry.ast as ExpressionAst, text, offset);
    if (hit) return { name: hit, exprId: entry.id };
  }
  return null;
}

export function findBindingBehaviorAtOffset(
  exprTable: readonly { id: string; ast: unknown }[],
  text: string,
  offset: number,
): { name: string; exprId: string } | null {
  for (const entry of exprTable) {
    const hit = findBehaviorInAst(entry.ast as ExpressionAst, text, offset);
    if (hit) return { name: hit, exprId: entry.id };
  }
  return null;
}

function findConverterInAst(node: ExpressionAst | null | undefined, text: string, offset: number): string | null {
  if (!node || !node.$kind) return null;
  if (node.$kind === "ValueConverter" && node.name && node.span) {
    const start = findPipeOrAmpName(text, node.span, "|", node.name);
    if (start !== -1 && offset >= start && offset < start + node.name.length) {
      return node.name;
    }
  }
  return walkAstChildrenForHit(node, text, offset, findConverterInAst);
}

function findBehaviorInAst(node: ExpressionAst | null | undefined, text: string, offset: number): string | null {
  if (!node || !node.$kind) return null;
  if (node.$kind === "BindingBehavior" && node.name && node.span) {
    const start = findPipeOrAmpName(text, node.span, "&", node.name);
    if (start !== -1 && offset >= start && offset < start + node.name.length) {
      return node.name;
    }
  }
  return walkAstChildrenForHit(node, text, offset, findBehaviorInAst);
}

function walkAstChildrenForHit(
  node: ExpressionAst,
  text: string,
  offset: number,
  finder: (node: ExpressionAst, text: string, offset: number) => string | null,
): string | null {
  const queue: (ExpressionAst | null | undefined)[] = [];
  queue.push(node.expression, node.object, node.func, node.left, node.right, node.condition, node.yes, node.no, node.target, node.value, node.key, node.declaration, node.iterable);
  if (node.args) queue.push(...node.args);
  if (node.parts) queue.push(...node.parts);
  if (node.expressions) queue.push(...node.expressions);
  for (const child of queue) {
    if (!child) continue;
    const hit = finder(child, text, offset);
    if (hit) return hit;
  }
  return null;
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

function resourceRefMatches(
  def: { name: string; file?: string | null },
  name: string,
  file: string | null,
): boolean {
  if (def.name !== name) return false;
  if (file && def.file) {
    return normalizePathForId(def.file) === normalizePathForId(file);
  }
  return true;
}

function findBindableDef(def: ResourceDef, name: string): BindableDef | null {
  if (!("bindables" in def) || !def.bindables) return null;
  const record = def.bindables as Readonly<Record<string, BindableDef>>;
  if (record[name]) return record[name]!;
  const camel = dashToCamel(name);
  return record[camel] ?? null;
}

function dashToCamel(value: string): string {
  if (!value.includes("-")) return value;
  return value.replace(/-([a-zA-Z0-9])/g, (_match, captured) => captured.toUpperCase());
}

function readLocation(value: unknown): SourceLocation | null {
  if (!value || typeof value !== "object") return null;
  if ("location" in value) {
    const loc = (value as { location?: SourceLocation }).location;
    return loc ?? null;
  }
  return null;
}

function findLinkedRow(
  templates: readonly { rows: readonly LinkedRow[] }[],
  templateIndex: number,
  nodeId: string,
): LinkedRow | null {
  const template = templates[templateIndex];
  if (!template) return null;
  return template.rows.find((row) => row.target === nodeId) ?? null;
}

function elementTagSpanAtOffset(
  text: string,
  span: SourceSpan | undefined,
  tag: string,
  offset: number,
): SourceSpan | null {
  if (!span) return null;
  const openStart = span.start + 1;
  const openEnd = openStart + tag.length;
  if (offset >= openStart && offset < openEnd) {
    return { start: openStart, end: openEnd, ...(span.file ? { file: span.file } : {}) };
  }
  const closePattern = `</${tag}>`;
  const closeTagStart = text.lastIndexOf(closePattern, span.end);
  if (closeTagStart !== -1 && closeTagStart > span.start) {
    const closeNameStart = closeTagStart + 2;
    const closeNameEnd = closeNameStart + tag.length;
    if (offset >= closeNameStart && offset < closeNameEnd) {
      return { start: closeNameStart, end: closeNameEnd, ...(span.file ? { file: span.file } : {}) };
    }
  }
  return null;
}

function elementTagNameSpans(text: string, span: SourceSpan, tag: string): SourceSpan[] {
  const spans: SourceSpan[] = [];
  const openStart = span.start + 1;
  spans.push({ start: openStart, end: openStart + tag.length, ...(span.file ? { file: span.file } : {}) });

  const closePattern = `</${tag}>`;
  const closeTagStart = text.lastIndexOf(closePattern, span.end);
  if (closeTagStart !== -1 && closeTagStart > span.start) {
    const closeNameStart = closeTagStart + 2;
    const closeNameEnd = closeNameStart + tag.length;
    spans.push({ start: closeNameStart, end: closeNameEnd, ...(span.file ? { file: span.file } : {}) });
  }

  return spans;
}

function attributeNameSpan(text: string, loc: SourceSpan): SourceSpan | null {
  const raw = text.slice(loc.start, loc.end);
  const eq = raw.indexOf("=");
  const namePart = (eq === -1 ? raw : raw.slice(0, eq)).trim();
  if (!namePart) return null;
  const nameOffset = raw.indexOf(namePart);
  if (nameOffset < 0) return null;
  const start = loc.start + nameOffset;
  const end = start + namePart.length;
  return { start, end, ...(loc.file ? { file: loc.file } : {}) };
}

export function resolveModuleSpecifier(
  specifier: string,
  containingFile: string,
  compilerOptions: ts.CompilerOptions,
): string | null {
  const result = ts.resolveModuleName(
    specifier,
    containingFile,
    compilerOptions,
    ts.sys,
  );
  if (result.resolvedModule?.resolvedFileName) {
    return result.resolvedModule.resolvedFileName;
  }
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const fromDir = path.dirname(containingFile);
    const htmlPath = path.resolve(fromDir, `${specifier}.html`);
    if (fs.existsSync(htmlPath)) {
      return htmlPath;
    }
  }
  return null;
}

function finalizeWorkspaceEdits(edits: WorkspaceTextEdit[]): WorkspaceTextEdit[] {
  const seen = new Set<string>();
  const results: WorkspaceTextEdit[] = [];
  for (const edit of edits) {
    const key = `${edit.uri}:${edit.span.start}:${edit.span.end}:${edit.newText}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(edit);
  }
  results.sort((a, b) => {
    const uriDelta = String(a.uri).localeCompare(String(b.uri));
    if (uriDelta !== 0) return uriDelta;
    return b.span.start - a.span.start;
  });
  return results;
}

function findResourceEntry(
  map: ReadonlyMap<string, ResourceDefinitionEntry[]>,
  name: string,
  file: string | null,
  preferRoots: readonly string[],
): ResourceDefinitionEntry | null {
  const entries = map.get(name);
  if (!entries?.length) return null;

  if (file) {
    const normalized = normalizePathForId(file);
    const exact = entries.find((entry) => entry.def.file && normalizePathForId(entry.def.file) === normalized);
    if (exact) return exact;
  }

  if (preferRoots.length) {
    const roots = preferRoots.map((root) => normalizePathForId(root));
    const matches = entries.filter((entry) => {
      if (!entry.def.file) return false;
      const defPath = normalizePathForId(entry.def.file);
      return roots.some((root) => defPath.startsWith(root));
    });
    if (matches.length === 1) return matches[0]!;
    if (matches.length > 1) return matches[0]!;
  }

  return entries[0] ?? null;
}

function buildResourceNameEdit(
  def: ResourceDef,
  oldName: string,
  newName: string,
  lookupText: (uri: DocumentUri) => string | null,
): WorkspaceTextEdit | null {
  const loc = readLocation(def.name);
  if (!loc) return null;
  return buildLocationEdit(loc, newName, lookupText, oldName);
}

function buildBindableAttributeEdit(
  bindable: BindableDef,
  oldName: string,
  newName: string,
  lookupText: (uri: DocumentUri) => string | null,
): WorkspaceTextEdit | null {
  const loc = readLocation(bindable.attribute);
  if (!loc) return null;
  return buildLocationEdit(loc, newName, lookupText, oldName);
}

function buildLocationEdit(
  loc: SourceLocation,
  newName: string,
  lookupText: (uri: DocumentUri) => string | null,
  expected?: string,
): WorkspaceTextEdit | null {
  const canonical = canonicalDocumentUri(loc.file);
  const span: SourceSpan = { start: loc.pos, end: loc.end, file: toSourceFileId(loc.file) };
  const text = lookupText(canonical.uri);
  const original = text ? text.slice(span.start, span.end) : "";
  if (expected !== undefined) {
    const literal = parseStringLiteral(original);
    if (!literal || literal.value !== expected) return null;
    return { uri: canonical.uri, span, newText: `${literal.quote}${newName}${literal.quote}` };
  }
  const newText = replaceStringLiteral(original, newName);
  return { uri: canonical.uri, span, newText };
}

function parseStringLiteral(original: string): { value: string; quote: string } | null {
  if (original.length < 2) return null;
  const first = original[0];
  const last = original[original.length - 1];
  if ((first === "\"" || first === "'" || first === "`") && last === first) {
    return { value: original.slice(1, -1), quote: first };
  }
  return null;
}

function replaceStringLiteral(original: string, value: string): string {
  if (original.length >= 2) {
    const first = original[0];
    const last = original[original.length - 1];
    if ((first === "\"" || first === "'" || first === "`") && last === first) {
      return `${first}${value}${first}`;
    }
  }
  return value;
}
