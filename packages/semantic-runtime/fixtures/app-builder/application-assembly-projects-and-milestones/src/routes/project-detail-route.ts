import { resolve } from 'aurelia';
import { IRouteContext } from '@aurelia/router';
import { ProjectBrowseState } from '../project-browse-state';
import { Project } from '../project';

export class ProjectDetailRoute {
  readonly state = resolve(ProjectBrowseState);
  readonly routeParams = resolve(IRouteContext).getRouteParameters<{
    projectId: string;
  }>();

  get project(): Project | null {
    return this.state.findProject(this.routeParams.projectId);
  }
}