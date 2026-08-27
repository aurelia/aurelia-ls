import { createHash } from 'node:crypto';

import type { ComputationRead, ComputationReadValidation } from '../kernel/computation-lifecycle.js';
import { SemanticRuntimeAnalysisCurrentnessError } from '../kernel/analysis-currentness.js';
import type { IdentityHandle, OpenSeamHandle, ProductHandle } from '../kernel/handles.js';
import type { ProductDetailReadView } from '../kernel/product-details.js';
import type {
  KernelMaterializationReadView,
  KernelReadProjectionRevision,
  KernelReadProjectionRevisionView,
} from '../kernel/store.js';
import type { Container } from '../di/container.js';
import type { ExpressionType } from '../expression/ast.js';
import type { ExpressionParseContext } from '../expression/expression-parse-support.js';
import type { ExpressionParseResult } from '../expression/parse-result-algebra.js';
import type { CustomAttributeDefinition } from '../resources/custom-attribute-definition.js';
import type { BuiltInResource } from '../resources/built-in-resources.js';
import {
  CustomElementCaptureKind,
  type CustomElementDefinition,
} from '../resources/custom-element-definition.js';
import type { ResourceTargetReference } from '../resources/resource-reference.js';
import type {
  FullResourceDefinition,
  TemplateCompilableResourceDefinition,
} from '../resources/resource-definition.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import { BuiltInAttributeParserExecutionHost } from './attribute-parser-execution-host.js';
import {
  TemplateResolvedResource,
  TemplateResourceResolutionKind,
  type TemplateAttributeBindablesInfo,
  type TemplateBindablesInfo,
  type TemplateElementBindablesInfo,
} from './compiler-world.js';
import {
  readBuiltInVisibleTemplateResource,
  readVisibleTemplateResourceDefinition,
} from './compiler-resource-lookup.js';
import type {
  TemplateCompilerWorldEmission,
} from './compiler-world-materializer.js';
import type { BindingCommandExecutable } from './binding-command-execution.js';
import type {
  AttributeParserParseResult,
} from './attribute-syntax.js';
import type { TemplateAttributeMapperNode } from './attribute-mapper.js';
import type { TemplateVisibleResource } from './compiler-world-reference.js';
import type { TemplateCompilerHookSet } from './compiler-hook-world.js';
import type { CssClassMappingAuthority } from './css-class-mapping.js';
import {
  evaluateStaticCallableTruthiness,
  StaticCallableTruthinessKind,
  StaticCallableTruthinessResult,
} from '../evaluation/function-execution.js';
import { EvaluationStringValue } from '../evaluation/values.js';

type TemplateCompilerClosureReadView = Pick<KernelMaterializationReadView, 'readMaterializationsByOwner'>;
type TemplateCompilerReadStore = TemplateCompilerClosureReadView
  & ProductDetailReadView
  & KernelReadProjectionRevisionView;
type TemplateCompilerResultReader = (
  store: TemplateCompilerReadStore,
  world: TemplateCompilerWorldEmission,
) => readonly string[];

export const enum TemplateCompilerReadKind {
  /** Compiler-world envelope and service topology consumed by compilation-unit publication. */
  CompilerWorld = 'compiler-world',
  /** Custom-element lookup through the compiler world's resource resolver. */
  ElementResource = 'element-resource',
  /** Custom-attribute or template-controller lookup through the compiler world's resource resolver. */
  AttributeResource = 'attribute-resource',
  /** Bindable-table lookup for one converged custom element or custom attribute definition. */
  Bindables = 'bindables',
  /** Binding-command lookup through the compiler world's command resolver. */
  BindingCommand = 'binding-command',
  /** Attribute-pattern interpretation and handler selection through the compiler world's parser. */
  AttributePattern = 'attribute-pattern',
  /** Visible custom-element definition selected by stable resource-definition identity. */
  TemplateOwnerResource = 'template-owner-resource',
  /** Expression-parser service used to parse authored binding values. */
  ExpressionParser = 'expression-parser',
  /** AttrMapper result used by binding-command and plain-attribute lowering. */
  AttributeMapper = 'attribute-mapper',
  /** Custom-element capture predicate result used before capture exclusions. */
  CapturePredicate = 'capture-predicate',
  /** TemplateCompiler options that alter instruction references. */
  TemplateCompiler = 'template-compiler',
  /** Ordered TemplateCompilerHooks membership and callable closure. */
  CompilerHooks = 'compiler-hooks',
  /** Component-local raw ICssClassMapping authority used by built-in hooks and runtime class consumers. */
  CssClassMapping = 'css-class-mapping',
}

export const enum TemplateCompilerScopeClosureState {
  /** Every container owner has a materialization and none reports an unresolved seam. */
  Closed = 'closed',
  /** A container materialization is missing or an observed owner materialization reports an unresolved seam. */
  Open = 'open',
}

/** Why a missing compiler lookup can or cannot be treated as proven absence. */
export class TemplateCompilerScopeClosure {
  constructor(
    readonly state: TemplateCompilerScopeClosureState,
    readonly ownerIdentityHandles: readonly IdentityHandle[],
    readonly materializationHandles: readonly string[],
    readonly openSeamHandles: readonly OpenSeamHandle[],
    readonly unsupportedContainerIdentityHandles: readonly IdentityHandle[],
  ) {}

  get revision(): string {
    return revisionDigest([
      this.state,
      ...this.ownerIdentityHandles,
      ...this.materializationHandles,
      ...this.openSeamHandles,
      ...this.unsupportedContainerIdentityHandles,
    ]);
  }
}

class TemplateCompilerReadRevision {
  constructor(
    readonly scope: string,
    readonly closure: string,
    readonly result: string,
  ) {}
}

/** Authority for the compiler world currently admitted at one stable owner/cohort locus. */
export class TemplateCompilerWorldAuthority {
  constructor(
    readonly key: string,
    private readonly read: () => TemplateCompilerWorldEmission | null,
  ) {}

  current(): TemplateCompilerWorldEmission {
    const world = this.read();
    if (world == null) {
      throw new SemanticRuntimeAnalysisCurrentnessError({
        message: 'The compiler world is no longer current at this cohort locus.',
        reason: 'generation-changed',
        invalidGenerationKeys: [this.key],
      });
    }
    return world;
  }

  readCurrent(): TemplateCompilerWorldEmission | null {
    return this.read();
  }

  static fixed(world: TemplateCompilerWorldEmission): TemplateCompilerWorldAuthority {
    return new TemplateCompilerWorldAuthority('template-compiler-world:fixed', () => world);
  }
}

/** Inspectable positive or negative read registered by one template-compilation occurrence. */
export class TemplateCompilerReadObservation implements ComputationRead {
  readonly domain = 'template-compiler';
  readonly observedRevision: string;

  constructor(
    readonly readKind: TemplateCompilerReadKind,
    readonly readKey: string,
    readonly canonicalKey: string,
    readonly compilerScopeIdentityHandle: IdentityHandle,
    /** Ordered semantic and witness parts that explain the observed positive result; empty means absence. */
    readonly resultParts: readonly string[],
    readonly closure: TemplateCompilerScopeClosure,
    private readonly observed: TemplateCompilerReadRevision,
    private readonly readCurrent: () => TemplateCompilerReadRevision,
    private readonly readCurrentResult: TemplateCompilerResultReader,
  ) {
    // Scope and closure prove that the answer is current; the answer itself is the reusable semantic revision.
    this.observedRevision = observed.result;
  }

  validate(): ComputationReadValidation {
    const current = this.readCurrent();
    const changedFacets = [
      ...(current.scope === this.observed.scope ? [] : ['scope']),
      ...(current.closure === this.observed.closure ? [] : ['closure']),
      ...(current.result === this.observed.result ? [] : ['result']),
    ];
    return {
      isCurrent: changedFacets.length === 0,
      currentRevision: current.result,
      changedFacets,
    };
  }

  tryRebaseCurrent(): ComputationRead | null {
    // The compiler world is candidate-owned; callers must supply the current owner/cohort authority explicitly.
    return null;
  }

  /** Create one shared current-state reader for every observation in the same carried compiler scope. */
  static createRebaser(
    store: TemplateCompilerReadStore,
    authority: TemplateCompilerWorldAuthority,
  ): (read: TemplateCompilerReadObservation) => TemplateCompilerReadObservation | null {
    const currentState = new TemplateCompilerReadValidationStateAuthority(store, authority);
    return (read) => read.tryRebaseToState(currentState);
  }

  private tryRebaseToState(
    currentState: TemplateCompilerReadValidationStateAuthority,
  ): TemplateCompilerReadObservation | null {
    const state = currentState.read();
    const world = state.world;
    if (world == null || world.resourceScope.identityHandle !== this.compilerScopeIdentityHandle) {
      return null;
    }
    const resultParts = this.readCurrentResult(currentState.store, world);
    const observed = readRevision(state.scopeRevision, state.closure, resultParts);
    // Scope and closure are currentness/explanation witnesses. Carry is sound when the exact compiler operation still
    // returns the same result; the returned observation adopts the current witnesses for the next validation cycle.
    if (observed.result !== this.observed.result) {
      return null;
    }
    // Capture the callback, not this observation: carried reads must not retain predecessor staging contexts.
    const readCurrentResult = this.readCurrentResult;
    return new TemplateCompilerReadObservation(
      this.readKind,
      this.readKey,
      this.canonicalKey,
      this.compilerScopeIdentityHandle,
      resultParts,
      state.closure,
      observed,
      () => currentState.readRevision(readCurrentResult),
      readCurrentResult,
    );
  }
}

/** One compiler-service value paired with the exact canonical read observation that authorized it. */
export class TemplateCompilerObservedValue<TValue> {
  constructor(
    readonly value: TValue,
    readonly observation: TemplateCompilerReadObservation,
  ) {}
}

/**
 * Run-scoped compiler read surface.
 *
 * The view spends the immutable compiler-world services for semantics and records only the keys actually observed by
 * one compilation occurrence. It is not a second resource catalog.
 */
export class TemplateCompilerReadView {
  private readonly readsByKey = new Map<string, TemplateCompilerReadObservation>();
  private readonly observedScopeRevision: string;
  private readonly observedClosure: TemplateCompilerScopeClosure;
  private readonly currentState: TemplateCompilerReadValidationStateAuthority;

  constructor(
    private readonly store: TemplateCompilerReadStore,
    authority: TemplateCompilerWorldAuthority,
  ) {
    this.world = authority.current();
    this.currentState = new TemplateCompilerReadValidationStateAuthority(store, authority);
    const observed = this.currentState.read();
    this.observedScopeRevision = observed.scopeRevision;
    this.observedClosure = observed.closure;
    this.observe(
      TemplateCompilerReadKind.CompilerWorld,
      this.world.world.identityHandle,
      compilerWorldResultParts(this.world),
      (_store, current) => compilerWorldResultParts(current),
    );
  }

  readonly world: TemplateCompilerWorldEmission;

  get productHandle(): ProductHandle {
    return this.world.expressionParser.productHandle;
  }

  element(name: string): TemplateResolvedResource | null {
    return this.readElement(name).value;
  }

  readElement(name: string): TemplateCompilerObservedValue<TemplateResolvedResource | null> {
    const canonical = name.toLowerCase();
    const result = resolvedVisibleResource(this.store, this.world.resourceResolver.el(canonical));
    const observation = this.observe(
      TemplateCompilerReadKind.ElementResource,
      canonical,
      elementResourceResultParts(result),
      (store, current) => elementResourceResultParts(
        resolvedVisibleResource(store, current.resourceResolver.el(canonical)),
      ),
    );
    return new TemplateCompilerObservedValue(result, observation);
  }

  attribute(name: string): TemplateResolvedResource | null {
    return this.readAttribute(name).value;
  }

  readAttribute(name: string): TemplateCompilerObservedValue<TemplateResolvedResource | null> {
    const canonical = name;
    const result = resolvedVisibleResource(this.store, this.world.resourceResolver.attr(canonical));
    const observation = this.observe(
      TemplateCompilerReadKind.AttributeResource,
      canonical,
      attributeResourceResultParts(result),
      (store, current) => attributeResourceResultParts(
        resolvedVisibleResource(store, current.resourceResolver.attr(canonical)),
      ),
    );
    return new TemplateCompilerObservedValue(result, observation);
  }

  bindables(definition: CustomElementDefinition): TemplateElementBindablesInfo;
  bindables(definition: CustomAttributeDefinition): TemplateAttributeBindablesInfo;
  bindables(definition: TemplateCompilableResourceDefinition): TemplateBindablesInfo {
    return this.readBindables(definition).value;
  }

  readBindables(
    definition: CustomElementDefinition,
  ): TemplateCompilerObservedValue<TemplateElementBindablesInfo>;
  readBindables(
    definition: CustomAttributeDefinition,
  ): TemplateCompilerObservedValue<TemplateAttributeBindablesInfo>;
  readBindables(
    definition: TemplateCompilableResourceDefinition,
  ): TemplateCompilerObservedValue<TemplateBindablesInfo>;
  readBindables(
    definition: TemplateCompilableResourceDefinition,
  ): TemplateCompilerObservedValue<TemplateBindablesInfo> {
    const canonical = definition.productHandle ?? definition.identityHandle ?? definition.name;
    const result: TemplateBindablesInfo = definition.type === ResourceDefinitionKind.CustomElement
      ? this.world.resourceResolver.bindables(definition)
      : this.world.resourceResolver.bindables(definition);
    const observation = this.observe(
      TemplateCompilerReadKind.Bindables,
      canonical,
      bindableResultParts(result),
      (store, current) => {
        const currentDefinition = matchingDefinition(store, current, definition);
        return currentDefinition == null
          ? ['definition-absent']
          : bindableResultParts(
            currentDefinition.type === ResourceDefinitionKind.CustomElement
              ? current.resourceResolver.bindables(currentDefinition)
              : current.resourceResolver.bindables(currentDefinition),
          );
      },
    );
    return new TemplateCompilerObservedValue(result, observation);
  }

  bindingCommand(name: string): BindingCommandExecutable | null {
    return this.readBindingCommand(name).value;
  }

  readBindingCommand(name: string): TemplateCompilerObservedValue<BindingCommandExecutable | null> {
    const canonical = name;
    const result = this.world.bindingCommandResolver.get(canonical);
    const observation = this.observe(
      TemplateCompilerReadKind.BindingCommand,
      canonical,
      commandResultParts(result),
      (_store, current) => commandResultParts(current.bindingCommandResolver.get(canonical)),
    );
    return new TemplateCompilerObservedValue(result, observation);
  }

  parseAttribute(
    rawName: string,
    rawValue: string,
  ): AttributeParserParseResult {
    return this.readParsedAttribute(rawName, rawValue).value;
  }

  readParsedAttribute(
    rawName: string,
    rawValue: string,
  ): TemplateCompilerObservedValue<AttributeParserParseResult> {
    const canonical = revisionDigest([rawName, rawValue]);
    const result = parseAttributeInWorld(this.world, rawName, rawValue);
    const observation = this.observe(
      TemplateCompilerReadKind.AttributePattern,
      canonical,
      patternResultParts(result),
      (_store, current) => patternResultParts(parseAttributeInWorld(current, rawName, rawValue)),
    );
    return new TemplateCompilerObservedValue(result, observation);
  }

  templateOwnerResource(definition: CustomElementDefinition): TemplateVisibleResource | null {
    const canonical = definition.productHandle ?? definition.identityHandle ?? definition.name;
    const read = (store: TemplateCompilerReadStore, world: TemplateCompilerWorldEmission) => {
      const currentDefinition = matchingDefinition(store, world, definition);
      return currentDefinition == null
        ? null
        : world.resourceResolver.resources.find((candidate) =>
            candidate.definitionProductHandle === currentDefinition.productHandle
          ) ?? null;
    };
    const result = read(this.store, this.world);
    this.observe(
      TemplateCompilerReadKind.TemplateOwnerResource,
      canonical,
      templateOwnerResourceResultParts(this.store, result),
      (store, current) => templateOwnerResourceResultParts(store, read(store, current)),
    );
    return result;
  }

  /** Hydrate the current definition behind a resource selected by an observed compiler lookup. */
  currentDefinition(resource: TemplateVisibleResource | null): FullResourceDefinition | null {
    return readVisibleTemplateResourceDefinition(this.store, resource);
  }

  parse(expression: string, context?: ExpressionParseContext): ExpressionParseResult;
  parse(
    expression: string,
    expressionType: ExpressionType,
    context?: ExpressionParseContext,
  ): ExpressionParseResult;
  parse(
    expression: string,
    expressionTypeOrContext?: ExpressionType | ExpressionParseContext,
    maybeContext?: ExpressionParseContext,
  ): ExpressionParseResult {
    return typeof expressionTypeOrContext === 'string'
      ? this.readParsedExpression(expression, expressionTypeOrContext, maybeContext).value
      : this.readParsedExpression(expression, expressionTypeOrContext).value;
  }

  readParsedExpression(
    expression: string,
    context?: ExpressionParseContext,
  ): TemplateCompilerObservedValue<ExpressionParseResult>;
  readParsedExpression(
    expression: string,
    expressionType: ExpressionType,
    context?: ExpressionParseContext,
  ): TemplateCompilerObservedValue<ExpressionParseResult>;
  readParsedExpression(
    expression: string,
    expressionTypeOrContext?: ExpressionType | ExpressionParseContext,
    maybeContext?: ExpressionParseContext,
  ): TemplateCompilerObservedValue<ExpressionParseResult> {
    const result = typeof expressionTypeOrContext === 'string'
      ? this.world.expressionParser.parse(expression, expressionTypeOrContext, maybeContext)
      : this.world.expressionParser.parse(expression, expressionTypeOrContext);
    const observation = this.observe(
      TemplateCompilerReadKind.ExpressionParser,
      typeof expressionTypeOrContext === 'string' ? expressionTypeOrContext : 'default',
      expressionParserResultParts(this.world),
      (_store, current) => expressionParserResultParts(current),
    );
    return new TemplateCompilerObservedValue(result, observation);
  }

  mapAttribute(node: TemplateAttributeMapperNode, attributeName: string): string | null {
    return this.readMappedAttribute(node, attributeName).value;
  }

  readMappedAttribute(
    node: TemplateAttributeMapperNode,
    attributeName: string,
  ): TemplateCompilerObservedValue<string | null> {
    const result = this.world.attributeMapper.map(node, attributeName);
    const canonical = attributeMapperReadKey('map', node, attributeName);
    const observation = this.observe(
      TemplateCompilerReadKind.AttributeMapper,
      canonical,
      attributeMapperResultParts(this.world, result),
      (_store, current) => attributeMapperResultParts(current, current.attributeMapper.map(node, attributeName)),
    );
    return new TemplateCompilerObservedValue(result, observation);
  }

  isTwoWay(node: TemplateAttributeMapperNode, attributeName: string): boolean | null {
    return this.readTwoWay(node, attributeName).value;
  }

  readTwoWay(
    node: TemplateAttributeMapperNode,
    attributeName: string,
  ): TemplateCompilerObservedValue<boolean | null> {
    const result = this.world.attributeMapper.isTwoWay(
      node,
      attributeName,
      this.world.callableBindings,
    );
    const canonical = attributeMapperReadKey('two-way', node, attributeName);
    const observation = this.observe(
      TemplateCompilerReadKind.AttributeMapper,
      canonical,
      attributeMapperResultParts(this.world, result),
      (_store, current) => attributeMapperResultParts(
        current,
        current.attributeMapper.isTwoWay(node, attributeName, current.callableBindings),
      ),
    );
    return new TemplateCompilerObservedValue(result, observation);
  }

  capturePredicate(
    definition: CustomElementDefinition,
    attributeName: string,
  ): StaticCallableTruthinessResult {
    return this.readCapturePredicate(definition, attributeName).value;
  }

  readCapturePredicate(
    definition: CustomElementDefinition,
    attributeName: string,
  ): TemplateCompilerObservedValue<StaticCallableTruthinessResult> {
    const canonical = `${definition.productHandle ?? definition.identityHandle ?? definition.name}|${attributeName}`;
    const result = evaluateCapturePredicateInWorld(this.world, definition, attributeName);
    const observation = this.observe(
      TemplateCompilerReadKind.CapturePredicate,
      canonical,
      callableTruthinessResultParts(result),
      (store, current) => {
        const currentDefinition = matchingDefinition(store, current, definition);
        return callableTruthinessResultParts(
          currentDefinition?.type === ResourceDefinitionKind.CustomElement
            ? evaluateCapturePredicateInWorld(current, currentDefinition, attributeName)
            : openCallableTruthiness('Capture predicate owner is no longer visible.'),
        );
      },
    );
    return new TemplateCompilerObservedValue(result, observation);
  }

  resolveResources(): boolean {
    return this.readResolveResources().value;
  }

  readResolveResources(): TemplateCompilerObservedValue<boolean> {
    const result = this.world.templateCompiler.resolveResources;
    const observation = this.observe(
      TemplateCompilerReadKind.TemplateCompiler,
      'resolve-resources',
      templateCompilerResultParts(this.world, result),
      (_store, current) => templateCompilerResultParts(current, current.templateCompiler.resolveResources),
    );
    return new TemplateCompilerObservedValue(result, observation);
  }

  compilerDebug(): boolean {
    return this.readCompilerDebug().value;
  }

  readCompilerDebug(): TemplateCompilerObservedValue<boolean> {
    const result = this.world.templateCompiler.debug;
    const observation = this.observe(
      TemplateCompilerReadKind.TemplateCompiler,
      'debug',
      templateCompilerResultParts(this.world, result),
      (_store, current) => templateCompilerResultParts(current, current.templateCompiler.debug),
    );
    return new TemplateCompilerObservedValue(result, observation);
  }

  compilerHooks(): TemplateCompilerHookSet {
    const result = this.world.compilerHooks;
    this.observe(
      TemplateCompilerReadKind.CompilerHooks,
      'all',
      compilerHookSetResultParts(result),
      (_store, current) => compilerHookSetResultParts(current.compilerHooks),
    );
    return result;
  }

  cssClassMapping(): CssClassMappingAuthority {
    const result = this.world.cssClassMapping;
    this.observe(
      TemplateCompilerReadKind.CssClassMapping,
      'all',
      cssClassMappingResultParts(result),
      (_store, current) => cssClassMappingResultParts(current.cssClassMapping),
    );
    return result;
  }

  readAll(): readonly TemplateCompilerReadObservation[] {
    return [...this.readsByKey.values()];
  }

  private observe(
    kind: TemplateCompilerReadKind,
    canonicalKey: string,
    resultParts: readonly string[],
    readCurrentResult: TemplateCompilerResultReader,
  ): TemplateCompilerReadObservation {
    const readKey = `${this.world.resourceScope.identityHandle}|${kind}|${canonicalKey}`;
    const observed = readRevision(this.observedScopeRevision, this.observedClosure, resultParts);
    const existing = this.readsByKey.get(readKey);
    if (existing != null && existing.observedRevision !== observed.result) {
      throw new Error(`Compiler read ${readKey} produced conflicting revisions in one compilation run.`);
    }
    if (existing != null) return existing;
    const observation = new TemplateCompilerReadObservation(
      kind,
      readKey,
      canonicalKey,
      this.world.resourceScope.identityHandle,
      resultParts,
      this.observedClosure,
      observed,
      () => this.currentState.readRevision(readCurrentResult),
      readCurrentResult,
    );
    this.readsByKey.set(readKey, observation);
    return observation;
  }
}

class TemplateCompilerReadValidationState {
  constructor(
    readonly world: TemplateCompilerWorldEmission | null,
    readonly scopeRevision: string,
    readonly closure: TemplateCompilerScopeClosure,
    readonly projectionRevision: KernelReadProjectionRevision,
  ) {}

  matches(
    world: TemplateCompilerWorldEmission | null,
    projectionRevision: KernelReadProjectionRevision,
  ): boolean {
    return this.world === world && this.projectionRevision.equals(projectionRevision);
  }
}

/** Shares one scope/closure projection across all reads at the same committed-plus-candidate revision. */
class TemplateCompilerReadValidationStateAuthority {
  private current: TemplateCompilerReadValidationState | null = null;

  constructor(
    readonly store: TemplateCompilerReadStore,
    private readonly authority: TemplateCompilerWorldAuthority,
  ) {}

  read(): TemplateCompilerReadValidationState {
    const world = this.authority.readCurrent();
    const projectionRevision = this.store.readProjectionRevision();
    if (this.current?.matches(world, projectionRevision) === true) {
      return this.current;
    }
    return this.current = world == null
      ? new TemplateCompilerReadValidationState(
          null,
          'compiler-world-absent',
          openCompilerScopeClosure,
          projectionRevision,
        )
      : new TemplateCompilerReadValidationState(
          world,
          compilerScopeRevision(world),
          compilerScopeClosure(this.store, world),
          projectionRevision,
        );
  }

  readRevision(readCurrentResult: TemplateCompilerResultReader): TemplateCompilerReadRevision {
    const current = this.read();
    return readRevision(
      current.scopeRevision,
      current.closure,
      current.world == null ? ['compiler-world-absent'] : readCurrentResult(this.store, current.world),
    );
  }
}

const openCompilerScopeClosure = new TemplateCompilerScopeClosure(
  TemplateCompilerScopeClosureState.Open,
  [],
  [],
  [],
  [],
);

function compilerScopeClosure(
  store: TemplateCompilerClosureReadView,
  world: TemplateCompilerWorldEmission,
): TemplateCompilerScopeClosure {
  const containerOwners: IdentityHandle[] = [];
  for (let container: Container | null = world.container; container != null; container = container.parent) {
    containerOwners.push(container.identityHandle);
  }
  const resourceOwners = [...world.resourceScope.resources, ...world.resourceScope.syntaxResources]
    .flatMap((resource) => resource.resourceIdentityHandle == null ? [] : [resource.resourceIdentityHandle]);
  const ownerIdentityHandles = [...new Set([...containerOwners, ...resourceOwners])].sort();
  const materializations = ownerIdentityHandles
    .flatMap((ownerHandle) => store.readMaterializationsByOwner(ownerHandle))
    .sort((left, right) => left.handle.localeCompare(right.handle));
  const supportedOwners = new Set(materializations.map((materialization) => materialization.ownerHandle));
  const unsupportedContainerIdentityHandles = containerOwners
    .filter((owner) => !supportedOwners.has(owner))
    .sort();
  const openSeamHandles = [...new Set(materializations.flatMap((materialization) => materialization.openSeamHandles))]
    .sort();
  return new TemplateCompilerScopeClosure(
    unsupportedContainerIdentityHandles.length === 0 && openSeamHandles.length === 0
      ? TemplateCompilerScopeClosureState.Closed
      : TemplateCompilerScopeClosureState.Open,
    ownerIdentityHandles,
    materializations.map((materialization) => materialization.handle),
    openSeamHandles,
    unsupportedContainerIdentityHandles,
  );
}

function readRevision(
  scopeRevision: string,
  closure: TemplateCompilerScopeClosure,
  resultParts: readonly string[],
): TemplateCompilerReadRevision {
  return new TemplateCompilerReadRevision(
    scopeRevision,
    closure.revision,
    revisionParts(resultParts.length === 0 ? ['absent'] : ['present', ...resultParts]),
  );
}

function compilerScopeRevision(world: TemplateCompilerWorldEmission): string {
  const resources = [...world.resourceScope.resources, ...world.resourceScope.syntaxResources];
  return revisionDigest([
    world.resourceScope.identityHandle,
    world.resourceScope.sourceAddressHandle ?? '',
    world.container.identityHandle,
    ...resources.flatMap((resource) => [
      resource.resourceKind,
      resource.name,
      ...resource.aliases,
      resource.resourceProductHandle ?? '',
      resource.resourceIdentityHandle ?? '',
      resource.definitionProductHandle ?? '',
      resource.visibilityKind,
      resource.sourceAddressHandle ?? '',
    ]),
    ...world.attributeParserMachine.compiledPatterns.flatMap(compiledPatternResultParts),
    ...world.bindingCommandResolver.commands.flatMap((command) => commandResultParts(command)),
  ]);
}

function resolvedVisibleResource(
  store: ProductDetailReadView,
  resource: TemplateVisibleResource | null,
): TemplateResolvedResource | null {
  if (resource == null) {
    return null;
  }
  const definition = readVisibleTemplateResourceDefinition(store, resource);
  const compilable = definition?.type === ResourceDefinitionKind.CustomElement
    || definition?.type === ResourceDefinitionKind.CustomAttribute
    ? definition
    : null;
  return new TemplateResolvedResource(
    compilable == null
      ? TemplateResourceResolutionKind.HeaderOnly
      : TemplateResourceResolutionKind.Definition,
    resource,
    compilable,
    readBuiltInVisibleTemplateResource(store, resource),
  );
}

function resolvedResourceResultParts(result: TemplateResolvedResource | null): readonly string[] {
  return result == null
    ? []
    : [
      result.resolutionKind,
      ...visibleResourceResultParts(result.resource),
      ...builtInResourceResultParts(result.builtInResource),
    ];
}

function builtInResourceResultParts(resource: BuiltInResource | null): readonly string[] {
  return resource == null
    ? ['no-built-in-resource']
    : [
      'built-in-resource',
      resource.packageId,
      resource.group,
      resource.resourceKind,
      resource.name,
      resource.targetName,
      ...resource.aliases,
      resource.productHandle ?? '',
      resource.identityHandle ?? '',
      resource.sourceAddressHandle ?? '',
    ];
}

function elementResourceResultParts(result: TemplateResolvedResource | null): readonly string[] {
  if (result == null) {
    return [];
  }
  const definition = result?.definition;
  return [
    ...resolvedResourceResultParts(result),
    ...(definition?.type === ResourceDefinitionKind.CustomElement
      ? [
        'custom-element-definition',
        definition.productHandle ?? '',
        definition.identityHandle ?? '',
        definition.name,
        definition.capture.kind,
        scalarPart(definition.containerless),
        scalarPart(definition.shadowOptions != null),
        scalarPart(definition.processContent != null),
      ]
      : ['no-custom-element-definition']),
  ];
}

function attributeResourceResultParts(result: TemplateResolvedResource | null): readonly string[] {
  if (result == null) {
    return [];
  }
  const definition = result?.definition;
  return [
    ...resolvedResourceResultParts(result),
    ...(definition?.type === ResourceDefinitionKind.CustomAttribute
      ? [
        'custom-attribute-definition',
        definition.productHandle ?? '',
        definition.identityHandle ?? '',
        definition.name,
        scalarPart(definition.isTemplateController),
        scalarPart(definition.noMultiBindings),
        definition.defaultProperty,
      ]
      : ['no-custom-attribute-definition']),
  ];
}

function visibleResourceResultParts(result: TemplateVisibleResource | null): readonly string[] {
  return result == null
    ? []
    : [
      result.resourceKind,
      result.name,
      ...result.aliases,
      result.resourceProductHandle ?? '',
      result.resourceIdentityHandle ?? '',
      result.definitionProductHandle ?? '',
      result.visibilityKind,
      result.sourceAddressHandle ?? '',
    ];
}

function templateOwnerResourceResultParts(
  store: ProductDetailReadView,
  result: TemplateVisibleResource | null,
): readonly string[] {
  const definition = readVisibleTemplateResourceDefinition(store, result);
  return result == null
    ? []
    : [
      ...visibleResourceResultParts(result),
      ...(definition?.type === ResourceDefinitionKind.CustomElement
        ? [
          'custom-element-definition',
          definition.productHandle ?? '',
          definition.identityHandle ?? '',
          definition.name,
          scalarPart(definition.shadowOptions != null),
        ]
        : ['no-custom-element-definition']),
    ];
}

function bindableResultParts(result: TemplateBindablesInfo): readonly string[] {
  return [
    ...result.attrs.flatMap((bindable) => ['attribute-entry', ...bindableReferenceResultParts(bindable)]),
    ...result.bindables.flatMap((bindable) => ['property-entry', ...bindableReferenceResultParts(bindable)]),
    ...('primary' in result && result.primary != null
      ? ['primary', ...bindableReferenceResultParts(result.primary)]
      : ['no-primary']),
  ];
}

function commandResultParts(result: BindingCommandExecutable | null): readonly string[] {
  return result == null
    ? []
    : [
      result.productHandle,
      result.identityHandle,
      result.definitionProductHandle ?? '',
      ...targetResultParts(result.target),
      result.name,
      ...result.aliases,
      result.key,
      scalarPart(result.ignoreAttr),
      result.executionKind,
      result.sourceAddressHandle ?? '',
      ...fieldProvenanceResultParts(result.fieldProvenance),
    ];
}

function patternResultParts(result: AttributeParserParseResult): readonly string[] {
  return [
    ...(result.interpretation == null
      ? ['no-interpretation']
      : [
        result.interpretation.rawName,
        result.interpretation.pattern ?? '',
        ...result.interpretation.parts,
        result.interpretation.compiledPatternProductHandle ?? '',
        ...result.interpretation.literalOccurrences.flatMap((occurrence) => [
          String(occurrence.tokenIndex), occurrence.value, String(occurrence.start), String(occurrence.end),
        ]),
        ...result.interpretation.partOccurrences.flatMap((occurrence) => [
          String(occurrence.partIndex), occurrence.value, String(occurrence.start), String(occurrence.end),
        ]),
      ]),
    ...(result.matchedPattern == null
      ? ['no-matched-pattern']
      : [
        ...compiledPatternResultParts(result.matchedPattern.compiledPattern),
        ...(result.matchedPattern.executable == null
          ? ['no-pattern-executable']
          : [
            result.matchedPattern.executable.productHandle,
            result.matchedPattern.executable.identityHandle,
            result.matchedPattern.executable.definitionProductHandle ?? '',
            ...targetResultParts(result.matchedPattern.executable.target),
            ...result.matchedPattern.executable.patterns.flatMap((pattern) => [
              pattern.pattern,
              pattern.symbols,
              pattern.addressHandle ?? '',
              pattern.provenanceHandle ?? '',
            ]),
            result.matchedPattern.executable.executionKind,
            result.matchedPattern.executable.sourceAddressHandle ?? '',
          ]),
      ]),
    result.executableProductHandle ?? '',
    result.execution.syntaxKind,
    result.execution.rawName,
    result.execution.rawValue,
    result.execution.target,
    result.execution.command ?? '',
    ...result.execution.parts,
  ];
}

function compiledPatternResultParts(
  pattern: TemplateCompilerWorldEmission['attributeParserMachine']['compiledPatterns'][number],
): readonly string[] {
  return [
    pattern.productHandle,
    pattern.identityHandle,
    pattern.definition.pattern,
    pattern.definition.symbols,
    pattern.definition.addressHandle ?? '',
    pattern.definition.provenanceHandle ?? '',
    ...pattern.tokens.flatMap((token) => [token.tokenKind, token.value ?? '']),
    String(pattern.score.statics),
    String(pattern.score.dynamics),
    String(pattern.score.symbols),
    ...pattern.symbols,
    pattern.executableProductHandle ?? '',
    pattern.sourceAddressHandle ?? '',
  ];
}

function compilerWorldResultParts(world: TemplateCompilerWorldEmission): readonly string[] {
  return [
    world.world.productHandle,
    world.world.identityHandle,
    world.world.worldKind,
    world.world.appRoot?.productHandle ?? '',
    ...containerReferenceResultParts(world.world.container),
    world.resourceScope.productHandle,
    world.resourceScope.identityHandle,
    world.resourceScope.sourceAddressHandle ?? '',
    ...world.world.services.flatMap((service) => [
      service.serviceKind,
      service.productHandle ?? '',
      service.identityHandle ?? '',
      service.addressHandle ?? '',
    ]),
    world.world.sourceAddressHandle ?? '',
  ];
}

function expressionParserResultParts(world: TemplateCompilerWorldEmission): readonly string[] {
  return [
    world.expressionParser.productHandle,
    world.expressionParser.identityHandle,
    ...containerReferenceResultParts(world.expressionParser.container),
    world.expressionParser.sourceAddressHandle ?? '',
    ...fieldProvenanceResultParts(world.expressionParser.fieldProvenance),
  ];
}

function attributeMapperResultParts(
  world: TemplateCompilerWorldEmission,
  result: string | boolean | null,
): readonly string[] {
  return [
    world.attributeMapper.productHandle,
    world.attributeMapper.identityHandle,
    ...containerReferenceResultParts(world.attributeMapper.container),
    ...world.attributeMapper.configuration.mappings.flatMap((mapping) => [
      mapping.tagName ?? '', mapping.attributeName, mapping.propertyName,
    ]),
    ...world.attributeMapper.configuration.twoWayRules.flatMap((rule) => [
      rule.predicateSlot.key,
    ]),
    scalarPart(result),
  ];
}

function evaluateCapturePredicateInWorld(
  world: TemplateCompilerWorldEmission,
  definition: CustomElementDefinition,
  attributeName: string,
): StaticCallableTruthinessResult {
  const capture = definition.capture;
  if (capture.kind !== CustomElementCaptureKind.Predicate) {
    return openCallableTruthiness('Custom-element capture is no longer predicate-backed.');
  }
  if (capture.predicateSlot == null) {
    return openCallableTruthiness('Custom-element capture predicate has no executable slot.');
  }
  const target = world.callableBindings.target(capture.predicateSlot);
  if (target == null) {
    return openCallableTruthiness('Custom-element capture predicate has no current executable target.');
  }
  return evaluateStaticCallableTruthiness(
    target,
    [new EvaluationStringValue(attributeName, target.value.declaration)],
  );
}

function openCallableTruthiness(reason: string): StaticCallableTruthinessResult {
  return new StaticCallableTruthinessResult(
    StaticCallableTruthinessKind.Open,
    null,
    reason,
  );
}

function callableTruthinessResultParts(
  result: StaticCallableTruthinessResult,
): readonly string[] {
  return [
    result.kind,
    result.reason ?? '',
  ];
}

function templateCompilerResultParts(
  world: TemplateCompilerWorldEmission,
  result: boolean,
): readonly string[] {
  return [
    world.templateCompiler.productHandle,
    world.templateCompiler.identityHandle,
    ...containerReferenceResultParts(world.templateCompiler.container),
    scalarPart(world.templateCompiler.debug),
    scalarPart(world.templateCompiler.resolveResources),
    scalarPart(result),
  ];
}

function compilerHookSetResultParts(
  hookSet: TemplateCompilerHookSet,
): readonly string[] {
  return [
    hookSet.productHandle,
    hookSet.identityHandle,
    hookSet.membershipState,
    ...hookSet.entries.flatMap((entry) => [
      entry.lane,
      String(entry.laneOrdinal),
      String(entry.sourceOrdinal),
      entry.hookKind,
      entry.cause.causeKind,
      entry.cause.productHandle ?? '',
      entry.cause.identityHandle ?? '',
      entry.cause.registryEffectKey ?? '',
      entry.cause.sourceAddressHandle ?? '',
      entry.provider.resolutionKind,
      entry.provider.reason ?? '',
      ...entry.provider.openSeamHandles,
      entry.callable.authorityKind,
      entry.callable.identityHandle ?? '',
      entry.callable.callableSlotKey ?? '',
      entry.callable.reason ?? '',
      ...entry.callable.openSeamHandles,
      entry.callable.sourceAddressHandle ?? '',
      entry.cssClassMapping?.productHandle ?? '',
      entry.cssClassMapping?.identityHandle ?? '',
      entry.cssClassMapping?.sourceAddressHandle ?? '',
    ]),
    ...hookSet.openReasons.flatMap((reason) => [
      reason.reasonKind,
      reason.lane ?? '',
      reason.summary,
      reason.sourceAddressHandle ?? '',
      ...reason.openSeamHandles,
    ]),
    hookSet.sourceAddressHandle ?? '',
  ];
}

function cssClassMappingResultParts(
  mapping: CssClassMappingAuthority,
): readonly string[] {
  return [
    mapping.productHandle,
    mapping.identityHandle,
    mapping.authorityState,
    mapping.defaultPropertyState,
    ...mapping.properties.flatMap((property) => [
      property.className,
      property.propertyState,
      property.mappedClassName ?? '',
    ]),
    ...mapping.openReasons.flatMap((reason) => [
      reason.reasonKind,
      reason.summary,
      String(reason.sourceOrdinal ?? ''),
      String(reason.mappingArgumentOrdinal ?? ''),
      reason.sourceModuleKey ?? '',
      reason.sourceAddressHandle ?? '',
      ...reason.openSeamHandles,
    ]),
    mapping.sourceAddressHandle ?? '',
  ];
}

function bindableReferenceResultParts(
  bindable: TemplateBindablesInfo['bindables'][number],
): readonly string[] {
  return [
    bindable.reference.ownerDefinitionProductHandle ?? '',
    bindable.reference.name,
    bindable.reference.attribute,
    bindable.reference.sourceAddressHandle ?? '',
    scalarPart(bindable.reference.isImplicitDefault),
    bindable.reference.nameSourceAddressHandle ?? '',
    bindable.reference.attributeSourceAddressHandle ?? '',
    ...targetResultParts(bindable.reference.propertyTarget),
    bindable.definition.attribute,
    bindable.definition.callback,
    bindable.definition.mode,
    bindable.definition.name,
    bindable.definition.set.kind,
    scalarPart(bindable.definition.set.nullable),
    ...targetResultParts(bindable.definition.set.target),
    bindable.definition.sourceAddressHandle ?? '',
    bindable.definition.nameSourceAddressHandle ?? '',
    bindable.definition.attributeSourceAddressHandle ?? '',
    bindable.definition.callbackSourceAddressHandle ?? '',
    bindable.definition.modeSourceAddressHandle ?? '',
    bindable.definition.setSourceAddressHandle ?? '',
    bindable.definition.typeSourceAddressHandle ?? '',
    bindable.definition.nullableSourceAddressHandle ?? '',
    ...targetResultParts(bindable.definition.propertyTarget),
    ...targetResultParts(bindable.definition.callbackTarget),
    ...fieldProvenanceResultParts(bindable.definition.fieldProvenance),
  ];
}

function matchingDefinition(
  store: ProductDetailReadView,
  world: TemplateCompilerWorldEmission,
  observed: TemplateCompilableResourceDefinition,
): TemplateCompilableResourceDefinition | null {
  const visible = world.resourceResolver.resources.find((candidate) => {
    if (observed.productHandle != null) {
      return candidate.definitionProductHandle === observed.productHandle;
    }
    if (observed.identityHandle != null) {
      return candidate.resourceIdentityHandle === observed.identityHandle;
    }
    return candidate.resourceKind === observed.type && candidate.name === observed.name;
  }) ?? null;
  const definition = readVisibleTemplateResourceDefinition(store, visible);
  return definition?.type === ResourceDefinitionKind.CustomElement
    || definition?.type === ResourceDefinitionKind.CustomAttribute
    ? definition
    : null;
}

function parseAttributeInWorld(
  world: TemplateCompilerWorldEmission,
  rawName: string,
  rawValue: string,
): AttributeParserParseResult {
  return world.attributeParser.parse(
    rawName,
    rawValue,
    new BuiltInAttributeParserExecutionHost(world),
  );
}

function attributeMapperReadKey(
  operation: 'map' | 'two-way',
  node: TemplateAttributeMapperNode,
  attributeName: string,
): string {
  if (node.attributeStateKey != null) {
    return revisionParts([
      operation,
      node.tagName,
      node.namespace ?? '',
      attributeName,
      node.attributeStateKey,
    ]);
  }
  return revisionParts([
    operation,
    node.tagName,
    node.namespace ?? '',
    attributeName,
    ...(node.attributes ?? []).flatMap((attribute) => [
      attribute.rawName ?? '',
      attribute.rawValue ?? '',
    ]),
  ]);
}

function targetResultParts(target: ResourceTargetReference | null): readonly string[] {
  if (target == null) {
    return ['no-target'];
  }
  return [
    target.identityHandle ?? '',
    target.addressHandle ?? '',
    target.localName ?? '',
    target.moduleKey ?? '',
    target.declarationSourceAddressHandle ?? '',
    target.targetType?.productHandle ?? '',
    target.targetType?.identityHandle ?? '',
    target.targetType?.semanticKey ?? '',
    target.targetType?.display ?? '',
    target.targetType?.shapeKind ?? '',
    target.targetType?.origin ?? '',
    target.targetType?.sourceAddressHandle ?? '',
  ];
}

function containerReferenceResultParts(
  container: TemplateCompilerWorldEmission['world']['container'],
): readonly string[] {
  return [
    container.identityHandle ?? '',
    container.productHandle ?? '',
    container.addressHandle ?? '',
    container.localName ?? '',
  ];
}

function fieldProvenanceResultParts(
  provenance: readonly { readonly field: string; readonly provenanceHandle: string }[],
): readonly string[] {
  return provenance.flatMap((entry) => [entry.field, entry.provenanceHandle]);
}

function scalarPart(value: string | number | boolean | null): string {
  return value == null ? 'null' : String(value);
}

function revisionParts(parts: readonly (string | ProductHandle)[]): string {
  return parts.map((part) => `${part.length}:${part}`).join('|');
}

function revisionDigest(parts: readonly (string | ProductHandle)[]): string {
  // The exact typed closure/result facts stay on the read object; this domain digest prevents repeating a complete
  // compiler scope in every hot read revision without collapsing source, closure, and result into one fingerprint.
  return createHash('sha256').update(revisionParts(parts)).digest('base64url');
}
