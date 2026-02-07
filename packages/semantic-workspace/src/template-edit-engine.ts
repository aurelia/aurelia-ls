import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import {
  analyzeAttributeName,
  canonicalDocumentUri,
  normalizePathForId,
  offsetAtPosition,
  spanContainsOffset,
  toSourceFileId,
  type AttributeParser,
  type BindableDef,
  type DOMNode,
  type DocumentUri,
  type LinkedInstruction,
  type LinkedRow,
  type NormalizedPath,
  type ResourceDef,
  type ResourceScopeId,
  type SourceLocation,
  type SourceSpan,
  type TextSpan,
  type StyleProfile,
  type TemplateCompilation,
  type TemplateIR,
  type TemplateMetaIR,
  type TemplateNode,
  type TemplateSyntaxRegistry,
} from "@aurelia-ls/compiler";
import {
  DECORATOR_NAMES,
  extractStringProp,
  getProperty,
  type AnalyzableValue,
  type ArrayValue,
  type ClassValue,
  type DecoratorApplication,
  type FileFacts,
  type ObjectValue,
} from "@aurelia-ls/compiler";
import type { InlineTemplateInfo, TemplateInfo } from "@aurelia-ls/compiler";
import type { ResourceDefinitionIndex } from "./definition.js";
import { selectResourceCandidate } from "./resource-precedence-policy.js";
import { buildDomIndex, elementTagSpanAtOffset, elementTagSpans, findAttrForSpan, findDomNode } from "./template-dom.js";
import type { RefactorTargetClass, SemanticRenameRoute } from "./refactor-policy.js";
import {
  attributeTargetNameFromSyntax,
  collectExpressionResourceNameSpans,
  findBindingBehaviorAtOffset as findBindingBehaviorHitAtOffset,
  findInstructionHitsAtOffset,
  findValueConverterAtOffset as findValueConverterHitAtOffset,
  type TemplateInstructionHit,
} from "./query-helpers.js";
import type {
  WorkspaceCodeAction,
  WorkspaceCodeActionRequest,
  WorkspaceDiagnostic,
  WorkspaceRenameRequest,
  WorkspaceTextEdit,
} from "./types.js";
import { inlineTemplatePath } from "./templates.js";
import { StylePolicy, type BindableDeclarationKind, type RefactorOverrides } from "./style-profile.js";

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

export type InstructionHit = TemplateInstructionHit<InstructionOwner>;

type CodeActionContext = {
  request: WorkspaceCodeActionRequest;
  uri: DocumentUri;
  text: string;
  compilation: TemplateCompilation;
  diagnostics: readonly WorkspaceDiagnostic[];
  syntax: AttributeSyntaxContext;
  style: StylePolicy;
  templateIndex: TemplateIndex;
  definitionIndex: ResourceDefinitionIndex;
  facts: ReadonlyMap<NormalizedPath, FileFacts>;
  workspaceRoot: string;
  compilerOptions: ts.CompilerOptions;
  lookupText: (uri: DocumentUri) => string | null;
  getCompilation: (uri: DocumentUri) => TemplateCompilation | null;
  ensureTemplate: (uri: DocumentUri) => void;
};

type BindableCandidate = {
  ownerKind: "element" | "attribute";
  ownerName: string;
  ownerFile: string | null;
  propertyName: string;
  attributeName: string | null;
};

type ImportCandidate = {
  kind: "custom-element" | "custom-attribute" | "template-controller" | "value-converter" | "binding-behavior";
  name: string;
};

type SourceContext = {
  uri: DocumentUri;
  text: string;
  sourceFile: ts.SourceFile;
};

type BindableDeclarationTarget =
  | {
    kind: "template";
    templateUri: DocumentUri;
    templateText: string;
    template: TemplateIR;
    meta: TemplateMetaIR;
  }
  | {
    kind: "member-decorator";
    source: SourceContext;
    classDecl: ts.ClassDeclaration;
    classValue: ClassValue;
  }
  | {
    kind: "resource-config";
    source: SourceContext;
    config: ObjectValue;
  }
  | {
    kind: "static-bindables";
    source: SourceContext;
    classDecl: ts.ClassDeclaration;
    classValue: ClassValue;
    bindables: ArrayValue | ObjectValue | null;
  }
  | {
    kind: "static-au";
    source: SourceContext;
    classDecl: ts.ClassDeclaration;
    classValue: ClassValue;
    resourceKind: "custom-element" | "custom-attribute" | "template-controller";
    au: ObjectValue | null;
  };

type BindableDeclarationSurface = {
  kind: BindableDeclarationKind;
  target: BindableDeclarationTarget;
  existing: boolean;
};

type InsertContext = {
  offset: number;
  indent: string;
};

type RenameOperationContext = {
  text: string;
  offset: number;
  compilation: TemplateCompilation;
  domIndex: ReturnType<typeof buildDomIndex>;
  syntax: AttributeSyntaxContext;
  preferRoots: readonly string[];
};

const DEFAULT_SEMANTIC_RENAME_ROUTE_ORDER: readonly SemanticRenameRoute[] = [
  "custom-element",
  "bindable-attribute",
  "value-converter",
  "binding-behavior",
];

export interface TemplateEditEngineContext {
  readonly workspaceRoot: string;
  readonly templateIndex: TemplateIndex;
  readonly definitionIndex: ResourceDefinitionIndex;
  readonly facts: ReadonlyMap<NormalizedPath, FileFacts>;
  readonly compilerOptions: ts.CompilerOptions;
  readonly lookupText: (uri: DocumentUri) => string | null;
  readonly getCompilation: (uri: DocumentUri) => TemplateCompilation | null;
  readonly ensureTemplate: (uri: DocumentUri) => void;
  readonly getAttributeSyntax: () => AttributeSyntaxContext;
  readonly styleProfile?: StyleProfile | null;
  readonly refactorOverrides?: RefactorOverrides | null;
  readonly semanticRenameRouteOrder?: readonly SemanticRenameRoute[] | null;
}

export interface TemplateRenameProbe {
  readonly targetClass: RefactorTargetClass;
  readonly hasSemanticProvenance: boolean;
}

export class TemplateEditEngine {
  readonly #style: StylePolicy;

  constructor(private readonly ctx: TemplateEditEngineContext) {
    this.#style = new StylePolicy({
      profile: ctx.styleProfile ?? null,
      refactors: ctx.refactorOverrides ?? null,
    });
  }

  probeRenameAt(request: WorkspaceRenameRequest): TemplateRenameProbe {
    const op = this.#renameOperationContext(request);
    if (!op) {
      return {
        targetClass: "unknown",
        hasSemanticProvenance: false,
      };
    }

    for (const route of this.#semanticRenameRouteOrder()) {
      if (this.#isSemanticRenameTarget(route, op)) {
        return {
          targetClass: "resource",
          hasSemanticProvenance: true,
        };
      }
    }

    if (op.compilation.query.exprAt(op.offset)) {
      return {
        targetClass: "expression-member",
        hasSemanticProvenance: false,
      };
    }

    return {
      targetClass: "unknown",
      hasSemanticProvenance: false,
    };
  }

  renameAt(request: WorkspaceRenameRequest): WorkspaceTextEdit[] | null {
    const op = this.#renameOperationContext(request);
    if (!op) return null;

    for (const route of this.#semanticRenameRouteOrder()) {
      const edits = this.#renameByRoute(route, op, request.newName);
      if (edits?.length) {
        return finalizeWorkspaceEdits(edits);
      }
    }

    return null;
  }

  #renameOperationContext(request: WorkspaceRenameRequest): RenameOperationContext | null {
    const text = this.ctx.lookupText(request.uri);
    if (!text) return null;
    const offset = offsetAtPosition(text, request.position);
    if (offset == null) return null;
    const compilation = this.ctx.getCompilation(request.uri);
    if (!compilation) return null;
    const domIndex = buildDomIndex(compilation.ir.templates ?? []);
    const syntax = this.ctx.getAttributeSyntax();
    const preferRoots = [this.ctx.workspaceRoot];
    return { text, offset, compilation, domIndex, syntax, preferRoots };
  }

  #semanticRenameRouteOrder(): readonly SemanticRenameRoute[] {
    const configured = this.ctx.semanticRenameRouteOrder ?? [];
    const ordered: SemanticRenameRoute[] = [];
    const seen = new Set<SemanticRenameRoute>();
    for (const route of configured) {
      if (seen.has(route)) continue;
      seen.add(route);
      ordered.push(route);
    }
    for (const route of DEFAULT_SEMANTIC_RENAME_ROUTE_ORDER) {
      if (seen.has(route)) continue;
      seen.add(route);
      ordered.push(route);
    }
    return ordered;
  }

  #isSemanticRenameTarget(route: SemanticRenameRoute, op: RenameOperationContext): boolean {
    switch (route) {
      case "custom-element":
        return this.#hasElementRenameTarget(op.compilation, op.domIndex, op.offset);
      case "bindable-attribute":
        return this.#hasBindableRenameTarget(op.compilation, op.domIndex, op.offset, op.preferRoots);
      case "value-converter":
        return findValueConverterHitAtOffset(op.compilation.exprTable ?? [], op.offset) !== null;
      case "binding-behavior":
        return findBindingBehaviorHitAtOffset(op.compilation.exprTable ?? [], op.offset) !== null;
      default:
        return false;
    }
  }

  #renameByRoute(
    route: SemanticRenameRoute,
    op: RenameOperationContext,
    newName: string,
  ): WorkspaceTextEdit[] | null {
    switch (route) {
      case "custom-element":
        return this.#renameElementAt(op.compilation, op.domIndex, op.text, op.offset, newName, op.preferRoots);
      case "bindable-attribute":
        return this.#renameBindableAttributeAt(
          op.compilation,
          op.domIndex,
          op.text,
          op.offset,
          newName,
          op.syntax,
          op.preferRoots,
        );
      case "value-converter":
        return this.#renameValueConverterAt(op.compilation, op.offset, newName, op.preferRoots);
      case "binding-behavior":
        return this.#renameBindingBehaviorAt(op.compilation, op.offset, newName, op.preferRoots);
      default:
        return null;
    }
  }

  #hasElementRenameTarget(
    compilation: TemplateCompilation,
    domIndex: ReturnType<typeof buildDomIndex>,
    offset: number,
  ): boolean {
    const node = compilation.query.nodeAt(offset);
    if (!node || node.kind !== "element") return false;
    const row = findLinkedRow(compilation.linked.templates, node.templateIndex, node.id);
    if (!row || row.node.kind !== "element") return false;
    const domNode = findDomNode(domIndex, node.templateIndex, node.id);
    if (!domNode || domNode.kind !== "element") return false;
    const tagSpan = elementTagSpanAtOffset(domNode, offset);
    if (!tagSpan) return false;
    return !!row.node.custom?.def;
  }

  #hasBindableRenameTarget(
    compilation: TemplateCompilation,
    domIndex: ReturnType<typeof buildDomIndex>,
    offset: number,
    preferRoots: readonly string[],
  ): boolean {
    const hits = findInstructionHitsAtOffset(compilation.linked.templates, compilation.ir.templates ?? [], domIndex, offset);
    for (const hit of hits) {
      const nameSpan = hit.attrNameSpan ?? null;
      if (!nameSpan || !spanContainsOffset(nameSpan, offset)) continue;
      const attrName = hit.attrName ?? null;
      if (!attrName) continue;
      const target = resolveBindableTarget(hit.instruction, this.ctx.definitionIndex, preferRoots);
      if (!target) continue;
      return true;
    }
    return false;
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
      style: this.#style,
      templateIndex: this.ctx.templateIndex,
      definitionIndex: this.ctx.definitionIndex,
      facts: this.ctx.facts,
      workspaceRoot: this.ctx.workspaceRoot,
      compilerOptions: this.ctx.compilerOptions,
      lookupText: this.ctx.lookupText,
      getCompilation: this.ctx.getCompilation,
      ensureTemplate: this.ctx.ensureTemplate,
    }, targetSpan);
  }

  #renameElementAt(
    compilation: TemplateCompilation,
    domIndex: ReturnType<typeof buildDomIndex>,
    text: string,
    offset: number,
    newName: string,
    preferRoots: readonly string[],
  ): WorkspaceTextEdit[] | null {
    const node = compilation.query.nodeAt(offset);
    if (!node || node.kind !== "element") return null;
    const row = findLinkedRow(compilation.linked.templates, node.templateIndex, node.id);
    if (!row || row.node.kind !== "element") return null;
    const domNode = findDomNode(domIndex, node.templateIndex, node.id);
    if (!domNode || domNode.kind !== "element") return null;
    const tagSpan = elementTagSpanAtOffset(domNode, offset);
    if (!tagSpan) return null;
    const res = row.node.custom?.def ?? null;
    if (!res) return null;

    const target: ResourceTarget = { kind: "element", name: res.name, file: res.file ?? null };
    const edits: WorkspaceTextEdit[] = [];
    const formattedName = this.#style.formatElementName(newName);
    this.#collectElementTagEdits(target, formattedName, edits);

    const entry = findResourceEntry(this.ctx.definitionIndex.elements, target.name, target.file, preferRoots);
    const nameEdit = entry ? buildResourceNameEdit(entry.def, target.name, formattedName, this.ctx.lookupText) : null;
    if (nameEdit) edits.push(nameEdit);

    return edits.length ? edits : null;
  }

  #renameBindableAttributeAt(
    compilation: TemplateCompilation,
    domIndex: ReturnType<typeof buildDomIndex>,
    text: string,
    offset: number,
    newName: string,
    syntax: AttributeSyntaxContext,
    preferRoots: readonly string[],
  ): WorkspaceTextEdit[] | null {
    const hits = findInstructionHitsAtOffset(compilation.linked.templates, compilation.ir.templates ?? [], domIndex, offset);
    for (const hit of hits) {
      const nameSpan = hit.attrNameSpan ?? null;
      if (!nameSpan || !spanContainsOffset(nameSpan, offset)) continue;
      const attrName = hit.attrName ?? null;
      if (!attrName) continue;
      const target = resolveBindableTarget(hit.instruction, this.ctx.definitionIndex, preferRoots);
      if (!target) continue;

      const edits: WorkspaceTextEdit[] = [];
      const formattedName = this.#style.formatRenameTarget(newName);
      this.#collectBindableAttributeEdits(target, formattedName, syntax, edits);

      const attrValue = target.bindable.attribute.value ?? target.property;
      const attrEdit = buildBindableAttributeEdit(target.bindable, attrValue, formattedName, this.ctx.lookupText);
      if (attrEdit) edits.push(attrEdit);

      if (!edits.length) return null;
      return edits;
    }
    return null;
  }

  #renameValueConverterAt(
    compilation: TemplateCompilation,
    offset: number,
    newName: string,
    preferRoots: readonly string[],
  ): WorkspaceTextEdit[] | null {
    const hit = findValueConverterAtOffset(compilation.exprTable ?? [], offset);
    if (!hit) return null;

    const edits: WorkspaceTextEdit[] = [];
    const formattedName = this.#style.formatConverterName(newName);
    this.#collectConverterEdits(hit.name, formattedName, edits);

    const entry = findResourceEntry(this.ctx.definitionIndex.valueConverters, hit.name, null, preferRoots);
    const nameEdit = entry ? buildResourceNameEdit(entry.def, hit.name, formattedName, this.ctx.lookupText) : null;
    if (nameEdit) edits.push(nameEdit);

    return edits.length ? edits : null;
  }

  #renameBindingBehaviorAt(
    compilation: TemplateCompilation,
    offset: number,
    newName: string,
    preferRoots: readonly string[],
  ): WorkspaceTextEdit[] | null {
    const hit = findBindingBehaviorAtOffset(compilation.exprTable ?? [], offset);
    if (!hit) return null;

    const edits: WorkspaceTextEdit[] = [];
    const formattedName = this.#style.formatBehaviorName(newName);
    this.#collectBehaviorEdits(hit.name, formattedName, edits);

    const entry = findResourceEntry(this.ctx.definitionIndex.bindingBehaviors, hit.name, null, preferRoots);
    const nameEdit = entry ? buildResourceNameEdit(entry.def, hit.name, formattedName, this.ctx.lookupText) : null;
    if (nameEdit) edits.push(nameEdit);

    return edits.length ? edits : null;
  }

  #collectElementTagEdits(target: ResourceTarget, newName: string, out: WorkspaceTextEdit[]): void {
    this.#forEachTemplateCompilation((uri, text, compilation) => {
      const spans = collectElementTagSpans(compilation, target);
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
      const matches = collectBindableAttributeMatches(compilation, target);
      for (const match of matches) {
        const replacement = renameAttributeName(match.attrName, newName, syntax);
        out.push({ uri, span: match.span, newText: replacement });
      }
    });
  }

  #collectConverterEdits(name: string, newName: string, out: WorkspaceTextEdit[]): void {
    this.#forEachTemplateCompilation((uri, _text, compilation) => {
      const spans = collectConverterSpans(compilation.exprTable ?? [], name);
      for (const span of spans) {
        out.push({ uri, span, newText: newName });
      }
    });
  }

  #collectBehaviorEdits(name: string, newName: string, out: WorkspaceTextEdit[]): void {
    this.#forEachTemplateCompilation((uri, _text, compilation) => {
      const spans = collectBehaviorSpans(compilation.exprTable ?? [], name);
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
  syntax: AttributeSyntaxContext,
): BindableCandidate | null {
  const attrName = attributeNameFromHit(hit);
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

  return null;
}

export function attributeNameFromHit(hit: InstructionHit): string | null {
  return hit.attrName ?? null;
}

export function attributeTargetName(attrName: string | null, syntax: AttributeSyntaxContext): string | null {
  return attributeTargetNameFromSyntax(attrName, syntax);
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
      return name ? { kind: "custom-element", name } : null;
    }
    case "aurelia/unknown-attribute": {
      const hit = findInstructionHit(ctx.compilation, offset);
      const attrName = hit ? attributeNameFromHit(hit) : null;
      const base = attributeTargetName(attrName, ctx.syntax);
      return base ? { kind: "custom-attribute", name: base } : null;
    }
    case "aurelia/unknown-controller": {
      const name = findControllerNameAtOffset(ctx.compilation, ctx.text, offset, ctx.syntax);
      return name ? { kind: "template-controller", name } : null;
    }
    case "aurelia/unknown-converter": {
      const hit = findValueConverterAtOffset(ctx.compilation.exprTable ?? [], offset);
      return hit ? { kind: "value-converter", name: hit.name } : null;
    }
    case "aurelia/unknown-behavior": {
      const hit = findBindingBehaviorAtOffset(ctx.compilation.exprTable ?? [], offset);
      return hit ? { kind: "binding-behavior", name: hit.name } : null;
    }
    case "aurelia/expr-symbol-not-found": {
      const symbolKind = typeof data?.symbolKind === "string" ? data.symbolKind : null;
      if (symbolKind === "binding-behavior") {
        const hit = findBindingBehaviorAtOffset(ctx.compilation.exprTable ?? [], offset);
        return hit ? { kind: "binding-behavior", name: hit.name } : null;
      }
      if (symbolKind === "value-converter") {
        const hit = findValueConverterAtOffset(ctx.compilation.exprTable ?? [], offset);
        return hit ? { kind: "value-converter", name: hit.name } : null;
      }
      const converter = findValueConverterAtOffset(ctx.compilation.exprTable ?? [], offset);
      if (converter) return { kind: "value-converter", name: converter.name };
      const behavior = findBindingBehaviorAtOffset(ctx.compilation.exprTable ?? [], offset);
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

  const template = ctx.compilation.ir.templates[0] ?? null;
  const meta = template?.templateMeta ?? null;
  if (!meta) return null;
  if (hasImportForFile(meta, targetFile, containingFile, ctx.compilerOptions)) return null;

  const insertion = computeImportInsertion(ctx.text, template, meta);
  const line = `${insertion.indent}<import from=${ctx.style.quote(specifier)}></import>`;
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

  const candidate = resolveBindableCandidate(hit, ctx.syntax);
  if (!candidate || candidate.ownerKind !== "element" || !candidate.ownerFile) return null;
  const target = resolveBindableDeclarationTarget(ctx, candidate);
  if (!target) return null;

  const formatted = ctx.style.formatBindableDeclaration(candidate.propertyName, candidate.attributeName);
  const edits = buildBindableDeclarationEdits(target, formatted, ctx);
  if (!edits.length) return null;

  const id = `aurelia/add-bindable:${candidate.ownerName}:${formatted.propertyName}`;
  return {
    id,
    title: `Add bindable '${formatted.propertyName}' to ${candidate.ownerName}`,
    kind: "quickfix",
    edit: { edits: finalizeWorkspaceEdits(edits) },
  };
}

function resolveBindableDeclarationTarget(
  ctx: CodeActionContext,
  candidate: BindableCandidate,
): BindableDeclarationTarget | null {
  const surfaces = collectBindableDeclarationSurfaces(ctx, candidate);
  if (!surfaces.length) return null;

  const preferred = ctx.style.bindableDeclaration;
  if (preferred) {
    return surfaces.find((surface) => surface.kind === preferred)?.target ?? null;
  }

  const priority: BindableDeclarationKind[] = [
    "template",
    "member-decorator",
    "resource-config",
    "static-bindables",
    "static-au",
  ];

  for (const kind of priority) {
    const existing = surfaces.find((surface) => surface.kind === kind && surface.existing);
    if (existing) return existing.target;
  }

  for (const kind of priority) {
    const available = surfaces.find((surface) => surface.kind === kind);
    if (available) return available.target;
  }

  return null;
}

function collectBindableDeclarationSurfaces(
  ctx: CodeActionContext,
  candidate: BindableCandidate,
): BindableDeclarationSurface[] {
  const surfaces: BindableDeclarationSurface[] = [];
  const preferRoots = [ctx.workspaceRoot];
  const entry = findResourceEntry(ctx.definitionIndex.elements, candidate.ownerName, candidate.ownerFile, preferRoots);
  const def = entry?.def ?? null;
  const className = def?.className.value ?? null;
  const resourceKind = def?.kind ?? null;

  const templateTarget = resolveTemplateBindableTarget(ctx, candidate);
  if (templateTarget) {
    surfaces.push({
      kind: "template",
      target: templateTarget,
      existing: templateTarget.meta.bindables.length > 0,
    });
  }

  const classTarget = className ? findClassTarget(ctx, className, candidate.ownerFile) : null;
  if (classTarget) {
    const classValue = classTarget.classValue;
    surfaces.push({
      kind: "member-decorator",
      target: {
        kind: "member-decorator",
        source: classTarget.source,
        classDecl: classTarget.classDecl,
        classValue,
      },
      existing: classValue.bindableMembers.length > 0,
    });

    const bindablesValue = classValue.staticMembers.get("bindables") ?? null;
    const bindablesNode = bindablesValue && (bindablesValue.kind === "array" || bindablesValue.kind === "object")
      ? bindablesValue
      : null;
    surfaces.push({
      kind: "static-bindables",
      target: {
        kind: "static-bindables",
        source: classTarget.source,
        classDecl: classTarget.classDecl,
        classValue,
        bindables: bindablesNode,
      },
      existing: bindablesValue !== null,
    });

    if (resourceKind === "custom-element" || resourceKind === "custom-attribute" || resourceKind === "template-controller") {
      const auValue = classValue.staticMembers.get("$au") ?? null;
      const auNode = auValue && auValue.kind === "object" ? auValue : null;
      const expectedType = resourceKind === "template-controller" ? "custom-attribute" : resourceKind;
      const auType = auNode ? extractStringProp(auNode, "type") : null;
      if (!auNode || auType === expectedType) {
        surfaces.push({
          kind: "static-au",
          target: {
            kind: "static-au",
            source: classTarget.source,
            classDecl: classTarget.classDecl,
            classValue,
            resourceKind,
            au: auNode,
          },
          existing: auNode !== null,
        });
      }
    }
  }

  const configTarget = className ? findResourceConfigTarget(ctx, className) : null;
  if (configTarget) {
    const hasBindables = getProperty(configTarget.config, "bindables") !== undefined;
    surfaces.push({
      kind: "resource-config",
      target: configTarget,
      existing: hasBindables,
    });
  }

  return surfaces;
}

function resolveTemplateBindableTarget(
  ctx: CodeActionContext,
  candidate: BindableCandidate,
): Extract<BindableDeclarationTarget, { kind: "template" }> | null {
  if (candidate.ownerKind !== "element" || !candidate.ownerFile) return null;
  const target = resolveExternalTemplateForComponent(candidate.ownerFile, ctx.templateIndex);
  if (!target) return null;
  const templateText = ctx.lookupText(target.uri);
  if (!templateText) return null;
  ctx.ensureTemplate(target.uri);
  const targetCompilation = ctx.getCompilation(target.uri);
  const template = targetCompilation?.ir.templates[0] ?? null;
  const meta = template?.templateMeta ?? null;
  if (!template || !meta) return null;
  return {
    kind: "template",
    templateUri: target.uri,
    templateText,
    template,
    meta,
  };
}

function findClassTarget(
  ctx: CodeActionContext,
  className: string,
  preferredFile: string | null,
): { classValue: ClassValue; classDecl: ts.ClassDeclaration; source: SourceContext } | null {
  const match = findClassValue(ctx.facts, className, preferredFile);
  if (!match) return null;
  const source = loadSourceContext(match.fileFacts.path, ctx.lookupText);
  if (!source) return null;
  const classDecl = findClassDeclaration(source.sourceFile, className);
  if (!classDecl) return null;
  return { classValue: match.classValue, classDecl, source };
}

function findResourceConfigTarget(
  ctx: CodeActionContext,
  className: string,
): Extract<BindableDeclarationTarget, { kind: "resource-config" }> | null {
  const defineTarget = findDefineConfigTarget(ctx, className);
  if (defineTarget) return defineTarget;
  const decoratorTarget = findDecoratorConfigTarget(ctx, className);
  if (decoratorTarget) return decoratorTarget;
  return null;
}

function findDefineConfigTarget(
  ctx: CodeActionContext,
  className: string,
): Extract<BindableDeclarationTarget, { kind: "resource-config" }> | null {
  for (const fileFacts of ctx.facts.values()) {
    const defineCall = fileFacts.defineCalls.find((call) => {
      if (call.resourceType !== "CustomElement" && call.resourceType !== "CustomAttribute") return false;
      return resolveClassRefName(call.classRef) === className;
    });
    if (!defineCall) continue;
    if (defineCall.definition.kind !== "object") continue;
    const source = loadSourceContext(fileFacts.path, ctx.lookupText);
    if (!source) continue;
    return { kind: "resource-config", source, config: defineCall.definition };
  }
  return null;
}

function findDecoratorConfigTarget(
  ctx: CodeActionContext,
  className: string,
): Extract<BindableDeclarationTarget, { kind: "resource-config" }> | null {
  const classMatch = findClassValue(ctx.facts, className, null);
  if (!classMatch) return null;
  const source = loadSourceContext(classMatch.fileFacts.path, ctx.lookupText);
  if (!source) return null;
  const decorator = findResourceDecorator(classMatch.classValue.decorators);
  if (!decorator) return null;
  const configArg = decorator.args.find((arg) => arg.kind === "object") ?? null;
  if (!configArg || configArg.kind !== "object") return null;
  return { kind: "resource-config", source, config: configArg };
}

function buildBindableDeclarationEdits(
  target: BindableDeclarationTarget,
  formatted: { propertyName: string; attributeName: string | null },
  ctx: CodeActionContext,
): WorkspaceTextEdit[] {
  switch (target.kind) {
    case "template":
      return buildTemplateBindableEdits(target, formatted, ctx);
    case "member-decorator":
      return buildMemberDecoratorEdits(target, formatted, ctx);
    case "resource-config":
      return buildResourceConfigBindableEdits(target, formatted, ctx);
    case "static-bindables":
      return buildStaticBindablesEdits(target, formatted, ctx);
    case "static-au":
      return buildStaticAuEdits(target, formatted, ctx);
  }
}

function buildTemplateBindableEdits(
  target: Extract<BindableDeclarationTarget, { kind: "template" }>,
  formatted: { propertyName: string; attributeName: string | null },
  ctx: CodeActionContext,
): WorkspaceTextEdit[] {
  const insertion = computeBindableInsertion(target.templateText, target.template, target.meta);
  const attributePart = formatted.attributeName ? ` attribute=${ctx.style.quote(formatted.attributeName)}` : "";
  const line = `${insertion.indent}<bindable name=${ctx.style.quote(formatted.propertyName)}${attributePart}></bindable>`;
  return [buildInsertionEdit(target.templateUri, target.templateText, insertion.offset, line)];
}

function buildMemberDecoratorEdits(
  target: Extract<BindableDeclarationTarget, { kind: "member-decorator" }>,
  formatted: { propertyName: string; attributeName: string | null },
  ctx: CodeActionContext,
): WorkspaceTextEdit[] {
  const edits: WorkspaceTextEdit[] = [];
  const importEdit = ensureNamedImport(target.source, "bindable");
  if (importEdit) edits.push(importEdit);

  const insertion = computeClassMemberInsertion(target.source.text, target.classDecl, target.classValue);
  const decorator = formatted.attributeName
    ? `@bindable({ attribute: ${ctx.style.quote(formatted.attributeName)} })`
    : "@bindable";
  const block = [
    `${insertion.indent}${decorator}`,
    `${insertion.indent}${formatted.propertyName}!: unknown;`,
  ].join(detectNewline(target.source.text));
  const newText = buildBlockInsertion(target.source.text, insertion.offset, block);
  edits.push(buildRawInsertionEdit(target.source, insertion.offset, newText));
  return edits;
}

function buildResourceConfigBindableEdits(
  target: Extract<BindableDeclarationTarget, { kind: "resource-config" }>,
  formatted: { propertyName: string; attributeName: string | null },
  ctx: CodeActionContext,
): WorkspaceTextEdit[] {
  const edits: WorkspaceTextEdit[] = [];
  const bindablesValue = getProperty(target.config, "bindables") ?? null;
  const entry = buildBindableObjectEntry(formatted, ctx.style);

  if (bindablesValue && (bindablesValue.kind === "object" || bindablesValue.kind === "array")) {
    const edit = buildBindableValueInsertion(target.source, bindablesValue, entry, formatted, ctx);
    if (edit) edits.push(edit);
    return edits;
  }

  if (!target.config.span) return edits;
  const bindablesLiteral = `bindables: { ${entry} }`;
  const edit = buildObjectInsertionEdit(target.source, target.config.span, bindablesLiteral);
  if (edit) edits.push(edit);
  return edits;
}

function buildStaticBindablesEdits(
  target: Extract<BindableDeclarationTarget, { kind: "static-bindables" }>,
  formatted: { propertyName: string; attributeName: string | null },
  ctx: CodeActionContext,
): WorkspaceTextEdit[] {
  const edits: WorkspaceTextEdit[] = [];
  const entry = buildBindableObjectEntry(formatted, ctx.style);

  if (target.bindables) {
    const edit = buildBindableValueInsertion(target.source, target.bindables, entry, formatted, ctx);
    if (edit) edits.push(edit);
    return edits;
  }

  const insertion = computeClassMemberInsertion(target.source.text, target.classDecl, target.classValue);
  const newline = detectNewline(target.source.text);
  const indentUnit = detectIndentUnit(target.source.text);
  const innerIndent = `${insertion.indent}${indentUnit}`;
  const block = [
    `${insertion.indent}static bindables = {`,
    `${innerIndent}${entry},`,
    `${insertion.indent}};`,
  ].join(newline);
  const newText = buildBlockInsertion(target.source.text, insertion.offset, block);
  edits.push(buildRawInsertionEdit(target.source, insertion.offset, newText));
  return edits;
}

function buildStaticAuEdits(
  target: Extract<BindableDeclarationTarget, { kind: "static-au" }>,
  formatted: { propertyName: string; attributeName: string | null },
  ctx: CodeActionContext,
): WorkspaceTextEdit[] {
  const edits: WorkspaceTextEdit[] = [];
  const entry = buildBindableObjectEntry(formatted, ctx.style);
  const expectedType = target.resourceKind === "template-controller" ? "custom-attribute" : target.resourceKind;

  if (target.au) {
    const bindablesValue = getProperty(target.au, "bindables") ?? null;
    if (bindablesValue && (bindablesValue.kind === "object" || bindablesValue.kind === "array")) {
      const edit = buildBindableValueInsertion(target.source, bindablesValue, entry, formatted, ctx);
      if (edit) edits.push(edit);
      return edits;
    }
    if (target.au.span) {
      const bindablesLiteral = `bindables: { ${entry} }`;
      const edit = buildObjectInsertionEdit(target.source, target.au.span, bindablesLiteral);
      if (edit) edits.push(edit);
    }
    return edits;
  }

  const insertion = computeClassMemberInsertion(target.source.text, target.classDecl, target.classValue);
  const newline = detectNewline(target.source.text);
  const indentUnit = detectIndentUnit(target.source.text);
  const innerIndent = `${insertion.indent}${indentUnit}`;
  const entries = [
    `type: ${ctx.style.quote(expectedType)}`,
    ...(target.resourceKind === "template-controller" ? ["isTemplateController: true"] : []),
    `bindables: { ${entry} }`,
  ];
  const block = [
    `${insertion.indent}static $au = {`,
    ...entries.map((line) => `${innerIndent}${line},`),
    `${insertion.indent}};`,
  ].join(newline);
  const newText = buildBlockInsertion(target.source.text, insertion.offset, block);
  edits.push(buildRawInsertionEdit(target.source, insertion.offset, newText));
  return edits;
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

function buildRawInsertionEdit(source: SourceContext, offset: number, newText: string): WorkspaceTextEdit {
  const canonical = canonicalDocumentUri(source.uri);
  const span: SourceSpan = { start: offset, end: offset, file: canonical.file };
  return { uri: canonical.uri, span, newText };
}

function buildBlockInsertion(text: string, offset: number, block: string): string {
  const newline = detectNewline(text);
  const before = offset > 0 ? text[offset - 1] : "";
  const after = offset < text.length ? text[offset] : "";
  const needsLeading = offset > 0 && before !== "\n" && before !== "\r";
  const needsTrailing = offset < text.length && after !== "\n" && after !== "\r";
  return `${needsLeading ? newline : ""}${block}${needsTrailing ? newline : ""}`;
}

function buildObjectInsertionEdit(
  source: SourceContext,
  span: TextSpan,
  entry: string,
): WorkspaceTextEdit | null {
  const insertion = buildDelimitedInsertion(source.text, span, entry, "}");
  if (!insertion) return null;
  return buildRawInsertionEdit(source, insertion.offset, insertion.text);
}

function buildArrayInsertionEdit(
  source: SourceContext,
  span: TextSpan,
  entry: string,
): WorkspaceTextEdit | null {
  const insertion = buildDelimitedInsertion(source.text, span, entry, "]");
  if (!insertion) return null;
  return buildRawInsertionEdit(source, insertion.offset, insertion.text);
}

function buildDelimitedInsertion(
  text: string,
  span: TextSpan,
  entry: string,
  closingChar: "}" | "]",
): { offset: number; text: string } | null {
  if (span.end <= span.start) return null;
  const slice = text.slice(span.start, span.end);
  if (!slice.includes(closingChar)) return null;
  const offset = span.end - 1;
  const newline = detectNewline(text);
  const isMultiline = slice.includes("\n");
  const needsComma = needsCommaBeforeClose(slice, closingChar);
  if (!isMultiline) {
    const spacer = needsComma ? ", " : " ";
    return { offset, text: `${spacer}${entry}` };
  }
  const indent = `${lineIndentAt(text, span.start)}${detectIndentUnit(text)}`;
  const prefix = needsComma ? "," : "";
  return { offset, text: `${prefix}${newline}${indent}${entry}` };
}

function needsCommaBeforeClose(slice: string, closingChar: "}" | "]"): boolean {
  const closeIndex = slice.lastIndexOf(closingChar);
  if (closeIndex <= 0) return false;
  let i = closeIndex - 1;
  while (i >= 0 && /\s/.test(slice[i]!)) i -= 1;
  if (i < 0) return false;
  return slice[i] !== ",";
}

function buildBindableObjectEntry(
  formatted: { propertyName: string; attributeName: string | null },
  style: StylePolicy,
): string {
  if (formatted.attributeName && formatted.attributeName !== formatted.propertyName) {
    return `${formatted.propertyName}: { attribute: ${style.quote(formatted.attributeName)} }`;
  }
  return `${formatted.propertyName}: true`;
}

function buildBindableArrayEntry(
  formatted: { propertyName: string; attributeName: string | null },
  style: StylePolicy,
): string {
  if (formatted.attributeName && formatted.attributeName !== formatted.propertyName) {
    return `{ name: ${style.quote(formatted.propertyName)}, attribute: ${style.quote(formatted.attributeName)} }`;
  }
  return style.quote(formatted.propertyName);
}

function buildBindableValueInsertion(
  source: SourceContext,
  bindablesValue: ObjectValue | ArrayValue,
  objectEntry: string,
  formatted: { propertyName: string; attributeName: string | null },
  ctx: CodeActionContext,
): WorkspaceTextEdit | null {
  if (!bindablesValue.span) return null;
  if (bindablesValue.kind === "object") {
    return buildObjectInsertionEdit(source, bindablesValue.span, objectEntry);
  }
  if (bindablesValue.kind === "array") {
    const arrayEntry = buildBindableArrayEntry(formatted, ctx.style);
    return buildArrayInsertionEdit(source, bindablesValue.span, arrayEntry);
  }
  return null;
}

function computeClassMemberInsertion(
  text: string,
  classDecl: ts.ClassDeclaration,
  classValue: ClassValue,
): { offset: number; indent: string } {
  const bindableSpans = classValue.bindableMembers
    .map((member) => member.span)
    .filter((span): span is TextSpan => Boolean(span));
  if (bindableSpans.length > 0) {
    const last = bindableSpans.reduce((a, b) => (a.end >= b.end ? a : b));
    return { offset: last.end, indent: lineIndentAt(text, last.start) };
  }

  if (classDecl.members.length > 0) {
    const last = classDecl.members[classDecl.members.length - 1]!;
    const offset = last.getEnd();
    const indent = lineIndentAt(text, last.getStart());
    return { offset, indent };
  }

  const offset = classDecl.members.pos;
  const indent = `${lineIndentAt(text, classDecl.getStart())}${detectIndentUnit(text)}`;
  return { offset, indent };
}

function ensureNamedImport(source: SourceContext, name: string): WorkspaceTextEdit | null {
  const sf = source.sourceFile;
  const imports = sf.statements.filter(ts.isImportDeclaration);
  for (const decl of imports) {
    const clause = decl.importClause;
    if (!clause || !clause.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue;
    for (const element of clause.namedBindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text;
      if (importedName === name) {
        return null;
      }
    }
  }

  const preferred = findDecoratorImport(imports, source.text);
  if (preferred && preferred.namedBindings) {
    const insert = buildNamedImportInsertion(source.text, sf, preferred.namedBindings, name);
    return buildRawInsertionEdit(source, insert.offset, insert.text);
  }

  const moduleSpecifier = preferred?.specifier ?? "@aurelia/runtime-html";
  const line = `import { ${name} } from ${JSON.stringify(moduleSpecifier)};`;
  const offset = imports.length > 0 ? imports[imports.length - 1]!.getEnd() : 0;
  const newText = buildLineInsertion(source.text, offset, line);
  return buildRawInsertionEdit(source, offset, newText);
}

function findDecoratorImport(
  imports: readonly ts.ImportDeclaration[],
  text: string,
): { namedBindings: ts.NamedImports | null; specifier: string } | null {
  const decoratorNames = new Set<string>([
    DECORATOR_NAMES.customElement,
    DECORATOR_NAMES.customAttribute,
    DECORATOR_NAMES.templateController,
    DECORATOR_NAMES.valueConverter,
    DECORATOR_NAMES.bindingBehavior,
    DECORATOR_NAMES.bindable,
  ]);
  for (const decl of imports) {
    const spec = decl.moduleSpecifier;
    if (!ts.isStringLiteral(spec)) continue;
    const clause = decl.importClause;
    const namedBindings = clause?.namedBindings;
    if (!namedBindings || !ts.isNamedImports(namedBindings)) continue;
    for (const element of namedBindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text;
      if (decoratorNames.has(importedName)) {
        return { namedBindings, specifier: spec.text };
      }
    }
  }
  return null;
}

function buildNamedImportInsertion(
  text: string,
  sf: ts.SourceFile,
  named: ts.NamedImports,
  name: string,
): { offset: number; text: string } {
  const start = named.getStart(sf);
  const end = named.getEnd();
  const slice = text.slice(start, end);
  const isMultiline = slice.includes("\n");
  const needsComma = needsCommaBeforeClose(slice, "}");
  const offset = end - 1;
  if (!isMultiline) {
    const spacer = needsComma ? ", " : " ";
    return { offset, text: `${spacer}${name}` };
  }
  const indent = named.elements.length > 0
    ? lineIndentAt(text, named.elements[0]!.getStart(sf))
    : `${lineIndentAt(text, start)}${detectIndentUnit(text)}`;
  const prefix = needsComma ? "," : "";
  const newline = detectNewline(text);
  return { offset, text: `${prefix}${newline}${indent}${name}` };
}

function computeImportInsertion(text: string, template: TemplateIR | null, meta: TemplateMetaIR): InsertContext {
  const lastImport = pickLastByEnd(meta.imports);
  if (lastImport) {
    return { offset: lastImport.elementLoc.end, indent: lineIndentAt(text, lastImport.elementLoc.start) };
  }
  const firstBindable = pickFirstByStart(meta.bindables);
  if (firstBindable) {
    return { offset: firstBindable.elementLoc.start, indent: lineIndentAt(text, firstBindable.elementLoc.start) };
  }
  return templateRootInsert(text, template) ?? { offset: 0, indent: "" };
}

function computeBindableInsertion(text: string, template: TemplateIR | null, meta: TemplateMetaIR): InsertContext {
  const lastBindable = pickLastByEnd(meta.bindables);
  if (lastBindable) {
    return { offset: lastBindable.elementLoc.end, indent: lineIndentAt(text, lastBindable.elementLoc.start) };
  }
  const lastImport = pickLastByEnd(meta.imports);
  if (lastImport) {
    return { offset: lastImport.elementLoc.end, indent: lineIndentAt(text, lastImport.elementLoc.start) };
  }
  return templateRootInsert(text, template) ?? { offset: 0, indent: "" };
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

function templateRootInsert(text: string, template: TemplateIR | null): InsertContext | null {
  if (!template) return null;
  const root = template.dom.children.find((child): child is TemplateNode => child.kind === "template");
  const tagEnd = root?.openTagEnd ?? null;
  if (!tagEnd) return null;
  const offset = tagEnd.start;
  const openIndent = lineIndentAt(text, Math.max(0, offset));
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

function loadSourceContext(
  filePath: NormalizedPath,
  lookupText: (uri: DocumentUri) => string | null,
): SourceContext | null {
  const canonical = canonicalDocumentUri(filePath);
  const text = lookupText(canonical.uri);
  if (!text) return null;
  const sourceFile = ts.createSourceFile(
    canonical.path,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKindForPath(canonical.path),
  );
  return { uri: canonical.uri, text, sourceFile };
}

function scriptKindForPath(filePath: string): ts.ScriptKind {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (lower.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (lower.endsWith(".js")) return ts.ScriptKind.JS;
  if (lower.endsWith(".mjs")) return ts.ScriptKind.JS;
  if (lower.endsWith(".cjs")) return ts.ScriptKind.JS;
  if (lower.endsWith(".mts")) return ts.ScriptKind.TS;
  if (lower.endsWith(".cts")) return ts.ScriptKind.TS;
  return ts.ScriptKind.TS;
}

function findClassDeclaration(
  sourceFile: ts.SourceFile,
  className: string,
): ts.ClassDeclaration | null {
  for (const statement of sourceFile.statements) {
    if (ts.isClassDeclaration(statement) && statement.name?.text === className) {
      return statement;
    }
  }
  return null;
}

function findClassValue(
  facts: ReadonlyMap<NormalizedPath, FileFacts>,
  className: string,
  preferredFile: string | null,
): { fileFacts: FileFacts; classValue: ClassValue } | null {
  if (preferredFile) {
    const normalized = normalizePathForId(preferredFile);
    for (const fileFacts of facts.values()) {
      if (normalizePathForId(fileFacts.path) !== normalized) continue;
      const classValue = fileFacts.classes.find((cls) => cls.className === className);
      if (classValue) return { fileFacts, classValue };
    }
  }

  for (const fileFacts of facts.values()) {
    const classValue = fileFacts.classes.find((cls) => cls.className === className);
    if (classValue) return { fileFacts, classValue };
  }

  return null;
}

function resolveClassRefName(value: AnalyzableValue): string | null {
  if (value.kind === "reference") return value.name;
  if (value.kind === "import") return value.exportName;
  return null;
}

function findResourceDecorator(
  decorators: readonly DecoratorApplication[],
): DecoratorApplication | null {
  const element = decorators.find((dec) => dec.name === DECORATOR_NAMES.customElement);
  if (element) return element;
  const attribute = decorators.find((dec) => dec.name === DECORATOR_NAMES.customAttribute);
  if (attribute) return attribute;
  return null;
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
    case "custom-element":
      return index.elements;
    case "custom-attribute":
      return index.attributes;
    case "template-controller":
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
  const domIndex = buildDomIndex(compilation.ir.templates ?? []);
  const hits = findInstructionHitsAtOffset<InstructionOwner>(
    compilation.linked.templates,
    compilation.ir.templates ?? [],
    domIndex,
    offset,
    { resolveOwner: resolveInstructionOwner },
  );
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
  _text: string,
  offset: number,
  syntax: AttributeSyntaxContext,
): string | null {
  const controller = compilation.query.controllerAt(offset);
  if (controller?.kind) return controller.kind;
  const hit = findInstructionHit(compilation, offset);
  const attrName = hit ? attributeNameFromHit(hit) : null;
  const base = attributeTargetName(attrName, syntax);
  return base ?? null;
}

function resolveInstructionOwner(args: {
  row: LinkedRow;
  parentInstruction: LinkedInstruction | null;
}): InstructionOwner | null {
  const elementOwner: InstructionOwner | null = args.row.node.kind === "element" && args.row.node.custom?.def
    ? { kind: "element", name: args.row.node.custom.def.name, file: args.row.node.custom.def.file ?? null }
    : null;
  const parent = args.parentInstruction;
  if (!parent) return elementOwner;

  if (parent.kind === "hydrateElement") {
    return parent.res?.def
      ? { kind: "element", name: parent.res.def.name, file: parent.res.def.file ?? null }
      : elementOwner;
  }
  if (parent.kind === "hydrateAttribute") {
    return parent.res?.def
      ? {
        kind: "attribute",
        name: parent.res.def.name,
        file: parent.res.def.file ?? null,
        isTemplateController: parent.res.def.isTemplateController,
      }
      : null;
  }
  if (parent.kind === "hydrateTemplateController") {
    return { kind: "controller", name: parent.res };
  }
  return elementOwner;
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
  target: BindableTarget,
): Array<{ span: SourceSpan; attrName: string }> {
  const results: Array<{ span: SourceSpan; attrName: string }> = [];
  const domIndex = buildDomIndex(compilation.ir.templates ?? []);
  const templates = compilation.linked.templates ?? [];
  const irTemplates = compilation.ir.templates ?? [];

  for (let ti = 0; ti < templates.length; ti += 1) {
    const template = templates[ti];
    const irTemplate = irTemplates[ti];
    if (!template || !irTemplate) continue;
    for (const row of template.rows ?? []) {
      const domNode = findDomNode(domIndex, ti, row.target);
      for (const instruction of row.instructions ?? []) {
        collectBindableInstructionMatches(instruction, domNode, target, results);
        if (
          instruction.kind === "hydrateElement"
          || instruction.kind === "hydrateAttribute"
          || instruction.kind === "hydrateTemplateController"
        ) {
          for (const prop of instruction.props ?? []) {
            collectBindableInstructionMatches(prop, domNode, target, results);
          }
        }
      }
    }
  }
  return results;
}

function collectBindableInstructionMatches(
  instruction: LinkedInstruction,
  node: DOMNode | null,
  target: BindableTarget,
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
  if (!node || (node.kind !== "element" && node.kind !== "template")) return;
  const attr = findAttrForSpan(node, loc);
  const nameSpan = attr?.nameLoc ?? null;
  const attrName = attr?.name ?? null;
  if (!nameSpan || !attrName) return;
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
  target: ResourceTarget,
): SourceSpan[] {
  const results: SourceSpan[] = [];
  const irTemplates = compilation.ir.templates ?? [];
  const linkedTemplates = compilation.linked.templates ?? [];

  for (let i = 0; i < irTemplates.length; i += 1) {
    const irTemplate = irTemplates[i];
    const linked = linkedTemplates[i];
    if (!irTemplate || !linked) continue;
    const rowsByTarget = new Map<string, LinkedRow>();
    for (const row of linked.rows ?? []) {
      rowsByTarget.set(row.target, row);
    }

    const stack: DOMNode[] = [irTemplate.dom];
    while (stack.length) {
      const node = stack.pop();
      if (!node) continue;
      if (node.kind === "element") {
        const row = rowsByTarget.get(node.id);
        if (row?.node.kind === "element" && row.node.custom?.def) {
          if (resourceRefMatches(row.node.custom.def, target.name, target.file)) {
            results.push(...elementTagSpans(node));
          }
        }
      }
      if (node.kind === "element" || node.kind === "template") {
        const children = node.children;
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
  name: string,
): SourceSpan[] {
  return collectExpressionResourceNameSpans(exprTable, "ValueConverter", name);
}

function collectBehaviorSpans(
  exprTable: readonly { id: string; ast: unknown }[],
  name: string,
): SourceSpan[] {
  return collectExpressionResourceNameSpans(exprTable, "BindingBehavior", name);
}

export function findValueConverterAtOffset(
  exprTable: readonly { id: string; ast: unknown }[],
  offset: number,
): { name: string; exprId: string } | null {
  return findValueConverterHitAtOffset(exprTable, offset);
}

export function findBindingBehaviorAtOffset(
  exprTable: readonly { id: string; ast: unknown }[],
  offset: number,
): { name: string; exprId: string } | null {
  return findBindingBehaviorHitAtOffset(exprTable, offset);
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
  const entries = map.get(name.toLowerCase()) ?? map.get(name);
  return selectResourceCandidate(entries, {
    file,
    preferredRoots: preferRoots,
  });
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
