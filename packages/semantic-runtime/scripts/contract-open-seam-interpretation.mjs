import { KernelOpenSeamKinds } from '../out/kernel/vocabulary/index.js';
import {
  semanticOpenSeamAttemptForKind,
  semanticOpenSeamBoundaryForKind,
} from '../out/api/open-seam-interpretation.js';

const failures = [];
const rows = [];

for (const [namespace, entries] of Object.entries(KernelOpenSeamKinds)) {
  for (const [name, definition] of Object.entries(entries)) {
    const seamKindKey = definition.key;
    const attempt = semanticOpenSeamAttemptForKind(seamKindKey);
    const boundary = semanticOpenSeamBoundaryForKind(seamKindKey);
    rows.push({
      namespace,
      name,
      seamKindKey,
      attempt: attempt.kind,
      boundary: boundary.kind,
      boundarySummary: boundary.summary,
    });
    if (attempt.kind === 'semantic-product-materialization') {
      failures.push(`${seamKindKey} fell back to generic semantic-product-materialization attempt.`);
    }
    if (attempt.summary.length === 0) {
      failures.push(`${seamKindKey} has an empty attempt summary.`);
    }
    if (boundary.summary.length === 0) {
      failures.push(`${seamKindKey} has an empty boundary summary.`);
    }
    const expectedSummaryTerm = expectedFrameworkBoundarySummaryTerm(namespace);
    if (expectedSummaryTerm != null && !boundary.summary.includes(expectedSummaryTerm)) {
      failures.push(`${seamKindKey} boundary summary should mention ${expectedSummaryTerm}, observed '${boundary.summary}'.`);
    }
  }
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
    rows,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    rows,
  }, null, 2));
}

function expectedFrameworkBoundarySummaryTerm(namespace) {
  switch (namespace) {
    case 'Resource':
      return 'Resource recognition';
    case 'Registration':
      return 'Registration recognition';
    case 'Configuration':
      return 'Configuration recognition';
    case 'Di':
      return 'DI world construction';
    case 'Router':
      return 'Router materialization';
    case 'Compiler':
    case 'Instruction':
      return 'Template compilation or rendering materialization';
    case 'Binding':
      return 'Runtime binding analysis';
    default:
      return null;
  }
}
