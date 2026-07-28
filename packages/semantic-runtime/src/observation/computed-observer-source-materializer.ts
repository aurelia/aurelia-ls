import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import { EvidenceRole } from '../kernel/evidence.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  KernelPublicationPlan,
  publishProductDetails,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { CheckerExpressionTypeWorld } from '../type-system/expression-type-world.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { readPropertyName } from '../evaluation/ts-syntax.js';
import {
  readSourceImportBindings,
} from '../evaluation/import-bindings.js';
import { ExpressionParser } from '../expression/expression-parser.js';
import type { ExpressionAstNode } from '../expression/ast.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import {
  SourceFileRef,
  sourceSpanFromBounds,
} from '../expression/source-span.js';
import {
  checkerNullishType,
} from '../type-system/checker-related-types.js';
import {
  checkerArrayMapSetCollectionType,
} from '../type-system/checker-collection-types.js';
import {
  checkerPropertySymbol,
  checkerSymbolValueType,
  firstSymbolDeclaration,
} from '../type-system/checker-node-helpers.js';
import {
  RuntimeExpressionAccessCoverage,
  RuntimeExpressionAccessForm,
  RuntimeExpressionAccessOrigin,
  RuntimeExpressionAccessOwnerKind,
  RuntimeExpressionAccessPhase,
  RuntimeExpressionAccessRole,
  RuntimeExpressionAccessTargetLink,
  RuntimeExpressionAccessTargetResolution,
  RuntimeExpressionAccessTracking,
  RuntimeExpressionExecutionMaximum,
  RuntimeExpressionExecutionMinimum,
  RuntimeExpressionOperationKind,
  type RuntimeExpressionAccessUse,
} from '../runtime-expression/runtime-expression-access-use.js';
import {
  RuntimeOperationRealization,
  RuntimeOperationReachability,
} from '../runtime-expression/runtime-operation.js';
import {
  publishRuntimeSourceAccessUses,
  type RuntimeSourceAccessUsePublication,
  type RuntimeSourceAccessUseDraft,
} from '../runtime-expression/source-access-use-publication.js';
import {
  collectRuntimeTypeScriptAccessUseDrafts,
} from '../runtime-expression/typescript-access-use-collector.js';
import {
  collectRuntimeTemplateAccessUseDrafts,
} from '../runtime-expression/template-access-use-collector.js';
import {
  RuntimeRootExpressionAccessTargetProjector,
} from '../runtime-expression/checker-access-target-projection.js';
import { RuntimeExpressionProductDetails } from '../runtime-expression/product-details.js';
import {
  collectRuntimeConnectableObservedDependencyDrafts,
  type RuntimeConnectableObservedDependencyDraft,
} from './connectable-observed-dependency.js';
import {
  AURELIA_COMPUTED_DECORATOR_EXPORTS,
  AURELIA_COMPUTED_DECORATOR_MODULES,
  readComputedDecorator,
  readComputedDependency,
  type ComputedDecoratorRead,
} from './computed-observation-recognition.js';
import {
  type ComputedDependencyRead,
  type ComputedDependencyKeyRead,
} from './computed-dependency-config.js';
import {
  ComputedObservationDependencyMode,
  ComputedObservationMemberKind,
} from './computed-observation.js';
import {
  ComputedObserverObservedDependency,
  ComputedObserverRuntimeKind,
  ComputedObserverSource,
  ComputedObserverSourceProjectResult,
  ComputedObserverSourceTriggerKind,
} from './computed-observer-source.js';
import { ObservationProductDetails } from './product-details.js';
import { ProxyObservable } from './proxy-observable-dependency.js';
import {
  observedMemberSourceFields,
  observedMemberSourceForCheckerSymbol,
} from './observed-dependency-member-source.js';
import {
  type RuntimeObservedDependencyAccessUseDraft,
  type RuntimeObservedDependencyDraft,
} from './runtime-observed-dependency-draft.js';
import {
  observedDependencyAccessUseDrafts,
} from './runtime-observed-dependency-access-use.js';
import { RuntimeObservedDependencyKind } from './runtime-binding-observation.js';
import { sourceObservationProductRecords } from './source-observation-product-publication.js';
import { sourceObservedDependencyRecords } from './source-observed-dependency-publication.js';

const computedObserverExpressionParser = new ExpressionParser();
const controlledComputedDeepMaxDepth = 4;
const controlledComputedDeepMaxRows = 64;

interface ComputedObserverSourceSite {
  readonly sourcePath: string;
  readonly sourceFileAddressHandle: AddressHandle;
  readonly sourceFile: ts.SourceFile;
  readonly getter: ts.GetAccessorDeclaration;
  readonly start: number;
  readonly end: number;
  readonly className: string | null;
  readonly memberName: string | null;
  readonly observerKind: ComputedObserverRuntimeKind;
  readonly triggerKind: ComputedObserverSourceTriggerKind;
  readonly dependency: ComputedDependencyRead;
}

interface ComputedObserverSourcePublication {
  readonly observer: ComputedObserverSource;
  readonly records: readonly KernelStoreRecord[];
}

interface ComputedDependencyExpressionOperation {
  readonly expression: ExpressionAstNode | null;
  readonly observedDependencies: readonly RuntimeConnectableObservedDependencyDraft[];
}

type ComputedObserverObservedDependencyDraft = RuntimeObservedDependencyAccessUseDraft;

interface RuntimeControlledComputedDeepObservedDependencyDraft extends RuntimeObservedDependencyDraft {
  readonly dependencyKind: RuntimeObservedDependencyKind.DeepPropertyRead | RuntimeObservedDependencyKind.DeepCollectionRead;
}

/** Materializes getter-side ComputedObserver / ControlledComputedObserver execution sources. */
export class ComputedObserverSourceMaterializer {
  constructor(
    readonly store: KernelStore,
    readonly publication: KernelPublicationContext,
  ) {}

  materialize(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
    expressionWorld: CheckerExpressionTypeWorld,
  ): ComputedObserverSourceProjectResult {
    const publications = readComputedObserverSourceSites(project, typeSystem)
      .map((site, index) => this.publicationForSite(project, typeSystem, expressionWorld, site, index));

    const records = publications.flatMap((publication) => publication.records);
    this.publication.publish(new KernelPublicationPlan(
      new KernelStoreBatch(records, 'computed-observer-sources'),
      [
        ...publishProductDetails(
          ObservationProductDetails.ComputedObserverSource,
          publications.map((publication) => publication.observer),
        ),
        ...publishProductDetails(
          ObservationProductDetails.ComputedObserverObservedDependency,
          publications.flatMap((publication) => publication.observer.observedDependencies),
        ),
        ...publishProductDetails(
          RuntimeExpressionProductDetails.AccessUse,
          publications.flatMap((publication) => publication.observer.accessUses),
        ),
      ],
    ));

    return new ComputedObserverSourceProjectResult(publications.map((publication) => publication.observer));
  }

  private publicationForSite(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
    expressionWorld: CheckerExpressionTypeWorld,
    site: ComputedObserverSourceSite,
    index: number,
  ): ComputedObserverSourcePublication {
    const local = computedObserverSourceLocalKey(project, site, index);
    const product = sourceObservationProductRecords({
      store: this.store,
      local,
      site,
      productKindKey: KernelVocabulary.Observation.SourceObserver.key,
      evidenceRoles: [EvidenceRole.Declaration],
      evidenceSummary: computedObserverSourceSummary(site),
      identityOwnerHandle: null,
      identityLocalName: `${site.observerKind}:${site.className ?? '<class>'}.${site.memberName ?? '<getter>'}`,
    });
    const observerReference = {
      observerKind: site.observerKind,
      productHandle: product.productHandle,
      identityHandle: product.identityHandle,
      addressHandle: product.sourceAddressHandle,
    };
    const operations = computedObserverOperationsForSite(
      this.store,
      this.publication,
      `${local}:operation`,
      site,
      observerReference,
      typeSystem,
      expressionWorld,
      product.provenanceHandle,
    );
    const dependencies = computedObserverObservedDependenciesForDrafts(
      this.store,
      this.publication,
      `${local}:observed-dependency`,
      observerReference,
      operations.observedDependencies,
      product.provenanceHandle,
    );
    const observer = new ComputedObserverSource(
      product.productHandle,
      product.identityHandle,
      project.projectKey,
      site.observerKind,
      site.triggerKind,
      site.className,
      site.memberName,
      site.dependency.dependencyMode,
      site.dependency.dependencyKeys,
      site.dependency.dependencyFunctionCount,
      site.dependency.flush,
      site.dependency.deep,
      operations.accessUses,
      dependencies.map((dependency) => dependency.detail),
      product.sourceAddressHandle,
    );
    return {
      observer,
      records: [
        ...product.records,
        ...operations.records,
        ...dependencies.flatMap((dependency) => dependency.records),
      ],
    };
  }
}

function readComputedObserverSourceSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly ComputedObserverSourceSite[] {
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
    return sourceFile == null
      ? []
      : readSourceFileComputedObserverSourceSites(source.path, source.addressHandle, sourceFile);
  });
}

function readSourceFileComputedObserverSourceSites(
  sourcePath: string,
  sourceFileAddressHandle: AddressHandle,
  sourceFile: ts.SourceFile,
): readonly ComputedObserverSourceSite[] {
  const bindings = readSourceImportBindings(
    sourceFile,
    AURELIA_COMPUTED_DECORATOR_MODULES,
    AURELIA_COMPUTED_DECORATOR_EXPORTS,
  );
  const sites: ComputedObserverSourceSite[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isGetAccessorDeclaration(node)) {
      const computedDecorators = (ts.getDecorators(node) ?? [])
        .map((decorator) => readComputedDecorator(decorator, bindings))
        .filter((decorator): decorator is ComputedDecoratorRead => decorator != null);
      const dependency = computedDecorators.length === 0
        ? defaultAccessorDescriptorDependency()
        : readComputedDependency(computedDecorators[computedDecorators.length - 1]!, ComputedObservationMemberKind.Getter);
      sites.push({
        sourcePath,
        sourceFileAddressHandle,
        sourceFile,
        getter: node,
        start: node.getStart(sourceFile),
        end: node.end,
        className: classNameForGetter(node),
        memberName: readPropertyName(node.name),
        observerKind: observerKindForDependency(dependency),
        triggerKind: computedDecorators.length === 0
          ? ComputedObserverSourceTriggerKind.AccessorDescriptor
          : ComputedObserverSourceTriggerKind.GetterOwnedObserver,
        dependency,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return sites;
}

function defaultAccessorDescriptorDependency(): ComputedDependencyRead {
  return {
    dependencyMode: ComputedObservationDependencyMode.ProxyAutoTrack,
    dependencyKeys: [],
    dependencyKeyReads: [],
    dependencyFunctionCount: 0,
    dependencyFunctions: [],
    flush: 'async',
    deep: null,
  };
}

function observerKindForDependency(
  dependency: ComputedDependencyRead,
): ComputedObserverRuntimeKind {
  switch (dependency.dependencyMode) {
    case ComputedObservationDependencyMode.ExplicitPropertyKeys:
    case ComputedObservationDependencyMode.DependencyFunction:
    case ComputedObservationDependencyMode.Disabled:
    case ComputedObservationDependencyMode.Open:
      return ComputedObserverRuntimeKind.ControlledComputedObserver;
    case ComputedObservationDependencyMode.ProxyAutoTrack:
      return ComputedObserverRuntimeKind.ComputedObserver;
  }
}

interface ComputedObserverObservedDependencyPublication {
  readonly detail: ComputedObserverObservedDependency;
  readonly records: readonly KernelStoreRecord[];
}

interface ComputedObserverOperationPublication {
  readonly accessUses: readonly RuntimeExpressionAccessUse[];
  readonly observedDependencies: readonly RuntimeObservedDependencyAccessUseDraft[];
  readonly records: readonly KernelStoreRecord[];
}

function computedObserverObservedDependenciesForDrafts(
  store: KernelStore,
  publication: KernelPublicationContext,
  local: string,
  observer: {
    readonly observerKind: ComputedObserverRuntimeKind;
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly addressHandle: AddressHandle;
  },
  drafts: readonly RuntimeObservedDependencyAccessUseDraft[],
  provenanceHandle: ProvenanceHandle,
): readonly ComputedObserverObservedDependencyPublication[] {
  return drafts.map((draft, index) =>
    computedObserverObservedDependencyForDraft(
      store,
      publication,
      `${local}:${index}`,
      observer,
      draft,
      index,
      provenanceHandle,
    )
  );
}

function computedObserverOperationsForSite(
  store: KernelStore,
  publication: KernelPublicationContext,
  local: string,
  site: ComputedObserverSourceSite,
  observer: {
    readonly observerKind: ComputedObserverRuntimeKind;
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly addressHandle: AddressHandle;
  },
  typeSystem: TypeSystemProject,
  expressionWorld: CheckerExpressionTypeWorld,
  provenanceHandle: ProvenanceHandle,
): ComputedObserverOperationPublication {
  const accessUses: RuntimeExpressionAccessUse[] = [];
  const records: KernelStoreRecord[] = [];
  const observedDependencies: RuntimeObservedDependencyAccessUseDraft[] = [];
  const typeContext = ProxyObservable.typeContextForTypeSystem(typeSystem, store, publication);
  const getterTracked = site.dependency.dependencyMode === ComputedObservationDependencyMode.ProxyAutoTrack
    ? ProxyObservable.collectObservedDependencyOccurrenceDrafts(
        site.getter,
        typeContext,
        { rootNames: ['this'] },
      )
    : [];
  const getterPublication = publishRuntimeSourceAccessUses({
    store,
    publication,
    local: `${local}:getter`,
    ownerKind: RuntimeExpressionAccessOwnerKind.ComputedObserver,
    ownerProductHandle: observer.productHandle,
    ownerIdentityHandle: observer.identityHandle,
    ownerSourceAddressHandle: observer.addressHandle,
    operationKind: RuntimeExpressionOperationKind.ComputedGetter,
    operationIndex: null,
    phase: RuntimeExpressionAccessPhase.ComputedEvaluation,
    realization: RuntimeOperationRealization.Direct,
    reachability: RuntimeOperationReachability.Open,
    provenanceHandle,
    claimPredicateKey: KernelVocabulary.RuntimeExpression.SourceObserverUsesAccessUse.key,
    drafts: collectRuntimeTypeScriptAccessUseDrafts({
      declaration: site.getter,
      typeSystem,
      store,
      publication,
      trackedDependencies: getterTracked,
    }),
  });
  appendComputedAccessOperation(
    accessUses,
    records,
    getterPublication,
  );
  observedDependencies.push(...observedDependencyAccessUseDrafts(
    publication,
    getterTracked,
    getterPublication.publications,
  ));

  const deepDrafts = site.dependency.deep === true
    ? controlledComputedDeepObservedDependencyDrafts(publication, site, typeSystem)
    : [];
  const targetProjector = RuntimeRootExpressionAccessTargetProjector.forCheckerType({
    store,
    expressionWorld,
    typeSystem,
    rootType: computedObserverOwnerType(site, typeSystem),
    sourceNode: site.getter.parent,
    localKey: `${local}:dependency-target`,
  });
  site.dependency.dependencyKeyReads.forEach((dependency, index) => {
    const operation = computedDependencyExpressionOperation(
      site,
      dependency,
    );
    const generated = deepDrafts.filter((draft) =>
      draft.spanStart === dependency.start && draft.spanEnd === dependency.end
    );
    const authoredDrafts = computedDependencyKeyAccessDrafts(
      site,
      dependency,
      operation,
      targetProjector,
    );
    const drafts: RuntimeSourceAccessUseDraft[] = [
      ...authoredDrafts,
      ...generated.map((draft) => computedGeneratedDeepAccessDraft(site, dependency, draft)),
    ];
    const dependencyPublication = publishRuntimeSourceAccessUses({
      store,
      publication,
      local: `${local}:dependency-key:${index}`,
      ownerKind: RuntimeExpressionAccessOwnerKind.ComputedObserver,
      ownerProductHandle: observer.productHandle,
      ownerIdentityHandle: observer.identityHandle,
      ownerSourceAddressHandle: observer.addressHandle,
      operationKind: RuntimeExpressionOperationKind.ComputedDependencyKey,
      operationIndex: index,
      phase: RuntimeExpressionAccessPhase.ComputedEvaluation,
      realization: RuntimeOperationRealization.Direct,
      reachability: RuntimeOperationReachability.Open,
      provenanceHandle,
      claimPredicateKey: KernelVocabulary.RuntimeExpression.SourceObserverUsesAccessUse.key,
      drafts,
    });
    appendComputedAccessOperation(
      accessUses,
      records,
      dependencyPublication,
    );
    observedDependencies.push(...observedDependencyAccessUseDrafts(
      publication,
      operation.observedDependencies,
      dependencyPublication.publications.slice(0, authoredDrafts.length),
    ));
    generated.forEach((draft, generatedIndex) => {
      const generatedAccess = dependencyPublication.accessUses[authoredDrafts.length + generatedIndex] ?? null;
      if (generatedAccess == null) {
        throw new Error(`Computed deep dependency '${draft.sourceName ?? dependency.key}' lost its generated access use.`);
      }
      observedDependencies.push({
        ...draft,
        accessUseProductHandle: generatedAccess.productHandle,
        accessUseSourceAddressHandle: generatedAccess.sourceAddressHandle,
      });
    });
  });

  site.dependency.dependencyFunctions.forEach((dependency, index) => {
    const tracked = ProxyObservable.collectObservedDependencyOccurrenceDrafts(
      dependency,
      typeContext,
    );
    const dependencyPublication = publishRuntimeSourceAccessUses({
      store,
      publication,
      local: `${local}:dependency-function:${index}`,
      ownerKind: RuntimeExpressionAccessOwnerKind.ComputedObserver,
      ownerProductHandle: observer.productHandle,
      ownerIdentityHandle: observer.identityHandle,
      ownerSourceAddressHandle: observer.addressHandle,
      operationKind: RuntimeExpressionOperationKind.ComputedDependencyFunction,
      operationIndex: index,
      phase: RuntimeExpressionAccessPhase.ComputedEvaluation,
      realization: RuntimeOperationRealization.Direct,
      reachability: RuntimeOperationReachability.Open,
      provenanceHandle,
      claimPredicateKey: KernelVocabulary.RuntimeExpression.SourceObserverUsesAccessUse.key,
      drafts: collectRuntimeTypeScriptAccessUseDrafts({
        declaration: dependency,
        typeSystem,
        store,
        publication,
        trackedDependencies: tracked,
        role: RuntimeExpressionAccessRole.DeclarativeDependency,
      }),
    });
    appendComputedAccessOperation(
      accessUses,
      records,
      dependencyPublication,
    );
    observedDependencies.push(...observedDependencyAccessUseDrafts(
      publication,
      tracked,
      dependencyPublication.publications,
    ));
  });

  return {
    accessUses,
    observedDependencies,
    records,
  };
}

function appendComputedAccessOperation(
  accessUses: RuntimeExpressionAccessUse[],
  records: KernelStoreRecord[],
  publication: RuntimeSourceAccessUsePublication,
): void {
  accessUses.push(...publication.accessUses);
  records.push(...publication.records);
}

function computedDependencyKeyAccessDrafts(
  site: ComputedObserverSourceSite,
  dependency: ComputedDependencyKeyRead,
  operation: ComputedDependencyExpressionOperation,
  targetProjector: RuntimeRootExpressionAccessTargetProjector | null,
): readonly RuntimeSourceAccessUseDraft[] {
  if (operation.expression != null) {
    const drafts = collectRuntimeTemplateAccessUseDrafts({
      expression: operation.expression,
    });
    if (drafts.length > 0) {
      return drafts.map((draft) => {
        const target = targetProjector?.project(draft.expression) ?? null;
        const open = site.dependency.dependencyMode === ComputedObservationDependencyMode.Open;
        return {
          ...draft,
          role: RuntimeExpressionAccessRole.DeclarativeDependency,
          coverage: open
            ? RuntimeExpressionAccessCoverage.Open
            : draft.coverage,
          coverageReason: open
            ? 'The computed dependency list contains a dynamic value in addition to this closed key.'
            : draft.coverageReason,
          tracking: RuntimeExpressionAccessTracking.Connectable,
          targetResolution: target?.resolution ?? RuntimeExpressionAccessTargetResolution.Open,
          targetLinks: target?.links ?? [],
        };
      });
    }
  }

  const span = sourceSpanFromBounds(
    dependency.start ?? site.start,
    dependency.end ?? site.end,
    new SourceFileRef(site.sourceFileAddressHandle, site.sourcePath),
  );
  return [{
    origin: RuntimeExpressionAccessOrigin.Authored,
    accessForm: RuntimeExpressionAccessForm.Declarative,
    role: RuntimeExpressionAccessRole.DeclarativeDependency,
    scopeLookupAncestor: null,
    authoredScopeAncestor: null,
    callbackScopeDepth: null,
    lexicalLocal: false,
    executionQualifiers: [],
    minimumExecutions: RuntimeExpressionExecutionMinimum.One,
    maximumExecutions: RuntimeExpressionExecutionMaximum.One,
    coverage: site.dependency.dependencyMode === ComputedObservationDependencyMode.Open
      ? RuntimeExpressionAccessCoverage.Open
      : RuntimeExpressionAccessCoverage.Complete,
    coverageReason: site.dependency.dependencyMode === ComputedObservationDependencyMode.Open
      ? 'The computed dependency list contains a dynamic value in addition to this closed key.'
      : null,
    sourceSpan: span,
    nameSourceSpan: null,
    tracking: RuntimeExpressionAccessTracking.Connectable,
    targetResolution: RuntimeExpressionAccessTargetResolution.Open,
    targetLinks: [],
  }];
}

function computedGeneratedDeepAccessDraft(
  site: ComputedObserverSourceSite,
  dependency: ComputedDependencyKeyRead,
  draft: RuntimeControlledComputedDeepObservedDependencyDraft,
): RuntimeSourceAccessUseDraft {
  const span = sourceSpanFromBounds(
    dependency.start ?? site.start,
    dependency.end ?? site.end,
    new SourceFileRef(site.sourceFileAddressHandle, site.sourcePath),
  );
  const targetSource = draft.observedMemberSourceAddressHandle ?? null;
  return {
    origin: RuntimeExpressionAccessOrigin.Generated,
    accessForm: RuntimeExpressionAccessForm.Declarative,
    role: RuntimeExpressionAccessRole.DeclarativeDependency,
    scopeLookupAncestor: null,
    authoredScopeAncestor: null,
    callbackScopeDepth: null,
    lexicalLocal: false,
    executionQualifiers: [],
    minimumExecutions: RuntimeExpressionExecutionMinimum.Zero,
    maximumExecutions: RuntimeExpressionExecutionMaximum.Many,
    coverage: RuntimeExpressionAccessCoverage.Open,
    coverageReason: 'Deep observation expands a bounded generated candidate graph from the authored dependency key.',
    sourceSpan: span,
    nameSourceSpan: null,
    tracking: RuntimeExpressionAccessTracking.Connectable,
    targetResolution: targetSource == null
      ? RuntimeExpressionAccessTargetResolution.Open
      : RuntimeExpressionAccessTargetResolution.Exact,
    targetLinks: targetSource == null
      ? []
      : [new RuntimeExpressionAccessTargetLink(null, null, null, null, targetSource)],
  };
}

function computedDependencyExpressionOperation(
  site: ComputedObserverSourceSite,
  dependency: ComputedDependencyKeyRead,
): ComputedDependencyExpressionOperation {
  const sourceText = dependency.start == null || dependency.end == null
    ? null
    : site.sourceFile.text.slice(dependency.start, dependency.end);
  const quoted = sourceText?.startsWith("'") === true
    || sourceText?.startsWith('"') === true
    || sourceText?.startsWith('`') === true;
  const contentStart = (dependency.start ?? site.start) + (quoted ? 1 : 0);
  const contentEnd = (dependency.end ?? site.end) - (quoted ? 1 : 0);
  const result = computedObserverExpressionParser.parse(
    dependency.key,
    'IsProperty',
    {
      baseSpan: sourceSpanFromBounds(
        contentStart,
        contentEnd,
        new SourceFileRef(site.sourceFileAddressHandle, site.sourcePath),
      ),
    },
  );
  if (
    result.kind !== ExpressionParseResultKind.ExpressionSuccess
    && result.kind !== ExpressionParseResultKind.EmptyExpressionSuccess
  ) {
    return {
      expression: null,
      observedDependencies: [],
    };
  }
  return {
    expression: result.ast,
    observedDependencies: collectRuntimeConnectableObservedDependencyDrafts(result.ast)
      .map((draft) => ({
        ...draft,
        sourceFileAddressHandle: site.sourceFileAddressHandle,
      })),
  };
}

function computedObserverOwnerType(
  site: ComputedObserverSourceSite,
  typeSystem: TypeSystemProject,
): ts.Type | null {
  const getter = typeSystem.readProgramNode(site.getter);
  const owner = getter?.parent ?? null;
  return owner == null ? null : typeSystem.readProgramTypeAtLocation(owner);
}

/*
 * Generated deep dependencies remain in the observation lane below. They are surfaced above as generated access uses,
 * never as authored source occurrences.
 */

function controlledComputedDeepObservedDependencyDrafts(
  publication: KernelPublicationContext,
  site: ComputedObserverSourceSite,
  typeSystem: TypeSystemProject,
): readonly RuntimeControlledComputedDeepObservedDependencyDraft[] {
  if (site.dependency.dependencyKeys.length === 0) {
    return [];
  }
  const getter = typeSystem.readProgramNode(site.getter);
  if (getter == null || !ts.isGetAccessorDeclaration(getter)) {
    return [];
  }
  const classNode = getter.parent;
  if (classNode == null || !(ts.isClassDeclaration(classNode) || ts.isClassExpression(classNode))) {
    return [];
  }
  const checker = typeSystem.checker;
  const classType = typeSystem.readProgramTypeAtLocation(classNode);
  if (classType == null) {
    return [];
  }
  const rows: RuntimeControlledComputedDeepObservedDependencyDraft[] = [];
  for (const dependency of site.dependency.dependencyKeyReads) {
    const path = simpleComputedDependencyPath(dependency.key);
    if (path.length === 0 || rows.length >= controlledComputedDeepMaxRows) {
      continue;
    }
    const dependencyType = typeForComputedDependencyPath(checker, classType, path, classNode);
    if (dependencyType == null) {
      continue;
    }
    collectControlledComputedDeepTypeDrafts(
      publication,
      checker,
      dependencyType,
      {
        sourceName: path.join('.'),
        sourceRootName: path[0] ?? null,
        sourceFileAddressHandle: site.sourceFileAddressHandle,
        spanStart: dependency.start,
        spanEnd: dependency.end,
      },
      rows,
      new Set<string>(),
      0,
    );
  }
  return rows;
}

function simpleComputedDependencyPath(key: string): readonly string[] {
  return /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/u.test(key)
    ? key.split('.')
    : [];
}

function typeForComputedDependencyPath(
  checker: ts.TypeChecker,
  rootType: ts.Type,
  path: readonly string[],
  location: ts.Node,
): ts.Type | null {
  let current: ts.Type | null = rootType;
  for (const segment of path) {
    if (current == null) {
      return null;
    }
    const property = checkerPropertySymbol(checker, current, segment);
    if (property == null) {
      return null;
    }
    current = checkerSymbolValueType(checker, property, location);
  }
  return current;
}

function collectControlledComputedDeepTypeDrafts(
  publication: KernelPublicationContext,
  checker: ts.TypeChecker,
  type: ts.Type,
  base: {
    readonly sourceName: string;
    readonly sourceRootName: string | null;
    readonly sourceFileAddressHandle: AddressHandle;
    readonly spanStart: number | null;
    readonly spanEnd: number | null;
  },
  rows: RuntimeControlledComputedDeepObservedDependencyDraft[],
  seen: Set<string>,
  depth: number,
): void {
  if (rows.length >= controlledComputedDeepMaxRows || depth >= controlledComputedDeepMaxDepth) {
    return;
  }
  for (const part of nonNullishTypeParts(checker, type)) {
    const seenKey = `${base.sourceName}:${checker.typeToString(part)}`;
    if (seen.has(seenKey)) {
      continue;
    }
    seen.add(seenKey);
    if (checkerDeepObservableCollectionType(checker, part)) {
      rows.push({
        dependencyKind: RuntimeObservedDependencyKind.DeepCollectionRead,
        expressionKind: 'ControlledComputedDeepObserver',
        sourceName: base.sourceName,
        sourceRootName: base.sourceRootName,
        memberName: null,
        keyExpression: null,
        methodName: 'observeCollection',
        sourceFileAddressHandle: base.sourceFileAddressHandle,
        spanStart: base.spanStart,
        spanEnd: base.spanEnd,
      });
      continue;
    }
    if (!checkerDeepObservableObjectType(part)) {
      continue;
    }
    for (const property of checker.getPropertiesOfType(part)) {
      if (rows.length >= controlledComputedDeepMaxRows) {
        return;
      }
      if (!checkerDeepObservableProperty(property)) {
        continue;
      }
      const propertyName = property.getName();
      const propertyType = checkerSymbolValueType(checker, property);
      const sourceName = `${base.sourceName}.${propertyName}`;
      rows.push({
        dependencyKind: RuntimeObservedDependencyKind.DeepPropertyRead,
        expressionKind: 'ControlledComputedDeepObserver',
        sourceName,
        sourceRootName: base.sourceRootName,
        memberName: propertyName,
        keyExpression: null,
        methodName: null,
        ...observedMemberSourceFields(observedMemberSourceForCheckerSymbol(
          publication,
          checker,
          property,
        )),
        sourceFileAddressHandle: base.sourceFileAddressHandle,
        spanStart: base.spanStart,
        spanEnd: base.spanEnd,
      });
      if (propertyType != null) {
        collectControlledComputedDeepTypeDrafts(
          publication,
          checker,
          propertyType,
          {
            ...base,
            sourceName,
          },
          rows,
          seen,
          depth + 1,
        );
      }
    }
  }
}

function nonNullishTypeParts(
  checker: ts.TypeChecker,
  type: ts.Type,
): readonly ts.Type[] {
  return type.isUnion()
    ? type.types.filter((part) => !checkerNullishType(checker, part))
    : checkerNullishType(checker, type) ? [] : [type];
}

function checkerDeepObservableCollectionType(
  checker: ts.TypeChecker,
  type: ts.Type,
): boolean {
  return checkerArrayMapSetCollectionType(checker, type);
}

function checkerDeepObservableObjectType(
  type: ts.Type,
): boolean {
  return (type.flags & ts.TypeFlags.Object) !== 0;
}

function checkerDeepObservableProperty(
  property: ts.Symbol,
): boolean {
  const declaration = firstSymbolDeclaration(property);
  if (declaration == null) {
    return false;
  }
  return ts.isPropertyDeclaration(declaration)
    || ts.isPropertySignature(declaration)
    || ts.isPropertyAssignment(declaration)
    || ts.isShorthandPropertyAssignment(declaration);
}

function computedObserverObservedDependencyForDraft(
  store: KernelStore,
  publicationContext: KernelPublicationContext,
  local: string,
  observer: {
    readonly observerKind: ComputedObserverRuntimeKind;
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly addressHandle: AddressHandle;
  },
  draft: ComputedObserverObservedDependencyDraft,
  index: number,
  provenanceHandle: ProvenanceHandle,
): ComputedObserverObservedDependencyPublication {
  const dependencyPublication = sourceObservedDependencyRecords({
    store,
    local,
    owner: observer,
    draft,
    index,
    provenanceHandle,
    claimPredicateKey: KernelVocabulary.Observation.SourceObserverUsesObservedDependency.key,
    claimLocalName: 'source-observer-uses-observed-dependency',
  });
  const detail = new ComputedObserverObservedDependency(
    dependencyPublication.productHandle,
    dependencyPublication.identityHandle,
    observer,
    draft.accessUseProductHandle,
    draft.dependencyKind,
    draft.expressionKind,
    draft.sourceName,
    draft.sourceRootName,
    draft.memberName,
    draft.keyExpression,
    draft.methodName,
    draft.spanStart,
    draft.spanEnd,
    dependencyPublication.sourceAddressHandle,
  );
  return {
    detail,
    records: dependencyPublication.records,
  };
}

function computedObserverSourceSummary(
  site: ComputedObserverSourceSite,
): string {
  return `${site.observerKind} source for ${site.className ?? '<class>'}.${site.memberName ?? '<getter>'} uses ${site.dependency.dependencyMode}.`;
}

function computedObserverSourceLocalKey(
  project: ProjectBootFrame,
  site: ComputedObserverSourceSite,
  index: number,
): string {
  return [
    'computed-observer-source',
    localKeyPart(project.projectKey),
    localKeyPart(site.sourcePath),
    site.start,
    site.end,
    index,
  ].join(':');
}

function classNameForGetter(
  getter: ts.GetAccessorDeclaration,
): string | null {
  const parent = getter.parent;
  return parent != null && (ts.isClassDeclaration(parent) || ts.isClassExpression(parent))
    ? parent.name?.text ?? null
    : null;
}
