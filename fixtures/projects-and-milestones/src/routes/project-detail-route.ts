import { resolve } from 'aurelia';
import { IRouteContext } from '@aurelia/router';
import { ProjectBrowseState } from '../project-browse-state';
import { Project } from '../project';

export class ProjectDetailRoute {
  readonly state = resolve(ProjectBrowseState);
  readonly projectId = resolve(IRouteContext).getRouteParameters<{
    projectId: string;
  }>().projectId;

  get project(): Project | null {
    return this.state.findProject(this.projectId);
  }
}
