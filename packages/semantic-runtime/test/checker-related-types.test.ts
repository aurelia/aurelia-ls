import path from 'node:path';

import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import { checkerBaseTypes } from '../src/type-system/checker-related-types.js';

describe('checker related types', () => {
  test('reads tuple bases through the target for an indexed optional-chain owner', () => {
    const fixture = checkerFixture(`
      class Example {
        formats: Record<string, [string, string]> = {};
        type = 'json';
        read() {
          return this.formats[this.type]?.[0];
        }
      }
    `);
    const access = findElementAccess(fixture.sourceFile, 'this.formats[this.type]?.[0]');
    const owner = fixture.checker.getTypeAtLocation(access.expression);

    expect(fixture.checker.isTupleType(owner)).toBe(true);
    expect(owner.getSymbol()).toBeUndefined();
    expect((owner as ts.TypeReference).target.getSymbol()).toBeUndefined();

    const bases = checkerBaseTypes(fixture.checker, owner);
    expect(bases).toHaveLength(1);
    expect(fixture.checker.isArrayType(bases[0]!)).toBe(true);
  });

  test('returns no bases for symbol-less and non-class object shapes', () => {
    const fixture = checkerFixture(`
      declare const primitive: string;
      declare const anonymous: { value: string };
      type Mapped<T> = { [K in keyof T]: T[K] };
      declare const mapped: Mapped<{ value: string }>;
    `);

    expect(checkerBaseTypes(fixture.checker, declarationType(fixture, 'primitive'))).toEqual([]);
    expect(checkerBaseTypes(fixture.checker, declarationType(fixture, 'anonymous'))).toEqual([]);
    expect(checkerBaseTypes(fixture.checker, declarationType(fixture, 'mapped'))).toEqual([]);
  });

  test('normalizes an undefined checker base array', () => {
    const fixture = checkerFixture(`
      class Base {}
      class Derived extends Base {}
      declare const derived: Derived;
    `);
    const checker = new Proxy(fixture.checker, {
      get(target, property, receiver) {
        return property === 'getBaseTypes'
          ? () => undefined
          : Reflect.get(target, property, receiver);
      },
    });

    expect(checkerBaseTypes(checker, declarationType(fixture, 'derived'))).toEqual([]);
  });
});

interface CheckerFixture {
  readonly checker: ts.TypeChecker;
  readonly sourceFile: ts.SourceFile;
}

function checkerFixture(sourceText: string): CheckerFixture {
  const fileName = path.resolve('checker-related-types.ts');
  const options: ts.CompilerOptions = {
    strict: true,
    target: ts.ScriptTarget.ESNext,
  };
  const host = ts.createCompilerHost(options);
  const readSourceFile = host.getSourceFile.bind(host);
  host.fileExists = (candidate) => path.resolve(candidate) === fileName || ts.sys.fileExists(candidate);
  host.readFile = (candidate) => path.resolve(candidate) === fileName ? sourceText : ts.sys.readFile(candidate);
  host.getSourceFile = (candidate, languageVersion, onError, shouldCreateNewSourceFile) =>
    path.resolve(candidate) === fileName
      ? ts.createSourceFile(fileName, sourceText, languageVersion, true, ts.ScriptKind.TS)
      : readSourceFile(candidate, languageVersion, onError, shouldCreateNewSourceFile);
  const program = ts.createProgram({
    rootNames: [fileName],
    options,
    host,
  });
  const sourceFile = program.getSourceFile(fileName);
  if (sourceFile == null) {
    throw new Error('Expected checker related-types fixture source file.');
  }
  return {
    checker: program.getTypeChecker(),
    sourceFile,
  };
}

function findElementAccess(sourceFile: ts.SourceFile, text: string): ts.ElementAccessExpression {
  let selected: ts.ElementAccessExpression | null = null;
  const visit = (node: ts.Node): void => {
    if (ts.isElementAccessExpression(node) && node.getText(sourceFile) === text) {
      selected = node;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (selected == null) {
    throw new Error(`Expected element access '${text}'.`);
  }
  return selected;
}

function declarationType(fixture: CheckerFixture, name: string): ts.Type {
  const declaration = fixture.sourceFile.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((candidate) => ts.isIdentifier(candidate.name) && candidate.name.text === name);
  if (declaration == null) {
    throw new Error(`Expected checker fixture declaration '${name}'.`);
  }
  return fixture.checker.getTypeAtLocation(declaration.name);
}
