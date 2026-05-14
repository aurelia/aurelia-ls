import {
  customAttribute,
  customElement,
} from '@aurelia/runtime-html';

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
