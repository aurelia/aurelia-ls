import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import {
  createSemanticRuntime,
  type SemanticApp,
  type SemanticRuntime,
} from '../src/api/runtime.js';
import { aureliaContainerEvaluationForValue } from '../src/configuration/aurelia-evaluation-runtime.js';
import { ConfigurationOpenSeamScope } from '../src/configuration/configuration-kernel-emitter.js';
import { Container } from '../src/di/container.js';
import {
  ContainerLookupKey,
  ContainerLookupKeyKind,
  containerLookupKeyForRegistrationKey,
} from '../src/di/container-key.js';
import { ContainerResolverSlot } from '../src/di/container-slot.js';
import {
  activateDirectKeyAllResources,
  DiAllResourcesRegistrationPressureLane,
  type DiDirectKeyAllResourcesActivation,
} from '../src/di/provider-membership.js';
import {
  DiAllResourcesMembershipState,
  DiProviderActivationState,
} from '../src/di/provider-activation.js';
import { Resolver } from '../src/di/resolver.js';
import type { DiWorldConstructionEmission } from '../src/di/world-construction.js';
import type { StaticProjectEvaluationResult } from '../src/evaluation/project-evaluation.js';
import {
  EvaluationValueKind,
  type EvaluationValue,
} from '../src/evaluation/values.js';
import type {
  IdentityHandle,
  OpenSeamHandle,
  ProductHandle,
} from '../src/kernel/handles.js';
import { ContainerIdentityKind } from '../src/kernel/identity.js';
import {
  OpenSeam,
  OpenSeamReasonKind,
} from '../src/kernel/open-seam.js';
import { KernelVocabulary } from '../src/kernel/vocabulary.js';

const pressureFixtures = fileURLToPath(new URL('../fixtures/pressure', import.meta.url));

describe('direct-key allResources provider membership', () => {
  let fixture: ProviderMembershipFixture;

  beforeAll(async () => {
    fixture = await openProviderMembershipFixture();
  });

  afterAll(() => {
    fixture.runtime.retireWorkspaceIncarnation();
  });

  test('closes an empty direct-key membership without JIT registration', () => {
    const missing = new ContainerLookupKey(
      identity('missing'),
      ContainerLookupKeyKind.String,
      'missing',
    );
    const result = activate(fixture, fixture.leaf, missing);

    expect(result.membershipState).toBe(DiAllResourcesMembershipState.Exact);
    expect(result.entries).toEqual([]);
  });

  test('orders leaf providers before root providers and excludes intermediate ancestors', () => {
    const result = activate(fixture, fixture.leaf, fixture.multiKey);

    expect(result.membershipState).toBe(DiAllResourcesMembershipState.Exact);
    expect(result.entries.map((entry) => entry.handler.identityHandle)).toEqual([
      fixture.leaf.identityHandle,
      fixture.leaf.identityHandle,
      fixture.root.identityHandle,
      fixture.root.identityHandle,
    ]);
    expect(result.entries.map((entry) => marker(entry.activation.value))).toEqual([
      'multi-first',
      'multi-second',
      'multi-first',
      'multi-second',
    ]);
    expect(result.entries.some((entry) => entry.handler === fixture.intermediate)).toBe(false);
  });

  test('retains candidate-current evaluated instance values on the DI world', () => {
    const result = activate(fixture, fixture.root, fixture.lexicalKey);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.activation.state).toBe(DiProviderActivationState.Value);
    expect(marker(result.entries[0]?.activation.value ?? null)).toBe('lexical-before');
    expect(fixture.world.providerActivation).toBe(fixture.app.emission.appWorld.diWorld.providerActivation);
  });

  test('selects finite pressure only at leaf/root while retaining genuinely global pressure', () => {
    const leaf = registrationSeam('leaf');
    const intermediate = registrationSeam('intermediate');
    const root = registrationSeam('root');
    const sibling = registrationSeam('sibling');
    const global = registrationSeam('global');
    const result = activateDirectKeyAllResources(
      fixture.world,
      [
        new ConfigurationOpenSeamScope(leaf, [fixture.leaf.identityHandle]),
        new ConfigurationOpenSeamScope(intermediate, [fixture.intermediate.identityHandle]),
        new ConfigurationOpenSeamScope(root, [fixture.root.identityHandle]),
        new ConfigurationOpenSeamScope(sibling, [identity('sibling')]),
        new ConfigurationOpenSeamScope(global, null),
      ],
      fixture.leaf,
      fixture.multiKey,
    );
    const testPressureHandles = new Set([
      leaf.handle,
      intermediate.handle,
      root.handle,
      sibling.handle,
      global.handle,
    ]);
    const selected = result.registrationOpenSeams
      .filter((seam) => testPressureHandles.has(seam.handle))
      .map((seam) => seam.handle);

    expect(selected).toEqual([leaf.handle, root.handle, global.handle]);
    expect(result.registrationOpenPressure
      .filter((pressure) => testPressureHandles.has(pressure.seam.handle))
      .map((pressure) => [pressure.seam.handle, pressure.lane, pressure.handler?.identityHandle ?? null]))
      .toEqual([
        [leaf.handle, DiAllResourcesRegistrationPressureLane.Leaf, fixture.leaf.identityHandle],
        [root.handle, DiAllResourcesRegistrationPressureLane.Root, fixture.root.identityHandle],
        [global.handle, DiAllResourcesRegistrationPressureLane.Global, null],
      ]);
    expect(result.membershipState).toBe(DiAllResourcesMembershipState.Open);
  });

  test('preserves one shared seam independently at both selected lanes', () => {
    const shared = registrationSeam('shared-leaf-root');
    const result = activateDirectKeyAllResources(
      fixture.world,
      [new ConfigurationOpenSeamScope(shared, [
        fixture.leaf.identityHandle,
        fixture.root.identityHandle,
      ])],
      fixture.leaf,
      fixture.multiKey,
    );
    const selected = result.registrationOpenPressure.filter((pressure) => pressure.seam === shared);

    expect(selected.map((pressure) => pressure.lane)).toEqual([
      DiAllResourcesRegistrationPressureLane.Leaf,
      DiAllResourcesRegistrationPressureLane.Root,
    ]);
    expect(result.registrationOpenSeams.filter((seam) => seam === shared)).toHaveLength(1);
  });
});

interface ProviderMembershipFixture {
  readonly runtime: SemanticRuntime;
  readonly app: SemanticApp;
  readonly world: DiWorldConstructionEmission;
  readonly root: Container;
  readonly intermediate: Container;
  readonly leaf: Container;
  readonly multiKey: ContainerLookupKey;
  readonly lexicalKey: ContainerLookupKey;
}

async function openProviderMembershipFixture(): Promise<ProviderMembershipFixture> {
  const runtime = await createSemanticRuntime({
    workspaceRoot: path.join(pressureFixtures, 'di-provider-activation'),
    storeKey: 'test:di-provider-membership',
  });
  const app = await runtime.openApp({ analysisDepth: 'binding-observation' });
  const world = app.emission.appWorld.diWorld;
  const root = activationContainerForFixture(
    app.emission.evaluation,
    app.emission.appWorld.configuration,
  );
  if (root == null) {
    throw new Error('Expected the provider-membership fixture root.');
  }

  const multiSlots = resolverSlotsForLocalName(root, 'multi');
  const lexicalSlot = resolverSlotsForLocalName(root, 'lexical')[0] ?? null;
  const multiKey = multiSlots[0]?.resolver instanceof Resolver
    ? containerLookupKeyForRegistrationKey(multiSlots[0].resolver._key)
    : null;
  const lexicalKey = lexicalSlot?.resolver instanceof Resolver
    ? containerLookupKeyForRegistrationKey(lexicalSlot.resolver._key)
    : null;
  if (multiSlots.length !== 2 || multiKey == null || lexicalKey == null) {
    throw new Error('Expected exact multi and instance provider keys in the DI fixture.');
  }

  const intermediate = childContainer(root, 'intermediate');
  const leaf = childContainer(intermediate, 'leaf');
  installClonedSlots(intermediate, multiSlots, 'intermediate');
  installClonedSlots(leaf, multiSlots, 'leaf');

  return {
    runtime,
    app,
    world,
    root,
    intermediate,
    leaf,
    multiKey,
    lexicalKey,
  };
}

function activate(
  fixture: ProviderMembershipFixture,
  requestor: Container,
  key: ContainerLookupKey,
): DiDirectKeyAllResourcesActivation {
  return activateDirectKeyAllResources(
    fixture.world,
    [],
    requestor,
    key,
  );
}

function activationContainerForFixture(
  evaluation: StaticProjectEvaluationResult,
  configuration: SemanticApp['emission']['appWorld']['configuration'],
): Container | null {
  const source = evaluation.readEvaluatedSources().find((candidate) =>
    candidate.admission.path.replace(/\\/g, '/').endsWith('src/main.ts')
  ) ?? null;
  const value = source?.evaluation.environment.readValue('container') ?? null;
  const containerEvaluation = value == null ? null : aureliaContainerEvaluationForValue(value);
  return containerEvaluation == null
    ? null
    : configuration.evaluationBindings.containersByEvaluation.get(containerEvaluation) ?? null;
}

function childContainer(parent: Container, local: string): Container {
  return new Container(
    `product:test:provider-membership:${local}` as ProductHandle,
    identity(local),
    ContainerIdentityKind.Child,
    parent.toReference(),
    parent.root.toReference(),
    null,
    [],
    parent.readConfiguration(),
    parent,
  );
}

function resolverSlotsForLocalName(
  container: Container,
  localName: string,
): readonly ContainerResolverSlot[] {
  return container.readResolverSlots().filter((slot): slot is ContainerResolverSlot =>
    slot instanceof ContainerResolverSlot
    && slot.resolver instanceof Resolver
    && slot.resolver._key.localName === localName
  );
}

function installClonedSlots(
  target: Container,
  sources: readonly ContainerResolverSlot[],
  local: string,
): void {
  sources.forEach((source, index) => target.registerResolver(new ContainerResolverSlot(
    `product:test:provider-membership:${local}:slot:${index}` as ProductHandle,
    target.toReference(),
    source.keyIdentityHandle,
    source.resolver,
    source.resolverProductHandle,
    source.strategy,
    false,
    source.sourceAddressHandle,
    source.fieldProvenance,
  )));
}

function marker(value: EvaluationValue | null): string | null {
  if (value?.kind !== EvaluationValueKind.Object && value?.kind !== EvaluationValueKind.Instance) {
    return null;
  }
  const candidate = value.properties.get('marker')?.value ?? null;
  return candidate?.kind === EvaluationValueKind.String ? candidate.value : null;
}

function registrationSeam(local: string): OpenSeam {
  return new OpenSeam(
    `open:test:provider-membership:${local}` as OpenSeamHandle,
    KernelVocabulary.Di.OpenRegistrationSpending.key,
    `Open registration pressure for ${local}.`,
    null,
    null,
    [OpenSeamReasonKind.DiRegistrationAdmissionOpen],
  );
}

function identity(local: string): IdentityHandle {
  return `identity:test:provider-membership:${local}` as IdentityHandle;
}
