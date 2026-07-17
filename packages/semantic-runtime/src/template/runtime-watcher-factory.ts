import type { AddressHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import ts from 'typescript';
import { ExpressionParser } from '../expression/expression-parser.js';
import type { ExpressionAstNode } from '../expression/ast.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import { sourceFileAddressForAddress } from '../kernel/source-address.js';
import {
  collectRuntimeConnectableObservedDependencyDrafts,
} from '../observation/connectable-observed-dependency.js';
import {
  ProxyObservable,
} from '../observation/proxy-observable-dependency.js';
import { RuntimeWatcherObservedDependency } from '../observation/runtime-watcher-observation.js';
import {
  distinctRuntimeObservedDependencyDrafts,
  type RuntimeObservedDependencyDraft,
} from '../observation/runtime-observed-dependency-draft.js';
import type { CustomAttributeDefinition } from '../resources/custom-attribute-definition.js';
import type { CustomElementDefinition } from '../resources/custom-element-definition.js';
import type { ResourceTargetReference } from '../resources/resource-reference.js';
import {
  WatchExpressionKind,
  type WatchDefinition,
} from '../resources/watch-definition.js';
import type { TypeSystemProject } from '../type-system/project.js';
import type { RuntimeControllerFrame } from './runtime-controller.js';
import {
  ComputedWatcher,
  ExpressionWatcher,
  RuntimeWatcherKind,
  RuntimeWatcherReference,
  type RuntimeWatcher,
} from './runtime-watcher.js';
import {
  runtimeExpressionParseContextForAddress,
  sourceAddressForRuntimeExpressionBounds,
} from './runtime-expression-source-address.js';

const watcherExpressionParser = new ExpressionParser();

export function runtimeWatchersForDefinition(
  store: KernelStore,
  publication: KernelPublicationContext,
  local: string,
  frame: RuntimeControllerFrame,
  definition: CustomElementDefinition | CustomAttributeDefinition | null,
  typeSystem: TypeSystemProject | null = null,
): readonly RuntimeWatcher[] {
  if (definition == null || definition.watches.length === 0) {
    return [];
  }
  return definition.watches.map((watch, index) =>
    runtimeWatcherForDefinitionWatch(
      store,
      publication,
      `${local}:watch:${index}`,
      frame,
      definition,
      watch,
      index,
      typeSystem,
    )
  );
}

function runtimeWatcherForDefinitionWatch(
  store: KernelStore,
  publication: KernelPublicationContext,
  local: string,
  frame: RuntimeControllerFrame,
  definition: CustomElementDefinition | CustomAttributeDefinition,
  watch: WatchDefinition,
  watchIndex: number,
  typeSystem: TypeSystemProject | null,
): RuntimeWatcher {
  const productHandle = store.handles.product(local);
  const identityHandle = store.handles.identity(local);
  const sourceAddressHandle = sourceAddressForWatch(watch, definition);
  const watcherKind = watch.expression.kind === WatchExpressionKind.DependencyCollectionFunction
    ? RuntimeWatcherKind.Computed
    : RuntimeWatcherKind.Expression;
  const watcherReference = new RuntimeWatcherReference(watcherKind, productHandle, identityHandle, sourceAddressHandle);
  const observedDependencies = runtimeWatcherObservedDependenciesForWatch(
    store,
    publication,
    local,
    watcherReference,
    watch,
    sourceAddressHandle,
    typeSystem,
  );
  return watcherKind === RuntimeWatcherKind.Computed
    ? new ComputedWatcher(
      productHandle,
      identityHandle,
      frame.productHandle,
      frame.identityHandle,
      definition.productHandle,
      watchIndex,
      watch.expression,
      watch.callback,
      watch.flush,
      sourceAddressHandle,
      observedDependencies,
    )
    : new ExpressionWatcher(
      productHandle,
      identityHandle,
      frame.productHandle,
      frame.identityHandle,
      definition.productHandle,
      watchIndex,
      watch.expression,
      watch.callback,
      watch.flush,
      sourceAddressHandle,
      observedDependencies,
    );
}

function sourceAddressForWatch(
  watch: WatchDefinition,
  definition: CustomElementDefinition | CustomAttributeDefinition,
): AddressHandle | null {
  return watch.expression.target?.addressHandle
    ?? watch.expression.propertyKey?.target?.addressHandle
    ?? watch.callback.target?.addressHandle
    ?? watch.callback.methodName?.target?.addressHandle
    ?? definition.sourceAddressHandle;
}

function runtimeWatcherObservedDependenciesForWatch(
  store: KernelStore,
  publication: KernelPublicationContext,
  local: string,
  watcher: RuntimeWatcherReference,
  watch: WatchDefinition,
  sourceAddressHandle: AddressHandle | null,
  typeSystem: TypeSystemProject | null,
): readonly RuntimeWatcherObservedDependency[] {
  const drafts: readonly RuntimeObservedDependencyDraft[] = watch.expression.kind === WatchExpressionKind.DependencyCollectionFunction
    ? proxyObservedDependencyDraftsForComputedWatcher(typeSystem, store, publication, watch.expression.target)
    : connectableObservedDependencyDraftsForExpressionWatcher(publication, watch);
  const dependencies = distinctRuntimeObservedDependencyDrafts(drafts);
  return dependencies.map((dependency, index) => {
    const dependencyLocal = `${local}:observed-dependency:${index}`;
    const dependencySource = sourceAddressForRuntimeExpressionBounds(
      publication,
      dependencyLocal,
      sourceAddressHandle,
      dependency.spanStart,
      dependency.spanEnd,
    );
    return new RuntimeWatcherObservedDependency(
      store.handles.product(dependencyLocal),
      store.handles.identity(dependencyLocal),
      watcher,
      null,
      dependency.dependencyKind,
      dependency.expressionKind,
      dependency.sourceName,
      dependency.sourceRootName,
      dependency.memberName,
      dependency.keyExpression,
      dependency.methodName,
      dependency.observedMemberKind ?? null,
      dependency.observedMemberSourceAddressHandle ?? null,
      dependency.spanStart,
      dependency.spanEnd,
      dependencySource.handle,
      [],
    );
  });
}

function connectableObservedDependencyDraftsForExpressionWatcher(
  publication: KernelPublicationContext,
  watch: WatchDefinition,
) {
  const ast = expressionAstForExpressionWatcher(publication, watch);
  return ast == null
    ? []
    : collectRuntimeConnectableObservedDependencyDrafts(ast);
}

function proxyObservedDependencyDraftsForComputedWatcher(
  typeSystem: TypeSystemProject | null,
  store: KernelStore,
  publication: KernelPublicationContext,
  target: ResourceTargetReference | null,
) {
  const declaration = dependencyCollectionFunctionForTarget(typeSystem, publication, target);
  return declaration == null
    ? []
    : ProxyObservable.collectObservedDependencyDrafts(
      declaration,
      ProxyObservable.typeContextForTypeSystem(typeSystem, store, publication),
    );
}

function expressionAstForExpressionWatcher(
  publication: KernelPublicationContext,
  watch: WatchDefinition,
): ExpressionAstNode | null {
  if (watch.expression.kind !== WatchExpressionKind.PropertyKey) {
    return null;
  }
  const expression = watch.expression.propertyKey?.text;
  if (expression == null) {
    return null;
  }
  const result = watcherExpressionParser.parse(
    expression,
    'IsProperty',
    runtimeExpressionParseContextForAddress(publication, watch.expression.propertyKey?.target?.addressHandle ?? null),
  );
  return result.kind === ExpressionParseResultKind.ExpressionSuccess
    || result.kind === ExpressionParseResultKind.EmptyExpressionSuccess
    ? result.ast
    : null;
}

function dependencyCollectionFunctionForTarget(
  typeSystem: TypeSystemProject | null,
  publication: KernelPublicationContext,
  target: ResourceTargetReference | null,
): ts.FunctionLikeDeclaration | null {
  if (typeSystem == null || target == null) {
    return null;
  }
  const sourceFile = sourceFileForTarget(typeSystem, publication, target);
  if (sourceFile == null) {
    return null;
  }
  const span = sourceSpanForAddress(publication, target.addressHandle);
  return findDependencyCollectionFunction(sourceFile, target.localName, span);
}

function sourceFileForTarget(
  typeSystem: TypeSystemProject,
  publication: KernelPublicationContext,
  target: ResourceTargetReference,
): ts.SourceFile | null {
  if (target.moduleKey != null) {
    for (const moduleKey of sourceModuleKeyCandidates(target.moduleKey)) {
      const sourceFile = typeSystem.readProgramSourceFileByModuleKey(moduleKey);
      if (sourceFile != null) {
        return sourceFile;
      }
    }
  }
  const sourceFileAddress = sourceFileAddressForAddress(publication, target.addressHandle);
  return sourceFileAddress == null
    ? null
    : typeSystem.readProgramSourceFileByPath(sourceFileAddress.path);
}

function sourceModuleKeyCandidates(
  moduleKey: string,
): readonly string[] {
  const candidates = [moduleKey];
  for (const marker of [':closure', ':static:', ':instance:', ':new:']) {
    const index = moduleKey.indexOf(marker);
    if (index > 0) {
      candidates.push(moduleKey.slice(0, index));
    }
  }
  return candidates;
}

interface SourceSpanRange {
  readonly start: number;
  readonly end: number;
}

function sourceSpanForAddress(
  publication: KernelPublicationContext,
  addressHandle: AddressHandle | null,
): SourceSpanRange | null {
  if (addressHandle == null) {
    return null;
  }
  const address = publication.read(addressHandle);
  return address?.kind === 'source-span-address'
    ? { start: address.start, end: address.end }
    : null;
}

function findDependencyCollectionFunction(
  sourceFile: ts.SourceFile,
  localName: string | null,
  span: SourceSpanRange | null,
): ts.FunctionLikeDeclaration | null {
  let spanMatch: ts.FunctionLikeDeclaration | null = null;
  let nameMatch: ts.FunctionLikeDeclaration | null = null;
  const visit = (node: ts.Node): void => {
    if (isFunctionLikeDeclaration(node)) {
      if (span != null && node.getStart(sourceFile) <= span.start && span.end <= node.end) {
        spanMatch = narrowestFunctionLike(spanMatch, node, sourceFile);
      }
      if (localName != null && functionLikeName(node) === localName) {
        nameMatch = nameMatch ?? node;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return spanMatch ?? nameMatch;
}

function isFunctionLikeDeclaration(
  node: ts.Node,
): node is ts.FunctionLikeDeclaration {
  return ts.isArrowFunction(node)
    || ts.isFunctionExpression(node)
    || ts.isFunctionDeclaration(node)
    || ts.isMethodDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node);
}

function narrowestFunctionLike(
  current: ts.FunctionLikeDeclaration | null,
  next: ts.FunctionLikeDeclaration,
  sourceFile: ts.SourceFile,
): ts.FunctionLikeDeclaration {
  if (current == null) {
    return next;
  }
  return next.end - next.getStart(sourceFile) < current.end - current.getStart(sourceFile)
    ? next
    : current;
}

function functionLikeName(
  declaration: ts.FunctionLikeDeclaration,
): string | null {
  const name = declaration.name;
  return name != null && ts.isIdentifier(name)
    ? name.text
    : null;
}
