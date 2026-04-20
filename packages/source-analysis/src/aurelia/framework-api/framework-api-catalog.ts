import { FrameworkApi, FrameworkApiMatcher } from './framework-api.js';

export interface FrameworkApiCatalogState {
  readonly apiCount: number;
}

export class FrameworkApiCatalog {
  private readonly allValue: readonly FrameworkApi[];

  constructor(
    apis: readonly FrameworkApi[] = createDefaultFrameworkApis(),
  ) {
    this.allValue = apis;
  }

  readAll(): readonly FrameworkApi[] {
    return [...this.allValue];
  }

  findByImportPath(
    moduleSpecifier: string,
    exportName: string,
    memberPath: readonly string[] = [],
  ): FrameworkApi | null {
    for (const current of this.allValue) {
      for (const matcher of current.matchers) {
        if (
          matcher.moduleSpecifier === moduleSpecifier
          && matcher.exportName === exportName
          && comparePath(matcher.memberPath, memberPath)
        ) {
          return current;
        }
      }
    }

    return null;
  }

  findByDeclaredPath(
    declaredInFile: string,
    exportName: string,
    memberPath: readonly string[] = [],
  ): FrameworkApi | null {
    for (const current of this.allValue) {
      if (
        current.declaredInFile === declaredInFile
        && current.exportName === exportName
        && comparePath(current.memberPath, memberPath)
      ) {
        return current;
      }
    }

    return null;
  }

  hasDeclaredRoot(
    declaredInFile: string,
    exportName: string,
  ): boolean {
    return this.allValue.some((current) =>
      current.declaredInFile === declaredInFile
      && current.exportName === exportName,
    );
  }

  inspectState(): FrameworkApiCatalogState {
    return {
      apiCount: this.allValue.length,
    };
  }
}

function comparePath(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return left.length === right.length
    && left.every((current, index) => current === right[index]);
}

function createDefaultFrameworkApis(): readonly FrameworkApi[] {
  return [
    createRegistrationApi(
      'registration.instance',
      'instance',
      'instanceRegistration',
      'instance',
    ),
    createRegistrationApi(
      'registration.singleton',
      'singleton',
      'singletonRegistration',
      'singleton',
    ),
    createRegistrationApi(
      'registration.transient',
      'transient',
      'transientRegistration',
      'transient',
    ),
    createRegistrationApi(
      'registration.callback',
      'callback',
      'callbackRegistration',
      'callback',
    ),
    createRegistrationApi(
      'registration.cached-callback',
      'cached-callback',
      'cachedCallbackRegistration',
      'cachedCallback',
    ),
    createRegistrationApi(
      'registration.alias',
      'alias',
      'aliasToRegistration',
      'aliasTo',
    ),
    createRegistrationApi(
      'registration.defer',
      'defer',
      'deferRegistration',
      'defer',
    ),
    new FrameworkApi(
      'app-task.creating',
      'lifecycle-slot-producer',
      'packages/runtime-html/src/app-task.ts',
      '@aurelia/runtime-html',
      'AppTask',
      ['creating'],
      'lifecycle-slot-task',
      [
        new FrameworkApiMatcher('@aurelia/runtime-html', 'AppTask', ['creating']),
      ],
      'Canonical AppTask.creating lifecycle-slot producer.',
    ),
    new FrameworkApi(
      'app-task.hydrating',
      'lifecycle-slot-producer',
      'packages/runtime-html/src/app-task.ts',
      '@aurelia/runtime-html',
      'AppTask',
      ['hydrating'],
      'lifecycle-slot-task',
      [
        new FrameworkApiMatcher('@aurelia/runtime-html', 'AppTask', ['hydrating']),
      ],
      'Canonical AppTask.hydrating lifecycle-slot producer.',
    ),
    new FrameworkApi(
      'app-task.hydrated',
      'lifecycle-slot-producer',
      'packages/runtime-html/src/app-task.ts',
      '@aurelia/runtime-html',
      'AppTask',
      ['hydrated'],
      'lifecycle-slot-task',
      [
        new FrameworkApiMatcher('@aurelia/runtime-html', 'AppTask', ['hydrated']),
      ],
      'Canonical AppTask.hydrated lifecycle-slot producer.',
    ),
    new FrameworkApi(
      'app-task.activating',
      'lifecycle-slot-producer',
      'packages/runtime-html/src/app-task.ts',
      '@aurelia/runtime-html',
      'AppTask',
      ['activating'],
      'lifecycle-slot-task',
      [
        new FrameworkApiMatcher('@aurelia/runtime-html', 'AppTask', ['activating']),
      ],
      'Canonical AppTask.activating lifecycle-slot producer.',
    ),
    new FrameworkApi(
      'app-task.activated',
      'lifecycle-slot-producer',
      'packages/runtime-html/src/app-task.ts',
      '@aurelia/runtime-html',
      'AppTask',
      ['activated'],
      'lifecycle-slot-task',
      [
        new FrameworkApiMatcher('@aurelia/runtime-html', 'AppTask', ['activated']),
      ],
      'Canonical AppTask.activated lifecycle-slot producer.',
    ),
    new FrameworkApi(
      'app-task.deactivating',
      'lifecycle-slot-producer',
      'packages/runtime-html/src/app-task.ts',
      '@aurelia/runtime-html',
      'AppTask',
      ['deactivating'],
      'lifecycle-slot-task',
      [
        new FrameworkApiMatcher('@aurelia/runtime-html', 'AppTask', ['deactivating']),
      ],
      'Canonical AppTask.deactivating lifecycle-slot producer.',
    ),
    new FrameworkApi(
      'app-task.deactivated',
      'lifecycle-slot-producer',
      'packages/runtime-html/src/app-task.ts',
      '@aurelia/runtime-html',
      'AppTask',
      ['deactivated'],
      'lifecycle-slot-task',
      [
        new FrameworkApiMatcher('@aurelia/runtime-html', 'AppTask', ['deactivated']),
      ],
      'Canonical AppTask.deactivated lifecycle-slot producer.',
    ),
    new FrameworkApi(
      'di.create-interface',
      'di-key-factory',
      'packages/kernel/src/di.ts',
      '@aurelia/kernel',
      'DI',
      ['createInterface'],
      null,
      [
        new FrameworkApiMatcher('@aurelia/kernel', 'DI', ['createInterface']),
        new FrameworkApiMatcher('@aurelia/kernel', 'createInterface'),
      ],
      'Canonical DI.createInterface key-production surface.',
    ),
  ];
}

function createRegistrationApi(
  id: string,
  productionKind: FrameworkApi['productionKind'],
  directExportName: string,
  memberName: string,
): FrameworkApi {
  return new FrameworkApi(
    id,
    'registration-producer',
    'packages/kernel/src/di.registration.ts',
    '@aurelia/kernel',
    'Registration',
    [memberName],
    productionKind,
    [
      new FrameworkApiMatcher('@aurelia/kernel', 'Registration', [memberName]),
      new FrameworkApiMatcher('@aurelia/kernel', directExportName),
    ],
    `Canonical Registration.${memberName} producer.`,
  );
}
