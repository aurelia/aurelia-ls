import { createHash } from "node:crypto";
import path from "node:path";
import ts from "typescript";
import {
  DEFAULT_SEMANTICS,
  buildResourceGraphFromSemantics,
  type NormalizedPath,
  type ResourceCollections,
  type ResourceGraph,
  type ResourceScopeId,
  type Semantics,
} from "@aurelia-ls/domain";
import type { Logger } from "./types.js";

export interface TypeScriptProject {
  getService(): ts.LanguageService;
  compilerOptions(): ts.CompilerOptions;
  getRootFileNames(): readonly NormalizedPath[];
  getProjectVersion(): number;
}

export interface AureliaProjectIndexOptions {
  readonly ts: TypeScriptProject;
  readonly logger: Logger;
  readonly baseSemantics?: Semantics;
  readonly defaultScope?: ResourceScopeId | null;
}

interface IndexSnapshot {
  readonly semantics: Semantics;
  readonly resourceGraph: ResourceGraph;
  readonly fingerprint: string;
}

type BindingMode = "default" | "oneTime" | "toView" | "fromView" | "twoWay";

interface BindableSpec {
  readonly name: string;
  readonly mode?: BindingMode;
  readonly primary?: boolean;
  readonly type?: string;
}

type ResourceOptionParse = {
  name?: string;
  aliases: string[];
  bindables: BindableSpec[];
  containerless: boolean;
  templateController: boolean;
  noMultiBindings: boolean;
};

type NameOnlyOptions = { name?: string; aliases: string[] };

interface DiscoveredElement {
  readonly kind: "element";
  readonly name: string;
  readonly aliases: readonly string[];
  readonly bindables: Record<string, BindableSpec>;
  readonly containerless: boolean;
  readonly boundary: boolean;
  readonly source: NormalizedPath;
  readonly className: string;
}

interface DiscoveredAttribute {
  readonly kind: "attribute";
  readonly name: string;
  readonly aliases: readonly string[];
  readonly bindables: Record<string, BindableSpec>;
  readonly primary: string | null;
  readonly isTemplateController: boolean;
  readonly noMultiBindings: boolean;
  readonly source: NormalizedPath;
  readonly className: string;
}

interface DiscoveredValueConverter {
  readonly kind: "valueConverter";
  readonly name: string;
  readonly aliases: readonly string[];
  readonly source: NormalizedPath;
  readonly className: string;
}

interface DiscoveredBindingBehavior {
  readonly kind: "bindingBehavior";
  readonly name: string;
  readonly aliases: readonly string[];
  readonly source: NormalizedPath;
  readonly className: string;
}

type DiscoveredResource =
  | DiscoveredElement
  | DiscoveredAttribute
  | DiscoveredValueConverter
  | DiscoveredBindingBehavior;

interface DiscoveryResult {
  readonly resources: ResourceCollections;
  readonly descriptors: readonly DiscoveredResource[];
}

/**
 * TS-backed project index that discovers Aurelia resources and produces the
 * semantics + resource graph snapshot used by TemplateProgram construction.
 *
 * Discovery is intentionally minimal for now; the index still tracks TS
 * project state and produces a stable fingerprint to drive workspace rebuilds.
 */
export class AureliaProjectIndex {
  #ts: TypeScriptProject;
  #logger: Logger;
  #baseSemantics: Semantics;
  #defaultScope: ResourceScopeId | null;

  #semantics: Semantics;
  #resourceGraph: ResourceGraph;
  #fingerprint: string;

  constructor(options: AureliaProjectIndexOptions) {
    this.#ts = options.ts;
    this.#logger = options.logger;
    this.#baseSemantics = options.baseSemantics ?? DEFAULT_SEMANTICS;
    this.#defaultScope = options.defaultScope ?? null;

    const snapshot = this.#computeSnapshot();
    this.#semantics = snapshot.semantics;
    this.#resourceGraph = snapshot.resourceGraph;
    this.#fingerprint = snapshot.fingerprint;
  }

  async refresh(): Promise<void> {
    const snapshot = this.#computeSnapshot();
    const changed = snapshot.fingerprint !== this.#fingerprint;
    this.#semantics = snapshot.semantics;
    this.#resourceGraph = snapshot.resourceGraph;
    this.#fingerprint = snapshot.fingerprint;
    const status = changed ? "updated" : "unchanged";
    this.#logger.info(`[index] refresh ${status} fingerprint=${this.#fingerprint}`);
  }

  currentResourceGraph(): ResourceGraph {
    return this.#resourceGraph;
  }

  currentSemantics(): Semantics {
    return this.#semantics;
  }

  currentFingerprint(): string {
    return this.#fingerprint;
  }

  #computeSnapshot(): IndexSnapshot {
    const program = this.#ts.getService().getProgram();
    const discovery = program ? discoverResources(program, this.#logger) : emptyDiscovery();
    const semantics = this.#composeSemantics(discovery.resources);
    const resourceGraph = discovery.resources === semantics.resources && semantics.resourceGraph
      ? semantics.resourceGraph
      : buildResourceGraphFromSemantics(semantics);
    const resolvedSemantics = semantics.resourceGraph ? semantics : { ...semantics, resourceGraph };
    const fingerprint = hashObject({
      compilerOptions: normalizeCompilerOptions(this.#ts.compilerOptions()),
      roots: [...this.#ts.getRootFileNames()].sort(),
      semantics: resolvedSemantics,
      resourceGraph,
      discovered: discovery.descriptors.map((d) => ({
        kind: d.kind,
        name: d.name,
        aliases: [...d.aliases],
        source: d.source,
        className: "className" in d ? d.className : null,
      })),
    });
    return { semantics: resolvedSemantics, resourceGraph, fingerprint };
  }

  #composeSemantics(resources: ResourceCollections): Semantics {
    const mergedResources = mergeResources(this.#baseSemantics.resources, resources);
    const defaultScope = this.#defaultScope ?? this.#baseSemantics.defaultScope;
    const semantics: Semantics = {
      ...this.#baseSemantics,
      resources: mergedResources,
    };
    if (defaultScope !== undefined) {
      semantics.defaultScope = defaultScope;
    }
    return semantics;
  }
}

function normalizeCompilerOptions(options: ts.CompilerOptions): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(options).sort()) {
    const value = (options as Record<string, unknown>)[key];
    if (value === undefined) continue;
    normalized[key] = value;
  }
  return normalized;
}

function hashObject(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (value === null) return "null";
  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (type === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    const serialized = entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",");
    return `{${serialized}}`;
  }
  return JSON.stringify(null);
}

function discoverResources(program: ts.Program, logger: Logger): DiscoveryResult {
  const checker = program.getTypeChecker();
  const resources: ResourceCollections = {
    elements: {},
    attributes: {},
    controllers: { ...DEFAULT_SEMANTICS.resources.controllers },
    valueConverters: {},
    bindingBehaviors: {},
  };
  const descriptors: DiscoveredResource[] = [];
  const files = program
    .getSourceFiles()
    .filter((sf) => !sf.isDeclarationFile)
    .sort((a, b) => a.fileName.localeCompare(b.fileName));

  for (const sf of files) {
    for (const node of sf.statements) {
      if (!ts.isClassDeclaration(node) || !node.name) continue;
      const discovered = discoverClassResource(node, checker, canonicalPath(sf.fileName), logger);
      if (!discovered) continue;
      registerResource(discovered, resources, descriptors, logger);
    }
  }

  return { resources, descriptors };
}

function discoverClassResource(
  node: ts.ClassDeclaration,
  checker: ts.TypeChecker,
  fileName: NormalizedPath,
  logger: Logger,
): DiscoveredResource | null {
  const facts = collectClassDecoratorFacts(node, checker);
  const bindablesFromMembers = collectBindableMembers(node, checker);
  const className = node.name?.text ?? "anonymous";

  if (facts.element) {
    const bindables = mergeBindableSpecs(facts.element.bindables, bindablesFromMembers);
    const { bindables: bindableMap } = buildBindableMap(bindables);
    const name = canonicalElementName(facts.element.name ?? className);
    if (!name) return null;
    const aliases = canonicalAliases(facts.element.aliases);
    return {
      kind: "element",
      name,
      aliases,
      bindables: bindableMap,
      containerless: facts.element.containerless || facts.containerless,
      boundary: true,
      source: fileName,
      className,
    };
  }

  if (facts.attribute) {
    const bindables = mergeBindableSpecs(facts.attribute.bindables, bindablesFromMembers);
    const { bindables: bindableMap, primary } = buildBindableMap(bindables);
    const name = canonicalAttrName(facts.attribute.name ?? className);
    if (!name) return null;
    const aliases = canonicalAliases(facts.attribute.aliases);
    const isTemplateController = facts.attribute.isTemplateController || facts.templateController;
    return {
      kind: "attribute",
      name,
      aliases,
      bindables: bindableMap,
      primary,
      isTemplateController,
      noMultiBindings: facts.attribute.noMultiBindings,
      source: fileName,
      className,
    };
  }

  if (facts.valueConverter) {
    const name = canonicalSimpleName(facts.valueConverter.name ?? className);
    if (!name) return null;
    return {
      kind: "valueConverter",
      name,
      aliases: canonicalAliases(facts.valueConverter.aliases),
      source: fileName,
      className,
    };
  }

  if (facts.bindingBehavior) {
    const name = canonicalSimpleName(facts.bindingBehavior.name ?? className);
    if (!name) return null;
    return {
      kind: "bindingBehavior",
      name,
      aliases: canonicalAliases(facts.bindingBehavior.aliases),
      source: fileName,
      className,
    };
  }

  return null;
}

interface DecoratorFacts {
  element?: {
    name?: string;
    aliases: string[];
    bindables: BindableSpec[];
    containerless: boolean;
  };
  attribute?: {
    name?: string;
    aliases: string[];
    bindables: BindableSpec[];
    isTemplateController: boolean;
    noMultiBindings: boolean;
  };
  valueConverter?: {
    name?: string;
    aliases: string[];
  };
  bindingBehavior?: {
    name?: string;
    aliases: string[];
  };
  containerless: boolean;
  templateController: boolean;
}

function collectClassDecoratorFacts(node: ts.ClassDeclaration, checker: ts.TypeChecker): DecoratorFacts {
  const facts: DecoratorFacts = {
    containerless: false,
    templateController: false,
  };
  const decorators = decoratorsOf(node);
  for (const dec of decorators) {
    const parsed = parseDecorator(dec, checker);
    if (!parsed) continue;
    if (parsed.kind === "customElement") {
      const existing = facts.element;
      const name = parsed.name ?? existing?.name;
      const base = {
        aliases: [...(existing?.aliases ?? []), ...parsed.aliases],
        bindables: [...(existing?.bindables ?? []), ...parsed.bindables],
        containerless: (existing?.containerless ?? false) || parsed.containerless,
      };
      facts.element = name !== undefined ? { ...base, name } : base;
    } else if (parsed.kind === "customAttribute") {
      const existing = facts.attribute;
      const name = parsed.name ?? existing?.name;
      const base = {
        aliases: [...(existing?.aliases ?? []), ...parsed.aliases],
        bindables: [...(existing?.bindables ?? []), ...parsed.bindables],
        isTemplateController: (existing?.isTemplateController ?? false) || parsed.isTemplateController,
        noMultiBindings: (existing?.noMultiBindings ?? false) || parsed.noMultiBindings,
      };
      facts.attribute = name !== undefined ? { ...base, name } : base;
    } else if (parsed.kind === "valueConverter") {
      const existing = facts.valueConverter;
      const name = parsed.name ?? existing?.name;
      const base = { aliases: [...(existing?.aliases ?? []), ...parsed.aliases] };
      facts.valueConverter = name !== undefined ? { ...base, name } : base;
    } else if (parsed.kind === "bindingBehavior") {
      const existing = facts.bindingBehavior;
      const name = parsed.name ?? existing?.name;
      const base = { aliases: [...(existing?.aliases ?? []), ...parsed.aliases] };
      facts.bindingBehavior = name !== undefined ? { ...base, name } : base;
    } else if (parsed.kind === "containerless") {
      facts.containerless = true;
    } else if (parsed.kind === "templateController") {
      facts.templateController = true;
    }
  }
  return facts;
}

function parseDecorator(dec: ts.Decorator, checker: ts.TypeChecker):
  | { kind: "customElement"; name?: string; aliases: string[]; bindables: BindableSpec[]; containerless: boolean }
  | { kind: "customAttribute"; name?: string; aliases: string[]; bindables: BindableSpec[]; isTemplateController: boolean; noMultiBindings: boolean }
  | { kind: "valueConverter"; name?: string; aliases: string[] }
  | { kind: "bindingBehavior"; name?: string; aliases: string[] }
  | { kind: "containerless" }
  | { kind: "templateController" }
  | null {
  const call = unwrapDecorator(dec);
  if (!call) return null;
  const name = call.name;
  if (name === "containerless") return { kind: "containerless" };
  if (name === "templateController") return { kind: "templateController" };
  if (name === "customElement") {
    const meta = parseResourceOptions(call.args[0], checker);
    return { kind: "customElement", ...meta };
  }
  if (name === "customAttribute") {
    const meta = parseResourceOptions(call.args[0], checker);
    const result: { kind: "customAttribute"; name?: string; aliases: string[]; bindables: BindableSpec[]; isTemplateController: boolean; noMultiBindings: boolean } = {
      kind: "customAttribute",
      aliases: meta.aliases,
      bindables: meta.bindables,
      isTemplateController: meta.templateController,
      noMultiBindings: meta.noMultiBindings,
    };
    if (meta.name !== undefined) result.name = meta.name;
    return result;
  }
  if (name === "valueConverter") {
    const meta = parseNameOnlyOptions(call.args[0]);
    return { kind: "valueConverter", ...meta };
  }
  if (name === "bindingBehavior") {
    const meta = parseNameOnlyOptions(call.args[0]);
    return { kind: "bindingBehavior", ...meta };
  }
  return null;
}

function parseResourceOptions(
  arg: ts.Expression | undefined,
  checker: ts.TypeChecker,
): ResourceOptionParse {
  if (!arg) return { aliases: [], bindables: [], containerless: false, templateController: false, noMultiBindings: false };
  if (ts.isStringLiteralLike(arg)) {
    return { name: arg.text, aliases: [], bindables: [], containerless: false, templateController: false, noMultiBindings: false };
  }
  if (!ts.isObjectLiteralExpression(arg)) return { aliases: [], bindables: [], containerless: false, templateController: false, noMultiBindings: false };

  const name = readStringProp(arg, "name");
  const alias = readStringProp(arg, "alias");
  const aliases = [...readStringArrayProp(arg, "aliases"), ...(alias ? [alias] : [])];
  const bindables = readBindables(arg, checker);
  const containerless = readBooleanProp(arg, "containerless") ?? false;
  const templateController = (readBooleanProp(arg, "isTemplateController") ?? readBooleanProp(arg, "templateController")) ?? false;
  const noMultiBindings = readBooleanProp(arg, "noMultiBindings") ?? false;
  const result: ResourceOptionParse = { aliases, bindables, containerless, templateController, noMultiBindings };
  if (name !== undefined) result.name = name;
  return result;
}

function parseNameOnlyOptions(
  arg: ts.Expression | undefined,
): NameOnlyOptions {
  if (!arg) return { aliases: [] };
  if (ts.isStringLiteralLike(arg)) return { name: arg.text, aliases: [] };
  if (!ts.isObjectLiteralExpression(arg)) return { aliases: [] };
  const name = readStringProp(arg, "name");
  const alias = readStringProp(arg, "alias");
  const aliases = readStringArrayProp(arg, "aliases");
  const result: NameOnlyOptions = { aliases: alias ? [...aliases, alias] : aliases };
  if (name !== undefined) result.name = name;
  return result;
}

function readBindables(obj: ts.ObjectLiteralExpression, checker: ts.TypeChecker): BindableSpec[] {
  const prop = getProp(obj, "bindables");
  if (!prop || !ts.isArrayLiteralExpression(prop.initializer)) return [];
  const specs: BindableSpec[] = [];
  for (const element of prop.initializer.elements) {
    if (ts.isStringLiteralLike(element)) {
      const name = canonicalBindableName(element.text) ?? element.text;
      specs.push({ name });
    } else if (ts.isObjectLiteralExpression(element)) {
      const name = readStringProp(element, "name") ?? readStringProp(element, "property");
      if (!name) continue;
      const mode = parseBindingMode(getProp(element, "mode")?.initializer);
      const primary = readBooleanProp(element, "primary") ?? false;
      specs.push({
        name: canonicalBindableName(name) ?? name,
        ...(mode ? { mode } : {}),
        ...(primary ? { primary: true } : {}),
      });
    }
  }
  const bindableProp = getProp(obj, "bindable");
  if (bindableProp && ts.isStringLiteralLike(bindableProp.initializer)) {
    const name = canonicalBindableName(bindableProp.initializer.text) ?? bindableProp.initializer.text;
    specs.push({ name });
  }
  return specs;
}

function collectBindableMembers(node: ts.ClassDeclaration, checker: ts.TypeChecker): BindableSpec[] {
  const bindables: BindableSpec[] = [];
  for (const member of node.members) {
    if (!ts.isPropertyDeclaration(member) && !ts.isGetAccessorDeclaration(member) && !ts.isSetAccessorDeclaration(member)) continue;
    if (!member.name || !ts.isIdentifier(member.name) && !ts.isStringLiteralLike(member.name)) continue;
    const canonicalName = canonicalBindableName(member.name.text);
    if (!canonicalName) continue;
    const decorators = decoratorsOf(member);
    for (const dec of decorators) {
      const parsed = parseBindableDecorator(dec, checker);
      if (!parsed) continue;
      const type = inferTypeName(member, checker);
      bindables.push({
        name: canonicalName,
        ...(parsed.mode ? { mode: parsed.mode } : {}),
        ...(parsed.primary ? { primary: true } : {}),
        ...(type ? { type } : {}),
      });
    }
  }
  return bindables;
}

function parseBindableDecorator(dec: ts.Decorator, checker: ts.TypeChecker): { mode?: BindingMode; primary?: boolean } | null {
  const call = unwrapDecorator(dec);
  if (!call || call.name !== "bindable") return null;
  const arg = call.args[0];
  if (!arg) return {};
  if (ts.isStringLiteralLike(arg)) return {};
  if (!ts.isObjectLiteralExpression(arg)) return {};
  const mode = parseBindingMode(getProp(arg, "mode")?.initializer);
  const primary = readBooleanProp(arg, "primary");
  const result: { mode?: BindingMode; primary?: boolean } = {};
  if (mode) result.mode = mode;
  if (primary) result.primary = true;
  return result;
}

function parseBindingMode(expr: ts.Expression | undefined): BindingMode | undefined {
  if (!expr) return undefined;
  if (ts.isStringLiteralLike(expr)) return toBindingMode(expr.text);
  if (ts.isPropertyAccessExpression(expr)) return toBindingMode(expr.name.text);
  if (ts.isIdentifier(expr)) return toBindingMode(expr.text);
  return undefined;
}

function toBindingMode(value: string): BindingMode | undefined {
  const normalized = value.trim();
  if (normalized === "oneTime" || normalized === "toView" || normalized === "fromView" || normalized === "twoWay" || normalized === "default") {
    return normalized;
  }
  return undefined;
}

function inferTypeName(node: ts.Node, checker: ts.TypeChecker): string | null {
  try {
    const type = checker.getTypeAtLocation(node);
    if (!type) return null;
    const text = checker.typeToString(type);
    return text || null;
  } catch {
    return null;
  }
}

function mergeBindableSpecs(
  base: BindableSpec[],
  overrides: BindableSpec[],
): BindableSpec[] {
  const merged = new Map<string, BindableSpec>();
  for (const spec of base) merged.set(spec.name, spec);
  for (const spec of overrides) {
    const existing = merged.get(spec.name);
    const next: BindableSpec = {
      name: spec.name,
      ...(existing?.mode !== undefined ? { mode: existing.mode } : {}),
      ...(existing?.primary !== undefined ? { primary: existing.primary } : {}),
      ...(existing?.type !== undefined ? { type: existing.type } : {}),
      ...(spec.mode !== undefined ? { mode: spec.mode } : {}),
      ...(spec.primary !== undefined ? { primary: spec.primary } : {}),
      ...(spec.type !== undefined ? { type: spec.type } : {}),
    };
    merged.set(spec.name, next);
  }
  return Array.from(merged.values());
}

function buildBindableMap(bindables: BindableSpec[]): { bindables: Record<string, BindableSpec>; primary: string | null } {
  const map: Record<string, BindableSpec> = {};
  const sorted = [...bindables].sort((a, b) => a.name.localeCompare(b.name));
  let primary: string | null = null;
  for (const spec of sorted) {
    map[spec.name] = spec;
    if (primary === null && spec.primary) primary = spec.name;
  }
  if (primary === null && sorted.length === 1) primary = sorted[0]?.name ?? null;
  return { bindables: map, primary };
}

function registerResource(
  resource: DiscoveredResource,
  resources: ResourceCollections,
  descriptors: DiscoveredResource[],
  logger: Logger,
): void {
  if (resource.kind === "element") {
    const existing = resources.elements[resource.name];
    if (existing) {
      logger.warn(`[index] duplicate custom element '${resource.name}' discovered in ${resource.source}; keeping existing`);
      return;
    }
    const bindables = toBindableRecord(resource.bindables);
    const aliases = resource.aliases.length ? { aliases: [...resource.aliases] } : {};
    resources.elements[resource.name] = {
      kind: "element",
      name: resource.name,
      ...aliases,
      bindables,
      containerless: resource.containerless,
      boundary: resource.boundary,
    };
    descriptors.push(resource);
    return;
  }

  if (resource.kind === "attribute") {
    const existing = resources.attributes[resource.name];
    if (existing) {
      logger.warn(`[index] duplicate custom attribute '${resource.name}' discovered in ${resource.source}; keeping existing`);
      return;
    }
    const bindables = toBindableRecord(resource.bindables);
    const aliases = resource.aliases.length ? { aliases: [...resource.aliases] } : {};
    const primary = resource.primary !== null ? { primary: resource.primary } : {};
    const templateController = resource.isTemplateController ? { isTemplateController: true } : {};
    const noMultiBindings = resource.noMultiBindings ? { noMultiBindings: true } : {};
    resources.attributes[resource.name] = {
      kind: "attribute",
      name: resource.name,
      ...aliases,
      bindables,
      ...primary,
      ...templateController,
      ...noMultiBindings,
    };
    descriptors.push(resource);
    return;
  }

  if (resource.kind === "valueConverter") {
    const existing = resources.valueConverters[resource.name];
    if (existing) {
      logger.warn(`[index] duplicate value converter '${resource.name}' discovered in ${resource.source}; keeping existing`);
      return;
    }
    resources.valueConverters[resource.name] = {
      name: resource.name,
      in: { kind: "unknown" },
      out: { kind: "unknown" },
    };
    descriptors.push(resource);
    return;
  }

  if (resource.kind === "bindingBehavior") {
    const existing = resources.bindingBehaviors[resource.name];
    if (existing) {
      logger.warn(`[index] duplicate binding behavior '${resource.name}' discovered in ${resource.source}; keeping existing`);
      return;
    }
    resources.bindingBehaviors[resource.name] = { name: resource.name };
    descriptors.push(resource);
  }
}

function toBindableRecord(specs: Record<string, BindableSpec>): Record<string, { name: string; mode?: BindingMode; type?: { kind: "ts"; name: string } | { kind: "unknown" } }> {
  const entries = Object.values(specs).sort((a, b) => a.name.localeCompare(b.name));
  const record: Record<string, { name: string; mode?: BindingMode; type?: { kind: "ts"; name: string } | { kind: "unknown" } }> = {};
  for (const spec of entries) {
    record[spec.name] = {
      name: spec.name,
      ...(spec.mode ? { mode: spec.mode } : {}),
      type: spec.type ? { kind: "ts", name: spec.type } : { kind: "unknown" },
    };
  }
  return record;
}

function canonicalElementName(value: string): string {
  return toKebabCase(value);
}

function canonicalAttrName(value: string): string {
  return toKebabCase(value);
}

function canonicalSimpleName(value: string): string {
  return value.trim().toLowerCase();
}

function canonicalAliases(values: readonly string[]): string[] {
  const canonical = values.map((v) => toKebabCase(v)).filter(Boolean);
  const unique = Array.from(new Set(canonical));
  unique.sort((a, b) => a.localeCompare(b));
  return unique;
}

function canonicalBindableName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/-([a-zA-Z0-9])/g, (_, c) => c.toUpperCase());
}

function toKebabCase(value: string): string {
  const normalized = value.replace(/[\s_]+/g, "-").replace(/([a-z0-9])([A-Z])/g, "$1-$2");
  return normalized.replace(/-+/g, "-").toLowerCase();
}

function unwrapDecorator(dec: ts.Decorator): { name: string; args: readonly ts.Expression[] } | null {
  const expr = dec.expression;
  if (ts.isIdentifier(expr)) {
    return { name: expr.text, args: [] };
  }
  if (ts.isCallExpression(expr)) {
    const callee = expr.expression;
    if (ts.isIdentifier(callee)) return { name: callee.text, args: expr.arguments };
    if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.name)) {
      return { name: callee.name.text, args: expr.arguments };
    }
  }
  return null;
}

function decoratorsOf(node: ts.Node): readonly ts.Decorator[] {
  const helper = ts.canHaveDecorators(node) ? ts.getDecorators(node) : undefined;
  const direct = (node as ts.Node & { decorators?: readonly ts.Decorator[] }).decorators;
  return (helper ?? direct ?? []) as readonly ts.Decorator[];
}

function getProp(obj: ts.ObjectLiteralExpression, name: string): ts.PropertyAssignment | undefined {
  return obj.properties.find(
    (p): p is ts.PropertyAssignment =>
      ts.isPropertyAssignment(p) &&
      ((ts.isIdentifier(p.name) && p.name.text === name) || (ts.isStringLiteralLike(p.name) && p.name.text === name)),
  );
}

function readStringProp(obj: ts.ObjectLiteralExpression, name: string): string | undefined {
  const prop = getProp(obj, name);
  if (!prop) return undefined;
  const init = prop.initializer;
  return ts.isStringLiteralLike(init) ? init.text : undefined;
}

function readBooleanProp(obj: ts.ObjectLiteralExpression, name: string): boolean | undefined {
  const prop = getProp(obj, name);
  if (!prop) return undefined;
  const init = prop.initializer;
  if (init.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (init.kind === ts.SyntaxKind.FalseKeyword) return false;
  return undefined;
}

function readStringArrayProp(obj: ts.ObjectLiteralExpression, name: string): string[] {
  const prop = getProp(obj, name);
  if (!prop) return [];
  const init = prop.initializer;
  if (ts.isStringLiteralLike(init)) return [init.text];
  if (!ts.isArrayLiteralExpression(init)) return [];
  const values: string[] = [];
  for (const element of init.elements) {
    if (ts.isStringLiteralLike(element)) values.push(element.text);
  }
  return values;
}

function canonicalPath(fileName: string): NormalizedPath {
  const normalized = path.normalize(fileName);
  const normalizedCase = ts.sys.useCaseSensitiveFileNames ? normalized : normalized.toLowerCase();
  return normalizedCase as NormalizedPath;
}

function mergeResources(base: ResourceCollections, discovered: ResourceCollections): ResourceCollections {
  return {
    elements: { ...base.elements, ...discovered.elements },
    attributes: { ...base.attributes, ...discovered.attributes },
    controllers: { ...base.controllers, ...discovered.controllers },
    valueConverters: { ...base.valueConverters, ...discovered.valueConverters },
    bindingBehaviors: { ...base.bindingBehaviors, ...discovered.bindingBehaviors },
  };
}

function emptyDiscovery(): DiscoveryResult {
  const empty: ResourceCollections = {
    elements: {},
    attributes: {},
    controllers: { ...DEFAULT_SEMANTICS.resources.controllers },
    valueConverters: {},
    bindingBehaviors: {},
  };
  return { resources: empty, descriptors: [] };
}
