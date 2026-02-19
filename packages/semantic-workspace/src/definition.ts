import {
  analyzeAttributeName,
  canonicalDocumentUri,
  createBindableSymbolId,
  createLocalSymbolId,
  debug,
  isDebugEnabled,
  normalizePathForId,
  spanContainsOffset,
  spanLength,
  toSourceFileId,
  unwrapSourced,
  type BindableDef,
  type ExprId,
  type LinkedInstruction,
  type LinkedRow,
  type FrameId,
  type NodeId,
  type ResourceDef,
  type SourceLocation,
  type SourceSpan,
  type SymbolId,
  type TemplateCompilation,
  type AttributeParser,
  type DocumentUri,
  type TemplateSyntaxRegistry,
} from "@aurelia-ls/compiler";
import type { ProjectSemanticsDiscoveryResult } from "@aurelia-ls/compiler";
import type { WorkspaceLocation } from "./types.js";
import { selectResourceCandidate } from "./resource-precedence-policy.js";
import { buildDomIndex, elementTagSpanAtOffset, elementTagSpans, findDomNode } from "./template-dom.js";
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

export function buildResourceDefinitionIndex(discovery: ProjectSemanticsDiscoveryResult): ResourceDefinitionIndex {
  const symbols = buildSymbolIdMap(discovery);
  const elements = new Map<string, ResourceDefinitionEntry[]>();
  const attributes = new Map<string, ResourceDefinitionEntry[]>();
  const controllers = new Map<string, ResourceDefinitionEntry[]>();
  const valueConverters = new Map<string, ResourceDefinitionEntry[]>();
  const bindingBehaviors = new Map<string, ResourceDefinitionEntry[]>();
  const bySymbolId = new Map<SymbolId, ResourceDefinitionEntry>();

  for (const def of discovery.definition.authority) {
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

export function collectTemplateDefinitionSlices(options: {
  compilation: TemplateCompilation;
  text: string;
  offset: number;
  resources: ResourceDefinitionIndex;
  syntax: AttributeSyntaxContext;
  preferRoots?: readonly string[] | null;
  documentUri?: DocumentUri | null;
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

  const converterHit = findValueConverterAtOffset(compilation.exprTable ?? [], offset);
  if (converterHit) {
    const entry = findEntry(resources.valueConverters, converterHit.name, null, preferRoots);
    const location = entry ? resourceLocation(entry) : null;
    if (location) resource.push(location);
  }

  const behaviorHit = findBindingBehaviorAtOffset(compilation.exprTable ?? [], offset);
  if (behaviorHit) {
    const entry = findEntry(resources.bindingBehaviors, behaviorHit.name, null, preferRoots);
    const location = entry ? resourceLocation(entry) : null;
    if (location) resource.push(location);
  }

  const resourceHits = collectTemplateResourceReferences({
    compilation,
    resources,
    syntax,
    preferRoots,
    documentUri: options.documentUri ?? null,
  });
  for (const hit of resourceHits) {
    if (!hit.symbolId || !spanContainsOffset(hit.span, offset)) continue;
    const entry = resources.bySymbolId.get(hit.symbolId);
    const location = entry ? resourceLocation(entry) : null;
    if (location) resource.push(location);
  }

  const localDef = findLocalScopeDefinition(compilation, text, offset, options.documentUri ?? null);
  if (localDef) local.push(localDef);

  return { local, resource };
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
}): WorkspaceLocation[] {
  const { compilation, resources } = options;
  const syntax = options.syntax;
  const preferRoots = options.preferRoots ?? [];
  const results: WorkspaceLocation[] = [];
  const domIndex = buildDomIndex(compilation.ir.templates ?? []);
  const documentUri = options.documentUri ?? null;

  for (let ti = 0; ti < compilation.linked.templates.length; ti += 1) {
    const template = compilation.linked.templates[ti];
    const domTemplate = compilation.ir.templates?.[ti];
    if (!template || !domTemplate) continue;
    for (const row of template.rows ?? []) {
      if (row.node.kind !== "element") continue;
      const domNode = findDomNode(domIndex, ti, row.target);
      if (!domNode || domNode.kind !== "element") continue;
      const entry = row.node.custom?.def
        ? findEntry(resources.elements, row.node.custom.def.name, row.node.custom.def.file ?? null)
        : null;
      if (!entry?.symbolId) continue;
      for (const span of elementTagSpans(domNode)) {
        const loc = spanLocation(span, documentUri);
        if (loc) results.push({ ...loc, symbolId: entry.symbolId, nodeId: row.target });
      }
    }
  }

  const instructionHits = collectInstructionHits(compilation.linked.templates, compilation.ir.templates ?? [], domIndex);
  for (const hit of instructionHits) {
    const nameSpan = hit.attrNameSpan ?? null;
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
        if (loc) results.push({ ...loc, symbolId: entry.symbolId });
        break;
      }
      case "hydrateTemplateController": {
        const entry = findEntry(resources.controllers, hit.instruction.res, null, preferRoots);
        if (!entry?.symbolId) break;
        const loc = spanLocation(span, documentUri);
        if (loc) results.push({ ...loc, symbolId: entry.symbolId });
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
        if (loc) results.push({ ...loc, symbolId });
        break;
      }
      default:
        break;
    }
  }

  const exprRefs = collectExprResources(compilation.exprTable ?? []);
  for (const ref of exprRefs) {
    const entry = ref.kind === "valueConverter"
      ? findEntry(resources.valueConverters, ref.name, null, preferRoots)
      : findEntry(resources.bindingBehaviors, ref.name, null, preferRoots);
    if (!entry?.symbolId) continue;
    const loc = spanLocation(ref.span, documentUri);
    if (!loc) continue;
    results.push({ ...loc, symbolId: entry.symbolId, exprId: ref.exprId });
  }

  return results;
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
  if (classLoc) return classLoc;
  const nameLoc = readLocation(def.name);
  if (nameLoc) return nameLoc;
  if (def.file) {
    return { file: def.file, pos: 0, end: 0 };
  }
  return null;
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
  const list = map.get(name.toLowerCase());
  return selectResourceCandidate(list, {
    file,
    preferredRoots: preferRoots ?? [],
  });
}

function buildSymbolIdMap(discovery: ProjectSemanticsDiscoveryResult): Map<string, SymbolId> {
  const map = new Map<string, SymbolId>();
  for (const symbol of discovery.semanticSnapshot.symbols) {
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
  const key = name.toLowerCase();
  const list = map.get(key);
  if (list) {
    list.push(entry);
    return;
  }
  map.set(key, [entry]);
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

type ScopeSymbol = {
  kind: "let" | "iteratorLocal" | "contextual" | "alias" | string;
  name: string;
  span?: SourceSpan | null;
};

type ScopeFrame = {
  id: FrameId;
  parent: FrameId | null;
  symbols: readonly ScopeSymbol[];
};

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
    if (current.$kind === "AccessScope") {
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
  if (node.$kind === "AccessScope") {
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

