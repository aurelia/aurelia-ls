import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repoRoot = path.resolve(packageRoot, '..', '..');
const sourceRoot = path.join(packageRoot, 'src');
const checkerAccessMethods = new Set([
  'getApparentType',
  'getIndexInfoOfType',
  'getIndexTypeOfType',
  'getPropertyOfType',
  'getResolvedSignature',
  'getSymbolAtLocation',
  'getTypeAtLocation',
  'getTypeFromTypeNode',
  'getTypeOfSymbolAtLocation',
]);
const allowedTypeSystemPrefix = 'packages/semantic-runtime/src/type-system/';
const allowedObservationLocalContext = 'packages/semantic-runtime/src/observation/proxy-observable-dependency.ts';
const allowedObservationMethods = new Set([
  'getApparentType',
  'getTypeAtLocation',
]);

const violations = [];
const rows = [];

for (const filePath of sourceFiles(sourceRoot)) {
  const text = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  visit(sourceFile, sourceFile);
}

assert.deepEqual(
  violations,
  [],
  `Checker value access must route through TypeSystemProject/checker helpers or documented local contexts:\n${violations.join('\n')}`,
);

console.log(JSON.stringify({
  ok: true,
  checkerAccessRows: rows.length,
  allowedFiles: [...new Set(rows.map((row) => row.file))].sort(),
}, null, 2));

function visit(sourceFile, node) {
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
    const method = node.expression.name.text;
    if (checkerAccessMethods.has(method)) {
      record(sourceFile, node, method);
    }
  }
  ts.forEachChild(node, (child) => visit(sourceFile, child));
}

function record(sourceFile, node, method) {
  const file = repoPath(sourceFile.fileName);
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const row = {
    file,
    line: line + 1,
    character: character + 1,
    method,
  };
  rows.push(row);
  if (!isAllowed(row)) {
    violations.push(`${row.file}:${row.line}:${row.character} ${row.method}`);
  }
}

function isAllowed(row) {
  if (row.file.startsWith(allowedTypeSystemPrefix)) {
    return true;
  }
  return row.file === allowedObservationLocalContext && allowedObservationMethods.has(row.method);
}

function* sourceFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* sourceFiles(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      yield fullPath;
    }
  }
}

function repoPath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, '/');
}
