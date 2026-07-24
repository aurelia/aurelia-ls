import ts from 'typescript';
import {
  openSeamReasonKindsForEvaluationPressure,
  openSeamReasonKindsForEvaluationRead,
  openSeamReasonKindsForEvaluationValue,
} from '../evaluation/boundary-open-reason.js';
import {
  EvaluationRead,
  readStaticSourceLiteralValue,
  readStaticStringValue,
  StaticInvocationEvidenceExpressionReader,
  StaticSourceLiteralExpressionReader,
  type StaticExpressionEvaluationReader,
} from '../evaluation/expression-reader.js';
import type { StaticEvaluationRuntimeHost } from '../evaluation/evaluator.js';
import { executeStaticFunctionEffects } from '../evaluation/function-execution.js';
import type { StaticIntrinsicEvaluationHost } from '../evaluation/intrinsics.js';
import {
  StaticInvocationKind,
  StaticInvocationNotApplicable,
  staticInvocationValue,
  type StaticInvocationDispatch,
  type StaticInvocationFrame,
} from '../evaluation/invocation.js';
import { delegateStaticEvaluationRuntimeHost } from '../evaluation/runtime-host.js';
import { StaticEvaluationSessionFork } from '../evaluation/evaluation-session.js';
import { readEvaluationEnumerableOwnEntries } from '../evaluation/enumerable-own-properties.js';
import type { EvaluatedProjectSource } from '../evaluation/project-evaluation.js';
import {
  EvaluationArrayElement,
  EvaluationArrayShape,
  EvaluationArrayValue,
  EvaluationBooleanValue,
  EvaluationBoundaryKind,
  EvaluationBoundaryObjectValue,
  EvaluationObjectProperty,
  EvaluationObjectPropertyState,
  EvaluationObjectValue,
  EvaluationStringValue,
  EvaluationUndefined,
  EvaluationValueKind,
  type EvaluationFunctionValue,
  type EvaluationValue,
} from '../evaluation/values.js';
import {
  EvaluationOpenSeamKind,
  type EvaluationOpenSeam,
} from '../evaluation/seams.js';
import { evaluationValuesShareLineage } from '../evaluation/value-relation.js';
import {
  localKeyPart,
  projectModuleSourceNodeOrdinalLocalKey,
} from '../kernel/local-key.js';
import type { OpenSeamReasonKind } from '../kernel/open-seam.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  KernelPublicationPlan,
  publishProductDetails,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import { sourceSpanEvidenceForSite } from '../kernel/source-address.js';
import { SourceSpanRole } from '../kernel/address.js';
import { EvidenceRole } from '../kernel/evidence.js';
import {
  AttributeMapperConfiguration,
  AttributeMapperMapping,
  AttributeMapperTwoWayRule,
} from '../template/attribute-mapper.js';
import {
  RuntimeKeyMappingConfiguration,
  RuntimeKeyMappingEntry,
} from '../template/runtime-event-modifier.js';
import {
  NodeObserverLocatorConfiguration,
  type NodeObserverLocatorAccessorOverride,
  type NodeObserverLocatorGlobalConfig,
  type NodeObserverLocatorNodeConfig,
} from '../observation/observer-locator.js';
import {
  nodeObserverAccessorOverridesFromCall,
  nodeObserverGlobalAccessorOverridesFromCall,
  nodeObserverGlobalConfigsFromUseConfigGlobalCall,
  nodeObserverNodeConfigsFromUseConfigCall,
} from '../observation/node-observer-config-reader.js';
import {
  authoredPropertyNameSpan,
  authoredPropertyNameNode,
  readReferenceName,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import {
  readSourceFileAddressHandlesByFileName,
  type ConfigurationRecognitionProjectResult,
} from './configuration-recognition-project-pass.js';
import {
  configurationRecognitionOpensForEvaluationRead,
  ConfigurationRecognitionOpen,
} from './configuration-observation.js';
import {
  aureliaInterfaceEvaluationForValue,
  type AureliaAppTaskEvaluation,
} from './aurelia-evaluation-runtime.js';
import { ConfigurationKernelPublication } from './configuration-publication.js';
import {
  ConfigurationRecognitionContext,
} from './configuration-recognition-context.js';
import {
  ConfigurationIssue,
  ConfigurationIssueKind,
} from './configuration-issue.js';
import {
  ConfigurationIssuePublisher,
} from './configuration-issue-publication.js';
import {
  ConfigurationFrameworkErrorCode,
} from './framework-error-code.js';
import { ConfigurationProductDetails } from './product-details.js';
import { normalizeConfigurationSourceFileName } from './source-file-names.js';
import type {
  DiWorldConstructionEmission,
  RegisteredAppTask,
} from '../di/world-construction.js';
import type { Container } from '../di/container.js';
import type {
  AddressHandle,
  IdentityHandle,
} from '../kernel/handles.js';

const enum FrameworkServiceKind {
  AttrMapper = 'attr-mapper',
  NodeObserverLocator = 'node-observer-locator',
  KeyMapping = 'key-mapping',
}

const enum AppTaskCallbackTargetKind {
  Container = 'container',
  FrameworkService = 'framework-service',
}

type AppTaskCallbackTarget =
  | {
      readonly kind: AppTaskCallbackTargetKind.Container;
    }
  | {
      readonly kind: AppTaskCallbackTargetKind.FrameworkService;
      readonly service: FrameworkServiceKind;
    };

const builtInNodeObserverConfigKeys = [
  nodeConfigKey('INPUT', 'value'),
  nodeConfigKey('INPUT', 'valueAsNumber'),
  nodeConfigKey('INPUT', 'checked'),
  nodeConfigKey('INPUT', 'files'),
  nodeConfigKey('SELECT', 'value'),
  nodeConfigKey('TEXTAREA', 'value'),
] as const;

const builtInGlobalNodeObserverConfigKeys = [
  'scrollTop',
  'scrollLeft',
  'textContent',
  'innerHTML',
] as const;

const builtInAttributeMappingKeys = [
  attrMappingKey('LABEL', 'for'),
  attrMappingKey('IMG', 'usemap'),
  attrMappingKey('INPUT', 'maxlength'),
  attrMappingKey('INPUT', 'minlength'),
  attrMappingKey('INPUT', 'formaction'),
  attrMappingKey('INPUT', 'formenctype'),
  attrMappingKey('INPUT', 'formmethod'),
  attrMappingKey('INPUT', 'formnovalidate'),
  attrMappingKey('INPUT', 'formtarget'),
  attrMappingKey('INPUT', 'inputmode'),
  attrMappingKey('TEXTAREA', 'maxlength'),
  attrMappingKey('TD', 'rowspan'),
  attrMappingKey('TD', 'colspan'),
  attrMappingKey('TH', 'rowspan'),
  attrMappingKey('TH', 'colspan'),
] as const;

const builtInGlobalAttributeMappingKeys = [
  'accesskey',
  'contenteditable',
  'tabindex',
  'textcontent',
  'innerhtml',
  'scrolltop',
  'scrollleft',
  'readonly',
] as const;

/** Framework-service state visible to one app-root compiler world after its reached AppTasks execute. */
export class FrameworkServiceCustomization {
  static readonly empty = new FrameworkServiceCustomization(
    AttributeMapperConfiguration.empty,
    NodeObserverLocatorConfiguration.empty,
    RuntimeKeyMappingConfiguration.frameworkDefault,
  );

  constructor(
    readonly attributeMapper: AttributeMapperConfiguration,
    readonly nodeObserverLocator: NodeObserverLocatorConfiguration,
    readonly runtimeKeyMapping: RuntimeKeyMappingConfiguration,
  ) {}
}

/** One app-root container and the nearest runtime AppTask cohort whose service state it observes. */
export class FrameworkServiceCustomizationScope {
  constructor(
    readonly targetContainerIdentityHandle: IdentityHandle,
    readonly taskContainerIdentityHandle: IdentityHandle | null,
    readonly customization: FrameworkServiceCustomization,
  ) {}
}

/** Project recognition result with app-root/container-scoped service state and project-wide pressure. */
export class FrameworkServiceCustomizationProjectResult {
  private readonly scopesByTargetContainer: ReadonlyMap<IdentityHandle, FrameworkServiceCustomizationScope>;

  constructor(
    readonly scopes: readonly FrameworkServiceCustomizationScope[],
    readonly issues: readonly ConfigurationIssue[] = [],
    readonly records: readonly KernelStoreRecord[] = [],
  ) {
    this.scopesByTargetContainer = new Map(scopes.map((scope) => [
      scope.targetContainerIdentityHandle,
      scope,
    ]));
  }

  forContainer(container: Container): FrameworkServiceCustomization {
    return this.scopesByTargetContainer.get(container.identityHandle)?.customization
      ?? FrameworkServiceCustomization.empty;
  }
}

class FrameworkServiceCustomizationDraft {
  readonly attributeMappings: AttributeMapperMapping[] = [];
  readonly attributeTwoWayRules: AttributeMapperTwoWayRule[] = [];
  readonly nodeConfigs: NodeObserverLocatorNodeConfig[] = [];
  readonly globalNodeConfigs: NodeObserverLocatorGlobalConfig[] = [];
  readonly nodeAccessorOverrides: NodeObserverLocatorAccessorOverride[] = [];
  readonly globalAccessorOverrides: string[] = [];
  readonly issues: ConfigurationIssue[] = [];
  readonly records: KernelStoreRecord[] = [];
  nodeObserverLocatorAllowDirtyCheck: boolean | null = null;
  runtimeKeyMapping = RuntimeKeyMappingConfiguration.frameworkDefault;

  private readonly nodeConfigKeys = new Set<string>(builtInNodeObserverConfigKeys);
  private readonly globalNodeConfigKeys = new Set<string>(builtInGlobalNodeObserverConfigKeys);
  private readonly attributeMappingKeys = new Set<string>(builtInAttributeMappingKeys);
  private readonly globalAttributeMappingKeys = new Set<string>(builtInGlobalAttributeMappingKeys);
  private issueOrdinal = 0;
  private openOrdinal = 0;
  private runtimeKeyMappingSourceOrdinal = 0;

  constructor(
    private readonly issuePublisher: ConfigurationIssuePublisher,
    private readonly configurationPublication: ConfigurationKernelPublication,
    private readonly scopeLocalKey: string,
  ) {}

  addEvaluationPressure(
    context: ConfigurationRecognitionContext,
    read: EvaluationRead<EvaluationValue>,
    node: ts.Node,
    summary: string,
  ): void {
    this.addOpenSeams(
      context,
      node,
      configurationRecognitionOpensForEvaluationRead(
        read,
        KernelVocabulary.Configuration.OpenConfigurationOption.key,
        summary,
        node,
      ),
    );
  }

  addDomainPressure(
    context: ConfigurationRecognitionContext,
    node: ts.Node,
    summary: string,
    reasonKinds: readonly OpenSeamReasonKind[],
  ): void {
    this.addOpenSeams(context, node, [new ConfigurationRecognitionOpen(
      KernelVocabulary.Configuration.OpenConfigurationOption.key,
      summary,
      node,
      reasonKinds,
    )]);
  }

  addNodeConfig(
    context: ConfigurationRecognitionContext,
    call: ts.CallExpression,
    config: NodeObserverLocatorNodeConfig,
  ): void {
    const key = nodeConfigKey(config.tagName, config.propertyName);
    if (this.nodeConfigKeys.has(key)) {
      this.publishDuplicateNodeObserverMapping(context, call, config.tagName, config.propertyName);
      return;
    }
    this.nodeConfigKeys.add(key);
    this.nodeConfigs.push(config);
  }

  addGlobalNodeConfig(
    context: ConfigurationRecognitionContext,
    call: ts.CallExpression,
    config: NodeObserverLocatorGlobalConfig,
  ): void {
    if (this.globalNodeConfigKeys.has(config.propertyName)) {
      this.publishDuplicateNodeObserverMapping(context, call, '*', config.propertyName);
      return;
    }
    this.globalNodeConfigKeys.add(config.propertyName);
    this.globalNodeConfigs.push(config);
  }

  addAttributeMappings(
    context: ConfigurationRecognitionContext,
    call: ts.CallExpression,
    mappings: readonly AttributeMapperMapping[],
  ): void {
    for (const mapping of mappings) {
      if (mapping.tagName == null) {
        this.addGlobalAttributeMapping(context, call, mapping);
      } else {
        this.addTaggedAttributeMapping(context, call, mapping);
      }
    }
  }

  toCustomization(): FrameworkServiceCustomization {
    return new FrameworkServiceCustomization(
      new AttributeMapperConfiguration(this.attributeMappings, this.attributeTwoWayRules),
      new NodeObserverLocatorConfiguration(
        this.nodeConfigs,
        this.globalNodeConfigs,
        this.nodeAccessorOverrides,
        this.globalAccessorOverrides,
        this.nodeObserverLocatorAllowDirtyCheck,
      ),
      this.runtimeKeyMapping,
    );
  }

  sourceForRuntimeKeyMappingEntry(
    context: ConfigurationRecognitionContext,
    node: ts.Node,
    modifier: string,
  ): Pick<RuntimeKeyMappingEntry, 'sourceAddressHandle' | 'provenanceHandle'> {
    const sourceNode = authoredPropertyNameNode(node);
    const sourceFileAddressHandle = context.sourceFileAddressHandleForNode(sourceNode);
    if (sourceFileAddressHandle == null) {
      return {
        sourceAddressHandle: null,
        provenanceHandle: null,
      };
    }
    const span = authoredPropertyNameSpan(sourceNode.getSourceFile(), sourceNode);
    if (span == null) {
      return {
        sourceAddressHandle: null,
        provenanceHandle: null,
      };
    }
    const local = `runtime-key-mapping:${this.scopeLocalKey}:${projectModuleSourceNodeOrdinalLocalKey({
      projectKey: context.projectKey,
      moduleKey: context.moduleKey,
      sourceFile: sourceNode.getSourceFile(),
      node: sourceNode,
      index: this.runtimeKeyMappingSourceOrdinal++,
    })}:${modifier}`;
    const source = sourceSpanEvidenceForSite(
      this.configurationPublication.store,
      local,
      {
        sourceFileAddressHandle,
        start: span.start,
        end: span.end,
      },
      SourceSpanRole.Name,
      [EvidenceRole.Configuration],
      `AppTask configured IKeyMapping modifier '${modifier}'.`,
    );
    this.records.push(...source.records);
    return {
      sourceAddressHandle: source.addressHandle,
      provenanceHandle: source.provenanceHandle,
    };
  }

  private addOpenSeams(
    context: ConfigurationRecognitionContext,
    node: ts.Node,
    seams: readonly ConfigurationRecognitionOpen[],
  ): void {
    if (seams.length === 0) {
      return;
    }
    const local = `framework-service-customization:${this.scopeLocalKey}:${projectModuleSourceNodeOrdinalLocalKey({
      projectKey: context.projectKey,
      moduleKey: context.moduleKey,
      sourceFile: context.sourceFile,
      node,
      index: this.openOrdinal++,
    })}`;
    this.records.push(...this.configurationPublication.recordsForOpenSeams(context, seams, local).records);
  }

  private publishDuplicateNodeObserverMapping(
    context: ConfigurationRecognitionContext,
    call: ts.CallExpression,
    tagName: string,
    propertyName: string,
  ): void {
    const local = `configuration-issue:${this.scopeLocalKey}:${projectModuleSourceNodeOrdinalLocalKey({
      projectKey: context.projectKey,
      moduleKey: context.moduleKey,
      sourceFile: context.sourceFile,
      node: call,
      index: this.issueOrdinal++,
    })}`;
    const message = `Mapping for property ${propertyName} of <${tagName} /> already exists.`;
    const publication = this.issuePublisher.publishForNode(
      context,
      call,
      local,
      ConfigurationIssueKind.NodeObserverMappingExisted,
      message,
      ConfigurationFrameworkErrorCode.NodeObserverMappingExisted,
    );
    this.issues.push(publication.issue);
    this.records.push(...publication.records);
  }

  private addTaggedAttributeMapping(
    context: ConfigurationRecognitionContext,
    call: ts.CallExpression,
    mapping: AttributeMapperMapping,
  ): void {
    const key = attrMappingKey(mapping.tagName!, mapping.attributeName);
    if (this.attributeMappingKeys.has(key)) {
      this.publishDuplicateAttributeMapping(context, call, mapping.attributeName, mapping.tagName!);
      return;
    }
    this.attributeMappingKeys.add(key);
    this.attributeMappings.push(mapping);
  }

  private addGlobalAttributeMapping(
    context: ConfigurationRecognitionContext,
    call: ts.CallExpression,
    mapping: AttributeMapperMapping,
  ): void {
    if (this.globalAttributeMappingKeys.has(mapping.attributeName)) {
      this.publishDuplicateAttributeMapping(context, call, mapping.attributeName, '*');
      return;
    }
    this.globalAttributeMappingKeys.add(mapping.attributeName);
    this.attributeMappings.push(mapping);
  }

  private publishDuplicateAttributeMapping(
    context: ConfigurationRecognitionContext,
    call: ts.CallExpression,
    attributeName: string,
    tagName: string,
  ): void {
    const local = `configuration-issue:${this.scopeLocalKey}:${projectModuleSourceNodeOrdinalLocalKey({
      projectKey: context.projectKey,
      moduleKey: context.moduleKey,
      sourceFile: context.sourceFile,
      node: call,
      index: this.issueOrdinal++,
    })}`;
    const message = `Attribute mapper already has a mapping for ${attributeName} on ${tagName}.`;
    const publication = this.issuePublisher.publishForNode(
      context,
      call,
      local,
      ConfigurationIssueKind.AttrMapperDuplicateMapping,
      message,
      ConfigurationFrameworkErrorCode.AttrMapperDuplicateMapping,
    );
    this.issues.push(publication.issue);
    this.records.push(...publication.records);
  }
}

/**
 * Recognizes AppTask-time mutations of framework compiler/observer services.
 *
 * Only DI-spent callbacks execute, in isolated evaluator forks. Reached framework-service calls are decoded from their
 * immutable invocation evidence; arbitrary callback effects remain explicit evaluator pressure.
 */
export class FrameworkServiceCustomizationRecognitionPass {
  constructor(
    private readonly store: KernelStore,
    private readonly publication: KernelPublicationContext,
  ) {}

  recognize(
    configuration: ConfigurationRecognitionProjectResult,
    diWorld: DiWorldConstructionEmission,
    targetContainers: readonly Container[],
  ): FrameworkServiceCustomizationProjectResult {
    const sourceFileAddressHandlesByFileName = readSourceFileAddressHandlesByFileName(configuration.evaluation);
    const evaluatedSourcesByFileName = new Map(configuration.evaluation.readEvaluatedSources().map((source) => [
      normalizeConfigurationSourceFileName(source.sourceFile.fileName),
      source,
    ]));
    const customizationsByTaskContainer = new Map<IdentityHandle, FrameworkServiceCustomization>();
    const scopes: FrameworkServiceCustomizationScope[] = [];
    const issues: ConfigurationIssue[] = [];
    const records: KernelStoreRecord[] = [];
    const seenTargets = new Set<IdentityHandle>();
    for (const targetContainer of targetContainers) {
      if (seenTargets.has(targetContainer.identityHandle)) {
        continue;
      }
      seenTargets.add(targetContainer.identityHandle);
      const cohort = registeredAppTaskCohortForContainer(diWorld.registeredAppTasks, targetContainer);
      if (cohort == null) {
        scopes.push(new FrameworkServiceCustomizationScope(
          targetContainer.identityHandle,
          null,
          FrameworkServiceCustomization.empty,
        ));
        continue;
      }
      let customization = customizationsByTaskContainer.get(cohort.container.identityHandle) ?? null;
      if (customization == null) {
        const draft = new FrameworkServiceCustomizationDraft(
          new ConfigurationIssuePublisher(this.store),
          new ConfigurationKernelPublication(this.store),
          localKeyPart(cohort.container.identityHandle),
        );
        for (const registration of cohort.registrations) {
          executeRegisteredAppTaskServiceCustomizations(
            registration,
            evaluatedSourcesByFileName,
            sourceFileAddressHandlesByFileName,
            draft,
          );
        }
        customization = draft.toCustomization();
        customizationsByTaskContainer.set(cohort.container.identityHandle, customization);
        issues.push(...draft.issues);
        records.push(...draft.records);
      }
      scopes.push(new FrameworkServiceCustomizationScope(
        targetContainer.identityHandle,
        cohort.container.identityHandle,
        customization,
      ));
    }
    const result = new FrameworkServiceCustomizationProjectResult(scopes, issues, records);
    this.publication.publish(new KernelPublicationPlan(
      new KernelStoreBatch(
        result.records,
        `framework-service-customization:${configuration.project.projectKey}`,
      ),
      publishProductDetails(ConfigurationProductDetails.Issue, result.issues),
    ));
    return result;
  }
}

class RegisteredAppTaskCohort {
  constructor(
    readonly container: Container,
    readonly registrations: readonly RegisteredAppTask[],
  ) {}
}

function registeredAppTaskCohortForContainer(
  registrations: readonly RegisteredAppTask[],
  targetContainer: Container,
): RegisteredAppTaskCohort | null {
  let container: Container | null = targetContainer;
  while (container != null) {
    const selected = registrations.filter((registration) =>
      registration.container.identityHandle === container?.identityHandle
    );
    if (selected.length > 0) {
      return new RegisteredAppTaskCohort(container, selected);
    }
    container = container.parent;
  }
  return null;
}

function executeRegisteredAppTaskServiceCustomizations(
  registration: RegisteredAppTask,
  evaluatedSourcesByFileName: ReadonlyMap<string, EvaluatedProjectSource>,
  sourceFileAddressHandlesByFileName: ReadonlyMap<string, AddressHandle>,
  draft: FrameworkServiceCustomizationDraft,
): void {
  const evaluation = registration.evaluation;
  const callback = evaluation?.callback?.value;
  if (evaluation == null || callback?.kind !== EvaluationValueKind.Function) {
    return;
  }
  const evaluationSource = evaluatedSourcesByFileName.get(
    normalizeConfigurationSourceFileName(callback.declaration.getSourceFile().fileName),
  ) ?? null;
  if (evaluationSource == null) {
    return;
  }
  const context = new ConfigurationRecognitionContext(
    evaluationSource.sourceFile,
    evaluationSource.moduleKey,
    evaluationSource.admission.projectKey,
    evaluationSource.admission.addressHandle,
    evaluationSource.evaluation,
    new StaticSourceLiteralExpressionReader(),
    null,
    sourceFileAddressHandlesByFileName,
  );
  executeAppTaskServiceCustomizations(
    context,
    evaluation,
    callback,
    draft,
  );
}

function executeAppTaskServiceCustomizations(
  context: ConfigurationRecognitionContext,
  appTask: AureliaAppTaskEvaluation,
  callback: EvaluationFunctionValue,
  draft: FrameworkServiceCustomizationDraft,
): void {
  const callbackTarget = appTaskCallbackTarget(appTask);
  if (callbackTarget == null) {
    return;
  }
  const session = new StaticEvaluationSessionFork(context.evaluation.runtimeHost);
  const evaluation = session.forkModuleEvaluation(context.evaluation);
  const executableCallback = session.forkValue(callback);
  const services = new FrameworkServiceExecutionValues(
    executableCallback.declaration,
    evaluation.runtimeHost,
    draft.nodeObserverLocatorAllowDirtyCheck ?? true,
    draft.runtimeKeyMapping,
  );
  const callbackArgument = services.callbackArgument(callbackTarget);
  const handledServices = new Map<StaticInvocationFrame['identity'], FrameworkServiceKind>();
  const runtimeHost = delegateStaticEvaluationRuntimeHost(
    evaluation.runtimeHost,
    (frame, host) => evaluateFrameworkServiceInvocation(frame, host, services, handledServices),
  );
  const execution = executeStaticFunctionEffects(
    executableCallback,
    executableCallback.declaration,
    evaluation.policy,
    runtimeHost,
    [callbackArgument],
  );

  for (const invocation of execution.invocations) {
    const service = handledServices.get(invocation.identity);
    if (service == null || !ts.isCallExpression(invocation.node) || invocation.propertyKey == null) {
      continue;
    }
    const reader = new StaticInvocationEvidenceExpressionReader(invocation.moduleKey, [invocation]);
    switch (service) {
      case FrameworkServiceKind.AttrMapper:
        recognizeAttrMapperCall(context, invocation.propertyKey, invocation.node, reader, draft);
        break;
      case FrameworkServiceKind.NodeObserverLocator:
        recognizeNodeObserverLocatorCall(context, invocation.propertyKey, invocation.node, reader, draft);
        break;
      case FrameworkServiceKind.KeyMapping:
        break;
    }
  }

  const read = new EvaluationRead(
    execution.value,
    executableCallback.declaration,
    execution.openSeams,
    execution.abruptCompletion,
  );
  draft.addEvaluationPressure(
    context,
    read,
    executableCallback.declaration,
    'Framework-service AppTask execution retained open or abrupt static-evaluation pressure.',
  );
  publishFrameworkServiceMutations(
    context,
    services,
    execution.openSeams.length === 0 && execution.abruptCompletion == null,
    draft,
  );
}

function recognizeAttrMapperCall(
  context: ConfigurationRecognitionContext,
  methodName: string,
  call: ts.CallExpression,
  reader: StaticExpressionEvaluationReader,
  draft: FrameworkServiceCustomizationDraft,
): void {
  switch (methodName) {
    case 'useTwoWay': {
      const argument = call.arguments[0];
      if (argument == null || ts.isSpreadElement(argument)) {
        draft.addDomainPressure(
          context,
          argument ?? call,
          'Attribute-mapper useTwoWay did not expose one direct predicate.',
          [],
        );
        return;
      }
      const read = readTwoWayRule(argument, reader);
      for (const evaluation of read.evaluations) {
        draft.addEvaluationPressure(
          context,
          evaluation,
          evaluation.node ?? argument,
          'Attribute-mapper two-way predicate retained open or abrupt static-evaluation pressure.',
        );
      }
      if (read.rule != null) {
        draft.attributeTwoWayRules.push(read.rule);
      } else {
        draft.addDomainPressure(
          context,
          argument,
          'Attribute-mapper useTwoWay predicate could not be reduced without widening its runtime behavior.',
          [],
        );
      }
      return;
    }
    case 'useMapping':
      if (call.arguments[0] != null && !ts.isSpreadElement(call.arguments[0])) {
        addAttributeMappingsFromRead(
          context,
          call,
          call.arguments[0],
          readAttributeMappings(call.arguments[0], reader, false),
          draft,
        );
      } else {
        draft.addDomainPressure(
          context,
          call.arguments[0] ?? call,
          'Attribute-mapper useMapping did not expose one direct mapping object.',
          [],
        );
      }
      return;
    case 'useGlobalMapping':
      if (call.arguments[0] != null && !ts.isSpreadElement(call.arguments[0])) {
        addAttributeMappingsFromRead(
          context,
          call,
          call.arguments[0],
          readAttributeMappings(call.arguments[0], reader, true),
          draft,
        );
      } else {
        draft.addDomainPressure(
          context,
          call.arguments[0] ?? call,
          'Attribute-mapper useGlobalMapping did not expose one direct mapping object.',
          [],
        );
      }
      return;
  }
}

function addAttributeMappingsFromRead(
  context: ConfigurationRecognitionContext,
  call: ts.CallExpression,
  argument: ts.Expression,
  read: FrameworkAttributeMappingsRead,
  draft: FrameworkServiceCustomizationDraft,
): void {
  draft.addAttributeMappings(context, call, read.mappings);
  for (const evaluation of read.evaluations) {
    draft.addEvaluationPressure(
      context,
      evaluation,
      evaluation.node ?? argument,
      'Attribute-mapper mapping object retained open or abrupt static-evaluation pressure.',
    );
  }
  for (const open of read.open) {
    draft.addDomainPressure(context, open.node, open.summary, open.reasonKinds);
  }
}

function recognizeNodeObserverLocatorCall(
  context: ConfigurationRecognitionContext,
  methodName: string,
  call: ts.CallExpression,
  reader: StaticExpressionEvaluationReader,
  draft: FrameworkServiceCustomizationDraft,
): void {
  switch (methodName) {
    case 'useConfig': {
      const read = nodeObserverNodeConfigsFromUseConfigCall(call, reader);
      publishNodeObserverReadPressure(context, call, read, draft);
      for (const config of read.values) {
        draft.addNodeConfig(context, call, config);
      }
      return;
    }
    case 'useConfigGlobal': {
      const read = nodeObserverGlobalConfigsFromUseConfigGlobalCall(call, reader);
      publishNodeObserverReadPressure(context, call, read, draft);
      for (const config of read.values) {
        draft.addGlobalNodeConfig(context, call, config);
      }
      return;
    }
    case 'overrideAccessor': {
      const read = nodeObserverAccessorOverridesFromCall(call, reader);
      publishNodeObserverReadPressure(context, call, read, draft);
      draft.nodeAccessorOverrides.push(...read.values);
      return;
    }
    case 'overrideAccessorGlobal': {
      const read = nodeObserverGlobalAccessorOverridesFromCall(call, reader);
      publishNodeObserverReadPressure(context, call, read, draft);
      draft.globalAccessorOverrides.push(...read.values);
      return;
    }
  }
}

function publishNodeObserverReadPressure(
  context: ConfigurationRecognitionContext,
  call: ts.CallExpression,
  read: {
    readonly evaluations: readonly EvaluationRead<EvaluationValue>[];
    readonly open: readonly {
      readonly node: ts.Node;
      readonly summary: string;
      readonly reasonKinds: readonly OpenSeamReasonKind[];
    }[];
  },
  draft: FrameworkServiceCustomizationDraft,
): void {
  for (const evaluation of read.evaluations) {
    draft.addEvaluationPressure(
      context,
      evaluation,
      evaluation.node ?? call,
      'Node-observer customization retained open or abrupt static-evaluation pressure.',
    );
  }
  for (const open of read.open) {
    draft.addDomainPressure(context, open.node, open.summary, open.reasonKinds);
  }
}

const attrMapperMethodNames = new Set([
  'useTwoWay',
  'useMapping',
  'useGlobalMapping',
]);

const nodeObserverLocatorMethodNames = new Set([
  'useConfig',
  'useConfigGlobal',
  'overrideAccessor',
  'overrideAccessorGlobal',
]);

const noFrameworkServiceMethodNames = new Set<string>();

class FrameworkServiceExecutionValues {
  readonly attrMapper: EvaluationObjectValue;
  readonly nodeObserverLocator: EvaluationObjectValue;
  readonly keyMapping: EvaluationObjectValue;
  readonly container: EvaluationObjectValue;

  constructor(
    node: ts.Node,
    runtimeHost: StaticEvaluationRuntimeHost,
    allowDirtyCheck: boolean,
    runtimeKeyMapping: RuntimeKeyMappingConfiguration,
  ) {
    const graph = runtimeHost.evaluationValueGraph;
    const attrMapper = frameworkServiceValue(
      FrameworkServiceKind.AttrMapper,
      node,
      allowDirtyCheck,
    );
    const nodeObserverLocator = frameworkServiceValue(
      FrameworkServiceKind.NodeObserverLocator,
      node,
      allowDirtyCheck,
    );
    const keyMapping = frameworkKeyMappingValue(node, runtimeKeyMapping);
    const container = frameworkServiceContainerValue(node);
    this.attrMapper = graph?.retainProduced(attrMapper) ?? attrMapper;
    this.nodeObserverLocator = graph?.retainProduced(nodeObserverLocator) ?? nodeObserverLocator;
    this.keyMapping = graph?.retainProduced(keyMapping) ?? keyMapping;
    this.container = graph?.retainProduced(container) ?? container;
  }

  callbackArgument(target: AppTaskCallbackTarget): EvaluationValue {
    return target.kind === AppTaskCallbackTargetKind.Container
      ? this.container
      : this.serviceValue(target.service);
  }

  serviceValue(kind: FrameworkServiceKind): EvaluationObjectValue {
    switch (kind) {
      case FrameworkServiceKind.AttrMapper:
        return this.attrMapper;
      case FrameworkServiceKind.NodeObserverLocator:
        return this.nodeObserverLocator;
      case FrameworkServiceKind.KeyMapping:
        return this.keyMapping;
    }
  }

  serviceKindForReceiver(receiver: EvaluationValue): FrameworkServiceKind | null {
    if (evaluationValuesShareLineage(receiver, this.attrMapper)) {
      return FrameworkServiceKind.AttrMapper;
    }
    if (evaluationValuesShareLineage(receiver, this.nodeObserverLocator)) {
      return FrameworkServiceKind.NodeObserverLocator;
    }
    return evaluationValuesShareLineage(receiver, this.keyMapping)
      ? FrameworkServiceKind.KeyMapping
      : null;
  }

  isContainer(receiver: EvaluationValue): boolean {
    return evaluationValuesShareLineage(receiver, this.container);
  }
}

function frameworkServiceValue(
  kind: FrameworkServiceKind,
  node: ts.Node,
  allowDirtyCheck: boolean,
): EvaluationObjectValue {
  const methodNames = frameworkServiceMethodNames(kind);
  const properties = new Map<string, EvaluationObjectProperty>();
  for (const name of methodNames) {
    properties.set(name, new EvaluationObjectProperty(
      name,
      new EvaluationBoundaryObjectValue(
        EvaluationBoundaryKind.ExternalModule,
        `${frameworkServiceLabel(kind)}.${name}`,
        new Map(),
        node,
        true,
      ),
      null,
      EvaluationObjectPropertyState.Closed,
    ));
  }
  if (kind === FrameworkServiceKind.NodeObserverLocator) {
    properties.set('allowDirtyCheck', new EvaluationObjectProperty(
      'allowDirtyCheck',
      new EvaluationBooleanValue(allowDirtyCheck, node),
      null,
      EvaluationObjectPropertyState.Closed,
    ));
  }
  return new EvaluationObjectValue(properties, false, node);
}

function frameworkKeyMappingValue(
  node: ts.Node,
  configuration: RuntimeKeyMappingConfiguration,
): EvaluationObjectValue {
  const meta = new EvaluationArrayValue(
    configuration.meta.map((entry, index) => new EvaluationArrayElement(
      new EvaluationStringValue(entry.runtimeName, null),
      null,
      [],
      index,
    )),
    node,
    configuration.metaDomainClosed
      ? EvaluationArrayShape.exact(configuration.meta.length)
      : EvaluationArrayShape.from({
          exactLength: null,
          hasExactElements: false,
          hasExactOrder: false,
          uncertainties: [],
          extentOpenSeams: [],
          elementOpenSeams: [],
          orderOpenSeams: [],
        }),
  );
  const keys = new EvaluationObjectValue(
    new Map(configuration.keys.map((entry) => [
      entry.modifier,
      new EvaluationObjectProperty(
        entry.modifier,
        new EvaluationStringValue(entry.runtimeName, null),
        null,
        EvaluationObjectPropertyState.Closed,
      ),
    ])),
    !configuration.keyDomainClosed,
    node,
  );
  return new EvaluationObjectValue(new Map([
    ['meta', new EvaluationObjectProperty(
      'meta',
      meta,
      null,
      EvaluationObjectPropertyState.Closed,
    )],
    ['keys', new EvaluationObjectProperty(
      'keys',
      keys,
      null,
      EvaluationObjectPropertyState.Closed,
    )],
  ]), false, node);
}

function frameworkServiceContainerValue(node: ts.Node): EvaluationObjectValue {
  return new EvaluationObjectValue(new Map([
    ['get', new EvaluationObjectProperty(
      'get',
      new EvaluationBoundaryObjectValue(
        EvaluationBoundaryKind.ExternalModule,
        'IContainer.get',
        new Map(),
        node,
        true,
      ),
      null,
      EvaluationObjectPropertyState.Closed,
    )],
  ]), false, node);
}

function evaluateFrameworkServiceInvocation(
  frame: StaticInvocationFrame,
  host: StaticIntrinsicEvaluationHost,
  services: FrameworkServiceExecutionValues,
  handledServices: Map<StaticInvocationFrame['identity'], FrameworkServiceKind>,
): StaticInvocationDispatch {
  if (
    frame.kind !== StaticInvocationKind.Call
    || !ts.isCallExpression(frame.node)
    || frame.thisValue == null
    || frame.propertyKey == null
  ) {
    return StaticInvocationNotApplicable;
  }
  const receiver = frame.thisValue.value;
  if (services.isContainer(receiver)) {
    if (frame.propertyKey !== 'get') {
      return staticInvocationValue(host.unknown(
        `Framework-service AppTask called unsupported IContainer.${frame.propertyKey}(...).`,
        frame.node,
        frame.moduleKey,
        EvaluationOpenSeamKind.DynamicCall,
      ));
    }
    if (host.checkpoint().openSeamCount > 0) {
      return staticInvocationValue(EvaluationUndefined);
    }
    const argument = frame.argumentList.exactEvidence()?.[0] ?? null;
    const argumentNode = frame.argumentList.authoredArguments[0]?.valueExpression ?? frame.node;
    const service = argument == null
      ? null
      : serviceKindForKeyValue(argument.value, argumentNode);
    return service == null
      ? staticInvocationValue(host.unknown(
          'Framework-service AppTask container.get(...) key did not resolve to a modeled framework service.',
          frame.node,
          frame.moduleKey,
          EvaluationOpenSeamKind.DynamicCall,
        ))
      : staticInvocationValue(services.serviceValue(service));
  }

  const service = services.serviceKindForReceiver(receiver);
  if (service == null) {
    return StaticInvocationNotApplicable;
  }
  if (host.checkpoint().openSeamCount > 0) {
    return staticInvocationValue(EvaluationUndefined);
  }
  if (!frameworkServiceMethodNames(service).has(frame.propertyKey)) {
    return staticInvocationValue(host.unknown(
      `Framework-service AppTask called unsupported ${frameworkServiceLabel(service)}.${frame.propertyKey}(...).`,
      frame.node,
      frame.moduleKey,
      EvaluationOpenSeamKind.DynamicCall,
    ));
  }
  handledServices.set(frame.identity, service);
  return staticInvocationValue(EvaluationUndefined);
}

function publishFrameworkServiceMutations(
  context: ConfigurationRecognitionContext,
  services: FrameworkServiceExecutionValues,
  executionClosed: boolean,
  draft: FrameworkServiceCustomizationDraft,
): void {
  publishFrameworkServiceObjectMutations(
    context,
    FrameworkServiceKind.AttrMapper,
    services.attrMapper,
    executionClosed,
    draft,
  );
  publishFrameworkServiceObjectMutations(
    context,
    FrameworkServiceKind.NodeObserverLocator,
    services.nodeObserverLocator,
    executionClosed,
    draft,
  );
  draft.runtimeKeyMapping = readRuntimeKeyMappingConfiguration(
    context,
    services.keyMapping,
    draft.runtimeKeyMapping,
    draft,
  );
  for (const property of services.container.properties.values()) {
    if (property.node != null) {
      draft.addDomainPressure(
        context,
        property.node,
        `Framework-service AppTask mutated unsupported IContainer.${property.name}.`,
        frameworkServiceReasonKindsForValue(property.value, property.openSeams),
      );
    }
  }
}

function readRuntimeKeyMappingConfiguration(
  context: ConfigurationRecognitionContext,
  service: EvaluationObjectValue,
  previous: RuntimeKeyMappingConfiguration,
  draft: FrameworkServiceCustomizationDraft,
): RuntimeKeyMappingConfiguration {
  const meta = readRuntimeMetaMappingEntries(
    context,
    service.properties.get('meta')?.value ?? null,
    previous.meta,
    draft,
  );
  const keys = readRuntimeKeyMappingEntries(
    context,
    service.properties.get('keys')?.value ?? null,
    previous.keys,
    draft,
  );
  return new RuntimeKeyMappingConfiguration(
    meta.entries,
    keys.entries,
    meta.domainClosed,
    keys.domainClosed,
  );
}

class RuntimeKeyMappingEntryRead {
  constructor(
    readonly entries: readonly RuntimeKeyMappingEntry[],
    readonly domainClosed: boolean,
  ) {}
}

function readRuntimeMetaMappingEntries(
  context: ConfigurationRecognitionContext,
  value: EvaluationValue | null,
  previous: readonly RuntimeKeyMappingEntry[],
  draft: FrameworkServiceCustomizationDraft,
): RuntimeKeyMappingEntryRead {
  if (value?.kind !== EvaluationValueKind.Array) {
    if (value != null) {
      draft.addDomainPressure(
        context,
        value.node ?? context.sourceFile,
        'IKeyMapping.meta did not reduce to an array of modifier names.',
        frameworkServiceReasonKindsForValue(value, []),
      );
    }
    return new RuntimeKeyMappingEntryRead([], false);
  }
  const enumerable = readEvaluationEnumerableOwnEntries(value);
  if (enumerable == null) {
    return new RuntimeKeyMappingEntryRead([], false);
  }
  const entries: RuntimeKeyMappingEntry[] = [];
  let domainClosed = !enumerable.mayHaveUnknownEntries && !enumerable.mayHaveUnknownOrder;
  for (const entry of enumerable.entries) {
    const runtimeName = readStaticStringValue(entry.value);
    if (runtimeName == null) {
      domainClosed = false;
      draft.addDomainPressure(
        context,
        entry.sourceNode ?? value.node ?? context.sourceFile,
        'IKeyMapping.meta entry did not reduce to a string.',
        frameworkServiceReasonKindsForValue(entry.value, entry.openSeams),
      );
      continue;
    }
    entries.push(runtimeKeyMappingEntry(
      context,
      runtimeName,
      runtimeName,
      entry.sourceNode,
      previous,
      draft,
    ));
  }
  return new RuntimeKeyMappingEntryRead(entries, domainClosed);
}

function readRuntimeKeyMappingEntries(
  context: ConfigurationRecognitionContext,
  value: EvaluationValue | null,
  previous: readonly RuntimeKeyMappingEntry[],
  draft: FrameworkServiceCustomizationDraft,
): RuntimeKeyMappingEntryRead {
  const enumerable = readEvaluationEnumerableOwnEntries(value);
  if (enumerable == null) {
    if (value != null) {
      draft.addDomainPressure(
        context,
        value.node ?? context.sourceFile,
        'IKeyMapping.keys did not expose enumerable own entries.',
        frameworkServiceReasonKindsForValue(value, []),
      );
    }
    return new RuntimeKeyMappingEntryRead([], false);
  }
  const entries: RuntimeKeyMappingEntry[] = [];
  let domainClosed = !enumerable.mayHaveUnknownEntries && !enumerable.mayHaveUnknownOrder;
  for (const entry of enumerable.entries) {
    const runtimeName = readStaticStringValue(entry.value);
    if (runtimeName == null) {
      domainClosed = false;
      draft.addDomainPressure(
        context,
        entry.sourceNode ?? value?.node ?? context.sourceFile,
        `IKeyMapping.keys['${entry.name}'] did not reduce to a string.`,
        frameworkServiceReasonKindsForValue(entry.value, entry.openSeams),
      );
      continue;
    }
    entries.push(runtimeKeyMappingEntry(
      context,
      entry.name,
      runtimeName,
      entry.sourceNode,
      previous,
      draft,
    ));
  }
  return new RuntimeKeyMappingEntryRead(entries, domainClosed);
}

function runtimeKeyMappingEntry(
  context: ConfigurationRecognitionContext,
  modifier: string,
  runtimeName: string,
  sourceNode: ts.Node | null,
  previous: readonly RuntimeKeyMappingEntry[],
  draft: FrameworkServiceCustomizationDraft,
): RuntimeKeyMappingEntry {
  if (sourceNode == null) {
    return previous.find((entry) =>
      entry.modifier === modifier && entry.runtimeName === runtimeName
    ) ?? new RuntimeKeyMappingEntry(modifier, runtimeName);
  }
  const source = draft.sourceForRuntimeKeyMappingEntry(context, sourceNode, modifier);
  return new RuntimeKeyMappingEntry(
    modifier,
    runtimeName,
    source.sourceAddressHandle,
    source.provenanceHandle,
  );
}

function publishFrameworkServiceObjectMutations(
  context: ConfigurationRecognitionContext,
  kind: FrameworkServiceKind,
  service: EvaluationObjectValue,
  executionClosed: boolean,
  draft: FrameworkServiceCustomizationDraft,
): void {
  for (const property of service.properties.values()) {
    if (property.node == null) {
      continue;
    }
    if (kind === FrameworkServiceKind.NodeObserverLocator && property.name === 'allowDirtyCheck') {
      if (!executionClosed) {
        continue;
      }
      if (property.value.kind === EvaluationValueKind.Boolean) {
        draft.nodeObserverLocatorAllowDirtyCheck = property.value.value;
      } else {
        draft.addDomainPressure(
          context,
          property.node,
          'Node-observer allowDirtyCheck assignment did not reduce to a boolean value.',
          frameworkServiceReasonKindsForValue(property.value, property.openSeams),
        );
      }
      continue;
    }
    draft.addDomainPressure(
      context,
      property.node,
      `Framework-service AppTask mutated unsupported ${frameworkServiceLabel(kind)}.${property.name}.`,
      frameworkServiceReasonKindsForValue(property.value, property.openSeams),
    );
  }
}

function frameworkServiceMethodNames(kind: FrameworkServiceKind): ReadonlySet<string> {
  switch (kind) {
    case FrameworkServiceKind.AttrMapper:
      return attrMapperMethodNames;
    case FrameworkServiceKind.NodeObserverLocator:
      return nodeObserverLocatorMethodNames;
    case FrameworkServiceKind.KeyMapping:
      return noFrameworkServiceMethodNames;
  }
}

function frameworkServiceLabel(kind: FrameworkServiceKind): string {
  switch (kind) {
    case FrameworkServiceKind.AttrMapper:
      return 'IAttrMapper';
    case FrameworkServiceKind.NodeObserverLocator:
      return 'NodeObserverLocator';
    case FrameworkServiceKind.KeyMapping:
      return 'IKeyMapping';
  }
}

function appTaskCallbackTarget(appTask: AureliaAppTaskEvaluation): AppTaskCallbackTarget | null {
  const keyExpression = appTask.keyExpression;
  if (keyExpression == null) {
    return null;
  }
  const service = serviceKindForKeyValue(appTask.key?.value ?? null, keyExpression);
  if (service != null) {
    return {
      kind: AppTaskCallbackTargetKind.FrameworkService,
      service,
    };
  }
  return keyNameForValue(appTask.key?.value ?? null, keyExpression) === 'IContainer'
    ? { kind: AppTaskCallbackTargetKind.Container }
    : null;
}

function serviceKindForKeyValue(
  value: EvaluationValue | null,
  expression: ts.Expression,
): FrameworkServiceKind | null {
  const name = keyNameForValue(value, expression);
  switch (name) {
    case 'IAttrMapper':
    case 'AttrMapper':
      return FrameworkServiceKind.AttrMapper;
    case 'INodeObserverLocator':
    case 'NodeObserverLocator':
      return FrameworkServiceKind.NodeObserverLocator;
    case 'IKeyMapping':
      return FrameworkServiceKind.KeyMapping;
    default:
      return null;
  }
}

function keyNameForValue(value: EvaluationValue | null, expression: ts.Expression): string | null {
  const interfaceEvaluation = aureliaInterfaceEvaluationForValue(value);
  if (interfaceEvaluation != null) {
    return interfaceEvaluation.friendlyName;
  }
  const sourceNode = value?.node ?? null;
  if (sourceNode != null) {
    if (ts.isImportSpecifier(sourceNode)) {
      return (sourceNode.propertyName ?? sourceNode.name).text;
    }
    if (ts.isImportClause(sourceNode) && sourceNode.name != null) {
      return sourceNode.name.text;
    }
    if (ts.isExpression(sourceNode)) {
      const sourceName = readReferenceName(sourceNode);
      if (sourceName != null) {
        return sourceName;
      }
    }
  }
  return readReferenceName(expression);
}

function readAttributeMappings(
  expression: ts.Expression,
  reader: StaticExpressionEvaluationReader,
  global: boolean,
): FrameworkAttributeMappingsRead {
  const evaluation = reader.evaluateExpression(expression);
  const value = evaluation.value;
  if (value?.kind !== EvaluationValueKind.Object) {
    return new FrameworkAttributeMappingsRead(
      [],
      [evaluation],
      value == null
        ? []
        : [new FrameworkServiceCustomizationOpen(
            expression,
            'Attribute-mapper mapping argument did not reduce to an object value.',
            openSeamReasonKindsForEvaluationRead(evaluation),
          )],
    );
  }
  const entries = readEvaluationEnumerableOwnEntries(value);
  if (entries == null) {
    return new FrameworkAttributeMappingsRead(
      [],
      [evaluation],
      [new FrameworkServiceCustomizationOpen(
        expression,
        'Attribute-mapper mapping argument did not expose enumerable own entries.',
        openSeamReasonKindsForEvaluationRead(evaluation),
      )],
    );
  }
  if (global) {
    const mappings: AttributeMapperMapping[] = [];
    const open: FrameworkServiceCustomizationOpen[] = [];
    if (entries.mayHaveUnknownEntries || entries.mayHaveUnknownOrder) {
      open.push(new FrameworkServiceCustomizationOpen(
        expression,
        'Attribute-mapper global mappings may contain additional attributes or a runtime-dependent contribution order.',
        frameworkServiceReasonKindsForValue(value, []),
      ));
    }
    for (const entry of entries.entries) {
      if (entry.property?.state === EvaluationObjectPropertyState.Open) {
        open.push(new FrameworkServiceCustomizationOpen(
          entry.sourceNode ?? expression,
          `Attribute-mapper global mapping '${entry.name}' may be replaced by an unknown property contribution.`,
          frameworkServiceReasonKindsForValue(entry.value, entry.openSeams),
        ));
        continue;
      }
      const propertyName = readStaticStringValue(entry.value);
      if (propertyName == null) {
        open.push(new FrameworkServiceCustomizationOpen(
          entry.sourceNode ?? expression,
          `Attribute-mapper global mapping '${entry.name}' did not reduce to a string.`,
          frameworkServiceReasonKindsForValue(entry.value, entry.openSeams),
        ));
        continue;
      }
      mappings.push(new AttributeMapperMapping(null, entry.name, propertyName));
    }
    return new FrameworkAttributeMappingsRead(
      mappings,
      open.length === 0 ? [] : [evaluation],
      open,
    );
  }

  const mappings: AttributeMapperMapping[] = [];
  const open: FrameworkServiceCustomizationOpen[] = [];
  if (entries.mayHaveUnknownEntries || entries.mayHaveUnknownOrder) {
    open.push(new FrameworkServiceCustomizationOpen(
      expression,
      'Attribute-mapper mappings may contain additional tags or a runtime-dependent contribution order.',
      frameworkServiceReasonKindsForValue(value, []),
    ));
  }
  for (const tagEntry of entries.entries) {
    if (tagEntry.property?.state === EvaluationObjectPropertyState.Open) {
      open.push(new FrameworkServiceCustomizationOpen(
        tagEntry.sourceNode ?? expression,
        `Attribute-mapper mappings for '${tagEntry.name}' may be replaced by an unknown property contribution.`,
        frameworkServiceReasonKindsForValue(tagEntry.value, tagEntry.openSeams),
      ));
      continue;
    }
    if (tagEntry.value.kind !== EvaluationValueKind.Object) {
      open.push(new FrameworkServiceCustomizationOpen(
        tagEntry.sourceNode ?? expression,
        `Attribute-mapper mappings for '${tagEntry.name}' did not reduce to an object value.`,
        frameworkServiceReasonKindsForValue(tagEntry.value, tagEntry.openSeams),
      ));
      continue;
    }
    const tagMappings = readEvaluationEnumerableOwnEntries(tagEntry.value);
    if (tagMappings == null) {
      open.push(new FrameworkServiceCustomizationOpen(
        tagEntry.sourceNode ?? expression,
        `Attribute-mapper mappings for '${tagEntry.name}' did not expose enumerable own entries.`,
        frameworkServiceReasonKindsForValue(tagEntry.value, tagEntry.openSeams),
      ));
      continue;
    }
    if (tagMappings.mayHaveUnknownEntries || tagMappings.mayHaveUnknownOrder) {
      open.push(new FrameworkServiceCustomizationOpen(
        tagEntry.sourceNode ?? expression,
        `Attribute-mapper mappings for '${tagEntry.name}' may contain additional attributes or a runtime-dependent contribution order.`,
        frameworkServiceReasonKindsForValue(tagEntry.value, tagEntry.openSeams),
      ));
    }
    for (const entry of tagMappings.entries) {
      if (entry.property?.state === EvaluationObjectPropertyState.Open) {
        open.push(new FrameworkServiceCustomizationOpen(
          entry.sourceNode ?? tagEntry.sourceNode ?? expression,
          `Attribute-mapper mapping '${tagEntry.name}.${entry.name}' may be replaced by an unknown property contribution.`,
          frameworkServiceReasonKindsForValue(entry.value, entry.openSeams),
        ));
        continue;
      }
      const propertyName = readStaticStringValue(entry.value);
      if (propertyName != null) {
        mappings.push(new AttributeMapperMapping(tagEntry.name, entry.name, propertyName));
      } else {
        open.push(new FrameworkServiceCustomizationOpen(
          entry.sourceNode ?? tagEntry.sourceNode ?? expression,
          `Attribute-mapper mapping '${tagEntry.name}.${entry.name}' did not reduce to a string.`,
          frameworkServiceReasonKindsForValue(entry.value, entry.openSeams),
        ));
      }
    }
  }
  return new FrameworkAttributeMappingsRead(
    mappings,
    open.length === 0 ? [] : [evaluation],
    open,
  );
}

class FrameworkAttributeMappingsRead {
  constructor(
    readonly mappings: readonly AttributeMapperMapping[],
    readonly evaluations: readonly EvaluationRead<EvaluationValue>[],
    readonly open: readonly FrameworkServiceCustomizationOpen[],
  ) {}
}

class FrameworkServiceCustomizationOpen {
  constructor(
    readonly node: ts.Node,
    readonly summary: string,
    readonly reasonKinds: readonly OpenSeamReasonKind[],
  ) {}
}

function frameworkServiceReasonKindsForValue(
  value: EvaluationValue,
  openSeams: readonly EvaluationOpenSeam[],
): readonly OpenSeamReasonKind[] {
  return [...new Set([
    ...openSeamReasonKindsForEvaluationValue(value),
    ...openSeamReasonKindsForEvaluationPressure(openSeams, null),
  ])];
}

function readTwoWayRule(
  expression: ts.Expression,
  reader: StaticExpressionEvaluationReader,
): FrameworkTwoWayRuleRead {
  const evaluations: EvaluationRead<EvaluationValue>[] = [];
  const current = unwrapExpression(expression);
  if (!ts.isArrowFunction(current) && !ts.isFunctionExpression(current)) {
    return new FrameworkTwoWayRuleRead(null, evaluations);
  }
  const elementParameter = parameterIdentifierName(current.parameters[0]);
  const propertyParameter = parameterIdentifierName(current.parameters[1]);
  if (elementParameter == null && propertyParameter == null) {
    return new FrameworkTwoWayRuleRead(null, evaluations);
  }
  const bodyExpression = functionReturnExpression(current);
  if (bodyExpression == null) {
    return new FrameworkTwoWayRuleRead(null, evaluations);
  }
  const facts = readTwoWayPredicateFacts(
    bodyExpression,
    reader,
    elementParameter,
    propertyParameter,
    evaluations,
  );
  return new FrameworkTwoWayRuleRead(
    facts == null || (facts.tagName == null && facts.propertyName == null)
      ? null
      : new AttributeMapperTwoWayRule(facts.tagName, facts.propertyName),
    evaluations,
  );
}

class FrameworkTwoWayRuleRead {
  constructor(
    readonly rule: AttributeMapperTwoWayRule | null,
    readonly evaluations: readonly EvaluationRead<EvaluationValue>[],
  ) {}
}

function functionReturnExpression(
  fn: ts.ArrowFunction | ts.FunctionExpression,
): ts.Expression | null {
  if (ts.isExpression(fn.body)) {
    return fn.body;
  }
  for (const statement of fn.body.statements) {
    if (ts.isReturnStatement(statement) && statement.expression != null) {
      return statement.expression;
    }
  }
  return null;
}

function readTwoWayPredicateFacts(
  expression: ts.Expression,
  reader: StaticExpressionEvaluationReader,
  elementParameter: string | null,
  propertyParameter: string | null,
  evaluations: EvaluationRead<EvaluationValue>[],
): { readonly tagName: string | null; readonly propertyName: string | null } | null {
  const current = unwrapExpression(expression);
  if (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
    const left = readTwoWayPredicateFacts(current.left, reader, elementParameter, propertyParameter, evaluations);
    const right = readTwoWayPredicateFacts(current.right, reader, elementParameter, propertyParameter, evaluations);
    // Spending only part of a conjunction would widen the runtime predicate.
    if (
      left == null
      || right == null
      || (left.tagName != null && right.tagName != null && left.tagName !== right.tagName)
      || (left.propertyName != null && right.propertyName != null && left.propertyName !== right.propertyName)
    ) {
      return null;
    }
    return {
      tagName: left.tagName ?? right.tagName,
      propertyName: left.propertyName ?? right.propertyName,
    };
  }
  if (!ts.isBinaryExpression(current) || !isEqualityOperator(current.operatorToken.kind)) {
    return null;
  }
  return readTwoWayEqualityFact(current.left, current.right, reader, elementParameter, propertyParameter, evaluations)
    ?? readTwoWayEqualityFact(current.right, current.left, reader, elementParameter, propertyParameter, evaluations);
}

function readTwoWayEqualityFact(
  subject: ts.Expression,
  value: ts.Expression,
  reader: StaticExpressionEvaluationReader,
  elementParameter: string | null,
  propertyParameter: string | null,
  evaluations: EvaluationRead<EvaluationValue>[],
): { readonly tagName: string | null; readonly propertyName: string | null } | null {
  const current = unwrapExpression(subject);
  if (propertyParameter != null && ts.isIdentifier(current) && current.text === propertyParameter) {
    const propertyName = readStaticString(value, reader, evaluations);
    return propertyName == null ? null : { tagName: null, propertyName };
  }
  if (
    elementParameter != null
    && ts.isPropertyAccessExpression(current)
    && (current.name.text === 'tagName' || current.name.text === 'nodeName')
    && ts.isIdentifier(unwrapExpression(current.expression))
    && (unwrapExpression(current.expression) as ts.Identifier).text === elementParameter
  ) {
    const tagName = readStaticString(value, reader, evaluations);
    return tagName == null ? null : { tagName, propertyName: null };
  }
  return null;
}

function readStaticString(
  expression: ts.Expression,
  reader: StaticExpressionEvaluationReader,
  evaluations: EvaluationRead<EvaluationValue>[],
): string | null {
  const literalValue = readStaticSourceLiteralValue(expression);
  if (literalValue != null) {
    return readStaticStringValue(literalValue);
  }
  const read = reader.evaluateExpression(expression);
  evaluations.push(read);
  return read.value == null ? null : readStaticStringValue(read.value);
}

function parameterIdentifierName(parameter: ts.ParameterDeclaration | undefined): string | null {
  return parameter != null && ts.isIdentifier(parameter.name)
    ? parameter.name.text
    : null;
}

function isEqualityOperator(kind: ts.SyntaxKind): boolean {
  return kind === ts.SyntaxKind.EqualsEqualsEqualsToken
    || kind === ts.SyntaxKind.EqualsEqualsToken;
}

function nodeConfigKey(tagName: string, propertyName: string): string {
  return `${tagName}:${propertyName}`;
}

function attrMappingKey(tagName: string, attributeName: string): string {
  return `${tagName}:${attributeName}`;
}
