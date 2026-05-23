import path from 'node:path';
import type { ExpressionAstNode } from '../expression/ast.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import type { SourceSpan } from '../expression/source-span.js';
import { TypeScriptDeclarationIdentity } from '../kernel/identity.js';
import type { AddressHandle, ProductHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import {
  BindingScope,
  BindingScopeConditionPolarity,
  BindingScopeCreatorKind,
  BindingScopeOwnerKind,
  type BindingContextSlot,
  type BindingScopeCreator,
} from '../configuration/scope.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  sameCheckerTypeReference,
  type CheckerTypeMember,
  type CheckerTypeReference,
} from '../type-system/type-shape.js';
import {
  checkerMemberValueTypeExpression,
  checkerTypeShapeTypeExpression,
  moduleSpecifierForGeneratedTypeScriptSource,
} from '../type-system/generated-type-expression.js';
import {
  TypeSystemOverlaySourceBuilder,
  type TypeSystemOverlaySource,
} from '../type-system/overlay.js';
import { TypeSystemHotDetails } from '../type-system/product-details.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import type { ValueConverterDefinition } from '../resources/value-converter-definition.js';
import type { ResourceTargetReference } from '../resources/resource-reference.js';
import { TypeSystemProductDetails } from '../type-system/product-details.js';
import { readOrProjectCheckerTypeMembers } from '../type-system/checker-type-member-surface.js';
import {
  appendTemplateTypeSystemOverlayScopeBlock,
  templateTypeSystemOverlayQuotedStringLiteral,
  templateTypeSystemOverlayIdentifierName,
  type TemplateTypeSystemOverlayConditionLayer,
  type TemplateTypeSystemOverlayContextSlotLocal,
  type TemplateTypeSystemOverlayEventMemberType,
  type TemplateTypeSystemOverlayExpressionPart,
  type TemplateTypeSystemOverlayLetEffect,
  type TemplateTypeSystemOverlayPromiseResultLayer,
  type TemplateTypeSystemOverlayRuntimeAssignmentLocal,
  type TemplateTypeSystemOverlayScopeAlias,
  type TemplateTypeSystemOverlayScopeLayer,
  type TemplateTypeSystemOverlaySourceSlice,
  type TemplateTypeSystemOverlaySwitchCaseLayer,
} from './template-type-system-overlay-plan.js';
import {
  appendTemplateTypeSystemOverlayExpressionProjection,
  TemplateTypeSystemOverlayExpressionProjectionKind,
  TemplateTypeSystemOverlayExpressionProjector,
  type TemplateTypeSystemOverlayExpressionProjection,
  type TemplateTypeSystemOverlayExpressionProjectionContext,
  type TemplateTypeSystemOverlayExpressionScopeAliases,
} from './template-type-system-overlay-expression.js';
import { findVisibleTemplateResource } from './compiler-resource-lookup.js';
import {
  IteratorBindingScopeEffect,
  LetBindingScopeEffect,
} from './runtime-binding.js';
import { TemplateProductDetails } from './product-details.js';
import {
  DispatchBindingInstruction,
  HydrateTemplateControllerInstruction,
  ListenerBindingInstruction,
  PropertyBindingInstruction,
  SetPropertyInstruction,
  TemplateBindingMode,
} from './instruction-ir.js';
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
  bindingScopeForTemplateExpressionParse,
  templateInstructionForExpressionParse,
  templateExpressionParsesForResource,
  templateInstructionForProductHandle,
} from './template-expression-selection.js';
import {
  appendTemplateTypeSystemOverlayPrelude,
  type TemplateTypeSystemOverlayPreludeViewModel,
} from './template-type-system-overlay-prelude.js';

export const enum TemplateTypeSystemOverlaySkippedReason {
  MissingViewModelIdentity = 'missing-view-model-identity',
  MissingExpressionSource = 'missing-expression-source',
  UnsupportedScopeOwner = 'unsupported-scope-owner',
  MissingRepeatScopeEffect = 'missing-repeat-scope-effect',
  MissingRepeatExpressionSource = 'missing-repeat-expression-source',
  MissingLetScopeEffect = 'missing-let-scope-effect',
  MissingLetExpressionSource = 'missing-let-expression-source',
  UnsupportedLetTarget = 'unsupported-let-target',
  UnsupportedLetScope = 'unsupported-let-scope',
  MissingSyntheticScopeCreator = 'missing-synthetic-scope-creator',
  MissingSyntheticScopeCondition = 'missing-synthetic-scope-condition',
  UnsupportedSyntheticScope = 'unsupported-synthetic-scope',
  UnsupportedExpressionSyntax = 'unsupported-expression-syntax',
}

interface SwitchCaseBranchExpressions {
  readonly caseExpressions: readonly (readonly TemplateTypeSystemOverlayExpressionPart[])[];
  readonly excludedCaseExpressions: readonly (readonly TemplateTypeSystemOverlayExpressionPart[])[];
}

export interface TemplateTypeSystemOverlayExpressionProbe {
  readonly localName: string;
  readonly expressionText: string;
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
    this.expressions = new TemplateTypeSystemOverlayExpressionProjector(typeSystem.project.rootDir);
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
    const probes: TemplateTypeSystemOverlayExpressionProbe[] = [];
    const skipped: TemplateTypeSystemOverlaySkippedExpression[] = [];
    const baseExpressionContext = this.expressionProjectionContext(resource, overlayFileName, builder);

    this.appendHeader(builder, viewModel);
    this.appendRootAliases(builder, resource.runtimeAnalysis.scopes.rootScope, overlayFileName);

    let index = 0;
    for (const parse of templateExpressionParsesForResource(resource)) {
      if (this.expressionParseIsTemplateControllerLocalTarget(resource, parse)) {
        continue;
      }
      for (const expressionSpan of expressionSpansForOverlay(parse)) {
        const scope = bindingScopeForTemplateExpressionParse(resource, parse)
          ?? resource.runtimeAnalysis.scopes.rootScope;
        const expressionContext = this.expressionProjectionContextForScope(baseExpressionContext, scope);
        const expression = this.expressions.copyableExpression(expressionSpan.ast, expressionContext, parse.productHandle);
        if (expression.kind === TemplateTypeSystemOverlayExpressionProjectionKind.UnsupportedSyntax) {
          skipped.push(skippedTemplateTypeSystemOverlayExpression(
            TemplateTypeSystemOverlaySkippedReason.UnsupportedExpressionSyntax,
            parse.productHandle,
            expressionSpan.span,
            expression.unsupportedSyntax?.summary ?? 'Template expression is not representable in a TypeScript overlay yet.',
          ));
          continue;
        }
        if (expression.kind === TemplateTypeSystemOverlayExpressionProjectionKind.MissingSource) {
          skipped.push(skippedTemplateTypeSystemOverlayExpression(
            TemplateTypeSystemOverlaySkippedReason.MissingExpressionSource,
            parse.productHandle,
            expressionSpan.span,
            'Template expression had no readable authored source text.',
          ));
          continue;
        }
        const localName = `__au_expr_${index}`;
        const layers = this.scopeLayers(resource, scope, skipped, parse, expressionContext, overlayFileName);
        if (layers == null) {
          continue;
        }
        const block = appendTemplateTypeSystemOverlayScopeBlock(builder, layers);
        builder.append(`${block.indent}const ${localName} = `);
        appendTemplateTypeSystemOverlayExpressionProjection(builder, expression, `template expression ${index}`);
        builder
          .append(';\n')
          .append(`${block.indent}void ${localName};\n`);
        for (let close = 0; close < block.closeCount; close += 1) {
          const indent = '  '.repeat(block.closeCount - close - 1);
          builder.append(`${indent}}\n`);
        }
        probes.push({
          localName,
          expressionText: expression.text,
          semanticProductHandle: projectionSemanticProductHandle(expression),
          sourceAddressHandle: projectionSourceAddressHandle(expression, expressionSpan.span),
          sourceStart: projectionSourceStart(expression, expressionSpan.span),
          sourceEnd: projectionSourceEnd(expression, expressionSpan.span),
        });
        index += 1;
      }
    }

    this.appendFooter(builder);
    return new TemplateTypeSystemOverlayEmission(builder.build(), probes, skipped);
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

  private expressionParseIsTemplateControllerLocalTarget(
    resource: TemplateResourceRuntimeAnalysisEmission,
    parse: TemplateExpressionParse,
  ): boolean {
    const binding = templateInstructionForExpressionParse(resource, parse);
    if (!(binding instanceof PropertyBindingInstruction) || binding.bindingMode !== TemplateBindingMode.FromView) {
      return false;
    }
    const owner = templateControllerInstructionOwningBinding(resource, binding.productHandle);
    if (owner == null) {
      return false;
    }
    const ownerSemantics = frameworkTemplateControllerSemanticsForName(owner.controllerName);
    if (
      ownerSemantics?.flowKind !== BuiltInTemplateControllerFlowKind.PromiseFulfilled
      && ownerSemantics?.flowKind !== BuiltInTemplateControllerFlowKind.PromiseRejected
    ) {
      return false;
    }
    return binding.targetProperty === templateControllerValueProperty(owner);
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
    const member = this.runtimeAssignmentTargetMember(slot);
    if (member != null) {
      return checkerMemberValueTypeExpression(member, { generatedFileName: overlayFileName });
    }
    const typeProductHandle = slot.targetType?.productHandle ?? null;
    const typeShape = typeProductHandle == null
      ? null
      : this.store.productDetails.read(TypeSystemProductDetails.TypeShape, typeProductHandle);
    return typeShape == null
      ? null
      : checkerTypeShapeTypeExpression(typeShape, { generatedFileName: overlayFileName });
  }

  private expressionProjectionContext(
    resource: TemplateResourceRuntimeAnalysisEmission,
    overlayFileName: string,
    builder: TypeSystemOverlaySourceBuilder,
  ): TemplateTypeSystemOverlayExpressionProjectionContext {
    const helpers = new Map<string, string>();
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
        const definition = visible?.definition;
        if (definition == null || definition.type !== ResourceDefinitionKind.ValueConverter) {
          return {
            converterText: '__au_missing_value_converter',
            converterNameSource,
          };
        }
        const targetType = this.resourceTargetTypeExpression(definition, overlayFileName);
        if (targetType == null) {
          return null;
        }
        const helperKey = `${targetType.typeExpression}\0${definition.name}`;
        let helperName = helpers.get(helperKey);
        if (helperName == null) {
          helperName = `__au_vc_${helpers.size}_${sanitizeIdentifierPart(definition.name)}`;
          helpers.set(helperKey, helperName);
          builder.appendLine(`const ${helperName} = undefined as unknown as ${targetType.typeExpression};`);
        }
        return {
          converterText: helperName,
          converterNameSource,
        };
      },
    };
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

  private expressionScopeAliases(scope: BindingScope): TemplateTypeSystemOverlayExpressionScopeAliases {
    let currentBindingContext = true;
    let parentBindingContextDepth = 0;
    for (const current of scopeReplayChain(scope)) {
      if (!scopeCreatesCurrentBindingContextAlias(current)) {
        continue;
      }
      parentBindingContextDepth = currentBindingContext ? parentBindingContextDepth + 1 : 0;
      currentBindingContext = true;
    }
    return {
      currentBindingContext,
      parentBindingContextDepth,
    };
  }

  private resourceTargetTypeExpression(
    definition: ValueConverterDefinition,
    overlayFileName: string,
  ): OverlayTypeExpression | null {
    const fromIdentity = resourceTargetTypeExpressionFromIdentity(this.store, definition.target, overlayFileName, this.typeSystem.project.rootDir);
    if (fromIdentity != null) {
      return fromIdentity;
    }
    const fromType = resourceTargetTypeExpressionFromType(this.store, definition.target.targetType, overlayFileName);
    if (fromType != null) {
      return fromType;
    }
    if (definition.target.moduleKey == null || definition.target.localName == null || !isIdentifierName(definition.target.localName)) {
      return null;
    }
    return {
      typeExpression: typeImportExpression(
        overlayFileName,
        path.resolve(this.typeSystem.project.rootDir, definition.target.moduleKey),
        definition.target.localName,
      ),
    };
  }

  private scopeLayers(
    resource: TemplateResourceRuntimeAnalysisEmission,
    scope: BindingScope,
    skipped: TemplateTypeSystemOverlaySkippedExpression[],
    parse: TemplateExpressionParse,
    expressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
    overlayFileName: string,
  ): readonly TemplateTypeSystemOverlayScopeLayer[] | null {
    const layers: TemplateTypeSystemOverlayScopeLayer[] = [];
    let currentBindingContextAlias: string | null = '$this';
    let currentParentBindingContextAlias: string | null = null;
    for (const current of scopeReplayChain(scope)) {
      if (current.ownerKind === BindingScopeOwnerKind.RepeatedItem) {
        const effect = repeatEffectForScope(resource, current);
        if (effect == null) {
          skipped.push(skippedTemplateTypeSystemOverlayExpression(
            TemplateTypeSystemOverlaySkippedReason.MissingRepeatScopeEffect,
            parse.productHandle,
            current.sourceAddressHandle,
            'Repeated-item scope did not carry a matching iterator scope effect. Then generated overlay cannot replay its local declaration.',
          ));
          return null;
        }
        const repeat = this.repeatSource(effect, expressionContext);
        if (repeat == null) {
          skipped.push(skippedTemplateTypeSystemOverlayExpression(
            TemplateTypeSystemOverlaySkippedReason.UnsupportedExpressionSyntax,
            parse.productHandle,
            effect.sourceAddressHandle,
            'Iterator scope effect expression is not representable in a TypeScript overlay yet.',
          ));
          return null;
        }
        layers.push({
          kind: 'repeat',
          declaration: repeat.declaration,
          iterable: repeat.iterable,
          currentAliasExpression: repeatScopeCurrentAliasExpression(current),
          parentAlias: currentBindingContextAlias == null
            ? null
            : {
              name: '$parent',
              expression: currentBindingContextAlias,
              parentExpression: currentParentBindingContextAlias,
            },
        });
        currentParentBindingContextAlias = currentBindingContextAlias == null
          ? null
          : '$parent';
        currentBindingContextAlias = repeatScopeCurrentAliasExpression(current);
        const overrideLocals = overlayContextSlotLocals(current);
        if (overrideLocals.length > 0) {
          layers.push({
            kind: 'context-slots',
            locals: overrideLocals,
          });
        }
        continue;
      }

      if (current.ownerKind === BindingScopeOwnerKind.LetElement) {
        const effects = this.letEffectsForScope(resource, current);
        if (effects.length === 0) {
          skipped.push(skippedTemplateTypeSystemOverlayExpression(
            TemplateTypeSystemOverlaySkippedReason.MissingLetScopeEffect,
            parse.productHandle,
            current.sourceAddressHandle,
            'Let scope did not retain the let binding scope effects that created it.',
          ));
          return null;
        }
        const letEffects = this.letSources(effects, skipped, parse, expressionContext);
        if (letEffects == null) {
          return null;
        }
        layers.push({
          kind: 'let',
          effects: letEffects,
        });
        continue;
      }

      if (current.ownerKind === BindingScopeOwnerKind.SyntheticView) {
        const syntheticLayers = this.syntheticViewLayers(
          resource,
          current,
          skipped,
          parse,
          expressionContext,
          overlayFileName,
          currentBindingContextAlias == null
            ? null
            : {
              name: '$parent',
              expression: currentBindingContextAlias,
              parentExpression: currentParentBindingContextAlias,
            },
        );
        if (syntheticLayers == null) {
          return null;
        }
        layers.push(...syntheticLayers);
        if (scopeCreatesCurrentBindingContextAlias(current)) {
          currentParentBindingContextAlias = currentBindingContextAlias == null
            ? null
            : '$parent';
          currentBindingContextAlias = '$this';
        }
        continue;
      }

      if (current.ownerKind === BindingScopeOwnerKind.StateBinding) {
        layers.push(this.typedBindingContextLayer(current, overlayFileName));
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

  private repeatSource(
    effect: IteratorBindingScopeEffect,
    expressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
  ): {
    readonly declaration: TemplateTypeSystemOverlaySourceSlice;
    readonly iterable: readonly TemplateTypeSystemOverlayExpressionPart[];
  } | null {
    const parse = effect.iterableExpressionProductHandle == null
      ? null
      : this.store.productDetails.read(TemplateProductDetails.ExpressionParse, effect.iterableExpressionProductHandle);
    if (parse?.result.kind !== ExpressionParseResultKind.IteratorSuccess) {
      return null;
    }
    const declaration = this.expressions.sourceSlice(parse.result.ast.declaration.span, parse.productHandle);
    const iterable = this.expressions.copyableExpression(parse.result.ast.iterable, expressionContext, parse.productHandle);
    const iterableParts = overlayExpressionParts(iterable);
    if (iterableParts == null) {
      return null;
    }
    return declaration == null
      ? null
      : { declaration, iterable: iterableParts };
  }

  private letEffectsForScope(
    resource: TemplateResourceRuntimeAnalysisEmission,
    scope: BindingScope,
  ): readonly LetBindingScopeEffect[] {
    const handles = new Set(scope.scopeCreators
      .filter((creator) => creator.creatorKind === BindingScopeCreatorKind.RuntimeBindingScopeEffect)
      .map((creator) => creator.productHandle));
    if (handles.size === 0) {
      return [];
    }
    return resource.runtimeAnalysis.runtimeRendering.scopeEffects.filter((effect): effect is LetBindingScopeEffect =>
      effect instanceof LetBindingScopeEffect && handles.has(effect.productHandle)
    );
  }

  private letSources(
    effects: readonly LetBindingScopeEffect[],
    skipped: TemplateTypeSystemOverlaySkippedExpression[],
    parse: TemplateExpressionParse,
    expressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
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
      const expression = this.letExpressionSource(effect, expressionContext);
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
      });
    }
    return result;
  }

  private letExpressionSource(
    effect: LetBindingScopeEffect,
    expressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
  ): readonly TemplateTypeSystemOverlayExpressionPart[] | null {
    const parse = effect.expressionProductHandle == null
      ? null
      : this.store.productDetails.read(TemplateProductDetails.ExpressionParse, effect.expressionProductHandle);
    const ast = parse == null ? null : completedTemplateExpressionAstForParse(parse);
    const source = ast == null ? null : this.expressions.copyableExpression(ast, expressionContext, effect.expressionProductHandle);
    return source == null ? null : overlayExpressionParts(source);
  }

  private syntheticViewLayers(
    resource: TemplateResourceRuntimeAnalysisEmission,
    scope: BindingScope,
    skipped: TemplateTypeSystemOverlaySkippedExpression[],
    parse: TemplateExpressionParse,
    expressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
    overlayFileName: string,
    parentAlias: TemplateTypeSystemOverlayScopeAlias | null,
  ): readonly TemplateTypeSystemOverlayScopeLayer[] | null {
    const layers: TemplateTypeSystemOverlayScopeLayer[] = [];
    const creators = scope.scopeCreators
      .map((creator) => this.creatorLayer(resource, scope, creator, skipped, parse, scope.sourceAddressHandle, expressionContext, overlayFileName, parentAlias));
    for (const creator of creators) {
      if (creator == null) {
        return null;
      }
      layers.push(...creator);
    }
    if (layers.length === 0) {
      skipped.push(skippedTemplateTypeSystemOverlayExpression(
        TemplateTypeSystemOverlaySkippedReason.MissingSyntheticScopeCreator,
        parse.productHandle,
        scope.sourceAddressHandle,
        'Synthetic-view scope did not retain representable creator products.',
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
    expressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
    overlayFileName: string,
    parentAlias: TemplateTypeSystemOverlayScopeAlias | null,
  ): readonly TemplateTypeSystemOverlayScopeLayer[] | null {
    switch (creator.creatorKind) {
      case BindingScopeCreatorKind.RuntimeBindingScopeEffect:
        return this.runtimeBindingScopeEffectCreatorLayer(
          resource,
          scope,
          creator,
          skipped,
          parse,
          sourceAddressHandle,
          expressionContext,
        );
      case BindingScopeCreatorKind.StateBinding:
        return [this.typedBindingContextLayer(scope, overlayFileName)];
      case BindingScopeCreatorKind.RuntimeAssignment:
        return this.runtimeAssignmentCreatorLayer(scope, creator, overlayFileName);
      case BindingScopeCreatorKind.ListenerEvent:
        return this.listenerEventCreatorLayer(resource, scope, creator, skipped, parse, sourceAddressHandle);
      case BindingScopeCreatorKind.TemplateControllerCondition:
        return this.templateControllerConditionCreatorLayer(resource, creator, skipped, parse, sourceAddressHandle, expressionContext);
      case BindingScopeCreatorKind.TemplateControllerBranch:
        return this.templateControllerBranchCreatorLayer(resource, creator, skipped, parse, sourceAddressHandle, expressionContext);
      case BindingScopeCreatorKind.TemplateControllerValueScope:
        return this.templateControllerValueScopeCreatorLayer(
          resource,
          scope,
          creator,
          skipped,
          parse,
          sourceAddressHandle,
          expressionContext,
          parentAlias,
        );
      case BindingScopeCreatorKind.TemplateControllerPromiseResult:
        return this.templateControllerPromiseResultCreatorLayer(
          resource,
          scope,
          creator,
          skipped,
          parse,
          expressionContext,
          sourceAddressHandle,
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
    return creator.introducedSlotNames.length === 0
      ? []
      : [{
        kind: 'runtime-assignment',
        locals: this.runtimeAssignmentLocals(scope, creator, overlayFileName),
      }];
  }

  private listenerEventCreatorLayer(
    resource: TemplateResourceRuntimeAnalysisEmission,
    scope: BindingScope,
    creator: BindingScopeCreator,
    skipped: TemplateTypeSystemOverlaySkippedExpression[],
    parse: TemplateExpressionParse,
    sourceAddressHandle: AddressHandle | null,
  ): readonly TemplateTypeSystemOverlayScopeLayer[] | null {
    const instruction = templateInstructionForProductHandle(resource, creator.productHandle);
    if (instruction instanceof ListenerBindingInstruction || instruction instanceof DispatchBindingInstruction) {
      return [{
        kind: 'event',
        eventName: instruction.eventName,
        memberTypes: overlayEventMemberTypes(scope),
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
    expressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
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
      instruction,
      creator.conditionPolarity === BindingScopeConditionPolarity.Falsy,
      skipped,
      parse,
      expressionContext,
    );
    return layer == null ? null : [layer];
  }

  private templateControllerBranchCreatorLayer(
    resource: TemplateResourceRuntimeAnalysisEmission,
    creator: BindingScopeCreator,
    skipped: TemplateTypeSystemOverlaySkippedExpression[],
    parse: TemplateExpressionParse,
    sourceAddressHandle: AddressHandle | null,
    expressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
  ): readonly TemplateTypeSystemOverlayScopeLayer[] | null {
    const instruction = templateInstructionForProductHandle(resource, creator.productHandle);
    if (!(instruction instanceof HydrateTemplateControllerInstruction)) {
      return [];
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
        expressionContext,
      );
      return layer == null ? null : [layer];
    }

    const source = this.templateControllerConditionSource(instruction, expressionContext);
    if (source == null || semantics?.flowKind !== BuiltInTemplateControllerFlowKind.Conditional) {
      return [];
    }
    return [{
      kind: 'condition',
      condition: source,
      negate: false,
    }];
  }

  private templateControllerPromiseResultCreatorLayer(
    resource: TemplateResourceRuntimeAnalysisEmission,
    scope: BindingScope,
    creator: BindingScopeCreator,
    skipped: TemplateTypeSystemOverlaySkippedExpression[],
    parse: TemplateExpressionParse,
    expressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
    sourceAddressHandle: AddressHandle | null,
  ): readonly TemplateTypeSystemOverlayScopeLayer[] | null {
    const layer = this.templateControllerPromiseResultLayer(
      resource,
      scope,
      creator,
      skipped,
      parse,
      expressionContext,
      sourceAddressHandle,
    );
    return layer == null ? null : [layer];
  }

  private runtimeBindingScopeEffectCreatorLayer(
    resource: TemplateResourceRuntimeAnalysisEmission,
    scope: BindingScope,
    creator: BindingScopeCreator,
    skipped: TemplateTypeSystemOverlaySkippedExpression[],
    parse: TemplateExpressionParse,
    sourceAddressHandle: AddressHandle | null,
    expressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
  ): readonly TemplateTypeSystemOverlayScopeLayer[] | null {
    const scopeEffect = resource.runtimeAnalysis.runtimeRendering.scopeEffects.find((effect) =>
      effect.productHandle === creator.productHandle
    ) ?? null;
    if (scopeEffect instanceof IteratorBindingScopeEffect) {
      const repeat = this.repeatSource(scopeEffect, expressionContext);
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
        currentAliasExpression: repeatScopeCurrentAliasExpression(scope),
        parentAlias: { name: '$parent', expression: '$this', parentExpression: null },
      }, ...contextSlotLayersForScope(scope)];
    }
    if (scopeEffect instanceof LetBindingScopeEffect) {
      const letEffects = this.letSources([scopeEffect], skipped, parse, expressionContext);
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
    expressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
    parentAlias: TemplateTypeSystemOverlayScopeAlias | null,
  ): readonly TemplateTypeSystemOverlayScopeLayer[] | null {
    const instruction = templateInstructionForProductHandle(resource, creator.productHandle);
    if (!(instruction instanceof HydrateTemplateControllerInstruction)) {
      return [];
    }
    const semantics = frameworkTemplateControllerSemanticsForName(instruction.controllerName);
    if (semantics?.flowKind === BuiltInTemplateControllerFlowKind.ValueScope) {
      const source = this.templateControllerValueSource(instruction, expressionContext);
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
        locals: bindingContextScopeLocals(scope),
        parentAlias,
      }];
    }
    if (semantics?.flowKind === BuiltInTemplateControllerFlowKind.Promise) {
      return scope.scopeCreators.some((candidate) =>
        candidate.creatorKind === BindingScopeCreatorKind.TemplateControllerPromiseResult
      )
        ? []
        : [{
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
    owner: HydrateTemplateControllerInstruction,
    fallbackNegate: boolean,
    skipped: TemplateTypeSystemOverlaySkippedExpression[],
    parse: TemplateExpressionParse,
    expressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
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

    const conditionSource = this.templateControllerConditionSource(owner, expressionContext);
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
    expressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
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
    const switchExpression = this.templateControllerValueSource(switchInstruction, expressionContext);
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
      const defaultCaseExpressions = this.switchCaseExpressions(resource, switchInstruction, expressionContext);
      return {
        kind: 'switch-case',
        switchExpression,
        caseExpressions: [],
        excludedCaseExpressions: [],
        defaultCaseExpressions: defaultCaseExpressions ?? [],
        narrow: defaultCaseExpressions != null && defaultCaseExpressions.length > 0,
      };
    }

    const caseExpression = this.templateControllerValueSource(instruction, expressionContext);
    if (caseExpression == null) {
      skipped.push(skippedTemplateTypeSystemOverlayExpression(
        TemplateTypeSystemOverlaySkippedReason.MissingSyntheticScopeCondition,
        parse.productHandle,
        instruction.sourceAddressHandle,
        "Case template-controller did not have readable 'value' expression text.",
      ));
      return null;
    }
    const branchExpressions = this.switchCaseBranchExpressions(resource, switchInstruction, instruction, expressionContext);
    return {
      kind: 'switch-case',
      switchExpression,
      caseExpressions: branchExpressions?.caseExpressions ?? [caseExpression],
      excludedCaseExpressions: branchExpressions?.excludedCaseExpressions ?? [],
      defaultCaseExpressions: [],
      narrow: branchExpressions != null,
    };
  }

  private templateControllerPromiseResultLayer(
    resource: TemplateResourceRuntimeAnalysisEmission,
    scope: BindingScope,
    creator: BindingScopeCreator,
    skipped: TemplateTypeSystemOverlaySkippedExpression[],
    parse: TemplateExpressionParse,
    expressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
    sourceAddressHandle: AddressHandle | null,
  ): TemplateTypeSystemOverlayPromiseResultLayer | null {
    const instruction = templateInstructionForProductHandle(resource, creator.productHandle);
    if (!(instruction instanceof HydrateTemplateControllerInstruction)) {
      skipped.push(skippedTemplateTypeSystemOverlayExpression(
        TemplateTypeSystemOverlaySkippedReason.UnsupportedSyntheticScope,
        parse.productHandle,
        creator.sourceAddressHandle ?? sourceAddressHandle,
        `Promise-result scope creator '${creator.productHandle}' did not resolve to a hydrate-template-controller instruction.`,
      ));
      return null;
    }
    const semantics = frameworkTemplateControllerSemanticsForName(instruction.controllerName);
    const resultKind = semantics?.flowKind === BuiltInTemplateControllerFlowKind.PromiseFulfilled
      ? 'fulfilled'
      : semantics?.flowKind === BuiltInTemplateControllerFlowKind.PromiseRejected
        ? 'rejected'
        : null;
    if (resultKind == null) {
      skipped.push(skippedTemplateTypeSystemOverlayExpression(
        TemplateTypeSystemOverlaySkippedReason.UnsupportedSyntheticScope,
        parse.productHandle,
        instruction.sourceAddressHandle,
        `Template-controller '${instruction.controllerName}' is not representable as a promise result yet.`,
      ));
      return null;
    }
    const promiseInstruction = this.promiseValueScopeInstruction(resource, scope);
    const promise = promiseInstruction == null
      ? null
      : this.templateControllerValueSource(promiseInstruction, expressionContext);
    if (promise == null) {
      skipped.push(skippedTemplateTypeSystemOverlayExpression(
        TemplateTypeSystemOverlaySkippedReason.MissingSyntheticScopeCondition,
        parse.productHandle,
        instruction.sourceAddressHandle,
        `Promise-result template-controller '${instruction.controllerName}' did not have a readable parent promise expression.`,
      ));
      return null;
    }
    return {
      kind: 'promise-result',
      promise,
      resultKind,
      locals: bindingContextScopeLocals(scope),
    };
  }

  private promiseValueScopeInstruction(
    resource: TemplateResourceRuntimeAnalysisEmission,
    scope: BindingScope,
  ): HydrateTemplateControllerInstruction | null {
    const creator = scope.scopeCreators.find((candidate) =>
      candidate.creatorKind === BindingScopeCreatorKind.TemplateControllerValueScope
    ) ?? null;
    if (creator == null) {
      return null;
    }
    const instruction = templateInstructionForProductHandle(resource, creator.productHandle);
    return instruction instanceof HydrateTemplateControllerInstruction
      ? instruction
      : null;
  }

  private templateControllerConditionSource(
    instruction: HydrateTemplateControllerInstruction,
    expressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
  ): readonly TemplateTypeSystemOverlayExpressionPart[] | null {
    const expressionProductHandle = templateControllerValueExpressionProductHandle(this.store, instruction);
    const parse = expressionProductHandle == null
      ? null
      : this.store.productDetails.read(TemplateProductDetails.ExpressionParse, expressionProductHandle);
    const ast = parse == null ? null : completedTemplateExpressionAstForParse(parse);
    const source = ast == null ? null : this.expressions.copyableExpression(ast, expressionContext, expressionProductHandle);
    return source == null ? null : overlayExpressionParts(source);
  }

  private templateControllerValueSource(
    instruction: HydrateTemplateControllerInstruction,
    expressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
  ): readonly TemplateTypeSystemOverlayExpressionPart[] | null {
    const expressionSource = this.templateControllerConditionSource(instruction, expressionContext);
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
    expressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
  ): readonly (readonly TemplateTypeSystemOverlayExpressionPart[])[] | null {
    const expressions: (readonly TemplateTypeSystemOverlayExpressionPart[])[] = [];
    for (const instruction of this.switchCaseInstructions(resource, switchInstruction)) {
      const parts = this.templateControllerValueSource(instruction, expressionContext);
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
    expressionContext: TemplateTypeSystemOverlayExpressionProjectionContext,
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
      const value = this.templateControllerValueSource(sibling, expressionContext);
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
    const introduced = new Set(creator.introducedSlotNames);
    return creator.introducedSlotNames
      .filter(isIdentifierName)
      .map((name) => ({
        name,
        typeExpression: this.runtimeAssignmentTypeExpression(scope, name, introduced, overlayFileName),
      }));
  }

  private runtimeAssignmentTypeExpression(
    scope: BindingScope,
    name: string,
    introduced: ReadonlySet<string>,
    overlayFileName: string,
  ): string | null {
    const slot = scope.bindingContext.lookup(name) ?? scope.overrideContext.lookup(name);
    if (slot?.targetType == null) {
      return null;
    }
    for (const candidate of visibleScopeSlots(scope)) {
      if (
        candidate.name !== name
        && !introduced.has(candidate.name)
        && isIdentifierName(candidate.name)
        && candidate.targetType != null
        && sameCheckerTypeReference(candidate.targetType, slot.targetType)
      ) {
        // Reuse an already-visible source alias instead of serializing a projected type display into generated text.
        return `typeof ${candidate.name}`;
      }
    }
    const targetMember = this.runtimeAssignmentTargetMember(slot);
    return targetMember == null
      ? null
      : checkerMemberValueTypeExpression(targetMember, { generatedFileName: overlayFileName });
  }

  private typedBindingContextLayer(
    scope: BindingScope,
    overlayFileName: string,
  ): TemplateTypeSystemOverlayScopeLayer {
    const typeProductHandle = scope.bindingContext.contextType?.productHandle ?? null;
    if (typeProductHandle == null) {
      return {
        kind: 'typed-binding-context',
        locals: [],
      };
    }
    const typeShape = this.store.productDetails.read(TypeSystemProductDetails.TypeShape, typeProductHandle);
    const locals = typeShape == null
      ? []
      : readOrProjectCheckerTypeMembers(this.store, typeShape, typeProductHandle)
        .filter((member) => isIdentifierName(member.name))
        .map((member) => ({
          name: member.name,
          typeExpression: checkerMemberValueTypeExpression(member, { generatedFileName: overlayFileName }),
        }));
    return {
      kind: 'typed-binding-context',
      locals,
    };
  }

  private runtimeAssignmentTargetMember(slot: BindingContextSlot): CheckerTypeMember | null {
    return slot.targetProductHandle == null
      ? null
      : this.store.hotDetails.read(TypeSystemHotDetails.TypeMember, slot.targetProductHandle);
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
      sourceAddressHandle: source as AddressHandle,
      sourceStart: null,
      sourceEnd: null,
      summary,
    };
  }
  return {
    reason,
    expressionProductHandle,
    sourceAddressHandle: (source?.file?.id as AddressHandle | undefined) ?? null,
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
      return 'ast' in parse.result ? [{ span: parse.result.ast.span, ast: parse.result.ast }] : [];
    case ExpressionParseResultKind.InterpolationSuccess:
      return parse.result.ast.expressions.map((expression) => ({ span: expression.span, ast: expression }));
    default:
      return [];
  }
}

function repeatEffectForScope(
  resource: TemplateResourceRuntimeAnalysisEmission,
  scope: BindingScope,
): IteratorBindingScopeEffect | null {
  const creator = scope.scopeCreators.find((candidate) =>
    candidate.creatorKind === BindingScopeCreatorKind.RuntimeBindingScopeEffect
  ) ?? null;
  if (creator == null) {
    return null;
  }
  return resource.runtimeAnalysis.runtimeRendering.scopeEffects.find((effect) =>
    effect instanceof IteratorBindingScopeEffect && effect.productHandle === creator.productHandle
  ) as IteratorBindingScopeEffect | undefined ?? null;
}

function scopeChain(scope: BindingScope): readonly BindingScope[] {
  const chain: BindingScope[] = [];
  let current: BindingScope | null = scope;
  while (current != null) {
    chain.unshift(current);
    current = current.parent;
  }
  return chain;
}

function scopeReplayChain(scope: BindingScope): readonly BindingScope[] {
  const chain = scopeChain(scope);
  const first = chain[0] ?? null;
  const start = first?.ownerKind === BindingScopeOwnerKind.CustomElementController
    || first?.ownerKind === BindingScopeOwnerKind.CustomAttributeController
    ? 1
    : 0;
  return chain.slice(start);
}

function visibleScopeSlots(scope: BindingScope): readonly BindingContextSlot[] {
  return [
    ...scope.bindingContext.slots,
    ...scope.overrideContext.slots,
  ];
}

function repeatScopeCurrentAliasExpression(scope: BindingScope): string | null {
  const names = repeatScopeIdentifierSlotNames(scope);
  return names.length === 0 ? null : `{ ${names.join(', ')} }`;
}

function scopeCreatesCurrentBindingContextAlias(scope: BindingScope): boolean {
  if (scope.ownerKind === BindingScopeOwnerKind.RepeatedItem) {
    return repeatScopeCurrentAliasExpression(scope) != null;
  }
  if (scope.ownerKind === BindingScopeOwnerKind.SyntheticView) {
    return scope.scopeCreators.some((creator) =>
      creator.creatorKind === BindingScopeCreatorKind.TemplateControllerValueScope
    ) && !scope.scopeCreators.some((creator) =>
      creator.creatorKind === BindingScopeCreatorKind.TemplateControllerPromiseResult
    );
  }
  return scope.ownerKind === BindingScopeOwnerKind.StateBinding;
}

function repeatScopeIdentifierSlotNames(scope: BindingScope): readonly string[] {
  return scope.bindingContext.slots
    .map((slot) => slot.name)
    .filter(isIdentifierName);
}

function overlayExpressionParts(
  projection: TemplateTypeSystemOverlayExpressionProjection,
): readonly TemplateTypeSystemOverlayExpressionPart[] | null {
  return projection.kind === TemplateTypeSystemOverlayExpressionProjectionKind.CopySource
    || projection.kind === TemplateTypeSystemOverlayExpressionProjectionKind.Generated
    ? projection.parts
    : null;
}

function projectionSourceAddressHandle(
  projection: TemplateTypeSystemOverlayExpressionProjection,
  fallback: SourceSpan,
): AddressHandle | null {
  return projection.source?.sourceAddressHandle
    ?? (fallback.file?.id as AddressHandle | undefined)
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

function contextSlotLayersForScope(scope: BindingScope): readonly TemplateTypeSystemOverlayScopeLayer[] {
  const locals = overlayContextSlotLocals(scope);
  return locals.length === 0
    ? []
    : [{ kind: 'context-slots', locals }];
}

function bindingContextScopeLocals(scope: BindingScope): readonly string[] {
  return scope.bindingContext.slots
    .map((slot) => slot.name)
    .filter(isIdentifierName);
}

function templateControllerInstructionOwningBinding(
  resource: TemplateResourceRuntimeAnalysisEmission,
  bindingProductHandle: ProductHandle,
): HydrateTemplateControllerInstruction | null {
  return resource.compilation.compiledTemplate.instructions.find((candidate) =>
    candidate instanceof HydrateTemplateControllerInstruction
    && candidate.bindingInstructionProductHandles.includes(bindingProductHandle)
  ) as HydrateTemplateControllerInstruction | undefined ?? null;
}

function overlayContextSlotLocals(scope: BindingScope): readonly TemplateTypeSystemOverlayContextSlotLocal[] {
  return scope.overrideContext.slots.flatMap((slot) => {
    if (!isIdentifierName(slot.name)) {
      return [];
    }
    const valueKind = repeatOverrideSlotValueKind(slot.name);
    return valueKind == null
      ? []
      : [{ name: slot.name, valueKind }];
  });
}

function overlayEventMemberTypes(scope: BindingScope): readonly TemplateTypeSystemOverlayEventMemberType[] {
  const slot = scope.overrideContext.lookup('$event') ?? scope.bindingContext.lookup('$event');
  return slot?.memberTypes.flatMap((memberType) => {
    if (!isIdentifierName(memberType.name)) {
      return [];
    }
    const typeText = overlayEventMemberTypeText(memberType.targetType);
    return typeText == null
      ? []
      : [{ name: memberType.name, typeText }];
  }) ?? [];
}

function overlayEventMemberTypeText(reference: CheckerTypeReference): string | null {
  const display = reference.display;
  return display != null && isIdentifierName(display)
    ? display
    : null;
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
  const typeProductHandle = targetType?.productHandle ?? null;
  const typeShape = typeProductHandle == null
    ? null
    : store.productDetails.read(TypeSystemProductDetails.TypeShape, typeProductHandle);
  const typeExpression = typeShape == null
    ? null
    : checkerTypeShapeTypeExpression(typeShape, { generatedFileName: overlayFileName });
  return typeExpression == null
    ? null
    : { typeExpression };
}

function sanitizeOverlayFilePart(value: string): string {
  const normalized = value.replace(/[^A-Z_a-z0-9]+/gu, '-').replace(/^-|-$/gu, '');
  return normalized.length === 0 ? 'template' : normalized.slice(0, 120);
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
