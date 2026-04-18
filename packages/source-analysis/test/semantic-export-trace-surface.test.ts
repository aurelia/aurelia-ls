import * as ts from 'typescript';
import { describe, expect, it } from './test-harness.js';

import {
  traceModuleExport,
  type ExportModuleInfo,
} from '../src/semantic/export-trace-surface.js';

describe('Semantic export trace surface', () => {
  it('resolves local alias, named reexport, and star reexport chains without going through the exports projection', () => {
    const files = new Map<string, ts.SourceFile>([
      ['src/index.ts', ts.createSourceFile('src/index.ts', '', ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS)],
      ['src/barrel.ts', ts.createSourceFile('src/barrel.ts', '', ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS)],
      ['src/types.ts', ts.createSourceFile('src/types.ts', '', ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS)],
      ['src/value.ts', ts.createSourceFile('src/value.ts', '', ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS)],
    ]);

    const modules = new Map<string, ExportModuleInfo>([
      ['src/index.ts', {
        exportedDeclarations: new Map(),
        localExportSpecifiers: [{
          exportedName: 'answer',
          originalName: 'renamed',
          line: 3,
          typeOnly: false,
        }],
        importBindings: new Map([
          ['renamed', {
            localName: 'renamed',
            importedName: 'original',
            line: 2,
            typeOnly: false,
            specifier: './value.js',
            targetFile: 'src/value.ts',
          }],
        ]),
        namedReexports: [{
          exportedName: 'Example',
          originalName: 'Example',
          line: 1,
          typeOnly: true,
          specifier: './types.js',
          targetFile: 'src/types.ts',
        }],
        starReexports: [],
        namespaceReexports: [],
      }],
      ['src/barrel.ts', {
        exportedDeclarations: new Map(),
        localExportSpecifiers: [],
        importBindings: new Map(),
        namedReexports: [],
        starReexports: [{
          line: 1,
          typeOnly: false,
          specifier: './index.js',
          targetFile: 'src/index.ts',
        }],
        namespaceReexports: [],
      }],
      ['src/types.ts', {
        exportedDeclarations: new Map([
          ['Example', [{
            name: 'Example',
            line: 1,
            inherentlyTypeOnly: true,
          }]],
        ]),
        localExportSpecifiers: [],
        importBindings: new Map(),
        namedReexports: [],
        starReexports: [],
        namespaceReexports: [],
      }],
      ['src/value.ts', {
        exportedDeclarations: new Map([
          ['original', [{
            name: 'original',
            line: 1,
            inherentlyTypeOnly: false,
          }]],
        ]),
        localExportSpecifiers: [],
        importBindings: new Map(),
        namedReexports: [],
        starReexports: [],
        namespaceReexports: [],
      }],
    ]);

    const context = {
      getModuleInfo: (relPath: string) => modules.get(relPath) ?? emptyModuleInfo(),
      getSourceFile: (relPath: string) => files.get(relPath) ?? null,
      getExportedNamesForModule: (relPath: string) =>
        new Set([
          ...modules.get(relPath)?.exportedDeclarations.keys() ?? [],
          ...modules.get(relPath)?.localExportSpecifiers.map((item) => item.exportedName) ?? [],
          ...modules.get(relPath)?.namedReexports.map((item) => item.exportedName) ?? [],
        ]),
    };

    const localAliasTrace = traceModuleExport(context, 'src/index.ts', 'answer');
    expect(localAliasTrace).toMatchObject({
      originalName: 'original',
      typeOnly: false,
      namespaceExport: false,
    });
    expect(localAliasTrace?.chain.map((step) => step.kind)).toEqual([
      'local-export',
      'import-alias',
      'local-declaration',
    ]);

    const starReexportTrace = traceModuleExport(context, 'src/barrel.ts', 'Example');
    expect(starReexportTrace).toMatchObject({
      originalName: 'Example',
      typeOnly: true,
      namespaceExport: false,
    });
    expect(starReexportTrace?.chain.map((step) => step.kind)).toEqual([
      'star-reexport',
      'named-reexport',
      'local-declaration',
    ]);
  });
});

function emptyModuleInfo(): ExportModuleInfo {
  return {
    exportedDeclarations: new Map(),
    localExportSpecifiers: [],
    importBindings: new Map(),
    namedReexports: [],
    starReexports: [],
    namespaceReexports: [],
  };
}
