import { route } from '@aurelia/router';
import { TaskItemListRoute } from './routes/task-item-list-route';
import { TaskItemDetailRoute } from './routes/task-item-detail-route';

@route({
  title: 'Task Service Object Reviewers Table Browser',
  routes: [
    {
      path: '',
      redirectTo: 'task-service-object-reviewers',
    },
    {
      id: 'taskItems',
      path: 'task-service-object-reviewers',
      component: TaskItemListRoute,
      title: 'Tasks',
      viewport: 'main',
      routes: [
        {
          id: 'task-item-detail',
          path: ':taskId',
          component: TaskItemDetailRoute,
          title: 'Task Detail',
          viewport: 'detail',
        },
      ],
    },
  ],
})
export class MyApp {}