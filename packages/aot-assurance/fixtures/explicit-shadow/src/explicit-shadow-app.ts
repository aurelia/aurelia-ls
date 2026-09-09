import { customElement } from 'aurelia';
import template from './explicit-shadow-app.html';
import { ShadowCard } from './shadow-card.js';

@customElement({ name: 'explicit-shadow-app', template, dependencies: [ShadowCard] })
export class ExplicitShadowApp {
  message = 'alpha';
  suffix = 'omega';
  lightVisible = true;
  projectionVisible = true;
  showConditional = true;
  items = ['one', 'two'];
  actions = ['accept', 'cancel'];
  selectedAction = '';
  cards = [{ id: 'first', label: 'First' }, { id: 'second', label: 'Second' }];

  select(action: string): void { this.selectedAction = action; }

  reorder(): void {
    this.items.reverse();
    this.items.push('three');
    this.actions.reverse();
    this.cards.reverse();
  }

  remove(): void { this.cards.splice(0, 1); }
  append(): void { this.cards.push({ id: 'third', label: 'Third' }); }
}
