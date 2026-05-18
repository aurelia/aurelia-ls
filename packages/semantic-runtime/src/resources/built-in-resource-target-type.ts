import type {
  AddressHandle,
  IdentityHandle,
} from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { KernelStore } from '../kernel/store.js';
import {
  CheckerTypeMemberProjectionPolicy,
  CheckerTypeProjector,
  type CheckerTypeProjectionRequest,
} from '../type-system/checker-projector.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  CheckerTypeProjectionOrigin,
  type CheckerTypeReference,
} from '../type-system/type-shape.js';
import {
  BuiltInResourcePackage,
  type BuiltInResource,
} from './built-in-resources.js';

/** Projects framework-owned resource target classes from the app's current TypeChecker epoch. */
export class BuiltInResourceTargetTypeProjector {
  private readonly projector: CheckerTypeProjector;

  constructor(
    store: KernelStore,
    readonly typeSystem: TypeSystemProject,
  ) {
    this.projector = new CheckerTypeProjector(store);
  }

  targetTypeReference(
    resource: BuiltInResource,
    local: string,
    sourceAddressHandle: AddressHandle | null,
    ownerIdentityHandle: IdentityHandle | null,
  ): CheckerTypeReference | null {
    const type = this.readTargetType(resource);
    if (type == null) {
      return null;
    }

    return this.projector.ensureProjection({
      localKey: `${local}:target-type:${localKeyPart(resource.targetName)}`,
      checker: this.typeSystem.checker,
      type,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceAddressHandle,
      ownerIdentityHandle,
      display: this.typeSystem.checker.typeToString(type),
      memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
    } satisfies CheckerTypeProjectionRequest).toReference();
  }

  private readTargetType(
    resource: BuiltInResource,
  ): ReturnType<TypeSystemProject['readRuntimeTargetTypeForExport']> {
    for (const moduleSpecifier of builtInResourceModuleSpecifiers(resource)) {
      const type = this.typeSystem.readRuntimeTargetTypeForExport(moduleSpecifier, resource.targetName);
      if (type != null) {
        return type;
      }
    }
    return null;
  }
}

function builtInResourceModuleSpecifiers(
  resource: BuiltInResource,
): readonly string[] {
  const publicModule = builtInResourcePublicModuleSpecifier(resource.packageId);
  const internalModule = builtInResourceInternalModuleSpecifier(resource);
  return [
    ...(publicModule == null ? [] : [publicModule]),
    ...(internalModule == null ? [] : [internalModule]),
  ];
}

function builtInResourcePublicModuleSpecifier(
  packageId: BuiltInResourcePackage,
): string | null {
  switch (packageId) {
    case BuiltInResourcePackage.RuntimeHtml:
      return '@aurelia/runtime-html';
    case BuiltInResourcePackage.I18n:
      return '@aurelia/i18n';
    case BuiltInResourcePackage.Router:
      return '@aurelia/router';
    case BuiltInResourcePackage.State:
      return '@aurelia/state';
    case BuiltInResourcePackage.ValidationHtml:
      return '@aurelia/validation-html';
  }
}

function builtInResourceInternalModuleSpecifier(
  resource: BuiltInResource,
): string | null {
  // `Show` is part of runtime-html DefaultResources, but it is not re-exported from the package entrypoint.
  // The semantic catalog still needs its framework type because runtime registration can instantiate it.
  if (resource.packageId === BuiltInResourcePackage.RuntimeHtml && resource.targetName === 'Show') {
    return '@aurelia/runtime-html/dist/types/resources/custom-attributes/show';
  }
  // `AuSlot` is default-registered and some installed runtime-html type entrypoints do not expose it as a value export.
  if (resource.packageId === BuiltInResourcePackage.RuntimeHtml && resource.targetName === 'AuSlot') {
    return '@aurelia/runtime-html/dist/types/resources/custom-elements/au-slot';
  }
  return null;
}
