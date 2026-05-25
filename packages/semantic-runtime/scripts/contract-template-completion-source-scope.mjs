import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-controller-state-condition-boundary');
const templatePath = path.join(fixtureRoot, 'src/app.html');
const templateText = fs.readFileSync(templatePath, 'utf8');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'contract:template-completion-source-scope',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const rawCompletion = completionAtMemberDot('raw', templateText.indexOf('${selectedTask.'));
const stateCompletion = completionAtMemberDot('state', templateText.lastIndexOf('${selectedTask.'));
const failures = [];

if (rawCompletion.answer.value.candidates.some((candidate) => candidate.name === 'title')) {
  failures.push('Raw child interpolation should not complete state-only selectedTask.title.');
}
if (!rawCompletion.answer.value.missingInputs.some((missing) => missing.includes('missing-member'))) {
  failures.push('Raw child interpolation should report missing member-owner input for state-only selectedTask.');
}
if (!stateCompletion.answer.value.candidates.some((candidate) =>
  candidate.candidateKind === 'type-member'
  && candidate.name === 'title'
  && candidate.typeDisplay === 'string'
)) {
  failures.push('State-bound child interpolation should complete selectedTask.title from the state-projected source scope.');
}
if (stateCompletion.answer.value.missingInputs.length !== 0) {
  failures.push(`State-bound child interpolation should not report missing completion inputs; got ${stateCompletion.answer.value.missingInputs.join(', ')}.`);
}

const summary = {
  raw: completionSummary(rawCompletion),
  state: completionSummary(stateCompletion),
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

function completionAtMemberDot(label, markerOffset) {
  const offset = markerOffset + '${selectedTask.'.length;
  const before = templateText.slice(0, offset);
  const lines = before.split(/\r?\n/u);
  const line = lines.length - 1;
  const character = lines[lines.length - 1].length;
  return {
    label,
    answer: app.ask({
      kind: SemanticAppQueryKind.TemplateCompletions,
      cursor: {
        filePath: 'src/app.html',
        line,
        character,
        offset,
      },
      page: { size: 20 },
    }),
  };
}

function completionSummary(completion) {
  return {
    outcome: completion.answer.outcome,
    siteKind: completion.answer.value.siteKind,
    missingInputs: completion.answer.value.missingInputs,
    candidates: completion.answer.value.candidates.map((candidate) => ({
      candidateKind: candidate.candidateKind,
      name: candidate.name,
      sourceKind: candidate.sourceKind,
      typeDisplay: candidate.typeDisplay,
    })),
  };
}
