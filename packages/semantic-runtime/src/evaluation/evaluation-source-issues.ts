import type { KernelStoreRecord } from '../kernel/store.js';
import type { EvaluationIssue } from './evaluation-issue.js';

export class EvaluationIssueProjectResult {
  constructor(
    readonly issues: readonly EvaluationIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {}

  readIssues(): readonly EvaluationIssue[] {
    return this.issues;
  }
}

export function mergeEvaluationIssueProjectResults(
  results: readonly EvaluationIssueProjectResult[],
): EvaluationIssueProjectResult {
  return new EvaluationIssueProjectResult(
    results.flatMap((result) => result.issues),
    results.flatMap((result) => result.records),
  );
}
