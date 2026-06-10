import ts from 'typescript';
import {
  StaticEvaluator,
} from '../out/evaluation/evaluator.js';
import {
  EvaluationValueKind,
} from '../out/evaluation/values.js';

const source = `
const values = [1, 2, 3];
let total = 0;
for (let i = 0; i < values.length; i += 1) {
  total += values[i];
}

let postfix = 0;
postfix++;

const bag = { count: 1 };
bag.count += total;
++bag.count;

export const result = {
  total,
  postfix,
  count: bag.count,
};
`;

const sourceFile = ts.createSourceFile(
  '/virtual/evaluation-classic-for-loop.ts',
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

const result = new StaticEvaluator().evaluateSourceFile(sourceFile, '/virtual/evaluation-classic-for-loop.ts');
const resultObject = result.environment.readValue('result');

const failures = [
  result.openSeams.length === 0
    ? null
    : 'Expected bounded classic for loop and compound/update assignments to close without open seams.',
  numberProperty(resultObject, 'total') === 6
    ? null
    : 'Expected for-loop total to reduce to 6.',
  numberProperty(resultObject, 'postfix') === 1
    ? null
    : 'Expected postfix update to reduce to 1.',
  numberProperty(resultObject, 'count') === 8
    ? null
    : 'Expected property compound/update assignment to reduce to 8.',
].filter(Boolean);

const summary = {
  openSeams: result.openSeams.map((seam) => ({
    seamKind: seam.seamKind,
    summary: seam.summary,
    reasonKinds: seam.reasonKinds,
  })),
  values: {
    total: numberProperty(resultObject, 'total'),
    postfix: numberProperty(resultObject, 'postfix'),
    count: numberProperty(resultObject, 'count'),
  },
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

function numberProperty(value, name) {
  if (value?.kind !== EvaluationValueKind.Object) {
    return null;
  }
  const property = value.properties.get(name)?.value ?? null;
  return property?.kind === EvaluationValueKind.Number ? property.value : null;
}
