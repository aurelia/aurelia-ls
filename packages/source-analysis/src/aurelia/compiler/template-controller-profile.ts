import type { TemplateControllerDefinition } from '../resources/index.js';

export const TEMPLATE_CONTROLLER_PROFILE_KINDS = [
  'builtin',
  'custom',
] as const;

export type TemplateControllerProfileKind =
  typeof TEMPLATE_CONTROLLER_PROFILE_KINDS[number];

export const BUILTIN_TEMPLATE_CONTROLLER_FAMILY_KINDS = [
  'if',
  'else',
  'repeat',
  'with',
  'switch',
  'case',
  'default-case',
  'promise',
  'pending',
  'then',
  'catch',
  'portal',
] as const;

export type BuiltinTemplateControllerFamilyKind =
  typeof BUILTIN_TEMPLATE_CONTROLLER_FAMILY_KINDS[number];

export const TEMPLATE_CONTROLLER_VIEW_REALIZATION_POLICY_KINDS = [
  'deferred-conditional',
  'deferred-iterative',
  'deferred-single-view',
  'deferred-linked-branch',
  'deferred-portal',
  'custom',
] as const;

export type TemplateControllerViewRealizationPolicyKind =
  typeof TEMPLATE_CONTROLLER_VIEW_REALIZATION_POLICY_KINDS[number];

export const TEMPLATE_CONTROLLER_SCOPE_EFFECT_KINDS = [
  'conditional-no-new-scope',
  'per-item-child-scope',
  're-rooted-child-scope',
  'switch-linked-branch',
  'promise-shared-child-scope',
  'logical-scope-preserved',
  'custom',
] as const;

export type TemplateControllerScopeEffectKind =
  typeof TEMPLATE_CONTROLLER_SCOPE_EFFECT_KINDS[number];

export const TEMPLATE_CONTROLLER_TRIGGER_SURFACE_KINDS = [
  'binding',
  'attaching',
  'value-changed',
  'collection-observation',
  'link',
] as const;

export type TemplateControllerTriggerSurfaceKind =
  typeof TEMPLATE_CONTROLLER_TRIGGER_SURFACE_KINDS[number];

export const TEMPLATE_CONTROLLER_LINKAGE_KINDS = [
  'none',
  'previous-if',
  'switch-owner',
  'promise-owner',
  'custom',
] as const;

export type TemplateControllerLinkageKind =
  typeof TEMPLATE_CONTROLLER_LINKAGE_KINDS[number];

export interface TemplateControllerProfile {
  readonly profileKind: TemplateControllerProfileKind;
  readonly note: string | null;
}

export class BuiltinTemplateControllerProfile implements TemplateControllerProfile {
  readonly profileKind = 'builtin' as const;

  constructor(
    readonly family: BuiltinTemplateControllerFamilyKind,
    readonly viewRealizationPolicy: TemplateControllerViewRealizationPolicyKind,
    readonly scopeEffect: TemplateControllerScopeEffectKind,
    readonly linkage: TemplateControllerLinkageKind,
    readonly triggerSurfaces: readonly TemplateControllerTriggerSurfaceKind[] = [],
    readonly note: string | null = null,
  ) {}
}

export class CustomTemplateControllerProfile implements TemplateControllerProfile {
  readonly profileKind = 'custom' as const;

  constructor(
    readonly resourceName: string | null = null,
    readonly note: string | null = 'No framework-builtin product profile matched this template controller. A later configurable/custom profile layer can attach richer runtime semantics without changing the generic TC carrier.',
  ) {}
}

export class TemplateControllerProfileResolver {
  resolve(
    definition: TemplateControllerDefinition,
  ): TemplateControllerProfile {
    switch (definition.name) {
      case 'if':
        return new BuiltinTemplateControllerProfile(
          'if',
          'deferred-conditional',
          'conditional-no-new-scope',
          'none',
          ['attaching', 'value-changed'],
          'Builtin if keeps view creation deferred until attaching/valueChanged and does not introduce a new scope by default.',
        );
      case 'else':
        return new BuiltinTemplateControllerProfile(
          'else',
          'deferred-linked-branch',
          'conditional-no-new-scope',
          'previous-if',
          ['link'],
          'Builtin else contributes a linked branch factory through link(...) rather than realizing a view independently during generic hydration.',
        );
      case 'repeat':
        return new BuiltinTemplateControllerProfile(
          'repeat',
          'deferred-iterative',
          'per-item-child-scope',
          'none',
          ['binding', 'attaching', 'value-changed', 'collection-observation'],
          'Builtin repeat defers view realization until binding/attaching and later collection-driven updates, creating child scopes per item.',
        );
      case 'with':
        return new BuiltinTemplateControllerProfile(
          'with',
          'deferred-single-view',
          're-rooted-child-scope',
          'none',
          ['attaching', 'value-changed'],
          'Builtin with prepares one view factory but re-roots a child scope from the bound value when that view is realized.',
        );
      case 'switch':
        return new BuiltinTemplateControllerProfile(
          'switch',
          'deferred-linked-branch',
          'switch-linked-branch',
          'none',
          ['attaching', 'value-changed'],
          'Builtin switch owns later linked branch views rather than realizing them during generic TC preparation.',
        );
      case 'case':
      case 'default-case':
        return new BuiltinTemplateControllerProfile(
          definition.name,
          'deferred-linked-branch',
          'switch-linked-branch',
          'switch-owner',
          ['link'],
          'Builtin switch branches link to a surrounding switch controller and contribute later branch factories rather than immediate view creation.',
        );
      case 'promise':
        return new BuiltinTemplateControllerProfile(
          'promise',
          'deferred-linked-branch',
          'promise-shared-child-scope',
          'none',
          ['attaching', 'value-changed'],
          'Builtin promise coordinates later branch view creation over a shared child scope once promise state resolves.',
        );
      case 'pending':
      case 'then':
      case 'catch':
        return new BuiltinTemplateControllerProfile(
          definition.name,
          'deferred-linked-branch',
          'promise-shared-child-scope',
          'promise-owner',
          ['link'],
          'Builtin promise-family branch controllers link themselves to the owning promise controller rather than creating views during generic hydration.',
        );
      case 'portal':
        return new BuiltinTemplateControllerProfile(
          'portal',
          'deferred-portal',
          'logical-scope-preserved',
          'none',
          ['attaching', 'value-changed'],
          'Builtin portal preserves logical scope but relocates rendered DOM later; generic preparation only needs the factory and anchor surfaces.',
        );
      default:
        return new CustomTemplateControllerProfile(definition.name);
    }
  }
}
