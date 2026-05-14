import {
  bindable,
  children,
  customElement,
  processContent,
  slotted,
  watch,
} from '@aurelia/runtime-html';

@customElement({
  name: 'array-backed-bindable-observer',
  template: '<template></template>',
  bindables: [{ name: 'length', type: Number }],
})
export class ArrayBackedBindableObserver extends Array<unknown> {
  lengthChanged(): void {}
}

@watch(null as unknown as string, 'nameChanged')
@watch('name', 'missingPrototypeHandler')
@customElement({
  name: 'resource-metadata-errors-app',
  template: '<template><input value.bind="name"><array-backed-bindable-observer></array-backed-bindable-observer></template>',
  dependencies: [ArrayBackedBindableObserver],
})
export class ResourceMetadataErrorsApp {
  static watches = [
    { expression: 'name', callback: 'missingStaticWatchHandler', flush: 'sync' as const },
    { expression: 'name', callback: 'nonCallableStaticWatchHandler', flush: 'async' as const },
  ];

  name = '';
  nonCallableStaticWatchHandler = 'not callable';

  nameChanged(): void {}

  @watch('name')
  fieldWatcher = 'not a method';

  @watch('name')
  static staticWatcher(): void {}
}

@customElement({
  name: 'containerless-shadow-conflict',
  template: '<template>shadow conflict</template>',
  containerless: true,
  shadowOptions: { mode: 'open' },
})
export class ContainerlessShadowConflict {}

@customElement({
  name: 'containerless-slot-conflict',
  template: '<template><slot></slot></template>',
  containerless: true,
  hasSlots: true,
})
export class ContainerlessSlotConflict {}

@bindable(null as unknown as { name: string })
@customElement({
  name: 'invalid-bindable-null-config',
  template: '<template></template>',
})
export class InvalidBindableNullConfig {}

@bindable({})
@customElement({
  name: 'invalid-bindable-missing-name',
  template: '<template></template>',
})
export class InvalidBindableMissingName {}

@bindable({ name: 0 as unknown as string })
@customElement({
  name: 'invalid-bindable-symbol-name',
  template: '<template></template>',
})
export class InvalidBindableSymbolName {}

@customElement({
  name: 'invalid-member-bindable-symbol',
  template: '<template></template>',
})
export class InvalidMemberBindableSymbol {
  @bindable
  [Symbol.for('semantic-runtime.invalid-bindable-name')] = '';
}

@processContent('missingProcessContent')
@customElement({
  name: 'invalid-process-content-class-hook',
  template: '<template></template>',
})
export class InvalidProcessContentClassHook {}

@customElement({
  name: 'invalid-process-content-method-hook',
  template: '<template></template>',
})
export class InvalidProcessContentMethodHook {
  @processContent()
  processContent(): void {}
}

@customElement({
  name: 'invalid-children-query',
  template: '<template></template>',
})
export class InvalidChildrenQuery {
  @children({ query: 'article > section' })
  childSections: unknown[] = [];
}

@customElement({
  name: 'invalid-slotted-target',
  template: '<template><au-slot></au-slot></template>',
})
export class InvalidSlottedTarget {
  @slotted()
  projectedNodes(): void {}
}
