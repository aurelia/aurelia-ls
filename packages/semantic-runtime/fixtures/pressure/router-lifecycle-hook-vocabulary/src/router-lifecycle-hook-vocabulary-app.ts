import { customElement } from '@aurelia/runtime-html';
import { route } from '@aurelia/router';
import { DeclaredRouteLike } from './declared-route-like';
import { OrdinaryPanel } from './ordinary-panel';
import { DuckRoute } from './routes/duck-route';
import { HookRoute } from './routes/hook-route';
import template from './router-lifecycle-hook-vocabulary-app.html';

@customElement({
  name: 'router-lifecycle-hook-vocabulary-app',
  template,
  dependencies: [DeclaredRouteLike, OrdinaryPanel],
})
@route({
  routes: [
    {
      id: 'hook-route',
      path: 'hook-route',
      component: HookRoute,
    },
    {
      id: 'duck-route',
      path: 'duck-route',
      component: DuckRoute,
    },
  ],
})
export class RouterLifecycleHookVocabularyApp {}
