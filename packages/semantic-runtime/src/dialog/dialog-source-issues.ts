import type {
  KernelStoreRecord,
} from '../kernel/store.js';
import type { DialogIssue } from './dialog-issue.js';

export class DialogSourceIssueProjectResult {
  constructor(
    readonly issues: readonly DialogIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {}

  readIssues(): readonly DialogIssue[] {
    return this.issues;
  }
}
