import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { expect, test } from 'vitest';
import {
  answerSemanticRuntimeAppBuilderQuery,
  appBuilderArchitectureOptions,
  appBuilderSourceLoweringSourcePlan,
  singleQuotedTypeScriptStringLiteralText,
} from '../src/index.js';

function fixtureRequest(name: string) {
  const file = path.join(import.meta.dirname, '../fixtures/app-builder', name, 'app-builder-request.json');
  return JSON.parse(readFileSync(file, 'utf8'));
}

test('generated string literals round-trip line breaks, apostrophes and literal backslashes', () => {
  const value = "one\r\ntwo's\\three";
  const code = singleQuotedTypeScriptStringLiteralText(value);
  const file = ts.createSourceFile('seed.ts', code, ts.ScriptTarget.Latest);
  const statement = file.statements[0]!;
  expect(file.statements).toHaveLength(1);
  expect(ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression) && statement.expression.text).toBe(value);
});

test('a convention-based component pair requires its companion at the discoverable path', () => {
  const request = fixtureRequest('component-pair-task-draft-app-shell');
  expect(appBuilderSourceLoweringSourcePlan(request.sourceLoweringSourcePlan).sourcePlan).toBeTruthy();
  request.sourceLoweringSourcePlan.templatePath = 'src/alternate.html';
  const invalid = appBuilderSourceLoweringSourcePlan(request.sourceLoweringSourcePlan);
  expect(invalid.sourcePlan).toBeNull();
  expect(invalid.issues).toEqual(expect.arrayContaining([
    expect.objectContaining({ issueKind: 'inconsistent-convention-carrier' }),
  ]));
});

test('service interfaces emit the choice type used by a finite field', () => {
  const request = fixtureRequest('component-pair-task-table-service-loading');
  const pair = request.sourceLoweringSourcePlan.sourceLoweringComponentPair;
  const fields = pair.decisionBundles[0].decisions[0].facetPayloads.find((facet: { inputFacetId: string }) => facet.inputFacetId === 'domain-fields').value;
  fields.push({ name: 'priority', title: 'Priority', valueKind: 'choice', options: [
    { value: 'low', title: 'Low' }, { value: 'high', title: 'High' },
  ] });
  const plan = appBuilderSourceLoweringSourcePlan(request.sourceLoweringSourcePlan);
  expect(plan.issues).toEqual([]);
  const service = plan.sourcePlan!.files.find(file => file.path.endsWith('-service.ts'))!;
  expect(service.text!.text).toContain("export type TaskItemPriority = 'low' | 'high';");
  expect(service.text!.text).toContain('readonly priority: TaskItemPriority;');
});

test('architecture option next steps execute through the same query dispatcher', () => {
  const steps = appBuilderArchitectureOptions({ scaleHints: ['compact'] }).rows[0]!.queryPlan!;
  expect(steps).toHaveLength(4);
  for (const step of steps) {
    const response = answerSemanticRuntimeAppBuilderQuery(step.appBuilderQuery);
    expect(response.result).toBe('answered');
  }
});
