import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourceRoot = path.join(packageRoot, 'src');
const failures = [];

for (const filePath of semanticRuntimeSourceFiles(sourceRoot)) {
  const text = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.ES2023, true, ts.ScriptKind.TS);
  visit(sourceFile, sourceFile);
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('contract ok: kernel inquiry continuations carry shared intent/evidence applicability.');

function visit(sourceFile, node) {
  if (
    ts.isNewExpression(node)
    && ts.isIdentifier(node.expression)
    && node.expression.text === 'InquiryContinuation'
    && (node.arguments?.length ?? 0) < 4
  ) {
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    failures.push(
      `${path.relative(packageRoot, sourceFile.fileName)}:${position.line + 1}:${position.character + 1} constructs InquiryContinuation without applicability.`,
    );
  }
  ts.forEachChild(node, (child) => visit(sourceFile, child));
}

function semanticRuntimeSourceFiles(root) {
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...semanticRuntimeSourceFiles(entryPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(entryPath);
    }
  }
  return files;
}
