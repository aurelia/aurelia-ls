import type { AddressHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import ts from 'typescript';
import { ExpressionParser } from '../expression/expression-parser.js';
import type { ExpressionAstNode } from '../expression/ast.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import { sourceFileAddressForAddress } from '../kernel/source-address.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  runtimeConnectableObservedAccessUseDrafts,
} from '../observation/connectable-observed-dependency.js';
import {
  ProxyObservable,
} from '../observation/proxy-observable-dependency.js';
import { RuntimeWatcherObservedDependency } from '../observation/runtime-watcher-observation.js';
import {
  type RuntimeObservedDependencyAccessUseDraft,
} from '../observation/runtime-observed-dependency-draft.js';
import {
  observedDependencyAccessUseDrafts,
} from '../observation/runtime-observed-dependency-access-use.js';
import {
  observedMemberSourceFields,
  observedMemberSourceForRuntimeExpressionAccessUse,
  runtimeObservedDependencyOccurrence,
} from '../observation/observed-dependency-member-source.js';
import type { CustomAttributeDefinition } from '../resources/custom-attribute-definition.js';
import type { CustomElementDefinition } from '../resources/custom-element-definition.js';
import type { ResourceTargetReference } from '../resources/resource-reference.js';
import {
  WatchExpressionKind,
  type WatchDefinition,
} from '../resources/watch-definition.js';
import {
  RuntimeExpressionAccessOwnerKind,
  RuntimeExpressionAccessPhase,
  RuntimeExpressionAccessTargetResolution,
  RuntimeExpressionAccessTracking,
  RuntimeExpressionOperationKind,
} from '../runtime-expression/runtime-expression-access-use.js';
import type { RuntimeExpressionAccessDraft } from '../runtime-expression/runtime-expression-access-draft.js';
import {
  type RuntimeExpressionAccessPublication,
} from '../runtime-expression/runtime-expression-access-publication.js';
import {
  publishRuntimeSourceAccessUses,
  type RuntimeSourceAccessUseDraft,
  type RuntimeSourceAccessUsePublication,
} from '../runtime-expression/source-access-use-publication.js';
import {
  collectRuntimeTemplateAccessUseDrafts,
} from '../runtime-expression/template-access-use-collector.js';
import {
  collectRuntimeTypeScriptAccessUseCollection,
} from '../runtime-expression/typescript-access-use-collector.js';
import {
  RuntimeRootExpressionAccessTargetProjector,
} from '../runtime-expression/checker-access-target-projection.js';
import {
  RuntimeOperationRealization,
} from '../runtime-expression/runtime-operation.js';
import type { RuntimeOperationReachability } from '../runtime-expression/runtime-operation.js';
import type { TypeSystemProject } from '../type-system/project.js';
import type { CheckerExpressionTypeWorld } from '../type-system/expression-type-world.js';
import type { RuntimeControllerFrame } from './runtime-controller.js';
import {
  ComputedWatcher,
  ExpressionWatcher,
  RuntimeWatcherKind,
  RuntimeWatcherMaterialization,
  RuntimeWatcherReference,
} from './runtime-watcher.js';
import {
  runtimeExpressionParseContextForAddress,
} from './runtime-expression-source-address.js';

const watcherExpressionParser = new ExpressionParser();

export function runtimeWatcherMaterializationsForDefinition(
  store: KernelStore,
  publication: KernelPublicationContext,
  local: string,
  frame: RuntimeControllerFrame,
  definition: CustomElementDefinition | CustomAttributeDefinition | null,
  expressionWorld: CheckerExpressionTypeWorld,
  typeSystem: TypeSystemProject | null,
  reachability: RuntimeOperationReachability,
): readonly RuntimeWatcherMaterialization[] {
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
      expressionWorld,
      typeSystem,
      reachability,
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
  expressionWorld: CheckerExpressionTypeWorld,
  typeSystem: TypeSystemProject | null,
  reachability: RuntimeOperationReachability,
): RuntimeWatcherMaterialization {
  const productHandle = store.handles.product(local);
  const identityHandle = store.handles.identity(local);
  const sourceAddressHandle = sourceAddressForWatch(watch, definition);
  const watcherKind = watch.expression.kind === WatchExpressionKind.DependencyCollectionFunction
    ? RuntimeWatcherKind.Computed
    : RuntimeWatcherKind.Expression;
  const watcherReference = new RuntimeWatcherReference(watcherKind, productHandle, identityHandle, sourceAddressHandle);
  const accessUseEmission = runtimeWatcherAccessUseEmissionForWatch(
    store,
    publication,
    local,
    watcherReference,
    definition,
    watch,
    sourceAddressHandle,
    frame.provenanceHandle,
    expressionWorld,
    typeSystem,
    reachability,
  );
  const observedDependencies = runtimeWatcherObservedDependenciesForAccessUses(
    store,
    local,
    watcherReference,
    accessUseEmission.dependencies,
    accessUseEmission.publication,
  );
  const watcher = watcherKind === RuntimeWatcherKind.Computed
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
      accessUseEmission.publication.accessUses,
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
      accessUseEmission.publication.accessUses,
      observedDependencies,
    );
  return new RuntimeWatcherMaterialization(
    watcher,
    accessUseEmission.publication.publications,
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

class RuntimeWatcherAccessUseEmission {
  constructor(
    readonly publication: RuntimeSourceAccessUsePublication,
    readonly dependencies: readonly RuntimeObservedDependencyAccessUseDraft[],
  ) {}
}

function runtimeWatcherAccessUseEmissionForWatch(
  store: KernelStore,
  publication: KernelPublicationContext,
  local: string,
  watcher: RuntimeWatcherReference,
  definition: CustomElementDefinition | CustomAttributeDefinition,
  watch: WatchDefinition,
  sourceAddressHandle: AddressHandle | null,
  provenanceHandle: RuntimeControllerFrame['provenanceHandle'],
  expressionWorld: CheckerExpressionTypeWorld,
  typeSystem: TypeSystemProject | null,
  reachability: RuntimeOperationReachability,
): RuntimeWatcherAccessUseEmission {
  return watch.expression.kind === WatchExpressionKind.DependencyCollectionFunction
    ? computedWatcherAccessUseEmission(
        store,
        publication,
        local,
        watcher,
        watch,
        sourceAddressHandle,
        provenanceHandle,
        typeSystem,
        reachability,
      )
    : expressionWatcherAccessUseEmission(
        store,
        publication,
        local,
        watcher,
        definition,
        watch,
        sourceAddressHandle,
        provenanceHandle,
        expressionWorld,
        reachability,
      );
}

function runtimeWatcherObservedDependenciesForAccessUses(
  store: KernelStore,
  local: string,
  watcher: RuntimeWatcherReference,
  dependencies: readonly RuntimeObservedDependencyAccessUseDraft[],
  publication: RuntimeSourceAccessUsePublication,
): readonly RuntimeWatcherObservedDependency[] {
  const accessUsesByHandle = new Map(
    publication.accessUses.map((accessUse) => [accessUse.productHandle, accessUse] as const),
  );
  return dependencies.map((dependency, index) => {
    const dependencyLocal = `${local}:observed-dependency:${index}`;
    const accessUse = accessUsesByHandle.get(dependency.accessUseProductHandle);
    if (accessUse == null) {
      throw new Error(
        `Runtime watcher dependency '${dependencyLocal}' lost access-use '${dependency.accessUseProductHandle}'.`,
      );
    }
    return new RuntimeWatcherObservedDependency(
      store.handles.product(dependencyLocal),
      store.handles.identity(dependencyLocal),
      watcher,
      null,
      runtimeObservedDependencyOccurrence({
        dependency,
        scope: null,
      }),
    );
  });
}

function expressionWatcherAccessUseEmission(
  store: KernelStore,
  publication: KernelPublicationContext,
  local: string,
  watcher: RuntimeWatcherReference,
  definition: CustomElementDefinition | CustomAttributeDefinition,
  watch: WatchDefinition,
  sourceAddressHandle: AddressHandle | null,
  provenanceHandle: RuntimeControllerFrame['provenanceHandle'],
  expressionWorld: CheckerExpressionTypeWorld,
  reachability: RuntimeOperationReachability,
): RuntimeWatcherAccessUseEmission {
  const ast = expressionAstForExpressionWatcher(publication, watch);
  const accessDrafts = ast == null
    ? []
    : collectRuntimeTemplateAccessUseDrafts({ expression: ast });
  const observationEffects = runtimeConnectableObservedAccessUseDrafts(accessDrafts, null, ast);
  const connectable = new Set(observationEffects.map((effect) => effect.accessUse));
  const targetProjector = RuntimeRootExpressionAccessTargetProjector.forTypeReference(
    store,
    expressionWorld,
    definition.target.targetType,
    `${local}:expression-target`,
  );
  const drafts: readonly RuntimeSourceAccessUseDraft[] = accessDrafts.map((draft) => {
    const target = targetProjector?.project(draft.expression) ?? null;
    return {
      ...draft,
      tracking: connectable.has(draft)
        ? RuntimeExpressionAccessTracking.Connectable
        : RuntimeExpressionAccessTracking.Untracked,
      targetResolution: target?.resolution ?? RuntimeExpressionAccessTargetResolution.Open,
      targetLinks: target?.links ?? [],
    };
  });
  const accessPublication = publishRuntimeWatcherAccessUses(
    store,
    publication,
    local,
    watcher,
    sourceAddressHandle,
    provenanceHandle,
    RuntimeExpressionOperationKind.WatcherExpression,
    drafts,
    reachability,
  );
  const publicationByDraft = new Map<RuntimeExpressionAccessDraft, RuntimeExpressionAccessPublication>(
    accessDrafts.map((draft, index) => [draft, accessPublication.publications[index]!] as const),
  );
  const dependencies = observationEffects.map((effect) => {
    const accessUse = publicationByDraft.get(effect.accessUse);
    if (accessUse == null) {
      throw new Error('Expression watcher observation effect lost its originating access occurrence.');
    }
    return {
      ...effect.dependency,
      ...observedMemberSourceFields(
        observedMemberSourceForRuntimeExpressionAccessUse(publication, accessUse.detail),
      ),
      sourceFileAddressHandle: effect.accessUse.sourceSpan.file?.id == null
        ? null
        : effect.accessUse.sourceSpan.file.id as AddressHandle,
      accessUseProductHandle: accessUse.detail.productHandle,
      accessUseSourceAddressHandle: accessUse.detail.sourceAddressHandle,
    };
  });
  return new RuntimeWatcherAccessUseEmission(accessPublication, dependencies);
}

function computedWatcherAccessUseEmission(
  store: KernelStore,
  publication: KernelPublicationContext,
  local: string,
  watcher: RuntimeWatcherReference,
  watch: WatchDefinition,
  sourceAddressHandle: AddressHandle | null,
  provenanceHandle: RuntimeControllerFrame['provenanceHandle'],
  typeSystem: TypeSystemProject | null,
  reachability: RuntimeOperationReachability,
): RuntimeWatcherAccessUseEmission {
  const declaration = dependencyCollectionFunctionForTarget(typeSystem, publication, watch.expression.target);
  const effects = declaration == null
    ? []
    : ProxyObservable.collectObservedAccessEffectDrafts(
        declaration,
        ProxyObservable.typeContextForTypeSystem(typeSystem, store, publication),
      );
  const collected = declaration == null || typeSystem == null
    ? { accessUses: [], observedEffects: [] }
    : collectRuntimeTypeScriptAccessUseCollection({
        declaration,
        typeSystem,
        store,
        publication,
        observedEffects: effects,
      });
  const accessPublication = publishRuntimeWatcherAccessUses(
    store,
    publication,
    local,
    watcher,
    sourceAddressHandle,
    provenanceHandle,
    RuntimeExpressionOperationKind.WatcherGetter,
    collected.accessUses,
    reachability,
  );
  return new RuntimeWatcherAccessUseEmission(
    accessPublication,
    observedDependencyAccessUseDrafts(publication, collected.observedEffects, accessPublication.publications),
  );
}

function publishRuntimeWatcherAccessUses(
  store: KernelStore,
  publication: KernelPublicationContext,
  local: string,
  watcher: RuntimeWatcherReference,
  sourceAddressHandle: AddressHandle | null,
  provenanceHandle: RuntimeControllerFrame['provenanceHandle'],
  operationKind: RuntimeExpressionOperationKind,
  drafts: readonly RuntimeSourceAccessUseDraft[],
  reachability: RuntimeOperationReachability,
): RuntimeSourceAccessUsePublication {
  if (watcher.productHandle == null || watcher.identityHandle == null) {
    throw new Error(`Runtime watcher '${local}' has no durable owner identity.`);
  }
  return publishRuntimeSourceAccessUses({
    store,
    publication,
    local: `${local}:runtime-expression`,
    ownerKind: RuntimeExpressionAccessOwnerKind.RuntimeWatcher,
    ownerProductHandle: watcher.productHandle,
    ownerIdentityHandle: watcher.identityHandle,
    ownerSourceAddressHandle: sourceAddressHandle,
    operationKind,
    operationIndex: null,
    phase: RuntimeExpressionAccessPhase.WatcherEvaluation,
    realization: RuntimeOperationRealization.Direct,
    reachability,
    provenanceHandle,
    claimPredicateKey: KernelVocabulary.RuntimeExpression.RuntimeWatcherUsesAccessUse.key,
    drafts,
  });
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
    : typeSystem.readProgramSourceFileForAddress(sourceFileAddress);
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
