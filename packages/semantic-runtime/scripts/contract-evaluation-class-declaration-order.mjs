import ts from 'typescript';
import {
  StaticEvaluator,
} from '../out/evaluation/evaluator.js';
import {
  EvaluationValueKind,
} from '../out/evaluation/values.js';

const source = `
export class TaskCard {}

const localDependencies = {
  dependencies: [TaskCard],
};

export class MyApp {
  static readonly dependencies = localDependencies.dependencies;
}
`;

const sourceFile = ts.createSourceFile(
  '/virtual/static-class-declaration-order.ts',
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);
const result = new StaticEvaluator().evaluateSourceFile(sourceFile, '/virtual/static-class-declaration-order.ts');
const myApp = result.environment.readValue('MyApp');
const dependencies = myApp?.kind === EvaluationValueKind.Class
  ? myApp.properties.get('dependencies')?.value ?? null
  : null;

const failures = [
  result.openSeams.length === 0
    ? null
    : 'Expected static class property evaluation to close without module-order open seams.',
  result.openSeams.some((seam) => seam.summary.includes('localDependencies'))
    ? 'Static class property evaluation should see previously executed module const bindings.'
    : null,
  myApp?.kind === EvaluationValueKind.Class
    ? null
    : 'Expected MyApp to evaluate as an evaluator-local class value.',
  dependencies?.kind === EvaluationValueKind.Array
    ? null
    : 'Expected MyApp.dependencies to evaluate from the prior localDependencies const.',
].filter(Boolean);

const summary = {
  openSeams: result.openSeams.map((seam) => ({
    seamKind: seam.seamKind,
    summary: seam.summary,
  })),
  myAppKind: myApp?.kind ?? null,
  dependenciesKind: dependencies?.kind ?? null,
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}
