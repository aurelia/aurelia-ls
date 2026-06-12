import ts from 'typescript';
import {
  declarationMatchesFrameworkSource,
  frameworkDeclarationSourceSpec,
} from '../out/type-system/framework-declaration-source.js';

const dialogSpec = frameworkDeclarationSourceSpec(
  new Set(['IDialogService']),
  ['@aurelia/dialog'],
  ['/aurelia/packages/dialog/src/'],
);

const cases = [
  {
    path: '/repo/aurelia/packages/dialog/src/dialog-service.ts',
    expected: true,
    label: 'monorepo framework source',
  },
  {
    path: '/repo/node_modules/@aurelia/dialog/dist/index.d.ts',
    expected: true,
    label: 'plain node_modules package root',
  },
  {
    path: '/repo/node_modules/.pnpm/@aurelia+dialog@2.0.0/node_modules/@aurelia/dialog/dist/index.d.ts',
    expected: true,
    label: 'pnpm virtual-store package root',
  },
  {
    path: '/repo/.yarn/__virtual__/@aurelia-dialog-virtual-123/0/cache/@aurelia-dialog-npm-2.0.0/node_modules/@aurelia/dialog/dist/index.d.ts',
    expected: true,
    label: 'yarn virtual package root with node_modules segment',
  },
  {
    path: 'C:\\repo\\node_modules\\@aurelia\\dialog\\dist\\index.d.ts',
    expected: true,
    label: 'windows plain node_modules package root',
  },
  {
    path: '/repo/node_modules/@aurelia/validation/dist/index.d.ts',
    expected: false,
    label: 'wrong Aurelia package',
  },
  {
    path: '/repo/node_modules/@acme/aurelia-dialog/dist/index.d.ts',
    expected: false,
    label: 'lookalike third-party package',
  },
];

const failures = [];
for (const entry of cases) {
  const declaration = declarationFor(entry.path);
  const matched = declarationMatchesFrameworkSource(declaration, new Map(), dialogSpec);
  if (matched !== entry.expected) {
    failures.push(`Expected ${entry.label} (${entry.path}) to match=${entry.expected}, observed ${matched}.`);
  }
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    failures,
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    summary: {
      cases: cases.length,
    },
  }, null, 2));
}

function declarationFor(fileName) {
  const sourceFile = ts.createSourceFile(
    fileName,
    'export interface IDialogService {}',
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const declaration = sourceFile.statements[0];
  if (declaration == null) {
    throw new Error(`No declaration produced for ${fileName}`);
  }
  return declaration;
}
