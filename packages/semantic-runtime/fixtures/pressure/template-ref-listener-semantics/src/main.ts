import {
  AppTask,
  Aurelia,
  IKeyMapping,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import { TemplateRefListenerSemanticsApp } from './template-ref-listener-semantics-app';

new Aurelia()
  .register(
    StandardConfiguration,
    AppTask.creating(IKeyMapping, (mapping) => {
      mapping.keys['upper_k'] = 'K';
      mapping.keys[document.documentElement.dataset.runtimeModifier!] = 'runtime';
    }),
  )
  .app({
    host: document.body,
    component: TemplateRefListenerSemanticsApp,
  })
  .start();
