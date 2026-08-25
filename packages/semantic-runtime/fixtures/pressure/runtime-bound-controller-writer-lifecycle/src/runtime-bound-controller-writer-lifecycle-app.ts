import { customElement, valueConverter } from '@aurelia/runtime-html';
import { BoundWriterPanel } from './bound-writer-panel';
import template from './runtime-bound-controller-writer-lifecycle-app.html';

@valueConverter('writerLabel')
export class ParentWriterLabelValueConverter {
  toView(value: string): string {
    return `parent:${value}`;
  }
}

@customElement({
  name: 'runtime-bound-controller-writer-lifecycle-app',
  template,
  dependencies: [BoundWriterPanel, ParentWriterLabelValueConverter],
})
export class RuntimeBoundControllerWriterLifecycleApp {
  readonly firstValue: string = 'first';
  readonly secondValue = 'second';
  readonly spreadValues: { spreadValue: string } = {
    spreadValue: 'spread-value',
  };
  fromViewSink = '';
}
