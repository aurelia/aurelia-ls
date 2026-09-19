import { customElement } from 'aurelia';
import { MoveLab } from './move-lab.js';
import { MoveCard } from './move-card.js';
import { Stamp } from './stamp.js';
import template from './content-moves-app.html';

@customElement({ name: 'content-moves-app', template, dependencies: [MoveLab, MoveCard, Stamp] })
export class ContentMovesApp {
  message = 'alpha';
  active = true;
  items = ['one', 'two'];
  append(): void { this.items.push('three'); }
}
