import {
  appBuilderCustomElementPairSourcePlan,
  appBuilderRootCustomElementPairSourcePlan,
} from '../custom-element-pair-source-plan.js';
import { AppBuilderRouterAdmissionPolicy } from '../aurelia-lowering-option.js';
import {
  appBuilderLocalViewModelStateSourcePlan,
  AppBuilderLocalViewModelFieldObjectStateSourceKind,
  type AppBuilderLocalViewModelFieldObjectStateSourceModel,
} from '../local-view-model-state-source.js';
import {
  APP_BUILDER_SERVICE_COLLECTION_FILTER_PREDICATE_KINDS,
  appBuilderServiceCollectionFileArtifact,
  AppBuilderServiceCollectionFilterPredicateKind,
  type AppBuilderServiceCollectionCreateMethodSourceModel,
  type AppBuilderServiceCollectionFilterMethodSourceModel,
  type AppBuilderServiceCollectionUpdateMethodSourceModel,
} from '../service-boundary-source.js';
import {
  aureliaConfigurationAdmissionSourceSet,
  aureliaRouterConfigurationAdmissionSource,
  type AureliaConfigurationAdmissionSourceSet,
} from '../../source-plan/aurelia-configuration-admission-source.js';
import {
  appBuilderDomainFieldSourceModels,
  type AppBuilderDomainFieldValueSetSelection,
} from '../domain-field-source.js';
import {
  AppBuilderDomainActionScope,
  AppBuilderDomainIdentityValueKind,
  type AppBuilderDomainActionDescriptor,
  type AppBuilderDomainFieldDescriptor,
} from '../domain-model.js';
import { moduleSpecifier } from '../../application/module-specifier.js';
import { normalizedSourceInputText } from '../../source-plan/source-template.js';
import {
  appBuilderIsTypeScriptIdentifier,
  appBuilderKebabCase,
  appBuilderLowerCamelCase,
  appBuilderPascalCase,
} from '../source-lowering-helpers.js';
import { uniqueValues } from '../../collections.js';
import {
  AppBuilderPartSourceFragmentKind,
  type AppBuilderPartSourceFragment,
} from '../part-source-invocation.js';
import type { SourcePlanFileArtifact } from '../../source-plan/source-plan.js';
import { appBuilderUniqueEffectContractIds } from './effect.js';
import type { AppBuilderSuppliedInput } from './input-readiness.js';
import { AppBuilderApplicationPatternId } from './application-pattern.js';
import {
  appBuilderOntologyRowRef,
  AppBuilderOntologyRowKind,
} from './relation.js';
import { appBuilderUniqueOntologyRowRefs } from './row-descriptor.js';
import {
  appBuilderEntityMutationFieldNamesForDomainActions,
  appBuilderSourceLoweringDomainEntityPayloads,
  appBuilderSourceLoweringDomainFieldPayloads,
  appBuilderSourceLoweringDomainRelationshipPayloads,
  appBuilderSourceLoweringSeedRecordsForEntity,
  appBuilderSourceLoweringRoutingPolicyPayloads,
  type AppBuilderSourceLoweringDomainEntityPayload,
} from './source-lowering-inputs.js';
import { appBuilderSourceLoweringComposition } from './source-lowering-composition.js';
import type { AppBuilderSourceLoweringComposition } from './source-lowering-composition-contracts.js';
import type { AppBuilderSourceLoweringEmissionContext } from './source-lowering-context.js';
import {
  appBuilderSourceLoweringInvocation,
  type AppBuilderSourceLoweringInvocation,
} from './source-lowering-invocation.js';
import {
  appBuilderExpectedSemanticEffectKinds,
  appBuilderExpectedSemanticEffectPreviews,
} from './semantic-effect-witness.js';
import {
  appBuilderEffectContractIdsForTargetRef,
} from './effect-target.js';
import {
  appBuilderComponentPairAppShellExpectedEffects,
  type AppBuilderDomainBackedReadinessExpectedEffectsOptions,
} from '../source-plan-expected-effects.js';
import {
  appBuilderExpectedEffectsForSourcePlan,
  directConventionCarrierIssues,
  directCustomElementSourceLayoutIssues,
  lowerLocalViewModelStateSourcePlan,
  selectDirectSourcePlanAppName,
  selectDirectSourcePlanClassName,
  selectDirectSourcePlanConventionPolicy,
  selectDirectSourcePlanResourceCarrier,
} from './source-lowering-source-plan-direct.js';
import {
  classMemberFragmentIssues,
  sourceLoweringCompositionIssues,
  sourceLoweringInvocationIssues,
  templateFragmentIssues,
  typeScriptTopLevelFragmentIssues,
} from './source-lowering-source-plan-issue-helpers.js';
import {
  AppBuilderSourceLoweringSourcePlanIssueKind,
  type AppBuilderSourceLoweringComponentPair,
  type AppBuilderSourceLoweringComponentPairRequest,
  type AppBuilderSourceLoweringSourcePlanIssue,
} from './source-lowering-source-plan-contracts.js';

const SERVICE_BACKED_LOAD_SAVE_TARGET_REF = appBuilderOntologyRowRef(
  AppBuilderOntologyRowKind.ApplicationPattern,
  AppBuilderApplicationPatternId.ServiceBackedLoadSave,
);

export function lowerComponentPairSourcePlan(
  request: AppBuilderSourceLoweringComponentPairRequest,
  rootDir: string | null,
  templatePath: string | null,
  componentPath: string | null,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  emissionContext: AppBuilderSourceLoweringEmissionContext,
): AppBuilderSourceLoweringComponentPair {
  const direct = componentPairDirectSelection(request, suppliedInputs);
  const nested = lowerComponentPairNestedSources(request, suppliedInputs, emissionContext);
  const localState = lowerComponentPairLocalState(request, rootDir, componentPath, nested);
  const serviceSupport = lowerComponentPairServiceSupport(request, suppliedInputs, componentPath);
  const fragments = componentPairFragments(nested, localState, serviceSupport);
  const issues = componentPairIssues(request, suppliedInputs, direct, nested, localState, serviceSupport, fragments);
  const sourcePlan = componentPairSourcePlan(rootDir, templatePath, componentPath, direct, serviceSupport, fragments, issues);
  const expectedEffects = direct.appShellRequest == null
    ? []
    : appBuilderExpectedEffectsForSourcePlan(
        sourcePlan,
        () => appBuilderComponentPairAppShellExpectedEffects({
          includesServiceCollection: serviceSupport.supportFileArtifacts.length > 0,
          domainBackedReadinessStates: componentPairDomainBackedReadinessExpectedEffects(localState),
        }),
      );
  const aggregates = componentPairAggregates(nested, localState, serviceSupport);
  return {
    componentPath,
    templatePath,
    className: direct.className.value,
    resourceName: direct.resourceName,
    resourceCarrier: direct.resourceCarrier.value,
    conventionPolicy: direct.conventionPolicy.value,
    appShell: direct.appShellRequest == null
      ? null
      : {
          appName: direct.appName.value,
          entrypointPath: direct.appShellEntrypointPath,
        },
    sourceLoweringComposition: nested.sourceLoweringComposition,
    sourceLoweringTemplateInvocations: nested.sourceLoweringTemplateInvocations,
    sourceLoweringLocalViewModelState: localState.sourceLoweringLocalViewModelState,
    sourceLoweringClassMemberInvocations: nested.sourceLoweringClassMemberInvocations,
    sourceLoweringTargetRefs: aggregates.sourceLoweringTargetRefs,
    effectContractIds: aggregates.effectContractIds,
    expectedEffectKinds: appBuilderExpectedSemanticEffectKinds(expectedEffects),
    expectedEffects: appBuilderExpectedSemanticEffectPreviews(expectedEffects),
    controlUseInventoryRows: aggregates.controlUseInventoryRows,
    sourcePlan,
    issues,
  };
}

function componentPairDomainBackedReadinessExpectedEffects(
  localState: ComponentPairLocalStateFrame,
): readonly AppBuilderDomainBackedReadinessExpectedEffectsOptions[] {
  return localState.sourceLoweringLocalViewModelState?.fieldObjectStates
    .filter((state) =>
      state.sourceKind === AppBuilderLocalViewModelFieldObjectStateSourceKind.DomainValueObjectClass
      && state.readiness != null
      && state.readiness.requiredFieldNames.length > 0)
    .map((state) => ({
      className: state.typeName,
      receiverMemberName: state.memberName,
      readinessMemberName: state.readiness!.memberName,
      requiredFieldNames: state.readiness!.requiredFieldNames,
    })) ?? [];
}

type ComponentPairDirectSelection = {
  readonly appShellRequest: AppBuilderSourceLoweringComponentPairRequest['appShell'] | null;
  readonly appShellEntrypointPath: string;
  readonly appName: ReturnType<typeof selectDirectSourcePlanAppName>;
  readonly className: ReturnType<typeof selectDirectSourcePlanClassName>;
  readonly resourceCarrier: ReturnType<typeof selectDirectSourcePlanResourceCarrier>;
  readonly conventionPolicy: ReturnType<typeof selectDirectSourcePlanConventionPolicy>;
  readonly resourceName: string | null;
  readonly configurationAdmission: AureliaConfigurationAdmissionSourceSet | null;
};

type ComponentPairNestedSources = {
  readonly sourceLoweringComposition: AppBuilderSourceLoweringComposition | null;
  readonly sourceLoweringTemplateInvocations: readonly AppBuilderSourceLoweringInvocation[];
  readonly sourceLoweringClassMemberInvocations: readonly AppBuilderSourceLoweringInvocation[];
  readonly localViewModelStateSuppliedInputs: readonly AppBuilderSuppliedInput[];
};

type ComponentPairLocalStateFrame = {
  readonly sourceLoweringLocalViewModelState: ReturnType<typeof lowerLocalViewModelStateSourcePlan> | null;
};

type ComponentPairServiceSupportFrame = {
  readonly supportFileArtifacts: readonly SourcePlanFileArtifact[];
  readonly classMemberFragments: readonly AppBuilderPartSourceFragment[];
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
};

type ComponentPairServiceCollectionRequest =
  NonNullable<AppBuilderSourceLoweringComponentPairRequest['serviceCollections']>[number];

type ComponentPairClassMemberInvocationRequest =
  NonNullable<AppBuilderSourceLoweringComponentPairRequest['sourceLoweringClassMemberInvocations']>[number];

type ComponentPairServiceCollectionFilterMethodRequest =
  NonNullable<ComponentPairServiceCollectionRequest['filterMethods']>[number];

type ComponentPairServiceCollectionCreateMethodRequest =
  NonNullable<ComponentPairServiceCollectionRequest['createMethods']>[number];

type ComponentPairServiceCollectionUpdateMethodRequest =
  NonNullable<ComponentPairServiceCollectionRequest['updateMethods']>[number];

type ComponentPairServiceQueryStateRequest =
  NonNullable<ComponentPairServiceCollectionRequest['queryStates']>[number];

interface ComponentPairServiceQueryStateSource {
  /** Component member that stores the active query value. */
  readonly stateMemberName: string;
  /** Exact TypeScript type text emitted for the query-state member. */
  readonly stateTypeText: string;
  /** Exact initializer expression emitted for the inactive query state. */
  readonly initialValueExpression: string;
  /** Exact expression compared against the query value to select the unfiltered load method. */
  readonly inactiveValueExpression: string;
  /** Component method that refreshes the result member through the active query. */
  readonly reloadMethodName: string;
  /** Promise-valued component member assigned by the reload method. */
  readonly resultMemberName: string;
  /** Service filter method called when the query state is active. */
  readonly filterMethodName: string;
}

type ComponentPairFragments = {
  readonly typeScriptTopLevelFragments: readonly AppBuilderPartSourceFragment[];
  readonly classMemberFragments: readonly AppBuilderPartSourceFragment[];
  readonly templateFileTextFragments: readonly AppBuilderPartSourceFragment[];
  readonly templateContributionFragments: readonly AppBuilderPartSourceFragment[];
};

type ComponentPairSourcePlan =
  | ReturnType<typeof appBuilderCustomElementPairSourcePlan>
  | ReturnType<typeof appBuilderRootCustomElementPairSourcePlan>
  | null;

function componentPairDirectSelection(
  request: AppBuilderSourceLoweringComponentPairRequest,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): ComponentPairDirectSelection {
  const appShellRequest = request.appShell ?? null;
  const className = selectDirectSourcePlanClassName(null, suppliedInputs);
  return {
    appShellRequest,
    appShellEntrypointPath: normalizedSourceInputText(appShellRequest?.entrypointPath) ?? 'src/main.ts',
    appName: appShellRequest == null
      ? { value: null, issues: [] as readonly AppBuilderSourceLoweringSourcePlanIssue[] }
      : selectDirectSourcePlanAppName(null, suppliedInputs),
    className,
    resourceCarrier: selectDirectSourcePlanResourceCarrier(null, suppliedInputs),
    conventionPolicy: selectDirectSourcePlanConventionPolicy(null, suppliedInputs),
    resourceName: className.value == null ? null : appBuilderKebabCase(className.value),
    configurationAdmission: componentPairConfigurationAdmission(suppliedInputs),
  };
}

function lowerComponentPairNestedSources(
  request: AppBuilderSourceLoweringComponentPairRequest,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  emissionContext: AppBuilderSourceLoweringEmissionContext,
): ComponentPairNestedSources {
  return {
    sourceLoweringComposition: request.sourceLoweringComposition == null
      ? null
      : appBuilderSourceLoweringComposition({
          ...request.sourceLoweringComposition,
          suppliedInputs: componentPairNestedSuppliedInputs(suppliedInputs, request.sourceLoweringComposition.suppliedInputs ?? []),
          emissionContext: request.sourceLoweringComposition.emissionContext ?? emissionContext,
        }),
    sourceLoweringTemplateInvocations: (request.sourceLoweringTemplateInvocations ?? []).map((invocation) =>
      appBuilderSourceLoweringInvocation({
        ...invocation,
        suppliedInputs: componentPairNestedSuppliedInputs(suppliedInputs, invocation.suppliedInputs ?? []),
        emissionContext: invocation.emissionContext ?? emissionContext,
      })),
    sourceLoweringClassMemberInvocations: (request.sourceLoweringClassMemberInvocations ?? []).map((invocation) =>
      appBuilderSourceLoweringInvocation({
        ...invocation,
        suppliedInputs: componentPairNestedSuppliedInputs(suppliedInputs, invocation.suppliedInputs ?? []),
        emissionContext: invocation.emissionContext ?? emissionContext,
      })),
    localViewModelStateSuppliedInputs: request.sourceLoweringLocalViewModelState == null
      ? []
      : componentPairNestedSuppliedInputs(suppliedInputs, request.sourceLoweringLocalViewModelState.suppliedInputs ?? []),
  };
}

function lowerComponentPairLocalState(
  request: AppBuilderSourceLoweringComponentPairRequest,
  rootDir: string | null,
  componentPath: string | null,
  nested: ComponentPairNestedSources,
): ComponentPairLocalStateFrame {
  if (request.sourceLoweringLocalViewModelState == null) {
    return { sourceLoweringLocalViewModelState: null };
  }
  const collectionMutableFieldNames = componentPairLocalCollectionMutableFieldNames(
    nested.sourceLoweringClassMemberInvocations,
    nested.localViewModelStateSuppliedInputs,
  );
  const localViewModelStateFieldNames = componentPairLocalViewModelStateFieldNames(
    nested.sourceLoweringComposition,
    [
      ...nested.sourceLoweringTemplateInvocations,
      ...nested.sourceLoweringClassMemberInvocations,
    ],
    nested.localViewModelStateSuppliedInputs,
    componentPairLocalViewModelFieldObjectFieldNames(
      request.sourceLoweringComposition ?? null,
      nested.sourceLoweringComposition,
    ),
  );
  const localFieldObjectStates = componentPairLocalViewModelFieldObjectStates(
    request.sourceLoweringComposition ?? null,
    nested.sourceLoweringComposition,
  );
  const fieldValueSetSelections = componentPairLocalFieldValueSetSelections(nested.sourceLoweringComposition);
  return {
    sourceLoweringLocalViewModelState: lowerLocalViewModelStateSourcePlan(
      request.sourceLoweringLocalViewModelState,
      rootDir,
      componentPath,
      nested.localViewModelStateSuppliedInputs,
      localViewModelStateFieldNames,
      collectionMutableFieldNames,
      fieldValueSetSelections,
      localFieldObjectStates,
    ),
  };
}

function lowerComponentPairServiceSupport(
  request: AppBuilderSourceLoweringComponentPairRequest,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  componentPath: string | null,
): ComponentPairServiceSupportFrame {
  const serviceCollections = request.serviceCollections ?? [];
  const supportFileArtifacts: SourcePlanFileArtifact[] = [];
  const classMemberFragments: AppBuilderPartSourceFragment[] = [];
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  for (const serviceCollection of serviceCollections) {
    const frame = lowerComponentPairServiceCollection(
      serviceCollection,
      suppliedInputs,
      componentPath,
      request.sourceLoweringClassMemberInvocations ?? [],
    );
    supportFileArtifacts.push(...frame.supportFileArtifacts);
    classMemberFragments.push(...frame.classMemberFragments);
    issues.push(...frame.issues);
  }
  return {
    supportFileArtifacts,
    classMemberFragments,
    issues,
  };
}

function lowerComponentPairServiceCollection(
  serviceCollection: ComponentPairServiceCollectionRequest,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  componentPath: string | null,
  classMemberInvocationRequests: readonly ComponentPairClassMemberInvocationRequest[],
): ComponentPairServiceSupportFrame {
  const sourceTargetPath = normalizedSourceInputText(serviceCollection.sourceTargetPath);
  const serviceClassName = normalizedSourceInputText(serviceCollection.serviceClassName);
  const loadMethodName = normalizedSourceInputText(serviceCollection.loadMethodName);
  const selectedEntity = selectComponentPairServiceCollectionEntity(
    appBuilderSourceLoweringDomainEntityPayloads(suppliedInputs),
    normalizedSourceInputText(serviceCollection.collectionEntityName),
  );
  const recordTypeName = normalizedSourceInputText(serviceCollection.recordTypeName)
    ?? (selectedEntity.value == null ? null : `${componentPairDomainEntityPayloadName(selectedEntity.value)}Record`);
  const componentMemberName = normalizedSourceInputText(serviceCollection.componentMemberName)
    ?? (serviceClassName == null ? null : appBuilderLowerCamelCase(serviceClassName));
  const collectionMemberName = selectedEntity.value == null
    ? null
    : normalizedSourceInputText(selectedEntity.value.collectionMemberName)
      ?? `${appBuilderLowerCamelCase(componentPairDomainEntityPayloadName(selectedEntity.value))}s`;
  const fields = appBuilderSourceLoweringDomainFieldPayloads(suppliedInputs);
  const filterMethods = selectedEntity.value == null
    ? { value: [] as readonly AppBuilderServiceCollectionFilterMethodSourceModel[], issues: [] as readonly AppBuilderSourceLoweringSourcePlanIssue[] }
    : selectComponentPairServiceCollectionFilterMethods(
        serviceCollection.filterMethods ?? [],
        componentPairDomainEntityPayloadName(selectedEntity.value),
        fields,
        serviceClassName,
      );
  const createMethods = selectedEntity.value == null
    ? { value: [] as readonly AppBuilderServiceCollectionCreateMethodSourceModel[], issues: [] as readonly AppBuilderSourceLoweringSourcePlanIssue[] }
    : selectComponentPairServiceCollectionCreateMethods(
        serviceCollection.createMethods ?? [],
        componentPairDomainEntityPayloadName(selectedEntity.value),
        selectedEntity.value.identityValueKind ?? AppBuilderDomainIdentityValueKind.Number,
        fields,
        serviceClassName,
      );
  const updateMethods = selectedEntity.value == null
    ? { value: [] as readonly AppBuilderServiceCollectionUpdateMethodSourceModel[], issues: [] as readonly AppBuilderSourceLoweringSourcePlanIssue[] }
    : selectComponentPairServiceCollectionUpdateMethods(
        serviceCollection.updateMethods ?? [],
        componentPairDomainEntityPayloadName(selectedEntity.value),
        fields,
        serviceClassName,
      );
  const queryStates = selectComponentPairServiceQueryStates(
    serviceCollection.queryStates ?? [],
    filterMethods.value,
    serviceClassName,
  );
  const serviceIssues = [
    ...(sourceTargetPath == null
      ? [componentPairServiceCollectionIssue(
          AppBuilderSourceLoweringSourcePlanIssueKind.MissingComponentPairServiceCollectionPath,
          'Component-pair service collection lowering needs an explicit sourceTargetPath for the generated service file.',
        )]
      : []),
    ...(componentPath == null
      ? [componentPairServiceCollectionIssue(
          AppBuilderSourceLoweringSourcePlanIssueKind.MissingSourceTargetPath,
          'Component-pair service collection lowering needs the component TypeScript sourceTargetPath so its service import can be placed truthfully.',
        )]
      : []),
    ...(serviceClassName == null || !appBuilderIsTypeScriptIdentifier(serviceClassName)
      ? [componentPairServiceCollectionIssue(
          AppBuilderSourceLoweringSourcePlanIssueKind.InvalidComponentPairServiceCollectionClassName,
          'Component-pair service collection lowering needs a TypeScript identifier serviceClassName.',
          { serviceClassName },
        )]
      : []),
    ...(componentMemberName == null || !appBuilderIsTypeScriptIdentifier(componentMemberName)
      ? [componentPairServiceCollectionIssue(
          AppBuilderSourceLoweringSourcePlanIssueKind.InvalidComponentPairServiceCollectionMemberName,
          'Component-pair service collection lowering needs a TypeScript identifier componentMemberName or a derivable serviceClassName.',
          { serviceClassName },
        )]
      : []),
    ...(selectedEntity.value != null && (collectionMemberName == null || !appBuilderIsTypeScriptIdentifier(collectionMemberName))
      ? [componentPairServiceCollectionIssue(
          AppBuilderSourceLoweringSourcePlanIssueKind.InvalidComponentPairServiceCollectionMemberName,
          'Component-pair service collection lowering needs a TypeScript identifier collectionMemberName from the selected domain entity or derivation.',
          { serviceClassName },
        )]
      : []),
    ...(recordTypeName == null || !appBuilderIsTypeScriptIdentifier(recordTypeName)
      ? [componentPairServiceCollectionIssue(
          AppBuilderSourceLoweringSourcePlanIssueKind.InvalidComponentPairServiceCollectionRecordTypeName,
          'Component-pair service collection lowering needs a TypeScript identifier recordTypeName or a selectable domain entity.',
          { serviceClassName },
        )]
      : []),
    ...(loadMethodName == null || !appBuilderIsTypeScriptIdentifier(loadMethodName)
      ? [componentPairServiceCollectionIssue(
          AppBuilderSourceLoweringSourcePlanIssueKind.InvalidComponentPairServiceCollectionLoadMethodName,
          'Component-pair service collection lowering needs a TypeScript identifier loadMethodName.',
          { serviceClassName },
        )]
      : []),
    ...selectedEntity.issues,
    ...filterMethods.issues,
    ...createMethods.issues,
    ...updateMethods.issues,
    ...queryStates.issues,
  ] satisfies readonly AppBuilderSourceLoweringSourcePlanIssue[];
  if (
    serviceIssues.length > 0
    || sourceTargetPath == null
    || componentPath == null
    || serviceClassName == null
    || componentMemberName == null
    || recordTypeName == null
    || loadMethodName == null
    || collectionMemberName == null
    || selectedEntity.value == null
  ) {
    return {
      supportFileArtifacts: [],
      classMemberFragments: [],
      issues: serviceIssues,
    };
  }
  return {
    supportFileArtifacts: [
      appBuilderServiceCollectionFileArtifact(sourceTargetPath, {
        serviceClassName,
        recordTypeName,
        loadMethodName,
        entityTypeName: componentPairDomainEntityPayloadName(selectedEntity.value),
        collectionMemberName,
        identityMemberName: selectedEntity.value.identityMemberName ?? 'id',
        identityValueKind: selectedEntity.value.identityValueKind ?? AppBuilderDomainIdentityValueKind.Number,
        fields,
        seedRecords: appBuilderSourceLoweringSeedRecordsForEntity(
          suppliedInputs,
          componentPairDomainEntityPayloadName(selectedEntity.value),
        ),
        filterMethods: filterMethods.value,
        createMethods: createMethods.value,
        updateMethods: updateMethods.value,
      }),
    ],
    classMemberFragments: [
      {
        kind: AppBuilderPartSourceFragmentKind.TypeScriptClassMember,
        text: `private readonly ${componentMemberName} = resolve(${serviceClassName});`,
        requiredImports: [{
          moduleSpecifier: 'aurelia',
          namedImports: ['resolve'],
        }, {
          moduleSpecifier: moduleSpecifier(componentPath, sourceTargetPath, false),
          namedImports: [serviceClassName],
          ...(componentPairClassMemberInvocationsUseType(classMemberInvocationRequests, recordTypeName)
            ? { namedTypeImports: [recordTypeName] }
            : {}),
        }],
      },
      ...queryStates.value.flatMap((queryState) => componentPairServiceQueryStateClassMemberFragments({
        queryState,
        componentMemberName,
        loadMethodName,
      })),
    ],
    issues: [],
  };
}

function componentPairServiceQueryStateClassMemberFragments(
  input: {
    readonly queryState: ComponentPairServiceQueryStateSource;
    readonly componentMemberName: string;
    readonly loadMethodName: string;
  },
): readonly AppBuilderPartSourceFragment[] {
  return [
    {
      kind: AppBuilderPartSourceFragmentKind.TypeScriptClassMember,
      text: `${input.queryState.stateMemberName}: ${input.queryState.stateTypeText} = ${input.queryState.initialValueExpression};`,
      requiredImports: [],
    },
    {
      kind: AppBuilderPartSourceFragmentKind.TypeScriptClassMember,
      text: componentPairServiceQueryReloadMethodSource(input),
      requiredImports: [],
    },
  ];
}

function componentPairServiceQueryReloadMethodSource(
  input: {
    readonly queryState: ComponentPairServiceQueryStateSource;
    readonly componentMemberName: string;
    readonly loadMethodName: string;
  },
): string {
  const { queryState, componentMemberName, loadMethodName } = input;
  return `${queryState.reloadMethodName}() {
  const queryValue = this.${queryState.stateMemberName};
  this.${queryState.resultMemberName} = queryValue === ${queryState.inactiveValueExpression}
    ? this.${componentMemberName}.${loadMethodName}()
    : this.${componentMemberName}.${queryState.filterMethodName}(queryValue);
  return this.${queryState.resultMemberName};
}`;
}

function componentPairClassMemberInvocationsUseType(
  classMemberInvocationRequests: readonly ComponentPairClassMemberInvocationRequest[],
  typeName: string,
): boolean {
  return classMemberInvocationRequests.some((invocationRequest) =>
    (invocationRequest.methodParameters ?? []).some((parameter) =>
      normalizedSourceInputText(parameter.typeText) === typeName
    )
  );
}

function selectComponentPairServiceQueryStates(
  queryStateRequests: readonly ComponentPairServiceQueryStateRequest[],
  filterMethods: readonly AppBuilderServiceCollectionFilterMethodSourceModel[],
  serviceClassName: string | null,
): {
  readonly value: readonly ComponentPairServiceQueryStateSource[];
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  const queryStates: ComponentPairServiceQueryStateSource[] = [];
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  const filterMethodNames = new Set(filterMethods.map((filterMethod) => filterMethod.methodName));
  for (const queryStateRequest of queryStateRequests) {
    const stateMemberName = normalizedSourceInputText(queryStateRequest.stateMemberName);
    const stateTypeText = normalizedSourceInputText(queryStateRequest.stateTypeText);
    const initialValueExpression = normalizedSourceInputText(queryStateRequest.initialValueExpression);
    const inactiveValueExpression = normalizedSourceInputText(queryStateRequest.inactiveValueExpression);
    const reloadMethodName = normalizedSourceInputText(queryStateRequest.reloadMethodName);
    const resultMemberName = normalizedSourceInputText(queryStateRequest.resultMemberName);
    const filterMethodName = normalizedSourceInputText(queryStateRequest.filterMethodName);
    if (
      stateMemberName == null
      || !appBuilderIsTypeScriptIdentifier(stateMemberName)
      || stateTypeText == null
      || initialValueExpression == null
      || inactiveValueExpression == null
      || reloadMethodName == null
      || !appBuilderIsTypeScriptIdentifier(reloadMethodName)
      || resultMemberName == null
      || !appBuilderIsTypeScriptIdentifier(resultMemberName)
      || filterMethodName == null
      || !appBuilderIsTypeScriptIdentifier(filterMethodName)
      || !filterMethodNames.has(filterMethodName)
    ) {
      issues.push(componentPairServiceCollectionIssue(
        AppBuilderSourceLoweringSourcePlanIssueKind.InvalidComponentPairServiceCollectionQueryState,
        `Service collection '${serviceClassName ?? ''}' query state needs identifier-safe stateMemberName, reloadMethodName, resultMemberName, a known filterMethodName, and explicit type/initializer/inactive expressions.`,
        { serviceClassName },
      ));
      continue;
    }
    queryStates.push({
      stateMemberName,
      stateTypeText,
      initialValueExpression,
      inactiveValueExpression,
      reloadMethodName,
      resultMemberName,
      filterMethodName,
    });
  }
  return {
    value: queryStates,
    issues,
  };
}

function selectComponentPairServiceCollectionUpdateMethods(
  updateMethodRequests: readonly ComponentPairServiceCollectionUpdateMethodRequest[],
  entityTypeName: string,
  fields: readonly AppBuilderDomainFieldDescriptor[],
  serviceClassName: string | null,
): {
  readonly value: readonly AppBuilderServiceCollectionUpdateMethodSourceModel[];
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  const fieldModels = appBuilderDomainFieldSourceModels(fields, {
    entityTypeName,
    valueSets: [],
  });
  const updateMethods: AppBuilderServiceCollectionUpdateMethodSourceModel[] = [];
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  for (const updateMethodRequest of updateMethodRequests) {
    const methodName = normalizedSourceInputText(updateMethodRequest.methodName);
    const inputFieldNames = updateMethodRequest.inputFieldNames ?? [];
    const unknownFieldNames = inputFieldNames.filter((fieldName) =>
      fieldModels.every((field) => field.memberName !== fieldName));
    if (methodName == null || !appBuilderIsTypeScriptIdentifier(methodName)) {
      issues.push(componentPairServiceCollectionIssue(
        AppBuilderSourceLoweringSourcePlanIssueKind.InvalidComponentPairServiceCollectionUpdateMethod,
        `Service collection '${serviceClassName ?? ''}' update method needs a TypeScript identifier methodName.`,
        { serviceClassName, fieldNames: inputFieldNames },
      ));
      continue;
    }
    if (inputFieldNames.length === 0) {
      issues.push(componentPairServiceCollectionIssue(
        AppBuilderSourceLoweringSourcePlanIssueKind.InvalidComponentPairServiceCollectionUpdateMethod,
        `Service collection update method '${methodName}' needs at least one explicit input field so app-builder does not invent update payload shape.`,
        { serviceClassName },
      ));
      continue;
    }
    if (unknownFieldNames.length > 0) {
      issues.push(componentPairServiceCollectionIssue(
        AppBuilderSourceLoweringSourcePlanIssueKind.InvalidComponentPairServiceCollectionUpdateMethod,
        `Service collection update method '${methodName}' references unknown input fields: ${unknownFieldNames.join(', ')}.`,
        { serviceClassName, fieldNames: unknownFieldNames },
      ));
      continue;
    }
    updateMethods.push({
      methodName,
      inputFieldNames,
    });
  }
  return {
    value: updateMethods,
    issues,
  };
}

function selectComponentPairServiceCollectionCreateMethods(
  createMethodRequests: readonly ComponentPairServiceCollectionCreateMethodRequest[],
  entityTypeName: string,
  identityValueKind: AppBuilderDomainIdentityValueKind,
  fields: readonly AppBuilderDomainFieldDescriptor[],
  serviceClassName: string | null,
): {
  readonly value: readonly AppBuilderServiceCollectionCreateMethodSourceModel[];
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  const fieldModels = appBuilderDomainFieldSourceModels(fields, {
    entityTypeName,
    valueSets: [],
  });
  const createMethods: AppBuilderServiceCollectionCreateMethodSourceModel[] = [];
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  for (const createMethodRequest of createMethodRequests) {
    const methodName = normalizedSourceInputText(createMethodRequest.methodName);
    const inputFieldNames = createMethodRequest.inputFieldNames ?? [];
    const unknownFieldNames = inputFieldNames.filter((fieldName) =>
      fieldModels.every((field) => field.memberName !== fieldName));
    if (methodName == null || !appBuilderIsTypeScriptIdentifier(methodName)) {
      issues.push(componentPairServiceCollectionIssue(
        AppBuilderSourceLoweringSourcePlanIssueKind.InvalidComponentPairServiceCollectionCreateMethod,
        `Service collection '${serviceClassName ?? ''}' create method needs a TypeScript identifier methodName.`,
        { serviceClassName, fieldNames: inputFieldNames },
      ));
      continue;
    }
    if (identityValueKind !== AppBuilderDomainIdentityValueKind.Number) {
      issues.push(componentPairServiceCollectionIssue(
        AppBuilderSourceLoweringSourcePlanIssueKind.InvalidComponentPairServiceCollectionCreateMethod,
        `Service collection create method '${methodName}' currently needs numeric identity so app-builder can derive nextId without inventing identity policy.`,
        { serviceClassName, fieldNames: inputFieldNames },
      ));
      continue;
    }
    if (unknownFieldNames.length > 0) {
      issues.push(componentPairServiceCollectionIssue(
        AppBuilderSourceLoweringSourcePlanIssueKind.InvalidComponentPairServiceCollectionCreateMethod,
        `Service collection create method '${methodName}' references unknown input fields: ${unknownFieldNames.join(', ')}.`,
        { serviceClassName, fieldNames: unknownFieldNames },
      ));
      continue;
    }
    createMethods.push({
      methodName,
      inputFieldNames,
    });
  }
  return {
    value: createMethods,
    issues,
  };
}

function selectComponentPairServiceCollectionFilterMethods(
  filterMethodRequests: readonly ComponentPairServiceCollectionFilterMethodRequest[],
  entityTypeName: string,
  fields: readonly AppBuilderDomainFieldDescriptor[],
  serviceClassName: string | null,
): {
  readonly value: readonly AppBuilderServiceCollectionFilterMethodSourceModel[];
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  const fieldModels = appBuilderDomainFieldSourceModels(fields, {
    entityTypeName,
    valueSets: [],
  });
  const filterMethods: AppBuilderServiceCollectionFilterMethodSourceModel[] = [];
  const issues: AppBuilderSourceLoweringSourcePlanIssue[] = [];
  for (const filterMethodRequest of filterMethodRequests) {
    const methodName = normalizedSourceInputText(filterMethodRequest.methodName);
    const fieldName = normalizedSourceInputText(filterMethodRequest.fieldName);
    const parameterName = normalizedSourceInputText(filterMethodRequest.parameterName);
    const requestedPredicateKind = filterMethodRequest.predicateKind ?? AppBuilderServiceCollectionFilterPredicateKind.Equals;
    const field = fieldName == null
      ? null
      : fieldModels.find((candidate) => candidate.memberName === fieldName) ?? null;
    const predicateKind = APP_BUILDER_SERVICE_COLLECTION_FILTER_PREDICATE_KINDS.includes(requestedPredicateKind)
      ? requestedPredicateKind
      : null;
    if (
      methodName == null
      || !appBuilderIsTypeScriptIdentifier(methodName)
      || fieldName == null
      || field == null
      || parameterName == null
      || !appBuilderIsTypeScriptIdentifier(parameterName)
      || predicateKind == null
      || (predicateKind === AppBuilderServiceCollectionFilterPredicateKind.TextContains && field.typeScriptType !== 'string')
    ) {
      issues.push(componentPairServiceCollectionIssue(
        AppBuilderSourceLoweringSourcePlanIssueKind.InvalidComponentPairServiceCollectionFilterMethod,
        'Component-pair service collection filter methods need methodName, fieldName, parameterName, and predicateKind that match TypeScript identifiers, a generated domain field, and a supported field/predicate pairing.',
        {
          serviceClassName,
          fieldNames: fieldName == null ? [] : [fieldName],
        },
      ));
      continue;
    }
    filterMethods.push({
      methodName,
      fieldName: field.memberName,
      parameterName,
      predicateKind,
    });
  }
  return {
    value: filterMethods,
    issues,
  };
}

function selectComponentPairServiceCollectionEntity(
  entities: readonly AppBuilderSourceLoweringDomainEntityPayload[],
  requestedName: string | null,
): { readonly value: AppBuilderSourceLoweringDomainEntityPayload | null; readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[] } {
  if (requestedName != null) {
    const match = entities.find((entity) =>
      entity.entityTitle === requestedName
      || entity.entityTypeName === requestedName
      || entity.collectionMemberName === requestedName
    ) ?? null;
    return match == null
      ? {
          value: null,
          issues: [componentPairServiceCollectionIssue(
            AppBuilderSourceLoweringSourcePlanIssueKind.InvalidComponentPairServiceCollectionDomainEntity,
            `Component-pair service collection lowering could not find domain entity '${requestedName}'.`,
          )],
        }
      : { value: match, issues: [] };
  }
  if (entities.length === 1) {
    return { value: entities[0]!, issues: [] };
  }
  return {
    value: null,
    issues: [componentPairServiceCollectionIssue(
      AppBuilderSourceLoweringSourcePlanIssueKind.InvalidComponentPairServiceCollectionDomainEntity,
      entities.length === 0
        ? 'Component-pair service collection lowering needs a supplied domain entity before it can generate a service record type.'
        : 'Component-pair service collection lowering needs collectionEntityName when more than one domain entity is supplied.',
    )],
  };
}

function componentPairServiceCollectionIssue(
  issueKind: AppBuilderSourceLoweringSourcePlanIssueKind,
  summary: string,
  options: {
    readonly serviceClassName?: string | null;
    readonly fieldNames?: readonly string[];
  } = {},
): AppBuilderSourceLoweringSourcePlanIssue {
  return {
    issueKind,
    ...(options.serviceClassName == null ? {} : { serviceClassNames: [options.serviceClassName] }),
    ...(options.fieldNames == null || options.fieldNames.length === 0 ? {} : { fieldNames: options.fieldNames }),
    summary,
  };
}

function componentPairFragments(
  nested: ComponentPairNestedSources,
  localState: ComponentPairLocalStateFrame,
  serviceSupport: ComponentPairServiceSupportFrame,
): ComponentPairFragments {
  return {
    typeScriptTopLevelFragments: localState.sourceLoweringLocalViewModelState?.typeScriptTopLevelFragments ?? [],
    classMemberFragments: [
      ...serviceSupport.classMemberFragments,
      ...(localState.sourceLoweringLocalViewModelState?.classMemberFragments ?? []),
      ...nested.sourceLoweringClassMemberInvocations.flatMap((invocation) => invocation.fragments),
    ],
    templateFileTextFragments: [
      ...(nested.sourceLoweringComposition?.fragments ?? []),
      ...nested.sourceLoweringTemplateInvocations.flatMap((invocation) => invocation.fragments),
    ],
    templateContributionFragments: [
      ...(nested.sourceLoweringComposition?.contributingFragments ?? []),
      ...nested.sourceLoweringTemplateInvocations.flatMap((invocation) => invocation.fragments),
    ],
  };
}

function componentPairIssues(
  request: AppBuilderSourceLoweringComponentPairRequest,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  direct: ComponentPairDirectSelection,
  nested: ComponentPairNestedSources,
  localState: ComponentPairLocalStateFrame,
  serviceSupport: ComponentPairServiceSupportFrame,
  fragments: ComponentPairFragments,
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  return [
    ...(request.sourceLoweringComposition == null && nested.sourceLoweringTemplateInvocations.length === 0
      ? [{
          issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.MissingComponentPairTemplateComposition,
          summary: 'Component-pair SourcePlan lowering requires sourceLoweringComposition or sourceLoweringTemplateInvocations so the HTML template file has truthful source-lowering fragment origins.',
        }]
      : []),
    ...direct.appName.issues,
    ...direct.className.issues,
    ...direct.resourceCarrier.issues,
    ...direct.conventionPolicy.issues,
    ...directCustomElementSourceLayoutIssues(null, suppliedInputs),
    ...directConventionCarrierIssues(null, direct.conventionPolicy.value, direct.resourceCarrier.value),
    ...sourceLoweringCompositionIssues(nested.sourceLoweringComposition),
    ...nested.sourceLoweringTemplateInvocations.flatMap((invocation) => sourceLoweringInvocationIssues(invocation)),
    ...(localState.sourceLoweringLocalViewModelState?.issues ?? []),
    ...serviceSupport.issues,
    ...nested.sourceLoweringClassMemberInvocations.flatMap((invocation) => sourceLoweringInvocationIssues(invocation)),
    ...(fragments.templateFileTextFragments.length === 0 ? [] : templateFragmentIssues(fragments.templateFileTextFragments)),
    ...typeScriptTopLevelFragmentIssues(fragments.typeScriptTopLevelFragments),
    ...classMemberFragmentIssues(fragments.classMemberFragments),
  ] satisfies readonly AppBuilderSourceLoweringSourcePlanIssue[];
}

function componentPairSourcePlan(
  rootDir: string | null,
  templatePath: string | null,
  componentPath: string | null,
  direct: ComponentPairDirectSelection,
  serviceSupport: ComponentPairServiceSupportFrame,
  fragments: ComponentPairFragments,
  issues: readonly AppBuilderSourceLoweringSourcePlanIssue[],
): ComponentPairSourcePlan {
  if (
    issues.length > 0
    || rootDir == null
    || templatePath == null
    || componentPath == null
    || (direct.appShellRequest != null && direct.appName.value == null)
    || direct.className.value == null
    || direct.resourceName == null
    || direct.resourceCarrier.value == null
    || fragments.templateFileTextFragments.length === 0
  ) {
    return null;
  }
  const layout = {
    carrier: direct.resourceCarrier.value,
    componentPath,
    templatePath,
    className: direct.className.value,
    resourceName: direct.resourceName,
  };
  if (direct.appShellRequest == null) {
    return appBuilderCustomElementPairSourcePlan({
      rootDir,
      layout,
      templateFileTextFragments: fragments.templateFileTextFragments,
      templateContributionFragments: fragments.templateContributionFragments,
      typeScriptTopLevelFragments: fragments.typeScriptTopLevelFragments,
      classMemberFragments: fragments.classMemberFragments,
      supportFileArtifacts: serviceSupport.supportFileArtifacts,
    });
  }
  const appName = direct.appName.value;
  if (appName == null) {
    return null;
  }
  return appBuilderRootCustomElementPairSourcePlan({
    rootDir,
    appName,
    entrypointPath: direct.appShellEntrypointPath,
    layout,
    dependencySpecifiers: direct.configurationAdmission?.dependencySpecifiers,
    configurationAdmission: direct.configurationAdmission ?? undefined,
    templateFileTextFragments: fragments.templateFileTextFragments,
    templateContributionFragments: fragments.templateContributionFragments,
    typeScriptTopLevelFragments: fragments.typeScriptTopLevelFragments,
    classMemberFragments: fragments.classMemberFragments,
    supportFileArtifacts: serviceSupport.supportFileArtifacts,
  });
}

function componentPairConfigurationAdmission(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): AureliaConfigurationAdmissionSourceSet | null {
  const routingPolicies = appBuilderSourceLoweringRoutingPolicyPayloads(suppliedInputs);
  const admitsRouter = routingPolicies.some((policy) =>
    policy.routerAdmission === AppBuilderRouterAdmissionPolicy.RouterConfiguration
  );
  return admitsRouter
    ? aureliaConfigurationAdmissionSourceSet([aureliaRouterConfigurationAdmissionSource()])
    : null;
}

function componentPairAggregates(
  nested: ComponentPairNestedSources,
  localState: ComponentPairLocalStateFrame,
  serviceSupport: ComponentPairServiceSupportFrame,
): Pick<AppBuilderSourceLoweringComponentPair, 'sourceLoweringTargetRefs' | 'effectContractIds' | 'controlUseInventoryRows'> {
  const serviceTargetRefs = serviceSupport.supportFileArtifacts.length === 0
    ? []
    : [SERVICE_BACKED_LOAD_SAVE_TARGET_REF];
  return {
    sourceLoweringTargetRefs: appBuilderUniqueOntologyRowRefs([
      ...(nested.sourceLoweringComposition?.sourceLoweringTargetRefs ?? []),
      ...nested.sourceLoweringTemplateInvocations.flatMap((invocation) => invocation.sourceLoweringTargetRefs),
      ...(localState.sourceLoweringLocalViewModelState?.sourceLoweringTargetRefs ?? []),
      ...nested.sourceLoweringClassMemberInvocations.flatMap((invocation) => invocation.sourceLoweringTargetRefs),
      ...serviceTargetRefs,
    ]),
    effectContractIds: appBuilderUniqueEffectContractIds([
      ...(nested.sourceLoweringComposition?.effectContractIds ?? []),
      ...nested.sourceLoweringTemplateInvocations.flatMap((invocation) => invocation.effectContractIds),
      ...(localState.sourceLoweringLocalViewModelState?.effectContractIds ?? []),
      ...nested.sourceLoweringClassMemberInvocations.flatMap((invocation) => invocation.effectContractIds),
      ...serviceTargetRefs.flatMap(appBuilderEffectContractIdsForTargetRef),
    ]),
    controlUseInventoryRows: [
      ...(nested.sourceLoweringComposition?.controlUseInventoryRows ?? []),
      ...nested.sourceLoweringTemplateInvocations.flatMap((invocation) => invocation.controlUseInventoryRows),
      ...nested.sourceLoweringClassMemberInvocations.flatMap((invocation) => invocation.controlUseInventoryRows),
    ],
  };
}

function componentPairLocalCollectionMutableFieldNames(
  invocations: readonly AppBuilderSourceLoweringInvocation[],
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly string[] {
  const fields = appBuilderSourceLoweringDomainFieldPayloads(suppliedInputs);
  const actions = invocations.flatMap((invocation) =>
    invocation.selectedAction == null ? [] : [invocation.selectedAction.action]);
  return appBuilderEntityMutationFieldNamesForDomainActions(actions, fields);
}

export function componentPairLocalViewModelStateFieldNames(
  composition: AppBuilderSourceLoweringComposition | null,
  invocations: readonly AppBuilderSourceLoweringInvocation[],
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  excludedFieldNames: readonly string[] = [],
): readonly string[] | null {
  const selectedFieldNames = new Set<string>();
  const excludedFieldNameSet = new Set(excludedFieldNames);
  collectComponentPairCompositionFieldNames(composition, selectedFieldNames);
  for (const invocation of invocations) {
    if (invocation.selectedField != null
      && invocation.bindingExpression === invocation.selectedField.sourceModel.memberName) {
      selectedFieldNames.add(invocation.selectedField.sourceModel.memberName);
    }
    const action = invocation.selectedAction?.action ?? null;
    if (action == null) {
      continue;
    }
    if (action.scope !== AppBuilderDomainActionScope.Form) {
      continue;
    }
    const actionFieldNames = componentPairFormActionInputFieldNames(action, suppliedInputs);
    for (const fieldName of actionFieldNames) {
      selectedFieldNames.add(fieldName);
    }
  }
  if (selectedFieldNames.size === 0) {
    return [];
  }
  return appBuilderSourceLoweringDomainFieldPayloads(suppliedInputs)
    .map((field) => field.name)
    .filter((fieldName) => selectedFieldNames.has(fieldName) && !excludedFieldNameSet.has(fieldName));
}

function componentPairLocalViewModelFieldObjectFieldNames(
  requestComposition: AppBuilderSourceLoweringComponentPairRequest['sourceLoweringComposition'],
  composition: AppBuilderSourceLoweringComposition | null,
): readonly string[] {
  return uniqueValues(componentPairLocalViewModelFieldObjectStates(requestComposition ?? null, composition)
    .flatMap((state) => state.fields.map((field) => field.name)));
}

function componentPairLocalViewModelFieldObjectStates(
  requestComposition: AppBuilderSourceLoweringComponentPairRequest['sourceLoweringComposition'],
  composition: AppBuilderSourceLoweringComposition | null,
): readonly AppBuilderLocalViewModelFieldObjectStateSourceModel[] {
  if (requestComposition == null || composition == null) {
    return [];
  }
  const statesByMemberName = new Map<string, AppBuilderLocalViewModelFieldObjectStateSourceModel>();
  collectComponentPairLocalViewModelFieldObjectStates(requestComposition, composition, statesByMemberName);
  return [...statesByMemberName.values()];
}

function collectComponentPairLocalViewModelFieldObjectStates(
  requestComposition: NonNullable<AppBuilderSourceLoweringComponentPairRequest['sourceLoweringComposition']>,
  composition: AppBuilderSourceLoweringComposition,
  statesByMemberName: Map<string, AppBuilderLocalViewModelFieldObjectStateSourceModel>,
): void {
  const memberName = normalizedSourceInputText(requestComposition.bindingRootExpression);
  if (memberName != null
    && appBuilderIsTypeScriptIdentifier(memberName)
    && composition.selectedFields.length > 0) {
    const existing = statesByMemberName.get(memberName);
    const sourceKind = componentPairLocalFieldObjectSourceKind(requestComposition, composition, existing);
    const fields = uniqueByFieldName([
      ...(existing?.fields ?? []),
      ...composition.selectedFields.map((selectedField) => selectedField.field.field),
    ]);
    const requiredFieldNames = uniqueValues([
      ...(existing?.readiness?.requiredFieldNames ?? []),
      ...composition.selectedFields
        .filter((selectedField) => selectedField.field.field.required === true)
        .map((selectedField) => selectedField.field.field.name),
    ]);
    statesByMemberName.set(memberName, {
      memberName,
      typeName: existing?.typeName ?? componentPairLocalFieldObjectTypeName(memberName, sourceKind),
      fields,
      sourceKind,
      readiness: sourceKind === AppBuilderLocalViewModelFieldObjectStateSourceKind.DomainValueObjectClass
        && requiredFieldNames.length > 0
        ? {
            memberName: 'canSubmit',
            requiredFieldNames,
          }
        : null,
    });
  }
  if (requestComposition.fulfilledContentComposition != null && composition.fulfilledContentComposition != null) {
    collectComponentPairLocalViewModelFieldObjectStates(
      requestComposition.fulfilledContentComposition,
      composition.fulfilledContentComposition,
      statesByMemberName,
    );
  }
  const childRequests = componentPairRequestChildCompositions(requestComposition);
  const childCompositions = componentPairResultChildCompositions(composition);
  for (let index = 0; index < childRequests.length && index < childCompositions.length; index += 1) {
    collectComponentPairLocalViewModelFieldObjectStates(
      childRequests[index]!,
      childCompositions[index]!,
      statesByMemberName,
    );
  }
}

function componentPairLocalFieldObjectTypeName(
  memberName: string,
  sourceKind: AppBuilderLocalViewModelFieldObjectStateSourceKind,
): string {
  const typeName = sourceKind === AppBuilderLocalViewModelFieldObjectStateSourceKind.DomainValueObjectClass
    ? appBuilderPascalCase(memberName)
    : `${appBuilderPascalCase(memberName)}State`;
  return appBuilderIsTypeScriptIdentifier(typeName) ? typeName : 'DraftState';
}

function componentPairLocalFieldObjectSourceKind(
  requestComposition: NonNullable<AppBuilderSourceLoweringComponentPairRequest['sourceLoweringComposition']>,
  composition: AppBuilderSourceLoweringComposition,
  existing: AppBuilderLocalViewModelFieldObjectStateSourceModel | undefined,
): AppBuilderLocalViewModelFieldObjectStateSourceKind {
  if (existing?.sourceKind === AppBuilderLocalViewModelFieldObjectStateSourceKind.DomainValueObjectClass) {
    return AppBuilderLocalViewModelFieldObjectStateSourceKind.DomainValueObjectClass;
  }
  const requestTargetRef = requestComposition.targetRef ?? null;
  const resultTargetRef = composition.targetRef;
  if (
    (requestTargetRef?.kind === AppBuilderOntologyRowKind.ApplicationPattern
      && requestTargetRef.id === AppBuilderApplicationPatternId.DomainBackedSubmitForm)
    || (resultTargetRef?.kind === AppBuilderOntologyRowKind.ApplicationPattern
      && resultTargetRef.id === AppBuilderApplicationPatternId.DomainBackedSubmitForm)
  ) {
    return AppBuilderLocalViewModelFieldObjectStateSourceKind.DomainValueObjectClass;
  }
  return AppBuilderLocalViewModelFieldObjectStateSourceKind.RecordLiteral;
}

function uniqueByFieldName(
  fields: readonly AppBuilderDomainFieldDescriptor[],
): readonly AppBuilderDomainFieldDescriptor[] {
  return uniqueValues(fields.map((field) => field.name))
    .flatMap((fieldName) => fields.find((field) => field.name === fieldName) ?? []);
}

function componentPairFormActionInputFieldNames(
  action: AppBuilderDomainActionDescriptor,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly string[] {
  if (action.inputFieldNames != null && action.inputFieldNames.length > 0) {
    return action.inputFieldNames;
  }
  const fields = appBuilderSourceLoweringDomainFieldPayloads(suppliedInputs);
  const entities = appBuilderSourceLoweringDomainEntityPayloads(suppliedInputs);
  const entityName = componentPairActionEntityName(action, entities, suppliedInputs);
  if (entityName == null) {
    return fields.every((field) => field.entityName == null)
      ? fields.map((field) => field.name)
      : [];
  }
  if (entities.length === 1 && fields.every((field) => field.entityName == null)) {
    return fields.map((field) => field.name);
  }
  return fields
    .filter((field) => field.entityName === entityName)
    .map((field) => field.name);
}

function componentPairActionEntityName(
  action: AppBuilderDomainActionDescriptor,
  entities: readonly AppBuilderSourceLoweringDomainEntityPayload[],
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): string | null {
  const targetEntityName = normalizedSourceInputText(action.targetEntityName);
  if (targetEntityName != null) {
    return targetEntityName;
  }
  if (entities.length === 1) {
    return componentPairDomainEntityPayloadName(entities[0]!);
  }
  const fromEntityNames = uniqueValues(appBuilderSourceLoweringDomainRelationshipPayloads(suppliedInputs)
    .map((relationship) => normalizedSourceInputText(relationship.fromEntityName))
    .filter((value): value is string => value != null));
  return fromEntityNames.length === 1 ? fromEntityNames[0]! : null;
}

function componentPairDomainEntityPayloadName(
  entity: AppBuilderSourceLoweringDomainEntityPayload,
): string {
  return entity.entityTypeName ?? appBuilderPascalCase(entity.entityTitle);
}

function collectComponentPairCompositionFieldNames(
  composition: AppBuilderSourceLoweringComposition | null,
  fieldNames: Set<string>,
): void {
  if (composition == null) {
    return;
  }
  for (const selectedField of composition.selectedFields) {
    if (selectedField.bindingExpression === selectedField.field.memberName) {
      fieldNames.add(selectedField.field.memberName);
    }
  }
  if (composition.fulfilledContentComposition != null) {
    collectComponentPairCompositionFieldNames(composition.fulfilledContentComposition, fieldNames);
  }
  for (const childInvocation of componentPairResultChildInvocations(composition)) {
    if (childInvocation.selectedField != null
      && childInvocation.bindingExpression === childInvocation.selectedField.sourceModel.memberName) {
      fieldNames.add(childInvocation.selectedField.sourceModel.memberName);
    }
  }
  for (const childComposition of componentPairResultChildCompositions(composition)) {
    collectComponentPairCompositionFieldNames(childComposition, fieldNames);
  }
}

function componentPairLocalFieldValueSetSelections(
  composition: AppBuilderSourceLoweringComposition | null,
): readonly AppBuilderDomainFieldValueSetSelection[] {
  if (composition == null) {
    return [];
  }
  const selections = new Map<string, AppBuilderDomainFieldValueSetSelection>();
  collectComponentPairLocalFieldValueSetSelections(composition, selections);
  return [...selections.values()];
}

function collectComponentPairLocalFieldValueSetSelections(
  composition: AppBuilderSourceLoweringComposition,
  selections: Map<string, AppBuilderDomainFieldValueSetSelection>,
): void {
  for (const selectedField of composition.selectedFields) {
    const selectedValueSet = selectedField.memberInvocation?.selectedValueSet ?? null;
    if (selectedValueSet == null || selections.has(selectedField.field.memberName)) {
      continue;
    }
    selections.set(selectedField.field.memberName, {
      fieldName: selectedField.field.memberName,
      valueSetName: selectedValueSet.name,
    });
  }
  if (composition.fulfilledContentComposition != null) {
    collectComponentPairLocalFieldValueSetSelections(composition.fulfilledContentComposition, selections);
  }
  for (const childInvocation of componentPairResultChildInvocations(composition)) {
    const selectedValueSet = childInvocation.selectedValueSet;
    const selectedField = childInvocation.selectedField;
    if (selectedValueSet == null || selectedField == null || selections.has(selectedField.sourceModel.memberName)) {
      continue;
    }
    selections.set(selectedField.sourceModel.memberName, {
      fieldName: selectedField.sourceModel.memberName,
      valueSetName: selectedValueSet.name,
    });
  }
  for (const childComposition of componentPairResultChildCompositions(composition)) {
    collectComponentPairLocalFieldValueSetSelections(childComposition, selections);
  }
}

function componentPairRequestChildCompositions(
  requestComposition: NonNullable<AppBuilderSourceLoweringComponentPairRequest['sourceLoweringComposition']>,
): readonly NonNullable<AppBuilderSourceLoweringComponentPairRequest['sourceLoweringComposition']>[] {
  if (requestComposition.childContent != null) {
    return requestComposition.childContent.flatMap((child) => child.composition == null ? [] : [child.composition]);
  }
  return requestComposition.childCompositions ?? [];
}

function componentPairResultChildCompositions(
  composition: AppBuilderSourceLoweringComposition,
): readonly AppBuilderSourceLoweringComposition[] {
  return composition.childContent.length === 0
    ? composition.childCompositions
    : composition.childContent.flatMap((child) => child.composition == null ? [] : [child.composition]);
}

function componentPairResultChildInvocations(
  composition: AppBuilderSourceLoweringComposition,
): readonly AppBuilderSourceLoweringInvocation[] {
  return composition.childContent.flatMap((child) => child.invocation == null ? [] : [child.invocation]);
}

function componentPairNestedSuppliedInputs(
  sharedSuppliedInputs: readonly AppBuilderSuppliedInput[],
  nestedSuppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderSuppliedInput[] {
  return [
    ...sharedSuppliedInputs,
    ...nestedSuppliedInputs,
  ];
}
