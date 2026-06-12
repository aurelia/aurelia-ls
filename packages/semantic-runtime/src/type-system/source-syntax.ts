import ts from 'typescript';

/** Read TypeScript syntax diagnostics for an isolated generated source fragment without constructing a Program. */
export function readTypeScriptSourceSyntaxDiagnostics(
  source: string,
  fileName = '__semantic_runtime_source_probe.ts',
): readonly ts.Diagnostic[] {
  return ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.Latest,
      experimentalDecorators: true,
    },
    fileName,
    reportDiagnostics: true,
  }).diagnostics ?? [];
}
