import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import {
  DiIssueSubjectKind,
  type DiIssue,
} from '../di/di-issue.js';
import type { KernelStore } from '../kernel/store.js';
import {
  describeAddress,
} from './source-reference.js';
import type {
  SemanticDiIssueRow,
  SemanticDiIssuesResult,
} from './contracts.js';

export function readDiIssueRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): SemanticDiIssuesResult['rows'] {
  return emission.appWorld.diWorld.issues
    .map((issue) => diIssueRow(emission, store, issue, handles))
    .sort((left, right) =>
      `${left.phase}:${left.issueKind}:${left.resourceKey ?? ''}:${left.source?.label ?? ''}`
        .localeCompare(`${right.phase}:${right.issueKind}:${right.resourceKey ?? ''}:${right.source?.label ?? ''}`)
    );
}

function diIssueRow(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  issue: DiIssue,
  handles: boolean,
): SemanticDiIssueRow {
  return {
    projectKey: emission.project.projectKey,
    phase: issue.phase,
    issueKind: issue.issueKind,
    diagnosticAuthority: issue.frameworkErrorCode == null ? 'semantic-runtime-product' : 'framework-error-code',
    frameworkErrorCode: issue.frameworkErrorCode,
    severity: issue.severity,
    message: issue.message,
    subjectKind: issue.subject.kind,
    resourceKey: issue.subject.kind === DiIssueSubjectKind.ResourceSlot ? issue.subject.resourceKey : null,
    resolveCall: issue.subject.kind === DiIssueSubjectKind.ResolveCall
      ? {
        keyExpressionText: issue.subject.keyExpressionText,
        argumentCount: issue.subject.argumentCount,
        nullishKeyArguments: issue.subject.nullishKeyArguments.map((argument) => ({
          index: argument.index,
          kind: argument.kind,
          text: argument.text,
        })),
        enclosingClassName: issue.subject.enclosingClassName,
        enclosingMemberName: issue.subject.enclosingMemberName,
        enclosingMemberKind: issue.subject.enclosingMemberKind,
        enclosingMemberStatic: issue.subject.enclosingMemberStatic,
        executionContextKind: issue.subject.executionContextKind,
        activeContainerExpectation: issue.subject.activeContainerExpectation,
      }
      : null,
    injectDecorator: issue.subject.kind === DiIssueSubjectKind.InjectDecorator
      ? {
        decoratorName: issue.subject.decoratorName,
        targetKind: issue.subject.targetKind,
        targetName: issue.subject.targetName,
      }
      : null,
    containerApiCall: issue.subject.kind === DiIssueSubjectKind.ContainerApiCall
      ? {
        methodKind: issue.subject.methodKind,
        keyExpressionText: issue.subject.keyExpressionText,
        keyWrapperKind: issue.subject.keyWrapperKind,
        wrappedKeyName: issue.subject.wrappedKeyName,
        keyKind: issue.subject.keyKind,
        keyIdentityKind: issue.subject.keyIdentityKind,
        autoRegister: issue.subject.autoRegister,
        receiverDefaultResolverPolicy: issue.subject.receiverDefaultResolverPolicy,
        receiverFreshCreateContainer: issue.subject.receiverFreshCreateContainer,
        nullishKeyArguments: issue.subject.nullishKeyArguments.map((argument) => ({
          index: argument.index,
          kind: argument.kind,
          text: argument.text,
        })),
        receiverText: issue.subject.receiverText,
      }
      : null,
    dependencyCycle: issue.subject.kind === DiIssueSubjectKind.DependencyCycle
      ? {
        entryKeyExpressionText: issue.subject.entryKeyExpressionText,
        entryKeyName: issue.subject.entryKeyName,
        cycle: issue.subject.cycle.map((step) => ({
          keyName: step.keyName,
          implementationName: step.implementationName,
          dependencyKeyName: step.dependencyKeyName,
          sourcePath: step.sourcePath,
        })),
      }
      : null,
    registrationCascade: issue.subject.kind === DiIssueSubjectKind.RegistrationCascade
      ? {
        stepKind: issue.subject.stepKind,
        admissionKind: issue.subject.admissionKind,
        strategy: issue.subject.strategy,
      }
      : null,
    source: describeAddress(store, issue.sourceAddressHandle),
    ...(handles ? {
      handles: {
        productHandle: issue.productHandle,
        identityHandle: issue.identityHandle,
        containerIdentityHandle: issue.containerIdentityHandle,
        containerProductHandle: issue.containerProductHandle,
        existingResourceSlotProductHandle: issue.subject.kind === DiIssueSubjectKind.ResourceSlot
          ? issue.subject.existingResourceSlotProductHandle
          : null,
        incomingResourceProductHandle: issue.subject.kind === DiIssueSubjectKind.ResourceSlot
          ? issue.subject.incomingResourceProductHandle
          : null,
        sourceAddressHandle: issue.sourceAddressHandle,
      },
    } : {}),
  };
}
