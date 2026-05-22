import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import {
  DiContainerApiMethodKind,
  isAureliaContainerReceiver,
} from '../di/container-api-recognition.js';
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
  typescriptExpressionSourceRootName,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import { ExpressionParser } from '../expression/expression-parser.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import {
  SourceFileRef,
  sourceSpanFromBounds,
} from '../expression/source-span.js';
import { EvidenceRole } from '../kernel/evidence.js';
import type {
  AddressHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { SourceSpanSite } from '../kernel/source-address.js';
import {
  KernelStore,
  KernelStoreBatch,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { typeSystemSourcePathIndex } from '../type-system/source-path-index.js';
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
  distinctRuntimeObservedDependencyDrafts,
  runtimeObservedDependencySemanticKey,
  type RuntimeObservedDependencyDraft,
} from './runtime-observed-dependency-draft.js';
import { RuntimeObservedDependencyKind } from './runtime-binding-observation.js';
import { sourceObservationProductRecords } from './source-observation-product-publication.js';
import { sourceObservedDependencyRecords } from './source-observed-dependency-publication.js';
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

const OBSERVATION_INJECT_EXPORTS = new Set([
  'inject',
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

/** Materializes direct source-level Observation.watch(...) effects and their observed dependencies. */
export class RuntimeEffectMaterializer {
  constructor(
    readonly store: KernelStore,
  ) {}

  materialize(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
  ): RuntimeEffectProjectResult {
    const publications = readRuntimeEffectSourceSites(project, typeSystem)
      .map((site, index) => this.publicationForSite(project, typeSystem, site, index));
    const records = publications.flatMap((publication) => publication.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, `runtime-effects:${project.projectKey}`));
    }
    for (const publication of publications) {
      this.store.productDetails.add(
        ObservationProductDetails.RuntimeEffect,
        publication.effect.productHandle!,
        publication.effect,
      );
      for (const dependency of publication.effect.observedDependencies) {
        this.store.productDetails.add(
          ObservationProductDetails.RuntimeEffectObservedDependency,
          dependency.productHandle,
          dependency,
        );
      }
    }
    return new RuntimeEffectProjectResult(publications.map((publication) => publication.effect));
  }

  private publicationForSite(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
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
    const dependencies = runtimeEffectObservedDependenciesForSite(
      this.store,
      `${local}:observed-dependency`,
      site,
      effectReference,
      typeSystem,
      product.provenanceHandle,
    );
    const effect = new RuntimeEffect(
      site.effectKind,
      site.dependencyEvaluationKind,
      product.productHandle,
      product.identityHandle,
      site.immediate,
      dependencies.map((dependency) => dependency.detail),
      product.sourceAddressHandle,
      [],
    );
    return {
      effect,
      records: [
        ...product.records,
        ...dependencies.flatMap((dependency) => dependency.records),
      ],
    };
  }
}

function readRuntimeEffectSourceSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly RuntimeEffectSourceSite[] {
  const sourcePathByFileName = typeSystemSourcePathIndex(project, typeSystem);
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readSourceFileByPath(source.path);
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
      roots: readObservationRoots(sourceFile, bindings, typeSystem, sourcePathByFileName),
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
      if (nodeIsObservationTyped(node, bindings) || parameterIsInjectedObservation(node, bindings)) {
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
      typeSystem.checker,
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
  const injectArguments = classInjectArguments(classNode, bindings);
  return injectArguments[parameterIndex] != null
    && expressionReferencesObservationKey(injectArguments[parameterIndex]!, bindings);
}

function classInjectArguments(
  classNode: ts.ClassLikeDeclaration,
  bindings: SourceImportBindings,
): readonly ts.Expression[] {
  const injectDecorator = (ts.getDecorators(classNode) ?? []).find((decorator) => {
    const expression = unwrapExpression(decorator.expression);
    return ts.isCallExpression(expression)
      && readImportedExportName(expression.expression, bindings, OBSERVATION_INJECT_EXPORTS) === 'inject';
  });
  if (injectDecorator == null) {
    return [];
  }
  const expression = unwrapExpression(injectDecorator.expression);
  return ts.isCallExpression(expression) ? [...expression.arguments] : [];
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

function runtimeEffectObservedDependenciesForSite(
  store: KernelStore,
  local: string,
  site: RuntimeEffectSourceSite,
  effect: RuntimeEffectReference,
  typeSystem: TypeSystemProject,
  provenanceHandle: ProvenanceHandle,
): readonly RuntimeEffectObservedDependencyPublication[] {
  const drafts = observedDependencyDraftsForEffectSite(store, site, typeSystem);
  return distinctRuntimeObservedDependencyDrafts(drafts).map((draft, index) =>
    runtimeEffectObservedDependencyForDraft(store, `${local}:${index}`, site, effect, draft, index, provenanceHandle)
  );
}

function observedDependencyDraftsForEffectSite(
  store: KernelStore,
  site: RuntimeEffectSourceSite,
  typeSystem: TypeSystemProject,
): readonly RuntimeObservedDependencyDraft[] {
  if (site.expression != null) {
    const expressionText = site.expression.text;
    const contentStart = site.expression.getStart(site.sourceFile) + 1;
    const contentEnd = site.expression.end - 1;
    const result = observationEffectExpressionParser.parse(
      expressionText,
      'IsProperty',
      {
        baseSpan: sourceSpanFromBounds(
          contentStart,
          contentEnd,
          new SourceFileRef(site.sourceFileAddressHandle, site.sourcePath),
        ),
      },
    );
    return result.kind === ExpressionParseResultKind.ExpressionSuccess
      || result.kind === ExpressionParseResultKind.EmptyExpressionSuccess
      ? collectRuntimeConnectableObservedDependencyDrafts(result.ast)
      : [];
  }
  if (site.getter != null) {
    return ProxyObservable.collectObservedDependencyDrafts(
      site.getter,
      ProxyObservable.typeContextForTypeSystem(typeSystem, store),
    );
  }
  return site.runFunction == null
    ? []
    : collectRunEffectObservedDependencyDrafts(store, site.runFunction, typeSystem);
}

function collectRunEffectObservedDependencyDrafts(
  store: KernelStore,
  declaration: ts.FunctionLikeDeclaration,
  typeSystem: TypeSystemProject,
): readonly RuntimeObservedDependencyDraft[] {
  const sourceFile = declaration.getSourceFile();
  const rows = new Map<string, RuntimeObservedDependencyDraft>();
  const visit = (node: ts.Node | null): void => {
    if (node == null) {
      return;
    }
    if (node !== declaration && isNestedExecutionBoundary(node)) {
      return;
    }
    if (ts.isPropertyAccessExpression(node)) {
      const draft = observablePropertyReadDraft(store, node, typeSystem);
      if (draft != null) {
        rows.set(runtimeObservedDependencySemanticKey(draft), draft);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(declaration.body ?? null);
  return [...rows.values()].sort((left, right) =>
    `${left.spanStart ?? -1}:${left.sourceName ?? ''}`.localeCompare(`${right.spanStart ?? -1}:${right.sourceName ?? ''}`)
  );

  function observablePropertyReadDraft(
    store: KernelStore,
    expression: ts.PropertyAccessExpression,
    typeSystem: TypeSystemProject,
  ): RuntimeObservedDependencyDraft | null {
    const programExpression = typeSystem.readProgramNode(expression);
    if (programExpression == null) {
      return null;
    }
    const symbol = typeSystem.checker.getSymbolAtLocation(programExpression.name);
    if (!symbolHasObservableGetterDecorator(symbol)) {
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
      ...observedMemberSourceFields(observedMemberSourceForCheckerSymbol(store, symbol)),
      spanStart: expression.getStart(sourceFile),
      spanEnd: expression.end,
    };
  }
}

function symbolHasObservableGetterDecorator(
  symbol: ts.Symbol | null | undefined,
): boolean {
  return (symbol?.declarations ?? []).some(declarationHasObservableGetterDecorator);
}

function declarationHasObservableGetterDecorator(
  declaration: ts.Declaration,
): boolean {
  if (!ts.canHaveDecorators(declaration)) {
    return false;
  }
  return (ts.getDecorators(declaration) ?? []).some((decorator) => {
    const expression = unwrapExpression(decorator.expression);
    const callee = ts.isCallExpression(expression)
      ? expression.expression
      : expression;
    return readImportedExportName(
      callee,
      readSourceImportBindings(declaration.getSourceFile(), OBSERVATION_MODULES, OBSERVATION_EXPORTS),
      true,
    ) === 'observable';
  });
}

function runtimeEffectObservedDependencyForDraft(
  store: KernelStore,
  local: string,
  site: RuntimeEffectSourceSite,
  effect: RuntimeEffectReference,
  draft: RuntimeObservedDependencyDraft,
  index: number,
  provenanceHandle: ProvenanceHandle,
): RuntimeEffectObservedDependencyPublication {
  const publication = sourceObservedDependencyRecords({
    store,
    local,
    sourceFileAddressHandle: site.sourceFileAddressHandle,
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
    [],
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
