import { describe, expect, test } from 'vitest';

import {
  deriveTemplateCompilerHooksForDependencies,
  sameTemplateCompilerHookSetCandidate,
  templateCompilerHookExecutionAdmission,
  TemplateCompilerHookCallableAuthority,
  TemplateCompilerHookCallableAuthorityKind,
  TemplateCompilerHookEntry,
  TemplateCompilerHookEntryCause,
  TemplateCompilerHookEntryCauseKind,
  TemplateCompilerHookExecutionAdmissionKind,
  TemplateCompilerHookKind,
  TemplateCompilerHookLane,
  TemplateCompilerHookMembershipState,
  TemplateCompilerHookOpenReason,
  TemplateCompilerHookOpenReasonKind,
  TemplateCompilerHookProviderAuthority,
  TemplateCompilerHookProviderResolutionKind,
  TemplateCompilerHookProviderSetState,
  TemplateCompilerHookSetCandidate,
} from '../src/template/compiler-hook-world.js';
import {
  ResourceDependencyReference,
  ResourceDependencyReferenceKind,
  ResourceRegistryDependencyKind,
} from '../src/resources/resource-reference.js';

describe('compiler-hook world', () => {
  test('keeps hook membership and callable closure as independent exact facts', () => {
    const absent = entry(TemplateCompilerHookLane.Root, 0, TemplateCompilerHookCallableAuthorityKind.Absent);
    const executableOpen = entry(TemplateCompilerHookLane.Root, 1, TemplateCompilerHookCallableAuthorityKind.Open);
    const candidate = TemplateCompilerHookSetCandidate.exactList([absent, executableOpen]);

    expect(candidate.membershipState).toBe(TemplateCompilerHookMembershipState.ExactList);
    expect(candidate.entries.map((hook) => hook.callable.authorityKind)).toEqual([
      TemplateCompilerHookCallableAuthorityKind.Absent,
      TemplateCompilerHookCallableAuthorityKind.Open,
    ]);
    expect(candidate.providerSetState).toBe(TemplateCompilerHookProviderSetState.Complete);
    const abrupt = TemplateCompilerHookSetCandidate.exactList([
      entry(
        TemplateCompilerHookLane.Root,
        0,
        TemplateCompilerHookCallableAuthorityKind.Open,
        TemplateCompilerHookProviderResolutionKind.Abrupt,
      ),
    ]);
    expect(abrupt.providerSetState).toBe(TemplateCompilerHookProviderSetState.Abrupt);
    expect(abrupt.firstProviderBoundaryOrdinal).toBe(0);
    expect(TemplateCompilerHookSetCandidate.open([], [new TemplateCompilerHookOpenReason(
      TemplateCompilerHookOpenReasonKind.DiMembership,
      null,
      'membership open',
      null,
    )]).providerSetState).toBe(TemplateCompilerHookProviderSetState.Open);
    expect(() => new TemplateCompilerHookSetCandidate(
      TemplateCompilerHookMembershipState.ExactNone,
      [absent],
      [],
    )).toThrow(/incoherent entries or open reasons/);
    expect(() => new TemplateCompilerHookSetCandidate(
      TemplateCompilerHookMembershipState.Open,
      [],
      [],
    )).toThrow(/incoherent entries or open reasons/);
  });

  test('replaces an intermediate leaf lane, retains root order, and projects component registry effects', () => {
    const parent = TemplateCompilerHookSetCandidate.open(
      [
        entry(TemplateCompilerHookLane.Leaf, 0, TemplateCompilerHookCallableAuthorityKind.Open),
        entry(TemplateCompilerHookLane.Root, 0, TemplateCompilerHookCallableAuthorityKind.Absent),
      ],
      [new TemplateCompilerHookOpenReason(
        TemplateCompilerHookOpenReasonKind.DiMembership,
        TemplateCompilerHookLane.Leaf,
        'Parent leaf membership is open.',
        null,
      )],
    );
    const dependencies = [
      registryDependency(ResourceRegistryDependencyKind.ShadowCss, 'shadow'),
      registryDependency(ResourceRegistryDependencyKind.CssModules, 'classes'),
      registryDependency(ResourceRegistryDependencyKind.TemplateCompilerHook, 'local-hook'),
    ];

    const child = deriveTemplateCompilerHooksForDependencies(parent, dependencies, false);
    expect(child.membershipState).toBe(TemplateCompilerHookMembershipState.ExactList);
    expect(child.entries.map((hook) => [hook.lane, hook.sourceOrdinal, hook.hookKind])).toEqual([
      [TemplateCompilerHookLane.Leaf, 1, TemplateCompilerHookKind.CssModules],
      [TemplateCompilerHookLane.Leaf, 2, TemplateCompilerHookKind.Registered],
      [TemplateCompilerHookLane.Root, 0, TemplateCompilerHookKind.Registered],
    ]);
    expect(child.openReasons).toEqual([]);
  });

  test('preserves the app-root leaf and keeps opaque component registry membership open', () => {
    const parentLeaf = entry(
      TemplateCompilerHookLane.Leaf,
      0,
      TemplateCompilerHookCallableAuthorityKind.Absent,
    );
    const result = deriveTemplateCompilerHooksForDependencies(
      TemplateCompilerHookSetCandidate.exactList([parentLeaf]),
      [
        registryDependency(ResourceRegistryDependencyKind.TemplateCompilerHook, 'local'),
        registryDependency(ResourceRegistryDependencyKind.OpaqueRegistry, 'opaque'),
      ],
      true,
    );

    expect(result.membershipState).toBe(TemplateCompilerHookMembershipState.Open);
    expect(result.entries).toEqual([
      parentLeaf,
      expect.objectContaining({
        lane: TemplateCompilerHookLane.Leaf,
        laneOrdinal: 1,
        sourceOrdinal: 0,
      }),
    ]);
    expect(result.openReasons).toEqual([
      expect.objectContaining({
        reasonKind: TemplateCompilerHookOpenReasonKind.RegistryDependency,
        lane: TemplateCompilerHookLane.Leaf,
      }),
    ]);
  });

  test('distinguishes hook members that occupy the same dependency ordinal', () => {
    const hookA = deriveTemplateCompilerHooksForDependencies(
      TemplateCompilerHookSetCandidate.exactNone,
      [registryDependency(ResourceRegistryDependencyKind.TemplateCompilerHook, 'HookA')],
      false,
    );
    const hookB = deriveTemplateCompilerHooksForDependencies(
      TemplateCompilerHookSetCandidate.exactNone,
      [registryDependency(ResourceRegistryDependencyKind.TemplateCompilerHook, 'HookB')],
      false,
    );

    expect(hookA.entries[0]?.cause.registryEffectKey).not.toBe(hookB.entries[0]?.cause.registryEffectKey);
    expect(sameTemplateCompilerHookSetCandidate(hookA, hookB)).toBe(false);
  });

  test('stops at the first callable boundary after the complete provider array resolves', () => {
    const openThenAbrupt = TemplateCompilerHookSetCandidate.exactList([
      entry(TemplateCompilerHookLane.Leaf, 0, TemplateCompilerHookCallableAuthorityKind.Open),
      entry(TemplateCompilerHookLane.Root, 0, TemplateCompilerHookCallableAuthorityKind.Abrupt),
    ]);
    const absentThenAbrupt = TemplateCompilerHookSetCandidate.exactList([
      entry(TemplateCompilerHookLane.Leaf, 0, TemplateCompilerHookCallableAuthorityKind.Absent),
      entry(TemplateCompilerHookLane.Root, 0, TemplateCompilerHookCallableAuthorityKind.Abrupt),
    ]);

    expect(templateCompilerHookExecutionAdmission(openThenAbrupt)).toEqual({
      admissionKind: TemplateCompilerHookExecutionAdmissionKind.CallableOpen,
      entryOrdinal: 0,
    });
    expect(templateCompilerHookExecutionAdmission(absentThenAbrupt)).toEqual({
      admissionKind: TemplateCompilerHookExecutionAdmissionKind.CallableAbrupt,
      entryOrdinal: 1,
    });
  });
});

function entry(
  lane: TemplateCompilerHookLane,
  sourceOrdinal: number,
  callable: TemplateCompilerHookCallableAuthorityKind,
  provider: TemplateCompilerHookProviderResolutionKind = TemplateCompilerHookProviderResolutionKind.Value,
): TemplateCompilerHookEntry {
  return new TemplateCompilerHookEntry(
    lane,
    sourceOrdinal,
    sourceOrdinal,
    TemplateCompilerHookKind.Registered,
    new TemplateCompilerHookEntryCause(
      TemplateCompilerHookEntryCauseKind.ResolverSlot,
      null,
      null,
      null,
    ),
    new TemplateCompilerHookProviderAuthority(provider),
    new TemplateCompilerHookCallableAuthority(callable, null, null),
  );
}

function registryDependency(
  registryKind: ResourceRegistryDependencyKind,
  localName: string,
): ResourceDependencyReference {
  return new ResourceDependencyReference(
    null,
    localName,
    'src/hooks.ts',
    localName,
    ResourceDependencyReferenceKind.Registry,
    registryKind,
  );
}
