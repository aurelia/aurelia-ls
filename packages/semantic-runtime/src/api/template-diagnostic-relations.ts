import {
  BindingScopeCreatorKind,
  type BindingScope,
} from '../configuration/scope.js';
import { ExpressionParseResultInspector } from '../expression/parse-result-inspection.js';
import type { SourceSpan } from '../expression/source-span.js';
import type { FrameworkCapabilityDemand } from '../framework/capability-demand.js';
import type { IdentityHandle, ProductHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { RuntimeBindingDataFlow } from '../observation/runtime-binding-observation.js';
import {
  IteratorBindingScopeEffect,
} from '../template/runtime-binding.js';
import {
  RuntimeBindingBehaviorIssueKind,
  type RuntimeBindingBehaviorApplication,
  type RuntimeBindingBehaviorIssue,
} from '../template/runtime-binding-behavior.js';
import {
  RuntimeBindingScopeIssueKind,
  type RuntimeBindingScopeIssue,
} from '../template/runtime-binding-scope-issue.js';
import {
  RuntimeValueConverterIssueKind,
  type RuntimeValueConverterApplication,
  type RuntimeValueConverterIssue,
} from '../template/runtime-value-converter.js';
import type { TemplateResourceRuntimeAnalysisEmission } from '../template/template-compilation-project-pass.js';
import {
  bindingScopeForTemplateExpressionParse,
} from '../template/template-expression-selection.js';
import type { TemplateExpressionParse } from '../template/value-site.js';
import { SemanticDiagnosticRelationKind } from './contracts.js';

export interface TemplateDiagnosticRelationOrigin {
  readonly relationKind: SemanticDiagnosticRelationKind;
  readonly relatedDiagnosticIdentityHandle: IdentityHandle;
}

interface RepeatSourceIssueOrigin {
  readonly issue: RuntimeBindingScopeIssue;
  readonly effect: IteratorBindingScopeEffect;
}

/**
 * Spends retained binding/effect/scope relationships to connect derived diagnostics to repeat source failures.
 *
 * The iterator effect is the shared authority: data flow reaches it through the runtime binding, while expression
 * diagnostics reach it through the materialized Scope creator that introduced the repeat local.
 */
export class TemplateDiagnosticRelations {
  private readonly repeatSourceIssueByEffect = new Map<ProductHandle, RepeatSourceIssueOrigin>();
  private readonly repeatSourceIssueByBinding = new Map<ProductHandle, RepeatSourceIssueOrigin>();
  private readonly capabilityDemandByApplication = new Map<ProductHandle, FrameworkCapabilityDemand | null>();
  private readonly capabilityDemandByFailedBindingExpression = new Map<string, FrameworkCapabilityDemand | null>();
  private readonly bindingBehaviorApplicationByProduct = new Map<ProductHandle, RuntimeBindingBehaviorApplication>();
  private readonly valueConverterApplicationByProduct = new Map<ProductHandle, RuntimeValueConverterApplication>();

  constructor(
    private readonly store: KernelStore,
    private readonly resource: TemplateResourceRuntimeAnalysisEmission,
    capabilityDemands: readonly FrameworkCapabilityDemand[],
  ) {
    const effects = new Map(resource.runtimeAnalysis.runtimeRendering.scopeEffects
      .filter((effect): effect is IteratorBindingScopeEffect => effect instanceof IteratorBindingScopeEffect)
      .map((effect) => [effect.productHandle, effect] as const));
    for (const issue of resource.runtimeAnalysis.scopes.scopeIssues) {
      if (issue.issueKind !== RuntimeBindingScopeIssueKind.RepeatNonIterable) {
        continue;
      }
      const effect = effects.get(issue.ownerProductHandle) ?? null;
      if (effect == null) {
        continue;
      }
      const origin = { issue, effect };
      this.repeatSourceIssueByEffect.set(effect.productHandle, origin);
      if (effect.binding.productHandle != null) {
        this.repeatSourceIssueByBinding.set(effect.binding.productHandle, origin);
      }
    }
    for (const demand of capabilityDemands) {
      for (const claimHandle of store.readClaimsForSubject(demand.productHandle)) {
        const claim = store.read(claimHandle);
        if (
          claim?.kind !== 'semantic-claim'
          || claim.predicateKey
            !== KernelVocabulary.Framework.CapabilityDemandHasExpressionResourceApplication.key
        ) {
          continue;
        }
        setUniqueMapValue(
          this.capabilityDemandByApplication,
          claim.objectHandle as ProductHandle,
          demand,
        );
      }
    }
    for (const application of resource.runtimeAnalysis.bindingBehavior.applications) {
      this.bindingBehaviorApplicationByProduct.set(application.productHandle, application);
    }
    for (const application of resource.runtimeAnalysis.valueConverter.applications) {
      this.valueConverterApplicationByProduct.set(application.productHandle, application);
    }
    for (const issue of resource.runtimeAnalysis.bindingBehavior.issues) {
      if (issue.issueKind !== RuntimeBindingBehaviorIssueKind.ResourceNotFound) {
        continue;
      }
      const demand = this.capabilityDemandForBindingBehaviorIssue(issue);
      const application = this.bindingBehaviorApplicationForIssue(issue);
      if (demand != null && application != null) {
        this.recordFailedBindingExpression(application, demand);
      }
    }
    for (const issue of resource.runtimeAnalysis.valueConverter.issues) {
      if (issue.issueKind !== RuntimeValueConverterIssueKind.ResourceNotFound) {
        continue;
      }
      const demand = this.capabilityDemandForValueConverterIssue(issue);
      const application = this.valueConverterApplicationForIssue(issue);
      if (demand != null && application != null) {
        this.recordFailedBindingExpression(application, demand);
      }
    }
  }

  forBindingDataFlow(
    dataFlow: RuntimeBindingDataFlow,
  ): TemplateDiagnosticRelationOrigin | null {
    const bindingProductHandle = dataFlow.binding.productHandle;
    const origin = bindingProductHandle == null
      ? null
      : this.repeatSourceIssueByBinding.get(bindingProductHandle) ?? null;
    if (origin != null) {
      return {
        relationKind: SemanticDiagnosticRelationKind.SameOperationEvidence,
        relatedDiagnosticIdentityHandle: origin.issue.identityHandle,
      };
    }
    const capabilityDemand = bindingProductHandle == null || dataFlow.expressionProductHandle == null
      ? null
      : this.capabilityDemandByFailedBindingExpression.get(
          bindingExpressionKey(bindingProductHandle, dataFlow.expressionProductHandle),
        ) ?? null;
    return capabilityDemand == null
      ? null
      : {
        relationKind: SemanticDiagnosticRelationKind.DerivedConsequence,
        relatedDiagnosticIdentityHandle: capabilityDemand.identityHandle,
      };
  }

  forBindingBehaviorIssue(
    issue: RuntimeBindingBehaviorIssue,
  ): TemplateDiagnosticRelationOrigin | null {
    if (issue.issueKind !== RuntimeBindingBehaviorIssueKind.ResourceNotFound) {
      return null;
    }
    const demand = this.capabilityDemandForBindingBehaviorIssue(issue);
    return demand == null
      ? null
      : {
        relationKind: SemanticDiagnosticRelationKind.DerivedConsequence,
        relatedDiagnosticIdentityHandle: demand.identityHandle,
      };
  }

  forValueConverterIssue(
    issue: RuntimeValueConverterIssue,
  ): TemplateDiagnosticRelationOrigin | null {
    if (issue.issueKind !== RuntimeValueConverterIssueKind.ResourceNotFound) {
      return null;
    }
    const demand = this.capabilityDemandForValueConverterIssue(issue);
    return demand == null
      ? null
      : {
        relationKind: SemanticDiagnosticRelationKind.DerivedConsequence,
        relatedDiagnosticIdentityHandle: demand.identityHandle,
      };
  }

  forExpressionSubject(
    parse: TemplateExpressionParse,
    subjectSpan: SourceSpan,
  ): TemplateDiagnosticRelationOrigin | null {
    const scope = bindingScopeForTemplateExpressionParse(this.resource, parse);
    if (scope == null) {
      return null;
    }
    const origins = new Map<ProductHandle, RepeatSourceIssueOrigin>();
    for (const access of ExpressionParseResultInspector.scopeAccesses(parse.result)) {
      if (access.span.start < subjectSpan.start || subjectSpan.end < access.span.end) {
        continue;
      }
      const located = scope.locate(access.name.name, access.ancestor);
      const origin = located.scope == null
        ? null
        : this.repeatSourceIssueForSlot(located.scope, access.name.name);
      if (origin != null) {
        origins.set(origin.issue.productHandle, origin);
      }
    }
    const origin = origins.size === 1 ? origins.values().next().value ?? null : null;
    return origin == null
      ? null
      : {
        relationKind: SemanticDiagnosticRelationKind.DerivedConsequence,
        relatedDiagnosticIdentityHandle: origin.issue.identityHandle,
      };
  }

  private capabilityDemandForBindingBehaviorIssue(
    issue: RuntimeBindingBehaviorIssue,
  ): FrameworkCapabilityDemand | null {
    return issue.application.productHandle == null
      ? null
      : this.capabilityDemandByApplication.get(issue.application.productHandle) ?? null;
  }

  private capabilityDemandForValueConverterIssue(
    issue: RuntimeValueConverterIssue,
  ): FrameworkCapabilityDemand | null {
    return issue.application.productHandle == null
      ? null
      : this.capabilityDemandByApplication.get(issue.application.productHandle) ?? null;
  }

  private bindingBehaviorApplicationForIssue(
    issue: RuntimeBindingBehaviorIssue,
  ): RuntimeBindingBehaviorApplication | null {
    return issue.application.productHandle == null
      ? null
      : this.bindingBehaviorApplicationByProduct.get(issue.application.productHandle) ?? null;
  }

  private valueConverterApplicationForIssue(
    issue: RuntimeValueConverterIssue,
  ): RuntimeValueConverterApplication | null {
    return issue.application.productHandle == null
      ? null
      : this.valueConverterApplicationByProduct.get(issue.application.productHandle) ?? null;
  }

  private recordFailedBindingExpression(
    application: RuntimeBindingBehaviorApplication | RuntimeValueConverterApplication,
    demand: FrameworkCapabilityDemand,
  ): void {
    const bindingProductHandle = application.binding.productHandle;
    if (bindingProductHandle == null) {
      return;
    }
    setUniqueMapValue(
      this.capabilityDemandByFailedBindingExpression,
      bindingExpressionKey(bindingProductHandle, application.expressionProductHandle),
      demand,
    );
  }

  private repeatSourceIssueForSlot(
    scope: BindingScope,
    slotName: string,
  ): RepeatSourceIssueOrigin | null {
    let current: BindingScope | null = scope;
    while (current != null) {
      const creators = current.scopeCreators.filter((creator) =>
        creator.introducedSlotNames.includes(slotName)
        || creator.assignedSlotNames.includes(slotName)
      );
      if (creators.length === 0) {
        current = current.predecessor;
        continue;
      }
      if (creators.length !== 1) {
        return null;
      }
      const creator = creators[0]!;
      if (
        creator.creatorKind !== BindingScopeCreatorKind.RuntimeBindingScopeEffect
        || !creator.introducedSlotNames.includes(slotName)
      ) {
        return null;
      }
      return this.repeatSourceIssueByEffect.get(creator.productHandle) ?? null;
    }
    return null;
  }
}

function bindingExpressionKey(
  bindingProductHandle: ProductHandle,
  expressionProductHandle: ProductHandle,
): string {
  return `${bindingProductHandle}:${expressionProductHandle}`;
}

function setUniqueMapValue<TKey, TValue>(
  map: Map<TKey, TValue | null>,
  key: TKey,
  value: TValue,
): void {
  map.set(key, map.has(key) ? null : value);
}
