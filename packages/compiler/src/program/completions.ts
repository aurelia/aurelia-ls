import path from "node:path";
import { spanContainsOffset, type SourceSpan } from "../model/span.js";
import { positionAtOffset, type TextRange } from "../model/text.js";
import { deriveResourceConfidence } from "../convergence/confidence.js";
import { unwrapSourced } from "../schema/sourced.js";
import type {
  AttrRes,
  Bindable,
  BindingBehaviorDef,
  CustomAttributeDef,
  CustomElementDef,
  ElementRes,
  MaterializedSemantics,
  ResourceCatalog,
  ResourceCollections,
  ResourceDef,
  TemplateControllerDef,
  TemplateSyntaxRegistry,
  TypeRef,
  ValueConverterDef,
} from "../schema/types.js";
import { analyzeAttributeName, createAttributeParserFromRegistry, type AttributeParser } from "../parsing/attribute-parser.js";
import type { TemplateQueryFacade } from "../synthesis/overlay/query.js";
import type { DocumentSnapshot, DocumentUri } from "./primitives.js";
import { canonicalDocumentUri } from "./paths.js";
import type { TemplateProgram } from "./program.js";
import type { CompletionConfidence, TemplateCompletionItem, CompletionOrigin } from "./completion-contracts.js";

export function collectTemplateCompletionsForProgram(
  program: TemplateProgram,
  query: TemplateQueryFacade,
  snapshot: DocumentSnapshot,
  offset: number,
): TemplateCompletionItem[] {
  const { sem, resources, syntax, catalog } = resolveCompletionContext(program, snapshot.uri);
  const attrParser = createAttributeParserFromRegistry(syntax);

  const exprInfo = query.exprAt(offset);
  if (exprInfo) {
    return collectExpressionCompletions(snapshot.text, offset, exprInfo.span, resources, sem, catalog);
  }

  const context = findTagContext(snapshot.text, offset);
  if (!context) return [];

  if (context.kind === "tag-name") {
    return collectTagNameCompletions(snapshot.text, context, resources, sem, catalog);
  }

  if (context.kind === "attr-name") {
    return collectAttributeNameCompletions(snapshot.text, context, resources, sem, syntax, attrParser, catalog);
  }

  if (context.kind === "attr-value") {
    return collectAttributeValueCompletions(
      snapshot.text,
      snapshot.uri,
      context,
      resources,
      sem,
      syntax,
      attrParser,
      catalog,
    );
  }

  return [];
}

type TagContext =
  | {
      kind: "tag-name";
      tagName: string;
      nameStart: number;
      nameEnd: number;
      prefix: string;
    }
  | {
      kind: "attr-name";
      tagName: string;
      attrName: string;
      attrStart: number;
      attrEnd: number;
      prefix: string;
    }
  | {
      kind: "attr-value";
      tagName: string;
      attrName: string;
      valueStart: number;
      valueEnd: number;
      prefix: string;
    };

function resolveCompletionContext(
  program: TemplateProgram,
  _uri: DocumentUri,
): { sem: MaterializedSemantics; resources: ResourceCollections; syntax: TemplateSyntaxRegistry; catalog: ResourceCatalog } {
  const query = program.query;
  return {
    sem: query.model.semantics,
    resources: query.model.semantics.resources,
    syntax: query.syntax,
    catalog: query.model.catalog,
  };
}

const TEMPLATE_COMPLETION_KIND = {
  customElement: "custom-element",
  templateController: "template-controller",
  customAttribute: "custom-attribute",
  bindableProperty: "bindable-property",
  valueConverter: "value-converter",
  bindingBehavior: "binding-behavior",
  bindingCommand: "binding-command",
  htmlElement: "html-element",
  htmlAttribute: "html-attribute",
} as const;

function collectExpressionCompletions(
  text: string,
  offset: number,
  exprSpan: SourceSpan,
  resources: ResourceCollections,
  sem: MaterializedSemantics,
  catalog: ResourceCatalog,
): TemplateCompletionItem[] {
  if (!spanContainsOffset(exprSpan, offset)) return [];
  const exprText = text.slice(exprSpan.start, exprSpan.end);
  const relativeOffset = offset - exprSpan.start;
  const hit = findPipeContext(exprText, relativeOffset);
  if (!hit) return [];
  const range = rangeFromOffsets(text, exprSpan.start + hit.nameStart, exprSpan.start + hit.nameEnd);
  const prefix = hit.prefix.toLowerCase();
  const labels = hit.kind === "value-converter"
    ? Object.keys(resources.valueConverters ?? {})
    : Object.keys(resources.bindingBehaviors ?? {});
  const detail = hit.kind === "value-converter" ? "Value Converter" : "Binding Behavior";
  const kind = hit.kind === "value-converter"
    ? TEMPLATE_COMPLETION_KIND.valueConverter
    : TEMPLATE_COMPLETION_KIND.bindingBehavior;
  return labels
    .filter((label) => label.toLowerCase().startsWith(prefix))
    .sort()
    .map((label) => {
      const trust = hit.kind === "value-converter"
        ? completionTrustForValueConverter(label, sem, catalog)
        : completionTrustForBindingBehavior(label, sem, catalog);
      return {
        label,
        source: "template",
        range,
        kind,
        detail,
        ...completionTrustProps(trust),
      };
    });
}

function collectTagNameCompletions(
  text: string,
  context: Extract<TagContext, { kind: "tag-name" }>,
  resources: ResourceCollections,
  sem: MaterializedSemantics,
  catalog: ResourceCatalog,
): TemplateCompletionItem[] {
  const range = rangeFromOffsets(text, context.nameStart, context.nameEnd);
  const prefix = context.prefix.toLowerCase();
  const items: TemplateCompletionItem[] = [];
  const seen = new Set<string>();

  for (const [key, element] of Object.entries(resources.elements)) {
    const trust = completionTrustForElement(element, sem, catalog);
    const names = new Set(
      [key, element.name, ...(element.aliases ?? [])].filter((name): name is string => !!name),
    );
    for (const name of names) {
      if (!name.toLowerCase().startsWith(prefix)) continue;
      if (seen.has(name)) continue;
      seen.add(name);
      items.push({
        label: name,
        source: "template",
        range,
        kind: TEMPLATE_COMPLETION_KIND.customElement,
        detail: "Custom Element",
        ...completionTrustProps(trust),
      });
    }
  }

  for (const name of Object.keys(sem.dom.elements ?? {})) {
    if (!name.toLowerCase().startsWith(prefix)) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    items.push({
      label: name,
      source: "template",
      range,
      kind: TEMPLATE_COMPLETION_KIND.htmlElement,
      detail: "HTML Element",
    });
  }

  return items;
}

function collectAttributeNameCompletions(
  text: string,
  context: Extract<TagContext, { kind: "attr-name" }>,
  resources: ResourceCollections,
  sem: MaterializedSemantics,
  syntax: TemplateSyntaxRegistry,
  attrParser: AttributeParser,
  catalog: ResourceCatalog,
): TemplateCompletionItem[] {
  const typed = context.prefix;
  const command = parseBindingCommandContext(typed, context.attrName, syntax);
  if (command) {
    return collectBindingCommandCompletions(
      syntax,
      typed.slice(command.commandOffset),
      rangeFromOffsets(text, context.attrStart + command.rangeStart, context.attrStart + command.rangeEnd),
    );
  }

  const analysis = analyzeAttributeName(context.attrName, syntax, attrParser);
  let targetSpan = analysis.targetSpan;
  if (!targetSpan && !analysis.syntax.command) {
    const symbol = leadingAttributeSymbol(context.attrName, syntax);
    targetSpan = symbol
      ? { start: symbol.length, end: context.attrName.length }
      : { start: 0, end: context.attrName.length };
  }
  if (!targetSpan) return [];
  if (typed.length > targetSpan.end) return [];
  const range = rangeFromOffsets(text, context.attrStart + targetSpan.start, context.attrStart + targetSpan.end);
  const lowerPrefix = typed.slice(targetSpan.start, Math.min(typed.length, targetSpan.end)).toLowerCase();

  const items: TemplateCompletionItem[] = [];
  const seen = new Set<string>();
  const push = (
    label: string,
    detail?: string,
    documentation?: string,
    trust?: CompletionTrust,
    kind?: TemplateCompletionItem["kind"],
  ) => {
    if (!label.toLowerCase().startsWith(lowerPrefix)) return;
    if (seen.has(label)) return;
    seen.add(label);
    items.push({
      label,
      source: "template",
      range,
      ...(kind ? { kind } : {}),
      ...(detail ? { detail } : {}),
      ...(documentation ? { documentation } : {}),
      ...completionTrustProps(trust),
    });
  };

  const element = context.tagName ? resolveElement(resources, context.tagName) : null;
  const elementTrust = element ? completionTrustForElement(element, sem, catalog) : undefined;
  if (element) {
    for (const bindable of Object.values(element.bindables ?? {})) {
      const label = (bindable.attribute ?? bindable.name).trim();
      if (!label) continue;
      push(
        label,
        "Bindable",
        typeRefToString(bindable.type),
        elementTrust,
        TEMPLATE_COMPLETION_KIND.bindableProperty,
      );
    }
  }

  for (const [key, attr] of Object.entries(resources.attributes ?? {})) {
    const detail = attr.isTemplateController ? "Template Controller" : "Custom Attribute";
    const kind = attr.isTemplateController
      ? TEMPLATE_COMPLETION_KIND.templateController
      : TEMPLATE_COMPLETION_KIND.customAttribute;
    const trust = completionTrustForAttribute(attr, sem, catalog);
    const names = new Set(
      [key, attr.name, ...(attr.aliases ?? [])].filter((name): name is string => !!name),
    );
    for (const name of names) {
      push(name, detail, undefined, trust, kind);
    }
  }

  const dom = context.tagName ? sem.dom.elements[context.tagName] : null;
  if (dom) {
    for (const name of Object.keys(dom.props ?? {})) {
      push(name, "Native Attribute", undefined, undefined, TEMPLATE_COMPLETION_KIND.htmlAttribute);
    }
    for (const name of Object.keys(dom.attrToProp ?? {})) {
      push(name, "Native Attribute", undefined, undefined, TEMPLATE_COMPLETION_KIND.htmlAttribute);
    }
    for (const name of Object.keys(sem.naming.attrToPropGlobal ?? {})) {
      push(name, "Native Attribute", undefined, undefined, TEMPLATE_COMPLETION_KIND.htmlAttribute);
    }
    const perTag = sem.naming.perTag?.[context.tagName];
    if (perTag) {
      for (const name of Object.keys(perTag)) {
        push(name, "Native Attribute", undefined, undefined, TEMPLATE_COMPLETION_KIND.htmlAttribute);
      }
    }
  }

  return items;
}

function collectAttributeValueCompletions(
  text: string,
  uri: DocumentUri,
  context: Extract<TagContext, { kind: "attr-value" }>,
  resources: ResourceCollections,
  sem: MaterializedSemantics,
  syntax: TemplateSyntaxRegistry,
  attrParser: AttributeParser,
  catalog: ResourceCatalog,
): TemplateCompletionItem[] {
  const attrTarget = normalizeAttributeTarget(context.attrName, syntax, attrParser);
  if (!attrTarget) return [];

  const range = rangeFromOffsets(text, context.valueStart, context.valueEnd);
  const prefix = context.prefix.toLowerCase();

  if (isImportFromAttribute(context.tagName, attrTarget)) {
    return collectImportModuleSpecifierCompletions(uri, prefix, sem, range, catalog);
  }

  const element = context.tagName ? resolveElement(resources, context.tagName) : null;
  const elementBindable = element ? findBindableForAttribute(element.bindables, attrTarget) : null;

  const attribute = resolveAttribute(resources, attrTarget);
  const attributeBindable = attribute ? findPrimaryBindable(attribute) : null;

  const bindable = elementBindable ?? attributeBindable;
  if (!bindable) return [];
  const trust = elementBindable
    ? (element ? completionTrustForElement(element, sem, catalog) : undefined)
    : (attribute ? completionTrustForAttribute(attribute, sem, catalog) : undefined);

  const literals = extractStringLiteralUnion(bindable.type);
  if (!literals.length) return [];

  return literals
    .filter((value) => value.toLowerCase().startsWith(prefix))
    .sort()
    .map((value) => ({
      label: value,
      source: "template",
      range,
      ...completionTrustProps(trust),
    }));
}

function collectBindingCommandCompletions(
  syntax: TemplateSyntaxRegistry,
  prefix: string,
  range: TextRange,
): TemplateCompletionItem[] {
  const lowerPrefix = prefix.toLowerCase();
  return Object.entries(syntax.bindingCommands ?? {})
    .filter(([name, cmd]) => !name.includes(".") && cmd.kind !== "translation")
    .map(([name, cmd]) => ({
      name,
      detail: cmd.kind,
    }))
    .filter((entry) => entry.name.toLowerCase().startsWith(lowerPrefix))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => ({
      label: entry.name,
      source: "template",
      range,
      kind: TEMPLATE_COMPLETION_KIND.bindingCommand,
      ...(entry.detail ? { detail: entry.detail } : {}),
    }));
}

type CompletionResourceKind =
  | "custom-element"
  | "custom-attribute"
  | "template-controller"
  | "value-converter"
  | "binding-behavior";

type CompletionTrust = {
  confidence: CompletionConfidence;
  origin: CompletionOrigin;
};

function completionKindForResourceKind(
  kind: CompletionResourceKind,
): TemplateCompletionItem["kind"] {
  switch (kind) {
    case "custom-element":
      return TEMPLATE_COMPLETION_KIND.customElement;
    case "custom-attribute":
      return TEMPLATE_COMPLETION_KIND.customAttribute;
    case "template-controller":
      return TEMPLATE_COMPLETION_KIND.templateController;
    case "value-converter":
      return TEMPLATE_COMPLETION_KIND.valueConverter;
    case "binding-behavior":
      return TEMPLATE_COMPLETION_KIND.bindingBehavior;
  }
}

function completionTrustProps(
  trust: CompletionTrust | undefined,
): Pick<TemplateCompletionItem, "confidence" | "origin"> {
  if (!trust) return {};
  return {
    confidence: trust.confidence,
    origin: trust.origin,
  };
}

function completionTrustForElement(
  element: ElementRes,
  sem: MaterializedSemantics,
  catalog: ResourceCatalog,
): CompletionTrust {
  const def = findElementDefinition(sem, element);
  return completionTrustForDefinition("custom-element", element.name, def, catalog);
}

function completionTrustForAttribute(
  attribute: AttrRes,
  sem: MaterializedSemantics,
  catalog: ResourceCatalog,
): CompletionTrust {
  if (attribute.isTemplateController) {
    const def = findTemplateControllerDefinition(sem, attribute.name);
    return completionTrustForDefinition("template-controller", attribute.name, def, catalog);
  }
  const def = findCustomAttributeDefinition(sem, attribute.name);
  return completionTrustForDefinition("custom-attribute", attribute.name, def, catalog);
}

function completionTrustForValueConverter(
  name: string,
  sem: MaterializedSemantics,
  catalog: ResourceCatalog,
): CompletionTrust {
  const def = findValueConverterDefinition(sem, name);
  return completionTrustForDefinition("value-converter", name, def, catalog);
}

function completionTrustForBindingBehavior(
  name: string,
  sem: MaterializedSemantics,
  catalog: ResourceCatalog,
): CompletionTrust {
  const def = findBindingBehaviorDefinition(sem, name);
  return completionTrustForDefinition("binding-behavior", name, def, catalog);
}

function completionTrustForDefinition(
  kind: CompletionResourceKind,
  name: string,
  def: ResourceDef | null,
  catalog: ResourceCatalog,
): CompletionTrust {
  const origin = sourcedOriginToCompletionOrigin(def?.name.origin);
  const canonicalName = normalizeResourceName(name, def);
  const gaps = catalog.gapsByResource?.[`${kind}:${canonicalName}`] ?? [];
  const confidence = deriveResourceConfidence(gaps, confidenceOrigin(origin)).level;
  return { confidence, origin };
}

function sourcedOriginToCompletionOrigin(
  origin: ResourceDef["name"]["origin"] | undefined,
): CompletionOrigin {
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

function confidenceOrigin(
  origin: CompletionOrigin,
): "builtin" | "config" | "source" | undefined {
  switch (origin) {
    case "builtin":
    case "config":
    case "source":
      return origin;
    default:
      return undefined;
  }
}

function normalizeResourceName(
  fallback: string,
  def: ResourceDef | null,
): string {
  return unwrapSourced(def?.name) ?? fallback;
}

function findElementDefinition(
  sem: MaterializedSemantics,
  element: ElementRes,
): CustomElementDef | null {
  return findDefinitionByNameAndFile(
    sem.elements,
    element.name,
    element.file ?? null,
  );
}

function findCustomAttributeDefinition(
  sem: MaterializedSemantics,
  name: string,
): CustomAttributeDef | null {
  return findDefinitionByNameAndFile(sem.attributes, name, null);
}

function findTemplateControllerDefinition(
  sem: MaterializedSemantics,
  name: string,
): TemplateControllerDef | null {
  return findDefinitionByNameAndFile(sem.controllers, name, null);
}

function findValueConverterDefinition(
  sem: MaterializedSemantics,
  name: string,
): ValueConverterDef | null {
  return findDefinitionByNameAndFile(sem.valueConverters, name, null);
}

function findBindingBehaviorDefinition(
  sem: MaterializedSemantics,
  name: string,
): BindingBehaviorDef | null {
  return findDefinitionByNameAndFile(sem.bindingBehaviors, name, null);
}

function findDefinitionByNameAndFile<T extends ResourceDef>(
  defs: Readonly<Record<string, T>>,
  name: string,
  file: string | null,
): T | null {
  const normalizedName = name.toLowerCase();
  const normalizedFile = file ? normalizePathSlashes(path.resolve(file)) : null;
  for (const def of Object.values(defs)) {
    const defName = unwrapSourced(def.name);
    if (!defName) continue;
    const names = new Set<string>([defName, ...(resourceAliases(def) ?? [])]);
    const hasName = Array.from(names).some((entry) => entry.toLowerCase() === normalizedName);
    if (!hasName) continue;
    if (normalizedFile && def.file) {
      const defFile = normalizePathSlashes(path.resolve(def.file));
      if (defFile !== normalizedFile) continue;
    }
    return def;
  }
  return null;
}

function resourceAliases(def: ResourceDef): readonly string[] {
  if (def.kind === "custom-element" || def.kind === "custom-attribute") {
    return def.aliases.map((alias) => unwrapSourced(alias)).filter((value): value is string => !!value);
  }
  if (def.kind === "template-controller") {
    const aliases: readonly string[] | undefined = unwrapSourced(def.aliases);
    return aliases ?? [];
  }
  return [];
}

function isImportFromAttribute(tagName: string, attrTarget: string): boolean {
  return tagName === "import" && attrTarget === "from";
}

function collectImportModuleSpecifierCompletions(
  templateUri: DocumentUri,
  prefix: string,
  sem: MaterializedSemantics,
  range: TextRange,
  catalog: ResourceCatalog,
): TemplateCompletionItem[] {
  const templatePath = canonicalDocumentUri(templateUri).path;
  const candidates = new Map<string, { trust: CompletionTrust; kind: TemplateCompletionItem["kind"] }>();
  const addCandidate = (label: string, trust: CompletionTrust, kind: TemplateCompletionItem["kind"]): void => {
    if (!label) return;
    const current = candidates.get(label);
    if (!current) {
      candidates.set(label, { trust, kind });
      return;
    }
    if (compareCompletionTrust(trust, current.trust) < 0) {
      candidates.set(label, { trust, kind });
    }
  };

  const addDefinition = (kind: CompletionResourceKind, def: ResourceDef): void => {
    const name = unwrapSourced(def.name);
    if (!name) return;
    const trust = completionTrustForDefinition(kind, name, def, catalog);
    const completionKind = completionKindForResourceKind(kind);
    if (def.package) {
      addCandidate(def.package, trust, completionKind);
      return;
    }
    if (!def.file) return;
    const moduleSpecifier = moduleSpecifierFromFile(def.file, templatePath);
    if (!moduleSpecifier) return;
    addCandidate(moduleSpecifier, trust, completionKind);
  };

  for (const def of Object.values(sem.elements)) {
    addDefinition("custom-element", def);
  }
  for (const def of Object.values(sem.attributes)) {
    addDefinition("custom-attribute", def);
  }
  for (const def of Object.values(sem.controllers)) {
    addDefinition("template-controller", def);
  }
  for (const def of Object.values(sem.valueConverters)) {
    addDefinition("value-converter", def);
  }
  for (const def of Object.values(sem.bindingBehaviors)) {
    addDefinition("binding-behavior", def);
  }

  const lowerPrefix = prefix.toLowerCase();
  return Array.from(candidates.entries())
    .filter(([label]) => label.toLowerCase().startsWith(lowerPrefix))
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, candidate]) => ({
      label,
      source: "template",
      kind: candidate.kind,
      detail: "Aurelia Module",
      range,
      ...completionTrustProps(candidate.trust),
    }));
}

function compareCompletionTrust(
  a: CompletionTrust,
  b: CompletionTrust,
): number {
  const confidenceDelta = completionConfidenceRank(a.confidence) - completionConfidenceRank(b.confidence);
  if (confidenceDelta !== 0) return confidenceDelta;
  return completionOriginRank(a.origin) - completionOriginRank(b.origin);
}

function completionConfidenceRank(confidence: CompletionConfidence): number {
  switch (confidence) {
    case "exact":
      return 0;
    case "high":
      return 1;
    case "partial":
      return 2;
    case "low":
      return 3;
    default:
      return 4;
  }
}

function completionOriginRank(origin: CompletionOrigin): number {
  switch (origin) {
    case "source":
      return 0;
    case "config":
      return 1;
    case "builtin":
      return 2;
    case "unknown":
    default:
      return 3;
  }
}

function moduleSpecifierFromFile(targetFile: string, containingFile: string): string | null {
  const absoluteTarget = path.resolve(targetFile);
  const containingDir = path.dirname(path.resolve(containingFile));
  let relative = normalizePathSlashes(path.relative(containingDir, absoluteTarget));
  if (!relative) return null;
  relative = stripKnownModuleExtension(relative);
  if (!relative.startsWith(".")) {
    relative = `./${relative}`;
  }
  return relative;
}

function stripKnownModuleExtension(filePath: string): string {
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

function findPipeContext(
  text: string,
  offset: number,
): { kind: "value-converter" | "binding-behavior"; nameStart: number; nameEnd: number; prefix: string } | null {
  if (offset <= 0) return null;
  for (let i = Math.min(offset - 1, text.length - 1); i >= 0; i -= 1) {
    const code = text.charCodeAt(i);
    if (code === 124 /* | */) {
      if (text.charCodeAt(i - 1) === 124 || text.charCodeAt(i + 1) === 124) continue;
      return resolvePipeName(text, offset, i, "value-converter");
    }
    if (code === 38 /* & */) {
      if (text.charCodeAt(i - 1) === 38 || text.charCodeAt(i + 1) === 38) continue;
      return resolvePipeName(text, offset, i, "binding-behavior");
    }
  }
  return null;
}

function resolvePipeName(
  text: string,
  offset: number,
  operatorIndex: number,
  kind: "value-converter" | "binding-behavior",
): { kind: "value-converter" | "binding-behavior"; nameStart: number; nameEnd: number; prefix: string } | null {
  let i = operatorIndex + 1;
  while (i < text.length && isWhitespace(text.charCodeAt(i))) i += 1;
  const nameStart = i;
  while (i < text.length && isResourceNameChar(text.charCodeAt(i))) i += 1;
  const nameEnd = i;
  if (offset < nameStart || offset > nameEnd) return null;
  const prefix = text.slice(nameStart, Math.min(offset, nameEnd));
  return { kind, nameStart, nameEnd, prefix };
}

function findTagContext(text: string, offset: number): TagContext | null {
  const clamped = Math.max(0, Math.min(offset, text.length));
  const tagStart = text.lastIndexOf("<", clamped);
  if (tagStart < 0) return null;
  const lastClose = text.lastIndexOf(">", clamped);
  if (lastClose > tagStart) return null;

  let i = tagStart + 1;
  const first = text.charCodeAt(i);
  if (first === 47 /* / */ || first === 33 /* ! */ || first === 63 /* ? */) return null;

  while (i < text.length && isWhitespace(text.charCodeAt(i))) i += 1;
  const nameStart = i;
  while (i < text.length && isTagNameChar(text.charCodeAt(i))) i += 1;
  const nameEnd = i;
  const rawTagName = text.slice(nameStart, nameEnd);
  const tagName = rawTagName.toLowerCase();

  if (clamped <= nameEnd) {
    return {
      kind: "tag-name",
      tagName,
      nameStart,
      nameEnd,
      prefix: text.slice(nameStart, clamped),
    };
  }

  const tagEnd = text.indexOf(">", tagStart + 1);
  const limit = tagEnd === -1 ? text.length : tagEnd;

  while (i < limit) {
    while (i < limit && isWhitespace(text.charCodeAt(i))) {
      if (clamped <= i) {
        return { kind: "attr-name", tagName, attrName: "", attrStart: clamped, attrEnd: clamped, prefix: "" };
      }
      i += 1;
    }
    if (i >= limit) break;
    if (text.charCodeAt(i) === 47 /* / */) {
      if (clamped <= i) {
        return { kind: "attr-name", tagName, attrName: "", attrStart: clamped, attrEnd: clamped, prefix: "" };
      }
      i += 1;
      continue;
    }

    const attrStart = i;
    while (i < limit && isAttrNameChar(text.charCodeAt(i))) i += 1;
    const attrEnd = i;
    const attrName = text.slice(attrStart, attrEnd);

    if (clamped <= attrEnd) {
      return {
        kind: "attr-name",
        tagName,
        attrName,
        attrStart,
        attrEnd,
        prefix: text.slice(attrStart, Math.min(clamped, attrEnd)),
      };
    }

    while (i < limit && isWhitespace(text.charCodeAt(i))) i += 1;
    if (i >= limit) break;
    if (text.charCodeAt(i) !== 61 /* = */) continue;
    i += 1;
    while (i < limit && isWhitespace(text.charCodeAt(i))) i += 1;
    if (i >= limit) break;

    const valueStart = i;
    const quote = text.charCodeAt(i);
    if (quote === 34 /* " */ || quote === 39 /* ' */) {
      i += 1;
      const contentStart = i;
      while (i < limit && text.charCodeAt(i) !== quote) i += 1;
      const contentEnd = i;
      if (clamped >= contentStart && clamped <= contentEnd) {
        return {
          kind: "attr-value",
          tagName,
          attrName,
          valueStart: contentStart,
          valueEnd: contentEnd,
          prefix: text.slice(contentStart, Math.min(clamped, contentEnd)),
        };
      }
      if (i < limit) i += 1;
      continue;
    }

    while (i < limit && !isWhitespace(text.charCodeAt(i)) && text.charCodeAt(i) !== 62 /* > */) i += 1;
    const contentEnd = i;
    if (clamped >= valueStart && clamped <= contentEnd) {
      return {
        kind: "attr-value",
        tagName,
        attrName,
        valueStart,
        valueEnd: contentEnd,
        prefix: text.slice(valueStart, Math.min(clamped, contentEnd)),
      };
    }
  }

  return { kind: "attr-name", tagName, attrName: "", attrStart: clamped, attrEnd: clamped, prefix: "" };
}

function parseBindingCommandContext(
  typed: string,
  attrName: string,
  syntax: TemplateSyntaxRegistry,
): { commandOffset: number; rangeStart: number; rangeEnd: number } | null {
  const candidates = commandDelimitersForPatterns(syntax);
  let best: { commandOffset: number; rangeStart: number; rangeEnd: number } | null = null;

  for (const candidate of candidates) {
    const { delimiter, symbols } = candidate;
    const typedIndex = typed.lastIndexOf(delimiter);
    if (typedIndex < 0) continue;

    const afterTyped = typed.slice(typedIndex + delimiter.length);
    if (containsSymbol(afterTyped, symbols)) continue;

    const fullIndex = attrName.lastIndexOf(delimiter);
    if (fullIndex < 0) continue;

    const rangeStart = fullIndex + delimiter.length;
    const rangeEnd = findNextSymbol(attrName, symbols, rangeStart) ?? attrName.length;
    const commandOffset = typedIndex + delimiter.length;

    if (!best || commandOffset > best.commandOffset) {
      best = { commandOffset, rangeStart, rangeEnd };
    }
  }

  return best;
}

function commandDelimitersForPatterns(
  syntax: TemplateSyntaxRegistry,
): Array<{ delimiter: string; symbols: string }> {
  const results: Array<{ delimiter: string; symbols: string }> = [];
  const seen = new Set<string>();
  for (const pattern of syntax.attributePatterns ?? []) {
    if (pattern.interpret.kind !== "target-command") continue;
    const delimiter = commandDelimiter(pattern.pattern);
    if (!delimiter) continue;
    const key = `${delimiter}|${pattern.symbols}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ delimiter, symbols: pattern.symbols });
  }
  return results;
}

function commandDelimiter(pattern: string): string | null {
  const positions: number[] = [];
  let idx = 0;
  while (idx < pattern.length) {
    const found = pattern.indexOf("PART", idx);
    if (found < 0) break;
    positions.push(found);
    idx = found + 4;
  }
  if (positions.length < 2) return null;
  const prevEnd = positions[positions.length - 2]! + 4;
  const lastStart = positions[positions.length - 1]!;
  const delimiter = pattern.slice(prevEnd, lastStart);
  return delimiter.length ? delimiter : null;
}

function containsSymbol(text: string, symbols: string): boolean {
  if (!symbols) return false;
  for (let i = 0; i < text.length; i += 1) {
    if (symbols.includes(text[i]!)) return true;
  }
  return false;
}

function findNextSymbol(text: string, symbols: string, start: number): number | null {
  if (!symbols) return null;
  for (let i = start; i < text.length; i += 1) {
    if (symbols.includes(text[i]!)) return i;
  }
  return null;
}

function leadingAttributeSymbol(attrName: string, syntax: TemplateSyntaxRegistry): string | null {
  for (const pattern of syntax.attributePatterns ?? []) {
    const isSymbolPattern = pattern.interpret.kind === "fixed-command"
      || (pattern.interpret.kind === "event-modifier" && pattern.interpret.injectCommand);
    if (!isSymbolPattern) continue;
    const symbol = leadingPatternSymbol(pattern.pattern, pattern.symbols);
    if (symbol && attrName.startsWith(symbol)) return symbol;
  }
  return null;
}

function leadingPatternSymbol(pattern: string, symbols: string): string | null {
  const partIndex = pattern.indexOf("PART");
  if (partIndex <= 0) return null;
  const prefix = pattern.slice(0, partIndex);
  if (!prefix) return null;
  if (symbols) {
    for (let i = 0; i < prefix.length; i += 1) {
      if (!symbols.includes(prefix[i]!)) return null;
    }
  }
  return prefix;
}

function normalizeAttributeTarget(
  attrName: string,
  syntax: TemplateSyntaxRegistry,
  attrParser: AttributeParser,
): string {
  const trimmed = attrName.trim();
  if (!trimmed) return "";
  const analysis = analyzeAttributeName(trimmed, syntax, attrParser);
  const targetSpan = analysis.targetSpan ?? (analysis.syntax.command ? null : { start: 0, end: trimmed.length });
  if (!targetSpan) return "";
  return trimmed.slice(targetSpan.start, targetSpan.end).toLowerCase();
}

function resolveElement(resources: ResourceCollections, tagName: string): ElementRes | null {
  const normalized = tagName.toLowerCase();
  const direct = resources.elements[normalized];
  if (direct) return direct;
  for (const el of Object.values(resources.elements)) {
    if (!el.aliases) continue;
    if (el.aliases.some((alias) => alias.toLowerCase() === normalized)) return el;
  }
  return null;
}

function resolveAttribute(resources: ResourceCollections, name: string): AttrRes | null {
  const normalized = name.toLowerCase();
  const direct = resources.attributes[normalized];
  if (direct) return direct;
  for (const attr of Object.values(resources.attributes)) {
    if (!attr.aliases) continue;
    if (attr.aliases.some((alias) => alias.toLowerCase() === normalized)) return attr;
  }
  return null;
}

function findBindableForAttribute(
  bindables: Readonly<Record<string, Bindable>> | undefined,
  attrName: string,
): Bindable | null {
  if (!bindables) return null;
  const normalized = attrName.toLowerCase();
  for (const bindable of Object.values(bindables)) {
    const attr = (bindable.attribute ?? bindable.name).toLowerCase();
    if (attr === normalized) return bindable;
  }
  return null;
}

function findPrimaryBindable(attr: AttrRes): Bindable | null {
  const key = attr.primary ?? Object.keys(attr.bindables ?? {})[0];
  if (!key) return null;
  return attr.bindables[key] ?? null;
}

function extractStringLiteralUnion(type: TypeRef | undefined): string[] {
  if (!type || type.kind !== "ts") return [];
  const values: string[] = [];
  const regex = /(['"])([^'"]+)\1/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(type.name)) !== null) {
    const value = match[2];
    if (value) values.push(value);
  }
  return Array.from(new Set(values));
}

function typeRefToString(type: TypeRef | undefined): string | undefined {
  if (!type) return undefined;
  switch (type.kind) {
    case "ts":
      return type.name;
    case "any":
      return "any";
    case "unknown":
      return "unknown";
    default:
      return undefined;
  }
}

function rangeFromOffsets(text: string, start: number, end: number): TextRange {
  const safeStart = Math.max(0, Math.min(start, text.length));
  const safeEnd = Math.max(safeStart, Math.min(end, text.length));
  return {
    start: positionAtOffset(text, safeStart),
    end: positionAtOffset(text, safeEnd),
  };
}

function isWhitespace(code: number): boolean {
  return code === 32 /* space */ || code === 9 /* tab */ || code === 10 /* lf */ || code === 13 /* cr */;
}

function isTagNameChar(code: number): boolean {
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 45 /* - */ ||
    code === 58 /* : */
  );
}

function isAttrNameChar(code: number): boolean {
  return (
    isTagNameChar(code) ||
    code === 46 /* . */ ||
    code === 64 /* @ */ ||
    code === 95 /* _ */
  );
}

function isResourceNameChar(code: number): boolean {
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 45 /* - */ ||
    code === 95 /* _ */
  );
}

