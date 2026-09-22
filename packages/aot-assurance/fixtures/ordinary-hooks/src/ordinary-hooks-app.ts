import { customElement } from 'aurelia';
import { OrdinaryTabs } from './ordinary-tabs.js';
import template from './ordinary-hooks-app.html';

@customElement({ name: 'ordinary-hooks-app', template, dependencies: [OrdinaryTabs] })
export class OrdinaryHooksApp {
  message = 'alpha';
  visible = true;
  groups = [{ id: 'first', name: 'First' }];
  items = ['one', 'two'];
  selected = '';

  addGroup(): void { this.groups.push({ id: 'second', name: 'Second' }); }
  reorder(): void { this.groups.reverse(); }
  removeLast(): void { this.groups.pop(); }
  addRow(): void { this.items.push('three'); }
  choose(id: string): void { this.selected = id; }
}
