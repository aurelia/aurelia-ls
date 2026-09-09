import { customElement } from 'aurelia';
import { AttributeLab } from './attribute-lab.js';
import { AttributeCard } from './attribute-card.js';
import { Stamp } from './stamp.js';
import template from './content-attributes-app.html';

@customElement({ name: 'content-attributes-app', template, dependencies: [AttributeLab, AttributeCard, Stamp] })
export class ContentAttributesApp {
  message = 'alpha';
  discarded = 'discarded-must-not-survive';
  active = true;
  items = ['one', 'two'];
  multiple = true;
  selected = ['b'];
  append(): void { this.items.push('three'); }
}
