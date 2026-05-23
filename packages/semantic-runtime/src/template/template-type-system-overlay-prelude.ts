import { TypeSystemOverlaySourceBuilder } from '../type-system/overlay.js';

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
    summary: 'Aurelia repeat.for source categories: arrays, sets, maps, numbers, nullish values, and open values.',
    emittedNames: ['__au_repeat'],
    lines: [
      'declare function __au_repeat<T>(value: readonly T[] | null | undefined): Iterable<T>;',
      'declare function __au_repeat<T>(value: Set<T> | ReadonlySet<T> | null | undefined): Iterable<T>;',
      'declare function __au_repeat<K, V>(value: Map<K, V> | ReadonlyMap<K, V> | null | undefined): Iterable<[K, V]>;',
      'declare function __au_repeat(value: number | null | undefined): Iterable<number>;',
      'declare function __au_repeat(value: any): Iterable<any>;',
    ],
  },
  {
    key: TemplateTypeSystemOverlayPreludeHelperKey.ValueConverter,
    owner: TemplateTypeSystemOverlayPreludeHelperOwner.RuntimeValueConverter,
    summary: 'Aurelia useConverter-shaped toView call surface with withContext argument insertion.',
    emittedNames: [
      '__au_missing_value_converter',
      '__au_value_converter_caller_context',
      '__au_value_converter_to_view_args',
      '__au_value_converter_to_view_result',
      '__au_value_converter_to_view',
    ],
    lines: [
      'declare const __au_missing_value_converter: unknown;',
      'type __au_value_converter_caller_context = { readonly source?: unknown; readonly binding: unknown };',
      'type __au_value_converter_to_view_args<C, V, A extends readonly unknown[]> = C extends { withContext: true } ? C extends { toView(value: V, caller: __au_value_converter_caller_context, ...args: infer P): unknown } ? P : C extends { toView: unknown } ? never : A : C extends { toView(value: V, ...args: infer P): unknown } ? P : A;',
      'type __au_value_converter_to_view_result<C, V> = C extends { withContext: true } ? C extends { toView(value: V, caller: __au_value_converter_caller_context, ...args: any): infer R } ? R : V : C extends { toView(value: V, ...args: any): infer R } ? R : V;',
      'declare function __au_value_converter_to_view<C, V, A extends readonly unknown[]>(converter: C, value: V, ...args: __au_value_converter_to_view_args<C, V, A>): __au_value_converter_to_view_result<C, V>;',
    ],
  },
  {
    key: TemplateTypeSystemOverlayPreludeHelperKey.Event,
    owner: TemplateTypeSystemOverlayPreludeHelperOwner.ListenerBinding,
    summary: 'Aurelia listener $event event-map lookup for generated listener scope layers.',
    emittedNames: ['__au_event'],
    lines: [
      'type __au_event<K extends string> = K extends keyof GlobalEventHandlersEventMap ? GlobalEventHandlersEventMap[K] : K extends keyof HTMLElementEventMap ? HTMLElementEventMap[K] : CustomEvent;',
    ],
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
