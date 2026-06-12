import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { RecursiveCustomElementApp } from './app';
import { TreeNode } from './tree-node';

new Aurelia()
  .register(StandardConfiguration, TreeNode)
  .app({
    host: document.querySelector('recursive-custom-elements') ?? document.body,
    component: RecursiveCustomElementApp,
  })
  .start();
