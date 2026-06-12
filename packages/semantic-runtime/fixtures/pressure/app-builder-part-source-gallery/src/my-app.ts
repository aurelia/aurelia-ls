import { resolve, customAttribute, CustomAttribute, templateController, valueConverter, ValueConverter, bindingBehavior, BindingBehavior, bindingCommand, BindingCommand, AttributePattern, customElement, CustomElement, computed } from 'aurelia';
import { route, IRouteContext } from '@aurelia/router';
import { IValidationController } from '@aurelia/validation-html';
import type { ValidationResultTarget } from '@aurelia/validation-html';
import type { CustomAttributeStaticAuDefinition, ValueConverterStaticAuDefinition, BindingBehaviorStaticAuDefinition, CustomElementStaticAuDefinition } from '@aurelia/runtime-html';
import type { BindingCommandStaticAuDefinition } from '@aurelia/template-compiler';
import { fromState } from '@aurelia/state';
import type { GalleryState } from './gallery-state';
import template from './my-app.html';

@customElement({
  name: 'sample-card',
})
export class SampleCard {}

export class StaticCard {
  static readonly $au: CustomElementStaticAuDefinition = {
    type: 'custom-element',
    name: 'static-card',
  };
}

export class StaticTemplateCard {
  static readonly $au: CustomElementStaticAuDefinition = {
    type: 'custom-element',
    name: 'static-template-card',
    template,
    dependencies: [SampleCard],
  };
}

export class DefinedCard {}
CustomElement.define({
  name: 'defined-card',
}, DefinedCard);

export class DefinedTemplateCard {}
CustomElement.define({
  name: 'defined-template-card',
  template,
  dependencies: [SampleCard],
}, DefinedTemplateCard);

@customAttribute({
  name: 'gallery-attribute',
})
export class GalleryAttributeDecorated {}

export class GalleryAttributeStatic {
  static readonly $au: CustomAttributeStaticAuDefinition = {
    type: 'custom-attribute',
    name: 'gallery-attribute-static',
  };
}

export class GalleryAttributeDefined {}
CustomAttribute.define({
  name: 'gallery-attribute-defined',
}, GalleryAttributeDefined);

@customAttribute({
  name: 'gallery-attribute-with-dependency',
  dependencies: [SampleCard],
})
export class GalleryAttributeWithDependencyDecorated {}

export class GalleryAttributeWithDependencyStatic {
  static readonly $au: CustomAttributeStaticAuDefinition = {
    type: 'custom-attribute',
    name: 'gallery-attribute-with-dependency-static',
    dependencies: [SampleCard],
  };
}

export class GalleryAttributeWithDependencyDefined {}
CustomAttribute.define({
  name: 'gallery-attribute-with-dependency-defined',
  dependencies: [SampleCard],
}, GalleryAttributeWithDependencyDefined);

@templateController({
  name: 'gallery-template-controller',
})
export class GalleryTemplateControllerDecorated {}

export class GalleryTemplateControllerStatic {
  static readonly $au: CustomAttributeStaticAuDefinition = {
    type: 'custom-attribute',
    name: 'gallery-template-controller-static',
    isTemplateController: true,
  };
}

export class GalleryTemplateControllerDefined {}
CustomAttribute.define({
  name: 'gallery-template-controller-defined',
  isTemplateController: true,
}, GalleryTemplateControllerDefined);

@templateController({
  name: 'gallery-template-controller-with-dependency',
  dependencies: [SampleCard],
})
export class GalleryTemplateControllerWithDependencyDecorated {}

export class GalleryTemplateControllerWithDependencyStatic {
  static readonly $au: CustomAttributeStaticAuDefinition = {
    type: 'custom-attribute',
    name: 'gallery-template-controller-with-dependency-static',
    isTemplateController: true,
    dependencies: [SampleCard],
  };
}

export class GalleryTemplateControllerWithDependencyDefined {}
CustomAttribute.define({
  name: 'gallery-template-controller-with-dependency-defined',
  isTemplateController: true,
  dependencies: [SampleCard],
}, GalleryTemplateControllerWithDependencyDefined);

@valueConverter({
  name: 'gallery-value',
})
export class GalleryValueConverterDecorated {}

export class GalleryValueConverterStatic {
  static readonly $au: ValueConverterStaticAuDefinition = {
    type: 'value-converter',
    name: 'gallery-value-static',
  };
}

export class GalleryValueConverterDefined {}
ValueConverter.define({
  name: 'gallery-value-defined',
}, GalleryValueConverterDefined);

@bindingBehavior({
  name: 'gallery-behavior',
})
export class GalleryBindingBehaviorDecorated {}

export class GalleryBindingBehaviorStatic {
  static readonly $au: BindingBehaviorStaticAuDefinition = {
    type: 'binding-behavior',
    name: 'gallery-behavior-static',
  };
}

export class GalleryBindingBehaviorDefined {}
BindingBehavior.define({
  name: 'gallery-behavior-defined',
}, GalleryBindingBehaviorDefined);

@bindingCommand({
  name: 'gallery-command',
})
export class GalleryBindingCommandDecorated {}

export class GalleryBindingCommandStatic {
  static readonly $au: BindingCommandStaticAuDefinition = {
    type: 'binding-command',
    name: 'gallery-command-static',
  };
}

export class GalleryBindingCommandDefined {}
BindingCommand.define({
  name: 'gallery-command-defined',
}, GalleryBindingCommandDefined);

export class GalleryAttributePattern {
  'PART.example'(rawName: string, rawValue: string, parts: readonly string[]) {
    return { rawName, rawValue, target: parts[0] ?? rawName, command: 'example', parts };
  }
}
AttributePattern.create([{ pattern: 'PART.example', symbols: '.' }], GalleryAttributePattern);

export class GalleryHomeRoute {}

export class GalleryItemsRoute {}

export class GalleryDetailRoute {}

export class GallerySanitizer {
  sanitize(input: string): string {
    return input;
  }
}

const galleryDependencies = {
  dependencies: [SampleCard]
};

@route({
  title: 'Gallery',
  routes: [
    {
      path: '',
      redirectTo: 'home',
    },
    {
      id: 'home',
      path: 'home',
      component: GalleryHomeRoute,
      title: 'Home',
    },
    {
      id: 'items',
      path: 'items',
      component: GalleryItemsRoute,
      title: 'Items',
      routes: [
        {
          id: 'item-detail',
          path: ':id',
          component: GalleryDetailRoute,
          title: 'Detail',
        },
      ],
    },
  ],
})

@customElement({
  name: 'my-app',
  template,
  dependencies: [SampleCard],
})
export class MyApp {
  static readonly dependencies = galleryDependencies.dependencies;
  readonly routeParams = resolve(IRouteContext).getRouteParameters<{
      id: string;
    }>();
  readonly requiredRouteContext = resolve(IRouteContext);
  readonly routeParamsWithOptions = this.requiredRouteContext.getRouteParameters<{
      id: string;
      filter?: string;
    }, 'child-first'>({ includeQueryParams: true, mergeStrategy: 'child-first' });

  @fromState((state: GalleryState) => state.items)
  readonly storeItems: readonly GalleryItem[] = [];

  @fromState('users', (state: GalleryState) => state.items)
  readonly userStoreItems: readonly GalleryItem[] = [];

  firstName = 'Ada';
  lastName = 'Lovelace';
  title = 'Gallery';
  titleKey = 'app.title';
  itemCount = 2;
  price = 42;
  createdAt = new Date('2026-01-01T00:00:00.000Z');
  value = 'value';
  descriptionHtml = '<strong>Safe sample</strong>';
  classes = 'ready highlighted';
  styleRules = { color: 'currentColor' };
  isActive = true;
  isVisible = true;
  isDisabled = false;
  isReady = true;
  isFocused = false;
  isOpen = true;
  isItemsActive = false;
  selectedId = '1';
  status = 'ready';
  errors: ValidationResultTarget[] = [];
  readonly validationController = resolve(IValidationController);
  routeContext: { parent: IRouteContext | undefined } = { parent: undefined };
  element: HTMLDivElement | null = null;
  currentComponent = SampleCard;
  currentTemplate = '<template><span>Composed</span></template>';

  selectedItem: GalleryItem = { id: 1, label: 'Alpha' };
  selectedOption: GalleryOption | null = null;
  selectedOptionId: string | null = null;
  selectedOptions: GalleryOption[] = [];
  selectedOptionIds: string[] = [];
  options: GalleryOption[] = [
    { id: 'alpha', label: 'Alpha' },
    { id: 'beta', label: 'Beta' },
  ];

  items: GalleryItem[] = [
    { id: 1, label: 'Alpha' },
    { id: 2, label: 'Beta' },
  ];
  draft = {
    title: 'Draft',
    quantity: 1,
    dueDate: '2026-06-01',
    enabled: true,
  };
  matcher = (left: GalleryOption, right: GalleryOption) => left.id === right.id;

  @computed({ deps: ['firstName', 'lastName'] })
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  loadItems(): Promise<GalleryItem> {
    return Promise.resolve(this.selectedItem);
  }

  handle(event: Event): void {
    this.value = event.type;
  }

  refresh(): void {
    this.value = this.fullName;
  }

    define() {
      this.refresh();
    }

    hydrating() {
      this.refresh();
    }

    hydrated() {
      this.refresh();
    }

    created() {
      this.refresh();
    }

    binding() {
      this.refresh();
    }

    bound() {
      this.refresh();
    }

    attaching() {
      this.refresh();
    }

    attached() {
      this.refresh();
    }

    detaching() {
      this.refresh();
    }

    unbinding() {
      this.refresh();
    }

    dispose() {
      this.refresh();
    }

    accept() {
      this.refresh();
    }
}

export interface GalleryOption {
  readonly id: string;
  readonly label: string;
}

export interface GalleryItem {
  readonly id: number;
  readonly label: string;
}

export class RequiredLifecycleGallery {
  define() {}

  hydrating() {}

  hydrated() {}

  created() {}

  binding() {}

  bound() {}

  attaching() {}

  attached() {}

  detaching() {}

  unbinding() {}

  dispose() {}

  accept() {}
}
