import { resolve } from 'aurelia';
import { IRouteContext } from '@aurelia/router';
import { ProjectBrowseState } from '../project-browse-state';

export class ProjectDetailRoute {
  readonly state = resolve(ProjectBrowseState);
  readonly routeParams = resolve(IRouteContext).getRouteParameters<{
    projectId: string;
  }>();
  readonly projectPromise: ReturnType<ProjectBrowseState['findProject']> = this.state.findProject(this.routeParams.projectId);
}