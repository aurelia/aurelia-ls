import {
  customElement,
  INode,
} from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';

@customElement({
  name: 'ref-panel',
  template: '<button type="button" click.trigger="save()">Save</button>',
})
export class RefPanel {
  private readonly host = resolve(INode) as HTMLElement;

  save(): void {
    this.host.dispatchEvent(new CustomEvent('saved', {
      bubbles: true,
      detail: { id: 'panel' },
    }));
  }
}
