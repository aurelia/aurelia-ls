import ts from 'typescript';
import type { ProjectBootFrame } from '../boot/frames.js';
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

export function typeSystemProjectOptions(
  project: ProjectBootFrame,
): TypeSystemProjectOptions {
  const result = project.compilerOptions;
  return new TypeSystemProjectOptions(
    result.options,
    result.configFilePath,
    result.diagnostics,
    result.rootFileNames,
    buildInitialTypeSystemOverlaySources(project.rootDir),
  );
}
