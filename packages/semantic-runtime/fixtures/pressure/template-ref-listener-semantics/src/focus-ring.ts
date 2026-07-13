import {
  customAttribute,
  INode,
} from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';

@customAttribute('focus-ring')
export class FocusRing {
  private readonly element = resolve(INode) as HTMLElement;

  binding(): void {
    this.element.dataset['focusRing'] = 'active';
  }

  unbinding(): void {
    delete this.element.dataset['focusRing'];
  }
}
