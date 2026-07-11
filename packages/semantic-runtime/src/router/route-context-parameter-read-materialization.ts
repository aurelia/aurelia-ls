import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
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
import { uniqueStrings } from '../kernel/collections.js';
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
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  frameworkDeclarationSourceSpec,
  symbolMatchesFrameworkDeclarationSource,
} from '../type-system/framework-declaration-source.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  checkerPropertySymbol,
  checkerSymbolValueType,
} from '../type-system/checker-node-helpers.js';
import { checkerStringIndexValueType } from '../type-system/checker-related-types.js';
import { typeSystemSourcePathIndex } from '../type-system/source-path-index.js';
import type { RouteConfigConvergenceProjectResult } from './route-config-convergence.js';
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
  RouteContextParameterReadOwnershipKind,
  RouterIssueKind,
  RouterIssueModel,
  RouterIssuePhase,
  RouterIssueRelatedInformation,
} from './model.js';
import { RouterProductDetails } from './product-details.js';
import { routerIssueProductRecords } from './router-issue-publication.js';
import { routerProductRecords } from './router-product-records.js';

const ROUTE_CONTEXT_GET_ROUTE_PARAMETERS_DECLARATIONS = frameworkDeclarationSourceSpec(
  new Set(['getRouteParameters']),
  ['@aurelia/router'],
  [
    '/aurelia/packages/router/src/route-context.ts',
    '/aurelia/packages/router/dist/types/route-context.d.ts',
  ],
);

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
  readonly enclosingClass: ts.ClassDeclaration | null;
  readonly enclosingMemberName: string | null;
  readonly declaredKeys: readonly RouteContextParameterKey[];
  readonly declaredOpenKeySpace: boolean;
  readonly mergeStrategy: RouteContextParameterMergeStrategy;
  readonly includeQueryParams: RouteContextParameterReadIncludeQueryParams;
}

interface RouteContextParameterReadSiteEmission {
  readonly records: readonly KernelStoreRecord[];
  readonly reads: readonly RouteContextParameterReadModel[];
  readonly issues: readonly RouterIssueModel[];
}

interface ComponentRouteContextParameterFacts {
  readonly component: RouteableComponentReference | null;
  readonly routeConfigs: readonly RouteConfigModel[];
  readonly routePathParameterNames: readonly string[];
}

interface ComponentRouteContextParameterOwner {
  readonly ownershipKind: RouteContextParameterReadOwnershipKind;
  readonly facts: ComponentRouteContextParameterFacts;
}

/** Source-backed RouteContext.getRouteParameters(...) reads, matched back to route-recognizer path parameters. */
export class RouteContextParameterReadProjectResult {
  constructor(
    readonly project: ProjectBootFrame,
    readonly reads: readonly RouteContextParameterReadModel[],
    readonly issues: readonly RouterIssueModel[],
  ) {}

  readRouteContextParameterReads(): readonly RouteContextParameterReadModel[] {
    return this.reads;
  }

  readIssues(): readonly RouterIssueModel[] {
    return this.issues;
  }
}

/** Materializes RouteContext.getRouteParameters(...) source reads without pretending to execute navigation. */
export class RouteContextParameterReadMaterializer {
  materializeAndEmit(
    store: KernelStore,
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
    resourceIndex: ResourceDefinitionIndex,
    routes: RouteConfigConvergenceProjectResult,
    recognizer: RouteRecognizerMaterializationProjectResult,
  ): RouteContextParameterReadProjectResult {
    const routesByComponentIdentity = routeParameterFactsByComponentIdentity(
      routes.readRouteConfigs(),
      recognizer.readConfigurableRoutes(),
    );
    const ownersByClass = routeParameterOwnersByClass(
      project,
      typeSystem,
      resourceIndex,
      routesByComponentIdentity,
    );
    const sites = readRouteContextParameterReadSites(project, typeSystem);
    const emissions = sites.map((site, index) => emitRouteContextParameterReadSite(
      store,
      project,
      site,
      site.enclosingClass == null ? [] : ownersByClass.get(site.enclosingClass) ?? [],
      index,
    ));
    const records = emissions.flatMap((emission) => emission.records);
    const reads = emissions.flatMap((emission) => emission.reads);
    const issues = emissions.flatMap((emission) => emission.issues);
    if (records.length > 0) {
      store.commit(new KernelStoreBatch(records, `router-route-context-parameter-reads:${project.projectKey}`));
      store.productDetails.addAll(
        RouterProductDetails.RouteContextParameterRead,
        reads,
      );
    }
    return new RouteContextParameterReadProjectResult(
      project,
      reads,
      issues,
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
        typeSystem,
        sourcePathByFileName,
      );
  });
}

function readSourceFileRouteContextParameterReadSites(
  context: TypeScriptSourceSiteContext,
  typeSystem: TypeSystemProject,
  sourcePathByFileName: ReadonlyMap<string, string>,
): readonly RouteContextParameterReadSite[] {
  const sites: RouteContextParameterReadSite[] = [];
  const visit = (
    node: ts.Node,
    enclosingClassName: string | null,
    enclosingClass: ts.ClassDeclaration | null,
    enclosingMemberName: string | null,
  ): void => {
    if (ts.isClassDeclaration(node) && node.name != null) {
      ts.forEachChild(node, (child) => visit(child, node.name!.text, node, null));
      return;
    }
    if (ts.isClassElement(node)) {
      const memberName = classElementRouteContextParameterMemberName(node, context.sourceFile);
      ts.forEachChild(node, (child) => visit(child, enclosingClassName, enclosingClass, memberName));
      return;
    }
    recordRouteContextParameterReadSite(
      sites,
      context,
      typeSystem,
      sourcePathByFileName,
      node,
      enclosingClassName,
      enclosingClass,
      enclosingMemberName,
    );
    ts.forEachChild(node, (child) => visit(child, enclosingClassName, enclosingClass, enclosingMemberName));
  };
  visit(context.sourceFile, null, null, null);
  return sites;
}

function routeParameterOwnersByClass(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
  resourceIndex: ResourceDefinitionIndex,
  factsByComponentIdentity: ReadonlyMap<IdentityHandle, ComponentRouteContextParameterFacts>,
): ReadonlyMap<ts.ClassDeclaration, readonly ComponentRouteContextParameterOwner[]> {
  const ownersByClass = new Map<ts.ClassDeclaration, ComponentRouteContextParameterOwner[]>();
  for (const source of project.sourceFiles) {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
    if (sourceFile == null) {
      continue;
    }
    const visit = (node: ts.Node): void => {
      if (ts.isClassDeclaration(node) && node.name != null) {
        const componentIdentityHandle = routeableComponentIdentityForClass(typeSystem, resourceIndex, node);
        const facts = componentIdentityHandle == null
          ? null
          : factsByComponentIdentity.get(componentIdentityHandle) ?? null;
        if (facts != null) {
          const prototypeChain = typeSystem.readClassPrototypeChain(node);
          for (let index = 0; index < prototypeChain.length; index += 1) {
            const ownerClass = prototypeChain[index]!;
            if (!ts.isClassDeclaration(ownerClass)) {
              continue;
            }
            const owners = ownersByClass.get(ownerClass) ?? [];
            if (!owners.some((owner) => owner.facts === facts)) {
              owners.push({
                ownershipKind: index === 0
                  ? RouteContextParameterReadOwnershipKind.Direct
                  : RouteContextParameterReadOwnershipKind.Inherited,
                facts,
              });
              ownersByClass.set(ownerClass, owners);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  for (const owners of ownersByClass.values()) {
    owners.sort((left, right) => componentRouteContextParameterOwnerKey(left)
      .localeCompare(componentRouteContextParameterOwnerKey(right)));
  }
  return ownersByClass;
}

function componentRouteContextParameterOwnerKey(
  owner: ComponentRouteContextParameterOwner,
): string {
  const component = owner.facts.component;
  return [
    component?.resolvedName ?? component?.localName ?? '',
    component?.resolvedIdentityHandle ?? component?.identityHandle ?? '',
  ].join(':');
}

function routeableComponentIdentityForClass(
  typeSystem: TypeSystemProject,
  resourceIndex: ResourceDefinitionIndex,
  declaration: ts.ClassDeclaration,
): IdentityHandle | null {
  const moduleKey = typeSystem.readModuleKeyForSourceFile(declaration.getSourceFile());
  const localName = declaration.name?.text ?? null;
  if (moduleKey == null || localName == null) {
    return null;
  }
  const definition = resourceIndex.lookupByModuleLocal(moduleKey, localName);
  return definition?.type === ResourceDefinitionKind.CustomElement
    ? definition.target.identityHandle
    : null;
}

function recordRouteContextParameterReadSite(
  sites: RouteContextParameterReadSite[],
  context: TypeScriptSourceSiteContext,
  typeSystem: TypeSystemProject,
  sourcePathByFileName: ReadonlyMap<string, string>,
  node: ts.Node,
  enclosingClassName: string | null,
  enclosingClass: ts.ClassDeclaration | null,
  enclosingMemberName: string | null,
): void {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(unwrapExpression(node.expression))) {
    return;
  }
  const access = unwrapExpression(node.expression) as ts.PropertyAccessExpression;
  if (
    access.name.text !== 'getRouteParameters'
    || !isAureliaRouteContextGetRouteParameters(typeSystem, access, sourcePathByFileName)
  ) {
    return;
  }
  const checker = typeSystem.checker;
  const declared = declaredRouteParameterKeys(typeSystem, node);
  sites.push({
    ...sourceSiteForNode(context, node, {
      sourceFile: context.sourceFile,
      call: node,
      enclosingClassName,
      enclosingClass,
      enclosingMemberName,
      declaredKeys: declared.keys,
      declaredOpenKeySpace: declared.openKeySpace,
      mergeStrategy: routeContextParameterMergeStrategy(node, context.sourceFile, typeSystem),
      includeQueryParams: routeContextParameterIncludeQueryParams(node, context.sourceFile, checker),
    }),
  });
}

function isAureliaRouteContextGetRouteParameters(
  typeSystem: TypeSystemProject,
  access: ts.PropertyAccessExpression,
  sourcePathByFileName: ReadonlyMap<string, string>,
): boolean {
  const checker = typeSystem.checker;
  const receiverType = typeSystem.readProgramTypeAtLocation(access.expression);
  const symbol = typeSystem.readProgramSymbolAtLocation(access.name)
    ?? (receiverType == null ? null : checkerPropertySymbol(checker, receiverType, 'getRouteParameters'))
    ?? null;
  return symbolMatchesFrameworkDeclarationSource(
    symbol,
    checker,
    sourcePathByFileName,
    ROUTE_CONTEXT_GET_ROUTE_PARAMETERS_DECLARATIONS,
  );
}

function declaredRouteParameterKeys(
  typeSystem: TypeSystemProject,
  call: ts.CallExpression,
): { readonly keys: readonly RouteContextParameterKey[]; readonly openKeySpace: boolean } {
  const typeNode = call.typeArguments?.[0] ?? null;
  if (typeNode == null) {
    return { keys: [], openKeySpace: true };
  }
  const checker = typeSystem.checker;
  const type = typeSystem.readProgramTypeFromTypeNode(typeNode);
  if (type == null) {
    return { keys: [], openKeySpace: true };
  }
  const keys = checker.getPropertiesOfType(type)
    .map((symbol) => {
      const valueType = checkerSymbolValueType(checker, symbol, typeNode);
      return {
        name: symbol.getName(),
        optional: (symbol.getFlags() & ts.SymbolFlags.Optional) !== 0,
        valueType: valueType == null ? 'unknown' : checker.typeToString(valueType),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
  return {
    keys,
    openKeySpace: checkerStringIndexValueType(checker, type) != null,
  };
}

function routeContextParameterMergeStrategy(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
  typeSystem: TypeSystemProject,
): RouteContextParameterMergeStrategy {
  const checker = typeSystem.checker;
  const optionStrategy = routeContextParameterStringOption(call, sourceFile, checker, 'mergeStrategy');
  if (isRouteContextParameterMergeStrategy(optionStrategy)) {
    return optionStrategy;
  }
  const typeStrategy = call.typeArguments?.[1] == null
    ? null
    : routeContextParameterStrategyFromTypeNode(typeSystem, call.typeArguments[1]!);
  if (isRouteContextParameterMergeStrategy(typeStrategy)) {
    return typeStrategy;
  }
  return optionStrategy == null && typeStrategy == null ? 'child-first' : 'unknown';
}

function routeContextParameterStrategyFromTypeNode(
  typeSystem: TypeSystemProject,
  typeNode: ts.TypeNode,
): string | null {
  if (ts.isLiteralTypeNode(typeNode) && ts.isStringLiteral(typeNode.literal)) {
    return typeNode.literal.text;
  }
  const type = typeSystem.readProgramTypeFromTypeNode(typeNode);
  if (type == null) {
    return null;
  }
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

function routeParameterFactsByComponentIdentity(
  routeConfigs: readonly RouteConfigModel[],
  configurableRoutes: readonly ConfigurableRouteModel[],
): ReadonlyMap<IdentityHandle, ComponentRouteContextParameterFacts> {
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

  const factsByComponentIdentity = new Map<IdentityHandle, ComponentRouteContextParameterFacts>();
  for (const routeConfig of routeConfigs) {
    const componentIdentityHandle = routeConfig.component?.resolvedIdentityHandle ?? null;
    if (componentIdentityHandle == null) {
      continue;
    }
    const existing = factsByComponentIdentity.get(componentIdentityHandle);
    const parameterNames = uniqueStrings([
      ...(existing?.routePathParameterNames ?? []),
      ...routePathParameterNames(configurableRoutesByRouteConfig.get(routeConfig.identityHandle) ?? []),
    ], 'sorted');
    factsByComponentIdentity.set(componentIdentityHandle, {
      component: existing?.component ?? routeConfig.component,
      routeConfigs: [...(existing?.routeConfigs ?? []), routeConfig],
      routePathParameterNames: parameterNames,
    });
  }
  return factsByComponentIdentity;
}

function routePathParameterNames(
  configurableRoutes: readonly ConfigurableRouteModel[],
): readonly string[] {
  return uniqueStrings(configurableRoutes.flatMap((route) => route.parameters.map((parameter) => parameter.name)), 'sorted');
}

function emitRouteContextParameterReadSite(
  store: KernelStore,
  project: ProjectBootFrame,
  site: RouteContextParameterReadSite,
  owners: readonly ComponentRouteContextParameterOwner[],
  index: number,
): RouteContextParameterReadSiteEmission {
  const siteLocal = sourceNodeOrdinalLocalKey({
    prefix: `router-route-context-parameter-read:${project.projectKey}:${localKeyPart(site.sourcePath)}`,
    sourceFile: site.sourceFile,
    node: site.call,
    index,
  });
  const source = sourceSpanAddressForSite(store, siteLocal, site);
  const readOwners: readonly (ComponentRouteContextParameterOwner | null)[] = owners.length === 0
    ? [null]
    : owners;
  const readEmissions = readOwners.map((owner, ownerIndex) => {
    const local = owners.length <= 1
      ? siteLocal
      : `${siteLocal}:owner:${ownerIndex}:${localKeyPart(owner == null ? 'unmatched' : componentRouteContextParameterOwnerKey(owner))}`;
    return emitRouteContextParameterRead(
      store,
      site,
      owner,
      owners.length,
      local,
      source,
    );
  });
  const issueEmission = sharedBaseRouteContextParameterReadIssue(
    store,
    site,
    owners,
    siteLocal,
    source,
  );
  return {
    records: [
      ...source.records,
      ...readEmissions.flatMap((emission) => emission.records),
      ...(issueEmission?.records ?? []),
    ],
    reads: readEmissions.map((emission) => emission.read),
    issues: issueEmission == null ? [] : [issueEmission.issue],
  };
}

function emitRouteContextParameterRead(
  store: KernelStore,
  site: RouteContextParameterReadSite,
  owner: ComponentRouteContextParameterOwner | null,
  knownOwnerCount: number,
  local: string,
  source: SourceSpanAddressPublication,
): { readonly records: readonly KernelStoreRecord[]; readonly read: RouteContextParameterReadModel } {
  const facts = owner?.facts;
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
  const read = new RouteContextParameterReadModel(
    store.handles.product(local),
    store.handles.identity(local),
    site.enclosingClassName,
    owner?.ownershipKind ?? RouteContextParameterReadOwnershipKind.Unmatched,
    knownOwnerCount,
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
    records: routeContextParameterReadRecords(store, local, read, facts, source),
    read,
  };
}

function sharedBaseRouteContextParameterReadIssue(
  store: KernelStore,
  site: RouteContextParameterReadSite,
  owners: readonly ComponentRouteContextParameterOwner[],
  siteLocal: string,
  source: SourceSpanAddressPublication,
): { readonly records: readonly KernelStoreRecord[]; readonly issue: RouterIssueModel } | null {
  if (
    owners.length < 2
    || !owners.some((owner) => owner.ownershipKind === RouteContextParameterReadOwnershipKind.Inherited)
  ) {
    return null;
  }
  const issueLocal = `${siteLocal}:shared-base-owner-issue`;
  const componentClassName = site.enclosingClassName ?? 'base class';
  const message = `RouteContext parameter read on '${componentClassName}' is shared by ${owners.length} routed components; declare the read on each concrete routed component or pass parameters into shared logic.`;
  const relatedInformation = owners.map((owner) => new RouterIssueRelatedInformation(
    owner.ownershipKind === RouteContextParameterReadOwnershipKind.Direct
      ? `Routed component '${componentRouteContextParameterOwnerName(owner)}' declares this RouteContext parameter read.`
      : `Routed component '${componentRouteContextParameterOwnerName(owner)}' inherits this RouteContext parameter read.`,
    owner.facts.component?.sourceAddressHandle
      ?? owner.facts.routeConfigs[0]?.sourceAddressHandle
      ?? null,
  ));
  const issue = new RouterIssueModel(
    store.handles.product(issueLocal),
    store.handles.identity(issueLocal),
    RouterIssuePhase.RouteContextParameterReadOwnership,
    RouterIssueKind.SharedBaseRouteContextParameterRead,
    message,
    'warning',
    null,
    null,
    null,
    'getRouteParameters',
    'one routed component owner',
    `${owners.length} routed component owners`,
    site.enclosingClassName,
    null,
    null,
    null,
    source.handle,
    relatedInformation,
  );
  return {
    issue,
    records: routerIssueProductRecords(store, {
      local: issueLocal,
      issue,
      ownerHandle: issue.identityHandle,
      sourceAddressHandle: source.handle,
      localName: site.enclosingClassName,
      evidenceSummary: message,
    }),
  };
}

function componentRouteContextParameterOwnerName(
  owner: ComponentRouteContextParameterOwner,
): string {
  return owner.facts.component?.resolvedName
    ?? owner.facts.component?.localName
    ?? 'routed component';
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
