import {
  analyzeAttributeName,
  canonicalDocumentUri,
  createBindableSymbolId,
  createLocalSymbolId,
  debug,
  isDebugEnabled,
  normalizePathForId,
  resolveCursorEntity,
  spanContainsOffset,
  spanLength,
  toSourceFileId,
  unwrapSourced,
  type BindableDef,
  type CursorEntity,
  type CursorResolutionResult,
  type ExprId,
  type LinkedInstruction,
  type LinkedRow,
  type FrameId,
  type NodeId,
  type ResourceDef,
  type ScopeFrame,
  type ScopeSymbol,
  type SourceLocation,
  type SourceSpan,
  type SymbolId,
  type TemplateCompilation,
  type AttributeParser,
  type DocumentUri,
  type TemplateSyntaxRegistry,
} from "@aurelia-ls/compiler";
import type {
  ProjectSemanticsDefinitionChannels,
  SemanticSnapshot,
} from "@aurelia-ls/compiler";
import type { WorkspaceLocation, TextReferenceSite } from "./types.js";
import { selectResourceCandidate } from "./resource-precedence-policy.js";
import { buildDomIndex, elementTagSpanAtOffset, findDomNode } from "./template-dom.js";
import {
  collectInstructionHits,
  findBindingBehaviorAtOffset,
  findInstructionHitsAtOffset,
  findValueConverterAtOffset,
} from "./query-helpers.js";

export interface ResourceDefinitionIndex {
  readonly elements: ReadonlyMap<string, ResourceDefinitionEntry[]>;
  readonly attributes: ReadonlyMap<string, ResourceDefinitionEntry[]>;
  readonly controllers: ReadonlyMap<string, ResourceDefinitionEntry[]>;
  readonly valueConverters: ReadonlyMap<string, ResourceDefinitionEntry[]>;
  readonly bindingBehaviors: ReadonlyMap<string, ResourceDefinitionEntry[]>;
  readonly bySymbolId: ReadonlyMap<SymbolId, ResourceDefinitionEntry>;
}

export interface TemplateDefinitionSlices {
  readonly local: WorkspaceLocation[];
  readonly resource: WorkspaceLocation[];
}

export type ResourceDefinitionEntry = {
  readonly def: ResourceDef;
  readonly symbolId?: SymbolId;
};

type AttributeSyntaxContext = {
  syntax: TemplateSyntaxRegistry;
  parser: AttributeParser;
};

export function buildResourceDefinitionIndex(source: {
  readonly definition: ProjectSemanticsDefinitionChannels;
  readonly semanticSnapshot: SemanticSnapshot;
}): ResourceDefinitionIndex {
  const symbols = buildSymbolIdMap(source.semanticSnapshot);
  const elements = new Map<string, ResourceDefinitionEntry[]>();
  const attributes = new Map<string, ResourceDefinitionEntry[]>();
  const controllers = new Map<string, ResourceDefinitionEntry[]>();
  const valueConverters = new Map<string, ResourceDefinitionEntry[]>();
  const bindingBehaviors = new Map<string, ResourceDefinitionEntry[]>();
  const bySymbolId = new Map<SymbolId, ResourceDefinitionEntry>();

  for (const def of source.definition.authority) {
    const name = unwrapSourced(def.name);
    if (!name) continue;
    const entry: ResourceDefinitionEntry = {
      def,
      symbolId: symbols.get(symbolKey(def.kind, name, def.file ?? null)),
    };
    if (entry.symbolId) {
      bySymbolId.set(entry.symbolId, entry);
    }
    switch (def.kind) {
      case "custom-element":
        addEntry(elements, name, entry);
        break;
      case "custom-attribute":
        addEntry(attributes, name, entry);
        break;
      case "template-controller": {
        addEntry(controllers, name, entry);
        const aliases = unwrapSourced(def.aliases) ?? [];
        for (const alias of aliases) {
          addEntry(controllers, alias, entry);
        }
        break;
      }
      case "value-converter":
        addEntry(valueConverters, name, entry);
        break;
      case "binding-behavior":
        addEntry(bindingBehaviors, name, entry);
        break;
      default:
        break;
    }
  }

  return {
    elements,
    attributes,
    controllers,
    valueConverters,
    bindingBehaviors,
    bySymbolId,
  };
}

export function collectTemplateDefinitions(options: {
  compilation: TemplateCompilation;
  text: string;
  offset: number;
  resources: ResourceDefinitionIndex;
  syntax: AttributeSyntaxContext;
  preferRoots?: readonly string[] | null;
  documentUri?: DocumentUri | null;
}): WorkspaceLocation[] {
  const slices = collectTemplateDefinitionSlices(options);
  return [...slices.local, ...slices.resource];
}

/**
 * Callback for resolving a class name to its declaration location via the
 * TS program. Used when a resource has no file location (built-in, plugin,
 * framework class) but does have a class name visible to the TS project.
 */
export type ClassLocationResolver = (className: string) => WorkspaceLocation | null;

export function collectTemplateDefinitionSlices(options: {
  compilation: TemplateCompilation;
  text: string;
  offset: number;
  resources: ResourceDefinitionIndex;
  syntax: AttributeSyntaxContext;
  preferRoots?: readonly string[] | null;
  documentUri?: DocumentUri | null;
  resolveClassLocation?: ClassLocationResolver | null;
}): TemplateDefinitionSlices {
  const { compilation, text, offset, resources } = options;
  const syntax = options.syntax;
  const preferRoots = options.preferRoots ?? [];
  const resource: WorkspaceLocation[] = [];
  const local: WorkspaceLocation[] = [];
  const domIndex = buildDomIndex(compilation.ir.templates ?? []);
  const debugEnabled = isDebugEnabled("workspace");
  if (debugEnabled) {
    debug.workspace("definition.start", { offset, uri: options.documentUri ?? null });
  }

  // ── CursorEntity dispatch (L2 shared resolution) ───────────────────
  //
  // Use the shared CursorEntity resolver as the primary entity detector.
  // This replaces scattered per-position detection (element-hit, controller-
  // hit, VC-hit, BB-hit) with a single unified dispatch for resource-level
  // entities. All features resolve the same entity for a given position;
  // definition.ts projects the resource definition location from it.
  //
  // CursorEntity handles: ce-tag, tc-attr, ca-attr (partial), vc, bb,
  // scope-identifier, member-access, command, plain-attr-binding.
  // Instruction-hit path remains for bindable resolution (not yet in CursorEntity).
  const resolution = resolveCursorEntity({
    compilation,
    offset,
    syntax: syntax.syntax,
  });
  const entity = resolution?.entity ?? null;
  if (debugEnabled) {
    debug.workspace("definition.entity", {
      kind: entity?.kind ?? null,
      confidence: resolution?.compositeConfidence ?? null,
    });
  }

  // Dispatch resource-level entities to definition lookup.
  // Skip entity dispatch when the cursor is on the command portion of an
  // attribute (e.g., ".bind" in "if-not.bind"). The command position should
  // produce no definition — it's a binding mechanic, not a navigable symbol.
  // When CursorEntity returns kind:'command', trust it directly — no secondary
  // check needed. The isOffsetOnCommand fallback handles cases where CursorEntity
  // produces a tc-attr or ca-attr but the cursor is actually on the command suffix.
  const entityOnCommand = entity?.kind === 'command'
    || (entity && (entity.kind === 'tc-attr' || entity.kind === 'ca-attr')
      ? isOffsetOnCommand(compilation, offset, syntax)
      : false);
  const entityDef = entity && !entityOnCommand
    ? resolveResourceEntityDefinition(entity, resources, preferRoots, options.resolveClassLocation)
    : null;
  if (entityDef) resource.push(entityDef);

  // ── Template controller direct check ───────────────────────────────
  //
  // controllerAt is the authoritative TC check — it uses the linked instruction
  // spans directly.
  //
  // GUARD: Skip when cursor is inside the attribute value. The controllerAt
  // span covers the full TC attribute (name + value). When cursor is inside
  // the value (e.g., `getItemsByStatus` in `repeat.for="... getItemsByStatus(...)"`),
  // the expression should navigate to the VM, not to the TC resource.
  if (resource.length === 0 && !entityOnCommand) {
    const controller = compilation.query.controllerAt(offset);
    if (controller && !isOffsetInAttrValue(text, controller.span?.start ?? 0, offset)) {
      const entry = findEntry(resources.controllers, controller.kind, null, preferRoots);
      const location = entry ? resourceLocation(entry) : null;
      if (location) resource.push(location);
    }
  }

  // ── Instruction-hit fallback (bindable + CA resolution) ────────────
  //
  // When CursorEntity didn't produce a resource definition, fall back to
  // instruction-hit matching for bindable property resolution (the entity
  // resolver doesn't yet produce bindable entities with parent context).
  // Also handles custom attribute instructions not yet covered by entity.
  if (!entityDef) {
    const elementHit = findElementDefinitionHit(compilation, domIndex, offset);
    if (debugEnabled) {
      debug.workspace("definition.element", {
        hit: !!elementHit,
        templateIndex: elementHit?.templateIndex ?? null,
        nodeId: elementHit?.row.target ?? null,
        tag: elementHit?.row.node.tag ?? null,
        tagSpan: elementHit?.tagSpan ?? null,
      });
    }
    if (elementHit) {
      const { row, tagSpan } = elementHit;
      const resolved = row.node.custom?.def ?? null;
      const entry = resolved
        ? findEntry(resources.elements, resolved.name, resolved.file ?? null)
        : null;
      const location = entry ? resourceLocation(entry) : null;
      if (location && tagSpan) resource.push(location);
    }

    const instructionHits = findInstructionHitsAtOffset(compilation.linked.templates, compilation.ir.templates ?? [], domIndex, offset);
    for (const hit of instructionHits) {
      const nameSpan = hit.attrNameSpan ?? null;
      if (!nameSpan || !spanContainsOffset(nameSpan, offset)) continue;
      const attrName = hit.attrName ?? null;
      if (!attrName) continue;
      const spans = resolveAttributeSpans(attrName, nameSpan, syntax);
      const matchSpan = spans.target ?? nameSpan;
      if (!spanContainsOffset(matchSpan, offset)) continue;
      if (spans.command && spanContainsOffset(spans.command, offset)) continue;
      const defs = definitionsForInstruction(hit.instruction, resources, preferRoots);
      if (defs.length) resource.push(...defs);
    }
  }

  // ── Resource reference hits (symbolId safety net) ──────────────────
  //
  // Cross-template symbolId matching catches any remaining positions
  // where the cursor overlaps a resource reference span.
  // Skip when the cursor is on a command — commands are binding mechanics
  // with no navigable definition, and reference spans for TC/CA attributes
  // cover the full attribute including the command suffix.
  if (resource.length === 0 && !entityOnCommand) {
    const resourceHits = collectTemplateResourceReferences({
      compilation,
      resources,
      syntax,
      preferRoots,
      documentUri: options.documentUri ?? null,
    });
    for (const hit of resourceHits) {
      if (!hit.symbolId || !spanContainsOffset(hit.span, offset)) continue;
      // Skip TC/CA reference hits when cursor is inside the attribute value.
      // These reference spans cover the full attribute (name + value), but
      // definition should only navigate to the resource from the name portion.
      if ((hit.referenceKind === "attribute-name") && isOffsetInAttrValue(text, hit.span.start, offset)) continue;
      const entry = resources.bySymbolId.get(hit.symbolId);
      const location = entry ? resourceLocation(entry) : null;
      if (location) resource.push(location);
    }
  }

  // ── Local scope definition (expression identifiers) ────────────────
  const localDef = findLocalScopeDefinition(compilation, text, offset, options.documentUri ?? null);
  if (localDef) local.push(localDef);

  return { local, resource };
}

// ── CursorEntity → Definition Location dispatch ──────────────────────
//
// Maps resource-level CursorEntity kinds to their definition locations
// via the ResourceDefinitionIndex. Returns null for non-resource entities
// or entities whose definitions aren't in the index.
function resolveResourceEntityDefinition(
  entity: CursorEntity,
  resources: ResourceDefinitionIndex,
  preferRoots: readonly string[],
  resolveClassLocation?: ClassLocationResolver | null,
): WorkspaceLocation | null {
  let entry: ResourceDefinitionEntry | null = null;
  switch (entity.kind) {
    case 'ce-tag':
      entry = findEntry(resources.elements, entity.name, null, preferRoots);
      break;
    case 'tc-attr':
      entry = findEntry(resources.controllers, entity.name, null, preferRoots);
      break;
    case 'ca-attr':
      entry = findEntry(resources.attributes, entity.name, null, preferRoots);
      break;
    case 'value-converter':
      entry = findEntry(resources.valueConverters, entity.name, null, preferRoots);
      break;
    case 'binding-behavior':
      entry = findEntry(resources.bindingBehaviors, entity.name, null, preferRoots);
      break;
    case 'as-element':
      entry = findEntry(resources.elements, entity.targetCEName, null, preferRoots);
      break;
    default:
      return null;
  }
  if (!entry) return null;

  // Primary path: resource has a source location from discovery/convergence
  const location = resourceLocation(entry);
  if (location) return location;

  // Fallback: resource has no usable file location (builtin, framework, plugin)
  // but has a className. Try to resolve the class through the TS program.
  if (resolveClassLocation) {
    const className = unwrapSourced(entry.def.className);
    if (className) {
      const resolved = resolveClassLocation(className);
      if (resolved) {
        return entry.symbolId ? { ...resolved, symbolId: entry.symbolId } : resolved;
      }
    }
  }
  return null;
}

export function collectTemplateReferences(options: {
  compilation: TemplateCompilation;
  text: string;
  offset: number;
  documentUri?: DocumentUri | null;
}): WorkspaceLocation[] {
  const { compilation, offset } = options;
  const scopeTemplate = compilation.scope?.templates?.[0];
  if (!scopeTemplate) return [];

  const lookup = buildScopeLookup(scopeTemplate);
  const match = findLocalScopeSymbolAtOffset(compilation, offset, lookup);
  if (!match) return [];

  const symbolId = localSymbolId(options.documentUri ?? null, match);
  const results: WorkspaceLocation[] = [];
  const documentUri = options.documentUri ?? null;
  if (match.symbol.span) {
    const loc = spanLocation(match.symbol.span, documentUri);
    if (loc) results.push(symbolId ? { ...loc, symbolId } : loc);
  }

  const exprTable = compilation.exprTable ?? [];
  for (const entry of exprTable) {
    const frameId = lookup.exprToFrame.get(entry.id) ?? lookup.rootFrameId;
    if (frameId == null) continue;
    const frame = lookup.frameById.get(frameId);
    if (!frame) continue;
    const accesses: AccessScopeInfo[] = [];
    collectAccessScopeNodes(entry.ast as ExpressionAst, accesses);
    for (const access of accesses) {
      const resolved = resolveSymbol(frame, lookup.frameById, access.name, access.ancestor ?? 0);
      if (!resolved) continue;
      if (resolved.frame.id !== match.frame.id || resolved.symbol.name !== match.symbol.name) continue;
      const loc = spanLocation(access.span, documentUri);
      if (loc) results.push(symbolId ? { ...loc, symbolId } : loc);
    }
  }

  return results;
}

export function collectTemplateResourceReferences(options: {
  compilation: TemplateCompilation;
  resources: ResourceDefinitionIndex;
  syntax: AttributeSyntaxContext;
  preferRoots?: readonly string[] | null;
  documentUri?: DocumentUri | null;
}): TextReferenceSite[] {
  const { compilation, resources } = options;
  const syntax = options.syntax;
  const preferRoots = options.preferRoots ?? [];
  const results: TextReferenceSite[] = [];
  const documentUri = options.documentUri ?? null;

  // ── CE tag references ──
  // NodeSem carries positional provenance (tagSpan, closeTagSpan,
  // asElementValueSpan) from the IR DOM through the link boundary.
  // No DOM index rebuild needed for tag references.
  for (const template of compilation.linked.templates) {
    if (!template) continue;
    for (const row of template.rows ?? []) {
      if (row.node.kind !== "element") continue;
      const entry = row.node.custom?.def
        ? findEntry(resources.elements, row.node.custom.def.name, row.node.custom.def.file ?? null, preferRoots)
        : null;
      if (!entry?.symbolId) continue;
      if (row.node.tagSpan) {
        const loc = spanLocation(row.node.tagSpan, documentUri);
        if (loc) results.push({ kind: "text", referenceKind: "tag-name", nameForm: "kebab-case", ...loc, symbolId: entry.symbolId, nodeId: row.target });
      }
      if (row.node.closeTagSpan) {
        const loc = spanLocation(row.node.closeTagSpan, documentUri);
        if (loc) results.push({ kind: "text", referenceKind: "close-tag-name", nameForm: "kebab-case", ...loc, symbolId: entry.symbolId, nodeId: row.target });
      }
      // as-element value span: when element identity is overridden via
      // <div as-element="my-ce">, emit the value as an additional reference
      // site for the target CE.
      if (row.node.asElementValueSpan) {
        const loc = spanLocation(row.node.asElementValueSpan, documentUri);
        if (loc) results.push({ kind: "text", referenceKind: "as-element-value", nameForm: "kebab-case", ...loc, symbolId: entry.symbolId });
      }
    }
  }

  // ── Local template declaration references ──
  // Local templates (<template as-custom-element="name">) produce IR DOM
  // nodes (kind: "template") that don't generate linked rows (skipped by
  // the row collector). Walk the IR DOM for these declarations and emit
  // references using the same symbolId as the tag usages above.
  for (const template of compilation.linked.templates) {
    if (!template?.dom) continue;
    collectLocalTemplateDeclarationRefsFromDom(template.dom, resources, documentUri, preferRoots, results);
  }

  // ── Instruction references (CA, TC, bindable) ──
  // DOM index still needed for attribute name extraction on instructions.
  const domIndex = buildDomIndex(compilation.ir.templates ?? []);
  const instructionHits = collectInstructionHits(compilation.linked.templates, compilation.ir.templates ?? [], domIndex);
  for (const hit of instructionHits) {
    const nameSpan = hit.attrNameSpan ?? null;
    // TC attributes are consumed during compilation — attrNameSpan will
    // be null. Use the instruction's loc span directly for TC references.
    if (hit.instruction.kind === "hydrateTemplateController") {
      const entry = findEntry(resources.controllers, hit.instruction.res, null, preferRoots);
      if (!entry?.symbolId) continue;
      const loc = spanLocation(hit.loc, documentUri);
      if (loc) results.push({ kind: "text", referenceKind: "attribute-name", nameForm: "kebab-case", ...loc, symbolId: entry.symbolId });
      continue;
    }
    if (!nameSpan) continue;
    const attrName = hit.attrName ?? null;
    const span = attrName ? (resolveAttributeSpans(attrName, nameSpan, syntax).target ?? nameSpan) : nameSpan;
    switch (hit.instruction.kind) {
      case "hydrateAttribute": {
        const res = hit.instruction.res?.def ?? null;
        const entry = res
          ? findEntry(resources.attributes, res.name, res.file ?? null)
          : null;
        if (!entry?.symbolId) break;
        const loc = spanLocation(span, documentUri);
        if (loc) results.push({ kind: "text", referenceKind: "attribute-name", nameForm: "kebab-case", ...loc, symbolId: entry.symbolId });
        break;
      }
      case "propertyBinding":
      case "attributeBinding":
      case "setProperty": {
        const target = hit.instruction.target as { kind?: string } | null | undefined;
        if (!target || typeof target !== "object" || !("kind" in target)) break;
        const symbolId = bindableSymbolIdForTarget(target, hit.instruction.to, resources);
        if (!symbolId) break;
        const loc = spanLocation(span, documentUri);
        if (loc) results.push({ kind: "text", referenceKind: "attribute-name", nameForm: "kebab-case", ...loc, symbolId });
        break;
      }
      default:
        break;
    }
  }

  // ── Expression references (VC, BB) ──
  const exprRefs = collectExprResources(compilation.exprTable ?? []);
  for (const ref of exprRefs) {
    const entry = ref.kind === "valueConverter"
      ? findEntry(resources.valueConverters, ref.name, null, preferRoots)
      : findEntry(resources.bindingBehaviors, ref.name, null, preferRoots);
    if (!entry?.symbolId) continue;
    const loc = spanLocation(ref.span, documentUri);
    if (!loc) continue;
    const referenceKind = ref.kind === "valueConverter" ? "expression-pipe" as const : "expression-behavior" as const;
    results.push({ kind: "text", referenceKind, nameForm: "camelCase", ...loc, symbolId: entry.symbolId, exprId: ref.exprId });
  }

  return results;
}

/**
 * Collects TS-side reference sites for all resources in the definition index.
 *
 * For each resource, extracts references from the already-computed ResourceDef
 * provenance: declaration name locations, class name locations, bindable
 * property locations, and bindable callback locations.
 *
 * This is the second half of the dual-scope reference system — template
 * references come from collectTemplateResourceReferences, TS references
 * come from here. Both return TextReferenceSite[] and merge into a
 * unified index.
 */
export function collectTypeScriptResourceReferences(options: {
  resources: ResourceDefinitionIndex;
}): TextReferenceSite[] {
  const { resources } = options;
  const results: TextReferenceSite[] = [];

  const collectForMap = (map: ReadonlyMap<string, ResourceDefinitionEntry[]>) => {
    for (const entries of map.values()) {
      for (const entry of entries) {
        collectResourceDefReferences(entry, results);
      }
    }
  };

  collectForMap(resources.elements);
  collectForMap(resources.attributes);
  collectForMap(resources.controllers);
  collectForMap(resources.valueConverters);
  collectForMap(resources.bindingBehaviors);

  return results;
}

function collectResourceDefReferences(
  entry: ResourceDefinitionEntry,
  results: TextReferenceSite[],
): void {
  const { def, symbolId } = entry;
  if (!symbolId) return;

  // Declaration name site — the name property in the decorator/$au/define/local-template
  const nameLoc = readLocation(def.name);
  if (nameLoc && isNavigableSourceLocation(nameLoc)) {
    const referenceKind = inferDeclarationReferenceKind(def);
    const uri = canonicalDocumentUri(nameLoc.file).uri;
    const span: SourceSpan = { start: nameLoc.pos, end: nameLoc.end, file: toSourceFileId(nameLoc.file) };
    results.push({ kind: "text", referenceKind, nameForm: "kebab-case", uri, span, symbolId });
  }

  // Class name site — the class declaration identifier
  const classNameLoc = readLocation(def.className);
  if (classNameLoc && isNavigableSourceLocation(classNameLoc)) {
    const uri = canonicalDocumentUri(classNameLoc.file).uri;
    const span: SourceSpan = { start: classNameLoc.pos, end: classNameLoc.end, file: toSourceFileId(classNameLoc.file) };
    results.push({ kind: "text", referenceKind: "class-name", nameForm: "PascalCase", uri, span, symbolId });
  }

  // Bindable property sites
  if ("bindables" in def && def.bindables) {
    const bindables = def.bindables as Readonly<Record<string, BindableDef>>;
    for (const [propName, bindable] of Object.entries(bindables)) {
      const bindableSymbolId = createBindableSymbolId({ owner: symbolId, property: propName });

      // The @bindable property declaration
      const propLoc = readLocation(bindable.property);
      if (propLoc && isNavigableSourceLocation(propLoc)) {
        const uri = canonicalDocumentUri(propLoc.file).uri;
        const span: SourceSpan = { start: propLoc.pos, end: propLoc.end, file: toSourceFileId(propLoc.file) };
        results.push({ kind: "text", referenceKind: "bindable-property", nameForm: "camelCase", uri, span, symbolId: bindableSymbolId });
      }

      // The attribute declaration site (from definition object bindable config)
      const attrLoc = readLocation(bindable.attribute);
      if (attrLoc && isNavigableSourceLocation(attrLoc)) {
        const uri = canonicalDocumentUri(attrLoc.file).uri;
        const span: SourceSpan = { start: attrLoc.pos, end: attrLoc.end, file: toSourceFileId(attrLoc.file) };
        results.push({ kind: "text", referenceKind: "bindable-config-key", nameForm: "kebab-case", uri, span, symbolId: bindableSymbolId });
      }
    }
  }
}

/** Infers the declaration-site referenceKind from the ResourceDef's provenance. */
function inferDeclarationReferenceKind(def: ResourceDef): TextReferenceSite["referenceKind"] {
  const nameSourcing = def.name;
  if (!nameSourcing || typeof nameSourcing !== "object") return "decorator-name-property";
  if ("origin" in nameSourcing) {
    if (nameSourcing.origin === "builtin") return "decorator-name-property";
    if (nameSourcing.origin === "config") return "decorator-name-property";
  }
  // For source-derived names, we can't easily distinguish decorator vs $au vs define
  // from the Sourced<T> envelope alone. Default to decorator-name-property.
  // The rename engine uses this for annotation grouping, not edit mechanics —
  // edit mechanics use readLocation directly.
  return "decorator-name-property";
}

function isNavigableSourceLocation(loc: SourceLocation): boolean {
  if (loc.pos === 0 && loc.end === 0) return false;
  if (!loc.file || !loc.file.match(/\.[a-z]+$/i)) return false;
  return true;
}

// ============================================================================
// Local template declaration reference helper
// ============================================================================

type IrDomNode = {
  kind: string;
  tag?: string;
  attrs?: readonly { name: string; value: string | null; loc?: SourceSpan | null; valueLoc?: SourceSpan | null }[];
  children?: readonly IrDomNode[];
};

/**
 * Walk the linked template's DOM for `<template as-custom-element="name">`
 * declarations and emit reference sites. These declarations are skipped by
 * the row collector (no linked row), but the DOM nodes survive. Looks up
 * the local template name in the resource index to get the proper symbolId
 * (local templates are now injected into definition.authority at the project
 * semantics level).
 */
function collectLocalTemplateDeclarationRefsFromDom(
  node: IrDomNode,
  resources: ResourceDefinitionIndex,
  documentUri: DocumentUri | null,
  preferRoots: readonly string[],
  results: TextReferenceSite[],
): void {
  if (node.kind === "template" && node.attrs) {
    for (const attr of node.attrs) {
      if (attr.name === "as-custom-element" && attr.value) {
        const localName = attr.value.toLowerCase();
        const entry = findEntry(resources.elements, localName, null, preferRoots);
        if (entry?.symbolId) {
          const span = attr.valueLoc ?? attr.loc;
          if (span) {
            const loc = spanLocation(span, documentUri);
            if (loc) results.push({ kind: "text", referenceKind: "local-template-attr", nameForm: "kebab-case", ...loc, symbolId: entry.symbolId });
          }
        }
      }
    }
  }
  if (node.children) {
    for (const child of node.children) {
      collectLocalTemplateDeclarationRefsFromDom(child, resources, documentUri, preferRoots, results);
    }
  }
}

function findRow(
  templates: readonly { rows: readonly LinkedRow[] }[],
  templateIndex: number,
  nodeId: NodeId,
): LinkedRow | null {
  const template = templates[templateIndex];
  if (!template) return null;
  return template.rows.find((row) => row.target === nodeId) ?? null;
}

type ElementDefinitionHit = {
  row: LinkedRow & { node: { kind: "element"; tag: string; custom?: { def?: { name: string; file?: string } } } };
  tagSpan: SourceSpan;
  templateIndex: number;
};

function findElementDefinitionHit(
  compilation: TemplateCompilation,
  domIndex: ReturnType<typeof buildDomIndex>,
  offset: number,
): ElementDefinitionHit | null {
  const node = compilation.query.nodeAt(offset);
  if (node?.kind === "element") {
    const row = findRow(compilation.linked.templates, node.templateIndex, node.id);
    if (row?.node.kind === "element") {
      const domNode = findDomNode(domIndex, node.templateIndex, node.id);
      const tagSpan = domNode && domNode.kind === "element" ? elementTagSpanAtOffset(domNode, offset) : null;
      if (tagSpan) {
        return { row: row as ElementDefinitionHit["row"], tagSpan, templateIndex: node.templateIndex };
      }
    }
  }
  return null;
}


function definitionsForInstruction(
  instruction: LinkedInstruction,
  resources: ResourceDefinitionIndex,
  preferRoots: readonly string[],
): WorkspaceLocation[] {
  switch (instruction.kind) {
    case "hydrateAttribute": {
      const res = instruction.res?.def ?? null;
      if (!res) return [];
      const entry = findEntry(resources.attributes, res.name, res.file ?? null);
      const location = entry ? resourceLocation(entry) : null;
      return location ? [location] : [];
    }
    case "hydrateTemplateController": {
      const entry = findEntry(resources.controllers, instruction.res, null, preferRoots);
      const location = entry ? resourceLocation(entry) : null;
      return location ? [location] : [];
    }
    case "propertyBinding":
    case "attributeBinding":
    case "setProperty": {
      const target = instruction.target as { kind?: string } | null | undefined;
      if (!target || typeof target !== "object" || !("kind" in target)) return [];
      return bindableLocationsForTarget(target, instruction.to, resources);
    }
    default:
      return [];
  }
}

function bindableSymbolIdForTarget(
  target: { kind?: string },
  to: string,
  resources: ResourceDefinitionIndex,
): SymbolId | null {
  const resolved = resolveBindableForTarget(target, to, resources);
  if (!resolved?.entry.symbolId) return null;
  return bindableSymbolId(resolved.entry.symbolId, resolved.property);
}

function bindableLocationsForTarget(
  target: { kind?: string },
  to: string,
  resources: ResourceDefinitionIndex,
): WorkspaceLocation[] {
  const resolved = resolveBindableForTarget(target, to, resources);
  if (!resolved) return [];
  const symbolId = resolved.entry.symbolId ? bindableSymbolId(resolved.entry.symbolId, resolved.property) : undefined;
  const location = bindableLocation(resolved.entry.def, resolved.bindable, symbolId);
  return location ? [location] : [];
}

function resolveBindableForTarget(
  target: { kind?: string },
  to: string,
  resources: ResourceDefinitionIndex,
): { entry: ResourceDefinitionEntry; bindable: BindableDef; property: string } | null {
  switch (target.kind) {
    case "element.bindable": {
      const t = target as { element: { def: { name: string; file?: string } } };
      const entry = findEntry(resources.elements, t.element.def.name, t.element.def.file ?? null);
      if (!entry) return null;
      const bindable = findBindableDef(entry.def, to);
      return bindable ? { entry, bindable, property: to } : null;
    }
    case "attribute.bindable": {
      const t = target as { attribute: { def: { name: string; file?: string; isTemplateController?: boolean } } };
      const map = t.attribute.def.isTemplateController ? resources.controllers : resources.attributes;
      const entry = findEntry(map, t.attribute.def.name, t.attribute.def.file ?? null);
      if (!entry) return null;
      const bindable = findBindableDef(entry.def, to);
      return bindable ? { entry, bindable, property: to } : null;
    }
    case "controller.prop": {
      const t = target as { controller: { res: string } };
      const entry = findEntry(resources.controllers, t.controller.res, null);
      if (!entry) return null;
      const bindable = findBindableDef(entry.def, to);
      return bindable ? { entry, bindable, property: to } : null;
    }
    default:
      return null;
  }
}

function findBindableDef(def: ResourceDef, name: string): BindableDef | null {
  if (!("bindables" in def) || !def.bindables) return null;
  const record = def.bindables as Readonly<Record<string, BindableDef>>;
  if (record[name]) return record[name]!;
  const camel = dashToCamel(name);
  return record[camel] ?? null;
}

function resourceLocation(entry: ResourceDefinitionEntry): WorkspaceLocation | null {
  const loc = resourceSourceLocation(entry.def);
  if (!loc) return null;
  if (!entry.symbolId && isDebugEnabled("workspace")) {
    debug.workspace("definition.resource.noSymbol", {
      kind: entry.def.kind,
      name: resourceDebugName(entry.def),
      file: entry.def.file ?? null,
    });
  }
  return sourceLocationToWorkspaceLocation(loc, entry.symbolId);
}

function bindableLocation(def: ResourceDef, bindable: BindableDef, symbolId?: SymbolId): WorkspaceLocation | null {
  const loc =
    readLocation(bindable.property)
    ?? readLocation(bindable.attribute)
    ?? resourceSourceLocation(def);
  if (!loc) return null;
  const base = sourceLocationToWorkspaceLocation(loc);
  return symbolId ? { ...base, symbolId } : base;
}

function sourceLocationToWorkspaceLocation(loc: SourceLocation, symbolId?: SymbolId): WorkspaceLocation {
  const canonical = canonicalDocumentUri(loc.file);
  const span: SourceSpan = { start: loc.pos, end: loc.end, file: toSourceFileId(loc.file) };
  return {
    uri: canonical.uri,
    span,
    ...(symbolId ? { symbolId } : {}),
  };
}

function resourceSourceLocation(def: ResourceDef): SourceLocation | null {
  const classLoc = readLocation(def.className);
  if (classLoc && isNavigableLocation(classLoc)) return classLoc;
  const nameLoc = readLocation(def.name);
  if (nameLoc && isNavigableLocation(nameLoc)) return nameLoc;
  if (def.file && def.file.endsWith(".ts")) {
    return { file: def.file, pos: 0, end: 0 };
  }
  return null;
}

/** A location is navigable if it points to a real source file, not a placeholder. */
function isNavigableLocation(loc: SourceLocation): boolean {
  // Placeholder locations (workspace root, config directory) have zero-span
  // and point to directories, not source files. These are convergence artifacts
  // from configSourced() — the config file is the workspace root, not the
  // actual class declaration.
  if (loc.pos === 0 && loc.end === 0 && !loc.file.match(/\.[a-z]+$/i)) return false;
  return true;
}

function resourceDebugName(def: ResourceDef): string | null {
  return unwrapSourced(def.name) ?? null;
}

export function findEntry(
  map: ReadonlyMap<string, ResourceDefinitionEntry[]>,
  name: string,
  file: string | null,
  preferRoots?: readonly string[] | null,
): ResourceDefinitionEntry | null {
  // Try exact match first (VC/BB names are case-sensitive camelCase),
  // then fall back to lowercase (CE/CA names are always kebab-case).
  const list = map.get(name) ?? map.get(name.toLowerCase());
  return selectResourceCandidate(list, {
    file,
    preferredRoots: preferRoots ?? [],
  });
}

function buildSymbolIdMap(snapshot: SemanticSnapshot): Map<string, SymbolId> {
  const map = new Map<string, SymbolId>();
  for (const symbol of snapshot.symbols) {
    const key = symbolKey(symbol.kind, symbol.name, symbol.source ?? null);
    if (!map.has(key)) map.set(key, symbol.id);
  }
  return map;
}

function symbolKey(kind: string, name: string, source: string | null): string {
  const sourceKey = source ? String(normalizePathForId(source)) : "";
  return `${kind}|${name}|${sourceKey}`;
}

function addEntry(
  map: Map<string, ResourceDefinitionEntry[]>,
  name: string,
  entry: ResourceDefinitionEntry,
): void {
  // Use the name verbatim as the map key. CE/CA/TC names are already kebab-case
  // from the naming pipeline. VC/BB names are camelCase and case-sensitive.
  // The findEntry() lookup does exact-then-lowercase fallback for tolerance.
  const list = map.get(name);
  if (list) {
    list.push(entry);
    return;
  }
  map.set(name, [entry]);
}

function readLocation(value: unknown): SourceLocation | null {
  if (!value || typeof value !== "object") return null;
  if ("location" in value) {
    const loc = (value as { location?: SourceLocation }).location;
    return loc ?? null;
  }
  return null;
}

function dashToCamel(value: string): string {
  if (!value.includes("-")) return value;
  return value.replace(/-([a-z])/g, (_match, chr: string) => chr.toUpperCase());
}

function isOffsetOnCommand(
  compilation: TemplateCompilation,
  offset: number,
  syntax: AttributeSyntaxContext,
): boolean {
  const domIndex = buildDomIndex(compilation.ir.templates ?? []);
  const hits = findInstructionHitsAtOffset(compilation.linked.templates, compilation.ir.templates ?? [], domIndex, offset);
  for (const hit of hits) {
    const nameSpan = hit.attrNameSpan ?? null;
    if (!nameSpan || !spanContainsOffset(nameSpan, offset)) continue;
    const attrName = hit.attrName ?? null;
    if (!attrName) continue;
    const spans = resolveAttributeSpans(attrName, nameSpan, syntax);
    if (spans.command && spanContainsOffset(spans.command, offset)) return true;
  }
  return false;
}

function resolveAttributeSpans(
  attrName: string,
  nameSpan: SourceSpan,
  syntax: AttributeSyntaxContext,
): { target: SourceSpan | null; command: SourceSpan | null } {
  const analysis = analyzeAttributeName(attrName, syntax.syntax, syntax.parser);
  const target = analysis.targetSpan
    ? {
      start: nameSpan.start + analysis.targetSpan.start,
      end: nameSpan.start + analysis.targetSpan.end,
      file: nameSpan.file,
    }
    : null;
  const command = analysis.commandSpan
    ? {
      start: nameSpan.start + analysis.commandSpan.start,
      end: nameSpan.start + analysis.commandSpan.end,
      file: nameSpan.file,
    }
    : null;
  return { target, command };
}


type ScopeLookup = {
  frames: ScopeFrame[];
  frameById: Map<FrameId, ScopeFrame>;
  exprToFrame: ReadonlyMap<ExprId, FrameId>;
  rootFrameId: FrameId | null;
};

type ScopeSymbolMatch = {
  frame: ScopeFrame;
  symbol: ScopeSymbol;
};

type AccessScopeInfo = {
  name: string;
  ancestor?: number;
  span: SourceSpan;
};

function buildScopeLookup(scopeTemplate: { frames: ScopeFrame[]; exprToFrame: ReadonlyMap<ExprId, FrameId>; root?: FrameId | null }): ScopeLookup {
  const frames = scopeTemplate.frames as ScopeFrame[];
  const frameById = new Map<FrameId, ScopeFrame>();
  for (const frame of frames) frameById.set(frame.id, frame);
  const rootFrameId = scopeTemplate.root ?? frames[0]?.id ?? null;
  return {
    frames,
    frameById,
    exprToFrame: scopeTemplate.exprToFrame as ReadonlyMap<ExprId, FrameId>,
    rootFrameId,
  };
}

function findLocalScopeSymbolAtOffset(
  compilation: TemplateCompilation,
  offset: number,
  lookup: ScopeLookup,
): ScopeSymbolMatch | null {
  const exprHit = compilation.query.exprAt(offset);
  const exprFallback = exprHit ?? findExprSpanAtOffset(compilation.exprSpans, offset);
  if (!exprFallback) return null;

  const exprId = exprFallback.exprId;
  const frameId = exprHit?.frameId ?? lookup.exprToFrame.get(exprId) ?? lookup.rootFrameId;
  if (frameId == null) return null;

  const entry = findExprEntry(compilation.exprTable, exprId);
  const access = entry ? findAccessScopeAtOffset(entry.ast as ExpressionAst, offset) : null;

  let name = access?.name ?? null;
  let ancestorDepth = access?.ancestor ?? 0;
  let rootOnly = true;
  if (!name && exprHit?.memberPath) {
    const parsed = parseLocalPath(exprHit.memberPath);
    if (!parsed) return null;
    name = parsed.name;
    ancestorDepth = parsed.ancestorDepth;
    rootOnly = parsed.rootOnly;
  }
  if (!name || !rootOnly) return null;

  const startFrame = lookup.frameById.get(frameId);
  if (!startFrame) return null;
  return resolveSymbol(startFrame, lookup.frameById, name, ancestorDepth);
}

function findLocalScopeDefinition(
  compilation: TemplateCompilation,
  text: string,
  offset: number,
  documentUri: DocumentUri | null,
): WorkspaceLocation | null {
  const scopeTemplate = compilation.scope?.templates?.[0];
  if (!scopeTemplate) return null;

  const lookup = buildScopeLookup(scopeTemplate);
  const match = findLocalScopeSymbolAtOffset(compilation, offset, lookup);
  if (!match?.symbol.span) return null;
  const loc = spanLocation(match.symbol.span, documentUri);
  if (!loc) return null;
  const symbolId = localSymbolId(documentUri, match);
  return symbolId ? { ...loc, symbolId } : loc;
}

function ascendFrame(
  start: ScopeFrame,
  frameById: Map<FrameId, ScopeFrame>,
  depth: number,
): ScopeFrame | null {
  let current: ScopeFrame | null = start;
  for (let i = 0; i < depth; i += 1) {
    if (!current?.parent) return null;
    current = frameById.get(current.parent) ?? null;
  }
  return current;
}

function resolveSymbol(
  start: ScopeFrame,
  frameById: Map<FrameId, ScopeFrame>,
  name: string,
  ancestorDepth: number,
): ScopeSymbolMatch | null {
  const resolvedFrame = ascendFrame(start, frameById, ancestorDepth);
  if (!resolvedFrame) return null;
  return findSymbolInScope(resolvedFrame, frameById, name);
}

function findSymbolInScope(
  start: ScopeFrame,
  frameById: Map<FrameId, ScopeFrame>,
  name: string,
): ScopeSymbolMatch | null {
  let current: ScopeFrame | null = start;
  while (current) {
    const match = current.symbols.find((symbol) => symbol.name === name);
    if (match) return { frame: current, symbol: match };
    if (!current.parent) return null;
    current = frameById.get(current.parent) ?? null;
  }
  return null;
}

function spanLocation(span: SourceSpan, documentUri: DocumentUri | null): WorkspaceLocation | null {
  if (documentUri) {
    const canonical = canonicalDocumentUri(documentUri);
    return { uri: canonical.uri, span: { ...span, file: canonical.file } };
  }
  if (!span.file) return null;
  const canonical = canonicalDocumentUri(span.file);
  return { uri: canonical.uri, span };
}

function localSymbolId(documentUri: DocumentUri | null, match: ScopeSymbolMatch): SymbolId | null {
  const canonical = documentUri ? canonicalDocumentUri(documentUri) : null;
  const file = match.symbol.span?.file ?? canonical?.file ?? null;
  if (!file) return null;
  return createLocalSymbolId({
    file,
    frame: String(match.frame.id),
    name: match.symbol.name,
  });
}

function bindableSymbolId(owner: SymbolId, property: string): SymbolId {
  return createBindableSymbolId({ owner, property });
}

function parseLocalPath(path: string): { name: string; ancestorDepth: number; rootOnly: boolean } | null {
  let working = path;
  let ancestorDepth = 0;
  if (working.startsWith("$parent^")) {
    const rest = working.slice("$parent^".length);
    const match = rest.match(/^(\d+)(.*)$/);
    if (!match) return null;
    ancestorDepth = Number(match[1] ?? 0);
    working = match[2] ?? "";
    if (working.startsWith(".")) {
      working = working.slice(1);
    } else if (!working) {
      return null;
    }
  } else if (working.startsWith("$parent")) {
    let prefix = "$parent";
    let depth = 1;
    while (working.startsWith(`${prefix}.$parent`)) {
      prefix += ".$parent";
      depth += 1;
    }
    ancestorDepth = depth;
    if (working === prefix) return null;
    if (!working.startsWith(`${prefix}.`)) return null;
    working = working.slice(prefix.length + 1);
  }
  if (working.startsWith("$this") || working.startsWith("$vm") || working.startsWith("$parent")) return null;
  const sepIndex = working.search(/[.\[]/);
  const rootOnly = sepIndex === -1;
  const name = (sepIndex === -1 ? working : working.slice(0, sepIndex)).trim();
  if (!name) return null;
  return { name, ancestorDepth, rootOnly };
}

function findExprSpanAtOffset(
  exprSpans: ReadonlyMap<ExprId, SourceSpan>,
  offset: number,
): { exprId: ExprId; span: SourceSpan } | null {
  let best: { exprId: ExprId; span: SourceSpan } | null = null;
  let bestLen = Number.POSITIVE_INFINITY;
  for (const [exprId, span] of exprSpans) {
    if (!spanContainsOffset(span, offset)) continue;
    const len = spanLength(span);
    if (len < bestLen) {
      bestLen = len;
      best = { exprId, span };
    }
  }
  return best;
}

function findExprEntry(
  exprTable: readonly { id: ExprId; ast: unknown }[],
  exprId: ExprId,
): { id: ExprId; ast: unknown } | null {
  for (const entry of exprTable) {
    if (entry.id === exprId) return entry;
  }
  return null;
}

function findAccessScopeAtOffset(
  node: ExpressionAst | null | undefined,
  offset: number,
): { name: string; ancestor?: number; span?: SourceSpan } | null {
  let best: { name: string; ancestor?: number; span?: SourceSpan } | null = null;
  const visit = (current: ExpressionAst | null | undefined) => {
    if (!current || !current.$kind) return;
    if (current.$kind === "AccessScope" || current.$kind === "CallScope") {
      const ident = readIdentifier(current.name, current.span);
      if (ident?.span && spanContainsOffset(ident.span, offset)) {
        if (!best || spanLength(ident.span) < spanLength(best.span ?? ident.span)) {
          best = { name: ident.name, ancestor: current.ancestor, span: ident.span };
        }
      }
    }
    const queue: (ExpressionAst | null | undefined)[] = [];
    queue.push(
      current.expression,
      current.object,
      current.func,
      current.left,
      current.right,
      current.condition,
      current.yes,
      current.no,
      current.target,
      current.value,
      current.key,
      current.declaration,
      current.iterable,
    );
    if (current.args) queue.push(...current.args);
    if (current.parts) queue.push(...current.parts);
    if (current.expressions) queue.push(...current.expressions);
    for (const child of queue) {
      if (!child) continue;
      if (child.span && !spanContainsOffset(child.span, offset) && best) continue;
      visit(child);
    }
  };
  visit(node);
  return best;
}

function collectAccessScopeNodes(
  node: ExpressionAst | null | undefined,
  out: AccessScopeInfo[],
): void {
  if (!node || !node.$kind) return;
  if (node.$kind === "AccessScope" || node.$kind === "CallScope") {
    const ident = readIdentifier(node.name, node.span);
    if (ident?.span) {
      out.push({ name: ident.name, ancestor: node.ancestor, span: ident.span });
    }
  }
  const queue: (ExpressionAst | null | undefined)[] = [];
  queue.push(
    node.expression,
    node.object,
    node.func,
    node.left,
    node.right,
    node.condition,
    node.yes,
    node.no,
    node.target,
    node.value,
    node.key,
    node.declaration,
    node.iterable,
  );
  if (node.args) queue.push(...node.args);
  if (node.parts) queue.push(...node.parts);
  if (node.expressions) queue.push(...node.expressions);
  for (const child of queue) {
    if (!child) continue;
    collectAccessScopeNodes(child, out);
  }
}

type IdentifierLike = { name: string; span?: SourceSpan } | string | null | undefined;

type ExpressionAst = {
  $kind: string;
  span?: SourceSpan;
  name?: IdentifierLike;
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
  ancestor?: number;
};

function readIdentifier(
  ident: IdentifierLike,
  fallbackSpan?: SourceSpan | null,
): { name: string; span?: SourceSpan } | null {
  if (!ident) return null;
  if (typeof ident === "string") {
    return { name: ident, span: fallbackSpan ?? undefined };
  }
  const span = ident.span ?? fallbackSpan ?? undefined;
  return { name: ident.name, span };
}

type ExprResourceRef = {
  kind: "bindingBehavior" | "valueConverter";
  name: string;
  span: SourceSpan;
  exprId: ExprId;
};

function collectExprResources(exprTable: readonly { id: ExprId; ast: unknown }[]): ExprResourceRef[] {
  const refs: ExprResourceRef[] = [];
  for (const entry of exprTable) {
    walkExprResourceRefs(entry.ast as ExpressionAst | null | undefined, entry.id, refs);
  }
  return refs;
}

function walkExprResourceRefs(
  node: ExpressionAst | null | undefined,
  exprId: ExprId,
  out: ExprResourceRef[],
): void {
  if (!node || !node.$kind) return;
  if (node.$kind === "BindingBehavior") {
    const ident = readIdentifier(node.name, node.span);
    if (ident?.span) out.push({ kind: "bindingBehavior", name: ident.name, span: ident.span, exprId });
  } else if (node.$kind === "ValueConverter") {
    const ident = readIdentifier(node.name, node.span);
    if (ident?.span) out.push({ kind: "valueConverter", name: ident.name, span: ident.span, exprId });
  }
  const queue: (ExpressionAst | null | undefined)[] = [];
  queue.push(
    node.expression,
    node.object,
    node.func,
    node.left,
    node.right,
    node.condition,
    node.yes,
    node.no,
    node.target,
    node.value,
    node.key,
    node.declaration,
    node.iterable,
  );
  if (node.args) queue.push(...node.args);
  if (node.parts) queue.push(...node.parts);
  if (node.expressions) queue.push(...node.expressions);
  for (const child of queue) {
    if (!child) continue;
    walkExprResourceRefs(child, exprId, out);
  }
}

/**
 * Check if the offset is inside an attribute value by scanning the template text.
 *
 * Scans backward from the offset looking for `="` or `='`. If found without
 * encountering an unmatched closing quote first, the cursor is inside a value.
 * This is a heuristic — it doesn't handle edge cases like nested quotes in
 * expressions, but it's sufficient for TC attribute value detection.
 */
function isOffsetInAttrValue(text: string, _spanStart: number, offset: number): boolean {
  // Scan backward from offset to find quote context
  let i = offset - 1;
  while (i >= 0) {
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      // Found a quote — check if it's an opening quote (preceded by =)
      const before = i > 0 ? text[i - 1] : "";
      if (before === "=") return true; // ="... pattern → inside value
      // Could be closing quote of a different attribute — check further back
      // for a matching opening quote with = before it
      const matchQuote = ch;
      let j = i - 1;
      while (j >= 0) {
        if (text[j] === matchQuote) {
          if (j > 0 && text[j - 1] === "=") return false; // matched a complete ="..." pair
          break;
        }
        if (text[j] === "\n") break; // don't cross line boundaries
        j -= 1;
      }
      return true; // unmatched quote → likely inside value
    }
    if (ch === ">" || ch === "<") return false; // hit tag boundary
    if (ch === "\n") {
      // Continue scanning — multi-line attributes are valid
    }
    i -= 1;
  }
  return false;
}
