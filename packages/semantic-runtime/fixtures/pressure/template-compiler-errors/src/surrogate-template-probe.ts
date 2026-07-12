import { customElement } from '@aurelia/runtime-html';
import template from './surrogate-template-probe.html';

@customElement({ name: 'surrogate-template-probe', template })
export class SurrogateTemplateProbe {
  enabled = true;
}
