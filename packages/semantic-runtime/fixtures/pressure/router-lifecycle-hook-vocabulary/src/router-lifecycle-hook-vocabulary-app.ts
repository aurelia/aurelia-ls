import { customElement } from '@aurelia/runtime-html';
import { route } from '@aurelia/router';
import { HookRoute } from './routes/hook-route';
import template from './router-lifecycle-hook-vocabulary-app.html';

@customElement({
  name: 'router-lifecycle-hook-vocabulary-app',
  template,
})
@route({
  routes: [
    {
      id: 'hook-route',
      path: 'hook-route',
      component: HookRoute,
    },
  ],
})
export class RouterLifecycleHookVocabularyApp {}
