import type { ProjectBootFrame } from '../boot/frames.js';
import type { BindingScope } from '../configuration/scope.js';
import type { StaticProjectEvaluationResult } from '../evaluation/project-evaluation.js';
import {
  EvaluationValueKind,
} from '../evaluation/values.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type { AddressHandle, EvidenceHandle, ProductHandle, ProvenanceHandle } from '../kernel/handles.js';
import { RouterIdentity } from '../kernel/identity.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import { OpenSeam } from '../kernel/open-seam.js';
import {
  compactFieldProvenance,
  FieldProvenance,
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary, type ProductKindKey } from '../kernel/vocabulary.js';
import {
  RuntimeBindingSourceValueEvaluationKind,
  RuntimeBindingSourceValueEvaluator,
} from '../observation/binding-source-value-evaluator.js';
import { HtmlAttribute, HtmlElement } from '../template/html-ir.js';
import {
  HydrateAttributeInstruction,
  InterpolationInstruction,
  MultiAttrInstruction,
  PropertyBindingInstruction,
  SetPropertyInstruction,
} from '../template/instruction-ir.js';
import { runtimeAcceptedBindingExpressionAstForParse } from '../template/expression-parse-projection.js';
import { TemplateProductDetails } from '../template/product-details.js';
import { RuntimeControllerCreationKind } from '../template/runtime-controller.js';
import type { RuntimeControllerFrame } from '../template/runtime-controller.js';
import type { TemplateCompilationProjectEmission } from '../template/template-compilation-project-pass.js';
import type { TemplateScopeConstructionEmission } from '../template/template-controller-scope-materializer.js';
import {
  NavigationInstructionKind,
  TypedNavigationInstructionModel,
  ViewportInstructionModel,
  ViewportInstructionTreeModel,
  type RouterInstructionField,
  type RouteContextModel,
} from './model.js';
import type { RouteConfigContextMaterializationProjectResult } from './route-context-materialization.js';
import {
  parseRouteExpression,
  type ParsedRouteExpression,
  type ParsedViewportInstruction,
} from './route-expression-parser.js';
import type { RouteRuntimeTopologyProjectResult } from './route-runtime-topology.js';
import { routeRuntimeContextsByComponentDefinition } from './route-topology-index.js';
import type { RouterOptionsMaterializationProjectResult } from './router-options-materialization.js';

export const enum RouterResourceInstructionKind {
  Load = 'load',
  Href = 'href',
}

interface RouterResourceInstructionSite {
  readonly kind: RouterResourceInstructionKind;
  readonly routeContext: RouteContextModel | null;
  readonly controller: RuntimeControllerFrame;
  readonly instruction: HydrateAttributeInstruction;
  readonly scope: BindingScope | null;
  readonly host: HtmlElement | null;
  readonly sourceAddressHandle: AddressHandle | null;
}

interface ClosedRouterResourceInstruction {
  readonly site: RouterResourceInstructionSite;
  readonly value: string;
  readonly valueSourceAddressHandle: AddressHandle | null;
}

interface RouteInstructionEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly typedNavigationInstructions: readonly TypedNavigationInstructionModel[];
  readonly viewportInstructions: readonly ViewportInstructionModel[];
  readonly viewportInstructionTree: ViewportInstructionTreeModel;
}

interface RouterResourceExpression {
  readonly routeContext: RouteContextModel;
  readonly expression: ParsedRouteExpression;
}

interface MaterializedViewportInstructionEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly typedNavigationInstructions: readonly TypedNavigationInstructionModel[];
  readonly viewportInstructions: readonly ViewportInstructionModel[];
  readonly viewportInstruction: ViewportInstructionModel;
}

/** Router instruction products created before route-tree transition compilation. */
export class RouteInstructionMaterializationProjectResult {
  constructor(
    readonly project: ProjectBootFrame,
    readonly typedNavigationInstructions: readonly TypedNavigationInstructionModel[],
    readonly viewportInstructions: readonly ViewportInstructionModel[],
    readonly viewportInstructionTrees: readonly ViewportInstructionTreeModel[],
    readonly openSeams: readonly OpenSeam[],
  ) {}

  readTypedNavigationInstructions(): readonly TypedNavigationInstructionModel[] {
    return this.typedNavigationInstructions;
  }

  readViewportInstructions(): readonly ViewportInstructionModel[] {
    return this.viewportInstructions;
  }

  readViewportInstructionTrees(): readonly ViewportInstructionTreeModel[] {
    return this.viewportInstructionTrees;
  }
}

/** Materialize static load/href ViewportInstructionTree products from router resource controllers. */
export class RouteInstructionMaterializationProjectPass {
  materializeAndEmit(
    store: KernelStore,
    project: ProjectBootFrame,
    routeConfigContexts: RouteConfigContextMaterializationProjectResult,
    routeRuntime: RouteRuntimeTopologyProjectResult,
    templates: TemplateCompilationProjectEmission,
    routerOptions: RouterOptionsMaterializationProjectResult,
    evaluation: StaticProjectEvaluationResult,
  ): RouteInstructionMaterializationProjectResult {
    const sourceValueEvaluator = new RuntimeBindingSourceValueEvaluator(store, evaluation);
    const routeContextsByDefinition = routeRuntimeContextsByComponentDefinition(routeConfigContexts, routeRuntime);
    const routeContextsByIdentity = new Map(
      routeRuntime.readRouteContexts().map((routeContext) => [routeContext.identityHandle, routeContext] as const),
    );
    const emissions: RouteInstructionEmission[] = [];
    const openSeams: OpenSeam[] = [];
    const openRecords: KernelStoreRecord[] = [];

    for (const resource of templates.resources) {
      const definitionIdentity = resource.compilation.definition.target.identityHandle;
      const routeContexts = definitionIdentity == null
        ? null
        : routeContextsByDefinition.get(definitionIdentity) ?? null;
      for (const controller of resource.runtimeAnalysis.runtimeRendering.controllers) {
        for (const routeContext of routeContextCandidates(routeContexts)) {
          const site = routerResourceInstructionSite(store, controller, routeContext, resource.runtimeAnalysis.scopes);
          if (site == null) {
            continue;
          }
          const closed = closeRouterResourceInstruction(store, site, sourceValueEvaluator, openSeams, openRecords);
          if (closed == null) {
            continue;
          }
          const emission = materializeInstructionTree(
            store,
            closed,
            routeContextsByIdentity,
            routerOptions,
            openSeams,
            openRecords,
          );
          if (emission != null) {
            emissions.push(emission);
          }
        }
      }
    }

    const records = [
      ...emissions.flatMap((emission) => emission.records),
      ...openRecords,
    ];
    if (records.length > 0) {
      store.commit(new KernelStoreBatch(records, `router-instructions:${project.projectKey}`));
    }
    return new RouteInstructionMaterializationProjectResult(
      project,
      emissions.flatMap((emission) => emission.typedNavigationInstructions),
      emissions.flatMap((emission) => emission.viewportInstructions),
      emissions.map((emission) => emission.viewportInstructionTree),
      openSeams,
    );
  }
}

function routerResourceInstructionSite(
  store: KernelStore,
  controller: RuntimeControllerFrame,
  routeContext: RouteContextModel | null,
  scopes: TemplateScopeConstructionEmission,
): RouterResourceInstructionSite | null {
  if (controller.creationKind !== RuntimeControllerCreationKind.CustomAttribute) {
    return null;
  }
  const kind = controller.name === RouterResourceInstructionKind.Load
    ? RouterResourceInstructionKind.Load
    : controller.name === RouterResourceInstructionKind.Href
      ? RouterResourceInstructionKind.Href
      : null;
  if (kind == null || controller.instructionProductHandle == null) {
    return null;
  }
  const instruction = store.productDetails.read(TemplateProductDetails.Instruction, controller.instructionProductHandle);
  if (!(instruction instanceof HydrateAttributeInstruction)) {
    return null;
  }
  const host = htmlElementForInstruction(store, instruction);
  return {
    kind,
    routeContext,
    controller,
    instruction,
    scope: scopeForInstruction(scopes, instruction),
    host,
    sourceAddressHandle: controller.sourceAddressHandle,
  };
}

function routeContextCandidates(
  routeContexts: readonly RouteContextModel[] | null,
): readonly (RouteContextModel | null)[] {
  return routeContexts == null || routeContexts.length === 0
    ? [null]
    : routeContexts;
}

function scopeForInstruction(
  scopes: TemplateScopeConstructionEmission,
  instruction: HydrateAttributeInstruction,
): BindingScope | null {
  return scopes.instructionScopes.find((candidate) =>
    candidate.instructionProductHandle === instruction.productHandle
  )?.scope ?? null;
}

function closeRouterResourceInstruction(
  store: KernelStore,
  site: RouterResourceInstructionSite,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator,
  openSeams: OpenSeam[],
  records: KernelStoreRecord[],
): ClosedRouterResourceInstruction | null {
  if (site.routeContext == null) {
    recordOpenSeam(
      store,
      site,
      'Router resource instruction needs an owning RouteContext before relative ViewportInstructionTree creation can close.',
      openSeams,
      records,
    );
    return null;
  }
  if (site.kind === RouterResourceInstructionKind.Href && hrefIsExternal(store, site, sourceValueEvaluator)) {
    return null;
  }

  const property = site.kind === RouterResourceInstructionKind.Load ? 'route' : 'value';
  const value = staticStringBindingValue(store, site.instruction, property, site.scope, sourceValueEvaluator);
  switch (value.state) {
    case 'closed':
      return {
        site,
        value: value.value,
        valueSourceAddressHandle: value.sourceAddressHandle,
      };
    case 'dynamic':
      recordOpenSeam(
        store,
        site,
        `${site.kind} router resource has a dynamic '${property}' binding; ViewportInstructionTree materialization needs a static string value before it can close.${value.reason == null ? '' : ` ${value.reason}`}`,
        openSeams,
        records,
      );
      return null;
    case 'missing':
      recordOpenSeam(
        store,
        site,
        `${site.kind} router resource did not expose a '${property}' value instruction.`,
        openSeams,
        records,
      );
      return null;
  }
}

function materializeInstructionTree(
  store: KernelStore,
  closed: ClosedRouterResourceInstruction,
  routeContextsByIdentity: ReadonlyMap<RouteContextModel['identityHandle'], RouteContextModel>,
  routerOptions: RouterOptionsMaterializationProjectResult,
  openSeams: OpenSeam[],
  openRecords: KernelStoreRecord[],
): RouteInstructionEmission | null {
  const site = closed.site;
  const routeContextIdentity = site.routeContext?.identityHandle ?? 'unowned-route-context';
  const local = `router-instruction:${routeContextIdentity}:${site.kind}:${site.controller.productHandle}:${encodeLocal(closed.value)}`;
  const treeLocal = `${local}:tree`;
  const treeEvidenceHandle = store.handles.evidence(treeLocal);
  const treeProvenanceHandle = store.handles.provenance(treeLocal);
  const treeProductHandle = store.handles.product(treeLocal);
  const treeIdentityHandle = store.handles.identity(treeLocal);
  const parsed = parseClosedRouteExpression(store, closed, routeContextsByIdentity, openSeams, openRecords);
  if (parsed == null) {
    return null;
  }
  const ownerHandle = parsed.routeContext.identityHandle;
  const viewportInstructionEmissions = parsed.expression.instructions.map((instruction, index) =>
    materializeViewportInstruction(store, closed, ownerHandle, local, `${index}`, instruction)
  );
  const viewportInstructionTree = new ViewportInstructionTreeModel(
    treeProductHandle,
    treeIdentityHandle,
    parsed.routeContext.toReference(),
    viewportInstructionEmissions.map((emission) => emission.viewportInstruction.toReference()),
    routerOptions.readEffectiveRouterOptions()?.toReference() ?? null,
    parsed.expression.isAbsolute,
    parsed.expression.queryParamCount,
    parsed.expression.fragment,
    site.sourceAddressHandle,
    viewportInstructionTreeFieldProvenance(treeProvenanceHandle, routerOptions.readEffectiveRouterOptions() != null),
  );

  return {
    records: [
      ...viewportInstructionEmissions.flatMap((emission) => emission.records),
      ...routerProductRecords(
        store,
        treeLocal,
        viewportInstructionTree.productHandle,
        viewportInstructionTree.identityHandle,
        KernelVocabulary.Router.ViewportInstructionTree.key,
        ownerHandle,
        viewportInstructionTree.sourceAddressHandle,
        treeProvenanceHandle,
        treeEvidenceHandle,
        site.kind,
        'Router resource valueChanged created a RouteExpression-backed ViewportInstructionTree before route-tree transition compilation.',
      ),
    ],
    typedNavigationInstructions: viewportInstructionEmissions.flatMap((emission) => emission.typedNavigationInstructions),
    viewportInstructions: viewportInstructionEmissions.flatMap((emission) => emission.viewportInstructions),
    viewportInstructionTree,
  };
}

function parseClosedRouteExpression(
  store: KernelStore,
  closed: ClosedRouterResourceInstruction,
  routeContextsByIdentity: ReadonlyMap<RouteContextModel['identityHandle'], RouteContextModel>,
  openSeams: OpenSeam[],
  records: KernelStoreRecord[],
): RouterResourceExpression | null {
  try {
    const normalized = normalizeRouteExpressionInput(closed, routeContextsByIdentity);
    return {
      routeContext: normalized.routeContext,
      expression: parseRouteExpression(normalized.value),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    recordOpenSeam(
      store,
      closed.site,
      `${closed.site.kind} router resource value could not be parsed as a RouteExpression: ${reason}`,
      openSeams,
      records,
    );
    return null;
  }
}

function normalizeRouteExpressionInput(
  closed: ClosedRouterResourceInstruction,
  routeContextsByIdentity: ReadonlyMap<RouteContextModel['identityHandle'], RouteContextModel>,
): {
  readonly routeContext: RouteContextModel;
  readonly value: string;
} {
  let routeContext = closed.site.routeContext!;
  let value = closed.value;
  let contextChanged = false;

  if (value.startsWith('/')) {
    routeContext = requiredRouteContextForReference(
      routeContext.root,
      routeContextsByIdentity,
      'Root router instruction could not resolve its root RouteContext reference.',
    );
    value = value.slice(1);
    contextChanged = true;
  } else if (value.startsWith('../')) {
    // Match RouteContext.createViewportInstructions: each "../" climbs one context before the flag flips.
    while (
      value.startsWith('../')
      && (routeContext.parent != null || contextChanged)
    ) {
      value = value.slice(3);
      if (!contextChanged) {
        routeContext = requiredRouteContextForReference(
          routeContext.parent,
          routeContextsByIdentity,
          'Parent-relative router instruction could not resolve its parent RouteContext reference.',
        );
      }
    }
    contextChanged = true;
  } else if (value.startsWith('./')) {
    value = value.slice(2);
  }

  return { routeContext, value };
}

function requiredRouteContextForReference(
  reference: RouteContextModel['parent'] | RouteContextModel['root'],
  routeContextsByIdentity: ReadonlyMap<RouteContextModel['identityHandle'], RouteContextModel>,
  message: string,
): RouteContextModel {
  const identityHandle = reference?.identityHandle ?? null;
  if (identityHandle == null) {
    throw new Error(message);
  }
  const routeContext = routeContextsByIdentity.get(identityHandle) ?? null;
  if (routeContext == null) {
    throw new Error(message);
  }
  return routeContext;
}

function materializeViewportInstruction(
  store: KernelStore,
  closed: ClosedRouterResourceInstruction,
  ownerHandle: RouteContextModel['identityHandle'],
  treeLocal: string,
  indexPath: string,
  instruction: ParsedViewportInstruction,
): MaterializedViewportInstructionEmission {
  const site = closed.site;
  const local = `${treeLocal}:viewport:${indexPath}`;
  const typedLocal = `${local}:typed`;
  const childEmissions = instruction.children.map((child, index) =>
    materializeViewportInstruction(store, closed, ownerHandle, treeLocal, `${indexPath}.${index}`, child)
  );
  const typedEvidenceHandle = store.handles.evidence(typedLocal);
  const typedProvenanceHandle = store.handles.provenance(typedLocal);
  const typedInstruction = new TypedNavigationInstructionModel(
    store.handles.product(typedLocal),
    store.handles.identity(typedLocal),
    NavigationInstructionKind.String,
    instruction.component,
    null,
    closed.valueSourceAddressHandle ?? site.sourceAddressHandle,
    typedInstructionFieldProvenance(typedProvenanceHandle),
  );
  const viewportEvidenceHandle = store.handles.evidence(local);
  const viewportProvenanceHandle = store.handles.provenance(local);
  const viewportInstruction = new ViewportInstructionModel(
    store.handles.product(local),
    store.handles.identity(local),
    typedInstruction.toReference(),
    instruction.viewport,
    null,
    instruction.parameterCount,
    childEmissions.map((emission) => emission.viewportInstruction.toReference()),
    instruction.open,
    instruction.close,
    null,
    site.sourceAddressHandle,
    viewportInstructionFieldProvenance(viewportProvenanceHandle, instruction),
  );
  return {
    records: [
      ...childEmissions.flatMap((emission) => emission.records),
      ...routerProductRecords(
        store,
        typedLocal,
        typedInstruction.productHandle,
        typedInstruction.identityHandle,
        KernelVocabulary.Router.TypedNavigationInstruction.key,
        ownerHandle,
        typedInstruction.sourceAddressHandle,
        typedProvenanceHandle,
        typedEvidenceHandle,
        instruction.component,
        'TypedNavigationInstruction.create normalized one static RouteExpression component segment.',
      ),
      ...routerProductRecords(
        store,
        local,
        viewportInstruction.productHandle,
        viewportInstruction.identityHandle,
        KernelVocabulary.Router.ViewportInstruction.key,
        ownerHandle,
        viewportInstruction.sourceAddressHandle,
        viewportProvenanceHandle,
        viewportEvidenceHandle,
        instruction.component,
        'ViewportInstruction.create wrapped a typed RouteExpression segment with viewport, parameter, and child shape.',
      ),
    ],
    typedNavigationInstructions: [
      ...childEmissions.flatMap((emission) => emission.typedNavigationInstructions),
      typedInstruction,
    ],
    viewportInstructions: [
      ...childEmissions.flatMap((emission) => emission.viewportInstructions),
      viewportInstruction,
    ],
    viewportInstruction,
  };
}

function routerProductRecords(
  store: KernelStore,
  local: string,
  productHandle: ProductHandle,
  identityHandle: TypedNavigationInstructionModel['identityHandle'],
  productKindKey: ProductKindKey,
  ownerHandle: RouteContextModel['identityHandle'],
  sourceAddressHandle: AddressHandle | null,
  provenanceHandle: ProvenanceHandle,
  evidenceHandle: EvidenceHandle,
  localName: string | null,
  summary: string,
): readonly KernelStoreRecord[] {
  return [
    new EvidenceRecord(
      evidenceHandle,
      EvidenceKind.SemanticObservation,
      [EvidenceRole.TransformInput, EvidenceRole.TransformOutput],
      summary,
      sourceAddressHandle,
    ),
    new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
    new RouterIdentity(
      identityHandle,
      productKindKey,
      ownerHandle,
      sourceAddressHandle,
      localName,
    ),
    new MaterializedProduct(
      productHandle,
      productKindKey,
      identityHandle,
      sourceAddressHandle,
      provenanceHandle,
    ),
    new MaterializationRecord(
      store.handles.materialization(local),
      ownerHandle,
      [productHandle],
      [],
      [],
    ),
  ];
}

type StaticStringBindingValue =
  | { readonly state: 'closed'; readonly value: string; readonly sourceAddressHandle: AddressHandle | null; readonly dynamicPartCount: number }
  | { readonly state: 'dynamic'; readonly reason: string | null }
  | { readonly state: 'missing' };

function staticStringBindingValue(
  store: KernelStore,
  hydrate: HydrateAttributeInstruction,
  property: string,
  scope: BindingScope | null = null,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null = null,
): StaticStringBindingValue {
  let sawDynamic = false;
  let dynamicReason: string | null = null;
  for (const productHandle of hydrate.bindingInstructionProductHandles) {
    const instruction = store.productDetails.read(TemplateProductDetails.Instruction, productHandle);
    if (instruction instanceof SetPropertyInstruction && instruction.targetProperty === property) {
      return {
        state: 'closed',
        value: instruction.value,
        sourceAddressHandle: instruction.sourceAddressHandle,
        dynamicPartCount: 0,
      };
    }
    if (instruction instanceof MultiAttrInstruction && instruction.target === property) {
      if (instruction.command == null && instruction.expressionProductHandle == null) {
        return {
          state: 'closed',
          value: instruction.value,
          sourceAddressHandle: instruction.sourceAddressHandle,
          dynamicPartCount: 0,
        };
      }
      const multiAttrInterpolated = interpolatedStringValue(store, instruction.expressionProductHandle, instruction.sourceAddressHandle, scope, sourceValueEvaluator);
      if (multiAttrInterpolated != null) {
        return multiAttrInterpolated;
      }
      sawDynamic = true;
      dynamicReason ??= dynamicBindingReason(store, instruction.expressionProductHandle, scope, sourceValueEvaluator);
      continue;
    }
    if (instruction instanceof PropertyBindingInstruction && instruction.targetProperty === property) {
      const propertyBound = expressionStringValue(store, instruction.expressionProductHandle, instruction.sourceAddressHandle, scope, sourceValueEvaluator);
      if (propertyBound != null) {
        return propertyBound;
      }
      sawDynamic = true;
      dynamicReason ??= dynamicBindingReason(store, instruction.expressionProductHandle, scope, sourceValueEvaluator);
      continue;
    }
    if (instruction instanceof InterpolationInstruction && instruction.target === property) {
      const interpolated = interpolatedStringValue(store, instruction.expressionProductHandles[0] ?? null, instruction.sourceAddressHandle, scope, sourceValueEvaluator);
      if (interpolated != null) {
        return interpolated;
      }
      sawDynamic = true;
      dynamicReason ??= dynamicBindingReason(store, instruction.expressionProductHandles[0] ?? null, scope, sourceValueEvaluator);
    }
  }
  return sawDynamic ? { state: 'dynamic', reason: dynamicReason } : { state: 'missing' };
}

function expressionStringValue(
  store: KernelStore,
  expressionProductHandle: ProductHandle | null,
  sourceAddressHandle: AddressHandle | null,
  scope: BindingScope | null = null,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null = null,
): StaticStringBindingValue | null {
  if (expressionProductHandle == null) {
    return null;
  }
  const parse = store.productDetails.read(TemplateProductDetails.ExpressionParse, expressionProductHandle);
  if (parse == null) {
    return null;
  }
  const expression = runtimeAcceptedBindingExpressionAstForParse(parse);
  if (expression == null) {
    return null;
  }
  switch (expression.$kind) {
    case 'PrimitiveLiteral':
      return typeof expression.value === 'string'
        ? {
            state: 'closed',
            value: expression.value,
            sourceAddressHandle,
            dynamicPartCount: 0,
          }
        : null;
    case 'Template':
      return dynamicRouteStringValue(expression.cooked, expression.expressions.length, sourceAddressHandle);
    default:
      return evaluatedStringValue(expression, scope, sourceValueEvaluator, sourceAddressHandle);
  }
}

function interpolatedStringValue(
  store: KernelStore,
  expressionProductHandle: ProductHandle | null,
  sourceAddressHandle: AddressHandle | null,
  scope: BindingScope | null = null,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null = null,
): StaticStringBindingValue | null {
  if (expressionProductHandle == null) {
    return null;
  }
  const parse = store.productDetails.read(TemplateProductDetails.ExpressionParse, expressionProductHandle);
  if (parse == null) {
    return null;
  }
  const expression = runtimeAcceptedBindingExpressionAstForParse(parse);
  if (expression?.$kind !== 'Interpolation') {
    return null;
  }
  return dynamicRouteStringValue(expression.parts, expression.expressions.length, sourceAddressHandle)
    ?? evaluatedStringValue(expression, scope, sourceValueEvaluator, sourceAddressHandle);
}

function evaluatedStringValue(
  expression: ReturnType<typeof runtimeAcceptedBindingExpressionAstForParse>,
  scope: BindingScope | null,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null,
  sourceAddressHandle: AddressHandle | null,
): StaticStringBindingValue | null {
  if (expression == null || scope == null || sourceValueEvaluator == null) {
    return null;
  }
  const evaluation = sourceValueEvaluator.evaluate(expression, scope);
  if (
    evaluation.kind === RuntimeBindingSourceValueEvaluationKind.Value
    && evaluation.value?.kind === EvaluationValueKind.String
  ) {
    return {
      state: 'closed',
      value: evaluation.value.value,
      sourceAddressHandle,
      dynamicPartCount: 0,
    };
  }
  return null;
}

function dynamicBindingReason(
  store: KernelStore,
  expressionProductHandle: ProductHandle | null,
  scope: BindingScope | null,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator | null,
): string | null {
  if (expressionProductHandle == null || scope == null || sourceValueEvaluator == null) {
    return null;
  }
  const parse = store.productDetails.read(TemplateProductDetails.ExpressionParse, expressionProductHandle);
  const expression = parse == null ? null : runtimeAcceptedBindingExpressionAstForParse(parse);
  if (expression == null) {
    return null;
  }
  const evaluation = sourceValueEvaluator.evaluate(expression, scope);
  if (evaluation.kind === RuntimeBindingSourceValueEvaluationKind.Open) {
    return evaluation.openReason;
  }
  return evaluation.value?.kind === EvaluationValueKind.String
    ? null
    : `Binding source value reduced to '${evaluation.value?.kind ?? 'unknown'}' instead of a string.`;
}

function dynamicRouteStringValue(
  parts: readonly string[],
  dynamicPartCount: number,
  sourceAddressHandle: AddressHandle | null,
): StaticStringBindingValue | null {
  if (dynamicPartCount === 0 || parts.length !== dynamicPartCount + 1 || !hasStaticRoutePrefix(parts[0] ?? '')) {
    return null;
  }
  return {
    state: 'closed',
    value: parts.map((part, index) =>
      index < dynamicPartCount ? `${part}__au_dynamic_${index}__` : part
    ).join(''),
    sourceAddressHandle,
    dynamicPartCount,
  };
}

function hasStaticRoutePrefix(prefix: string): boolean {
  return prefix
    .replace(/\.\.\//g, '')
    .replace(/\.\//g, '')
    .replace(/[/?#&=._-]/g, '')
    .trim()
    .length > 0;
}

function hrefIsExternal(
  store: KernelStore,
  site: RouterResourceInstructionSite,
  sourceValueEvaluator: RuntimeBindingSourceValueEvaluator,
): boolean {
  if (hasHostAttribute(store, site.host, 'external') || hasHostAttribute(store, site.host, 'data-external')) {
    return true;
  }
  const value = staticStringBindingValue(store, site.instruction, 'value', site.scope, sourceValueEvaluator);
  if (value.state !== 'closed') {
    return false;
  }
  const trimmed = value.value.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (trimmed.startsWith('//')) {
    return true;
  }
  if (/^[a-z][a-z0-9+\-.]*:\/\//i.test(trimmed)) {
    return true;
  }
  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
}

function htmlElementForInstruction(
  store: KernelStore,
  instruction: HydrateAttributeInstruction,
): HtmlElement | null {
  const productHandle = instruction.node.productHandle;
  if (productHandle == null) {
    return null;
  }
  const node = store.productDetails.read(TemplateProductDetails.HtmlNode, productHandle);
  return node instanceof HtmlElement ? node : null;
}

function hasHostAttribute(
  store: KernelStore,
  host: HtmlElement | null,
  attributeName: string,
): boolean {
  if (host == null) {
    return false;
  }
  return host.attributes.some((attributeReference) => {
    const attribute = attributeReference.productHandle == null
      ? null
      : store.productDetails.read(TemplateProductDetails.HtmlAttribute, attributeReference.productHandle);
    return attribute instanceof HtmlAttribute
      && attribute.rawName.toLowerCase() === attributeName;
  });
}

function recordOpenSeam(
  store: KernelStore,
  site: RouterResourceInstructionSite,
  summary: string,
  openSeams: OpenSeam[],
  records: KernelStoreRecord[],
): void {
  const routeContextIdentity = site.routeContext?.identityHandle ?? 'unowned-route-context';
  const local = `router-instruction-open:${routeContextIdentity}:${site.kind}:${site.controller.productHandle}:${encodeLocal(summary)}`;
  const evidenceHandle = store.handles.evidence(local);
  const openSeam = new OpenSeam(
    store.handles.openSeam(local),
    KernelVocabulary.Router.OpenInstruction.key,
    summary,
    site.sourceAddressHandle,
    evidenceHandle,
  );
  openSeams.push(openSeam);
  records.push(
    new EvidenceRecord(
      evidenceHandle,
      EvidenceKind.SemanticObservation,
      [EvidenceRole.TransformInput],
      summary,
      site.sourceAddressHandle,
    ),
    openSeam,
    new MaterializationRecord(
      store.handles.materialization(local),
      site.controller.identityHandle,
      [],
      [],
      [openSeam.handle],
    ),
  );
}

function typedInstructionFieldProvenance(
  provenanceHandle: ProvenanceHandle,
): readonly FieldProvenance<RouterInstructionField>[] {
  return compactFieldProvenance<RouterInstructionField>([
    new FieldProvenance('instructionKind', provenanceHandle),
    new FieldProvenance('value', provenanceHandle),
    new FieldProvenance('source', provenanceHandle),
  ]);
}

function viewportInstructionFieldProvenance(
  provenanceHandle: ProvenanceHandle,
  instruction: ParsedViewportInstruction,
): readonly FieldProvenance<RouterInstructionField>[] {
  return compactFieldProvenance<RouterInstructionField>([
    new FieldProvenance('component', provenanceHandle),
    instruction.viewport == null ? null : new FieldProvenance('viewport', provenanceHandle),
    instruction.parameterCount === 0 ? null : new FieldProvenance('parameterCount', provenanceHandle),
    instruction.children.length === 0 ? null : new FieldProvenance('children', provenanceHandle),
    instruction.open === 0 ? null : new FieldProvenance('open', provenanceHandle),
    instruction.close === 0 ? null : new FieldProvenance('close', provenanceHandle),
    new FieldProvenance('source', provenanceHandle),
  ]);
}

function viewportInstructionTreeFieldProvenance(
  provenanceHandle: ProvenanceHandle,
  hasOptions: boolean,
): readonly FieldProvenance<RouterInstructionField>[] {
  return compactFieldProvenance<RouterInstructionField>([
    new FieldProvenance('routeContext', provenanceHandle),
    new FieldProvenance('children', provenanceHandle),
    hasOptions ? new FieldProvenance('options', provenanceHandle) : null,
    new FieldProvenance('isAbsolute', provenanceHandle),
    new FieldProvenance('queryParamCount', provenanceHandle),
    new FieldProvenance('fragment', provenanceHandle),
    new FieldProvenance('source', provenanceHandle),
  ]);
}

function encodeLocal(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (ch) =>
    `%${ch.charCodeAt(0).toString(16).toUpperCase()}`
  );
}
