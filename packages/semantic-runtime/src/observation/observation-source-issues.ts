import type {
  KernelStoreRecord,
} from '../kernel/store.js';
import type {
  ObservationIssue,
} from './observation-issue.js';

export class ObservationSourceIssueProjectResult {
  constructor(
    readonly issues: readonly ObservationIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {}

  readIssues(): readonly ObservationIssue[] {
    return this.issues;
  }
}

export function mergeObservationSourceIssueProjectResults(
  results: readonly ObservationSourceIssueProjectResult[],
): ObservationSourceIssueProjectResult {
  return new ObservationSourceIssueProjectResult(
    results.flatMap((result) => result.issues),
    results.flatMap((result) => result.records),
  );
}
