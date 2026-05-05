import type { ApplicationTopology } from '../application/index.js';
import {
  type AuthoringOperationDescriptor,
  type AuthoringOperationKind,
  readAuthoringOperationDescriptor,
} from './ontology.js';

/** Base class for semantic authoring operations before they become text edits. */
export abstract class AuthoringOperation<TKind extends AuthoringOperationKind> {
  readonly descriptor: AuthoringOperationDescriptor<TKind>;

  protected constructor(
    readonly kind: TKind,
    /** Human-readable operation summary for negotiation and plan review. */
    readonly summary: string,
  ) {
    this.descriptor = readAuthoringOperationDescriptor(kind) as AuthoringOperationDescriptor<TKind>;
  }
}

/** Create or update project-level files such as package metadata, tsconfig, and source roots. */
export class CreateProjectFilesOperation extends AuthoringOperation<'create-project-files'> {
  constructor(
    readonly files: readonly string[],
  ) {
    super('create-project-files', `Create or update ${files.length} project file(s).`);
  }
}

/** Create the app entrypoint and startup lane. */
export class CreateEntrypointOperation extends AuthoringOperation<'create-entrypoint'> {
  constructor(
    readonly entrypointPath: string,
    readonly rootComponentClassName: string,
  ) {
    super('create-entrypoint', `Create app entrypoint ${entrypointPath}.`);
  }
}

/** Create a custom element source file. */
export class CreateComponentOperation extends AuthoringOperation<'create-component'> {
  constructor(
    readonly sourcePath: string,
    readonly className: string,
    readonly elementName: string,
  ) {
    super('create-component', `Create custom element ${elementName}.`);
  }
}

/** Create or attach an external template asset. */
export class CreateExternalTemplateOperation extends AuthoringOperation<'create-external-template'> {
  constructor(
    readonly templatePath: string,
    readonly ownerClassName: string,
  ) {
    super('create-external-template', `Create external template ${templatePath}.`);
  }
}

/** Create an injectable app service or model class. */
export class CreateServiceOperation extends AuthoringOperation<'create-service'> {
  constructor(
    readonly sourcePath: string,
    readonly className: string,
  ) {
    super('create-service', `Create service ${className}.`);
  }
}

/** Register a DI dependency in the app configuration path. */
export class RegisterDependencyOperation extends AuthoringOperation<'register-dependency'> {
  constructor(
    readonly keyName: string,
    readonly implementationName: string | null,
  ) {
    super('register-dependency', `Register dependency ${keyName}.`);
  }
}

/** Add a plugin or framework configuration admission. */
export class ConfigurePluginOperation extends AuthoringOperation<'configure-plugin'> {
  constructor(
    readonly importName: string,
    readonly moduleSpecifier: string,
  ) {
    super('configure-plugin', `Configure ${importName}.`);
  }
}

/** Add an app route. */
export class AddRouteOperation extends AuthoringOperation<'add-route'> {
  constructor(
    readonly routePath: string,
    readonly componentClassName: string,
  ) {
    super('add-route', `Add route ${routePath}.`);
  }
}

/** Reopen the app and verify that expected semantic effects materialized. */
export class VerifyAppOperation extends AuthoringOperation<'verify-app'> {
  constructor(
    readonly expectedTopology: ApplicationTopology,
  ) {
    super('verify-app', 'Verify authored app semantic closure.');
  }
}

export type AnyAuthoringOperation = AuthoringOperation<AuthoringOperationKind>;
