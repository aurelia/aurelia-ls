import ts from 'typescript';
import { SourceSpanRole } from '../kernel/address.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import type {
  KernelStore,
  KernelStoreRecord,
} from '../kernel/store.js';
import { EvaluationRead } from '../evaluation/expression-reader.js';
import { hasStaticModifier } from '../evaluation/ts-syntax.js';
import {
  EvaluationValueKind,
  type EvaluationValue,
} from '../evaluation/values.js';
import { checkerPropertySymbol } from '../type-system/checker-node-helpers.js';
import { ResourceFrameworkErrorCode } from './framework-error-code.js';
import {
  ResourceIssue,
  ResourceIssueKind,
  ResourceIssuePhase,
} from './resource-issue.js';
import {
  ResourceIssuePublication,
  ResourceIssuePublisher,
} from './resource-issue-publication.js';
import type { ResourceRecognitionContext } from './resource-recognition-context.js';
import { ResourceTargetReference } from './resource-reference.js';
import {
  ConvergenceOpen,
  decoratorCallNamed,
  memberName,
  memberNameNode,
  nullableConvergenceOpenForNode,
  nullableConvergenceOpenForRead,
  readObjectProperty,
  readStaticClassProperty,
  targetReferenceForFunction,
} from './resource-convergence-support.js';
import { sourceSpanAddressForNode } from './resource-source-address.js';
import {
  WatchCallbackDefinition,
  WatchCallbackKind,
  WatchContributionKind,
  WatchDefinition,
  WatchDefinitionContribution,
  WatchExpressionDefinition,
  WatchExpressionKind,
  WatchFlushMode,
  WatchPropertyKeyDefinition,
  WatchPropertyKeyKind,
} from './watch-definition.js';

export class WatchRead {
  constructor(
    readonly watches: readonly WatchDefinition[],
    readonly contributions: readonly WatchDefinitionContribution[],
    readonly open: readonly ConvergenceOpen[],
    readonly records: readonly KernelStoreRecord[] = [],
    readonly issues: readonly ResourceIssue[] = [],
  ) {}
}

export const enum WatchDefinitionObjectWatchesPolicy {
  Include = 'include',
  Ignore = 'ignore',
}

class WatchEntryRead {
  constructor(
    readonly watch: WatchDefinition | null,
    readonly contribution: WatchDefinitionContribution | null,
    readonly open: ConvergenceOpen | null,
    readonly records: readonly KernelStoreRecord[] = [],
    readonly issues: readonly ResourceIssue[] = [],
  ) {}
}

export function readWatches(
  store: KernelStore,
  context: ResourceRecognitionContext,
  local: string,
  definitionExpression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
  definitionObjectWatchesPolicy: WatchDefinitionObjectWatchesPolicy = WatchDefinitionObjectWatchesPolicy.Include,
): WatchRead {
  const publisher = new ResourceIssuePublisher(store);
  const reads = [
    ...(definitionObjectWatchesPolicy === WatchDefinitionObjectWatchesPolicy.Include
      ? readWatchListValue(
        store,
        context,
        publisher,
        `${local}:definition-object`,
        readObjectProperty(context.expressionReader, definitionExpression, 'watches'),
        targetClass,
        ownerIdentityHandle,
        provenanceHandle,
        WatchContributionKind.DefinitionObject,
      )
      : []),
    ...readDecoratorWatches(store, context, publisher, `${local}:decorator`, targetClass, ownerIdentityHandle, provenanceHandle),
    ...readWatchListExpression(store, context, publisher, `${local}:static`, readStaticClassProperty(targetClass, 'watches'), targetClass, ownerIdentityHandle, provenanceHandle, WatchContributionKind.StaticWatches),
  ];
  return watchReadFromEntries(reads);
}

function watchReadFromEntries(reads: readonly WatchEntryRead[]): WatchRead {
  const watches: WatchDefinition[] = [];
  const contributions: WatchDefinitionContribution[] = [];
  const open: ConvergenceOpen[] = [];
  const records: KernelStoreRecord[] = [];
  const issues: ResourceIssue[] = [];
  for (const read of reads) {
    if (read.watch != null) {
      watches.push(read.watch);
    }
    if (read.contribution != null) {
      contributions.push(read.contribution);
    }
    if (read.open != null) {
      open.push(read.open);
    }
    records.push(...read.records);
    issues.push(...read.issues);
  }
  return new WatchRead(watches, contributions, open, records, issues);
}

function readDecoratorWatches(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  targetClass: ts.ClassLikeDeclarationBase | null,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): readonly WatchEntryRead[] {
  if (targetClass == null) {
    return [];
  }
  return [
    ...readClassWatchDecorators(store, context, publisher, `${local}:class`, targetClass, ownerIdentityHandle, provenanceHandle),
    ...targetClass.members.flatMap((member) =>
      readMemberWatchDecorators(store, context, publisher, `${local}:member`, member, targetClass, ownerIdentityHandle, provenanceHandle)
    ),
  ];
}

function readClassWatchDecorators(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  targetClass: ts.ClassLikeDeclarationBase,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): readonly WatchEntryRead[] {
  const decorators = ts.canHaveDecorators(targetClass) ? ts.getDecorators(targetClass) ?? [] : [];
  return decorators
    .map((decorator, index) => readClassWatchDecorator(store, context, publisher, `${local}:${index}`, decorator, targetClass, ownerIdentityHandle, provenanceHandle))
    .filter((entry): entry is WatchEntryRead => entry != null);
}

function readMemberWatchDecorators(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  member: ts.ClassElement,
  targetClass: ts.ClassLikeDeclarationBase,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): readonly WatchEntryRead[] {
  const name = memberName(member);
  if (name == null || !ts.canHaveDecorators(member)) {
    return [];
  }
  return (ts.getDecorators(member) ?? [])
    .map((decorator, index) => readMethodWatchDecorator(store, context, publisher, `${local}:${name}:${index}`, decorator, member, targetClass, name, ownerIdentityHandle, provenanceHandle))
    .filter((entry): entry is WatchEntryRead => entry != null);
}

function readClassWatchDecorator(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  decorator: ts.Decorator,
  targetClass: ts.ClassLikeDeclarationBase,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): WatchEntryRead | null {
  const call = decoratorCallNamed(decorator, 'watch');
  if (call == null) {
    return null;
  }
  const expressionIssue = readWatchNullConfigIssue(
    store,
    context,
    publisher,
    `${local}:expression`,
    call.arguments[0] ?? null,
    call,
    ownerIdentityHandle,
    provenanceHandle,
  );
  if (expressionIssue != null) {
    return expressionIssue;
  }
  const callbackIssue = readClassWatchInvalidChangeHandlerIssue(
    store,
    context,
    publisher,
    `${local}:callback`,
    call.arguments[1] ?? null,
    call,
    targetClass,
    ownerIdentityHandle,
    provenanceHandle,
  );
  if (callbackIssue != null) {
    return callbackIssue;
  }
  return readWatchCall(
    store,
    context,
    publisher,
    local,
    call.arguments[0] ?? null,
    call.arguments[1] ?? null,
    call.arguments[2] ?? null,
    call,
    targetClass,
    WatchContributionKind.Decorator,
    ownerIdentityHandle,
    provenanceHandle,
  );
}

function readMethodWatchDecorator(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  decorator: ts.Decorator,
  member: ts.ClassElement,
  targetClass: ts.ClassLikeDeclarationBase,
  methodName: string,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): WatchEntryRead | null {
  const call = decoratorCallNamed(decorator, 'watch');
  if (call == null) {
    return null;
  }
  if (!ts.isMethodDeclaration(member) || hasStaticModifier(member)) {
    return publishWatchIssueEntry(
      store,
      context,
      publisher,
      local,
      ResourceIssuePhase.WatchDecorator,
      ResourceIssueKind.WatchNonMethodDecoratorUsage,
      'The @watch decorator can only be used on instance methods.',
      ResourceFrameworkErrorCode.WatchNonMethodDecoratorUsage,
      memberNameNode(member) ?? member,
      SourceSpanRole.Name,
      ownerIdentityHandle,
      provenanceHandle,
    );
  }
  const expressionIssue = readWatchNullConfigIssue(
    store,
    context,
    publisher,
    `${local}:expression`,
    call.arguments[0] ?? null,
    call,
    ownerIdentityHandle,
    provenanceHandle,
  );
  if (expressionIssue != null) {
    return expressionIssue;
  }
  const callbackSource = sourceSpanAddressForNode(store, context, memberNameNode(member) ?? member, `${local}:callback`, SourceSpanRole.Name);
  return readWatchCall(
    store,
    context,
    publisher,
    local,
    call.arguments[0] ?? null,
    watchMethodNameExpression(methodName, callbackSource?.addressHandle ?? null),
    call.arguments[1] ?? null,
    call,
    targetClass,
    WatchContributionKind.Decorator,
    ownerIdentityHandle,
    provenanceHandle,
    callbackSource?.records ?? [],
  );
}

function readWatchCall(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  expressionNode: ts.Expression | null,
  callbackNode: ts.Expression | WatchCallbackDefinition | null,
  optionsNode: ts.Expression | null,
  carrierNode: ts.Node,
  targetClass: ts.ClassLikeDeclarationBase | null,
  contributionKind: WatchContributionKind,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
  extraRecords: readonly KernelStoreRecord[] = [],
): WatchEntryRead {
  if (expressionNode == null || callbackNode == null) {
    return new WatchEntryRead(null, null, new ConvergenceOpen('@watch requires static expression and callback metadata.', expressionNode ?? optionsNode ?? carrierNode));
  }
  const expressionSource = sourceSpanAddressForNode(store, context, expressionNode, `${local}:expression`, SourceSpanRole.Value);
  const callbackSource = callbackNode instanceof WatchCallbackDefinition
    ? null
    : sourceSpanAddressForNode(store, context, callbackNode, `${local}:callback`, SourceSpanRole.Value);
  const expression = readWatchExpression(context.expressionReader.evaluateExpression(expressionNode).value, expressionSource?.addressHandle ?? null);
  const callback = callbackNode instanceof WatchCallbackDefinition
    ? callbackNode
    : readWatchCallback(context.expressionReader.evaluateExpression(callbackNode).value, callbackSource?.addressHandle ?? null);
  const flush = readWatchFlush(context, optionsNode);
  if (expression == null || callback == null || flush == null) {
    return new WatchEntryRead(null, null, nullableConvergenceOpenForNode('Watch metadata did not close to a static expression, callback, and flush mode.', expressionNode));
  }
  return watchEntry(
    store,
    context,
    publisher,
    local,
    expression,
    callback,
    flush,
    contributionKind,
    targetClass,
    ownerIdentityHandle,
    provenanceHandle,
    [...extraRecords, ...expressionSource?.records ?? [], ...callbackSource?.records ?? []],
  );
}

function readWatchNullConfigIssue(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  expressionNode: ts.Expression | null,
  carrierNode: ts.Node,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): WatchEntryRead | null {
  if (expressionNode != null) {
    const value = context.expressionReader.evaluateExpression(expressionNode).value;
    if (value?.kind !== EvaluationValueKind.Null && value?.kind !== EvaluationValueKind.Undefined) {
      return null;
    }
  }
  return publishWatchIssueEntry(
    store,
    context,
    publisher,
    local,
    ResourceIssuePhase.WatchDecorator,
    ResourceIssueKind.WatchNullConfig,
    '@watch requires a non-null expression or property key.',
    ResourceFrameworkErrorCode.WatchNullConfig,
    expressionNode ?? carrierNode,
    SourceSpanRole.Value,
    ownerIdentityHandle,
    provenanceHandle,
  );
}

function readClassWatchInvalidChangeHandlerIssue(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  callbackNode: ts.Expression | null,
  carrierNode: ts.Node,
  targetClass: ts.ClassLikeDeclarationBase,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): WatchEntryRead | null {
  if (callbackNode == null) {
    return publishWatchIssueEntry(
      store,
      context,
      publisher,
      local,
      ResourceIssuePhase.WatchDecorator,
      ResourceIssueKind.WatchInvalidChangeHandler,
      'Class @watch requires a callable callback or a method name present on the prototype.',
      ResourceFrameworkErrorCode.WatchInvalidChangeHandler,
      carrierNode,
      SourceSpanRole.Value,
      ownerIdentityHandle,
      provenanceHandle,
    );
  }
  const callback = readWatchCallback(
    context.expressionReader.evaluateExpression(callbackNode).value,
    null,
  );
  if (callback == null) {
    return publishWatchIssueEntry(
      store,
      context,
      publisher,
      local,
      ResourceIssuePhase.WatchDecorator,
      ResourceIssueKind.WatchInvalidChangeHandler,
      'Class @watch callback metadata did not close to a function or prototype method name.',
      ResourceFrameworkErrorCode.WatchInvalidChangeHandler,
      callbackNode,
      SourceSpanRole.Value,
      ownerIdentityHandle,
      provenanceHandle,
    );
  }
  if (callback.kind === WatchCallbackKind.Function) {
    return null;
  }
  const propertyName = watchPropertyKeyText(callback.methodName);
  if (propertyName == null) {
    return publishWatchIssueEntry(
      store,
      context,
      publisher,
      local,
      ResourceIssuePhase.WatchDecorator,
      ResourceIssueKind.WatchInvalidChangeHandler,
      'Class @watch callback method name could not be reduced to a prototype property key.',
      ResourceFrameworkErrorCode.WatchInvalidChangeHandler,
      callbackNode,
      SourceSpanRole.Value,
      ownerIdentityHandle,
      provenanceHandle,
    );
  }
  return readPrototypeCallbackState(context, targetClass, propertyName) === WatchCallbackResolution.Missing
    ? publishWatchIssueEntry(
      store,
      context,
      publisher,
      local,
      ResourceIssuePhase.WatchDecorator,
      ResourceIssueKind.WatchInvalidChangeHandler,
      `Class @watch callback '${propertyName}' is not present on the resource prototype.`,
      ResourceFrameworkErrorCode.WatchInvalidChangeHandler,
      callbackNode,
      SourceSpanRole.Value,
      ownerIdentityHandle,
      provenanceHandle,
    )
    : null;
}

function readControllerWatchInvalidCallbackIssue(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  callback: WatchCallbackDefinition,
  targetClass: ts.ClassLikeDeclarationBase | null,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): ResourceIssuePublication | null {
  if (targetClass == null || callback.kind !== WatchCallbackKind.MethodName) {
    return null;
  }
  const propertyName = watchPropertyKeyText(callback.methodName);
  if (propertyName == null) {
    return null;
  }
  const state = readInstanceCallbackState(context, targetClass, propertyName);
  if (state !== WatchCallbackResolution.Missing && state !== WatchCallbackResolution.NonCallable) {
    return null;
  }
  return publisher.publish(
    `${local}:issue`,
    context.projectKey,
    ownerIdentityHandle,
    provenanceHandle,
    ResourceIssuePhase.WatchMetadata,
    ResourceIssueKind.ControllerWatchInvalidCallback,
    state === WatchCallbackResolution.Missing
      ? `Watch callback '${propertyName}' is not declared on the resource instance.`
      : `Watch callback '${propertyName}' is not callable on the resource instance.`,
    ResourceFrameworkErrorCode.ControllerWatchInvalidCallback,
    callback.methodName?.target?.addressHandle ?? null,
  );
}

function publishWatchIssueEntry(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  phase: ResourceIssuePhase,
  issueKind: ResourceIssueKind,
  message: string,
  frameworkErrorCode: string,
  sourceNode: ts.Node,
  sourceRole: SourceSpanRole,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
): WatchEntryRead {
  const source = sourceSpanAddressForNode(store, context, sourceNode, `${local}:source`, sourceRole);
  const publication = publisher.publish(
    `${local}:issue`,
    context.projectKey,
    ownerIdentityHandle,
    provenanceHandle,
    phase,
    issueKind,
    message,
    frameworkErrorCode,
    source?.addressHandle ?? null,
  );
  return new WatchEntryRead(
    null,
    null,
    null,
    [...source?.records ?? [], ...publication.records],
    [publication.issue],
  );
}

const enum WatchCallbackResolution {
  Callable = 'callable',
  NonCallable = 'non-callable',
  Missing = 'missing',
  Unknown = 'unknown',
}

function readPrototypeCallbackState(
  context: ResourceRecognitionContext,
  targetClass: ts.ClassLikeDeclarationBase,
  propertyName: string,
): WatchCallbackResolution {
  if (context.typeSystem == null) {
    return WatchCallbackResolution.Unknown;
  }
  const symbol = readInstanceMemberSymbol(context, targetClass, propertyName);
  if (symbol == null) {
    return WatchCallbackResolution.Missing;
  }
  return hasPrototypeMemberDeclaration(symbol)
    ? readMemberCallableState(context, targetClass, symbol)
    : WatchCallbackResolution.Missing;
}

function readInstanceCallbackState(
  context: ResourceRecognitionContext,
  targetClass: ts.ClassLikeDeclarationBase,
  propertyName: string,
): WatchCallbackResolution {
  if (context.typeSystem == null) {
    return WatchCallbackResolution.Unknown;
  }
  const symbol = readInstanceMemberSymbol(context, targetClass, propertyName);
  return symbol == null
    ? WatchCallbackResolution.Missing
    : readMemberCallableState(context, targetClass, symbol);
}

function readInstanceMemberSymbol(
  context: ResourceRecognitionContext,
  targetClass: ts.ClassLikeDeclarationBase,
  propertyName: string,
): ts.Symbol | null {
  if (context.typeSystem == null) {
    return null;
  }
  const instanceType = context.typeSystem.readRuntimeTargetType(targetClass);
  if (instanceType == null) {
    return null;
  }
  const checker = context.typeSystem.checker;
  return checkerPropertySymbol(checker, instanceType, propertyName);
}

function hasPrototypeMemberDeclaration(symbol: ts.Symbol): boolean {
  return (symbol.declarations ?? []).some((declaration) =>
    ts.isMethodDeclaration(declaration)
    || ts.isGetAccessorDeclaration(declaration)
    || ts.isSetAccessorDeclaration(declaration)
    || ts.isMethodSignature(declaration)
  );
}

function readMemberCallableState(
  context: ResourceRecognitionContext,
  targetClass: ts.ClassLikeDeclarationBase,
  symbol: ts.Symbol,
): WatchCallbackResolution {
  if (context.typeSystem == null) {
    return WatchCallbackResolution.Unknown;
  }
  const type = context.typeSystem.readProgramTypeOfSymbolAtLocation(symbol, targetClass);
  if (type == null) {
    return WatchCallbackResolution.Unknown;
  }
  if ((type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0) {
    return WatchCallbackResolution.Unknown;
  }
  return type.getCallSignatures().length > 0
    ? WatchCallbackResolution.Callable
    : WatchCallbackResolution.NonCallable;
}

function watchPropertyKeyText(propertyKey: WatchPropertyKeyDefinition | null): string | null {
  return propertyKey?.text ?? null;
}

function watchMethodNameExpression(methodName: string, addressHandle: AddressHandle | null): WatchCallbackDefinition {
  return new WatchCallbackDefinition(
    WatchCallbackKind.MethodName,
    new WatchPropertyKeyDefinition(WatchPropertyKeyKind.String, methodName, null, new ResourceTargetReference(null, addressHandle, methodName)),
  );
}

function readWatchListExpression(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  expression: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
  contributionKind: WatchContributionKind,
): readonly WatchEntryRead[] {
  return expression == null
    ? []
    : readWatchListValue(store, context, publisher, local, context.expressionReader.evaluateExpression(expression), targetClass, ownerIdentityHandle, provenanceHandle, contributionKind);
}

function readWatchListValue(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  read: EvaluationRead<EvaluationValue> | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
  contributionKind: WatchContributionKind,
): readonly WatchEntryRead[] {
  const value = read?.value;
  if (value == null || value.kind === EvaluationValueKind.Undefined) {
    return [];
  }
  if (value.kind !== EvaluationValueKind.Array) {
    return [new WatchEntryRead(null, null, nullableConvergenceOpenForRead('Watch list did not close to a static array.', read))];
  }
  const entries = value.elements.map((element, index) =>
    readWatchListEntry(store, context, publisher, `${local}:array:${index}`, element.value, element.expression, targetClass, ownerIdentityHandle, provenanceHandle, contributionKind)
  );
  return value.mayHaveUnknownElements || value.mayHaveUnknownOrder
    ? [...entries, new WatchEntryRead(null, null, nullableConvergenceOpenForNode('Watch array includes open spread, hole, or unknown-order entries.', value.node))]
    : entries;
}

function readWatchListEntry(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  value: EvaluationValue,
  node: ts.Expression | null,
  targetClass: ts.ClassLikeDeclarationBase | null,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
  contributionKind: WatchContributionKind,
): WatchEntryRead {
  if (value.kind !== EvaluationValueKind.Object) {
    return new WatchEntryRead(null, null, nullableConvergenceOpenForNode('Watch array entry did not close to a static object.', node));
  }
  const source = node == null ? null : sourceSpanAddressForNode(store, context, node, local, SourceSpanRole.Value);
  const expression = readWatchExpression(value.properties.get('expression')?.value ?? null, source?.addressHandle ?? null);
  const callback = readWatchCallback(value.properties.get('callback')?.value ?? null, source?.addressHandle ?? null);
  const flush = readWatchFlushValue(value.properties.get('flush')?.value ?? null);
  return expression == null || callback == null || flush == null
    ? new WatchEntryRead(null, null, nullableConvergenceOpenForNode('Watch entry did not expose static expression, callback, and flush fields.', node))
    : watchEntry(
      store,
      context,
      publisher,
      local,
      expression,
      callback,
      flush,
      contributionKind,
      targetClass,
      ownerIdentityHandle,
      provenanceHandle,
      source?.records ?? [],
    );
}

function watchEntry(
  store: KernelStore,
  context: ResourceRecognitionContext,
  publisher: ResourceIssuePublisher,
  local: string,
  expression: WatchExpressionDefinition,
  callback: WatchCallbackDefinition,
  flush: WatchFlushMode,
  contributionKind: WatchContributionKind,
  targetClass: ts.ClassLikeDeclarationBase | null,
  ownerIdentityHandle: IdentityHandle | null,
  provenanceHandle: ProvenanceHandle,
  records: readonly KernelStoreRecord[],
): WatchEntryRead {
  const callbackIssue = readControllerWatchInvalidCallbackIssue(
    store,
    context,
    publisher,
    `${local}:callback`,
    callback,
    targetClass,
    ownerIdentityHandle,
    provenanceHandle,
  );
  return new WatchEntryRead(
    new WatchDefinition(expression, callback, flush),
    new WatchDefinitionContribution(contributionKind, expression, callback, flush),
    null,
    [...records, ...callbackIssue?.records ?? []],
    callbackIssue == null ? [] : [callbackIssue.issue],
  );
}

function readWatchExpression(
  value: EvaluationValue | null,
  addressHandle: AddressHandle | null,
): WatchExpressionDefinition | null {
  const propertyKey = readWatchPropertyKey(value, addressHandle);
  if (propertyKey != null) {
    return new WatchExpressionDefinition(WatchExpressionKind.PropertyKey, propertyKey);
  }
  return value?.kind === EvaluationValueKind.Function
    ? new WatchExpressionDefinition(WatchExpressionKind.DependencyCollectionFunction, null, targetReferenceForFunction(value, addressHandle))
    : null;
}

function readWatchCallback(
  value: EvaluationValue | null,
  addressHandle: AddressHandle | null,
): WatchCallbackDefinition | null {
  const propertyKey = readWatchPropertyKey(value, addressHandle);
  if (propertyKey != null) {
    return new WatchCallbackDefinition(WatchCallbackKind.MethodName, propertyKey);
  }
  return value?.kind === EvaluationValueKind.Function
    ? new WatchCallbackDefinition(WatchCallbackKind.Function, null, targetReferenceForFunction(value, addressHandle))
    : null;
}

function readWatchPropertyKey(
  value: EvaluationValue | null,
  addressHandle: AddressHandle | null,
): WatchPropertyKeyDefinition | null {
  if (value?.kind === EvaluationValueKind.String) {
    return new WatchPropertyKeyDefinition(WatchPropertyKeyKind.String, value.value, null, new ResourceTargetReference(null, addressHandle, value.value));
  }
  return value?.kind === EvaluationValueKind.Number
    ? new WatchPropertyKeyDefinition(WatchPropertyKeyKind.Number, String(value.value), value.value)
    : null;
}

function readWatchFlush(
  context: ResourceRecognitionContext,
  optionsNode: ts.Expression | null,
): WatchFlushMode | null {
  if (optionsNode == null) {
    return WatchFlushMode.Async;
  }
  const value = context.expressionReader.evaluateExpression(optionsNode).value;
  if (value == null || value.kind === EvaluationValueKind.Undefined) {
    return WatchFlushMode.Async;
  }
  return value.kind === EvaluationValueKind.Object
    ? readWatchFlushValue(value.properties.get('flush')?.value ?? null)
    : null;
}

function readWatchFlushValue(value: EvaluationValue | null): WatchFlushMode | null {
  if (value == null || value.kind === EvaluationValueKind.Undefined) {
    return WatchFlushMode.Async;
  }
  if (value.kind === EvaluationValueKind.String && value.value === 'sync') {
    return WatchFlushMode.Sync;
  }
  if (value.kind === EvaluationValueKind.String && value.value === 'async') {
    return WatchFlushMode.Async;
  }
  return null;
}
