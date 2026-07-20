import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { createSemanticRuntime } from '../src/api/runtime.js';
import type { OpenSeam } from '../src/kernel/open-seam.js';
import type { KernelStore } from '../src/kernel/store.js';
import { KernelVocabulary } from '../src/kernel/vocabulary.js';

const pressureFixtures = fileURLToPath(new URL('../fixtures/pressure', import.meta.url));

describe('open seam materialization ownership', () => {
  test('distinguishes failed product attempts from raw evaluator evidence', async () => {
    const serviceRoots = await analyzeFixture('service-root-v2-edges');
    const serviceRootSeams = seamsOfKind(
      serviceRoots,
      KernelVocabulary.Framework.OpenServiceRootCandidate.key,
    );
    expect(serviceRootSeams.length).toBeGreaterThan(0);
    for (const seam of serviceRootSeams) {
      const [materialization] = materializationsForSeam(serviceRoots, seam);
      expect(materialization).toBeDefined();
      expect(materialization?.productHandles).toEqual([]);
      expect(recordForHandle(serviceRoots, materialization!.ownerHandle)).toMatchObject({
        kind: 'source-span-address',
      });
    }

    const convention = await analyzeFixture('resource-conventions-dynamic');
    const [conventionSeam] = seamsOfKind(
      convention,
      KernelVocabulary.Resource.OpenConventionTransformAdmission.key,
    );
    expect(conventionSeam).toBeDefined();
    const [conventionMaterialization] = materializationsForSeam(convention, conventionSeam!);
    expect(conventionMaterialization?.productHandles).toEqual([]);
    expect(recordForHandle(convention, conventionMaterialization!.ownerHandle)).toMatchObject({
      kind: 'source-span-address',
    });

    const di = await analyzeFixture('di-open-registration-container');
    const targetlessDiSeams = seamsOfKind(di, KernelVocabulary.Di.OpenRegistrationSpending.key)
      .filter((seam) => seam.summary.includes('receiving container'));
    expect(targetlessDiSeams.length).toBeGreaterThan(0);
    for (const seam of targetlessDiSeams) {
      const [materialization] = materializationsForSeam(di, seam);
      expect(materialization?.productHandles).toEqual([]);
      expect(recordForHandle(di, materialization!.ownerHandle)).toMatchObject({
        kind: 'configuration-identity',
        productKindKey: KernelVocabulary.Configuration.Step.key,
      });
    }

    const binding = await analyzeFixture('template-native-target-precedence');
    const [targetAccessSeam] = seamsOfKind(binding, KernelVocabulary.Binding.OpenTargetAccess.key);
    expect(targetAccessSeam).toBeDefined();
    const [targetAccessMaterialization] = materializationsForSeam(binding, targetAccessSeam!);
    expect(targetAccessMaterialization).toBeDefined();
    expect(targetAccessMaterialization?.productHandles.map((handle) =>
      binding.readProduct(handle)?.productKindKey
    )).toContain(KernelVocabulary.Binding.TargetAccess.key);

    const rendering = await analyzeFixture('di-custom-template-compiler');
    const missingRendererSeams = seamsOfKind(rendering, KernelVocabulary.Instruction.OpenInstruction.key)
      .filter((seam) => seam.summary.includes('No configured runtime renderer'));
    expect(missingRendererSeams.length).toBeGreaterThan(0);
    for (const seam of missingRendererSeams) {
      const [materialization] = materializationsForSeam(rendering, seam);
      expect(materialization?.productHandles).toEqual([]);
      expect(recordForHandle(rendering, materialization!.ownerHandle)).toMatchObject({
        kind: 'instruction-identity',
        instructionKindKey: KernelVocabulary.Instruction.TextBinding.key,
      });
    }

    const evaluator = await analyzeFixture('evaluation-open-seam-sites');
    const evaluatorSeams = seamsOfKind(evaluator, KernelVocabulary.Evaluation.UnresolvedIdentifier.key);
    expect(evaluatorSeams.length).toBeGreaterThan(0);
    for (const seam of evaluatorSeams) {
      expect(materializationsForSeam(evaluator, seam)).toEqual([]);
    }
  });
});

async function analyzeFixture(fixtureName: string): Promise<KernelStore> {
  const runtime = await createSemanticRuntime({
    workspaceRoot: path.join(pressureFixtures, fixtureName),
    storeKey: `test:open-seam-materialization:${fixtureName}`,
  });
  await runtime.openApp({ analysisDepth: 'binding-observation' });
  return runtime.workspace.store;
}

function seamsOfKind(
  store: KernelStore,
  seamKindKey: OpenSeam['seamKindKey'],
): readonly OpenSeam[] {
  return store.readOpenSeams().filter((seam) => seam.seamKindKey === seamKindKey);
}

function materializationsForSeam(store: KernelStore, seam: OpenSeam) {
  return store.readMaterializations().filter((materialization) =>
    materialization.openSeamHandles.includes(seam.handle)
  );
}

function recordForHandle(store: KernelStore, handle: string) {
  return store.readAllRecords().find((record) => record.handle === handle) ?? null;
}
