import { TypeSystemOverlaySourceBuilder } from '../type-system/overlay.js';
import {
  CHECKER_DOM_EVENT_FALLBACK_TYPE_NAMES,
  CHECKER_DOM_EVENT_MAP_TYPE_NAMES,
} from '../type-system/dom-node-type.js';

export interface TemplateTypeSystemOverlayPreludeViewModel {
  readonly typeName: string;
  readonly moduleSpecifier: string;
}

export const enum TemplateTypeSystemOverlayPreludeHelperKey {
  /** Iteration source helper used by repeat.for overlay blocks. */
  Repeat = 'repeat',
  /** Resource-call helper used by value-converter overlay projection. */
  ValueConverter = 'value-converter',
  /** Listener event-map helper used by $event overlay scopes. */
  Event = 'event',
  /** Type-predicate helper used by switch/case overlay guards. */
  SwitchCase = 'switch-case',
}

export const enum TemplateTypeSystemOverlayPreludeHelperOwner {
  /** Runtime-html Repeat semantics and RepeatableHandlerResolver compatibility. */
  RepeatTemplateController = 'repeat-template-controller',
  /** Runtime value-converter materialization and useConverter-shaped toView calls. */
  RuntimeValueConverter = 'runtime-value-converter',
  /** Runtime listener binding invocation and DOM event-map lookup. */
  ListenerBinding = 'listener-binding',
  /** Runtime-html Switch/Case matching and TypeChecker equality narrowing. */
  SwitchTemplateController = 'switch-template-controller',
}

export interface TemplateTypeSystemOverlayPreludeHelper {
  readonly key: TemplateTypeSystemOverlayPreludeHelperKey;
  readonly owner: TemplateTypeSystemOverlayPreludeHelperOwner;
  readonly summary: string;
  readonly emittedNames: readonly string[];
  readonly lines: readonly string[];
}

export const templateTypeSystemOverlayPreludeHelpers: readonly TemplateTypeSystemOverlayPreludeHelper[] = [
  {
    key: TemplateTypeSystemOverlayPreludeHelperKey.Repeat,
    owner: TemplateTypeSystemOverlayPreludeHelperOwner.RepeatTemplateController,
    summary: 'Aurelia repeat.for source categories: arrays, maps, sets, numbers, nullish values, any, and unknown.',
    emittedNames: ['__au_repeat_is_any', '__au_repeat_item', '__au_repeat'],
    lines: [
      'type __au_repeat_is_any<T> = 0 extends (1 & T) ? true : false;',
      'type __au_repeat_item<T> = __au_repeat_is_any<T> extends true ? any : T extends readonly (infer U)[] ? U : T extends Map<infer K, infer V> | ReadonlyMap<infer K, infer V> ? [K, V] : T extends Set<infer U> | ReadonlySet<infer U> ? U : T extends number ? number : unknown;',
      'declare function __au_repeat<T>(value: T | null | undefined): Iterable<__au_repeat_item<NonNullable<T>>>;',
    ],
  },
  {
    key: TemplateTypeSystemOverlayPreludeHelperKey.ValueConverter,
    owner: TemplateTypeSystemOverlayPreludeHelperOwner.RuntimeValueConverter,
    summary: 'Aurelia value-converter caller-context slot and runtime-identity fallback for missing toView calls.',
    emittedNames: [
      '__au_missing_value_converter',
      '__au_value_converter_caller_context',
      '__au_value_converter_caller_context_value',
      '__au_value_converter_to_view',
    ],
    lines: [
      'declare const __au_missing_value_converter: unknown;',
      'type __au_value_converter_caller_context = { readonly source?: unknown; readonly binding: unknown };',
      'declare const __au_value_converter_caller_context_value: __au_value_converter_caller_context;',
      'declare function __au_value_converter_to_view<V>(converter: unknown, value: V, ...args: readonly unknown[]): V;',
    ],
  },
  {
    key: TemplateTypeSystemOverlayPreludeHelperKey.Event,
    owner: TemplateTypeSystemOverlayPreludeHelperOwner.ListenerBinding,
    summary: 'Aurelia listener $event event-map lookup for generated listener scope layers.',
    emittedNames: ['__au_event'],
    lines: [templateTypeSystemOverlayDomEventHelperLine()],
  },
  {
    key: TemplateTypeSystemOverlayPreludeHelperKey.SwitchCase,
    owner: TemplateTypeSystemOverlayPreludeHelperOwner.SwitchTemplateController,
    summary: 'Aurelia switch/case branch predicates: scalar cases compare by strict equality and array cases use includes.',
    emittedNames: ['__au_switch_case'],
    lines: [
      'declare function __au_switch_case<T, const C extends readonly unknown[]>(value: T, match: C): value is T & C[number];',
      'declare function __au_switch_case<T, C>(value: T, match: C): value is T & C;',
    ],
  },
];

export function appendTemplateTypeSystemOverlayPrelude(
  builder: TypeSystemOverlaySourceBuilder,
  viewModel: TemplateTypeSystemOverlayPreludeViewModel,
): void {
  builder
    .appendLine(`import type { ${viewModel.typeName} as ViewModel } from '${viewModel.moduleSpecifier}';`)
    .appendLine('declare const $vm: ViewModel;');
  for (const helper of templateTypeSystemOverlayPreludeHelpers) {
    appendPreludeHelper(builder, helper);
  }
  builder
    .appendLine('function __au_template(this: ViewModel): void {')
    .appendLine('const $this = this;')
    .appendLine();
}

function appendPreludeHelper(
  builder: TypeSystemOverlaySourceBuilder,
  helper: TemplateTypeSystemOverlayPreludeHelper,
): void {
  if (helper.lines.length === 0) {
    return;
  }
  for (const line of helper.lines) {
    builder.appendLine(line);
  }
}

function templateTypeSystemOverlayDomEventHelperLine(): string {
  const [fallback] = CHECKER_DOM_EVENT_FALLBACK_TYPE_NAMES;
  const clauses = CHECKER_DOM_EVENT_MAP_TYPE_NAMES
    .map((mapName) => `K extends keyof ${mapName} ? ${mapName}[K]`)
    .join(' : ');
  return `type __au_event<K extends string> = ${clauses} : ${fallback};`;
}
