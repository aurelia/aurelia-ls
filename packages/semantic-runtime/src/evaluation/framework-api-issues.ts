import ts from 'typescript';
import { isImportedValue } from './import-bindings.js';

import type { ProjectBootFrame } from '../boot/frames.js';
import {
  EvidenceRole,
} from '../kernel/evidence.js';
import type { AddressHandle } from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  KernelPublicationPlan,
  publishProductDetails,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import {
  KernelStoreBatch,
  type KernelStore,
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
import { checkerPropertySymbol } from '../type-system/checker-node-helpers.js';
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
    readonly publication: KernelPublicationContext,
  ) {
    this.issuePublisher = new EvaluationIssuePublisher(store);
  }

  materializeAndEmit(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
  ): FrameworkApiIssueProjectResult {
    const publications = project.sourceFiles.flatMap((source) => {
      const sourceFile = typeSystem.readProgramSourceFileByProjectPath(source.path);
      return sourceFile == null
        ? []
        : this.publicationsForSource(project, source.path, source.addressHandle, sourceFile, typeSystem);
    });
    const records = publications.flatMap((publication) => publication.records);
    this.publication.publish(new KernelPublicationPlan(
      new KernelStoreBatch(records, `framework-api-issues:${project.projectKey}`),
      publishProductDetails(
        EvaluationProductDetails.Issue,
        publications.map((publication) => publication.issue),
      ),
    ));
    return new FrameworkApiIssueProjectResult(publications.map((publication) => publication.issue), records);
  }

  private publicationsForSource(
    project: ProjectBootFrame,
    sourcePath: string,
    sourceFileAddressHandle: AddressHandle,
    sourceFile: ts.SourceFile,
    typeSystem: TypeSystemProject,
  ): readonly EvaluationIssuePublication[] {
    return readFrameworkApiIssueSites(sourceFile, typeSystem)
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
  typeSystem: TypeSystemProject,
): readonly FrameworkApiIssueSite[] {
  const sites: FrameworkApiIssueSite[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const site = frameworkApiIssueSiteForCall(typeSystem, node);
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
  typeSystem: TypeSystemProject,
  call: ts.CallExpression,
): FrameworkApiIssueSite | null {
  if (isImportedValue(call.expression, typeSystem.checker, KERNEL_API_MODULES, 'firstDefined')) {
    return firstDefinedIssueSite(call, typeSystem.checker);
  }
  return eventAggregatorIssueSiteForCall(typeSystem, call)
    ?? metadataDefineIssueSiteForCall(typeSystem.checker, call);
}

function firstDefinedIssueSite(
  call: ts.CallExpression,
  checker: ts.TypeChecker,
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
  const rejected = call.arguments.every((argument) => nullishExpressionKind(argument, checker) === 'undefined')
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
  typeSystem: TypeSystemProject,
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
  if (!isAureliaEventAggregatorMethod(typeSystem, expression.expression, methodName)) {
    return null;
  }
  const first = call.arguments[0] ?? null;
  if (first != null && ts.isSpreadElement(first)) return null;
  const actualValueKind = first == null
    ? EvaluationValueKind.Undefined
    : falsyExpressionValueKind(first, typeSystem.checker);
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
      first,
      actualValueKind,
    )
    : new FrameworkApiIssueSite(
      EvaluationIssuePhase.KernelApiCall,
      EvaluationIssueSubjectKind.EventAggregatorSubscribeCall,
      EvaluationIssueKind.EventAggregatorSubscribeInvalidEventName,
      EvaluationFrameworkErrorCode.EventAggregatorSubscribeInvalidEventName,
      null,
      call,
      first,
      actualValueKind,
    );
}

function metadataDefineIssueSiteForCall(
  checker: ts.TypeChecker,
  call: ts.CallExpression,
): FrameworkApiIssueSite | null {
  const callee = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== 'define') {
    return null;
  }
  if (!isImportedValue(callee.expression, checker, METADATA_API_MODULES, 'Metadata')) {
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

function isAureliaEventAggregatorMethod(
  typeSystem: TypeSystemProject,
  receiver: ts.Expression,
  methodName: string,
): boolean {
  const checker = typeSystem.checker;
  const type = typeSystem.readProgramTypeAtLocation(receiver);
  if (type == null) {
    return false;
  }
  const property = checkerPropertySymbol(checker, type, methodName);
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
  checker: ts.TypeChecker,
): EvaluationValueKind | null {
  const current = unwrapExpression(expression);
  const nullishKind = nullishExpressionKind(current, checker);
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
