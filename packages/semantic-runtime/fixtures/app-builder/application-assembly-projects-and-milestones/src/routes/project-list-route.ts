import { resolve } from 'aurelia';
import { ProjectBrowseState } from '../project-browse-state';

export class ProjectListRoute {
  readonly state = resolve(ProjectBrowseState);

  name: string = '';
  phase: string = '';

  createProject() {
    this.state.createProject(this.name, this.phase);
  }
}