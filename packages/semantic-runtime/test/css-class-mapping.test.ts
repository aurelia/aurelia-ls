import { describe, expect, test } from 'vitest';

import {
  CssClassMappingAuthorityCandidate,
  CssClassMappingAuthorityState,
  CssClassMappingOpenReason,
  CssClassMappingOpenReasonKind,
  CssClassMappingPropertyState,
  deriveCssClassMappingForDependencies,
} from '../src/template/css-class-mapping.js';
import {
  ResourceCssModulesMappingArgument,
  ResourceCssModulesMappingEntry,
  ResourceCssModulesRegistryInput,
  ResourceDependencyReference,
  ResourceDependencyReferenceKind,
  ResourceRegistryDependencyKind,
} from '../src/resources/resource-reference.js';

describe('component-world CSS class mapping', () => {
  test('folds repeated registries into one exact last-write mapping', () => {
    const mapping = deriveCssClassMappingForDependencies(
      CssClassMappingAuthorityCandidate.exactNone,
      [
        cssModules([
          exactArgument({ alpha: 'alpha_1', shared: 'shared_1' }),
          exactArgument({ beta: 'beta_1' }),
        ]),
        cssModules([exactArgument({ shared: 'shared_2' })]),
      ],
      false,
    );

    expect(mapping.authorityState).toBe(CssClassMappingAuthorityState.Exact);
    expect(mapping.lookup('alpha')).toEqual({
      propertyState: CssClassMappingPropertyState.Value,
      mappedClassName: 'alpha_1',
    });
    expect(mapping.lookup('shared')).toEqual({
      propertyState: CssClassMappingPropertyState.Value,
      mappedClassName: 'shared_2',
    });
    expect(mapping.lookup('missing')).toEqual({
      propertyState: CssClassMappingPropertyState.Absent,
      mappedClassName: null,
    });
  });

  test('lets a later exact write close one name while unrelated lookups stay open', () => {
    const mapping = deriveCssClassMappingForDependencies(
      CssClassMappingAuthorityCandidate.exactNone,
      [cssModules([
        new ResourceCssModulesMappingArgument([], true, 'src/classes.module.css'),
        exactArgument({ stable: 'stable_hash' }),
      ])],
      false,
    );

    expect(mapping.authorityState).toBe(CssClassMappingAuthorityState.Partial);
    expect(mapping.lookup('stable')).toEqual({
      propertyState: CssClassMappingPropertyState.Value,
      mappedClassName: 'stable_hash',
    });
    expect(mapping.lookup('unknown')).toEqual({
      propertyState: CssClassMappingPropertyState.Open,
      mappedClassName: null,
    });
    expect(mapping.openReasons).toEqual([
      expect.objectContaining({
        reasonKind: CssClassMappingOpenReasonKind.RegistryArgument,
        sourceModuleKey: 'src/classes.module.css',
      }),
    ]);
  });

  test('keeps later open writes open and models opaque registry pressure in order', () => {
    const openAfterExact = deriveCssClassMappingForDependencies(
      CssClassMappingAuthorityCandidate.exactNone,
      [cssModules([
        exactArgument({ alpha: 'alpha_hash' }),
        new ResourceCssModulesMappingArgument([], true),
      ])],
      false,
    );
    expect(openAfterExact.authorityState).toBe(CssClassMappingAuthorityState.Open);
    expect(openAfterExact.lookup('alpha').propertyState).toBe(CssClassMappingPropertyState.Open);

    const exactAfterOpaque = deriveCssClassMappingForDependencies(
      CssClassMappingAuthorityCandidate.exactNone,
      [
        opaqueRegistry('customRegistry'),
        cssModules([exactArgument({ alpha: 'closed_again' })]),
      ],
      false,
    );
    expect(exactAfterOpaque.authorityState).toBe(CssClassMappingAuthorityState.Partial);
    expect(exactAfterOpaque.lookup('alpha')).toEqual({
      propertyState: CssClassMappingPropertyState.Value,
      mappedClassName: 'closed_again',
    });
    expect(exactAfterOpaque.lookup('other').propertyState).toBe(CssClassMappingPropertyState.Open);
  });

  test('does not inherit a parent component mapping into a fresh leaf locus', () => {
    const parent = deriveCssClassMappingForDependencies(
      CssClassMappingAuthorityCandidate.exactNone,
      [cssModules([exactArgument({ parent: 'parent_hash' })])],
      false,
    );
    const child = deriveCssClassMappingForDependencies(parent, [], false);
    const preserved = deriveCssClassMappingForDependencies(parent, [], true);

    expect(child).toBe(CssClassMappingAuthorityCandidate.exactNone);
    expect(child.lookup('parent').propertyState).toBe(CssClassMappingPropertyState.Absent);
    expect(preserved.lookup('parent')).toEqual({
      propertyState: CssClassMappingPropertyState.Value,
      mappedClassName: 'parent_hash',
    });
  });

  test('turns dependency membership uncertainty into whole-locus lookup pressure', () => {
    const mapping = deriveCssClassMappingForDependencies(
      CssClassMappingAuthorityCandidate.exactNone,
      [cssModules([exactArgument({ retained: 'retained_hash' })])],
      false,
      [new CssClassMappingOpenReason(
        CssClassMappingOpenReasonKind.DependencySet,
        'Dependency array membership is open.',
        null,
        null,
        null,
      )],
    );

    expect(mapping.authorityState).toBe(CssClassMappingAuthorityState.Open);
    expect(mapping.lookup('retained').propertyState).toBe(CssClassMappingPropertyState.Open);
    expect(mapping.lookup('other').propertyState).toBe(CssClassMappingPropertyState.Open);
  });
});

function cssModules(
  mappingArguments: readonly ResourceCssModulesMappingArgument[],
  mayHaveUnknownArguments = false,
  mayHaveUnknownArgumentOrder = false,
): ResourceDependencyReference {
  return new ResourceDependencyReference(
    null,
    'cssModules',
    null,
    'cssModules',
    ResourceDependencyReferenceKind.Registry,
    ResourceRegistryDependencyKind.CssModules,
    new ResourceCssModulesRegistryInput(
      mappingArguments,
      mayHaveUnknownArguments,
      mayHaveUnknownArgumentOrder,
    ),
  );
}

function exactArgument(
  entries: Readonly<Record<string, string>>,
): ResourceCssModulesMappingArgument {
  return new ResourceCssModulesMappingArgument(
    Object.entries(entries).map(([className, mappedClassName]) =>
      new ResourceCssModulesMappingEntry(className, mappedClassName)
    ),
    false,
  );
}

function opaqueRegistry(localName: string): ResourceDependencyReference {
  return new ResourceDependencyReference(
    null,
    localName,
    null,
    localName,
    ResourceDependencyReferenceKind.Registry,
    ResourceRegistryDependencyKind.OpaqueRegistry,
  );
}
