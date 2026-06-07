import {
  AppBuilderDomainActionKind,
  AppBuilderDomainActionScope,
  type AppBuilderDomainActionDescriptor,
  AppBuilderDomainFieldValueKind,
  AppBuilderDomainIdentityValueKind,
  type AppBuilderDomainFieldDescriptor,
  AppBuilderDomainRelationshipKind,
  AppBuilderDomainRelationshipLocalValueKind,
  type AppBuilderDomainRelationshipDescriptor,
  type AppBuilderDomainValueSetDescriptor,
} from '../domain-model.js';
import {
  AppBuilderAppStateOwnershipMode,
  AppBuilderAreaNavigationPolicy,
  AppBuilderConventionPolicy,
  AppBuilderCustomElementViewForm,
  AppBuilderDomainModelingMode,
  AppBuilderLocalStatePolicy,
  AppBuilderResourceCarrier,
  AppBuilderRouterAdmissionPolicy,
} from '../aurelia-lowering-option.js';
import type {
  SourcePatternParameterValue,
} from '../../source-plan/source-plan.js';
import type {
  AppBuilderEntitySeedRecordGroup,
  AppBuilderSeedRecord,
} from '../seed-data.js';
import {
  type AuthoredTemplateAttributeSource,
} from '../../template/authored-template-source.js';
import { uniqueStrings } from '../../kernel/collections.js';
import {
  AppBuilderInputContractId,
  AppBuilderInputFacetId,
} from './input.js';
import {
  APP_BUILDER_COLLECTION_FEATURE_IDS,
  APP_BUILDER_COLLECTION_IDENTITY_MODES,
  APP_BUILDER_COLLECTION_IDENTITY_USES,
  AppBuilderCollectionIdentityMode,
  type AppBuilderCollectionIdentityUse,
  AppBuilderCollectionFeatureId,
  type AppBuilderCollectionQueryFeatureSelectionPayload,
} from './collection.js';
import {
  APP_BUILDER_COLLECTION_DISPLAY_ROLES,
  APP_BUILDER_COLLECTION_TABLE_COLUMN_DISPLAY_KINDS,
  type AppBuilderCollectionDisplayFieldPayload,
  AppBuilderCollectionDisplayRole,
  type AppBuilderCollectionTableColumnPayload,
  AppBuilderCollectionTableColumnDisplayKind,
} from './collection-projection.js';
import type {
  AppBuilderSuppliedInput,
} from './input-readiness.js';

/** Accessibility label payload accepted by app-builder source lowering. */
export interface AppBuilderSourceLoweringAccessibilityLabelsPayload {
  readonly label: string;
  readonly description?: string;
  readonly legend?: string;
}

/** Accessibility message payload accepted by app-builder source lowering. */
export interface AppBuilderSourceLoweringAccessibilityHelpErrorPayload {
  /** Optional domain field member name that scopes this message to one generated field group. */
  readonly fieldName?: string;
  readonly helpText?: string;
  readonly errorText?: string;
  readonly statusText?: string;
  readonly helpId?: string;
  readonly errorId?: string;
  readonly statusId?: string;
}

/** User-visible feedback payload tied to one domain action. */
export interface AppBuilderSourceLoweringActionFeedbackPayload {
  readonly actionName: string;
  readonly statusMemberName: string;
  readonly statusText: string;
  readonly statusId?: string;
}

/** Render target for caller-supplied visual class/data hooks during app-builder source lowering. */
export enum AppBuilderSourceLoweringVisualHookTarget {
  /** Wrapper element produced by an app-section composition. */
  AppSection = 'app-section',
  /** Top-level form element produced by a composed form lowerer. */
  Form = 'form',
  /** Wrapper element around one labeled field group. */
  FieldGroup = 'field-group',
  /** Label element owned by one field group. */
  FieldLabel = 'field-label',
  /** Native field control element such as input, select, or textarea. */
  FieldControl = 'field-control',
  /** Help, error, or status message element associated with a field or form. */
  FieldMessage = 'field-message',
  /** Native button element produced for an action or form submit. */
  Button = 'button',
  /** Status element produced for command/action outcome feedback. */
  ActionFeedbackStatus = 'action-feedback-status',
  /** Top-level collection container produced by a collection composition lowerer. */
  Collection = 'collection',
  /** Repeated item element produced by list/card-style collection lowerers. */
  CollectionItem = 'collection-item',
  /** Field display element nested inside a repeated collection item. */
  CollectionField = 'collection-field',
  /** Empty-state element produced when a collection has no rows. */
  CollectionEmptyState = 'collection-empty-state',
  /** Native table element produced by table-style collection lowerers. */
  CollectionTable = 'collection-table',
  /** Header cell element produced by table-style collection lowerers. */
  CollectionTableHeader = 'collection-table-header',
  /** Repeated table row element produced by table-style collection lowerers. */
  CollectionTableRow = 'collection-table-row',
  /** Data cell element produced by table-style collection lowerers. */
  CollectionTableCell = 'collection-table-cell',
  /** Top-level region produced by a loading/empty/error status lowerer. */
  StatusRegion = 'status-region',
  /** Pending-state element produced under a promise status region. */
  StatusPending = 'status-pending',
  /** Empty-state element produced under a fulfilled promise branch. */
  StatusEmpty = 'status-empty',
  /** Error-state element produced under a rejected promise branch. */
  StatusError = 'status-error',
}

/** Stable value list for visual hook target schemas and source-lowering filters. */
export const APP_BUILDER_SOURCE_LOWERING_VISUAL_HOOK_TARGETS = [
  AppBuilderSourceLoweringVisualHookTarget.AppSection,
  AppBuilderSourceLoweringVisualHookTarget.Form,
  AppBuilderSourceLoweringVisualHookTarget.FieldGroup,
  AppBuilderSourceLoweringVisualHookTarget.FieldLabel,
  AppBuilderSourceLoweringVisualHookTarget.FieldControl,
  AppBuilderSourceLoweringVisualHookTarget.FieldMessage,
  AppBuilderSourceLoweringVisualHookTarget.Button,
  AppBuilderSourceLoweringVisualHookTarget.ActionFeedbackStatus,
  AppBuilderSourceLoweringVisualHookTarget.Collection,
  AppBuilderSourceLoweringVisualHookTarget.CollectionItem,
  AppBuilderSourceLoweringVisualHookTarget.CollectionField,
  AppBuilderSourceLoweringVisualHookTarget.CollectionEmptyState,
  AppBuilderSourceLoweringVisualHookTarget.CollectionTable,
  AppBuilderSourceLoweringVisualHookTarget.CollectionTableHeader,
  AppBuilderSourceLoweringVisualHookTarget.CollectionTableRow,
  AppBuilderSourceLoweringVisualHookTarget.CollectionTableCell,
  AppBuilderSourceLoweringVisualHookTarget.StatusRegion,
  AppBuilderSourceLoweringVisualHookTarget.StatusPending,
  AppBuilderSourceLoweringVisualHookTarget.StatusEmpty,
  AppBuilderSourceLoweringVisualHookTarget.StatusError,
] as const;

/** Caller-supplied data attribute carried by a visual class hook payload. */
export interface AppBuilderSourceLoweringVisualDataAttributePayload {
  readonly name: string;
  readonly value?: string;
}

/** Source naming payload accepted by app-builder source lowering. */
export interface AppBuilderSourceLoweringSourceNamingPayload {
  readonly appName?: string;
  readonly baseName?: string;
  readonly sourcePatternParameterValues?: readonly SourcePatternParameterValue[];
}

/** Source file-layout payload accepted by app-builder source lowering. */
export interface AppBuilderSourceLoweringSourceFileLayoutPayload {
  readonly resourceCarrier?: AppBuilderResourceCarrier;
  readonly customElementViewForm?: AppBuilderCustomElementViewForm;
}

/** Domain entity identity payload accepted by app-builder source lowering. */
export interface AppBuilderSourceLoweringDomainEntityPayload {
  readonly entityTitle: string;
  readonly entityTypeName?: string;
  readonly collectionMemberName?: string;
  readonly identityMemberName?: string;
  readonly identityValueKind?: AppBuilderDomainIdentityValueKind;
}

/** Router admission/navigation payload accepted by app-builder source lowering. */
export interface AppBuilderSourceLoweringRoutingPolicyPayload {
  readonly routerAdmission: AppBuilderRouterAdmissionPolicy;
  readonly areaNavigationPolicies?: readonly AppBuilderAreaNavigationPolicy[];
}

/** State ownership payload accepted by app-builder source lowering. */
export interface AppBuilderSourceLoweringStatePolicyPayload {
  readonly appStateOwnership?: AppBuilderAppStateOwnershipMode;
  readonly localStatePolicies?: readonly AppBuilderLocalStatePolicy[];
  readonly domainModeling?: AppBuilderDomainModelingMode;
}

/** Caller-supplied visual hooks that source lowerers can attach without inventing CSS. */
export interface AppBuilderSourceLoweringVisualClassHookPayload {
  readonly target: AppBuilderSourceLoweringVisualHookTarget;
  readonly classTokens?: readonly string[];
  readonly dataAttributes?: readonly AppBuilderSourceLoweringVisualDataAttributePayload[];
  readonly fieldName?: string;
  readonly actionName?: string;
}

/** Collection identity/key payload accepted by app-builder source lowering. */
export interface AppBuilderSourceLoweringCollectionIdentityPolicyPayload {
  readonly mode: AppBuilderCollectionIdentityMode;
  readonly requiredBy?: readonly AppBuilderCollectionIdentityUse[];
  readonly fieldName?: string;
  readonly fieldNames?: readonly string[];
  readonly keyExpression?: string;
}

/** Context filter for selecting visual hooks during one source-lowering step. */
export interface AppBuilderSourceLoweringVisualHookFilter {
  readonly fieldName?: string;
  readonly actionName?: string;
  readonly relationshipName?: string;
}

/** Collection feature ids that the current collection-table projection can spend through explicit request fields. */
export const APP_BUILDER_SOURCE_LOWERING_COLLECTION_TABLE_SUPPORTED_FEATURE_IDS: readonly AppBuilderCollectionFeatureId[] = [
  AppBuilderCollectionFeatureId.BasicPresentation,
  AppBuilderCollectionFeatureId.DisplayProjection,
  AppBuilderCollectionFeatureId.TableColumns,
  AppBuilderCollectionFeatureId.LocalSorting,
  AppBuilderCollectionFeatureId.LocalFiltering,
  AppBuilderCollectionFeatureId.LocalPagination,
  AppBuilderCollectionFeatureId.RowSelection,
  AppBuilderCollectionFeatureId.BatchActions,
] as const;

/** Read domain-field facet payloads from supplied app-builder inputs. */
export function appBuilderSourceLoweringDomainFieldPayloads(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderDomainFieldDescriptor[] {
  return suppliedInputs
    .filter((input) => input.inputContractId === AppBuilderInputContractId.DomainModel)
    .flatMap((input) => input.facetPayloads ?? [])
    .filter((payload) => payload.inputFacetId === AppBuilderInputFacetId.DomainFields)
    .flatMap((payload) => isDomainFieldDescriptorArray(payload.value) ? payload.value : []);
}

/** Read domain-entity facet payloads from supplied app-builder inputs. */
export function appBuilderSourceLoweringDomainEntityPayloads(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderSourceLoweringDomainEntityPayload[] {
  return suppliedInputs
    .filter((input) => input.inputContractId === AppBuilderInputContractId.DomainModel)
    .flatMap((input) => input.facetPayloads ?? [])
    .filter((payload) => payload.inputFacetId === AppBuilderInputFacetId.DomainEntities)
    .flatMap((payload) => {
      if (isDomainEntityPayload(payload.value)) {
        return [payload.value];
      }
      return isDomainEntityPayloadArray(payload.value) ? payload.value : [];
    });
}

/** Read domain-action facet payloads from supplied app-builder inputs. */
export function appBuilderSourceLoweringDomainActionPayloads(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderDomainActionDescriptor[] {
  return suppliedInputs
    .filter((input) => input.inputContractId === AppBuilderInputContractId.DomainModel)
    .flatMap((input) => input.facetPayloads ?? [])
    .filter((payload) => payload.inputFacetId === AppBuilderInputFacetId.DomainActions)
    .flatMap((payload) => isDomainActionDescriptorArray(payload.value) ? payload.value : []);
}

/** Read domain-relationship facet payloads from supplied app-builder inputs. */
export function appBuilderSourceLoweringDomainRelationshipPayloads(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderDomainRelationshipDescriptor[] {
  return suppliedInputs
    .filter((input) => input.inputContractId === AppBuilderInputContractId.DomainModel)
    .flatMap((input) => input.facetPayloads ?? [])
    .filter((payload) => payload.inputFacetId === AppBuilderInputFacetId.DomainRelationships)
    .flatMap((payload) => isDomainRelationshipDescriptorArray(payload.value) ? payload.value : []);
}

/** Field names that selected entity-scoped mutating domain actions require to stay writable. */
export function appBuilderEntityMutationFieldNamesForDomainActions(
  actions: readonly AppBuilderDomainActionDescriptor[],
  fields: readonly AppBuilderDomainFieldDescriptor[],
): readonly string[] {
  return uniqueStrings(actions.flatMap((action) => {
    switch (action.kind) {
      case AppBuilderDomainActionKind.Complete: {
        const fieldName = appBuilderEntityCompleteMutationFieldName(action, fields);
        return fieldName == null
          ? explicitEntityMutationFieldNames(action, fields)
          : [fieldName, ...explicitEntityMutationFieldNames(action, fields)];
      }
      case AppBuilderDomainActionKind.Create:
      case AppBuilderDomainActionKind.Update:
      case AppBuilderDomainActionKind.Save:
      case AppBuilderDomainActionKind.Delete:
      case AppBuilderDomainActionKind.Archive:
      case AppBuilderDomainActionKind.Assign:
      case AppBuilderDomainActionKind.Submit:
      case AppBuilderDomainActionKind.Refresh:
      case AppBuilderDomainActionKind.Custom:
        return explicitEntityMutationFieldNames(action, fields);
    }
  }));
}

/** The narrow first-ring complete action mutates exactly one boolean entity field. */
export function appBuilderEntityCompleteMutationFieldName(
  action: AppBuilderDomainActionDescriptor,
  fields: readonly AppBuilderDomainFieldDescriptor[],
): string | null {
  if (action.kind !== AppBuilderDomainActionKind.Complete
    || action.mutatesState !== true
    || action.scope !== AppBuilderDomainActionScope.Entity) {
    return null;
  }
  const candidateFields = action.inputFieldNames == null || action.inputFieldNames.length === 0
    ? fields
    : action.inputFieldNames.flatMap((fieldName) => fields.find((field) => field.name === fieldName) ?? []);
  const booleanFields = candidateFields.filter((field) => field.valueKind === AppBuilderDomainFieldValueKind.Boolean);
  return booleanFields.length === 1 ? booleanFields[0]!.name : null;
}

/** Caller-declared entity action fields that generated command bodies are allowed to mutate. */
function explicitEntityMutationFieldNames(
  action: AppBuilderDomainActionDescriptor,
  fields: readonly AppBuilderDomainFieldDescriptor[],
): readonly string[] {
  if (action.mutatesState !== true
    || action.scope !== AppBuilderDomainActionScope.Entity
    || action.inputFieldNames == null
    || action.inputFieldNames.length === 0) {
    return [];
  }
  const fieldNames = new Set(fields.map((field) => field.name));
  return action.inputFieldNames.filter((fieldName) => fieldNames.has(fieldName));
}

/** Read domain value-set facet payloads from supplied app-builder inputs. */
export function appBuilderSourceLoweringDomainValueSetPayloads(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderDomainValueSetDescriptor[] {
  return suppliedInputs
    .filter((input) => input.inputContractId === AppBuilderInputContractId.DomainModel)
    .flatMap((input) => input.facetPayloads ?? [])
    .filter((payload) => payload.inputFacetId === AppBuilderInputFacetId.DomainValueSets)
    .flatMap((payload) => isDomainValueSetDescriptorArray(payload.value) ? payload.value : []);
}

/** Read collection display-field facet payloads from supplied app-builder inputs. */
export function appBuilderSourceLoweringCollectionDisplayFieldPayloads(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderCollectionDisplayFieldPayload[] {
  return suppliedInputs
    .filter((input) => input.inputContractId === AppBuilderInputContractId.CollectionProjection)
    .flatMap((input) => input.facetPayloads ?? [])
    .filter((payload) => payload.inputFacetId === AppBuilderInputFacetId.CollectionDisplayFields)
    .flatMap((payload) => isCollectionDisplayFieldPayloadArray(payload.value) ? payload.value : []);
}

/** Read collection table-column facet payloads from supplied app-builder inputs. */
export function appBuilderSourceLoweringCollectionTableColumnPayloads(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderCollectionTableColumnPayload[] {
  return suppliedInputs
    .filter((input) => input.inputContractId === AppBuilderInputContractId.CollectionProjection)
    .flatMap((input) => input.facetPayloads ?? [])
    .filter((payload) => payload.inputFacetId === AppBuilderInputFacetId.CollectionTableColumns)
    .flatMap((payload) => isCollectionTableColumnPayloadArray(payload.value) ? payload.value : []);
}

/** Read collection query-feature facet payloads from supplied app-builder inputs. */
export function appBuilderSourceLoweringCollectionQueryFeaturePayloads(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderCollectionQueryFeatureSelectionPayload[] {
  return suppliedInputs
    .filter((input) => input.inputContractId === AppBuilderInputContractId.CollectionProjection)
    .flatMap((input) => input.facetPayloads ?? [])
    .filter((payload) => payload.inputFacetId === AppBuilderInputFacetId.CollectionQueryFeatures)
    .flatMap((payload) => isCollectionQueryFeaturePayloadArray(payload.value) ? payload.value : []);
}

/** Read collection identity-policy facet payloads from supplied app-builder inputs. */
export function appBuilderSourceLoweringCollectionIdentityPolicyPayloads(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderSourceLoweringCollectionIdentityPolicyPayload[] {
  return suppliedInputs
    .filter((input) => input.inputContractId === AppBuilderInputContractId.CollectionProjection)
    .flatMap((input) => input.facetPayloads ?? [])
    .filter((payload) => payload.inputFacetId === AppBuilderInputFacetId.CollectionIdentityPolicy)
    .flatMap((payload) => isCollectionIdentityPolicyPayload(payload.value) ? [payload.value] : []);
}

/** Return selected collection features that a table projection lowerer cannot spend yet. */
export function appBuilderUnsupportedCollectionTableQueryFeatures(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderCollectionQueryFeatureSelectionPayload[] {
  return appBuilderSourceLoweringCollectionQueryFeaturePayloads(suppliedInputs)
    .filter((payload) =>
      !APP_BUILDER_SOURCE_LOWERING_COLLECTION_TABLE_SUPPORTED_FEATURE_IDS.includes(payload.featureId)
    );
}

/** Read source-root facet payloads from supplied app-builder inputs. */
export function appBuilderSourceLoweringSourceRootPayloads(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly string[] {
  return appBuilderSourceLoweringStringFacetPayloads(
    suppliedInputs,
    AppBuilderInputFacetId.SourceRoot,
  );
}

/** Read source-target-path facet payloads from supplied app-builder inputs. */
export function appBuilderSourceLoweringSourceTargetPathPayloads(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly string[] {
  return appBuilderSourceLoweringStringFacetPayloads(
    suppliedInputs,
    AppBuilderInputFacetId.SourceTargetPath,
  );
}

/** Read source-naming facet payloads from supplied app-builder inputs. */
export function appBuilderSourceLoweringSourceNamingPayloads(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderSourceLoweringSourceNamingPayload[] {
  return suppliedInputs
    .filter((input) => input.inputContractId === AppBuilderInputContractId.SourcePlacement)
    .flatMap((input) => input.facetPayloads ?? [])
    .filter((payload) => payload.inputFacetId === AppBuilderInputFacetId.SourceNaming)
    .flatMap((payload) => isSourceNamingPayload(payload.value) ? [payload.value] : []);
}

/** Read source-pattern parameter values from source-naming payloads. */
export function appBuilderSourceLoweringSourcePatternParameterValues(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly SourcePatternParameterValue[] {
  return appBuilderSourceLoweringSourceNamingPayloads(suppliedInputs)
    .flatMap((payload) => payload.sourcePatternParameterValues ?? [])
    .filter(isSourcePatternParameterValue);
}

/** Read source file-layout facet payloads from supplied app-builder inputs. */
export function appBuilderSourceLoweringSourceFileLayoutPayloads(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderSourceLoweringSourceFileLayoutPayload[] {
  return suppliedInputs
    .filter((input) => input.inputContractId === AppBuilderInputContractId.SourcePlacement)
    .flatMap((input) => input.facetPayloads ?? [])
    .filter((payload) => payload.inputFacetId === AppBuilderInputFacetId.SourceFileLayout)
    .flatMap((payload) => isSourceFileLayoutPayload(payload.value) ? [payload.value] : []);
}

/** Read Aurelia convention-policy facet payloads from supplied app-builder inputs. */
export function appBuilderSourceLoweringConventionPolicyPayloads(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderConventionPolicy[] {
  return suppliedInputs
    .filter((input) => input.inputContractId === AppBuilderInputContractId.AureliaPolicy)
    .flatMap((input) => input.facetPayloads ?? [])
    .filter((payload) => payload.inputFacetId === AppBuilderInputFacetId.AureliaConventionPolicy)
    .flatMap((payload) =>
      Object.values(AppBuilderConventionPolicy).includes(payload.value as AppBuilderConventionPolicy)
        ? [payload.value as AppBuilderConventionPolicy]
        : []
    );
}

/** Read Aurelia router admission/navigation policy payloads from supplied app-builder inputs. */
export function appBuilderSourceLoweringRoutingPolicyPayloads(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderSourceLoweringRoutingPolicyPayload[] {
  return suppliedInputs
    .filter((input) => input.inputContractId === AppBuilderInputContractId.AureliaPolicy)
    .flatMap((input) => input.facetPayloads ?? [])
    .filter((payload) => payload.inputFacetId === AppBuilderInputFacetId.AureliaRoutingPolicy)
    .flatMap((payload) => isRoutingPolicyPayload(payload.value) ? [payload.value] : []);
}

/** Read Aurelia state ownership policy payloads from supplied app-builder inputs. */
export function appBuilderSourceLoweringStatePolicyPayloads(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderSourceLoweringStatePolicyPayload[] {
  return suppliedInputs
    .filter((input) => input.inputContractId === AppBuilderInputContractId.AureliaPolicy)
    .flatMap((input) => input.facetPayloads ?? [])
    .filter((payload) => payload.inputFacetId === AppBuilderInputFacetId.AureliaStatePolicy)
    .flatMap((payload) => isStatePolicyPayload(payload.value) ? [payload.value] : []);
}

/** Read caller-supplied seed records from supplied app-builder inputs. */
export function appBuilderSourceLoweringSeedRecordSetPayloads(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderSeedRecord[] {
  return suppliedInputs
    .filter((input) => input.inputContractId === AppBuilderInputContractId.SeedData)
    .flatMap((input) => input.facetPayloads ?? [])
    .filter((payload) => payload.inputFacetId === AppBuilderInputFacetId.SeedRecordSet)
    .flatMap((payload) => isSeedRecordArray(payload.value) ? payload.value : []);
}

/** Read entity-scoped seed record groups from supplied app-builder inputs. */
export function appBuilderSourceLoweringEntitySeedRecordGroups(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderEntitySeedRecordGroup[] {
  return suppliedInputs
    .filter((input) => input.inputContractId === AppBuilderInputContractId.SeedData)
    .flatMap((input) => input.facetPayloads ?? [])
    .filter((payload) => payload.inputFacetId === AppBuilderInputFacetId.SeedRecordSet)
    .flatMap((payload) => isEntitySeedRecordGroupArray(payload.value) ? payload.value : []);
}

/** Read caller-supplied seed records for a specific entity, falling back to unscoped records for single-entity payloads. */
export function appBuilderSourceLoweringSeedRecordsForEntity(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  entityName: string,
): readonly AppBuilderSeedRecord[] {
  const groups = appBuilderSourceLoweringEntitySeedRecordGroups(suppliedInputs);
  if (groups.length > 0) {
    return groups
      .filter((group) => group.entityName === entityName)
      .flatMap((group) => group.records);
  }
  return appBuilderSourceLoweringSeedRecordSetPayloads(suppliedInputs);
}

/** Read accessibility label facet payloads from supplied app-builder inputs. */
export function appBuilderSourceLoweringAccessibilityLabelPayloads(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderSourceLoweringAccessibilityLabelsPayload[] {
  return suppliedInputs
    .filter((input) => input.inputContractId === AppBuilderInputContractId.ControlAccessibility)
    .flatMap((input) => input.facetPayloads ?? [])
    .filter((payload) => payload.inputFacetId === AppBuilderInputFacetId.AccessibilityLabels)
    .flatMap((payload) => isAccessibilityLabelsPayload(payload.value) ? [payload.value] : []);
}

/** Read accessibility help/error/status facet payloads from supplied app-builder inputs. */
export function appBuilderSourceLoweringAccessibilityHelpErrorPayloads(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderSourceLoweringAccessibilityHelpErrorPayload[] {
  return suppliedInputs
    .filter((input) => input.inputContractId === AppBuilderInputContractId.ControlAccessibility)
    .flatMap((input) => input.facetPayloads ?? [])
    .filter((payload) => payload.inputFacetId === AppBuilderInputFacetId.AccessibilityHelpError)
    .flatMap((payload) => isAccessibilityHelpErrorPayload(payload.value) ? [payload.value] : []);
}

/** Read action feedback facet payloads from supplied app-builder inputs. */
export function appBuilderSourceLoweringActionFeedbackPayloads(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderSourceLoweringActionFeedbackPayload[] {
  return suppliedInputs
    .filter((input) => input.inputContractId === AppBuilderInputContractId.InteractionFeedback)
    .flatMap((input) => input.facetPayloads ?? [])
    .filter((payload) => payload.inputFacetId === AppBuilderInputFacetId.ActionFeedback)
    .flatMap((payload) => isActionFeedbackPayloadArray(payload.value) ? payload.value : []);
}

/** Read visual class/data hook facet payloads from supplied app-builder inputs. */
export function appBuilderSourceLoweringVisualClassHookPayloads(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderSourceLoweringVisualClassHookPayload[] {
  return suppliedInputs
    .filter((input) => input.inputContractId === AppBuilderInputContractId.VisualStyleInput)
    .flatMap((input) => input.facetPayloads ?? [])
    .filter((payload) => payload.inputFacetId === AppBuilderInputFacetId.VisualClassHooks)
    .flatMap((payload) => isVisualClassHookPayloadArray(payload.value) ? payload.value : []);
}

/** Project visual hook payloads into authored attributes for one generated element target. */
export function appBuilderSourceLoweringVisualHookAttributes(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  target: AppBuilderSourceLoweringVisualHookTarget,
  filter: AppBuilderSourceLoweringVisualHookFilter = {},
): readonly AuthoredTemplateAttributeSource[] {
  const hooks = appBuilderSourceLoweringVisualClassHookPayloads(suppliedInputs)
    .filter((hook) => visualHookMatches(hook, target, filter));
  const classTokens = uniqueStrings(hooks.flatMap((hook) => hook.classTokens ?? []));
  const dataAttributes = uniqueDataAttributes(hooks.flatMap((hook) => hook.dataAttributes ?? []));
  return [
    ...optionalAttribute('class', classTokens.length === 0 ? null : classTokens.join(' ')),
    ...dataAttributes.map((attribute) => ({
      rawName: attribute.name,
      rawValue: attribute.value ?? null,
    })),
  ];
}

function isDomainFieldDescriptorArray(
  value: unknown,
): value is readonly AppBuilderDomainFieldDescriptor[] {
  return Array.isArray(value) && value.every(isDomainFieldDescriptor);
}

function isDomainFieldDescriptor(
  value: unknown,
): value is AppBuilderDomainFieldDescriptor {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.name === 'string'
    && typeof record.title === 'string'
    && optionalString(record.entityName)
    && Object.values(AppBuilderDomainFieldValueKind).includes(record.valueKind as AppBuilderDomainFieldValueKind)
    && (record.defaultValue === undefined || isSeedRecordValue(record.defaultValue))
    && (record.numericConstraints == null || isNumericFieldConstraintDescriptor(record.numericConstraints))
    && optionalString(record.optionTypeName);
}

function isDomainEntityPayload(
  value: unknown,
): value is AppBuilderSourceLoweringDomainEntityPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.entityTitle === 'string'
    && optionalString(record.entityTypeName)
    && optionalString(record.collectionMemberName)
    && optionalString(record.identityMemberName)
    && (record.identityValueKind == null
      || Object.values(AppBuilderDomainIdentityValueKind).includes(record.identityValueKind as AppBuilderDomainIdentityValueKind));
}

function isDomainEntityPayloadArray(
  value: unknown,
): value is readonly AppBuilderSourceLoweringDomainEntityPayload[] {
  return Array.isArray(value) && value.every(isDomainEntityPayload);
}

function isNumericFieldConstraintDescriptor(
  value: unknown,
): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (record.minimum == null || typeof record.minimum === 'number')
    && (record.maximum == null || typeof record.maximum === 'number')
    && (record.step == null || typeof record.step === 'number');
}

function isDomainActionDescriptorArray(
  value: unknown,
): value is readonly AppBuilderDomainActionDescriptor[] {
  return Array.isArray(value) && value.every(isDomainActionDescriptor);
}

function isDomainActionDescriptor(
  value: unknown,
): value is AppBuilderDomainActionDescriptor {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.name === 'string'
    && Object.values(AppBuilderDomainActionKind).includes(record.kind as AppBuilderDomainActionKind);
}

function isDomainRelationshipDescriptorArray(
  value: unknown,
): value is readonly AppBuilderDomainRelationshipDescriptor[] {
  return Array.isArray(value) && value.every(isDomainRelationshipDescriptor);
}

function isDomainRelationshipDescriptor(
  value: unknown,
): value is AppBuilderDomainRelationshipDescriptor {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.name === 'string'
    && Object.values(AppBuilderDomainRelationshipKind).includes(record.kind as AppBuilderDomainRelationshipKind)
    && optionalString(record.title)
    && optionalString(record.fromEntityName)
    && typeof record.toEntityName === 'string'
    && optionalString(record.localFieldName)
    && (record.localValueKind == null
      || Object.values(AppBuilderDomainRelationshipLocalValueKind).includes(record.localValueKind as AppBuilderDomainRelationshipLocalValueKind))
    && optionalString(record.foreignFieldName)
    && optionalString(record.displayFieldName)
    && (record.required == null || typeof record.required === 'boolean');
}

function isDomainValueSetDescriptorArray(
  value: unknown,
): value is readonly AppBuilderDomainValueSetDescriptor[] {
  return Array.isArray(value) && value.every(isDomainValueSetDescriptor);
}

function isDomainValueSetDescriptor(
  value: unknown,
): value is AppBuilderDomainValueSetDescriptor {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.name === 'string'
    && Array.isArray(record.options)
    && (record.valueKind == null || Object.values(AppBuilderDomainFieldValueKind).includes(record.valueKind as AppBuilderDomainFieldValueKind));
}

function isCollectionDisplayFieldPayloadArray(
  value: unknown,
): value is readonly AppBuilderCollectionDisplayFieldPayload[] {
  return Array.isArray(value) && value.every(isCollectionDisplayFieldPayload);
}

function isCollectionDisplayFieldPayload(
  value: unknown,
): value is AppBuilderCollectionDisplayFieldPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.fieldName === 'string'
    && APP_BUILDER_COLLECTION_DISPLAY_ROLES.includes(record.role as AppBuilderCollectionDisplayRole)
    && optionalString(record.label);
}

function isCollectionTableColumnPayloadArray(
  value: unknown,
): value is readonly AppBuilderCollectionTableColumnPayload[] {
  return Array.isArray(value) && value.every(isCollectionTableColumnPayload);
}

function isCollectionTableColumnPayload(
  value: unknown,
): value is AppBuilderCollectionTableColumnPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return optionalString(record.fieldName)
    && optionalString(record.actionName)
    && optionalString(record.relationshipName)
    && typeof record.header === 'string'
    && (record.displayKind == null
      || APP_BUILDER_COLLECTION_TABLE_COLUMN_DISPLAY_KINDS.includes(record.displayKind as AppBuilderCollectionTableColumnDisplayKind))
    && optionalString(record.routeInstruction)
    && optionalString(record.routeBindingExpression)
    && optionalString(record.routeParamsExpression)
    && optionalString(record.routeContextExpression)
    && optionalString(record.routeActiveExpression)
    && optionalString(record.routeTargetAttributeName)
    && optionalString(record.linkText)
    && optionalBoolean(record.sortable)
    && optionalBoolean(record.filterable);
}

function isCollectionQueryFeaturePayloadArray(
  value: unknown,
): value is readonly AppBuilderCollectionQueryFeatureSelectionPayload[] {
  return Array.isArray(value) && value.every(isCollectionQueryFeaturePayload);
}

function isCollectionQueryFeaturePayload(
  value: unknown,
): value is AppBuilderCollectionQueryFeatureSelectionPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return APP_BUILDER_COLLECTION_FEATURE_IDS.includes(record.featureId as AppBuilderCollectionFeatureId)
    && optionalStringArray(record.fieldNames)
    && optionalStringArray(record.actionNames)
    && optionalPositiveInteger(record.pageSize)
    && optionalPositiveInteger(record.initialPage)
    && optionalBoolean(record.initiallyEnabled)
    && optionalString(record.summary);
}

function isCollectionIdentityPolicyPayload(
  value: unknown,
): value is AppBuilderSourceLoweringCollectionIdentityPolicyPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return APP_BUILDER_COLLECTION_IDENTITY_MODES.includes(record.mode as AppBuilderCollectionIdentityMode)
    && optionalIdentityUseArray(record.requiredBy)
    && optionalString(record.fieldName)
    && optionalStringArray(record.fieldNames)
    && optionalString(record.keyExpression);
}

function optionalIdentityUseArray(value: unknown): boolean {
  return value == null
    || (Array.isArray(value)
      && value.every((entry) => APP_BUILDER_COLLECTION_IDENTITY_USES.includes(entry as AppBuilderCollectionIdentityUse)));
}

function isSourceNamingPayload(
  value: unknown,
): value is AppBuilderSourceLoweringSourceNamingPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return optionalString(record.appName)
    && optionalString(record.baseName)
    && optionalSourcePatternParameterValueArray(record.sourcePatternParameterValues);
}

function isSourceFileLayoutPayload(
  value: unknown,
): value is AppBuilderSourceLoweringSourceFileLayoutPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (record.resourceCarrier == null
      || Object.values(AppBuilderResourceCarrier).includes(record.resourceCarrier as AppBuilderResourceCarrier))
    && (record.customElementViewForm == null
      || Object.values(AppBuilderCustomElementViewForm).includes(record.customElementViewForm as AppBuilderCustomElementViewForm));
}

function isAccessibilityLabelsPayload(
  value: unknown,
): value is AppBuilderSourceLoweringAccessibilityLabelsPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.label === 'string';
}

function isAccessibilityHelpErrorPayload(
  value: unknown,
): value is AppBuilderSourceLoweringAccessibilityHelpErrorPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return optionalString(record.fieldName)
    && optionalString(record.helpText)
    && optionalString(record.errorText)
    && optionalString(record.statusText)
    && optionalString(record.helpId)
    && optionalString(record.errorId)
    && optionalString(record.statusId);
}

function isActionFeedbackPayloadArray(
  value: unknown,
): value is readonly AppBuilderSourceLoweringActionFeedbackPayload[] {
  return Array.isArray(value) && value.every(isActionFeedbackPayload);
}

function isActionFeedbackPayload(
  value: unknown,
): value is AppBuilderSourceLoweringActionFeedbackPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.actionName === 'string'
    && typeof record.statusMemberName === 'string'
    && typeof record.statusText === 'string'
    && optionalString(record.statusId);
}

function isRoutingPolicyPayload(
  value: unknown,
): value is AppBuilderSourceLoweringRoutingPolicyPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return Object.values(AppBuilderRouterAdmissionPolicy).includes(record.routerAdmission as AppBuilderRouterAdmissionPolicy)
    && optionalEnumArray(record.areaNavigationPolicies, AppBuilderAreaNavigationPolicy);
}

function isStatePolicyPayload(
  value: unknown,
): value is AppBuilderSourceLoweringStatePolicyPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (record.appStateOwnership == null
      || Object.values(AppBuilderAppStateOwnershipMode).includes(record.appStateOwnership as AppBuilderAppStateOwnershipMode))
    && optionalEnumArray(record.localStatePolicies, AppBuilderLocalStatePolicy)
    && (record.domainModeling == null
      || Object.values(AppBuilderDomainModelingMode).includes(record.domainModeling as AppBuilderDomainModelingMode));
}

function optionalSourcePatternParameterValueArray(
  value: unknown,
): boolean {
  return value == null || (Array.isArray(value) && value.every(isSourcePatternParameterValue));
}

function isSourcePatternParameterValue(
  value: unknown,
): value is SourcePatternParameterValue {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.key === 'string'
    && typeof record.value === 'string';
}

function isSeedRecordArray(
  value: unknown,
): value is readonly AppBuilderSeedRecord[] {
  return Array.isArray(value) && value.every(isSeedRecord);
}

function isEntitySeedRecordGroupArray(
  value: unknown,
): value is readonly AppBuilderEntitySeedRecordGroup[] {
  return Array.isArray(value) && value.every(isEntitySeedRecordGroup);
}

function isEntitySeedRecordGroup(
  value: unknown,
): value is AppBuilderEntitySeedRecordGroup {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.entityName === 'string'
    && record.entityName.trim().length > 0
    && isSeedRecordArray(record.records);
}

function isSeedRecord(
  value: unknown,
): value is AppBuilderSeedRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every(isSeedRecordValue);
}

function isSeedRecordValue(
  value: unknown,
): boolean {
  return value == null
    || typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
    || (Array.isArray(value) && value.every(isSeedRecordArrayValue))
    || isSeedRecord(value);
}

function isSeedRecordArrayValue(
  value: unknown,
): boolean {
  return value == null
    || typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
    || isSeedRecord(value);
}

function isVisualClassHookPayloadArray(
  value: unknown,
): value is readonly AppBuilderSourceLoweringVisualClassHookPayload[] {
  return Array.isArray(value) && value.every(isVisualClassHookPayload);
}

function isVisualClassHookPayload(
  value: unknown,
): value is AppBuilderSourceLoweringVisualClassHookPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return Object.values(AppBuilderSourceLoweringVisualHookTarget).includes(record.target as AppBuilderSourceLoweringVisualHookTarget)
    && optionalClassTokenArray(record.classTokens)
    && optionalVisualDataAttributeArray(record.dataAttributes)
    && optionalString(record.fieldName)
    && optionalString(record.actionName);
}

function optionalClassTokenArray(
  value: unknown,
): boolean {
  return value == null || (Array.isArray(value) && value.every((token) =>
    typeof token === 'string' && isValidClassToken(token)
  ));
}

function optionalVisualDataAttributeArray(
  value: unknown,
): boolean {
  return value == null || (Array.isArray(value) && value.every(isVisualDataAttributePayload));
}

function optionalEnumArray<TValue extends string>(
  value: unknown,
  enumObject: Record<string, TValue>,
): boolean {
  return value == null || (Array.isArray(value) && value.every((entry) =>
    Object.values(enumObject).includes(entry as TValue)
  ));
}

function optionalStringArray(
  value: unknown,
): boolean {
  return value == null || (Array.isArray(value) && value.every((entry) => typeof entry === 'string'));
}

function optionalPositiveInteger(
  value: unknown,
): boolean {
  return value == null || (typeof value === 'number' && Number.isInteger(value) && value > 0);
}

function isVisualDataAttributePayload(
  value: unknown,
): value is AppBuilderSourceLoweringVisualDataAttributePayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.name === 'string'
    && isValidDataAttributeName(record.name)
    && optionalString(record.value);
}

function visualHookMatches(
  hook: AppBuilderSourceLoweringVisualClassHookPayload,
  target: AppBuilderSourceLoweringVisualHookTarget,
  filter: AppBuilderSourceLoweringVisualHookFilter,
): boolean {
  return hook.target === target
    && scopedValueMatches(hook.fieldName, filter.fieldName)
    && scopedValueMatches(hook.actionName, filter.actionName)
    && scopedValueMatches(undefined, filter.relationshipName);
}

function scopedValueMatches(
  hookValue: string | undefined,
  filterValue: string | undefined,
): boolean {
  return hookValue == null || hookValue === filterValue;
}

function uniqueDataAttributes(
  values: readonly AppBuilderSourceLoweringVisualDataAttributePayload[],
): readonly AppBuilderSourceLoweringVisualDataAttributePayload[] {
  const byName = new Map<string, AppBuilderSourceLoweringVisualDataAttributePayload>();
  for (const value of values) {
    if (!byName.has(value.name)) {
      byName.set(value.name, value);
    }
  }
  return [...byName.values()];
}

function optionalAttribute(
  rawName: string,
  rawValue: string | null,
): readonly AuthoredTemplateAttributeSource[] {
  return rawValue == null ? [] : [{ rawName, rawValue }];
}

function appBuilderSourceLoweringStringFacetPayloads(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  inputFacetId: AppBuilderInputFacetId,
): readonly string[] {
  return uniqueStrings(suppliedInputs
    .filter((input) => input.inputContractId === AppBuilderInputContractId.SourcePlacement)
    .flatMap((input) => input.facetPayloads ?? [])
    .filter((payload) => payload.inputFacetId === inputFacetId)
    .flatMap((payload) => typeof payload.value === 'string' ? [payload.value] : []));
}

function isValidClassToken(
  value: string,
): boolean {
  return /^[^\s"'<>`=]+$/.test(value);
}

function isValidDataAttributeName(
  value: string,
): boolean {
  return /^data-[a-z0-9_.:-]+$/.test(value);
}

function optionalString(
  value: unknown,
): boolean {
  return value == null || typeof value === 'string';
}

function optionalBoolean(
  value: unknown,
): boolean {
  return value == null || typeof value === 'boolean';
}
