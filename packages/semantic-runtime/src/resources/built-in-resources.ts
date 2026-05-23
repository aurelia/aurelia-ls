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

export const enum BuiltInResourceGroup {
  /** Default resources admitted by the package's standard configuration. */
  DefaultResources = 'default-resources',
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
  readonly name = 'debounce';
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
  readonly name = 'oneTime';
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
  readonly name = 'toView';
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
  readonly name = 'fromView';
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
  readonly name = 'signal';
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
  readonly name = 'throttle';
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
  readonly name = 'twoWay';
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
  readonly name = 'attr';
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
  readonly name = 'self';
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
  readonly name = 'updateTrigger';
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
  readonly name = 'sanitize';
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
  readonly name = 't';
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
  readonly name = 't';
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
  readonly name = 'df';
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
  readonly name = 'df';
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
  readonly name = 'nf';
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
  readonly name = 'nf';
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
  readonly name = 'rt';
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
  readonly name = 'rt';
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
  readonly name = 'state';
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
  readonly name = 'validate';
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
