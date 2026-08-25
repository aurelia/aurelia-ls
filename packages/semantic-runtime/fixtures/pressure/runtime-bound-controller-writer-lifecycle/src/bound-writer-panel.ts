import { bindable, customElement, valueConverter } from '@aurelia/runtime-html';
import template from './bound-writer-panel.html';

@valueConverter('writerLabel')
export class ChildWriterLabelValueConverter {
  toView(value: string): string {
    return `child:${value}`;
  }
}

@customElement({
  name: 'bound-writer-panel',
  template,
  dependencies: [ChildWriterLabelValueConverter],
})
export class BoundWriterPanel {
  @bindable value = '';
  @bindable interpolated = '';
  @bindable converted = '';
  @bindable blocked = '';
  @bindable fromView = '';
  @bindable marker: string | number = '';
  @bindable oneTimeThenLive = '';
  @bindable liveThenOneTime = '';
  @bindable oneTimeOnly = '';
  @bindable spreadValue: string = '';
  @bindable spreadMissing: string = 'child-default';
  @bindable spreadFallback: string = 'child-fallback';
}
