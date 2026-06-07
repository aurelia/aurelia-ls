import { resolve } from 'aurelia';
import { ProjectBrowseState } from '../project-browse-state';

export class ProjectListRoute {
  readonly state = resolve(ProjectBrowseState);

  projectsPromise: ReturnType<ProjectBrowseState['listProjects']> = this.state.listProjects();
}