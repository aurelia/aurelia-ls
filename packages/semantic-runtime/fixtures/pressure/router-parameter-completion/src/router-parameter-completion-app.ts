import { route } from '@aurelia/router';
import { customElement } from '@aurelia/runtime-html';
import { ParameterWorkspace } from './routes/parameter-workspace';
import template from './router-parameter-completion-app.html';

@route({
  routes: [
    {
      id: 'workspace',
      path: 'workspace',
      component: ParameterWorkspace,
    },
  ],
})
@customElement({ name: 'router-parameter-completion-app', template })
export class RouterParameterCompletionApp {}
