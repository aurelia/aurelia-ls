import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { TemplateAnalysisBreadthCycleApp } from './template-analysis-breadth-cycle-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.querySelector('template-analysis-breadth-cycle') ?? document.body,
    component: TemplateAnalysisBreadthCycleApp,
  })
  .start();
