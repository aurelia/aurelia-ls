import {
  BindingScopeCreatorKind,
  type BindingScope,
} from '../configuration/scope.js';
import { ExpressionParseResultInspector } from '../expression/parse-result-inspection.js';
import type { SourceSpan } from '../expression/source-span.js';
import type { ProductHandle } from '../kernel/handles.js';
import type { RuntimeBindingDataFlow } from '../observation/runtime-binding-observation.js';
import {
  IteratorBindingScopeEffect,
} from '../template/runtime-binding.js';
import {
  RuntimeBindingScopeIssueKind,
  type RuntimeBindingScopeIssue,
} from '../template/runtime-binding-scope-issue.js';
import type { TemplateResourceRuntimeAnalysisEmission } from '../template/template-compilation-project-pass.js';
import {
  bindingScopeForTemplateExpressionParse,
} from '../template/template-expression-selection.js';
import type { TemplateExpressionParse } from '../template/value-site.js';
import { SemanticDiagnosticRelationKind } from './contracts.js';

export interface TemplateDiagnosticRelationOrigin {
  readonly relationKind: SemanticDiagnosticRelationKind;
  readonly issue: RuntimeBindingScopeIssue;
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

  constructor(
    private readonly resource: TemplateResourceRuntimeAnalysisEmission,
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
  }

  forBindingDataFlow(
    dataFlow: RuntimeBindingDataFlow,
  ): TemplateDiagnosticRelationOrigin | null {
    const bindingProductHandle = dataFlow.binding.productHandle;
    const origin = bindingProductHandle == null
      ? null
      : this.repeatSourceIssueByBinding.get(bindingProductHandle) ?? null;
    return origin == null
      ? null
      : {
        relationKind: SemanticDiagnosticRelationKind.SameOperationEvidence,
        issue: origin.issue,
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
        issue: origin.issue,
      };
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
