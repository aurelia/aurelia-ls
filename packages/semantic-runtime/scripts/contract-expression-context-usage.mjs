import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repoRoot = path.resolve(packageRoot, '..', '..');
const sourceRoot = path.join(packageRoot, 'src');
const scriptsRoot = path.join(packageRoot, 'scripts');
const contextClassName = 'CheckerExpressionTypeEvaluationContext';
const knownScopeContextHelper = `${contextClassName}.knownScope`;
const runtimeProjectionContextHelper = 'checkerContextForRuntimeBindingSourceExpressionProjection';
const sourceValueContextClassName = 'RuntimeBindingSourceValueEvaluationContext';
const sourceValueKnownScopeHelper = `${sourceValueContextClassName}.knownScope`;
const sourceValueProjectionContextHelper = 'sourceValueContextForRuntimeBindingSourceExpressionProjection';

const allowedDirectContextConstructors = new Set([
  'packages/semantic-runtime/src/type-system/expression-type-context.ts#CheckerExpressionTypeEvaluationContext.knownScope',
  'packages/semantic-runtime/src/type-system/expression-type-context.ts#CheckerExpressionTypeEvaluationContext.withEffectiveContextualType',
  'packages/semantic-runtime/src/type-system/expression-type-context.ts#CheckerExpressionTypeEvaluationContext.childInScope',
  'packages/semantic-runtime/src/type-system/expression-type-context.ts#CheckerExpressionTypeEvaluationContext.withScope',
  'packages/semantic-runtime/src/type-system/expression-type-context.ts#CheckerExpressionTypeEvaluationContext.withContextualType',
  'packages/semantic-runtime/src/type-system/expression-type-context.ts#CheckerExpressionTypeEvaluationContext.withRuntimeContext',
]);

const allowedKnownScopeContextCalls = new Set([
  'packages/semantic-runtime/src/observation/runtime-binding-source-expression-context.ts#checkerContextForRuntimeBindingSourceExpressionProjection',
  'packages/semantic-runtime/src/inquiry/template-completion.ts#memberOwnerEvaluationContextForCursorExpression',
  'packages/semantic-runtime/src/template/template-scope-type-projector.ts#TemplateScopeTypeProjector.evaluationContextForRuntimeBinding',
]);

const allowedSourceValueKnownScopeCalls = new Set([
  'packages/semantic-runtime/src/observation/binding-source-value-evaluation-context.ts#projectRuntimeBindingSourceValueContextInScope',
  'packages/semantic-runtime/src/router/route-instruction-materialization.ts#evaluateRouterSourceExpression',
]);

const allowedSourceValueProjectionCalls = new Set([
  'packages/semantic-runtime/src/observation/binding-source-value-evaluation-context.ts#projectRuntimeBindingSourceValueContextInScope',
  'packages/semantic-runtime/src/router/route-instruction-materialization.ts#evaluateRouterSourceExpression',
  'packages/semantic-runtime/src/template/runtime-composition-materializer.ts#RuntimeCompositionMaterializer.evaluateBinding',
]);

const constructorRows = [];
const knownScopeRows = [];
const runtimeProjectionRows = [];
const sourceValueKnownScopeRows = [];
const sourceValueProjectionRows = [];
const violations = [];

for (const filePath of [...sourceFiles(sourceRoot), ...sourceFiles(scriptsRoot)]) {
  const text = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, sourceKindFor(filePath));
  visit(sourceFile, sourceFile);
}

for (const row of constructorRows) {
  if (!allowedDirectContextConstructors.has(`${row.file}#${row.owner}`)) {
    violations.push(`${row.file}:${row.line}:${row.character} ${row.owner}`);
  }
}
for (const row of knownScopeRows) {
  if (row.file.startsWith('packages/semantic-runtime/scripts/')) {
    continue;
  }
  if (!allowedKnownScopeContextCalls.has(`${row.file}#${row.owner}`)) {
    violations.push(`${row.file}:${row.line}:${row.character} ${row.owner}`);
  }
}
for (const row of sourceValueKnownScopeRows) {
  if (row.file.startsWith('packages/semantic-runtime/scripts/')) {
    continue;
  }
  if (!allowedSourceValueKnownScopeCalls.has(`${row.file}#${row.owner}`)) {
    violations.push(`${row.file}:${row.line}:${row.character} ${row.owner}`);
  }
}
for (const row of sourceValueProjectionRows) {
  if (row.file.startsWith('packages/semantic-runtime/scripts/')) {
    continue;
  }
  if (!allowedSourceValueProjectionCalls.has(`${row.file}#${row.owner}`)) {
    violations.push(`${row.file}:${row.line}:${row.character} ${row.owner}`);
  }
}

assert.deepEqual(
  violations,
  [],
  `${contextClassName} and ${sourceValueContextClassName} creation must stay in documented context/fallback owners. Rendered binding, overlay, diagnostics, i18n, router, and observation consumers should usually enter through ${runtimeProjectionContextHelper} or ${sourceValueProjectionContextHelper}; non-rendered exact-scope fallbacks should enter through ${knownScopeContextHelper} or ${sourceValueKnownScopeHelper} only where the caller owns the modeled Scope:\n${violations.join('\n')}`,
);

console.log(JSON.stringify({
  ok: true,
  directConstructors: constructorRows,
  knownScopeContextCalls: knownScopeRows,
  runtimeProjectionContextCalls: runtimeProjectionRows.length,
  runtimeProjectionContextOwners: [...new Set(runtimeProjectionRows.map((row) => `${row.file}#${row.owner}`))].sort(),
  sourceValueKnownScopeContextCalls: sourceValueKnownScopeRows,
  sourceValueProjectionContextCalls: sourceValueProjectionRows.length,
  sourceValueProjectionContextOwners: [...new Set(sourceValueProjectionRows.map((row) => `${row.file}#${row.owner}`))].sort(),
}, null, 2));

function visit(sourceFile, node) {
  if (ts.isNewExpression(node) && node.expression.getText(sourceFile) === contextClassName) {
    constructorRows.push(rowForNode(sourceFile, node, ownerName(node)));
  }
  if (ts.isCallExpression(node) && node.expression.getText(sourceFile) === knownScopeContextHelper) {
    knownScopeRows.push(rowForNode(sourceFile, node, ownerName(node)));
  }
  if (ts.isCallExpression(node) && node.expression.getText(sourceFile) === runtimeProjectionContextHelper) {
    runtimeProjectionRows.push(rowForNode(sourceFile, node, ownerName(node)));
  }
  if (ts.isCallExpression(node) && node.expression.getText(sourceFile) === sourceValueKnownScopeHelper) {
    sourceValueKnownScopeRows.push(rowForNode(sourceFile, node, ownerName(node)));
  }
  if (ts.isCallExpression(node) && node.expression.getText(sourceFile) === sourceValueProjectionContextHelper) {
    sourceValueProjectionRows.push(rowForNode(sourceFile, node, ownerName(node)));
  }
  ts.forEachChild(node, (child) => visit(sourceFile, child));
}

function rowForNode(sourceFile, node, owner) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return {
    file: repoPath(sourceFile.fileName),
    line: line + 1,
    character: character + 1,
    owner,
  };
}

function ownerName(node) {
  let current = node.parent;
  while (current != null) {
    if (ts.isMethodDeclaration(current) || ts.isGetAccessorDeclaration(current) || ts.isSetAccessorDeclaration(current)) {
      const methodName = current.name?.getText(current.getSourceFile()) ?? '<anonymous-method>';
      const className = classOwnerName(current);
      return className == null ? methodName : `${className}.${methodName}`;
    }
    if (ts.isFunctionDeclaration(current)) {
      return current.name?.text ?? '<anonymous-function>';
    }
    if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
      const variable = variableOwnerName(current);
      if (variable != null) {
        return variable;
      }
    }
    current = current.parent;
  }
  return '<top-level>';
}

function classOwnerName(node) {
  let current = node.parent;
  while (current != null) {
    if (ts.isClassDeclaration(current) || ts.isClassExpression(current)) {
      return current.name?.text ?? '<anonymous-class>';
    }
    current = current.parent;
  }
  return null;
}

function variableOwnerName(node) {
  let current = node.parent;
  while (current != null) {
    if (ts.isVariableDeclaration(current) && current.name != null) {
      return current.name.getText(current.getSourceFile());
    }
    if (!ts.isParenthesizedExpression(current) && !ts.isAsExpression(current) && !ts.isSatisfiesExpression(current)) {
      return null;
    }
    current = current.parent;
  }
  return null;
}

function* sourceFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* sourceFiles(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.mjs'))) {
      yield fullPath;
    }
  }
}

function sourceKindFor(filePath) {
  return filePath.endsWith('.mjs') ? ts.ScriptKind.JS : ts.ScriptKind.TS;
}

function repoPath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, '/');
}
