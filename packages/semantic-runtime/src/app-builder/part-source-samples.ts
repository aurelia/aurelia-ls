import {
  AppBuilderBindingBehaviorId,
  type AppBuilderBindingBehaviorDescriptor,
} from './binding-behavior-catalog.js';
import {
  AuComposeFlushMode,
  AuComposeScopeBehavior,
} from '../template/au-compose-source.js';
import {
  PortalInsertPosition,
} from '../template/portal-source.js';
import {
  AppBuilderBindingPartId,
  type AppBuilderBindingPartDescriptor,
} from './binding-part-catalog.js';
import {
  AppBuilderControlId,
  AppBuilderChoiceOptionBindingKind,
  type AppBuilderControlDescriptor,
} from './control-catalog.js';
import {
  type AppBuilderComponentLifecycleDescriptor,
} from './component-lifecycle-catalog.js';
import {
  AppBuilderFrameworkComponentId,
  type AppBuilderFrameworkComponentDescriptor,
} from './framework-component-catalog.js';
import {
  AppBuilderFrameworkSyntaxId,
  type AppBuilderFrameworkSyntaxDescriptor,
} from './framework-syntax-catalog.js';
import {
  AppBuilderFrameworkApiId,
  type AppBuilderFrameworkApiDescriptor,
} from './framework-api-catalog.js';
import {
  AppBuilderPartSlotKind,
} from './part-application.js';
import {
  AppBuilderPartKind,
  type AppBuilderPartDescriptor,
} from './part-catalog.js';
import type {
  AppBuilderPartSlotAssignment,
} from './part-source-invocation.js';
import {
  AppBuilderStructuralPartId,
  type AppBuilderStructuralPartDescriptor,
} from './structural-part-catalog.js';
import {
  AppBuilderValueConverterId,
  type AppBuilderValueConverterDescriptor,
} from './value-converter-catalog.js';

/** Built-in sample family used to prove and preview a part source lowerer. */
export enum AppBuilderPartSourceLoweringSampleKind {
  /** Assign only required slots so the minimum callable shape stays visible. */
  RequiredOnly = 'required-only',
  /** Assign required and optional slots so richer source forms stay visible. */
  WithOptionalSlots = 'with-optional-slots',
}

/** Stable value list for public source-lowering preview schemas. */
export const APP_BUILDER_PART_SOURCE_LOWERING_SAMPLE_KINDS = [
  AppBuilderPartSourceLoweringSampleKind.RequiredOnly,
  AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots,
] as const;

/** One runnable sample invocation shape for a cataloged app-builder part. */
export interface AppBuilderPartSourceLoweringSample {
  readonly sampleKind: AppBuilderPartSourceLoweringSampleKind;
  readonly slotAssignments: readonly AppBuilderPartSlotAssignment[];
}

/** Default source sample value for one part slot kind. */
interface AppBuilderPartSlotSampleValueRow {
  /** Source-lowering slot kind receiving the sample. */
  readonly slotKind: AppBuilderPartSlotKind;
  /** Source sample text, or null when the slot is intentionally omitted by default. */
  readonly sampleValue: string | null;
}

/** Static sample values for source-lowering slots that do not need part-specific context. */
const APP_BUILDER_PART_SLOT_SAMPLE_VALUE_ROWS: readonly AppBuilderPartSlotSampleValueRow[] = [
  { slotKind: AppBuilderPartSlotKind.BindingExpression, sampleValue: 'value' },
  { slotKind: AppBuilderPartSlotKind.EventName, sampleValue: 'click' },
  { slotKind: AppBuilderPartSlotKind.HandlerExpression, sampleValue: 'handle($event)' },
  { slotKind: AppBuilderPartSlotKind.ReferenceName, sampleValue: 'element' },
  { slotKind: AppBuilderPartSlotKind.ClassToken, sampleValue: 'is-active' },
  { slotKind: AppBuilderPartSlotKind.CssProperty, sampleValue: 'display' },
  { slotKind: AppBuilderPartSlotKind.AttributeName, sampleValue: 'disabled' },
  { slotKind: AppBuilderPartSlotKind.BindingCommandTargetName, sampleValue: 'value' },
  { slotKind: AppBuilderPartSlotKind.StateStoreName, sampleValue: 'users' },
  { slotKind: AppBuilderPartSlotKind.StateSelectorExpression, sampleValue: 'state => state.items' },
  { slotKind: AppBuilderPartSlotKind.LocalName, sampleValue: 'item' },
  { slotKind: AppBuilderPartSlotKind.IterableExpression, sampleValue: 'items' },
  { slotKind: AppBuilderPartSlotKind.ValueDomainExpression, sampleValue: 'options' },
  { slotKind: AppBuilderPartSlotKind.OptionValueExpression, sampleValue: 'option' },
  { slotKind: AppBuilderPartSlotKind.OptionBindingKind, sampleValue: AppBuilderChoiceOptionBindingKind.Model },
  { slotKind: AppBuilderPartSlotKind.OptionLabelExpression, sampleValue: 'option' },
  { slotKind: AppBuilderPartSlotKind.MatcherExpression, sampleValue: 'matcher' },
  { slotKind: AppBuilderPartSlotKind.RadioGroupName, sampleValue: 'choice-group' },
  { slotKind: AppBuilderPartSlotKind.NativeRequired, sampleValue: 'true' },
  { slotKind: AppBuilderPartSlotKind.TextMinLength, sampleValue: '2' },
  { slotKind: AppBuilderPartSlotKind.TextMaxLength, sampleValue: '80' },
  { slotKind: AppBuilderPartSlotKind.TextPattern, sampleValue: '[A-Za-z0-9 -]+' },
  { slotKind: AppBuilderPartSlotKind.NumericMinimum, sampleValue: '0' },
  { slotKind: AppBuilderPartSlotKind.NumericMaximum, sampleValue: '100' },
  { slotKind: AppBuilderPartSlotKind.NumericStep, sampleValue: '5' },
  { slotKind: AppBuilderPartSlotKind.RouteInstruction, sampleValue: 'items' },
  { slotKind: AppBuilderPartSlotKind.RouteParamsExpression, sampleValue: '{ id: selectedId }' },
  { slotKind: AppBuilderPartSlotKind.RouteContextExpression, sampleValue: 'routeContext.parent' },
  { slotKind: AppBuilderPartSlotKind.RouteActiveExpression, sampleValue: 'isItemsActive' },
  { slotKind: AppBuilderPartSlotKind.RouteTargetAttributeName, sampleValue: 'data-route-href' },
  { slotKind: AppBuilderPartSlotKind.ViewportName, sampleValue: 'main' },
  { slotKind: AppBuilderPartSlotKind.ViewportUsedBy, sampleValue: 'admin' },
  { slotKind: AppBuilderPartSlotKind.ViewportDefault, sampleValue: 'home' },
  { slotKind: AppBuilderPartSlotKind.ViewportFallback, sampleValue: 'not-found' },
  { slotKind: AppBuilderPartSlotKind.CompositionComponentExpression, sampleValue: 'currentComponent' },
  { slotKind: AppBuilderPartSlotKind.CompositionTemplateExpression, sampleValue: 'currentTemplate' },
  { slotKind: AppBuilderPartSlotKind.CompositionModelExpression, sampleValue: 'selectedItem' },
  { slotKind: AppBuilderPartSlotKind.CompositionScopeBehavior, sampleValue: AuComposeScopeBehavior.Scoped },
  { slotKind: AppBuilderPartSlotKind.CompositionTagName, sampleValue: 'section' },
  { slotKind: AppBuilderPartSlotKind.CompositionFlushMode, sampleValue: AuComposeFlushMode.Async },
  { slotKind: AppBuilderPartSlotKind.ProjectionSlotName, sampleValue: 'secondary' },
  { slotKind: AppBuilderPartSlotKind.ValidationErrorsExpression, sampleValue: 'errors' },
  { slotKind: AppBuilderPartSlotKind.ValidationControllerExpression, sampleValue: 'validationController' },
  { slotKind: AppBuilderPartSlotKind.BindingBehaviorArguments, sampleValue: null },
  { slotKind: AppBuilderPartSlotKind.ValueConverterArguments, sampleValue: null },
  { slotKind: AppBuilderPartSlotKind.TranslationKeyExpression, sampleValue: 'app.title' },
  { slotKind: AppBuilderPartSlotKind.TranslationParametersExpression, sampleValue: '{ count: itemCount }' },
  { slotKind: AppBuilderPartSlotKind.PortalTarget, sampleValue: 'body' },
  { slotKind: AppBuilderPartSlotKind.PortalPosition, sampleValue: PortalInsertPosition.BeforeEnd },
  { slotKind: AppBuilderPartSlotKind.PortalRenderContext, sampleValue: 'main' },
  { slotKind: AppBuilderPartSlotKind.PortalStrict, sampleValue: 'true' },
  { slotKind: AppBuilderPartSlotKind.CustomElementResourceName, sampleValue: 'sample-card' },
  { slotKind: AppBuilderPartSlotKind.ResourceName, sampleValue: 'sample-resource' },
  { slotKind: AppBuilderPartSlotKind.ResourceTemplateExpression, sampleValue: 'template' },
  { slotKind: AppBuilderPartSlotKind.ResourceDependencyExpressionList, sampleValue: 'SampleCard' },
  { slotKind: AppBuilderPartSlotKind.ResourceTypeExpression, sampleValue: 'SampleCard' },
  { slotKind: AppBuilderPartSlotKind.AttributePatternDefinitionExpressionList, sampleValue: "{ pattern: 'PART.example', symbols: '.' }" },
  { slotKind: AppBuilderPartSlotKind.RouteConfigurationExpression, sampleValue: "{ routes: [{ path: '', component: HomeRoute }] }" },
  { slotKind: AppBuilderPartSlotKind.RouteContextReceiverExpression, sampleValue: 'this.routeContext' },
  { slotKind: AppBuilderPartSlotKind.RouteParameterType, sampleValue: '{ itemId: string; ref?: string }' },
  { slotKind: AppBuilderPartSlotKind.RouteParameterMergeStrategy, sampleValue: 'child-first' },
  { slotKind: AppBuilderPartSlotKind.RouteIncludeQueryParams, sampleValue: 'true' },
  { slotKind: AppBuilderPartSlotKind.ComputedDecoratorArgumentExpression, sampleValue: "{ deps: ['firstName', 'lastName'] }" },
  { slotKind: AppBuilderPartSlotKind.AppTaskSlotName, sampleValue: 'activated' },
  { slotKind: AppBuilderPartSlotKind.AppTaskKeyExpression, sampleValue: 'IContainer' },
  { slotKind: AppBuilderPartSlotKind.AppTaskCallbackExpression, sampleValue: '() => undefined' },
  { slotKind: AppBuilderPartSlotKind.TypeScriptMethodBodyStatements, sampleValue: 'this.refresh();' },
] as const;

const APP_BUILDER_PART_SLOT_SAMPLE_VALUE_BY_KIND = new Map(
  APP_BUILDER_PART_SLOT_SAMPLE_VALUE_ROWS.map((row) => [row.slotKind, row.sampleValue]),
);

/** AI-facing source samples for one part; intentionally separate from executable lowerer callbacks. */
export function sampleSlotAssignmentSamplesForPart(
  part: AppBuilderPartDescriptor,
): readonly AppBuilderPartSourceLoweringSample[] {
  const requiredSlots = sampleSlotAssignmentsForPart(part);
  if (part.optionalSlotKinds.length === 0) {
    return [{
      sampleKind: AppBuilderPartSourceLoweringSampleKind.RequiredOnly,
      slotAssignments: requiredSlots,
    }];
  }
  return [
    {
      sampleKind: AppBuilderPartSourceLoweringSampleKind.RequiredOnly,
      slotAssignments: requiredSlots,
    },
    {
      sampleKind: AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots,
      slotAssignments: [
        ...requiredSlots,
        ...optionalSampleSlotAssignmentsForPart(part),
      ],
    },
  ];
}

function sampleSlotAssignmentsForPart(
  part: AppBuilderPartDescriptor,
): readonly AppBuilderPartSlotAssignment[] {
  return part.requiredSlotKinds.map((slotKind) => requiredSampleSlotAssignment(part, slotKind));
}

function requiredSampleSlotAssignment(
  part: AppBuilderPartDescriptor,
  slotKind: AppBuilderPartSlotKind,
): AppBuilderPartSlotAssignment {
  const value = sampleSlotValueForPart(part, slotKind);
  if (value == null) {
    throw new Error(`App-builder part '${part.kind}:${part.id}' has no grounded sample for required slot '${slotKind}'.`);
  }
  return { slotKind, value };
}

function optionalSampleSlotAssignmentsForPart(
  part: AppBuilderPartDescriptor,
): readonly AppBuilderPartSlotAssignment[] {
  if (part.kind === AppBuilderPartKind.Control && part.detail.requiresValueDomain) {
    return choiceControlOptionalSampleSlotAssignments(part);
  }
  return part.optionalSlotKinds.flatMap((slotKind): readonly AppBuilderPartSlotAssignment[] => {
    const value = sampleSlotValueForPart(part, slotKind);
    return value == null ? [] : [{ slotKind, value }];
  });
}

function choiceControlOptionalSampleSlotAssignments(
  part: AppBuilderPartDescriptor,
): readonly AppBuilderPartSlotAssignment[] {
  return part.optionalSlotKinds.flatMap((slotKind): readonly AppBuilderPartSlotAssignment[] => {
    switch (slotKind) {
      case AppBuilderPartSlotKind.LocalName:
        return [{ slotKind, value: 'option' }];
      case AppBuilderPartSlotKind.OptionValueExpression:
        return [{ slotKind, value: 'option.id' }];
      case AppBuilderPartSlotKind.OptionBindingKind:
        return [{ slotKind, value: AppBuilderChoiceOptionBindingKind.Value }];
      case AppBuilderPartSlotKind.OptionLabelExpression:
        return [{ slotKind, value: 'option.label' }];
      default: {
        const value = sampleSlotValueForPart(part, slotKind);
        return value == null ? [] : [{ slotKind, value }];
      }
    }
  });
}

function sampleSlotValueForPart(
  part: AppBuilderPartDescriptor,
  slotKind: AppBuilderPartSlotKind,
): string | null {
  switch (slotKind) {
    case AppBuilderPartSlotKind.BindingExpression:
      return sampleBindingExpression(part);
    case AppBuilderPartSlotKind.BindingBehaviorArguments:
      return sampleBindingBehaviorArguments(part);
    case AppBuilderPartSlotKind.ValueConverterArguments:
      return sampleValueConverterArguments(part);
    default:
      return sampleSlotValue(slotKind);
  }
}

function sampleBindingExpression(
  part: AppBuilderPartDescriptor,
): string {
  switch (part.kind) {
    case AppBuilderPartKind.Control:
      return sampleControlBindingExpression(part.detail);
    case AppBuilderPartKind.BindingPart:
      return sampleBindingPartExpression(part.detail);
    case AppBuilderPartKind.StructuralPart:
      return sampleStructuralPartExpression(part.detail);
    case AppBuilderPartKind.BindingBehavior:
      return sampleBindingBehaviorSourceExpression(part.detail);
    case AppBuilderPartKind.ValueConverter:
      return sampleValueConverterSourceExpression(part.detail);
    case AppBuilderPartKind.FrameworkComponent:
      return sampleFrameworkComponentExpression(part.detail);
    case AppBuilderPartKind.FrameworkSyntax:
      return sampleFrameworkSyntaxExpression(part.detail);
    case AppBuilderPartKind.FrameworkApi:
      return sampleFrameworkApiExpression(part.detail);
    case AppBuilderPartKind.ResourceMetadata:
      return 'value';
    case AppBuilderPartKind.ComponentLifecycle:
      return sampleComponentLifecycleExpression(part.detail);
  }
}

function sampleControlBindingExpression(
  control: AppBuilderControlDescriptor,
): string {
  switch (control.id) {
    case AppBuilderControlId.TextInput:
    case AppBuilderControlId.EmailInput:
    case AppBuilderControlId.UrlInput:
    case AppBuilderControlId.TelInput:
    case AppBuilderControlId.PasswordInput:
    case AppBuilderControlId.SearchInput:
    case AppBuilderControlId.TimeInput:
    case AppBuilderControlId.DateTimeLocalInput:
    case AppBuilderControlId.MonthInput:
    case AppBuilderControlId.WeekInput:
    case AppBuilderControlId.TextArea:
      return 'draft.title';
    case AppBuilderControlId.NumberInput:
    case AppBuilderControlId.RangeInput:
      return 'draft.quantity';
    case AppBuilderControlId.DateInput:
      return 'draft.dueDate';
    case AppBuilderControlId.Checkbox:
      return 'draft.enabled';
    case AppBuilderControlId.CheckboxList:
    case AppBuilderControlId.MultiSelect:
      return 'selectedOptions';
    case AppBuilderControlId.RadioGroup:
    case AppBuilderControlId.SingleSelect:
      return 'selectedOption';
  }
}

function sampleBindingPartExpression(
  part: AppBuilderBindingPartDescriptor,
): string {
  switch (part.id) {
    case AppBuilderBindingPartId.TextInterpolation:
      return 'title';
    case AppBuilderBindingPartId.EventListener:
    case AppBuilderBindingPartId.EventCaptureListener:
      return 'handle($event)';
    case AppBuilderBindingPartId.ClassListBinding:
      return 'classes';
    case AppBuilderBindingPartId.ClassTokenToggle:
      return 'isActive';
    case AppBuilderBindingPartId.StyleRulesBinding:
      return 'styleRules';
    case AppBuilderBindingPartId.StylePropertyBinding:
      return "isVisible ? 'block' : 'none'";
    case AppBuilderBindingPartId.AttributeBinding:
    case AppBuilderBindingPartId.AttributeToViewBinding:
      return 'isDisabled';
    case AppBuilderBindingPartId.LetBinding:
      return 'selectedItem';
    case AppBuilderBindingPartId.StateBinding:
      return 'title';
    case AppBuilderBindingPartId.StateDispatch:
      return "{ type: 'activate' }";
    case AppBuilderBindingPartId.DynamicTranslation:
      return 'titleKey';
    case AppBuilderBindingPartId.ElementRef:
    case AppBuilderBindingPartId.ElementModelValue:
    case AppBuilderBindingPartId.CustomMatcher:
    case AppBuilderBindingPartId.Translation:
    case AppBuilderBindingPartId.TranslationParameters:
      return 'value';
  }
  return unreachableAppBuilderSample(part.id);
}

function sampleStructuralPartExpression(
  part: AppBuilderStructuralPartDescriptor,
): string {
  switch (part.id) {
    case AppBuilderStructuralPartId.Conditional:
      return 'isReady';
    case AppBuilderStructuralPartId.Switch:
      return 'status';
    case AppBuilderStructuralPartId.SwitchCase:
      return "'ready'";
    case AppBuilderStructuralPartId.Promise:
      return 'loadItems()';
    case AppBuilderStructuralPartId.ValueScope:
      return 'selectedItem';
    case AppBuilderStructuralPartId.ConditionalElse:
    case AppBuilderStructuralPartId.Repeat:
    case AppBuilderStructuralPartId.VirtualRepeat:
    case AppBuilderStructuralPartId.SwitchDefault:
    case AppBuilderStructuralPartId.PromisePending:
    case AppBuilderStructuralPartId.PromiseFulfilled:
    case AppBuilderStructuralPartId.PromiseRejected:
    case AppBuilderStructuralPartId.Portal:
      return 'value';
  }
  return unreachableAppBuilderSample(part.id);
}

function sampleBindingBehaviorSourceExpression(
  behavior: AppBuilderBindingBehaviorDescriptor,
): string {
  switch (behavior.id) {
    case AppBuilderBindingBehaviorId.Translate:
      return "'itemWithCount'";
    case AppBuilderBindingBehaviorId.NumberFormat:
      return 'price';
    case AppBuilderBindingBehaviorId.DateFormat:
    case AppBuilderBindingBehaviorId.RelativeTime:
      return 'createdAt';
    case AppBuilderBindingBehaviorId.Validate:
      return 'draft.title';
    case AppBuilderBindingBehaviorId.State:
      return 'title';
    case AppBuilderBindingBehaviorId.UpdateTrigger:
    case AppBuilderBindingBehaviorId.Debounce:
    case AppBuilderBindingBehaviorId.Throttle:
      return 'draft.title';
    case AppBuilderBindingBehaviorId.Signal:
      return "'items-changed'";
    case AppBuilderBindingBehaviorId.Self:
      return 'handle($event)';
    case AppBuilderBindingBehaviorId.OneTime:
    case AppBuilderBindingBehaviorId.ToView:
    case AppBuilderBindingBehaviorId.FromView:
    case AppBuilderBindingBehaviorId.TwoWay:
    case AppBuilderBindingBehaviorId.Attr:
      return 'value';
  }
}

function sampleValueConverterSourceExpression(
  converter: AppBuilderValueConverterDescriptor,
): string {
  switch (converter.id) {
    case AppBuilderValueConverterId.Translate:
      return "'itemWithCount'";
    case AppBuilderValueConverterId.NumberFormat:
      return 'price';
    case AppBuilderValueConverterId.DateFormat:
    case AppBuilderValueConverterId.RelativeTime:
      return 'createdAt';
    case AppBuilderValueConverterId.Sanitize:
      return 'descriptionHtml';
  }
}

function sampleFrameworkComponentExpression(
  part: AppBuilderFrameworkComponentDescriptor,
): string {
  switch (part.id) {
    case AppBuilderFrameworkComponentId.Focus:
      return 'isFocused';
    case AppBuilderFrameworkComponentId.Show:
      return 'isOpen';
    case AppBuilderFrameworkComponentId.ValidationErrors:
      return 'errors';
    case AppBuilderFrameworkComponentId.AuCompose:
    case AppBuilderFrameworkComponentId.AuSlot:
    case AppBuilderFrameworkComponentId.Viewport:
    case AppBuilderFrameworkComponentId.Load:
    case AppBuilderFrameworkComponentId.Href:
    case AppBuilderFrameworkComponentId.ValidationContainer:
      return 'value';
  }
  return unreachableAppBuilderSample(part.id);
}

function sampleFrameworkSyntaxExpression(
  part: AppBuilderFrameworkSyntaxDescriptor,
): string {
  switch (part.id) {
    case AppBuilderFrameworkSyntaxId.AsElement:
      return 'sample-card';
    case AppBuilderFrameworkSyntaxId.Containerless:
      return 'value';
  }
  return unreachableAppBuilderSample(part.id);
}

function sampleFrameworkApiExpression(
  part: AppBuilderFrameworkApiDescriptor,
): string {
  switch (part.id) {
    case AppBuilderFrameworkApiId.CustomElementDecorator:
    case AppBuilderFrameworkApiId.CustomElementStaticAuDefinition:
      return 'sample-card';
    case AppBuilderFrameworkApiId.CustomElementDefineCall:
      return 'SampleCard';
    case AppBuilderFrameworkApiId.CustomAttributeDecorator:
    case AppBuilderFrameworkApiId.CustomAttributeStaticAuDefinition:
    case AppBuilderFrameworkApiId.TemplateControllerDecorator:
    case AppBuilderFrameworkApiId.TemplateControllerStaticAuDefinition:
    case AppBuilderFrameworkApiId.ValueConverterDecorator:
    case AppBuilderFrameworkApiId.ValueConverterStaticAuDefinition:
    case AppBuilderFrameworkApiId.BindingBehaviorDecorator:
    case AppBuilderFrameworkApiId.BindingBehaviorStaticAuDefinition:
    case AppBuilderFrameworkApiId.BindingCommandDecorator:
    case AppBuilderFrameworkApiId.BindingCommandStaticAuDefinition:
      return 'sample-resource';
    case AppBuilderFrameworkApiId.CustomAttributeDefineCall:
    case AppBuilderFrameworkApiId.TemplateControllerDefineCall:
    case AppBuilderFrameworkApiId.ValueConverterDefineCall:
    case AppBuilderFrameworkApiId.BindingBehaviorDefineCall:
    case AppBuilderFrameworkApiId.BindingCommandDefineCall:
      return 'SampleResource';
    case AppBuilderFrameworkApiId.AttributePatternCreate:
      return 'SampleAttributePattern';
    case AppBuilderFrameworkApiId.RouteDecorator:
      return "{ routes: [{ path: '', component: HomeRoute }] }";
    case AppBuilderFrameworkApiId.RouteContextParameterRead:
      return '{ itemId: string; ref?: string }';
    case AppBuilderFrameworkApiId.FromStateDecorator:
      return 'state => state.items';
    case AppBuilderFrameworkApiId.ComputedDecorator:
      return "{ deps: ['firstName', 'lastName'] }";
    case AppBuilderFrameworkApiId.AppTaskRegistration:
      return '() => undefined';
  }
  return unreachableAppBuilderSample(part.id);
}

function sampleComponentLifecycleExpression(
  part: AppBuilderComponentLifecycleDescriptor,
): string {
  return part.hookName;
}

function sampleBindingBehaviorArguments(
  part: AppBuilderPartDescriptor,
): string | null {
  if (part.kind !== AppBuilderPartKind.BindingBehavior) {
    return sampleSlotValue(AppBuilderPartSlotKind.BindingBehaviorArguments);
  }
  const behavior = part.detail;
  switch (behavior.id) {
    case AppBuilderBindingBehaviorId.Debounce:
    case AppBuilderBindingBehaviorId.Throttle:
      return '250';
    case AppBuilderBindingBehaviorId.Signal:
      return "'items-changed'";
    case AppBuilderBindingBehaviorId.UpdateTrigger:
      return "'blur'";
    case AppBuilderBindingBehaviorId.Validate:
      return "'blur'";
    case AppBuilderBindingBehaviorId.Translate:
      return '{ count: itemCount }';
    case AppBuilderBindingBehaviorId.NumberFormat:
      return "{ style: 'currency', currency: 'EUR' }";
    case AppBuilderBindingBehaviorId.DateFormat:
      return "{ dateStyle: 'long' }";
    case AppBuilderBindingBehaviorId.RelativeTime:
      return "{ style: 'short' }";
    case AppBuilderBindingBehaviorId.State:
      return "'users'";
    case AppBuilderBindingBehaviorId.OneTime:
    case AppBuilderBindingBehaviorId.ToView:
    case AppBuilderBindingBehaviorId.FromView:
    case AppBuilderBindingBehaviorId.TwoWay:
    case AppBuilderBindingBehaviorId.Self:
    case AppBuilderBindingBehaviorId.Attr:
      return null;
  }
}

function sampleValueConverterArguments(
  part: AppBuilderPartDescriptor,
): string | null {
  if (part.kind !== AppBuilderPartKind.ValueConverter) {
    return sampleSlotValue(AppBuilderPartSlotKind.ValueConverterArguments);
  }
  const converter = part.detail;
  switch (converter.id) {
    case AppBuilderValueConverterId.Translate:
      return '{ count: itemCount }';
    case AppBuilderValueConverterId.NumberFormat:
      return "{ style: 'currency', currency: 'EUR' }";
    case AppBuilderValueConverterId.DateFormat:
      return "{ dateStyle: 'long' }";
    case AppBuilderValueConverterId.RelativeTime:
      return "{ style: 'short' }";
    case AppBuilderValueConverterId.Sanitize:
      return null;
  }
}

function sampleSlotValue(
  slotKind: AppBuilderPartSlotKind,
): string | null {
  if (APP_BUILDER_PART_SLOT_SAMPLE_VALUE_BY_KIND.has(slotKind)) {
    return APP_BUILDER_PART_SLOT_SAMPLE_VALUE_BY_KIND.get(slotKind) ?? null;
  }
  return missingAppBuilderSlotSample(slotKind);
}

function missingAppBuilderSlotSample(slotKind: AppBuilderPartSlotKind): never {
  throw new Error(`Unhandled app-builder source sample slot '${slotKind}'.`);
}

function unreachableAppBuilderSample(value: never): never {
  throw new Error(`Unhandled app-builder source sample value '${String(value)}'.`);
}
