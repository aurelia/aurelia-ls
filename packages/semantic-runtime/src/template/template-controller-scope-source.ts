import ts from 'typescript';

import {
  readImportedExportName,
  readSourceImportBindings,
  type SourceImportBindings,
} from '../evaluation/import-bindings.js';
import { unwrapExpression, isNestedExecutionBoundary } from '../evaluation/ts-syntax.js';
import { SourceSpanRole } from '../kernel/address.js';
import type { AddressHandle } from '../kernel/handles.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import type { KernelStoreRecord } from '../kernel/store.js';
import type { CustomAttributeDefinition } from '../resources/custom-attribute-definition.js';
import { sourceSpanForCheckerNode } from '../type-system/declaration-source.js';
import {
  frameworkDeclarationSourceSpec,
  symbolMatchesFrameworkDeclarationSource,
  typeMatchesFrameworkDeclarationSource,
} from '../type-system/framework-declaration-source.js';
import { TypeSystemProductDetails } from '../type-system/product-details.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { typeSystemSourcePathIndex } from '../type-system/source-path-index.js';
import { classElementName } from '../type-system/ts-class-member.js';
import {
  ComponentLifecycleHookName,
  componentLifecycleHookName,
} from './component-lifecycle-source.js';
import {
  isResolveIViewFactoryCall,
  readControllerActivationImportBindings,
  type ControllerActivationImportBindings,
} from './runtime-controller-activation-di.js';

const AURELIA_SCOPE_MODULES = new Set([
  'aurelia',
  '@aurelia/runtime',
]);

const AURELIA_SCOPE_EXPORTS = new Set([
  'Scope',
]);

const SYNTHETIC_VIEW_DECLARATIONS = frameworkDeclarationSourceSpec(
  new Set(['ISyntheticView']),
  ['@aurelia/runtime-html'],
  [
    '/aurelia/packages/runtime-html/src/templating/controller.ts',
    '/aurelia/packages/runtime-html/dist/types/templating/controller.d.ts',
  ],
);

const SCOPE_FROM_PARENT_DECLARATIONS = frameworkDeclarationSourceSpec(
  new Set(['fromParent']),
  ['@aurelia/runtime'],
  [
    '/aurelia/packages/runtime/src/scope.ts',
    '/aurelia/packages/runtime/dist/types/scope.d.ts',
  ],
);

const ACTIVATION_HOOKS: ReadonlySet<ComponentLifecycleHookName> = new Set([
  ComponentLifecycleHookName.Hydrating,
  ComponentLifecycleHookName.Hydrated,
  ComponentLifecycleHookName.Created,
  ComponentLifecycleHookName.Binding,
  ComponentLifecycleHookName.Bound,
  ComponentLifecycleHookName.Attaching,
  ComponentLifecycleHookName.Attached,
]);

/** Child Scope shape proven from one app-owned template-controller lifecycle implementation. */
export const enum AppTemplateControllerScopeEffectKind {
  /** The synthetic view receives the controller's existing parent Scope. */
  PassThrough,
  /** The synthetic view receives `Scope.fromParent(parent, this.<defaultProperty>)`. */
  ValueBindingContext,
  /** The lifecycle implementation cannot be reduced to one proven child Scope shape. */
  Open,
}

export class AppTemplateControllerScopeEffect {
  constructor(
    readonly kind: AppTemplateControllerScopeEffectKind,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly records: readonly KernelStoreRecord[],
    readonly summary: string | null = null,
  ) {}
}

interface LifecycleBody {
  readonly body: ts.ConciseBody | null;
}

interface ActivationScopeRead {
  readonly kind: AppTemplateControllerScopeEffectKind;
  /** Authored expression that constructs or directly provides the child Scope. */
  readonly source: ts.Expression;
  readonly summary: string | null;
}

interface TemplateControllerScopeSourceContext {
  readonly typeSystem: TypeSystemProject;
  readonly sourcePathByFileName: ReadonlyMap<string, string>;
  readonly scopeImports: SourceImportBindings;
  readonly activationImports: ControllerActivationImportBindings;
  readonly viewFactoryProperties: ReadonlySet<string>;
}

/**
 * Recognize the closed Scope handoff performed by an app-owned template controller.
 *
 * This deliberately projects a tiny framework-shaped effect instead of executing lifecycle hooks. Calls must resolve
 * to runtime-html's `ISyntheticView.activate`, and value scopes must resolve to runtime's `Scope.fromParent`.
 */
export function readAppTemplateControllerScopeEffect(
  publication: KernelPublicationContext,
  typeSystem: TypeSystemProject,
  definition: CustomAttributeDefinition,
  valueProperty: string,
  localKey: string,
): AppTemplateControllerScopeEffect {
  const declaration = resourceClassDeclaration(publication, definition);
  if (declaration == null) {
    return new AppTemplateControllerScopeEffect(
      AppTemplateControllerScopeEffectKind.Open,
      definition.nameSourceAddressHandle
        ?? definition.target.declarationSourceAddressHandle
        ?? definition.sourceAddressHandle,
      [],
      `Template controller '${definition.name}' has no checker-backed class declaration for child Scope analysis.`,
    );
  }

  const sourcePathByFileName = typeSystemSourcePathIndex(typeSystem.project, typeSystem);
  const sourceFile = declaration.getSourceFile();
  const activationImports = readControllerActivationImportBindings(sourceFile);
  const context: TemplateControllerScopeSourceContext = {
    typeSystem,
    sourcePathByFileName,
    scopeImports: readSourceImportBindings(sourceFile, AURELIA_SCOPE_MODULES, AURELIA_SCOPE_EXPORTS),
    activationImports,
    viewFactoryProperties: readViewFactoryPropertyNames(typeSystem, declaration, activationImports),
  };
  const activations = readLifecycleBodies(typeSystem, declaration)
    .flatMap((lifecycle) => lifecycle.body == null
      ? []
      : readSyntheticViewActivationScopes(context, lifecycle.body, valueProperty));
  if (activations.length === 0) {
    return new AppTemplateControllerScopeEffect(
      AppTemplateControllerScopeEffectKind.Open,
      definition.nameSourceAddressHandle
        ?? definition.target.declarationSourceAddressHandle
        ?? definition.sourceAddressHandle,
      [],
      `Template controller '${definition.name}' does not expose a statically recognized synthetic-view Scope handoff.`,
    );
  }

  const first = activations[0]!;
  const compatible = activations.every((activation) =>
    activation.kind === first.kind
    && activation.kind !== AppTemplateControllerScopeEffectKind.Open
  );
  const open = activations.find((activation) =>
    activation.kind === AppTemplateControllerScopeEffectKind.Open
  ) ?? null;
  const selected = compatible
    ? first
    : open ?? new ActivationScopeReadValue(
        AppTemplateControllerScopeEffectKind.Open,
        first.source,
        `Template controller '${definition.name}' activates synthetic views with conflicting child Scope shapes.`,
      );
  const source = sourceSpanForCheckerNode(
    publication,
    typeSystem.checker,
    localKey,
    selected.source,
    SourceSpanRole.Value,
  );
  return new AppTemplateControllerScopeEffect(
    selected.kind,
    source.address.handle,
    source.records,
    selected.summary,
  );
}

class ActivationScopeReadValue implements ActivationScopeRead {
  constructor(
    readonly kind: AppTemplateControllerScopeEffectKind,
    readonly source: ts.Expression,
    readonly summary: string | null,
  ) {}
}

function resourceClassDeclaration(
  publication: KernelPublicationContext,
  definition: CustomAttributeDefinition,
): ts.ClassLikeDeclarationBase | null {
  const targetTypeProductHandle = definition.target.targetType?.productHandle ?? null;
  const carrier = targetTypeProductHandle == null
    ? null
    : publication.readProductDetail(TypeSystemProductDetails.TypeShape, targetTypeProductHandle)?.carrier ?? null;
  return carrier?.declarations.find((declaration): declaration is ts.ClassLikeDeclarationBase =>
    ts.isClassDeclaration(declaration) || ts.isClassExpression(declaration)
  ) ?? null;
}

function readLifecycleBodies(
  typeSystem: TypeSystemProject,
  declaration: ts.ClassLikeDeclarationBase,
): readonly LifecycleBody[] {
  const bodies = new Map<ComponentLifecycleHookName, LifecycleBody>();
  for (const current of typeSystem.readClassPrototypeChain(declaration)) {
    for (const member of current.members) {
      const name = classElementName(member, current.getSourceFile());
      const hook = name == null ? null : componentLifecycleHookName(name);
      if (hook == null || !ACTIVATION_HOOKS.has(hook) || bodies.has(hook)) {
        continue;
      }
      if (ts.isMethodDeclaration(member)) {
        bodies.set(hook, { body: member.body ?? null });
        continue;
      }
      if (
        ts.isPropertyDeclaration(member)
        && member.initializer != null
        && (ts.isArrowFunction(member.initializer) || ts.isFunctionExpression(member.initializer))
      ) {
        bodies.set(hook, { body: member.initializer.body });
        continue;
      }
      bodies.set(hook, { body: null });
    }
  }
  return [...bodies.values()];
}

function readSyntheticViewActivationScopes(
  context: TemplateControllerScopeSourceContext,
  body: ts.ConciseBody,
  valueProperty: string,
): readonly ActivationScopeRead[] {
  const reads: ActivationScopeRead[] = [];
  const visit = (node: ts.Node): void => {
    if (node !== body && isNestedExecutionBoundary(node)) {
      return;
    }
    if (ts.isCallExpression(node)) {
      const access = unwrapExpression(node.expression);
      if (
        ts.isPropertyAccessExpression(access)
        && access.name.text === 'activate'
        && isSyntheticViewReceiver(context, access.expression)
      ) {
        reads.push(classifyActivationScope(context, node, valueProperty));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return reads;
}

function isSyntheticViewReceiver(
  context: TemplateControllerScopeSourceContext,
  receiver: ts.Expression,
): boolean {
  return typeMatchesFrameworkDeclarationSource(
    context.typeSystem.readProgramTypeAtLocation(receiver),
    context.typeSystem.checker,
    context.sourcePathByFileName,
    SYNTHETIC_VIEW_DECLARATIONS,
  ) || expressionCreatesSyntheticView(context, receiver);
}

function classifyActivationScope(
  context: TemplateControllerScopeSourceContext,
  call: ts.CallExpression,
  valueProperty: string,
): ActivationScopeRead {
  const authoredScope = call.arguments[2] ?? call.expression;
  const parentController = call.arguments[1] == null
    ? null
    : resolveConstAlias(context.typeSystem, call.arguments[1]);
  if (parentController == null || !isControllerReference(parentController)) {
    return new ActivationScopeReadValue(
      AppTemplateControllerScopeEffectKind.Open,
      authoredScope,
      'Synthetic-view activation is not parented by the template controller that owns the child view.',
    );
  }
  const scope = resolveConstAlias(context.typeSystem, authoredScope);
  if (isControllerScope(scope)) {
    return new ActivationScopeReadValue(
      AppTemplateControllerScopeEffectKind.PassThrough,
      scope,
      null,
    );
  }
  if (!ts.isCallExpression(scope) || !isScopeFromParentCall(context, scope)) {
    return new ActivationScopeReadValue(
      AppTemplateControllerScopeEffectKind.Open,
      scope,
      'Synthetic-view activation uses a child Scope expression outside the modeled pass-through/Scope.fromParent subset.',
    );
  }

  const parent = scope.arguments[0] == null ? null : resolveConstAlias(context.typeSystem, scope.arguments[0]);
  const bindingContext = scope.arguments[1] == null ? null : resolveConstAlias(context.typeSystem, scope.arguments[1]);
  if (parent == null || !isControllerScope(parent) || bindingContext == null) {
    return new ActivationScopeReadValue(
      AppTemplateControllerScopeEffectKind.Open,
      scope,
      'Scope.fromParent does not use the template controller Scope and a statically visible binding context.',
    );
  }
  const property = bindingContextPropertyName(context.typeSystem, bindingContext);
  return property === valueProperty
    ? new ActivationScopeReadValue(
        AppTemplateControllerScopeEffectKind.ValueBindingContext,
        scope,
        null,
      )
    : new ActivationScopeReadValue(
        AppTemplateControllerScopeEffectKind.Open,
        scope,
        `Scope.fromParent binding context does not read the template controller default property '${valueProperty}'.`,
      );
}

function isScopeFromParentCall(
  context: TemplateControllerScopeSourceContext,
  call: ts.CallExpression,
): boolean {
  const expression = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(expression) || expression.name.text !== 'fromParent') {
    return false;
  }
  return symbolMatchesFrameworkDeclarationSource(
    context.typeSystem.readProgramSymbolAtLocation(expression.name),
    context.typeSystem.checker,
    context.sourcePathByFileName,
    SCOPE_FROM_PARENT_DECLARATIONS,
  ) || readImportedExportName(
    expression.expression,
    context.scopeImports,
    AURELIA_SCOPE_EXPORTS,
  ) === 'Scope';
}

function readViewFactoryPropertyNames(
  typeSystem: TypeSystemProject,
  declaration: ts.ClassLikeDeclarationBase,
  imports: ControllerActivationImportBindings,
): ReadonlySet<string> {
  const names = new Set<string>();
  for (const current of typeSystem.readClassPrototypeChain(declaration)) {
    for (const member of current.members) {
      if (
        !ts.isPropertyDeclaration(member)
        || member.initializer == null
        || !ts.isCallExpression(unwrapExpression(member.initializer))
        || !isResolveIViewFactoryCall(unwrapExpression(member.initializer) as ts.CallExpression, imports)
      ) {
        continue;
      }
      const name = classElementName(member, current.getSourceFile());
      if (name != null) {
        names.add(name);
      }
    }
  }
  return names;
}

function expressionCreatesSyntheticView(
  context: TemplateControllerScopeSourceContext,
  expression: ts.Expression,
  seen: Set<ts.Symbol> = new Set(),
): boolean {
  const current = resolveConstAlias(context.typeSystem, expression, seen);
  if (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
    return expressionCreatesSyntheticView(context, current.right, seen);
  }
  if (!ts.isCallExpression(current)) {
    return false;
  }
  const callee = unwrapExpression(current.expression);
  if (!ts.isPropertyAccessExpression(callee)) {
    return isResolveIViewFactoryCall(current, context.activationImports);
  }
  if (callee.name.text === 'create') {
    return isViewFactoryReceiver(context, callee.expression, seen);
  }
  return (
    callee.name.text === 'setLocation'
    || callee.name.text === 'setHost'
    || callee.name.text === 'setShadowRoot'
  ) && expressionCreatesSyntheticView(context, callee.expression, seen);
}

function isViewFactoryReceiver(
  context: TemplateControllerScopeSourceContext,
  expression: ts.Expression,
  seen: Set<ts.Symbol>,
): boolean {
  const current = resolveConstAlias(context.typeSystem, expression, seen);
  if (
    ts.isPropertyAccessExpression(current)
    && unwrapExpression(current.expression).kind === ts.SyntaxKind.ThisKeyword
    && context.viewFactoryProperties.has(current.name.text)
  ) {
    return true;
  }
  return ts.isCallExpression(current) && isResolveIViewFactoryCall(current, context.activationImports);
}

function isControllerScope(expression: ts.Expression): boolean {
  const scope = unwrapExpression(expression);
  if (!ts.isPropertyAccessExpression(scope) || scope.name.text !== 'scope') {
    return false;
  }
  return isControllerReference(scope.expression);
}

function isControllerReference(expression: ts.Expression): boolean {
  const controller = unwrapExpression(expression);
  return ts.isPropertyAccessExpression(controller)
    && controller.name.text === '$controller'
    && unwrapExpression(controller.expression).kind === ts.SyntaxKind.ThisKeyword;
}

function bindingContextPropertyName(
  typeSystem: TypeSystemProject,
  expression: ts.Expression,
): string | null {
  const current = resolveConstAlias(typeSystem, expression);
  if (
    ts.isBinaryExpression(current)
    && current.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
    && isEmptyObjectLiteral(resolveConstAlias(typeSystem, current.right))
  ) {
    return thisPropertyName(resolveConstAlias(typeSystem, current.left));
  }
  return thisPropertyName(current);
}

function thisPropertyName(expression: ts.Expression): string | null {
  const current = unwrapExpression(expression);
  return ts.isPropertyAccessExpression(current)
    && unwrapExpression(current.expression).kind === ts.SyntaxKind.ThisKeyword
    ? current.name.text
    : null;
}

function isEmptyObjectLiteral(expression: ts.Expression): boolean {
  const current = unwrapExpression(expression);
  return ts.isObjectLiteralExpression(current) && current.properties.length === 0;
}

function resolveConstAlias(
  typeSystem: TypeSystemProject,
  expression: ts.Expression,
  seen: Set<ts.Symbol> = new Set(),
): ts.Expression {
  const current = unwrapExpression(expression);
  if (!ts.isIdentifier(current)) {
    return current;
  }
  const symbol = typeSystem.readProgramSymbolAtLocation(current);
  if (symbol == null || seen.has(symbol)) {
    return current;
  }
  const declaration = symbol.valueDeclaration
    ?? symbol.declarations?.find(ts.isVariableDeclaration)
    ?? null;
  if (
    declaration == null
    || !ts.isVariableDeclaration(declaration)
    || declaration.initializer == null
    || !ts.isVariableDeclarationList(declaration.parent)
    || (declaration.parent.flags & ts.NodeFlags.Const) === 0
  ) {
    return current;
  }
  seen.add(symbol);
  return resolveConstAlias(typeSystem, declaration.initializer, seen);
}
