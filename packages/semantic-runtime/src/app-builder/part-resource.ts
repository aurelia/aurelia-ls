import {
  BuiltInResourcePackage,
  builtInResourcePackageModuleSpecifier,
  findBuiltInResource,
  type BuiltInResource,
} from '../resources/built-in-resources.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';

/** Built-in framework resource selected by app-builder metadata. */
export interface AppBuilderBuiltInResourceRef {
  readonly packageId: BuiltInResourcePackage;
  readonly resourceKind: ResourceDefinitionKind;
  readonly name: string;
}

/** Create a serializable reference to a semantic-runtime built-in resource catalog entry. */
export function appBuilderBuiltInResourceRef(
  packageId: BuiltInResourcePackage,
  resourceKind: ResourceDefinitionKind,
  name: string,
): AppBuilderBuiltInResourceRef {
  return { packageId, resourceKind, name };
}

/** Resolve an app-builder built-in resource reference through semantic-runtime's resource catalog. */
export function appBuilderBuiltInResource(
  ref: AppBuilderBuiltInResourceRef,
): BuiltInResource | null {
  return findBuiltInResource(ref);
}

/** Package dependency needed before this resource can be used in an app-builder output. */
export function appBuilderBuiltInResourceDependency(
  ref: AppBuilderBuiltInResourceRef | null,
): string | null {
  if (ref == null || ref.packageId === BuiltInResourcePackage.RuntimeHtml) {
    return null;
  }
  return builtInResourcePackageModuleSpecifier(ref.packageId);
}
