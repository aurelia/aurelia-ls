import { route } from '@aurelia/router';
import { customElement } from '@aurelia/runtime-html';
import template from './null-config-route.html';

@route(null as unknown as never)
@customElement({ name: 'null-config-route', template })
export class NullConfigRoute {}
