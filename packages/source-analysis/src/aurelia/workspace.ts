import {
  ContainerWorldRef,
  ProgramRef,
  type SourceNodeRef,
  type SymbolRef,
} from './refs.js';
import { Aurelia } from './aurelia.js';
import { Container } from './container.js';
import { Framework, type FrameworkOptions } from './framework.js';
import { Project, type ProjectOptions } from './project.js';

export interface WorkspaceOptions {
  readonly program?: ProgramRef;
  readonly framework?: Omit<FrameworkOptions, 'rootDir'> & { rootDir?: string | null };
}

// Workspace is the top-level ownership/discovery surface. It is the place to
// ask for the framework, the current project, and later any multi-project or
// app-root discovery flows that need shared runtime state.
export class Workspace {
  private frameworkValue: Framework | null = null;
  private readonly projects = new Map<string, Project>();
  private readonly programRef: ProgramRef;
  readonly rootDir: string;

  constructor(
    rootDir: string,
    options: WorkspaceOptions = {},
  ) {
    this.rootDir = rootDir;
    this.programRef = options.program
      ?? new ProgramRef(
        `program:${rootDir}`,
        rootDir,
        null,
      );

    if (options.framework?.rootDir != null) {
      this.frameworkValue = new Framework(options.framework.rootDir, {
        rootDir: options.framework.rootDir,
        packageNames: options.framework.packageNames,
        exports: options.framework.exports,
      });
    }
  }

  framework(): Framework | null {
    return this.frameworkValue;
  }

  program(): ProgramRef {
    return this.programRef;
  }

  setFramework(
    framework: Framework | null,
  ): this {
    this.frameworkValue = framework;
    return this;
  }

  createProject(
    options: ProjectOptions,
  ): Project {
    const project = new Project(
      options.rootDir,
      options.name ?? this.defaultProjectName(options.rootDir),
      options,
    );
    this.projects.set(project.rootDir, project);
    return project;
  }

  project(
    rootDir: string = this.rootDir,
  ): Project | null {
    return this.projects.get(rootDir) ?? null;
  }

  readProjects(): readonly Project[] {
    return [...this.projects.values()];
  }

  createAurelia(
    owner: SymbolRef | SourceNodeRef | null = null,
    id: string = 'root',
  ): Aurelia {
    return new Aurelia(new Container(
      new ContainerWorldRef(
        `workspace:${this.rootDir}:aurelia:${id}`,
        owner,
        null,
      ),
    ));
  }

  private defaultProjectName(
    rootDir: string,
  ): string {
    const parts = rootDir.split(/[\\/]/);
    return parts.at(-1) || '(project)';
  }
}
