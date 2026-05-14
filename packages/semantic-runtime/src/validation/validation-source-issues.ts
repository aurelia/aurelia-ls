import type {
  KernelStoreRecord,
} from '../kernel/store.js';
import type {
  ValidationIssue,
} from './validation-issue.js';

export class ValidationSourceIssueProjectResult {
  constructor(
    readonly issues: readonly ValidationIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {}

  readIssues(): readonly ValidationIssue[] {
    return this.issues;
  }
}
