import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { IssueRollupApp } from './issue-rollup-app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: IssueRollupApp,
  })
  .start();
