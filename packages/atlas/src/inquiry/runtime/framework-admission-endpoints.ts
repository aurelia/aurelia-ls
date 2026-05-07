import {
  FrameworkBundleAssociationKind,
} from "../../framework/admission.js";
import {
  FrameworkRelationshipEndpointKind,
  type FrameworkRelationshipEndpoint,
} from "../../framework/relationships.js";
import type { SourceTargetRow } from "../../source/index.js";
import type { SourceRange } from "../locus.js";
import {
  sourceRangeForCallSiteEntry,
  sourceRangeForTarget,
} from "./framework-support.js";
import type {
  FrameworkBundleAssociationRow,
  FrameworkBundleExportRow,
} from "./framework-entities.js";

const expressionEndpointKindByAssociationKind: Partial<
  Record<FrameworkBundleAssociationKind, FrameworkRelationshipEndpointKind>
> = {
  [FrameworkBundleAssociationKind.RegistrationCatalog]:
    FrameworkRelationshipEndpointKind.RegistrationCatalog,
  [FrameworkBundleAssociationKind.AppTaskRegistration]:
    FrameworkRelationshipEndpointKind.AppTask,
  [FrameworkBundleAssociationKind.FactoryRegistration]:
    FrameworkRelationshipEndpointKind.Factory,
  [FrameworkBundleAssociationKind.UnknownRegistrationArgument]:
    FrameworkRelationshipEndpointKind.Unknown,
};

/** Build the source endpoint for a configuration/bundle export admitting values. */
export function endpointForAdmissionBundle(
  bundle: FrameworkBundleExportRow,
  fallbackSource: SourceRange,
): FrameworkRelationshipEndpoint {
  return {
    kind: FrameworkRelationshipEndpointKind.ConfigurationExport,
    name: bundle.exportEntry.exportName,
    packageId: bundle.packageId,
    packageName: bundle.packageName,
    source: sourceRangeForBundleExport(bundle) ?? fallbackSource,
  };
}

/** Build the target endpoint admitted by one evaluator-derived bundle association. */
export function endpointForAdmissionAssociation(
  association: FrameworkBundleAssociationRow,
): FrameworkRelationshipEndpoint {
  if (association.diInterface !== undefined) {
    return {
      kind: FrameworkRelationshipEndpointKind.DiKey,
      name: association.diInterface.interfaceKey,
      packageId: association.diInterface.packageId,
      packageName: association.diInterface.packageName,
      source: sourceRangeForCallSiteEntry(
        association.diInterface.createInterfaceCall,
      ),
    };
  }
  if (association.resourceCarrier !== undefined) {
    return {
      kind: FrameworkRelationshipEndpointKind.Resource,
      name:
        association.resourceCarrier.targetName ??
        association.resourceCarrier.sourceExportName,
      packageId: association.resourceCarrier.packageId,
      packageName: association.resourceCarrier.packageName,
      source: association.resourceCarrier.source,
      resourceKind: association.resourceCarrier.resourceKind,
      resourceName: association.resourceCarrier.resourceName,
    };
  }
  if (association.registryExport !== undefined) {
    return {
      kind: FrameworkRelationshipEndpointKind.RegistryExport,
      name: association.registryExport.exportEntry.exportName,
      packageId: association.registryExport.packageId,
      packageName: association.registryExport.packageName,
      source:
        sourceRangeForBundleExport(association.registryExport) ??
        association.source,
    };
  }
  return expressionEndpoint(endpointKindForAssociation(association), association);
}

/** Best source range for a bundle export declaration. */
export function sourceRangeForBundleExport(row: {
  readonly exportEntry: { readonly targets: readonly SourceTargetRow[] };
}): SourceRange | null {
  return sourceRangeForTarget(row.exportEntry.targets[0]);
}

function endpointKindForAssociation(
  association: FrameworkBundleAssociationRow,
): FrameworkRelationshipEndpointKind {
  return expressionEndpointKindByAssociationKind[association.associationKind] ??
    FrameworkRelationshipEndpointKind.RegistrationArgument;
}

function expressionEndpoint(
  kind: FrameworkRelationshipEndpointKind,
  association: FrameworkBundleAssociationRow,
): FrameworkRelationshipEndpoint {
  return {
    kind,
    name:
      association.catalogName ??
      association.targetName ??
      association.helperName ??
      association.expression.symbolName ??
      association.expression.text,
    packageId: association.packageId,
    packageName: association.packageName,
    source: association.source,
  };
}
