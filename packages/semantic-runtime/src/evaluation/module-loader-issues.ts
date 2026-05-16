import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import {
  EvidenceRole,
} from '../kernel/evidence.js';
import { localKeyPart } from '../kernel/local-key.js';
import { sourceSpanAddressForSite } from '../kernel/source-address.js';
import {
  KernelStore,
  KernelStoreBatch,
} from '../kernel/store.js';
import {
  StaticEvaluationExpressionReader,
} from './expression-reader.js';
import {
  EvaluationIssueKind,
  EvaluationIssuePhase,
  EvaluationIssueSubjectKind,
} from './evaluation-issue.js';
import {
  EvaluationIssuePublication,
  EvaluationIssuePublisher,
} from './evaluation-issue-publication.js';
import {
  EvaluationIssueProjectResult,
} from './evaluation-source-issues.js';
import { EvaluationFrameworkErrorCode } from './framework-error-code.js';
import {
  ModuleLoader,
  ModuleLoaderInputPosition,
  ModuleLoaderTransformStatus,
} from './module-loader.js';
import type {
  EvaluatedProjectSource,
  StaticProjectEvaluationResult,
} from './project-evaluation.js';
import { EvaluationProductDetails } from './product-details.js';
import {
  unwrapExpression,
} from './ts-syntax.js';

const MODULE_LOADER_MODULES = new Set([
  'aurelia',
  '@aurelia/kernel',
]);

class ModuleLoaderImportedBindings {
  readonly aliasedResourcesRegistryIdentifiers = new Set<string>();
  readonly moduleLoaderInterfaceIdentifiers = new Set<string>();
  readonly moduleLoaderNamespaces = new Set<string>();
}

class ModuleLoaderIssueSite {
  constructor(
    readonly subjectKind: EvaluationIssueSubjectKind,
    readonly call: ts.CallExpression,
    readonly input: ts.Expression,
  ) {}
}

export class ModuleLoaderIssueProjectResult extends EvaluationIssueProjectResult {}

/** Materializes exact framework ModuleLoader diagnostics over statically evaluated source inputs. */
export class ModuleLoaderIssueMaterializer {
  private readonly moduleLoader = new ModuleLoader();
  private readonly issuePublisher: EvaluationIssuePublisher;

  constructor(
    readonly store: KernelStore,
  ) {
    this.issuePublisher = new EvaluationIssuePublisher(store);
  }

  materializeAndEmit(
    project: ProjectBootFrame,
    evaluation: StaticProjectEvaluationResult,
  ): ModuleLoaderIssueProjectResult {
    const publications = evaluation.readEvaluatedSources()
      .flatMap((source) => this.publicationsForSource(project, source));
    const records = publications.flatMap((publication) => publication.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, `module-loader-issues:${project.projectKey}`));
    }
    this.store.productDetails.addAll(
      EvaluationProductDetails.Issue,
      publications.map((publication) => publication.issue),
    );
    return new ModuleLoaderIssueProjectResult(publications.map((publication) => publication.issue), records);
  }

  private publicationsForSource(
    project: ProjectBootFrame,
    source: EvaluatedProjectSource,
  ): readonly EvaluationIssuePublication[] {
    const bindings = readModuleLoaderImportedBindings(source.sourceFile);
    const reader = new StaticEvaluationExpressionReader(
      source.evaluation.environment,
      source.moduleKey,
      source.evaluation.policy,
      source.evaluation.runtimeHost,
    );
    return readModuleLoaderIssueSites(source.sourceFile, bindings)
      .flatMap((site, index) => this.publicationForSite(project, source, reader, site, index));
  }

  private publicationForSite(
    project: ProjectBootFrame,
    source: EvaluatedProjectSource,
    reader: StaticEvaluationExpressionReader,
    site: ModuleLoaderIssueSite,
    index: number,
  ): readonly EvaluationIssuePublication[] {
    const read = reader.evaluateExpression(site.input);
    if (read.value == null) {
      return [];
    }
    const result = this.moduleLoader.load(read.value);
    if (result.status !== ModuleLoaderTransformStatus.InvalidInput || result.issue == null) {
      return [];
    }
    const local = moduleLoaderIssueLocalKey(project, source, site, index);
    const span = sourceSpanAddressForSite(this.store, local, {
      sourceFileAddressHandle: source.admission.addressHandle,
      start: site.input.getStart(source.sourceFile),
      end: site.input.end,
    });
    const message = moduleLoaderIssueMessage(site, result.issue.position, result.issue.value.kind);
    const publication = this.issuePublisher.publish({
      local,
      projectKey: project.projectKey,
      phase: EvaluationIssuePhase.ModuleLoaderTransform,
      issueKind: EvaluationIssueKind.InvalidModuleTransformInput,
      subjectKind: site.subjectKind,
      message,
      frameworkErrorCode: EvaluationFrameworkErrorCode.InvalidModuleTransformInput,
      frameworkRawErrorAuthority: null,
      actualValueKind: result.issue.value.kind,
      rejectedValueText: site.input.getText(source.sourceFile),
      sourceAddressHandle: span.handle,
      ownerHandle: source.admission.addressHandle,
      evidenceRoles: [EvidenceRole.TransformInput, EvidenceRole.Diagnostic],
    });
    return [
      new EvaluationIssuePublication(publication.issue, [...span.records, ...publication.records]),
    ];
  }
}

function readModuleLoaderIssueSites(
  sourceFile: ts.SourceFile,
  bindings: ModuleLoaderImportedBindings,
): readonly ModuleLoaderIssueSite[] {
  const sites: ModuleLoaderIssueSite[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const site = moduleLoaderIssueSiteForCall(node, bindings);
      if (site != null) {
        sites.push(site);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return sites;
}

function moduleLoaderIssueSiteForCall(
  call: ts.CallExpression,
  bindings: ModuleLoaderImportedBindings,
): ModuleLoaderIssueSite | null {
  if (isAliasedResourcesRegistryCall(call, bindings)) {
    const first = call.arguments[0] ?? null;
    return first == null || ts.isSpreadElement(first)
      ? null
      : new ModuleLoaderIssueSite(EvaluationIssueSubjectKind.AliasedResourcesRegistry, call, first);
  }

  if (isModuleLoaderLoadCall(call, bindings)) {
    const first = call.arguments[0] ?? null;
    return first == null || ts.isSpreadElement(first)
      ? null
      : new ModuleLoaderIssueSite(EvaluationIssueSubjectKind.ModuleLoaderLoadCall, call, first);
  }
  return null;
}

function readModuleLoaderImportedBindings(
  sourceFile: ts.SourceFile,
): ModuleLoaderImportedBindings {
  const bindings = new ModuleLoaderImportedBindings();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    if (!MODULE_LOADER_MODULES.has(statement.moduleSpecifier.text)) {
      continue;
    }
    const namedBindings = statement.importClause?.namedBindings;
    if (namedBindings == null) {
      continue;
    }
    if (ts.isNamespaceImport(namedBindings)) {
      bindings.moduleLoaderNamespaces.add(namedBindings.name.text);
      continue;
    }
    for (const element of namedBindings.elements) {
      const importedName = (element.propertyName ?? element.name).text;
      if (importedName === 'aliasedResourcesRegistry') {
        bindings.aliasedResourcesRegistryIdentifiers.add(element.name.text);
      }
      if (importedName === 'IModuleLoader') {
        bindings.moduleLoaderInterfaceIdentifiers.add(element.name.text);
      }
    }
  }
  return bindings;
}

function isAliasedResourcesRegistryCall(
  call: ts.CallExpression,
  bindings: ModuleLoaderImportedBindings,
): boolean {
  const callee = unwrapExpression(call.expression);
  if (ts.isIdentifier(callee)) {
    return bindings.aliasedResourcesRegistryIdentifiers.has(callee.text);
  }
  return ts.isPropertyAccessExpression(callee)
    && callee.name.text === 'aliasedResourcesRegistry'
    && ts.isIdentifier(unwrapExpression(callee.expression))
    && bindings.moduleLoaderNamespaces.has((unwrapExpression(callee.expression) as ts.Identifier).text);
}

function isModuleLoaderLoadCall(
  call: ts.CallExpression,
  bindings: ModuleLoaderImportedBindings,
): boolean {
  const callee = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== 'load') {
    return false;
  }
  const receiver = unwrapExpression(callee.expression);
  if (!ts.isCallExpression(receiver)) {
    return false;
  }
  const receiverCallee = unwrapExpression(receiver.expression);
  if (!ts.isPropertyAccessExpression(receiverCallee) || receiverCallee.name.text !== 'get') {
    return false;
  }
  const first = receiver.arguments[0] ?? null;
  return first != null
    && !ts.isSpreadElement(first)
    && isModuleLoaderInterfaceExpression(first, bindings);
}

function isModuleLoaderInterfaceExpression(
  expression: ts.Expression,
  bindings: ModuleLoaderImportedBindings,
): boolean {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return bindings.moduleLoaderInterfaceIdentifiers.has(current.text);
  }
  return ts.isPropertyAccessExpression(current)
    && current.name.text === 'IModuleLoader'
    && ts.isIdentifier(unwrapExpression(current.expression))
    && bindings.moduleLoaderNamespaces.has((unwrapExpression(current.expression) as ts.Identifier).text);
}

function moduleLoaderIssueLocalKey(
  project: ProjectBootFrame,
  source: EvaluatedProjectSource,
  site: ModuleLoaderIssueSite,
  index: number,
): string {
  return [
    'evaluation',
    'module-loader-issue',
    localKeyPart(project.projectKey),
    localKeyPart(source.moduleKey),
    localKeyPart(site.subjectKind),
    String(site.input.getStart(source.sourceFile)),
    String(index),
  ].join(':');
}

function moduleLoaderIssueMessage(
  site: ModuleLoaderIssueSite,
  position: ModuleLoaderInputPosition,
  actualKind: string,
): string {
  const subject = site.subjectKind === EvaluationIssueSubjectKind.AliasedResourcesRegistry
    ? 'aliasedResourcesRegistry(...)'
    : 'ModuleLoader.load(...)';
  return position === ModuleLoaderInputPosition.PromiseFulfillment
    ? `${subject} received a promise whose fulfillment is ${actualKind}; Aurelia ModuleLoader rejects nullish fulfilled modules.`
    : `${subject} received ${actualKind}; Aurelia ModuleLoader only accepts promises or non-null module-like objects.`;
}
