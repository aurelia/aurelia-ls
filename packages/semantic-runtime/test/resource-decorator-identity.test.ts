import path from 'node:path';
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createSemanticRuntime } from '../src/api/runtime.js';
import { NodeSemanticRuntimeProjectInputHost, SemanticRuntimeProjectInputAuthority } from '../src/kernel/project-input.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';

test('publishes resources and bindables from the value bound at each decorator', async () => {
  const root = path.resolve(import.meta.dirname, '../fixtures/pressure/template-completion-member-metadata');
  const overlay = new MutableProjectSourceOverlay();
  overlay.write(path.join(root, 'src/app.ts'), [
    "import {customElement as element, bindable as input, computed, observable, astTrack} from 'aurelia';",
    "import * as AU from 'aurelia';",
    "const key = 'caption' as const;",
    "declare function externalKey(): string | symbol;",
    "function customElement(_name: string) { return function () {}; }",
    "@element({name:'real-child',template:'<template></template>'}) class Real {",
    "  @input [key] = '';",
    "  @AU.bindable ['value'] = '';",
    "  @input [Symbol.for('blocked')] = '';",
    "  @input [externalKey()] = '';",
    "}",
    "@customElement('fake-child') class Lookalike {}",
    "function scoped(computed: any, observable: any, astTrack: any) {",
    "  class Shadow { @computed() x=0; @observable() y(){} @astTrack z=0; }",
    "}",
    "class Invalid { @computed() badField=0; @observable() badMethod(){} @astTrack badTrack=0; }",
    "class InvalidStatic { static $au = {type:'elementTypeName',name:'fake-static'}; }",
    "@element({name:'app',template:'<real-child></real-child>',dependencies:[Real,Lookalike,InvalidStatic]})",
    "export class App {}",
  ].join('\n'));
  const runtime = await createSemanticRuntime({
    workspaceRoot: root, storeKey: 'resource-decorator-identity',
    projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost(overlay)),
  });
  try {
    const app = await runtime.openApp();
    const defs = app.resourceDefinitions({size:100});
    expect(defs.page?.exhausted).toBe(true);
    const names = defs.value.rows.map(row => row.name);
    expect(names).toContain('real-child');
    expect(names).not.toContain('fake-child');
    expect(names).not.toContain('fake-static');
    const binding = defs.value.rows.find(row => row.name === 'real-child');
    expect(binding?.bindables.map(row => row.name).sort()).toEqual(['caption','value']);
    const issues = app.resourceIssues({size:100});
    const symbols = issues.value.rows.filter(row => row.frameworkErrorCode === 'AUR0227');
    expect(symbols).toHaveLength(1);
    const span = symbols[0]!.source!;
    expect(overlay.readFile(path.join(root,'src/app.ts'))!.slice(span.start!,span.end!)).toContain("Symbol.for('blocked')");
    const diagnostics = app.appDiagnostics({kind:'app-diagnostics',sourceFile:{filePath:'src/app.ts'},page:{size:100}});
    const invalid = diagnostics.value.rows.filter(row => ['AUR0117','AUR0224','AUR0228'].includes(row.frameworkErrorCode ?? ''));
    expect(invalid.map(row => row.frameworkErrorCode).sort()).toEqual(['AUR0117','AUR0224','AUR0228']);
    const realClass = overlay.readFile(path.join(root,'src/app.ts'))!.indexOf('class Invalid {');
    expect(invalid.every(row => row.source != null && row.source.start! > realClass)).toBe(true);
  } finally {
    runtime.retireWorkspaceIncarnation();
  }
});

test('an imported attribute pattern points to its literal in the producer module', async () => {
  const root = path.resolve(import.meta.dirname, '../fixtures/pressure/resource-registration-effective-definitions');
  const consumer = path.join(root, 'src/resources.ts');
  const producer = path.join(root, 'src/imported-target-card.ts');
  const input = readFileSync(producer, 'utf8') + "\nexport const rule = {pattern: 'PART.data', symbols: '.'};";
  const overlay = new MutableProjectSourceOverlay();
  overlay.write(producer, input);
  overlay.write(consumer, "import {rule} from './imported-target-card';\n" + readFileSync(consumer, 'utf8')
    .replace("@attributePattern({ pattern: 'PART.data', symbols: '.' })", '@attributePattern(rule)'));
  const runtime = await createSemanticRuntime({
    workspaceRoot: root,
    projectInputAuthority: new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost(overlay)),
  });
  try {
    const definitions = (await runtime.openApp()).resourceDefinitions({size:100});
    const declaration = definitions.value.rows.find(row => row.targetName === 'DataAttributePattern');
    const source = declaration?.patterns[0]?.source;
    expect(source).toMatchObject({path:'src/imported-target-card.ts', start:input.indexOf('PART.data')});
    expect(input.slice(source!.start!,source!.end!)).toBe('PART.data');
  } finally {
    runtime.retireWorkspaceIncarnation();
  }
});
