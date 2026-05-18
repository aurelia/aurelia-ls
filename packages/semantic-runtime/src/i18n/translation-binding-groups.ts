import type {
  ProductHandle,
} from '../kernel/handles.js';
import {
  TranslationBinding,
} from '../template/runtime-binding.js';
import type {
  RuntimeRenderingEmission,
} from '../template/runtime-rendering-materializer.js';

/** Target-element group that Aurelia i18n joins through TranslationBinding.useParameter(...). */
export class I18nTranslationBindingGroup {
  constructor(
    readonly groupKey: string,
    readonly bindings: readonly TranslationBinding[],
    readonly keyBindings: readonly TranslationBinding[],
    readonly parameterBindings: readonly TranslationBinding[],
  ) {}

  get firstBinding(): TranslationBinding {
    return this.keyBindings[0] ?? this.parameterBindings[0] ?? this.bindings[0]!;
  }
}

export function i18nTranslationBindingGroups(
  runtimeRendering: RuntimeRenderingEmission,
): readonly I18nTranslationBindingGroup[] {
  const groups = new Map<string, TranslationBinding[]>();
  for (const binding of runtimeRendering.bindings) {
    if (!(binding instanceof TranslationBinding)) {
      continue;
    }
    const key = i18nTranslationBindingTargetGroupKey(runtimeRendering, binding);
    let bindings = groups.get(key);
    if (bindings === undefined) {
      bindings = [];
      groups.set(key, bindings);
    }
    bindings.push(binding);
  }
  return [...groups.entries()].map(([groupKey, bindings]) => {
    const keyBindings = bindings.filter((binding) => !binding.isParameterContext);
    const parameterBindings = bindings.filter((binding) => binding.isParameterContext);
    return new I18nTranslationBindingGroup(groupKey, bindings, keyBindings, parameterBindings);
  });
}

function i18nTranslationBindingTargetGroupKey(
  runtimeRendering: RuntimeRenderingEmission,
  binding: TranslationBinding,
): string {
  const renderContext = runtimeRendering.readRenderContextForBinding(binding.productHandle);
  return [
    renderContext?.targetController.productHandle ?? 'no-target-controller',
    binding.node.productHandle ?? 'no-node',
  ].join(':');
}

export function i18nTranslationBindingGroupProductHandles(
  group: I18nTranslationBindingGroup,
): readonly ProductHandle[] {
  return group.bindings.map((binding) => binding.productHandle);
}
