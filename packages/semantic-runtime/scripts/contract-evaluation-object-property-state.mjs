import ts from 'typescript';
import {
  StaticEvaluator,
} from '../out/evaluation/evaluator.js';
import {
  EvaluationObjectPropertyState,
  EvaluationValueKind,
} from '../out/evaluation/values.js';

const source = `
const spread = {
  before: 'before',
  ...import.meta.env,
  after: 'after',
};
const forwarded = {
  outerBefore: 'outer-before',
  ...spread,
  outerAfter: 'outer-after',
};
const assigned = Object.assign(
  { assignedBefore: 'assigned-before' },
  spread,
  { assignedAfter: 'assigned-after' },
);
const beforeRead = spread.before;
const afterRead = spread.after;
`;

const sourceFile = ts.createSourceFile(
  '/virtual/evaluation-object-property-state.ts',
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

const result = new StaticEvaluator().evaluateSourceFile(sourceFile, sourceFile.fileName);
const spread = objectValue(result.environment.readValue('spread'));
const forwarded = objectValue(result.environment.readValue('forwarded'));
const assigned = objectValue(result.environment.readValue('assigned'));
const beforeRead = result.environment.readEvidence('beforeRead');
const afterRead = result.environment.readEvidence('afterRead');

const expectations = [
  [spread, 'before', EvaluationObjectPropertyState.Open],
  [spread, 'after', EvaluationObjectPropertyState.Closed],
  [forwarded, 'outerBefore', EvaluationObjectPropertyState.Open],
  [forwarded, 'before', EvaluationObjectPropertyState.Open],
  [forwarded, 'after', EvaluationObjectPropertyState.Closed],
  [forwarded, 'outerAfter', EvaluationObjectPropertyState.Closed],
  [assigned, 'assignedBefore', EvaluationObjectPropertyState.Open],
  [assigned, 'before', EvaluationObjectPropertyState.Open],
  [assigned, 'after', EvaluationObjectPropertyState.Closed],
  [assigned, 'assignedAfter', EvaluationObjectPropertyState.Closed],
];

const failures = expectations.flatMap(([object, propertyName, expectedState]) => {
  const actualState = object?.properties.get(propertyName)?.state ?? null;
  return actualState === expectedState
    ? []
    : [`Expected ${propertyName} state ${expectedState}, got ${actualState ?? '<missing>'}.`];
});
if (beforeRead?.value.kind !== EvaluationValueKind.String || beforeRead.value.value !== 'before' || beforeRead.openSeams.length === 0) {
  failures.push(`Expected spread.before to retain the best-known value with open evidence, got ${beforeRead?.value.kind ?? '<missing>'} with ${beforeRead?.openSeams.length ?? 0} seam(s).`);
}
if (afterRead?.value.kind !== EvaluationValueKind.String || afterRead.value.value !== 'after' || afterRead.openSeams.length !== 0) {
  failures.push(`Expected spread.after to close to "after", got ${afterRead?.value.kind ?? '<missing>'} with ${afterRead?.openSeams.length ?? 0} seam(s).`);
}

const summary = {
  openSeams: result.openSeams.map((seam) => seam.summary),
  spread: propertyStates(spread),
  forwarded: propertyStates(forwarded),
  assigned: propertyStates(assigned),
  beforeReadKind: beforeRead?.value.kind ?? null,
  beforeReadOpenSeams: beforeRead?.openSeams.length ?? null,
  afterReadKind: afterRead?.value.kind ?? null,
  afterReadOpenSeams: afterRead?.openSeams.length ?? null,
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

function objectValue(value) {
  return value?.kind === EvaluationValueKind.Object ? value : null;
}

function propertyStates(value) {
  return value == null
    ? null
    : Object.fromEntries([...value.properties].map(([name, property]) => [name, property.state]));
}
