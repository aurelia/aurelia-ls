/**
 * Builtin Resource Catalog — Golden Reference Dataset
 *
 * Every Aurelia 2 framework builtin expressed as ResourceGreen literals.
 * This is the product's encoded domain knowledge about the framework,
 * extracted from schema/registry.ts and validated against:
 * - F1 entity catalog (field schemas, expression entry points)
 * - L3 product.md (per-field types, operators, strata)
 * - Tier 1 spec (D4: capture/processContent fidelity, D5: strict three-valued)
 *
 * The manifest format is JSON.stringify of these literals. If any builtin
 * can't be faithfully represented, the type system has a gap.
 *
 * Provenance: all entries have origin 'builtin'. Provenance details
 * (which framework package, which source file) live on the red layer
 * (ResourceProvenance), not here.
 */

import type {
  FieldValue,
  BindableGreen,
  CustomElementGreen,
  CustomAttributeGreen,
  TemplateControllerGreen,
  ControllerSemanticsGreen,
  ValueConverterGreen,
  BindingBehaviorGreen,
  BindingCommandGreen,
  AttributePatternGreen,
  VocabularyGreen,
  ResourceManifest,
  ResourceGreen,
  BindingCommandKind,
  ExpressionEntry,
  PatternInterpret,
  CaptureValue,
  ProcessContentValue,
  DependencyRef,
  WatchDefinition,
  ShadowOptions,
} from './types.js';

import type { BindingMode } from '../../model/ir.js';

// =============================================================================
// FieldValue Helpers
// =============================================================================

const known = <T>(value: T): FieldValue<T> => ({ state: 'known', value });
const absent = <T>(): FieldValue<T> => ({ state: 'absent' });

// =============================================================================
// Bindable Helpers
// =============================================================================

function bindable(
  property: string,
  opts?: {
    mode?: BindingMode;
    type?: string;
    primary?: boolean;
    doc?: string;
  },
): BindableGreen {
  return {
    property,
    attribute: known(property),
    mode: known(opts?.mode ?? 'default'),
    primary: known(opts?.primary ?? false),
    type: opts?.type ? known(opts.type) : absent(),
    doc: opts?.doc,
  };
}

function bindables(
  ...defs: [string, Parameters<typeof bindable>[1]?][]
): Readonly<Record<string, BindableGreen>> {
  const result: Record<string, BindableGreen> = {};
  for (const [name, opts] of defs) {
    result[name] = bindable(name, opts);
  }
  return result;
}

// =============================================================================
// Shared field defaults for resources with no content
// =============================================================================

const NO_ALIASES: FieldValue<readonly string[]> = known([]);
const NO_DEPS: FieldValue<readonly DependencyRef[]> = known([]);
const NO_WATCHES: FieldValue<readonly WatchDefinition[]> = known([]);

// =============================================================================
// Template Controllers (12 core)
// =============================================================================

function tc(
  name: string,
  semantics: ControllerSemanticsGreen,
  tcBindables?: Readonly<Record<string, BindableGreen>>,
): TemplateControllerGreen {
  return {
    kind: 'template-controller',
    name,
    className: pascalCase(name),
    noMultiBindings: known(false),
    defaultProperty: tcBindables
      ? known(Object.keys(tcBindables)[0] ?? 'value')
      : absent(),
    containerStrategy: known('reuse'),
    aliases: NO_ALIASES,
    dependencies: NO_DEPS,
    watches: NO_WATCHES,
    bindables: tcBindables ?? {},
    semantics,
  };
}

export const BUILTIN_TC: Record<string, TemplateControllerGreen> = {
  if: tc('if', {
    origin: 'if',
    trigger: { kind: 'value', prop: 'value' },
    scope: 'reuse',
    cardinality: 'zero-one',
    branches: { names: ['else'], relationship: 'sibling' },
  }, bindables(
    ['value', { type: 'boolean', primary: true }],
    ['cache', { type: 'boolean' }],
  )),

  else: tc('else', {
    origin: 'else',
    trigger: { kind: 'branch', parent: 'if' },
    scope: 'reuse',
    cardinality: 'zero-one',
    linksTo: 'if',
  }),

  repeat: tc('repeat', {
    origin: 'repeat',
    trigger: { kind: 'iterator', prop: 'items', command: 'for' },
    scope: 'overlay',
    cardinality: 'zero-many',
    injects: {
      contextuals: ['$index', '$first', '$last', '$even', '$odd', '$length', '$middle', '$previous'],
    },
    tailProps: {
      key: { name: 'key', accepts: ['bind', null] },
      contextual: { name: 'contextual', accepts: ['bind', null] },
    },
  }, bindables(
    ['items', { primary: true }],
  )),

  with: tc('with', {
    origin: 'with',
    trigger: { kind: 'value', prop: 'value' },
    scope: 'overlay',
    cardinality: 'one',
    injects: { alias: { prop: 'value', defaultName: '$this' } },
  }, bindables(
    ['value'],
  )),

  switch: tc('switch', {
    origin: 'switch',
    trigger: { kind: 'value', prop: 'value' },
    scope: 'reuse',
    cardinality: 'one-of-n',
    branches: { names: ['case', 'default-case'], relationship: 'child' },
  }, bindables(
    ['value'],
  )),

  case: tc('case', {
    origin: 'case',
    trigger: { kind: 'branch', parent: 'switch' },
    scope: 'reuse',
    cardinality: 'zero-one',
    linksTo: 'switch',
  }, bindables(
    ['value', { primary: true }],
    ['fallThrough', { type: 'boolean' }],
  )),

  'default-case': tc('default-case', {
    origin: 'default-case',
    trigger: { kind: 'marker' },
    scope: 'reuse',
    cardinality: 'zero-one',
    linksTo: 'switch',
  }, bindables(
    ['fallThrough', { type: 'boolean' }],
  )),

  portal: tc('portal', {
    origin: 'portal',
    trigger: { kind: 'value', prop: 'target' },
    scope: 'reuse',
    cardinality: 'one',
    placement: 'teleported',
  }, bindables(
    ['target', { type: 'string | Element | null', primary: true }],
    ['position', { type: "'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend'" }],
    ['renderContext', { type: 'Document | ShadowRoot' }],
    ['strict', { type: 'boolean' }],
    ['activating'],
    ['activated'],
    ['deactivating'],
    ['deactivated'],
    ['callbackContext'],
  )),

  promise: tc('promise', {
    origin: 'promise',
    trigger: { kind: 'value', prop: 'value' },
    scope: 'overlay',
    cardinality: 'one',
    branches: { names: ['then', 'catch', 'pending'], relationship: 'child' },
  }, bindables(
    ['value', { type: 'Promise<unknown>' }],
  )),

  pending: tc('pending', {
    origin: 'pending',
    trigger: { kind: 'branch', parent: 'promise' },
    scope: 'reuse',
    cardinality: 'zero-one',
    linksTo: 'promise',
  }, bindables(
    ['value', { mode: 'toView', type: 'Promise<unknown>' }],
  )),

  then: tc('then', {
    origin: 'then',
    trigger: { kind: 'branch', parent: 'promise' },
    scope: 'overlay',
    cardinality: 'zero-one',
    linksTo: 'promise',
    injects: { alias: { prop: 'value', defaultName: 'then' } },
  }, bindables(
    ['value', { mode: 'fromView' }],
  )),

  catch: tc('catch', {
    origin: 'catch',
    trigger: { kind: 'branch', parent: 'promise' },
    scope: 'overlay',
    cardinality: 'zero-one',
    linksTo: 'promise',
    injects: { alias: { prop: 'value', defaultName: 'catch' } },
  }, bindables(
    ['value', { mode: 'fromView' }],
  )),
};

// =============================================================================
// Custom Elements (3)
// =============================================================================

function ce(
  name: string,
  ceBindables: Readonly<Record<string, BindableGreen>>,
  opts?: {
    containerless?: boolean;
    capture?: CaptureValue;
    processContent?: ProcessContentValue;
    shadowOptions?: ShadowOptions | null;
    package?: string;
  },
): CustomElementGreen {
  return {
    kind: 'custom-element',
    name,
    className: pascalCase(name),
    containerless: known(opts?.containerless ?? false),
    capture: known(opts?.capture ?? false),
    processContent: known(opts?.processContent ?? null),
    shadowOptions: known(opts?.shadowOptions ?? null),
    template: absent(),
    enhance: known(false),
    strict: absent(),
    aliases: NO_ALIASES,
    dependencies: NO_DEPS,
    watches: NO_WATCHES,
    bindables: ceBindables,
  };
}

export const BUILTIN_CE: Record<string, CustomElementGreen> = {
  'au-compose': ce('au-compose', bindables(
    ['component', { mode: 'toView', type: 'string | Constructable | object | Promise<string | Constructable | object>' }],
    ['template', { mode: 'toView', type: 'string | Promise<string>' }],
    ['model', { mode: 'toView' }],
    ['scopeBehavior', { mode: 'toView', type: "'auto' | 'scoped'" }],
    ['composing', { mode: 'fromView', type: 'Promise<void> | void' }],
    ['composition', { mode: 'fromView', type: 'ICompositionController | undefined' }],
    ['tag', { mode: 'toView', type: 'string | null | undefined' }],
  ), { containerless: true, capture: true }),

  'au-slot': ce('au-slot', bindables(
    ['expose', { mode: 'toView', type: 'object | null' }],
    ['slotchange', { mode: 'toView', type: '((name: string, nodes: readonly Node[]) => void) | null' }],
  ), { containerless: true }),

  'au-viewport': ce('au-viewport', bindables(
    ['name', { mode: 'toView', type: 'string' }],
    ['usedBy', { mode: 'toView', type: 'string' }],
    ['default', { mode: 'toView', type: 'string' }],
    ['fallback', { mode: 'toView', type: 'string | Constructable' }],
  ), { package: '@aurelia/router' }),
};

// =============================================================================
// Custom Attributes (4)
// =============================================================================

function ca(
  name: string,
  caBindables: Readonly<Record<string, BindableGreen>>,
  opts?: {
    aliases?: readonly string[];
    primary?: string;
    noMultiBindings?: boolean;
    package?: string;
  },
): CustomAttributeGreen {
  return {
    kind: 'custom-attribute',
    name,
    className: pascalCase(name),
    noMultiBindings: known(opts?.noMultiBindings ?? false),
    defaultProperty: opts?.primary ? known(opts.primary) : known('value'),
    aliases: known(opts?.aliases ?? []),
    dependencies: NO_DEPS,
    watches: NO_WATCHES,
    bindables: caBindables,
  };
}

export const BUILTIN_CA: Record<string, CustomAttributeGreen> = {
  focus: ca('focus', bindables(
    ['value', { mode: 'twoWay', type: 'boolean', primary: true }],
  )),

  show: ca('show', bindables(
    ['value', { mode: 'toView', type: 'boolean', primary: true }],
  ), { aliases: ['hide'] }),

  load: ca('load', bindables(
    ['route', { mode: 'toView', primary: true }],
    ['params', { mode: 'toView', type: 'Params' }],
    ['attribute', { mode: 'toView', type: 'string' }],
    ['active', { mode: 'fromView', type: 'boolean' }],
    ['context', { mode: 'toView', type: 'IRouteContext' }],
  ), { primary: 'route', package: '@aurelia/router' }),

  href: ca('href', bindables(
    ['value', { mode: 'toView', primary: true }],
  ), { noMultiBindings: true, package: '@aurelia/router' }),
};

// =============================================================================
// Value Converters (1)
// =============================================================================

export const BUILTIN_VC: Record<string, ValueConverterGreen> = {
  sanitize: {
    kind: 'value-converter',
    name: 'sanitize',
    className: 'SanitizeValueConverter',
    aliases: NO_ALIASES,
    fromType: known('string'),
    toType: known('string | null'),
    hasFromView: known(false),
    signals: known([]),
  },
};

// =============================================================================
// Binding Behaviors (10)
// =============================================================================

function bb(name: string, className?: string): BindingBehaviorGreen {
  return {
    kind: 'binding-behavior',
    name,
    className: className ?? (pascalCase(name) + 'BindingBehavior'),
    aliases: NO_ALIASES,
    isFactory: known(false),
  };
}

export const BUILTIN_BB: Record<string, BindingBehaviorGreen> = {
  debounce: bb('debounce'),
  throttle: bb('throttle'),
  signal: bb('signal'),
  oneTime: bb('oneTime'),
  toView: bb('toView'),
  fromView: bb('fromView'),
  twoWay: bb('twoWay'),
  attr: bb('attr'),
  self: bb('self'),
  updateTrigger: bb('updateTrigger'),
};

// =============================================================================
// Binding Commands (14: 12 core + 2 i18n)
// =============================================================================

function bc(
  name: string,
  commandKind: BindingCommandKind,
  ignoreAttr: boolean,
  expressionEntry: ExpressionEntry,
  opts?: { mode?: BindingMode; capture?: boolean; forceAttribute?: string; package?: string },
): BindingCommandGreen {
  return {
    name,
    commandKind,
    ignoreAttr,
    expressionEntry,
    ...(opts?.mode !== undefined ? { mode: opts.mode } : {}),
    ...(opts?.capture !== undefined ? { capture: opts.capture } : {}),
    ...(opts?.forceAttribute ? { forceAttribute: opts.forceAttribute } : {}),
    ...(opts?.package ? { package: opts.package } : {}),
  };
}

export const BUILTIN_BC: Record<string, BindingCommandGreen> = {
  // Property binding commands (ignoreAttr: false, IsProperty)
  'bind':      bc('bind',      'property', false, 'IsProperty', { mode: 'default' }),
  'one-time':  bc('one-time',  'property', false, 'IsProperty', { mode: 'oneTime' }),
  'to-view':   bc('to-view',   'property', false, 'IsProperty', { mode: 'toView' }),
  'from-view': bc('from-view', 'property', false, 'IsProperty', { mode: 'fromView' }),
  'two-way':   bc('two-way',   'property', false, 'IsProperty', { mode: 'twoWay' }),

  // Listener commands (ignoreAttr: true, IsFunction)
  'trigger':   bc('trigger',   'listener', true,  'IsFunction', { capture: false }),
  'capture':   bc('capture',   'listener', true,  'IsFunction', { capture: true }),

  // Iterator command (ignoreAttr: false, IsIterator)
  'for':       bc('for',       'iterator', false, 'IsIterator'),

  // Ref command (ignoreAttr: true, IsProperty)
  'ref':       bc('ref',       'ref',      true,  'IsProperty'),

  // Attribute commands (ignoreAttr: true, IsProperty)
  'attr':      bc('attr',      'attribute', true,  'IsProperty'),
  'class':     bc('class',     'attribute', true,  'IsProperty', { forceAttribute: 'class' }),
  'style':     bc('style',     'style',     true,  'IsProperty'),

  // i18n commands (translation kind)
  't':         bc('t',         'translation', false, 'IsCustom',   { package: '@aurelia/i18n' }),
  't.bind':    bc('t.bind',    'translation', false, 'IsProperty', { package: '@aurelia/i18n' }),
};

// =============================================================================
// Attribute Patterns (14)
// =============================================================================

function ap(
  pattern: string,
  symbols: string,
  interpret: PatternInterpret,
  pkg?: string,
): AttributePatternGreen {
  return {
    pattern,
    symbols,
    interpret,
    ...(pkg ? { package: pkg } : {}),
  };
}

export const BUILTIN_AP: readonly AttributePatternGreen[] = [
  // Core dot-separated (generic target.command)
  ap('PART.PART',       '.',  { kind: 'target-command' }),
  ap('PART.PART.PART',  '.',  { kind: 'target-command' }),

  // Ref patterns
  ap('ref',             '',   { kind: 'fixed', target: 'element', command: 'ref' }),
  ap('PART.ref',        '.',  { kind: 'mapped-fixed-command', command: 'ref', targetMap: { 'view-model': 'component' } }),

  // Event modifier patterns
  ap('PART.trigger:PART', '.:', { kind: 'event-modifier', command: 'trigger', injectCommand: false }),
  ap('PART.capture:PART', '.:', { kind: 'event-modifier', command: 'capture', injectCommand: false }),

  // Shorthand patterns
  ap(':PART',            ':',  { kind: 'fixed-command', command: 'bind', mode: 'toView' }),
  ap('@PART',            '@',  { kind: 'fixed-command', command: 'trigger' }),
  ap('@PART:PART',       '@:', { kind: 'event-modifier', command: 'trigger', injectCommand: true }),

  // Promise TC patterns
  ap('promise.resolve',  '.',  { kind: 'fixed', target: 'promise', command: 'bind' }),
  ap('then',             '',   { kind: 'fixed', target: 'then', command: 'from-view' }),
  ap('catch',            '',   { kind: 'fixed', target: 'catch', command: 'from-view' }),

  // i18n patterns
  ap('t',                '',   { kind: 'fixed', target: '', command: 't' }, '@aurelia/i18n'),
  ap('t.bind',           '.',  { kind: 'fixed', target: '', command: 't.bind' }, '@aurelia/i18n'),
];

// =============================================================================
// Assembled Catalogs
// =============================================================================

/** All builtin resources as a flat array. */
export const BUILTIN_RESOURCES: readonly ResourceGreen[] = [
  ...Object.values(BUILTIN_TC),
  ...Object.values(BUILTIN_CE),
  ...Object.values(BUILTIN_CA),
  ...Object.values(BUILTIN_VC),
  ...Object.values(BUILTIN_BB),
];

/** Builtin vocabulary (commands + patterns). */
export const BUILTIN_VOCABULARY: VocabularyGreen = {
  commands: BUILTIN_BC,
  patterns: BUILTIN_AP,
};

/** The complete builtin manifest. */
export const BUILTIN_MANIFEST: ResourceManifest = {
  schemaVersion: '1.0',
  origin: 'builtin',
  resources: BUILTIN_RESOURCES,
  vocabulary: BUILTIN_VOCABULARY,
};

// =============================================================================
// Utility
// =============================================================================

function pascalCase(s: string): string {
  return s.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}
