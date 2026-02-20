import type {
  AttrRes,
  AttributePatternConfig,
  BindingMode,
  Bindable,
  BindableDef,
  BindingCommandConfig,
  TemplateControllerDef,
  TemplateSyntaxRegistry,
  ControllerConfig,
  ControllerSemantics,
  BindingCommandDef,
  BindingCommandKind,
  AttributePatternDef,
  PatternInterpret,
  CatalogGap,
  CustomElementDef,
  CustomAttributeDef,
  ElementRes,
  ResourceCatalog,
  ResourceCollections,
  ResourceKind,
  ResourceScopeId,
  ScopeCompleteness,
  ValueConverterDef,
  BindingBehaviorDef,
  DomSchema,
  EventSchema,
  Naming,
  TwoWayDefaults,
  ProjectSemantics,
  SemanticsLookup,
  SemanticsLookupOptions,
  MaterializedSemantics,
  TypeRef,
} from "./types.js";
import {
  buildAttributePatternConfigs,
  buildBindingCommandConfigs,
  buildResourceCollectionsFromSemantics,
  normalizeResourceCollections,
  toAttributePatternConfig,
  toBindingBehaviorSig,
  toBindingCommandConfig,
  toControllerConfig,
  toElementRes,
  toAttrRes,
  toTypeRef,
  toValueConverterSig,
} from "./convert.js";
import { buildResourceCatalog } from "./catalog.js";
import {
  applyLocalImports,
  buildScopeCompletenessIndex,
  materializeResourcesForScope,
} from "./resource-graph.js";

// ============================================================================
// Builders
// ============================================================================

function builtin<T>(value: T): { origin: 'builtin'; value: T } {
  return { origin: 'builtin', value };
}

function bindable(
  name: string,
  opts?: { mode?: BindingMode; type?: string; primary?: boolean }
): BindableDef {
  return {
    property: builtin(name),
    attribute: builtin(name),
    mode: builtin(opts?.mode ?? 'default'),
    primary: builtin(opts?.primary ?? false),
    ...(opts?.type && { type: builtin(opts.type) }),
  };
}

function controller(
  name: string,
  semantics: Omit<ControllerSemantics, 'origin'>,
  bindables?: Record<string, BindableDef>,
): TemplateControllerDef {
  return {
    kind: 'template-controller',
    className: builtin(pascalCase(name)),
    name: builtin(name),
    aliases: builtin([]),
    noMultiBindings: builtin(false),
    bindables: bindables ?? {},
    semantics: { origin: name, ...semantics },
  };
}

function command(
  name: string,
  kind: BindingCommandKind,
  opts?: { mode?: BindingMode; capture?: boolean; forceAttribute?: string; package?: string }
): BindingCommandDef {
  return {
    name: builtin(name),
    commandKind: builtin(kind),
    ...(opts?.mode && { mode: builtin(opts.mode) }),
    ...(opts?.capture !== undefined && { capture: builtin(opts.capture) }),
    ...(opts?.forceAttribute && { forceAttribute: builtin(opts.forceAttribute) }),
    ...(opts?.package && { package: builtin(opts.package) }),
  };
}

function pattern(
  pat: string,
  symbols: string,
  interpret: PatternInterpret,
  pkg?: string
): AttributePatternDef {
  return {
    pattern: builtin(pat),
    symbols: builtin(symbols),
    interpret: builtin(interpret),
    ...(pkg && { package: builtin(pkg) }),
  };
}

function element(
  name: string,
  bindables: Record<string, BindableDef>,
  opts?: { containerless?: boolean; capture?: boolean; boundary?: boolean; package?: string }
): CustomElementDef {
  return {
    kind: 'custom-element',
    className: builtin(pascalCase(name)),
    name: builtin(name),
    aliases: [],
    containerless: builtin(opts?.containerless ?? false),
    shadowOptions: builtin(undefined),
    capture: builtin(opts?.capture ?? false),
    processContent: builtin(false),
    boundary: builtin(opts?.boundary ?? false),
    bindables,
    dependencies: [],
    ...(opts?.package && { package: opts.package }),
  };
}

function attribute(
  name: string,
  bindables: Record<string, BindableDef>,
  opts?: { aliases?: string[]; primary?: string; noMultiBindings?: boolean; package?: string }
): CustomAttributeDef {
  return {
    kind: 'custom-attribute',
    className: builtin(pascalCase(name)),
    name: builtin(name),
    aliases: (opts?.aliases ?? []).map(a => builtin(a)),
    noMultiBindings: builtin(opts?.noMultiBindings ?? false),
    ...(opts?.primary && { primary: builtin(opts.primary) }),
    bindables,
    dependencies: [],
    ...(opts?.package && { package: opts.package }),
  };
}

function pascalCase(s: string): string {
  return s.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}

// ============================================================================
// Template Controllers
// ============================================================================

export const BUILTIN_CONTROLLERS: Record<string, TemplateControllerDef> = {
  if: controller('if', {
    trigger: { kind: 'value', prop: 'value' },
    scope: 'reuse',
    cardinality: 'zero-one',
    branches: { names: ['else'], relationship: 'sibling' },
  }, {
    value: bindable('value', { type: 'boolean', primary: true }),
    cache: bindable('cache', { type: 'boolean' }),
  }),

  repeat: controller('repeat', {
    trigger: { kind: 'iterator', prop: 'items', command: 'for' },
    scope: 'overlay',
    cardinality: 'zero-many',
    injects: {
      contextuals: ['$index', '$first', '$last', '$even', '$odd', '$length', '$middle'],
    },
    tailProps: {
      key: { name: 'key', accepts: ['bind', null] },
      contextual: { name: 'contextual', accepts: ['bind', null] },
    },
  }),

  with: controller('with', {
    trigger: { kind: 'value', prop: 'value' },
    scope: 'overlay',
    cardinality: 'one',
    injects: { alias: { prop: 'value', defaultName: '$this' } },
  }, {
    value: bindable('value'),
  }),

  switch: controller('switch', {
    trigger: { kind: 'value', prop: 'value' },
    scope: 'reuse',
    cardinality: 'one-of-n',
    branches: { names: ['case', 'default-case'], relationship: 'child' },
  }, {
    value: bindable('value'),
  }),

  promise: controller('promise', {
    trigger: { kind: 'value', prop: 'value' },
    scope: 'overlay',
    cardinality: 'one',
    branches: { names: ['then', 'catch', 'pending'], relationship: 'child' },
  }, {
    value: bindable('value', { type: 'Promise<unknown>' }),
  }),

  portal: controller('portal', {
    trigger: { kind: 'value', prop: 'target' },
    scope: 'reuse',
    cardinality: 'one',
    placement: 'teleported',
  }, {
    target: bindable('target', { type: 'string | Element | null', primary: true }),
    strict: bindable('strict', { type: 'boolean' }),
    renderContext: bindable('renderContext', { type: 'Document | ShadowRoot' }),
  }),

  else: controller('else', {
    trigger: { kind: 'branch', parent: 'if' },
    scope: 'reuse',
    cardinality: 'zero-one',
    linksTo: 'if',
  }),

  case: controller('case', {
    trigger: { kind: 'branch', parent: 'switch' },
    scope: 'reuse',
    cardinality: 'zero-one',
    linksTo: 'switch',
  }, {
    value: bindable('value', { primary: true }),
    fallThrough: bindable('fallThrough', { type: 'boolean' }),
  }),

  'default-case': controller('default-case', {
    trigger: { kind: 'marker' },
    scope: 'reuse',
    cardinality: 'zero-one',
    linksTo: 'switch',
  }, {
    fallThrough: bindable('fallThrough', { type: 'boolean' }),
  }),

  pending: controller('pending', {
    trigger: { kind: 'branch', parent: 'promise' },
    scope: 'reuse',
    cardinality: 'zero-one',
    linksTo: 'promise',
  }),

  then: controller('then', {
    trigger: { kind: 'branch', parent: 'promise' },
    scope: 'overlay',
    cardinality: 'zero-one',
    linksTo: 'promise',
    injects: { alias: { prop: 'value', defaultName: 'then' } },
  }),

  catch: controller('catch', {
    trigger: { kind: 'branch', parent: 'promise' },
    scope: 'overlay',
    cardinality: 'zero-one',
    linksTo: 'promise',
    injects: { alias: { prop: 'value', defaultName: 'catch' } },
  }),
};

// ============================================================================
// Binding Commands
// ============================================================================

export const BUILTIN_COMMANDS: Record<string, BindingCommandDef> = {
  bind: command('bind', 'property', { mode: 'default' }),
  'one-time': command('one-time', 'property', { mode: 'oneTime' }),
  'to-view': command('to-view', 'property', { mode: 'toView' }),
  'from-view': command('from-view', 'property', { mode: 'fromView' }),
  'two-way': command('two-way', 'property', { mode: 'twoWay' }),
  trigger: command('trigger', 'listener', { capture: false }),
  capture: command('capture', 'listener', { capture: true }),
  for: command('for', 'iterator'),
  ref: command('ref', 'ref'),
  attr: command('attr', 'attribute'),
  class: command('class', 'attribute', { forceAttribute: 'class' }),
  style: command('style', 'style'),
  t: command('t', 'translation', { package: '@aurelia/i18n' }),
  't.bind': command('t.bind', 'translation', { package: '@aurelia/i18n' }),
};

// ============================================================================
// Attribute Patterns
// ============================================================================

export const BUILTIN_PATTERNS: readonly AttributePatternDef[] = [
  pattern('PART.PART', '.', { kind: 'target-command' }),
  pattern('PART.PART.PART', '.', { kind: 'target-command' }),
  pattern('ref', '', { kind: 'fixed', target: 'element', command: 'ref' }),
  pattern('PART.ref', '.', { kind: 'mapped-fixed-command', command: 'ref', targetMap: { 'view-model': 'component' } }),
  pattern('PART.trigger:PART', '.:', { kind: 'event-modifier', command: 'trigger', injectCommand: false }),
  pattern('PART.capture:PART', '.:', { kind: 'event-modifier', command: 'capture', injectCommand: false }),
  pattern(':PART', ':', { kind: 'fixed-command', command: 'bind', mode: 'toView' }),
  pattern('@PART', '@', { kind: 'fixed-command', command: 'trigger' }),
  pattern('@PART:PART', '@:', { kind: 'event-modifier', command: 'trigger', injectCommand: true }),
  pattern('promise.resolve', '.', { kind: 'fixed', target: 'promise', command: 'bind' }),
  pattern('then', '', { kind: 'fixed', target: 'then', command: 'from-view' }),
  pattern('catch', '', { kind: 'fixed', target: 'catch', command: 'from-view' }),
  pattern('t', '', { kind: 'fixed', target: '', command: 't' }, '@aurelia/i18n'),
  pattern('t.bind', '.', { kind: 'fixed', target: '', command: 't.bind' }, '@aurelia/i18n'),
];

// ============================================================================
// Custom Elements
// ============================================================================

export const BUILTIN_ELEMENTS: Record<string, CustomElementDef> = {
  'au-compose': element('au-compose', {
    template: bindable('template', { mode: 'toView', type: 'string | Promise<string>' }),
    component: bindable('component', { mode: 'toView', type: 'string | Constructable | object | Promise<string | Constructable | object>' }),
    model: bindable('model', { mode: 'toView' }),
    scopeBehavior: bindable('scopeBehavior', { mode: 'toView', type: "'auto' | 'scoped'" }),
    composing: bindable('composing', { mode: 'fromView', type: 'Promise<void> | void' }),
    composition: bindable('composition', { mode: 'fromView', type: 'ICompositionController | undefined' }),
    tag: bindable('tag', { mode: 'toView', type: 'string | null | undefined' }),
  }, { containerless: true, capture: true, boundary: true }),

  'au-slot': element('au-slot', {
    expose: bindable('expose', { mode: 'toView', type: 'object | null' }),
    slotchange: bindable('slotchange', { mode: 'toView', type: '((name: string, nodes: readonly Node[]) => void) | null' }),
  }, { containerless: true }),

  'au-viewport': element('au-viewport', {
    name: bindable('name', { mode: 'toView', type: 'string' }),
    usedBy: bindable('usedBy', { mode: 'toView', type: 'string' }),
    default: bindable('default', { mode: 'toView', type: 'string' }),
    fallback: bindable('fallback', { mode: 'toView', type: 'string | Constructable | ((instruction: IViewportInstruction, node: RouteNode, context: IRouteContext) => Routeable | null)' }),
  }, { boundary: true, package: '@aurelia/router' }),
};

// ============================================================================
// Custom Attributes
// ============================================================================

export const BUILTIN_ATTRIBUTES: Record<string, CustomAttributeDef> = {
  focus: attribute('focus', {
    value: bindable('value', { mode: 'twoWay', type: 'boolean', primary: true }),
  }),

  show: attribute('show', {
    value: bindable('value', { mode: 'toView', type: 'boolean', primary: true }),
  }, { aliases: ['hide'] }),

  load: attribute('load', {
    route: bindable('route', { mode: 'toView', primary: true }),
    params: bindable('params', { mode: 'toView', type: 'Params' }),
    attribute: bindable('attribute', { mode: 'toView', type: 'string' }),
    active: bindable('active', { mode: 'fromView', type: 'boolean' }),
    context: bindable('context', { mode: 'toView', type: 'IRouteContext' }),
  }, { primary: 'route', package: '@aurelia/router' }),

  href: attribute('href', {
    value: bindable('value', { mode: 'toView', primary: true }),
  }, { noMultiBindings: true, package: '@aurelia/router' }),
};

// ============================================================================
// Value Converters
// ============================================================================

function converter(
  name: string,
  opts?: { fromType?: string; toType?: string }
): ValueConverterDef {
  return {
    kind: 'value-converter',
    className: builtin(pascalCase(name) + 'ValueConverter'),
    name: builtin(name),
    ...(opts?.fromType && { fromType: builtin(opts.fromType) }),
    ...(opts?.toType && { toType: builtin(opts.toType) }),
  };
}

export const BUILTIN_VALUE_CONVERTERS: Record<string, ValueConverterDef> = {
  sanitize: converter('sanitize', { fromType: 'string', toType: 'string | null' }),
};

// ============================================================================
// Binding Behaviors
// ============================================================================

function behavior(name: string): BindingBehaviorDef {
  return {
    kind: 'binding-behavior',
    className: builtin(pascalCase(name) + 'BindingBehavior'),
    name: builtin(name),
  };
}

export const BUILTIN_BINDING_BEHAVIORS: Record<string, BindingBehaviorDef> = {
  debounce: behavior('debounce'),
  throttle: behavior('throttle'),
  signal: behavior('signal'),
  oneTime: behavior('oneTime'),
  toView: behavior('toView'),
  fromView: behavior('fromView'),
  twoWay: behavior('twoWay'),
  attr: behavior('attr'),
  self: behavior('self'),
  updateTrigger: behavior('updateTrigger'),
};

// ============================================================================
// Derived Builtins (compiler-facing configs)
// ============================================================================

export const BUILTIN_CONTROLLER_CONFIGS: Record<string, ControllerConfig> = Object.fromEntries(
  Object.entries(BUILTIN_CONTROLLERS).map(([key, def]) => [key, toControllerConfig(def)]),
);

export const BUILTIN_BINDING_COMMANDS: Record<string, BindingCommandConfig> = Object.fromEntries(
  Object.entries(BUILTIN_COMMANDS).map(([key, def]) => [key, toBindingCommandConfig(def)]),
);

export const BUILTIN_ATTRIBUTE_PATTERNS: readonly AttributePatternConfig[] =
  BUILTIN_PATTERNS.map((def) => toAttributePatternConfig(def));

// ============================================================================
// DOM Schema (static config)
// ============================================================================

const DOM: DomSchema = {
  ns: 'html',
  // HTMLElement.prototype — every element inherits these.
  base: {
    tag: '*',
    props: {
      class: { type: 'string' },
      className: { type: 'string' },
      id: { type: 'string' },
      style: { type: 'CSSStyleDeclaration' },
      title: { type: 'string' },
      hidden: { type: 'boolean' },
      tabIndex: { type: 'number' },
      dir: { type: 'string' },
      lang: { type: 'string' },
      draggable: { type: 'boolean' },
      textContent: { type: 'string' },
      innerHTML: { type: 'string' },
      scrollTop: { type: 'number' },
      scrollLeft: { type: 'number' },
    },
    attrToProp: {
      tabindex: 'tabIndex',
      contenteditable: 'contentEditable',
    },
  },
  elements: {
    input: {
      tag: 'input',
      props: {
        value: { type: 'string', mode: 'twoWay' },
        checked: { type: 'boolean', mode: 'twoWay' },
        files: { type: 'FileList | null', mode: 'twoWay' },
        valueAsNumber: { type: 'number', mode: 'twoWay' },
        valueAsDate: { type: 'Date | null', mode: 'twoWay' },
        type: { type: 'string' },
        disabled: { type: 'boolean', mode: 'toView' },
      },
      attrToProp: {
        maxlength: 'maxLength',
        minlength: 'minLength',
        formaction: 'formAction',
        formenctype: 'formEncType',
        formmethod: 'formMethod',
        formnovalidate: 'formNoValidate',
        formtarget: 'formTarget',
        inputmode: 'inputMode',
      },
    },
    textarea: {
      tag: 'textarea',
      props: {
        value: { type: 'string', mode: 'twoWay' },
        disabled: { type: 'boolean', mode: 'toView' },
      },
      attrToProp: { maxlength: 'maxLength' },
    },
    select: {
      tag: 'select',
      props: {
        value: { type: 'string | string[]', mode: 'twoWay' },
        multiple: { type: 'boolean', mode: 'toView' },
        disabled: { type: 'boolean', mode: 'toView' },
      },
    },
    option: {
      tag: 'option',
      props: {
        value: { type: 'string', mode: 'toView' },
        selected: { type: 'boolean', mode: 'twoWay' },
        disabled: { type: 'boolean', mode: 'toView' },
      },
    },
    label: {
      tag: 'label',
      props: { htmlFor: { type: 'string', mode: 'toView' } },
      attrToProp: { for: 'htmlFor' },
    },
    img: {
      tag: 'img',
      props: { useMap: { type: 'string', mode: 'toView' } },
      attrToProp: { usemap: 'useMap' },
    },
    td: {
      tag: 'td',
      props: { rowSpan: { type: 'number' }, colSpan: { type: 'number' } },
      attrToProp: { rowspan: 'rowSpan', colspan: 'colSpan' },
    },
    th: {
      tag: 'th',
      props: { rowSpan: { type: 'number' }, colSpan: { type: 'number' } },
      attrToProp: { rowspan: 'rowSpan', colspan: 'colSpan' },
    },
    div: { tag: 'div', props: {} },
    span: { tag: 'span', props: {} },
    form: { tag: 'form', props: {} },
    button: {
      tag: 'button',
      props: { disabled: { type: 'boolean', mode: 'toView' } },
    },
    template: { tag: 'template', props: {} },
  },
};

// ============================================================================
// Event Schema (static config)
// ============================================================================

const EVENTS: EventSchema = {
  byName: {
    click: 'MouseEvent',
    input: 'InputEvent',
    change: 'Event',
    submit: 'SubmitEvent',
    keydown: 'KeyboardEvent',
    keyup: 'KeyboardEvent',
    focus: 'FocusEvent',
    blur: 'FocusEvent',
  },
  byElement: {},
};

// ============================================================================
// Naming Conventions (static config)
// ============================================================================

const NAMING: Naming = {
  attrToPropGlobal: {
    accesskey: 'accessKey',
    contenteditable: 'contentEditable',
    tabindex: 'tabIndex',
    textcontent: 'textContent',
    innerhtml: 'innerHTML',
    scrolltop: 'scrollTop',
    scrollleft: 'scrollLeft',
    readonly: 'readOnly',
    outerhtml: 'outerHTML',
  },
  perTag: {
    label: { for: 'htmlFor' },
    img: { usemap: 'useMap' },
    input: {
      maxlength: 'maxLength',
      minlength: 'minLength',
      formaction: 'formAction',
      formenctype: 'formEncType',
      formmethod: 'formMethod',
      formnovalidate: 'formNoValidate',
      formtarget: 'formTarget',
      inputmode: 'inputMode',
    },
    textarea: { maxlength: 'maxLength' },
    td: { rowspan: 'rowSpan', colspan: 'colSpan' },
    th: { rowspan: 'rowSpan', colspan: 'colSpan' },
  },
  preserveAttrPrefixes: ['data-', 'aria-'],
};

// ============================================================================
// Two-Way Defaults (static config)
// ============================================================================

const TWO_WAY_DEFAULTS: TwoWayDefaults = {
  byTag: {
    input: ['value', 'files', 'valueAsNumber', 'valueAsDate', 'checked'],
    textarea: ['value'],
    select: ['value'],
  },
  globalProps: ['scrollTop', 'scrollLeft'],
  conditional: [
    { prop: 'textContent', requiresAttr: 'contenteditable' },
    { prop: 'innerHTML', requiresAttr: 'contenteditable' },
  ],
};

// ============================================================================
// Semantics Helpers
// ============================================================================

export const STUB_CONTROLLER_CONFIG: ControllerConfig = {
  name: "<unknown>",
  trigger: { kind: "marker" },
  scope: "reuse",
  props: {},
};

export function getControllerConfig(name: string): ControllerConfig | null {
  const key = name.toLowerCase();
  return BUILTIN_CONTROLLER_CONFIGS[key] ?? null;
}

export function createCustomControllerConfig(
  name: string,
  primary: string | undefined,
  bindables: Readonly<Record<string, Bindable>> = {},
): ControllerConfig {
  const prop = primary ?? Object.keys(bindables)[0] ?? "value";
  const props = { ...bindables };
  if (!props[prop]) {
    props[prop] = { name: prop };
  }
  return {
    name,
    trigger: { kind: "value", prop },
    scope: "overlay",
    cardinality: "zero-one",
    props,
  };
}

export function prepareProjectSemantics(
  sem: ProjectSemantics,
  overrides?: Partial<Pick<MaterializedSemantics, "resources" | "bindingCommands" | "attributePatterns" | "catalog">>,
): MaterializedSemantics {
  const rawResources = normalizeResourceCollections(
    overrides?.resources ?? sem.resources ?? buildResourceCollectionsFromSemantics(sem),
  );
  const resources = promoteTemplateControllerAttributes(
    rawResources,
  );
  const bindingCommands = overrides?.bindingCommands ?? sem.bindingCommands ?? buildBindingCommandConfigs(sem);
  const attributePatterns = overrides?.attributePatterns ?? sem.attributePatterns ?? buildAttributePatternConfigs(sem);
  const scopeCompleteness = sem.resourceGraph
    ? buildScopeCompletenessIndex(sem.resourceGraph)
    : (sem.catalog?.scopeCompleteness ?? {});
  const catalog = overrides?.catalog
    ?? buildResourceCatalog(
      resources,
      bindingCommands,
      attributePatterns,
      sem.catalog
        ? { gaps: sem.catalog.gaps, confidence: sem.catalog.confidence, scopeCompleteness }
        : { scopeCompleteness },
    );
  return { ...sem, resources, bindingCommands, attributePatterns, catalog };
}

function promoteTemplateControllerAttributes(resources: ResourceCollections): ResourceCollections {
  const controllers: Record<string, ControllerConfig> = { ...resources.controllers };
  for (const attr of Object.values(resources.attributes)) {
    if (!attr.isTemplateController) continue;
    const primary = attr.primary ?? Object.keys(attr.bindables)[0] ?? "value";
    const config =
      getControllerConfig(attr.name) ??
      createCustomControllerConfig(attr.name, primary, attr.bindables);
    const nameKey = attr.name.toLowerCase();
    if (!controllers[nameKey]) {
      controllers[nameKey] = config;
    }
    for (const alias of attr.aliases ?? []) {
      const aliasKey = alias.toLowerCase();
      if (!controllers[aliasKey]) {
        controllers[aliasKey] = config;
      }
    }
  }
  return { ...resources, controllers };
}

function normalizeEventType(value: TypeRef | string | undefined): TypeRef {
  if (!value) return { kind: "unknown" };
  return typeof value === "string" ? toTypeRef(value) : value;
}

export function createSemanticsLookup(sem: ProjectSemantics, opts?: SemanticsLookupOptions): SemanticsLookup {
  const base = prepareProjectSemantics(sem);
  const graph = opts?.graph ?? base.resourceGraph ?? null;
  const scope = opts?.scope ?? base.defaultScope ?? null;

  let resources = opts?.resources;
  if (!resources) {
    if (graph || scope != null) {
      resources = materializeResourcesForScope(base, graph, scope, opts?.localImports).resources;
    } else if (opts?.localImports && opts.localImports.length > 0) {
      resources = applyLocalImports(base.resources, opts.localImports);
    }
  } else if (opts?.localImports && opts.localImports.length > 0) {
    resources = applyLocalImports(resources, opts.localImports);
  }

  const semWithCaches = resources
    ? prepareProjectSemantics(
        { ...base, resourceGraph: graph ?? undefined, defaultScope: scope ?? undefined },
        { resources },
      )
    : { ...base, resourceGraph: graph ?? undefined, defaultScope: scope ?? undefined };

  const catalog = semWithCaches.catalog;
  const COMPLETE_SCOPE: ScopeCompleteness = { complete: true, unresolvedRegistrations: [] };

  const resolveScopeCompleteness = (requestedScope?: ResourceScopeId | null): ScopeCompleteness => {
    const activeScope = requestedScope ?? scope ?? graph?.root ?? null;
    if (activeScope == null) return COMPLETE_SCOPE;

    const index = catalog.scopeCompleteness ?? {};
    const target = index[activeScope];

    if (!graph || activeScope === graph.root) {
      return target ?? COMPLETE_SCOPE;
    }

    const rootCompleteness = index[graph.root];
    if (!target && !rootCompleteness) {
      return COMPLETE_SCOPE;
    }

    const unresolvedRegistrations = [
      ...(rootCompleteness?.unresolvedRegistrations ?? []),
      ...(target?.unresolvedRegistrations ?? []),
    ];
    if (unresolvedRegistrations.length === 0) {
      return COMPLETE_SCOPE;
    }
    return {
      complete: false,
      unresolvedRegistrations,
    };
  };

  return {
    sem: semWithCaches,
    resources: semWithCaches.resources,
    catalog,
    element(name: string): ElementRes | null {
      const normalized = name.toLowerCase();
      const direct = semWithCaches.resources.elements[normalized];
      if (direct) return direct;
      const byAlias = findByAlias(semWithCaches.resources.elements, normalized);
      if (byAlias) return byAlias;
      return null;
    },
    attribute(name: string): AttrRes | null {
      const normalized = name.toLowerCase();
      const direct = semWithCaches.resources.attributes[normalized];
      if (direct) return direct;
      return findByAlias(semWithCaches.resources.attributes, normalized);
    },
    controller(name: string): ControllerConfig | null {
      const normalized = name.toLowerCase();
      return semWithCaches.resources.controllers[normalized] ?? null;
    },
    domElement(tag: string) {
      const key = tag.toLowerCase();
      const base = semWithCaches.dom.base;
      const perTag = semWithCaches.dom.elements[key];
      if (!perTag) return base;
      // Merge: per-tag props/attrToProp win over base
      return {
        tag: perTag.tag,
        props: { ...base.props, ...perTag.props },
        attrToProp: { ...base.attrToProp, ...perTag.attrToProp },
      };
    },
    event(name: string, tag?: string): { name: string; type: TypeRef } {
      const key = name.toLowerCase();
      const byElement = tag ? semWithCaches.events.byElement?.[tag.toLowerCase()]?.[key] : undefined;
      const byName = semWithCaches.events.byName[key];
      const resolved = byElement ?? byName;
      return {
        name: key,
        type: normalizeEventType(resolved),
      };
    },
    hasPreservedPrefix(attr: string): boolean {
      const prefixes = semWithCaches.naming.preserveAttrPrefixes ?? [];
      for (const prefix of prefixes) {
        if (attr.startsWith(prefix)) return true;
      }
      return false;
    },
    gapsFor(kind: ResourceKind, name: string): readonly CatalogGap[] {
      const key = `${kind}:${name}`;
      return catalog.gapsByResource?.[key] ?? [];
    },
    hasGaps(kind: ResourceKind, name: string): boolean {
      const key = `${kind}:${name}`;
      const gaps = catalog.gapsByResource?.[key];
      return gaps != null && gaps.length > 0;
    },
    projectLevelGaps(): readonly CatalogGap[] {
      return catalog.projectLevelGaps ?? [];
    },
    scopeCompleteness(scopeId?: ResourceScopeId | null): ScopeCompleteness {
      return resolveScopeCompleteness(scopeId);
    },
    isScopeComplete(scopeId?: ResourceScopeId | null): boolean {
      return resolveScopeCompleteness(scopeId).complete;
    },
  };
}

export function buildTemplateSyntaxRegistry(sem: MaterializedSemantics): TemplateSyntaxRegistry {
  return {
    bindingCommands: sem.bindingCommands,
    attributePatterns: sem.attributePatterns,
    controllers: sem.resources.controllers,
  };
}

export function getBindingCommandConfig(
  name: string,
  sem: ProjectSemantics,
): BindingCommandConfig | null {
  return prepareProjectSemantics(sem).bindingCommands[name] ?? null;
}

export function isPropertyBindingCommand(
  name: string,
  sem: ProjectSemantics,
): boolean {
  return getBindingCommandConfig(name, sem)?.kind === "property";
}

export function getCommandMode(
  name: string,
  sem: ProjectSemantics,
): BindingMode | null {
  return getBindingCommandConfig(name, sem)?.mode ?? null;
}

function findByAlias<T extends { aliases?: readonly string[] }>(
  defs: Readonly<Record<string, T>>,
  name: string,
): T | null {
  for (const def of Object.values(defs)) {
    if (def.aliases?.includes(name)) return def;
  }
  return null;
}

// ============================================================================
// Builtin Semantics
// ============================================================================

const BUILTIN_RAW_SEMANTICS: ProjectSemantics = {
  controllers: BUILTIN_CONTROLLERS,
  elements: BUILTIN_ELEMENTS,
  attributes: BUILTIN_ATTRIBUTES,
  valueConverters: BUILTIN_VALUE_CONVERTERS,
  bindingBehaviors: BUILTIN_BINDING_BEHAVIORS,
  commands: BUILTIN_COMMANDS,
  patterns: BUILTIN_PATTERNS,
  dom: DOM,
  events: EVENTS,
  naming: NAMING,
  twoWayDefaults: TWO_WAY_DEFAULTS,
};

const BUILTIN_RESOURCES: ResourceCollections = {
  elements: Object.fromEntries(
    Object.entries(BUILTIN_ELEMENTS).map(([key, def]) => [key, toElementRes(def)]),
  ),
  attributes: Object.fromEntries(
    Object.entries(BUILTIN_ATTRIBUTES).map(([key, def]) => [key, toAttrRes(def)]),
  ),
  controllers: BUILTIN_CONTROLLER_CONFIGS,
  valueConverters: Object.fromEntries(
    Object.entries(BUILTIN_VALUE_CONVERTERS).map(([key, def]) => [key, toValueConverterSig(def)]),
  ),
  bindingBehaviors: Object.fromEntries(
    Object.entries(BUILTIN_BINDING_BEHAVIORS).map(([key, def]) => [key, toBindingBehaviorSig(def)]),
  ),
};

export const BUILTIN_SEMANTICS: MaterializedSemantics = {
  ...BUILTIN_RAW_SEMANTICS,
  resources: BUILTIN_RESOURCES,
  bindingCommands: BUILTIN_BINDING_COMMANDS,
  attributePatterns: BUILTIN_ATTRIBUTE_PATTERNS,
  catalog: buildResourceCatalog(BUILTIN_RESOURCES, BUILTIN_BINDING_COMMANDS, BUILTIN_ATTRIBUTE_PATTERNS),
};

export type {
  AttrRes,
  AttributePatternConfig,
  AttributePatternDef,
  Bindable,
  BindableDef,
  BindingBehaviorDef,
  BindingBehaviorSig,
  BindingCommandConfig,
  BindingCommandDef,
  BindingCommandKind,
  BindingMode,
  CatalogConfidence,
  CatalogGap,
  ControllerBranches,
  ControllerCardinality,
  ControllerConfig,
  ControllerInjects,
  ControllerName,
  ControllerPlacement,
  ControllerSemantics,
  ControllerTrigger,
  CustomAttributeDef,
  CustomElementDef,
  ElementRes,
  DomElement,
  DomProp,
  DomSchema,
  EventSchema,
  LocalImportDef,
  Naming,
  PatternInterpret,
  ResourceCatalog,
  ResourceCollections,
  ResourceDef,
  ResourceDefBase,
  ResourceGraph,
  ResourceKind,
  ResourceScope,
  ResourceScopeId,
  ScopedResources,
  ProjectSemantics,
  SemanticsLookup,
  SemanticsLookupOptions,
  MaterializedSemantics,
  SourceLocation,
  Sourced,
  Configured,
  TemplateControllerDef,
  TemplateSyntaxRegistry,
  TwoWayDefaults,
  TypeRef,
  ValueConverterDef,
  ValueConverterSig,
} from "./types.js";
