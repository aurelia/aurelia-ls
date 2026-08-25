import { customElement } from 'aurelia';
import { ActiveState } from './active-state';
import {
  BindablePrecedenceCard,
  ClassBindableCard,
  ImplicitState,
  InheritedBadge,
  InheritedStaticBadge,
  NearestStaticBadge,
  RawHint,
  RecordCard,
  TitleCustomAttribute,
  TwoWayState,
} from './binding-contract-surfaces';
import { DisplayHint } from './display-hint';
import { ProfileCard } from './profile-card';
import { StaticCard } from './static-card';
import template from './bindable-lab-app.html';

@customElement({
  name: 'bindable-lab-app',
  template,
  dependencies: [
    ActiveState,
    BindablePrecedenceCard,
    ClassBindableCard,
    DisplayHint,
    ImplicitState,
    InheritedBadge,
    InheritedStaticBadge,
    NearestStaticBadge,
    ProfileCard,
    RawHint,
    RecordCard,
    StaticCard,
    TitleCustomAttribute,
    TwoWayState,
  ],
})
export class BindableLabApp {
  titleText = 'Bindable Lab';
  aliasLabel = 'Public Label';
  selectedId = 'profile-1';
  count = 1;
  quantity = 3;
  strictQuantity = 4;
  normalizedLabel = '  Normalized  ';
  stringifiedLabel = 'Stringified';
  summaryText = 'Summary';
  statusMessage = 'Ready';
  accentTone = 'warm';
  headline = 'Static Headline';
  subtitle = 'Static Subtitle';
  isActive = true;
  twoWayValue = 'two-way';
  implicitValue = 'implicit';
  inheritedShared = 'shared';
  inheritedOwn = 'own';
  inheritedStatic = 'static-base';
  ownStatic = 'nearest';
  precedenceValue = 'definition-wins';
  precedenceInherited = 'decorator-inherited';
  precedenceStatic = 'static-only';
  precedenceDefinition = 'definition-only';
  externalValue = 'class-level';
  recordStatus = 'record';

  handleAction(value: string): void {
    this.statusMessage = value;
  }
}
