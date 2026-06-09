import { RuntimeBindingValueChannelKind } from '../observation/runtime-binding-observation.js';
import type { AuthoredTemplateAttributeSource } from '../template/authored-template-source.js';
import {
  BuiltInBindingCommandName,
  BuiltInBindingCommandTargetName,
  BuiltInSyntaxPackage,
} from '../template/built-in-syntax.js';
import {
  AppBuilderPartApplicationSiteKind,
  AppBuilderPartOperationKind,
  AppBuilderPartSlotKind,
  AppBuilderPartValueChannelResolutionKind,
} from './part-application.js';
import {
  appBuilderBuiltInBindingCommandRef,
  type AppBuilderBuiltInBindingCommandRef,
} from './part-syntax.js';

/** Leaf form controls app-builder can offer without inferring user intent from TypeScript facts. */

/** Semantic value shape a control is naturally used for. */
export enum AppBuilderControlSemanticValueKind {
  /** Free text. */
  Text = 'text',
  /** Numeric domain value, even when the browser transports it as a string. */
  Number = 'number',
  /** Date-like domain value, usually transported through a native string value. */
  Date = 'date',
  /** Boolean on/off value. */
  Boolean = 'boolean',
  /** One member selected from a domain. */
  Choice = 'choice',
  /** A subset selected from a domain. */
  ChoiceSet = 'choice-set',
}

/** Native/control-side transport mechanism before converters, validation, or domain intent are applied. */
export enum AppBuilderControlTransportKind {
  /** Native `value` property transports a string-like value. */
  NativeValueString = 'native-value-string',
  /** Native `valueAsNumber` property transports a number. */
  NativeValueNumber = 'native-value-number',
  /** Native `checked` property transports a boolean. */
  NativeCheckedBoolean = 'native-checked-boolean',
  /** Checked observer compares one option value/model against a scalar source. */
  CheckedChoice = 'checked-choice',
  /** Checked observer mutates collection membership. */
  CheckedCollectionMembership = 'checked-collection-membership',
  /** Select observer compares one option value/model against a scalar source. */
  SelectSingleChoice = 'select-single-choice',
  /** Select observer mutates a collection of selected option values/models. */
  SelectMultipleChoice = 'select-multiple-choice',
}

/** How a choice control supplies its option domain. */
export enum AppBuilderChoiceOptionBindingKind {
  /** Use native option/input `value` semantics. */
  Value = 'value',
  /** Use Aurelia `model.bind` for object/domain identity. */
  Model = 'model',
}

/** Stable value list for choice option binding kind transport schemas. */
export const APP_BUILDER_CHOICE_OPTION_BINDING_KINDS = [
  AppBuilderChoiceOptionBindingKind.Value,
  AppBuilderChoiceOptionBindingKind.Model,
] as const;

/** How generated field groups should connect visible labels to one control structure. */
export enum AppBuilderControlFieldLabelContainerKind {
  /** Use a `label` for one directly labelable control element. */
  Label = 'label',
  /** Use `fieldset` plus `legend` for a group of repeated native inputs. */
  FieldsetLegend = 'fieldset-legend',
}

/** Stable identity of a leaf control building block. */
export enum AppBuilderControlId {
  /** Single-line text field. */
  TextInput = 'text-input',
  /** Single-line email-address field using native email affordances. */
  EmailInput = 'email-input',
  /** Single-line URL field using native URL affordances. */
  UrlInput = 'url-input',
  /** Single-line telephone field using native telephone affordances. */
  TelInput = 'tel-input',
  /** Single-line password field using native password affordances. */
  PasswordInput = 'password-input',
  /** Single-line search field using native search affordances. */
  SearchInput = 'search-input',
  /** Native time-of-day field using string transport. */
  TimeInput = 'time-input',
  /** Native local date-time field using string transport. */
  DateTimeLocalInput = 'datetime-local-input',
  /** Native month field using string transport. */
  MonthInput = 'month-input',
  /** Native week field using string transport. */
  WeekInput = 'week-input',
  /** Numeric field. */
  NumberInput = 'number-input',
  /** Native date field. */
  DateInput = 'date-input',
  /** Slider over a numeric range. */
  RangeInput = 'range-input',
  /** Multi-line text field. */
  TextArea = 'textarea',
  /** Single boolean checkbox. */
  Checkbox = 'checkbox',
  /** Group of checkboxes toggling collection membership. */
  CheckboxList = 'checkbox-list',
  /** Group of radio buttons selecting one member. */
  RadioGroup = 'radio-group',
  /** Dropdown selecting one member. */
  SingleSelect = 'single-select',
  /** Dropdown selecting a subset. */
  MultiSelect = 'multi-select',
}

/** Native element skeleton emitted by a simple control lowerer before binding attributes are attached. */
export interface AppBuilderControlSourceElement {
  /** Authored element tag name. */
  readonly tagName: string;
  /** Static attributes that identify the native control mode, such as `type="number"`. */
  readonly staticAttributes: readonly AuthoredTemplateAttributeSource[];
  /** Child text for non-void controls; null means no child text. */
  readonly childText: string | null;
}

/** One neutral leaf-control part: what markup it emits and which Aurelia value-channel it realizes. */
export interface AppBuilderControlDescriptor {
  readonly id: AppBuilderControlId;
  readonly title: string;
  readonly summary: string;
  /** Representative host element (with the discriminating attribute) this control emits. */
  readonly element: string;
  /** Source element skeleton for simple controls; compound choice controls still own nested option rendering. */
  readonly sourceElement: AppBuilderControlSourceElement;
  /** Target property before the binding command suffix, such as `value` in `value.bind`. */
  readonly bindingTargetName: BuiltInBindingCommandTargetName;
  /** Built-in binding-command handler that owns the control's primary source binding. */
  readonly syntax: AppBuilderBuiltInBindingCommandRef;
  /** Display-only syntax cue; lowering must use operation/slot metadata instead. */
  readonly syntaxCue: string;
  /** Source locus families where this control can be created. */
  readonly applicationSites: readonly AppBuilderPartApplicationSiteKind[];
  /** Source-lowering operation family for this control. */
  readonly operationKind: AppBuilderPartOperationKind;
  /** Slots required before this control can lower to template source. */
  readonly requiredSlotKinds: readonly AppBuilderPartSlotKind[];
  /** Optional slots this control may accept for richer source generation. */
  readonly optionalSlotKinds: readonly AppBuilderPartSlotKind[];
  /** Semantic value shape the control is naturally used for. */
  readonly semanticValueKind: AppBuilderControlSemanticValueKind;
  /** Native/control-side transport mechanism. */
  readonly transportKind: AppBuilderControlTransportKind;
  /** How this control's value-channel list closes against runtime observer semantics. */
  readonly valueChannelResolution: AppBuilderPartValueChannelResolutionKind;
  /** Realized Aurelia value-channel(s), grounded in the observation read model. */
  readonly valueChannels: readonly RuntimeBindingValueChannelKind[];
  /** Choice-domain binding forms this control can use. */
  readonly optionBindingKinds?: readonly AppBuilderChoiceOptionBindingKind[];
  /** Whether the control needs an authored option/value domain the AI must supply. */
  readonly requiresValueDomain: boolean;
  /** Label container generated field groups should use for this control's source shape. */
  readonly fieldLabelContainerKind: AppBuilderControlFieldLabelContainerKind;
  /** Descendant tag that should receive visual hooks when the lowerer emits a compound wrapper. */
  readonly visualHookDescendantTagName: string | null;
}

const APP_BUILDER_NATIVE_REQUIRED_CONTROL_SLOTS = [
  AppBuilderPartSlotKind.NativeRequired,
] as const;

const APP_BUILDER_NATIVE_TEXT_CONTROL_SLOTS = [
  AppBuilderPartSlotKind.NativeRequired,
  AppBuilderPartSlotKind.TextMinLength,
  AppBuilderPartSlotKind.TextMaxLength,
  AppBuilderPartSlotKind.TextPattern,
] as const;

const APP_BUILDER_NATIVE_NUMERIC_CONTROL_SLOTS = [
  AppBuilderPartSlotKind.NativeRequired,
  AppBuilderPartSlotKind.NumericMinimum,
  AppBuilderPartSlotKind.NumericMaximum,
  AppBuilderPartSlotKind.NumericStep,
] as const;

const APP_BUILDER_NATIVE_CHOICE_CONTROL_SLOTS = [
  AppBuilderPartSlotKind.NativeRequired,
] as const;

/** Leaf controls bound to native form elements through known Aurelia observers. */
export const APP_BUILDER_CONTROLS: readonly AppBuilderControlDescriptor[] = [
  {
    id: AppBuilderControlId.TextInput,
    title: 'Text Input',
    summary: 'Single-line text field bound to a string value.',
    element: 'input[type=text]',
    sourceElement: { tagName: 'input', staticAttributes: [], childText: null },
    bindingTargetName: BuiltInBindingCommandTargetName.Value,
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    syntaxCue: '<input value.bind="TEXT">',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateElement],
    operationKind: AppBuilderPartOperationKind.CreateControl,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: APP_BUILDER_NATIVE_TEXT_CONTROL_SLOTS,
    semanticValueKind: AppBuilderControlSemanticValueKind.Text,
    transportKind: AppBuilderControlTransportKind.NativeValueString,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.RawProperty],
    requiresValueDomain: false,
    fieldLabelContainerKind: AppBuilderControlFieldLabelContainerKind.Label,
    visualHookDescendantTagName: null,
  },
  {
    id: AppBuilderControlId.EmailInput,
    title: 'Email Input',
    summary: 'Single-line text field for email-address values using the native email input mode.',
    element: 'input[type=email]',
    sourceElement: { tagName: 'input', staticAttributes: [{ rawName: 'type', rawValue: 'email' }], childText: null },
    bindingTargetName: BuiltInBindingCommandTargetName.Value,
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    syntaxCue: '<input type="email" value.bind="TEXT">',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateElement],
    operationKind: AppBuilderPartOperationKind.CreateControl,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: APP_BUILDER_NATIVE_TEXT_CONTROL_SLOTS,
    semanticValueKind: AppBuilderControlSemanticValueKind.Text,
    transportKind: AppBuilderControlTransportKind.NativeValueString,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.RawProperty],
    requiresValueDomain: false,
    fieldLabelContainerKind: AppBuilderControlFieldLabelContainerKind.Label,
    visualHookDescendantTagName: null,
  },
  {
    id: AppBuilderControlId.UrlInput,
    title: 'URL Input',
    summary: 'Single-line text field for URL values using the native URL input mode.',
    element: 'input[type=url]',
    sourceElement: { tagName: 'input', staticAttributes: [{ rawName: 'type', rawValue: 'url' }], childText: null },
    bindingTargetName: BuiltInBindingCommandTargetName.Value,
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    syntaxCue: '<input type="url" value.bind="TEXT">',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateElement],
    operationKind: AppBuilderPartOperationKind.CreateControl,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: APP_BUILDER_NATIVE_TEXT_CONTROL_SLOTS,
    semanticValueKind: AppBuilderControlSemanticValueKind.Text,
    transportKind: AppBuilderControlTransportKind.NativeValueString,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.RawProperty],
    requiresValueDomain: false,
    fieldLabelContainerKind: AppBuilderControlFieldLabelContainerKind.Label,
    visualHookDescendantTagName: null,
  },
  {
    id: AppBuilderControlId.TelInput,
    title: 'Telephone Input',
    summary: 'Single-line text field for telephone values using the native telephone input mode.',
    element: 'input[type=tel]',
    sourceElement: { tagName: 'input', staticAttributes: [{ rawName: 'type', rawValue: 'tel' }], childText: null },
    bindingTargetName: BuiltInBindingCommandTargetName.Value,
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    syntaxCue: '<input type="tel" value.bind="TEXT">',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateElement],
    operationKind: AppBuilderPartOperationKind.CreateControl,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: APP_BUILDER_NATIVE_TEXT_CONTROL_SLOTS,
    semanticValueKind: AppBuilderControlSemanticValueKind.Text,
    transportKind: AppBuilderControlTransportKind.NativeValueString,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.RawProperty],
    requiresValueDomain: false,
    fieldLabelContainerKind: AppBuilderControlFieldLabelContainerKind.Label,
    visualHookDescendantTagName: null,
  },
  {
    id: AppBuilderControlId.PasswordInput,
    title: 'Password Input',
    summary: 'Single-line text field for secret values using the native password input mode.',
    element: 'input[type=password]',
    sourceElement: { tagName: 'input', staticAttributes: [{ rawName: 'type', rawValue: 'password' }], childText: null },
    bindingTargetName: BuiltInBindingCommandTargetName.Value,
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    syntaxCue: '<input type="password" value.bind="TEXT">',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateElement],
    operationKind: AppBuilderPartOperationKind.CreateControl,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: APP_BUILDER_NATIVE_TEXT_CONTROL_SLOTS,
    semanticValueKind: AppBuilderControlSemanticValueKind.Text,
    transportKind: AppBuilderControlTransportKind.NativeValueString,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.RawProperty],
    requiresValueDomain: false,
    fieldLabelContainerKind: AppBuilderControlFieldLabelContainerKind.Label,
    visualHookDescendantTagName: null,
  },
  {
    id: AppBuilderControlId.SearchInput,
    title: 'Search Input',
    summary: 'Single-line text field for search/filter values using the native search input mode.',
    element: 'input[type=search]',
    sourceElement: { tagName: 'input', staticAttributes: [{ rawName: 'type', rawValue: 'search' }], childText: null },
    bindingTargetName: BuiltInBindingCommandTargetName.Value,
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    syntaxCue: '<input type="search" value.bind="TEXT">',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateElement],
    operationKind: AppBuilderPartOperationKind.CreateControl,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: APP_BUILDER_NATIVE_TEXT_CONTROL_SLOTS,
    semanticValueKind: AppBuilderControlSemanticValueKind.Text,
    transportKind: AppBuilderControlTransportKind.NativeValueString,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.RawProperty],
    requiresValueDomain: false,
    fieldLabelContainerKind: AppBuilderControlFieldLabelContainerKind.Label,
    visualHookDescendantTagName: null,
  },
  {
    id: AppBuilderControlId.TimeInput,
    title: 'Time Input',
    summary: 'Single-line time-of-day field using native time input mode and string transport.',
    element: 'input[type=time]',
    sourceElement: { tagName: 'input', staticAttributes: [{ rawName: 'type', rawValue: 'time' }], childText: null },
    bindingTargetName: BuiltInBindingCommandTargetName.Value,
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    syntaxCue: '<input type="time" value.bind="TEXT">',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateElement],
    operationKind: AppBuilderPartOperationKind.CreateControl,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: APP_BUILDER_NATIVE_REQUIRED_CONTROL_SLOTS,
    semanticValueKind: AppBuilderControlSemanticValueKind.Text,
    transportKind: AppBuilderControlTransportKind.NativeValueString,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.RawProperty],
    requiresValueDomain: false,
    fieldLabelContainerKind: AppBuilderControlFieldLabelContainerKind.Label,
    visualHookDescendantTagName: null,
  },
  {
    id: AppBuilderControlId.DateTimeLocalInput,
    title: 'Date-Time Local Input',
    summary: 'Single-line local date-time field using native datetime-local input mode and string transport.',
    element: 'input[type=datetime-local]',
    sourceElement: { tagName: 'input', staticAttributes: [{ rawName: 'type', rawValue: 'datetime-local' }], childText: null },
    bindingTargetName: BuiltInBindingCommandTargetName.Value,
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    syntaxCue: '<input type="datetime-local" value.bind="TEXT">',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateElement],
    operationKind: AppBuilderPartOperationKind.CreateControl,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: APP_BUILDER_NATIVE_REQUIRED_CONTROL_SLOTS,
    semanticValueKind: AppBuilderControlSemanticValueKind.Text,
    transportKind: AppBuilderControlTransportKind.NativeValueString,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.RawProperty],
    requiresValueDomain: false,
    fieldLabelContainerKind: AppBuilderControlFieldLabelContainerKind.Label,
    visualHookDescendantTagName: null,
  },
  {
    id: AppBuilderControlId.MonthInput,
    title: 'Month Input',
    summary: 'Single-line month field using native month input mode and string transport.',
    element: 'input[type=month]',
    sourceElement: { tagName: 'input', staticAttributes: [{ rawName: 'type', rawValue: 'month' }], childText: null },
    bindingTargetName: BuiltInBindingCommandTargetName.Value,
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    syntaxCue: '<input type="month" value.bind="TEXT">',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateElement],
    operationKind: AppBuilderPartOperationKind.CreateControl,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: APP_BUILDER_NATIVE_REQUIRED_CONTROL_SLOTS,
    semanticValueKind: AppBuilderControlSemanticValueKind.Text,
    transportKind: AppBuilderControlTransportKind.NativeValueString,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.RawProperty],
    requiresValueDomain: false,
    fieldLabelContainerKind: AppBuilderControlFieldLabelContainerKind.Label,
    visualHookDescendantTagName: null,
  },
  {
    id: AppBuilderControlId.WeekInput,
    title: 'Week Input',
    summary: 'Single-line week field using native week input mode and string transport.',
    element: 'input[type=week]',
    sourceElement: { tagName: 'input', staticAttributes: [{ rawName: 'type', rawValue: 'week' }], childText: null },
    bindingTargetName: BuiltInBindingCommandTargetName.Value,
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    syntaxCue: '<input type="week" value.bind="TEXT">',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateElement],
    operationKind: AppBuilderPartOperationKind.CreateControl,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: APP_BUILDER_NATIVE_REQUIRED_CONTROL_SLOTS,
    semanticValueKind: AppBuilderControlSemanticValueKind.Text,
    transportKind: AppBuilderControlTransportKind.NativeValueString,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.RawProperty],
    requiresValueDomain: false,
    fieldLabelContainerKind: AppBuilderControlFieldLabelContainerKind.Label,
    visualHookDescendantTagName: null,
  },
  {
    id: AppBuilderControlId.NumberInput,
    title: 'Number Input',
    summary: 'Numeric field bound through the native valueAsNumber property.',
    element: 'input[type=number]',
    sourceElement: { tagName: 'input', staticAttributes: [{ rawName: 'type', rawValue: 'number' }], childText: null },
    bindingTargetName: BuiltInBindingCommandTargetName.ValueAsNumber,
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    syntaxCue: '<input type="number" value-as-number.bind="NUMBER">',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateElement],
    operationKind: AppBuilderPartOperationKind.CreateControl,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: APP_BUILDER_NATIVE_NUMERIC_CONTROL_SLOTS,
    semanticValueKind: AppBuilderControlSemanticValueKind.Number,
    transportKind: AppBuilderControlTransportKind.NativeValueNumber,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.RawProperty],
    requiresValueDomain: false,
    fieldLabelContainerKind: AppBuilderControlFieldLabelContainerKind.Label,
    visualHookDescendantTagName: null,
  },
  {
    id: AppBuilderControlId.DateInput,
    title: 'Date Input',
    summary: 'Native date field bound through the browser date string value.',
    element: 'input[type=date]',
    sourceElement: { tagName: 'input', staticAttributes: [{ rawName: 'type', rawValue: 'date' }], childText: null },
    bindingTargetName: BuiltInBindingCommandTargetName.Value,
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    syntaxCue: '<input type="date" value.bind="DATE">',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateElement],
    operationKind: AppBuilderPartOperationKind.CreateControl,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: APP_BUILDER_NATIVE_REQUIRED_CONTROL_SLOTS,
    semanticValueKind: AppBuilderControlSemanticValueKind.Date,
    transportKind: AppBuilderControlTransportKind.NativeValueString,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.RawProperty],
    requiresValueDomain: false,
    fieldLabelContainerKind: AppBuilderControlFieldLabelContainerKind.Label,
    visualHookDescendantTagName: null,
  },
  {
    id: AppBuilderControlId.RangeInput,
    title: 'Range Input',
    summary: 'Slider bound through the native valueAsNumber property within a min/max range.',
    element: 'input[type=range]',
    sourceElement: { tagName: 'input', staticAttributes: [{ rawName: 'type', rawValue: 'range' }], childText: null },
    bindingTargetName: BuiltInBindingCommandTargetName.ValueAsNumber,
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    syntaxCue: '<input type="range" value-as-number.bind="NUMBER" min="MIN" max="MAX" step="STEP">',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateElement],
    operationKind: AppBuilderPartOperationKind.CreateControl,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: [
      AppBuilderPartSlotKind.NumericMinimum,
      AppBuilderPartSlotKind.NumericMaximum,
      AppBuilderPartSlotKind.NumericStep,
    ],
    semanticValueKind: AppBuilderControlSemanticValueKind.Number,
    transportKind: AppBuilderControlTransportKind.NativeValueNumber,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.RawProperty],
    requiresValueDomain: false,
    fieldLabelContainerKind: AppBuilderControlFieldLabelContainerKind.Label,
    visualHookDescendantTagName: null,
  },
  {
    id: AppBuilderControlId.TextArea,
    title: 'Text Area',
    summary: 'Multi-line text field bound to a string value.',
    element: 'textarea',
    sourceElement: { tagName: 'textarea', staticAttributes: [], childText: '' },
    bindingTargetName: BuiltInBindingCommandTargetName.Value,
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    syntaxCue: '<textarea value.bind="TEXT">',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateElement],
    operationKind: AppBuilderPartOperationKind.CreateControl,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: APP_BUILDER_NATIVE_TEXT_CONTROL_SLOTS,
    semanticValueKind: AppBuilderControlSemanticValueKind.Text,
    transportKind: AppBuilderControlTransportKind.NativeValueString,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.RawProperty],
    requiresValueDomain: false,
    fieldLabelContainerKind: AppBuilderControlFieldLabelContainerKind.Label,
    visualHookDescendantTagName: null,
  },
  {
    id: AppBuilderControlId.Checkbox,
    title: 'Checkbox',
    summary: 'Single checkbox bound to a boolean value.',
    element: 'input[type=checkbox]',
    sourceElement: { tagName: 'input', staticAttributes: [{ rawName: 'type', rawValue: 'checkbox' }], childText: null },
    bindingTargetName: BuiltInBindingCommandTargetName.Checked,
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    syntaxCue: '<input type="checkbox" checked.bind="BOOLEAN">',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateElement],
    operationKind: AppBuilderPartOperationKind.CreateControl,
    requiredSlotKinds: [AppBuilderPartSlotKind.BindingExpression],
    optionalSlotKinds: APP_BUILDER_NATIVE_REQUIRED_CONTROL_SLOTS,
    semanticValueKind: AppBuilderControlSemanticValueKind.Boolean,
    transportKind: AppBuilderControlTransportKind.NativeCheckedBoolean,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [RuntimeBindingValueChannelKind.CheckedBoolean],
    requiresValueDomain: false,
    fieldLabelContainerKind: AppBuilderControlFieldLabelContainerKind.Label,
    visualHookDescendantTagName: null,
  },
  {
    id: AppBuilderControlId.CheckboxList,
    title: 'Checkbox List',
    summary: 'Group of checkboxes toggling membership in a collection.',
    element: 'input[type=checkbox]',
    sourceElement: { tagName: 'input', staticAttributes: [{ rawName: 'type', rawValue: 'checkbox' }], childText: null },
    bindingTargetName: BuiltInBindingCommandTargetName.Checked,
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    syntaxCue: '<input repeat.for="OPTION of OPTIONS" type="checkbox" checked.bind="SELECTED">',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateElement],
    operationKind: AppBuilderPartOperationKind.CreateControl,
    requiredSlotKinds: [
      AppBuilderPartSlotKind.BindingExpression,
      AppBuilderPartSlotKind.ValueDomainExpression,
    ],
    optionalSlotKinds: [
      AppBuilderPartSlotKind.LocalName,
      AppBuilderPartSlotKind.OptionValueExpression,
      AppBuilderPartSlotKind.OptionBindingKind,
      AppBuilderPartSlotKind.OptionLabelExpression,
      AppBuilderPartSlotKind.MatcherExpression,
    ],
    semanticValueKind: AppBuilderControlSemanticValueKind.ChoiceSet,
    transportKind: AppBuilderControlTransportKind.CheckedCollectionMembership,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [
      RuntimeBindingValueChannelKind.CheckedCollectionMembership,
      RuntimeBindingValueChannelKind.CheckedModel,
      RuntimeBindingValueChannelKind.CheckedMapKeyedBoolean,
      RuntimeBindingValueChannelKind.CustomMatcherFunction,
    ],
    optionBindingKinds: [AppBuilderChoiceOptionBindingKind.Value, AppBuilderChoiceOptionBindingKind.Model],
    requiresValueDomain: true,
    fieldLabelContainerKind: AppBuilderControlFieldLabelContainerKind.FieldsetLegend,
    visualHookDescendantTagName: 'input',
  },
  {
    id: AppBuilderControlId.RadioGroup,
    title: 'Radio Group',
    summary: 'Group of radio buttons selecting one member of a value domain.',
    element: 'input[type=radio]',
    sourceElement: { tagName: 'input', staticAttributes: [{ rawName: 'type', rawValue: 'radio' }], childText: null },
    bindingTargetName: BuiltInBindingCommandTargetName.Checked,
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    syntaxCue: '<input repeat.for="OPTION of OPTIONS" type="radio" name="GROUP" checked.bind="SELECTED">',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateElement],
    operationKind: AppBuilderPartOperationKind.CreateControl,
    requiredSlotKinds: [
      AppBuilderPartSlotKind.BindingExpression,
      AppBuilderPartSlotKind.ValueDomainExpression,
      AppBuilderPartSlotKind.RadioGroupName,
    ],
    optionalSlotKinds: [
      ...APP_BUILDER_NATIVE_CHOICE_CONTROL_SLOTS,
      AppBuilderPartSlotKind.LocalName,
      AppBuilderPartSlotKind.OptionValueExpression,
      AppBuilderPartSlotKind.OptionBindingKind,
      AppBuilderPartSlotKind.OptionLabelExpression,
      AppBuilderPartSlotKind.MatcherExpression,
    ],
    semanticValueKind: AppBuilderControlSemanticValueKind.Choice,
    transportKind: AppBuilderControlTransportKind.CheckedChoice,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [
      RuntimeBindingValueChannelKind.CheckedRadioValue,
      RuntimeBindingValueChannelKind.CheckedModel,
      RuntimeBindingValueChannelKind.CustomMatcherFunction,
    ],
    optionBindingKinds: [AppBuilderChoiceOptionBindingKind.Value, AppBuilderChoiceOptionBindingKind.Model],
    requiresValueDomain: true,
    fieldLabelContainerKind: AppBuilderControlFieldLabelContainerKind.FieldsetLegend,
    visualHookDescendantTagName: 'input',
  },
  {
    id: AppBuilderControlId.SingleSelect,
    title: 'Single Select',
    summary: 'Dropdown selecting one member of a value domain.',
    element: 'select',
    sourceElement: { tagName: 'select', staticAttributes: [], childText: null },
    bindingTargetName: BuiltInBindingCommandTargetName.Value,
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    syntaxCue: '<select value.bind="SELECTED">',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateElement],
    operationKind: AppBuilderPartOperationKind.CreateControl,
    requiredSlotKinds: [
      AppBuilderPartSlotKind.BindingExpression,
      AppBuilderPartSlotKind.ValueDomainExpression,
    ],
    optionalSlotKinds: [
      ...APP_BUILDER_NATIVE_CHOICE_CONTROL_SLOTS,
      AppBuilderPartSlotKind.LocalName,
      AppBuilderPartSlotKind.OptionValueExpression,
      AppBuilderPartSlotKind.OptionBindingKind,
      AppBuilderPartSlotKind.OptionLabelExpression,
      AppBuilderPartSlotKind.MatcherExpression,
    ],
    semanticValueKind: AppBuilderControlSemanticValueKind.Choice,
    transportKind: AppBuilderControlTransportKind.SelectSingleChoice,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [
      RuntimeBindingValueChannelKind.SelectSingleOptionValue,
      RuntimeBindingValueChannelKind.ElementModelValue,
      RuntimeBindingValueChannelKind.SelectDynamicOptionValue,
      RuntimeBindingValueChannelKind.CustomMatcherFunction,
    ],
    optionBindingKinds: [AppBuilderChoiceOptionBindingKind.Value, AppBuilderChoiceOptionBindingKind.Model],
    requiresValueDomain: true,
    fieldLabelContainerKind: AppBuilderControlFieldLabelContainerKind.Label,
    visualHookDescendantTagName: null,
  },
  {
    id: AppBuilderControlId.MultiSelect,
    title: 'Multi Select',
    summary: 'Dropdown selecting a subset of a value domain.',
    element: 'select[multiple]',
    sourceElement: { tagName: 'select', staticAttributes: [{ rawName: 'multiple' }], childText: null },
    bindingTargetName: BuiltInBindingCommandTargetName.Value,
    syntax: appBuilderBuiltInBindingCommandRef(BuiltInSyntaxPackage.TemplateCompiler, BuiltInBindingCommandName.Bind),
    syntaxCue: '<select multiple value.bind="SELECTED">',
    applicationSites: [AppBuilderPartApplicationSiteKind.TemplateElement],
    operationKind: AppBuilderPartOperationKind.CreateControl,
    requiredSlotKinds: [
      AppBuilderPartSlotKind.BindingExpression,
      AppBuilderPartSlotKind.ValueDomainExpression,
    ],
    optionalSlotKinds: [
      AppBuilderPartSlotKind.LocalName,
      AppBuilderPartSlotKind.OptionValueExpression,
      AppBuilderPartSlotKind.OptionBindingKind,
      AppBuilderPartSlotKind.OptionLabelExpression,
      AppBuilderPartSlotKind.MatcherExpression,
    ],
    semanticValueKind: AppBuilderControlSemanticValueKind.ChoiceSet,
    transportKind: AppBuilderControlTransportKind.SelectMultipleChoice,
    valueChannelResolution: AppBuilderPartValueChannelResolutionKind.PartOwned,
    valueChannels: [
      RuntimeBindingValueChannelKind.SelectMultipleOptionValues,
      RuntimeBindingValueChannelKind.ElementModelValue,
      RuntimeBindingValueChannelKind.SelectDynamicOptionValue,
      RuntimeBindingValueChannelKind.CustomMatcherFunction,
    ],
    optionBindingKinds: [AppBuilderChoiceOptionBindingKind.Value, AppBuilderChoiceOptionBindingKind.Model],
    requiresValueDomain: true,
    fieldLabelContainerKind: AppBuilderControlFieldLabelContainerKind.Label,
    visualHookDescendantTagName: null,
  },
];

/** Look up a control descriptor by id. */
export function appBuilderControlDescriptor(id: AppBuilderControlId): AppBuilderControlDescriptor {
  const control = APP_BUILDER_CONTROLS.find((candidate) => candidate.id === id);
  if (control == null) {
    throw new Error(`Unknown app-builder control '${id}'.`);
  }
  return control;
}
