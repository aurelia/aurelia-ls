import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import {
  readImportedExportName,
  readSourceImportBindings,
  type SourceImportBindings,
  typeNodeReferencesImportedExport,
} from '../evaluation/import-bindings.js';
import { isParameterProperty, unwrapExpression } from '../evaluation/ts-syntax.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { symbolForExpression } from '../type-system/checker-node-helpers.js';
import {
  sourcePathSpanLookupKey,
} from '../kernel/source-address.js';
import {
  DiContainerApiCallSite,
  DiContainerApiMethodKind,
  readDiContainerApiCallSites,
} from '../di/container-api-recognition.js';
import {
  DiResolveCallSite,
  readDiResolveCallSites,
} from '../di/resolve-call-recognition.js';
import {
  FrameworkServiceRootKind,
  type FrameworkServiceRoot,
} from './service-root.js';

const AURELIA_CONTAINER_MODULES = new Set([
  'aurelia',
  '@aurelia/kernel',
]);

const AURELIA_CONTAINER_EXPORTS = new Set([
  'IContainer',
  'DI',
  'createContainer',
]);

const CONTAINER_ROOT_TYPE_EXPORTS = new Set([
  'IContainer',
]);

/** Project-local framework service-root facts, built from DI scanners plus source identity evidence. */
export class AureliaSourceApiRootFacts {
  private readonly resolveCallSitesBySpan: ReadonlyMap<string, DiResolveCallSite>;
  private readonly containerApiCallSitesBySpan: ReadonlyMap<string, DiContainerApiCallSite>;
  private readonly containerRootSets: readonly SourceContainerRootSet[];
  private readonly containerRootSetsBySourcePath: ReadonlyMap<string, SourceContainerRootSet>;
  private readonly serviceRootProductFacts: readonly AureliaSourceApiRootProductFact[];
  private readonly serviceRootProductsBySpan: ReadonlyMap<string, readonly FrameworkServiceRoot[]>;
  private readonly serviceRootProductsBySymbol: ReadonlyMap<string, ReadonlyMap<ts.Symbol, readonly FrameworkServiceRoot[]>>;
  private readonly containerRootProductsBySpan: ReadonlyMap<string, readonly FrameworkServiceRoot[]>;
  private readonly containerRootProductsBySymbol: ReadonlyMap<string, ReadonlyMap<ts.Symbol, readonly FrameworkServiceRoot[]>>;
  private readonly appTaskCallbackRootsBySourcePath: ReadonlyMap<string, readonly AureliaSourceAppTaskCallbackRoot[]>;

  constructor(
    readonly resolveCallSites: readonly DiResolveCallSite[],
    readonly containerApiCallSites: readonly DiContainerApiCallSite[],
    private readonly checker: ts.TypeChecker,
    containerRootSets: readonly SourceContainerRootSet[] = [],
    appTaskCallbackRoots: readonly AureliaSourceAppTaskCallbackRoot[] = [],
    serviceRootProductFacts: readonly AureliaSourceApiRootProductFact[] = [],
  ) {
    this.resolveCallSitesBySpan = callSiteSpanIndex(resolveCallSites);
    this.containerApiCallSitesBySpan = callSiteSpanIndex(containerApiCallSites);
    this.containerRootSets = containerRootSets;
    this.containerRootSetsBySourcePath = new Map(containerRootSets.map((roots) => [roots.sourcePath, roots]));
    this.serviceRootProductFacts = serviceRootProductFacts;
    this.serviceRootProductsBySpan = groupRootProductsBySpan(serviceRootProductFacts, FrameworkServiceRootKind.Service);
    this.serviceRootProductsBySymbol = groupRootProductsBySymbol(serviceRootProductFacts, FrameworkServiceRootKind.Service);
    this.containerRootProductsBySpan = groupRootProductsBySpan(serviceRootProductFacts, FrameworkServiceRootKind.Container);
    this.containerRootProductsBySymbol = groupRootProductsBySymbol(serviceRootProductFacts, FrameworkServiceRootKind.Container);
    this.appTaskCallbackRoots = appTaskCallbackRoots;
    this.appTaskCallbackRootsBySourcePath = groupAppTaskCallbackRootsBySourcePath(appTaskCallbackRoots);
  }

  readonly appTaskCallbackRoots: readonly AureliaSourceAppTaskCallbackRoot[];

  static read(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
    options: AureliaSourceApiRootFactOptions = {},
  ): AureliaSourceApiRootFacts {
    const resolveCallSites = readDiResolveCallSites(project, typeSystem);
    const containerApiCallSites = readDiContainerApiCallSites(project, typeSystem);
    const appTaskCallbackRoots = options.appTaskCallbackRoots ?? [];
    return new AureliaSourceApiRootFacts(
      resolveCallSites,
      containerApiCallSites,
      typeSystem.checker,
      readSourceContainerRootSets(project, typeSystem, resolveCallSites, appTaskCallbackRoots),
      appTaskCallbackRoots,
    );
  }

  withFrameworkServiceRootProducts(
    serviceRootProductFacts: readonly AureliaSourceApiRootProductFact[],
  ): AureliaSourceApiRootFacts {
    return new AureliaSourceApiRootFacts(
      this.resolveCallSites,
      this.containerApiCallSites,
      this.checker,
      this.containerRootSets,
      this.appTaskCallbackRoots,
      serviceRootProductFacts,
    );
  }

  resolveCallSite(
    sourcePath: string,
    sourceFile: ts.SourceFile,
    call: ts.CallExpression,
  ): DiResolveCallSite | null {
    return this.resolveCallSitesBySpan.get(callSiteSpanKey(sourcePath, sourceFile, call)) ?? null;
  }

  containerApiCallSite(
    sourcePath: string,
    sourceFile: ts.SourceFile,
    call: ts.CallExpression,
  ): DiContainerApiCallSite | null {
    return this.containerApiCallSitesBySpan.get(callSiteSpanKey(sourcePath, sourceFile, call)) ?? null;
  }

  expressionCreatesAureliaContainerRoot(
    sourcePath: string,
    sourceFile: ts.SourceFile,
    expression: ts.Expression | null,
  ): boolean {
    return expressionCreatesAureliaContainerRoot(this, sourcePath, sourceFile, expression);
  }

  expressionIsAureliaContainerRoot(
    sourcePath: string,
    sourceFile: ts.SourceFile,
    expression: ts.Expression,
  ): boolean {
    const current = unwrapExpression(expression);
    if (ts.isCallExpression(current) && expressionCreatesAureliaContainerRoot(this, sourcePath, sourceFile, current)) {
      return true;
    }
    const roots = this.containerRootSetsBySourcePath.get(sourcePath) ?? null;
    if (roots == null) {
      return false;
    }
    if (ts.isIdentifier(current)) {
      const symbol = symbolForExpression(this.checker, current);
      return (symbol != null && roots.localSymbols.has(symbol))
        || roots.callbackParameters.some((parameter) =>
          symbol != null
          && parameter.symbol === symbol
          && expression.getStart(sourceFile) >= parameter.callbackStart
          && expression.end <= parameter.callbackEnd
        );
    }
    if (!ts.isPropertyAccessExpression(current) || current.expression.kind !== ts.SyntaxKind.ThisKeyword) {
      return false;
    }
    const symbol = symbolForExpression(this.checker, current.name);
    return symbol != null && roots.instanceMemberSymbols.has(symbol);
  }

  containerRootIdentityForExpression(
    sourcePath: string,
    sourceFile: ts.SourceFile,
    expression: ts.Expression,
  ): FrameworkServiceRoot | null {
    return this.frameworkRootProductForExpression(
      sourcePath,
      sourceFile,
      expression,
      FrameworkServiceRootKind.Container,
    );
  }

  serviceRootIdentityForExpression(
    sourcePath: string,
    sourceFile: ts.SourceFile,
    expression: ts.Expression,
    serviceExports: ReadonlySet<string>,
  ): FrameworkServiceRoot | null {
    return this.frameworkRootProductForExpression(
      sourcePath,
      sourceFile,
      expression,
      FrameworkServiceRootKind.Service,
      serviceExports,
    );
  }

  expressionIsAppTaskDeclaredServiceRoot(
    sourcePath: string,
    sourceFile: ts.SourceFile,
    expression: ts.Expression,
    serviceBindings: SourceImportBindings,
    serviceExports: ReadonlySet<string>,
  ): boolean {
    const current = unwrapExpression(expression);
    if (!ts.isIdentifier(current)) {
      return false;
    }
    const symbol = symbolForExpression(this.checker, current);
    return symbol != null && this.symbolIsAppTaskDeclaredServiceRoot(
      sourcePath,
      sourceFile,
      symbol,
      current.getStart(sourceFile),
      current.end,
      serviceBindings,
      serviceExports,
    );
  }

  parameterIsAppTaskDeclaredServiceRoot(
    sourcePath: string,
    sourceFile: ts.SourceFile,
    name: ts.Identifier,
    serviceBindings: SourceImportBindings,
    serviceExports: ReadonlySet<string>,
  ): boolean {
    const symbol = symbolForExpression(this.checker, name);
    return symbol != null && this.symbolIsAppTaskDeclaredServiceRoot(
      sourcePath,
      sourceFile,
      symbol,
      name.getStart(sourceFile),
      name.end,
      serviceBindings,
      serviceExports,
    );
  }

  private symbolIsAppTaskDeclaredServiceRoot(
    sourcePath: string,
    sourceFile: ts.SourceFile,
    symbol: ts.Symbol,
    start: number,
    end: number,
    serviceBindings: SourceImportBindings,
    serviceExports: ReadonlySet<string>,
  ): boolean {
    const callbackRoots = this.appTaskCallbackRootsBySourcePath.get(sourcePath) ?? [];
    return callbackRoots.some((root) =>
      root.symbol === symbol
      && start >= root.callbackStart
      && end <= root.callbackEnd
      && readImportedExportName(unwrapExpression(root.keyExpression), serviceBindings, serviceExports) != null
    );
  }

  private frameworkRootProductForExpression(
    sourcePath: string,
    sourceFile: ts.SourceFile,
    expression: ts.Expression,
    rootKind: FrameworkServiceRootKind,
    serviceExports?: ReadonlySet<string>,
  ): FrameworkServiceRoot | null {
    const current = unwrapExpression(expression);
    const productsBySpan = rootKind === FrameworkServiceRootKind.Container
      ? this.containerRootProductsBySpan
      : this.serviceRootProductsBySpan;
    const productsBySymbol = rootKind === FrameworkServiceRootKind.Container
      ? this.containerRootProductsBySymbol
      : this.serviceRootProductsBySymbol;
    if (ts.isCallExpression(current) || ts.isNewExpression(current)) {
      return firstMatchingRootProduct(
        productsBySpan.get(sourcePathSpanLookupKey({
          sourcePath,
          start: current.getStart(sourceFile),
          end: current.end,
        })) ?? [],
        serviceExports,
      );
    }
    if (ts.isIdentifier(current)) {
      const symbol = symbolForExpression(this.checker, current);
      return symbol == null
        ? null
        : firstMatchingRootProduct(
          productsBySymbol.get(sourcePath)?.get(symbol) ?? [],
          serviceExports,
        );
    }
    if (
      ts.isPropertyAccessExpression(current)
      && current.expression.kind === ts.SyntaxKind.ThisKeyword
    ) {
      const symbol = symbolForExpression(this.checker, current.name);
      return symbol == null
        ? null
        : firstMatchingRootProduct(
          productsBySymbol.get(sourcePath)?.get(symbol) ?? [],
          serviceExports,
        );
    }
    return null;
  }
}

export function expressionCreatesFrameworkServiceRoot(
  facts: AureliaSourceApiRootFacts,
  sourcePath: string,
  sourceFile: ts.SourceFile,
  expression: ts.Expression | null,
  serviceBindings: SourceImportBindings,
  serviceExports: ReadonlySet<string>,
): boolean {
  if (expression == null) {
    return false;
  }
  const current = unwrapExpression(expression);
  if (!ts.isCallExpression(current)) {
    return false;
  }
  if (callIsAureliaResolveServiceRoot(facts, sourcePath, sourceFile, current, serviceBindings, serviceExports)) {
    return true;
  }
  return callIsAureliaContainerGetServiceRoot(facts, sourcePath, sourceFile, current, serviceBindings, serviceExports);
}

export function callIsAureliaResolveServiceRoot(
  facts: AureliaSourceApiRootFacts,
  sourcePath: string,
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
  serviceBindings: SourceImportBindings,
  serviceExports: ReadonlySet<string>,
): boolean {
  if (!callIsProvidedByAureliaResolveActivation(facts, sourcePath, sourceFile, call)) {
    return false;
  }
  const first = call.arguments[0] ?? null;
  return first != null
    && !ts.isSpreadElement(first)
    && readImportedExportName(unwrapExpression(first), serviceBindings, serviceExports) != null;
}

export function callIsProvidedByAureliaResolveActivation(
  facts: AureliaSourceApiRootFacts,
  sourcePath: string,
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
): boolean {
  const site = facts.resolveCallSite(sourcePath, sourceFile, call);
  return site != null
    && site.argumentCount === 1
    && site.activeContainerExpectation === 'provided-by-container-activation';
}

export function callIsAureliaContainerGetServiceRoot(
  facts: AureliaSourceApiRootFacts,
  sourcePath: string,
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
  serviceBindings: SourceImportBindings,
  serviceExports: ReadonlySet<string>,
): boolean {
  const site = facts.containerApiCallSite(sourcePath, sourceFile, call);
  if (
    site?.methodKind !== DiContainerApiMethodKind.Get
    && !callIsAureliaContainerRootMethodCall(facts, sourcePath, sourceFile, call, DiContainerApiMethodKind.Get)
  ) {
    return false;
  }
  const first = call.arguments[0] ?? null;
  return first != null
    && !ts.isSpreadElement(first)
    && readImportedExportName(unwrapExpression(first), serviceBindings, serviceExports) != null;
}

export function callIsAureliaContainerGetCall(
  facts: AureliaSourceApiRootFacts,
  sourcePath: string,
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
): boolean {
  return facts.containerApiCallSite(sourcePath, sourceFile, call)?.methodKind === DiContainerApiMethodKind.Get
    || callIsAureliaContainerRootMethodCall(facts, sourcePath, sourceFile, call, DiContainerApiMethodKind.Get);
}

export function readAureliaContainerSourceImportBindings(
  sourceFile: ts.SourceFile,
): SourceImportBindings {
  return readSourceImportBindings(sourceFile, AURELIA_CONTAINER_MODULES, AURELIA_CONTAINER_EXPORTS);
}

export function expressionReferencesAureliaContainerRootType(
  expression: ts.Expression,
  bindings: SourceImportBindings,
): boolean {
  return readImportedExportName(unwrapExpression(expression), bindings, CONTAINER_ROOT_TYPE_EXPORTS) === 'IContainer';
}

interface SourceContainerRootSet {
  readonly sourcePath: string;
  readonly localSymbols: ReadonlySet<ts.Symbol>;
  readonly instanceMemberSymbols: ReadonlySet<ts.Symbol>;
  readonly callbackParameters: readonly AureliaSourceAppTaskCallbackRoot[];
}

interface MutableSourceContainerRootSet {
  readonly sourcePath: string;
  readonly localSymbols: Set<ts.Symbol>;
  readonly instanceMemberSymbols: Set<ts.Symbol>;
  readonly callbackParameters: AureliaSourceAppTaskCallbackRoot[];
}

export interface AureliaSourceApiRootFactOptions {
  readonly appTaskCallbackRoots?: readonly AureliaSourceAppTaskCallbackRoot[];
}

export interface AureliaSourceAppTaskCallbackRoot {
  readonly sourcePath: string;
  readonly keyExpression: ts.Expression;
  readonly symbol: ts.Symbol;
  readonly parameterStart: number;
  readonly parameterEnd: number;
  readonly callbackStart: number;
  readonly callbackEnd: number;
}

export interface AureliaSourceApiRootProductFact {
  readonly root: FrameworkServiceRoot;
  readonly symbol: ts.Symbol | null;
}

function readSourceContainerRootSets(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
  resolveCallSites: readonly DiResolveCallSite[],
  appTaskCallbackRoots: readonly AureliaSourceAppTaskCallbackRoot[],
): readonly SourceContainerRootSet[] {
  const resolveCallSitesBySpan = callSiteSpanIndex(resolveCallSites);
  const callbackRootsBySourcePath = groupAppTaskCallbackRootsBySourcePath(appTaskCallbackRoots);
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
    if (sourceFile == null) {
      return [];
    }
    return [
      readSourceContainerRootSet(
        source.path,
        sourceFile,
        typeSystem,
        resolveCallSitesBySpan,
        callbackRootsBySourcePath.get(source.path) ?? [],
      ),
    ];
  });
}

function readSourceContainerRootSet(
  sourcePath: string,
  sourceFile: ts.SourceFile,
  typeSystem: TypeSystemProject,
  resolveCallSitesBySpan: ReadonlyMap<string, DiResolveCallSite>,
  callbackRoots: readonly AureliaSourceAppTaskCallbackRoot[],
): SourceContainerRootSet {
  const roots: MutableSourceContainerRootSet = {
    sourcePath,
    localSymbols: new Set(),
    instanceMemberSymbols: new Set(),
    callbackParameters: [],
  };
  const bindings = readAureliaContainerSourceImportBindings(sourceFile);
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      if (nodeDeclaresContainerRoot(sourcePath, sourceFile, node, bindings, resolveCallSitesBySpan)) {
        addLocalContainerRoot(roots, typeSystem, node.name);
      }
    } else if (ts.isPropertyDeclaration(node)) {
      if (nodeDeclaresContainerRoot(sourcePath, sourceFile, node, bindings, resolveCallSitesBySpan)) {
        addInstanceContainerRoot(roots, typeSystem, node.name);
      }
    } else if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
      if (nodeDeclaresContainerRoot(sourcePath, sourceFile, node, bindings, resolveCallSitesBySpan)) {
        addLocalContainerRoot(roots, typeSystem, node.name);
        if (isParameterProperty(node)) {
          addInstanceContainerRoot(roots, typeSystem, node.name);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  roots.callbackParameters.push(...callbackRoots.filter((root) =>
    expressionReferencesAureliaContainerRootType(root.keyExpression, bindings)
  ));
  return roots;
}

function nodeDeclaresContainerRoot(
  sourcePath: string,
  sourceFile: ts.SourceFile,
  node: { readonly type?: ts.TypeNode; readonly initializer?: ts.Expression },
  bindings: SourceImportBindings,
  resolveCallSitesBySpan: ReadonlyMap<string, DiResolveCallSite>,
): boolean {
  return typeNodeReferencesImportedExport(node.type ?? null, bindings, CONTAINER_ROOT_TYPE_EXPORTS)
    || expressionCreatesAureliaContainerRootFromRead(sourcePath, sourceFile, node.initializer ?? null, bindings, resolveCallSitesBySpan);
}

function addLocalContainerRoot(
  roots: MutableSourceContainerRootSet,
  typeSystem: TypeSystemProject,
  name: ts.Identifier,
): void {
  const symbol = sourceRootSymbolForName(typeSystem, name);
  if (symbol != null) {
    roots.localSymbols.add(symbol);
  }
}

function addInstanceContainerRoot(
  roots: MutableSourceContainerRootSet,
  typeSystem: TypeSystemProject,
  name: ts.PropertyName,
): void {
  if (!ts.isIdentifier(name) && !ts.isStringLiteralLike(name) && !ts.isNumericLiteral(name)) {
    return;
  }
  const symbol = sourceRootSymbolForName(typeSystem, name);
  if (symbol != null) {
    roots.instanceMemberSymbols.add(symbol);
  }
}

/** Read a checker symbol for a source-root declaration/name site after remapping into the Program source epoch. */
export function sourceRootSymbolForName(
  typeSystem: TypeSystemProject,
  name: ts.Identifier | ts.StringLiteralLike | ts.NumericLiteral,
): ts.Symbol | null {
  const programName = typeSystem.readProgramNode(name) ?? name;
  return symbolForExpression(typeSystem.checker, programName);
}

/** Read a checker symbol for a class/property root name when the syntax can participate in ordinary property access. */
export function sourceRootSymbolForPropertyName(
  typeSystem: TypeSystemProject,
  name: ts.PropertyName,
): ts.Symbol | null {
  if (!ts.isIdentifier(name) && !ts.isStringLiteralLike(name) && !ts.isNumericLiteral(name)) {
    return null;
  }
  return sourceRootSymbolForName(typeSystem, name);
}

/** Read a checker symbol for a property-access member name, excluding private identifiers from public root matching. */
export function sourceRootSymbolForMemberName(
  typeSystem: TypeSystemProject,
  name: ts.MemberName,
): ts.Symbol | null {
  return ts.isIdentifier(name) ? sourceRootSymbolForName(typeSystem, name) : null;
}

function groupAppTaskCallbackRootsBySourcePath(
  roots: readonly AureliaSourceAppTaskCallbackRoot[],
): ReadonlyMap<string, readonly AureliaSourceAppTaskCallbackRoot[]> {
  const result = new Map<string, AureliaSourceAppTaskCallbackRoot[]>();
  for (const root of roots) {
    const existing = result.get(root.sourcePath);
    if (existing == null) {
      result.set(root.sourcePath, [root]);
    } else {
      existing.push(root);
    }
  }
  return result;
}

function groupRootProductsBySpan(
  facts: readonly AureliaSourceApiRootProductFact[],
  rootKind: FrameworkServiceRootKind,
): ReadonlyMap<string, readonly FrameworkServiceRoot[]> {
  const result = new Map<string, FrameworkServiceRoot[]>();
  for (const fact of facts) {
    if (fact.root.rootKind !== rootKind) {
      continue;
    }
    addRootProductBySpan(result, fact.root, fact.root.start, fact.root.end);
    addRootProductBySpan(result, fact.root, fact.root.evidenceStart, fact.root.evidenceEnd);
  }
  return result;
}

function addRootProductBySpan(
  result: Map<string, FrameworkServiceRoot[]>,
  root: FrameworkServiceRoot,
  start: number,
  end: number,
): void {
  const key = sourcePathSpanLookupKey({
    sourcePath: root.sourcePath,
    start,
    end,
  });
  const existing = result.get(key);
  if (existing == null) {
    result.set(key, [root]);
  } else if (!existing.some((candidate) => candidate.productHandle === root.productHandle)) {
    existing.push(root);
  }
}

function groupRootProductsBySymbol(
  facts: readonly AureliaSourceApiRootProductFact[],
  rootKind: FrameworkServiceRootKind,
): ReadonlyMap<string, ReadonlyMap<ts.Symbol, readonly FrameworkServiceRoot[]>> {
  const mutable = new Map<string, Map<ts.Symbol, FrameworkServiceRoot[]>>();
  for (const fact of facts) {
    if (fact.symbol == null || fact.root.rootKind !== rootKind) {
      continue;
    }
    let sourceRoots = mutable.get(fact.root.sourcePath);
    if (sourceRoots == null) {
      sourceRoots = new Map();
      mutable.set(fact.root.sourcePath, sourceRoots);
    }
    const existing = sourceRoots.get(fact.symbol);
    if (existing == null) {
      sourceRoots.set(fact.symbol, [fact.root]);
    } else if (!existing.some((root) => root.productHandle === fact.root.productHandle)) {
      existing.push(fact.root);
    }
  }
  return new Map([...mutable.entries()]);
}

function firstMatchingRootProduct(
  roots: readonly FrameworkServiceRoot[],
  serviceExports: ReadonlySet<string> | undefined,
): FrameworkServiceRoot | null {
  return roots.find((root) => serviceExports == null || serviceExports.has(root.serviceKeyName)) ?? null;
}

function expressionCreatesAureliaContainerRoot(
  facts: AureliaSourceApiRootFacts,
  sourcePath: string,
  sourceFile: ts.SourceFile,
  expression: ts.Expression | null,
): boolean {
  if (expression == null) {
    return false;
  }
  const current = unwrapExpression(expression);
  if (!ts.isCallExpression(current)) {
    return false;
  }
  const bindings = readAureliaContainerSourceImportBindings(sourceFile);
  if (callCreatesAureliaContainer(current, bindings)) {
    return true;
  }
  const site = facts.resolveCallSite(sourcePath, sourceFile, current);
  if (
    site == null
    || site.argumentCount !== 1
    || site.activeContainerExpectation !== 'provided-by-container-activation'
  ) {
    return false;
  }
  const first = current.arguments[0] ?? null;
  return first != null
    && !ts.isSpreadElement(first)
    && expressionReferencesAureliaContainerRootType(first, bindings);
}

function expressionCreatesAureliaContainerRootFromRead(
  sourcePath: string,
  sourceFile: ts.SourceFile,
  expression: ts.Expression | null,
  bindings: SourceImportBindings,
  resolveCallSitesBySpan: ReadonlyMap<string, DiResolveCallSite>,
): boolean {
  if (expression == null) {
    return false;
  }
  const current = unwrapExpression(expression);
  if (!ts.isCallExpression(current)) {
    return false;
  }
  if (callCreatesAureliaContainer(current, bindings)) {
    return true;
  }
  const site = resolveCallSitesBySpan.get(callSiteSpanKey(sourcePath, sourceFile, current)) ?? null;
  if (
    site == null
    || site.argumentCount !== 1
    || site.activeContainerExpectation !== 'provided-by-container-activation'
  ) {
    return false;
  }
  const first = current.arguments[0] ?? null;
  return first != null
    && !ts.isSpreadElement(first)
    && expressionReferencesAureliaContainerRootType(first, bindings);
}

export function callCreatesAureliaContainer(
  call: ts.CallExpression,
  bindings: SourceImportBindings,
): boolean {
  const expression = unwrapExpression(call.expression);
  if (readImportedExportName(expression, bindings, new Set(['createContainer'])) === 'createContainer') {
    return true;
  }
  if (!ts.isPropertyAccessExpression(expression) || expression.name.text !== 'createContainer') {
    return false;
  }
  return readImportedExportName(expression.expression, bindings, new Set(['DI'])) === 'DI';
}

function callIsAureliaContainerRootMethodCall(
  facts: AureliaSourceApiRootFacts,
  sourcePath: string,
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
  methodKind: DiContainerApiMethodKind,
): boolean {
  const expression = unwrapExpression(call.expression);
  return ts.isPropertyAccessExpression(expression)
    && expression.name.text === methodKind
    && facts.expressionIsAureliaContainerRoot(sourcePath, sourceFile, expression.expression);
}


function callSiteSpanIndex<TSite extends { readonly sourcePath: string; readonly start: number; readonly end: number }>(
  sites: readonly TSite[],
): ReadonlyMap<string, TSite> {
  return new Map(sites.map((site) => [sourcePathSpanLookupKey(site), site]));
}

function callSiteSpanKey(
  sourcePath: string,
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
): string {
  return sourcePathSpanLookupKey({
    sourcePath,
    start: call.getStart(sourceFile),
    end: call.end,
  });
}
