import { customElement } from 'aurelia';

@customElement({
  name: 'projection-lab',
  template: '<section id="projection-first"><au-slot name="first"></au-slot></section><section id="projection-second"><au-slot name="second"></au-slot></section>',
})
export class ProjectionLab {}
