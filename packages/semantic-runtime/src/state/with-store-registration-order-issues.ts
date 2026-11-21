import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import {
  readImportedExportName,
  readSourceImportBindings,
  type SourceImportBindings,
} from '../evaluation/import-bindings.js';
import {
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import type { AddressHandle } from '../kernel/handles.js';
import { issuePublicationWithRecords } from '../kernel/issue-publication.js';
import {
  KernelPublicationPlan,
  publishProductDetails,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import { sourceSpanAddressForSite } from '../kernel/source-address.js';
import {
  KernelStore,
  KernelStoreBatch,
} from '../kernel/store.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { StateRawErrorAuthority } from './framework-raw-error-authority.js';
import { StateProductDetails } from './product-details.js';
import {
  StateIssueKind,
  StateIssuePhase,
} from './state-issue.js';
import {
  StateIssuePublisher,
  type StateIssuePublication,
} from './state-issue-publication.js';
import { StateSourceIssueProjectResult } from './state-source-issues.js';

const STATE_CONFIGURATION_MODULES = new Set([
  'aurelia',
  '@aurelia/state',
]);

const STATE_CONFIGURATION_EXPORTS = new Set([
  'StateDefaultConfiguration',
]);

class WithStoreAfterRegistrationSite {
  constructor(
    readonly sourcePath: string,
    readonly sourceFileAddressHandle: AddressHandle,
    readonly start: number,
    readonly end: number,
    readonly configurationLocalName: string,
  ) {}
}

/** Materializes `StateDefaultConfiguration.withStore(...)` calls that occur after the same config has registered. */
export class WithStoreAfterRegistrationIssueMaterializer {
  private readonly publisher: StateIssuePublisher;

  constructor(
    readonly store: KernelStore,
    readonly publication: KernelPublicationContext,
  ) {
    this.publisher = new StateIssuePublisher(store);
  }

  materializeAndEmit(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
    registrationCalls: ReadonlySet<ts.Node>,
  ): StateSourceIssueProjectResult {
    const publications = readWithStoreAfterRegistrationSites(project, typeSystem, registrationCalls)
      .map((site, index) => this.publicationForSite(project, site, index));
    const records = publications.flatMap((publication) => publication.records);
    this.publication.publish(new KernelPublicationPlan(
      new KernelStoreBatch(records, `with-store-after-registration-issues:${project.projectKey}`),
      publishProductDetails(
        StateProductDetails.Issue,
        publications.map((publication) => publication.issue),
      ),
    ));
    return new StateSourceIssueProjectResult(
      publications.map((publication) => publication.issue),
      records,
    );
  }

  private publicationForSite(
    project: ProjectBootFrame,
    site: WithStoreAfterRegistrationSite,
    index: number,
  ): StateIssuePublication {
    const local = withStoreAfterRegistrationIssueLocalKey(project, site, index);
    const source = sourceSpanAddressForSite(this.store, local, site);
    const publication = this.publisher.publish(
      project.projectKey,
      null,
      StateIssuePhase.StoreConfiguration,
      StateIssueKind.WithStoreAfterRegistration,
      `StateDefaultConfiguration "${site.configurationLocalName}" calls withStore(...) after it has already been registered.`,
      StateRawErrorAuthority.WithStoreAfterRegistration,
      source.handle,
      null,
    );
    return issuePublicationWithRecords(publication, source.records);
  }
}

function readWithStoreAfterRegistrationSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
  registrationCalls: ReadonlySet<ts.Node>,
): readonly WithStoreAfterRegistrationSite[] {
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readProgramSourceFileByProjectPath(source.path);
    return sourceFile == null
      ? []
      : readSourceFileWithStoreAfterRegistrationSites(source.path, source.addressHandle, sourceFile, typeSystem.checker, registrationCalls);
  });
}

function readSourceFileWithStoreAfterRegistrationSites(
  sourcePath: string,
  sourceFileAddressHandle: AddressHandle,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  registrationCalls: ReadonlySet<ts.Node>,
): readonly WithStoreAfterRegistrationSite[] {
  const bindings = readSourceImportBindings(
    sourceFile,
    STATE_CONFIGURATION_MODULES,
    STATE_CONFIGURATION_EXPORTS,
  );
  const stateConfigLocals = new Set<ts.Symbol>();
  const registeredIn = new Map<ts.Symbol, Set<ts.Node>>();
  const sites: WithStoreAfterRegistrationSite[] = [];

  const visit = (node: ts.Node): void => {
    // JavaScript evaluates the receiver and arguments before a registration takes effect.
    ts.forEachChild(node, visit);
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer != null) {
      if (isStateDefaultConfigurationBuilderExpression(node.initializer, bindings)) {
        const symbol = checker.getSymbolAtLocation(node.name);
        if (symbol != null) stateConfigLocals.add(symbol);
      }
    }

    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const callee = node.expression;
      const receiver = unwrapExpression(callee.expression);
      const target = ts.isIdentifier(receiver) ? checker.getSymbolAtLocation(receiver) : undefined;
      const scopes = target == null ? undefined : registeredIn.get(target);
      if (callee.name.text === 'withStore' && target != null && scopes != null && followsRegistration(node, scopes)) {
        sites.push(new WithStoreAfterRegistrationSite(
          sourcePath,
          sourceFileAddressHandle,
          node.getStart(sourceFile),
          node.end,
          target.name,
        ));
      }

      if (callee.name.text === 'register') {
        const scope = registrationExecutionScope(node);
        if (scope == null) return;
        const targets = registrationCalls.has(node)
          ? node.arguments.filter(ts.isIdentifier).map(argument => checker.getSymbolAtLocation(argument))
          : [target];
        for (const symbol of targets) {
          if (symbol == null || !stateConfigLocals.has(symbol)) continue;
          const scopes = registeredIn.get(symbol) ?? new Set<ts.Node>();
          scopes.add(scope);
          registeredIn.set(symbol, scopes);
        }
      }
    }
  };
  visit(sourceFile);
  return sites;
}

function isStateDefaultConfigurationBuilderExpression(
  expression: ts.Expression,
  bindings: SourceImportBindings,
): boolean {
  const current = unwrapExpression(expression);
  if (!ts.isCallExpression(current)) {
    return false;
  }
  const callee = unwrapExpression(current.expression);
  if (!ts.isPropertyAccessExpression(callee)) {
    return false;
  }
  if (callee.name.text === 'init') {
    return readImportedExportName(callee.expression, bindings, true) === 'StateDefaultConfiguration';
  }
  return callee.name.text === 'withStore'
    && isStateDefaultConfigurationBuilderExpression(callee.expression, bindings);
}

/** An unconditional call within this statement list establishes registration for subsequent statements. */
function registrationExecutionScope(call: ts.CallExpression): ts.Node | null {
  for (let node: ts.Node = call; node.parent != null; node = node.parent) {
    if (ts.isFunctionLike(node) || ts.isConditionalExpression(node) || ts.isBinaryExpression(node)) return null;
    if (ts.isStatement(node)) {
      return (ts.isExpressionStatement(node) || ts.isVariableStatement(node))
        && (ts.isBlock(node.parent) || ts.isSourceFile(node.parent)) ? node.parent : null;
    }
  }
  return null;
}

function followsRegistration(call: ts.CallExpression, scopes: ReadonlySet<ts.Node>): boolean {
  for (let node: ts.Node | undefined = call.parent; node != null; node = node.parent) {
    if (scopes.has(node)) return true;
    if (ts.isFunctionLike(node)) return false;
  }
  return false;
}

function withStoreAfterRegistrationIssueLocalKey(
  project: ProjectBootFrame,
  site: WithStoreAfterRegistrationSite,
  index: number,
): string {
  return [
    'with-store-after-registration-issue',
    localKeyPart(project.projectKey),
    localKeyPart(site.sourcePath),
    localKeyPart(site.configurationLocalName),
    site.start,
    site.end,
    index,
  ].join(':');
}
