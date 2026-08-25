import { customElement } from 'aurelia';
import { ChildHost } from './child-host';
import template from './owner-a.html';
import { AOnly, OwnerAScopeCard } from './resources';

@customElement({
  name: 'owner-a',
  template,
  dependencies: [OwnerAScopeCard, AOnly, ChildHost],
})
export class OwnerA {}
