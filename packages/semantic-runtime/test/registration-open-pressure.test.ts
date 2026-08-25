import { describe, expect, test } from 'vitest';

import { ConfigurationOpenSeamScope } from '../src/configuration/configuration-kernel-emitter.js';
import type { DiContainerChainFacts } from '../src/di/container-chain.js';
import {
  registrationHidingOpenSeamsForContainer,
  registrationOpenPressureFacts,
} from '../src/di/registration-open-pressure.js';
import {
  DiRegistrationOpenSeamScope,
  type DiWorldConstructionEmission,
} from '../src/di/world-construction.js';
import type {
  IdentityHandle,
  OpenSeamHandle,
} from '../src/kernel/handles.js';
import {
  OpenSeam,
  OpenSeamReasonKind,
} from '../src/kernel/open-seam.js';
import { KernelVocabulary } from '../src/kernel/vocabulary.js';

describe('registration open pressure', () => {
  test('retains a known receiving container when admission materialization has no operation', () => {
    const app = identity('app');
    const sibling = identity('sibling');
    const seam = registrationSeam('missing-admission');
    const world = worldWithScopes([
      new DiRegistrationOpenSeamScope(seam, null, app),
    ]);

    expect(registrationOpenPressureFacts(world, [])).toMatchObject([{
      seam,
      operation: null,
      containerIdentityHandles: [app],
    }]);
    expect(selectForContainer(world, [], app)).toEqual([seam]);
    expect(selectForContainer(world, [], sibling)).toEqual([]);
  });

  test('keeps finite configuration pressure on every candidate container but not a sibling', () => {
    const first = identity('first');
    const second = identity('second');
    const sibling = identity('sibling');
    const seam = registrationSeam('multi-container');
    const scopes = [new ConfigurationOpenSeamScope(seam, [first, second])];
    const world = worldWithScopes([]);

    expect(registrationOpenPressureFacts(world, scopes)).toMatchObject([{
      seam,
      operation: null,
      containerIdentityHandles: [first, second],
    }]);
    expect(selectForContainer(world, scopes, first)).toEqual([seam]);
    expect(selectForContainer(world, scopes, second)).toEqual([seam]);
    expect(selectForContainer(world, scopes, sibling)).toEqual([]);
  });
});

function selectForContainer(
  world: DiWorldConstructionEmission,
  scopes: readonly ConfigurationOpenSeamScope[],
  container: IdentityHandle,
): readonly OpenSeam[] {
  const chainFacts = {
    containerChainIdentityHandles: (identityHandle: IdentityHandle) => [identityHandle],
  } as unknown as DiContainerChainFacts;
  return registrationHidingOpenSeamsForContainer(
    world,
    scopes,
    chainFacts,
    container,
    () => true,
  );
}

function worldWithScopes(
  scopes: readonly DiRegistrationOpenSeamScope[],
): DiWorldConstructionEmission {
  return { registrationOpenSeamScopes: scopes } as DiWorldConstructionEmission;
}

function registrationSeam(local: string): OpenSeam {
  return new OpenSeam(
    `open:${local}` as OpenSeamHandle,
    KernelVocabulary.Di.OpenRegistrationSpending.key,
    `Open registration pressure for ${local}.`,
    null,
    null,
    [OpenSeamReasonKind.DiRegistrationAdmissionOpen],
  );
}

function identity(local: string): IdentityHandle {
  return `identity:${local}` as IdentityHandle;
}
