import { route } from '@aurelia/router';
import { ProjectListRoute } from './routes/project-list-route';
import { ProjectDetailRoute } from './routes/project-detail-route';
import { MilestoneListRoute } from './routes/milestone-list-route';
import { MilestoneDetailRoute } from './routes/milestone-detail-route';
import { TaskItemListRoute } from './routes/task-item-list-route';
import { TaskItemDetailRoute } from './routes/task-item-detail-route';
import { ReviewItemListRoute } from './routes/review-item-list-route';
import { ReviewItemDetailRoute } from './routes/review-item-detail-route';

@route({
  title: 'Project Milestone Hub',
  routes: [
    {
      path: '',
      redirectTo: 'projects',
    },
    {
      id: 'projects',
      path: 'projects',
      component: ProjectListRoute,
      title: 'Projects',
      viewport: 'main',
      routes: [
        {
          id: 'project-detail',
          path: ':projectId',
          component: ProjectDetailRoute,
          title: 'Project Detail',
          viewport: 'detail',
        },
      ],
    },
    {
      id: 'milestones',
      path: 'milestones',
      component: MilestoneListRoute,
      title: 'Milestones',
      viewport: 'main',
      routes: [
        {
          id: 'milestone-detail',
          path: ':milestoneId',
          component: MilestoneDetailRoute,
          title: 'Milestone Detail',
          viewport: 'detail',
        },
      ],
    },
    {
      id: 'taskItems',
      path: 'assignments',
      component: TaskItemListRoute,
      title: 'Assignments',
      viewport: 'main',
      routes: [
        {
          id: 'task-item-detail',
          path: ':taskId',
          component: TaskItemDetailRoute,
          title: 'Assignment Detail',
          viewport: 'detail',
        },
      ],
    },
    {
      id: 'reviewItems',
      path: 'reviews',
      component: ReviewItemListRoute,
      title: 'Reviews',
      viewport: 'main',
      routes: [
        {
          id: 'review-item-detail',
          path: ':reviewId',
          component: ReviewItemDetailRoute,
          title: 'Review Detail',
          viewport: 'detail',
        },
      ],
    },
  ],
})
export class MyApp {}