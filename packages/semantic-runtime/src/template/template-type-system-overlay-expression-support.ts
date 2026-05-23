import type { ExpressionAstNode } from '../expression/ast.js';

export const enum TemplateTypeSystemOverlayExpressionSupportKind {
  /** Authored Aurelia syntax is already a TypeScript expression once child expressions are representable. */
  TypeScriptSource = 'typescript-source',
  /** Authored syntax can be TypeScript only after BindingScope replay creates `$this`/`$parent` aliases. */
  ScopeAliasSource = 'scope-alias-source',
  /** The wrapper itself is Aurelia runtime syntax, but its inner expression remains the overlay value expression. */
  TransparentRuntimeWrapper = 'transparent-runtime-wrapper',
  /** A modeled framework resource supplies a generated TypeScript call surface. */
  ResourceLoweredCall = 'resource-lowered-call',
  /** The expression is owned by a larger framework product rather than by standalone expression projection. */
  OwnerHandled = 'owner-handled',
  /** The expression needs statement-shaped generated TypeScript before it can be represented. */
  StatementLoweringNeeded = 'statement-lowering-needed',
  /** The expression is an opaque framework extension surface whose owner must provide its own semantics. */
  OpaqueOwnerHandled = 'opaque-owner-handled',
}

export const enum TemplateTypeSystemOverlayExpressionOwner {
  /** Plain JavaScript/TypeScript expression semantics plus recursive child projection. */
  TypeScriptExpression = 'typescript-expression',
  /** BindingScope replay for `$this`, `$parent`, and ancestor binding-context lookup. */
  ScopeAliasReplay = 'scope-alias-replay',
  /** Runtime binding-behavior products own bind-time effects; overlays see the wrapped value expression. */
  BindingBehaviorMaterializer = 'runtime-binding-behavior-materializer',
  /** Runtime value-converter products own converter lookup, toView shape, and diagnostics. */
  ValueConverterMaterializer = 'runtime-value-converter-materializer',
  /** Repeat template-controller scope construction owns declaration locals and iterable source flow. */
  RepeatTemplateController = 'repeat-template-controller',
  /** Runtime interpolation binding owns ordered hole expressions and target string assembly. */
  InterpolationBinding = 'interpolation-binding',
  /** Binding-pattern projection owns repeat/runtime-assignment destructuring locals. */
  BindingPatternProjection = 'binding-pattern-projection',
  /** Future statement overlay emission must own destructuring assignment as a statement surface. */
  StatementOverlayEmission = 'statement-overlay-emission',
  /** I18n translation binding owns CustomExpression because it is an extension grammar carrier. */
  TranslationBinding = 'translation-binding',
}

export interface TemplateTypeSystemOverlayExpressionSupport {
  readonly supportKind: TemplateTypeSystemOverlayExpressionSupportKind;
  readonly owner: TemplateTypeSystemOverlayExpressionOwner;
  readonly standaloneExpression: boolean;
  readonly canContainGeneratedChildren: boolean;
  readonly summary: string;
}

export interface TemplateTypeSystemOverlayExpressionSupportRow extends TemplateTypeSystemOverlayExpressionSupport {
  readonly expressionKind: ExpressionAstNode['$kind'];
}

const supportByKind = {
  Identifier: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.TypeScriptSource,
    owner: TemplateTypeSystemOverlayExpressionOwner.TypeScriptExpression,
    standaloneExpression: false,
    canContainGeneratedChildren: false,
    summary: 'Identifier tokens are copied only as children of a TypeScript-shaped expression.',
  },
  BindingBehavior: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.TransparentRuntimeWrapper,
    owner: TemplateTypeSystemOverlayExpressionOwner.BindingBehaviorMaterializer,
    standaloneExpression: true,
    canContainGeneratedChildren: true,
    summary: 'Binding behaviors are bind-time effects; TypeScript overlays project the wrapped value expression.',
  },
  ValueConverter: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.ResourceLoweredCall,
    owner: TemplateTypeSystemOverlayExpressionOwner.ValueConverterMaterializer,
    standaloneExpression: true,
    canContainGeneratedChildren: true,
    summary: 'Value converters lower through modeled converter resources and the `__au_value_converter_to_view` helper.',
  },
  Assign: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.TypeScriptSource,
    owner: TemplateTypeSystemOverlayExpressionOwner.TypeScriptExpression,
    standaloneExpression: true,
    canContainGeneratedChildren: true,
    summary: 'Assignments are TypeScript-shaped expressions; binding direction and writeability are owned by data-flow.',
  },
  Conditional: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.TypeScriptSource,
    owner: TemplateTypeSystemOverlayExpressionOwner.TypeScriptExpression,
    standaloneExpression: true,
    canContainGeneratedChildren: true,
    summary: 'Conditional expressions are TypeScript-shaped and can splice generated child expressions.',
  },
  AccessGlobal: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.TypeScriptSource,
    owner: TemplateTypeSystemOverlayExpressionOwner.TypeScriptExpression,
    standaloneExpression: true,
    canContainGeneratedChildren: false,
    summary: 'Global access copies as authored TypeScript once the ambient name is checker-visible.',
  },
  AccessThis: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.ScopeAliasSource,
    owner: TemplateTypeSystemOverlayExpressionOwner.ScopeAliasReplay,
    standaloneExpression: true,
    canContainGeneratedChildren: false,
    summary: '`$this`/`$parent` access copies only when scope replay has generated the required aliases.',
  },
  AccessBoundary: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.TypeScriptSource,
    owner: TemplateTypeSystemOverlayExpressionOwner.TypeScriptExpression,
    standaloneExpression: true,
    canContainGeneratedChildren: false,
    summary: 'Boundary `this` is ordinary TypeScript `this` inside the generated view-model function.',
  },
  AccessScope: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.ScopeAliasSource,
    owner: TemplateTypeSystemOverlayExpressionOwner.ScopeAliasReplay,
    standaloneExpression: true,
    canContainGeneratedChildren: false,
    summary: 'Scope access copies when the root local is visible; ancestor access requires generated scope aliases.',
  },
  AccessMember: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.TypeScriptSource,
    owner: TemplateTypeSystemOverlayExpressionOwner.TypeScriptExpression,
    standaloneExpression: true,
    canContainGeneratedChildren: true,
    summary: 'Member access is TypeScript-shaped and can splice generated receiver expressions.',
  },
  AccessKeyed: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.TypeScriptSource,
    owner: TemplateTypeSystemOverlayExpressionOwner.TypeScriptExpression,
    standaloneExpression: true,
    canContainGeneratedChildren: true,
    summary: 'Keyed access is TypeScript-shaped and can splice generated receiver/key expressions.',
  },
  Paren: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.TypeScriptSource,
    owner: TemplateTypeSystemOverlayExpressionOwner.TypeScriptExpression,
    standaloneExpression: true,
    canContainGeneratedChildren: true,
    summary: 'Parenthesized expressions are TypeScript-shaped and can splice a generated child expression.',
  },
  New: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.TypeScriptSource,
    owner: TemplateTypeSystemOverlayExpressionOwner.TypeScriptExpression,
    standaloneExpression: true,
    canContainGeneratedChildren: true,
    summary: '`new` expressions are TypeScript-shaped after function and argument projection.',
  },
  CallScope: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.ScopeAliasSource,
    owner: TemplateTypeSystemOverlayExpressionOwner.ScopeAliasReplay,
    standaloneExpression: true,
    canContainGeneratedChildren: true,
    summary: 'Scope calls are TypeScript-shaped once the callable root and any ancestor aliases are visible.',
  },
  CallMember: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.TypeScriptSource,
    owner: TemplateTypeSystemOverlayExpressionOwner.TypeScriptExpression,
    standaloneExpression: true,
    canContainGeneratedChildren: true,
    summary: 'Member calls are TypeScript-shaped and can splice generated receiver or argument expressions.',
  },
  CallFunction: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.TypeScriptSource,
    owner: TemplateTypeSystemOverlayExpressionOwner.TypeScriptExpression,
    standaloneExpression: true,
    canContainGeneratedChildren: true,
    summary: 'Function calls are TypeScript-shaped and can splice generated callee or argument expressions.',
  },
  CallGlobal: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.TypeScriptSource,
    owner: TemplateTypeSystemOverlayExpressionOwner.TypeScriptExpression,
    standaloneExpression: true,
    canContainGeneratedChildren: true,
    summary: 'Global calls copy as authored TypeScript once the ambient function is checker-visible.',
  },
  Binary: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.TypeScriptSource,
    owner: TemplateTypeSystemOverlayExpressionOwner.TypeScriptExpression,
    standaloneExpression: true,
    canContainGeneratedChildren: true,
    summary: 'Binary expressions are TypeScript-shaped and can splice generated operands.',
  },
  Unary: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.TypeScriptSource,
    owner: TemplateTypeSystemOverlayExpressionOwner.TypeScriptExpression,
    standaloneExpression: true,
    canContainGeneratedChildren: true,
    summary: 'Unary expressions are TypeScript-shaped and can splice generated operands.',
  },
  PrimitiveLiteral: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.TypeScriptSource,
    owner: TemplateTypeSystemOverlayExpressionOwner.TypeScriptExpression,
    standaloneExpression: true,
    canContainGeneratedChildren: false,
    summary: 'Primitive literals copy as authored TypeScript literal expressions.',
  },
  ArrayLiteral: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.TypeScriptSource,
    owner: TemplateTypeSystemOverlayExpressionOwner.TypeScriptExpression,
    standaloneExpression: true,
    canContainGeneratedChildren: true,
    summary: 'Array literals are TypeScript-shaped and can splice generated element expressions.',
  },
  ObjectLiteral: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.TypeScriptSource,
    owner: TemplateTypeSystemOverlayExpressionOwner.TypeScriptExpression,
    standaloneExpression: true,
    canContainGeneratedChildren: true,
    summary: 'Object literals are TypeScript-shaped and can splice generated property value expressions.',
  },
  Template: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.TypeScriptSource,
    owner: TemplateTypeSystemOverlayExpressionOwner.TypeScriptExpression,
    standaloneExpression: true,
    canContainGeneratedChildren: true,
    summary: 'JavaScript template literals are TypeScript-shaped and can splice generated hole expressions.',
  },
  TaggedTemplate: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.TypeScriptSource,
    owner: TemplateTypeSystemOverlayExpressionOwner.TypeScriptExpression,
    standaloneExpression: true,
    canContainGeneratedChildren: true,
    summary: 'Tagged templates are TypeScript-shaped after tag and hole projection.',
  },
  BindingIdentifier: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.OwnerHandled,
    owner: TemplateTypeSystemOverlayExpressionOwner.BindingPatternProjection,
    standaloneExpression: false,
    canContainGeneratedChildren: false,
    summary: 'Binding identifiers declare locals for repeat/runtime-assignment owners rather than producing values.',
  },
  ForOfStatement: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.OwnerHandled,
    owner: TemplateTypeSystemOverlayExpressionOwner.RepeatTemplateController,
    standaloneExpression: false,
    canContainGeneratedChildren: false,
    summary: '`repeat.for` owns declaration and iterable projection through iterator scope construction.',
  },
  Interpolation: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.OwnerHandled,
    owner: TemplateTypeSystemOverlayExpressionOwner.InterpolationBinding,
    standaloneExpression: false,
    canContainGeneratedChildren: false,
    summary: 'Interpolation is an ordered binding owner; each hole expression is projected independently.',
  },
  BindingPatternDefault: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.OwnerHandled,
    owner: TemplateTypeSystemOverlayExpressionOwner.BindingPatternProjection,
    standaloneExpression: false,
    canContainGeneratedChildren: true,
    summary: 'Binding-pattern defaults belong to destructuring local projection, not standalone expression probes.',
  },
  BindingPatternHole: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.OwnerHandled,
    owner: TemplateTypeSystemOverlayExpressionOwner.BindingPatternProjection,
    standaloneExpression: false,
    canContainGeneratedChildren: false,
    summary: 'Binding-pattern holes are declaration placeholders with no value expression.',
  },
  ArrayBindingPattern: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.OwnerHandled,
    owner: TemplateTypeSystemOverlayExpressionOwner.BindingPatternProjection,
    standaloneExpression: false,
    canContainGeneratedChildren: true,
    summary: 'Array binding patterns are local declaration surfaces for repeat/runtime-assignment projection.',
  },
  ObjectBindingPattern: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.OwnerHandled,
    owner: TemplateTypeSystemOverlayExpressionOwner.BindingPatternProjection,
    standaloneExpression: false,
    canContainGeneratedChildren: true,
    summary: 'Object binding patterns are local declaration surfaces for repeat/runtime-assignment projection.',
  },
  DestructuringAssignment: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.StatementLoweringNeeded,
    owner: TemplateTypeSystemOverlayExpressionOwner.StatementOverlayEmission,
    standaloneExpression: false,
    canContainGeneratedChildren: true,
    summary: 'Destructuring assignment needs statement-shaped overlay emission before it can be checked as TypeScript.',
  },
  ArrowFunction: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.TypeScriptSource,
    owner: TemplateTypeSystemOverlayExpressionOwner.TypeScriptExpression,
    standaloneExpression: true,
    canContainGeneratedChildren: true,
    summary: 'Arrow functions are TypeScript-shaped; contextual parameter typing is owned by the checker evaluator.',
  },
  Custom: {
    supportKind: TemplateTypeSystemOverlayExpressionSupportKind.OpaqueOwnerHandled,
    owner: TemplateTypeSystemOverlayExpressionOwner.TranslationBinding,
    standaloneExpression: false,
    canContainGeneratedChildren: false,
    summary: 'CustomExpression is an extension grammar carrier; current framework use is i18n translation binding.',
  },
} satisfies Record<ExpressionAstNode['$kind'], TemplateTypeSystemOverlayExpressionSupport>;

export const templateTypeSystemOverlayExpressionSupportMatrix: readonly TemplateTypeSystemOverlayExpressionSupportRow[] =
  (Object.entries(supportByKind) as [ExpressionAstNode['$kind'], TemplateTypeSystemOverlayExpressionSupport][])
    .map(([expressionKind, support]) => ({ expressionKind, ...support }));

export function templateTypeSystemOverlayExpressionSupport(
  kind: ExpressionAstNode['$kind'],
): TemplateTypeSystemOverlayExpressionSupport {
  return supportByKind[kind];
}
