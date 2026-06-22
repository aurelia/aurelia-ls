import type { AureliaPatternExample } from '../pattern-contract.js';

export const routerCanUnloadDirtyFormPattern: AureliaPatternExample = {
  patternId: 'router.can-unload-dirty-form',
  title: 'Dirty form route exit guard',
  guidance: {
    summary: 'Use `canUnload` when a routed form needs to block or confirm navigation away from unsaved local changes.',
    whenToUse: [
      'A route owns editable local form state that can become dirty.',
      'Leaving the route would discard user-entered data.',
      'A simple synchronous confirmation is enough for the first pass.'
    ],
    whenNotToUse: [
      'The form is not route-owned or leaving the page does not lose data.',
      'Autosave or draft persistence already protects the user.',
      'The decision depends on validation-plugin state, remote locks, or multi-step workflow policy.'
    ]
  },
  source: {
    files: [
      {
        path: 'edit-project-form.ts',
        language: 'ts',
        contents: `import type { IRouteViewModel, RouteNode } from '@aurelia/router';

export interface ProjectFormData {
  name: string;
  summary: string;
}

export class EditProjectForm implements IRouteViewModel {
  formData: ProjectFormData = {
    name: 'Release readiness',
    summary: 'Final checks before publishing.'
  };

  private savedSnapshot: ProjectFormData = { ...this.formData };

  get isDirty(): boolean {
    return this.formData.name !== this.savedSnapshot.name ||
      this.formData.summary !== this.savedSnapshot.summary;
  }

  save(): void {
    this.savedSnapshot = { ...this.formData };
  }

  canUnload(_next: RouteNode | null, _current: RouteNode): boolean {
    if (!this.isDirty) {
      return true;
    }

    return globalThis.confirm('Discard unsaved project changes?');
  }
}
`
      },
      {
        path: 'edit-project-form.html',
        language: 'html',
        contents: `<form submit.trigger="save()">
  <label for="project-name">Project name</label>
  <input id="project-name" value.bind="formData.name" required>

  <label for="project-summary">Summary</label>
  <textarea id="project-summary" value.bind="formData.summary"></textarea>

  <p if.bind="isDirty" role="status">You have unsaved changes.</p>
  <button type="submit" disabled.bind="!isDirty">Save</button>
</form>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The route owns the form state and knows when it is dirty.'
      },
      {
        summary: 'A synchronous browser confirmation is acceptable for this first slice.'
      },
      {
        summary: 'Saving updates the local clean snapshot.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Keep the dirty check simple and explicit.',
        action: 'Compare the fields the route owns; move persistence or cross-route draft state into an injected service when it becomes shared.'
      },
      {
        summary: 'Use richer confirmation UI deliberately.',
        action: 'Replace `globalThis.confirm` only when the app has an accessible dialog pattern and the router flow can await it cleanly.'
      },
      {
        summary: 'Separate validation from exit protection.',
        action: 'Do not make the unload guard depend on plugin validation until validation state has its own clear ownership.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Routing Lifecycle Hooks',
        url: 'https://docs.aurelia.io/router/routing-lifecycle'
      },
      {
        title: 'Form Submission',
        url: 'https://docs.aurelia.io/templates/forms/submission'
      }
    ]
  }
};
