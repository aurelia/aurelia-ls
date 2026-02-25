import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import {
  analyzeAttributeName,
  canonicalDocumentUri,
  createBindableSymbolId,
  normalizePathForId,
  offsetAtPosition,
  resolveCursorEntity,
  isRenameable,
  spanContainsOffset,
  toSourceFileId,
  unwrapSourced,
  type AttributeParser,
  type BindableDef,
  type CursorEntity,
  type DOMNode,
  type DocumentUri,
  type LinkedInstruction,
  type LinkedRow,
  type NormalizedPath,
  type ResourceDef,
  type ResourceScopeId,
  type SourceLocation,
  type SourceSpan,
  type SymbolId,
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
import { buildDomIndex, elementTagSpanAtOffset, findDomNode } from "./template-dom.js";
import type { RefactorResourceOrigin, RefactorTargetClass, SemanticRenameRoute } from "./refactor-policy.js";
import {
  attributeTargetNameFromSyntax,
  findBindingBehaviorAtOffset as findBindingBehaviorHitAtOffset,
  findInstructionHitsAtOffset,
  findValueConverterAtOffset as findValueConverterHitAtOffset,
  type TemplateInstructionHit,
} from "./query-helpers.js";
import type {
  WorkspaceCodeAction,
  WorkspaceCodeActionRequest,
  WorkspaceDiagnostic,
  WorkspaceLocation,
  WorkspacePrepareRenameRequest,
  WorkspaceRenameRequest,
  WorkspaceTextEdit,
  TextReferenceSite,
  NameForm,
  PrepareRenameResult,
  RenameSafety,
  RenameConfidence,
} from "./types.js";
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
  symbolId?: SymbolId;
};

type ResourceTarget = {
  name: string;
  file: string | null;
};

type BindableTarget = {
  ownerSymbolId: SymbolId;
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
  offset: number;
  compilation: TemplateCompilation;
  domIndex: ReturnType<typeof buildDomIndex>;
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
  readonly getResourceReferencesBySymbolId: (
    activeUri: DocumentUri,
    symbolId: SymbolId,
  ) => readonly TextReferenceSite[];
  readonly getAttributeSyntax: () => AttributeSyntaxContext;
  readonly styleProfile?: StyleProfile | null;
  readonly refactorOverrides?: RefactorOverrides | null;
  readonly semanticRenameRouteOrder?: readonly SemanticRenameRoute[] | null;
}

export interface TemplateRenameProbe {
  readonly targetClass: RefactorTargetClass;
  readonly hasSemanticProvenance: boolean;
  readonly resourceOrigin?: RefactorResourceOrigin;
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

    // Use CursorEntity for unified classification.
    const resolution = resolveCursorEntity({
      compilation: op.compilation,
      offset: op.offset,
      syntax: this.ctx.getAttributeSyntax().syntax ?? null,
    });
    if (!resolution) {
      return {
        targetClass: "unknown",
        hasSemanticProvenance: false,
      };
    }

    const entity = resolution.entity;

    // Resource entities (CE, CA, VC, BB, bindable)
    switch (entity.kind) {
      case 'ce-tag':
        return {
          targetClass: "resource",
          hasSemanticProvenance: true,
          resourceOrigin: toRefactorResourceOrigin(entity.element.origin),
        };
      case 'ca-attr':
        return {
          targetClass: "resource",
          hasSemanticProvenance: true,
          resourceOrigin: toRefactorResourceOrigin(entity.attribute.origin),
        };
      case 'bindable':
        return {
          targetClass: "resource",
          hasSemanticProvenance: true,
          resourceOrigin: "source",
        };
      case 'value-converter':
        return {
          targetClass: "resource",
          hasSemanticProvenance: true,
          resourceOrigin: entity.converter ? "source" : "unknown",
        };
      case 'binding-behavior':
        return {
          targetClass: "resource",
          hasSemanticProvenance: true,
          resourceOrigin: entity.behavior ? "source" : "unknown",
        };
      case 'local-template-name':
        return {
          targetClass: "resource",
          hasSemanticProvenance: true,
          resourceOrigin: "source",
        };
      // Expression entities (scope identifiers, member access)
      case 'scope-identifier':
      case 'member-access':
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

  prepareRenameAt(request: WorkspacePrepareRenameRequest): PrepareRenameResult | null {
    const op = this.#renameOperationContext({ ...request, newName: "" });
    if (!op) return null;

    // Use CursorEntity for unified entity resolution.
    // This replaces the per-route resolution and correctly discriminates
    // commands from bindables, CA names from bindable properties,
    // and blocks non-renameable constructs (builtins, commands, contextual vars).
    const resolution = resolveCursorEntity({
      compilation: op.compilation,
      offset: op.offset,
      syntax: this.ctx.getAttributeSyntax().syntax ?? null,
    });
    if (!resolution) return null;

    const entity = resolution.entity;
    if (!isRenameable(entity)) return null;

    // Workspace-level additional checks: origin gating, TC blocking
    if (!isWorkspaceRenameable(entity)) return null;

    // Extract the rename target name and span
    const target = extractRenameTarget(entity);
    if (!target.name || !target.span) return null;

    // Compute safety assessment
    const safety = this.#computeEntityRenameSafety(entity, request.uri, op);

    return { range: target.span, placeholder: target.name, safety };
  }

  #computeEntityRenameSafety(
    entity: CursorEntity,
    requestUri: DocumentUri,
    op: RenameOperationContext,
  ): RenameSafety {
    // For resource entities, look up the definition index for reference counts
    // and origin-based confidence. For expression entities, use high confidence
    // (direct observation — we can see the symbol).
    let declarationConfidence: RenameConfidence = "high";
    let totalReferences = 0;

    switch (entity.kind) {
      case 'ce-tag': {
        const entry = findResourceEntry(this.ctx.definitionIndex.elements, entity.name, entity.element.file ?? null, op.preferRoots);
        if (entry?.symbolId) {
          const refs = this.ctx.getResourceReferencesBySymbolId(requestUri, entry.symbolId);
          totalReferences = refs.length;
        }
        declarationConfidence = entity.element.origin === "source" ? "high" : "low";
        break;
      }
      case 'ca-attr': {
        const map = this.ctx.definitionIndex.attributes;
        const entry = findResourceEntry(map, entity.name, entity.attribute.file ?? null, op.preferRoots);
        if (entry?.symbolId) {
          const refs = this.ctx.getResourceReferencesBySymbolId(requestUri, entry.symbolId);
          totalReferences = refs.length;
        }
        declarationConfidence = entity.attribute.origin === "source" ? "high" : "low";
        break;
      }
      case 'scope-identifier':
      case 'member-access':
        // Expression entities: high confidence (direct symbol observation)
        declarationConfidence = "high";
        break;
    }

    return {
      confidence: declarationConfidence,
      totalReferences,
      certainReferences: totalReferences,
      uncertainScopes: [],
      declarationConfidence,
    };
  }

  #prepareRenameByRoute(
    route: SemanticRenameRoute,
    requestUri: DocumentUri,
    op: RenameOperationContext,
  ): PrepareRenameResult | null {
    // Resolve the symbol and get its span + name + symbolId
    const origin = this.#semanticRenameTargetOrigin(route, op);
    if (!origin) return null;

    // Find the symbolId and reference count for confidence assessment
    const symbolId = this.#resolveSymbolIdForRoute(route, op);
    if (!symbolId) return null;
    const refs = this.ctx.getResourceReferencesBySymbolId(requestUri, symbolId);

    // Compute safety: for now, base confidence on declaration provenance and
    // reference completeness. The full safety decision (scope gap assessment,
    // project analysis completeness) requires infrastructure we'll build next.
    const declarationConfidence: RenameConfidence =
      origin === "builtin" ? "none"
        : origin === "config" ? "none"
          : origin === "source" ? "high"
            : "low";

    const safety: RenameSafety = {
      confidence: declarationConfidence,
      totalReferences: refs.length,
      certainReferences: refs.length,
      uncertainScopes: [],
      declarationConfidence,
    };

    // Resolve the name span at the cursor position
    const nameSpan = this.#resolveNameSpanForRoute(route, op);
    if (!nameSpan) return null;

    const placeholder = this.#resolveNameForRoute(route, op);
    if (!placeholder) return null;

    return { range: nameSpan, placeholder, safety };
  }

  #resolveSymbolIdForRoute(route: SemanticRenameRoute, op: RenameOperationContext): SymbolId | null {
    switch (route) {
      case "custom-element": {
        const node = op.compilation.query.nodeAt(op.offset);
        if (!node || node.kind !== "element") return null;
        const row = findLinkedRow(op.compilation.linked.templates, node.templateIndex, node.id);
        if (!row || row.node.kind !== "element") return null;
        const def = row.node.custom?.def;
        if (!def) return null;
        const entry = findResourceEntry(this.ctx.definitionIndex.elements, def.name, def.file ?? null, op.preferRoots);
        return entry?.symbolId ?? null;
      }
      case "bindable-attribute": {
        const domIndex = op.domIndex;
        const hits = findInstructionHitsAtOffset(op.compilation.linked.templates, op.compilation.ir.templates ?? [], domIndex, op.offset);
        for (const hit of hits) {
          const nameSpan = hit.attrNameSpan ?? null;
          if (!nameSpan || !spanContainsOffset(nameSpan, op.offset)) continue;
          const target = resolveBindableTarget(hit.instruction, this.ctx.definitionIndex, op.preferRoots);
          if (!target) continue;
          return createBindableSymbolId({ owner: target.ownerSymbolId, property: target.property });
        }
        return null;
      }
      case "value-converter": {
        const hit = findValueConverterHitAtOffset(op.compilation.exprTable ?? [], op.offset);
        if (!hit) return null;
        const entry = findResourceEntry(this.ctx.definitionIndex.valueConverters, hit.name, null, op.preferRoots);
        return entry?.symbolId ?? null;
      }
      case "binding-behavior": {
        const hit = findBindingBehaviorHitAtOffset(op.compilation.exprTable ?? [], op.offset);
        if (!hit) return null;
        const entry = findResourceEntry(this.ctx.definitionIndex.bindingBehaviors, hit.name, null, op.preferRoots);
        return entry?.symbolId ?? null;
      }
      default:
        return null;
    }
  }

  #resolveNameSpanForRoute(route: SemanticRenameRoute, op: RenameOperationContext): SourceSpan | null {
    switch (route) {
      case "custom-element": {
        const node = op.compilation.query.nodeAt(op.offset);
        if (!node || node.kind !== "element") return null;
        const domNode = findDomNode(op.domIndex, node.templateIndex, node.id);
        if (!domNode || domNode.kind !== "element") return null;
        return elementTagSpanAtOffset(domNode, op.offset) ?? null;
      }
      case "bindable-attribute": {
        const hits = findInstructionHitsAtOffset(op.compilation.linked.templates, op.compilation.ir.templates ?? [], op.domIndex, op.offset);
        for (const hit of hits) {
          const nameSpan = hit.attrNameSpan ?? null;
          if (!nameSpan || !spanContainsOffset(nameSpan, op.offset)) continue;
          return nameSpan;
        }
        return null;
      }
      case "value-converter": {
        const hit = findValueConverterHitAtOffset(op.compilation.exprTable ?? [], op.offset);
        if (!hit) return null;
        // The VC hit finder returns name+exprId but no span. Use text-based
        // span derivation from the compilation offset.
        return findExprResourceSpan(op.compilation, op.offset, "valueConverter", hit.name);
      }
      case "binding-behavior": {
        const hit = findBindingBehaviorHitAtOffset(op.compilation.exprTable ?? [], op.offset);
        if (!hit) return null;
        return findExprResourceSpan(op.compilation, op.offset, "bindingBehavior", hit.name);
      }
      default:
        return null;
    }
  }

  #resolveNameForRoute(route: SemanticRenameRoute, op: RenameOperationContext): string | null {
    switch (route) {
      case "custom-element": {
        const node = op.compilation.query.nodeAt(op.offset);
        if (!node || node.kind !== "element") return null;
        const row = findLinkedRow(op.compilation.linked.templates, node.templateIndex, node.id);
        if (!row || row.node.kind !== "element") return null;
        return row.node.custom?.def?.name ?? null;
      }
      case "bindable-attribute": {
        const hits = findInstructionHitsAtOffset(op.compilation.linked.templates, op.compilation.ir.templates ?? [], op.domIndex, op.offset);
        for (const hit of hits) {
          const nameSpan = hit.attrNameSpan ?? null;
          if (!nameSpan || !spanContainsOffset(nameSpan, op.offset)) continue;
          const target = resolveBindableTarget(hit.instruction, this.ctx.definitionIndex, op.preferRoots);
          if (!target) continue;
          return unwrapSourced(target.bindable.attribute) ?? target.property;
        }
        return null;
      }
      case "value-converter": {
        const hit = findValueConverterHitAtOffset(op.compilation.exprTable ?? [], op.offset);
        return hit?.name ?? null;
      }
      case "binding-behavior": {
        const hit = findBindingBehaviorHitAtOffset(op.compilation.exprTable ?? [], op.offset);
        return hit?.name ?? null;
      }
      default:
        return null;
    }
  }

  renameAt(request: WorkspaceRenameRequest): WorkspaceTextEdit[] | null {
    const op = this.#renameOperationContext(request);
    if (!op) return null;

    for (const route of this.#semanticRenameRouteOrder()) {
      const edits = this.#renameByRoute(route, request.uri, op, request.newName);
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
    const preferRoots = [this.ctx.workspaceRoot];
    return { offset, compilation, domIndex, preferRoots };
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

  #semanticRenameTargetOrigin(
    route: SemanticRenameRoute,
    op: RenameOperationContext,
  ): RefactorResourceOrigin | null {
    switch (route) {
      case "custom-element":
        return this.#elementRenameTargetOrigin(op.compilation, op.domIndex, op.offset, op.preferRoots);
      case "bindable-attribute":
        return this.#bindableRenameTargetOrigin(op.compilation, op.domIndex, op.offset, op.preferRoots);
      case "value-converter":
        return this.#valueConverterRenameTargetOrigin(op.compilation, op.offset, op.preferRoots);
      case "binding-behavior":
        return this.#bindingBehaviorRenameTargetOrigin(op.compilation, op.offset, op.preferRoots);
      default:
        return null;
    }
  }

  #renameByRoute(
    route: SemanticRenameRoute,
    requestUri: DocumentUri,
    op: RenameOperationContext,
    newName: string,
  ): WorkspaceTextEdit[] | null {
    switch (route) {
      case "custom-element":
        return this.#renameElementAt(requestUri, op.compilation, op.domIndex, op.offset, newName, op.preferRoots);
      case "bindable-attribute":
        return this.#renameBindableAttributeAt(
          requestUri,
          op.compilation,
          op.domIndex,
          op.offset,
          newName,
          op.preferRoots,
        );
      case "value-converter":
        return this.#renameValueConverterAt(requestUri, op.compilation, op.offset, newName, op.preferRoots);
      case "binding-behavior":
        return this.#renameBindingBehaviorAt(requestUri, op.compilation, op.offset, newName, op.preferRoots);
      default:
        return null;
    }
  }

  #elementRenameTargetOrigin(
    compilation: TemplateCompilation,
    domIndex: ReturnType<typeof buildDomIndex>,
    offset: number,
    preferRoots: readonly string[],
  ): RefactorResourceOrigin | null {
    const node = compilation.query.nodeAt(offset);
    if (!node || node.kind !== "element") return null;
    const row = findLinkedRow(compilation.linked.templates, node.templateIndex, node.id);
    if (!row || row.node.kind !== "element") return null;
    const domNode = findDomNode(domIndex, node.templateIndex, node.id);
    if (!domNode || domNode.kind !== "element") return null;
    const tagSpan = elementTagSpanAtOffset(domNode, offset);
    if (!tagSpan) return null;
    const def = row.node.custom?.def;
    if (!def) return null;
    const entry = findResourceEntry(this.ctx.definitionIndex.elements, def.name, def.file ?? null, preferRoots);
    if (!entry || !entry.symbolId) return null;
    return toRefactorResourceOrigin(entry.def.name.origin);
  }

  #bindableRenameTargetOrigin(
    compilation: TemplateCompilation,
    domIndex: ReturnType<typeof buildDomIndex>,
    offset: number,
    preferRoots: readonly string[],
  ): RefactorResourceOrigin | null {
    const hits = findInstructionHitsAtOffset(compilation.linked.templates, compilation.ir.templates ?? [], domIndex, offset);
    for (const hit of hits) {
      const nameSpan = hit.attrNameSpan ?? null;
      if (!nameSpan || !spanContainsOffset(nameSpan, offset)) continue;
      const target = resolveBindableTarget(hit.instruction, this.ctx.definitionIndex, preferRoots);
      if (!target) continue;
      return toRefactorResourceOrigin(target.bindable.attribute.origin);
    }
    return null;
  }

  #valueConverterRenameTargetOrigin(
    compilation: TemplateCompilation,
    offset: number,
    preferRoots: readonly string[],
  ): RefactorResourceOrigin | null {
    const hit = findValueConverterHitAtOffset(compilation.exprTable ?? [], offset);
    if (!hit) return null;
    const entry = findResourceEntry(this.ctx.definitionIndex.valueConverters, hit.name, null, preferRoots);
    if (!entry || !entry.symbolId) return null;
    return toRefactorResourceOrigin(entry.def.name.origin);
  }

  #bindingBehaviorRenameTargetOrigin(
    compilation: TemplateCompilation,
    offset: number,
    preferRoots: readonly string[],
  ): RefactorResourceOrigin | null {
    const hit = findBindingBehaviorHitAtOffset(compilation.exprTable ?? [], offset);
    if (!hit) return null;
    const entry = findResourceEntry(this.ctx.definitionIndex.bindingBehaviors, hit.name, null, preferRoots);
    if (!entry || !entry.symbolId) return null;
    return toRefactorResourceOrigin(entry.def.name.origin);
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
    requestUri: DocumentUri,
    compilation: TemplateCompilation,
    domIndex: ReturnType<typeof buildDomIndex>,
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

    const target: ResourceTarget = { name: res.name, file: res.file ?? null };
    const edits: WorkspaceTextEdit[] = [];
    const formattedName = this.#style.formatElementName(newName);

    const entry = findResourceEntry(this.ctx.definitionIndex.elements, target.name, target.file, preferRoots);
    if (!entry?.symbolId) return null;
    this.#collectSymbolEdits(requestUri, entry.symbolId, formattedName, edits, "kebab-case");

    return edits.length ? edits : null;
  }

  #renameBindableAttributeAt(
    requestUri: DocumentUri,
    compilation: TemplateCompilation,
    domIndex: ReturnType<typeof buildDomIndex>,
    offset: number,
    newName: string,
    preferRoots: readonly string[],
  ): WorkspaceTextEdit[] | null {
    const hits = findInstructionHitsAtOffset(compilation.linked.templates, compilation.ir.templates ?? [], domIndex, offset);
    for (const hit of hits) {
      const nameSpan = hit.attrNameSpan ?? null;
      if (!nameSpan || !spanContainsOffset(nameSpan, offset)) continue;
      const target = resolveBindableTarget(hit.instruction, this.ctx.definitionIndex, preferRoots);
      if (!target) continue;

      const edits: WorkspaceTextEdit[] = [];
      const formattedName = this.#style.formatRenameTarget(newName);
      const bindableSymbolId = createBindableSymbolId({ owner: target.ownerSymbolId, property: target.property });
      // Bindable renames from template attributes use kebab-case input form.
      // The unified reference index includes TS-side bindable-property and
      // bindable-config-key references alongside template attribute-name references.
      // Per-site name transformation handles the kebab→camel conversion.
      this.#collectSymbolEdits(requestUri, bindableSymbolId, formattedName, edits, "kebab-case");

      if (!edits.length) return null;
      return edits;
    }
    return null;
  }

  #renameValueConverterAt(
    requestUri: DocumentUri,
    compilation: TemplateCompilation,
    offset: number,
    newName: string,
    preferRoots: readonly string[],
  ): WorkspaceTextEdit[] | null {
    const hit = findValueConverterAtOffset(compilation.exprTable ?? [], offset);
    if (!hit) return null;

    const edits: WorkspaceTextEdit[] = [];
    const formattedName = this.#style.formatConverterName(newName);

    const entry = findResourceEntry(this.ctx.definitionIndex.valueConverters, hit.name, null, preferRoots);
    if (!entry?.symbolId) return null;
    this.#collectSymbolEdits(requestUri, entry.symbolId, formattedName, edits, "camelCase");

    return edits.length ? edits : null;
  }

  #renameBindingBehaviorAt(
    requestUri: DocumentUri,
    compilation: TemplateCompilation,
    offset: number,
    newName: string,
    preferRoots: readonly string[],
  ): WorkspaceTextEdit[] | null {
    const hit = findBindingBehaviorAtOffset(compilation.exprTable ?? [], offset);
    if (!hit) return null;

    const edits: WorkspaceTextEdit[] = [];
    const formattedName = this.#style.formatBehaviorName(newName);

    const entry = findResourceEntry(this.ctx.definitionIndex.bindingBehaviors, hit.name, null, preferRoots);
    if (!entry?.symbolId) return null;
    this.#collectSymbolEdits(requestUri, entry.symbolId, formattedName, edits, "camelCase");

    return edits.length ? edits : null;
  }

  #collectSymbolEdits(
    requestUri: DocumentUri,
    symbolId: SymbolId,
    newName: string,
    out: WorkspaceTextEdit[],
    inputForm?: NameForm,
  ): void {
    const refs = this.ctx.getResourceReferencesBySymbolId(requestUri, symbolId);
    const transform = inputForm ? deriveNameForms(newName, inputForm) : null;
    for (const ref of refs) {
      // Apply per-site name transformation when we have form information.
      const transformed = transform ? selectNameForSite(ref, transform) : newName;
      out.push({ uri: ref.uri, span: ref.span, newText: transformed });
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
  const className = def ? unwrapSourced(def.className) ?? null : null;
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
      if (!entry?.symbolId) return null;
      const bindable = findBindableDef(entry.def, instruction.to);
      if (!bindable) return null;
      return {
        ownerSymbolId: entry.symbolId,
        ownerDef: entry.def,
        bindable,
        property: instruction.to,
      };
    }
    case "attribute.bindable": {
      const t = target as { attribute: { def: { name: string; file?: string; isTemplateController?: boolean } } };
      const map = t.attribute.def.isTemplateController ? resources.controllers : resources.attributes;
      const entry = findResourceEntry(map, t.attribute.def.name, t.attribute.def.file ?? null, preferRoots);
      if (!entry?.symbolId) return null;
      const bindable = findBindableDef(entry.def, instruction.to);
      if (!bindable) return null;
      return {
        ownerSymbolId: entry.symbolId,
        ownerDef: entry.def,
        bindable,
        property: instruction.to,
      };
    }
    default:
      return null;
  }
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

function toRefactorResourceOrigin(
  origin: "source" | "config" | "builtin" | undefined,
): RefactorResourceOrigin {
  switch (origin) {
    case "source":
      return "source";
    case "config":
      return "config";
    case "builtin":
      return "builtin";
    default:
      return "unknown";
  }
}

// ============================================================================
// CursorEntity-based rename helpers
// ============================================================================

/** Framework-provided contextual variables (not user-renameable). */
const FRAMEWORK_CONTEXTUAL_VARS = new Set([
  '$index', '$first', '$last', '$even', '$odd', '$length',
  '$this', '$parent', '$event',
]);

/** Framework-owned element names. Defense-in-depth: the origin field should
 *  be "builtin" but may not propagate through all pipeline paths due to
 *  carried-property conservation gaps (see createEmptyCollections fix). */
const FRAMEWORK_CE_NAMES = new Set(['au-compose', 'au-slot', 'au-render']);

/**
 * Workspace-level renameability check beyond the compiler's `isRenameable`.
 * Blocks builtins, configs, contextual vars, and unsupported kinds (TCs).
 */
function isWorkspaceRenameable(entity: CursorEntity): boolean {
  switch (entity.kind) {
    case 'ce-tag':
      if (FRAMEWORK_CE_NAMES.has(entity.name)) return false;
      return entity.element.origin !== 'builtin' && entity.element.origin !== 'config';
    case 'ca-attr':
      return entity.attribute.origin !== 'builtin' && entity.attribute.origin !== 'config';
    case 'tc-attr':
      // TCs are framework-owned — no rename support yet.
      return false;
    case 'value-converter':
      return true;
    case 'binding-behavior':
      return true;
    case 'scope-identifier':
      // Framework contextual variables ($index, $first, etc.) are not renameable
      return !FRAMEWORK_CONTEXTUAL_VARS.has(entity.name);
    default:
      return true;
  }
}

/**
 * Extract the rename target name and span from a CursorEntity.
 */
function extractRenameTarget(entity: CursorEntity): { name: string | null; span: SourceSpan | null } {
  switch (entity.kind) {
    case 'ce-tag': return { name: entity.name, span: entity.span };
    case 'ca-attr': return { name: entity.name, span: entity.span };
    case 'bindable': return { name: entity.bindable.attribute ?? entity.bindable.name ?? null, span: entity.span };
    case 'scope-identifier': return { name: entity.name, span: entity.span };
    case 'member-access': return { name: entity.memberName, span: entity.span };
    case 'local-template-name': return { name: entity.name, span: entity.span };
    case 'value-converter': return { name: entity.name, span: entity.span };
    case 'binding-behavior': return { name: entity.name, span: entity.span };
    default: return { name: null, span: null };
  }
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

// ============================================================================
// Name transformation for cross-boundary rename
// ============================================================================

interface NameTransformation {
  input: string;
  inputForm: NameForm;
  kebab: string;
  camel: string;
  pascal: string;
}

function deriveNameForms(newName: string, inputForm: NameForm): NameTransformation {
  let kebab: string;
  let camel: string;
  let pascal: string;

  switch (inputForm) {
    case "kebab-case":
      kebab = newName;
      camel = kebabToCamel(newName);
      pascal = kebabToPascal(newName);
      break;
    case "camelCase":
      kebab = camelToKebab(newName);
      camel = newName;
      pascal = camel[0] ? camel[0].toUpperCase() + camel.slice(1) : camel;
      break;
    case "PascalCase":
      kebab = camelToKebab(newName);
      camel = newName[0] ? newName[0].toLowerCase() + newName.slice(1) : newName;
      pascal = newName;
      break;
  }

  return { input: newName, inputForm, kebab, camel, pascal };
}

function selectNameForSite(site: TextReferenceSite, transform: NameTransformation): string {
  // For declaration sites that are string literals (decorator-name-property,
  // static-au-name, define-name), the name form in the source is the resource
  // registration name (kebab for CE/CA/TC, camel for VC/BB).
  // For class-name sites, use PascalCase.
  // For bindable-property sites, use camelCase.
  // For template reference sites, use the site's declared nameForm.
  switch (site.referenceKind) {
    case "class-name":
      return transform.pascal;
    case "bindable-property":
    case "bindable-callback":
    case "expression-pipe":
    case "expression-behavior":
      return transform.camel;
    case "bindable-config-key":
      return transform.camel;
    case "tag-name":
    case "close-tag-name":
    case "attribute-name":
    case "as-element-value":
    case "import-element-from":
    case "decorator-name-property":
    case "decorator-string-arg":
    case "static-au-name":
    case "define-name":
    case "local-template-attr":
    case "import-path":
    case "dependencies-class":
    case "dependencies-string":
    case "property-access":
    default:
      return selectByNameForm(site.nameForm, transform);
  }
}

function selectByNameForm(form: NameForm, transform: NameTransformation): string {
  switch (form) {
    case "kebab-case": return transform.kebab;
    case "camelCase": return transform.camel;
    case "PascalCase": return transform.pascal;
  }
}

function findExprResourceSpan(
  compilation: TemplateCompilation,
  offset: number,
  kind: "valueConverter" | "bindingBehavior",
  name: string,
): SourceSpan | null {
  // Walk the expression table for resources of the given kind+name at the offset.
  for (const entry of compilation.exprTable ?? []) {
    const ast = entry.ast as { $kind?: string; name?: { name?: string; span?: SourceSpan } | string; span?: SourceSpan; expression?: unknown } | null;
    if (!ast) continue;
    const target = kind === "valueConverter" ? "ValueConverter" : "BindingBehavior";
    const span = findExprResourceSpanInAst(ast, offset, target, name);
    if (span) return span;
  }
  return null;
}

function findExprResourceSpanInAst(
  node: Record<string, unknown> | null | undefined,
  offset: number,
  kind: string,
  name: string,
): SourceSpan | null {
  if (!node || typeof node !== "object" || !node.$kind) return null;
  if (node.$kind === kind) {
    const ident = node.name;
    const nodeName = typeof ident === "string" ? ident : (ident as { name?: string } | null)?.name;
    if (nodeName === name) {
      const span = typeof ident === "object" && ident !== null ? (ident as { span?: SourceSpan }).span : (node as { span?: SourceSpan }).span;
      if (span && span.start <= offset && offset <= span.end) return span;
    }
  }
  // Walk children
  for (const key of ["expression", "object", "left", "right", "condition", "yes", "no", "target", "value", "func"]) {
    const child = node[key];
    if (child && typeof child === "object") {
      const result = findExprResourceSpanInAst(child as Record<string, unknown>, offset, kind, name);
      if (result) return result;
    }
  }
  return null;
}

function kebabToCamel(value: string): string {
  if (!value.includes("-")) return value;
  return value.replace(/-([a-zA-Z0-9])/g, (_match, captured) => captured.toUpperCase());
}

function kebabToPascal(value: string): string {
  const camel = kebabToCamel(value);
  return camel[0] ? camel[0].toUpperCase() + camel.slice(1) : camel;
}

function camelToKebab(value: string): string {
  return value.replace(/[A-Z]/g, (match, offset) =>
    offset > 0 ? `-${match.toLowerCase()}` : match.toLowerCase(),
  );
}
