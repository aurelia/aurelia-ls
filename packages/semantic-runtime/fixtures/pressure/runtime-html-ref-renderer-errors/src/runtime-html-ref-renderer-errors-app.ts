import {
  customAttribute,
  customElement,
} from '@aurelia/runtime-html';
import template from './runtime-html-ref-renderer-errors-app.html';

@customElement({ name: 'runtime-html-ref-renderer-errors-app', template })
export class RuntimeHtmlRefRendererErrorsApp {
  elementRef: HTMLElement | null = null;
  legacyView: unknown = null;
  plainControllerRef: unknown = null;
  plainMissingRef: unknown = null;
  missingRef: unknown = null;
  attributeRef: RefProbeCustomAttribute | null = null;
  elementVmRef: RefProbeElement | null = null;
}

@customAttribute('ref-probe')
export class RefProbeCustomAttribute {}

@customElement({
  name: 'ref-probe-element',
  template: '<template></template>',
})
export class RefProbeElement {}
