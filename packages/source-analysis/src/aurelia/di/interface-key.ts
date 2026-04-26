import { auLink } from '../au-link.js';
import type { KeyRef, SourceNodeRef, SymbolRef } from '../refs.js';
import { KeyRef as KeyRefValue, SymbolRef as SymbolRefValue } from '../refs.js';

export const INTERFACE_KEY_DEFAULT_REGISTRATION_KINDS = [
  'instance',
  'singleton',
  'transient',
  'callback',
  'cached-callback',
  'alias',
] as const;

export type InterfaceKeyDefaultRegistrationKind =
  typeof INTERFACE_KEY_DEFAULT_REGISTRATION_KINDS[number];

export class InterfaceKeyDefaultRegistration {
  constructor(
    readonly kind: InterfaceKeyDefaultRegistrationKind,
    readonly source: SourceNodeRef,
    readonly targetKey: KeyRef | null,
    readonly note: string | null = null,
  ) {}
}

@auLink('kernel:ResolverBuilder')
export class InterfaceKeyResolverBuilder {
  readonly kind = 'interface-key-resolver-builder' as const;

  constructor(
    readonly source: SourceNodeRef,
    readonly producedRegistration: InterfaceKeyDefaultRegistration | null,
    readonly note: string | null = null,
  ) {}
}

// Clean-room model for DI.createInterface-style key production. This sits
// above raw export identity and below later registration production.
@auLink('kernel:InterfaceSymbol')
export class InterfaceKey {
  constructor(
    readonly id: string,
    readonly owner: SymbolRef | SourceNodeRef,
    readonly key: KeyRef,
    readonly friendlyName: string | null,
    readonly defaultRegistration: InterfaceKeyDefaultRegistration | null = null,
    readonly defaultRegistrationBuilder: InterfaceKeyResolverBuilder | null = null,
  ) {}
}

interface KnownInterfaceExport {
  readonly canonicalModuleSpecifier: string;
  readonly exportName: string;
  readonly acceptedModuleSpecifiers: readonly string[];
}

const KNOWN_INTERFACE_EXPORTS: readonly KnownInterfaceExport[] = [
  {
    canonicalModuleSpecifier: '@aurelia/kernel',
    exportName: 'IContainer',
    acceptedModuleSpecifiers: ['@aurelia/kernel', 'aurelia'],
  },
  {
    canonicalModuleSpecifier: '@aurelia/runtime-html',
    exportName: 'IController',
    acceptedModuleSpecifiers: ['@aurelia/runtime-html', 'aurelia'],
  },
  {
    canonicalModuleSpecifier: '@aurelia/runtime-html',
    exportName: 'IHydrationContext',
    acceptedModuleSpecifiers: ['@aurelia/runtime-html'],
  },
  {
    canonicalModuleSpecifier: '@aurelia/runtime-html',
    exportName: 'IViewFactory',
    acceptedModuleSpecifiers: ['@aurelia/runtime-html', 'aurelia'],
  },
  {
    canonicalModuleSpecifier: '@aurelia/runtime-html',
    exportName: 'IRenderLocation',
    acceptedModuleSpecifiers: ['@aurelia/runtime-html', 'aurelia'],
  },
  {
    canonicalModuleSpecifier: '@aurelia/runtime-html',
    exportName: 'IAuSlotsInfo',
    acceptedModuleSpecifiers: ['@aurelia/runtime-html', 'aurelia'],
  },
  {
    canonicalModuleSpecifier: '@aurelia/template-compiler',
    exportName: 'IInstruction',
    acceptedModuleSpecifiers: ['@aurelia/template-compiler'],
  },
] as const;

export function createImportedInterfaceKey(
  canonicalModuleSpecifier: string,
  exportName: string,
): InterfaceKey {
  const owner = new SymbolRefValue(
    `symbol:interface-export:${canonicalModuleSpecifier}:${exportName}`,
    null,
    exportName,
    [exportName],
    null,
  );
  const key = new KeyRefValue(
    `key:interface-export:${canonicalModuleSpecifier}:${exportName}`,
    'interface-symbol',
    owner,
    exportName,
  );

  return new InterfaceKey(
    `interface-key:${canonicalModuleSpecifier}:${exportName}`,
    owner,
    key,
    exportName,
    null,
  );
}

export function findKnownImportedInterfaceKey(
  moduleSpecifier: string,
  exportName: string,
): InterfaceKey | null {
  const matched = KNOWN_INTERFACE_EXPORTS.find((current) =>
    current.exportName === exportName
    && current.acceptedModuleSpecifiers.includes(moduleSpecifier),
  );
  return matched == null
    ? null
    : createImportedInterfaceKey(matched.canonicalModuleSpecifier, matched.exportName);
}
