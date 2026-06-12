import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import { SourceSpanRole } from '../kernel/address.js';
import type { AddressHandle } from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  sourceFileAddressForAddress,
  sourceSpanAddressForAddress,
} from '../kernel/source-address.js';
import {
  KernelStore,
  KernelStoreBatch,
  type KernelStoreRecord,
} from '../kernel/store.js';
import type { TemplateCompilationProjectEmission } from '../template/template-compilation-project-pass.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { sourceSpanForCheckerNode } from '../type-system/declaration-source.js';
import { CheckerTypeMemberKind } from '../type-system/type-shape.js';
import {
  RuntimeBindingObservedDependency,
  RuntimeObservedDependencyKind,
} from './runtime-binding-observation.js';
import { readTrackableMethodDependency } from './trackable-method-dependency-recognition.js';
import {
  ObservationIssueKind,
  ObservationIssuePhase,
} from './observation-issue.js';
import {
  ObservationIssuePublication,
  ObservationIssuePublisher,
} from './observation-issue-publication.js';
import { ObservationProductDetails } from './product-details.js';
import { ObservationSourceIssueProjectResult } from './observation-source-issues.js';

interface HiddenTemplateMethodRead {
  readonly sourceName: string;
  readonly sourceAddressHandle: AddressHandle;
  readonly records: readonly KernelStoreRecord[];
}

/** Materializes warnings for template method calls whose method bodies read state that astEvaluate will not observe. */
export class NonTrackableTemplateMethodCallIssueMaterializer {
  private readonly publisher: ObservationIssuePublisher;

  constructor(
    readonly store: KernelStore,
  ) {
    this.publisher = new ObservationIssuePublisher(store);
  }

  materialize(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
    templates: TemplateCompilationProjectEmission,
  ): ObservationSourceIssueProjectResult {
    const publications = this.readNonTrackableMethodCalls(project, typeSystem, templates)
      .map((call, index) => this.publicationForCall(project, call, index));
    const records = uniqueKernelStoreRecords(publications.flatMap((publication) => publication.records));
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, 'non-trackable-template-method-call-issues'));
    }
    for (const publication of publications) {
      this.store.productDetails.add(
        ObservationProductDetails.Issue,
        publication.issue.productHandle,
        publication.issue,
      );
    }

    return new ObservationSourceIssueProjectResult(
      publications.map((publication) => publication.issue),
      records,
    );
  }

  private readNonTrackableMethodCalls(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
    templates: TemplateCompilationProjectEmission,
  ): readonly NonTrackableTemplateMethodCall[] {
    const calls: NonTrackableTemplateMethodCall[] = [];
    const seen = new Set<string>();
    for (const resource of templates.resources) {
      for (const dependency of resource.runtimeAnalysis.bindingDataFlow.observedDependencies) {
        const call = this.nonTrackableMethodCallForDependency(project, typeSystem, dependency);
        if (call == null) {
          continue;
        }
        const key = nonTrackableTemplateMethodCallKey(call);
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        calls.push(call);
      }
    }
    return calls;
  }

  private nonTrackableMethodCallForDependency(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
    dependency: RuntimeBindingObservedDependency,
  ): NonTrackableTemplateMethodCall | null {
    if (!isTemplateMethodCallDependency(dependency)) {
      return null;
    }
    const method = this.methodDeclarationForDependency(typeSystem, dependency);
    if (method == null || readTrackableMethodDependency(method) != null) {
      return null;
    }
    const bodyReads = collectHiddenTemplateMethodReads(this.store, project, method);
    if (bodyReads.length === 0) {
      return null;
    }
    return {
      dependency,
      method,
      methodName: dependency.methodName ?? dependency.sourceName ?? method.name?.getText(method.getSourceFile()) ?? '<method>',
      bodyReads,
    };
  }

  private methodDeclarationForDependency(
    typeSystem: TypeSystemProject,
    dependency: RuntimeBindingObservedDependency,
  ): ts.MethodDeclaration | null {
    const sourceSpan = sourceSpanAddressForAddress(this.store, dependency.observedMemberSourceAddressHandle);
    const sourceFileAddress = sourceFileAddressForAddress(this.store, dependency.observedMemberSourceAddressHandle);
    if (sourceSpan == null || sourceFileAddress == null) {
      return null;
    }
    const sourceFile = typeSystem.readProgramSourceFileByPath(sourceFileAddress.path);
    if (sourceFile == null) {
      return null;
    }
    return findMethodDeclarationAtSourceSpan(sourceFile, sourceSpan.start, sourceSpan.end);
  }

  private publicationForCall(
    project: ProjectBootFrame,
    call: NonTrackableTemplateMethodCall,
    index: number,
  ): ObservationIssuePublication {
    const local = nonTrackableTemplateMethodCallLocalKey(project, call, index);
    const relatedSources = [
      call.dependency.observedMemberSourceAddressHandle,
      ...call.bodyReads.map((read) => read.sourceAddressHandle),
    ].filter((addressHandle): addressHandle is AddressHandle => addressHandle != null);
    const publication = this.publisher.publish(
      local,
      project.projectKey,
      ObservationIssuePhase.BindingObservation,
      ObservationIssueKind.NonTrackableTemplateMethodCall,
      nonTrackableTemplateMethodCallMessage(call),
      null,
      call.dependency.sourceAddressHandle,
      relatedSources,
      call.methodName,
    );
    return new ObservationIssuePublication(publication.issue, [
      ...call.bodyReads.flatMap((read) => read.records),
      ...publication.records,
    ]);
  }
}

interface NonTrackableTemplateMethodCall {
  readonly dependency: RuntimeBindingObservedDependency;
  readonly method: ts.MethodDeclaration;
  readonly methodName: string;
  readonly bodyReads: readonly HiddenTemplateMethodRead[];
}

function isTemplateMethodCallDependency(
  dependency: RuntimeBindingObservedDependency,
): boolean {
  return dependency.dependencyKind === RuntimeObservedDependencyKind.TemplateExpressionRead
    && dependency.observedMemberKind === CheckerTypeMemberKind.Method
    && dependency.observedMemberSourceAddressHandle != null
    && (dependency.expressionKind === 'CallScope' || dependency.expressionKind === 'CallMember');
}

function findMethodDeclarationAtSourceSpan(
  sourceFile: ts.SourceFile,
  start: number,
  end: number,
): ts.MethodDeclaration | null {
  let match: ts.MethodDeclaration | null = null;
  const visit = (node: ts.Node): void => {
    if (match != null) {
      return;
    }
    if (ts.isMethodDeclaration(node) && node.name != null) {
      const nameStart = node.name.getStart(sourceFile);
      const nameEnd = node.name.end;
      if (start >= nameStart && end <= nameEnd) {
        match = node;
        return;
      }
      if (start >= node.getStart(sourceFile) && end <= node.end) {
        match = node;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return match;
}

function collectHiddenTemplateMethodReads(
  store: KernelStore,
  project: ProjectBootFrame,
  method: ts.MethodDeclaration,
): readonly HiddenTemplateMethodRead[] {
  if (method.body == null) {
    return [];
  }
  const reads = new Map<string, HiddenTemplateMethodRead>();
  const sourceFile = method.getSourceFile();
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      addThisReadExpression(store, project, method, sourceFile, reads, node.expression.expression);
      for (const argument of node.arguments) {
        visit(argument);
      }
      return;
    }
    if (isThisPathExpression(node) && shouldRecordThisPathExpression(node)) {
      addThisReadExpression(store, project, method, sourceFile, reads, node);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(method.body);
  return [...reads.values()].sort((left, right) => left.sourceName.localeCompare(right.sourceName));
}

function addThisReadExpression(
  store: KernelStore,
  project: ProjectBootFrame,
  method: ts.MethodDeclaration,
  sourceFile: ts.SourceFile,
  reads: Map<string, HiddenTemplateMethodRead>,
  node: ts.Node,
): void {
  if (!ts.isExpression(node)) {
    return;
  }
  const sourceName = thisPathName(node, sourceFile);
  if (sourceName == null || reads.has(sourceName)) {
    return;
  }
  const local = [
    'non-trackable-template-method-call',
    'hidden-read',
    localKeyPart(project.projectKey),
    localKeyPart(sourceFile.fileName),
    method.name == null ? 'method' : localKeyPart(method.name.getText(sourceFile)),
    localKeyPart(sourceName),
  ].join(':');
  const source = sourceSpanForCheckerNode(store, local, node, SourceSpanRole.Range);
  reads.set(sourceName, {
    sourceName,
    sourceAddressHandle: source.address.handle,
    records: source.records,
  });
}

function isThisPathExpression(node: ts.Node): node is ts.PropertyAccessExpression | ts.ElementAccessExpression {
  return ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node);
}

function shouldRecordThisPathExpression(
  node: ts.PropertyAccessExpression | ts.ElementAccessExpression,
): boolean {
  const parent = node.parent;
  if ((ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) && parent.expression === node) {
    return false;
  }
  return !isSimpleAssignmentTarget(node);
}

function isSimpleAssignmentTarget(
  node: ts.Node,
): boolean {
  const parent = node.parent;
  return ts.isBinaryExpression(parent)
    && parent.left === node
    && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken;
}

function thisPathName(
  node: ts.Expression,
  sourceFile: ts.SourceFile,
): string | null {
  const parts: string[] = [];
  let current: ts.Expression = unwrapThisPathExpression(node);
  while (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
    if (ts.isPropertyAccessExpression(current)) {
      parts.unshift(current.name.getText(sourceFile));
      current = unwrapThisPathExpression(current.expression);
      continue;
    }
    const argumentExpression = current.argumentExpression;
    parts.unshift(argumentExpression == null ? '[?]' : `[${argumentExpression.getText(sourceFile)}]`);
    current = unwrapThisPathExpression(current.expression);
  }
  return current.kind === ts.SyntaxKind.ThisKeyword && parts.length > 0
    ? `this${formatThisPathSegments(parts)}`
    : null;
}

function unwrapThisPathExpression(
  expression: ts.Expression,
): ts.Expression {
  let current = expression;
  while (true) {
    if (ts.isParenthesizedExpression(current)) {
      current = current.expression;
      continue;
    }
    if (ts.isNonNullExpression(current)) {
      current = current.expression;
      continue;
    }
    if (ts.isAsExpression(current) || ts.isTypeAssertionExpression(current) || ts.isSatisfiesExpression(current)) {
      current = current.expression;
      continue;
    }
    return current;
  }
}

function formatThisPathSegments(
  parts: readonly string[],
): string {
  return parts.reduce((text, part) =>
    part.startsWith('[') ? `${text}${part}` : `${text}.${part}`
  , '');
}

function nonTrackableTemplateMethodCallMessage(
  call: NonTrackableTemplateMethodCall,
): string {
  const readList = call.bodyReads
    .slice(0, 4)
    .map((read) => read.sourceName)
    .join(', ');
  const remaining = call.bodyReads.length > 4
    ? `, and ${call.bodyReads.length - 4} more`
    : '';
  return `Template method call "${call.methodName}(...)" reads ${readList}${remaining} inside an undecorated method. Aurelia observes the template call and its arguments, but not arbitrary method bodies; add @computed(...), convert the read to a getter, or bind the dependency directly when the result must update with those reads.`;
}

function nonTrackableTemplateMethodCallLocalKey(
  project: ProjectBootFrame,
  call: NonTrackableTemplateMethodCall,
  index: number,
): string {
  return [
    'non-trackable-template-method-call-issue',
    ObservationIssueKind.NonTrackableTemplateMethodCall,
    localKeyPart(project.projectKey),
    localKeyPart(call.methodName),
    localKeyPart(call.dependency.sourceAddressHandle ?? 'unknown-source'),
    index,
  ].join(':');
}

function nonTrackableTemplateMethodCallKey(
  call: NonTrackableTemplateMethodCall,
): string {
  return [
    call.dependency.sourceAddressHandle ?? 'unknown-source',
    call.dependency.observedMemberSourceAddressHandle ?? 'unknown-method',
    call.methodName,
  ].join(':');
}

function uniqueKernelStoreRecords(
  records: readonly KernelStoreRecord[],
): readonly KernelStoreRecord[] {
  const seen = new Set<string>();
  return records.filter((record) => {
    if (seen.has(record.handle)) {
      return false;
    }
    seen.add(record.handle);
    return true;
  });
}
