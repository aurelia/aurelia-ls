import ts from 'typescript';
import {
  StaticEvaluator,
} from '../out/evaluation/evaluator.js';
import {
  EvaluationValueKind,
} from '../out/evaluation/values.js';

const source = `
declare const conventionOptions: { enableConventions: boolean };
declare function hostFactory(): object;
declare class HostService {}
declare enum HostMode { Development, Production }

let ordinaryLocal: string | undefined;
`;

const sourceFile = ts.createSourceFile(
  '/virtual/evaluation-ambient-declarations.ts',
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);
const result = new StaticEvaluator().evaluateSourceFile(
  sourceFile,
  '/virtual/evaluation-ambient-declarations.ts',
);

const expectedBoundaries = [
  'conventionOptions',
  'hostFactory',
  'HostService',
  'HostMode',
];
const failures = expectedBoundaries.flatMap((name) => {
  const value = result.environment.readValue(name);
  return value?.kind === EvaluationValueKind.BoundaryValue && value.path === name
    ? []
    : [`Expected source-local ambient declaration '${name}' to remain a host boundary, observed ${value?.kind ?? 'missing'}.`];
});
const ordinaryLocal = result.environment.readValue('ordinaryLocal');
if (ordinaryLocal?.kind !== EvaluationValueKind.Undefined) {
  failures.push(`Expected an ordinary uninitialized local to retain JavaScript undefined semantics, observed ${ordinaryLocal?.kind ?? 'missing'}.`);
}
if (result.openSeams.length !== 0) {
  failures.push(`Expected ambient declarations themselves to remain boundary values without evaluator seams, observed ${result.openSeams.length}.`);
}

const summary = {
  ambientBindings: Object.fromEntries(expectedBoundaries.map((name) => {
    const value = result.environment.readValue(name);
    return [name, value?.kind === EvaluationValueKind.BoundaryValue
      ? { kind: value.kind, path: value.path, boundaryKind: value.boundaryKind }
      : { kind: value?.kind ?? null }];
  })),
  ordinaryLocal: ordinaryLocal?.kind ?? null,
  openSeams: result.openSeams.map((seam) => ({
    seamKind: seam.seamKind,
    summary: seam.summary,
  })),
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}
