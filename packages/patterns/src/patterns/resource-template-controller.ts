import type { AureliaPatternExample } from '../pattern-contract.js';

export const resourceTemplateControllerPattern: AureliaPatternExample = {
  patternId: 'resource.template-controller',
  title: 'Template controller resource',
  guidance: {
    summary: 'Use a template controller when a reusable attribute owns whether and how an attached template view is stamped into the DOM.',
    whenToUse: [
      'The behavior is a reusable structural template concern.',
      'A plain `if.bind` would be repeated with the same setup across features.',
      'The resource can own view creation and cleanup without reaching into component internals.'
    ],
    whenNotToUse: [
      'A single component can use `if.bind`, `repeat.for`, or `promise.bind` directly.',
      'The behavior is feature state that belongs in an injected class.',
      'The resource needs broad cross-component communication or router ownership.'
    ]
  },
  source: {
    files: [
      {
        path: 'feature-enabled.ts',
        language: 'ts',
        contents: `import { resolve } from '@aurelia/kernel';
import {
  bindable,
  ICustomAttributeController,
  IRenderLocation,
  ISyntheticView,
  IViewFactory,
  templateController
} from '@aurelia/runtime-html';

@templateController('feature-enabled')
export class FeatureEnabled {
  public readonly $controller!: ICustomAttributeController<this>;

  private readonly factory = resolve(IViewFactory);
  private readonly location = resolve(IRenderLocation);

  private view: ISyntheticView | undefined;

  @bindable enabled = false;

  binding(): void {
    this.view ??= this.factory.create().setLocation(this.location);
  }

  bound(): void | Promise<void> {
    return this.syncView();
  }

  enabledChanged(): void | Promise<void> {
    return this.syncView();
  }

  async detaching(): Promise<void> {
    await this.hideView();
    this.view?.dispose();
    this.view = undefined;
  }

  private syncView(): void | Promise<void> {
    return this.enabled ? this.showView() : this.hideView();
  }

  private showView(): void | Promise<void> {
    if (this.view === undefined || this.view.isActive) {
      return;
    }

    return this.view.activate(this.view, this.$controller, this.$controller.scope!);
  }

  private hideView(): void | Promise<void> {
    if (this.view === undefined || !this.view.isActive) {
      return;
    }

    return this.view.deactivate(this.view, this.$controller);
  }
}
`
      },
      {
        path: 'feature-dashboard.ts',
        language: 'ts',
        contents: `export class FeatureDashboard {
  canUseReports = true;
  canUseBilling = false;
}
`
      },
      {
        path: 'feature-dashboard.html',
        language: 'html',
        contents: `<section>
  <h1>Feature dashboard</h1>

  <template feature-enabled.bind="canUseReports">
    <p>Reports are enabled.</p>
  </template>

  <template feature-enabled.bind="canUseBilling">
    <p>Billing is enabled.</p>
  </template>
</section>
`
      }
    ]
  },
  adaptation: {
    assumptions: [
      {
        summary: 'The behavior is structural template behavior, not shared feature state.'
      },
      {
        summary: 'The resource owns the stamped view lifecycle completely.'
      },
      {
        summary: 'The template controller is registered or imported wherever the template uses it.'
      }
    ],
    handoffNotes: [
      {
        summary: 'Prefer built-in template controllers first.',
        action: 'Use `if.bind`, `repeat.for`, `switch.bind`, or `promise.bind` directly unless the reusable structural behavior is clearer as a custom resource.'
      },
      {
        summary: 'Keep feature decisions outside the resource.',
        action: 'Let components or injected services decide access and pass simple bindable values into the template controller.'
      },
      {
        summary: 'Keep lifecycle signatures narrow.',
        action: 'Expose only the bindables and hooks the structural behavior needs; deactivate and dispose stamped views when the controller detaches.'
      }
    ]
  },
  support: {
    refs: [
      {
        title: 'Template Controllers',
        url: 'https://docs.aurelia.io/getting-to-know-aurelia/template-controllers'
      },
      {
        title: 'Custom Attributes',
        url: 'https://docs.aurelia.io/templates/custom-attributes'
      }
    ]
  }
};
