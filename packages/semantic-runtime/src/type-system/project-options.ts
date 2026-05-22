import path from 'node:path';
import ts from 'typescript';
import { buildProjectCompilerOptionsResult } from '../boot/project-compiler-options.js';

export class TypeSystemProjectOptions {
  constructor(
    readonly compilerOptions: ts.CompilerOptions,
    readonly configFilePath: string | null,
    readonly configDiagnostics: readonly ts.Diagnostic[],
    readonly configRootFileNames: readonly string[] | null,
    readonly ambientSourceFiles: readonly ts.SourceFile[],
  ) {}
}

export function buildTypeSystemProjectOptions(rootDir: string): TypeSystemProjectOptions {
  const result = buildProjectCompilerOptionsResult(rootDir);
  return new TypeSystemProjectOptions(
    result.options,
    result.configFilePath,
    result.diagnostics,
    result.rootFileNames,
    [semanticRuntimeAmbientSourceFile(rootDir)],
  );
}

export function buildWorkspaceTypeSystemProjectOptions(
  rootDir: string,
  workspaceRootDir: string,
): TypeSystemProjectOptions {
  const result = buildProjectCompilerOptionsResult(rootDir, [workspaceRootDir]);
  return new TypeSystemProjectOptions(
    result.options,
    result.configFilePath,
    result.diagnostics,
    result.rootFileNames,
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
