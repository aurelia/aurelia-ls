import {
  BindingScopeCreatorKind,
  type BindingScope,
} from '../configuration/scope.js';
import { ConfigurationProductDetails } from '../configuration/product-details.js';
import type { ExpressionAstNode } from '../expression/ast.js';
import { ExpressionParseResultInspector, type ExpressionScopeAccess } from '../expression/parse-result-inspection.js';
import type { SourceSpan } from '../expression/source-span.js';
import { FrameworkCapabilityAdmissionState, type FrameworkCapabilityDemand } from '../framework/capability-demand.js';
import { capabilityForBuiltInSyntaxGroup } from '../framework/capability-demand-materializer.js';
import type { IdentityHandle, ProductHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import { sourceSpanAddressForAddress } from '../kernel/source-address.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { RuntimeBindingDataFlow } from '../observation/runtime-binding-observation.js';
import type { AttributeSyntax } from '../template/attribute-syntax.js';
import { findUniqueBuiltInBindingCommandByName, parseBuiltInAttributeSyntax } from '../template/built-in-syntax.js';
import {
  IteratorBindingScopeEffect,
  LetBindingScopeEffect,
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
  runtimeExpressionAccessUsesForTemplateExpression,
} from '../template/template-expression-selection.js';
import type { TemplateExpressionParse } from '../template/value-site.js';
import {
  RuntimeExpressionAccessForm,
  type RuntimeExpressionAccessUse,
} from '../runtime-expression/runtime-expression-access-use.js';
import { TemplateProductDetails } from '../template/product-details.js';
import { bindingExpressionAstForParse } from '../template/expression-parse-projection.js';
import { HydrateTemplateControllerInstruction } from '../template/instruction-ir.js';
import { BuiltInTemplateControllerName, frameworkTemplateControllerSemanticsForInstruction } from '../template/template-controller-semantics.js';
import { templateControllerValueExpressionProductHandle } from '../template/template-controller-value.js';
import { SemanticDiagnosticRelationKind, type SemanticTemplateDiagnosticRow } from './contracts.js';

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
    private readonly capabilityDemands: readonly FrameworkCapabilityDemand[],
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

  forUnknownBindingCommand(syntax: AttributeSyntax): TemplateDiagnosticRelationOrigin | null {
    if (syntax.command == null) return null;
    let group = findUniqueBuiltInBindingCommandByName(syntax.command)?.group;
    if (group == null) {
      // The admitted dot pattern may read e.g. "dispatch:main" as the command.
      // Only a known pattern that would produce a real command can explain that failure.
      const known = parseBuiltInAttributeSyntax(syntax.runtimeRawName, syntax.rawValue);
      const name = known.execution.command;
      if (name == null || name === syntax.command || findUniqueBuiltInBindingCommandByName(name) == null) return null;
      group = known.handler?.group;
    }
    const capability = group == null ? null : capabilityForBuiltInSyntaxGroup(group);
    if (capability == null) return null;
    const demand = this.capabilityDemands.find(candidate =>
      candidate.ownerIdentityHandle === syntax.identityHandle
      && candidate.requiredCapability === capability.requiredCapability
      && (candidate.admissionState === FrameworkCapabilityAdmissionState.NotAdmitted
        || candidate.admissionState === FrameworkCapabilityAdmissionState.ConfiguredOut));
    return demand == null ? null : {
      relationKind: SemanticDiagnosticRelationKind.DerivedConsequence,
      relatedDiagnosticIdentityHandle: demand.identityHandle,
    };
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

  /** The checker and runtime may report the same failed application in a chain. */
  forExpressionResourceFailure(dataFlow: RuntimeBindingDataFlow): TemplateDiagnosticRelationOrigin | null {
    const node = dataFlow.sourceTypeOpenExpression;
    if (node?.$kind !== 'ValueConverter' && node?.$kind !== 'BindingBehavior') return null;
    const matches = node.$kind === 'ValueConverter'
      ? this.resource.runtimeAnalysis.valueConverter.issues.filter(issue =>
        issue.issueKind === RuntimeValueConverterIssueKind.ResourceNotFound && issue.application.converterName === node.name.name)
      : this.resource.runtimeAnalysis.bindingBehavior.issues.filter(issue =>
        issue.issueKind === RuntimeBindingBehaviorIssueKind.ResourceNotFound && issue.application.behaviorName === node.name.name);
    const site = matches.filter(issue => {
      const address = sourceSpanAddressForAddress(this.store, issue.sourceAddressHandle);
      return dataFlow.binding.productHandle != null && issue.binding.productHandle === dataFlow.binding.productHandle
        && address?.start === node.name.span.start && address.end === node.name.span.end;
    });
    if (site.length !== 1) return null;
    const issue = site[0]!;
    const demand = issue.application.productHandle == null ? null : this.capabilityDemandByApplication.get(issue.application.productHandle);
    return demand == null
      ? { relationKind: SemanticDiagnosticRelationKind.SameOperationEvidence, relatedDiagnosticIdentityHandle: issue.identityHandle }
      : { relationKind: SemanticDiagnosticRelationKind.DerivedConsequence, relatedDiagnosticIdentityHandle: demand.identityHandle };
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
    const accessUses = runtimeExpressionAccessUsesForTemplateExpression(
      this.resource,
      parse.productHandle,
    );
    const origins = new Map<ProductHandle, RepeatSourceIssueOrigin>();
    for (const access of ExpressionParseResultInspector.scopeAccesses(parse.result)) {
      if (access.span.start < subjectSpan.start || subjectSpan.end < access.span.end) {
        continue;
      }
      for (const accessUse of accessUses) {
        if (
          accessUse.lexicalLocal
          || !runtimeExpressionAccessUseMatchesScopeAccess(this.store, accessUse, access.name.span)
        ) {
          continue;
        }
        for (const target of accessUse.targetLinks) {
          if (target.authorityProductHandle == null) {
            continue;
          }
          for (const scope of this.scopesForContextAuthority(target.authorityProductHandle)) {
            const origin = this.repeatSourceIssueForSlot(scope, access.name.name);
            if (origin != null) {
              origins.set(origin.issue.productHandle, origin);
            }
          }
        }
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

  /** The authored binding that supplied an otherwise untyped local, or an unresolved with-context root. */
  scopeProducerForAccess(
    scopeHandle: ProductHandle | null,
    access: ExpressionScopeAccess | null,
    missingRoot: boolean,
  ): IdentityHandle | null {
    if (scopeHandle == null || access == null) return null;
    let scope: BindingScope | null = this.store.productDetails.read(ConfigurationProductDetails.BindingScope, scopeHandle);
    for (let depth = access.ancestor; scope != null && depth > 0; depth--) scope = scope.runtimeParent;
    while (scope != null) {
      const slot = scope.overrideContext.lookup(access.name.name) ?? scope.bindingContext.lookup(access.name.name);
      for (let state: BindingScope | null = scope; state != null; state = state.predecessor) {
        for (const creator of state.scopeCreators) {
          if (creator.assignedSlotNames.includes(access.name.name)) return null;
          if (slot != null && creator.creatorKind === BindingScopeCreatorKind.RuntimeBindingScopeEffect) {
            const effect = this.store.productDetails.read(TemplateProductDetails.RuntimeBindingScopeEffect, creator.productHandle);
            if (effect instanceof LetBindingScopeEffect && effect.target === slot.name
              && slot.sourceAddressHandle === (effect.targetSourceAddressHandle ?? effect.sourceAddressHandle)) {
              return this.directScopeProducer(effect.expressionProductHandle);
            }
            if (effect instanceof IteratorBindingScopeEffect && creator.introducedSlotNames.includes(slot.name)) {
              return this.directScopeProducer(effect.iterableExpressionProductHandle);
            }
          }
          if (missingRoot && slot == null && creator.creatorKind === BindingScopeCreatorKind.TemplateControllerValueScope
            && state.bindingContext.contextType == null) {
            const instruction = this.store.productDetails.read(TemplateProductDetails.Instruction, creator.productHandle);
            if (instruction instanceof HydrateTemplateControllerInstruction
              && frameworkTemplateControllerSemanticsForInstruction(this.store, instruction)?.controllerName === BuiltInTemplateControllerName.With) {
              return this.directScopeProducer(templateControllerValueExpressionProductHandle(this.store, instruction));
            }
          }
          if (creator.introducedSlotNames.includes(access.name.name)) return null;
        }
      }
      if (slot != null || scope.isBoundary || access.ancestor > 0) return null;
      scope = scope.runtimeParent;
    }
    return null;
  }

  private directScopeProducer(handle: ProductHandle | null): IdentityHandle | null {
    if (handle == null) return null;
    const parse = this.store.productDetails.read(TemplateProductDetails.ExpressionParse, handle);
    const ast = parse == null ? null : bindingExpressionAstForParse(parse);
    // A fallback, conditional, or callback can produce a value independently of a missing root in its operand.
    const access = directReceiverRoot(ast);
    return access == null ? null : this.store.readProduct(handle)?.identityHandle ?? null;
  }

  private scopesForContextAuthority(
    authorityProductHandle: ProductHandle,
  ): readonly BindingScope[] {
    return this.resource.runtimeAnalysis.scopes.readScopes().filter((scope) =>
      scope.bindingContext.productHandle === authorityProductHandle
      || scope.overrideContext.productHandle === authorityProductHandle
    );
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

function runtimeExpressionAccessUseMatchesScopeAccess(
  store: KernelStore,
  accessUse: RuntimeExpressionAccessUse,
  nameSpan: SourceSpan,
): boolean {
  if (
    accessUse.accessForm !== RuntimeExpressionAccessForm.Scope
    && accessUse.accessForm !== RuntimeExpressionAccessForm.ScopeCall
  ) {
    return false;
  }
  const source = sourceSpanAddressForAddress(store, accessUse.nameSourceAddressHandle);
  return source != null
    && source.start === nameSpan.start
    && source.end === nameSpan.end;
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

/** Follow the receiver only. Roots used in call arguments or computed keys do not establish its identity. */
export function directReceiverRoot(node: ExpressionAstNode | null): ExpressionScopeAccess | null {
  while (node?.$kind === 'Paren' || node?.$kind === 'AccessMember'
    || (node?.$kind === 'AccessKeyed' && node.key.$kind === 'PrimitiveLiteral')) {
    node = node.$kind === 'Paren' ? node.expression : node.object;
  }
  return node?.$kind === 'AccessScope' ? node : null;
}

/** Promote a relation only when the actual admitted rows prove one unambiguous missing producer. */
export function relateScopeProducerFailures(
  rows: readonly SemanticTemplateDiagnosticRow[],
  producers: ReadonlyMap<SemanticTemplateDiagnosticRow, IdentityHandle>,
): readonly SemanticTemplateDiagnosticRow[] {
  if (producers.size === 0) return rows;
  const byIdentity = new Map<IdentityHandle, SemanticTemplateDiagnosticRow | null>();
  for (const row of rows) {
    if (row.diagnosticIdentityHandle != null) setUniqueMapValue(byIdentity, row.diagnosticIdentityHandle, row);
  }
  return rows.map(row => {
    if (!producers.has(row)) return row;
    let current = row;
    let root: SemanticTemplateDiagnosticRow | null = null;
    const visited = new Set<SemanticTemplateDiagnosticRow>([row]);
    while (true) {
      const target = producers.get(current);
      if (target == null) break;
      const cause = byIdentity.get(target);
      if (cause == null) break;
      if (cause.diagnosticKind === 'missing-expression-member') root = cause;
      else if (cause.diagnosticKind !== 'weak-expression-member-owner'
        || !cause.missingInputs.includes('expression-member-owner-type:missing-slot-type')) break;
      if (visited.has(cause)) return row;
      visited.add(cause);
      current = cause;
    }
    if (root?.diagnosticIdentityHandle == null) return row;
    return {
      ...row,
      suggestion: null,
      diagnosticRelations: [{
        relationKind: SemanticDiagnosticRelationKind.DerivedConsequence,
        relatedDiagnosticIdentityHandle: root.diagnosticIdentityHandle,
      }],
    };
  });
}
