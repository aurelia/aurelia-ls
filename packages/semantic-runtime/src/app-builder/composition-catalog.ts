import {
  AppBuilderAppStateOwnershipMode,
  AppBuilderBindingPolicy,
  AppBuilderConventionPolicy,
  AppBuilderDomainModelingMode,
  AppBuilderLocalStatePolicy,
  AppBuilderResourceDeclarationMode,
  AppBuilderResourceDomEncapsulationMode,
  AppBuilderRouterAdmissionPolicy,
} from './aurelia-lowering-option.js';
import type { AppBuilderPatternComposition } from './composition.js';
import { AppBuilderDomainSlotKey, AppBuilderDomainSlotKind } from './domain-model.js';
import { AppBuilderStarterIntentId } from './intent.js';
import { AppBuilderPatternId } from './pattern.js';
import { AppBuilderReferenceScenarioId } from './reference-scenario.js';
import { AppBuilderSeedProfileId } from './seed-profile.js';
import { AppBuilderSolutionSpaceId } from './solution-space.js';
import { ExpectedSemanticEffectKind } from '../fixture-verification/expected-effect.js';
import { SourcePatternUsePolicy } from '../source-plan/source-plan.js';

/** Core app-builder compositions that can lower without going through the legacy recipe layer. */
export const APP_BUILDER_STARTER_COMPOSITIONS: readonly AppBuilderPatternComposition[] = [
  {
    id: 'minimal-app-shell.decorator',
    title: 'Minimal App Shell With Decorator Resource',
    primaryPatternId: AppBuilderPatternId.MinimalAppShell,
    patternIds: [AppBuilderPatternId.SingleAppPackage, AppBuilderPatternId.MinimalAppShell],
    sourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    seedProfileIds: [AppBuilderSeedProfileId.MinimalRunnable],
    starterIntentIds: [AppBuilderStarterIntentId.MinimalAppStarter],
    domainSlots: [],
    aureliaLowering: {
      appConventionPolicy: AppBuilderConventionPolicy.ExplicitResourceDeclarations,
      resourceDeclaration: AppBuilderResourceDeclarationMode.DecoratorResource,
      routerAdmission: AppBuilderRouterAdmissionPolicy.NoRouter,
      localStatePolicies: [AppBuilderLocalStatePolicy.ViewModelLocalState],
      resourceDomEncapsulation: AppBuilderResourceDomEncapsulationMode.LightDom,
    },
    verificationEffectKinds: [
      ExpectedSemanticEffectKind.ResourceDefinition,
      ExpectedSemanticEffectKind.RuntimeController,
      ExpectedSemanticEffectKind.TemplateCompilation,
      ExpectedSemanticEffectKind.OpenSeamClosure,
    ],
    summary: 'Tiny runnable app shell with explicit custom-element decorator metadata.',
  },
  {
    id: 'minimal-app-shell.convention',
    title: 'Minimal App Shell With Convention Resource',
    primaryPatternId: AppBuilderPatternId.MinimalAppShell,
    patternIds: [AppBuilderPatternId.SingleAppPackage, AppBuilderPatternId.MinimalAppShell],
    sourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    seedProfileIds: [AppBuilderSeedProfileId.MinimalRunnable],
    starterIntentIds: [AppBuilderStarterIntentId.MinimalAppStarter],
    domainSlots: [],
    aureliaLowering: {
      appConventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
      resourceDeclaration: AppBuilderResourceDeclarationMode.ConventionResource,
      routerAdmission: AppBuilderRouterAdmissionPolicy.NoRouter,
      localStatePolicies: [AppBuilderLocalStatePolicy.ViewModelLocalState],
      resourceDomEncapsulation: AppBuilderResourceDomEncapsulationMode.LightDom,
    },
    verificationEffectKinds: [
      ExpectedSemanticEffectKind.ResourceDefinition,
      ExpectedSemanticEffectKind.RuntimeController,
      ExpectedSemanticEffectKind.TemplateCompilation,
      ExpectedSemanticEffectKind.OpenSeamClosure,
    ],
    summary: 'Tiny runnable app shell using Aurelia component/template conventions.',
  },
  {
    id: 'state-backed-collection-list.convention',
    title: 'State-Backed Collection List',
    primaryPatternId: AppBuilderPatternId.CollectionBrowser,
    patternIds: [
      AppBuilderPatternId.SingleAppPackage,
      AppBuilderPatternId.MinimalAppShell,
      AppBuilderPatternId.CollectionBrowser,
      AppBuilderPatternId.DiOwnedAppState,
      AppBuilderPatternId.ComposedDomainState,
      AppBuilderPatternId.PlainDomainEntity,
      AppBuilderPatternId.DirectStateTemplateRead,
      AppBuilderPatternId.NativeValueChannel,
      AppBuilderPatternId.CheckedCollectionChannel,
    ],
    sourcePolicy: SourcePatternUsePolicy.ApplyAsSourceStart,
    seedProfileIds: [AppBuilderSeedProfileId.CleanStarter],
    starterIntentIds: [AppBuilderStarterIntentId.CollectionListStarter],
    solutionSpaceIds: [
      AppBuilderSolutionSpaceId.OperationsBackoffice,
      AppBuilderSolutionSpaceId.SupportWorkspace,
      AppBuilderSolutionSpaceId.AccountSettings,
    ],
    referenceScenarioIds: [
      AppBuilderReferenceScenarioId.StructuredRecordManagement,
      AppBuilderReferenceScenarioId.CollectionBrowseAndCompare,
      AppBuilderReferenceScenarioId.TransactionalFormFlow,
    ],
    domainSlots: [
      {
        kind: AppBuilderDomainSlotKind.EntityTitle,
        key: AppBuilderDomainSlotKey.EntityTitle,
        summary: 'Human-facing item/entity label for the collection.',
        required: true,
      },
      {
        kind: AppBuilderDomainSlotKind.EntityTypeName,
        key: AppBuilderDomainSlotKey.EntityTypeName,
        summary: 'TypeScript-safe class name for the collection item.',
        required: true,
      },
      {
        kind: AppBuilderDomainSlotKind.CollectionMemberName,
        key: AppBuilderDomainSlotKey.CollectionMemberName,
        summary: 'State property name for the collection array.',
        required: true,
      },
      {
        kind: AppBuilderDomainSlotKind.IdentityMemberName,
        key: AppBuilderDomainSlotKey.IdentityMemberName,
        summary: 'Scalar identity member used for starter records.',
        required: true,
      },
      {
        kind: AppBuilderDomainSlotKind.FieldSchema,
        key: AppBuilderDomainSlotKey.FieldSchema,
        summary: 'At least one text field and one boolean field for add-item and checked binding flow.',
        required: true,
      },
    ],
    aureliaLowering: {
      appConventionPolicy: AppBuilderConventionPolicy.ConventionsEnabled,
      resourceDeclaration: AppBuilderResourceDeclarationMode.ConventionResource,
      appStateOwnership: AppBuilderAppStateOwnershipMode.DiStateClass,
      domainModeling: AppBuilderDomainModelingMode.PlainDomainComposition,
      routerAdmission: AppBuilderRouterAdmissionPolicy.NoRouter,
      bindingPolicies: [AppBuilderBindingPolicy.DirectStateTemplateBinding],
      resourceDomEncapsulation: AppBuilderResourceDomEncapsulationMode.LightDom,
    },
    verificationEffectKinds: [
      ExpectedSemanticEffectKind.ResourceDefinition,
      ExpectedSemanticEffectKind.RuntimeController,
      ExpectedSemanticEffectKind.TemplateCompilation,
      ExpectedSemanticEffectKind.BindingObservedDependency,
      ExpectedSemanticEffectKind.BindingValueChannel,
      ExpectedSemanticEffectKind.BindingDataFlow,
      ExpectedSemanticEffectKind.OpenSeamClosure,
    ],
    summary: 'Clean starter collection list with DI state, ordinary domain entity, repeat rendering, checked binding, and add-item value flow.',
  },
];

export function appBuilderStarterCompositionDescriptor(
  id: string,
): AppBuilderPatternComposition {
  const composition = APP_BUILDER_STARTER_COMPOSITIONS.find((candidate) => candidate.id === id);
  if (composition == null) {
    throw new Error(`Unknown app-builder starter composition '${id}'.`);
  }
  return composition;
}
