import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';
import { sourceSpanAddressForAddress } from '../out/kernel/source-address.js';
import { RuntimeOperationReachability } from '../out/runtime-expression/runtime-operation.js';
import {
  RuntimeBindingSourceExpressionContextProjector,
  RuntimeBindingSourceExpressionProjectionKind,
} from '../out/observation/runtime-binding-source-expression-context.js';
import { bindingExpressionAstForParse } from '../out/template/expression-parse-projection.js';
import {
  bindingSourceEnvironmentSelectionForTemplateExpressionParseAtOffset,
  resourceLocalEffectiveTemplateExpressionParses,
  RuntimeBindingSourceEnvironmentSelectionKind,
  runtimeExpressionBindingsForTemplateExpressionParse,
} from '../out/template/template-expression-selection.js';

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
const expressionResourceLifecycle = await readExpressionResourceLifecycleProjection();
failures.push(...expressionResourceLifecycle.failures);

if (rawCompletion.answer.value.candidates.some((candidate) => candidate.name === 'title')) {
  failures.push('Raw child interpolation should not complete state-only selectedTask.title.');
}
if (rawCompletion.answer.closure !== 'open') {
  failures.push(`Raw child interpolation should report open closure for missing semantic inputs; got ${rawCompletion.answer.closure}.`);
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
if (stateCompletion.answer.closure !== 'complete') {
  failures.push(`State-bound child interpolation should report complete closure; got ${stateCompletion.answer.closure}.`);
}

const summary = {
  raw: completionSummary(rawCompletion),
  state: completionSummary(stateCompletion),
  expressionResourceLifecycle: expressionResourceLifecycle.summary,
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
    closure: completion.answer.closure,
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

async function readExpressionResourceLifecycleProjection() {
  const lifecycleFixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-expression-resource-combinators');
  const lifecycleTemplatePath = path.join(lifecycleFixtureRoot, 'src/resource-combinator-gallery.html');
  const lifecycleTemplateText = fs.readFileSync(lifecycleTemplatePath, 'utf8');
  const runtime = await createSemanticRuntime({
    workspaceRoot: lifecycleFixtureRoot,
    storeKey: 'contract:template-completion-source-scope:expression-resource-lifecycle',
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-observation',
  });
  const resource = app.emission.templates.resources.find((candidate) =>
    candidate.compilation.definition.name === 'resource-combinator-gallery'
  ) ?? null;
  const probeFailures = [];
  if (resource == null) {
    return {
      failures: ['Expected expression-resource fixture to compile resource-combinator-gallery.'],
      summary: { resource: null },
    };
  }

  const interpolationMarker =
    'title="before-${item.label | identityValue}-middle-${count | missingInterpolationConverter}-after-${item.label | identityValue}-plain-${item.id}-literal-${42}"';
  const markerOffset = lifecycleTemplateText.indexOf(interpolationMarker);
  const firstLabelOffset = lifecycleTemplateText.indexOf('label', markerOffset);
  const secondLabelOffset = lifecycleTemplateText.indexOf('label', firstLabelOffset + 1);
  const literalOffset = lifecycleTemplateText.indexOf('42', secondLabelOffset);
  if (markerOffset < 0 || firstLabelOffset < 0 || secondLabelOffset < 0 || literalOffset < 0) {
    return {
      failures: ['Expected the later-part interpolation lifecycle marker, both label occurrences, and literal hole.'],
      summary: { markerOffset, firstLabelOffset, secondLabelOffset, literalOffset },
    };
  }

  const cursorOffset = secondLabelOffset + 1;
  const parse = resourceLocalEffectiveTemplateExpressionParses(runtime.workspace.store, resource)
    .find((candidate) => {
      const source = sourceSpanAddressForAddress(runtime.workspace.store, candidate.sourceAddressHandle);
      return source != null && source.start <= cursorOffset && cursorOffset <= source.end;
    }) ?? null;
  if (parse == null) {
    return {
      failures: ['Expected the later-part interpolation cursor to resolve to its aggregate parse product.'],
      summary: { parse: null, cursorOffset },
    };
  }

  const selection = bindingSourceEnvironmentSelectionForTemplateExpressionParseAtOffset(
    runtime.workspace.store,
    resource,
    parse,
    cursorOffset,
  );
  if (selection.kind !== RuntimeBindingSourceEnvironmentSelectionKind.Context) {
    probeFailures.push(`Expected the later interpolation part to retain a closed source environment; got ${selection.kind}.`);
  } else if (selection.sourceProjection == null) {
    probeFailures.push('Expected the later interpolation part cursor to retain its lifecycle source projection.');
  } else {
    if (selection.sourceProjection.expressionProductHandle !== parse.productHandle) {
      probeFailures.push('Cursor source projection lost the exact interpolation parse product handle.');
    }
    if (selection.sourceProjection.expressionChainIndex !== 2) {
      probeFailures.push(`Expected cursor source projection chain index 2; got ${selection.sourceProjection.expressionChainIndex}.`);
    }
    if (selection.sourceProjection.expressionResourcePlan !== resource.runtimeAnalysis.expressionResourcePlan) {
      probeFailures.push('Cursor source projection did not retain the resource runtime-analysis plan authority.');
    }
    if (selection.sourceProjection.sourceEvaluationReachability !== RuntimeOperationReachability.BlockedByBindFailure) {
      probeFailures.push(
        `Expected later interpolation cursor reachability ${RuntimeOperationReachability.BlockedByBindFailure}; `
        + `got ${selection.sourceProjection.sourceEvaluationReachability}.`,
      );
    }
  }

  const literalSelection = bindingSourceEnvironmentSelectionForTemplateExpressionParseAtOffset(
    runtime.workspace.store,
    resource,
    parse,
    literalOffset,
  );
  if (literalSelection.kind !== RuntimeBindingSourceEnvironmentSelectionKind.Context) {
    probeFailures.push(`Expected the literal interpolation part to retain a closed source environment; got ${literalSelection.kind}.`);
  } else if (literalSelection.sourceProjection == null) {
    probeFailures.push('Expected the literal interpolation part cursor to retain its lifecycle source projection.');
  } else {
    if (literalSelection.sourceProjection.expressionChainIndex !== 4) {
      probeFailures.push(
        `Expected literal-only cursor source projection chain index 4; got ${literalSelection.sourceProjection.expressionChainIndex}.`,
      );
    }
    if (literalSelection.sourceProjection.sourceEvaluationReachability !== RuntimeOperationReachability.BlockedByBindFailure) {
      probeFailures.push(
        `Expected literal-only cursor reachability ${RuntimeOperationReachability.BlockedByBindFailure}; `
        + `got ${literalSelection.sourceProjection.sourceEvaluationReachability}.`,
      );
    }
  }

  const expression = bindingExpressionAstForParse(parse);
  const bindings = runtimeExpressionBindingsForTemplateExpressionParse(resource, parse);
  const binding = bindings[0] ?? null;
  let openProjections = [];
  if (expression == null || binding == null) {
    probeFailures.push('Expected interpolation parse and its rendered binding for open-projection conservation.');
  } else {
    const projector = new RuntimeBindingSourceExpressionContextProjector(
      resource.runtimeAnalysis.runtimeRendering,
      { scopeForBinding: () => null },
      resource.runtimeAnalysis.scopes.bindingExpressionScopes,
      resource.runtimeAnalysis.expressionResourcePlan,
    );
    openProjections = projector.projectSourceExpressions({
      binding,
      expressionProductHandle: parse.productHandle,
      expressionChainIndex: null,
      expression,
      localKey: 'contract:template-completion-source-scope:open-interpolation',
    });
    if (openProjections.length !== 5) {
      probeFailures.push(`Expected five open projections for five authored interpolation parts; got ${openProjections.length}.`);
    }
    const expectedReachability = [
      RuntimeOperationReachability.Reached,
      RuntimeOperationReachability.BlockedByBindFailure,
      RuntimeOperationReachability.BlockedByBindFailure,
      RuntimeOperationReachability.BlockedByBindFailure,
      RuntimeOperationReachability.BlockedByBindFailure,
    ];
    openProjections.forEach((projection, index) => {
      if (projection.kind !== RuntimeBindingSourceExpressionProjectionKind.Open) {
        probeFailures.push(`Expected interpolation part ${index} to remain an open projection when its Scope is absent.`);
        return;
      }
      if (projection.expressionProductHandle !== parse.productHandle
        || projection.expressionChainIndex !== index
        || projection.expressionResourcePlan !== resource.runtimeAnalysis.expressionResourcePlan) {
        probeFailures.push(`Open interpolation part ${index} lost its parse, chain, or plan identity.`);
      }
      if (projection.sourceEvaluationReachability !== expectedReachability[index]) {
        probeFailures.push(
          `Expected open interpolation part ${index} reachability ${expectedReachability[index]}; `
          + `got ${projection.sourceEvaluationReachability}.`,
        );
      }
    });
  }

  return {
    failures: probeFailures,
    summary: {
      cursorOffset,
      selectionKind: selection.kind,
      cursorChainIndex: selection.kind === RuntimeBindingSourceEnvironmentSelectionKind.Context
        ? selection.sourceProjection?.expressionChainIndex ?? null
        : null,
      cursorReachability: selection.kind === RuntimeBindingSourceEnvironmentSelectionKind.Context
        ? selection.sourceProjection?.sourceEvaluationReachability ?? null
        : null,
      literalCursorChainIndex: literalSelection.kind === RuntimeBindingSourceEnvironmentSelectionKind.Context
        ? literalSelection.sourceProjection?.expressionChainIndex ?? null
        : null,
      literalCursorReachability: literalSelection.kind === RuntimeBindingSourceEnvironmentSelectionKind.Context
        ? literalSelection.sourceProjection?.sourceEvaluationReachability ?? null
        : null,
      openProjections: openProjections.map((projection) => ({
        kind: projection.kind,
        expressionChainIndex: projection.expressionChainIndex,
        sourceEvaluationReachability: projection.sourceEvaluationReachability,
      })),
    },
  };
}
