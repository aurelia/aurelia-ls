import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { FrameworkRegistrationKind } from '../registration/registration-reference.js';
import { ResourceDefinitionKind } from './resource-kind.js';

export const enum BuiltInResourcePackage {
  /** Runtime HTML package. */
  RuntimeHtml = 'runtime-html',
  /** I18n package. */
  I18n = 'i18n',
  /** Router package. */
  Router = 'router',
  /** UI virtualization package. */
  UiVirtualization = 'ui-virtualization',
  /** State package. */
  State = 'state',
  /** Validation HTML package. */
  ValidationHtml = 'validation-html',
}

/** Stable value list for public schemas and catalog filters that cannot reflect over const enums. */
export const BUILT_IN_RESOURCE_PACKAGES = [
  BuiltInResourcePackage.RuntimeHtml,
  BuiltInResourcePackage.I18n,
  BuiltInResourcePackage.Router,
  BuiltInResourcePackage.UiVirtualization,
  BuiltInResourcePackage.State,
  BuiltInResourcePackage.ValidationHtml,
] as const;

export const enum BuiltInResourceGroup {
  /** Default resources admitted by the package's standard configuration. */
  DefaultResources = 'default-resources',
}

export enum BuiltInBindingBehaviorName {
  /** Runtime-html `& attr` behavior that forces attribute binding. */
  Attr = 'attr',
  /** Runtime-html `& debounce` behavior that delays binding updates. */
  Debounce = 'debounce',
  /** I18n `& df` behavior that projects through the date-format value converter. */
  DateFormat = 'df',
  /** Runtime-html `& fromView` behavior that forces target-to-source flow. */
  FromView = 'fromView',
  /** I18n `& nf` behavior that projects through the number-format value converter. */
  NumberFormat = 'nf',
  /** Runtime-html `& oneTime` behavior that evaluates once. */
  OneTime = 'oneTime',
  /** I18n `& rt` behavior that projects through the relative-time value converter. */
  RelativeTime = 'rt',
  /** Runtime-html `& self` behavior that filters listener events to the element itself. */
  Self = 'self',
  /** Runtime-html `& signal` behavior that re-evaluates on named signals. */
  Signal = 'signal',
  /** State `& state` behavior that evaluates against a configured state store scope. */
  State = 'state',
  /** Runtime-html `& throttle` behavior that rate-limits binding updates. */
  Throttle = 'throttle',
  /** Runtime-html `& toView` behavior that forces source-to-target flow. */
  ToView = 'toView',
  /** I18n `& t` behavior that projects through the translation value converter. */
  Translation = 't',
  /** Runtime-html `& twoWay` behavior that forces two-way flow. */
  TwoWay = 'twoWay',
  /** Runtime-html `& updateTrigger` behavior that changes the target observer events. */
  UpdateTrigger = 'updateTrigger',
  /** Validation-html `& validate` behavior that attaches validation to a binding. */
  Validate = 'validate',
}

export enum BuiltInValueConverterName {
  /** I18n `| df` converter that formats date-like values. */
  DateFormat = 'df',
  /** I18n `| nf` converter that formats numbers. */
  NumberFormat = 'nf',
  /** I18n `| rt` converter that formats dates as relative time. */
  RelativeTime = 'rt',
  /** Runtime-html `| sanitize` converter that delegates to ISanitizer. */
  Sanitize = 'sanitize',
  /** I18n `| t` converter that translates keys. */
  Translation = 't',
}

export type BuiltInResourceField =
  | 'targetName'
  | 'resourceKind'
  | 'name'
  | 'aliases'
  | 'packageId'
  | 'group'
  | 'source';

export type BuiltInResourceCatalogField =
  | 'packageId'
  | 'group'
  | 'resources'
  | 'source';

export type ConfiguredBuiltInResourceCatalogSelectionField =
  | 'registrationAdmission'
  | 'frameworkKind'
  | 'catalogs'
  | 'source';

@auLink('runtime-html:DebounceBindingBehavior', { facet: 'resource-definition' })
export class RuntimeHtmlDebounceBindingBehaviorResource {
  readonly targetName = 'DebounceBindingBehavior';
  readonly resourceKind = ResourceDefinitionKind.BindingBehavior;
  readonly name = BuiltInBindingBehaviorName.Debounce;
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:OneTimeBindingBehavior', { facet: 'resource-definition' })
export class RuntimeHtmlOneTimeBindingBehaviorResource {
  readonly targetName = 'OneTimeBindingBehavior';
  readonly resourceKind = ResourceDefinitionKind.BindingBehavior;
  readonly name = BuiltInBindingBehaviorName.OneTime;
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:ToViewBindingBehavior', { facet: 'resource-definition' })
export class RuntimeHtmlToViewBindingBehaviorResource {
  readonly targetName = 'ToViewBindingBehavior';
  readonly resourceKind = ResourceDefinitionKind.BindingBehavior;
  readonly name = BuiltInBindingBehaviorName.ToView;
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:FromViewBindingBehavior', { facet: 'resource-definition' })
export class RuntimeHtmlFromViewBindingBehaviorResource {
  readonly targetName = 'FromViewBindingBehavior';
  readonly resourceKind = ResourceDefinitionKind.BindingBehavior;
  readonly name = BuiltInBindingBehaviorName.FromView;
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:SignalBindingBehavior', { facet: 'resource-definition' })
export class RuntimeHtmlSignalBindingBehaviorResource {
  readonly targetName = 'SignalBindingBehavior';
  readonly resourceKind = ResourceDefinitionKind.BindingBehavior;
  readonly name = BuiltInBindingBehaviorName.Signal;
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:ThrottleBindingBehavior', { facet: 'resource-definition' })
export class RuntimeHtmlThrottleBindingBehaviorResource {
  readonly targetName = 'ThrottleBindingBehavior';
  readonly resourceKind = ResourceDefinitionKind.BindingBehavior;
  readonly name = BuiltInBindingBehaviorName.Throttle;
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:TwoWayBindingBehavior', { facet: 'resource-definition' })
export class RuntimeHtmlTwoWayBindingBehaviorResource {
  readonly targetName = 'TwoWayBindingBehavior';
  readonly resourceKind = ResourceDefinitionKind.BindingBehavior;
  readonly name = BuiltInBindingBehaviorName.TwoWay;
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:AttrBindingBehavior', { facet: 'resource-definition' })
export class RuntimeHtmlAttrBindingBehaviorResource {
  readonly targetName = 'AttrBindingBehavior';
  readonly resourceKind = ResourceDefinitionKind.BindingBehavior;
  readonly name = BuiltInBindingBehaviorName.Attr;
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:SelfBindingBehavior', { facet: 'resource-definition' })
export class RuntimeHtmlSelfBindingBehaviorResource {
  readonly targetName = 'SelfBindingBehavior';
  readonly resourceKind = ResourceDefinitionKind.BindingBehavior;
  readonly name = BuiltInBindingBehaviorName.Self;
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:UpdateTriggerBindingBehavior', { facet: 'resource-definition' })
export class RuntimeHtmlUpdateTriggerBindingBehaviorResource {
  readonly targetName = 'UpdateTriggerBindingBehavior';
  readonly resourceKind = ResourceDefinitionKind.BindingBehavior;
  readonly name = BuiltInBindingBehaviorName.UpdateTrigger;
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:SanitizeValueConverter', { facet: 'resource-definition' })
export class RuntimeHtmlSanitizeValueConverterResource {
  readonly targetName = 'SanitizeValueConverter';
  readonly resourceKind = ResourceDefinitionKind.ValueConverter;
  readonly name = BuiltInValueConverterName.Sanitize;
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:If', { facet: 'resource-definition' })
export class RuntimeHtmlIfResource {
  readonly targetName = 'If';
  readonly resourceKind = ResourceDefinitionKind.TemplateController;
  readonly name = 'if';
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:Else', { facet: 'resource-definition' })
export class RuntimeHtmlElseResource {
  readonly targetName = 'Else';
  readonly resourceKind = ResourceDefinitionKind.TemplateController;
  readonly name = 'else';
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:Repeat', { facet: 'resource-definition' })
export class RuntimeHtmlRepeatResource {
  readonly targetName = 'Repeat';
  readonly resourceKind = ResourceDefinitionKind.TemplateController;
  readonly name = 'repeat';
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:With', { facet: 'resource-definition' })
export class RuntimeHtmlWithResource {
  readonly targetName = 'With';
  readonly resourceKind = ResourceDefinitionKind.TemplateController;
  readonly name = 'with';
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:Switch', { facet: 'resource-definition' })
export class RuntimeHtmlSwitchResource {
  readonly targetName = 'Switch';
  readonly resourceKind = ResourceDefinitionKind.TemplateController;
  readonly name = 'switch';
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:Case', { facet: 'resource-definition' })
export class RuntimeHtmlCaseResource {
  readonly targetName = 'Case';
  readonly resourceKind = ResourceDefinitionKind.TemplateController;
  readonly name = 'case';
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:DefaultCase', { facet: 'resource-definition' })
export class RuntimeHtmlDefaultCaseResource {
  readonly targetName = 'DefaultCase';
  readonly resourceKind = ResourceDefinitionKind.TemplateController;
  readonly name = 'default-case';
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:PromiseTemplateController', { facet: 'resource-definition' })
export class RuntimeHtmlPromiseTemplateControllerResource {
  readonly targetName = 'PromiseTemplateController';
  readonly resourceKind = ResourceDefinitionKind.TemplateController;
  readonly name = 'promise';
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:PendingTemplateController', { facet: 'resource-definition' })
export class RuntimeHtmlPendingTemplateControllerResource {
  readonly targetName = 'PendingTemplateController';
  readonly resourceKind = ResourceDefinitionKind.TemplateController;
  readonly name = 'pending';
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:FulfilledTemplateController', { facet: 'resource-definition' })
export class RuntimeHtmlFulfilledTemplateControllerResource {
  readonly targetName = 'FulfilledTemplateController';
  readonly resourceKind = ResourceDefinitionKind.TemplateController;
  readonly name = 'then';
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:RejectedTemplateController', { facet: 'resource-definition' })
export class RuntimeHtmlRejectedTemplateControllerResource {
  readonly targetName = 'RejectedTemplateController';
  readonly resourceKind = ResourceDefinitionKind.TemplateController;
  readonly name = 'catch';
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:AuCompose', { facet: 'resource-definition' })
export class RuntimeHtmlAuComposeResource {
  readonly targetName = 'AuCompose';
  readonly resourceKind = ResourceDefinitionKind.CustomElement;
  readonly name = 'au-compose';
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:Portal', { facet: 'resource-definition' })
export class RuntimeHtmlPortalResource {
  readonly targetName = 'Portal';
  readonly resourceKind = ResourceDefinitionKind.TemplateController;
  readonly name = 'portal';
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:Focus', { facet: 'resource-definition' })
export class RuntimeHtmlFocusResource {
  readonly targetName = 'Focus';
  readonly resourceKind = ResourceDefinitionKind.CustomAttribute;
  readonly name = 'focus';
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:Show', { facet: 'resource-definition' })
export class RuntimeHtmlShowResource {
  readonly targetName = 'Show';
  readonly resourceKind = ResourceDefinitionKind.CustomAttribute;
  readonly name = 'show';
  readonly aliases: readonly string[] = ['hide'];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('runtime-html:AuSlot', { facet: 'resource-definition' })
export class RuntimeHtmlAuSlotResource {
  readonly targetName = 'AuSlot';
  readonly resourceKind = ResourceDefinitionKind.CustomElement;
  readonly name = 'au-slot';
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.RuntimeHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('i18n:TranslationValueConverter', { facet: 'resource-definition' })
export class I18nTranslationValueConverterResource {
  readonly targetName = 'TranslationValueConverter';
  readonly resourceKind = ResourceDefinitionKind.ValueConverter;
  readonly name = BuiltInValueConverterName.Translation;
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.I18n;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('i18n:TranslationBindingBehavior', { facet: 'resource-definition' })
export class I18nTranslationBindingBehaviorResource {
  readonly targetName = 'TranslationBindingBehavior';
  readonly resourceKind = ResourceDefinitionKind.BindingBehavior;
  readonly name = BuiltInBindingBehaviorName.Translation;
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.I18n;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('i18n:DateFormatValueConverter', { facet: 'resource-definition' })
export class I18nDateFormatValueConverterResource {
  readonly targetName = 'DateFormatValueConverter';
  readonly resourceKind = ResourceDefinitionKind.ValueConverter;
  readonly name = BuiltInValueConverterName.DateFormat;
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.I18n;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('i18n:DateFormatBindingBehavior', { facet: 'resource-definition' })
export class I18nDateFormatBindingBehaviorResource {
  readonly targetName = 'DateFormatBindingBehavior';
  readonly resourceKind = ResourceDefinitionKind.BindingBehavior;
  readonly name = BuiltInBindingBehaviorName.DateFormat;
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.I18n;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('i18n:NumberFormatValueConverter', { facet: 'resource-definition' })
export class I18nNumberFormatValueConverterResource {
  readonly targetName = 'NumberFormatValueConverter';
  readonly resourceKind = ResourceDefinitionKind.ValueConverter;
  readonly name = BuiltInValueConverterName.NumberFormat;
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.I18n;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('i18n:NumberFormatBindingBehavior', { facet: 'resource-definition' })
export class I18nNumberFormatBindingBehaviorResource {
  readonly targetName = 'NumberFormatBindingBehavior';
  readonly resourceKind = ResourceDefinitionKind.BindingBehavior;
  readonly name = BuiltInBindingBehaviorName.NumberFormat;
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.I18n;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('i18n:RelativeTimeValueConverter', { facet: 'resource-definition' })
export class I18nRelativeTimeValueConverterResource {
  readonly targetName = 'RelativeTimeValueConverter';
  readonly resourceKind = ResourceDefinitionKind.ValueConverter;
  readonly name = BuiltInValueConverterName.RelativeTime;
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.I18n;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('i18n:RelativeTimeBindingBehavior', { facet: 'resource-definition' })
export class I18nRelativeTimeBindingBehaviorResource {
  readonly targetName = 'RelativeTimeBindingBehavior';
  readonly resourceKind = ResourceDefinitionKind.BindingBehavior;
  readonly name = BuiltInBindingBehaviorName.RelativeTime;
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.I18n;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('state:StateBindingBehavior', { facet: 'resource-definition' })
export class StateBindingBehaviorResource {
  readonly targetName = 'StateBindingBehavior';
  readonly resourceKind = ResourceDefinitionKind.BindingBehavior;
  readonly name = BuiltInBindingBehaviorName.State;
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.State;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('validation-html:ValidateBindingBehavior', { facet: 'resource-definition' })
export class ValidationHtmlValidateBindingBehaviorResource {
  readonly targetName = 'ValidateBindingBehavior';
  readonly resourceKind = ResourceDefinitionKind.BindingBehavior;
  readonly name = BuiltInBindingBehaviorName.Validate;
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.ValidationHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('validation-html:ValidationErrorsCustomAttribute', { facet: 'resource-definition' })
export class ValidationHtmlValidationErrorsCustomAttributeResource {
  readonly targetName = 'ValidationErrorsCustomAttribute';
  readonly resourceKind = ResourceDefinitionKind.CustomAttribute;
  readonly name = 'validation-errors';
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.ValidationHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('validation-html:ValidationContainerCustomElement', { facet: 'resource-definition' })
export class ValidationHtmlValidationContainerCustomElementResource {
  readonly targetName = 'ValidationContainerCustomElement';
  readonly resourceKind = ResourceDefinitionKind.CustomElement;
  readonly name = 'validation-container';
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.ValidationHtml;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

export type BuiltInResource =
  | RuntimeHtmlDebounceBindingBehaviorResource
  | RuntimeHtmlOneTimeBindingBehaviorResource
  | RuntimeHtmlToViewBindingBehaviorResource
  | RuntimeHtmlFromViewBindingBehaviorResource
  | RuntimeHtmlSignalBindingBehaviorResource
  | RuntimeHtmlThrottleBindingBehaviorResource
  | RuntimeHtmlTwoWayBindingBehaviorResource
  | RuntimeHtmlAttrBindingBehaviorResource
  | RuntimeHtmlSelfBindingBehaviorResource
  | RuntimeHtmlUpdateTriggerBindingBehaviorResource
  | RuntimeHtmlSanitizeValueConverterResource
  | RuntimeHtmlIfResource
  | RuntimeHtmlElseResource
  | RuntimeHtmlRepeatResource
  | RuntimeHtmlWithResource
  | RuntimeHtmlSwitchResource
  | RuntimeHtmlCaseResource
  | RuntimeHtmlDefaultCaseResource
  | RuntimeHtmlPromiseTemplateControllerResource
  | RuntimeHtmlPendingTemplateControllerResource
  | RuntimeHtmlFulfilledTemplateControllerResource
  | RuntimeHtmlRejectedTemplateControllerResource
  | RuntimeHtmlAuComposeResource
  | RuntimeHtmlPortalResource
  | RuntimeHtmlFocusResource
  | RuntimeHtmlShowResource
  | RuntimeHtmlAuSlotResource
  | I18nTranslationValueConverterResource
  | I18nTranslationBindingBehaviorResource
  | I18nDateFormatValueConverterResource
  | I18nDateFormatBindingBehaviorResource
  | I18nNumberFormatValueConverterResource
  | I18nNumberFormatBindingBehaviorResource
  | I18nRelativeTimeValueConverterResource
  | I18nRelativeTimeBindingBehaviorResource
  | RouterLoadCustomAttributeResource
  | RouterHrefCustomAttributeResource
  | RouterViewportCustomElementResource
  | UiVirtualizationVirtualRepeatResource
  | StateBindingBehaviorResource
  | ValidationHtmlValidateBindingBehaviorResource
  | ValidationHtmlValidationErrorsCustomAttributeResource
  | ValidationHtmlValidationContainerCustomElementResource;

export interface BuiltInResourceCatalogInput {
  readonly packageId: BuiltInResourcePackage;
  readonly group: BuiltInResourceGroup;
  readonly resources: readonly BuiltInResource[];
}

export interface BuiltInResourceLookupKey {
  readonly packageId: BuiltInResourcePackage;
  readonly resourceKind: ResourceDefinitionKind;
  readonly name: string;
}

export class BuiltInResourceCatalog {
  constructor(
    /** Product handle for the materialized-product envelope that represents this catalog. */
    readonly productHandle: ProductHandle,
    /** Identity for this catalog model. */
    readonly identityHandle: IdentityHandle,
    /** Package that owns this catalog. */
    readonly packageId: BuiltInResourcePackage,
    /** Configuration group that admits the catalog. */
    readonly group: BuiltInResourceGroup,
    /** Built-in resource headers in runtime registration order. */
    readonly resources: readonly BuiltInResource[],
    /** Source address for the framework catalog. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceCatalogField>[] = [],
  ) {}
}

/** Resource catalog selection admitted by a known framework registration. */
export class ConfiguredBuiltInResourceCatalogSelection {
  constructor(
    /** Product handle for the selection product. */
    readonly productHandle: ProductHandle,
    /** Identity for this configured resource-catalog selection. */
    readonly identityHandle: IdentityHandle,
    /** Registration admission product that admitted these catalogs. */
    readonly registrationAdmissionProductHandle: ProductHandle,
    /** Recognized framework registration kind that admitted the catalogs. */
    readonly frameworkKind: FrameworkRegistrationKind,
    /** Built-in resource catalog products made available by this registration. */
    readonly catalogProductHandles: readonly ProductHandle[],
    /** Source address for the configuration expression that admitted the catalogs. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<ConfiguredBuiltInResourceCatalogSelectionField>[] = [],
  ) {}
}

export const RuntimeHtmlBuiltInResourceCatalogs = {
  DefaultResources: {
    packageId: BuiltInResourcePackage.RuntimeHtml,
    group: BuiltInResourceGroup.DefaultResources,
    resources: [
      new RuntimeHtmlDebounceBindingBehaviorResource(),
      new RuntimeHtmlOneTimeBindingBehaviorResource(),
      new RuntimeHtmlToViewBindingBehaviorResource(),
      new RuntimeHtmlFromViewBindingBehaviorResource(),
      new RuntimeHtmlSignalBindingBehaviorResource(),
      new RuntimeHtmlThrottleBindingBehaviorResource(),
      new RuntimeHtmlTwoWayBindingBehaviorResource(),
      new RuntimeHtmlSanitizeValueConverterResource(),
      new RuntimeHtmlIfResource(),
      new RuntimeHtmlElseResource(),
      new RuntimeHtmlRepeatResource(),
      new RuntimeHtmlWithResource(),
      new RuntimeHtmlSwitchResource(),
      new RuntimeHtmlCaseResource(),
      new RuntimeHtmlDefaultCaseResource(),
      new RuntimeHtmlPromiseTemplateControllerResource(),
      new RuntimeHtmlPendingTemplateControllerResource(),
      new RuntimeHtmlFulfilledTemplateControllerResource(),
      new RuntimeHtmlRejectedTemplateControllerResource(),
      new RuntimeHtmlAttrBindingBehaviorResource(),
      new RuntimeHtmlSelfBindingBehaviorResource(),
      new RuntimeHtmlUpdateTriggerBindingBehaviorResource(),
      new RuntimeHtmlAuComposeResource(),
      new RuntimeHtmlPortalResource(),
      new RuntimeHtmlFocusResource(),
      new RuntimeHtmlShowResource(),
      new RuntimeHtmlAuSlotResource(),
    ],
  },
} as const satisfies Record<string, BuiltInResourceCatalogInput>;

export const I18nBuiltInResourceCatalogs = {
  DefaultResources: {
    packageId: BuiltInResourcePackage.I18n,
    group: BuiltInResourceGroup.DefaultResources,
    resources: [
      new I18nTranslationValueConverterResource(),
      new I18nTranslationBindingBehaviorResource(),
      new I18nDateFormatValueConverterResource(),
      new I18nDateFormatBindingBehaviorResource(),
      new I18nNumberFormatValueConverterResource(),
      new I18nNumberFormatBindingBehaviorResource(),
      new I18nRelativeTimeValueConverterResource(),
      new I18nRelativeTimeBindingBehaviorResource(),
    ],
  },
} as const satisfies Record<string, BuiltInResourceCatalogInput>;

export const ValidationHtmlBuiltInResourceCatalogs = {
  DefaultResources: {
    packageId: BuiltInResourcePackage.ValidationHtml,
    group: BuiltInResourceGroup.DefaultResources,
    resources: [
      new ValidationHtmlValidateBindingBehaviorResource(),
      new ValidationHtmlValidationErrorsCustomAttributeResource(),
      new ValidationHtmlValidationContainerCustomElementResource(),
    ],
  },
} as const satisfies Record<string, BuiltInResourceCatalogInput>;

@auLink('router:LoadCustomAttribute', { facet: 'resource-definition' })
export class RouterLoadCustomAttributeResource {
  readonly targetName = 'LoadCustomAttribute';
  readonly resourceKind = ResourceDefinitionKind.CustomAttribute;
  readonly name = 'load';
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.Router;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('router:HrefCustomAttribute', { facet: 'resource-definition' })
export class RouterHrefCustomAttributeResource {
  readonly targetName = 'HrefCustomAttribute';
  readonly resourceKind = ResourceDefinitionKind.CustomAttribute;
  readonly name = 'href';
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.Router;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

@auLink('router:ViewportCustomElement', { facet: 'resource-definition' })
export class RouterViewportCustomElementResource {
  readonly targetName = 'ViewportCustomElement';
  readonly resourceKind = ResourceDefinitionKind.CustomElement;
  readonly name = 'au-viewport';
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.Router;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

export const RouterBuiltInResourceCatalogs = {
  DefaultResources: {
    packageId: BuiltInResourcePackage.Router,
    group: BuiltInResourceGroup.DefaultResources,
    resources: [
      new RouterLoadCustomAttributeResource(),
      new RouterHrefCustomAttributeResource(),
      new RouterViewportCustomElementResource(),
    ],
  },
} as const satisfies Record<string, BuiltInResourceCatalogInput>;

@auLink('ui-virtualization:VirtualRepeat', { facet: 'resource-definition' })
export class UiVirtualizationVirtualRepeatResource {
  readonly targetName = 'VirtualRepeat';
  readonly resourceKind = ResourceDefinitionKind.TemplateController;
  readonly name = 'virtual-repeat';
  readonly aliases: readonly string[] = [];
  readonly packageId = BuiltInResourcePackage.UiVirtualization;
  readonly group = BuiltInResourceGroup.DefaultResources;

  constructor(
    readonly productHandle: ProductHandle | null = null,
    readonly identityHandle: IdentityHandle | null = null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly fieldProvenance: readonly FieldProvenance<BuiltInResourceField>[] = [],
  ) {}
}

export const UiVirtualizationBuiltInResourceCatalogs = {
  DefaultResources: {
    packageId: BuiltInResourcePackage.UiVirtualization,
    group: BuiltInResourceGroup.DefaultResources,
    resources: [
      new UiVirtualizationVirtualRepeatResource(),
    ],
  },
} as const satisfies Record<string, BuiltInResourceCatalogInput>;

export const StateBuiltInResourceCatalogs = {
  DefaultResources: {
    packageId: BuiltInResourcePackage.State,
    group: BuiltInResourceGroup.DefaultResources,
    resources: [
      new StateBindingBehaviorResource(),
    ],
  },
} as const satisfies Record<string, BuiltInResourceCatalogInput>;

/** Public package module that owns a built-in resource package. */
export function builtInResourcePackageModuleSpecifier(
  packageId: BuiltInResourcePackage,
): string {
  switch (packageId) {
    case BuiltInResourcePackage.RuntimeHtml:
      return '@aurelia/runtime-html';
    case BuiltInResourcePackage.I18n:
      return '@aurelia/i18n';
    case BuiltInResourcePackage.Router:
      return '@aurelia/router';
    case BuiltInResourcePackage.UiVirtualization:
      return '@aurelia/ui-virtualization';
    case BuiltInResourcePackage.State:
      return '@aurelia/state';
    case BuiltInResourcePackage.ValidationHtml:
      return '@aurelia/validation-html';
  }
}

/** All built-in resource catalog inputs known to semantic-runtime. */
export function allBuiltInResourceCatalogInputs(): readonly BuiltInResourceCatalogInput[] {
  return [
    RuntimeHtmlBuiltInResourceCatalogs.DefaultResources,
    I18nBuiltInResourceCatalogs.DefaultResources,
    ValidationHtmlBuiltInResourceCatalogs.DefaultResources,
    RouterBuiltInResourceCatalogs.DefaultResources,
    UiVirtualizationBuiltInResourceCatalogs.DefaultResources,
    StateBuiltInResourceCatalogs.DefaultResources,
  ];
}

/** All built-in resource headers known to semantic-runtime. */
export function allBuiltInResources(): readonly BuiltInResource[] {
  return allBuiltInResourceCatalogInputs().flatMap((catalog) => catalog.resources);
}

/** Find a built-in resource by its package/kind/name catalog identity. */
export function findBuiltInResource(
  key: BuiltInResourceLookupKey,
): BuiltInResource | null {
  return allBuiltInResources().find((resource) =>
    resource.packageId === key.packageId
    && resource.resourceKind === key.resourceKind
    && resource.name === key.name
  ) ?? null;
}
