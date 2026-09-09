import path from 'node:path';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { evaluateStaticCallableCompletion, StaticCallableCompletionKind } from '../src/evaluation/function-execution.js';
import { EvaluationBoundaryKind, EvaluationBoundaryObjectValue, EvaluationValueKind } from '../src/evaluation/values.js';
import { NodeSemanticRuntimeProjectInputHost, SemanticRuntimeProjectInputAuthority } from '../src/kernel/project-input.js';
import { TemplateCompilerReadView, TemplateCompilerWorldAuthority } from '../src/template/compiler-read-view.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';

const fixtureRoot = path.resolve(import.meta.dirname, '../fixtures/pressure/app-pattern-convention-minimal-app');

describe('processContent callable authority', () => {
  test('supplies the effective source callable with its resource Type receiver and isolated effect contract', async () => {
    const overlay = new MutableProjectSourceOverlay();
    overlay.write(path.join(fixtureRoot, 'src/my-app.ts'), `
import { customElement, processContent } from '@aurelia/runtime-html';
function closedFalse() { return false; }
let calls = 0;
@customElement({ name: 'static-method', template: '' })
export class StaticMethod { static processContent() { return false; } }
@customElement({ name: 'static-property', template: '' })
export class StaticProperty { static processContent = closedFalse; }
@customElement({ name: 'local-static-method', template: '' })
class LocalStaticMethod { static processContent() { return false; } }
@customElement({ name: 'local-inline-hook', template: '', processContent: () => false })
class LocalInlineHook {}
@customElement({ name: 'undefined-fallback', template: '', processContent: undefined })
export class UndefinedFallback { static processContent() { return false; } }
@customElement({ name: 'inline-hook', template: '', processContent: closedFalse })
export class InlineHook {}
@customElement({ name: 'receiver-hook', template: '', processContent() { return this.keepChildren; } })
export class ReceiverHook { static keepChildren = false; }
@customElement({ name: 'name-hook', template: '' })
@processContent('stop')
export class NameHook { static stop() { return false; } }
@customElement({ name: 'member-hook', template: '' })
export class MemberHook { @processContent() static stop() { return false; } }
@customElement({ name: 'class-wins', template: '', processContent() { return true; } })
@processContent(closedFalse)
export class ClassWins { @processContent() static leave() { return true; } }
@customElement({ name: 'outer-decorator-wins', template: '' })
@processContent(closedFalse)
@processContent(() => true)
export class OuterDecoratorWins {}
class Base { static processContent() { return this.keepChildren; } }
@customElement({ name: 'inherited-hook', template: '' })
export class InheritedHook extends Base { static keepChildren = false; }
@customElement({ name: 'undefined-hook', template: '', processContent() {} })
export class UndefinedHook {}
@customElement({ name: 'null-hook', template: '', processContent() { return null; } })
export class NullHook {}
@customElement({ name: 'zero-hook', template: '', processContent() { return 0; } })
export class ZeroHook {}
@customElement({ name: 'stateful-hook', template: '', processContent() { calls++; return false; } })
export class StatefulHook {}
@customElement({ name: 'dom-write-hook', template: '', processContent(el) { el.textContent = 'changed'; return false; } })
export class DomWriteHook {}
@customElement({ name: 'opaque-read-hook', template: '', processContent(el) { return el.stop; } })
export class OpaqueReadHook {}
@customElement({ name: 'async-hook', template: '', async processContent() { return false; } })
export class AsyncHook {}
@customElement({ name: 'throw-hook', template: '', processContent() { throw 'stop'; } })
export class ThrowHook {}
@customElement({ name: 'my-app', template: '', dependencies: [
  StaticMethod, StaticProperty, LocalStaticMethod, LocalInlineHook, UndefinedFallback, InlineHook, ReceiverHook, NameHook, MemberHook, ClassWins, OuterDecoratorWins, InheritedHook,
  UndefinedHook, NullHook, ZeroHook, StatefulHook, DomWriteHook, OpaqueReadHook, AsyncHook, ThrowHook,
] })
export class MyApp {}
`);
    const inputAuthority = new SemanticRuntimeProjectInputAuthority(new NodeSemanticRuntimeProjectInputHost(overlay));
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      projectDiscovery: 'single-root',
      storeKey: 'process-content-callable-authority',
      projectInputAuthority: inputAuthority,
    });
    try {
      const app = await runtime.openApp({ analysisDepth: 'runtime-topology', telemetry: { inquiryProfile: 'aot' } });
      const root = app.emission.templates.resources.find(r => r.compilation.definition.name === 'my-app');
      if (root == null) throw new Error('Expected root app compilation.');
      let currentWorld = root.compilation.compilerWorld;
      const authority = new TemplateCompilerWorldAuthority('process-content-test', () => currentWorld);
      const reads = new TemplateCompilerReadView(runtime.workspace.store, authority);
      const argumentValues = ['element', 'platform', 'metadata'].map(name =>
        new EvaluationBoundaryObjectValue(EvaluationBoundaryKind.HostEnvironment, `processContent.${name}`)
      );
      // These snapshot calls test recognition and receiver wiring, not build-time authority. The reached-site executor
      // supplies owned DOM arguments and independently requires stable captured inputs.
      for (const name of [
        'static-method', 'static-property', 'local-static-method', 'local-inline-hook', 'undefined-fallback', 'inline-hook', 'receiver-hook', 'name-hook', 'member-hook',
        'class-wins', 'outer-decorator-wins', 'inherited-hook',
      ]) {
        const elementRead = reads.readElement(name);
        const definition = elementRead.value?.definition;
        if (definition?.type !== 'custom-element') throw new Error(`Expected ${name} definition.`);
        expect(definition.processContentSlot, name).not.toBeNull();
        expect(definition.processContent?.addressHandle, name).not.toBeNull();
        const target = currentWorld.callableBindings.target(definition.processContentSlot!);
        if (target == null) throw new Error(`Expected ${name} callable target.`);
        const completion = evaluateStaticCallableCompletion(target, argumentValues, null, { requireStableCapturedInputs: false });
        expect(completion.kind, name).toBe(StaticCallableCompletionKind.Normal);
        expect(completion.evaluation?.value, name).toMatchObject({ kind: EvaluationValueKind.Boolean, value: false });
        expect(elementRead.observation.validate().isCurrent, name).toBe(true);
        expect(reads.readElement(name).observation).toBe(elementRead.observation);
        if (name === 'receiver-hook' || name === 'inherited-hook') {
          const stable = evaluateStaticCallableCompletion(target, argumentValues, null, { requireStableCapturedInputs: true });
          expect(stable.kind, name).toBe(StaticCallableCompletionKind.Open);
          expect(stable.evaluation?.auditOpenSeams.some(seam => /captured/i.test(seam.summary)), name).toBe(true);
        }
      }
      for (const [name, kind, value] of [
        ['undefined-hook', 'normal', { kind: EvaluationValueKind.Undefined }],
        ['null-hook', 'normal', { kind: EvaluationValueKind.Null }],
        ['zero-hook', 'normal', { kind: EvaluationValueKind.Number, value: 0 }],
        ['stateful-hook', 'open', null], ['dom-write-hook', 'open', null], ['opaque-read-hook', 'open', null],
        ['async-hook', 'open', null], ['throw-hook', 'abrupt', null],
      ] as const) {
        const definition = reads.readElement(name).value?.definition;
        if (definition?.type !== 'custom-element') throw new Error(`Expected ${name} definition.`);
        const target = definition.processContentSlot == null ? null : currentWorld.callableBindings.target(definition.processContentSlot);
        if (target == null) throw new Error(`Expected ${name} callable target.`);
        const completion = evaluateStaticCallableCompletion(target, argumentValues, null, { requireStableCapturedInputs: false });
        expect(completion.kind, name).toBe(kind);
        if (value != null) expect(completion.evaluation?.value, name).toMatchObject(value);
      }
      const module = app.emission.evaluation.sources.find(source => source.moduleKey === 'src/my-app.ts');
      expect(module?.evaluation?.environment.readBinding('calls')?.value).toMatchObject({ kind: 'number', value: 0 });

      const before = reads.readElement('receiver-hook');
      const receiver = before.value?.definition;
      if (receiver?.type !== 'custom-element') throw new Error('Expected receiver hook.');
      const fileName = path.join(fixtureRoot, 'src/my-app.ts');
      overlay.write(fileName, overlay.readFile(fileName)!.replace('static keepChildren = false;', 'static keepChildren = true;'));
      inputAuthority.advance();
      const changed = await runtime.openApp({ analysisDepth: 'runtime-topology', telemetry: { inquiryProfile: 'aot' } });
      const changedRoot = changed.emission.templates.resources.find(r => r.compilation.definition.name === 'my-app');
      if (changedRoot == null) throw new Error('Expected changed root compilation.');
      currentWorld = changedRoot.compilation.compilerWorld;
      expect(before.observation.validate().isCurrent).toBe(false);
      const changedReads = new TemplateCompilerReadView(runtime.workspace.store, authority);
      const changedReceiverRead = changedReads.readElement('receiver-hook');
      const changedReceiver = changedReceiverRead.value?.definition;
      if (changedReceiver?.type !== 'custom-element') throw new Error('Expected changed receiver hook.');
      const changedTarget = changedReceiver.processContentSlot == null
        ? null : currentWorld.callableBindings.target(changedReceiver.processContentSlot);
      if (changedTarget == null) throw new Error('Expected changed receiver callable target.');
      const changedCompletion = evaluateStaticCallableCompletion(changedTarget, argumentValues, null, { requireStableCapturedInputs: false });
      expect(changedCompletion.kind).toBe(StaticCallableCompletionKind.Normal);
      expect(changedCompletion.evaluation?.value).toMatchObject({ kind: EvaluationValueKind.Boolean, value: true });
      expect(changedReceiverRead.observation.validate().isCurrent).toBe(true);
    } finally {
      runtime.retireWorkspaceIncarnation();
    }
  }, 30_000);
});
