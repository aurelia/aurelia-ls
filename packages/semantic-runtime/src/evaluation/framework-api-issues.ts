import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import {
  EvidenceRole,
} from '../kernel/evidence.js';
import type { AddressHandle } from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  KernelStore,
  KernelStoreBatch,
} from '../kernel/store.js';
import {
  sourceSpanAddressForSite,
  type SourceSpanAddressPublication,
} from '../kernel/source-address.js';
import {
  nullishExpressionKind,
} from './nullish-expression.js';
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
import { EvaluationRawErrorAuthority } from './framework-raw-error-authority.js';
import { EvaluationProductDetails } from './product-details.js';
import {
  unwrapExpression,
} from './ts-syntax.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  EvaluationValueKind,
} from './values.js';

const KERNEL_API_MODULES = new Set([
  'aurelia',
  '@aurelia/kernel',
]);

const METADATA_API_MODULES = new Set([
  '@aurelia/metadata',
]);

class FrameworkApiImportedBindings {
  readonly firstDefinedIdentifiers = new Set<string>();
  readonly kernelNamespaces = new Set<string>();
  readonly metadataIdentifiers = new Set<string>();
  readonly metadataNamespaces = new Set<string>();
}

class FrameworkApiIssueSite {
  constructor(
    readonly phase: EvaluationIssuePhase,
    readonly subjectKind: EvaluationIssueSubjectKind,
    readonly issueKind: EvaluationIssueKind,
    readonly frameworkErrorCode: EvaluationFrameworkErrorCode | null,
    readonly frameworkRawErrorAuthority: EvaluationRawErrorAuthority | null,
    readonly call: ts.CallExpression,
    readonly rejectedExpression: ts.Expression | null,
    readonly actualValueKind: EvaluationValueKind | null,
  ) {}
}

export class FrameworkApiIssueProjectResult extends EvaluationIssueProjectResult {}

/** Materializes source-backed diagnostics for exact Aurelia framework utility/API calls. */
export class FrameworkApiIssueMaterializer {
  private readonly issuePublisher: EvaluationIssuePublisher;

  constructor(
    readonly store: KernelStore,
  ) {
    this.issuePublisher = new EvaluationIssuePublisher(store);
  }

  materializeAndEmit(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
  ): FrameworkApiIssueProjectResult {
    const publications = project.sourceFiles.flatMap((source) => {
      const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
      return sourceFile == null
        ? []
        : this.publicationsForSource(project, source.path, source.addressHandle, sourceFile, typeSystem.checker);
    });
    const records = publications.flatMap((publication) => publication.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, `framework-api-issues:${project.projectKey}`));
    }
    this.store.productDetails.addAll(EvaluationProductDetails.Issue, publications.map((publication) => publication.issue));
    return new FrameworkApiIssueProjectResult(publications.map((publication) => publication.issue), records);
  }

  private publicationsForSource(
    project: ProjectBootFrame,
    sourcePath: string,
    sourceFileAddressHandle: AddressHandle,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker,
  ): readonly EvaluationIssuePublication[] {
    const bindings = readFrameworkApiImportedBindings(sourceFile);
    return readFrameworkApiIssueSites(sourceFile, checker, bindings)
      .map((site, index) =>
        this.publicationForSite(project, sourcePath, sourceFileAddressHandle, sourceFile, site, index)
      );
  }

  private publicationForSite(
    project: ProjectBootFrame,
    sourcePath: string,
    sourceFileAddressHandle: AddressHandle,
    sourceFile: ts.SourceFile,
    site: FrameworkApiIssueSite,
    index: number,
  ): EvaluationIssuePublication {
    const sourceNode = site.rejectedExpression ?? site.call;
    const local = frameworkApiIssueLocalKey(project, sourcePath, site, index);
    const span = this.sourceAddress(local, sourceFileAddressHandle, sourceNode.getStart(sourceFile), sourceNode.end);
    const message = frameworkApiIssueMessage(site);
    const publication = this.issuePublisher.publish({
      local,
      projectKey: project.projectKey,
      phase: site.phase,
      issueKind: site.issueKind,
      subjectKind: site.subjectKind,
      message,
      frameworkErrorCode: site.frameworkErrorCode,
      frameworkRawErrorAuthority: site.frameworkRawErrorAuthority,
      actualValueKind: site.actualValueKind,
      rejectedValueText: site.rejectedExpression?.getText(sourceFile) ?? null,
      sourceAddressHandle: span.handle,
      ownerHandle: span.handle,
      evidenceRoles: [EvidenceRole.Usage, EvidenceRole.Diagnostic],
    });
    return new EvaluationIssuePublication(publication.issue, [...span.records, ...publication.records]);
  }

  private sourceAddress(
    local: string,
    sourceFileAddressHandle: AddressHandle,
    start: number,
    end: number,
  ): SourceSpanAddressPublication {
    return sourceSpanAddressForSite(this.store, local, {
      sourceFileAddressHandle,
      start,
      end,
    });
  }
}

function readFrameworkApiIssueSites(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  bindings: FrameworkApiImportedBindings,
): readonly FrameworkApiIssueSite[] {
  const sites: FrameworkApiIssueSite[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const site = frameworkApiIssueSiteForCall(checker, bindings, node);
      if (site != null) {
        sites.push(site);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return sites;
}

function frameworkApiIssueSiteForCall(
  checker: ts.TypeChecker,
  bindings: FrameworkApiImportedBindings,
  call: ts.CallExpression,
): FrameworkApiIssueSite | null {
  if (isFirstDefinedCall(call, bindings)) {
    return firstDefinedIssueSite(call);
  }
  return eventAggregatorIssueSiteForCall(checker, call)
    ?? metadataDefineIssueSiteForCall(bindings, call);
}

function firstDefinedIssueSite(
  call: ts.CallExpression,
): FrameworkApiIssueSite | null {
  if (call.arguments.some(ts.isSpreadElement)) {
    return null;
  }
  if (call.arguments.length === 0) {
    return new FrameworkApiIssueSite(
      EvaluationIssuePhase.KernelApiCall,
      EvaluationIssueSubjectKind.FirstDefinedCall,
      EvaluationIssueKind.FirstDefinedNoValue,
      EvaluationFrameworkErrorCode.FirstDefinedNoValue,
      null,
      call,
      null,
      null,
    );
  }
  const rejected = call.arguments.every((argument) => nullishExpressionKind(argument) === 'undefined')
    ? call.arguments[0] ?? null
    : null;
  return rejected == null
    ? null
    : new FrameworkApiIssueSite(
      EvaluationIssuePhase.KernelApiCall,
      EvaluationIssueSubjectKind.FirstDefinedCall,
      EvaluationIssueKind.FirstDefinedNoValue,
      EvaluationFrameworkErrorCode.FirstDefinedNoValue,
      null,
      call,
      rejected,
      EvaluationValueKind.Undefined,
    );
}

function eventAggregatorIssueSiteForCall(
  checker: ts.TypeChecker,
  call: ts.CallExpression,
): FrameworkApiIssueSite | null {
  const expression = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(expression)) {
    return null;
  }
  const methodName = expression.name.text;
  if (methodName !== 'publish' && methodName !== 'subscribe') {
    return null;
  }
  if (!isAureliaEventAggregatorMethod(checker, expression.expression, methodName)) {
    return null;
  }
  const first = call.arguments[0] ?? null;
  const actualValueKind = first == null || ts.isSpreadElement(first)
    ? EvaluationValueKind.Undefined
    : falsyExpressionValueKind(first);
  if (actualValueKind == null) {
    return null;
  }
  return methodName === 'publish'
    ? new FrameworkApiIssueSite(
      EvaluationIssuePhase.KernelApiCall,
      EvaluationIssueSubjectKind.EventAggregatorPublishCall,
      EvaluationIssueKind.EventAggregatorPublishInvalidEventName,
      EvaluationFrameworkErrorCode.EventAggregatorPublishInvalidEventName,
      null,
      call,
      first != null && !ts.isSpreadElement(first) ? first : null,
      actualValueKind,
    )
    : new FrameworkApiIssueSite(
      EvaluationIssuePhase.KernelApiCall,
      EvaluationIssueSubjectKind.EventAggregatorSubscribeCall,
      EvaluationIssueKind.EventAggregatorSubscribeInvalidEventName,
      EvaluationFrameworkErrorCode.EventAggregatorSubscribeInvalidEventName,
      null,
      call,
      first != null && !ts.isSpreadElement(first) ? first : null,
      actualValueKind,
    );
}

function metadataDefineIssueSiteForCall(
  bindings: FrameworkApiImportedBindings,
  call: ts.CallExpression,
): FrameworkApiIssueSite | null {
  const callee = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== 'define') {
    return null;
  }
  if (!isMetadataObjectExpression(callee.expression, bindings)) {
    return null;
  }
  if (!metadataDefineHasStaticallyEmptyKeys(call)) {
    return null;
  }
  return new FrameworkApiIssueSite(
    EvaluationIssuePhase.MetadataApiCall,
    EvaluationIssueSubjectKind.MetadataDefineCall,
    EvaluationIssueKind.MetadataDefineWithoutKey,
    null,
    EvaluationRawErrorAuthority.MetadataDefineWithoutKey,
    call,
    call,
    null,
  );
}

function metadataDefineHasStaticallyEmptyKeys(
  call: ts.CallExpression,
): boolean {
  if (call.arguments.length === 2) {
    return !call.arguments.some(ts.isSpreadElement);
  }
  const extraArguments = call.arguments.slice(2);
  const extra = extraArguments[0];
  if (extraArguments.length !== 1 || extra == null || !ts.isSpreadElement(extra)) {
    return false;
  }
  const spreadExpression = unwrapExpression(extra.expression);
  return ts.isArrayLiteralExpression(spreadExpression) && spreadExpression.elements.length === 0;
}

function isMetadataObjectExpression(
  expression: ts.Expression,
  bindings: FrameworkApiImportedBindings,
): boolean {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return bindings.metadataIdentifiers.has(current.text);
  }
  if (!ts.isPropertyAccessExpression(current) || current.name.text !== 'Metadata') {
    return false;
  }
  const receiver = unwrapExpression(current.expression);
  return ts.isIdentifier(receiver) && bindings.metadataNamespaces.has(receiver.text);
}

function isAureliaEventAggregatorMethod(
  checker: ts.TypeChecker,
  receiver: ts.Expression,
  methodName: string,
): boolean {
  const type = checker.getTypeAtLocation(receiver);
  const property = checker.getPropertyOfType(type, methodName);
  return (property?.declarations ?? []).some(isAureliaEventAggregatorMethodDeclaration);
}

function isAureliaEventAggregatorMethodDeclaration(
  declaration: ts.Declaration,
): boolean {
  const sourcePath = declaration.getSourceFile().fileName.replace(/\\/g, '/');
  return sourcePath.includes('/aurelia/packages/kernel/src/eventaggregator.ts')
    || sourcePath.includes('/aurelia/packages/kernel/dist/types/eventaggregator.d.ts')
    || sourcePath.includes('/@aurelia/kernel/')
    || sourcePath.includes('/@aurelia+kernel/');
}

function falsyExpressionValueKind(
  expression: ts.Expression,
): EvaluationValueKind | null {
  const current = unwrapExpression(expression);
  const nullishKind = nullishExpressionKind(current);
  if (nullishKind === 'undefined') {
    return EvaluationValueKind.Undefined;
  }
  if (nullishKind === 'null') {
    return EvaluationValueKind.Null;
  }
  if (current.kind === ts.SyntaxKind.FalseKeyword) {
    return EvaluationValueKind.Boolean;
  }
  if (ts.isStringLiteralLike(current) && current.text.length === 0) {
    return EvaluationValueKind.String;
  }
  if (ts.isNumericLiteral(current) && Number(current.text) === 0) {
    return EvaluationValueKind.Number;
  }
  if (ts.isBigIntLiteral(current) && current.text === '0n') {
    return EvaluationValueKind.BigInt;
  }
  return null;
}

function readFrameworkApiImportedBindings(
  sourceFile: ts.SourceFile,
): FrameworkApiImportedBindings {
  const bindings = new FrameworkApiImportedBindings();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteralLike(statement.moduleSpecifier)) {
      continue;
    }
    const moduleName = statement.moduleSpecifier.text;
    if (!KERNEL_API_MODULES.has(moduleName) && !METADATA_API_MODULES.has(moduleName)) {
      continue;
    }
    const namedBindings = statement.importClause?.namedBindings;
    if (namedBindings == null) {
      continue;
    }
    if (ts.isNamespaceImport(namedBindings)) {
      if (KERNEL_API_MODULES.has(moduleName)) {
        bindings.kernelNamespaces.add(namedBindings.name.text);
      } else {
        bindings.metadataNamespaces.add(namedBindings.name.text);
      }
      continue;
    }
    for (const element of namedBindings.elements) {
      const importedName = (element.propertyName ?? element.name).text;
      if (KERNEL_API_MODULES.has(moduleName) && importedName === 'firstDefined') {
        bindings.firstDefinedIdentifiers.add(element.name.text);
      }
      if (METADATA_API_MODULES.has(moduleName) && importedName === 'Metadata') {
        bindings.metadataIdentifiers.add(element.name.text);
      }
    }
  }
  return bindings;
}

function isFirstDefinedCall(
  call: ts.CallExpression,
  bindings: FrameworkApiImportedBindings,
): boolean {
  const callee = unwrapExpression(call.expression);
  if (ts.isIdentifier(callee)) {
    return bindings.firstDefinedIdentifiers.has(callee.text);
  }
  return ts.isPropertyAccessExpression(callee)
    && callee.name.text === 'firstDefined'
    && ts.isIdentifier(unwrapExpression(callee.expression))
    && bindings.kernelNamespaces.has((unwrapExpression(callee.expression) as ts.Identifier).text);
}

function frameworkApiIssueLocalKey(
  project: ProjectBootFrame,
  sourcePath: string,
  site: FrameworkApiIssueSite,
  index: number,
): string {
  return [
    'evaluation',
    'framework-api-issue',
    localKeyPart(project.projectKey),
    localKeyPart(sourcePath),
    localKeyPart(site.issueKind),
    site.call.getStart(),
    index,
  ].join(':');
}

function frameworkApiIssueMessage(
  site: FrameworkApiIssueSite,
): string {
  switch (site.issueKind) {
    case EvaluationIssueKind.EventAggregatorPublishInvalidEventName:
      return 'Aurelia EventAggregator.publish(...) rejects falsy channel names or event instances.';
    case EvaluationIssueKind.EventAggregatorSubscribeInvalidEventName:
      return 'Aurelia EventAggregator.subscribe(...) rejects falsy channel names or message types.';
    case EvaluationIssueKind.FirstDefinedNoValue:
      return 'Aurelia firstDefined(...) throws when no argument is defined.';
    case EvaluationIssueKind.InvalidModuleTransformInput:
      return 'Aurelia ModuleLoader received an invalid transform input.';
    case EvaluationIssueKind.MetadataDefineWithoutKey:
      return 'Aurelia Metadata.define(...) throws when no metadata key is provided.';
  }
}
