import {
  ExpectedSemanticEffect,
  ExpectedSemanticEffectFilter,
} from './expected-effect.js';
import {
  BuiltInTemplateControllerChildViewCardinality,
  BuiltInTemplateControllerFlowKind,
} from '../template/template-controller-semantics.js';

/** Expected runtime-controller row for a built-in template-controller hydration handoff. */
export function templateControllerRuntimeEffect(
  summary: string,
  flowKind: BuiltInTemplateControllerFlowKind | `${BuiltInTemplateControllerFlowKind}`,
  childViewCardinality: BuiltInTemplateControllerChildViewCardinality | `${BuiltInTemplateControllerChildViewCardinality}`,
): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureFact(summary, 'runtime-controller', 'template', 'template-controller', 'present', null, [
    new ExpectedSemanticEffectFilter('creationKind', 'template-controller'),
    new ExpectedSemanticEffectFilter('templateControllerFlowKind', flowKind),
    new ExpectedSemanticEffectFilter('childViewCardinality', childViewCardinality),
    new ExpectedSemanticEffectFilter('childViewRenderingState', 'expanded-aggregate'),
    new ExpectedSemanticEffectFilter('hydrationHandoffKind', 'instruction-sequence'),
  ]);
}

/** Expected runtime-controller row for the synthetic view created by a template-controller view factory. */
export function syntheticViewRuntimeEffect(
  summary: string,
  flowKind: BuiltInTemplateControllerFlowKind | `${BuiltInTemplateControllerFlowKind}`,
  childViewCardinality: BuiltInTemplateControllerChildViewCardinality | `${BuiltInTemplateControllerChildViewCardinality}`,
): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureFact(summary, 'runtime-controller', 'template', 'template-controller', 'present', null, [
    new ExpectedSemanticEffectFilter('creationKind', 'synthetic-view'),
    new ExpectedSemanticEffectFilter('templateControllerFlowKind', flowKind),
    new ExpectedSemanticEffectFilter('childViewCardinality', childViewCardinality),
    new ExpectedSemanticEffectFilter('childViewRenderingState', 'expanded-aggregate'),
    new ExpectedSemanticEffectFilter('hydrationHandoffKind', 'synthetic-view'),
  ]);
}

/** Expected runtime-controller row for a branch controller linked to its owning template-controller. */
export function linkedTemplateControllerRuntimeEffect(
  summary: string,
  flowKind: BuiltInTemplateControllerFlowKind | `${BuiltInTemplateControllerFlowKind}`,
  childViewCardinality: BuiltInTemplateControllerChildViewCardinality | `${BuiltInTemplateControllerChildViewCardinality}`,
  templateControllerLinkKind: string,
  linkedTemplateControllerName: string,
): ExpectedSemanticEffect {
  return ExpectedSemanticEffect.signatureFact(summary, 'runtime-controller', 'template', 'template-controller', 'present', null, [
    new ExpectedSemanticEffectFilter('creationKind', 'template-controller'),
    new ExpectedSemanticEffectFilter('templateControllerFlowKind', flowKind),
    new ExpectedSemanticEffectFilter('childViewCardinality', childViewCardinality),
    new ExpectedSemanticEffectFilter('childViewRenderingState', 'expanded-aggregate'),
    new ExpectedSemanticEffectFilter('hydrationHandoffKind', 'instruction-sequence'),
    new ExpectedSemanticEffectFilter('templateControllerLinkKind', templateControllerLinkKind),
    new ExpectedSemanticEffectFilter('linkedTemplateControllerName', linkedTemplateControllerName),
  ]);
}

export function promiseTemplateControllerRuntimeEffects(
  summaryPrefix: string,
): readonly ExpectedSemanticEffect[] {
  return [
    templateControllerRuntimeEffect(
      `${summaryPrefix} promise owner template-controller row.`,
      BuiltInTemplateControllerFlowKind.Promise,
      BuiltInTemplateControllerChildViewCardinality.Single,
    ),
    syntheticViewRuntimeEffect(
      `${summaryPrefix} promise owner synthetic-view row.`,
      BuiltInTemplateControllerFlowKind.Promise,
      BuiltInTemplateControllerChildViewCardinality.Single,
    ),
    promiseBranchTemplateControllerRuntimeEffect(
      `${summaryPrefix} pending branch template-controller row.`,
      BuiltInTemplateControllerFlowKind.PromisePending,
    ),
    syntheticViewRuntimeEffect(
      `${summaryPrefix} pending branch synthetic-view row.`,
      BuiltInTemplateControllerFlowKind.PromisePending,
      BuiltInTemplateControllerChildViewCardinality.Optional,
    ),
    promiseBranchTemplateControllerRuntimeEffect(
      `${summaryPrefix} fulfilled branch template-controller row.`,
      BuiltInTemplateControllerFlowKind.PromiseFulfilled,
    ),
    syntheticViewRuntimeEffect(
      `${summaryPrefix} fulfilled branch synthetic-view row.`,
      BuiltInTemplateControllerFlowKind.PromiseFulfilled,
      BuiltInTemplateControllerChildViewCardinality.Optional,
    ),
    promiseBranchTemplateControllerRuntimeEffect(
      `${summaryPrefix} rejected branch template-controller row.`,
      BuiltInTemplateControllerFlowKind.PromiseRejected,
    ),
    syntheticViewRuntimeEffect(
      `${summaryPrefix} rejected branch synthetic-view row.`,
      BuiltInTemplateControllerFlowKind.PromiseRejected,
      BuiltInTemplateControllerChildViewCardinality.Optional,
    ),
  ];
}

export function switchTemplateControllerRuntimeEffects(
  summaryPrefix: string,
): readonly ExpectedSemanticEffect[] {
  return [
    templateControllerRuntimeEffect(
      `${summaryPrefix} switch owner template-controller row.`,
      BuiltInTemplateControllerFlowKind.Switch,
      BuiltInTemplateControllerChildViewCardinality.Single,
    ),
    syntheticViewRuntimeEffect(
      `${summaryPrefix} switch owner synthetic-view row.`,
      BuiltInTemplateControllerFlowKind.Switch,
      BuiltInTemplateControllerChildViewCardinality.Single,
    ),
    switchCaseTemplateControllerRuntimeEffect(
      `${summaryPrefix} case branch template-controller row.`,
      BuiltInTemplateControllerFlowKind.SwitchCase,
    ),
    syntheticViewRuntimeEffect(
      `${summaryPrefix} case branch synthetic-view row.`,
      BuiltInTemplateControllerFlowKind.SwitchCase,
      BuiltInTemplateControllerChildViewCardinality.Optional,
    ),
    switchCaseTemplateControllerRuntimeEffect(
      `${summaryPrefix} default branch template-controller row.`,
      BuiltInTemplateControllerFlowKind.SwitchDefault,
    ),
    syntheticViewRuntimeEffect(
      `${summaryPrefix} default branch synthetic-view row.`,
      BuiltInTemplateControllerFlowKind.SwitchDefault,
      BuiltInTemplateControllerChildViewCardinality.Optional,
    ),
  ];
}

function promiseBranchTemplateControllerRuntimeEffect(
  summary: string,
  flowKind: BuiltInTemplateControllerFlowKind.PromisePending
    | BuiltInTemplateControllerFlowKind.PromiseFulfilled
    | BuiltInTemplateControllerFlowKind.PromiseRejected,
): ExpectedSemanticEffect {
  return linkedTemplateControllerRuntimeEffect(
    summary,
    flowKind,
    BuiltInTemplateControllerChildViewCardinality.Optional,
    'promise-branch-to-promise',
    'promise',
  );
}

function switchCaseTemplateControllerRuntimeEffect(
  summary: string,
  flowKind: BuiltInTemplateControllerFlowKind.SwitchCase | BuiltInTemplateControllerFlowKind.SwitchDefault,
): ExpectedSemanticEffect {
  return linkedTemplateControllerRuntimeEffect(
    summary,
    flowKind,
    BuiltInTemplateControllerChildViewCardinality.Optional,
    'switch-case-to-switch',
    'switch',
  );
}
