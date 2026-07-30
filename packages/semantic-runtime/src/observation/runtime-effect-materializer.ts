import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import {
  DiContainerApiMethodKind,
  isAureliaContainerReceiver,
} from '../di/container-api-recognition.js';
import {
  DiClassDependencyPositionState,
  DiClassDependencyProjectView,
  DiClassDependencySlotState,
} from '../di/class-dependency-plan.js';
import {
  readImportedExportName,
  readSourceImportBindings,
  typeNodeReferencesImportedExport,
  type SourceImportBindings,
} from '../evaluation/import-bindings.js';
import {
  isNestedExecutionBoundary,
  readObjectPropertyExpression,
  sourceSiteForNode,
  TypeScriptAccessMode,
  typescriptAccessModeForExpression,
  typescriptExpressionSourceRootName,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import { ExpressionParser } from '../expression/expression-parser.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import {
  SourceFileRef,
  sourceSpanFromBounds,
} from '../expression/source-span.js';
import type { ExpressionAstNode } from '../expression/ast.js';
import { EvidenceRole } from '../kernel/evidence.js';
import type {
  AddressHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  KernelPublicationPlan,
  publishProductDetail,
  publishProductDetails,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import type { SourceSpanSite } from '../kernel/source-address.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { TypeSystemProject } from '../type-system/project.js';
import type { CheckerExpressionTypeWorld } from '../type-system/expression-type-world.js';
import { typeSystemSourcePathIndex } from '../type-system/source-path-index.js';
import { ensureSourceFileAddressForCheckerNode } from '../type-system/declaration-source.js';
import {
  RuntimeExpressionAccessOwnerKind,
  RuntimeExpressionAccessPhase,
  RuntimeExpressionAccessTargetResolution,
  RuntimeExpressionAccessTracking,
  RuntimeExpressionOperationKind,
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
  collectRuntimeTemplateAccessUseDrafts,
} from '../runtime-expression/template-access-use-collector.js';
import {
  collectRuntimeTypeScriptAccessUseDrafts,
} from '../runtime-expression/typescript-access-use-collector.js';
import {
  RuntimeRootExpressionAccessTargetProjector,
} from '../runtime-expression/checker-access-target-projection.js';
import { RuntimeExpressionProductDetails } from '../runtime-expression/product-details.js';
import {
  collectRuntimeConnectableObservedDependencyDrafts,
} from './connectable-observed-dependency.js';
import {
  observedMemberSourceFields,
  observedMemberSourceForCheckerSymbol,
} from './observed-dependency-member-source.js';
import { ObservationProductDetails } from './product-details.js';
import { ProxyObservable } from './proxy-observable-dependency.js';
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
import {
  symbolHasObservableDecorator,
} from './observable-decorator-recognition.js';
import {
  RuntimeEffect,
  RuntimeEffectDependencyEvaluationKind,
  RuntimeEffectKind,
  RuntimeEffectObservedDependency,
  RuntimeEffectProjectResult,
  RuntimeEffectReference,
} from './runtime-effect.js';

const observationEffectExpressionParser = new ExpressionParser();

const OBSERVATION_MODULES = new Set([
  'aurelia',
  '@aurelia/runtime',
  '@aurelia/kernel',
]);

const OBSERVATION_EXPORTS = new Set([
  'IObservation',
  'inject',
  'observable',
  'resolve',
]);

const OBSERVATION_SERVICE_EXPORTS = new Set([
  'IObservation',
]);

const OBSERVATION_RESOLVE_EXPORTS = new Set([
  'resolve',
]);

interface RuntimeEffectSourceSite extends SourceSpanSite {
  readonly sourcePath: string;
  readonly sourceFile: ts.SourceFile;
  readonly effectKind: RuntimeEffectKind;
  readonly dependencyEvaluationKind: RuntimeEffectDependencyEvaluationKind;
  readonly call: ts.CallExpression;
  readonly expression: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral | null;
  readonly getter: ts.FunctionLikeDeclaration | null;
  readonly runFunction: ts.FunctionLikeDeclaration | null;
  readonly immediate: boolean | null;
}

interface RuntimeEffectSourceContext {
  readonly project: ProjectBootFrame;
  readonly typeSystem: TypeSystemProject;
  readonly sourcePath: string;
  readonly sourceFileAddressHandle: AddressHandle;
  readonly sourceFile: ts.SourceFile;
  readonly bindings: SourceImportBindings;
  readonly sourcePathByFileName: ReadonlyMap<string, string>;
  readonly roots: ObservationRootSet;
  readonly sites: RuntimeEffectSourceSite[];
}

interface ObservationRootSet {
  readonly locals: ReadonlySet<string>;
  readonly instanceMembers: ReadonlySet<string>;
}

interface RuntimeEffectPublication {
  readonly effect: RuntimeEffect;
  readonly records: readonly KernelStoreRecord[];
}

interface RuntimeEffectObservedDependencyPublication {
  readonly detail: RuntimeEffectObservedDependency;
  readonly records: readonly KernelStoreRecord[];
}

interface RuntimeEffectOperationSource {
  readonly expression: ExpressionAstNode | null;
  readonly observedDependencyOccurrences: readonly RuntimeObservedDependencyDraft[];
  readonly rootType: ts.Type | null;
  readonly rootSourceNode: ts.Node | null;
}

/** Materializes direct source-level Observation.watch(...) effects and their observed dependencies. */
export class RuntimeEffectMaterializer {
  constructor(
    readonly store: KernelStore,
    readonly publication: KernelPublicationContext,
  ) {}

  materialize(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
    expressionWorld: CheckerExpressionTypeWorld,
    classDependencies: DiClassDependencyProjectView,
  ): RuntimeEffectProjectResult {
    const publications = readRuntimeEffectSourceSites(project, typeSystem, classDependencies)
      .map((site, index) => this.publicationForSite(project, typeSystem, expressionWorld, site, index));
    const records = publications.flatMap((publication) => publication.records);
    this.publication.publish(new KernelPublicationPlan(
      new KernelStoreBatch(records, `runtime-effects:${project.projectKey}`),
      [
        ...publications.map((publication) => publishProductDetail(
          ObservationProductDetails.RuntimeEffect,
          publication.effect.productHandle!,
          publication.effect,
        )),
        ...publishProductDetails(
          ObservationProductDetails.RuntimeEffectObservedDependency,
          publications.flatMap((publication) => publication.effect.observedDependencies),
        ),
        ...publishProductDetails(
          RuntimeExpressionProductDetails.AccessUse,
          publications.flatMap((publication) => publication.effect.accessUses),
        ),
      ],
    ));
    return new RuntimeEffectProjectResult(publications.map((publication) => publication.effect));
  }

  private publicationForSite(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
    expressionWorld: CheckerExpressionTypeWorld,
    site: RuntimeEffectSourceSite,
    index: number,
  ): RuntimeEffectPublication {
    const local = runtimeEffectLocalKey(project, site, index);
    const product = sourceObservationProductRecords({
      store: this.store,
      local,
      site,
      productKindKey: KernelVocabulary.Observation.RuntimeEffect.key,
      evidenceRoles: [EvidenceRole.Usage],
      evidenceSummary: runtimeEffectSummary(site),
      identityOwnerHandle: null,
      identityLocalName: `${site.effectKind}:${site.dependencyEvaluationKind}`,
    });
    const effectReference = new RuntimeEffectReference(
      site.effectKind,
      site.dependencyEvaluationKind,
      product.productHandle,
      product.identityHandle,
      product.sourceAddressHandle,
    );
    const operationSource = runtimeEffectOperationSourceForSite(
      this.store,
      this.publication,
      site,
      typeSystem,
    );
    const accessUses = runtimeEffectAccessUsesForSite(
      this.store,
      this.publication,
      `${local}:operation`,
      site,
      effectReference,
      typeSystem,
      expressionWorld,
      operationSource,
      product.provenanceHandle,
    );
    const dependencies = runtimeEffectObservedDependenciesForDrafts(
      this.store,
      this.publication,
      `${local}:observed-dependency`,
      effectReference,
      operationSource.observedDependencyOccurrences,
      accessUses.publications,
      product.provenanceHandle,
    );
    const effect = new RuntimeEffect(
      site.effectKind,
      site.dependencyEvaluationKind,
      product.productHandle,
      product.identityHandle,
      site.immediate,
      accessUses.accessUses,
      dependencies.map((dependency) => dependency.detail),
      product.sourceAddressHandle,
    );
    return {
      effect,
      records: [
        ...product.records,
        ...accessUses.records,
        ...dependencies.flatMap((dependency) => dependency.records),
      ],
    };
  }
}

function readRuntimeEffectSourceSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
  classDependencies: DiClassDependencyProjectView,
): readonly RuntimeEffectSourceSite[] {
  const sourcePathByFileName = typeSystemSourcePathIndex(project, typeSystem);
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
    if (sourceFile == null) {
      return [];
    }
    const bindings = readSourceImportBindings(sourceFile, OBSERVATION_MODULES, OBSERVATION_EXPORTS);
    const context: RuntimeEffectSourceContext = {
      project,
      typeSystem,
      sourcePath: source.path,
      sourceFileAddressHandle: source.addressHandle,
      sourceFile,
      bindings,
      sourcePathByFileName,
      roots: readObservationRoots(
        sourceFile,
        bindings,
        typeSystem,
        sourcePathByFileName,
        classDependencies,
      ),
      sites: [],
    };
    visitRuntimeEffectSourceNode(context, sourceFile);
    return context.sites;
  });
}

function visitRuntimeEffectSourceNode(
  context: RuntimeEffectSourceContext,
  node: ts.Node,
): void {
  if (ts.isCallExpression(node)) {
    readObservationRunSite(context, node);
    readObservationWatchSite(context, node);
  }
  ts.forEachChild(node, (child) => visitRuntimeEffectSourceNode(context, child));
}

function readObservationRoots(
  sourceFile: ts.SourceFile,
  bindings: SourceImportBindings,
  typeSystem: TypeSystemProject,
  sourcePathByFileName: ReadonlyMap<string, string>,
  classDependencies: DiClassDependencyProjectView,
): ObservationRootSet {
  const locals = new Set<string>();
  const instanceMembers = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      if (nodeIsObservationTyped(node, bindings) || expressionCreatesObservationRoot(node.initializer ?? null, bindings, typeSystem, sourcePathByFileName)) {
        locals.add(node.name.text);
      }
    } else if (ts.isPropertyDeclaration(node)) {
      const name = propertyNameForInstanceMember(node.name);
      if (
        name != null
        && (
          nodeIsObservationTyped(node, bindings)
          || expressionCreatesObservationRoot(node.initializer ?? null, bindings, typeSystem, sourcePathByFileName)
        )
      ) {
        instanceMembers.add(name);
      }
    } else if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
      if (
        nodeIsObservationTyped(node, bindings)
        || parameterIsInjectedObservation(node, bindings, classDependencies)
      ) {
        locals.add(node.name.text);
        if (parameterIsParameterProperty(node)) {
          instanceMembers.add(node.name.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return {
    locals,
    instanceMembers,
  };
}

function readObservationWatchSite(
  context: RuntimeEffectSourceContext,
  call: ts.CallExpression,
): void {
  const expression = unwrapExpression(call.expression);
  if (
    !ts.isPropertyAccessExpression(expression)
    || expression.name.text !== 'watch'
    || !expressionIsObservationRoot(
      expression.expression,
      context.roots,
      context.bindings,
      context.typeSystem,
      context.sourcePathByFileName,
    )
  ) {
    return;
  }

  const watchedExpression = unwrapExpression(call.arguments[1] ?? expression.name);
  const stringExpression = ts.isStringLiteral(watchedExpression) || ts.isNoSubstitutionTemplateLiteral(watchedExpression)
    ? watchedExpression
    : null;
  const getter = ts.isArrowFunction(watchedExpression) || ts.isFunctionExpression(watchedExpression)
    ? watchedExpression
    : null;
  const dependencyEvaluationKind = stringExpression != null
    ? RuntimeEffectDependencyEvaluationKind.AstEvaluate
    : getter != null
      ? RuntimeEffectDependencyEvaluationKind.ObserverLocatorFunctionKey
      : RuntimeEffectDependencyEvaluationKind.Open;
  context.sites.push(sourceSiteForNode(context, call, {
    sourceFile: context.sourceFile,
    effectKind: RuntimeEffectKind.Watch,
    dependencyEvaluationKind,
    call,
    expression: stringExpression,
    getter,
    runFunction: null,
    immediate: watchImmediateOption(call.arguments[3] ?? null),
  }));
}

function readObservationRunSite(
  context: RuntimeEffectSourceContext,
  call: ts.CallExpression,
): void {
  const expression = unwrapExpression(call.expression);
  if (
    !ts.isPropertyAccessExpression(expression)
    || expression.name.text !== 'run'
    || !expressionIsObservationRoot(
      expression.expression,
      context.roots,
      context.bindings,
      context.typeSystem,
      context.sourcePathByFileName,
    )
  ) {
    return;
  }
  const runFunction = unwrapExpression(call.arguments[0] ?? expression.name);
  context.sites.push(sourceSiteForNode(context, call, {
    sourceFile: context.sourceFile,
    effectKind: RuntimeEffectKind.Run,
    dependencyEvaluationKind: ts.isArrowFunction(runFunction) || ts.isFunctionExpression(runFunction)
      ? RuntimeEffectDependencyEvaluationKind.ConnectableRun
      : RuntimeEffectDependencyEvaluationKind.Open,
    call,
    expression: null,
    getter: null,
    runFunction: ts.isArrowFunction(runFunction) || ts.isFunctionExpression(runFunction)
      ? runFunction
      : null,
    immediate: true,
  }));
}

function nodeIsObservationTyped(
  node: ts.VariableDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration,
  bindings: SourceImportBindings,
): boolean {
  return typeNodeReferencesImportedExport(node.type ?? null, bindings, OBSERVATION_SERVICE_EXPORTS);
}

function expressionCreatesObservationRoot(
  expression: ts.Expression | null,
  bindings: SourceImportBindings,
  typeSystem: TypeSystemProject,
  sourcePathByFileName: ReadonlyMap<string, string>,
): boolean {
  if (expression == null) {
    return false;
  }
  const current = unwrapExpression(expression);
  if (!ts.isCallExpression(current)) {
    return false;
  }
  const firstArgument = current.arguments[0] ?? null;
  if (firstArgument == null || expressionReferencesObservationKey(firstArgument, bindings) !== true) {
    return false;
  }
  const callee = unwrapExpression(current.expression);
  if (readImportedExportName(callee, bindings, OBSERVATION_RESOLVE_EXPORTS) === 'resolve') {
    return true;
  }
  return ts.isPropertyAccessExpression(callee)
    && callee.name.text === 'get'
    && isAureliaContainerReceiver(
      typeSystem,
      callee.expression,
      DiContainerApiMethodKind.Get,
      sourcePathByFileName,
    );
}

function expressionIsObservationRoot(
  expression: ts.Expression,
  roots: ObservationRootSet,
  bindings: SourceImportBindings,
  typeSystem: TypeSystemProject,
  sourcePathByFileName: ReadonlyMap<string, string>,
): boolean {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return roots.locals.has(current.text) || expressionCreatesObservationRoot(current, bindings, typeSystem, sourcePathByFileName);
  }
  if (
    ts.isPropertyAccessExpression(current)
    && current.expression.kind === ts.SyntaxKind.ThisKeyword
    && roots.instanceMembers.has(current.name.text)
  ) {
    return true;
  }
  return expressionCreatesObservationRoot(current, bindings, typeSystem, sourcePathByFileName);
}

function expressionReferencesObservationKey(
  expression: ts.Expression,
  bindings: SourceImportBindings,
): boolean {
  return readImportedExportName(expression, bindings, OBSERVATION_SERVICE_EXPORTS) === 'IObservation';
}

function parameterIsInjectedObservation(
  parameter: ts.ParameterDeclaration,
  bindings: SourceImportBindings,
  classDependencies: DiClassDependencyProjectView,
): boolean {
  if (!ts.isConstructorDeclaration(parameter.parent)) {
    return false;
  }
  const constructor = parameter.parent;
  const parameterIndex = constructor.parameters.indexOf(parameter);
  const classNode = constructor.parent;
  if (parameterIndex < 0 || !ts.isClassLike(classNode)) {
    return false;
  }
  const plan = classDependencies.readForDeclaration(classNode);
  const dependency = plan?.positionState === DiClassDependencyPositionState.Exact
    ? plan.slots[parameterIndex] ?? null
    : null;
  if (dependency?.state !== DiClassDependencySlotState.Present) {
    return false;
  }
  return dependency.lookupKeyExpression == null
    ? false
    : expressionReferencesObservationKey(dependency.lookupKeyExpression, bindings);
}

function propertyNameForInstanceMember(
  name: ts.PropertyName,
): string | null {
  return ts.isIdentifier(name)
    || ts.isStringLiteral(name)
    || ts.isNoSubstitutionTemplateLiteral(name)
    || ts.isNumericLiteral(name)
    ? name.text
    : null;
}

function parameterIsParameterProperty(
  parameter: ts.ParameterDeclaration,
): boolean {
  return (ts.canHaveModifiers(parameter) ? ts.getModifiers(parameter) : undefined)?.some((modifier) =>
    modifier.kind === ts.SyntaxKind.PublicKeyword
    || modifier.kind === ts.SyntaxKind.ProtectedKeyword
    || modifier.kind === ts.SyntaxKind.PrivateKeyword
    || modifier.kind === ts.SyntaxKind.ReadonlyKeyword
  ) === true;
}

function watchImmediateOption(
  options: ts.Expression | null,
): boolean | null {
  if (options == null) {
    return true;
  }
  const current = unwrapExpression(options);
  if (!ts.isObjectLiteralExpression(current)) {
    return null;
  }
  const immediate = readObjectPropertyExpression(current, 'immediate');
  if (immediate == null) {
    return true;
  }
  const value = unwrapExpression(immediate);
  if (value.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (value.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  return null;
}

function runtimeEffectObservedDependenciesForDrafts(
  store: KernelStore,
  publication: KernelPublicationContext,
  local: string,
  effect: RuntimeEffectReference,
  drafts: readonly RuntimeObservedDependencyDraft[],
  accessPublications: RuntimeSourceAccessUsePublication['publications'],
  provenanceHandle: ProvenanceHandle,
): readonly RuntimeEffectObservedDependencyPublication[] {
  return observedDependencyAccessUseDrafts(publication, drafts, accessPublications).map((draft, index) =>
    runtimeEffectObservedDependencyForDraft(
      store,
      publication,
      `${local}:${index}`,
      effect,
      draft,
      index,
      provenanceHandle,
    )
  );
}

function runtimeEffectOperationSourceForSite(
  store: KernelStore,
  publication: KernelPublicationContext,
  site: RuntimeEffectSourceSite,
  typeSystem: TypeSystemProject,
): RuntimeEffectOperationSource {
  if (site.expression != null) {
    const contentStart = site.expression.getStart(site.sourceFile) + 1;
    const contentEnd = site.expression.end - 1;
    const result = observationEffectExpressionParser.parse(
      site.expression.text,
      'IsProperty',
      {
        baseSpan: sourceSpanFromBounds(
          contentStart,
          contentEnd,
          new SourceFileRef(site.sourceFileAddressHandle, site.sourcePath),
        ),
      },
    );
    const expression = result.kind === ExpressionParseResultKind.ExpressionSuccess
      || result.kind === ExpressionParseResultKind.EmptyExpressionSuccess
      ? result.ast
      : null;
    const ownerExpression = site.call.arguments[0] ?? null;
    const ownerType = ownerExpression == null
      ? null
      : typeSystem.readProgramTypeAtLocation(ownerExpression);
    const observedDependencyOccurrences = expression == null
      ? []
      : collectRuntimeConnectableObservedDependencyDrafts(expression).map((draft) => ({
          ...draft,
          sourceFileAddressHandle: site.sourceFileAddressHandle,
        }));
    return {
      expression,
      observedDependencyOccurrences,
      rootType: ownerType,
      rootSourceNode: ownerExpression,
    };
  }
  if (site.getter != null) {
    return {
      expression: null,
      rootType: null,
      rootSourceNode: null,
      observedDependencyOccurrences: ProxyObservable.collectObservedDependencyOccurrenceDrafts(
        site.getter,
        ProxyObservable.typeContextForTypeSystem(typeSystem, store, publication),
      ),
    };
  }
  return {
    expression: null,
    rootType: null,
    rootSourceNode: null,
    observedDependencyOccurrences: site.runFunction == null
      ? []
      : collectRunEffectObservedDependencyOccurrenceDrafts(publication, site.runFunction, typeSystem),
  };
}

function runtimeEffectAccessUsesForSite(
  store: KernelStore,
  publication: KernelPublicationContext,
  local: string,
  site: RuntimeEffectSourceSite,
  effect: RuntimeEffectReference,
  typeSystem: TypeSystemProject,
  expressionWorld: CheckerExpressionTypeWorld,
  operationSource: RuntimeEffectOperationSource,
  provenanceHandle: ProvenanceHandle,
) {
  const operationKind = site.expression != null
    ? RuntimeExpressionOperationKind.EffectExpression
    : site.getter != null
      ? RuntimeExpressionOperationKind.EffectGetter
      : RuntimeExpressionOperationKind.EffectRunCallback;
  const targetProjector = RuntimeRootExpressionAccessTargetProjector.forCheckerType({
    store,
    expressionWorld,
    typeSystem,
    rootType: operationSource.rootType,
    sourceNode: operationSource.rootSourceNode,
    localKey: `${local}:expression-target`,
  });
  const drafts: readonly RuntimeSourceAccessUseDraft[] = operationSource.expression == null
    ? site.getter != null || site.runFunction != null
      ? collectRuntimeTypeScriptAccessUseDrafts({
          declaration: site.getter ?? site.runFunction!,
          typeSystem,
          store,
          publication,
          trackedDependencies: operationSource.observedDependencyOccurrences,
        })
      : []
    : collectRuntimeTemplateAccessUseDrafts({
        expression: operationSource.expression,
      }).map((draft) => runtimeSourceAccessDraftForExpression(
        draft,
        targetProjector,
      ));
  return publishRuntimeSourceAccessUses({
    store,
    publication,
    local,
    ownerKind: RuntimeExpressionAccessOwnerKind.SourceEffectPlan,
    ownerProductHandle: effect.productHandle!,
    ownerIdentityHandle: effect.identityHandle!,
    ownerSourceAddressHandle: effect.addressHandle,
    operationKind,
    operationIndex: null,
    phase: RuntimeExpressionAccessPhase.EffectEvaluation,
    realization: RuntimeOperationRealization.Direct,
    reachability: RuntimeOperationReachability.Open,
    provenanceHandle,
    claimPredicateKey: KernelVocabulary.RuntimeExpression.SourceEffectPlanUsesAccessUse.key,
    drafts,
  });
}

function runtimeSourceAccessDraftForExpression(
  draft: ReturnType<typeof collectRuntimeTemplateAccessUseDrafts>[number],
  targetProjector: RuntimeRootExpressionAccessTargetProjector | null,
): RuntimeSourceAccessUseDraft {
  const target = targetProjector?.project(draft.expression) ?? null;
  return {
    ...draft,
    tracking: RuntimeExpressionAccessTracking.Connectable,
    targetResolution: target?.resolution ?? RuntimeExpressionAccessTargetResolution.Open,
    targetLinks: target?.links ?? [],
  };
}

function collectRunEffectObservedDependencyOccurrenceDrafts(
  publication: KernelPublicationContext,
  declaration: ts.FunctionLikeDeclaration,
  typeSystem: TypeSystemProject,
): readonly RuntimeObservedDependencyDraft[] {
  const sourceFile = declaration.getSourceFile();
  const sourceFileAddressHandle = ensureSourceFileAddressForCheckerNode(
    publication,
    typeSystem.checker,
    sourceFile,
  ).handle;
  const rows: RuntimeObservedDependencyDraft[] = [];
  const visit = (node: ts.Node | null): void => {
    if (node == null) {
      return;
    }
    if (node !== declaration && isNestedExecutionBoundary(node)) {
      return;
    }
    if (
      ts.isPropertyAccessExpression(node)
      && typescriptAccessModeForExpression(node) !== TypeScriptAccessMode.Write
    ) {
      const draft = observablePropertyReadDraft(publication, node, typeSystem);
      if (draft != null) {
        rows.push(draft);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(declaration.body ?? null);
  return rows.sort((left, right) =>
    `${left.spanStart ?? -1}:${left.sourceName ?? ''}`.localeCompare(`${right.spanStart ?? -1}:${right.sourceName ?? ''}`)
  );

  function observablePropertyReadDraft(
    publication: KernelPublicationContext,
    expression: ts.PropertyAccessExpression,
    typeSystem: TypeSystemProject,
  ): RuntimeObservedDependencyDraft | null {
    const symbol = typeSystem.readProgramSymbolAtLocation(expression.name);
    if (!symbolHasObservableDecorator(symbol)) {
      return null;
    }
    return {
      dependencyKind: RuntimeObservedDependencyKind.ObservablePropertyRead,
      expressionKind: 'ObservableGetterRead',
      sourceName: expression.getText(sourceFile),
      sourceRootName: typescriptExpressionSourceRootName(expression.expression),
      memberName: expression.name.text,
      keyExpression: null,
      methodName: null,
      ...observedMemberSourceFields(observedMemberSourceForCheckerSymbol(
        publication,
        typeSystem.checker,
        symbol,
      )),
      sourceFileAddressHandle,
      memberNameSpanStart: expression.name.getStart(sourceFile),
      memberNameSpanEnd: expression.name.end,
      spanStart: expression.getStart(sourceFile),
      spanEnd: expression.end,
    };
  }
}

function runtimeEffectObservedDependencyForDraft(
  store: KernelStore,
  publicationContext: KernelPublicationContext,
  local: string,
  effect: RuntimeEffectReference,
  draft: RuntimeObservedDependencyAccessUseDraft,
  index: number,
  provenanceHandle: ProvenanceHandle,
): RuntimeEffectObservedDependencyPublication {
  const publication = sourceObservedDependencyRecords({
    store,
    local,
    owner: {
      productHandle: effect.productHandle!,
      identityHandle: effect.identityHandle,
      addressHandle: effect.addressHandle,
    },
    draft,
    index,
    provenanceHandle,
    claimPredicateKey: KernelVocabulary.Observation.RuntimeEffectUsesObservedDependency.key,
    claimLocalName: 'runtime-effect-uses-observed-dependency',
  });
  const detail = new RuntimeEffectObservedDependency(
    publication.productHandle,
    publication.identityHandle,
    effect,
    draft.accessUseProductHandle,
    draft.dependencyKind,
    draft.expressionKind,
    draft.sourceName,
    draft.sourceRootName,
    draft.memberName,
    draft.keyExpression,
    draft.methodName,
    draft.observedMemberKind ?? null,
    draft.observedMemberSourceAddressHandle ?? null,
    draft.spanStart,
    draft.spanEnd,
    publication.sourceAddressHandle,
  );
  return {
    detail,
    records: publication.records,
  };
}

function runtimeEffectSummary(
  site: RuntimeEffectSourceSite,
): string {
  return site.effectKind === RuntimeEffectKind.Run
    ? `Observation.run effect uses ${site.dependencyEvaluationKind}.`
    : `Observation.watch effect uses ${site.dependencyEvaluationKind}.`;
}

function runtimeEffectLocalKey(
  project: ProjectBootFrame,
  site: RuntimeEffectSourceSite,
  index: number,
): string {
  return [
    'runtime-effect',
    site.effectKind,
    localKeyPart(project.projectKey),
    localKeyPart(site.sourcePath),
    site.start,
    site.end,
    index,
  ].join(':');
}
