import path from 'node:path';
import ts from 'typescript';
import type { SemanticRuntimeProjectInputHost } from '../kernel/project-input.js';
import { normalizePosixPath } from './host-files.js';

/** Parse one configured project, including its inherited options, through the caller's captured input host. */
export function readCompilerConfigInput(
  host: SemanticRuntimeProjectInputHost,
  configFile: string,
  useCaseSensitiveFileNames = ts.sys.useCaseSensitiveFileNames,
): { parsed: ts.ParsedCommandLine | null; diagnostics: readonly ts.Diagnostic[] } {
  const fileName = normalizePosixPath(configFile);
  const read = ts.readConfigFile(fileName, file => host.readFile(file));
  if (read.error || read.config == null) {
    return { parsed: null, diagnostics: read.error ? [read.error] : [] };
  }
  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    {
      useCaseSensitiveFileNames,
      readDirectory: (directory, extensions, excludes, includes, depth) =>
        [...host.matchFiles(directory, extensions, excludes, includes, depth)],
      fileExists: file => host.fileExists(file),
      readFile: file => host.readFile(file),
    },
    path.dirname(fileName),
    undefined,
    fileName,
  );
  return { parsed, diagnostics: parsed.errors };
}
