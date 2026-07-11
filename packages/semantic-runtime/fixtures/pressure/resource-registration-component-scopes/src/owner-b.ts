import { customElement } from 'aurelia';
import template from './owner-b.html';
import { BOnly } from './resources';

@customElement({ name: 'owner-b', template, dependencies: [BOnly] })
export class OwnerB {}
