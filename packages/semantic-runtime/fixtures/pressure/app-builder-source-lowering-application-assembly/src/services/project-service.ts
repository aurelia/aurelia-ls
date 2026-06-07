import { Project } from '../project';

export class ProjectService {
  private readonly projects: Project[] = [
    new Project(1, 'Platform refresh', 'Planning'),
    new Project(2, 'Docs cleanup', 'Active'),
  ];

  async listProjects(): Promise<readonly Project[]> {
    return this.projects;
  }

  async findProject(id: string): Promise<Project | null> {
    return this.projects.find((project) => String(project.id) === id) ?? null;
  }
}
