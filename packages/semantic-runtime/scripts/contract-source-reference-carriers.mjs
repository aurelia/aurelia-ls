import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  PUBLIC_SOURCE_REFERENCE_CARRIER_KEYS,
  semanticSourcePrecisionForReferences,
  semanticSourceReferencesInAnswerRows,
} from '../out/api/source-reference.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const contractsPath = path.join(packageRoot, 'src/api/contracts.ts');
const sourceText = readFileSync(contractsPath, 'utf8');
const sourceFile = ts.createSourceFile(contractsPath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const interfaces = new Map();

for (const statement of sourceFile.statements) {
  if (ts.isInterfaceDeclaration(statement)) {
    interfaces.set(statement.name.text, statement);
  }
}

const missing = [];
const unreachable = [];
for (const declaration of interfaces.values()) {
  if (!declaration.name.text.endsWith('Row')) {
    continue;
  }
  inspectCarrierProperties(declaration.name.text, declaration.members);
  verifyRuntimeReachability(declaration.name.text, declaration.members);
}

assert.deepEqual(missing, [], `Public source-reference carrier keys are missing:\n${missing.join('\n')}`);
assert.deepEqual(unreachable, [], `Public source-reference runtime collector cannot reach:\n${unreachable.join('\n')}`);
verifySourcePrecisionHelper();

console.log(JSON.stringify({
  ok: true,
  carrierKeys: [...PUBLIC_SOURCE_REFERENCE_CARRIER_KEYS].sort(),
}, null, 2));

function verifySourcePrecisionHelper() {
  assert.equal(
    semanticSourcePrecisionForReferences([
      { kind: 'source-file-address', label: 'src/app.ts', path: 'src/app.ts' },
      { kind: 'source-span-address', label: 'src/app.ts@1..2', path: 'src/app.ts', start: 1, end: 2 },
    ]),
    'exact-authored-span',
    'Source precision should strengthen carrier spans to exact authored spans.',
  );
  assert.equal(
    semanticSourcePrecisionForReferences([
      {
        kind: 'template-node-address',
        label: 'src/app.html@1..2',
        anchor: { kind: 'source-span-address', label: 'src/app.html@1..2', path: 'src/app.html', start: 1, end: 2 },
      },
    ]),
    'exact-authored-span',
    'Source precision should follow authored anchors for template/source carriers.',
  );
  assert.equal(
    semanticSourcePrecisionForReferences([
      {
        kind: 'generated-address',
        label: 'generated:overlay',
        anchor: { kind: 'source-span-address', label: 'src/app.html@1..2', path: 'src/app.html', start: 1, end: 2 },
      },
    ]),
    'generated-anchor',
    'Generated references should remain visibly generated even when they carry an authored anchor.',
  );
  assert.equal(
    semanticSourcePrecisionForReferences([
      { kind: 'source-span-address', label: 'node_modules/pkg/index.d.ts@1..2', path: 'node_modules/pkg/index.d.ts', start: 1, end: 2 },
    ]),
    'external',
    'Dependency and default-library references should not look like editable authored spans.',
  );
}

function inspectCarrierProperties(ownerName, members) {
  for (const member of members) {
    if (!ts.isPropertySignature(member) || member.type == null) {
      continue;
    }
    const key = propertyName(member.name);
    if (key == null) {
      continue;
    }
    if (isDirectSemanticSourceReference(member.type)) {
      continue;
    }
    if (!typeContainsSemanticSourceReference(member.type, new Set())) {
      continue;
    }
    if (!PUBLIC_SOURCE_REFERENCE_CARRIER_KEYS.has(key)) {
      missing.push(`${ownerName}.${key}`);
    }
  }
}

function verifyRuntimeReachability(ownerName, members) {
  for (const member of members) {
    if (!ts.isPropertySignature(member) || member.type == null) {
      continue;
    }
    const key = propertyName(member.name);
    if (key == null) {
      continue;
    }
    const paths = semanticSourceReferencePaths(member.type, new Set()).map((pathSegments) => [key, ...pathSegments]);
    for (const pathSegments of paths) {
      const label = `${ownerName}.${sourcePathText(pathSegments)}`;
      const row = materializeSourcePath(pathSegments, contractSource(label));
      const sources = semanticSourceReferencesInAnswerRows({ rows: [row] });
      if (!sources.some((source) => source.label === label)) {
        unreachable.push(label);
      }
    }
  }
}

function propertyName(name) {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)
    ? name.text
    : null;
}

function isDirectSemanticSourceReference(typeNode) {
  const nodes = unwrappedUnionNodes(typeNode);
  return nodes.length > 0 && nodes.every((node) =>
    ts.isTypeReferenceNode(node) && entityNameText(node.typeName) === 'SemanticSourceReference'
  );
}

function typeContainsSemanticSourceReference(typeNode, seen) {
  if (isDirectSemanticSourceReference(typeNode)) {
    return true;
  }
  if (ts.isUnionTypeNode(typeNode) || ts.isIntersectionTypeNode(typeNode)) {
    return typeNode.types.some((node) => typeContainsSemanticSourceReference(node, seen));
  }
  if (ts.isArrayTypeNode(typeNode)) {
    return typeContainsSemanticSourceReference(typeNode.elementType, seen);
  }
  if (ts.isTypeOperatorNode(typeNode) || ts.isParenthesizedTypeNode(typeNode)) {
    return typeContainsSemanticSourceReference(typeNode.type, seen);
  }
  if (ts.isTypeLiteralNode(typeNode)) {
    return [...typeNode.members].some((member) =>
      ts.isPropertySignature(member)
      && member.type != null
      && typeContainsSemanticSourceReference(member.type, seen)
    );
  }
  if (ts.isTypeReferenceNode(typeNode)) {
    const name = entityNameText(typeNode.typeName);
    if (name === 'SemanticSourceReference') {
      return true;
    }
    if ((typeNode.typeArguments ?? []).some((argument) => typeContainsSemanticSourceReference(argument, seen))) {
      return true;
    }
    const declaration = interfaces.get(name);
    if (declaration == null || seen.has(name)) {
      return false;
    }
    seen.add(name);
    const result = [...declaration.members].some((member) =>
      ts.isPropertySignature(member)
      && member.type != null
      && typeContainsSemanticSourceReference(member.type, seen)
    );
    seen.delete(name);
    return result;
  }
  return false;
}

function semanticSourceReferencePaths(typeNode, seen) {
  if (isDirectSemanticSourceReference(typeNode)) {
    return [[]];
  }
  if (ts.isUnionTypeNode(typeNode) || ts.isIntersectionTypeNode(typeNode)) {
    return typeNode.types.flatMap((node) => semanticSourceReferencePaths(node, seen));
  }
  if (ts.isArrayTypeNode(typeNode)) {
    return semanticSourceReferencePaths(typeNode.elementType, seen).map((pathSegments) => ['[]', ...pathSegments]);
  }
  if (ts.isTypeOperatorNode(typeNode) || ts.isParenthesizedTypeNode(typeNode)) {
    return semanticSourceReferencePaths(typeNode.type, seen);
  }
  if (ts.isTypeLiteralNode(typeNode)) {
    return [...typeNode.members].flatMap((member) => {
      if (!ts.isPropertySignature(member) || member.type == null) {
        return [];
      }
      const key = propertyName(member.name);
      return key == null
        ? []
        : semanticSourceReferencePaths(member.type, seen).map((pathSegments) => [key, ...pathSegments]);
    });
  }
  if (ts.isTypeReferenceNode(typeNode)) {
    const name = entityNameText(typeNode.typeName);
    if (name === 'SemanticSourceReference') {
      return [[]];
    }
    const argumentPaths = (typeNode.typeArguments ?? [])
      .flatMap((argument) => semanticSourceReferencePaths(argument, seen));
    const declaration = interfaces.get(name);
    if (declaration == null || seen.has(name)) {
      return argumentPaths;
    }
    seen.add(name);
    const declarationPaths = [...declaration.members].flatMap((member) => {
      if (!ts.isPropertySignature(member) || member.type == null) {
        return [];
      }
      const key = propertyName(member.name);
      return key == null
        ? []
        : semanticSourceReferencePaths(member.type, seen).map((pathSegments) => [key, ...pathSegments]);
    });
    seen.delete(name);
    return [...argumentPaths, ...declarationPaths];
  }
  return [];
}

function unwrappedUnionNodes(typeNode) {
  if (ts.isUnionTypeNode(typeNode)) {
    return typeNode.types.flatMap(unwrappedUnionNodes).filter((node) => !isNullishType(node));
  }
  if (ts.isParenthesizedTypeNode(typeNode)) {
    return unwrappedUnionNodes(typeNode.type);
  }
  return isNullishType(typeNode) ? [] : [typeNode];
}

function isNullishType(typeNode) {
  return typeNode.kind === ts.SyntaxKind.NullKeyword
    || typeNode.kind === ts.SyntaxKind.UndefinedKeyword
    || (ts.isLiteralTypeNode(typeNode) && typeNode.literal.kind === ts.SyntaxKind.NullKeyword);
}

function entityNameText(name) {
  return ts.isIdentifier(name)
    ? name.text
    : `${entityNameText(name.left)}.${name.right.text}`;
}

function materializeSourcePath(pathSegments, source) {
  if (pathSegments.length === 0) {
    return source;
  }
  const [head, ...rest] = pathSegments;
  if (head === '[]') {
    return [materializeSourcePath(rest, source)];
  }
  return {
    [head]: materializeSourcePath(rest, source),
  };
}

function contractSource(label) {
  return {
    kind: 'source-span-address',
    label,
    path: 'src/contract.ts',
    start: 1,
    end: 2,
  };
}

function sourcePathText(pathSegments) {
  return pathSegments.join('.').replaceAll('.[].', '[].').replaceAll('[]', '[]');
}
