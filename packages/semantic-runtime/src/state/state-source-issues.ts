import type {
  KernelStoreRecord,
} from '../kernel/store.js';
import type {
  StateIssue,
} from './state-issue.js';

export class StateSourceIssueProjectResult {
  constructor(
    readonly issues: readonly StateIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {}

  readIssues(): readonly StateIssue[] {
    return this.issues;
  }
}

export function mergeStateSourceIssueProjectResults(
  results: readonly StateSourceIssueProjectResult[],
): StateSourceIssueProjectResult {
  return new StateSourceIssueProjectResult(
    results.flatMap((result) => result.issues),
    results.flatMap((result) => result.records),
  );
}
