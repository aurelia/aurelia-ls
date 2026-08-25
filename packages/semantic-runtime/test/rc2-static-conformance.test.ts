import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import { readStaticAuInitializer } from '../src/resources/resource-field-readers.js';
import { customElementDefineCallSourceText } from '../src/resources/resource-definition-source.js';
import {
  COMPONENT_LIFECYCLE_HOOK_NAMES,
  componentLifecycleHookName,
} from '../src/template/component-lifecycle-source.js';

const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url));
const aureliaRoot = path.join(workspaceRoot, 'aurelia');

describe('RC2 static conformance', () => {
  test('keeps dialog closure and instruction helpers on their RC2 public declarations', () => {
    const dialog = readAureliaSource('packages/dialog/src/dialog-interfaces.ts');
    const dialogPromise = dialog.statements.find((statement): statement is ts.InterfaceDeclaration =>
      ts.isInterfaceDeclaration(statement) && statement.name.text === 'DialogOpenPromise'
    );
    const whenClosed = dialogPromise?.members.filter((member): member is ts.MethodSignature =>
      ts.isMethodSignature(member) && member.name.getText(dialog) === 'whenClosed'
    ) ?? [];

    expect(whenClosed.some((method) =>
      method.parameters.length === 0 && method.type?.getText(dialog) === 'Promise<DialogCloseResult>'
    )).toBe(true);
    expect(whenClosed.some((method) => method.getText(dialog).includes('PromiseLike<TResult1>'))).toBe(true);

    const instructions = readAureliaSource('packages/template-compiler/src/instructions.ts');
    const isInstruction = instructions.statements.find((statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === 'isInstruction'
    );
    expect(isInstruction).toBeDefined();
    expect(isInstruction?.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)).toBe(true);
    expect(ts.getJSDocTags(isInstruction!).some((tag) => tag.tagName.text === 'internal')).toBe(false);

    const compilerIndex = readAureliaSource('packages/template-compiler/src/index.ts');
    const indexExports = compilerIndex.statements
      .filter((statement): statement is ts.ExportDeclaration => ts.isExportDeclaration(statement))
      .flatMap((statement) => ts.isNamedExports(statement.exportClause)
        ? statement.exportClause.elements.map((element) => element.name.text)
        : []);
    expect(indexExports).toContain('isInstruction');
  });

  test('keeps watch and computed decorators structurally typed for standard decorators', () => {
    const watch = readAureliaSource('packages/runtime-html/src/watch.ts');
    const watchable = requireTypeAlias(watch, 'WatchableMethod');
    expect(ts.isUnionTypeNode(watchable.type)).toBe(true);
    const watchableSignatures = ts.isUnionTypeNode(watchable.type)
      ? watchable.type.types
          .map(unwrapParenthesizedType)
          .filter(ts.isFunctionTypeNode)
      : [];
    expect(watchableSignatures.map((signature) => signature.parameters.length)).toEqual([0, 1, 2, 3]);
    expect(watchableSignatures.flatMap((signature) => signature.parameters.map((parameter) => parameter.type?.getText(watch))))
      .toEqual(['D', 'D', 'D', 'D', 'D', 'T']);
    expect(requireTypeAlias(watch, 'WatchMethodDecorator').getText(watch))
      .toContain('TV extends WatchableMethod<T, D>');

    const computed = readAureliaSource('packages/runtime/src/computed-decorators.ts');
    const universal = requireTypeAlias(computed, 'UniversalComputedDecorator');
    expect(universal.getText(computed)).not.toContain('any');
    expect(universal.getText(computed)).toContain('ClassGetterDecoratorContext<T>');
    expect(universal.getText(computed)).toContain('ClassMethodDecoratorContext<T>');
    const computedOverloads = computed.statements.filter((statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement)
        && statement.name?.text === 'computed'
        && statement.body == null
    );
    expect(computedOverloads.filter((overload) =>
      overload.type?.getText(computed) === 'UniversalComputedDecorator<TThis>'
    )).toHaveLength(3);
  });

  test('excludes lifecycle define while retaining resource define and exact static $au carriers', () => {
    expect(componentLifecycleHookName('define')).toBeNull();
    expect(COMPONENT_LIFECYCLE_HOOK_NAMES).not.toContain('define');
    expect(customElementDefineCallSourceText({
      name: 'static-card',
      typeExpression: 'StaticCard',
    })).toMatch(/^CustomElement\.define\(\{[\s\S]*name: 'static-card',[\s\S]*\}, StaticCard\)$/);

    const source = ts.createSourceFile(
      'static-au.ts',
      [
        "class StaticCard { static readonly $au = { type: 'custom-element', name: 'static-card' }; }",
        "class InstanceCard { readonly $au = { type: 'custom-element', name: 'instance-card' }; }",
        "class TextCard { static readonly query = 'query ($authId: String)'; }",
        "class GetterCard { static get $au() { return { type: 'custom-element', name: 'getter-card' }; } }",
      ].join('\n'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const classes = new Map(source.statements
      .filter((statement): statement is ts.ClassDeclaration => ts.isClassDeclaration(statement))
      .map((declaration) => [declaration.name!.text, declaration]));

    expect(readStaticAuInitializer(classes.get('StaticCard')!)?.getText(source))
      .toBe("{ type: 'custom-element', name: 'static-card' }");
    expect(readStaticAuInitializer(classes.get('InstanceCard')!)).toBeNull();
    expect(readStaticAuInitializer(classes.get('TextCard')!)).toBeNull();
    expect(readStaticAuInitializer(classes.get('GetterCard')!)).toBeNull();
  });

  test('keeps Vite standard-decorator controls and the independent TypeScript 6 compatibility API', () => {
    const viteIndex = readAureliaSource('packages-tooling/vite-plugin/src/index.ts');
    const options = viteIndex.statements.find((statement): statement is ts.InterfaceDeclaration =>
      ts.isInterfaceDeclaration(statement) && statement.name.text === 'AureliaPluginOptions'
    );
    const optionNames = options?.members.map((member) => member.name?.getText(viteIndex)) ?? [];
    expect(optionNames).toEqual(expect.arrayContaining([
      'transformStandardDecorators',
      'standardDecoratorInclude',
      'standardDecoratorExclude',
    ]));

    const standardDecorators = readAureliaText('packages-tooling/vite-plugin/src/standard-decorators.ts');
    expect(standardDecorators).toContain('options.transformStandardDecorators ?? isVite8(config)');
    expect(standardDecorators).toContain("moduleId.endsWith('.$au.ts')");

    const conventionsPackage = JSON.parse(
      readAureliaText('packages-tooling/plugin-conventions/package.json'),
    ) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(conventionsPackage.dependencies['@typescript/typescript6']).toMatch(/^\^6\./);
    expect(conventionsPackage.dependencies.typescript).toBeUndefined();
    expect(conventionsPackage.devDependencies.typescript).toMatch(/^5\./);
    expect(readAureliaText('packages-tooling/plugin-conventions/src/preprocess-resource.ts'))
      .toContain("from '@typescript/typescript6'");
  });
});

function readAureliaText(relativePath: string): string {
  return readFileSync(path.join(aureliaRoot, relativePath), 'utf8');
}

function readAureliaSource(relativePath: string): ts.SourceFile {
  return ts.createSourceFile(
    relativePath,
    readAureliaText(relativePath),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

function requireTypeAlias(source: ts.SourceFile, name: string): ts.TypeAliasDeclaration {
  const declaration = source.statements.find((statement): statement is ts.TypeAliasDeclaration =>
    ts.isTypeAliasDeclaration(statement) && statement.name.text === name
  );
  if (declaration == null) {
    throw new Error(`Expected type alias ${name} in ${source.fileName}.`);
  }
  return declaration;
}

function unwrapParenthesizedType(type: ts.TypeNode): ts.TypeNode {
  let current = type;
  while (ts.isParenthesizedTypeNode(current)) {
    current = current.type;
  }
  return current;
}
