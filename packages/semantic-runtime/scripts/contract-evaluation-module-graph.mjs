import ts from 'typescript';
import {
  EvaluationExportKind,
  EvaluationImportKind,
  readEvaluationModuleRecord,
} from '../out/evaluation/module-graph.js';

const source = `
import type DefaultType, { Foo, type RenamedType as LocalRenamedType } from './types';
import { RuntimeThing, type RuntimeThingShape } from './runtime';
import * as RuntimeNamespace from './runtime-namespace';
import './side-effect';

export type { Foo } from './types';
export type * from './type-barrel';
export { RuntimeThing, type RuntimeThingShape } from './runtime';
export interface ExportedInterface { value: string; }
export type ExportedAlias = { value: string };
export enum ExportedEnum { One = 1 }
export class ExportedClass {}
const localValue = 1;
export { localValue };
`;

const sourceFile = ts.createSourceFile(
  '/virtual/module-graph-type-only.ts',
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);
const record = readEvaluationModuleRecord(sourceFile, '/virtual/module-graph-type-only.ts');

const imports = record.imports.map((entry) => ({
  importKind: entry.importKind,
  moduleSpecifier: entry.moduleSpecifier,
  localName: entry.localName,
  exportName: entry.exportName,
}));
const exports = record.exports.map((entry) => ({
  exportKind: entry.exportKind,
  exportName: entry.exportName,
  localName: entry.localName,
  moduleSpecifier: entry.moduleSpecifier,
}));

const failures = [
  imports.some((entry) =>
    entry.importKind === EvaluationImportKind.Named
    && entry.moduleSpecifier === './runtime'
    && entry.localName === 'RuntimeThing'
    && entry.exportName === 'RuntimeThing'
  )
    ? null
    : 'Expected value named import RuntimeThing from ./runtime.',
  imports.some((entry) =>
    entry.importKind === EvaluationImportKind.Namespace
    && entry.moduleSpecifier === './runtime-namespace'
    && entry.localName === 'RuntimeNamespace'
  )
    ? null
    : 'Expected namespace import RuntimeNamespace from ./runtime-namespace.',
  imports.some((entry) =>
    entry.importKind === EvaluationImportKind.SideEffect
    && entry.moduleSpecifier === './side-effect'
  )
    ? null
    : 'Expected side-effect import edge for ./side-effect.',
  imports.some((entry) => entry.moduleSpecifier === './types')
    ? 'Type-only import clause from ./types should not create runtime import entries.'
    : null,
  imports.some((entry) => entry.localName === 'RuntimeThingShape')
    ? 'Type-only named import specifier RuntimeThingShape should not create a runtime import entry.'
    : null,
  exports.some((entry) =>
    entry.exportKind === EvaluationExportKind.ReExport
    && entry.moduleSpecifier === './runtime'
    && entry.exportName === 'RuntimeThing'
  )
    ? null
    : 'Expected value re-export RuntimeThing from ./runtime.',
  exports.some((entry) => entry.moduleSpecifier === './types' || entry.moduleSpecifier === './type-barrel')
    ? 'Type-only export declarations should not create runtime export entries.'
    : null,
  exports.some((entry) => entry.exportName === 'RuntimeThingShape')
    ? 'Type-only export specifier RuntimeThingShape should not create a runtime export entry.'
    : null,
  exports.some((entry) =>
    entry.exportKind === EvaluationExportKind.Local
    && entry.exportName === 'ExportedEnum'
    && entry.localName === 'ExportedEnum'
  )
    ? null
    : 'Expected exported enum to remain a runtime local export.',
  exports.some((entry) =>
    entry.exportKind === EvaluationExportKind.Local
    && entry.exportName === 'ExportedClass'
    && entry.localName === 'ExportedClass'
  )
    ? null
    : 'Expected exported class to remain a runtime local export.',
  exports.some((entry) =>
    entry.exportKind === EvaluationExportKind.Local
    && entry.exportName === 'localValue'
    && entry.localName === 'localValue'
  )
    ? null
    : 'Expected value-only local export list entry localValue.',
  exports.some((entry) => entry.exportName === 'ExportedInterface' || entry.exportName === 'ExportedAlias')
    ? 'Interface and type-alias declarations should not create runtime local export entries.'
    : null,
].filter(Boolean);

const summary = { imports, exports };
if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}
