import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test, vi } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import { aureliaAppProjectEvaluationProfile } from '../src/configuration/aurelia-project-evaluation.js';
import {
  ComputationCommitState,
  ComputationReadValidationScope,
} from '../src/kernel/computation-lifecycle.js';
import { TypeScriptDeclarationIdentity } from '../src/kernel/identity.js';
import { KernelPublicationDecisionKind } from '../src/kernel/publication.js';
import { KernelStore } from '../src/kernel/store.js';
import {
  CustomElementCaptureDefinition,
  CustomElementCaptureKind,
  CustomElementDefinition,
} from '../src/resources/custom-element-definition.js';
import { ResourceProductDetails } from '../src/resources/product-details.js';
import { resourceConventionToolingEvaluationProfile } from '../src/resources/resource-convention-transform-admission.js';
import { ResourceRecognitionProjectPass } from '../src/resources/resource-recognition-project-pass.js';
import { ResourceTargetReference } from '../src/resources/resource-reference.js';
import { CheckerTypeProjector } from '../src/type-system/checker-projector.js';
import { TypeSystemProjectBuilder } from '../src/type-system/project.js';

describe('resource recognition publication', () => {
  test('stages a complete resource project closure and retains equal committed definitions', async () => {
    const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/app-pattern-routed-catalog-storefront');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:resource-recognition-publication',
    });
    const project = runtime.workspace.projects[0];
    if (project == null) {
      throw new Error('Expected the fixture to boot one project.');
    }
    const store = runtime.workspace.store;
    const validationScope = new ComputationReadValidationScope();
    const evaluation = runtime.projectEvaluations.acquire(
      project,
      aureliaAppProjectEvaluationProfile,
      validationScope,
    ).readBaseline();
    const conventionToolingEvaluation = runtime.projectEvaluations.acquire(
      project,
      resourceConventionToolingEvaluationProfile,
      validationScope,
    );
    const typeSystem = new TypeSystemProjectBuilder(runtime.frameworkSupport).build(project, evaluation);
    const locus = {
      kind: 'resource-recognition-project-test',
      reconciliationKey: project.projectKey,
      summary: `resource recognition for ${project.projectKey}`,
    };

    const checkerProjectionSpy = vi.spyOn(CheckerTypeProjector.prototype, 'ensureProjection');
    const firstRun = runtime.computationLifecycle.begin(locus);
    const first = new ResourceRecognitionProjectPass().recognizeAndEmit(
      store,
      project,
      evaluation,
      conventionToolingEvaluation,
      typeSystem,
      firstRun,
    );
    const evaluatorTargetNode = first.readObservations()
      .map((observation) => observation.definition?.target?.node ?? null)
      .find((node) => node != null) ?? null;
    if (evaluatorTargetNode == null) {
      throw new Error('Expected an evaluator-owned resource target node.');
    }
    const programTargetNode = typeSystem.readProgramNode(evaluatorTargetNode);
    if (programTargetNode == null) {
      throw new Error('Expected the resource target Program node.');
    }
    const checkerUsedProgramTarget = checkerProjectionSpy.mock.calls.some(([input]) =>
      input.sourceNode === programTargetNode
    );
    const checkerUsedEvaluatorTarget = checkerProjectionSpy.mock.calls.some(([input]) =>
      input.sourceNode === evaluatorTargetNode
    );
    checkerProjectionSpy.mockRestore();
    expect(programTargetNode).not.toBe(evaluatorTargetNode);
    expect(checkerUsedProgramTarget).toBe(true);
    expect(checkerUsedEvaluatorTarget).toBe(false);
    const firstDefinition = first.readDefinitions()[0];
    expect(firstDefinition).toBeDefined();
    if (firstDefinition?.productHandle == null) {
      throw new Error('Expected a converged resource definition product.');
    }
    expect(store.read(firstDefinition.productHandle)).toBeNull();
    expect(store.productDetails.read(ResourceProductDetails.Definition, firstDefinition.productHandle)).toBeNull();
    expect(firstRun.read(firstDefinition.productHandle)).not.toBeNull();
    expect(firstRun.readProductDetail(ResourceProductDetails.Definition, firstDefinition.productHandle)).toBe(firstDefinition);
    expect(firstRun.commit().state).toBe(ComputationCommitState.Committed);
    expect(store.productDetails.read(ResourceProductDetails.Definition, firstDefinition.productHandle)).toBe(firstDefinition);

    const secondRun = runtime.computationLifecycle.begin(locus);
    const second = new ResourceRecognitionProjectPass().recognizeAndEmit(
      store,
      project,
      evaluation,
      conventionToolingEvaluation,
      typeSystem,
      secondRun,
    );
    const replacement = second.readDefinitions().find((definition) =>
      definition.productHandle === firstDefinition.productHandle
    );
    expect(replacement).toBeDefined();
    expect(replacement).not.toBe(firstDefinition);
    expect(secondRun.readProductDetail(ResourceProductDetails.Definition, firstDefinition.productHandle)).toBe(replacement);
    const secondCommit = secondRun.commit();
    expect(secondCommit.state).toBe(ComputationCommitState.Committed);
    expect(secondCommit.transition.publications).toContainEqual(expect.objectContaining({
      handle: firstDefinition.productHandle,
      decision: KernelPublicationDecisionKind.Retain,
    }));
    expect(store.productDetails.read(ResourceProductDetails.Definition, firstDefinition.productHandle)).toBe(firstDefinition);
  }, 30_000);

  test('converges carrier variants through canonical declaration identity and retains superseded evidence', async () => {
    const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
    const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/resource-registration-effective-definitions');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:resource-effective-definition-identity',
    });
    const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
    const resources = app.emission.resources;
    const candidates = resources.sources.flatMap((source) => source.convergence.definitions);

    const assertSelection = (
      targetName: string,
      effectiveName: string,
      supersededName: string,
    ): void => {
      const targetCandidates = candidates.filter((definition) =>
        definition.target.localName === targetName
      );
      expect(targetCandidates).toHaveLength(2);
      const targetIdentities = new Set(targetCandidates.map((definition) => definition.target.identityHandle));
      expect(targetIdentities.size).toBe(1);
      const targetIdentity = targetCandidates[0]?.target.identityHandle ?? null;
      expect(targetIdentity).not.toBeNull();
      expect(targetIdentity == null ? null : runtime.workspace.store.read(targetIdentity))
        .toBeInstanceOf(TypeScriptDeclarationIdentity);

      const selection = resources.definitionSelections.find((candidate) =>
        candidate.definition.target.localName === targetName
      );
      expect(selection == null || !('name' in selection.definition) ? null : selection.definition.name)
        .toBe(effectiveName);
      expect(selection?.supersededDefinitions.map((definition) =>
        'name' in definition ? definition.name : null
      )).toEqual([supersededName]);
    };

    assertSelection('DecoratorOverStatic', 'decorator-effective', 'static-shadowed');
    assertSelection('DefineOverDecorator', 'define-effective', 'decorator-shadowed');
    expect(resources.readSupersededDefinitions()).toHaveLength(6);
    expect(resources.readDefinitions().some((definition) =>
      'name' in definition && definition.name === 'anonymous-card'
    )).toBe(true);
  }, 30_000);

  test('distinguishes semantic resource links from witness-only source links', () => {
    const store = new KernelStore('resource-definition-reference-authority');
    const productHandle = store.handles.product('resource-definition-reference-authority:product');
    const definitionIdentityHandle = store.handles.identity('resource-definition-reference-authority:definition');
    const targetIdentityHandle = store.handles.identity('resource-definition-reference-authority:target');
    const otherTargetIdentityHandle = store.handles.identity('resource-definition-reference-authority:other-target');
    const definitionAddressHandle = store.handles.address('resource-definition-reference-authority:definition');
    const targetAddressHandle = store.handles.address('resource-definition-reference-authority:target');
    const initialNameAddressHandle = store.handles.address('resource-definition-reference-authority:name:first');
    const movedNameAddressHandle = store.handles.address('resource-definition-reference-authority:name:moved');
    const definition = (
      targetIdentity = targetIdentityHandle,
      nameSourceAddressHandle = initialNameAddressHandle,
    ): CustomElementDefinition => new CustomElementDefinition(
      productHandle,
      definitionIdentityHandle,
      definitionAddressHandle,
      new ResourceTargetReference(targetIdentity, targetAddressHandle, 'ReferenceAuthority'),
      'reference-authority',
      [],
      'au:resource:custom-element:reference-authority',
      new CustomElementCaptureDefinition(CustomElementCaptureKind.None),
      null,
      [],
      [],
      null,
      false,
      [],
      [],
      false,
      null,
      false,
      false,
      [],
      null,
      null,
      [],
      [],
      nameSourceAddressHandle,
    );
    const initial = definition();
    const movedWitness = definition(targetIdentityHandle, movedNameAddressHandle);
    const changedTarget = definition(otherTargetIdentityHandle);
    const retainRecords = { compareRecordHandles: () => KernelPublicationDecisionKind.Retain } as const;

    expect(ResourceProductDetails.Definition.referencesFor(initial)).not.toEqual(
      ResourceProductDetails.Definition.referencesFor(movedWitness),
    );
    expect(ResourceProductDetails.Definition.compare(initial, movedWitness, retainRecords)).toBe(
      KernelPublicationDecisionKind.RefreshWitness,
    );
    expect(ResourceProductDetails.Definition.compare(initial, changedTarget, retainRecords)).toBe(
      KernelPublicationDecisionKind.Replace,
    );
    expect(ResourceProductDetails.Definition.compare(initial, definition(), {
      compareRecordHandles: (previous) => previous === definitionAddressHandle
        ? KernelPublicationDecisionKind.RefreshWitness
        : KernelPublicationDecisionKind.Retain,
    })).toBe(KernelPublicationDecisionKind.RefreshWitness);
    expect(ResourceProductDetails.Definition.compare(initial, definition(), {
      compareRecordHandles: (previous) => previous === targetIdentityHandle
        ? KernelPublicationDecisionKind.RefreshWitness
        : KernelPublicationDecisionKind.Retain,
    })).toBe(KernelPublicationDecisionKind.RefreshWitness);
    expect(ResourceProductDetails.Definition.compare(initial, definition(), {
      compareRecordHandles: (previous) => previous === targetIdentityHandle
        ? KernelPublicationDecisionKind.Replace
        : KernelPublicationDecisionKind.Retain,
    })).toBe(KernelPublicationDecisionKind.Replace);
  });
});
