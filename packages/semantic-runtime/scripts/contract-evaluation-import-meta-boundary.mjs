import ts from 'typescript';
import {
  StaticEvaluator,
} from '../out/evaluation/evaluator.js';
import {
  EvaluationValueKind,
} from '../out/evaluation/values.js';

const source = `
export class CoreResource {}
export class DebugResource {}

export const mode = import.meta.env.MODE;
export const dependencies = [
  CoreResource,
  ...(import.meta.env.DEV ? [DebugResource] : []),
];
`;

const sourceFile = ts.createSourceFile(
  '/virtual/evaluation-import-meta-boundary.ts',
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

const result = new StaticEvaluator().evaluateSourceFile(sourceFile, '/virtual/evaluation-import-meta-boundary.ts');
const mode = result.environment.readValue('mode');
const dependencies = result.environment.readValue('dependencies');

const failures = [
  result.openSeams.length === 0
    ? null
    : 'Expected import.meta host boundaries to avoid unsupported-expression evaluator seams.',
  mode?.kind === EvaluationValueKind.BoundaryValue && mode.path === 'import.meta.env.MODE'
    ? null
    : 'Expected import.meta.env.MODE to reduce to a host-environment boundary value.',
  dependencies?.kind === EvaluationValueKind.Array && dependencies.elements.length === 1 && dependencies.mayHaveUnknownElements
    ? null
    : 'Expected optional import.meta-dependent dependency spread to keep known entries while marking unknown elements.',
  dependencies?.kind === EvaluationValueKind.Array
    && dependencies.uncertainties.some((uncertainty) => uncertainty.boundaryPath === 'import.meta.env.DEV')
    ? null
    : 'Expected optional import.meta-dependent dependency spread to retain the host environment branch path.',
].filter(Boolean);

const summary = {
  openSeams: result.openSeams.map((seam) => ({
    seamKind: seam.seamKind,
    summary: seam.summary,
    reasonKinds: seam.reasonKinds,
  })),
  mode: mode?.kind === EvaluationValueKind.BoundaryValue
    ? { kind: mode.kind, path: mode.path, boundaryKind: mode.boundaryKind }
    : { kind: mode?.kind ?? null },
  dependencies: dependencies?.kind === EvaluationValueKind.Array
    ? {
      kind: dependencies.kind,
      elementKinds: dependencies.elements.map((element) => element.value.kind),
      mayHaveUnknownElements: dependencies.mayHaveUnknownElements,
      uncertainties: dependencies.uncertainties.map((uncertainty) => ({
        kind: uncertainty.kind,
        boundaryKind: uncertainty.boundaryKind ?? null,
        boundaryPath: uncertainty.boundaryPath ?? null,
      })),
    }
    : { kind: dependencies?.kind ?? null },
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}
