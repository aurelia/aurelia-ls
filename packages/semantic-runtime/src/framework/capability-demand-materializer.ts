import path from 'node:path';
import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import {
  type BootPackageManifest,
  isHostPathWithin,
  normalizePosixPath,
  readPackageManifest,
  readPackageWorkspacePatterns,
  sameHostPath,
} from '../boot/host-files.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type { SourceSpan } from '../expression/source-span.js';
import type {
  AddressHandle,
  IdentityHandle,
} from '../kernel/handles.js';
import { FrameworkIdentity } from '../kernel/identity.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  FrameworkRegistrationCapability,
  frameworkRegistrationKindsForCapability,
  frameworkRegistrationModuleNamesForCapability,
} from '../registration/framework-registration-manifest.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  type AttributeSyntax,
} from '../template/attribute-syntax.js';
import {
  BuiltInBindingCommandName,
  BuiltInSyntaxGroup,
  findUniqueBuiltInBindingCommandByName,
  parseBuiltInAttributeSyntax,
  type BuiltInBindingCommand,
} from '../template/built-in-syntax.js';
import {
  bindingBehaviorExpressions,
  valueConverterExpressions,
} from '../template/binding-behavior-expression.js';
import { findVisibleTemplateResource } from '../template/compiler-resource-lookup.js';
import {
  runtimeAcceptedBindingExpressionAstForParse,
} from '../template/expression-parse-projection.js';
import {
  HtmlElement,
  HtmlElementAttributeOwner,
  htmlElementAttributeOwnersByAttributeProduct,
  htmlElementLookupName,
  type HtmlAttribute,
} from '../template/html-ir.js';
import type {
  TemplateCompilationProjectEmission,
  TemplateResourceRuntimeAnalysisEmission,
} from '../template/template-compilation-project-pass.js';
import {
  templateExpressionParsesForResource,
} from '../template/template-expression-selection.js';
import {
  sourceAddressForRuntimeExpressionSpan,
} from '../template/runtime-expression-source-address.js';
import type { TemplateExpressionParse } from '../template/value-site.js';
import {
  allBuiltInResources,
  BuiltInResourcePackage,
  type BuiltInResource,
} from '../resources/built-in-resources.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  FrameworkCapabilityAdmissionState,
  FrameworkCapabilityAvailabilityState,
  FrameworkCapabilityDemand,
  FrameworkCapabilityDemandKind,
  FrameworkCapabilityDemandProjectResult,
  FrameworkCapabilityDemandSiteKind,
  FrameworkCapabilityPackageEvidence,
  FrameworkCapabilityPackageEvidenceKind,
  type FrameworkCapabilityPackageEvidenceScope,
} from './capability-demand.js';
import { FrameworkProductDetails } from './product-details.js';

interface CapabilityDemandSite {
  readonly siteKind: FrameworkCapabilityDemandSiteKind;
  readonly demandKind: FrameworkCapabilityDemandKind;
  readonly requiredCapability: FrameworkRegistrationCapability;
  readonly authoredName: string;
  readonly admitted: boolean;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly ownerIdentityHandle: IdentityHandle | null;
  readonly resource: TemplateResourceRuntimeAnalysisEmission;
  readonly sourceRecords?: readonly KernelStoreRecord[];
}

interface CapabilityAvailabilityEvidenceContext {
  readonly byPackageName: ReadonlyMap<string, readonly FrameworkCapabilityPackageEvidence[]>;
}

class CapabilityDemandPublication {
  constructor(
    readonly demand: FrameworkCapabilityDemand,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Materializes authored framework capability demands after template front-door compilation. */
export class FrameworkCapabilityDemandMaterializer {
  constructor(
    readonly store: KernelStore,
  ) {}

  materializeAndEmit(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
    templates: TemplateCompilationProjectEmission,
  ): FrameworkCapabilityDemandProjectResult {
    const availability = readCapabilityAvailabilityEvidence(project, typeSystem);
    const publications = capabilityDemandSites(this.store, templates).map((site, index) =>
      this.publishDemand(project, site, availability, index)
    );
    const records = publications.flatMap((publication) => publication.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, `framework-capability-demands:${project.projectKey}`));
    }
    for (const publication of publications) {
      this.store.productDetails.add(
        FrameworkProductDetails.CapabilityDemand,
        publication.demand.productHandle,
        publication.demand,
      );
    }
    return new FrameworkCapabilityDemandProjectResult(
      publications.map((publication) => publication.demand),
      records,
    );
  }

  private publishDemand(
    project: ProjectBootFrame,
    site: CapabilityDemandSite,
    availability: CapabilityAvailabilityEvidenceContext,
    index: number,
  ): CapabilityDemandPublication {
    const local = [
      'framework-capability-demand',
      project.projectKey,
      localKeyPart(site.resource.compilation.localKey),
      index.toString(),
      localKeyPart(site.authoredName),
    ].join(':');
    const evidenceHandle = this.store.handles.evidence(local);
    const provenanceHandle = this.store.handles.provenance(local);
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const candidateModuleNames = frameworkRegistrationModuleNamesForCapability(site.requiredCapability);
    const candidatePackageNames = uniqueStrings(candidateModuleNames.map(packageNameForSpecifier));
    const packageEvidence = uniquePackageEvidence(
      candidatePackageNames.flatMap((packageName) => availability.byPackageName.get(packageName) ?? []),
    );
    const admissionState = site.admitted
      ? FrameworkCapabilityAdmissionState.Admitted
      : FrameworkCapabilityAdmissionState.NotAdmitted;
    const availabilityState = packageEvidence.length > 0
      ? FrameworkCapabilityAvailabilityState.EvidenceFound
      : FrameworkCapabilityAvailabilityState.NoLocalEvidence;
    const recommendedModuleName = recommendedModule(candidateModuleNames, packageEvidence);
    const demand = new FrameworkCapabilityDemand(
      productHandle,
      identityHandle,
      project.projectKey,
      site.siteKind,
      site.demandKind,
      site.requiredCapability,
      frameworkRegistrationKindsForCapability(site.requiredCapability),
      candidateModuleNames,
      admissionState,
      availabilityState,
      packageEvidence,
      recommendedModuleName,
      site.authoredName,
      site.sourceAddressHandle,
      site.ownerIdentityHandle,
      site.resource.compilation.unit.templateSource.sourceAddressHandle,
      site.resource.compilation.definition.productHandle,
    );
    const records = [
      ...(site.sourceRecords ?? []),
      new EvidenceRecord(
        evidenceHandle,
        EvidenceKind.SemanticObservation,
        [EvidenceRole.Diagnostic, EvidenceRole.Configuration],
        `Authored template ${site.siteKind} "${site.authoredName}" requires framework capability ${site.requiredCapability}.`,
        site.sourceAddressHandle,
      ),
      new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
      new FrameworkIdentity(
        identityHandle,
        KernelVocabulary.Framework.CapabilityDemand.key,
        site.ownerIdentityHandle,
        site.sourceAddressHandle,
        site.requiredCapability,
      ),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Framework.CapabilityDemand.key,
        identityHandle,
        site.sourceAddressHandle,
        provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(local),
        identityHandle,
        [productHandle],
      ),
    ];
    return new CapabilityDemandPublication(demand, records);
  }
}

function capabilityDemandSites(
  store: KernelStore,
  templates: TemplateCompilationProjectEmission,
): readonly CapabilityDemandSite[] {
  return uniqueDemandSites([
    ...templates.resources,
    ...templates.authoringResources,
  ].flatMap((resource) => [
    ...syntaxCapabilityDemandSites(resource),
    ...bindingCommandCapabilityDemandSites(resource),
    ...resourceCapabilityDemandSites(resource),
    ...expressionResourceCapabilityDemandSites(store, resource),
  ]));
}

function syntaxCapabilityDemandSites(
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly CapabilityDemandSite[] {
  return resource.compilation.attributeSyntax.syntaxes.flatMap((syntax) => {
    const parsed = parseBuiltInAttributeSyntax(syntax.rawName, syntax.rawValue);
    if (parsed.handler == null) {
      return [];
    }
    const demand = capabilityForBuiltInSyntaxGroup(parsed.handler.group);
    if (demand == null) {
      return [];
    }
    return [siteForAttributeSyntax(resource, syntax, demand, compilerWorldAdmitsBuiltInSyntaxGroup(resource, parsed.handler.group))];
  });
}

function bindingCommandCapabilityDemandSites(
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly CapabilityDemandSite[] {
  return resource.compilation.attributeSyntax.syntaxes.flatMap((syntax) => {
    const commandName = syntax.command?.toLowerCase() ?? null;
    if (commandName == null) {
      return [];
    }
    const command = findUniqueBuiltInBindingCommandByName(commandName);
    if (command == null) {
      return [];
    }
    const demand = capabilityForBuiltInBindingCommand(command);
    if (demand == null) {
      return [];
    }
    const admitted = resource.compilation.compilerWorld.bindingCommandResolver.get(commandName) != null;
    return [siteForAttributeSyntax(resource, syntax, demand, admitted)];
  });
}

function resourceCapabilityDemandSites(
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly CapabilityDemandSite[] {
  const attributesByProduct = new Map(resource.compilation.html.attributes.map((attribute) => [attribute.productHandle, attribute]));
  const ownersByAttributeProduct = htmlElementAttributeOwnersByAttributeProduct(
    resource.compilation.html.nodes,
    resource.compilation.html.attributes,
  );
  return [
    ...elementResourceCapabilityDemandSites(resource, ownersByAttributeProduct),
    ...attributeResourceCapabilityDemandSites(resource, attributesByProduct, ownersByAttributeProduct),
  ];
}

function elementResourceCapabilityDemandSites(
  resource: TemplateResourceRuntimeAnalysisEmission,
  ownersByAttributeProduct: ReadonlyMap<string, HtmlElementAttributeOwner>,
): readonly CapabilityDemandSite[] {
  const elementOwners = elementOwnersForResource(resource, ownersByAttributeProduct);
  return elementOwners.flatMap((owner) => {
    const lookupName = htmlElementLookupName(owner.element, owner);
    const builtIn = builtInResourceFor(ResourceDefinitionKind.CustomElement, lookupName);
    if (builtIn == null) {
      return [];
    }
    const demand = capabilityForBuiltInResource(builtIn);
    if (demand == null) {
      return [];
    }
    const admitted = resource.compilation.compilerWorld.resourceResolver.el(lookupName) != null;
    return [siteForElementResource(resource, owner.element, lookupName, demand, admitted)];
  });
}

function attributeResourceCapabilityDemandSites(
  resource: TemplateResourceRuntimeAnalysisEmission,
  attributesByProduct: ReadonlyMap<string, HtmlAttribute>,
  ownersByAttributeProduct: ReadonlyMap<string, HtmlElementAttributeOwner>,
): readonly CapabilityDemandSite[] {
  return resource.compilation.attributeSyntax.syntaxes.flatMap((syntax) => {
    const attribute = syntax.attribute.productHandle == null
      ? null
      : attributesByProduct.get(syntax.attribute.productHandle) ?? null;
    const owner = syntax.attribute.productHandle == null
      ? null
      : ownersByAttributeProduct.get(syntax.attribute.productHandle) ?? null;
    const builtIn = builtInAttributeResourceForSyntax(syntax, attribute, owner);
    if (builtIn == null) {
      return [];
    }
    const demand = capabilityForBuiltInResource(builtIn);
    if (demand == null) {
      return [];
    }
    const admitted = resource.compilation.compilerWorld.resourceResolver.attr(syntax.target) != null;
    return [siteForAttributeSyntax(resource, syntax, demand, admitted)];
  });
}

function expressionResourceCapabilityDemandSites(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
): readonly CapabilityDemandSite[] {
  return templateExpressionParsesForResource(resource).flatMap((parse, parseIndex) => {
    const expression = runtimeAcceptedBindingExpressionAstForParse(parse);
    if (expression == null) {
      return [];
    }
    return [
      ...valueConverterExpressions(expression).flatMap((converter, converterIndex) =>
        siteForExpressionResource(
          store,
          resource,
          parse,
          FrameworkCapabilityDemandSiteKind.TemplateValueConverter,
          ResourceDefinitionKind.ValueConverter,
          converter.name.name,
          converter.name.span,
          `parse:${parseIndex}:value-converter:${converterIndex}`,
        )
      ),
      ...bindingBehaviorExpressions(expression).flatMap((behavior, behaviorIndex) =>
        siteForExpressionResource(
          store,
          resource,
          parse,
          FrameworkCapabilityDemandSiteKind.TemplateBindingBehavior,
          ResourceDefinitionKind.BindingBehavior,
          behavior.name.name,
          behavior.name.span,
          `parse:${parseIndex}:binding-behavior:${behaviorIndex}`,
        )
      ),
    ];
  });
}

function siteForAttributeSyntax(
  resource: TemplateResourceRuntimeAnalysisEmission,
  syntax: AttributeSyntax,
  demand: CapabilityDemandDescriptor,
  admitted: boolean,
): CapabilityDemandSite {
  return {
    siteKind: FrameworkCapabilityDemandSiteKind.TemplateAttribute,
    demandKind: demand.demandKind,
    requiredCapability: demand.requiredCapability,
    authoredName: syntax.rawName,
    admitted,
    sourceAddressHandle: syntax.sourceAddressHandle,
    ownerIdentityHandle: syntax.identityHandle,
    resource,
  };
}

function siteForElementResource(
  resource: TemplateResourceRuntimeAnalysisEmission,
  element: HtmlElement,
  lookupName: string,
  demand: CapabilityDemandDescriptor,
  admitted: boolean,
): CapabilityDemandSite {
  return {
    siteKind: FrameworkCapabilityDemandSiteKind.TemplateElement,
    demandKind: demand.demandKind,
    requiredCapability: demand.requiredCapability,
    authoredName: lookupName,
    admitted,
    sourceAddressHandle: element.sourceAddressHandle,
    ownerIdentityHandle: element.identityHandle,
    resource,
  };
}

function siteForExpressionResource(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  parse: TemplateExpressionParse,
  siteKind: FrameworkCapabilityDemandSiteKind.TemplateValueConverter | FrameworkCapabilityDemandSiteKind.TemplateBindingBehavior,
  resourceKind: ResourceDefinitionKind.ValueConverter | ResourceDefinitionKind.BindingBehavior,
  authoredName: string,
  nameSpan: SourceSpan,
  localPart: string,
): readonly CapabilityDemandSite[] {
  const builtIn = builtInResourceFor(resourceKind, authoredName);
  if (builtIn == null) {
    return [];
  }
  const demand = capabilityForBuiltInResource(builtIn);
  if (demand == null) {
    return [];
  }
  const expressionSource = sourceAddressForRuntimeExpressionSpan(
    store,
    [
      'framework-capability-demand-expression',
      localKeyPart(resource.compilation.localKey),
      localKeyPart(parse.productHandle),
      localKeyPart(localPart),
      localKeyPart(authoredName),
    ].join(':'),
    parse.sourceAddressHandle,
    nameSpan,
  );
  const admitted = findVisibleTemplateResource(
    resource.compilation.compilerWorld.resourceScope,
    resourceKind,
    authoredName,
  ) != null;
  return [{
    siteKind,
    demandKind: demand.demandKind,
    requiredCapability: demand.requiredCapability,
    authoredName,
    admitted,
    sourceAddressHandle: expressionSource.handle,
    ownerIdentityHandle: parse.identityHandle,
    resource,
    sourceRecords: expressionSource.records,
  }];
}

interface CapabilityDemandDescriptor {
  readonly demandKind: FrameworkCapabilityDemandKind;
  readonly requiredCapability: FrameworkRegistrationCapability;
}

function capabilityForBuiltInSyntaxGroup(
  group: BuiltInSyntaxGroup,
): CapabilityDemandDescriptor | null {
  switch (group) {
    case BuiltInSyntaxGroup.DefaultBindingSyntax:
      return {
        demandKind: FrameworkCapabilityDemandKind.RuntimeHtmlDefaultBindingSyntax,
        requiredCapability: FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingSyntax,
      };
    case BuiltInSyntaxGroup.ShortHandBindingSyntax:
      return {
        demandKind: FrameworkCapabilityDemandKind.RuntimeHtmlShortHandBindingSyntax,
        requiredCapability: FrameworkRegistrationCapability.RuntimeHtmlShortHandBindingSyntax,
      };
    case BuiltInSyntaxGroup.PromiseTemplateControllerSyntax:
      return {
        demandKind: FrameworkCapabilityDemandKind.RuntimeHtmlDefaultResources,
        requiredCapability: FrameworkRegistrationCapability.RuntimeHtmlDefaultResources,
      };
    case BuiltInSyntaxGroup.I18nTranslationSyntax:
      return {
        demandKind: FrameworkCapabilityDemandKind.I18nTranslationSyntax,
        requiredCapability: FrameworkRegistrationCapability.I18nTranslationSyntax,
      };
    case BuiltInSyntaxGroup.StateSyntax:
      return {
        demandKind: FrameworkCapabilityDemandKind.StateBindingSyntax,
        requiredCapability: FrameworkRegistrationCapability.StateBindingSyntax,
      };
    case BuiltInSyntaxGroup.DefaultBindingLanguage:
      return {
        demandKind: FrameworkCapabilityDemandKind.RuntimeHtmlDefaultBindingLanguage,
        requiredCapability: FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingLanguage,
      };
  }
}

function capabilityForBuiltInBindingCommand(
  command: BuiltInBindingCommand,
): CapabilityDemandDescriptor | null {
  switch (command.group) {
    case BuiltInSyntaxGroup.DefaultBindingLanguage:
      return {
        demandKind: FrameworkCapabilityDemandKind.RuntimeHtmlDefaultBindingLanguage,
        requiredCapability: FrameworkRegistrationCapability.RuntimeHtmlDefaultBindingLanguage,
      };
    case BuiltInSyntaxGroup.I18nTranslationSyntax:
      return {
        demandKind: FrameworkCapabilityDemandKind.I18nTranslationSyntax,
        requiredCapability: FrameworkRegistrationCapability.I18nTranslationSyntax,
      };
    case BuiltInSyntaxGroup.StateSyntax:
      return {
        demandKind: FrameworkCapabilityDemandKind.StateBindingSyntax,
        requiredCapability: FrameworkRegistrationCapability.StateBindingSyntax,
      };
  }
}

function capabilityForBuiltInResource(
  resource: BuiltInResource,
): CapabilityDemandDescriptor | null {
  switch (resource.packageId) {
    case BuiltInResourcePackage.RuntimeHtml:
      return {
        demandKind: FrameworkCapabilityDemandKind.RuntimeHtmlDefaultResources,
        requiredCapability: FrameworkRegistrationCapability.RuntimeHtmlDefaultResources,
      };
    case BuiltInResourcePackage.I18n:
      return {
        demandKind: FrameworkCapabilityDemandKind.I18nDefaultResources,
        requiredCapability: FrameworkRegistrationCapability.I18nDefaultResources,
      };
    case BuiltInResourcePackage.ValidationHtml:
      return {
        demandKind: FrameworkCapabilityDemandKind.ValidationHtmlDefaultResources,
        requiredCapability: FrameworkRegistrationCapability.ValidationHtmlDefaultResources,
      };
    case BuiltInResourcePackage.Router:
      return {
        demandKind: FrameworkCapabilityDemandKind.RouterDefaultResources,
        requiredCapability: FrameworkRegistrationCapability.RouterDefaultResources,
      };
    case BuiltInResourcePackage.UiVirtualization:
      return {
        demandKind: FrameworkCapabilityDemandKind.UiVirtualizationDefaultResources,
        requiredCapability: FrameworkRegistrationCapability.UiVirtualizationDefaultResources,
      };
    case BuiltInResourcePackage.State:
      return {
        demandKind: FrameworkCapabilityDemandKind.StateDefaultResources,
        requiredCapability: FrameworkRegistrationCapability.StateDefaultResources,
      };
  }
}

function compilerWorldAdmitsBuiltInSyntaxGroup(
  resource: TemplateResourceRuntimeAnalysisEmission,
  group: BuiltInSyntaxGroup,
): boolean {
  const world = resource.compilation.compilerWorld;
  return world.attributePatterns.some((pattern) => pattern.handler.group === group)
    || world.bindingCommands.some((command) => command.handler.group === group);
}

function builtInResourceFor(
  resourceKind: ResourceDefinitionKind,
  name: string,
): BuiltInResource | null {
  const normalized = name.toLowerCase();
  return allBuiltInResources().find((resource) =>
    resource.resourceKind === resourceKind
    && (
      resource.name.toLowerCase() === normalized
      || resource.aliases.some((alias) => alias.toLowerCase() === normalized)
    )
  ) ?? null;
}

function builtInAttributeResourceForSyntax(
  syntax: AttributeSyntax,
  attribute: HtmlAttribute | null,
  owner: HtmlElementAttributeOwner | null,
): BuiltInResource | null {
  const builtIn = builtInResourceFor(ResourceDefinitionKind.TemplateController, syntax.target)
    ?? builtInResourceFor(ResourceDefinitionKind.CustomAttribute, syntax.target);
  if (builtIn == null || suppressBuiltInAttributeResourceDemand(builtIn, syntax, attribute, owner)) {
    return null;
  }
  return builtIn;
}

function suppressBuiltInAttributeResourceDemand(
  resource: BuiltInResource,
  syntax: AttributeSyntax,
  attribute: HtmlAttribute | null,
  owner: HtmlElementAttributeOwner | null,
): boolean {
  if (resource.packageId !== BuiltInResourcePackage.Router || resource.name !== 'href') {
    return false;
  }
  const explicitExternal = owner?.attributes.some((candidate) =>
    candidate.rawName.toLowerCase() === 'external'
    || candidate.rawName.toLowerCase() === 'data-external'
  ) ?? false;
  if (explicitExternal) {
    return true;
  }
  return !routerHrefHasRouterOwnershipCue(syntax, attribute);
}

function routerHrefHasRouterOwnershipCue(
  syntax: AttributeSyntax,
  attribute: HtmlAttribute | null,
): boolean {
  return syntax.command === BuiltInBindingCommandName.Bind
    || syntax.command === BuiltInBindingCommandName.ToView
    || syntax.command === BuiltInBindingCommandName.OneTime
    || attribute?.rawValue.includes('route.bind') === true
    || attribute?.rawValue.includes('params.bind') === true
    || attribute?.rawValue.includes('context.bind') === true;
}

function elementOwnersForResource(
  resource: TemplateResourceRuntimeAnalysisEmission,
  ownersByAttributeProduct: ReadonlyMap<string, HtmlElementAttributeOwner>,
): readonly HtmlElementAttributeOwner[] {
  const ownersByElement = new Map<string, HtmlElementAttributeOwner>();
  for (const owner of ownersByAttributeProduct.values()) {
    ownersByElement.set(owner.element.productHandle, owner);
  }
  for (const node of resource.compilation.html.nodes) {
    if (node instanceof HtmlElement && !ownersByElement.has(node.productHandle)) {
      ownersByElement.set(node.productHandle, new HtmlElementAttributeOwner(node, node.toReference(), []));
    }
  }
  return [...ownersByElement.values()];
}

function uniqueDemandSites(
  sites: readonly CapabilityDemandSite[],
): readonly CapabilityDemandSite[] {
  const seen = new Set<string>();
  const result: CapabilityDemandSite[] = [];
  for (const site of sites) {
    const key = [
      site.resource.compilation.definition.productHandle,
      site.siteKind,
      site.requiredCapability,
      site.authoredName,
      site.sourceAddressHandle ?? '',
    ].join(':');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(site);
  }
  return result;
}

function readCapabilityAvailabilityEvidence(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): CapabilityAvailabilityEvidenceContext {
  const rows = [
    ...manifestDependencyEvidence(project, readPackageManifest(project.rootDir), FrameworkCapabilityPackageEvidenceKind.ProjectManifestDependency),
    ...manifestDependencyEvidence(project, nearestWorkspaceManifestForProject(project), FrameworkCapabilityPackageEvidenceKind.WorkspaceManifestDependency),
    ...sourceImportEvidence(project, typeSystem),
  ];
  return {
    byPackageName: groupEvidenceByPackage(rows),
  };
}

function manifestDependencyEvidence(
  project: ProjectBootFrame,
  manifest: BootPackageManifest | null,
  kind: FrameworkCapabilityPackageEvidenceKind.ProjectManifestDependency | FrameworkCapabilityPackageEvidenceKind.WorkspaceManifestDependency,
): readonly FrameworkCapabilityPackageEvidence[] {
  if (manifest == null) {
    return [];
  }
  return [
    ...manifestDependencyScopeEvidence(manifest.dependencies, 'dependencies', kind),
    ...manifestDependencyScopeEvidence(manifest.peerDependencies, 'peerDependencies', kind),
    ...manifestDependencyScopeEvidence(manifest.devDependencies, 'devDependencies', kind),
    ...manifestDependencyScopeEvidence(manifest.optionalDependencies, 'optionalDependencies', kind),
  ].map((row) => new FrameworkCapabilityPackageEvidence(
    row.evidenceKind,
    row.packageName,
    row.moduleName,
    row.scope,
    project.sourceFiles[0]?.addressHandle ?? null,
  ));
}

function manifestDependencyScopeEvidence(
  value: unknown,
  scope: Exclude<FrameworkCapabilityPackageEvidenceScope, 'import'>,
  kind: FrameworkCapabilityPackageEvidenceKind.ProjectManifestDependency | FrameworkCapabilityPackageEvidenceKind.WorkspaceManifestDependency,
): readonly {
  readonly evidenceKind: FrameworkCapabilityPackageEvidenceKind;
  readonly packageName: string;
  readonly moduleName: string;
  readonly scope: FrameworkCapabilityPackageEvidenceScope;
}[] {
  if (value == null || typeof value !== 'object') {
    return [];
  }
  return Object.keys(value)
    .filter(isAureliaPackageSpecifier)
    .map((packageName) => ({
      evidenceKind: kind,
      packageName,
      moduleName: packageName,
      scope,
    }));
}

function sourceImportEvidence(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly FrameworkCapabilityPackageEvidence[] {
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
    if (sourceFile == null) {
      return [];
    }
    const moduleNames = sourceFile.statements.flatMap((statement) => {
      if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) {
        return [];
      }
      const specifier = statement.moduleSpecifier;
      return specifier != null && (ts.isStringLiteral(specifier) || ts.isNoSubstitutionTemplateLiteral(specifier))
        ? [specifier.text]
        : [];
    });
    return uniqueStrings(moduleNames.map(packageNameForSpecifier).filter(isAureliaPackageSpecifier))
      .map((packageName) => new FrameworkCapabilityPackageEvidence(
        FrameworkCapabilityPackageEvidenceKind.SourceImport,
        packageName,
        packageName,
        'import',
        source.addressHandle,
      ));
  });
}

function groupEvidenceByPackage(
  rows: readonly FrameworkCapabilityPackageEvidence[],
): ReadonlyMap<string, readonly FrameworkCapabilityPackageEvidence[]> {
  const mutable = new Map<string, FrameworkCapabilityPackageEvidence[]>();
  for (const row of rows) {
    const existing = mutable.get(row.packageName);
    if (existing == null) {
      mutable.set(row.packageName, [row]);
    } else {
      existing.push(row);
    }
  }
  return mutable;
}

function recommendedModule(
  candidateModuleNames: readonly string[],
  packageEvidence: readonly FrameworkCapabilityPackageEvidence[],
): string | null {
  for (const candidate of candidateModuleNames) {
    if (packageEvidence.some((row) => row.packageName === packageNameForSpecifier(candidate))) {
      return candidate;
    }
  }
  return candidateModuleNames[0] ?? null;
}

function uniquePackageEvidence(
  rows: readonly FrameworkCapabilityPackageEvidence[],
): readonly FrameworkCapabilityPackageEvidence[] {
  const seen = new Set<string>();
  const result: FrameworkCapabilityPackageEvidence[] = [];
  for (const row of rows) {
    const key = [
      row.evidenceKind,
      row.packageName,
      row.moduleName,
      row.scope,
      row.sourceAddressHandle ?? '',
    ].join(':');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(row);
  }
  return result.sort((left, right) =>
    left.packageName.localeCompare(right.packageName)
    || left.evidenceKind.localeCompare(right.evidenceKind)
    || left.scope.localeCompare(right.scope)
  );
}

function packageNameForSpecifier(specifier: string): string {
  const parts = specifier.split('/');
  if (specifier.startsWith('@')) {
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  }
  return parts[0] ?? specifier;
}

function isAureliaPackageSpecifier(specifier: string): boolean {
  return specifier === 'aurelia' || specifier.startsWith('@aurelia/');
}

function nearestWorkspaceManifestForProject(
  project: ProjectBootFrame,
): BootPackageManifest | null {
  const workspaceRoot = path.resolve(project.workspaceRootDir);
  const projectRoot = path.resolve(project.rootDir);
  let current = path.dirname(projectRoot);

  while (isHostPathWithin(current, workspaceRoot)) {
    const manifest = readPackageManifest(current);
    if (manifest != null && manifestWorkspacesIncludeProject(manifest, current, projectRoot)) {
      return manifest;
    }
    if (sameHostPath(current, workspaceRoot)) {
      break;
    }
    current = path.dirname(current);
  }

  return null;
}

function manifestWorkspacesIncludeProject(
  manifest: BootPackageManifest,
  manifestRoot: string,
  projectRoot: string,
): boolean {
  const patterns = readPackageWorkspacePatterns(manifest);
  if (patterns.length === 0) {
    return false;
  }
  const relativeProjectRoot = normalizePosixPath(path.relative(manifestRoot, projectRoot));
  return relativeProjectRoot.length > 0 && patterns.some((pattern) =>
    workspacePatternMatchesProject(pattern, relativeProjectRoot)
  );
}

function workspacePatternMatchesProject(
  pattern: string,
  relativeProjectRoot: string,
): boolean {
  const normalizedPattern = normalizeWorkspacePattern(pattern);
  return globPatternToRegExp(normalizedPattern).test(relativeProjectRoot);
}

function normalizeWorkspacePattern(pattern: string): string {
  let normalized = normalizePosixPath(pattern).replace(/^\.\//, '');
  while (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function globPatternToRegExp(pattern: string): RegExp {
  const body = pattern
    .split('/')
    .map((segment) => {
      if (segment === '**') {
        return '(?:[^/]+/)*[^/]+';
      }
      return segment
        .replace(/[\\^$+?.()|[\]{}]/g, '\\$&')
        .replace(/\*/g, '[^/]*');
    })
    .join('/');
  return new RegExp(`^${body}$`);
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
