import ts from 'typescript';
import { buildProjectCompilerOptionsResult } from '../boot/project-compiler-options.js';
import {
  buildInitialTypeSystemOverlaySources,
  type TypeSystemOverlaySource,
} from './overlay.js';

export class TypeSystemProjectOptions {
  constructor(
    readonly compilerOptions: ts.CompilerOptions,
    readonly configFilePath: string | null,
    readonly configDiagnostics: readonly ts.Diagnostic[],
    readonly configRootFileNames: readonly string[] | null,
    readonly overlaySources: readonly TypeSystemOverlaySource[],
  ) {}
}

export function buildTypeSystemProjectOptions(rootDir: string): TypeSystemProjectOptions {
  const result = buildProjectCompilerOptionsResult(rootDir);
  return new TypeSystemProjectOptions(
    result.options,
    result.configFilePath,
    result.diagnostics,
    result.rootFileNames,
    buildInitialTypeSystemOverlaySources(rootDir),
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
    buildInitialTypeSystemOverlaySources(rootDir),
  );
}
