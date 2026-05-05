/**
 * Framework-normal Aurelia application topology.
 *
 * These classes describe what an app is before an authoring planner decides which files to edit. They should stay
 * close to user-visible Aurelia shapes: entrypoints, root components, external templates, services, registrations,
 * resources, routes, and assets.
 */

export type ApplicationModuleSpecifier = string;
export type ApplicationRelativePath = string;

/** One source or asset file that belongs to the authored app. */
export class ApplicationFile {
  readonly kind = 'application-file' as const;

  constructor(
    /** Project-relative file path such as `src/main.ts` or `src/app.html`. */
    readonly path: ApplicationRelativePath,
    /** Why the semantic runtime cares about this file in the app topology. */
    readonly role: ApplicationFileRole,
  ) {}
}

export type ApplicationFileRole =
  | 'entrypoint'
  | 'component-source'
  | 'component-template'
  | 'component-style'
  | 'resource-source'
  | 'service-source'
  | 'route-source'
  | 'configuration-source'
  | 'asset';

/** A TypeScript module import used by authored app code. */
export class ApplicationImport {
  readonly kind = 'application-import' as const;

  constructor(
    /** Module specifier exactly as the user-authored source should write it. */
    readonly moduleSpecifier: ApplicationModuleSpecifier,
    /** Named imports requested from the module. */
    readonly namedImports: readonly string[] = [],
    /** Default import name, when one is intended. */
    readonly defaultImport: string | null = null,
    /** Namespace import name, when one is intended. */
    readonly namespaceImport: string | null = null,
  ) {}
}

/** App startup module, typically `src/main.ts`. */
export class ApplicationEntrypoint {
  readonly kind = 'application-entrypoint' as const;

  constructor(
    /** Entrypoint source file. */
    readonly file: ApplicationFile,
    /** Local Aurelia instance expression or factory lane used by startup. */
    readonly startupLane: string,
    /** Root component selected by `.app(...)`. */
    readonly rootComponent: ApplicationComponentReference,
    /** Imports that should appear in the authored entrypoint. */
    readonly imports: readonly ApplicationImport[] = [],
  ) {}
}

/** Reference to a custom element source module and class. */
export class ApplicationComponentReference {
  readonly kind = 'application-component-reference' as const;

  constructor(
    readonly className: string,
    readonly moduleSpecifier: ApplicationModuleSpecifier,
  ) {}
}

/** Authored external template associated with a component. */
export class ApplicationTemplateAsset {
  readonly kind = 'application-template-asset' as const;

  constructor(
    readonly file: ApplicationFile,
    readonly importSpecifier: ApplicationModuleSpecifier,
  ) {}
}

/** Authored stylesheet associated with a component or app shell. */
export class ApplicationStyleAsset {
  readonly kind = 'application-style-asset' as const;

  constructor(
    readonly file: ApplicationFile,
    readonly importSpecifier: ApplicationModuleSpecifier,
  ) {}
}

/** Custom element component as an authoring-facing topology node. */
export class ApplicationComponent {
  readonly kind = 'application-component' as const;

  constructor(
    readonly reference: ApplicationComponentReference,
    readonly file: ApplicationFile,
    readonly elementName: string,
    readonly template: ApplicationTemplateAsset | null,
    readonly styles: readonly ApplicationStyleAsset[] = [],
  ) {}
}

/** DI service or app model class that authored code should register or inject. */
export class ApplicationService {
  readonly kind = 'application-service' as const;

  constructor(
    readonly className: string,
    readonly file: ApplicationFile,
    readonly registration: ApplicationRegistration | null = null,
  ) {}
}

/** Intended app-level registration before it is lowered into Aurelia configuration code. */
export class ApplicationRegistration {
  readonly kind = 'application-registration' as const;

  constructor(
    readonly keyName: string,
    readonly implementationName: string | null,
    readonly lifetime: ApplicationRegistrationLifetime,
    readonly sourceModuleSpecifier: ApplicationModuleSpecifier | null = null,
  ) {}
}

export type ApplicationRegistrationLifetime =
  | 'singleton'
  | 'transient'
  | 'instance'
  | 'callback'
  | 'alias';

/** Route entry as an app topology fact, not yet a router-specific source edit. */
export class ApplicationRoute {
  readonly kind = 'application-route' as const;

  constructor(
    readonly path: string,
    readonly component: ApplicationComponentReference,
    readonly title: string | null = null,
  ) {}
}

/** One app topology view that authoring and analysis can both target. */
export class ApplicationTopology {
  readonly kind = 'application-topology' as const;

  constructor(
    readonly rootDir: string,
    readonly entrypoint: ApplicationEntrypoint | null,
    readonly files: readonly ApplicationFile[] = [],
    readonly components: readonly ApplicationComponent[] = [],
    readonly services: readonly ApplicationService[] = [],
    readonly registrations: readonly ApplicationRegistration[] = [],
    readonly routes: readonly ApplicationRoute[] = [],
  ) {}
}
