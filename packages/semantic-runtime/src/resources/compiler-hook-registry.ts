import ts from 'typescript';

import { unwrapExpression } from '../evaluation/ts-syntax.js';
import {
  frameworkDeclarationSourceSpec,
  symbolMatchesFrameworkDeclarationSource,
} from '../type-system/framework-declaration-source.js';
import type { TypeSystemProject } from '../type-system/project.js';
import type { EvaluationClassValue } from '../evaluation/values.js';

const TEMPLATE_COMPILER_HOOK_MODULES = new Set([
  'aurelia',
  '@aurelia/template-compiler',
]);

const TEMPLATE_COMPILER_HOOK_REGISTRY_SOURCE = frameworkDeclarationSourceSpec(
  new Set(['TemplateCompilerHooks']),
  ['@aurelia/template-compiler'],
  [
    '/aurelia/packages/template-compiler/src/template-compiler.ts',
    '/aurelia/packages/template-compiler/dist/types/template-compiler.d.ts',
  ],
);

const TEMPLATE_COMPILER_HOOK_DECORATOR_SOURCE = frameworkDeclarationSourceSpec(
  new Set(['templateCompilerHooks']),
  ['@aurelia/template-compiler'],
  [
    '/aurelia/packages/template-compiler/src/template-compiler.ts',
    '/aurelia/packages/template-compiler/dist/types/template-compiler.d.ts',
  ],
);

interface TemplateCompilerHookImports {
  readonly registryNames: ReadonlySet<string>;
  readonly decoratorNames: ReadonlySet<string>;
  readonly namespaces: ReadonlySet<string>;
}

const importsBySourceFile = new WeakMap<ts.SourceFile, TemplateCompilerHookImports>();

/** Return the hook class argument from an exact framework `TemplateCompilerHooks.define(Type)` call. */
export function templateCompilerHookDefineTarget(
  expression: ts.Expression,
  typeSystem: TypeSystemProject | null = null,
): ts.Expression | null {
  const call = unwrapExpression(expression);
  if (!ts.isCallExpression(call)) return null;
  const callee = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== 'define') return null;
  const imports = readTemplateCompilerHookImports(expression.getSourceFile());
  return isTemplateCompilerHooksReference(imports, unwrapExpression(callee.expression), typeSystem)
    ? call.arguments[0] ?? null
    : null;
}

/** Whether a class carries either exact framework `@templateCompilerHooks` decorator form. */
export function hasTemplateCompilerHookDecorator(
  target: ts.ClassLikeDeclarationBase,
  typeSystem: TypeSystemProject | null = null,
): boolean {
  if (!ts.canHaveDecorators(target)) return false;
  const imports = readTemplateCompilerHookImports(target.getSourceFile());
  return (ts.getDecorators(target) ?? []).some((decorator) => {
    const expression = unwrapExpression(decorator.expression);
    const callee = ts.isCallExpression(expression)
      ? unwrapExpression(expression.expression)
      : expression;
    return isTemplateCompilerHooksDecoratorReference(imports, callee, typeSystem);
  });
}

/** Runtime registrable metadata is inherited through the constructor chain; return the class that owns it. */
export function templateCompilerHookDecoratorOwner(
  value: EvaluationClassValue,
  typeSystem: TypeSystemProject | null = null,
): EvaluationClassValue | null {
  let current: EvaluationClassValue | null = value;
  while (current != null) {
    if (hasTemplateCompilerHookDecorator(current.declaration, typeSystem)) return current;
    current = current.baseClass;
  }
  return null;
}

/** Mirror kernel `isRegistry`: the runtime value's own/static side must expose a callable `register`. */
export function hasAureliaRegistryShape(
  typeSystem: TypeSystemProject | null,
  expression: ts.Expression,
): boolean {
  if (typeSystem == null) return false;
  const type = typeSystem.readProgramTypeAtLocation(expression);
  if (type == null) return false;
  const apparent = typeSystem.checker.getApparentType(type);
  const register = apparent.getProperty('register') ?? type.getProperty('register');
  if (register == null) return false;
  const declaration = register.valueDeclaration ?? register.declarations?.[0] ?? expression;
  const registerType = typeSystem.checker.getTypeOfSymbolAtLocation(register, declaration);
  return typeSystem.checker.getSignaturesOfType(registerType, ts.SignatureKind.Call).length > 0;
}

function readTemplateCompilerHookImports(sourceFile: ts.SourceFile): TemplateCompilerHookImports {
  const existing = importsBySourceFile.get(sourceFile);
  if (existing != null) return existing;
  const registryNames = new Set<string>();
  const decoratorNames = new Set<string>();
  const namespaces = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement)
      || !ts.isStringLiteral(statement.moduleSpecifier)
      || !TEMPLATE_COMPILER_HOOK_MODULES.has(statement.moduleSpecifier.text)
    ) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings == null) continue;
    if (ts.isNamespaceImport(bindings)) {
      namespaces.add(bindings.name.text);
      continue;
    }
    for (const element of bindings.elements) {
      switch ((element.propertyName ?? element.name).text) {
        case 'TemplateCompilerHooks':
          registryNames.add(element.name.text);
          break;
        case 'templateCompilerHooks':
          decoratorNames.add(element.name.text);
          break;
      }
    }
  }
  const result = { registryNames, decoratorNames, namespaces };
  importsBySourceFile.set(sourceFile, result);
  return result;
}

function isTemplateCompilerHooksReference(
  imports: TemplateCompilerHookImports,
  expression: ts.Expression,
  typeSystem: TypeSystemProject | null,
): boolean {
  if (typeSystem != null) {
    return symbolMatchesFrameworkDeclarationSource(
      typeSystem.readProgramAliasedSymbolAtLocation(expression),
      typeSystem.checker,
      new Map(),
      TEMPLATE_COMPILER_HOOK_REGISTRY_SOURCE,
    );
  }
  if (ts.isIdentifier(expression) && imports.registryNames.has(expression.text)) return true;
  if (ts.isPropertyAccessExpression(expression)
    && expression.name.text === 'TemplateCompilerHooks'
    && ts.isIdentifier(expression.expression)
    && imports.namespaces.has(expression.expression.text)) return true;
  return false;
}

function isTemplateCompilerHooksDecoratorReference(
  imports: TemplateCompilerHookImports,
  expression: ts.Expression,
  typeSystem: TypeSystemProject | null,
): boolean {
  if (typeSystem != null) {
    return symbolMatchesFrameworkDeclarationSource(
      typeSystem.readProgramAliasedSymbolAtLocation(expression),
      typeSystem.checker,
      new Map(),
      TEMPLATE_COMPILER_HOOK_DECORATOR_SOURCE,
    );
  }
  if (ts.isIdentifier(expression) && imports.decoratorNames.has(expression.text)) return true;
  if (ts.isPropertyAccessExpression(expression)
    && expression.name.text === 'templateCompilerHooks'
    && ts.isIdentifier(expression.expression)
    && imports.namespaces.has(expression.expression.text)) return true;
  return false;
}
