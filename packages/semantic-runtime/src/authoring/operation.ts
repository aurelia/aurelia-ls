import type { ApplicationTopology } from '../application/index.js';
import type { SemanticSourceReference } from '../api/source-reference.js';
import {
  type AuthoringOperationDescriptor,
  type AuthoringOperationKind,
  readAuthoringOperationDescriptor,
} from './ontology.js';
import type {
  AuthoringRepairChangeDomain,
  AuthoringRepairKind,
  AuthoringRepairPlanKind,
  AuthoringRepairPlanReadiness,
  AuthoringRepairRuntimeBoundaryKind,
  AuthoringRepairRuntimeIntentKind,
} from './repair.js';

export interface RepairAppMemberHint {
  readonly memberName: string;
  readonly evidenceCount: number;
  readonly ownerTypeDisplays: readonly string[];
  readonly valueTypeDisplays: readonly string[];
  readonly valueTypeSources: readonly string[];
  readonly valueTypeCoverage: 'all' | 'some' | 'none';
}

export interface RepairAppActionTarget {
  readonly targetKind: string;
  readonly source: SemanticSourceReference | null;
  readonly typeDisplay: string | null;
  readonly memberNames: readonly string[];
  readonly evidenceCount: number;
}

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

/** Create the app root custom element source file. */
export class CreateRootComponentOperation extends AuthoringOperation<'create-root-component'> {
  constructor(
    readonly sourcePath: string,
    readonly className: string,
    readonly elementName: string,
  ) {
    super('create-root-component', `Create app root component ${elementName}.`);
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

/** Create a form-oriented custom element source file. */
export class CreateFormComponentOperation extends AuthoringOperation<'create-form-component'> {
  constructor(
    readonly sourcePath: string,
    readonly className: string,
    readonly elementName: string,
  ) {
    super('create-form-component', `Create form component ${elementName}.`);
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

/** Create or attach a stylesheet/style asset. */
export class CreateStyleAssetOperation extends AuthoringOperation<'create-style-asset'> {
  constructor(
    readonly stylePath: string,
    readonly ownerKind: 'component' | 'global',
  ) {
    super('create-style-asset', `Create ${ownerKind} style asset ${stylePath}.`);
  }
}

/** Create a DI-owned state model class. */
export class CreateStateModelOperation extends AuthoringOperation<'create-state-model'> {
  constructor(
    readonly sourcePath: string,
    readonly className: string,
  ) {
    super('create-state-model', `Create state model ${className}.`);
  }
}

/** Configure plugin-backed @aurelia/state stores and their source-owned action handlers. */
export class ConfigureStateStoreOperation extends AuthoringOperation<'configure-state-store'> {
  constructor(
    readonly sourcePath: string,
    readonly storeNames: readonly string[],
  ) {
    super('configure-state-store', `Configure @aurelia/state store(s): ${storeNames.join(', ')}.`);
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

/** Create a plain domain entity, aggregate, value object, or app-owned model class. */
export class CreateDomainModelOperation extends AuthoringOperation<'create-domain-model'> {
  constructor(
    readonly sourcePath: string,
    readonly className: string,
  ) {
    super('create-domain-model', `Create domain model ${className}.`);
  }
}

/** Add a template binding or control-flow usage to an authored template. */
export class AddTemplateBindingOperation extends AuthoringOperation<'add-template-binding'> {
  constructor(
    readonly templatePath: string,
    readonly bindingSummary: string,
  ) {
    super('add-template-binding', `Add template binding in ${templatePath}: ${bindingSummary}.`);
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

/** Negotiate and apply a semantic repair cluster without claiming a concrete code action exists yet. */
export class RepairAppOperation extends AuthoringOperation<'repair-app'> {
  constructor(
    readonly clusterKey: string,
    readonly repairKind: AuthoringRepairKind | `${AuthoringRepairKind}`,
    readonly planKind: AuthoringRepairPlanKind | `${AuthoringRepairPlanKind}`,
    readonly changeDomain: AuthoringRepairChangeDomain | `${AuthoringRepairChangeDomain}`,
    readonly planReadiness: AuthoringRepairPlanReadiness | `${AuthoringRepairPlanReadiness}`,
    readonly repairCount: number,
    readonly targetMemberNames: readonly string[] = [],
    readonly actionTargets: readonly RepairAppActionTarget[] = [],
    readonly memberHints: readonly RepairAppMemberHint[] = [],
    readonly runtimeBoundaryKinds: readonly (AuthoringRepairRuntimeBoundaryKind | `${AuthoringRepairRuntimeBoundaryKind}`)[] = [],
    readonly runtimeIntentKinds: readonly (AuthoringRepairRuntimeIntentKind | `${AuthoringRepairRuntimeIntentKind}`)[] = [],
  ) {
    super('repair-app', repairAppOperationSummary(
      repairCount,
      repairKind,
      planKind,
      runtimeBoundaryKinds,
      runtimeIntentKinds,
    ));
  }
}

export type AnyAuthoringOperation = AuthoringOperation<AuthoringOperationKind>;

function repairAppOperationSummary(
  repairCount: number,
  repairKind: AuthoringRepairKind | `${AuthoringRepairKind}`,
  planKind: AuthoringRepairPlanKind | `${AuthoringRepairPlanKind}`,
  runtimeBoundaryKinds: readonly (AuthoringRepairRuntimeBoundaryKind | `${AuthoringRepairRuntimeBoundaryKind}`)[],
  runtimeIntentKinds: readonly (AuthoringRepairRuntimeIntentKind | `${AuthoringRepairRuntimeIntentKind}`)[],
): string {
  const boundary = runtimeBoundaryKinds.length === 0
    ? ''
    : `; runtime boundaries: ${runtimeBoundaryKinds.join(', ')}`;
  const intent = runtimeIntentKinds.length === 0
    ? ''
    : `; runtime intents: ${runtimeIntentKinds.join(', ')}`;
  return `Repair ${repairCount} ${repairKind} row(s) through ${planKind}${boundary}${intent}.`;
}
