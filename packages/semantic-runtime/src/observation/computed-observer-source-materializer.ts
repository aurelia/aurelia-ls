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
  KernelStore,
  KernelStoreBatch,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { readPropertyName } from '../evaluation/ts-syntax.js';
import {
  readSourceImportBindings,
} from '../evaluation/import-bindings.js';
import { ExpressionParser } from '../expression/expression-parser.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import {
  checkerCollectionSymbolName,
  checkerNullishType,
} from '../type-system/checker-related-types.js';
import { firstSymbolDeclaration } from '../type-system/checker-node-helpers.js';
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
  distinctRuntimeObservedDependencyDrafts,
  type RuntimeObservedDependencyDraft,
} from './runtime-observed-dependency-draft.js';
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

type ComputedObserverObservedDependencyDraft = RuntimeObservedDependencyDraft;

interface RuntimeControlledComputedDeepObservedDependencyDraft extends RuntimeObservedDependencyDraft {
  readonly dependencyKind: RuntimeObservedDependencyKind.DeepPropertyRead | RuntimeObservedDependencyKind.DeepCollectionRead;
}

/** Materializes getter-side ComputedObserver / ControlledComputedObserver execution sources. */
export class ComputedObserverSourceMaterializer {
  constructor(
    readonly store: KernelStore,
  ) {}

  materialize(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
  ): ComputedObserverSourceProjectResult {
    const publications = readComputedObserverSourceSites(project, typeSystem)
      .map((site, index) => this.publicationForSite(project, typeSystem, site, index));

    const records = publications.flatMap((publication) => publication.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, 'computed-observer-sources'));
    }
    for (const publication of publications) {
      this.store.productDetails.add(
        ObservationProductDetails.ComputedObserverSource,
        publication.observer.productHandle,
        publication.observer,
      );
      for (const dependency of publication.observer.observedDependencies) {
        this.store.productDetails.add(
          ObservationProductDetails.ComputedObserverObservedDependency,
          dependency.productHandle,
          dependency,
        );
      }
    }

    return new ComputedObserverSourceProjectResult(publications.map((publication) => publication.observer));
  }

  private publicationForSite(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
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
    const dependencies = computedObserverObservedDependenciesForSite(
      this.store,
      `${local}:observed-dependency`,
      site,
      observerReference,
      typeSystem,
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
      dependencies.map((dependency) => dependency.detail),
      product.sourceAddressHandle,
      [],
    );
    return {
      observer,
      records: [
        ...product.records,
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
    const sourceFile = typeSystem.readSourceFileByPath(source.path);
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

function computedObserverObservedDependenciesForSite(
  store: KernelStore,
  local: string,
  site: ComputedObserverSourceSite,
  observer: {
    readonly observerKind: ComputedObserverRuntimeKind;
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly addressHandle: AddressHandle;
  },
  typeSystem: TypeSystemProject,
  provenanceHandle: ProvenanceHandle,
): readonly ComputedObserverObservedDependencyPublication[] {
  const drafts = observedDependencyDraftsForSite(store, site, typeSystem);
  return distinctRuntimeObservedDependencyDrafts(drafts).map((draft, index) =>
    computedObserverObservedDependencyForDraft(store, `${local}:${index}`, site, observer, draft, index, provenanceHandle)
  );
}

function observedDependencyDraftsForSite(
  store: KernelStore,
  site: ComputedObserverSourceSite,
  typeSystem: TypeSystemProject,
): readonly ComputedObserverObservedDependencyDraft[] {
  const deepDrafts = site.dependency.deep === true
    ? controlledComputedDeepObservedDependencyDrafts(site, typeSystem)
    : [];
  switch (site.dependency.dependencyMode) {
    case ComputedObservationDependencyMode.ProxyAutoTrack:
      return [
        ...ProxyObservable.collectObservedDependencyDrafts(
          site.getter,
          ProxyObservable.typeContextForTypeSystem(typeSystem, store),
          { rootNames: ['this'] },
        ),
        ...deepDrafts,
      ];
    case ComputedObservationDependencyMode.ExplicitPropertyKeys:
    case ComputedObservationDependencyMode.DependencyFunction:
    case ComputedObservationDependencyMode.Open:
      return [
        ...computedExplicitDependencyDraftsForSite(store, site, typeSystem),
        ...deepDrafts,
      ];
    case ComputedObservationDependencyMode.Disabled:
      return [];
  }
}

function computedExplicitDependencyDraftsForSite(
  store: KernelStore,
  site: ComputedObserverSourceSite,
  typeSystem: TypeSystemProject,
): readonly ComputedObserverObservedDependencyDraft[] {
  return [
    ...site.dependency.dependencyKeyReads.flatMap((dependency) =>
      connectableDraftsForComputedDependencyExpression(dependency)
    ),
    ...site.dependency.dependencyFunctions.flatMap((dependency) =>
      ProxyObservable.collectObservedDependencyDrafts(
        dependency,
        ProxyObservable.typeContextForTypeSystem(typeSystem, store),
      )
    ),
  ];
}

function connectableDraftsForComputedDependencyExpression(
  dependency: ComputedDependencyKeyRead,
): readonly RuntimeConnectableObservedDependencyDraft[] {
  const result = computedObserverExpressionParser.parse(dependency.key, 'IsProperty');
  if (
    result.kind !== ExpressionParseResultKind.ExpressionSuccess &&
    result.kind !== ExpressionParseResultKind.EmptyExpressionSuccess
  ) {
    return [];
  }
  return collectRuntimeConnectableObservedDependencyDrafts(result.ast)
    .map((draft) => ({
      ...draft,
      spanStart: dependency.start,
      spanEnd: dependency.end,
    }));
}

function controlledComputedDeepObservedDependencyDrafts(
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
  const classType = checker.getTypeAtLocation(classNode);
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
      checker,
      dependencyType,
      {
        sourceName: path.join('.'),
        sourceRootName: path[0] ?? null,
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
    const property = checker.getPropertyOfType(current, segment);
    if (property == null) {
      return null;
    }
    const declaration = firstSymbolDeclaration(property) ?? location;
    current = checker.getTypeOfSymbolAtLocation(property, declaration);
  }
  return current;
}

function collectControlledComputedDeepTypeDrafts(
  checker: ts.TypeChecker,
  type: ts.Type,
  base: {
    readonly sourceName: string;
    readonly sourceRootName: string | null;
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
      const declaration = firstSymbolDeclaration(property);
      const propertyType = declaration == null
        ? null
        : checker.getTypeOfSymbolAtLocation(property, declaration);
      const sourceName = `${base.sourceName}.${propertyName}`;
      rows.push({
        dependencyKind: RuntimeObservedDependencyKind.DeepPropertyRead,
        expressionKind: 'ControlledComputedDeepObserver',
        sourceName,
        sourceRootName: base.sourceRootName,
        memberName: propertyName,
        keyExpression: null,
        methodName: null,
        spanStart: base.spanStart,
        spanEnd: base.spanEnd,
      });
      if (propertyType != null) {
        collectControlledComputedDeepTypeDrafts(
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
  if (checker.isArrayType(type) || checker.isTupleType(type)) {
    return true;
  }
  const symbolName = checkerCollectionSymbolName(type);
  return symbolName === 'Map'
    || symbolName === 'ReadonlyMap'
    || symbolName === 'Set'
    || symbolName === 'ReadonlySet';
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
  local: string,
  site: ComputedObserverSourceSite,
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
  const publication = sourceObservedDependencyRecords({
    store,
    local,
    sourceFileAddressHandle: site.sourceFileAddressHandle,
    owner: observer,
    draft,
    index,
    provenanceHandle,
    claimPredicateKey: KernelVocabulary.Observation.SourceObserverUsesObservedDependency.key,
    claimLocalName: 'source-observer-uses-observed-dependency',
  });
  const detail = new ComputedObserverObservedDependency(
    publication.productHandle,
    publication.identityHandle,
    observer,
    draft.dependencyKind,
    draft.expressionKind,
    draft.sourceName,
    draft.sourceRootName,
    draft.memberName,
    draft.keyExpression,
    draft.methodName,
    draft.spanStart,
    draft.spanEnd,
    publication.sourceAddressHandle,
    [],
  );
  return {
    detail,
    records: publication.records,
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
