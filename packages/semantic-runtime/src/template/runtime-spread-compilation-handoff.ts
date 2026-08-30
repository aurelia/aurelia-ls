import type { ProductHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import {
  projectRuntimeExpressionAstValue,
  RuntimeExpressionAstProjectionState,
} from '../expression/runtime-ast-value.js';
import { CustomElementDefinition } from '../resources/custom-element-definition.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import {
  HtmlElement,
} from './html-ir.js';
import {
  expressionProductHandlesForInstruction,
  HydrateElementInstruction,
  SpreadTransferedBindingInstruction,
  SpreadValueBindingInstruction,
  type TemplateInstruction,
} from './instruction-ir.js';
import { TemplateProductDetails } from './product-details.js';
import { resourceLocalRuntimeSpreadCompilations } from './runtime-resource-ownership.js';
import type { RuntimeSpreadCompilation } from './runtime-spread-compilation.js';
import { RuntimeRendererSpreadCompileState } from './runtime-renderer.js';
import {
  projectTemplateCompilerCompiledHandoffInstructionValue,
  type TemplateCompilerCompiledHandoffSpreadCase,
  type TemplateCompilerCompiledHandoffSpreadExpressionEntry,
  type TemplateCompilerCompiledHandoffSpreadPlan,
} from './template-compiler-compiled-handoff-value.js';
import type { TemplateCompilerContextFamilyValue } from './template-compiler-context-family-value.js';
import { CompilerTransformedTemplateElement } from './template-structure.js';
import { runtimeLocalName } from './runtime-dom-name.js';
import {
  projectTemplateCompilerRuntimeInstructionClosure,
  TemplateCompilerRuntimeInstructionFamilyState,
  TemplateCompilerRuntimeResourceRepresentation,
} from './template-instruction-runtime-value.js';
import { runtimeAcceptedBindingExpressionAstForParse } from './expression-parse-projection.js';
import type { TemplateResourceRuntimeAnalysisEmission } from './template-compilation-project-pass.js';
import { TemplateExpressionParseState, type TemplateExpressionParse } from './value-site.js';

export const enum RuntimeSpreadCompilationHandoffState {
  Exact = 'exact',
  Open = 'open',
  Pending = 'pending',
  Ineligible = 'ineligible',
}

export class RuntimeSpreadCompilationHandoffReason {
  constructor(
    readonly reasonKind: string,
    readonly summary: string,
    readonly stableKeys: readonly string[] = [],
  ) {}
}

export class RuntimeSpreadCompilationHandoffResult {
  constructor(
    readonly state: RuntimeSpreadCompilationHandoffState,
    readonly plansByInstruction: ReadonlyMap<HydrateElementInstruction, TemplateCompilerCompiledHandoffSpreadPlan>,
    readonly reasons: readonly RuntimeSpreadCompilationHandoffReason[],
  ) {
    if ((state === RuntimeSpreadCompilationHandoffState.Exact) !== (reasons.length === 0)) {
      throw new Error('Runtime spread compilation handoff lost exact or unavailable ownership.');
    }
  }
}

export interface RuntimeSpreadCompilationHandoffRequest {
  readonly resource: TemplateResourceRuntimeAnalysisEmission;
  readonly family: TemplateCompilerContextFamilyValue;
  readonly requestorFamiliesByDefinitionProduct: ReadonlyMap<ProductHandle, TemplateCompilerContextFamilyValue>;
  readonly store: KernelStore;
}

interface SpreadPlanAccumulator {
  readonly cases: TemplateCompilerCompiledHandoffSpreadCase[];
  readonly caseByRuntimeKey: Map<string, TemplateCompilerCompiledHandoffSpreadCase>;
}

interface OneLevelStaticSpreadCoverage {
  readonly ownerByCompilation: ReadonlyMap<RuntimeSpreadCompilation, HydrateElementInstruction>;
}

/** Detach resource-local runtime spread invocations onto the browser-final HydrateElement that owns their captures. */
export function projectRuntimeSpreadCompilationHandoffs(
  request: RuntimeSpreadCompilationHandoffRequest,
): RuntimeSpreadCompilationHandoffResult {
  const accumulators = new Map<HydrateElementInstruction, SpreadPlanAccumulator>();
  const dynamicInstructions = new Map(
    request.resource.runtimeAnalysis.runtimeRendering.dynamicInstructions.map((instruction) => [
      instruction.productHandle,
      instruction,
    ]),
  );
  const dynamicParses = new Map(
    request.resource.runtimeAnalysis.runtimeRendering.dynamicExpressionParses.map((parse) => [
      parse.productHandle,
      parse,
    ]),
  );
  const hydrateElements = request.family.instructions.filter((instruction): instruction is HydrateElementInstruction =>
    instruction instanceof HydrateElementInstruction
  );
  const compilations = resourceLocalRuntimeSpreadCompilations(request.resource);
  const coverage = proveOneLevelStaticSpreadCoverage(request, hydrateElements, compilations);
  if (coverage instanceof RuntimeSpreadCompilationHandoffReason) {
    return new RuntimeSpreadCompilationHandoffResult(
      coverage.reasonKind === 'spread-invocation-coverage-ambiguous'
        ? RuntimeSpreadCompilationHandoffState.Ineligible
        : RuntimeSpreadCompilationHandoffState.Open,
      new Map(),
      [coverage],
    );
  }

  for (const compilation of compilations) {
    if (compilation.state === RuntimeRendererSpreadCompileState.NoCapturedAttributes) continue;
    if (compilation.state === RuntimeRendererSpreadCompileState.Open) {
      return unavailable(
        RuntimeSpreadCompilationHandoffState.Open,
        'spread-compilation-open',
        compilation.summary ?? 'Runtime spread compilation remained open.',
        [compilation.spreadInstructionProductHandle, ...compilation.reasonKinds],
      );
    }
    if (compilation.state === RuntimeRendererSpreadCompileState.Invalid) {
      return unavailable(
        RuntimeSpreadCompilationHandoffState.Ineligible,
        'spread-compilation-invalid',
        compilation.summary ?? 'Runtime spread compilation reached a framework refusal.',
        [compilation.spreadInstructionProductHandle],
      );
    }

    const owner = coverage.ownerByCompilation.get(compilation);
    if (owner == null) {
      throw new Error('Exact one-level spread coverage lost an observed compilation owner.');
    }
    if (!sameHandles(compilation.capturedSyntaxProductHandles, owner.captureSyntaxProductHandles)) {
      return unavailable(
        RuntimeSpreadCompilationHandoffState.Ineligible,
        'spread-capture-membership-mismatch',
        'Runtime spread compilation captures disagree with the browser-final HydrateElement capture order.',
        [owner.productHandle, ...compilation.capturedSyntaxProductHandles, ...owner.captureSyntaxProductHandles],
      );
    }
    const finalTarget = reconcileBrowserFinalSpreadTarget(request, compilation);
    if (finalTarget instanceof RuntimeSpreadCompilationHandoffReason) {
      return new RuntimeSpreadCompilationHandoffResult(
        RuntimeSpreadCompilationHandoffState.Open,
        new Map(),
        [finalTarget],
      );
    }

    const roots = readInstructions(compilation.rootInstructionProductHandles, dynamicInstructions);
    const created = readInstructions(compilation.createdInstructionProductHandles, dynamicInstructions);
    const parses = readParses(compilation.expressionParseProductHandles, dynamicParses);
    if (roots == null || created == null || parses == null) {
      return unavailable(
        RuntimeSpreadCompilationHandoffState.Pending,
        'spread-compilation-product-unavailable',
        'Runtime spread compilation lost an instruction or expression-parse product before detachment.',
        [compilation.spreadInstructionProductHandle],
      );
    }
    const parseMembership = new Set(parses.map((parse) => parse.productHandle));
    if (created.some((instruction) => expressionProductHandlesForInstruction(instruction).some((handle) =>
      !parseMembership.has(handle)
    ))) {
      return unavailable(
        RuntimeSpreadCompilationHandoffState.Ineligible,
        'spread-expression-membership-mismatch',
        'Runtime spread compilation created an instruction whose expression parse is outside the invocation carrier.',
        [compilation.spreadInstructionProductHandle],
      );
    }

    let projected;
    try {
      projected = projectTemplateCompilerRuntimeInstructionClosure({
        rootInstructions: roots,
        createdInstructions: created,
        productDetails: request.store,
        resourceRepresentation: TemplateCompilerRuntimeResourceRepresentation.Name,
      });
    } catch (error) {
      return unavailable(
        RuntimeSpreadCompilationHandoffState.Ineligible,
        'spread-instruction-closure-invalid',
        error instanceof Error ? error.message : String(error),
        [compilation.spreadInstructionProductHandle],
      );
    }
    if (projected.state !== TemplateCompilerRuntimeInstructionFamilyState.Exact || projected.value == null) {
      return new RuntimeSpreadCompilationHandoffResult(
        projected.state === TemplateCompilerRuntimeInstructionFamilyState.Pending
          ? RuntimeSpreadCompilationHandoffState.Pending
          : RuntimeSpreadCompilationHandoffState.Ineligible,
        new Map(),
        projected.reasons.map((reason) => new RuntimeSpreadCompilationHandoffReason(
          reason.reasonKind,
          reason.summary,
          [reason.instructionProductHandle ?? '(none)'],
        )),
      );
    }

    const requestor = readCustomElementDefinition(
      request.store,
      compilation.requestorDefinitionProductHandle,
    );
    const targetDefinition = readCustomElementDefinition(
      request.store,
      finalTarget.definitionProductHandle,
    );
    if (requestor == null) {
      return unavailable(
        RuntimeSpreadCompilationHandoffState.Pending,
        'spread-requestor-or-target-unavailable',
        'Runtime spread compilation requires current requestor and target identities for build lookup.',
        [
          compilation.requestorDefinitionProductHandle ?? '(none)',
          compilation.targetHtmlNodeProductHandle ?? '(none)',
        ],
      );
    }
    if (finalTarget.definitionProductHandle != null && targetDefinition == null) {
      return unavailable(
        RuntimeSpreadCompilationHandoffState.Pending,
        'spread-target-definition-unavailable',
        'Runtime spread compilation selected a target definition that is unavailable during detachment.',
        [finalTarget.definitionProductHandle],
      );
    }
    const residual = residualExpressions(created, parses, request.store);
    if (residual instanceof RuntimeSpreadCompilationHandoffReason) {
      return new RuntimeSpreadCompilationHandoffResult(
        RuntimeSpreadCompilationHandoffState.Pending,
        new Map(),
        [residual],
      );
    }
    const emptyDefinitionIds = new Map();
    const emptySpreadPlans = new Map();
    const spreadCase: TemplateCompilerCompiledHandoffSpreadCase = {
      requestorName: requestor.name,
      requestorKey: requestor.key,
      target: {
        namespaceKind: finalTarget.element.namespace,
        namespaceUri: finalTarget.element.namespaceUri,
        localName: runtimeLocalName(finalTarget.element.tagName, finalTarget.element.namespace),
        targetDefinitionMatch: compilation.targetDefinitionExplicit
          ? 'explicit-definition'
          : 'structural',
        definitionName: targetDefinition?.name ?? null,
        definitionKey: targetDefinition?.key ?? null,
      },
      instructions: projected.value.roots.map((value) =>
        projectTemplateCompilerCompiledHandoffInstructionValue(value, emptyDefinitionIds, emptySpreadPlans)
      ),
      residualExpressions: residual,
    };
    let accumulator = accumulators.get(owner);
    if (accumulator == null) {
      accumulator = { cases: [], caseByRuntimeKey: new Map() };
      accumulators.set(owner, accumulator);
    }
    const key = runtimeSpreadCompilationHandoffCaseKey(spreadCase);
    const previous = accumulator.caseByRuntimeKey.get(key);
    if (previous != null) {
      if (!runtimeSpreadCompilationHandoffCasesEquivalent(previous, spreadCase)) {
        return unavailable(
          RuntimeSpreadCompilationHandoffState.Ineligible,
          'spread-runtime-key-collision',
          'Two runtime spread invocations share one build lookup key but produce different outputs.',
          [owner.productHandle, key],
        );
      }
      continue;
    }
    accumulator.caseByRuntimeKey.set(key, spreadCase);
    accumulator.cases.push(spreadCase);
  }

  return new RuntimeSpreadCompilationHandoffResult(
    RuntimeSpreadCompilationHandoffState.Exact,
    new Map([...accumulators].map(([instruction, accumulator]) => [
      instruction,
      { cases: accumulator.cases },
    ])),
    [],
  );
}

function proveOneLevelStaticSpreadCoverage(
  request: RuntimeSpreadCompilationHandoffRequest,
  browserOwners: readonly HydrateElementInstruction[],
  compilations: readonly RuntimeSpreadCompilation[],
): OneLevelStaticSpreadCoverage | RuntimeSpreadCompilationHandoffReason {
  const authoredOwners = request.resource.compilation.compiledTemplate.instructions
    .filter((instruction): instruction is HydrateElementInstruction =>
      instruction instanceof HydrateElementInstruction
    );
  const expectedByOwner = new Map<HydrateElementInstruction, {
    readonly requestorProductHandle: ProductHandle;
    readonly spreadSite: SpreadTransferedBindingInstruction;
  }>();

  for (const owner of browserOwners) {
    if (owner.captureSyntaxProductHandles.length === 0) continue;
    const requestorProductHandle = owner.definitionProductHandle;
    if (requestorProductHandle == null) {
      return spreadTargetReason(
        'spread-invocation-coverage-incomplete',
        'A nonempty browser-final capture owner has no requestor definition for static spread coverage.',
        [owner.productHandle],
      );
    }
    const requestorFamily = request.requestorFamiliesByDefinitionProduct.get(requestorProductHandle) ?? null;
    if (requestorFamily == null) {
      return spreadTargetReason(
        'spread-invocation-coverage-incomplete',
        'A nonempty browser-final capture owner has no unique requestor family for static spread coverage.',
        [owner.productHandle, requestorProductHandle ?? '(none)'],
      );
    }
    const spreadSites = requestorFamily.instructions.filter(
      (instruction): instruction is SpreadTransferedBindingInstruction =>
        instruction instanceof SpreadTransferedBindingInstruction
    );
    if (spreadSites.length === 0) continue;
    if (spreadSites.length !== 1) {
      return spreadTargetReason(
        'spread-invocation-coverage-incomplete',
        `One-level static spread closure requires exactly one requestor spread site; found ${spreadSites.length}.`,
        [owner.productHandle, requestorProductHandle, ...spreadSites.map((site) => site.productHandle)],
      );
    }
    const matchingAuthoredOwners = authoredOwners.filter((candidate) =>
      sameHydrateElementOwnership(owner, candidate)
    );
    if (matchingAuthoredOwners.length !== 1) {
      return spreadTargetReason(
        matchingAuthoredOwners.length === 0
          ? 'spread-invocation-coverage-incomplete'
          : 'spread-invocation-coverage-ambiguous',
        `Browser-final capture owner selected ${matchingAuthoredOwners.length} authored owner(s) for spread coverage.`,
        [owner.productHandle, ...matchingAuthoredOwners.map((candidate) => candidate.productHandle)],
      );
    }
    expectedByOwner.set(owner, {
      requestorProductHandle,
      spreadSite: spreadSites[0]!,
    });
  }

  const carriersByOwner = new Map<HydrateElementInstruction, RuntimeSpreadCompilation[]>();
  const ownerByCompilation = new Map<RuntimeSpreadCompilation, HydrateElementInstruction>();
  for (const compilation of compilations) {
    if (compilation.state === RuntimeRendererSpreadCompileState.NoCapturedAttributes) continue;
    const contextProductHandle = compilation.capturedAttributeContextInstructionProductHandle;
    const contextInstruction = contextProductHandle == null
      ? null
      : request.store.readProductDetail(TemplateProductDetails.Instruction, contextProductHandle);
    const owners = !(contextInstruction instanceof HydrateElementInstruction)
      ? []
      : browserOwners.filter((owner) => sameHydrateElementOwnership(owner, contextInstruction));
    if (owners.length !== 1) {
      return spreadTargetReason(
        owners.length === 0
          ? 'spread-invocation-coverage-incomplete'
          : 'spread-invocation-coverage-ambiguous',
        `Observed spread compilation selected ${owners.length} browser-final capture owner(s).`,
        [compilation.spreadInstructionProductHandle, contextProductHandle ?? '(none)'],
      );
    }
    const owner = owners[0]!;
    const expected = expectedByOwner.get(owner);
    const observedSite = request.store.readProductDetail(
      TemplateProductDetails.Instruction,
      compilation.spreadInstructionProductHandle,
    );
    if (
      expected == null
      || compilation.requestorDefinitionProductHandle !== expected.requestorProductHandle
      || !(observedSite instanceof SpreadTransferedBindingInstruction)
      || !sameSpreadInstructionOwnership(expected.spreadSite, observedSite)
    ) {
      return spreadTargetReason(
        'spread-invocation-coverage-incomplete',
        'Observed spread compilation is outside the supported one-level static owner/site coverage.',
        [owner.productHandle, compilation.spreadInstructionProductHandle],
      );
    }
    const carriers = carriersByOwner.get(owner) ?? [];
    carriers.push(compilation);
    carriersByOwner.set(owner, carriers);
    ownerByCompilation.set(compilation, owner);
  }

  for (const [owner, expected] of expectedByOwner) {
    const carriers = carriersByOwner.get(owner) ?? [];
    if (carriers.length === 0) {
      return spreadTargetReason(
        'spread-invocation-coverage-incomplete',
        'A runtime-reachable nonempty capture owner has no observed static spread compilation.',
        [owner.productHandle, expected.requestorProductHandle, expected.spreadSite.productHandle],
      );
    }
    if (carriers.length !== 1) {
      return spreadTargetReason(
        'spread-invocation-coverage-ambiguous',
        `A runtime-reachable nonempty capture owner has ${carriers.length} observed spread compilations.`,
        [owner.productHandle, ...carriers.map((carrier) => carrier.spreadInstructionProductHandle)],
      );
    }
  }

  return { ownerByCompilation };
}

function sameHydrateElementOwnership(
  left: HydrateElementInstruction,
  right: HydrateElementInstruction,
): boolean {
  return left.elementName === right.elementName
    && left.resourceLookupName === right.resourceLookupName
    && left.sourceAddressHandle === right.sourceAddressHandle
    && sameHandles(left.captureSyntaxProductHandles, right.captureSyntaxProductHandles);
}

/** Runtime-computable lookup identity; effective world lookup is diagnostic-only unless targetDef was explicit. */
export function runtimeSpreadCompilationHandoffCaseKey(
  spreadCase: TemplateCompilerCompiledHandoffSpreadCase,
): string {
  const target = spreadCase.target;
  return JSON.stringify([
    spreadCase.requestorName,
    spreadCase.requestorKey,
    target.namespaceUri,
    target.localName,
    target.targetDefinitionMatch,
    target.targetDefinitionMatch === 'explicit-definition' ? target.definitionName : null,
    target.targetDefinitionMatch === 'explicit-definition' ? target.definitionKey : null,
  ]);
}

/** Coalescing equality over runtime-emitted behavior; structural effective-definition details remain diagnostic-only. */
export function runtimeSpreadCompilationHandoffCasesEquivalent(
  left: TemplateCompilerCompiledHandoffSpreadCase,
  right: TemplateCompilerCompiledHandoffSpreadCase,
): boolean {
  return JSON.stringify(runtimeSpreadCompilationComparableCase(left))
    === JSON.stringify(runtimeSpreadCompilationComparableCase(right));
}

interface BrowserFinalSpreadTarget {
  readonly element: CompilerTransformedTemplateElement;
  readonly definitionProductHandle: ProductHandle | null;
}

function reconcileBrowserFinalSpreadTarget(
  request: RuntimeSpreadCompilationHandoffRequest,
  compilation: RuntimeSpreadCompilation,
): BrowserFinalSpreadTarget | RuntimeSpreadCompilationHandoffReason {
  const requestorProductHandle = compilation.requestorDefinitionProductHandle;
  const family = requestorProductHandle == null
    ? null
    : request.requestorFamiliesByDefinitionProduct.get(requestorProductHandle) ?? null;
  if (family == null) {
    return spreadTargetReason(
      'spread-requestor-family-unavailable',
      'Runtime spread compilation has no exact browser-final requestor family.',
      [requestorProductHandle ?? '(none)'],
    );
  }
  const targetProductHandle = compilation.targetHtmlNodeProductHandle;
  const rows = family.contexts.flatMap((context) => context.rows).filter((row) =>
    row.target.htmlNode?.productHandle === targetProductHandle
  );
  if (rows.length !== 1) {
    return spreadTargetReason(
      rows.length === 0 ? 'spread-final-target-unavailable' : 'spread-final-target-ambiguous',
      `Runtime spread compilation selected ${rows.length} browser-final target row(s).`,
      [requestorProductHandle ?? '(none)', targetProductHandle ?? '(none)'],
    );
  }
  const row = rows[0]!;
  const logicalTarget = row.geometry.logicalTarget;
  if (!(logicalTarget instanceof CompilerTransformedTemplateElement)) {
    return spreadTargetReason(
      'spread-final-target-not-element',
      'Runtime spread compilation target is not a browser-final element.',
      [row.target.productHandle, logicalTarget.productHandle],
    );
  }
  const authoredTarget = targetProductHandle == null
    ? null
    : request.store.readProductDetail(TemplateProductDetails.HtmlNode, targetProductHandle);
  if (!(authoredTarget instanceof HtmlElement)) {
    return spreadTargetReason(
      'spread-authored-target-unavailable',
      'Runtime spread compilation lost its authored target element before browser-final reconciliation.',
      [targetProductHandle ?? '(none)'],
    );
  }
  const authoredLocalName = runtimeLocalName(authoredTarget.tagName, authoredTarget.namespace);
  const finalLocalName = runtimeLocalName(logicalTarget.tagName, logicalTarget.namespace);
  if (authoredTarget.namespace !== logicalTarget.namespace || authoredLocalName !== finalLocalName) {
    return spreadTargetReason(
      'spread-target-browser-divergence',
      'Authored and browser-final runtime spread targets disagree in namespace or local name.',
      [
        authoredTarget.namespace,
        authoredLocalName,
        logicalTarget.namespace,
        finalLocalName,
      ],
    );
  }

  const originalSpreadInstruction = request.store.readProductDetail(
    TemplateProductDetails.Instruction,
    compilation.spreadInstructionProductHandle,
  );
  const spreadInstructions = originalSpreadInstruction instanceof SpreadTransferedBindingInstruction
    ? row.instructions.filter((instruction): instruction is SpreadTransferedBindingInstruction =>
        instruction instanceof SpreadTransferedBindingInstruction
        && sameSpreadInstructionOwnership(instruction, originalSpreadInstruction)
      )
    : [];
  if (spreadInstructions.length !== 1) {
    return spreadTargetReason(
      spreadInstructions.length === 0 ? 'spread-final-instruction-unavailable' : 'spread-final-instruction-ambiguous',
      `Runtime spread compilation selected ${spreadInstructions.length} browser-final spread instruction(s).`,
      [compilation.spreadInstructionProductHandle, row.target.productHandle],
    );
  }

  const hydrateElements = row.instructions.filter((instruction): instruction is HydrateElementInstruction =>
    instruction instanceof HydrateElementInstruction
  );
  if (hydrateElements.length > 1) {
    return spreadTargetReason(
      'spread-final-target-definition-ambiguous',
      'Runtime spread target has more than one browser-final HydrateElement definition owner.',
      hydrateElements.map((instruction) => instruction.productHandle),
    );
  }
  const finalDefinitionProductHandle = hydrateElements[0]?.definitionProductHandle ?? null;
  if (finalDefinitionProductHandle !== compilation.targetDefinitionProductHandle) {
    return spreadTargetReason(
      'spread-final-target-definition-mismatch',
      'Runtime spread effective target definition disagrees with the browser-final target row.',
      [
        compilation.targetDefinitionProductHandle ?? '(none)',
        finalDefinitionProductHandle ?? '(none)',
      ],
    );
  }
  return { element: logicalTarget, definitionProductHandle: finalDefinitionProductHandle };
}

function sameSpreadInstructionOwnership(
  current: SpreadTransferedBindingInstruction,
  observed: SpreadTransferedBindingInstruction,
): boolean {
  return current.identityHandle === observed.identityHandle
    || (
      current.node.productHandle === observed.node.productHandle
      && current.attribute.productHandle === observed.attribute.productHandle
      && current.sourceAddressHandle === observed.sourceAddressHandle
    );
}

function spreadTargetReason(
  reasonKind: string,
  summary: string,
  stableKeys: readonly (string | number)[],
): RuntimeSpreadCompilationHandoffReason {
  return new RuntimeSpreadCompilationHandoffReason(reasonKind, summary, stableKeys.map(String));
}

function runtimeSpreadCompilationComparableCase(
  spreadCase: TemplateCompilerCompiledHandoffSpreadCase,
): unknown {
  const target = spreadCase.target;
  return {
    requestorName: spreadCase.requestorName,
    requestorKey: spreadCase.requestorKey,
    target: {
      namespaceUri: target.namespaceUri,
      localName: target.localName,
      targetDefinitionMatch: target.targetDefinitionMatch,
      definitionName: target.targetDefinitionMatch === 'explicit-definition' ? target.definitionName : null,
      definitionKey: target.targetDefinitionMatch === 'explicit-definition' ? target.definitionKey : null,
    },
    instructions: spreadCase.instructions,
    residualExpressions: spreadCase.residualExpressions,
  };
}

function readInstructions(
  handles: readonly ProductHandle[],
  instructions: ReadonlyMap<ProductHandle, TemplateInstruction>,
): readonly TemplateInstruction[] | null {
  const values = handles.map((handle) => instructions.get(handle) ?? null);
  return values.some((value) => value == null) ? null : values as readonly TemplateInstruction[];
}

function readParses(
  handles: readonly ProductHandle[],
  parses: ReadonlyMap<ProductHandle, TemplateExpressionParse>,
): readonly TemplateExpressionParse[] | null {
  const values = handles.map((handle) => parses.get(handle) ?? null);
  return values.some((value) => value == null) ? null : values as readonly TemplateExpressionParse[];
}

function readCustomElementDefinition(
  store: KernelStore,
  productHandle: ProductHandle | null,
): CustomElementDefinition | null {
  if (productHandle == null) return null;
  const definition = store.readProductDetail(ResourceProductDetails.Definition, productHandle);
  return definition instanceof CustomElementDefinition ? definition : null;
}

function residualExpressions(
  instructions: readonly TemplateInstruction[],
  parses: readonly TemplateExpressionParse[],
  store: KernelStore,
): readonly TemplateCompilerCompiledHandoffSpreadExpressionEntry[] | RuntimeSpreadCompilationHandoffReason {
  const parseByProduct = new Map(parses.map((parse) => [parse.productHandle, parse]));
  const entries: TemplateCompilerCompiledHandoffSpreadExpressionEntry[] = [];
  for (const instruction of instructions) {
    if (!(instruction instanceof SpreadValueBindingInstruction) || instruction.expressionProductHandle == null) continue;
    const parse = parseByProduct.get(instruction.expressionProductHandle) ?? null;
    const site = parse == null
      ? null
      : store.readProductDetail(TemplateProductDetails.ValueSite, parse.site.productHandle);
    const ast = parse == null ? null : runtimeAcceptedBindingExpressionAstForParse(parse);
    const projection = ast == null ? null : projectRuntimeExpressionAstValue(ast);
    if (
      parse == null
      || parse.state !== TemplateExpressionParseState.Complete
      || site?.entryFamily == null
      || !runtimeSpreadResidualExpressionMatchesParserRequest(instruction, site)
      || projection?.state !== RuntimeExpressionAstProjectionState.Exact
      || projection.value == null
    ) {
      return new RuntimeSpreadCompilationHandoffReason(
        'spread-residual-expression-unavailable',
        'A string-valued spread instruction has no exact residual expression cache entry.',
        [instruction.productHandle, instruction.expressionProductHandle],
      );
    }
    entries.push({ expressionType: site.entryFamily, source: site.rawValue, value: projection.value });
  }
  return entries;
}

/** RC2 SpreadValueRenderer reparses exactly `(instruction.from, IsProperty)`. */
export function runtimeSpreadResidualExpressionMatchesParserRequest(
  instruction: Pick<SpreadValueBindingInstruction, 'value'>,
  site: {
    readonly rawValue: string;
    readonly entryFamily: string | null;
  },
): boolean {
  return site.rawValue === instruction.value && site.entryFamily === 'IsProperty';
}

function sameHandles(left: readonly ProductHandle[], right: readonly ProductHandle[]): boolean {
  return left.length === right.length && left.every((handle, index) => handle === right[index]);
}

function unavailable(
  state: Exclude<RuntimeSpreadCompilationHandoffState, RuntimeSpreadCompilationHandoffState.Exact>,
  reasonKind: string,
  summary: string,
  stableKeys: readonly (string | number)[],
): RuntimeSpreadCompilationHandoffResult {
  return new RuntimeSpreadCompilationHandoffResult(
    state,
    new Map(),
    [new RuntimeSpreadCompilationHandoffReason(reasonKind, summary, stableKeys.map(String))],
  );
}
