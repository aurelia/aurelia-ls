import { bindable, customElement } from '@aurelia/runtime-html';
import template from './tree-node.html';

@customElement({
  name: 'tree-node',
  template,
})
export class TreeNode {
  @bindable nodeId = '';

  get childId(): string {
    return this.nodeId === '' ? '' : `${this.nodeId}-child`;
  }
}
