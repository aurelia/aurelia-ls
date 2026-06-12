import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';
import {
  CheckerExpressionTypeEvaluationContext,
} from '../out/type-system/expression-type-context.js';
import {
  CheckerExpressionTypeEvaluationResultKind,
} from '../out/type-system/expression-type-evaluation.js';
import {
  bindingExpressionAstForParse,
} from '../out/template/expression-parse-projection.js';
import {
  bindingScopesForTemplateExpressionParse,
  templateExpressionParsesForResource,
} from '../out/template/template-expression-selection.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/contextual-call-argument-completion');
const templatePath = path.join(fixtureRoot, 'src/contextual-call-argument-completion-app.html');
const templateText = fs.readFileSync(templatePath, 'utf8');

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'contract:contextual-call-argument-completion',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const methodCallback = completionAtMemberDot(
  'method-callback',
  'productLabel(product => product.',
);
const optionalMethodCallback = completionAtMemberDot(
  'optional-method-callback',
  'maybeProductLabel?.(product => product.',
);
const checkerArrayCallback = completionAtMemberDot(
  'checker-array-callback',
  'products.map(product => product.',
);
const checkerReduceCallback = completionAtMemberDot(
  'checker-reduce-callback',
  'products.reduce((current, product) => product.',
);
const checkerReduceAccumulatorCallback = completionAtMemberDot(
  'checker-reduce-accumulator-callback',
  'product.price > current.',
);
const syntheticArrayCallback = completionAtMemberDot(
  'synthetic-array-callback',
  "price: 1 }].map(product => product.",
);
const taggedTemplateEvaluation = evaluateTaggedTemplateExpression();

assertCompletionMembers(methodCallback, [
  ['displayName', 'string'],
  ['price', 'number'],
  ['sku', 'string'],
]);
assertCompletionMembers(optionalMethodCallback, [
  ['displayName', 'string'],
  ['price', 'number'],
  ['sku', 'string'],
]);
assertCompletionMembers(checkerArrayCallback, [
  ['displayName', 'string'],
  ['price', 'number'],
  ['sku', 'string'],
]);
assertCompletionMembers(checkerReduceCallback, [
  ['displayName', 'string'],
  ['price', 'number'],
  ['sku', 'string'],
]);
assertCompletionMembers(checkerReduceAccumulatorCallback, [
  ['displayName', 'string'],
  ['price', 'number'],
  ['sku', 'string'],
]);
assertCompletionMembers(syntheticArrayCallback, [
  ['displayName', '"Inline product"'],
  ['price', '1'],
  ['sku', '"inline-sku"'],
]);
assert.equal(
  taggedTemplateEvaluation.kind,
  CheckerExpressionTypeEvaluationResultKind.Type,
  `Expected tagged-template overload evaluation to close, observed ${taggedTemplateEvaluation.kind}.`,
);
assert.equal(
  taggedTemplateEvaluation.display,
  'string',
  `Expected tagged-template overload with one hole to return string, observed ${taggedTemplateEvaluation.display ?? 'missing'}.`,
);

console.log(JSON.stringify({
  ok: true,
  summary: {
    methodCallback: completionSummary(methodCallback),
    optionalMethodCallback: completionSummary(optionalMethodCallback),
    checkerArrayCallback: completionSummary(checkerArrayCallback),
    checkerReduceCallback: completionSummary(checkerReduceCallback),
    checkerReduceAccumulatorCallback: completionSummary(checkerReduceAccumulatorCallback),
    syntheticArrayCallback: completionSummary(syntheticArrayCallback),
    taggedTemplateEvaluation,
  },
}, null, 2));

function completionAtMemberDot(label, marker) {
  const markerOffset = templateText.indexOf(marker);
  assert.notEqual(markerOffset, -1, `Expected marker for ${label}: ${marker}`);
  const offset = markerOffset + marker.length;
  const before = templateText.slice(0, offset);
  const lines = before.split(/\r?\n/u);
  const line = lines.length - 1;
  const character = lines[lines.length - 1].length;
  return {
    label,
    answer: app.ask({
      kind: SemanticAppQueryKind.TemplateCompletions,
      cursor: {
        filePath: 'src/contextual-call-argument-completion-app.html',
        line,
        character,
        offset,
      },
      page: { size: 40 },
    }),
  };
}

function assertCompletionMembers(completion, expectedMembers) {
  assert.equal(
    completion.answer.value.missingInputs.length,
    0,
    `${completion.label} should not report missing inputs: ${completion.answer.value.missingInputs.join(', ')}`,
  );
  for (const [name, typeDisplay] of expectedMembers) {
    assert.ok(
      completion.answer.value.candidates.some((candidate) =>
        candidate.candidateKind === 'type-member'
        && candidate.name === name
        && candidate.typeDisplay === typeDisplay
      ),
      `${completion.label} should complete ${name}: ${typeDisplay}`,
    );
  }
}

function completionSummary(completion) {
  return {
    outcome: completion.answer.outcome,
    siteKind: completion.answer.value.siteKind,
    missingInputs: completion.answer.value.missingInputs,
    candidates: completion.answer.value.candidates
      .filter((candidate) => ['displayName', 'price', 'sku'].includes(candidate.name))
      .map((candidate) => ({
        candidateKind: candidate.candidateKind,
        name: candidate.name,
        sourceKind: candidate.sourceKind,
        typeDisplay: candidate.typeDisplay,
      })),
  };
}

function evaluateTaggedTemplateExpression() {
  const resource = app.emission.templates.resources[0] ?? null;
  assert.ok(resource, 'Expected contextual-call fixture to compile one template resource.');
  const parse = templateExpressionParsesForResource(resource)
    .find((candidate) => findTaggedTemplateExpression(bindingExpressionAstForParse(candidate)) != null)
    ?? null;
  assert.ok(parse, 'Expected contextual-call fixture to contain a tagged-template expression.');
  const expression = findTaggedTemplateExpression(bindingExpressionAstForParse(parse));
  assert.ok(expression, 'Expected tagged-template expression lookup to succeed.');
  const scope = bindingScopesForTemplateExpressionParse(resource, parse)[0]
    ?? resource.runtimeAnalysis.scopes.rootScope;
  const result = resource.runtimeAnalysis.expressionWorld
    .evaluator(resource.compilation.compilerWorld.resourceScope)
    .evaluate(CheckerExpressionTypeEvaluationContext.knownScope(
      expression,
      scope,
      'contract-contextual-call-argument-completion:tagged-template-overload',
      parse.sourceAddressHandle,
    ));
  return result.kind === CheckerExpressionTypeEvaluationResultKind.Type
    ? { kind: result.kind, display: result.typeShape.display, openKind: null }
    : { kind: result.kind, display: result.partialTypeReference?.display ?? null, openKind: result.openKind };
}

function findTaggedTemplateExpression(expression, seen = new Set()) {
  if (expression == null || typeof expression !== 'object' || seen.has(expression)) {
    return null;
  }
  seen.add(expression);
  if (expression.$kind === 'TaggedTemplate') {
    return expression;
  }
  for (const value of Object.values(expression)) {
    if (value == null || typeof value !== 'object') {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const match = findTaggedTemplateExpression(item, seen);
        if (match != null) {
          return match;
        }
      }
      continue;
    }
    const match = findTaggedTemplateExpression(value, seen);
    if (match != null) {
      return match;
    }
  }
  return null;
}
