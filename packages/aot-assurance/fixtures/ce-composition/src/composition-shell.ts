import { customElement } from '@aurelia/runtime-html';
import { ReceivingComposeWidget } from './receiving-compose-widget.js';
import template from './composition-shell.html';

@customElement({ name: 'composition-shell', template, dependencies: [ReceivingComposeWidget] })
export class CompositionShell {
  readonly message = 'receiver-owned message';
  readonly receivingTitle = 'receiver-owned title';
}
