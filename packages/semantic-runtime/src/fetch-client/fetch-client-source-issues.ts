import type {
  KernelStoreRecord,
} from '../kernel/store.js';
import type { FetchClientIssue } from './fetch-client-issue.js';

export class FetchClientSourceIssueProjectResult {
  constructor(
    readonly issues: readonly FetchClientIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {}

  readIssues(): readonly FetchClientIssue[] {
    return this.issues;
  }
}
