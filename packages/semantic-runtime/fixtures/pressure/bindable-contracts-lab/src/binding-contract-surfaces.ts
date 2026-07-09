import { BindingMode, bindable, customAttribute, customElement } from 'aurelia';

@customAttribute({
  name: 'two-way-state',
  defaultProperty: 'data',
})
export class TwoWayState {
  @bindable({ mode: BindingMode.twoWay }) data = '';
}

@customAttribute({
  name: 'raw-hint',
  defaultProperty: 'value',
  noMultiBindings: true,
})
export class RawHint {
  @bindable value = '';
}

@customAttribute({
  name: 'implicit-state',
  defaultProperty: 'state',
})
export class ImplicitState {
  state = '';
}

@customAttribute('title')
export class TitleCustomAttribute {
  @bindable value = '';
}

class DecoratorBindableBase {
  @bindable shared = '';
}

@customElement({
  name: 'inherited-badge',
  template: '<span>${shared}:${own}</span>',
})
export class InheritedBadge extends DecoratorBindableBase {
  @bindable own = '';
}

type StaticBindableConfig = readonly (string | {
  readonly name: string;
  readonly attribute?: string;
})[];

class StaticBindableBase {
  static readonly bindables: StaticBindableConfig = ['baseStatic'];

  baseStatic = '';
}

@customElement({
  name: 'inherited-static-badge',
  template: '<span>${baseStatic}</span>',
})
export class InheritedStaticBadge extends StaticBindableBase {}

@customElement({
  name: 'nearest-static-badge',
  template: '<span>${ownStatic}</span>',
})
export class NearestStaticBadge extends StaticBindableBase {
  static override readonly bindables: StaticBindableConfig = [
    { name: 'ownStatic', attribute: 'own-static' },
  ];

  ownStatic = '';
}

class BindablePrecedenceBase {
  @bindable({ attribute: 'base-value' }) value = '';
  @bindable inheritedOnly = '';
}

@customElement({
  name: 'bindable-precedence-card',
  template: '<span>${value}:${inheritedOnly}:${staticOnly}:${definitionOnly}</span>',
  bindables: [
    { name: 'value', attribute: 'definition-value', mode: BindingMode.oneTime },
    'definitionOnly',
  ],
})
export class BindablePrecedenceCard extends BindablePrecedenceBase {
  static readonly bindables = [
    { name: 'value', attribute: 'static-value', mode: BindingMode.twoWay },
    'staticOnly',
  ];

  @bindable({ attribute: 'decorator-value', mode: BindingMode.fromView })
  override value = '';

  staticOnly = '';
  definitionOnly = '';
}

@bindable('externalValue')
@customElement({
  name: 'class-bindable-card',
  template: '<span>${externalValue}</span>',
})
export class ClassBindableCard {
  externalValue = '';
}

@customElement({
  name: 'record-card',
  template: '<span>${status}</span>',
})
export class RecordCard {
  static readonly bindables = {
    status: {
      attribute: 'status-text',
      callback: 'statusDidChange',
      mode: BindingMode.fromView,
      set: String,
    },
  };

  status = '';

  statusDidChange(): void {}
}
