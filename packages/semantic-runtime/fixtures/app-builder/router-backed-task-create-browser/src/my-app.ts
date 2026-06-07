import { route } from '@aurelia/router';
import { TaskItemListRoute } from './routes/task-item-list-route';
import { TaskItemDetailRoute } from './routes/task-item-detail-route';

@route({
  title: 'Task Create Browser',
  routes: [
    {
      path: '',
      redirectTo: 'task-create',
    },
    {
      id: 'taskItems',
      path: 'task-create',
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