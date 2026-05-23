import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import {
  readSourceImportBindings,
} from '../evaluation/import-bindings.js';
import {
  readPropertyName,
  sourceSiteForNode,
  type TypeScriptSourceSiteContext,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import {
  EvidenceKind,
  EvidenceRole,
} from '../kernel/evidence.js';
import type { AddressHandle, IdentityHandle } from '../kernel/handles.js';
import { localKeyPart, sourceNodeOrdinalLocalKey } from '../kernel/local-key.js';
import {
  sourceSpanAddressForSite,
  type SourceSpanAddressPublication,
} from '../kernel/source-address.js';
import {
  KernelStore,
  KernelStoreBatch,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  normalizeTypeSystemSourceFileName,
  typeSystemSourcePathIndex,
} from '../type-system/source-path-index.js';
import type { RouteConfigRecognitionProjectResult } from './route-config-recognition.js';
import type { RouteRecognizerMaterializationProjectResult } from './route-recognizer-materialization.js';
import type {
  ConfigurableRouteModel,
  RouteConfigModel,
  RouteConfigReference,
  RouteContextParameterMergeStrategy,
  RouteContextParameterReadAlignment,
  RouteableComponentReference,
} from './model.js';
import {
  RouteContextParameterReadModel,
  RouteableComponentKind,
} from './model.js';
import { RouterProductDetails } from './product-details.js';
import { routerProductRecords } from './router-product-records.js';

const ROUTE_CONTEXT_MODULES = new Set([
  '@aurelia/router',
]);

const ROUTE_CONTEXT_EXPORTS = new Set([
  'IRouteContext',
  'RouteContext',
]);

type RouteContextParameterReadIncludeQueryParams = boolean | null;

interface RouteContextParameterKey {
  readonly name: string;
  readonly optional: boolean;
  readonly valueType: string;
}

interface RouteContextParameterReadSite {
  readonly sourcePath: string;
  readonly sourceFileAddressHandle: AddressHandle;
  readonly sourceFile: ts.SourceFile;
  readonly call: ts.CallExpression;
  readonly start: number;
  readonly end: number;
  readonly enclosingClassName: string | null;
  readonly enclosingMemberName: string | null;
  readonly declaredKeys: readonly RouteContextParameterKey[];
  readonly declaredOpenKeySpace: boolean;
  readonly mergeStrategy: RouteContextParameterMergeStrategy;
  readonly includeQueryParams: RouteContextParameterReadIncludeQueryParams;
}

interface RouteContextParameterReadEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly read: RouteContextParameterReadModel;
}

interface ComponentRouteContextParameterFacts {
  readonly component: RouteableComponentReference | null;
  readonly routeConfigs: readonly RouteConfigModel[];
  readonly routePathParameterNames: readonly string[];
}

/** Source-backed RouteContext.getRouteParameters(...) reads, matched back to route-recognizer path parameters. */
export class RouteContextParameterReadProjectResult {
  constructor(
    readonly project: ProjectBootFrame,
    readonly reads: readonly RouteContextParameterReadModel[],
  ) {}

  readRouteContextParameterReads(): readonly RouteContextParameterReadModel[] {
    return this.reads;
  }
}

/** Materializes RouteContext.getRouteParameters(...) source reads without pretending to execute navigation. */
export class RouteContextParameterReadMaterializer {
  materializeAndEmit(
    store: KernelStore,
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
    resourceIndex: ResourceDefinitionIndex,
    routes: RouteConfigRecognitionProjectResult,
    recognizer: RouteRecognizerMaterializationProjectResult,
  ): RouteContextParameterReadProjectResult {
    const sites = readRouteContextParameterReadSites(project, typeSystem);
    const routesByComponentClassName = routeParameterFactsByComponentClassName(
      resourceIndex,
      routes.readRouteConfigs(),
      recognizer.readConfigurableRoutes(),
    );
    const emissions = sites.map((site, index) =>
      emitRouteContextParameterRead(store, project, site, routesByComponentClassName.get(site.enclosingClassName ?? ''), index)
    );
    const records = emissions.flatMap((emission) => emission.records);
    if (records.length > 0) {
      store.commit(new KernelStoreBatch(records, `router-route-context-parameter-reads:${project.projectKey}`));
      store.productDetails.addAll(
        RouterProductDetails.RouteContextParameterRead,
        emissions.map((emission) => emission.read),
      );
    }
    return new RouteContextParameterReadProjectResult(
      project,
      emissions.map((emission) => emission.read),
    );
  }
}

function readRouteContextParameterReadSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly RouteContextParameterReadSite[] {
  const sourcePathByFileName = typeSystemSourcePathIndex(project, typeSystem);
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
    return sourceFile == null
      ? []
      : readSourceFileRouteContextParameterReadSites(
        {
          sourcePath: source.path,
          sourceFileAddressHandle: source.addressHandle,
          sourceFile,
        },
        typeSystem.checker,
        sourcePathByFileName,
      );
  });
}

function readSourceFileRouteContextParameterReadSites(
  context: TypeScriptSourceSiteContext,
  checker: ts.TypeChecker,
  sourcePathByFileName: ReadonlyMap<string, string>,
): readonly RouteContextParameterReadSite[] {
  const routeContextBindings = readSourceImportBindings(context.sourceFile, ROUTE_CONTEXT_MODULES, ROUTE_CONTEXT_EXPORTS);
  const sites: RouteContextParameterReadSite[] = [];
  const visit = (
    node: ts.Node,
    enclosingClassName: string | null,
    enclosingMemberName: string | null,
  ): void => {
    if (ts.isClassDeclaration(node) && node.name != null) {
      ts.forEachChild(node, (child) => visit(child, node.name!.text, null));
      return;
    }
    if (ts.isClassElement(node)) {
      const memberName = classElementRouteContextParameterMemberName(node, context.sourceFile);
      ts.forEachChild(node, (child) => visit(child, enclosingClassName, memberName));
      return;
    }
    recordRouteContextParameterReadSite(
      sites,
      context,
      checker,
      sourcePathByFileName,
      routeContextBindings,
      node,
      enclosingClassName,
      enclosingMemberName,
    );
    ts.forEachChild(node, (child) => visit(child, enclosingClassName, enclosingMemberName));
  };
  visit(context.sourceFile, null, null);
  return sites;
}

function recordRouteContextParameterReadSite(
  sites: RouteContextParameterReadSite[],
  context: TypeScriptSourceSiteContext,
  checker: ts.TypeChecker,
  sourcePathByFileName: ReadonlyMap<string, string>,
  routeContextBindings: ReturnType<typeof readSourceImportBindings>,
  node: ts.Node,
  enclosingClassName: string | null,
  enclosingMemberName: string | null,
): void {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(unwrapExpression(node.expression))) {
    return;
  }
  const access = unwrapExpression(node.expression) as ts.PropertyAccessExpression;
  if (
    access.name.text !== 'getRouteParameters'
    || !isAureliaRouteContextGetRouteParameters(checker, access, sourcePathByFileName, routeContextBindings)
  ) {
    return;
  }
  const declared = declaredRouteParameterKeys(checker, node);
  sites.push({
    ...sourceSiteForNode(context, node, {
      sourceFile: context.sourceFile,
      call: node,
      enclosingClassName,
      enclosingMemberName,
      declaredKeys: declared.keys,
      declaredOpenKeySpace: declared.openKeySpace,
      mergeStrategy: routeContextParameterMergeStrategy(node, context.sourceFile, checker),
      includeQueryParams: routeContextParameterIncludeQueryParams(node, context.sourceFile, checker),
    }),
  });
}

function isAureliaRouteContextGetRouteParameters(
  checker: ts.TypeChecker,
  access: ts.PropertyAccessExpression,
  sourcePathByFileName: ReadonlyMap<string, string>,
  routeContextBindings: ReturnType<typeof readSourceImportBindings>,
): boolean {
  if (isImportedRouteContextResolveReceiver(access.expression, routeContextBindings)) {
    return true;
  }
  const symbol = checker.getSymbolAtLocation(access.name)
    ?? checker.getPropertyOfType(checker.getTypeAtLocation(access.expression), 'getRouteParameters')
    ?? null;
  const declarations = symbol?.declarations ?? [];
  return declarations.some((declaration) => isFrameworkRouteContextDeclaration(declaration, sourcePathByFileName));
}

function isImportedRouteContextResolveReceiver(
  receiver: ts.Expression,
  routeContextBindings: ReturnType<typeof readSourceImportBindings>,
): boolean {
  const current = unwrapExpression(receiver);
  if (!ts.isCallExpression(current) || current.arguments.length === 0) {
    return false;
  }
  const callee = unwrapExpression(current.expression);
  if (
    !(ts.isIdentifier(callee) && callee.text === 'resolve')
    && !(ts.isPropertyAccessExpression(callee) && callee.name.text === 'resolve')
  ) {
    return false;
  }
  const key = unwrapExpression(current.arguments[0]!);
  if (ts.isIdentifier(key)) {
    const imported = routeContextBindings.locals.get(key.text);
    return imported === 'IRouteContext' || imported === 'RouteContext';
  }
  if (
    ts.isPropertyAccessExpression(key)
    && (key.name.text === 'IRouteContext' || key.name.text === 'RouteContext')
    && ts.isIdentifier(unwrapExpression(key.expression))
  ) {
    return routeContextBindings.namespaces.has((unwrapExpression(key.expression) as ts.Identifier).text);
  }
  return false;
}

function isFrameworkRouteContextDeclaration(
  declaration: ts.Declaration,
  sourcePathByFileName: ReadonlyMap<string, string>,
): boolean {
  const sourceFileName = normalizeTypeSystemSourceFileName(declaration.getSourceFile().fileName);
  const projectSourcePath = sourcePathByFileName.get(sourceFileName) ?? sourceFileName;
  const normalized = projectSourcePath.replace(/\\/g, '/');
  return normalized.includes('/aurelia/packages/router/src/route-context.ts')
    || normalized.includes('/aurelia/packages/router/dist/types/route-context.d.ts')
    || normalized.includes('/@aurelia/router/');
}

function declaredRouteParameterKeys(
  checker: ts.TypeChecker,
  call: ts.CallExpression,
): { readonly keys: readonly RouteContextParameterKey[]; readonly openKeySpace: boolean } {
  const typeNode = call.typeArguments?.[0] ?? null;
  if (typeNode == null) {
    return { keys: [], openKeySpace: true };
  }
  const type = checker.getTypeFromTypeNode(typeNode);
  const keys = checker.getPropertiesOfType(type)
    .map((symbol) => ({
      name: symbol.getName(),
      optional: (symbol.getFlags() & ts.SymbolFlags.Optional) !== 0,
      valueType: checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, typeNode)),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  return {
    keys,
    openKeySpace: checker.getIndexTypeOfType(type, ts.IndexKind.String) != null,
  };
}

function routeContextParameterMergeStrategy(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
): RouteContextParameterMergeStrategy {
  const optionStrategy = routeContextParameterStringOption(call, sourceFile, checker, 'mergeStrategy');
  if (isRouteContextParameterMergeStrategy(optionStrategy)) {
    return optionStrategy;
  }
  const typeStrategy = call.typeArguments?.[1] == null
    ? null
    : routeContextParameterStrategyFromTypeNode(checker, call.typeArguments[1]!);
  if (isRouteContextParameterMergeStrategy(typeStrategy)) {
    return typeStrategy;
  }
  return optionStrategy == null && typeStrategy == null ? 'child-first' : 'unknown';
}

function routeContextParameterStrategyFromTypeNode(
  checker: ts.TypeChecker,
  typeNode: ts.TypeNode,
): string | null {
  if (ts.isLiteralTypeNode(typeNode) && ts.isStringLiteral(typeNode.literal)) {
    return typeNode.literal.text;
  }
  const type = checker.getTypeFromTypeNode(typeNode);
  return stringLiteralUnionValues(type).length === 1
    ? stringLiteralUnionValues(type)[0]!
    : null;
}

function routeContextParameterIncludeQueryParams(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
): RouteContextParameterReadIncludeQueryParams {
  const option = routeContextParameterPropertyInitializer(call, 'includeQueryParams');
  if (option == null) {
    return null;
  }
  const current = unwrapExpression(option);
  if (current.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (current.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  const constant = ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)
    ? checker.getConstantValue(current)
    : undefined;
  if (typeof constant === 'boolean') {
    return constant;
  }
  const text = current.getText(sourceFile);
  return text === 'true' ? true : text === 'false' ? false : null;
}

function routeContextParameterStringOption(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  propertyName: string,
): string | null {
  const option = routeContextParameterPropertyInitializer(call, propertyName);
  if (option == null) {
    return null;
  }
  const current = unwrapExpression(option);
  if (ts.isStringLiteralLike(current)) {
    return current.text;
  }
  const constant = ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)
    ? checker.getConstantValue(current)
    : undefined;
  return typeof constant === 'string'
    ? constant
    : current.getText(sourceFile);
}

function routeContextParameterPropertyInitializer(
  call: ts.CallExpression,
  propertyName: string,
): ts.Expression | null {
  const options = call.arguments[0] == null ? null : unwrapExpression(call.arguments[0]!);
  if (options == null || !ts.isObjectLiteralExpression(options)) {
    return null;
  }
  for (const property of options.properties) {
    if (ts.isPropertyAssignment(property) && readPropertyName(property.name) === propertyName) {
      return property.initializer;
    }
  }
  return null;
}

function stringLiteralUnionValues(type: ts.Type): readonly string[] {
  if (type.isStringLiteral()) {
    return [type.value];
  }
  if (type.isUnion()) {
    return type.types.flatMap((part) => part.isStringLiteral() ? [part.value] : []);
  }
  return [];
}

function isRouteContextParameterMergeStrategy(
  value: string | null,
): value is Exclude<RouteContextParameterMergeStrategy, 'unknown'> {
  return value === 'child-first'
    || value === 'parent-first'
    || value === 'append'
    || value === 'by-route';
}

function routeParameterFactsByComponentClassName(
  resourceIndex: ResourceDefinitionIndex,
  routeConfigs: readonly RouteConfigModel[],
  configurableRoutes: readonly ConfigurableRouteModel[],
): ReadonlyMap<string, ComponentRouteContextParameterFacts> {
  const configurableRoutesByRouteConfig = new Map<IdentityHandle, readonly ConfigurableRouteModel[]>();
  for (const route of configurableRoutes) {
    if (route.routeConfig.identityHandle == null) {
      continue;
    }
    configurableRoutesByRouteConfig.set(route.routeConfig.identityHandle, [
      ...(configurableRoutesByRouteConfig.get(route.routeConfig.identityHandle) ?? []),
      route,
    ]);
  }

  const factsByClassName = new Map<string, ComponentRouteContextParameterFacts>();
  for (const routeConfig of routeConfigs) {
    const className = routeConfigComponentClassName(resourceIndex, routeConfig);
    if (className == null) {
      continue;
    }
    const existing = factsByClassName.get(className);
    const parameterNames = uniqueSorted([
      ...(existing?.routePathParameterNames ?? []),
      ...routePathParameterNames(configurableRoutesByRouteConfig.get(routeConfig.identityHandle) ?? []),
    ]);
    factsByClassName.set(className, {
      component: existing?.component ?? routeConfig.component,
      routeConfigs: [...(existing?.routeConfigs ?? []), routeConfig],
      routePathParameterNames: parameterNames,
    });
  }
  return factsByClassName;
}

function routeConfigComponentClassName(
  resourceIndex: ResourceDefinitionIndex,
  routeConfig: RouteConfigModel,
): string | null {
  const component = routeConfig.component;
  if (component == null) {
    return null;
  }
  const definition = routeConfigComponentDefinition(resourceIndex, component);
  return definition?.target.localName
    ?? (component.componentKind === RouteableComponentKind.ClassReference
      || component.componentKind === RouteableComponentKind.ResourceDefinition
      ? component.localName
      : null)
    ?? null;
}

function routeConfigComponentDefinition(
  resourceIndex: ResourceDefinitionIndex,
  component: RouteableComponentReference,
): FullResourceDefinition | null {
  return resourceIndex.lookupByProduct(component.resolvedProductHandle)
    ?? resourceIndex.lookupByTargetIdentity(component.resolvedIdentityHandle)
    ?? null;
}

function routePathParameterNames(
  configurableRoutes: readonly ConfigurableRouteModel[],
): readonly string[] {
  return uniqueSorted(configurableRoutes.flatMap((route) => route.parameters.map((parameter) => parameter.name)));
}

function emitRouteContextParameterRead(
  store: KernelStore,
  project: ProjectBootFrame,
  site: RouteContextParameterReadSite,
  facts: ComponentRouteContextParameterFacts | undefined,
  index: number,
): RouteContextParameterReadEmission {
  const routePathParameterNames = facts?.routePathParameterNames ?? [];
  const declaredParameterNames = site.declaredKeys.map((key) => key.name);
  const missingRoutePathParameterNames = site.declaredOpenKeySpace
    ? []
    : routePathParameterNames.filter((name) => !declaredParameterNames.includes(name));
  const declaredNonPathParameterNames = declaredParameterNames.filter((name) => !routePathParameterNames.includes(name));
  const alignment = routeContextParameterReadAlignment(
    facts,
    site.declaredOpenKeySpace,
    missingRoutePathParameterNames,
    declaredNonPathParameterNames,
    site.includeQueryParams,
  );
  const local = sourceNodeOrdinalLocalKey({
    prefix: `router-route-context-parameter-read:${project.projectKey}:${localKeyPart(site.sourcePath)}`,
    sourceFile: site.sourceFile,
    node: site.call,
    index,
  });
  const source = sourceSpanAddressForSite(store, local, site);
  const read = new RouteContextParameterReadModel(
    store.handles.product(local),
    store.handles.identity(local),
    site.enclosingClassName,
    facts?.component ?? null,
    facts?.routeConfigs.map((routeConfig) => routeConfig.toReference()) ?? [],
    site.mergeStrategy,
    site.includeQueryParams,
    declaredParameterNames,
    site.declaredKeys.filter((key) => key.optional).map((key) => key.name),
    site.declaredOpenKeySpace,
    routePathParameterNames,
    missingRoutePathParameterNames,
    declaredNonPathParameterNames,
    alignment,
    source.handle,
  );
  return {
    records: [
      ...source.records,
      ...routeContextParameterReadRecords(store, local, read, facts, source),
    ],
    read,
  };
}

function routeContextParameterReadRecords(
  store: KernelStore,
  local: string,
  read: RouteContextParameterReadModel,
  facts: ComponentRouteContextParameterFacts | undefined,
  source: SourceSpanAddressPublication,
): readonly KernelStoreRecord[] {
  return routerProductRecords(store, {
    local,
    evidenceHandle: store.handles.evidence(local),
    provenanceHandle: store.handles.provenance(local),
    productHandle: read.productHandle,
    identityHandle: read.identityHandle,
    productKindKey: KernelVocabulary.Router.RouteContextParameterRead.key,
    ownerHandle: facts?.component?.resolvedIdentityHandle
      ?? facts?.component?.identityHandle
      ?? read.identityHandle,
    sourceAddressHandle: source.handle,
    localName: read.componentClassName,
    evidenceKind: EvidenceKind.SemanticObservation,
    evidenceRoles: [EvidenceRole.Usage, EvidenceRole.Diagnostic],
    evidenceSummary: 'RouteContext.getRouteParameters(...) call correlated with declared parameter shape and route path parameters.',
  });
}

function routeContextParameterReadAlignment(
  facts: ComponentRouteContextParameterFacts | undefined,
  declaredOpenKeySpace: boolean,
  missingRoutePathParameterNames: readonly string[],
  declaredNonPathParameterNames: readonly string[],
  includeQueryParams: boolean | null,
): RouteContextParameterReadAlignment {
  if (facts == null) {
    return 'unmatched-component';
  }
  if (declaredOpenKeySpace) {
    return 'open-declared-shape';
  }
  if (missingRoutePathParameterNames.length > 0) {
    return 'missing-route-path-parameters';
  }
  if (declaredNonPathParameterNames.length > 0) {
    return includeQueryParams === true
      ? 'query-or-open-parameters'
      : 'unknown-declared-parameters';
  }
  return 'aligned';
}

function classElementRouteContextParameterMemberName(
  element: ts.ClassElement,
  sourceFile: ts.SourceFile,
): string | null {
  const name = (element as { readonly name?: ts.PropertyName }).name;
  return name == null ? null : readPropertyName(name) ?? name.getText(sourceFile);
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
