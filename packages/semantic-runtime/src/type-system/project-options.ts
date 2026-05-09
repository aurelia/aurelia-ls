import path from 'node:path';
import ts from 'typescript';
import { buildProjectCompilerOptions } from '../boot/project-compiler-options.js';

export class TypeSystemProjectOptions {
  constructor(
    readonly compilerOptions: ts.CompilerOptions,
    readonly ambientSourceFiles: readonly ts.SourceFile[],
  ) {}
}

export function buildTypeSystemProjectOptions(rootDir: string): TypeSystemProjectOptions {
  return new TypeSystemProjectOptions(
    buildProjectCompilerOptions(rootDir),
    [semanticRuntimeAmbientSourceFile(rootDir)],
  );
}

function semanticRuntimeAmbientSourceFile(rootDir: string): ts.SourceFile {
  const fileName = path.join(rootDir, '.semantic-runtime', 'ambient.d.ts');
  return ts.createSourceFile(
    fileName,
    [
      "declare module '*.html' {",
      '  const template: string;',
      '  export default template;',
      '}',
      '',
    ].join('\n'),
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS,
  );
}
