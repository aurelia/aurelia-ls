import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import {
  readImportedExportName,
  readSourceImportBindings,
} from '../evaluation/import-bindings.js';
import {
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import {
  KernelStore,
  KernelStoreBatch,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  sourceSpanAddressForSite,
  type SourceSpanAddressPublication,
} from '../kernel/source-address.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  DiContainerApiMethodKind,
  readDiContainerApiCallSites,
  type DiContainerApiCallSite,
} from './container-api-recognition.js';
import {
  DiIssueKind,
  type DiDependencyCycleStep,
  type DiIssue,
} from './di-issue.js';
import {
  DiIssuePublication,
  DiIssuePublisher,
  withDiIssueSourceAddressRecords,
} from './di-issue-publication.js';
import {
  readDiResolveCallSites,
  type DiResolveCallSite,
} from './resolve-call-recognition.js';
import { DiProductDetails } from './product-details.js';

const AURELIA_DI_MODULES = new Set([
  'aurelia',
  '@aurelia/kernel',
]);

const AURELIA_REGISTRATION_EXPORTS = new Set([
  'Registration',
]);

export class DiDependencyCycleIssueMaterialization {
  constructor(
    readonly issues: readonly DiIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Materializes exact singleton resolver re-entry diagnostics from a closed source-level DI activation graph. */
export class DiDependencyCycleIssueMaterializer {
  private readonly publisher: DiIssuePublisher;

  constructor(
    readonly store: KernelStore,
  ) {
    this.publisher = new DiIssuePublisher(store);
  }

  materialize(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
  ): DiDependencyCycleIssueMaterialization {
    const graph = readDependencyCycleGraph(project, typeSystem);
    const publications = readDiContainerApiCallSites(project, typeSystem)
      .flatMap((site, index) => this.publicationsForEntrySite(project, graph, site, index));

    const records = publications.flatMap((publication) => publication.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, 'di-dependency-cycle-issues'));
    }
    this.store.productDetails.addAll(DiProductDetails.Issue, publications.map((publication) => publication.issue));

    return new DiDependencyCycleIssueMaterialization(
      publications.map((publication) => publication.issue),
      records,
    );
  }

  private publicationsForEntrySite(
    project: ProjectBootFrame,
    graph: DependencyCycleGraph,
    site: DiContainerApiCallSite,
    index: number,
  ): readonly DiIssuePublication[] {
    if (site.methodKind !== DiContainerApiMethodKind.Get || site.keyName == null) {
      return [];
    }
    const cycle = graph.findCycle(site.keyName);
    if (cycle == null) {
      return [];
    }
    const local = dependencyCycleIssueLocalKey(project, site, index);
    const source = this.sourceAddress(local, site);
    const publication = this.publisher.publishCyclicDependency(
      local,
      site.keyExpressionText,
      site.keyName,
      cycle,
      source.handle,
    );
    return [withDiIssueSourceAddressRecords(publication, source.records)];
  }

  private sourceAddress(
    local: string,
    site: DiContainerApiCallSite,
  ): SourceSpanAddressPublication {
    return sourceSpanAddressForSite(this.store, local, site);
  }
}

class DependencyCycleGraph {
  constructor(
    private readonly classNames: ReadonlySet<string>,
    private readonly singletonProvidersByKey: ReadonlyMap<string, SingletonProvider>,
    private readonly activationDependenciesByClass: ReadonlyMap<string, readonly ActivationDependency[]>,
  ) {}

  findCycle(entryKeyName: string): readonly DiDependencyCycleStep[] | null {
    return this.findCycleFrom(entryKeyName, []);
  }

  private findCycleFrom(
    keyName: string,
    stack: readonly DependencyCycleFrame[],
  ): readonly DiDependencyCycleStep[] | null {
    const provider = this.providerForKey(keyName);
    if (provider == null) {
      return null;
    }
    const dependencies = this.activationDependenciesByClass.get(provider.implementationName) ?? [];
    for (const dependency of dependencies) {
      const dependencyProvider = this.providerForKey(dependency.dependencyKeyName);
      if (dependencyProvider == null) {
        continue;
      }
      const step = dependencyCycleStep(provider, dependency);
      const repeatedIndex = stack.findIndex((frame) => frame.keyName === dependencyProvider.keyName);
      if (repeatedIndex >= 0) {
        return [
          ...stack.slice(repeatedIndex).map((frame) => frame.step),
          step,
        ];
      }
      const cycle = this.findCycleFrom(dependencyProvider.keyName, [
        ...stack,
        {
          keyName: provider.keyName,
          step,
        },
      ]);
      if (cycle != null) {
        return cycle;
      }
    }
    return null;
  }

  private providerForKey(keyName: string): SingletonProvider | null {
    return this.singletonProvidersByKey.get(keyName)
      ?? (this.classNames.has(keyName)
        ? new SingletonProvider(keyName, keyName, null)
        : null);
  }
}

class SingletonProvider {
  constructor(
    readonly keyName: string,
    readonly implementationName: string,
    readonly sourcePath: string | null,
  ) {}
}

class ActivationDependency {
  constructor(
    readonly ownerClassName: string,
    readonly dependencyKeyName: string,
    readonly sourcePath: string | null,
  ) {}
}

interface DependencyCycleFrame {
  readonly keyName: string;
  readonly step: DiDependencyCycleStep;
}

function readDependencyCycleGraph(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): DependencyCycleGraph {
  const classNames = new Set<string>();
  const singletonProviders = new Map<string, SingletonProvider>();
  for (const source of project.sourceFiles) {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
    if (sourceFile == null) {
      continue;
    }
    readSourceFileCycleProviders(source.path, sourceFile, classNames, singletonProviders);
  }

  const activationDependencies = dependenciesByClass(
    readDiResolveCallSites(project, typeSystem),
  );
  return new DependencyCycleGraph(
    classNames,
    singletonProviders,
    activationDependencies,
  );
}

function readSourceFileCycleProviders(
  sourcePath: string,
  sourceFile: ts.SourceFile,
  classNames: Set<string>,
  singletonProviders: Map<string, SingletonProvider>,
): void {
  const registrationBindings = readSourceImportBindings(
    sourceFile,
    AURELIA_DI_MODULES,
    AURELIA_REGISTRATION_EXPORTS,
  );
  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) && node.name != null) {
      classNames.add(node.name.text);
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer != null) {
      const provider = createInterfaceSingletonProvider(sourcePath, node.name.text, node.initializer);
      if (provider != null) {
        singletonProviders.set(provider.keyName, provider);
      }
    }
    if (ts.isCallExpression(node)) {
      const provider = registrationSingletonProvider(sourcePath, node, registrationBindings);
      if (provider != null) {
        singletonProviders.set(provider.keyName, provider);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

function createInterfaceSingletonProvider(
  sourcePath: string,
  interfaceName: string,
  initializer: ts.Expression,
): SingletonProvider | null {
  const call = unwrapExpression(initializer);
  if (!ts.isCallExpression(call) || !isCreateInterfaceCall(call)) {
    return null;
  }
  const configure = createInterfaceConfigureCallback(call);
  if (configure == null) {
    return null;
  }
  const builderName = configure.parameters[0]?.name;
  if (builderName == null || !ts.isIdentifier(builderName)) {
    return null;
  }
  let implementationName: string | null = null;
  const visit = (node: ts.Node): void => {
    if (implementationName != null || !ts.isCallExpression(node)) {
      ts.forEachChild(node, visit);
      return;
    }
    const expression = unwrapExpression(node.expression);
    if (
      ts.isPropertyAccessExpression(expression)
      && expression.name.text === 'singleton'
      && ts.isIdentifier(unwrapExpression(expression.expression))
      && (unwrapExpression(expression.expression) as ts.Identifier).text === builderName.text
    ) {
      implementationName = keyNameForExpression(node.arguments[0] ?? null);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(configure.body);
  return implementationName == null
    ? null
    : new SingletonProvider(interfaceName, implementationName, sourcePath);
}

function createInterfaceConfigureCallback(
  call: ts.CallExpression,
): ts.ArrowFunction | ts.FunctionExpression | null {
  for (const argument of call.arguments) {
    const current = unwrapExpression(argument);
    if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
      return current;
    }
  }
  return null;
}

function isCreateInterfaceCall(
  call: ts.CallExpression,
): boolean {
  const expression = unwrapExpression(call.expression);
  return ts.isPropertyAccessExpression(expression)
    && expression.name.text === 'createInterface';
}

function registrationSingletonProvider(
  sourcePath: string,
  call: ts.CallExpression,
  registrationBindings: ReturnType<typeof readSourceImportBindings>,
): SingletonProvider | null {
  const expression = unwrapExpression(call.expression);
  if (
    !ts.isPropertyAccessExpression(expression)
    || expression.name.text !== 'singleton'
    || readImportedExportName(expression.expression, registrationBindings, new Set(['Registration'])) !== 'Registration'
  ) {
    return null;
  }
  const keyName = keyNameForExpression(call.arguments[0] ?? null);
  const implementationName = keyNameForExpression(call.arguments[1] ?? null);
  return keyName == null || implementationName == null
    ? null
    : new SingletonProvider(keyName, implementationName, sourcePath);
}

function dependenciesByClass(
  sites: readonly DiResolveCallSite[],
): ReadonlyMap<string, readonly ActivationDependency[]> {
  const result = new Map<string, ActivationDependency[]>();
  for (const site of sites) {
    if (
      site.executionContextKind !== 'class-instance-activation'
      || site.enclosingClassName == null
      || site.keyName == null
    ) {
      continue;
    }
    const dependency = new ActivationDependency(
      site.enclosingClassName,
      site.keyName,
      site.sourcePath,
    );
    const existing = result.get(site.enclosingClassName);
    if (existing == null) {
      result.set(site.enclosingClassName, [dependency]);
    } else {
      existing.push(dependency);
    }
  }
  return result;
}

function dependencyCycleStep(
  provider: SingletonProvider,
  dependency: ActivationDependency,
): DiDependencyCycleStep {
  return {
    keyName: provider.keyName,
    implementationName: provider.implementationName,
    dependencyKeyName: dependency.dependencyKeyName,
    sourcePath: dependency.sourcePath ?? provider.sourcePath,
  };
}

function keyNameForExpression(
  expression: ts.Expression | null,
): string | null {
  if (expression == null) {
    return null;
  }
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return current.text;
  }
  if (ts.isPropertyAccessExpression(current)) {
    return current.name.text;
  }
  return null;
}

function dependencyCycleIssueLocalKey(
  project: ProjectBootFrame,
  site: DiContainerApiCallSite,
  index: number,
): string {
  return [
    'di-dependency-cycle-issue',
    DiIssueKind.CyclicDependency,
    localKeyPart(project.projectKey),
    localKeyPart(site.sourcePath),
    site.start,
    site.end,
    index,
  ].join(':');
}
