import type { AureliaPatternExample } from '../pattern-contract.js';

export const dialogConfirmEditPattern: AureliaPatternExample = {
  patternId: 'dialog.confirm-edit',
  title: 'Dialog confirm and edit flow',
  guidance: {
    summary: 'Use @aurelia/dialog for modal confirm or edit workflows instead of hand-rolling modal behavior with portal markup.',
    whenToUse: [
      'A user action needs a modal confirmation or an edit form that returns a result.',
      'The dialog should use the native dialog-backed standard renderer.',
      'The opener should await the dialog close result before mutating page state.'
    ],
    whenNotToUse: [
      'The content is only a non-blocking toast, status region, or notification overlay.',
      'The interaction can stay inline on the page without modal focus management.',
      'The app needs a custom design-system dialog service with its own renderer policy.'
    ]
  },
  source: {
    files: [
      {
        path: 'main.ts',
        language: 'ts',
        contents: `import Aurelia from 'aurelia';
import { DialogConfigurationStandard } from '@aurelia/dialog';
import { ProjectList } from './project-list';

void Aurelia
  .register(DialogConfigurationStandard)
  .app(ProjectList)
  .start();
`
      },
      {
        path: 'project-dialog-service.ts',
        language: 'ts',
        contents: `import { DI, resolve } from 'aurelia';
import {
  IDialogService,
  type DialogCloseResult
} from '@aurelia/dialog';
import { ConfirmDeleteDialog } from './confirm-delete-dialog';
import { RenameProjectDialog } from './rename-project-dialog';

export interface RenameProjectModel {
  id: string;
  name: string;
}

export class ProjectDialogService {
  private readonly dialogs = resolve(IDialogService);

  async confirmDelete(projectName: string): Promise<boolean> {
    const { dialog } = await this.dialogs.open({
      component: () => ConfirmDeleteDialog,
      model: { projectName }
    });
    const result = await dialog.closed;
    return result.status === 'ok';
  }

  async renameProject(model: RenameProjectModel): Promise<string | undefined> {
    const { dialog } = await this.dialogs.open({
      component: () => RenameProjectDialog,
      model
    });
    const result: DialogCloseResult = await dialog.closed;
    return result.status === 'ok' && typeof result.value === 'string'
      ? result.value
      : undefined;
  }
}

export interface IProjectDialogService extends ProjectDialogService {}

export const IProjectDialogService = DI.createInterface<IProjectDialogService>(
  'IProjectDialogService',
  (x) => x.singleton(ProjectDialogService)
);
`
      },
      {
        path: 'confirm-delete-dialog.ts',
        language: 'ts',
        contents: `import { resolve } from 'aurelia';
import {
  IDialogController,
  type IDialogCustomElementViewModel
} from '@aurelia/dialog';

export interface ConfirmDeleteModel {
  projectName: string;
}

export class ConfirmDeleteDialog implements IDialogCustomElementViewModel<ConfirmDeleteModel> {
  readonly $dialog = resolve(IDialogController);
  projectName = '';

  activate(model: ConfirmDeleteModel): void {
    this.projectName = model.projectName;
  }

  confirm(): Promise<unknown> {
    return this.$dialog.ok();
  }

  cancel(): Promise<unknown> {
    return this.$dialog.cancel();
  }
}
`
      },
      {
        path: 'confirm-delete-dialog.html',
        language: 'html',
        contents: `<article>
  <h1>Delete project?</h1>
  <p>Delete \${projectName}? This cannot be undone.</p>

  <footer>
    <button type="button" click.trigger="cancel()">Cancel</button>
    <button type="button" click.trigger="confirm()">Delete</button>
  </footer>
</article>
`
      },
      {
        path: 'rename-project-dialog.ts',
        language: 'ts',
        contents: `import { resolve } from 'aurelia';
import {
  IDialogController,
  type DialogCloseResult,
  type IDialogCustomElementViewModel
} from '@aurelia/dialog';
import type { RenameProjectModel } from './project-dialog-service';

export class RenameProjectDialog implements IDialogCustomElementViewModel<RenameProjectModel> {
  readonly $dialog = resolve(IDialogController);
  name = '';
  private originalName = '';

  activate(model: RenameProjectModel): void {
    this.name = model.name;
    this.originalName = model.name;
  }

  canDeactivate(result: DialogCloseResult): boolean {
    return result.status === 'ok' || this.name === this.originalName || confirm('Discard the draft name?');
  }

  save(): Promise<unknown> {
    return this.$dialog.ok(this.name.trim());
  }

  cancel(): Promise<unknown> {
    return this.$dialog.cancel();
  }
}
`
      },
      {
        path: 'rename-project-dialog.html',
        language: 'html',
        contents: `<form submit.trigger="save()">
  <h1>Rename project</h1>

  <label for="project-name">Name</label>
  <input id="project-name" value.bind="name" required maxlength="120">

  <footer>
    <button type="button" click.trigger="cancel()">Cancel</button>
    <button type="submit" disabled.bind="!name.trim()">Save</button>
  </footer>
</form>
`
      },
      {
        path: 'project-list.ts',
        language: 'ts',
        contents: `import { resolve } from 'aurelia';
import { IProjectDialogService } from './project-dialog-service';

export interface ProjectRow {
  id: string;
  name: string;
}

export class ProjectList {
  private readonly dialogs = resolve(IProjectDialogService);

  projects: ProjectRow[] = [
    { id: 'docs', name: 'Docs' },
    { id: 'runtime', name: 'Runtime' }
  ];

  async rename(project: ProjectRow): Promise<void> {
    const name = await this.dialogs.renameProject(project);
    if (name !== undefined && name.length > 0) {
      project.name = name;
    }
  }

  async delete(project: ProjectRow): Promise<void> {
    if (await this.dialogs.confirmDelete(project.name)) {
      this.projects = this.projects.filter((candidate) => candidate.id !== project.id);
    }
  }
}
`
      },
      {
        path: 'project-list.html',
        language: 'html',
        contents: `<ul>
  <li repeat.for="project of projects; key.bind: project.id">
    <span>\${project.name}</span>
    <button type="button" click.trigger="rename(project)">Rename</button>
    <button type="button" click.trigger="delete(project)">Delete</button>
  </li>
</ul>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The app registers the standard dialog configuration once during startup.'
      },
      {
        summary: 'Dialog components own temporary dialog state and return results to the opener.'
      },
      {
        summary: 'Page state changes only after the opener observes the closed dialog result.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Use dialog for blocking modal decisions.',
        action: 'Keep portal patterns for non-blocking overlay placement; use the dialog service when focus and close semantics matter.'
      },
      {
        summary: 'Centralize repeated dialog opening in a small service.',
        action: 'Wrap `IDialogService.open` when multiple components need the same confirm or edit workflow.'
      },
      {
        summary: 'Guard dirty dialog drafts in the dialog component.',
        action: 'Use `canDeactivate` for unsaved modal edits and return values through `ok(value)` instead of mutating page state directly.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Dialog Package',
        url: 'https://docs.aurelia.io/aurelia-packages/dialog'
      },
      {
        title: 'Extended Tutorial Dialogs',
        url: 'https://docs.aurelia.io/getting-started/extended-tutorial/step-9-dialogs'
      }
    ]
  }
};
