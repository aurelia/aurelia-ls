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
  ) {
    this.publisher = new StateIssuePublisher(store);
  }

  materializeAndEmit(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
  ): StateSourceIssueProjectResult {
    const publications = readWithStoreAfterRegistrationSites(project, typeSystem)
      .map((site, index) => this.publicationForSite(project, site, index));
    const records = publications.flatMap((publication) => publication.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, `with-store-after-registration-issues:${project.projectKey}`));
    }
    for (const publication of publications) {
      this.store.productDetails.add(StateProductDetails.Issue, publication.issue.productHandle, publication.issue);
    }
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
): readonly WithStoreAfterRegistrationSite[] {
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readSourceFileByPath(source.path);
    return sourceFile == null
      ? []
      : readSourceFileWithStoreAfterRegistrationSites(source.path, source.addressHandle, sourceFile);
  });
}

function readSourceFileWithStoreAfterRegistrationSites(
  sourcePath: string,
  sourceFileAddressHandle: AddressHandle,
  sourceFile: ts.SourceFile,
): readonly WithStoreAfterRegistrationSite[] {
  const bindings = readSourceImportBindings(
    sourceFile,
    STATE_CONFIGURATION_MODULES,
    STATE_CONFIGURATION_EXPORTS,
  );
  const stateConfigLocals = new Set<string>();
  const registeredLocals = new Set<string>();
  const sites: WithStoreAfterRegistrationSite[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer != null) {
      if (isStateDefaultConfigurationBuilderExpression(node.initializer, bindings)) {
        stateConfigLocals.add(node.name.text);
      }
    }

    if (ts.isCallExpression(node)) {
      const withStoreReceiver = stateConfigurationWithStoreReceiver(node);
      if (withStoreReceiver != null && registeredLocals.has(withStoreReceiver)) {
        sites.push(new WithStoreAfterRegistrationSite(
          sourcePath,
          sourceFileAddressHandle,
          node.getStart(sourceFile),
          node.end,
          withStoreReceiver,
        ));
      }

      for (const localName of registeredStateConfigurationLocals(node, stateConfigLocals)) {
        registeredLocals.add(localName);
      }
    }

    ts.forEachChild(node, visit);
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

function stateConfigurationWithStoreReceiver(call: ts.CallExpression): string | null {
  const callee = unwrapExpression(call.expression);
  return ts.isPropertyAccessExpression(callee)
    && callee.name.text === 'withStore'
    && ts.isIdentifier(unwrapExpression(callee.expression))
    ? (unwrapExpression(callee.expression) as ts.Identifier).text
    : null;
}

function registeredStateConfigurationLocals(
  call: ts.CallExpression,
  stateConfigLocals: ReadonlySet<string>,
): readonly string[] {
  const callee = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== 'register') {
    return [];
  }
  const receiver = unwrapExpression(callee.expression);
  if (ts.isIdentifier(receiver) && stateConfigLocals.has(receiver.text)) {
    return [receiver.text];
  }
  return call.arguments
    .filter(ts.isIdentifier)
    .map((argument) => argument.text)
    .filter((localName) => stateConfigLocals.has(localName));
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
