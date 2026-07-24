import path from 'node:path';

import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import {
  checkerValueCallability,
  CheckerValueCallabilityKind,
} from '../src/type-system/checker-signature-parameters.js';

describe('checker value callability', () => {
  test('keeps closed non-callability distinct from weak and branch-dependent values', () => {
    const fixture = checkerFixture(`
      declare const nullableCallable: ((value: string) => void) | undefined;
      declare const nonCallable: string | number;
      declare const mixed: ((value: string) => void) | string;
      declare const weakFunction: Function;
      declare const weakAny: any;
      declare const allCallable: ((value: string) => void) | ((value: number) => void);
    `);

    expect(callability(fixture, 'nullableCallable').kind).toBe(CheckerValueCallabilityKind.Open);
    expect(callability(fixture, 'nonCallable').kind).toBe(CheckerValueCallabilityKind.NonCallable);
    expect(callability(fixture, 'mixed').kind).toBe(CheckerValueCallabilityKind.Open);
    expect(callability(fixture, 'weakFunction').kind).toBe(CheckerValueCallabilityKind.Open);
    expect(callability(fixture, 'weakAny').kind).toBe(CheckerValueCallabilityKind.Open);
    const allCallable = callability(fixture, 'allCallable');
    expect(allCallable.kind).toBe(CheckerValueCallabilityKind.Callable);
    expect(allCallable.signatures.length).toBeGreaterThan(0);
  });
});

interface CheckerFixture {
  readonly checker: ts.TypeChecker;
  readonly sourceFile: ts.SourceFile;
}

function callability(fixture: CheckerFixture, name: string) {
  const declaration = fixture.sourceFile.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((candidate) => ts.isIdentifier(candidate.name) && candidate.name.text === name);
  if (declaration == null) {
    throw new Error(`Expected checker fixture declaration '${name}'.`);
  }
  return checkerValueCallability(
    fixture.checker,
    fixture.checker.getTypeAtLocation(declaration.name),
  );
}

function checkerFixture(sourceText: string): CheckerFixture {
  const fileName = path.resolve('checker-value-callability.ts');
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
    throw new Error('Expected checker callability fixture source file.');
  }
  return {
    checker: program.getTypeChecker(),
    sourceFile,
  };
}
