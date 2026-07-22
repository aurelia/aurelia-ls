import path from 'node:path';
import type { ExpressionAstNode } from '../expression/ast.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import type { SourceSpan } from '../expression/source-span.js';
import { TypeScriptDeclarationIdentity } from '../kernel/identity.js';
import {
  stableKernelLocalHash,
  type AddressHandle,
  type ProductHandle,
} from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import type { ProductDetailReadView } from '../kernel/product-details.js';
import {
  BindingContextKind,
  BindingContextSlotAssignmentAccessKind,
  BindingScope,
  BindingScopeConditionPolarity,
  BindingScopeCreatorKind,
  BindingScopeOwnerKind,
  type BindingContextSlot,
  type BindingScopeCreator,
} from '../configuration/scope.js';
import { bindingContextSlotTargetTypeSourceMember } from '../configuration/binding-scope-slot-projector.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  CheckerTypeMemberKind,
  sameCheckerTypeReference,
  type CheckerTypeMember,
  type CheckerTypeReference,
} from '../type-system/type-shape.js';
import { readCheckerTypeShape } from '../type-system/checker-type-shape-access.js';
import {
  checkerMemberValueTypeExpression,
  checkerTypeReferenceTypeExpression,
  moduleSpecifierForGeneratedTypeScriptSource,
} from '../type-system/generated-type-expression.js';
import {
  TypeSystemOverlaySourceBuilder,
  type TypeSystemOverlaySource,
} from '../type-system/overlay.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import type { ValueConverterDefinition } from '../resources/value-converter-definition.js';
import type { ResourceTargetReference } from '../resources/resource-reference.js';
import {
  CheckerStrictTrueComparisonKind,
  readOrProjectCheckerTypeMembersInProjection,
} from '../type-system/checker-type-member-surface.js';
import type { CheckerExpressionTypeWorld } from '../type-system/expression-type-world.js';
import {
  VALUE_CONVERTER_TO_VIEW_METHOD,
  VALUE_CONVERTER_WITH_CONTEXT_PROPERTY,
  valueConverterWithContextComparisonKindFromMembers,
} from '../type-system/value-converter-call-surface.js';
import {
  appendTemplateTypeSystemOverlayScopeBlock,
  TEMPLATE_TYPE_SYSTEM_OVERLAY_PARENT_NAMED_LOOKUP_ALIAS,
  templateTypeSystemOverlayQuotedStringLiteral,
  templateTypeSystemOverlayIdentifierName,
  type TemplateTypeSystemOverlayConditionLayer,
  type TemplateTypeSystemOverlayContextSlotLocal,
  type TemplateTypeSystemOverlayEventMemberType,
  type TemplateTypeSystemOverlayExpressionPart,
  type TemplateTypeSystemOverlayLetEffect,
  type TemplateTypeSystemOverlayRepeatLayer,
  type TemplateTypeSystemOverlayRuntimeAssignmentLocal,
  type TemplateTypeSystemOverlayScopeAlias,
  type TemplateTypeSystemOverlayScopeLayer,
  type TemplateTypeSystemOverlaySourceSlice,
  type TemplateTypeSystemOverlaySwitchCaseLayer,
} from './template-type-system-overlay-plan.js';
import {
  appendTemplateTypeSystemOverlayExpressionProjection,
  TemplateTypeSystemOverlayExpressionProjectionKind,
  TemplateTypeSystemOverlayExpressionProjection,
  TemplateTypeSystemOverlayExpressionProjector,
  TemplateTypeSystemOverlayExpressionUnsupportedKind,
  TemplateTypeSystemOverlayExpressionUnsupportedSyntax,
  TemplateTypeSystemOverlayValueConverterCallerContextKind,
  TemplateTypeSystemOverlayValueConverterCallKind,
  type TemplateTypeSystemOverlayExpressionProjectionContext,
  type TemplateTypeSystemOverlayExpressionScopeAliases,
} from './template-type-system-overlay-expression.js';
import {
  findVisibleTemplateResource,
  readVisibleTemplateResourceDefinition,
} from './compiler-resource-lookup.js';
import {
  IteratorBindingScopeEffect,
  LetBindingScopeEffect,
  LetBindingTargetContext,
  type RuntimeBindingScopeEffect,
} from './runtime-binding.js';
import { TemplateProductDetails } from './product-details.js';
import { readTemplateExpressionParse } from './expression-parse-product.js';
import {
  DispatchBindingInstruction,
  HydrateTemplateControllerInstruction,
  ListenerBindingInstruction,
  PropertyBindingInstruction,
  SetPropertyInstruction,
  TemplateBindingMode,
} from './instruction-ir.js';
import {
  sourceAddressHandleForRuntimeExpressionSpan,
} from './runtime-expression-source-address.js';
import type { TemplateExpressionParse } from './value-site.js';
import type { TemplateResourceRuntimeAnalysisEmission } from './template-compilation-project-pass.js';
import { completedTemplateExpressionAstForParse } from './expression-parse-projection.js';
import {
  BuiltInTemplateControllerFlowKind,
  frameworkTemplateControllerSemanticsForName,
} from './template-controller-semantics.js';
import {
  staticTemplateControllerBooleanProperty,
  templateControllerValueExpressionProductHandle,
  templateControllerValueProperty,
} from './template-controller-value.js';
import { templateControllerSwitchCaseBranch } from './template-controller-switch-branch.js';
import {
  bindingScopesForTemplateExpressionParse,
  bindingBehaviorEvaluationForTemplateExpression,
  RuntimeBindingSourceContextProjectionSelectionKind,
  runtimeExpressionBindingsForTemplateExpressionParse,
  runtimeExpressionBindingsForTemplateExpressionParseInScope,
  runtimeExpressionBindingsForTemplateExpressionProductHandle,
  runtimeExpressionBindingsForTemplateExpressionProductHandleInScope,
  selectRuntimeBindingSourceContextProjection,
  templateInstructionForExpressionParse,
  templateInstructionForProductHandle,
} from './template-expression-selection.js';
import { resourceLocalTemplateExpressionParses } from './runtime-resource-ownership.js';
import {
  templateRepeatScopeCurrentAliasExpression,
  templateScopeAliasSupport,
  templateScopeBindingContextLocalNames,
  templateScopeCanReplaySourceScope,
  templateScopeCreatesCurrentBindingContextAlias,
  templateScopeReplayChain,
  templateScopeSourceReplayRelation,
  templateScopeVisibleSlots,
} from './template-scope-replay.js';
import {
  appendTemplateTypeSystemOverlayPrelude,
  type TemplateTypeSystemOverlayPreludeViewModel,
} from './template-type-system-overlay-prelude.js';
import {
  instructionScopeLookup,
  isRuntimeExpressionBinding,
  type RuntimeExpressionBinding,
} from '../observation/runtime-binding-expression.js';
import {
  RuntimeBindingExpressionScopeProjector,
} from '../observation/runtime-binding-expression-scope.js';
import {
  checkerContextForRuntimeBindingBehaviorArguments,
  RuntimeBindingSourceExpressionContextProjector,
} from '../observation/runtime-binding-source-expression-context.js';
import { CheckerExpressionTypeBindingBehaviorEvaluation } from '../type-system/expression-type-context.js';

export const enum TemplateTypeSystemOverlaySkippedReason {
  /** The component resource lacks an importable view-model declaration for generated overlay code. */
  MissingViewModelIdentity = 'missing-view-model-identity',
  /** A copied expression has no readable authored source slice in the current project epoch. */
  MissingExpressionSource = 'missing-expression-source',
  /** A material template expression has no instruction-owned binding scope to replay. */
  MissingBindingScope = 'missing-binding-scope',
  /** Scope replay encountered a BindingScope owner that has no overlay layer contract yet. */
  UnsupportedScopeOwner = 'unsupported-scope-owner',
  /** A repeated-item scope lacks the iterator scope effect that should have introduced it. */
  MissingRepeatScopeEffect = 'missing-repeat-scope-effect',
  /** A let scope lacks the retained let binding scope effects that should have introduced it. */
  MissingLetScopeEffect = 'missing-let-scope-effect',
  /** A let target cannot be represented as a TypeScript lexical binding. */
  UnsupportedLetTarget = 'unsupported-let-target',
  /** A synthetic-view scope has no representable creator products. */
  MissingSyntheticScopeCreator = 'missing-synthetic-scope-creator',
  /** A template-controller creator lacks the condition/value expression needed for replay. */
  MissingSyntheticScopeCondition = 'missing-synthetic-scope-condition',
  /** A synthetic-view creator is known but does not yet have an overlay layer contract. */
  UnsupportedSyntheticScope = 'unsupported-synthetic-scope',
  /** Expression projection found a known semantic owner that cannot yet emit overlay parts. */
  UnsupportedExpressionSyntax = 'unsupported-expression-syntax',
}

interface SwitchCaseBranchExpressions {
  readonly caseExpressions: readonly (readonly TemplateTypeSystemOverlayExpressionPart[])[];
  readonly excludedCaseExpressions: readonly (readonly TemplateTypeSystemOverlayExpressionPart[])[];
}

export interface TemplateTypeSystemOverlayExpressionProbe {
  readonly localName: string;
  /** Exact authored expression text before Aurelia-specific overlay lowering. */
  readonly authoredExpressionText: string | null;
  /** Generated TypeScript expression text emitted into the overlay. */
  readonly overlayExpressionText: string;
  readonly semanticProductHandle: ProductHandle | null;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly sourceStart: number | null;
  readonly sourceEnd: number | null;
}

export interface TemplateTypeSystemOverlaySkippedExpression {
  readonly reason: TemplateTypeSystemOverlaySkippedReason;
  readonly expressionProductHandle: string | null;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly sourceStart: number | null;
  readonly sourceEnd: number | null;
  readonly summary: string;
}

export class TemplateTypeSystemOverlayEmission {
  constructor(
    readonly overlaySource: TypeSystemOverlaySource | null,
    readonly expressionProbes: readonly TemplateTypeSystemOverlayExpressionProbe[],
    readonly skippedExpressions: readonly TemplateTypeSystemOverlaySkippedExpression[],
  ) {}
}

interface OverlayExpressionSpan {
  readonly span: SourceSpan;
  readonly ast: ExpressionAstNode;
}

type ViewModelImport = TemplateTypeSystemOverlayPreludeViewModel;

interface OverlayTypeExpression {
  readonly typeExpression: string;
}

interface OverlayExpressionSourceProjectors {
  readonly expressionWorld: CheckerExpressionTypeWorld;
  readonly sourceExpressions: RuntimeBindingSourceExpressionContextProjector;
}

/** Mutable build-state for one generated template TypeScript overlay file. */
interface TemplateTypeSystemOverlayBuildFrame {
  readonly resource: TemplateResourceRuntimeAnalysisEmission;
  readonly localKey: string;
  readonly overlayFileName: string;
  readonly builder: TypeSystemOverlaySourceBuilder;
  readonly probes: TemplateTypeSystemOverlayExpressionProbe[];
  readonly skipped: TemplateTypeSystemOverlaySkippedExpression[];
  readonly baseExpressionContext: TemplateTypeSystemOverlayExpressionProjectionContext;
  readonly expressionSourceProjectors: OverlayExpressionSourceProjectors;
}

class TemplateTypeSystemOverlayAliasReplayCursor {
  private currentBindingContextAlias: string | null = '$this';
  private currentOverrideContextLocals: string[] = [];
  private currentParentBindingContextAlias: string | null = null;
  private currentParentNamedLookupAlias: string | null = null;

  parentAlias(): TemplateTypeSystemOverlayScopeAlias | null {
    const bindingContextExpression = this.currentBindingContextAlias;
    const namedLookupExpression = this.currentScopeNamedLookupAlias();
    return bindingContextExpression == null || namedLookupExpression == null
      ? null
      : {
        bindingContextExpression,
        namedLookupExpression,
        parentBindingContextExpression: this.currentParentBindingContextAlias,
        parentNamedLookupExpression: this.currentParentNamedLookupAlias,
      };
  }

  enterBindingContextAlias(alias: string | null, overrideContextLocals: readonly string[] = []): void {
    this.currentParentBindingContextAlias = this.currentBindingContextAlias == null
      ? null
      : '$parent';
    this.currentParentNamedLookupAlias = this.currentScopeNamedLookupAlias() == null
      ? null
      : TEMPLATE_TYPE_SYSTEM_OVERLAY_PARENT_NAMED_LOOKUP_ALIAS;
    this.currentBindingContextAlias = alias;
    this.currentOverrideContextLocals = [...overrideContextLocals];
  }

  replaceBindingContextAlias(alias: string | null): void {
    this.currentBindingContextAlias = alias;
  }

  addOverrideContextAliases(names: readonly string[]): void {
    this.currentOverrideContextLocals = [...new Set([
      ...this.currentOverrideContextLocals,
      ...names.filter(isIdentifierName),
    ])];
  }

  enterSyntheticView(scope: BindingScope): void {
    if (templateScopeCreatesCurrentBindingContextAlias(scope)) {
      this.enterBindingContextAlias('$this');
    }
  }

  private currentScopeNamedLookupAlias(): string | null {
    return namedScopeLookupAliasExpression(
      this.currentBindingContextAlias,
      this.currentOverrideContextLocals,
    );
  }
}

function namedScopeLookupAliasExpression(
  bindingContextAlias: string | null,
  overrideContextLocals: readonly string[],
): string | null {
  if (bindingContextAlias == null) {
    return null;
  }
  if (overrideContextLocals.length === 0) {
    return bindingContextAlias;
  }
  const overrideType = `{ ${overrideContextLocals
    .map((name) => `readonly ${name}: typeof ${name}`)
    .join('; ')} }`;
  return `(${bindingContextAlias} as unknown as Omit<typeof ${bindingContextAlias}, keyof ${overrideType}> & ${overrideType})`;
}

/**
 * Builds TypeScript overlays from already-materialized template scope products.
 *
 * The overlay replays copied authored expression text inside TypeScript blocks that mirror the relevant Aurelia scope
 * ancestry. This keeps private domain model types inferable through the exported view-model surface instead of
 * serializing projected type display strings back into brittle type annotations.
 */
export class TemplateTypeSystemOverlayBuilder {
  private readonly expressions: TemplateTypeSystemOverlayExpressionProjector;

  constructor(
    readonly store: KernelStore,
    readonly typeSystem: TypeSystemProject,
  ) {
    this.expressions = new TemplateTypeSystemOverlayExpressionProjector(
      typeSystem.project.rootDir,
      typeSystem.project.inputGeneration.host,
    );
  }

  build(
    resource: TemplateResourceRuntimeAnalysisEmission,
    localKey: string = resource.compilation.localKey,
  ): TemplateTypeSystemOverlayEmission {
    const overlayFileName = path.join(
      this.typeSystem.project.rootDir,
      '.semantic-runtime',
      'overlays',
      'templates',
      `${sanitizeOverlayFilePart(localKey)}.ts`,
    );
    const viewModel = this.viewModelImport(resource, overlayFileName);
    if (viewModel == null) {
      return new TemplateTypeSystemOverlayEmission(null, [], [
        skippedTemplateTypeSystemOverlayExpression(
          TemplateTypeSystemOverlaySkippedReason.MissingViewModelIdentity,
          null,
          null,
          'Template overlay generation needs an importable view-model declaration.',
        ),
      ]);
    }

    const builder = new TypeSystemOverlaySourceBuilder({
      kind: 'semantic-checker-surface',
      fileName: overlayFileName,
      originKey: `template-type-system-overlay:${localKey}`,
    });
    const frame = this.overlayBuildFrame(resource, localKey, overlayFileName, builder);

    this.appendHeader(builder, viewModel);
    this.appendRootAliases(builder, resource.runtimeAnalysis.scopes.rootScope, overlayFileName);
    this.appendTemplateExpressionProbes(frame);
    this.appendFooter(builder);
    return new TemplateTypeSystemOverlayEmission(builder.build(), frame.probes, frame.skipped);
  }

  private overlayBuildFrame(
    resource: TemplateResourceRuntimeAnalysisEmission,
    localKey: string,
    overlayFileName: string,
    builder: TypeSystemOverlaySourceBuilder,
  ): TemplateTypeSystemOverlayBuildFrame {
    const expressionWorld = resource.runtimeAnalysis.expressionWorld.freshInquiryGeneration();
    return {
      resource,
      localKey,
      overlayFileName,
      builder,
      probes: [],
      skipped: [],
      baseExpressionContext: this.expressionProjectionContext(resource, overlayFileName, builder, expressionWorld),
      expressionSourceProjectors: {
        expressionWorld,
        sourceExpressions: new RuntimeBindingSourceExpressionContextProjector(
          resource.runtimeAnalysis.runtimeRendering,
          instructionScopeLookup(resource.runtimeAnalysis.scopes.instructionScopes),
          new RuntimeBindingExpressionScopeProjector(
            this.store,
            expressionWorld,
            resource.runtimeAnalysis.expressionResourcePlan,
          ),
        ),
      },
    };
  }

  private appendTemplateExpressionProbes(
    frame: TemplateTypeSystemOverlayBuildFrame,
  ): void {
    let index = 0;
    for (const parse of resourceLocalTemplateExpressionParses(this.store, frame.resource)) {
      if (this.expressionParseIsTargetToSourceOnlyBindingTarget(frame.resource, parse)) {
        continue;
      }
      for (const expressionSpan of expressionSpansForOverlay(parse)) {
        const scopes = bindingScopesForTemplateExpressionParse(frame.resource, parse);
        const bindings = runtimeExpressionBindingsForTemplateExpressionParse(frame.resource, parse);
        if (scopes.length === 0) {
          frame.skipped.push(skippedTemplateTypeSystemOverlayExpression(
            TemplateTypeSystemOverlaySkippedReason.MissingBindingScope,
            parse.productHandle,
            expressionSpan.span,
            'Template expression had no instruction-owned binding scope to replay.',
          ));
          continue;
        }
        for (const scope of scopes) {
          const scopedBindings = bindings.length === 0
            ? []
            : runtimeExpressionBindingsForTemplateExpressionParseInScope(frame.resource, parse, scope);
          if (bindings.length > 0 && scopedBindings.length === 0) {
            frame.skipped.push(skippedTemplateTypeSystemOverlayExpression(
              TemplateTypeSystemOverlaySkippedReason.UnsupportedExpressionSyntax,
              parse.productHandle,
              expressionSpan.span,
              'Template expression had runtime bindings, but none matched the overlay ambient scope.',
            ));
            continue;
          }
          index = this.appendTemplateExpressionProbe(frame, parse, expressionSpan, scope, scopedBindings, index);
        }
      }
    }
  }

  private appendTemplateExpressionProbe(
    frame: TemplateTypeSystemOverlayBuildFrame,
    parse: TemplateExpressionParse,
    expressionSpan: OverlayExpressionSpan,
    scope: BindingScope,
    scopedBindings: readonly RuntimeExpressionBinding[],
    index: number,
  ): number {
    const expression = this.copyRuntimeSourceExpression(
      frame.resource,
      expressionSpan.ast,
      parse.productHandle,
      scope,
      scopedBindings,
      frame.expressionSourceProjectors,
      frame.baseExpressionContext,
      frame.overlayFileName,
      `${frame.localKey}:overlay-expression:${index}`,
    );
    if (expression.kind === TemplateTypeSystemOverlayExpressionProjectionKind.UnsupportedSyntax) {
      frame.skipped.push(skippedTemplateTypeSystemOverlayExpression(
        TemplateTypeSystemOverlaySkippedReason.UnsupportedExpressionSyntax,
        parse.productHandle,
        expressionSpan.span,
        expression.unsupportedSyntax?.summary ?? 'Template expression is not representable in a TypeScript overlay yet.',
      ));
      return index;
    }
    if (expression.kind === TemplateTypeSystemOverlayExpressionProjectionKind.MissingSource) {
      frame.skipped.push(skippedTemplateTypeSystemOverlayExpression(
        TemplateTypeSystemOverlaySkippedReason.MissingExpressionSource,
        parse.productHandle,
        expressionSpan.span,
        'Template expression had no readable authored source text.',
      ));
      return index;
    }
    const layers = this.scopeLayers(
      frame.resource,
      scope,
      frame.skipped,
      parse,
      frame.baseExpressionContext,
      frame.expressionSourceProjectors,
      frame.overlayFileName,
    );
    if (layers == null) {
      return index;
    }
    const localName = `__au_expr_${index}`;
    const block = appendTemplateTypeSystemOverlayScopeBlock(frame.builder, layers);
    frame.builder.append(`${block.indent}const ${localName} = `);
    appendTemplateTypeSystemOverlayExpressionProjection(frame.builder, expression, `template expression ${index}`);
    frame.builder
      .append(';\n')
      .append(`${block.indent}void ${localName};\n`);
    for (let close = 0; close < block.closeCount; close += 1) {
      const indent = '  '.repeat(block.closeCount - close - 1);
      frame.builder.append(`${indent}}\n`);
    }
    frame.probes.push({
      localName,
      authoredExpressionText: this.expressions.sourceSlice(expressionSpan.span, parse.productHandle)?.text ?? null,
      overlayExpressionText: expression.text,
      semanticProductHandle: projectionSemanticProductHandle(expression),
      sourceAddressHandle: projectionSourceAddressHandle(expression, expressionSpan.span),
      sourceStart: projectionSourceStart(expression, expressionSpan.span),
      sourceEnd: projectionSourceEnd(expression, expressionSpan.span),
    });
    return index + 1;
  }

  private appendHeader(
    builder: TypeSystemOverlaySourceBuilder,
    viewModel: ViewModelImport,
  ): void {
    appendTemplateTypeSystemOverlayPrelude(builder, viewModel);
  }

  private appendFooter(builder: TypeSystemOverlaySourceBuilder): void {
    builder
      .appendLine('}')
      .appendLine('__au_template.call($vm);');
  }

  private expressionParseIsTargetToSourceOnlyBindingTarget(
    resource: TemplateResourceRuntimeAnalysisEmission,
    parse: TemplateExpressionParse,
  ): boolean {
    const binding = templateInstructionForExpressionParse(resource, parse);
    return binding instanceof PropertyBindingInstruction
      && binding.bindingMode === TemplateBindingMode.FromView;
  }

  private appendRootAliases(
    builder: TypeSystemOverlaySourceBuilder,
    rootScope: BindingScope,
    overlayFileName: string,
  ): void {
    for (const slot of rootScope.bindingContext.slots) {
      if (!isIdentifierName(slot.name)) {
        continue;
      }
      const typeExpression = this.slotTypeExpression(slot, overlayFileName);
      builder.appendLine(typeExpression == null
        ? `let ${slot.name} = $this.${slot.name};`
        : `let ${slot.name} = $this.${slot.name} as unknown as ${typeExpression};`);
    }
    builder.appendLine();
  }

  private slotTypeExpression(
    slot: BindingContextSlot,
    overlayFileName: string,
  ): string | null {
    const member = bindingContextSlotTargetTypeSourceMember(this.store, slot);
    if (member != null) {
      return checkerMemberValueTypeExpression(member, { generatedFileName: overlayFileName });
    }
    return slot.targetType == null
      ? null
      : checkerTypeReferenceTypeExpression(this.store, slot.targetType, { generatedFileName: overlayFileName });
  }

  private expressionProjectionContext(
    resource: TemplateResourceRuntimeAnalysisEmission,
    overlayFileName: string,
    builder: TypeSystemOverlaySourceBuilder,
    expressionWorld: CheckerExpressionTypeWorld,
  ): TemplateTypeSystemOverlayExpressionProjectionContext {
    const helpers = new Map<string, string>();
    const resourceHelper = (
      resourceKind: ResourceDefinitionKind,
      name: string,
      target: ResourceTargetReference,
    ): string | null => {
      const targetType = this.resourceTargetTypeExpression(target, overlayFileName);
      if (targetType == null) {
        return null;
      }
      const helperKey = `${resourceKind}\0${targetType.typeExpression}\0${name}`;
      let helperName = helpers.get(helperKey);
      if (helperName == null) {
        helperName = `__au_resource_${helpers.size}_${sanitizeIdentifierPart(name)}`;
        helpers.set(helperKey, helperName);
        builder.appendLine(`const ${helperName} = undefined as unknown as ${targetType.typeExpression};`);
      }
      return helperName;
    };
    return {
      valueConverterCallSurface: (expression, semanticProductHandle) => {
        const converterNameSource = this.expressions.sourceSlice(expression.name.span, semanticProductHandle);
        if (converterNameSource == null) {
          return null;
        }
        const visible = findVisibleTemplateResource(
          resource.compilation.compilerWorld.resourceScope,
          ResourceDefinitionKind.ValueConverter,
          expression.name.name,
        );
        const definition = readVisibleTemplateResourceDefinition(this.store, visible);
        if (definition == null || definition.type !== ResourceDefinitionKind.ValueConverter) {
          return {
            callKind: TemplateTypeSystemOverlayValueConverterCallKind.RuntimeIdentity,
            converterText: '__au_missing_value_converter',
            converterNameSource,
            callerContextKind: TemplateTypeSystemOverlayValueConverterCallerContextKind.None,
          };
        }
        const helperName = resourceHelper(definition.type, definition.name, definition.target);
        if (helperName == null) {
          return null;
        }
        const callSurface = this.valueConverterCallSurface(definition, expressionWorld);
        return {
          callKind: callSurface.hasToView
            ? TemplateTypeSystemOverlayValueConverterCallKind.DirectToView
            : TemplateTypeSystemOverlayValueConverterCallKind.RuntimeIdentity,
          converterText: helperName,
          converterNameSource,
          callerContextKind: callSurface.callerContextKind,
        };
      },
    };
  }

  private valueConverterCallSurface(
    definition: ValueConverterDefinition,
    expressionWorld: CheckerExpressionTypeWorld,
  ): { readonly hasToView: boolean; readonly callerContextKind: TemplateTypeSystemOverlayValueConverterCallerContextKind } {
    const members = this.valueConverterTargetMembers(definition, expressionWorld);
    const toView = members.find((member) => member.name === VALUE_CONVERTER_TO_VIEW_METHOD) ?? null;
    const withContext = members.find((member) => member.name === VALUE_CONVERTER_WITH_CONTEXT_PROPERTY) ?? null;
    return {
      hasToView: toView != null && toView.memberKind !== CheckerTypeMemberKind.IndexSignature,
      callerContextKind: valueConverterCallerContextKind(expressionWorld.projector.publication, withContext),
    };
  }

  private valueConverterTargetMembers(
    definition: ValueConverterDefinition,
    expressionWorld: CheckerExpressionTypeWorld,
  ): readonly CheckerTypeMember[] {
    return this.resourceTargetMembers(definition.target, expressionWorld);
  }

  private resourceTargetMembers(
    target: ResourceTargetReference,
    expressionWorld: CheckerExpressionTypeWorld,
  ): readonly CheckerTypeMember[] {
    const targetType = target.targetType;
    if (targetType?.productHandle == null) {
      return [];
    }
    const targetShape = readCheckerTypeShape(expressionWorld.projector.publication, targetType);
    return targetShape == null
      ? []
      : readOrProjectCheckerTypeMembersInProjection(expressionWorld.projector, targetShape, targetType.productHandle);
  }

  private expressionProjectionContextForScope(
    context: TemplateTypeSystemOverlayExpressionProjectionContext,
    scope: BindingScope,
  ): TemplateTypeSystemOverlayExpressionProjectionContext {
    return {
      ...context,
      scopeAliases: this.expressionScopeAliases(scope),
    };
  }

  private expressionProjectionContextForRuntimeSource(
    context: TemplateTypeSystemOverlayExpressionProjectionContext,
    scope: BindingScope,
    strictBinding: boolean | null,
  ): TemplateTypeSystemOverlayExpressionProjectionContext {
    return {
      ...this.expressionProjectionContextForScope(context, scope),
      strictBinding,
    };
  }

  private expressionScopeAliases(scope: BindingScope): TemplateTypeSystemOverlayExpressionScopeAliases {
    return {
      ...templateScopeAliasSupport(scope),
      currentNamedLookupExpression: namedScopeLookupAliasExpression(
        '$this',
        scope.overrideContext.slots.map((slot) => slot.name).filter(isIdentifierName),
      ),
    };
  }

  private copyRuntimeSourceExpression(
    resource: TemplateResourceRuntimeAnalysisEmission,
    expression: ExpressionAstNode,
    expressionProductHandle: ProductHandle,
    ambientScope: BindingScope,
    bindings: readonly RuntimeExpressionBinding[],
    projectors: OverlayExpressionSourceProjectors,
    baseExpressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
    overlayFileName: string,
    localKey: string,
  ): TemplateTypeSystemOverlayExpressionProjection {
    if (bindings.length === 0) {
      return this.expressions.copyableExpression(
        expression,
        this.expressionProjectionContextForScope(baseExpressionContext, ambientScope),
        expressionProductHandle,
      );
    }

    const selection = selectRuntimeBindingSourceContextProjection({
      bindings,
      expression,
      localKey,
      sourceScope: ambientScope,
      sourceExpressions: projectors.sourceExpressions,
      bindingBehaviorForBinding: (binding) => bindingBehaviorEvaluationForTemplateExpression(
        resource,
        expressionProductHandle,
        binding,
      ),
    });
    if (selection.kind === RuntimeBindingSourceContextProjectionSelectionKind.Open) {
      return TemplateTypeSystemOverlayExpressionProjection.unsupported(
        new TemplateTypeSystemOverlayExpressionUnsupportedSyntax(
          TemplateTypeSystemOverlayExpressionUnsupportedKind.NonStandalone,
          selection.openReason,
        ),
      );
    }

    const projection = selection.projection;
    if (templateScopeSourceReplayRelation(ambientScope, projection.scope) == null) {
      return TemplateTypeSystemOverlayExpressionProjection.unsupported(
        new TemplateTypeSystemOverlayExpressionUnsupportedSyntax(
          TemplateTypeSystemOverlayExpressionUnsupportedKind.NonStandalone,
          'Runtime binding source scope was not connected to the overlay ambient scope for this render context.',
        ),
      );
    }
    const expressionContext = this.expressionProjectionContextForRuntimeSource(
      baseExpressionContext,
      projection.scope,
      projection.strictBinding,
    );
    const copied = this.expressions.copyableExpression(projection.expression, expressionContext, expressionProductHandle);
    if (
      copied.kind === TemplateTypeSystemOverlayExpressionProjectionKind.UnsupportedSyntax
      || copied.kind === TemplateTypeSystemOverlayExpressionProjectionKind.MissingSource
    ) {
      return copied;
    }
    const wrapped = this.wrapRuntimeSourceExpression(
      copied,
      ambientScope,
      projection.scope,
      overlayFileName,
    );
    if (
      wrapped.kind === TemplateTypeSystemOverlayExpressionProjectionKind.UnsupportedSyntax
      || projection.bindingBehavior !== CheckerExpressionTypeBindingBehaviorEvaluation.AstBindThenEvaluate
    ) {
      return wrapped;
    }
    const argumentCheckerContext = checkerContextForRuntimeBindingBehaviorArguments(
      projection,
      null,
      'overlay-binding-behavior-arguments',
    );
    const evaluator = projectors.expressionWorld.evaluator(
      resource.compilation.compilerWorld.resourceScope,
    );
    const argumentExpressionContext: TemplateTypeSystemOverlayExpressionProjectionContext = {
      ...this.expressionProjectionContextForRuntimeSource(
        baseExpressionContext,
        projection.bindScope,
        projection.strictBinding,
      ),
      bindingBehaviorArgumentTypeExpressions: (behavior) => {
        const references = evaluator.contextualBindingBehaviorArgumentTypes(
          argumentCheckerContext.child(behavior, `behavior:${behavior.name.name}`),
        );
        return (references ?? behavior.args.map(() => null)).map((reference) => reference == null
          ? null
          : checkerTypeReferenceTypeExpression(this.store, reference, { generatedFileName: overlayFileName }));
      },
    };
    return this.expressions.withBindingBehaviorArguments(
      projection.authoredExpression,
      wrapped,
      argumentExpressionContext,
      expressionProductHandle,
    );
  }

  private copyRuntimeSourceExpressionForBinding(
    resource: TemplateResourceRuntimeAnalysisEmission,
    expression: ExpressionAstNode,
    expressionProductHandle: ProductHandle,
    ambientScope: BindingScope,
    binding: RuntimeExpressionBinding | null,
    projectors: OverlayExpressionSourceProjectors,
    baseExpressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
    overlayFileName: string,
    localKey: string,
  ): TemplateTypeSystemOverlayExpressionProjection {
    return this.copyRuntimeSourceExpression(
      resource,
      expression,
      expressionProductHandle,
      ambientScope,
      binding == null ? [] : [binding],
      projectors,
      baseExpressionContext,
      overlayFileName,
      localKey,
    );
  }

  private wrapRuntimeSourceExpression(
    expression: TemplateTypeSystemOverlayExpressionProjection,
    ambientScope: BindingScope,
    sourceScope: BindingScope,
    overlayFileName: string,
  ): TemplateTypeSystemOverlayExpressionProjection {
    const relation = templateScopeSourceReplayRelation(ambientScope, sourceScope);
    if (relation == null) {
      return TemplateTypeSystemOverlayExpressionProjection.unsupported(
        new TemplateTypeSystemOverlayExpressionUnsupportedSyntax(
          TemplateTypeSystemOverlayExpressionUnsupportedKind.NonStandalone,
          'Runtime binding source scope was not rooted in the overlay ambient scope for this render context.',
        ),
      );
    }
    if (relation.tail.length === 0) {
      return expression;
    }
    if (relation.tail.some((scope) => scope.ownerKind !== BindingScopeOwnerKind.StateBinding)) {
      return TemplateTypeSystemOverlayExpressionProjection.unsupported(
        new TemplateTypeSystemOverlayExpressionUnsupportedSyntax(
          TemplateTypeSystemOverlayExpressionUnsupportedKind.NonStandalone,
          'Runtime binding source scope requires an overlay-local scope owner that is not representable yet.',
        ),
      );
    }

    const parts: TemplateTypeSystemOverlayExpressionPart[] = [textPart('(() => {\n')];
    let parentDepth = this.expressionScopeAliases(ambientScope).parentBindingContextDepth;
    let currentNamedLookupExpression = namedScopeLookupAliasExpression(
      '$this',
      ambientScope.overrideContext.slots.map((slot) => slot.name).filter(isIdentifierName),
    ) ?? '$this';
    relation.tail.forEach((scope, index) => {
      const parentLocal = `__au_source_parent_${index}`;
      const parentLookupLocal = `__au_source_parent_lookup_${index}`;
      const parentParentLocal = parentDepth > 0 ? `__au_source_parent_${index}_parent` : null;
      const parentParentLookupLocal = parentDepth > 0 ? `__au_source_parent_lookup_${index}_parent` : null;
      parts.push(textPart(`const ${parentLocal} = $this;\n`));
      parts.push(textPart(`const ${parentLookupLocal} = ${currentNamedLookupExpression};\n`));
      if (parentParentLocal != null) {
        parts.push(textPart(`const ${parentParentLocal} = $parent;\n`));
      }
      if (parentParentLookupLocal != null) {
        parts.push(textPart(`const ${parentParentLookupLocal} = ${TEMPLATE_TYPE_SYSTEM_OVERLAY_PARENT_NAMED_LOOKUP_ALIAS};\n`));
      }
      parts.push(textPart('{\n'));
      parts.push(textPart(parentParentLocal == null
        ? `const $parent = ${parentLocal};\n`
        : `const $parent = ${parentLocal} as typeof ${parentLocal} & { readonly $parent: typeof ${parentParentLocal} };\n`));
      parts.push(textPart(parentParentLookupLocal == null
        ? `const ${TEMPLATE_TYPE_SYSTEM_OVERLAY_PARENT_NAMED_LOOKUP_ALIAS} = ${parentLookupLocal};\n`
        : `const ${TEMPLATE_TYPE_SYSTEM_OVERLAY_PARENT_NAMED_LOOKUP_ALIAS} = ${parentLookupLocal} as typeof ${parentLookupLocal} & { readonly $parent: typeof ${parentParentLookupLocal} };\n`));
      const locals = this.typedBindingContextLocals(scope, overlayFileName);
      for (const local of locals) {
        parts.push(textPart(local.typeExpression == null
          ? `const ${local.name} = undefined as unknown;\n`
          : `const ${local.name} = undefined as unknown as ${local.typeExpression};\n`));
      }
      parts.push(textPart(locals.length === 0
        ? 'const $this = {};\n'
        : `const $this = { ${locals.map((local) => local.name).join(', ')} };\n`));
      currentNamedLookupExpression = '$this';
      parentDepth += 1;
    });
    parts.push(textPart('return '), ...expression.parts, textPart(';\n'));
    for (let index = 0; index < relation.tail.length; index += 1) {
      parts.push(textPart('}\n'));
    }
    parts.push(textPart('})()'));
    return TemplateTypeSystemOverlayExpressionProjection.generated(parts);
  }

  private resourceTargetTypeExpression(
    target: ResourceTargetReference,
    overlayFileName: string,
  ): OverlayTypeExpression | null {
    const fromIdentity = resourceTargetTypeExpressionFromIdentity(this.store, target, overlayFileName, this.typeSystem.project.rootDir);
    if (fromIdentity != null) {
      return fromIdentity;
    }
    const fromType = resourceTargetTypeExpressionFromType(this.store, target.targetType, overlayFileName);
    if (fromType != null) {
      return fromType;
    }
    if (target.moduleKey == null || target.localName == null || !isIdentifierName(target.localName)) {
      return null;
    }
    return {
      typeExpression: typeImportExpression(
        overlayFileName,
        path.resolve(this.typeSystem.project.rootDir, target.moduleKey),
        target.localName,
      ),
    };
  }

  private scopeLayers(
    resource: TemplateResourceRuntimeAnalysisEmission,
    scope: BindingScope,
    skipped: TemplateTypeSystemOverlaySkippedExpression[],
    parse: TemplateExpressionParse,
    baseExpressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
    projectors: OverlayExpressionSourceProjectors,
    overlayFileName: string,
  ): readonly TemplateTypeSystemOverlayScopeLayer[] | null {
    const layers: TemplateTypeSystemOverlayScopeLayer[] = [];
    const aliases = new TemplateTypeSystemOverlayAliasReplayCursor();
    for (const current of templateScopeReplayChain(scope)) {
      if (current.predecessor != null) {
        const stateLayers = this.creatorLayersForScope(
          resource,
          current,
          skipped,
          parse,
          baseExpressionContext,
          projectors,
          overlayFileName,
          aliases.parentAlias(),
        );
        if (stateLayers == null) {
          return null;
        }
        layers.push(...stateLayers);
        this.updateAliasesForDerivedState(aliases, stateLayers);
        continue;
      }

      if (current.ownerKind === BindingScopeOwnerKind.RepeatedItem) {
        const effect = repeatEffectForScope(this.store, current);
        if (effect == null) {
          skipped.push(skippedTemplateTypeSystemOverlayExpression(
            TemplateTypeSystemOverlaySkippedReason.MissingRepeatScopeEffect,
            parse.productHandle,
            current.sourceAddressHandle,
            'Repeated-item scope did not carry a matching iterator scope effect. Then generated overlay cannot replay its local declaration.',
          ));
          return null;
        }
        const repeat = this.repeatSource(
          resource,
          effect,
          current.runtimeParent,
          projectors,
          baseExpressionContext,
          overlayFileName,
          `${parse.productHandle}:repeat:${effect.productHandle}`,
        );
        if (repeat == null) {
          skipped.push(skippedTemplateTypeSystemOverlayExpression(
            TemplateTypeSystemOverlaySkippedReason.UnsupportedExpressionSyntax,
            parse.productHandle,
            effect.sourceAddressHandle,
            'Iterator scope effect expression is not representable in a TypeScript overlay yet.',
          ));
          return null;
        }
        const currentAliasExpression = templateRepeatScopeCurrentAliasExpression(current);
        layers.push({
          kind: 'repeat',
          declaration: repeat.declaration,
          iterable: repeat.iterable,
          previousKind: repeatPreviousOverlayKind(current),
          previousAssignmentAccessKind: repeatPreviousAssignmentAccessKind(current),
          currentAliasExpression,
          parentAlias: aliases.parentAlias(),
        });
        const overrideLocals = overlayContextSlotLocals(current, this.store, overlayFileName);
        const separatelyDeclaredOverrideLocals = overrideLocals.filter((local) => local.name !== '$previous');
        if (separatelyDeclaredOverrideLocals.length > 0) {
          layers.push({
            kind: 'context-slots',
            locals: separatelyDeclaredOverrideLocals,
          });
        }
        aliases.enterBindingContextAlias(
          currentAliasExpression == null ? null : '$this',
          overrideLocals.map((local) => local.name),
        );
        continue;
      }

      if (current.ownerKind === BindingScopeOwnerKind.SyntheticView) {
        const syntheticLayers = this.creatorLayersForScope(
          resource,
          current,
          skipped,
          parse,
          baseExpressionContext,
          projectors,
          overlayFileName,
          aliases.parentAlias(),
        );
        if (syntheticLayers == null) {
          return null;
        }
        layers.push(...syntheticLayers);
        aliases.enterSyntheticView(current);
        continue;
      }

      if (current.ownerKind === BindingScopeOwnerKind.StateBinding) {
        layers.push(this.typedBindingContextLayer(current, overlayFileName, aliases.parentAlias()));
        aliases.enterSyntheticView(current);
        continue;
      }

      skipped.push(skippedTemplateTypeSystemOverlayExpression(
        TemplateTypeSystemOverlaySkippedReason.UnsupportedScopeOwner,
        parse.productHandle,
        current.sourceAddressHandle,
        `Scope owner ${current.ownerKind} is not representable in the template overlay pass yet.`,
      ));
      return null;
    }
    return layers;
  }

  private updateAliasesForDerivedState(
    aliases: TemplateTypeSystemOverlayAliasReplayCursor,
    layers: readonly TemplateTypeSystemOverlayScopeLayer[],
  ): void {
    for (const layer of layers) {
      if (layer.kind === 'let') {
        if (layer.effects.some((effect) => effect.targetContext === LetBindingTargetContext.BindingContext)) {
          aliases.replaceBindingContextAlias('$this');
        }
        aliases.addOverrideContextAliases(layer.effects
          .filter((effect) => effect.targetContext === LetBindingTargetContext.OverrideContext)
          .map((effect) => effect.target));
        continue;
      }
      if (layer.kind === 'typed-binding-context') {
        aliases.replaceBindingContextAlias('$this');
        continue;
      }
      if (layer.kind === 'runtime-assignment') {
        if (layer.bindingContextLocalNames.length > 0) {
          aliases.replaceBindingContextAlias('$this');
        }
        const bindingContextNames = new Set(layer.bindingContextLocalNames);
        aliases.addOverrideContextAliases(layer.locals
          .map((local) => local.name)
          .filter((name) => !bindingContextNames.has(name)));
      }
    }
  }

  private repeatSource(
    resource: TemplateResourceRuntimeAnalysisEmission,
    effect: IteratorBindingScopeEffect,
    ambientScope: BindingScope | null,
    projectors: OverlayExpressionSourceProjectors,
    baseExpressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
    overlayFileName: string,
    localKey: string,
  ): {
    readonly declaration: TemplateTypeSystemOverlaySourceSlice;
    readonly iterable: readonly TemplateTypeSystemOverlayExpressionPart[];
  } | null {
    const parse = readTemplateExpressionParse(this.store, effect.iterableExpressionProductHandle);
    if (parse?.result.kind !== ExpressionParseResultKind.IteratorSuccess) {
      return null;
    }
    if (ambientScope == null) {
      return null;
    }
    const declaration = this.expressions.sourceSlice(parse.result.ast.declaration.span, parse.productHandle);
    const binding = effect.binding.productHandle == null
      ? null
      : resource.runtimeAnalysis.runtimeRendering.readBinding(effect.binding.productHandle);
    const iterable = this.copyRuntimeSourceExpressionForBinding(
      resource,
      parse.result.ast.iterable,
      parse.productHandle,
      ambientScope,
      binding != null && isRuntimeExpressionBinding(binding) ? binding : null,
      projectors,
      baseExpressionContext,
      overlayFileName,
      localKey,
    );
    const iterableParts = overlayExpressionParts(iterable);
    if (iterableParts == null) {
      return null;
    }
    return declaration == null
      ? null
      : { declaration, iterable: iterableParts };
  }

  private letSources(
    resource: TemplateResourceRuntimeAnalysisEmission,
    effects: readonly LetBindingScopeEffect[],
    skipped: TemplateTypeSystemOverlaySkippedExpression[],
    parse: TemplateExpressionParse,
    ambientScope: BindingScope | null,
    projectors: OverlayExpressionSourceProjectors,
    baseExpressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
    overlayFileName: string,
  ): readonly TemplateTypeSystemOverlayLetEffect[] | null {
    const result: TemplateTypeSystemOverlayLetEffect[] = [];
    for (const effect of effects) {
      if (!isIdentifierName(effect.target)) {
        skipped.push(skippedTemplateTypeSystemOverlayExpression(
          TemplateTypeSystemOverlaySkippedReason.UnsupportedLetTarget,
          parse.productHandle,
          effect.sourceAddressHandle,
          `Let target '${effect.target}' cannot be represented as a TypeScript lexical binding.`,
        ));
        return null;
      }
      const expression = ambientScope == null
        ? null
        : this.letExpressionSource(
            resource,
            effect,
            ambientScope,
            projectors,
            baseExpressionContext,
            overlayFileName,
          );
      if (expression == null) {
        skipped.push(skippedTemplateTypeSystemOverlayExpression(
          TemplateTypeSystemOverlaySkippedReason.UnsupportedExpressionSyntax,
          parse.productHandle,
          effect.sourceAddressHandle,
          `Let binding '${effect.target}' expression is not representable in a TypeScript overlay yet.`,
        ));
        return null;
      }
      result.push({
        target: effect.target,
        expression,
        targetContext: effect.targetContext,
      });
    }
    return result;
  }

  private letExpressionSource(
    resource: TemplateResourceRuntimeAnalysisEmission,
    effect: LetBindingScopeEffect,
    ambientScope: BindingScope,
    projectors: OverlayExpressionSourceProjectors,
    baseExpressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
    overlayFileName: string,
  ): readonly TemplateTypeSystemOverlayExpressionPart[] | null {
    if (effect.expressionProductHandle == null) {
      return effect.literalValue == null
        ? null
        : [textPart(templateTypeSystemOverlayQuotedStringLiteral(effect.literalValue))];
    }
    const parse = readTemplateExpressionParse(this.store, effect.expressionProductHandle);
    const ast = parse == null ? null : completedTemplateExpressionAstForParse(parse);
    const binding = effect.binding.productHandle == null
      ? null
      : resource.runtimeAnalysis.runtimeRendering.readBinding(effect.binding.productHandle);
    const source = ast == null
      ? null
      : this.copyRuntimeSourceExpressionForBinding(
          resource,
          ast,
          effect.expressionProductHandle,
          ambientScope,
          binding != null && isRuntimeExpressionBinding(binding) ? binding : null,
          projectors,
          baseExpressionContext,
          overlayFileName,
          `let:${effect.productHandle}:${effect.target}`,
        );
    return source == null ? null : overlayExpressionParts(source);
  }

  private creatorLayersForScope(
    resource: TemplateResourceRuntimeAnalysisEmission,
    scope: BindingScope,
    skipped: TemplateTypeSystemOverlaySkippedExpression[],
    parse: TemplateExpressionParse,
    baseExpressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
    projectors: OverlayExpressionSourceProjectors,
    overlayFileName: string,
    parentAlias: TemplateTypeSystemOverlayScopeAlias | null,
  ): readonly TemplateTypeSystemOverlayScopeLayer[] | null {
    const layers: TemplateTypeSystemOverlayScopeLayer[] = [];
    const creators = scope.scopeCreators
      .map((creator) => this.creatorLayer(
        resource,
        scope,
        creator,
        skipped,
        parse,
        scope.sourceAddressHandle,
        baseExpressionContext,
        projectors,
        overlayFileName,
        parentAlias,
      ));
    for (const creator of creators) {
      if (creator == null) {
        return null;
      }
      layers.push(...creator);
    }
    if (
      layers.length === 0
      && scope.scopeCreators.length > 0
      && scope.scopeCreators.every((creator) =>
        creator.creatorKind === BindingScopeCreatorKind.RuntimeAssignment
        && creator.assignedSlotNames.length === 0
      )
    ) {
      return [];
    }
    if (layers.length === 0) {
      skipped.push(skippedTemplateTypeSystemOverlayExpression(
        TemplateTypeSystemOverlaySkippedReason.MissingSyntheticScopeCreator,
        parse.productHandle,
        scope.sourceAddressHandle,
        'Binding scope state did not retain representable creator products.',
      ));
      return null;
    }
    return layers;
  }

  private creatorLayer(
    resource: TemplateResourceRuntimeAnalysisEmission,
    scope: BindingScope,
    creator: BindingScopeCreator,
    skipped: TemplateTypeSystemOverlaySkippedExpression[],
    parse: TemplateExpressionParse,
    sourceAddressHandle: AddressHandle | null,
    baseExpressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
    projectors: OverlayExpressionSourceProjectors,
    overlayFileName: string,
    parentAlias: TemplateTypeSystemOverlayScopeAlias | null,
  ): readonly TemplateTypeSystemOverlayScopeLayer[] | null {
    const parentScope = scope.predecessor ?? scope.runtimeParent;
    if (parentScope == null) {
      skipped.push(skippedTemplateTypeSystemOverlayExpression(
        TemplateTypeSystemOverlaySkippedReason.MissingSyntheticScopeCreator,
        parse.productHandle,
        creator.sourceAddressHandle ?? sourceAddressHandle,
        `Synthetic-view creator '${creator.creatorKind}' did not retain a predecessor or runtime parent scope.`,
      ));
      return null;
    }
    // Source effects create same-level scope facts; later controller branches may read them, but effects cannot read themselves.
    switch (creator.creatorKind) {
      case BindingScopeCreatorKind.RuntimeBindingScopeEffect:
        return this.runtimeBindingScopeEffectCreatorLayer(
          resource,
          scope,
          creator,
          skipped,
          parse,
          sourceAddressHandle,
          parentScope,
          projectors,
          baseExpressionContext,
          overlayFileName,
        );
      case BindingScopeCreatorKind.StateBinding:
        return [this.typedBindingContextLayer(scope, overlayFileName, parentAlias)];
      case BindingScopeCreatorKind.RuntimeAssignment:
        return this.runtimeAssignmentCreatorLayer(scope, creator, overlayFileName);
      case BindingScopeCreatorKind.ListenerEvent:
        return this.listenerEventCreatorLayer(resource, scope, creator, skipped, parse, sourceAddressHandle, overlayFileName);
      case BindingScopeCreatorKind.TemplateControllerCondition:
        return this.templateControllerConditionCreatorLayer(
          resource,
          creator,
          skipped,
          parse,
          sourceAddressHandle,
          scope,
          projectors,
          baseExpressionContext,
          overlayFileName,
        );
      case BindingScopeCreatorKind.TemplateControllerBranch:
        return this.templateControllerBranchCreatorLayer(
          resource,
          creator,
          skipped,
          parse,
          sourceAddressHandle,
          scope,
          projectors,
          baseExpressionContext,
          overlayFileName,
        );
      case BindingScopeCreatorKind.TemplateControllerValueScope:
        return this.templateControllerValueScopeCreatorLayer(
          resource,
          scope,
          creator,
          skipped,
          parse,
          sourceAddressHandle,
          parentScope,
          projectors,
          baseExpressionContext,
          overlayFileName,
          parentAlias,
        );
    }

    skipped.push(skippedTemplateTypeSystemOverlayExpression(
      TemplateTypeSystemOverlaySkippedReason.UnsupportedSyntheticScope,
      parse.productHandle,
      creator.sourceAddressHandle ?? sourceAddressHandle,
      `Synthetic-view creator '${creator.creatorKind}' is not representable in a TypeScript overlay yet.`,
    ));
    return null;
  }

  private runtimeAssignmentCreatorLayer(
    scope: BindingScope,
    creator: BindingScopeCreator,
    overlayFileName: string,
  ): readonly TemplateTypeSystemOverlayScopeLayer[] {
    if (creator.assignedSlotNames.length === 0) {
      return [];
    }
    const locals = this.runtimeAssignmentLocals(scope, creator, overlayFileName);
    return [{
        kind: 'runtime-assignment',
        locals,
        bindingContextLocalNames: creator.assignedContextKind === BindingContextKind.Override
          ? []
          : locals.map((local) => local.name),
      }];
  }

  private listenerEventCreatorLayer(
    resource: TemplateResourceRuntimeAnalysisEmission,
    scope: BindingScope,
    creator: BindingScopeCreator,
    skipped: TemplateTypeSystemOverlaySkippedExpression[],
    parse: TemplateExpressionParse,
    sourceAddressHandle: AddressHandle | null,
    overlayFileName: string,
  ): readonly TemplateTypeSystemOverlayScopeLayer[] | null {
    const instruction = templateInstructionForProductHandle(resource, creator.productHandle);
    if (instruction instanceof ListenerBindingInstruction || instruction instanceof DispatchBindingInstruction) {
      return [{
        kind: 'event',
        eventName: instruction.eventName,
        memberTypes: overlayEventMemberTypes(scope, this.store, overlayFileName),
      }];
    }
    skipped.push(skippedTemplateTypeSystemOverlayExpression(
      TemplateTypeSystemOverlaySkippedReason.UnsupportedSyntheticScope,
      parse.productHandle,
      creator.sourceAddressHandle ?? sourceAddressHandle,
      `Listener-event scope creator '${creator.productHandle}' did not resolve to a listener instruction.`,
    ));
    return null;
  }

  private templateControllerConditionCreatorLayer(
    resource: TemplateResourceRuntimeAnalysisEmission,
    creator: BindingScopeCreator,
    skipped: TemplateTypeSystemOverlaySkippedExpression[],
    parse: TemplateExpressionParse,
    sourceAddressHandle: AddressHandle | null,
    ambientScope: BindingScope | null,
    projectors: OverlayExpressionSourceProjectors,
    baseExpressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
    overlayFileName: string,
  ): readonly TemplateTypeSystemOverlayScopeLayer[] | null {
    const instruction = templateInstructionForProductHandle(resource, creator.productHandle);
    if (!(instruction instanceof HydrateTemplateControllerInstruction)) {
      skipped.push(skippedTemplateTypeSystemOverlayExpression(
        TemplateTypeSystemOverlaySkippedReason.UnsupportedSyntheticScope,
        parse.productHandle,
        creator.sourceAddressHandle ?? sourceAddressHandle,
        `Template-controller condition creator '${creator.productHandle}' did not resolve to a hydrate-template-controller instruction.`,
      ));
      return null;
    }
    const layer = this.templateControllerConditionLayer(
      resource,
      instruction,
      creator.conditionPolarity === BindingScopeConditionPolarity.Falsy,
      skipped,
      parse,
      ambientScope,
      projectors,
      baseExpressionContext,
      overlayFileName,
    );
    return layer == null ? null : [layer];
  }

  private templateControllerBranchCreatorLayer(
    resource: TemplateResourceRuntimeAnalysisEmission,
    creator: BindingScopeCreator,
    skipped: TemplateTypeSystemOverlaySkippedExpression[],
    parse: TemplateExpressionParse,
    sourceAddressHandle: AddressHandle | null,
    ambientScope: BindingScope | null,
    projectors: OverlayExpressionSourceProjectors,
    baseExpressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
    overlayFileName: string,
  ): readonly TemplateTypeSystemOverlayScopeLayer[] | null {
    const instruction = templateInstructionForProductHandle(resource, creator.productHandle);
    if (!(instruction instanceof HydrateTemplateControllerInstruction)) {
      skipped.push(skippedTemplateTypeSystemOverlayExpression(
        TemplateTypeSystemOverlaySkippedReason.UnsupportedSyntheticScope,
        parse.productHandle,
        creator.sourceAddressHandle ?? sourceAddressHandle,
        `Template-controller branch creator '${creator.productHandle}' did not resolve to a hydrate-template-controller instruction.`,
      ));
      return null;
    }
    const semantics = frameworkTemplateControllerSemanticsForName(instruction.controllerName);
    if (semantics?.flowKind === BuiltInTemplateControllerFlowKind.SwitchCase
      || semantics?.flowKind === BuiltInTemplateControllerFlowKind.SwitchDefault) {
      const layer = this.templateControllerSwitchCaseLayer(
        resource,
        instruction,
        semantics.flowKind,
        skipped,
        parse,
        sourceAddressHandle,
        ambientScope,
        projectors,
        baseExpressionContext,
        overlayFileName,
      );
      return layer == null ? null : [layer];
    }

    const source = ambientScope == null
      ? null
      : this.templateControllerConditionSource(
          resource,
          instruction,
          ambientScope,
          projectors,
          baseExpressionContext,
          overlayFileName,
        );
    if (source == null || semantics?.flowKind !== BuiltInTemplateControllerFlowKind.Conditional) {
      return [];
    }
    return [{
      kind: 'condition',
      condition: source,
      negate: false,
    }];
  }

  private runtimeBindingScopeEffectCreatorLayer(
    resource: TemplateResourceRuntimeAnalysisEmission,
    scope: BindingScope,
    creator: BindingScopeCreator,
    skipped: TemplateTypeSystemOverlaySkippedExpression[],
    parse: TemplateExpressionParse,
    sourceAddressHandle: AddressHandle | null,
    ambientScope: BindingScope | null,
    projectors: OverlayExpressionSourceProjectors,
    baseExpressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
    overlayFileName: string,
  ): readonly TemplateTypeSystemOverlayScopeLayer[] | null {
    const scopeEffect = runtimeBindingScopeEffectForCreator(this.store, creator);
    if (scopeEffect instanceof IteratorBindingScopeEffect) {
      const repeat = this.repeatSource(
        resource,
        scopeEffect,
        ambientScope,
        projectors,
        baseExpressionContext,
        overlayFileName,
        `${parse.productHandle}:runtime-effect-repeat:${scopeEffect.productHandle}`,
      );
      if (repeat == null) {
        skipped.push(skippedTemplateTypeSystemOverlayExpression(
          TemplateTypeSystemOverlaySkippedReason.UnsupportedExpressionSyntax,
          parse.productHandle,
          scopeEffect.sourceAddressHandle,
          'Iterator scope effect expression is not representable in a TypeScript overlay yet.',
        ));
        return null;
      }
      return [{
        kind: 'repeat',
        declaration: repeat.declaration,
        iterable: repeat.iterable,
        previousKind: repeatPreviousOverlayKind(scope),
        previousAssignmentAccessKind: repeatPreviousAssignmentAccessKind(scope),
        currentAliasExpression: templateRepeatScopeCurrentAliasExpression(scope),
        parentAlias: {
          bindingContextExpression: '$this',
          namedLookupExpression: namedScopeLookupAliasExpression(
            '$this',
            ambientScope?.overrideContext.slots.map((slot) => slot.name).filter(isIdentifierName) ?? [],
          ) ?? '$this',
          parentBindingContextExpression: ambientScope != null
            && this.expressionScopeAliases(ambientScope).parentBindingContextDepth > 0
            ? '$parent'
            : null,
          parentNamedLookupExpression: ambientScope != null
            && this.expressionScopeAliases(ambientScope).parentBindingContextDepth > 0
            ? TEMPLATE_TYPE_SYSTEM_OVERLAY_PARENT_NAMED_LOOKUP_ALIAS
            : null,
        },
      }, ...contextSlotLayersForScope(scope, this.store, overlayFileName, ['$previous'])];
    }
    if (scopeEffect instanceof LetBindingScopeEffect) {
      const letEffects = this.letSources(
        resource,
        [scopeEffect],
        skipped,
        parse,
        ambientScope,
        projectors,
        baseExpressionContext,
        overlayFileName,
      );
      return letEffects == null
        ? null
        : [{
          kind: 'let',
          effects: letEffects,
        }];
    }
    skipped.push(skippedTemplateTypeSystemOverlayExpression(
      TemplateTypeSystemOverlaySkippedReason.UnsupportedSyntheticScope,
      parse.productHandle,
      creator.sourceAddressHandle ?? sourceAddressHandle,
      `Runtime binding scope-effect creator '${creator.productHandle}' is not representable in a TypeScript overlay yet.`,
    ));
    return null;
  }

  private templateControllerValueScopeCreatorLayer(
    resource: TemplateResourceRuntimeAnalysisEmission,
    scope: BindingScope,
    creator: BindingScopeCreator,
    skipped: TemplateTypeSystemOverlaySkippedExpression[],
    parse: TemplateExpressionParse,
    sourceAddressHandle: AddressHandle | null,
    ambientScope: BindingScope | null,
    projectors: OverlayExpressionSourceProjectors,
    baseExpressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
    overlayFileName: string,
    parentAlias: TemplateTypeSystemOverlayScopeAlias | null,
  ): readonly TemplateTypeSystemOverlayScopeLayer[] | null {
    const instruction = templateInstructionForProductHandle(resource, creator.productHandle);
    if (!(instruction instanceof HydrateTemplateControllerInstruction)) {
      skipped.push(skippedTemplateTypeSystemOverlayExpression(
        TemplateTypeSystemOverlaySkippedReason.UnsupportedSyntheticScope,
        parse.productHandle,
        creator.sourceAddressHandle ?? sourceAddressHandle,
        `Template-controller value-scope creator '${creator.productHandle}' did not resolve to a hydrate-template-controller instruction.`,
      ));
      return null;
    }
    const semantics = frameworkTemplateControllerSemanticsForName(instruction.controllerName);
    if (semantics?.flowKind === BuiltInTemplateControllerFlowKind.ValueScope) {
      const source = ambientScope == null
        ? null
        : this.templateControllerValueSource(
            resource,
            instruction,
            ambientScope,
            projectors,
            baseExpressionContext,
            overlayFileName,
          );
      if (source == null) {
        skipped.push(skippedTemplateTypeSystemOverlayExpression(
          TemplateTypeSystemOverlaySkippedReason.MissingSyntheticScopeCondition,
          parse.productHandle,
          instruction.sourceAddressHandle,
          `Template-controller '${instruction.controllerName}' did not have readable value expression text.`,
        ));
        return null;
      }
      return [{
        kind: 'binding-context',
        expression: source,
        nonNullishExpression: true,
        locals: templateScopeBindingContextLocalNames(scope),
        parentAlias,
      }];
    }
    if (semantics?.flowKind === BuiltInTemplateControllerFlowKind.Promise) {
      return [{
        kind: 'binding-context',
        expression: null,
        nonNullishExpression: false,
        locals: [],
        parentAlias,
      }];
    }
    skipped.push(skippedTemplateTypeSystemOverlayExpression(
      TemplateTypeSystemOverlaySkippedReason.UnsupportedSyntheticScope,
      parse.productHandle,
      creator.sourceAddressHandle ?? sourceAddressHandle,
      `Synthetic-view creator '${instruction.controllerName}' is not representable as a TypeScript binding context yet.`,
    ));
    return null;
  }

  private templateControllerConditionLayer(
    resource: TemplateResourceRuntimeAnalysisEmission,
    owner: HydrateTemplateControllerInstruction,
    fallbackNegate: boolean,
    skipped: TemplateTypeSystemOverlaySkippedExpression[],
    parse: TemplateExpressionParse,
    ambientScope: BindingScope | null,
    projectors: OverlayExpressionSourceProjectors,
    baseExpressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
    overlayFileName: string,
  ): TemplateTypeSystemOverlayConditionLayer | null {
    const ownerSemantics = frameworkTemplateControllerSemanticsForName(owner.controllerName);
    if (
      ownerSemantics?.flowKind !== BuiltInTemplateControllerFlowKind.Conditional
      && ownerSemantics?.flowKind !== BuiltInTemplateControllerFlowKind.ConditionalElse
    ) {
      skipped.push(skippedTemplateTypeSystemOverlayExpression(
        TemplateTypeSystemOverlaySkippedReason.UnsupportedSyntheticScope,
        parse.productHandle,
        owner.sourceAddressHandle,
        `Synthetic-view creator '${owner.controllerName}' is not representable as a TypeScript condition yet.`,
      ));
      return null;
    }

    const conditionSource = ambientScope == null
      ? null
      : this.templateControllerConditionSource(
          resource,
          owner,
          ambientScope,
          projectors,
          baseExpressionContext,
          overlayFileName,
        );
    if (conditionSource == null) {
      skipped.push(skippedTemplateTypeSystemOverlayExpression(
        TemplateTypeSystemOverlaySkippedReason.MissingSyntheticScopeCondition,
        parse.productHandle,
        owner.sourceAddressHandle,
        `Template-controller '${owner.controllerName}' did not have readable condition expression text.`,
      ));
      return null;
    }
    return {
      kind: 'condition',
      condition: conditionSource,
      negate: ownerSemantics.flowKind === BuiltInTemplateControllerFlowKind.ConditionalElse || fallbackNegate,
    };
  }

  private templateControllerSwitchCaseLayer(
    resource: TemplateResourceRuntimeAnalysisEmission,
    instruction: HydrateTemplateControllerInstruction,
    flowKind: BuiltInTemplateControllerFlowKind.SwitchCase | BuiltInTemplateControllerFlowKind.SwitchDefault,
    skipped: TemplateTypeSystemOverlaySkippedExpression[],
    parse: TemplateExpressionParse,
    sourceAddressHandle: AddressHandle | null,
    ambientScope: BindingScope | null,
    projectors: OverlayExpressionSourceProjectors,
    baseExpressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
    overlayFileName: string,
  ): TemplateTypeSystemOverlaySwitchCaseLayer | null {
    const switchInstruction = this.linkedTemplateControllerInstruction(resource, instruction, BuiltInTemplateControllerFlowKind.Switch);
    if (switchInstruction == null) {
      skipped.push(skippedTemplateTypeSystemOverlayExpression(
        TemplateTypeSystemOverlaySkippedReason.MissingSyntheticScopeCondition,
        parse.productHandle,
        instruction.sourceAddressHandle ?? sourceAddressHandle,
        `Template-controller '${instruction.controllerName}' did not retain its parent switch link.`,
      ));
      return null;
    }
    const switchExpression = ambientScope == null
      ? null
      : this.templateControllerValueSource(
          resource,
          switchInstruction,
          ambientScope,
          projectors,
          baseExpressionContext,
          overlayFileName,
        );
    if (switchExpression == null) {
      skipped.push(skippedTemplateTypeSystemOverlayExpression(
        TemplateTypeSystemOverlaySkippedReason.MissingSyntheticScopeCondition,
        parse.productHandle,
        switchInstruction.sourceAddressHandle,
        'Switch template-controller did not have readable value expression text.',
      ));
      return null;
    }

    if (flowKind === BuiltInTemplateControllerFlowKind.SwitchDefault) {
      const defaultCaseExpressions = ambientScope == null
        ? null
        : this.switchCaseExpressions(
            resource,
            switchInstruction,
            ambientScope,
            projectors,
            baseExpressionContext,
            overlayFileName,
          );
      return {
        kind: 'switch-case',
        switchExpression,
        caseExpressions: [],
        excludedCaseExpressions: [],
        defaultCaseExpressions: defaultCaseExpressions ?? [],
        narrow: defaultCaseExpressions != null && defaultCaseExpressions.length > 0,
      };
    }

    const caseExpression = ambientScope == null
      ? null
      : this.templateControllerValueSource(
          resource,
          instruction,
          ambientScope,
          projectors,
          baseExpressionContext,
          overlayFileName,
        );
    if (caseExpression == null) {
      skipped.push(skippedTemplateTypeSystemOverlayExpression(
        TemplateTypeSystemOverlaySkippedReason.MissingSyntheticScopeCondition,
        parse.productHandle,
        instruction.sourceAddressHandle,
        "Case template-controller did not have readable 'value' expression text.",
      ));
      return null;
    }
    const branchExpressions = ambientScope == null
      ? null
      : this.switchCaseBranchExpressions(
          resource,
          switchInstruction,
          instruction,
          ambientScope,
          projectors,
          baseExpressionContext,
          overlayFileName,
        );
    return {
      kind: 'switch-case',
      switchExpression,
      caseExpressions: branchExpressions?.caseExpressions ?? [caseExpression],
      excludedCaseExpressions: branchExpressions?.excludedCaseExpressions ?? [],
      defaultCaseExpressions: [],
      narrow: branchExpressions != null,
    };
  }

  private templateControllerConditionSource(
    resource: TemplateResourceRuntimeAnalysisEmission,
    instruction: HydrateTemplateControllerInstruction,
    ambientScope: BindingScope,
    projectors: OverlayExpressionSourceProjectors,
    baseExpressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
    overlayFileName: string,
  ): readonly TemplateTypeSystemOverlayExpressionPart[] | null {
    const expressionProductHandle = templateControllerValueExpressionProductHandle(this.store, instruction);
    if (expressionProductHandle == null) {
      return null;
    }
    const parse = readTemplateExpressionParse(this.store, expressionProductHandle);
    const ast = parse == null ? null : completedTemplateExpressionAstForParse(parse);
    const bindings = runtimeExpressionBindingsForTemplateExpressionProductHandle(resource, expressionProductHandle);
    const scopedBindings = bindings.length === 0
      ? []
      : runtimeExpressionBindingsForTemplateExpressionProductHandleInScope(resource, expressionProductHandle, ambientScope);
    if (bindings.length > 0 && scopedBindings.length === 0) {
      return null;
    }
    const source = ast == null ? null : this.copyRuntimeSourceExpression(
      resource,
      ast,
      expressionProductHandle,
      ambientScope,
      scopedBindings,
      projectors,
      baseExpressionContext,
      overlayFileName,
      `template-controller:${instruction.productHandle}:source`,
    );
    return source == null ? null : overlayExpressionParts(source);
  }

  private templateControllerValueSource(
    resource: TemplateResourceRuntimeAnalysisEmission,
    instruction: HydrateTemplateControllerInstruction,
    ambientScope: BindingScope,
    projectors: OverlayExpressionSourceProjectors,
    baseExpressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
    overlayFileName: string,
  ): readonly TemplateTypeSystemOverlayExpressionPart[] | null {
    const expressionSource = this.templateControllerConditionSource(
      resource,
      instruction,
      ambientScope,
      projectors,
      baseExpressionContext,
      overlayFileName,
    );
    if (expressionSource != null) {
      return expressionSource;
    }
    const valueProperty = templateControllerValueProperty(instruction);
    if (valueProperty == null) {
      return null;
    }
    for (const productHandle of instruction.bindingInstructionProductHandles) {
      const binding = this.store.productDetails.read(TemplateProductDetails.Instruction, productHandle);
      if (binding instanceof SetPropertyInstruction && binding.targetProperty === valueProperty && binding.value.length > 0) {
        return [{ kind: 'text', text: JSON.stringify(binding.value) }];
      }
    }
    return null;
  }

  private linkedTemplateControllerInstruction(
    resource: TemplateResourceRuntimeAnalysisEmission,
    sourceInstruction: HydrateTemplateControllerInstruction,
    targetFlowKind: BuiltInTemplateControllerFlowKind,
  ): HydrateTemplateControllerInstruction | null {
    const link = resource.runtimeAnalysis.scopes.templateControllerLinks.find((candidate) =>
      candidate.sourceInstruction.productHandle === sourceInstruction.productHandle
    ) ?? null;
    const instructionProductHandle = link?.targetController.instructionProductHandle ?? null;
    const instruction = instructionProductHandle == null
      ? null
      : templateInstructionForProductHandle(resource, instructionProductHandle);
    const semantics = instruction instanceof HydrateTemplateControllerInstruction
      ? frameworkTemplateControllerSemanticsForName(instruction.controllerName)
      : null;
    return instruction instanceof HydrateTemplateControllerInstruction && semantics?.flowKind === targetFlowKind
      ? instruction
      : null;
  }

  private switchCaseExpressions(
    resource: TemplateResourceRuntimeAnalysisEmission,
    switchInstruction: HydrateTemplateControllerInstruction,
    ambientScope: BindingScope,
    projectors: OverlayExpressionSourceProjectors,
    baseExpressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
    overlayFileName: string,
  ): readonly (readonly TemplateTypeSystemOverlayExpressionPart[])[] | null {
    const expressions: (readonly TemplateTypeSystemOverlayExpressionPart[])[] = [];
    for (const instruction of this.switchCaseInstructions(resource, switchInstruction)) {
      const parts = this.templateControllerValueSource(
        resource,
        instruction,
        ambientScope,
        projectors,
        baseExpressionContext,
        overlayFileName,
      );
      if (parts == null) {
        return null;
      }
      expressions.push(parts);
    }
    return expressions;
  }

  private switchCaseBranchExpressions(
    resource: TemplateResourceRuntimeAnalysisEmission,
    switchInstruction: HydrateTemplateControllerInstruction,
    caseInstruction: HydrateTemplateControllerInstruction,
    ambientScope: BindingScope,
    projectors: OverlayExpressionSourceProjectors,
    baseExpressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
    overlayFileName: string,
  ): SwitchCaseBranchExpressions | null {
    const siblings = this.switchCaseInstructions(resource, switchInstruction);
    const branch = templateControllerSwitchCaseBranch({
      cases: siblings,
      current: caseInstruction,
      readFallThrough: (candidate) =>
        staticTemplateControllerBooleanProperty(this.store, candidate, 'fallThrough', false),
    });
    if (branch == null) {
      return null;
    }
    const values = new Map<ProductHandle, readonly TemplateTypeSystemOverlayExpressionPart[]>();
    for (const sibling of [...branch.activeCases, ...branch.excludedCases]) {
      const value = this.templateControllerValueSource(
        resource,
        sibling,
        ambientScope,
        projectors,
        baseExpressionContext,
        overlayFileName,
      );
      if (value == null) {
        return null;
      }
      values.set(sibling.productHandle, value);
    }

    const caseExpressions: (readonly TemplateTypeSystemOverlayExpressionPart[])[] = [];
    const excludedCaseExpressions: (readonly TemplateTypeSystemOverlayExpressionPart[])[] = [];
    for (const sibling of branch.activeCases) {
      const value = values.get(sibling.productHandle);
      if (value == null) {
        return null;
      }
      caseExpressions.push(value);
    }
    for (const sibling of branch.excludedCases) {
      const value = values.get(sibling.productHandle);
      if (value == null) {
        return null;
      }
      excludedCaseExpressions.push(value);
    }

    return { caseExpressions, excludedCaseExpressions };
  }

  private switchCaseInstructions(
    resource: TemplateResourceRuntimeAnalysisEmission,
    switchInstruction: HydrateTemplateControllerInstruction,
  ): readonly HydrateTemplateControllerInstruction[] {
    const sequence = resource.compilation.compiledTemplate.instructionSequences.find((candidate) =>
      candidate.productHandle === switchInstruction.childInstructionSequenceProductHandle
    ) ?? null;
    const instructions = sequence?.instructions
      .map((reference) => reference.productHandle == null ? null : templateInstructionForProductHandle(resource, reference.productHandle))
      .filter((instruction): instruction is HydrateTemplateControllerInstruction =>
        instruction instanceof HydrateTemplateControllerInstruction
        && frameworkTemplateControllerSemanticsForName(instruction.controllerName)?.flowKind === BuiltInTemplateControllerFlowKind.SwitchCase
      );
    return instructions ?? [];
  }

  private runtimeAssignmentLocals(
    scope: BindingScope,
    creator: BindingScopeCreator,
    overlayFileName: string,
  ): readonly TemplateTypeSystemOverlayRuntimeAssignmentLocal[] {
    const assigned = new Set(creator.assignedSlotNames);
    return creator.assignedSlotNames
      .filter(isIdentifierName)
      .map((name) => ({
        name,
        typeExpression: this.runtimeAssignmentTypeExpression(scope, creator, name, assigned, overlayFileName),
      }));
  }

  private runtimeAssignmentTypeExpression(
    scope: BindingScope,
    creator: BindingScopeCreator,
    name: string,
    assigned: ReadonlySet<string>,
    overlayFileName: string,
  ): string | null {
    const slot = creator.assignedContextKind === BindingContextKind.Override
      ? scope.overrideContext.lookup(name)
      : scope.bindingContext.lookup(name);
    if (slot?.targetType == null) {
      return null;
    }
    for (const candidate of templateScopeVisibleSlots(scope)) {
      if (
        candidate.name !== name
        && !assigned.has(candidate.name)
        && isIdentifierName(candidate.name)
        && candidate.targetType != null
        && sameCheckerTypeReference(candidate.targetType, slot.targetType)
      ) {
        // Reuse an already-visible source alias instead of serializing a projected type display into generated text.
        return `typeof ${candidate.name}`;
      }
    }
    const targetMember = bindingContextSlotTargetTypeSourceMember(this.store, slot);
    if (targetMember != null) {
      return checkerMemberValueTypeExpression(targetMember, { generatedFileName: overlayFileName });
    }
    return checkerTypeReferenceTypeExpression(this.store, slot.targetType, { generatedFileName: overlayFileName });
  }

  private typedBindingContextLayer(
    scope: BindingScope,
    overlayFileName: string,
    parentAlias: TemplateTypeSystemOverlayScopeAlias | null = null,
  ): TemplateTypeSystemOverlayScopeLayer {
    return {
      kind: 'typed-binding-context',
      locals: this.typedBindingContextLocals(scope, overlayFileName),
      parentAlias,
    };
  }

  private typedBindingContextLocals(
    scope: BindingScope,
    overlayFileName: string,
  ): readonly TemplateTypeSystemOverlayRuntimeAssignmentLocal[] {
    return scope.bindingContext.slots
      .filter((slot) => isIdentifierName(slot.name))
      .map((slot) => ({
        name: slot.name,
        typeExpression: this.slotTypeExpression(slot, overlayFileName),
      }));
  }

  private viewModelImport(
    resource: TemplateResourceRuntimeAnalysisEmission,
    overlayFileName: string,
  ): ViewModelImport | null {
    const identity = resource.compilation.definition.target.identityHandle == null
      ? null
      : this.store.readIdentity(resource.compilation.definition.target.identityHandle);
    if (!(identity instanceof TypeScriptDeclarationIdentity) || identity.moduleKey == null || identity.localName == null) {
      return null;
    }
    const targetFileName = path.resolve(this.typeSystem.project.rootDir, identity.moduleKey);
    return {
      typeName: identity.exportedName ?? identity.localName,
      moduleSpecifier: moduleSpecifierForGeneratedTypeScriptSource(overlayFileName, targetFileName),
    };
  }

}

function skippedTemplateTypeSystemOverlayExpression(
  reason: TemplateTypeSystemOverlaySkippedReason,
  expressionProductHandle: string | null,
  source: SourceSpan | AddressHandle | null,
  summary: string,
): TemplateTypeSystemOverlaySkippedExpression {
  if (typeof source === 'string') {
    return {
      reason,
      expressionProductHandle,
      sourceAddressHandle: source,
      sourceStart: null,
      sourceEnd: null,
      summary,
    };
  }
  return {
    reason,
    expressionProductHandle,
    sourceAddressHandle: sourceAddressHandleForRuntimeExpressionSpan(source),
    sourceStart: source?.start ?? null,
    sourceEnd: source?.end ?? null,
    summary,
  };
}

function expressionSpansForOverlay(parse: TemplateExpressionParse): readonly OverlayExpressionSpan[] {
  switch (parse.result.kind) {
    case ExpressionParseResultKind.ExpressionSuccess:
    case ExpressionParseResultKind.EmptyExpressionSuccess:
    case ExpressionParseResultKind.OpaqueSuccess:
      return [{ span: parse.result.ast.span, ast: parse.result.ast }];
    case ExpressionParseResultKind.InterpolationSuccess:
      return parse.result.ast.expressions.map((expression) => ({ span: expression.span, ast: expression }));
    default:
      return [];
  }
}

function repeatEffectForScope(
  store: KernelStore,
  scope: BindingScope,
): IteratorBindingScopeEffect | null {
  const creator = scope.scopeCreators.find((candidate) =>
    candidate.creatorKind === BindingScopeCreatorKind.RuntimeBindingScopeEffect
  ) ?? null;
  if (creator == null) {
    return null;
  }
  const effect = runtimeBindingScopeEffectForCreator(store, creator);
  return effect instanceof IteratorBindingScopeEffect ? effect : null;
}

function runtimeBindingScopeEffectForCreator(
  store: KernelStore,
  creator: BindingScopeCreator,
): RuntimeBindingScopeEffect | null {
  return creator.creatorKind === BindingScopeCreatorKind.RuntimeBindingScopeEffect
    ? store.productDetails.read(TemplateProductDetails.RuntimeBindingScopeEffect, creator.productHandle)
    : null;
}

function valueConverterCallerContextKind(
  store: ProductDetailReadView,
  member: CheckerTypeMember | null,
): TemplateTypeSystemOverlayValueConverterCallerContextKind {
  switch (valueConverterWithContextComparisonKindFromMembers(store, member == null ? [] : [member])) {
    case CheckerStrictTrueComparisonKind.DefinitelyTrue:
      return TemplateTypeSystemOverlayValueConverterCallerContextKind.Required;
    case CheckerStrictTrueComparisonKind.MaybeTrue:
      return TemplateTypeSystemOverlayValueConverterCallerContextKind.RuntimeBranch;
    case CheckerStrictTrueComparisonKind.Missing:
    case CheckerStrictTrueComparisonKind.DefinitelyFalse:
      return TemplateTypeSystemOverlayValueConverterCallerContextKind.None;
  }
}

function overlayExpressionParts(
  projection: TemplateTypeSystemOverlayExpressionProjection,
): readonly TemplateTypeSystemOverlayExpressionPart[] | null {
  return projection.kind === TemplateTypeSystemOverlayExpressionProjectionKind.CopySource
    || projection.kind === TemplateTypeSystemOverlayExpressionProjectionKind.Generated
    ? projection.parts
    : null;
}

function textPart(text: string): TemplateTypeSystemOverlayExpressionPart {
  return { kind: 'text', text };
}

function projectionSourceAddressHandle(
  projection: TemplateTypeSystemOverlayExpressionProjection,
  fallback: SourceSpan,
): AddressHandle | null {
  return projection.source?.sourceAddressHandle
    ?? sourceAddressHandleForRuntimeExpressionSpan(fallback)
    ?? firstProjectionSource(projection)?.sourceAddressHandle
    ?? null;
}

function projectionSemanticProductHandle(
  projection: TemplateTypeSystemOverlayExpressionProjection,
): ProductHandle | null {
  return projection.source?.semanticProductHandle
    ?? firstProjectionSource(projection)?.semanticProductHandle
    ?? null;
}

function projectionSourceStart(
  projection: TemplateTypeSystemOverlayExpressionProjection,
  fallback: SourceSpan,
): number | null {
  return projection.source?.sourceStart ?? fallback.start ?? firstProjectionSource(projection)?.sourceStart ?? null;
}

function projectionSourceEnd(
  projection: TemplateTypeSystemOverlayExpressionProjection,
  fallback: SourceSpan,
): number | null {
  return projection.source?.sourceEnd ?? fallback.end ?? firstProjectionSource(projection)?.sourceEnd ?? null;
}

function firstProjectionSource(
  projection: TemplateTypeSystemOverlayExpressionProjection,
): TemplateTypeSystemOverlaySourceSlice | null {
  for (const part of projection.parts) {
    if (part.kind === 'source') {
      return part.source;
    }
  }
  return null;
}

function contextSlotLayersForScope(
  scope: BindingScope,
  store: KernelStore,
  overlayFileName: string,
  excludedNames: readonly string[] = [],
): readonly TemplateTypeSystemOverlayScopeLayer[] {
  const excluded = new Set(excludedNames);
  const locals = overlayContextSlotLocals(scope, store, overlayFileName)
    .filter((local) => !excluded.has(local.name));
  return locals.length === 0
    ? []
    : [{ kind: 'context-slots', locals }];
}

function overlayContextSlotLocals(
  scope: BindingScope,
  store: KernelStore,
  overlayFileName: string,
): readonly TemplateTypeSystemOverlayContextSlotLocal[] {
  return scope.overrideContext.slots.flatMap((slot) => {
    if (!isIdentifierName(slot.name)) {
      return [];
    }
    const valueKind = repeatOverrideSlotValueKind(slot.name);
    const typeExpression = slot.targetType == null
      ? null
      : checkerTypeReferenceTypeExpression(store, slot.targetType, { generatedFileName: overlayFileName });
    return valueKind == null
      ? []
      : [{
        name: slot.name,
        valueKind,
        typeExpression,
        assignmentAccessKind: slot.assignmentAccessKind,
      }];
  });
}

function repeatPreviousAssignmentAccessKind(
  scope: BindingScope,
): BindingContextSlotAssignmentAccessKind | null {
  return scope.overrideContext.lookup('$previous')?.assignmentAccessKind ?? null;
}

function overlayEventMemberTypes(
  scope: BindingScope,
  store: KernelStore,
  overlayFileName: string,
): readonly TemplateTypeSystemOverlayEventMemberType[] {
  const slot = scope.overrideContext.lookup('$event') ?? scope.bindingContext.lookup('$event');
  return slot?.memberTypes.flatMap((memberType) => {
    if (!isIdentifierName(memberType.name)) {
      return [];
    }
    const typeText = checkerTypeReferenceTypeExpression(store, memberType.targetType, { generatedFileName: overlayFileName });
    return typeText == null
      ? []
      : [{ name: memberType.name, typeText }];
  }) ?? [];
}

function repeatOverrideSlotValueKind(
  name: string,
): TemplateTypeSystemOverlayContextSlotLocal['valueKind'] | null {
  switch (name) {
    case '$index':
    case '$length':
      return 'number';
    case '$odd':
    case '$even':
    case '$first':
    case '$middle':
    case '$last':
      return 'boolean';
    case '$previous':
      return 'dynamic';
    default:
      return null;
  }
}

function repeatPreviousOverlayKind(
  scope: BindingScope,
): TemplateTypeSystemOverlayRepeatLayer['previousKind'] {
  const previous = scope.overrideContext.lookup('$previous');
  if (previous?.targetType?.display === 'undefined') {
    return 'undefined';
  }
  return previous?.targetType == null ? 'unknown' : 'element-or-undefined';
}

function isIdentifierName(value: string): boolean {
  return templateTypeSystemOverlayIdentifierName(value);
}

function resourceTargetTypeExpressionFromIdentity(
  store: KernelStore,
  target: ResourceTargetReference,
  overlayFileName: string,
  rootDir: string,
): OverlayTypeExpression | null {
  const identity = target.identityHandle == null ? null : store.readIdentity(target.identityHandle);
  if (!(identity instanceof TypeScriptDeclarationIdentity) || identity.moduleKey == null) {
    return null;
  }
  const typeName = identity.exportedName ?? identity.localName;
  if (typeName == null || !isIdentifierName(typeName)) {
    return null;
  }
  return {
    typeExpression: typeImportExpression(
      overlayFileName,
      path.resolve(rootDir, identity.moduleKey),
      typeName,
    ),
  };
}

function resourceTargetTypeExpressionFromType(
  store: KernelStore,
  targetType: CheckerTypeReference | null,
  overlayFileName: string,
): OverlayTypeExpression | null {
  const typeExpression = targetType == null
    ? null
    : checkerTypeReferenceTypeExpression(store, targetType, { generatedFileName: overlayFileName });
  return typeExpression == null
    ? null
    : { typeExpression };
}

function sanitizeOverlayFilePart(value: string): string {
  const normalized = value.replace(/[^A-Z_a-z0-9]+/gu, '-').replace(/^-|-$/gu, '');
  const maximumLength = 120;
  const hash = stableKernelLocalHash(value);
  const readable = normalized.length === 0 ? 'template' : normalized;
  // Normalization and truncation are both lossy, so the full semantic key always retains the final say.
  return `${readable.slice(0, maximumLength - hash.length - 1)}-${hash}`;
}

function sanitizeIdentifierPart(value: string): string {
  const normalized = value.replace(/[^$\w]+/gu, '_').replace(/^_+|_+$/gu, '');
  const part = normalized.length === 0 ? 'converter' : normalized.slice(0, 80);
  return /^[$A-Z_a-z]/u.test(part) ? part : `converter_${part}`;
}

function typeImportExpression(
  overlayFileName: string,
  targetFileName: string,
  typeName: string,
): string {
  const moduleSpecifier = moduleSpecifierForGeneratedTypeScriptSource(overlayFileName, targetFileName);
  return `import(${templateTypeSystemOverlayQuotedStringLiteral(moduleSpecifier)}).${typeName}`;
}
