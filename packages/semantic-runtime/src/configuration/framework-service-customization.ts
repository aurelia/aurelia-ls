import ts from 'typescript';
import {
  openSeamReasonKindsForEvaluationPressure,
  openSeamReasonKindsForEvaluationRead,
  openSeamReasonKindsForEvaluationValue,
} from '../evaluation/boundary-open-reason.js';
import {
  EvaluationRead,
  readStaticStringValue,
  StaticEvaluationExpressionReader,
} from '../evaluation/expression-reader.js';
import { readEvaluationEnumerableOwnEntries } from '../evaluation/enumerable-own-properties.js';
import {
  EvaluationObjectPropertyState,
  EvaluationValueKind,
  type EvaluationValue,
} from '../evaluation/values.js';
import type { EvaluationOpenSeam } from '../evaluation/seams.js';
import {
  isEvaluatedProjectSource,
} from '../evaluation/project-evaluation.js';
import {
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
import {
  AttributeMapperConfiguration,
  AttributeMapperMapping,
  AttributeMapperTwoWayRule,
} from '../template/attribute-mapper.js';
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
  type AppTaskObservation,
  type ConfigurationCallbackObservation,
} from './configuration-observation.js';
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

const enum FrameworkServiceKind {
  AttrMapper = 'attr-mapper',
  NodeObserverLocator = 'node-observer-locator',
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

export class FrameworkServiceCustomizationProjectResult {
  constructor(
    readonly attributeMapper: AttributeMapperConfiguration,
    readonly nodeObserverLocator: NodeObserverLocatorConfiguration,
    readonly issues: readonly ConfigurationIssue[] = [],
    readonly records: readonly KernelStoreRecord[] = [],
  ) {}

  get isEmpty(): boolean {
    return this.attributeMapper.isEmpty
      && this.nodeObserverLocator.isEmpty
      && this.issues.length === 0
      && this.records.length === 0;
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

  private readonly nodeConfigKeys = new Set<string>(builtInNodeObserverConfigKeys);
  private readonly globalNodeConfigKeys = new Set<string>(builtInGlobalNodeObserverConfigKeys);
  private readonly attributeMappingKeys = new Set<string>(builtInAttributeMappingKeys);
  private readonly globalAttributeMappingKeys = new Set<string>(builtInGlobalAttributeMappingKeys);
  private issueOrdinal = 0;
  private openOrdinal = 0;

  constructor(
    private readonly issuePublisher: ConfigurationIssuePublisher,
    private readonly configurationPublication: ConfigurationKernelPublication,
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

  toResult(): FrameworkServiceCustomizationProjectResult {
    return new FrameworkServiceCustomizationProjectResult(
      new AttributeMapperConfiguration(this.attributeMappings, this.attributeTwoWayRules),
      new NodeObserverLocatorConfiguration(
        this.nodeConfigs,
        this.globalNodeConfigs,
        this.nodeAccessorOverrides,
        this.globalAccessorOverrides,
        this.nodeObserverLocatorAllowDirtyCheck,
      ),
      this.issues,
      this.records,
    );
  }

  private addOpenSeams(
    context: ConfigurationRecognitionContext,
    node: ts.Node,
    seams: readonly ConfigurationRecognitionOpen[],
  ): void {
    if (seams.length === 0) {
      return;
    }
    const local = `framework-service-customization:${projectModuleSourceNodeOrdinalLocalKey({
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
    const local = `configuration-issue:${projectModuleSourceNodeOrdinalLocalKey({
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
    const local = `configuration-issue:${projectModuleSourceNodeOrdinalLocalKey({
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
 * This is intentionally source-shaped rather than an arbitrary callback interpreter: the framework service owns the
 * runtime state, while this recognizer admits only configuration calls whose arguments close through static evaluation.
 */
export class FrameworkServiceCustomizationRecognitionPass {
  constructor(
    private readonly store: KernelStore,
    private readonly publication: KernelPublicationContext,
  ) {}

  recognize(configuration: ConfigurationRecognitionProjectResult): FrameworkServiceCustomizationProjectResult {
    const draft = new FrameworkServiceCustomizationDraft(
      new ConfigurationIssuePublisher(this.store),
      new ConfigurationKernelPublication(this.store),
    );
    const evaluatedByAdmission = new Map(
      configuration.evaluation.readEvaluatedSources().map((source) => [source.admission.addressHandle, source]),
    );
    const sourceFileAddressHandlesByFileName = readSourceFileAddressHandlesByFileName(configuration.evaluation);
    for (const source of configuration.sources) {
      const evaluated = evaluatedByAdmission.get(source.admission.addressHandle);
      if (evaluated == null) {
        continue;
      }
      const evaluationSource = configuration.evaluation.sources.find((candidate) =>
        candidate.admission.addressHandle === source.admission.addressHandle
      ) ?? null;
      if (evaluationSource == null || !isEvaluatedProjectSource(evaluationSource)) {
        continue;
      }
      const context = new ConfigurationRecognitionContext(
        evaluationSource.sourceFile,
        evaluationSource.moduleKey,
        evaluationSource.admission.projectKey,
        evaluationSource.admission.addressHandle,
        evaluationSource.evaluation,
        null,
        sourceFileAddressHandlesByFileName,
      );
      const reader = new StaticEvaluationExpressionReader(
        evaluated.evaluation.environment,
        evaluated.evaluation.moduleKey,
        evaluated.evaluation.policy,
        evaluated.evaluation.runtimeHost,
      );
      for (const observation of source.observations) {
        for (const step of observation.steps) {
          for (const appTask of step.appTasks) {
            recognizeAppTaskServiceCustomizations(context, appTask, reader, draft);
          }
        }
      }
    }
    const result = draft.toResult();
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

function recognizeAppTaskServiceCustomizations(
  context: ConfigurationRecognitionContext,
  appTask: AppTaskObservation,
  reader: StaticEvaluationExpressionReader,
  draft: FrameworkServiceCustomizationDraft,
): void {
  const callback = callbackFunction(appTask.callback, reader);
  if (callback == null) {
    return;
  }

  const serviceLocals = new Map<string, FrameworkServiceKind>();
  const containerLocals = new Set<string>();
  const firstParameter = callback.parameters[0]?.name;
  if (firstParameter != null && ts.isIdentifier(firstParameter)) {
    const callbackTarget = appTask.keyExpression == null
      ? null
      : appTaskCallbackTargetForKeyExpression(appTask.keyExpression);
    if (callbackTarget?.kind === AppTaskCallbackTargetKind.Container) {
      containerLocals.add(firstParameter.text);
    } else if (callbackTarget?.kind === AppTaskCallbackTargetKind.FrameworkService) {
      serviceLocals.set(firstParameter.text, callbackTarget.service);
    }
  }

  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer != null) {
      const service = serviceKindForContainerGet(node.initializer, containerLocals);
      if (service != null) {
        serviceLocals.set(node.name.text, service);
      }
    }

    if (ts.isCallExpression(node)) {
      recognizeServiceMethodCall(context, node, reader, serviceLocals, containerLocals, draft);
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      recognizeServiceAssignment(context, node, reader, serviceLocals, containerLocals, draft);
    }

    ts.forEachChild(node, visit);
  };

  const body = callback.body;
  if (body != null) {
    visit(body);
  }
}

function recognizeServiceAssignment(
  context: ConfigurationRecognitionContext,
  assignment: ts.BinaryExpression,
  reader: StaticEvaluationExpressionReader,
  serviceLocals: ReadonlyMap<string, FrameworkServiceKind>,
  containerLocals: ReadonlySet<string>,
  draft: FrameworkServiceCustomizationDraft,
): void {
  const left = unwrapExpression(assignment.left);
  if (!ts.isPropertyAccessExpression(left) || left.name.text !== 'allowDirtyCheck') {
    return;
  }
  const service = serviceKindForExpression(left.expression, serviceLocals, containerLocals);
  if (service !== FrameworkServiceKind.NodeObserverLocator) {
    return;
  }
  const read = reader.evaluateExpression(assignment.right);
  draft.addEvaluationPressure(
    context,
    read,
    assignment.right,
    'Node-observer allowDirtyCheck assignment retained open or abrupt static-evaluation pressure.',
  );
  if (read.value?.kind === EvaluationValueKind.Boolean) {
    draft.nodeObserverLocatorAllowDirtyCheck = read.value.value;
  } else if (read.value != null) {
    draft.addDomainPressure(
      context,
      assignment.right,
      'Node-observer allowDirtyCheck assignment did not reduce to a boolean value.',
      [],
    );
  }
}

function callbackFunction(
  callback: ConfigurationCallbackObservation | null,
  reader: StaticEvaluationExpressionReader,
): ts.FunctionLikeDeclaration | null {
  if (callback == null) {
    return null;
  }
  const node = unwrapCallbackNode(callback.node);
  if (ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isFunctionDeclaration(node)) {
    return node;
  }
  if (!ts.isIdentifier(node)) {
    return null;
  }
  const value = reader.environment.readValue(node.text);
  return value?.kind === EvaluationValueKind.Function
    ? value.declaration
    : null;
}

function unwrapCallbackNode(node: ts.Node): ts.Node {
  return ts.isExpression(node)
    ? unwrapExpression(node)
    : node;
}

function recognizeServiceMethodCall(
  context: ConfigurationRecognitionContext,
  call: ts.CallExpression,
  reader: StaticEvaluationExpressionReader,
  serviceLocals: ReadonlyMap<string, FrameworkServiceKind>,
  containerLocals: ReadonlySet<string>,
  draft: FrameworkServiceCustomizationDraft,
): void {
  const expression = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(expression)) {
    return;
  }
  const service = serviceKindForExpression(expression.expression, serviceLocals, containerLocals);
  if (service == null) {
    return;
  }

  if (service === FrameworkServiceKind.AttrMapper) {
    recognizeAttrMapperCall(context, expression.name.text, call, reader, draft);
    return;
  }
  recognizeNodeObserverLocatorCall(context, expression.name.text, call, reader, draft);
}

function recognizeAttrMapperCall(
  context: ConfigurationRecognitionContext,
  methodName: string,
  call: ts.CallExpression,
  reader: StaticEvaluationExpressionReader,
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
  reader: StaticEvaluationExpressionReader,
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

function serviceKindForExpression(
  expression: ts.Expression,
  serviceLocals: ReadonlyMap<string, FrameworkServiceKind>,
  containerLocals: ReadonlySet<string>,
): FrameworkServiceKind | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return serviceLocals.get(current.text) ?? null;
  }
  return serviceKindForContainerGet(current, containerLocals);
}

function serviceKindForContainerGet(
  expression: ts.Expression,
  containerLocals: ReadonlySet<string>,
): FrameworkServiceKind | null {
  const current = unwrapExpression(expression);
  if (!ts.isCallExpression(current)) {
    return null;
  }
  const callee = unwrapExpression(current.expression);
  if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== 'get') {
    return null;
  }
  const receiver = unwrapExpression(callee.expression);
  if (!ts.isIdentifier(receiver) || !containerLocals.has(receiver.text)) {
    return null;
  }
  const key = current.arguments[0];
  return key == null || ts.isSpreadElement(key)
    ? null
    : serviceKindForKeyExpression(key);
}

function appTaskCallbackTargetForKeyExpression(expression: ts.Expression): AppTaskCallbackTarget | null {
  const service = serviceKindForKeyExpression(expression);
  if (service != null) {
    return {
      kind: AppTaskCallbackTargetKind.FrameworkService,
      service,
    };
  }
  return isContainerKeyExpression(expression)
    ? { kind: AppTaskCallbackTargetKind.Container }
    : null;
}

function serviceKindForKeyExpression(expression: ts.Expression): FrameworkServiceKind | null {
  const name = readReferenceName(expression);
  switch (name) {
    case 'IAttrMapper':
    case 'AttrMapper':
      return FrameworkServiceKind.AttrMapper;
    case 'INodeObserverLocator':
    case 'NodeObserverLocator':
      return FrameworkServiceKind.NodeObserverLocator;
    default:
      return null;
  }
}

function isContainerKeyExpression(expression: ts.Expression): boolean {
  return readReferenceName(expression) === 'IContainer';
}

function readAttributeMappings(
  expression: ts.Expression,
  reader: StaticEvaluationExpressionReader,
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
  reader: StaticEvaluationExpressionReader,
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
  reader: StaticEvaluationExpressionReader,
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
  reader: StaticEvaluationExpressionReader,
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
  reader: StaticEvaluationExpressionReader,
  evaluations: EvaluationRead<EvaluationValue>[],
): string | null {
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
