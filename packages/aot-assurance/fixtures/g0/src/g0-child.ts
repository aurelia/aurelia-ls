/* global HTMLElement */

import { INode, resolve } from 'aurelia';

export class G0Child {
  public static bindables = ['label'];

  public label = '';
  private readonly host = resolve(INode) as HTMLElement;

  public activate(): void {
    this.host.dispatchEvent(new CustomEvent('child-change', {
      bubbles: true,
      detail: this.label,
    }));
  }
}
