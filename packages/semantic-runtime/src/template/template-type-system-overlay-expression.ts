import {
  AuthoredScopePathKind,
  scopeExpressionWasAuthoredFromCurrentBindingContext,
  type ExpressionAstNode,
} from '../expression/ast.js';
import type { SourceSpan } from '../expression/source-span.js';
import type { ProductHandle } from '../kernel/handles.js';
import { AuthoredSourceTextCache } from '../kernel/authored-source-text.js';
import type { SemanticRuntimeProjectInputHost } from '../kernel/project-input.js';
import type { TypeSystemOverlaySourceBuilder } from '../type-system/overlay.js';
import {
  VALUE_CONVERTER_TO_VIEW_METHOD,
  VALUE_CONVERTER_WITH_CONTEXT_PROPERTY,
} from '../type-system/value-converter-call-surface.js';
import {
  appendTemplateTypeSystemOverlayExpressionParts,
  TEMPLATE_TYPE_SYSTEM_OVERLAY_PARENT_NAMED_LOOKUP_ALIAS,
  type TemplateTypeSystemOverlayExpressionPart,
  type TemplateTypeSystemOverlaySourceSlice,
} from './template-type-system-overlay-plan.js';
import {
  templateTypeSystemOverlayExpressionSupport,
  TemplateTypeSystemOverlayExpressionSupportKind,
} from './template-type-system-overlay-expression-support.js';
import {
  sourceAddressHandleForRuntimeExpressionSpan,
} from './runtime-expression-source-address.js';
import { bindingBehaviorResourceOccurrences } from './expression-resource-occurrence.js';

export const enum TemplateTypeSystemOverlayExpressionProjectionKind {
  /** Authored source text can be copied directly into the generated TypeScript overlay. */
  CopySource = 'copy-source',
  /** Generated overlay parts represent Aurelia-specific source through TypeScript-shaped helper calls or aliases. */
  Generated = 'generated',
  /** The parsed expression has no readable authored source slice in the current project epoch. */
  MissingSource = 'missing-source',
  /** The expression has a known owner but needs lower semantic substrate before overlay projection. */
  UnsupportedSyntax = 'unsupported-syntax',
}

export const enum TemplateTypeSystemOverlayExpressionUnsupportedKind {
  /** Value-converter projection is missing the modeled converter call surface for this expression. */
  ValueConverter = 'value-converter',
  /** Ancestor binding-context access is deeper than the replayed `$parent` alias chain. */
  AncestorScope = 'ancestor-scope',
  /** Current binding-context access needs a generated `$this` alias that this scope has not replayed. */
  CurrentBindingContext = 'current-binding-context',
  /** CustomExpression is owned by an extension grammar such as i18n rather than generic overlay projection. */
  CustomExpression = 'custom-expression',
  /** The expression needs statement-shaped overlay emission rather than expression projection. */
  StatementShape = 'statement-shape',
  /** The AST kind is only meaningful inside an owning product such as repeat, interpolation, or destructuring. */
  NonStandalone = 'non-standalone',
}

export class TemplateTypeSystemOverlayExpressionUnsupportedSyntax {
  constructor(
    readonly unsupportedKind: TemplateTypeSystemOverlayExpressionUnsupportedKind,
    readonly summary: string,
  ) {}
}

export const enum TemplateTypeSystemOverlayValueConverterCallKind {
  /** A checker-visible `toView` member is emitted as a direct TypeScript call so overload resolution stays native. */
  DirectToView = 'direct-to-view',
  /** Missing converters or converters without `toView` use the identity-shaped helper to keep argument expressions visible. */
  RuntimeIdentity = 'runtime-identity',
}

export const enum TemplateTypeSystemOverlayValueConverterCallerContextKind {
  /** The converter call never receives Aurelia's `ICallerContext` slot. */
  None = 'none',
  /** The converter call always receives Aurelia's `ICallerContext` slot before authored converter arguments. */
  Required = 'required',
  /** The overlay must model both runtime branches because `withContext === true` is not statically fixed. */
  RuntimeBranch = 'runtime-branch',
}

export interface TemplateTypeSystemOverlayValueConverterCallSurface {
  readonly callKind: TemplateTypeSystemOverlayValueConverterCallKind;
  readonly converterText: string;
  readonly converterNameSource: TemplateTypeSystemOverlaySourceSlice;
  readonly callerContextKind: TemplateTypeSystemOverlayValueConverterCallerContextKind;
}

export interface TemplateTypeSystemOverlayExpressionProjectionContext {
  readonly scopeAliases?: TemplateTypeSystemOverlayExpressionScopeAliases;
  /** Rendering-controller strict mode for this source expression; `false` enables Aurelia non-strict nullish lowering. */
  readonly strictBinding?: boolean | null;
  /** Disables read-position lowering for assignment targets where optional-chain output would be invalid TypeScript. */
  readonly lowerNonStrictAccess?: boolean;

  bindingBehaviorArgumentTypeExpressions?(
    expression: Extract<ExpressionAstNode, { readonly $kind: 'BindingBehavior' }>,
  ): readonly (string | null)[] | null;

  valueConverterCallSurface(
    expression: Extract<ExpressionAstNode, { readonly $kind: 'ValueConverter' }>,
    semanticProductHandle: ProductHandle | null,
  ): TemplateTypeSystemOverlayValueConverterCallSurface | null;
}

export interface TemplateTypeSystemOverlayExpressionScopeAliases {
  readonly currentBindingContext: boolean;
  readonly parentBindingContextDepth: number;
  /** Current Scope's override-first named-lookup expression for reserved-name collision avoidance. */
  readonly currentNamedLookupExpression?: string | null;
  /** Exact receiver/context selected by implicit Scope.getContext lookup; null keeps the receiver open. */
  implicitNamedLookupReceiver?(name: string): TemplateTypeSystemOverlayImplicitNamedLookupReceiver | null;
}

export interface TemplateTypeSystemOverlayImplicitNamedLookupReceiver {
  readonly ancestor: number;
  readonly contextKind: 'binding-context' | 'named-lookup';
}

interface ProjectedOverlayExpressionChild {
  readonly expression: ExpressionAstNode;
  readonly projection: TemplateTypeSystemOverlayExpressionProjection;
}

export class TemplateTypeSystemOverlayExpressionProjection {
  constructor(
    readonly kind: TemplateTypeSystemOverlayExpressionProjectionKind,
    readonly source: TemplateTypeSystemOverlaySourceSlice | null,
    readonly parts: readonly TemplateTypeSystemOverlayExpressionPart[],
    readonly unsupportedSyntax: TemplateTypeSystemOverlayExpressionUnsupportedSyntax | null,
  ) {}

  static copySource(source: TemplateTypeSystemOverlaySourceSlice): TemplateTypeSystemOverlayExpressionProjection {
    return new TemplateTypeSystemOverlayExpressionProjection(
      TemplateTypeSystemOverlayExpressionProjectionKind.CopySource,
      source,
      [{ kind: 'source', source, label: 'template expression' }],
      null,
    );
  }

  static generated(parts: readonly TemplateTypeSystemOverlayExpressionPart[]): TemplateTypeSystemOverlayExpressionProjection {
    return new TemplateTypeSystemOverlayExpressionProjection(
      TemplateTypeSystemOverlayExpressionProjectionKind.Generated,
      null,
      parts,
      null,
    );
  }

  static missingSource(): TemplateTypeSystemOverlayExpressionProjection {
    return new TemplateTypeSystemOverlayExpressionProjection(
      TemplateTypeSystemOverlayExpressionProjectionKind.MissingSource,
      null,
      [],
      null,
    );
  }

  static unsupported(
    unsupportedSyntax: TemplateTypeSystemOverlayExpressionUnsupportedSyntax,
  ): TemplateTypeSystemOverlayExpressionProjection {
    return new TemplateTypeSystemOverlayExpressionProjection(
      TemplateTypeSystemOverlayExpressionProjectionKind.UnsupportedSyntax,
      null,
      [],
      unsupportedSyntax,
    );
  }

  get text(): string {
    return this.parts.map((part) => part.kind === 'text' ? part.text : part.source.text).join('');
  }
}

/**
 * Projects Aurelia expression ASTs into the subset of authored text that can be copied into a TypeScript overlay.
 *
 * This layer is deliberately not an evaluator. It decides whether an already-parsed Aurelia expression has a
 * TypeScript-compatible source representation. Aurelia-only constructs are either lowered through framework-shaped
 * products, such as value-converter call surfaces and generated binding-context aliases, or kept as explicit
 * unsupported pressure until the semantic runtime has the right substrate for them.
 */
export class TemplateTypeSystemOverlayExpressionProjector {
  private readonly sourceTextCache: AuthoredSourceTextCache;

  constructor(
    rootDir: string,
    inputHost: SemanticRuntimeProjectInputHost,
  ) {
    this.sourceTextCache = new AuthoredSourceTextCache(rootDir, inputHost);
  }

  copyableExpression(
    expression: ExpressionAstNode,
    context: TemplateTypeSystemOverlayExpressionProjectionContext | null = null,
    semanticProductHandle: ProductHandle | null = null,
  ): TemplateTypeSystemOverlayExpressionProjection {
    return this.projectExpression(expression, context, semanticProductHandle, 0);
  }

  /** Adds independent bind-time argument witnesses around an already-projected source value. */
  withBindingBehaviorArguments(
    expression: ExpressionAstNode,
    input: TemplateTypeSystemOverlayExpressionProjection,
    context: TemplateTypeSystemOverlayExpressionProjectionContext,
    semanticProductHandle: ProductHandle | null = null,
  ): TemplateTypeSystemOverlayExpressionProjection {
    const checks: (readonly TemplateTypeSystemOverlayExpressionPart[])[] = [];
    for (const { expression: behavior } of bindingBehaviorResourceOccurrences(expression)) {
      const expectedTypes = context.bindingBehaviorArgumentTypeExpressions?.(behavior)
        ?? behavior.args.map(() => null);
      for (const [index, argument] of behavior.args.entries()) {
        const projected = this.copyableExpression(argument, context, semanticProductHandle);
        if (!projectionCanBecomeGeneratedChild(projected)) {
          return TemplateTypeSystemOverlayExpressionProjection.unsupported(unsupported(
            TemplateTypeSystemOverlayExpressionUnsupportedKind.StatementShape,
            `Binding behavior '${behavior.name.name}' argument ${index + 1} is not representable in a TypeScript overlay yet.`,
          ));
        }
        const expectedType = expectedTypes[index] ?? null;
        checks.push([
          {
            kind: 'text',
            text: expectedType == null
              ? '__au_binding_behavior_argument('
              : `__au_binding_behavior_argument<${expectedType}>(`,
          },
          ...projected.parts.map((part) => part.kind === 'source'
            ? { ...part, label: `binding behavior ${behavior.name.name} argument ${index + 1}` }
            : part),
          { kind: 'text', text: ')' },
        ]);
      }
    }
    if (checks.length === 0) {
      return input;
    }
    return TemplateTypeSystemOverlayExpressionProjection.generated([
      { kind: 'text', text: '(' },
      ...checks.flatMap((parts, index) => [
        ...(index === 0 ? [] : [{ kind: 'text' as const, text: ', ' }]),
        ...parts,
      ]),
      { kind: 'text', text: ', ' },
      ...input.parts,
      { kind: 'text', text: ')' },
    ]);
  }

  sourceSlice(
    span: SourceSpan,
    semanticProductHandle: ProductHandle | null = null,
  ): TemplateTypeSystemOverlaySourceSlice | null {
    const filePath = span.file?.path ?? null;
    if (filePath == null) {
      return null;
    }
    const source = this.sourceTextCache.read(filePath);
    if (source == null || span.start < 0 || span.end < span.start || span.end > source.text.length) {
      return null;
    }
    return {
      text: source.text.slice(span.start, span.end),
      semanticProductHandle,
      sourceAddressHandle: sourceAddressHandleForRuntimeExpressionSpan(span),
      sourceStart: span.start,
      sourceEnd: span.end,
    };
  }

  private valueConverterExpression(
    expression: Extract<ExpressionAstNode, { readonly $kind: 'ValueConverter' }>,
    context: TemplateTypeSystemOverlayExpressionProjectionContext | null,
    semanticProductHandle: ProductHandle | null,
    arrowCallbackDepth: number,
  ): TemplateTypeSystemOverlayExpressionProjection {
    const surface = context?.valueConverterCallSurface(expression, semanticProductHandle) ?? null;
    if (surface == null) {
      return TemplateTypeSystemOverlayExpressionProjection.unsupported(unsupported(
        TemplateTypeSystemOverlayExpressionUnsupportedKind.ValueConverter,
        'Value converter expressions need an importable modeled value-converter call surface before they can be checked by TypeScript overlays.',
      ));
    }
    const input = this.projectExpression(expression.expression, context, semanticProductHandle, arrowCallbackDepth);
    if (input.kind === TemplateTypeSystemOverlayExpressionProjectionKind.UnsupportedSyntax) {
      return input;
    }
    if (input.kind === TemplateTypeSystemOverlayExpressionProjectionKind.MissingSource) {
      return input;
    }
    const argumentParts = this.resourceArgumentParts(
      expression.args,
      context,
      semanticProductHandle,
      `value converter ${expression.name.name}`,
      arrowCallbackDepth,
    );
    if (argumentParts == null) {
      return TemplateTypeSystemOverlayExpressionProjection.unsupported(unsupported(
        TemplateTypeSystemOverlayExpressionUnsupportedKind.ValueConverter,
        `Value converter '${expression.name.name}' has an argument that is not representable in a TypeScript overlay yet.`,
      ));
    }
    const parts = surface.callKind === TemplateTypeSystemOverlayValueConverterCallKind.DirectToView
      ? this.directValueConverterCallParts(expression.name.name, surface, input.parts, argumentParts)
      : this.runtimeIdentityValueConverterCallParts(expression.name.name, surface, input.parts, argumentParts);
    return TemplateTypeSystemOverlayExpressionProjection.generated(parts);
  }

  private resourceArgumentParts(
    args: readonly ExpressionAstNode[],
    context: TemplateTypeSystemOverlayExpressionProjectionContext | null,
    semanticProductHandle: ProductHandle | null,
    label: string,
    arrowCallbackDepth: number,
  ): readonly TemplateTypeSystemOverlayExpressionPart[] | null {
    const parts: TemplateTypeSystemOverlayExpressionPart[] = [];
    for (const [index, arg] of args.entries()) {
      const projection = this.projectExpression(arg, context, semanticProductHandle, arrowCallbackDepth);
      if (projection.kind !== TemplateTypeSystemOverlayExpressionProjectionKind.CopySource
        && projection.kind !== TemplateTypeSystemOverlayExpressionProjectionKind.Generated) {
        return null;
      }
      parts.push({ kind: 'text', text: ', ' }, ...projection.parts.map((part) =>
        part.kind === 'source'
          ? { ...part, label: `${label} argument ${index + 1}` }
          : part
      ));
    }
    return parts;
  }

  private directValueConverterCallParts(
    name: string,
    surface: TemplateTypeSystemOverlayValueConverterCallSurface,
    inputParts: readonly TemplateTypeSystemOverlayExpressionPart[],
    argumentParts: readonly TemplateTypeSystemOverlayExpressionPart[],
  ): readonly TemplateTypeSystemOverlayExpressionPart[] {
    switch (surface.callerContextKind) {
      case TemplateTypeSystemOverlayValueConverterCallerContextKind.RuntimeBranch:
        return [
          { kind: 'text', text: '(' },
          ...this.converterReferenceParts(name, surface),
          { kind: 'text', text: `.${VALUE_CONVERTER_WITH_CONTEXT_PROPERTY} === true ? ` },
          ...this.directValueConverterCallBranchParts(name, surface, inputParts, argumentParts, true),
          { kind: 'text', text: ' : ' },
          ...this.directValueConverterCallBranchParts(name, surface, inputParts, argumentParts, false),
          { kind: 'text', text: ')' },
        ];
      case TemplateTypeSystemOverlayValueConverterCallerContextKind.Required:
        return this.directValueConverterCallBranchParts(name, surface, inputParts, argumentParts, true);
      case TemplateTypeSystemOverlayValueConverterCallerContextKind.None:
        return this.directValueConverterCallBranchParts(name, surface, inputParts, argumentParts, false);
    }
  }

  private directValueConverterCallBranchParts(
    name: string,
    surface: TemplateTypeSystemOverlayValueConverterCallSurface,
    inputParts: readonly TemplateTypeSystemOverlayExpressionPart[],
    argumentParts: readonly TemplateTypeSystemOverlayExpressionPart[],
    includeCallerContext: boolean,
  ): readonly TemplateTypeSystemOverlayExpressionPart[] {
    return [
      ...this.converterReferenceParts(name, surface),
      { kind: 'text', text: `.${VALUE_CONVERTER_TO_VIEW_METHOD}(` },
      ...inputParts,
      ...(includeCallerContext ? [{ kind: 'text' as const, text: ', __au_value_converter_caller_context_value' }] : []),
      ...argumentParts,
      { kind: 'text', text: ')' },
    ];
  }

  private runtimeIdentityValueConverterCallParts(
    name: string,
    surface: TemplateTypeSystemOverlayValueConverterCallSurface,
    inputParts: readonly TemplateTypeSystemOverlayExpressionPart[],
    argumentParts: readonly TemplateTypeSystemOverlayExpressionPart[],
  ): readonly TemplateTypeSystemOverlayExpressionPart[] {
    return [
      { kind: 'text', text: '__au_value_converter_to_view(' },
      ...this.converterReferenceParts(name, surface),
      { kind: 'text', text: ', ' },
      ...inputParts,
      ...argumentParts,
      { kind: 'text', text: ')' },
    ];
  }

  private converterReferenceParts(
    name: string,
    surface: TemplateTypeSystemOverlayValueConverterCallSurface,
  ): readonly TemplateTypeSystemOverlayExpressionPart[] {
    return [{
      kind: 'source',
      source: {
        ...surface.converterNameSource,
        text: surface.converterText,
      },
      label: `value converter ${name}`,
    }];
  }

  private projectExpression(
    expression: ExpressionAstNode,
    context: TemplateTypeSystemOverlayExpressionProjectionContext | null,
    semanticProductHandle: ProductHandle | null,
    arrowCallbackDepth: number,
  ): TemplateTypeSystemOverlayExpressionProjection {
    const support = templateTypeSystemOverlayExpressionSupport(expression.$kind);
    switch (expression.$kind) {
      case 'BindingBehavior':
        // astEvaluate is value-transparent; bind-time arguments are emitted separately from lifecycle projection.
        return this.projectExpression(expression.expression, context, semanticProductHandle, arrowCallbackDepth);
      case 'ValueConverter':
        return this.valueConverterExpression(expression, context, semanticProductHandle, arrowCallbackDepth);
      case 'AccessScope': {
        const bindingContextAncestor = overlayBindingContextAncestor(expression, arrowCallbackDepth);
        if (bindingContextAncestor > 0) {
          const unsupportedSyntax = this.ancestorScopeUnsupported(bindingContextAncestor, context?.scopeAliases ?? null);
          return unsupportedSyntax == null
            ? this.ancestorAccessScopeExpression(expression, bindingContextAncestor, semanticProductHandle)
            : TemplateTypeSystemOverlayExpressionProjection.unsupported(unsupportedSyntax);
        }
        if (scopeExpressionWasAuthoredFromCurrentBindingContext(expression)) {
          return this.currentNamedAccessScopeExpression(expression, context, semanticProductHandle);
        }
        return this.copySourceProjection(
          expression,
          context,
          semanticProductHandle,
          [],
          null,
          arrowCallbackDepth,
        );
      }
      case 'CallScope': {
        const bindingContextAncestor = overlayBindingContextAncestor(expression, arrowCallbackDepth);
        if (bindingContextAncestor > 0) {
          const unsupportedSyntax = this.ancestorScopeUnsupported(bindingContextAncestor, context?.scopeAliases ?? null);
          if (unsupportedSyntax != null) {
            return TemplateTypeSystemOverlayExpressionProjection.unsupported(unsupportedSyntax);
          }
          return this.ancestorCallScopeExpression(
            expression,
            bindingContextAncestor,
            context,
            semanticProductHandle,
            this.shouldLowerNonStrictAccess(context),
            arrowCallbackDepth,
          );
        }
        if (scopeExpressionWasAuthoredFromCurrentBindingContext(expression)) {
          return this.namedCallScopeExpression(
            expression,
            context,
            semanticProductHandle,
            this.shouldLowerNonStrictAccess(context),
            arrowCallbackDepth,
            true,
          );
        }
        if (arrowCallbackDepth === 0 && context?.scopeAliases == null) {
          return this.copySourceProjection(
            expression,
            context,
            semanticProductHandle,
            expression.args,
            null,
            arrowCallbackDepth,
          );
        }
        if (arrowCallbackDepth === 0) {
          return this.namedCallScopeExpression(
            expression,
            context,
            semanticProductHandle,
            this.shouldLowerNonStrictAccess(context),
            arrowCallbackDepth,
          );
        }
        if (this.shouldLowerNonStrictAccess(context)) {
          return this.namedCallScopeExpression(expression, context, semanticProductHandle, true, arrowCallbackDepth);
        }
        return this.copySourceProjection(
          expression,
          context,
          semanticProductHandle,
          expression.args,
          null,
          arrowCallbackDepth,
        );
      }
      case 'AccessThis':
        return this.copySourceProjection(
          expression,
          context,
          semanticProductHandle,
          [],
          this.accessThisUnsupported(
            overlayBindingContextAncestor(expression, arrowCallbackDepth),
            context?.scopeAliases ?? null,
          ),
          arrowCallbackDepth,
        );
      case 'AccessBoundary':
      case 'Identifier':
      case 'PrimitiveLiteral':
      case 'AccessGlobal':
        return this.copySourceProjection(expression, context, semanticProductHandle, [], null, arrowCallbackDepth);
      case 'Assign':
        return this.copyAssignExpression(expression, context, semanticProductHandle, arrowCallbackDepth);
      case 'Conditional':
        return this.copySourceProjection(expression, context, semanticProductHandle, [expression.condition, expression.yes, expression.no], null, arrowCallbackDepth);
      case 'AccessMember':
        if (this.shouldLowerNonStrictAccess(context)) {
          return this.nonStrictAccessMemberExpression(expression, context, semanticProductHandle, arrowCallbackDepth);
        }
        return this.copySourceProjection(expression, context, semanticProductHandle, [expression.object], null, arrowCallbackDepth);
      case 'AccessKeyed':
        if (this.shouldLowerNonStrictAccess(context)) {
          return this.nonStrictAccessKeyedExpression(expression, context, semanticProductHandle, arrowCallbackDepth);
        }
        return this.copySourceProjection(expression, context, semanticProductHandle, [expression.object, expression.key], null, arrowCallbackDepth);
      case 'Paren':
        return this.copySourceProjection(expression, context, semanticProductHandle, [expression.expression], null, arrowCallbackDepth);
      case 'New':
        return this.copySourceProjection(expression, context, semanticProductHandle, [expression.func, ...expression.args], null, arrowCallbackDepth);
      case 'CallGlobal':
        return this.copySourceProjection(expression, context, semanticProductHandle, expression.args, null, arrowCallbackDepth);
      case 'CallMember':
        if (this.shouldLowerNonStrictAccess(context)) {
          return this.nonStrictCallMemberExpression(expression, context, semanticProductHandle, arrowCallbackDepth);
        }
        return this.copySourceProjection(expression, context, semanticProductHandle, [expression.object, ...expression.args], null, arrowCallbackDepth);
      case 'CallFunction':
        if (this.shouldLowerNonStrictAccess(context)) {
          return this.nonStrictCallFunctionExpression(expression, context, semanticProductHandle, arrowCallbackDepth);
        }
        return this.copySourceProjection(expression, context, semanticProductHandle, [expression.func, ...expression.args], null, arrowCallbackDepth);
      case 'Binary':
        return this.copySourceProjection(expression, context, semanticProductHandle, [expression.left, expression.right], null, arrowCallbackDepth);
      case 'Unary':
        return this.copySourceProjection(expression, context, semanticProductHandle, [expression.expression], null, arrowCallbackDepth);
      case 'ArrayLiteral':
        return this.copySourceProjection(expression, context, semanticProductHandle, expression.elements, null, arrowCallbackDepth);
      case 'ObjectLiteral':
        return this.copySourceProjection(expression, context, semanticProductHandle, expression.values, null, arrowCallbackDepth);
      case 'Template':
        return this.copySourceProjection(expression, context, semanticProductHandle, expression.expressions, null, arrowCallbackDepth);
      case 'TaggedTemplate':
        return this.copySourceProjection(expression, context, semanticProductHandle, [expression.func, ...expression.expressions], null, arrowCallbackDepth);
      case 'ArrowFunction':
        return this.copySourceProjection(expression, context, semanticProductHandle, [expression.body], null, arrowCallbackDepth + 1);
      case 'Interpolation':
        return this.interpolationExpression(expression, context, semanticProductHandle, arrowCallbackDepth);
      case 'Custom':
        return TemplateTypeSystemOverlayExpressionProjection.unsupported(unsupported(
          TemplateTypeSystemOverlayExpressionUnsupportedKind.CustomExpression,
          support.summary,
        ));
      case 'DestructuringAssignment':
        return TemplateTypeSystemOverlayExpressionProjection.unsupported(unsupported(
          TemplateTypeSystemOverlayExpressionUnsupportedKind.StatementShape,
          support.summary,
        ));
      case 'BindingIdentifier':
      case 'ForOfStatement':
      case 'BindingPatternDefault':
      case 'BindingPatternHole':
      case 'ArrayBindingPattern':
      case 'ObjectBindingPattern':
        return TemplateTypeSystemOverlayExpressionProjection.unsupported(unsupported(
          TemplateTypeSystemOverlayExpressionUnsupportedKind.NonStandalone,
          support.summary,
        ));
    }
  }

  private interpolationExpression(
    expression: Extract<ExpressionAstNode, { readonly $kind: 'Interpolation' }>,
    context: TemplateTypeSystemOverlayExpressionProjectionContext | null,
    semanticProductHandle: ProductHandle | null,
    arrowCallbackDepth: number,
  ): TemplateTypeSystemOverlayExpressionProjection {
    const parts: TemplateTypeSystemOverlayExpressionPart[] = [
      { kind: 'text', text: `(${JSON.stringify(expression.parts[0] ?? '')}` },
    ];
    for (const [index, hole] of expression.expressions.entries()) {
      const projection = this.projectExpression(hole, context, semanticProductHandle, arrowCallbackDepth);
      if (!projectionCanBecomeGeneratedChild(projection)) {
        return projection;
      }
      parts.push(
        { kind: 'text', text: ' + globalThis.String(' },
        ...projection.parts,
        { kind: 'text', text: `) + ${JSON.stringify(expression.parts[index + 1] ?? '')}` },
      );
    }
    parts.push({ kind: 'text', text: ')' });
    return TemplateTypeSystemOverlayExpressionProjection.generated(parts);
  }

  private copySourceProjection(
    expression: ExpressionAstNode,
    context: TemplateTypeSystemOverlayExpressionProjectionContext | null,
    semanticProductHandle: ProductHandle | null,
    children: readonly ExpressionAstNode[],
    unsupportedSyntax: TemplateTypeSystemOverlayExpressionUnsupportedSyntax | null,
    childArrowCallbackDepth: number,
  ): TemplateTypeSystemOverlayExpressionProjection {
    if (unsupportedSyntax != null) {
      return TemplateTypeSystemOverlayExpressionProjection.unsupported(unsupportedSyntax);
    }
    const projectedChildren: ProjectedOverlayExpressionChild[] = [];
    for (const child of children) {
      const projection = this.projectExpression(child, context, semanticProductHandle, childArrowCallbackDepth);
      if (
        projection.kind === TemplateTypeSystemOverlayExpressionProjectionKind.UnsupportedSyntax
        || projection.kind === TemplateTypeSystemOverlayExpressionProjectionKind.MissingSource
      ) {
        return projection;
      }
      projectedChildren.push({ expression: child, projection });
    }
    return this.copySourceProjectionFromProjectedChildren(expression, semanticProductHandle, projectedChildren);
  }

  private copySourceProjectionFromProjectedChildren(
    expression: ExpressionAstNode,
    semanticProductHandle: ProductHandle | null,
    projectedChildren: readonly ProjectedOverlayExpressionChild[],
  ): TemplateTypeSystemOverlayExpressionProjection {
    const hasGeneratedChild = projectedChildren.some((child) =>
      child.projection.kind === TemplateTypeSystemOverlayExpressionProjectionKind.Generated
    );
    const source = this.sourceSlice(expression.span, semanticProductHandle);
    if (source == null) {
      return TemplateTypeSystemOverlayExpressionProjection.missingSource();
    }
    if (!hasGeneratedChild) {
      return TemplateTypeSystemOverlayExpressionProjection.copySource(source);
    }
    const support = templateTypeSystemOverlayExpressionSupport(expression.$kind);
    if (!support.canContainGeneratedChildren
      || support.supportKind !== TemplateTypeSystemOverlayExpressionSupportKind.TypeScriptSource
        && support.supportKind !== TemplateTypeSystemOverlayExpressionSupportKind.ScopeAliasSource) {
      return TemplateTypeSystemOverlayExpressionProjection.unsupported(unsupported(
        TemplateTypeSystemOverlayExpressionUnsupportedKind.NonStandalone,
        `${support.summary} It cannot contain generated child overlay expressions yet.`,
      ));
    }
    const parts = generatedParentExpressionParts(source, projectedChildren);
    return parts == null
      ? TemplateTypeSystemOverlayExpressionProjection.unsupported(unsupported(
        TemplateTypeSystemOverlayExpressionUnsupportedKind.NonStandalone,
        `Expression kind ${expression.$kind} contains generated Aurelia expression text whose source spans could not be spliced into the authored TypeScript-shaped parent.`,
      ))
      : TemplateTypeSystemOverlayExpressionProjection.generated(parts);
  }

  private copyAssignExpression(
    expression: Extract<ExpressionAstNode, { readonly $kind: 'Assign' }>,
    context: TemplateTypeSystemOverlayExpressionProjectionContext | null,
    semanticProductHandle: ProductHandle | null,
    arrowCallbackDepth: number,
  ): TemplateTypeSystemOverlayExpressionProjection {
    const target = this.projectExpression(
      expression.target,
      context == null ? null : { ...context, lowerNonStrictAccess: false },
      semanticProductHandle,
      arrowCallbackDepth,
    );
    if (
      target.kind === TemplateTypeSystemOverlayExpressionProjectionKind.UnsupportedSyntax
      || target.kind === TemplateTypeSystemOverlayExpressionProjectionKind.MissingSource
    ) {
      return target;
    }
    const value = this.projectExpression(expression.value, context, semanticProductHandle, arrowCallbackDepth);
    if (
      value.kind === TemplateTypeSystemOverlayExpressionProjectionKind.UnsupportedSyntax
      || value.kind === TemplateTypeSystemOverlayExpressionProjectionKind.MissingSource
    ) {
      return value;
    }
    return this.copySourceProjectionFromProjectedChildren(
      expression,
      semanticProductHandle,
      [
        { expression: expression.target, projection: target },
        { expression: expression.value, projection: value },
      ],
    );
  }

  private ancestorAccessScopeExpression(
    expression: Extract<ExpressionAstNode, { readonly $kind: 'AccessScope' }>,
    bindingContextAncestor: number,
    semanticProductHandle: ProductHandle | null,
  ): TemplateTypeSystemOverlayExpressionProjection {
    const name = this.sourceSlice(expression.name.span, semanticProductHandle);
    if (name == null) {
      return TemplateTypeSystemOverlayExpressionProjection.missingSource();
    }
    return TemplateTypeSystemOverlayExpressionProjection.generated([
      {
        kind: 'text',
        text: `${ancestorNamedLookupAlias(bindingContextAncestor)}${expression.optional ? '?.' : '.'}`,
      },
      { kind: 'source', source: name, label: `ancestor scope member ${expression.name.name}` },
    ]);
  }

  private currentNamedAccessScopeExpression(
    expression: Extract<ExpressionAstNode, { readonly $kind: 'AccessScope' }>,
    context: TemplateTypeSystemOverlayExpressionProjectionContext | null,
    semanticProductHandle: ProductHandle | null,
  ): TemplateTypeSystemOverlayExpressionProjection {
    const name = this.sourceSlice(expression.name.span, semanticProductHandle);
    if (name == null) {
      return TemplateTypeSystemOverlayExpressionProjection.missingSource();
    }
    const lookup = context?.scopeAliases?.currentNamedLookupExpression ?? null;
    return lookup != null && (expression.name.name === '$this' || expression.name.name === '$parent')
      ? TemplateTypeSystemOverlayExpressionProjection.generated([
          { kind: 'text', text: `(${lookup}).` },
          { kind: 'source', source: name, label: `current named scope member ${expression.name.name}` },
        ])
      : TemplateTypeSystemOverlayExpressionProjection.generated([{
          kind: 'source',
          source: name,
          label: `current named scope member ${expression.name.name}`,
        }]);
  }

  private ancestorCallScopeExpression(
    expression: Extract<ExpressionAstNode, { readonly $kind: 'CallScope' }>,
    bindingContextAncestor: number,
    context: TemplateTypeSystemOverlayExpressionProjectionContext | null,
    semanticProductHandle: ProductHandle | null,
    nonStrict: boolean,
    arrowCallbackDepth: number,
  ): TemplateTypeSystemOverlayExpressionProjection {
    const name = this.sourceSlice(expression.name.span, semanticProductHandle);
    if (name == null) {
      return TemplateTypeSystemOverlayExpressionProjection.missingSource();
    }
    const args = this.argumentParts(expression.args, context, semanticProductHandle, `ancestor call ${expression.name.name} argument`, arrowCallbackDepth);
    if (args == null) {
      return TemplateTypeSystemOverlayExpressionProjection.unsupported(unsupported(
        TemplateTypeSystemOverlayExpressionUnsupportedKind.NonStandalone,
        `Ancestor call '${expression.name.name}' has an argument that is not representable in a TypeScript overlay yet.`,
      ));
    }
    return TemplateTypeSystemOverlayExpressionProjection.generated([
      {
        kind: 'text',
        text: `${ancestorNamedLookupAlias(bindingContextAncestor)}${expression.optionalAccess ? '?.' : '.'}`,
      },
      { kind: 'source', source: name, label: `ancestor scope call ${expression.name.name}` },
      { kind: 'text', text: nonStrict || expression.optional ? '?.(' : '(' },
      ...args,
      { kind: 'text', text: ')' },
    ]);
  }

  private nonStrictAccessMemberExpression(
    expression: Extract<ExpressionAstNode, { readonly $kind: 'AccessMember' }>,
    context: TemplateTypeSystemOverlayExpressionProjectionContext | null,
    semanticProductHandle: ProductHandle | null,
    arrowCallbackDepth: number,
  ): TemplateTypeSystemOverlayExpressionProjection {
    const object = this.projectExpression(expression.object, context, semanticProductHandle, arrowCallbackDepth);
    if (!projectionCanBecomeGeneratedChild(object)) {
      return object;
    }
    const member = this.sourceSlice(expression.name.span, semanticProductHandle);
    if (member == null) {
      return TemplateTypeSystemOverlayExpressionProjection.missingSource();
    }
    return TemplateTypeSystemOverlayExpressionProjection.generated([
      ...object.parts,
      { kind: 'text', text: '?.' },
      { kind: 'source', source: member, label: `non-strict member ${expression.name.name}` },
    ]);
  }

  private nonStrictAccessKeyedExpression(
    expression: Extract<ExpressionAstNode, { readonly $kind: 'AccessKeyed' }>,
    context: TemplateTypeSystemOverlayExpressionProjectionContext | null,
    semanticProductHandle: ProductHandle | null,
    arrowCallbackDepth: number,
  ): TemplateTypeSystemOverlayExpressionProjection {
    const object = this.projectExpression(expression.object, context, semanticProductHandle, arrowCallbackDepth);
    if (!projectionCanBecomeGeneratedChild(object)) {
      return object;
    }
    const key = this.projectExpression(expression.key, context, semanticProductHandle, arrowCallbackDepth);
    if (!projectionCanBecomeGeneratedChild(key)) {
      return key;
    }
    return TemplateTypeSystemOverlayExpressionProjection.generated([
      ...object.parts,
      { kind: 'text', text: '?.[' },
      ...key.parts,
      { kind: 'text', text: ']' },
    ]);
  }

  private namedCallScopeExpression(
    expression: Extract<ExpressionAstNode, { readonly $kind: 'CallScope' }>,
    context: TemplateTypeSystemOverlayExpressionProjectionContext | null,
    semanticProductHandle: ProductHandle | null,
    nonStrict: boolean,
    arrowCallbackDepth: number,
    forceAuthoredCurrentReceiver: boolean = false,
  ): TemplateTypeSystemOverlayExpressionProjection {
    const source = this.sourceSlice(expression.name.span, semanticProductHandle);
    if (source == null) {
      return TemplateTypeSystemOverlayExpressionProjection.missingSource();
    }
    const lookup = forceAuthoredCurrentReceiver && arrowCallbackDepth > 0
      ? context?.scopeAliases?.currentNamedLookupExpression ?? null
      : implicitNamedCallScopeLookupExpression(expression.name.name, context?.scopeAliases ?? null);
    // Standalone projector probes may intentionally omit Scope replay; preserve their TypeScript-shaped bare call.
    // Product overlays always supply aliases and therefore spend the exact runtime receiver below.
    const emitReceiver = context?.scopeAliases != null
      && (
        forceAuthoredCurrentReceiver
        || arrowCallbackDepth === 0
        || expression.ancestor > 0
      );
    if (emitReceiver && lookup == null) {
      return TemplateTypeSystemOverlayExpressionProjection.unsupported(unsupported(
        forceAuthoredCurrentReceiver
          ? TemplateTypeSystemOverlayExpressionUnsupportedKind.CurrentBindingContext
          : TemplateTypeSystemOverlayExpressionUnsupportedKind.AncestorScope,
        forceAuthoredCurrentReceiver
          ? `Call '${expression.name.name}' needs one exact authored-current named receiver in the TypeScript overlay.`
          : `Call '${expression.name.name}' needs one exact current named-lookup receiver in the TypeScript overlay.`,
      ));
    }
    const receiverText = emitReceiver && lookup != null
      ? `(${lookup})${expression.optionalAccess ? '?.' : '.'}`
      : null;
    const args = this.argumentParts(expression.args, context, semanticProductHandle, `call ${expression.name.name} argument`, arrowCallbackDepth);
    return args == null
      ? TemplateTypeSystemOverlayExpressionProjection.unsupported(unsupported(
        TemplateTypeSystemOverlayExpressionUnsupportedKind.NonStandalone,
        `Call '${expression.name.name}' has an argument that is not representable in a TypeScript overlay yet.`,
      ))
      : TemplateTypeSystemOverlayExpressionProjection.generated([
        ...(receiverText != null
          ? [{
              kind: 'text' as const,
              text: receiverText,
            }]
          : []),
        { kind: 'source', source, label: `named scope call ${expression.name.name}` },
        { kind: 'text', text: nonStrict || expression.optional ? '?.(' : '(' },
        ...args,
        { kind: 'text', text: ')' },
      ]);
  }

  private nonStrictCallMemberExpression(
    expression: Extract<ExpressionAstNode, { readonly $kind: 'CallMember' }>,
    context: TemplateTypeSystemOverlayExpressionProjectionContext | null,
    semanticProductHandle: ProductHandle | null,
    arrowCallbackDepth: number,
  ): TemplateTypeSystemOverlayExpressionProjection {
    const object = this.projectExpression(expression.object, context, semanticProductHandle, arrowCallbackDepth);
    if (!projectionCanBecomeGeneratedChild(object)) {
      return object;
    }
    const member = this.sourceSlice(expression.name.span, semanticProductHandle);
    if (member == null) {
      return TemplateTypeSystemOverlayExpressionProjection.missingSource();
    }
    const args = this.argumentParts(expression.args, context, semanticProductHandle, `call ${expression.name.name} argument`, arrowCallbackDepth);
    return args == null
      ? TemplateTypeSystemOverlayExpressionProjection.unsupported(unsupported(
        TemplateTypeSystemOverlayExpressionUnsupportedKind.NonStandalone,
        `Member call '${expression.name.name}' has an argument that is not representable in a TypeScript overlay yet.`,
      ))
      : TemplateTypeSystemOverlayExpressionProjection.generated([
        ...object.parts,
        { kind: 'text', text: '?.' },
        { kind: 'source', source: member, label: `non-strict member call ${expression.name.name}` },
        { kind: 'text', text: '?.(' },
        ...args,
        { kind: 'text', text: ')' },
      ]);
  }

  private nonStrictCallFunctionExpression(
    expression: Extract<ExpressionAstNode, { readonly $kind: 'CallFunction' }>,
    context: TemplateTypeSystemOverlayExpressionProjectionContext | null,
    semanticProductHandle: ProductHandle | null,
    arrowCallbackDepth: number,
  ): TemplateTypeSystemOverlayExpressionProjection {
    const func = this.projectExpression(expression.func, context, semanticProductHandle, arrowCallbackDepth);
    if (!projectionCanBecomeGeneratedChild(func)) {
      return func;
    }
    const args = this.argumentParts(expression.args, context, semanticProductHandle, 'function call argument', arrowCallbackDepth);
    return args == null
      ? TemplateTypeSystemOverlayExpressionProjection.unsupported(unsupported(
        TemplateTypeSystemOverlayExpressionUnsupportedKind.NonStandalone,
        'Function call has an argument that is not representable in a TypeScript overlay yet.',
      ))
      : TemplateTypeSystemOverlayExpressionProjection.generated([
        ...func.parts,
        { kind: 'text', text: '?.(' },
        ...args,
        { kind: 'text', text: ')' },
      ]);
  }

  private argumentParts(
    args: readonly ExpressionAstNode[],
    context: TemplateTypeSystemOverlayExpressionProjectionContext | null,
    semanticProductHandle: ProductHandle | null,
    labelPrefix: string,
    arrowCallbackDepth: number,
  ): readonly TemplateTypeSystemOverlayExpressionPart[] | null {
    const parts: TemplateTypeSystemOverlayExpressionPart[] = [];
    for (const [index, arg] of args.entries()) {
      const projection = this.projectExpression(arg, context, semanticProductHandle, arrowCallbackDepth);
      if (!projectionCanBecomeGeneratedChild(projection)) {
        return null;
      }
      if (index > 0) {
        parts.push({ kind: 'text', text: ', ' });
      }
      parts.push(...projection.parts.map((part) =>
        part.kind === 'source'
          ? { ...part, label: `${labelPrefix} ${index + 1}` }
          : part
      ));
    }
    return parts;
  }

  private shouldLowerNonStrictAccess(
    context: TemplateTypeSystemOverlayExpressionProjectionContext | null,
  ): boolean {
    return context?.strictBinding === false && context.lowerNonStrictAccess !== false;
  }

  private ancestorScopeUnsupported(
    bindingContextAncestor: number,
    scopeAliases: TemplateTypeSystemOverlayExpressionScopeAliases | null,
  ): TemplateTypeSystemOverlayExpressionUnsupportedSyntax | null {
    return bindingContextAncestor <= (scopeAliases?.parentBindingContextDepth ?? 0)
      ? null
      : unsupported(
        TemplateTypeSystemOverlayExpressionUnsupportedKind.AncestorScope,
        '$parent-style ancestor scope access needs a generated scope alias before it can be checked by TypeScript overlays.',
      );
  }

  private accessThisUnsupported(
    bindingContextAncestor: number,
    scopeAliases: TemplateTypeSystemOverlayExpressionScopeAliases | null,
  ): TemplateTypeSystemOverlayExpressionUnsupportedSyntax | null {
    if (bindingContextAncestor === 0) {
      return scopeAliases?.currentBindingContext === true
        ? null
        : unsupported(
          TemplateTypeSystemOverlayExpressionUnsupportedKind.CurrentBindingContext,
          '$this access needs a generated current binding-context alias before it can be checked by TypeScript overlays.',
        );
    }
    return bindingContextAncestor <= (scopeAliases?.parentBindingContextDepth ?? 0)
      ? null
      : unsupported(
        TemplateTypeSystemOverlayExpressionUnsupportedKind.AncestorScope,
        '$parent-style binding-context access needs generated ancestor aliases before it can be checked by TypeScript overlays.',
      );
  }
}

function overlayBindingContextAncestor(
  expression: Extract<ExpressionAstNode, { readonly $kind: 'AccessThis' | 'AccessScope' | 'CallScope' }>,
  arrowCallbackDepth: number,
): number {
  const authoredPath = expression.authoredScopePath;
  if (authoredPath?.pathKind === AuthoredScopePathKind.CurrentBindingContext) {
    return 0;
  }
  if (authoredPath?.pathKind === AuthoredScopePathKind.AncestorBindingContext) {
    return authoredPath.qualifierSpans.length;
  }
  return Math.max(0, expression.ancestor - arrowCallbackDepth);
}

function ancestorNamedLookupAlias(ancestor: number): string {
  return `${TEMPLATE_TYPE_SYSTEM_OVERLAY_PARENT_NAMED_LOOKUP_ALIAS}${'.$parent'.repeat(Math.max(0, ancestor - 1))}`;
}

function implicitNamedCallScopeLookupExpression(
  name: string,
  aliases: TemplateTypeSystemOverlayExpressionScopeAliases | null,
): string | null {
  const current = aliases?.currentNamedLookupExpression ?? null;
  if (current == null) {
    return null;
  }
  if (aliases?.implicitNamedLookupReceiver == null) {
    return current;
  }
  const receiver = aliases.implicitNamedLookupReceiver(name);
  if (
    receiver == null
    || receiver.ancestor > (aliases?.parentBindingContextDepth ?? 0)
  ) {
    return null;
  }
  if (receiver.contextKind === 'binding-context') {
    return receiver.ancestor === 0
      ? aliases?.currentBindingContext === true ? '$this' : null
      : ancestorBindingContextAlias(receiver.ancestor);
  }
  return receiver.ancestor === 0 ? current : ancestorNamedLookupAlias(receiver.ancestor);
}

function ancestorBindingContextAlias(ancestor: number): string {
  return ancestor <= 0 ? '$this' : `$parent${'.$parent'.repeat(ancestor - 1)}`;
}

export function appendTemplateTypeSystemOverlayExpressionProjection(
  builder: TypeSystemOverlaySourceBuilder,
  projection: TemplateTypeSystemOverlayExpressionProjection,
  label: string,
): void {
  appendTemplateTypeSystemOverlayExpressionParts(builder, projection.parts, label);
}

function expressionSourceText(
  expression: ExpressionAstNode,
  rootSource: TemplateTypeSystemOverlaySourceSlice | null,
): string | null {
  if (rootSource == null) {
    return null;
  }
  const relativeStart = expression.span.start - rootSource.sourceStart;
  const relativeEnd = expression.span.end - rootSource.sourceStart;
  return relativeStart < 0 || relativeEnd < relativeStart || relativeEnd > rootSource.text.length
    ? null
    : rootSource.text.slice(relativeStart, relativeEnd);
}

function generatedParentExpressionParts(
  parent: TemplateTypeSystemOverlaySourceSlice,
  children: readonly ProjectedOverlayExpressionChild[],
): readonly TemplateTypeSystemOverlayExpressionPart[] | null {
  const generatedChildren = children
    .filter((child) => child.projection.kind === TemplateTypeSystemOverlayExpressionProjectionKind.Generated)
    .sort((left, right) => left.expression.span.start - right.expression.span.start);
  if (generatedChildren.length === 0) {
    return [{ kind: 'source', source: parent, label: 'template expression' }];
  }

  const parts: TemplateTypeSystemOverlayExpressionPart[] = [];
  let cursor = parent.sourceStart;
  for (const child of generatedChildren) {
    const childStart = child.expression.span.start;
    const childEnd = child.expression.span.end;
    if (
      childStart < cursor
      || childEnd < childStart
      || childEnd > parent.sourceEnd
      || sourceAddressHandleForRuntimeExpressionSpan(child.expression.span) !== parent.sourceAddressHandle
    ) {
      return null;
    }
    appendSourceSegment(parts, parent, cursor, childStart, 'template expression source before generated child');
    parts.push(...child.projection.parts);
    cursor = childEnd;
  }
  appendSourceSegment(parts, parent, cursor, parent.sourceEnd, 'template expression source after generated child');
  return parts;
}

function projectionCanBecomeGeneratedChild(
  projection: TemplateTypeSystemOverlayExpressionProjection,
): projection is TemplateTypeSystemOverlayExpressionProjection & {
  readonly kind: TemplateTypeSystemOverlayExpressionProjectionKind.CopySource | TemplateTypeSystemOverlayExpressionProjectionKind.Generated;
} {
  return projection.kind === TemplateTypeSystemOverlayExpressionProjectionKind.CopySource
    || projection.kind === TemplateTypeSystemOverlayExpressionProjectionKind.Generated;
}

function appendSourceSegment(
  parts: TemplateTypeSystemOverlayExpressionPart[],
  parent: TemplateTypeSystemOverlaySourceSlice,
  start: number,
  end: number,
  label: string,
): void {
  if (start >= end) {
    return;
  }
  const relativeStart = start - parent.sourceStart;
  const relativeEnd = end - parent.sourceStart;
  parts.push({
    kind: 'source',
    source: {
      text: parent.text.slice(relativeStart, relativeEnd),
      semanticProductHandle: parent.semanticProductHandle,
      sourceAddressHandle: parent.sourceAddressHandle,
      sourceStart: start,
      sourceEnd: end,
    },
    label,
  });
}

function unsupported(
  kind: TemplateTypeSystemOverlayExpressionUnsupportedKind,
  summary: string,
): TemplateTypeSystemOverlayExpressionUnsupportedSyntax {
  return new TemplateTypeSystemOverlayExpressionUnsupportedSyntax(kind, summary);
}
