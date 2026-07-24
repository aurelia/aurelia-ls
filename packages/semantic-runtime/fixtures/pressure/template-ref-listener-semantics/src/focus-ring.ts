import {
  customAttribute,
  INode,
} from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';

@customAttribute({
  name: 'focus-ring',
  aliases: ['focus'],
})
export class FocusRing {
  private readonly element = resolve(INode) as HTMLElement;

  binding(): void {
    this.element.dataset['focusRing'] = 'active';
  }

  unbinding(): void {
    delete this.element.dataset['focusRing'];
  }
}
