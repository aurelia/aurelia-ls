import { createHash } from 'node:crypto';

import type {
  TemplateCompilerCompiledHandoffAttribute,
  TemplateCompilerCompiledHandoffBindable,
  TemplateCompilerCompiledHandoffDependencyReference,
  TemplateCompilerCompiledHandoffDefinition,
  TemplateCompilerCompiledHandoffElement,
  TemplateCompilerCompiledHandoffInstructionValue,
  TemplateCompilerCompiledHandoffSpreadCase,
  TemplateCompilerCompiledHandoffSpreadPlan,
  TemplateCompilerCompiledHandoffTree,
  TemplateCompilerCompiledHandoffValue,
} from '@aurelia-ls/semantic-runtime/browser-template';
import {
  TemplateCompilerFrameworkInstructionType,
  TemplateCompilerRuntimeElementDataKind,
} from '@aurelia-ls/semantic-runtime/browser-template';

import {
  AOT_RUNTIME_SPREAD_PLAN_PROTOCOL,
  type AotRuntimeSpreadPlanCase,
} from './runtime-spread-plan.js';

const htmlNamespace = 'http://www.w3.org/1999/xhtml';
const htmlVoidElements = new Set([
  'area',
  'base',
  'basefont',
  'bgsound',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'keygen',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);
export type AotArtifactErrorCode =
  | 'AOT_ARTIFACT_INVALID_HANDOFF'
  | 'AOT_ARTIFACT_UNSUPPORTED_HEADER'
  | 'AOT_ARTIFACT_UNSUPPORTED_VALUE';

export class AotArtifactError extends Error {
  public constructor(
    readonly code: AotArtifactErrorCode,
    message: string,
    readonly sourcePath: string,
  ) {
    super(message);
    this.name = 'AotArtifactError';
  }
}

export interface AotRawSourceMap {
  readonly version: 3;
  readonly file: string;
  readonly sources: string[];
  readonly sourcesContent: string[];
  readonly names: string[];
  readonly mappings: string;
}

export interface AotTemplateModuleArtifact {
  readonly sourcePath: string;
  readonly definitionName: string;
  readonly needsCompile: false;
  readonly code: string;
  readonly map: AotRawSourceMap;
  readonly digest: string;
}

export interface AotTemplateModuleEmissionRequest {
  readonly handoff: TemplateCompilerCompiledHandoffValue;
  readonly projectRoot: string;
  readonly sourcePath: string;
  readonly sourceText: string;
}

export interface AotDefinitionDependencyPlan {
  readonly imports: readonly string[];
  readonly byDefinitionId: ReadonlyMap<string, readonly string[]>;
}

/** Shared compiler-final definition serializer used by complete HTML modules and carrier patches. */
export class AotCompiledTemplateEmission {
  public readonly definitions: readonly TemplateCompilerCompiledHandoffDefinition[];
  public readonly root: TemplateCompilerCompiledHandoffDefinition;
  readonly #definitionById: ReadonlyMap<string, TemplateCompilerCompiledHandoffDefinition>;
  readonly #variableByDefinitionId: ReadonlyMap<string, string>;
  readonly #realizedNameByDefinitionId: ReadonlyMap<string, string>;

  public constructor(readonly request: AotTemplateModuleEmissionRequest) {
    const definitions = new Map(request.handoff.definitions.map((definition) => [
      definition.definitionId,
      definition,
    ]));
    if (definitions.size !== request.handoff.definitions.length) {
      throw invalidHandoff(request, 'Compiled handoff contains duplicate definition ids.');
    }
    const root = definitions.get(request.handoff.rootDefinitionId);
    if (root == null || root.owner.ownerKind !== 'root') {
      throw invalidHandoff(request, 'Compiled handoff has no exact root definition.');
    }
    if (root.header.name !== request.handoff.resourceName || root.header.name == null) {
      throw invalidHandoff(request, 'Compiled handoff root name disagrees with its resource name.');
    }
    this.definitions = request.handoff.definitions;
    this.root = root;
    this.#definitionById = definitions;
    this.#variableByDefinitionId = new Map(request.handoff.definitions.map((definition, index) => [
      definition.definitionId,
      `$definition${index}`,
    ]));
    this.#realizedNameByDefinitionId = new Map(request.handoff.definitions.map((definition, index) => [
      definition.definitionId,
      definition.header.name ?? `${request.handoff.resourceName}-view-${index}`,
    ]));
  }

  public declarationLines(): readonly string[] {
    return this.definitions.map((definition) =>
      `const ${this.variableFor(definition.definitionId)} = {};`
    );
  }

  public dependencyPlanFor(
    definitions: readonly TemplateCompilerCompiledHandoffDefinition[],
  ): AotDefinitionDependencyPlan {
    return planDependencies(this.request, definitions);
  }

  public completeDefinitionValue(
    definition: TemplateCompilerCompiledHandoffDefinition,
    dependencies: AotDefinitionDependencyPlan,
  ): string {
    validateHeader(definition, this.request);
    return definitionValue(
      definition,
      this.request,
      this.#variableByDefinitionId,
      this.#realizedNameByDefinitionId,
      dependencies.byDefinitionId,
    );
  }

  public compilerPatchValue(definition: TemplateCompilerCompiledHandoffDefinition = this.root): string {
    if (definition.header.needsCompile !== false) {
      throw invalidHandoff(this.request, `Definition '${definition.definitionId}' is not compiler-final.`);
    }
    return objectLiteral({
      template: emitTemplateNodeValue(definition.tree, this.request),
      instructions: instructionRows(definition.rows, this.request, this.#variableByDefinitionId),
      surrogates: instructionList(
        definition.surrogates.map((entry) => entry.value),
        this.request,
        this.#variableByDefinitionId,
      ),
      hasSlots: emitJavaScriptValue(definition.header.hasSlots, this.request),
      needsCompile: 'false',
      compilerAddedDependencies: '[]',
    });
  }

  public variableFor(definitionId: string): string {
    if (!this.#definitionById.has(definitionId)) {
      throw invalidHandoff(this.request, `Compiled handoff cannot resolve '${definitionId}'.`);
    }
    return requireMap(this.#variableByDefinitionId, definitionId, this.request);
  }
}

/** Realize one detached semantic-runtime handoff as the module namespace consumed by Aurelia conventions. */
export class AotTemplateModuleEmitter {
  public emit(request: AotTemplateModuleEmissionRequest): AotTemplateModuleArtifact {
    const emission = new AotCompiledTemplateEmission(request);
    const dependencies = emission.dependencyPlanFor(emission.definitions);
    const lines: string[] = [
      "import { CustomElement } from '@aurelia/runtime-html';",
      ...dependencies.imports,
      '',
      ...emission.declarationLines(),
      '',
    ];

    for (const definition of [...emission.definitions].reverse()) {
      const variable = emission.variableFor(definition.definitionId);
      const value = emission.completeDefinitionValue(definition, dependencies);
      lines.push(`Object.assign(${variable}, ${value});`);
    }

    const rootVariable = emission.variableFor(emission.root.definitionId);
    lines.push(
      '',
      `export const name = ${rootVariable}.name;`,
      `export const template = ${rootVariable}.template;`,
      'export default template;',
      `export const dependencies = ${rootVariable}.dependencies;`,
      `export const bindables = ${rootVariable}.bindables;`,
      `export const aliases = ${rootVariable}.aliases;`,
      `export const capture = ${rootVariable}.capture;`,
      `export const containerless = ${rootVariable}.containerless;`,
      `export const shadowOptions = ${rootVariable}.shadowOptions;`,
      `export const hasSlots = ${rootVariable}.hasSlots;`,
      `export const enhance = ${rootVariable}.enhance;`,
      `export const strict = ${rootVariable}.strict;`,
      `export const needsCompile = ${rootVariable}.needsCompile;`,
      `export const instructions = ${rootVariable}.instructions;`,
      `export const surrogates = ${rootVariable}.surrogates;`,
      '',
      'let $registeredDefinition;',
      'export function register(container) {',
      `  $registeredDefinition ??= CustomElement.define(${rootVariable});`,
      '  container.register($registeredDefinition);',
      '}',
      '',
    );

    const code = lines.join('\n');
    const map = createAotRawSourceMap(request, '?aurelia-aot');
    return {
      sourcePath: request.sourcePath,
      definitionName: request.handoff.resourceName,
      needsCompile: false,
      code,
      map,
      digest: digestAotArtifact(code, map),
    };
  }
}

export function createAotRawSourceMap(
  request: AotTemplateModuleEmissionRequest,
  generatedFileSuffix: string,
): AotRawSourceMap {
  return {
    version: 3,
    file: `${request.sourcePath}${generatedFileSuffix}`,
    sources: [request.sourcePath],
    sourcesContent: [request.sourceText],
    names: [],
    // One honest coarse segment. Fine-grained generated-field mapping remains a separate G9 gate.
    mappings: 'AAAA',
  };
}

export function digestAotArtifact(code: string, map: AotRawSourceMap): string {
  return `sha256:${createHash('sha256').update(code).update('\0').update(JSON.stringify(map)).digest('hex')}`;
}

function definitionValue(
  definition: TemplateCompilerCompiledHandoffDefinition,
  request: AotTemplateModuleEmissionRequest,
  variableByDefinitionId: ReadonlyMap<string, string>,
  realizedNameByDefinitionId: ReadonlyMap<string, string>,
  dependenciesByDefinitionId: ReadonlyMap<string, readonly string[]>,
): string {
  const header = definition.header;
  const fields = [
    ['type', emitJavaScriptValue(header.type, request)],
    ['name', emitJavaScriptValue(requireMap(realizedNameByDefinitionId, definition.definitionId, request), request)],
    ['template', emitTemplateNodeValue(definition.tree, request)],
    ['dependencies', `[${(dependenciesByDefinitionId.get(definition.definitionId) ?? []).join(', ')}]`],
    ['bindables', bindableRecord(header.bindables, request)],
    ['aliases', emitJavaScriptValue(header.aliases, request)],
    ['capture', captureValue(header.capture.kind, request)],
    ['containerless', emitJavaScriptValue(header.containerless, request)],
    ['shadowOptions', emitJavaScriptValue(header.shadowOptions, request)],
    ['hasSlots', emitJavaScriptValue(header.hasSlots, request)],
    ['enhance', emitJavaScriptValue(header.enhance, request)],
    ['strict', emitJavaScriptValue(header.strict ?? false, request)],
    ['needsCompile', 'false'],
    ['instructions', instructionRows(definition.rows, request, variableByDefinitionId)],
    ['surrogates', instructionList(definition.surrogates.map((entry) => entry.value), request, variableByDefinitionId)],
  ] as const;
  return `{ ${fields.map(([name, value]) => `${name}: ${value}`).join(', ')} }`;
}

function validateHeader(
  definition: TemplateCompilerCompiledHandoffDefinition,
  request: AotTemplateModuleEmissionRequest,
): void {
  const header = definition.header;
  if (header.needsCompile !== false) {
    throw invalidHandoff(request, `Definition '${definition.definitionId}' is not compiler-final.`);
  }
  if (String(header.capture.kind) !== 'none' && String(header.capture.kind) !== 'all') {
    throw unsupportedHeader(request, `Definition '${definition.definitionId}' has a capture predicate.`);
  }
  if (header.watches.length > 0) {
    throw unsupportedHeader(request, `Definition '${definition.definitionId}' has executable watches.`);
  }
  for (const bindable of header.bindables) {
    if (String(bindable.setter.kind) !== 'default') {
      throw unsupportedHeader(
        request,
        `Bindable '${bindable.name}' on '${definition.definitionId}' has executable setter '${bindable.setter.kind}'.`,
      );
    }
  }
}

function planDependencies(
  request: AotTemplateModuleEmissionRequest,
  definitions: readonly TemplateCompilerCompiledHandoffDefinition[],
): AotDefinitionDependencyPlan {
  const variableByModule = new Map<string, string>();
  const byDefinitionId = new Map<string, readonly string[]>();
  for (const definition of definitions) {
    const variables = definition.header.dependencies.map((dependency) => {
      validateDependency(dependency, definition.definitionId, request);
      const moduleKey = dependency.moduleKey!;
      let variable = variableByModule.get(moduleKey);
      if (variable == null) {
        variable = `$dependency${variableByModule.size}`;
        variableByModule.set(moduleKey, variable);
      }
      return variable;
    });
    byDefinitionId.set(definition.definitionId, variables);
  }
  const imports = [...variableByModule].map(([moduleKey, variable]) => {
    const target = pathForModuleKey(moduleKey, request);
    const specifier = relativeModuleSpecifier(request.sourcePath, target);
    return `import * as ${variable} from ${JSON.stringify(specifier)};`;
  });
  return { imports, byDefinitionId };
}

function validateDependency(
  dependency: TemplateCompilerCompiledHandoffDependencyReference,
  definitionId: string,
  request: AotTemplateModuleEmissionRequest,
): void {
  if (
    dependency.moduleKey == null
    || dependency.localName != null
    || dependency.registryKind != null
    || dependency.cssModulesInput != null
    || String(dependency.dependencyKind) !== 'resource'
  ) {
    throw unsupportedHeader(
      request,
      `Definition '${definitionId}' has dependency '${dependency.keyName ?? '(unnamed)'}' without one whole resource module.`,
    );
  }
}

function pathForModuleKey(moduleKey: string, request: AotTemplateModuleEmissionRequest): string {
  if (/^(?:[A-Za-z]:[\\/]|\/)/u.test(moduleKey)) return moduleKey;
  return `${request.projectRoot.replace(/[\\/]$/u, '')}/${moduleKey}`;
}

function relativeModuleSpecifier(sourcePath: string, targetPath: string): string {
  const sourceSegments = sourcePath.replaceAll('\\', '/').split('/');
  sourceSegments.pop();
  const targetSegments = targetPath.replaceAll('\\', '/').split('/');
  while (
    sourceSegments.length > 0
    && targetSegments.length > 0
    && sourceSegments[0]?.toLowerCase() === targetSegments[0]?.toLowerCase()
  ) {
    sourceSegments.shift();
    targetSegments.shift();
  }
  const relative = `${'../'.repeat(sourceSegments.length)}${targetSegments.join('/')}`;
  return relative.startsWith('.') ? relative : `./${relative}`;
}

function captureValue(kind: string, request: AotTemplateModuleEmissionRequest): string {
  if (kind === 'none') return 'false';
  if (kind === 'all') return 'true';
  throw unsupportedHeader(request, `Capture kind '${kind}' cannot be emitted.`);
}

function bindableRecord(
  bindables: readonly TemplateCompilerCompiledHandoffBindable[],
  request: AotTemplateModuleEmissionRequest,
): string {
  const values = bindables.map((bindable) => {
    const value = {
      name: bindable.name,
      attribute: bindable.attribute,
      callback: bindable.callback,
      mode: bindable.mode,
    };
    return `${emitJavaScriptValue(bindable.name, request)}: ${emitJavaScriptValue(value, request)}`;
  });
  return `{ ${values.join(', ')} }`;
}

function instructionRows(
  rows: readonly (readonly { readonly value: TemplateCompilerCompiledHandoffInstructionValue }[])[],
  request: AotTemplateModuleEmissionRequest,
  variableByDefinitionId: ReadonlyMap<string, string>,
): string {
  return `[${rows.map((row) => instructionList(row.map((entry) => entry.value), request, variableByDefinitionId)).join(', ')}]`;
}

function instructionList(
  values: readonly TemplateCompilerCompiledHandoffInstructionValue[],
  request: AotTemplateModuleEmissionRequest,
  variableByDefinitionId: ReadonlyMap<string, string>,
): string {
  return `[${values.map((value) => instructionValue(value, request, variableByDefinitionId)).join(', ')}]`;
}

function instructionValue(
  value: TemplateCompilerCompiledHandoffInstructionValue,
  request: AotTemplateModuleEmissionRequest,
  variableByDefinitionId: ReadonlyMap<string, string>,
): string {
  if (value.type === TemplateCompilerFrameworkInstructionType.HydrateTemplateController) {
    return objectLiteral({
      type: emitJavaScriptValue(value.type, request),
      def: requireMap(variableByDefinitionId, value.def.definitionId, request),
      res: emitJavaScriptValue(value.res, request),
      alias: 'void 0',
      props: instructionList(value.props, request, variableByDefinitionId),
    });
  }
  if (value.type === TemplateCompilerFrameworkInstructionType.HydrateAttribute) {
    return objectLiteral({
      type: emitJavaScriptValue(value.type, request),
      res: emitJavaScriptValue(value.res, request),
      alias: emitJavaScriptValue(value.alias, request),
      props: instructionList(value.props, request, variableByDefinitionId),
    });
  }
  if (value.type === TemplateCompilerFrameworkInstructionType.HydrateElement) {
    const projections = value.projections == null
      ? 'null'
      : objectLiteral(Object.fromEntries(value.projections.map((projection) => [
          projection.slotName,
          requireMap(variableByDefinitionId, projection.definition.definitionId, request),
        ])));
    const data = value.data.dataKind === TemplateCompilerRuntimeElementDataKind.None
      ? '{}'
      : objectLiteral({ name: emitJavaScriptValue(value.data.name, request) });
    return objectLiteral({
      type: emitJavaScriptValue(value.type, request),
      res: emitJavaScriptValue(value.res, request),
      props: instructionList(value.props, request, variableByDefinitionId),
      projections,
      containerless: emitJavaScriptValue(value.containerless, request),
      captures: spreadCapturesValue(value.captures, value.spreadPlan, request, variableByDefinitionId),
      data,
    });
  }
  if (value.type === TemplateCompilerFrameworkInstructionType.HydrateLetElement) {
    return objectLiteral({
      type: emitJavaScriptValue(value.type, request),
      instructions: instructionList(value.instructions, request, variableByDefinitionId),
      toBindingContext: emitJavaScriptValue(value.toBindingContext, request),
    });
  }
  if (
    value.type === TemplateCompilerFrameworkInstructionType.IteratorBinding
    || value.type === TemplateCompilerFrameworkInstructionType.VirtualizationIterateBinding
  ) {
    return objectLiteral({
      type: emitJavaScriptValue(value.type, request),
      forOf: emitJavaScriptValue(value.forOf, request),
      to: emitJavaScriptValue(value.to, request),
      props: instructionList(value.props, request, variableByDefinitionId),
    });
  }
  if (value.type === TemplateCompilerFrameworkInstructionType.SpreadElementProp) {
    return objectLiteral({
      type: emitJavaScriptValue(value.type, request),
      instruction: instructionValue(value.instruction, request, variableByDefinitionId),
    });
  }
  return emitJavaScriptValue(value, request);
}

function spreadCapturesValue(
  captures: readonly unknown[],
  plan: TemplateCompilerCompiledHandoffSpreadPlan | null,
  request: AotTemplateModuleEmissionRequest,
  variableByDefinitionId: ReadonlyMap<string, string>,
): string {
  const value = emitJavaScriptValue(captures, request);
  if (plan == null) return value;
  const cases = plan.cases.map((entry) => spreadCaseValue(entry, request, variableByDefinitionId));
  return `Object.defineProperty(${value}, Symbol.for(${JSON.stringify(AOT_RUNTIME_SPREAD_PLAN_PROTOCOL)}), { value: [${cases.join(', ')}] })`;
}

function spreadCaseValue(
  value: TemplateCompilerCompiledHandoffSpreadCase,
  request: AotTemplateModuleEmissionRequest,
  variableByDefinitionId: ReadonlyMap<string, string>,
): string {
  const runtimeCase = {
    requestorName: value.requestorName,
    requestorKey: value.requestorKey,
    targetNamespaceUri: value.target.namespaceUri,
    targetLocalName: value.target.localName,
    targetDefinitionMatch: value.target.targetDefinitionMatch,
    targetDefinitionName: value.target.targetDefinitionMatch === 'explicit-definition'
      ? value.target.definitionName
      : null,
    targetDefinitionKey: value.target.targetDefinitionMatch === 'explicit-definition'
      ? value.target.definitionKey
      : null,
  } satisfies Omit<AotRuntimeSpreadPlanCase, 'instructions'>;
  return objectLiteral({
    requestorName: emitJavaScriptValue(runtimeCase.requestorName, request),
    requestorKey: emitJavaScriptValue(runtimeCase.requestorKey, request),
    targetNamespaceUri: emitJavaScriptValue(runtimeCase.targetNamespaceUri, request),
    targetLocalName: emitJavaScriptValue(runtimeCase.targetLocalName, request),
    targetDefinitionMatch: emitJavaScriptValue(runtimeCase.targetDefinitionMatch, request),
    targetDefinitionName: emitJavaScriptValue(runtimeCase.targetDefinitionName, request),
    targetDefinitionKey: emitJavaScriptValue(runtimeCase.targetDefinitionKey, request),
    instructions: instructionList(value.instructions, request, variableByDefinitionId),
  });
}

function emitTemplateNodeValue(
  tree: TemplateCompilerCompiledHandoffTree,
  request: AotTemplateModuleEmissionRequest,
): string {
  const nodes = new Map(tree.nodes.map((node) => [node.nodeId, node]));
  const attributes = new Map(tree.attributes.map((attribute) => [attribute.attributeId, attribute]));
  if (nodes.size !== tree.nodes.length || attributes.size !== tree.attributes.length) {
    throw invalidHandoff(request, 'Compiled tree contains duplicate node or attribute ids.');
  }
  const carrier = nodes.get(tree.compilerCarrierNodeId);
  const content = nodes.get(tree.compilerContentNodeId);
  if (carrier?.nodeKind !== 'element' || carrier.tagName !== 'template' || content?.nodeKind !== 'fragment') {
    throw invalidHandoff(request, 'Compiled tree carrier/content is not one template and fragment pair.');
  }
  const variableByNodeId = new Map(tree.nodes.map((node, index) => [node.nodeId, `$node${index}`]));
  const emitted = new Set<string>();
  const lines = [
    '(() => {',
    '  const $document = globalThis.document;',
    "  if ($document == null) throw new Error('AOT browser template requires globalThis.document.');",
  ];

  const emitNode = (nodeId: string): string => {
    if (emitted.has(nodeId)) {
      throw invalidHandoff(request, `Compiled tree node '${nodeId}' has more than one structural owner.`);
    }
    const node = nodes.get(nodeId);
    if (node == null) throw invalidHandoff(request, `Compiled tree references missing node '${nodeId}'.`);
    emitted.add(nodeId);
    const variable = requireMap(variableByNodeId, nodeId, request);
    switch (node.nodeKind) {
      case 'fragment':
        lines.push(`  const ${variable} = $document.createDocumentFragment();`);
        for (const childId of node.children) {
          const child = emitNode(childId);
          lines.push(`  ${variable}.append(${child});`);
        }
        break;
      case 'element': {
        const create = node.namespaceUri === htmlNamespace
          ? `$document.createElement(${emitJavaScriptValue(node.tagName, request)})`
          : `$document.createElementNS(${emitJavaScriptValue(node.namespaceUri, request)}, ${emitJavaScriptValue(node.tagName, request)})`;
        lines.push(`  const ${variable} = ${create};`);
        emitAttributes(node, variable, attributes, request, lines);
        const childIds = node.templateContentNodeId == null ? node.children : [node.templateContentNodeId];
        const parent = node.templateContentNodeId == null ? variable : `${variable}.content`;
        if (node.namespaceUri === htmlNamespace && htmlVoidElements.has(node.tagName) && childIds.length > 0) {
          throw invalidHandoff(request, `Void element <${node.tagName}> retains compiled children.`);
        }
        for (const childId of childIds) {
          const child = emitNode(childId);
          lines.push(`  ${parent}.append(${child});`);
        }
        break;
      }
      case 'text':
        lines.push(`  const ${variable} = $document.createTextNode(${emitJavaScriptValue(node.text, request)});`);
        break;
      case 'comment':
        lines.push(`  const ${variable} = $document.createComment(${emitJavaScriptValue(node.text, request)});`);
        break;
    }
    return variable;
  };

  const carrierVariable = emitNode(tree.compilerCarrierNodeId);
  if (!emitted.has(tree.compilerContentNodeId)) {
    throw invalidHandoff(request, 'Compiler carrier did not structurally own its compiler content fragment.');
  }
  lines.push(`  return ${carrierVariable};`, '})()');
  return lines.join('\n');
}

function emitAttributes(
  node: TemplateCompilerCompiledHandoffElement,
  variable: string,
  attributes: ReadonlyMap<string, TemplateCompilerCompiledHandoffAttribute>,
  request: AotTemplateModuleEmissionRequest,
  lines: string[],
): void {
  for (const attributeId of node.attributeIds) {
    const attribute = attributes.get(attributeId);
    if (attribute == null) {
      throw invalidHandoff(request, `Compiled tree references missing attribute '${attributeId}'.`);
    }
    const name = attribute.prefix == null || attribute.name.startsWith(`${attribute.prefix}:`)
      ? attribute.name
      : `${attribute.prefix}:${attribute.name}`;
    if (attribute.namespaceUri == null) {
      lines.push(
        `  ${variable}.setAttribute(${emitJavaScriptValue(name, request)}, ${emitJavaScriptValue(attribute.value, request)});`,
      );
    } else {
      lines.push(
        `  ${variable}.setAttributeNS(${emitJavaScriptValue(attribute.namespaceUri, request)}, ${emitJavaScriptValue(name, request)}, ${emitJavaScriptValue(attribute.value, request)});`,
      );
    }
  }
}

type AotArtifactSourceContext = Pick<AotTemplateModuleEmissionRequest, 'sourcePath'>;

function emitJavaScriptValue(value: unknown, request: AotArtifactSourceContext): string {
  if (value === undefined) return 'void 0';
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw unsupportedValue(request, `Cannot emit non-finite number '${value}'.`);
    return Object.is(value, -0) ? '-0' : String(value);
  }
  if (typeof value === 'bigint') return `${value}n`;
  if (Array.isArray(value)) {
    const body = `[${value.map((entry) => emitJavaScriptValue(entry, request)).join(', ')}]`;
    const raw = Object.getOwnPropertyDescriptor(value, 'raw');
    return raw != null && 'value' in raw
      ? `Object.assign(${body}, { raw: ${emitJavaScriptValue(raw.value, request)} })`
      : body;
  }
  if (typeof value !== 'object') {
    throw unsupportedValue(request, `Cannot emit '${typeof value}' runtime value.`);
  }
  const fields: Record<string, string> = {};
  for (const key of Object.keys(value).sort((left, right) => left.localeCompare(right))) {
    fields[key] = emitJavaScriptValue((value as Record<string, unknown>)[key], request);
  }
  return objectLiteral(fields);
}

/** Serialize one semantic-runtime value with the same wire rules used by compiled template payloads. */
export function emitAotJavaScriptValue(value: unknown, sourcePath: string): string {
  return emitJavaScriptValue(value, { sourcePath });
}

function objectLiteral(fields: Readonly<Record<string, string>>): string {
  return `{ ${Object.entries(fields).map(([name, value]) => `${JSON.stringify(name)}: ${value}`).join(', ')} }`;
}

function requireMap<T>(
  values: ReadonlyMap<string, T>,
  key: string,
  request: AotTemplateModuleEmissionRequest,
): T {
  const value = values.get(key);
  if (value == null) throw invalidHandoff(request, `Compiled handoff cannot resolve '${key}'.`);
  return value;
}

function invalidHandoff(request: AotTemplateModuleEmissionRequest, message: string): AotArtifactError {
  return new AotArtifactError('AOT_ARTIFACT_INVALID_HANDOFF', message, request.sourcePath);
}

function unsupportedHeader(request: AotTemplateModuleEmissionRequest, message: string): AotArtifactError {
  return new AotArtifactError('AOT_ARTIFACT_UNSUPPORTED_HEADER', message, request.sourcePath);
}

function unsupportedValue(request: AotArtifactSourceContext, message: string): AotArtifactError {
  return new AotArtifactError('AOT_ARTIFACT_UNSUPPORTED_VALUE', message, request.sourcePath);
}
