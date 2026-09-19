import { customElement } from 'aurelia';

@customElement({
  name: 'move-card',
  template: '<strong class="card-value">card:${value}</strong><header><au-slot name="title"><i class="title-fallback">untitled</i></au-slot></header><main><au-slot name="body"></au-slot></main>',
  bindables: ['value'],
})
export class MoveCard {
  value = '';
}
