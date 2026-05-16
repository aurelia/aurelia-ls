import ts from 'typescript';
import {
  readStaticStringValue,
  StaticEvaluationExpressionReader,
} from '../evaluation/expression-reader.js';
import {
  EvaluationValueKind,
} from '../evaluation/values.js';
import {
  isEvaluatedProjectSource,
} from '../evaluation/project-evaluation.js';
import {
  projectModuleSourceNodeOrdinalLocalKey,
} from '../kernel/local-key.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
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
import type { AppTaskObservation, ConfigurationCallbackObservation } from './configuration-observation.js';
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
      && this.issues.length === 0;
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

  constructor(
    private readonly issuePublisher: ConfigurationIssuePublisher,
  ) {}

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
  recognize(store: KernelStore, configuration: ConfigurationRecognitionProjectResult): FrameworkServiceCustomizationProjectResult {
    const draft = new FrameworkServiceCustomizationDraft(new ConfigurationIssuePublisher(store));
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
    if (result.records.length > 0) {
      store.commit(new KernelStoreBatch(result.records, `framework-service-customization:${configuration.project.projectKey}`));
      for (const issue of result.issues) {
        store.productDetails.add(ConfigurationProductDetails.Issue, issue.productHandle, issue);
      }
    }
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
    const keyedService = appTask.keyExpression == null
      ? null
      : serviceKindForKeyExpression(appTask.keyExpression);
    if (keyedService == null) {
      containerLocals.add(firstParameter.text);
    } else {
      serviceLocals.set(firstParameter.text, keyedService);
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
      recognizeServiceAssignment(node, reader, serviceLocals, containerLocals, draft);
    }

    ts.forEachChild(node, visit);
  };

  const body = callback.body;
  if (body != null) {
    visit(body);
  }
}

function recognizeServiceAssignment(
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
  const value = reader.evaluateExpression(assignment.right).value;
  if (value?.kind === EvaluationValueKind.Boolean) {
    draft.nodeObserverLocatorAllowDirtyCheck = value.value;
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
      const rule = call.arguments[0] == null || ts.isSpreadElement(call.arguments[0])
        ? null
        : readTwoWayRule(call.arguments[0], reader);
      if (rule != null) {
        draft.attributeTwoWayRules.push(rule);
      }
      return;
    }
    case 'useMapping':
      if (call.arguments[0] != null && !ts.isSpreadElement(call.arguments[0])) {
        draft.addAttributeMappings(context, call, readAttributeMappings(call.arguments[0], reader, false));
      }
      return;
    case 'useGlobalMapping':
      if (call.arguments[0] != null && !ts.isSpreadElement(call.arguments[0])) {
        draft.addAttributeMappings(context, call, readAttributeMappings(call.arguments[0], reader, true));
      }
      return;
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
    case 'useConfig':
      for (const config of nodeObserverNodeConfigsFromUseConfigCall(call, reader)) {
        draft.addNodeConfig(context, call, config);
      }
      return;
    case 'useConfigGlobal':
      for (const config of nodeObserverGlobalConfigsFromUseConfigGlobalCall(call, reader)) {
        draft.addGlobalNodeConfig(context, call, config);
      }
      return;
    case 'overrideAccessor':
      draft.nodeAccessorOverrides.push(...nodeObserverAccessorOverridesFromCall(call, reader));
      return;
    case 'overrideAccessorGlobal':
      draft.globalAccessorOverrides.push(...nodeObserverGlobalAccessorOverridesFromCall(call, reader));
      return;
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

function readAttributeMappings(
  expression: ts.Expression,
  reader: StaticEvaluationExpressionReader,
  global: boolean,
): readonly AttributeMapperMapping[] {
  const value = reader.evaluateExpression(expression).value;
  if (value?.kind !== EvaluationValueKind.Object) {
    return [];
  }
  if (global) {
    return [...value.properties.values()].flatMap((property) => {
      const propertyName = readStaticStringValue(property.value);
      return propertyName == null
        ? []
        : [new AttributeMapperMapping(null, property.name, propertyName)];
    });
  }

  const mappings: AttributeMapperMapping[] = [];
  for (const tagProperty of value.properties.values()) {
    if (tagProperty.value.kind !== EvaluationValueKind.Object) {
      continue;
    }
    for (const property of tagProperty.value.properties.values()) {
      const propertyName = readStaticStringValue(property.value);
      if (propertyName != null) {
        mappings.push(new AttributeMapperMapping(tagProperty.name, property.name, propertyName));
      }
    }
  }
  return mappings;
}

function readTwoWayRule(
  expression: ts.Expression,
  reader: StaticEvaluationExpressionReader,
): AttributeMapperTwoWayRule | null {
  const current = unwrapExpression(expression);
  if (!ts.isArrowFunction(current) && !ts.isFunctionExpression(current)) {
    return null;
  }
  const elementParameter = parameterIdentifierName(current.parameters[0]);
  const propertyParameter = parameterIdentifierName(current.parameters[1]);
  if (elementParameter == null && propertyParameter == null) {
    return null;
  }
  const bodyExpression = functionReturnExpression(current);
  if (bodyExpression == null) {
    return null;
  }
  const facts = readTwoWayPredicateFacts(bodyExpression, reader, elementParameter, propertyParameter);
  return facts.tagName == null && facts.propertyName == null
    ? null
    : new AttributeMapperTwoWayRule(facts.tagName, facts.propertyName);
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
): { readonly tagName: string | null; readonly propertyName: string | null } {
  const current = unwrapExpression(expression);
  if (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
    const left = readTwoWayPredicateFacts(current.left, reader, elementParameter, propertyParameter);
    const right = readTwoWayPredicateFacts(current.right, reader, elementParameter, propertyParameter);
    return {
      tagName: left.tagName ?? right.tagName,
      propertyName: left.propertyName ?? right.propertyName,
    };
  }
  if (!ts.isBinaryExpression(current) || !isEqualityOperator(current.operatorToken.kind)) {
    return { tagName: null, propertyName: null };
  }
  return readTwoWayEqualityFact(current.left, current.right, reader, elementParameter, propertyParameter)
    ?? readTwoWayEqualityFact(current.right, current.left, reader, elementParameter, propertyParameter)
    ?? { tagName: null, propertyName: null };
}

function readTwoWayEqualityFact(
  subject: ts.Expression,
  value: ts.Expression,
  reader: StaticEvaluationExpressionReader,
  elementParameter: string | null,
  propertyParameter: string | null,
): { readonly tagName: string | null; readonly propertyName: string | null } | null {
  const current = unwrapExpression(subject);
  if (propertyParameter != null && ts.isIdentifier(current) && current.text === propertyParameter) {
    const propertyName = readStaticString(value, reader);
    return propertyName == null ? null : { tagName: null, propertyName };
  }
  if (
    elementParameter != null
    && ts.isPropertyAccessExpression(current)
    && (current.name.text === 'tagName' || current.name.text === 'nodeName')
    && ts.isIdentifier(unwrapExpression(current.expression))
    && (unwrapExpression(current.expression) as ts.Identifier).text === elementParameter
  ) {
    const tagName = readStaticString(value, reader);
    return tagName == null ? null : { tagName, propertyName: null };
  }
  return null;
}

function readStaticString(
  expression: ts.Expression,
  reader: StaticEvaluationExpressionReader,
): string | null {
  const value = reader.evaluateExpression(expression).value;
  return value == null ? null : readStaticStringValue(value);
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
