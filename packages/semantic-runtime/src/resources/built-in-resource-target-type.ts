import type {
  AddressHandle,
  IdentityHandle,
} from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { KernelStore } from '../kernel/store.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
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
  BuiltInResourceExportVisibility,
  BuiltInResourcePackage,
  builtInResourceExportVisibility,
  builtInResourcePackageModuleSpecifier,
  type BuiltInResource,
} from './built-in-resources.js';

/** Projects framework-owned resource target classes from the app's current TypeChecker epoch. */
export class BuiltInResourceTargetTypeProjector {
  private readonly projector: CheckerTypeProjector;

  constructor(
    store: KernelStore,
    readonly typeSystem: TypeSystemProject,
    publication: KernelPublicationContext,
  ) {
    this.projector = new CheckerTypeProjector(store, publication);
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
  return builtInResourcePackageModuleSpecifier(packageId);
}

function builtInResourceInternalModuleSpecifier(
  resource: BuiltInResource,
): string | null {
  if (builtInResourceExportVisibility(resource) === BuiltInResourceExportVisibility.PackageInternal) {
    return '@aurelia/runtime-html/dist/types/resources/custom-attributes/show';
  }
  // `AuSlot` is default-registered and some installed runtime-html type entrypoints do not expose it as a value export.
  if (resource.packageId === BuiltInResourcePackage.RuntimeHtml && resource.targetName === 'AuSlot') {
    return '@aurelia/runtime-html/dist/types/resources/custom-elements/au-slot';
  }
  return null;
}
