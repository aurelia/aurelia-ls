import { kernelRecordReferences, mergeKernelDetailReferences } from '../kernel/detail-references.js';
import { defineProductDetailSlot } from '../kernel/product-details.js';
import {
  DiIssueSubjectKind,
  type DiIssueSubject,
} from './di-issue.js';
import { DiDetailDescriptors } from './detail-descriptors.js';

function diIssueSubjectRecords(subject: DiIssueSubject) {
  switch (subject.kind) {
    case DiIssueSubjectKind.ResourceSlot:
      return kernelRecordReferences(
        subject.existingResourceSlotProductHandle,
        subject.incomingResourceProductHandle,
      );
    case DiIssueSubjectKind.ResolveCall:
    case DiIssueSubjectKind.InjectDecorator:
    case DiIssueSubjectKind.ContainerApiCall:
    case DiIssueSubjectKind.DependencyCycle:
    case DiIssueSubjectKind.RegistrationCascade:
      return kernelRecordReferences();
  }
}

/** Typed detail slots for DI products used by app diagnostics and world-construction inquiries. */
export const DiProductDetails = {
  Issue: defineProductDetailSlot(
    DiDetailDescriptors.Issue,
    (issue) => mergeKernelDetailReferences(
      kernelRecordReferences(issue.containerIdentityHandle, issue.containerProductHandle),
      diIssueSubjectRecords(issue.subject),
    ),
  ),
} as const;
