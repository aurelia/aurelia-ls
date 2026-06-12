import { route } from '@aurelia/router';
import { ProjectListRoute } from './routes/project-list-route';
import { ProjectDetailRoute } from './routes/project-detail-route';
import { MilestoneListRoute } from './routes/milestone-list-route';
import { MilestoneDetailRoute } from './routes/milestone-detail-route';

@route({
  title: 'Aurelia Source Gallery Assembly Gallery',
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
  ],
})
export class MyApp {}