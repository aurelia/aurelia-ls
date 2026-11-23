import path from 'node:path';
import ts from 'typescript';
import { readImportedExportName, readSourceImportBindings } from '../evaluation/import-bindings.js';
import { readEffectiveObjectProperty, unwrapExpression } from '../evaluation/ts-syntax.js';
import type { SemanticRuntimeProjectInputHost } from '../kernel/project-input.js';

// Vite's DEFAULT_CONFIG_FILES search order. Only a selected config with a
// closed literal path can remove a directory from automatic source discovery.
const viteConfigNames = ['vite.config.js', 'vite.config.mjs', 'vite.config.ts', 'vite.config.cjs', 'vite.config.mts', 'vite.config.cts'];
const viteModules = new Set(['vite']);
const defineConfig = new Set(['defineConfig']);

export function configuredViteOutputRoot(host: SemanticRuntimeProjectInputHost, rootDir: string): string | undefined {
  const entries = new Set(host.readDirectory(rootDir));
  const name = viteConfigNames.find(candidate => entries.has(candidate));
  if (name == null) return undefined;
  const fileName = path.join(rootDir, name);
  const text = host.readFile(fileName);
  if (text == null) return undefined;
  const source: ts.SourceFile & { readonly parseDiagnostics?: readonly ts.Diagnostic[] } =
    ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  if (!Array.isArray(source.parseDiagnostics) || source.parseDiagnostics.length > 0) return undefined;
  const configs = source.statements.filter(ts.isExportAssignment);
  const config = configs.length === 1 ? configs[0] : undefined;
  if (config == null || config.isExportEquals) return undefined;
  let value = unwrapExpression(config.expression);
  if (ts.isCallExpression(value)) {
    const imports = readSourceImportBindings(source, viteModules, defineConfig);
    if (value.arguments.length !== 1 || readImportedExportName(value.expression, imports, defineConfig) !== 'defineConfig') return undefined;
    value = unwrapExpression(value.arguments[0]!);
  }
  if (!ts.isObjectLiteralExpression(value)) return undefined;
  const build = readEffectiveObjectProperty(value, 'build');
  const buildOptions = build == null ? null : unwrapExpression(build);
  if (buildOptions == null || !ts.isObjectLiteralExpression(buildOptions)) return undefined;
  const output = readEffectiveObjectProperty(buildOptions, 'outDir');
  if (output == null || !ts.isStringLiteralLike(output) || !output.text) return undefined;
  const root = readEffectiveObjectProperty(value, 'root');
  if (root === null || (root !== undefined && !ts.isStringLiteralLike(root))) return undefined;
  return path.resolve(rootDir, root?.text ?? '.', output.text);
}
