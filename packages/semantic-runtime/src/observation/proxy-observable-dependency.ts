import ts from 'typescript';

import { auLink } from '../kernel/au-link.js';
import type { KernelStore } from '../kernel/store.js';
import {
  ComputedObservationDependencyMode,
} from './computed-observation.js';
import {
  readImportedExportName,
  readSourceImportBindings,
  type SourceImportBindings,
} from '../evaluation/import-bindings.js';
import {
  isNestedExecutionBoundary,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import { RuntimeObservedDependencyKind } from './runtime-binding-observation.js';
import {
  checkerCollectionSymbolName,
  checkerNullishType,
} from '../type-system/checker-related-types.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  type RuntimeObservedDependencyDraft,
  runtimeObservedDependencySemanticKey,
} from './runtime-observed-dependency-draft.js';
import {
  observedDependencyWithMemberSourceForCheckerType,
  observedMemberSourceFields,
  observedMemberSourceForCheckerSymbol,
  type RuntimeObservedMemberSourceProjection,
} from './observed-dependency-member-source.js';
import {
  connectableDraftsForTrackableDependencyKey,
  readTrackableMethodDependency,
} from './trackable-method-dependency-recognition.js';

export interface RuntimeProxyObservedDependencyDraft {
  readonly dependencyKind: RuntimeObservedDependencyKind;
  readonly expressionKind: string;
  readonly sourceName: string | null;
  readonly sourceRootName: string | null;
  readonly memberName: string | null;
  readonly keyExpression: string | null;
  readonly methodName: string | null;
  readonly spanStart: number | null;
  readonly spanEnd: number | null;
}

export interface RuntimeProxyObservedDependencyTypeContext {
  readonly checker: ts.TypeChecker;
  readonly store?: KernelStore | null;
  readProgramNode<TNode extends ts.Node>(node: TNode): TNode | null;
}

export interface RuntimeProxyObservedDependencyCollectionOptions {
  readonly rootNames?: readonly string[];
  readonly parameterRootNames?: boolean;
  readonly trackableMethodStack?: ReadonlySet<ts.MethodDeclaration>;
}

type ProxyObservedCollectionReceiverKind = 'array' | 'map' | 'set' | 'unknown' | 'none';
type ProxyConcreteCollectionReceiverKind = Exclude<ProxyObservedCollectionReceiverKind, 'unknown' | 'none'>;

interface ProxyCollectionMethodPolicy {
  readonly observedMethods: ReadonlySet<string>;
  readonly interceptedMethods: ReadonlySet<string>;
  readonly wrappedResultMethods: ReadonlySet<string>;
}

const proxyObservedArrayMethods = new Set([
  'map',
  'every',
  'filter',
  'includes',
  'indexOf',
  'lastIndexOf',
  'find',
  'findIndex',
  'flat',
  'flatMap',
  'join',
  'reduce',
  'reduceRight',
  'slice',
  'some',
  'sort',
  'keys',
  'values',
  'entries',
]);

const proxyObservedMapMethods = new Set([
  'forEach',
  'has',
  'get',
  'keys',
  'values',
  'entries',
]);

const proxyObservedSetMethods = new Set([
  'forEach',
  'has',
  'keys',
  'values',
  'entries',
]);

const proxyCollectionMethodPolicies: Readonly<Record<ProxyConcreteCollectionReceiverKind, ProxyCollectionMethodPolicy>> = {
  array: {
    observedMethods: proxyObservedArrayMethods,
    interceptedMethods: new Set([
      ...proxyObservedArrayMethods,
      'push',
      'pop',
      'reverse',
      'shift',
      'unshift',
      'splice',
    ]),
    wrappedResultMethods: new Set([
      'map',
      'filter',
      'find',
      'flat',
      'flatMap',
      'pop',
      'reduce',
      'reduceRight',
      'reverse',
      'shift',
      'slice',
      'sort',
      'splice',
    ]),
  },
  map: {
    observedMethods: proxyObservedMapMethods,
    interceptedMethods: new Set([
      ...proxyObservedMapMethods,
      'clear',
      'delete',
      'set',
    ]),
    wrappedResultMethods: new Set([
      'get',
      'set',
    ]),
  },
  set: {
    observedMethods: proxyObservedSetMethods,
    interceptedMethods: new Set([
      ...proxyObservedSetMethods,
      'clear',
      'delete',
      'add',
    ]),
    wrappedResultMethods: new Set([
      'add',
    ]),
  },
};

// Mirrors ProxyObservable wrapper methods that call observeCollection(...). Mutating wrappers such as push/splice/set
// stay out of this set even when their return value can become a downstream proxy carrier.
const proxyObservedCollectionMethods = proxyCollectionMethodUnion('observedMethods');
const proxyInterceptedCollectionMethods = proxyCollectionMethodUnion('interceptedMethods');
const proxyWrappedCallResultMethods = proxyCollectionMethodUnion('wrappedResultMethods');

const proxyIteratorMethodName = 'Symbol.iterator';
const proxyOwnKeysLengthMemberName = 'length';
const aureliaNowrapDecoratorModules = new Set([
  'aurelia',
  '@aurelia/runtime',
]);
const aureliaNowrapDecoratorExports = new Set([
  'nowrap',
]);
const nowrapImportBindings = new WeakMap<ts.SourceFile, SourceImportBindings>();

function proxyCollectionMethodUnion(
  methodSet: keyof ProxyCollectionMethodPolicy,
): ReadonlySet<string> {
  const methods = new Set<string>();
  for (const policy of Object.values(proxyCollectionMethodPolicies)) {
    for (const methodName of policy[methodSet]) {
      methods.add(methodName);
    }
  }
  return methods;
}

/** Conservative TypeScript-body projection of ProxyObservable property and collection dependency reads. */
@auLink('runtime:ProxyObservable')
export class ProxyObservable {
  static typeContextForTypeSystem(
    typeSystem: TypeSystemProject | null,
    store: KernelStore | null = null,
  ): RuntimeProxyObservedDependencyTypeContext | null {
    return typeSystem == null
      ? null
      : {
        checker: typeSystem.checker,
        store,
        readProgramNode: (node) => typeSystem.readProgramNode(node),
      };
  }

  static typeContextForChecker(
    checker: ts.TypeChecker,
    store: KernelStore | null = null,
  ): RuntimeProxyObservedDependencyTypeContext {
    return {
      checker,
      store,
      readProgramNode: (node) => node,
    };
  }

  static collectObservedDependencyDrafts(
    declaration: ts.FunctionLikeDeclaration,
    typeContext: RuntimeProxyObservedDependencyTypeContext | null = null,
    options: RuntimeProxyObservedDependencyCollectionOptions = {},
  ): readonly RuntimeObservedDependencyDraft[] {
    const sourceFile = declaration.getSourceFile();
    const rootNames = proxyObservedRootNamesForDeclaration(declaration, options);
    if (rootNames.size === 0) {
      return [];
    }
    const dependencies = new RuntimeProxyObservedDependencyDraftCollector(
      sourceFile,
      rootNames,
      typeContext,
      new Map(),
      options.trackableMethodStack ?? new Set(),
    );
    dependencies.visit(functionBodyOrExpression(declaration));
    return dependencies.read();
  }
}

function proxyObservedRootNamesForDeclaration(
  declaration: ts.FunctionLikeDeclaration,
  options: RuntimeProxyObservedDependencyCollectionOptions,
): ReadonlySet<string> {
  const rootNames = new Set(options.rootNames ?? []);
  if (options.parameterRootNames === true) {
    for (const parameter of declaration.parameters) {
      if (ts.isIdentifier(parameter.name)) {
        rootNames.add(parameter.name.text);
      }
    }
  } else if (rootNames.size === 0) {
    const firstParameter = declaration.parameters[0]?.name;
    if (firstParameter != null && ts.isIdentifier(firstParameter)) {
      rootNames.add(firstParameter.text);
    }
  }
  return rootNames;
}

function functionBodyOrExpression(
  declaration: ts.FunctionLikeDeclaration,
): ts.Node | null {
  return declaration.body ?? null;
}

class RuntimeProxyObservedDependencyDraftCollector {
  private readonly rows = new Map<string, RuntimeObservedDependencyDraft>();
  private readonly aliases = new Map<string, PropertyChain>();
  private readonly rootNames: Set<string>;

  constructor(
    private readonly sourceFile: ts.SourceFile,
    rootNames: ReadonlySet<string>,
    private readonly typeContext: RuntimeProxyObservedDependencyTypeContext | null = null,
    aliases: ReadonlyMap<string, PropertyChain> = new Map(),
    private readonly trackableMethodStack: ReadonlySet<ts.MethodDeclaration> = new Set(),
  ) {
    this.rootNames = new Set(rootNames);
    for (const [name, chain] of aliases) {
      this.aliases.set(name, chain);
    }
  }

  read(): readonly RuntimeObservedDependencyDraft[] {
    return [...this.rows.values()].sort((left, right) =>
      `${left.spanStart ?? -1}:${left.dependencyKind}:${left.sourceName ?? ''}:${left.methodName ?? ''}`
        .localeCompare(`${right.spanStart ?? -1}:${right.dependencyKind}:${right.sourceName ?? ''}:${right.methodName ?? ''}`)
    );
  }

  visit(node: ts.Node | null): void {
    if (node == null) {
      return;
    }
    if (isNestedExecutionBoundary(node)) {
      return;
    }
    if (ts.isCallExpression(node)) {
      this.visitCallExpression(node);
      return;
    }
    if (ts.isForOfStatement(node)) {
      this.visitForOfStatement(node);
      return;
    }
    if (ts.isForInStatement(node)) {
      this.visitForInStatement(node);
      return;
    }
    if (ts.isSpreadElement(node)) {
      this.visitSpreadElement(node);
      return;
    }
    if (ts.isVariableDeclaration(node)) {
      this.visitVariableDeclaration(node);
      return;
    }
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      this.recordPropertyChain(node);
    }
    ts.forEachChild(node, (child) => this.visit(child));
  }

  private visitVariableDeclaration(node: ts.VariableDeclaration): void {
    if (node.initializer == null) {
      return;
    }
    const initializer = this.propertyChainForExpression(node.initializer);
    if (initializer == null) {
      this.visit(node.initializer);
      return;
    }
    // Local aliases keep dependency functions readable while still spending the original proxy read.
    if (ts.isIdentifier(node.name)) {
      this.visit(node.initializer);
      if (propertyChainValueCanBeProxyWrapped(initializer)) {
        this.aliases.set(node.name.text, aliasChain(initializer));
      }
      return;
    }
    if (ts.isObjectBindingPattern(node.name)) {
      this.visit(node.initializer);
      this.recordObjectBindingPatternAliases(node.name, initializer, node.initializer);
      return;
    }
    if (ts.isArrayBindingPattern(node.name)) {
      this.visit(node.initializer);
      const iteration = this.proxyObservedForOfIterationForExpression(node.initializer);
      if (iteration != null) {
        this.recordCollectionRead(iteration.receiver, iteration.methodName, iteration.spanNode);
        this.addProxyWrappableRootNamesForBindingName(node.name);
      }
      return;
    }
    this.visit(node.initializer);
  }

  private recordObjectBindingPatternAliases(
    pattern: ts.ObjectBindingPattern,
    owner: PropertyChain,
    ownerExpression: ts.Expression,
  ): void {
    for (const element of pattern.elements) {
      if (!ts.isIdentifier(element.name)) {
        continue;
      }
      const propertyName = bindingElementPropertyName(element);
      if (propertyName == null) {
        continue;
      }
      const chain: PropertyChain = {
        rootName: owner.rootName,
        segments: [
          ...owner.segments,
          {
            name: propertyName,
            memberSource: null,
            skipObservation: propertyExpressionHasNowrapDecorator(this.typeContext, ownerExpression, propertyName),
            valueCanBeProxyWrapped: this.bindingNameCanBeProxyWrapped(element.name),
          },
        ],
        start: element.name.getStart(this.sourceFile),
        end: element.name.end,
        observedSegmentStartIndex: owner.segments.length,
        rootCanBeProxyWrapped: owner.rootCanBeProxyWrapped,
      };
      this.recordPropertyChainForResolvedChain(chain);
      if (propertyChainValueCanBeProxyWrapped(chain)) {
        this.aliases.set(element.name.text, aliasChain(chain));
      }
    }
  }

  private visitCallExpression(node: ts.CallExpression): void {
    const callee = node.expression;
    if (ts.isPropertyAccessExpression(callee)) {
      this.recordPropertyChain(callee.expression);
      const receiver = this.propertyChainForExpression(callee.expression);
      const usesInterceptedCollectionMethod = receiver != null
        && propertyChainValueCanBeProxyWrapped(receiver)
        && this.receiverCanUseProxyInterceptedCollectionMethod(callee.expression, callee.name.text);
      const trackableDependencies = this.trackableMethodDependenciesForCall(callee);

      if (
        receiver != null
        && propertyChainValueCanBeProxyWrapped(receiver)
        && (trackableDependencies.length > 0 || !usesInterceptedCollectionMethod)
      ) {
        // Object proxy handlers observe the method property before invocation. Collection proxy handlers return
        // framework wrapper functions for intercepted methods instead, so those spend collection reads only.
        this.recordPropertyChain(callee);
      }

      if (trackableDependencies.length > 0) {
        for (const dependency of trackableDependencies) {
          this.add(dependency);
        }
      } else if (
        receiver != null
        && propertyChainValueCanBeProxyWrapped(receiver)
        && !usesInterceptedCollectionMethod
      ) {
        for (const dependency of this.ordinaryMethodDependenciesForCall(callee, node, receiver)) {
          this.add(dependency);
        }
      }
      if (
        receiver != null &&
        propertyChainValueCanBeProxyWrapped(receiver) &&
        proxyObservedCollectionMethods.has(callee.name.text) &&
        this.receiverCanUseProxyObservedCollectionMethod(callee.expression, callee.name.text)
      ) {
        this.recordCollectionRead(receiver, callee.name.text, callee);
        this.visitCollectionCallbacks(callee.name.text, callee.expression, node.arguments);
      }
      this.visit(callee.expression);
      for (const argument of node.arguments) {
        this.visit(argument);
      }
      return;
    }
    if (ts.isElementAccessExpression(callee)) {
      this.recordPropertyChain(callee.expression);
      this.visit(callee.expression);
      this.visit(callee.argumentExpression);
      for (const argument of node.arguments) {
        this.visit(argument);
      }
      return;
    }
    ts.forEachChild(node, (child) => this.visit(child));
  }

  private visitForOfStatement(node: ts.ForOfStatement): void {
    const iteration = this.proxyObservedForOfIterationForExpression(node.expression);
    if (iteration == null) {
      this.visit(node.expression);
      this.visit(node.statement);
      return;
    }

    this.recordPropertyChain(iteration.receiverExpression);
    this.recordCollectionRead(iteration.receiver, iteration.methodName, iteration.spanNode);

    const nestedRootNames = new Set(this.rootNames);
    for (const rootName of this.forOfProxyWrappableBindingRootNames(node.initializer)) {
      nestedRootNames.add(rootName);
    }
    const nested = new RuntimeProxyObservedDependencyDraftCollector(
      this.sourceFile,
      nestedRootNames,
      this.typeContext,
      this.aliases,
      this.trackableMethodStack,
    );
    nested.visit(node.statement);
    for (const dependency of nested.read()) {
      this.add(dependency);
    }
  }

  private visitForInStatement(node: ts.ForInStatement): void {
    const ownKeys = this.proxyObservedForInOwnKeysForExpression(node.expression);
    if (ownKeys == null) {
      this.visit(node.expression);
      this.visit(node.statement);
      return;
    }

    this.recordPropertyChain(ownKeys.receiverExpression);
    this.recordImplicitPropertyRead(
      ownKeys.receiver,
      proxyOwnKeysLengthMemberName,
      'ProxyOwnKeysLengthRead',
      ownKeys.spanNode,
      ownKeys.memberSource,
    );
    this.visit(node.statement);
  }

  private visitSpreadElement(node: ts.SpreadElement): void {
    const iteration = this.proxyObservedForOfIterationForExpression(node.expression);
    if (iteration == null) {
      this.visit(node.expression);
      return;
    }

    this.recordPropertyChain(iteration.receiverExpression);
    this.recordCollectionRead(iteration.receiver, iteration.methodName, iteration.spanNode);
  }

  private visitCollectionCallbacks(
    methodName: string,
    receiver: ts.Expression,
    args: ts.NodeArray<ts.Expression>,
  ): void {
    const callbackObservation = this.collectionCallbackObservationPolicy(methodName, receiver);
    if (!callbackObservation.visitCallback) {
      return;
    }
    const callback = args[0];
    if (callback == null || !(ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
      return;
    }
    const callbackRootNames = new Set(this.rootNames);
    for (const index of callbackObservation.wrappedParameterIndexes) {
      const callbackRoot = callback.parameters[index]?.name;
      if (callbackRoot != null) {
        for (const rootName of this.proxyWrappableBindingRootNames(callbackRoot)) {
          callbackRootNames.add(rootName);
        }
      }
    }
    const nested = new RuntimeProxyObservedDependencyDraftCollector(
      this.sourceFile,
      callbackRootNames,
      this.typeContext,
      this.aliases,
      this.trackableMethodStack,
    );
    nested.visit(callback.body);
    for (const dependency of nested.read()) {
      this.add(dependency);
    }
  }

  private recordPropertyChain(expression: ts.Expression): void {
    const chain = this.propertyChainForExpression(expression);
    if (chain == null) {
      return;
    }
    this.recordPropertyChainForResolvedChain(chain);
  }

  private recordPropertyChainForResolvedChain(chain: PropertyChain): void {
    if (chain.rootCanBeProxyWrapped === false) {
      return;
    }
    for (let index = 0; index < chain.segments.length; index += 1) {
      if (index < chain.observedSegmentStartIndex) {
        continue;
      }
      const segment = chain.segments[index] ?? null;
      if (propertyChainSegmentStopsProxyObservation(segment)) {
        return;
      }
      if (segment?.observed === false) {
        continue;
      }
      const sourceName = sourceNameForChain(chain, index + 1);
      this.add({
        dependencyKind: RuntimeObservedDependencyKind.ProxyPropertyRead,
        expressionKind: 'ProxyPropertyAccess',
        sourceName,
        sourceRootName: chain.rootName,
        memberName: segment?.keyExpression == null ? segment?.name ?? null : null,
        keyExpression: segment?.keyExpression ?? null,
        methodName: null,
        ...observedMemberSourceFields(segment?.memberSource ?? null),
        spanStart: chain.start,
        spanEnd: chain.end,
      });
      if (segment?.valueCanBeProxyWrapped === false) {
        return;
      }
    }
  }

  private recordCollectionRead(
    receiver: PropertyChain,
    methodName: string,
    spanNode: ts.Node,
  ): void {
    this.add({
      dependencyKind: RuntimeObservedDependencyKind.ProxyCollectionRead,
      expressionKind: 'ProxyCollectionCall',
      sourceName: sourceNameForChain(receiver),
      sourceRootName: receiver.rootName,
      memberName: observedMemberNameForCollectionReceiver(receiver),
      keyExpression: null,
      methodName,
      ...observedMemberSourceFields(observedMemberSourceForCollectionReceiver(receiver)),
      spanStart: spanNode.getStart(this.sourceFile),
      spanEnd: spanNode.end,
    });
  }

  private recordImplicitPropertyRead(
    receiver: PropertyChain,
    memberName: string,
    expressionKind: string,
    spanNode: ts.Node,
    memberSource: RuntimeObservedMemberSourceProjection | null,
  ): void {
    this.add({
      dependencyKind: RuntimeObservedDependencyKind.ProxyPropertyRead,
      expressionKind,
      sourceName: `${sourceNameForChain(receiver)}.${memberName}`,
      sourceRootName: receiver.rootName,
      memberName,
      keyExpression: null,
      methodName: null,
      ...observedMemberSourceFields(memberSource),
      spanStart: spanNode.getStart(this.sourceFile),
      spanEnd: spanNode.end,
    });
  }

  private add(row: RuntimeObservedDependencyDraft): void {
    const key = runtimeObservedDependencySemanticKey(row);
    if (!this.rows.has(key)) {
      this.rows.set(key, row);
    }
  }

  private propertyChainForExpression(expression: ts.Expression): PropertyChain | null {
    return propertyChainForExpression(expression, this.rootNames, this.aliases, this.typeContext);
  }

  private trackableMethodDependenciesForCall(
    callee: ts.PropertyAccessExpression,
  ): readonly RuntimeObservedDependencyDraft[] {
    if (this.typeContext == null || this.propertyChainForExpression(callee.expression) == null) {
      return [];
    }
    const method = this.methodDeclarationForCallee(callee);
    if (method == null || this.trackableMethodStack.has(method)) {
      return [];
    }
    const dependency = readTrackableMethodDependency(method);
    if (dependency == null || dependency.dependencyMode === ComputedObservationDependencyMode.Disabled) {
      return [];
    }
    if (dependency.dependencyMode === ComputedObservationDependencyMode.ProxyAutoTrack) {
      return ProxyObservable.collectObservedDependencyDrafts(
        method,
        ProxyObservable.typeContextForChecker(this.typeContext.checker, this.typeContext.store ?? null),
        {
          rootNames: ['this'],
          parameterRootNames: true,
          trackableMethodStack: new Set([...this.trackableMethodStack, method]),
        },
      );
    }
    const receiverType = this.checkerTypeForExpression(callee.expression);
    return [
      ...dependency.dependencyKeyReads.flatMap((key) =>
        connectableDraftsForTrackableDependencyKey(key)
          .map((draft) => this.trackableReceiverDependencyDraft(draft, receiverType))
      ),
      ...dependency.dependencyFunctions.flatMap((fn) =>
        ProxyObservable.collectObservedDependencyDrafts(
          fn,
          ProxyObservable.typeContextForChecker(this.typeContext!.checker, this.typeContext?.store ?? null),
        )
      ),
    ];
  }

  private ordinaryMethodDependenciesForCall(
    callee: ts.PropertyAccessExpression,
    call: ts.CallExpression,
    receiver: PropertyChain,
  ): readonly RuntimeObservedDependencyDraft[] {
    if (this.typeContext == null) {
      return [];
    }
    const method = this.methodDeclarationForCallee(callee);
    if (method == null || this.trackableMethodStack.has(method) || readTrackableMethodDependency(method) != null) {
      return [];
    }
    const body = functionBodyOrExpression(method);
    if (body == null) {
      return [];
    }
    const aliases = new Map(this.aliases);
    aliases.set('this', aliasChain(receiver));
    method.parameters.forEach((parameter, index) => {
      if (!ts.isIdentifier(parameter.name)) {
        return;
      }
      const argument = call.arguments[index] ?? null;
      const argumentChain = argument == null ? null : this.propertyChainForExpression(argument);
      if (argumentChain != null && propertyChainValueCanBeProxyWrapped(argumentChain)) {
        aliases.set(parameter.name.text, aliasChain(argumentChain));
      }
    });
    const nested = new RuntimeProxyObservedDependencyDraftCollector(
      method.getSourceFile(),
      this.rootNames,
      this.typeContext,
      aliases,
      new Set([...this.trackableMethodStack, method]),
    );
    nested.visit(body);
    return nested.read();
  }

  private trackableReceiverDependencyDraft<TDraft extends RuntimeObservedDependencyDraft>(
    draft: TDraft,
    receiverType: ts.Type | null,
  ): TDraft {
    const withSource = observedDependencyWithMemberSourceForCheckerType(
      this.typeContext?.store,
      this.typeContext!.checker,
      receiverType,
      draft,
    );
    return withoutTemplateExpressionProjection(withSource);
  }

  private checkerTypeForExpression(
    expression: ts.Expression,
  ): ts.Type | null {
    const programExpression = this.typeContext?.readProgramNode(expression) ?? null;
    return programExpression == null
      ? null
      : this.typeContext?.checker.getTypeAtLocation(programExpression) ?? null;
  }

  private methodDeclarationForCallee(
    callee: ts.PropertyAccessExpression,
  ): ts.MethodDeclaration | null {
    const programCallee = this.typeContext?.readProgramNode(callee) ?? callee;
    const symbol = this.typeContext?.checker.getSymbolAtLocation(programCallee.name) ?? null;
    const declaration = symbol?.declarations?.find(ts.isMethodDeclaration) ?? null;
    return declaration;
  }

  private receiverCanUseProxyObservedCollectionMethod(
    receiver: ts.Expression,
    methodName: string,
  ): boolean {
    if (this.typeContext == null) {
      return true;
    }
    const programReceiver = this.typeContext.readProgramNode(receiver);
    if (programReceiver == null) {
      return true;
    }
    const type = this.typeContext.checker.getTypeAtLocation(programReceiver);
    return checkerTypeCanUseProxyObservedCollectionMethod(this.typeContext.checker, type, methodName);
  }

  private receiverCanUseProxyInterceptedCollectionMethod(
    receiver: ts.Expression,
    methodName: string,
  ): boolean {
    if (this.typeContext == null) {
      return proxyInterceptedCollectionMethods.has(methodName);
    }
    const programReceiver = this.typeContext.readProgramNode(receiver);
    if (programReceiver == null) {
      return proxyInterceptedCollectionMethods.has(methodName);
    }
    const type = this.typeContext.checker.getTypeAtLocation(programReceiver);
    return checkerTypeCanUseProxyInterceptedCollectionMethod(this.typeContext.checker, type, methodName);
  }

  private collectionCallbackObservationPolicy(
    methodName: string,
    receiver: ts.Expression,
  ): { readonly visitCallback: boolean; readonly wrappedParameterIndexes: readonly number[] } {
    switch (methodName) {
      case 'map':
      case 'every':
      case 'filter':
      case 'find':
      case 'findIndex':
      case 'flatMap':
      case 'some':
        return { visitCallback: true, wrappedParameterIndexes: [0] };
      case 'reduce':
      case 'reduceRight':
        return { visitCallback: true, wrappedParameterIndexes: [1] };
      case 'sort':
        return { visitCallback: true, wrappedParameterIndexes: [] };
      case 'forEach': {
        const receiverKind = this.receiverProxyObservedCollectionKind(receiver);
        const wrappedParameterIndexes = receiverKind === 'map' || receiverKind === 'set' || receiverKind === 'unknown'
          ? [0, 1]
          : [0];
        return { visitCallback: true, wrappedParameterIndexes };
      }
      default:
        return { visitCallback: false, wrappedParameterIndexes: [] };
    }
  }

  private receiverProxyObservedCollectionKind(
    receiver: ts.Expression,
  ): ProxyObservedCollectionReceiverKind {
    if (this.typeContext == null) {
      return 'unknown';
    }
    const programReceiver = this.typeContext.readProgramNode(receiver);
    if (programReceiver == null) {
      return 'unknown';
    }
    const type = this.typeContext.checker.getTypeAtLocation(programReceiver);
    return checkerTypeProxyObservedCollectionKind(this.typeContext.checker, type);
  }

  private proxyObservedForOfIterationForExpression(
    expression: ts.Expression,
  ): ProxyObservedForOfIteration | null {
    const unwrapped = unwrapChainExpression(expression);
    if (ts.isCallExpression(unwrapped) && ts.isPropertyAccessExpression(unwrapped.expression)) {
      const methodName = unwrapped.expression.name.text;
      if (methodName !== 'keys' && methodName !== 'values' && methodName !== 'entries') {
        return null;
      }
      const receiver = this.propertyChainForExpression(unwrapped.expression.expression);
      return receiver != null
        && propertyChainValueCanBeProxyWrapped(receiver)
        && this.receiverCanUseProxyObservedCollectionMethod(unwrapped.expression.expression, methodName)
        ? {
          receiver,
          receiverExpression: unwrapped.expression.expression,
          methodName,
          spanNode: unwrapped.expression,
        }
        : null;
    }

    const receiver = this.propertyChainForExpression(unwrapped);
    return receiver != null
      && propertyChainValueCanBeProxyWrapped(receiver)
      && this.receiverCanUseProxyObservedForOf(unwrapped)
      ? {
        receiver,
        receiverExpression: unwrapped,
        methodName: proxyIteratorMethodName,
        spanNode: unwrapped,
      }
      : null;
  }

  private proxyObservedForInOwnKeysForExpression(
    expression: ts.Expression,
  ): ProxyObservedForInOwnKeys | null {
    const unwrapped = unwrapChainExpression(expression);
    const receiver = this.propertyChainForExpression(unwrapped);
    return receiver != null
      && propertyChainValueCanBeProxyWrapped(receiver)
      && this.receiverCanUseProxyObservedArrayOwnKeys(unwrapped)
      ? {
        receiver,
        receiverExpression: unwrapped,
        memberSource: observedMemberSourceForImplicitPropertyRead(
          this.typeContext,
          unwrapped,
          proxyOwnKeysLengthMemberName,
        ),
        spanNode: unwrapped,
      }
      : null;
  }

  private receiverCanUseProxyObservedForOf(
    receiver: ts.Expression,
  ): boolean {
    if (this.typeContext == null) {
      return true;
    }
    const programReceiver = this.typeContext.readProgramNode(receiver);
    if (programReceiver == null) {
      return true;
    }
    const type = this.typeContext.checker.getTypeAtLocation(programReceiver);
    return checkerTypeProxyObservedCollectionKind(this.typeContext.checker, type) !== 'none';
  }

  private receiverCanUseProxyObservedArrayOwnKeys(
    receiver: ts.Expression,
  ): boolean {
    if (this.typeContext == null) {
      return true;
    }
    const programReceiver = this.typeContext.readProgramNode(receiver);
    if (programReceiver == null) {
      return true;
    }
    const type = this.typeContext.checker.getTypeAtLocation(programReceiver);
    const kind = checkerTypeProxyObservedCollectionKind(this.typeContext.checker, type);
    return kind === 'array' || kind === 'unknown';
  }

  private expressionCanBeProxyWrapped(
    expression: ts.Expression,
  ): boolean {
    return expressionCanBeProxyWrapped(this.typeContext, expression);
  }

  private bindingNameCanBeProxyWrapped(
    name: ts.BindingName,
  ): boolean {
    if (this.typeContext == null) {
      return true;
    }
    const programName = this.typeContext.readProgramNode(name);
    if (programName == null) {
      return true;
    }
    const type = this.typeContext.checker.getTypeAtLocation(programName);
    return checkerTypeCanBeProxyWrapped(this.typeContext.checker, type);
  }

  private proxyWrappableBindingRootNames(
    name: ts.BindingName,
  ): readonly string[] {
    if (ts.isIdentifier(name)) {
      return this.bindingNameCanBeProxyWrapped(name)
        ? [name.text]
        : [];
    }
    if (ts.isObjectBindingPattern(name)) {
      return name.elements.flatMap((element) => this.proxyWrappableBindingRootNames(element.name));
    }
    return name.elements.flatMap((element) =>
      ts.isOmittedExpression(element)
        ? []
        : this.proxyWrappableBindingRootNames(element.name)
    );
  }

  private forOfProxyWrappableBindingRootNames(
    initializer: ts.ForOfStatement['initializer'],
  ): readonly string[] {
    if (ts.isVariableDeclarationList(initializer)) {
      return initializer.declarations.flatMap((declaration) =>
        this.proxyWrappableBindingRootNames(declaration.name)
      );
    }
    return ts.isIdentifier(initializer) && this.bindingNameCanBeProxyWrapped(initializer)
      ? [initializer.text]
      : [];
  }

  private addProxyWrappableRootNamesForBindingName(
    name: ts.BindingName,
  ): void {
    for (const rootName of this.proxyWrappableBindingRootNames(name)) {
      this.rootNames.add(rootName);
    }
  }
}

interface PropertyChain {
  readonly rootName: string;
  readonly segments: readonly PropertyChainSegment[];
  readonly start: number;
  readonly end: number;
  readonly observedSegmentStartIndex: number;
  readonly rootCanBeProxyWrapped: boolean | null;
}

interface PropertyChainSegment {
  readonly name: string;
  readonly keyExpression?: string | null;
  readonly memberSource: RuntimeObservedMemberSourceProjection | null;
  readonly observed?: boolean;
  readonly skipObservation?: boolean;
  readonly valueCanBeProxyWrapped?: boolean | null;
}

function propertyChainForExpression(
  expression: ts.Expression,
  rootNames: ReadonlySet<string>,
  aliases: ReadonlyMap<string, PropertyChain>,
  typeContext: RuntimeProxyObservedDependencyTypeContext | null,
): PropertyChain | null {
  if (ts.isIdentifier(expression)) {
    const alias = aliases.get(expression.text);
    if (alias != null) {
      return {
        ...alias,
        start: expression.getStart(expression.getSourceFile()),
        end: expression.end,
        observedSegmentStartIndex: alias.segments.length,
      };
    }
    return rootNames.has(expression.text)
      ? {
        rootName: expression.text,
        segments: [],
        start: expression.getStart(expression.getSourceFile()),
        end: expression.end,
        observedSegmentStartIndex: 0,
        rootCanBeProxyWrapped: expressionCanBeProxyWrapped(typeContext, expression),
      }
      : null;
  }
  if (expression.kind === ts.SyntaxKind.ThisKeyword) {
    const alias = aliases.get('this');
    if (alias != null) {
      return {
        ...alias,
        start: expression.getStart(expression.getSourceFile()),
        end: expression.end,
        observedSegmentStartIndex: alias.segments.length,
      };
    }
    return rootNames.has('this')
      ? {
        rootName: 'this',
        segments: [],
        start: expression.getStart(expression.getSourceFile()),
        end: expression.end,
        observedSegmentStartIndex: 0,
        rootCanBeProxyWrapped: expressionCanBeProxyWrapped(typeContext, expression),
      }
      : null;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    const owner = propertyChainForExpression(expression.expression, rootNames, aliases, typeContext);
    return owner == null
      ? null
      : {
        rootName: owner.rootName,
        segments: [
          ...owner.segments,
          {
            name: expression.name.text,
            memberSource: observedMemberSourceForPropertyAccess(typeContext, expression),
            skipObservation: propertyAccessHasNowrapDecorator(typeContext, expression),
            valueCanBeProxyWrapped: expressionCanBeProxyWrapped(typeContext, expression),
          },
        ],
        start: expression.getStart(expression.getSourceFile()),
        end: expression.end,
        observedSegmentStartIndex: owner.observedSegmentStartIndex,
        rootCanBeProxyWrapped: owner.rootCanBeProxyWrapped,
      };
  }
  if (ts.isElementAccessExpression(expression)) {
    const owner = propertyChainForExpression(expression.expression, rootNames, aliases, typeContext);
    const segment = propertyChainSegmentForElementAccess(typeContext, expression);
    return owner == null || segment == null
      ? null
      : {
        rootName: owner.rootName,
        segments: [
          ...owner.segments,
          segment,
        ],
        start: expression.getStart(expression.getSourceFile()),
        end: expression.end,
        observedSegmentStartIndex: owner.observedSegmentStartIndex,
        rootCanBeProxyWrapped: owner.rootCanBeProxyWrapped,
      };
  }
  if (ts.isCallExpression(expression)) {
    return proxyWrappedCallResultChainForExpression(expression, rootNames, aliases, typeContext);
  }
  if (ts.isParenthesizedExpression(expression) || ts.isNonNullExpression(expression)) {
    return propertyChainForExpression(expression.expression, rootNames, aliases, typeContext);
  }
  return null;
}

interface ProxyObservedForOfIteration {
  readonly receiver: PropertyChain;
  readonly receiverExpression: ts.Expression;
  readonly methodName: string;
  readonly spanNode: ts.Node;
}

interface ProxyObservedForInOwnKeys {
  readonly receiver: PropertyChain;
  readonly receiverExpression: ts.Expression;
  readonly memberSource: RuntimeObservedMemberSourceProjection | null;
  readonly spanNode: ts.Node;
}

function aliasChain(
  chain: PropertyChain,
): PropertyChain {
  return {
    ...chain,
    observedSegmentStartIndex: chain.segments.length,
  };
}

function propertyChainSegmentStopsProxyObservation(
  segment: PropertyChainSegment | null,
): boolean {
  return segment?.skipObservation === true;
}

function propertyChainValueCanBeProxyWrapped(
  chain: PropertyChain,
): boolean {
  if (chain.rootCanBeProxyWrapped === false) {
    return false;
  }
  for (const segment of chain.segments) {
    if (segment.skipObservation === true || segment.valueCanBeProxyWrapped === false) {
      return false;
    }
  }
  return true;
}

function observedMemberSourceForPropertyAccess(
  typeContext: RuntimeProxyObservedDependencyTypeContext | null,
  expression: ts.PropertyAccessExpression,
): RuntimeObservedMemberSourceProjection | null {
  if (typeContext?.store == null) {
    return null;
  }
  const programExpression = typeContext.readProgramNode(expression) ?? expression;
  const symbol = typeContext.checker.getSymbolAtLocation(programExpression.name);
  return observedMemberSourceForCheckerSymbol(typeContext.store, symbol);
}

function observedMemberSourceForElementAccess(
  typeContext: RuntimeProxyObservedDependencyTypeContext | null,
  expression: ts.ElementAccessExpression,
  key: string,
): RuntimeObservedMemberSourceProjection | null {
  if (typeContext?.store == null) {
    return null;
  }
  const programOwner = typeContext.readProgramNode(expression.expression) ?? expression.expression;
  const ownerType = typeContext.checker.getTypeAtLocation(programOwner);
  const symbol = typeContext.checker.getPropertyOfType(ownerType, key)
    ?? typeContext.checker.getPropertyOfType(typeContext.checker.getApparentType(ownerType), key)
    ?? null;
  return observedMemberSourceForCheckerSymbol(typeContext.store, symbol);
}

function propertyChainSegmentForElementAccess(
  typeContext: RuntimeProxyObservedDependencyTypeContext | null,
  expression: ts.ElementAccessExpression,
): PropertyChainSegment | null {
  const key = propertyKeyForElementAccess(expression.argumentExpression);
  if (key != null) {
    return {
      name: key,
      keyExpression: null,
      memberSource: observedMemberSourceForElementAccess(typeContext, expression, key),
      skipObservation: elementAccessHasNowrapProperty(typeContext, expression, key),
      valueCanBeProxyWrapped: expressionCanBeProxyWrapped(typeContext, expression),
    };
  }
  if (expression.argumentExpression == null) {
    return null;
  }
  const keyExpression = expression.argumentExpression.getText(expression.getSourceFile());
  return {
    name: `[${keyExpression}]`,
    keyExpression,
    memberSource: null,
    valueCanBeProxyWrapped: expressionCanBeProxyWrapped(typeContext, expression),
  };
}

function expressionCanBeProxyWrapped(
  typeContext: RuntimeProxyObservedDependencyTypeContext | null,
  expression: ts.Expression,
): boolean {
  if (typeContext == null) {
    return true;
  }
  const programExpression = typeContext.readProgramNode(expression);
  if (programExpression == null) {
    return true;
  }
  const type = typeContext.checker.getTypeAtLocation(programExpression);
  return checkerTypeCanBeProxyWrapped(typeContext.checker, type);
}

function propertyAccessHasNowrapDecorator(
  typeContext: RuntimeProxyObservedDependencyTypeContext | null,
  expression: ts.PropertyAccessExpression,
): boolean {
  if (typeContext == null) {
    return false;
  }
  const programExpression = typeContext.readProgramNode(expression) ?? expression;
  const symbol = typeContext.checker.getSymbolAtLocation(programExpression.name);
  if (declarationsHaveNowrapDecorator(symbol?.declarations)) {
    return true;
  }
  const programOwner = typeContext.readProgramNode(expression.expression) ?? expression.expression;
  const ownerType = typeContext.checker.getTypeAtLocation(programOwner);
  return checkerTypePropertyHasNowrapDecorator(typeContext.checker, ownerType, expression.name.text);
}

function elementAccessHasNowrapProperty(
  typeContext: RuntimeProxyObservedDependencyTypeContext | null,
  expression: ts.ElementAccessExpression,
  key: string,
): boolean {
  if (typeContext == null) {
    return false;
  }
  const programOwner = typeContext.readProgramNode(expression.expression) ?? expression.expression;
  const ownerType = typeContext.checker.getTypeAtLocation(programOwner);
  return checkerTypePropertyHasNowrapDecorator(typeContext.checker, ownerType, key);
}

function propertyExpressionHasNowrapDecorator(
  typeContext: RuntimeProxyObservedDependencyTypeContext | null,
  ownerExpression: ts.Expression,
  propertyName: string,
): boolean {
  if (typeContext == null) {
    return false;
  }
  const programOwner = typeContext.readProgramNode(ownerExpression) ?? ownerExpression;
  const ownerType = typeContext.checker.getTypeAtLocation(programOwner);
  return checkerTypePropertyHasNowrapDecorator(typeContext.checker, ownerType, propertyName);
}

function observedMemberSourceForImplicitPropertyRead(
  typeContext: RuntimeProxyObservedDependencyTypeContext | null,
  receiver: ts.Expression,
  key: string,
): RuntimeObservedMemberSourceProjection | null {
  if (typeContext?.store == null) {
    return null;
  }
  const programReceiver = typeContext.readProgramNode(receiver) ?? receiver;
  const receiverType = typeContext.checker.getTypeAtLocation(programReceiver);
  const symbol = typeContext.checker.getPropertyOfType(receiverType, key)
    ?? typeContext.checker.getPropertyOfType(typeContext.checker.getApparentType(receiverType), key)
    ?? null;
  return observedMemberSourceForCheckerSymbol(typeContext.store, symbol);
}

function sourceNameForChain(
  chain: PropertyChain,
  segmentCount: number = chain.segments.length,
): string {
  let sourceName = chain.rootName;
  for (const segment of chain.segments.slice(0, segmentCount)) {
    sourceName += segment.keyExpression == null
      ? `.${segment.name}`
      : segment.name;
  }
  return sourceName;
}

function observedMemberNameForCollectionReceiver(
  receiver: PropertyChain,
): string | null {
  const last = receiver.segments.at(-1) ?? null;
  return last?.observed === false || last?.keyExpression != null
    ? null
    : last?.name ?? null;
}

function observedMemberSourceForCollectionReceiver(
  receiver: PropertyChain,
): RuntimeObservedMemberSourceProjection | null {
  const last = receiver.segments.at(-1) ?? null;
  return last?.observed === false
    ? null
    : last?.memberSource ?? null;
}

function proxyWrappedCallResultChainForExpression(
  expression: ts.CallExpression,
  rootNames: ReadonlySet<string>,
  aliases: ReadonlyMap<string, PropertyChain>,
  typeContext: RuntimeProxyObservedDependencyTypeContext | null,
): PropertyChain | null {
  const callee = expression.expression;
  if (!ts.isPropertyAccessExpression(callee)) {
    return null;
  }
  const methodName = callee.name.text;
  if (!proxyWrappedCallResultMethods.has(methodName)) {
    return null;
  }
  const receiver = propertyChainForExpression(callee.expression, rootNames, aliases, typeContext);
  if (
    receiver == null
    || !propertyChainValueCanBeProxyWrapped(receiver)
    || !receiverCanUseProxyWrappedCallResultMethod(typeContext, callee.expression, methodName)
  ) {
    return null;
  }
  if (!callResultCanBeProxyWrapped(typeContext, expression)) {
    return null;
  }
  return {
    rootName: receiver.rootName,
    segments: [
      ...receiver.segments,
      {
        name: `${methodName}()`,
        memberSource: null,
        observed: false,
        valueCanBeProxyWrapped: true,
      },
    ],
    start: expression.getStart(expression.getSourceFile()),
    end: expression.end,
    observedSegmentStartIndex: receiver.observedSegmentStartIndex,
    rootCanBeProxyWrapped: receiver.rootCanBeProxyWrapped,
  };
}

function receiverCanUseProxyWrappedCallResultMethod(
  typeContext: RuntimeProxyObservedDependencyTypeContext | null,
  receiver: ts.Expression,
  methodName: string,
): boolean {
  if (typeContext == null) {
    return true;
  }
  const programReceiver = typeContext.readProgramNode(receiver);
  if (programReceiver == null) {
    return true;
  }
  const type = typeContext.checker.getTypeAtLocation(programReceiver);
  return checkerTypeCanUseProxyCollectionMethod(
    typeContext.checker,
    type,
    methodName,
    'wrappedResultMethods',
    proxyWrappedCallResultMethods,
  );
}

function callResultCanBeProxyWrapped(
  typeContext: RuntimeProxyObservedDependencyTypeContext | null,
  expression: ts.CallExpression,
): boolean {
  if (typeContext == null) {
    return true;
  }
  const programExpression = typeContext.readProgramNode(expression);
  if (programExpression == null) {
    return true;
  }
  const type = typeContext.checker.getTypeAtLocation(programExpression);
  return checkerTypeCanBeProxyWrapped(typeContext.checker, type);
}

function withoutTemplateExpressionProjection<TDraft extends RuntimeObservedDependencyDraft>(
  draft: TDraft,
): TDraft {
  return {
    ...draft,
    memberNameSpanStart: null,
    scopeLookupAncestor: null,
  };
}

function bindingElementPropertyName(
  element: ts.BindingElement,
): string | null {
  if (element.propertyName == null) {
    return ts.isIdentifier(element.name) ? element.name.text : null;
  }
  if (ts.isIdentifier(element.propertyName) || ts.isStringLiteralLike(element.propertyName) || ts.isNumericLiteral(element.propertyName)) {
    return element.propertyName.text;
  }
  return null;
}

function propertyKeyForElementAccess(
  expression: ts.Expression | undefined,
): string | null {
  if (expression == null) {
    return null;
  }
  if (ts.isStringLiteralLike(expression) || ts.isNumericLiteral(expression)) {
    return expression.text;
  }
  return null;
}

function unwrapChainExpression(
  expression: ts.Expression,
): ts.Expression {
  return ts.isParenthesizedExpression(expression) || ts.isNonNullExpression(expression)
    ? unwrapChainExpression(expression.expression)
    : expression;
}

function checkerTypeCanUseProxyObservedCollectionMethod(
  checker: ts.TypeChecker,
  type: ts.Type,
  methodName: string,
): boolean {
  return checkerTypeCanUseProxyCollectionMethod(
    checker,
    type,
    methodName,
    'observedMethods',
    proxyObservedCollectionMethods,
  );
}

function checkerTypeCanUseProxyInterceptedCollectionMethod(
  checker: ts.TypeChecker,
  type: ts.Type,
  methodName: string,
): boolean {
  return checkerTypeCanUseProxyCollectionMethod(
    checker,
    type,
    methodName,
    'interceptedMethods',
    proxyInterceptedCollectionMethods,
  );
}

function checkerTypeCanUseProxyCollectionMethod(
  checker: ts.TypeChecker,
  type: ts.Type,
  methodName: string,
  methodSet: keyof ProxyCollectionMethodPolicy,
  unknownMethods: ReadonlySet<string>,
): boolean {
  const kind = checkerTypeProxyObservedCollectionKind(checker, type);
  return proxyCollectionReceiverCanUseMethod(
    kind,
    methodName,
    methodSet,
    unknownMethods,
  );
}

function proxyCollectionReceiverCanUseMethod(
  kind: ProxyObservedCollectionReceiverKind,
  methodName: string,
  methodSet: keyof ProxyCollectionMethodPolicy,
  unknownMethods: ReadonlySet<string>,
): boolean {
  if (kind === 'unknown') {
    return unknownMethods.has(methodName);
  }
  if (kind === 'none') {
    return false;
  }
  return proxyCollectionMethodPolicies[kind][methodSet].has(methodName);
}

function checkerTypeProxyObservedCollectionKind(
  checker: ts.TypeChecker,
  type: ts.Type,
): ProxyObservedCollectionReceiverKind {
  if (type.isUnion()) {
    const relevant = type.types.filter((part) => !checkerNullishType(checker, part));
    const kinds = new Set(relevant.map((part) => checkerTypeProxyObservedCollectionKind(checker, part))
      .filter((kind) => kind !== 'none'));
    return kinds.size === 0
      ? 'none'
      : kinds.size === 1
        ? [...kinds][0] ?? 'none'
        : 'unknown';
  }
  if ((type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.TypeParameter)) !== 0) {
    return 'unknown';
  }
  if (checker.isArrayType(type) || checker.isTupleType(type)) {
    return 'array';
  }
  const symbolName = checkerCollectionSymbolName(type);
  if (symbolName === 'Map' || symbolName === 'ReadonlyMap') {
    return 'map';
  }
  if (symbolName === 'Set' || symbolName === 'ReadonlySet') {
    return 'set';
  }
  return 'none';
}

function checkerTypeCanBeProxyWrapped(
  checker: ts.TypeChecker,
  type: ts.Type,
): boolean {
  if (type.isUnion()) {
    return type.types
      .filter((part) => !checkerNullishType(checker, part))
      .some((part) => checkerTypeCanBeProxyWrapped(checker, part));
  }
  if (checkerNullishType(checker, type)) {
    return false;
  }
  if ((type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.TypeParameter)) !== 0) {
    return true;
  }
  if (checker.isArrayType(type) || checker.isTupleType(type)) {
    return true;
  }
  const symbolName = checkerCollectionSymbolName(type);
  if (symbolName === 'Map' || symbolName === 'ReadonlyMap' || symbolName === 'Set' || symbolName === 'ReadonlySet') {
    return true;
  }
  if ((type.flags & (ts.TypeFlags.Object | ts.TypeFlags.NonPrimitive)) === 0) {
    return false;
  }
  const apparentType = checker.getApparentType(type);
  if (type.getCallSignatures().length > 0 || apparentType.getCallSignatures().length > 0) {
    return false;
  }
  if (checkerTypeHasNowrapClassDecorator(checker, type)) {
    return false;
  }
  return !checkerTypeHasDefaultLibraryNonPlainObjectBrand(checker, type);
}

function checkerTypeHasDefaultLibraryNonPlainObjectBrand(
  checker: ts.TypeChecker,
  type: ts.Type,
  seen: Set<ts.Type> = new Set(),
): boolean {
  if (seen.has(type)) {
    return false;
  }
  seen.add(type);
  const apparentType = checker.getApparentType(type);
  // Static approximation of ProxyObservable.canWrap(): runtime wraps Object/Array/Map/Set brands,
  // so known TS default-library object brands such as Date/Error/URL/RegExp leave the proxy chain.
  const symbolName = checkerCollectionSymbolName(apparentType)
    ?? type.getSymbol()?.getName()
    ?? apparentType.getSymbol()?.getName()
    ?? null;
  if (symbolName != null
    && symbolName !== '__type'
    && symbolName !== 'Object'
    && symbolName !== 'ObjectConstructor'
    && checkerTypeHasDefaultLibraryDeclaration(type, apparentType)) {
    return true;
  }
  return checkerBaseTypes(type).some((baseType) =>
    checkerTypeHasDefaultLibraryNonPlainObjectBrand(checker, baseType, seen)
  );
}

function checkerTypeHasDefaultLibraryDeclaration(
  type: ts.Type,
  apparentType: ts.Type,
): boolean {
  const declarations = [
    ...(type.getSymbol()?.declarations ?? []),
    ...(apparentType.getSymbol()?.declarations ?? []),
  ];
  return declarations.some((declaration) =>
    sourceFileIsTypeScriptDefaultLibrary(declaration.getSourceFile())
  );
}

function sourceFileIsTypeScriptDefaultLibrary(
  sourceFile: ts.SourceFile,
): boolean {
  return /(?:^|[/\\])typescript[/\\]lib[/\\]lib\.[^/\\]+\.d\.ts$/.test(sourceFile.fileName);
}

function checkerTypePropertyHasNowrapDecorator(
  checker: ts.TypeChecker,
  type: ts.Type,
  propertyName: string,
  seen: Set<ts.Type> = new Set(),
): boolean {
  if (type.isUnion()) {
    return type.types
      .filter((part) => !checkerNullishType(checker, part))
      .some((part) => checkerTypePropertyHasNowrapDecorator(checker, part, propertyName, seen));
  }
  if (seen.has(type)) {
    return false;
  }
  seen.add(type);
  const apparentType = checker.getApparentType(type);
  const property = checker.getPropertyOfType(type, propertyName)
    ?? checker.getPropertyOfType(apparentType, propertyName)
    ?? null;
  if (declarationsHaveNowrapDecorator(property?.declarations)) {
    return true;
  }
  return checkerBaseTypes(type).some((baseType) =>
    checkerTypePropertyHasNowrapDecorator(checker, baseType, propertyName, seen)
  );
}

function checkerTypeHasNowrapClassDecorator(
  checker: ts.TypeChecker,
  type: ts.Type,
  seen: Set<ts.Type> = new Set(),
): boolean {
  if (type.isUnion()) {
    return type.types
      .filter((part) => !checkerNullishType(checker, part))
      .some((part) => checkerTypeHasNowrapClassDecorator(checker, part, seen));
  }
  if (seen.has(type)) {
    return false;
  }
  seen.add(type);
  const apparentType = checker.getApparentType(type);
  const symbols = [
    type.getSymbol() ?? null,
    apparentType.getSymbol() ?? null,
  ];
  for (const symbol of symbols) {
    if (declarationsHaveNowrapDecorator(symbol?.declarations)) {
      return true;
    }
  }
  return checkerBaseTypes(type).some((baseType) =>
    checkerTypeHasNowrapClassDecorator(checker, baseType, seen)
  );
}

function checkerBaseTypes(
  type: ts.Type,
): readonly ts.Type[] {
  const baseTypes = (type as ts.InterfaceType).getBaseTypes;
  return typeof baseTypes === 'function'
    ? baseTypes.call(type as ts.InterfaceType) ?? []
    : [];
}

function declarationsHaveNowrapDecorator(
  declarations: readonly ts.Declaration[] | undefined,
): boolean {
  return declarations?.some((declaration) =>
    ts.canHaveDecorators(declaration)
    && (ts.getDecorators(declaration) ?? []).some((decorator) => decoratorIsNowrap(decorator))
  ) ?? false;
}

function decoratorIsNowrap(
  decorator: ts.Decorator,
): boolean {
  const expression = unwrapExpression(decorator.expression);
  const callee = ts.isCallExpression(expression)
    ? expression.expression
    : expression;
  return readImportedExportName(
    callee,
    nowrapBindingsForSourceFile(decorator.getSourceFile()),
    true,
  ) === 'nowrap';
}

function nowrapBindingsForSourceFile(
  sourceFile: ts.SourceFile,
): SourceImportBindings {
  let bindings = nowrapImportBindings.get(sourceFile);
  if (bindings == null) {
    bindings = readSourceImportBindings(
      sourceFile,
      aureliaNowrapDecoratorModules,
      aureliaNowrapDecoratorExports,
    );
    nowrapImportBindings.set(sourceFile, bindings);
  }
  return bindings;
}
