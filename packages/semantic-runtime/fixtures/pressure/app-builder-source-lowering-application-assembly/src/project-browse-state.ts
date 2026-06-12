import { resolve } from 'aurelia';
import { Project } from './project';
import { ProjectService } from './services/project-service';

export class ProjectBrowseState {
  private readonly projectService = resolve(ProjectService);

  listProjects(): Promise<readonly Project[]> {
    return this.projectService.listProjects();
  }

  findProject(id: string): Promise<Project | null> {
    return this.projectService.findProject(id);
  }
}
