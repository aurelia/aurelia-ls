import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { KernelPublicationSurface } from '../src/kernel/publication-surface.js';
import { readFieldProvenance } from '../src/kernel/provenance.js';
import { KernelStore } from '../src/kernel/store.js';
import {
  RouterProductDetails,
} from '../src/router/product-details.js';
import {
  ViewportFieldStateKind,
  type ViewportCustomElementModel,
  type ViewportValueField,
} from '../src/router/model.js';
import {
  HtmlAttributeReference,
  HtmlIrNodeKind,
  HtmlNodeReference,
} from '../src/template/html-ir.js';
import {
  InterpolationInstruction,
  SetPropertyInstruction,
} from '../src/template/instruction-ir.js';
import {
  TemplateInstructionAuthoredValueSourceClosure,
  templateInstructionAuthoredValueSource,
} from '../src/template/instruction-authored-value-source.js';
import { TemplateProductDetails } from '../src/template/product-details.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

describe('viewport authored provenance', () => {
  test('retains exact static, bound, and open viewport value lineage', async () => {
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/router-routecontext-topology-lab');
    const templateText = await readFile(
      path.join(fixtureRoot, 'src/router-routecontext-topology-app.html'),
      'utf8',
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'viewport-authored-provenance',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const viewports = app.emission.routeRuntimeTopology.readViewports();
    const main = viewports.find((viewport) => viewport.name === 'main');
    const bound = viewports.find((viewport) => viewport.name === 'bound');
    const dynamic = viewports.find((viewport) =>
      viewport.name == null
      && requiredFieldState(viewport, 'name').stateKind === ViewportFieldStateKind.Open
    );

    expect(main).toBeDefined();
    expect(bound).toBeDefined();
    expect(dynamic).toBeDefined();
    if (main == null || bound == null || dynamic == null) {
      throw new Error('Expected static, bound, and open viewport products.');
    }

    expectViewportFieldWitness(runtime.workspace.store, templateText, main, 'name', 'main');
    expectViewportFieldWitness(runtime.workspace.store, templateText, bound, 'name', 'boundViewportName');
    expectViewportFieldWitness(runtime.workspace.store, templateText, bound, 'usedBy', 'boundUsedBy');
    expectViewportFieldWitness(runtime.workspace.store, templateText, bound, 'default', 'boundDefault');
    expectViewportFieldWitness(runtime.workspace.store, templateText, bound, 'fallback', 'boundFallback');
    expectViewportFieldWitness(
      runtime.workspace.store,
      templateText,
      dynamic,
      'name',
      'dynamicViewportName',
    );

    expect(requiredFieldState(dynamic, 'name').stateKind).toBe(ViewportFieldStateKind.Open);
  }, 60_000);

  test('keeps missing instruction-to-attribute lineage honest', () => {
    const store = new KernelStore('viewport-missing-authored-provenance');
    const handles = store.handles;
    const attributeCarrier = handles.address('attribute-carrier');
    const instruction = new SetPropertyInstruction(
      handles.product('instruction'),
      handles.identity('instruction'),
      new HtmlNodeReference(
        HtmlIrNodeKind.Element,
        handles.identity('node'),
        handles.product('node'),
        handles.address('node'),
      ),
      new HtmlAttributeReference(
        handles.product('missing-attribute-detail'),
        attributeCarrier,
        'name',
      ),
      'name',
      'main',
      handles.address('instruction'),
      [],
    );
    const carrier = templateInstructionAuthoredValueSource(store, instruction);

    expect(carrier.closure).toBe(TemplateInstructionAuthoredValueSourceClosure.Carrier);
    expect(carrier.instructionProductHandle).toBe(instruction.productHandle);
    expect(carrier.attributeProductHandle).toBeNull();
    expect(carrier.sourceAddressHandle).toBe(attributeCarrier);
    expect(carrier.provenanceHandle).toBeNull();

    const unavailableInstruction = new InterpolationInstruction(
      handles.product('unavailable-instruction'),
      handles.identity('unavailable-instruction'),
      instruction.node,
      null,
      'name',
      [],
      null,
      [],
    );
    const unavailable = templateInstructionAuthoredValueSource(store, unavailableInstruction);
    expect(unavailable.closure).toBe(TemplateInstructionAuthoredValueSourceClosure.Unavailable);
    expect(unavailable.attributeProductHandle).toBeNull();
    expect(unavailable.sourceAddressHandle).toBeNull();
    expect(unavailable.provenanceHandle).toBeNull();
  });
});

function expectViewportFieldWitness(
  store: KernelStore,
  templateText: string,
  viewport: ViewportCustomElementModel,
  field: ViewportValueField,
  expectedText: string,
): void {
  expect(store.productDetails.read(RouterProductDetails.Viewport, viewport.productHandle)).toBe(viewport);
  const state = requiredFieldState(viewport, field);
  expect(state.sourceInstructionProductHandle).not.toBeNull();
  expect(state.sourceAttributeProductHandle).not.toBeNull();
  expect(state.sourceAddressHandle).not.toBeNull();
  expect(state.sourceProvenanceHandle).not.toBeNull();
  expect(readFieldProvenance(viewport.fieldProvenance, field)).toBe(state.sourceProvenanceHandle);

  const address = state.sourceAddressHandle == null ? null : store.readAddress(state.sourceAddressHandle);
  expect(address?.kind).toBe('source-span-address');
  if (address?.kind !== 'source-span-address') {
    throw new Error(`Expected ${field} to retain a source-span address.`);
  }
  expect(templateText.slice(address.start, address.end)).toBe(expectedText);

  const instruction = state.sourceInstructionProductHandle == null
    ? null
    : store.productDetails.read(
        TemplateProductDetails.Instruction,
        state.sourceInstructionProductHandle,
      );
  const attribute = state.sourceAttributeProductHandle == null
    ? null
    : store.productDetails.read(
        TemplateProductDetails.HtmlAttribute,
        state.sourceAttributeProductHandle,
      );
  expect(instruction).not.toBeNull();
  expect(attribute).not.toBeNull();
  expect(attribute?.valueAddressHandle).toBe(state.sourceAddressHandle);
  expect(readFieldProvenance(attribute?.fieldProvenance ?? [], 'value'))
    .toBe(state.sourceProvenanceHandle);

  const provenance = state.sourceProvenanceHandle == null
    ? null
    : store.read(state.sourceProvenanceHandle);
  expect(provenance?.kind).toBe('provenance-record');
  if (provenance?.kind !== 'provenance-record') {
    throw new Error(`Expected ${field} to retain a provenance record.`);
  }
  expect(provenance.evidenceHandles).toHaveLength(1);
  const evidence = store.read(provenance.evidenceHandles[0]!);
  expect(evidence?.kind).toBe('evidence-record');
  if (evidence?.kind !== 'evidence-record') {
    throw new Error(`Expected ${field} provenance to retain direct evidence.`);
  }
  expect(evidence.addressHandle).toBe(state.sourceAddressHandle);

  const references = RouterProductDetails.Viewport.referencesFor(viewport);
  for (const handle of [
    state.sourceInstructionProductHandle,
    state.sourceAttributeProductHandle,
  ]) {
    expect(references.some((reference) =>
      reference.surface === KernelPublicationSurface.ProductDetail
      && reference.handle === handle
    )).toBe(true);
  }
  expect(references.some((reference) =>
    reference.surface === KernelPublicationSurface.Record
    && reference.handle === state.sourceProvenanceHandle
  )).toBe(true);
}

function requiredFieldState(
  viewport: ViewportCustomElementModel,
  field: ViewportValueField,
) {
  const state = viewport.fieldStates.find((candidate) => candidate.field === field);
  if (state == null) {
    throw new Error(`Viewport ${viewport.identityHandle} is missing ${field} field state.`);
  }
  return state;
}
