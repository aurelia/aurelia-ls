import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime, type SemanticApp, type SemanticRuntime } from '../src/api/runtime.js';
import { KernelPublicationDecisionKind } from '../src/kernel/publication.js';
import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
} from '../src/kernel/project-input.js';
import { CompiledTemplateContextRole } from '../src/template/compiled-template.js';
import { HydrateElementInstruction } from '../src/template/instruction-ir.js';
import { TemplateProductDetails } from '../src/template/product-details.js';
import type { TemplateResourceRuntimeAnalysisEmission } from '../src/template/template-compilation-project-pass.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';

describe('compiled-template family currentness', () => {
  test('retains the root and replaces only the stable child definition changed by nested compiler work', async () => {
    const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-compiler-fidelity');
    const mainFileName = path.join(fixtureRoot, 'src/main.ts');
    const originalText = readFileSync(mainFileName, 'utf8');
    const changedText = originalText.replace('static child', '${somevalue}');
    expect(changedText).not.toBe(originalText);
    expect(changedText).toHaveLength(originalText.length);

    const overlay = new MutableProjectSourceOverlay();
    const inputAuthority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:compiled-template-family-currentness',
      projectInputAuthority: inputAuthority,
    });

    const baseline = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const baselineResource = requireResource(baseline, 'static-context-probe');
    const baselineRoot = baselineResource.compilation.compiledTemplate.compiledTemplate;
    const baselineChild = requireGeneratedTemplate(baselineResource);
    expect(baselineChild.targets).toEqual([]);

    overlay.write(mainFileName, changedText);
    inputAuthority.advance();
    const changed = await runtime.openApp({
      projectKey: baseline.project.projectKey,
      analysisDepth: 'binding-observation',
    });
    const changedResource = requireResource(changed, 'static-context-probe');
    const changedRoot = changedResource.compilation.compiledTemplate.compiledTemplate;
    const changedChild = requireGeneratedTemplate(changedResource);
    expect(changedRoot.productHandle).toBe(baselineRoot.productHandle);
    expect(changedChild.productHandle).toBe(baselineChild.productHandle);
    expect(changedRoot.targets.map((target) => target.productHandle)).toEqual(
      baselineRoot.targets.map((target) => target.productHandle),
    );
    expect(changedChild.targets).toHaveLength(1);

    const transition = latestTransition(runtime, changed);
    expect(transition.publications).toContainEqual(expect.objectContaining({
      handle: baselineRoot.productHandle,
      detailKind: TemplateProductDetails.CompiledTemplate.detailKind,
      decision: KernelPublicationDecisionKind.Retain,
    }));
    expect(transition.publications).toContainEqual(expect.objectContaining({
      handle: baselineChild.productHandle,
      detailKind: TemplateProductDetails.CompiledTemplate.detailKind,
      decision: KernelPublicationDecisionKind.Replace,
    }));
  }, 30_000);

  test('keeps existing projection definition identities when an earlier slot group is inserted', async () => {
    const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/content-projection-topology');
    const templateFileName = path.join(fixtureRoot, 'src/content-projection-topology-app.html');
    const originalText = readFileSync(templateFileName, 'utf8');
    const changedText = originalText.replace(
      '  <projection-receiver>\n    <h2',
      '  <projection-receiver>\n    <small au-slot="inserted">new</small>\n    <h2',
    );
    expect(changedText).not.toBe(originalText);

    const overlay = new MutableProjectSourceOverlay();
    const inputAuthority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:projection-definition-identity',
      projectInputAuthority: inputAuthority,
    });
    const baseline = await runtime.openApp({ analysisDepth: 'runtime-topology' });
    const baselineInstruction = requireFirstProjectionReceiver(baseline);
    const baselineHandles = projectionHandlesBySlot(baselineInstruction);

    overlay.write(templateFileName, changedText);
    inputAuthority.advance();
    const changed = await runtime.openApp({
      projectKey: baseline.project.projectKey,
      analysisDepth: 'runtime-topology',
    });
    const changedInstruction = requireFirstProjectionReceiver(changed);
    const changedHandles = projectionHandlesBySlot(changedInstruction);
    expect(changedInstruction.productHandle).toBe(baselineInstruction.productHandle);
    for (const [slotName, productHandle] of baselineHandles) {
      expect(changedHandles.get(slotName)).toBe(productHandle);
    }
    expect(changedHandles.get('inserted')).toBeDefined();
    expect(new Set(changedHandles.values()).size).toBe(changedHandles.size);
    const canonicalInstruction = runtime.workspace.store.productDetails.read(
      TemplateProductDetails.Instruction,
      changedInstruction.productHandle,
    );
    expect(canonicalInstruction).toBe(changedInstruction);
    expect(canonicalInstruction instanceof HydrateElementInstruction
      ? projectionHandlesBySlot(canonicalInstruction)
      : null).toEqual(changedHandles);
  }, 30_000);
});

function requireResource(app: SemanticApp, name: string): TemplateResourceRuntimeAnalysisEmission {
  const resource = app.emission.templates.resources.find((candidate) =>
    candidate.compilation.definition.name === name
  );
  if (resource == null) throw new Error(`Expected template resource '${name}'.`);
  return resource;
}

function requireGeneratedTemplate(resource: TemplateResourceRuntimeAnalysisEmission) {
  const template = resource.compilation.compiledTemplate.compiledTemplates.find((candidate) =>
    candidate.context.role === CompiledTemplateContextRole.TemplateController
  );
  if (template == null) throw new Error('Expected one generated template-controller definition.');
  return template;
}

function requireFirstProjectionReceiver(app: SemanticApp): HydrateElementInstruction {
  const resource = requireResource(app, 'content-projection-topology-app');
  const instruction = resource.compilation.compiledTemplate.instructions.find(
    (candidate): candidate is HydrateElementInstruction =>
      candidate instanceof HydrateElementInstruction
        && candidate.elementName === 'projection-receiver'
        && candidate.projections.some((projection) => projection.slotName === 'heading'),
  );
  if (instruction == null) throw new Error('Expected the first projection-receiver instruction.');
  return instruction;
}

function projectionHandlesBySlot(instruction: HydrateElementInstruction): ReadonlyMap<string, string> {
  return new Map(instruction.projections.map((projection) => [
    projection.slotName,
    projection.compiledTemplate.productHandle,
  ]));
}

function latestTransition(runtime: SemanticRuntime, app: SemanticApp) {
  const generation = runtime.appAnalysisComputations.authorityFor(app.project.projectKey).current();
  const transition = generation == null
    ? null
    : runtime.computationLifecycle.readLatestTransition(generation.computationId);
  if (transition == null) throw new Error('Expected a committed app transition.');
  return transition;
}
