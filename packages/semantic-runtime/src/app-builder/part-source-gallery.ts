import { moduleSpecifier } from '../application/module-specifier.js';
import {
  aureliaConfigurationAdmissionSourceSet,
  aureliaI18nConfigurationAdmissionSource,
  aureliaRouterConfigurationAdmissionSource,
  aureliaStateDefaultConfigurationAdmissionSource,
  aureliaUiVirtualizationConfigurationAdmissionSource,
  aureliaValidationHtmlConfigurationAdmissionSource,
} from '../source-plan/aurelia-configuration-admission-source.js';
import {
  aureliaEntrypointRegistrationExpressionSource,
  type AureliaEntrypointImport,
  type AureliaEntrypointRegistrationExpression,
} from '../source-plan/aurelia-entrypoint-source-plan.js';
import {
  SourcePlan,
  SourcePlanContributionOriginKind,
  type SourcePlanFileArtifact,
  SourcePlanFileRole,
  SourcePlanLanguage,
  SourcePlanOperationKind,
} from '../source-plan/source-plan.js';
import { type TypeScriptImportRequirement } from '../source-plan/typescript-import-source.js';
import { typeScriptSourceText, type TypeScriptSourceText } from '../source-plan/typescript-source-text.js';
import {
  authoredTemplateElementSource,
  authoredTemplateElementSourceText,
  type AuthoredTemplateAttributeSource,
  type AuthoredTemplateChildSource,
} from '../template/authored-template-source.js';
import {
  builtInBindingCommandAttributeSource,
  BuiltInBindingCommandName,
  BuiltInBindingCommandTargetName,
} from '../template/built-in-syntax.js';
import { AppBuilderBindingBehaviorId } from './binding-behavior-catalog.js';
import { AppBuilderBindingPartId } from './binding-part-catalog.js';
import { AppBuilderComponentLifecycleId } from './component-lifecycle-catalog.js';
import { AppBuilderControlId } from './control-catalog.js';
import { AppBuilderFrameworkApiId } from './framework-api-catalog.js';
import { AppBuilderFrameworkComponentId } from './framework-component-catalog.js';
import { AppBuilderFrameworkSyntaxId } from './framework-syntax-catalog.js';
import {
  AppBuilderPartApplicationSiteKind,
  AppBuilderPartSlotKind,
} from './part-application.js';
import {
  APP_BUILDER_PARTS,
  appBuilderPartDescriptor,
  AppBuilderPartKind,
  type AppBuilderPartDescriptor,
  type AppBuilderPartId,
} from './part-catalog.js';
import {
  AppBuilderPartSourceFragmentKind,
  AppBuilderPartSourceLoweringState,
  type AppBuilderPartSlotAssignment,
  type AppBuilderPartSourceFragment,
  type AppBuilderPartSourceFragmentForKind,
} from './part-source-invocation.js';
import {
  lowerAppBuilderPartSourceInvocation,
} from './part-source-lowering.js';
import {
  AppBuilderPartSourceLoweringSampleKind,
  sampleSlotAssignmentSamplesForPart,
} from './part-source-samples.js';
import {
  appBuilderPartSourceFragmentContributions,
  appBuilderPartSourceFragmentsContributions,
} from './source-plan-contributions.js';
import {
  appBuilderComputedDecoratorFragment,
  appBuilderComponentLifecycleHookMethodFragment,
  appBuilderAttributePatternCreateExpressionFragment,
  appBuilderCustomElementDecoratorFragment,
  appBuilderCustomElementDefineCallExpressionFragment,
  appBuilderCustomElementStaticAuFragment,
  appBuilderFromStateDecoratorFragment,
  appBuilderNamedResourceDecoratorFragment,
  appBuilderNamedResourceDefineCallExpressionFragment,
  appBuilderNamedResourceStaticAuFragment,
  appBuilderResourceDependenciesPropertyFragment,
  appBuilderRouteDecoratorFragment,
  appBuilderRouteContextParameterReadExpressionFragmentForMembers,
} from './source-lowering-helpers.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  appBuilderHtmlTemplateFileArtifact,
  type AppBuilderHtmlTemplateSource,
} from './template-source-plan.js';
import { AppBuilderStructuralPartId } from './structural-part-catalog.js';
import { AppBuilderValueConverterId } from './value-converter-catalog.js';
import { AppBuilderSourcePlanAssembly } from './source-plan-assembly.js';

export interface AppBuilderPartSourceGalleryPlanRequest {
  readonly rootDir: string;
  readonly appName: string;
}

/** SourcePlan frame for the dense part-source gallery pressure fixture. */
interface AppBuilderPartSourceGallerySourcePlanFrame {
  readonly rootDir: string;
  readonly appName: string;
  readonly appPath: string;
  readonly templatePath: string;
  readonly entrypointPath: string;
  readonly statePath: string;
  readonly admissions: ReturnType<typeof aureliaConfigurationAdmissionSourceSet>;
  readonly appTaskExpressions: readonly AureliaEntrypointRegistrationExpression[];
  readonly entrypointImports: readonly AureliaEntrypointImport[];
  readonly appSource: TypeScriptSourceText;
  readonly stateSource: TypeScriptSourceText;
}

/** Coverage issue for the dense app-builder part-source gallery fixture. */
export enum AppBuilderPartSourceGalleryCoverageIssueKind {
  /** A public part sample invocation shape is absent from gallery source-plan contributions. */
  MissingInvocationShape = 'missing-invocation-shape',
  /** The gallery emitted a part invocation shape that is not backed by public sample metadata. */
  UnexpectedInvocationShape = 'unexpected-invocation-shape',
}

/** One part/sample coverage issue found in the gallery source-plan contribution ledger. */
export interface AppBuilderPartSourceGalleryCoverageIssue {
  readonly issueKind: AppBuilderPartSourceGalleryCoverageIssueKind;
  readonly expectedPartKind?: AppBuilderPartKind | null;
  readonly expectedPartId?: AppBuilderPartId | null;
  readonly observedPartKind?: string | null;
  readonly observedPartId?: string | null;
  readonly slotKinds: readonly string[];
  readonly summary: string;
}

/** Generated pressure fixture that places app-builder part lowerer output inside a real Aurelia app. */
export function appBuilderPartSourceGallerySourcePlan(
  request: AppBuilderPartSourceGalleryPlanRequest,
): SourcePlan {
  const frame = appBuilderPartSourceGallerySourcePlanFrame(request);
  return appBuilderPartSourceGallerySourcePlanAssembly(frame).build();
}

function appBuilderPartSourceGallerySourcePlanFrame(
  request: AppBuilderPartSourceGalleryPlanRequest,
): AppBuilderPartSourceGallerySourcePlanFrame {
  const appPath = 'src/my-app.ts';
  const templatePath = 'src/my-app.html';
  const entrypointPath = 'src/main.ts';
  const statePath = 'src/gallery-state.ts';
  const admissions = appBuilderPartSourceGalleryAdmissionFrame(entrypointPath, statePath);
  return {
    rootDir: request.rootDir,
    appName: request.appName,
    appPath,
    templatePath,
    entrypointPath,
    statePath,
    admissions,
    appTaskExpressions: appTaskRegistrationExpressions(),
    entrypointImports: appBuilderPartSourceGalleryEntrypointImports(entrypointPath, appPath, statePath, admissions),
    appSource: galleryAppSource(appPath, templatePath, statePath),
    stateSource: galleryStateSource(),
  };
}

function appBuilderPartSourceGalleryAdmissionFrame(
  entrypointPath: string,
  statePath: string,
): ReturnType<typeof aureliaConfigurationAdmissionSourceSet> {
  return aureliaConfigurationAdmissionSourceSet([
    aureliaRouterConfigurationAdmissionSource(),
    aureliaStateDefaultConfigurationAdmissionSource({
      stateModuleSpecifier: moduleSpecifier(entrypointPath, statePath, false),
      initialStateName: 'initialGalleryState',
      handlerName: 'galleryStateHandler',
      namedStores: [{
        storeName: 'users',
        initialStateName: 'usersGalleryState',
        handlerName: 'galleryStateHandler',
      }],
    }),
    aureliaI18nConfigurationAdmissionSource({
      initOptionsExpression: galleryI18nInitOptionsExpression(),
    }),
    aureliaValidationHtmlConfigurationAdmissionSource(),
    aureliaUiVirtualizationConfigurationAdmissionSource(),
  ]);
}

function appBuilderPartSourceGalleryEntrypointImports(
  entrypointPath: string,
  appPath: string,
  statePath: string,
  admissions: ReturnType<typeof aureliaConfigurationAdmissionSourceSet>,
): readonly AureliaEntrypointImport[] {
  return [
    ...admissions.configurationImports,
    {
      moduleSpecifier: 'aurelia',
      namedImports: ['AppTask', 'IContainer', 'Registration'],
    },
    {
      moduleSpecifier: '@aurelia/runtime-html',
      namedImports: ['ISanitizer'],
    },
    {
      moduleSpecifier: moduleSpecifier(entrypointPath, appPath, false),
      namedImports: ['GallerySanitizer'],
    },
  ];
}

function appBuilderPartSourceGallerySourcePlanAssembly(
  frame: AppBuilderPartSourceGallerySourcePlanFrame,
): AppBuilderSourcePlanAssembly {
  return new AppBuilderSourcePlanAssembly({
    rootDir: frame.rootDir,
    appName: frame.appName,
    dependencySpecifiers: [
      ...frame.admissions.dependencySpecifiers,
      '@aurelia/runtime-html',
    ],
  })
    .addConfiguredEntrypoint(appBuilderPartSourceGalleryEntrypointConfig(frame))
    .addFile(appBuilderPartSourceGalleryAppFile(frame))
    .addFile(appBuilderHtmlTemplateFileArtifact(frame.templatePath, galleryTemplateSource()))
    .addFile(appBuilderPartSourceGalleryStateFile(frame));
}

function appBuilderPartSourceGalleryEntrypointConfig(
  frame: AppBuilderPartSourceGallerySourcePlanFrame,
) {
  return {
    entrypointPath: frame.entrypointPath,
    rootComponentPath: frame.appPath,
    rootComponentClassName: 'MyApp',
    configurationImports: frame.entrypointImports,
    registrationExpressions: [
      ...frame.admissions.registrationExpressions,
      'Registration.singleton(ISanitizer, GallerySanitizer)',
      ...frame.appTaskExpressions,
    ],
  };
}

function appBuilderPartSourceGalleryAppFile(
  frame: AppBuilderPartSourceGallerySourcePlanFrame,
): SourcePlanFileArtifact {
  return {
    path: frame.appPath,
    role: SourcePlanFileRole.RootComponent,
    language: SourcePlanLanguage.TypeScript,
    operationKind: SourcePlanOperationKind.CreateComponentViewModel,
    text: frame.appSource.text,
    contributions: frame.appSource.contributions,
  };
}

function appBuilderPartSourceGalleryStateFile(
  frame: AppBuilderPartSourceGallerySourcePlanFrame,
): SourcePlanFileArtifact {
  return {
    path: frame.statePath,
    role: SourcePlanFileRole.StateModel,
    language: SourcePlanLanguage.TypeScript,
    operationKind: SourcePlanOperationKind.CreateStateModel,
    text: frame.stateSource.text,
    contributions: frame.stateSource.contributions,
  };
}

/** Check that the source gallery spends every cataloged part sample invocation shape in its contribution ledger. */
export function appBuilderPartSourceGalleryCoverageIssues(
  sourcePlan: SourcePlan,
): readonly AppBuilderPartSourceGalleryCoverageIssue[] {
  const expected = appBuilderPartSourceGalleryExpectedOriginShapes();
  const seen = appBuilderPartSourceGallerySeenOriginShapes(sourcePlan);
  const issues: AppBuilderPartSourceGalleryCoverageIssue[] = [];
  for (const [key, shape] of expected) {
    if (seen.has(key)) {
      continue;
    }
    issues.push({
      issueKind: AppBuilderPartSourceGalleryCoverageIssueKind.MissingInvocationShape,
      expectedPartKind: shape.partKind,
      expectedPartId: shape.partId,
      slotKinds: shape.slotKinds,
      summary: `App-builder part source gallery does not include sample invocation '${shape.partKind}:${shape.partId}' with slots [${shape.slotKinds.join(', ')}].`,
    });
  }
  for (const [key, shape] of seen) {
    if (expected.has(key)) {
      continue;
    }
    issues.push({
      issueKind: AppBuilderPartSourceGalleryCoverageIssueKind.UnexpectedInvocationShape,
      observedPartKind: shape.partKind,
      observedPartId: shape.partId,
      slotKinds: shape.slotKinds,
      summary: `App-builder part source gallery emitted unexpected invocation '${shape.partKind}:${shape.partId}' with slots [${shape.slotKinds.join(', ')}].`,
    });
  }
  return issues;
}

/** Throw if the source gallery no longer represents every public part sample invocation shape. */
export function assertAppBuilderPartSourceGalleryCoverage(sourcePlan: SourcePlan): void {
  const issues = appBuilderPartSourceGalleryCoverageIssues(sourcePlan);
  if (issues.length === 0) {
    return;
  }
  throw new Error(
    `App-builder part source gallery coverage has ${issues.length} issue(s): ${issues
      .map((issue) => `${issue.issueKind}:${galleryCoverageIssuePartText(issue)}:[${issue.slotKinds.join(',')}]`)
      .join(', ')}`,
  );
}

function galleryCoverageIssuePartText(
  issue: AppBuilderPartSourceGalleryCoverageIssue,
): string {
  if (issue.issueKind === AppBuilderPartSourceGalleryCoverageIssueKind.MissingInvocationShape) {
    return `${issue.expectedPartKind ?? 'unknown'}:${issue.expectedPartId ?? 'unknown'}`;
  }
  return `${issue.observedPartKind ?? 'unknown'}:${issue.observedPartId ?? 'unknown'}`;
}

function galleryTemplateSource(): AppBuilderHtmlTemplateSource {
  const fragments: AppBuilderPartSourceFragment[] = [];
  const text = `${authoredTemplateElementSourceText(authoredTemplateElementSource('main', [], null, [
    authoredTemplateElementSource('h1', [], textInterpolation(fragments, AppBuilderBindingPartId.TextInterpolation)),
    authoredTemplateElementSource('section', [], null, controlElements(fragments)),
    authoredTemplateElementSource('section', [], null, bindingPartElements(fragments)),
    authoredTemplateElementSource('section', [], null, bindingExpressionElements(fragments)),
    authoredTemplateElementSource('section', [], null, templateControllerElements(fragments)),
    authoredTemplateElementSource('section', [], null, frameworkComponentElements(fragments)),
    authoredTemplateElementSource('sample-card', [
      templateAttribute(fragments, AppBuilderPartKind.FrameworkSyntax, AppBuilderFrameworkSyntaxId.Containerless),
    ], 'Projected card'),
  ]))}
`;
  return { text, fragments };
}

function controlElements(
  fragments: AppBuilderPartSourceFragment[],
): readonly AuthoredTemplateChildSource[] {
  return [
    templateElement(fragments, AppBuilderPartKind.Control, AppBuilderControlId.TextInput),
    templateElement(fragments, AppBuilderPartKind.Control, AppBuilderControlId.NumberInput),
    templateElement(fragments, AppBuilderPartKind.Control, AppBuilderControlId.NumberInput, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots),
    templateElement(fragments, AppBuilderPartKind.Control, AppBuilderControlId.DateInput),
    templateElement(fragments, AppBuilderPartKind.Control, AppBuilderControlId.RangeInput),
    templateElement(fragments, AppBuilderPartKind.Control, AppBuilderControlId.RangeInput, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots),
    templateElement(fragments, AppBuilderPartKind.Control, AppBuilderControlId.TextArea),
    templateElement(fragments, AppBuilderPartKind.Control, AppBuilderControlId.Checkbox),
    templateElement(fragments, AppBuilderPartKind.Control, AppBuilderControlId.CheckboxList),
    optionalChoiceTemplateElement(fragments, AppBuilderControlId.CheckboxList, 'selectedOptionIds'),
    templateElement(fragments, AppBuilderPartKind.Control, AppBuilderControlId.RadioGroup),
    optionalChoiceTemplateElement(fragments, AppBuilderControlId.RadioGroup, 'selectedOptionId'),
    templateElement(fragments, AppBuilderPartKind.Control, AppBuilderControlId.SingleSelect),
    optionalChoiceTemplateElement(fragments, AppBuilderControlId.SingleSelect, 'selectedOptionId'),
    templateElement(fragments, AppBuilderPartKind.Control, AppBuilderControlId.MultiSelect),
    optionalChoiceTemplateElement(fragments, AppBuilderControlId.MultiSelect, 'selectedOptionIds'),
  ];
}

function bindingPartElements(
  fragments: AppBuilderPartSourceFragment[],
): readonly AuthoredTemplateChildSource[] {
  return [
    ...bindingEventElements(fragments),
    ...bindingStyleAndAttributeElements(fragments),
    ...bindingLocalModelElements(fragments),
    ...bindingStateElements(fragments),
    ...bindingI18nElements(fragments),
  ];
}

function bindingEventElements(
  fragments: AppBuilderPartSourceFragment[],
): readonly AuthoredTemplateChildSource[] {
  return [
    authoredTemplateElementSource('button', [
      templateAttribute(fragments, AppBuilderPartKind.BindingPart, AppBuilderBindingPartId.EventListener),
    ], 'Trigger'),
    authoredTemplateElementSource('button', [
      templateAttribute(fragments, AppBuilderPartKind.BindingPart, AppBuilderBindingPartId.EventCaptureListener),
    ], 'Capture'),
  ];
}

function bindingStyleAndAttributeElements(
  fragments: AppBuilderPartSourceFragment[],
): readonly AuthoredTemplateChildSource[] {
  return [
    authoredTemplateElementSource('div', [
      templateAttribute(fragments, AppBuilderPartKind.BindingPart, AppBuilderBindingPartId.ElementRef),
      templateAttribute(fragments, AppBuilderPartKind.BindingPart, AppBuilderBindingPartId.ClassListBinding),
      templateAttribute(fragments, AppBuilderPartKind.BindingPart, AppBuilderBindingPartId.ClassTokenToggle),
      templateAttribute(fragments, AppBuilderPartKind.BindingPart, AppBuilderBindingPartId.StyleRulesBinding),
      templateAttribute(fragments, AppBuilderPartKind.BindingPart, AppBuilderBindingPartId.StylePropertyBinding),
    ], 'Styled'),
    authoredTemplateElementSource('button', [
      templateAttribute(fragments, AppBuilderPartKind.BindingPart, AppBuilderBindingPartId.AttributeBinding),
      templateAttribute(fragments, AppBuilderPartKind.BindingPart, AppBuilderBindingPartId.AttributeToViewBinding),
    ], 'Attribute'),
  ];
}

function bindingLocalModelElements(
  fragments: AppBuilderPartSourceFragment[],
): readonly AuthoredTemplateChildSource[] {
  return [
    templateElement(fragments, AppBuilderPartKind.BindingPart, AppBuilderBindingPartId.LetBinding),
    authoredTemplateElementSource('select', [], null, [
      authoredTemplateElementSource('option', [
        repeatTemplateAttribute(fragments, 'option', 'options'),
        templateAttribute(fragments, AppBuilderPartKind.BindingPart, AppBuilderBindingPartId.ElementModelValue),
      ], textInterpolationSource('option.label')),
    ]),
    authoredTemplateElementSource('select', [
      templateAttribute(fragments, AppBuilderPartKind.BindingPart, AppBuilderBindingPartId.CustomMatcher),
    ], null, [
      authoredTemplateElementSource('option', [], 'Matched option'),
    ]),
  ];
}

function bindingStateElements(
  fragments: AppBuilderPartSourceFragment[],
): readonly AuthoredTemplateChildSource[] {
  return [
    authoredTemplateElementSource('input', [
      templateAttribute(fragments, AppBuilderPartKind.BindingPart, AppBuilderBindingPartId.StateBinding),
    ], null),
    authoredTemplateElementSource('input', [
      templateAttribute(fragments, AppBuilderPartKind.BindingPart, AppBuilderBindingPartId.StateBinding, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots),
    ], null),
    authoredTemplateElementSource('button', [
      templateAttribute(fragments, AppBuilderPartKind.BindingPart, AppBuilderBindingPartId.StateDispatch),
    ], 'Dispatch'),
    authoredTemplateElementSource('button', [
      templateAttribute(fragments, AppBuilderPartKind.BindingPart, AppBuilderBindingPartId.StateDispatch, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots),
    ], 'Dispatch users'),
  ];
}

function bindingI18nElements(
  fragments: AppBuilderPartSourceFragment[],
): readonly AuthoredTemplateChildSource[] {
  return [
    authoredTemplateElementSource('span', [
      templateAttribute(fragments, AppBuilderPartKind.BindingPart, AppBuilderBindingPartId.Translation),
      templateAttribute(fragments, AppBuilderPartKind.BindingPart, AppBuilderBindingPartId.TranslationParameters),
    ], null),
    authoredTemplateElementSource('span', [
      templateAttribute(fragments, AppBuilderPartKind.BindingPart, AppBuilderBindingPartId.DynamicTranslation),
    ], null),
  ];
}

function bindingExpressionElements(
  fragments: AppBuilderPartSourceFragment[],
): readonly AuthoredTemplateChildSource[] {
  const behaviors = [
    AppBuilderBindingBehaviorId.OneTime,
    AppBuilderBindingBehaviorId.ToView,
    AppBuilderBindingBehaviorId.FromView,
    AppBuilderBindingBehaviorId.TwoWay,
    AppBuilderBindingBehaviorId.Debounce,
    [AppBuilderBindingBehaviorId.Debounce, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots] as const,
    AppBuilderBindingBehaviorId.Throttle,
    [AppBuilderBindingBehaviorId.Throttle, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots] as const,
    AppBuilderBindingBehaviorId.Signal,
    AppBuilderBindingBehaviorId.UpdateTrigger,
    AppBuilderBindingBehaviorId.Self,
    AppBuilderBindingBehaviorId.Attr,
    AppBuilderBindingBehaviorId.Validate,
    [AppBuilderBindingBehaviorId.Validate, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots] as const,
    AppBuilderBindingBehaviorId.Translate,
    [AppBuilderBindingBehaviorId.Translate, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots] as const,
    AppBuilderBindingBehaviorId.NumberFormat,
    [AppBuilderBindingBehaviorId.NumberFormat, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots] as const,
    AppBuilderBindingBehaviorId.DateFormat,
    [AppBuilderBindingBehaviorId.DateFormat, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots] as const,
    AppBuilderBindingBehaviorId.RelativeTime,
    [AppBuilderBindingBehaviorId.RelativeTime, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots] as const,
    AppBuilderBindingBehaviorId.State,
    [AppBuilderBindingBehaviorId.State, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots] as const,
  ];
  const converters = [
    AppBuilderValueConverterId.Sanitize,
    AppBuilderValueConverterId.Translate,
    [AppBuilderValueConverterId.Translate, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots] as const,
    AppBuilderValueConverterId.NumberFormat,
    [AppBuilderValueConverterId.NumberFormat, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots] as const,
    AppBuilderValueConverterId.DateFormat,
    [AppBuilderValueConverterId.DateFormat, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots] as const,
    AppBuilderValueConverterId.RelativeTime,
    [AppBuilderValueConverterId.RelativeTime, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots] as const,
  ];
  return [
    ...behaviors.map((entry) => {
      const [id, sampleKind] = Array.isArray(entry) ? entry : [entry, AppBuilderPartSourceLoweringSampleKind.RequiredOnly] as const;
      return bindingBehaviorHostElement(fragments, id, sampleKind);
    }),
    ...converters.map((entry) => {
      const [id, sampleKind] = Array.isArray(entry) ? entry : [entry, AppBuilderPartSourceLoweringSampleKind.RequiredOnly] as const;
      return authoredTemplateElementSource('span', [], textInterpolationSource(bindingExpression(fragments, AppBuilderPartKind.ValueConverter, id, sampleKind)));
    }),
  ];
}

function templateControllerElements(
  fragments: AppBuilderPartSourceFragment[],
): readonly AuthoredTemplateChildSource[] {
  return [
    ...conditionalTemplateControllerElements(fragments),
    ...iterationTemplateControllerElements(fragments),
    ...switchTemplateControllerElements(fragments),
    ...promiseTemplateControllerElements(fragments),
    ...scopeAndPortalTemplateControllerElements(fragments),
  ];
}

function conditionalTemplateControllerElements(
  fragments: AppBuilderPartSourceFragment[],
): readonly AuthoredTemplateChildSource[] {
  return [
    authoredTemplateElementSource('section', [
      templateAttribute(fragments, AppBuilderPartKind.StructuralPart, AppBuilderStructuralPartId.Conditional),
    ], 'Ready'),
    authoredTemplateElementSource('section', [
      templateAttribute(fragments, AppBuilderPartKind.StructuralPart, AppBuilderStructuralPartId.ConditionalElse),
    ], 'Not ready'),
  ];
}

function iterationTemplateControllerElements(
  fragments: AppBuilderPartSourceFragment[],
): readonly AuthoredTemplateChildSource[] {
  return [
    authoredTemplateElementSource('ul', [], null, [
      authoredTemplateElementSource('li', [
        templateAttribute(fragments, AppBuilderPartKind.StructuralPart, AppBuilderStructuralPartId.Repeat),
      ], textInterpolationSource('item.label')),
    ]),
    authoredTemplateElementSource('ul', [], null, [
      authoredTemplateElementSource('li', [
        templateAttribute(fragments, AppBuilderPartKind.StructuralPart, AppBuilderStructuralPartId.VirtualRepeat),
      ], textInterpolationSource('item.label')),
    ]),
  ];
}

function switchTemplateControllerElements(
  fragments: AppBuilderPartSourceFragment[],
): readonly AuthoredTemplateChildSource[] {
  return [
    authoredTemplateElementSource('section', [
      templateAttribute(fragments, AppBuilderPartKind.StructuralPart, AppBuilderStructuralPartId.Switch),
    ], null, [
      authoredTemplateElementSource('p', [
        templateAttribute(fragments, AppBuilderPartKind.StructuralPart, AppBuilderStructuralPartId.SwitchCase),
      ], 'Ready status'),
      authoredTemplateElementSource('p', [
        templateAttribute(fragments, AppBuilderPartKind.StructuralPart, AppBuilderStructuralPartId.SwitchDefault),
      ], 'Other status'),
    ]),
  ];
}

function promiseTemplateControllerElements(
  fragments: AppBuilderPartSourceFragment[],
): readonly AuthoredTemplateChildSource[] {
  return [
    authoredTemplateElementSource('section', [
      templateAttribute(fragments, AppBuilderPartKind.StructuralPart, AppBuilderStructuralPartId.Promise),
    ], null, [
      authoredTemplateElementSource('p', [
        templateAttribute(fragments, AppBuilderPartKind.StructuralPart, AppBuilderStructuralPartId.PromisePending),
      ], 'Loading'),
      authoredTemplateElementSource('p', [
        templateAttribute(fragments, AppBuilderPartKind.StructuralPart, AppBuilderStructuralPartId.PromiseFulfilled),
      ], 'Resolved'),
      authoredTemplateElementSource('p', [
        templateAttribute(fragments, AppBuilderPartKind.StructuralPart, AppBuilderStructuralPartId.PromiseFulfilled, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots),
      ], textInterpolationSource('item.label')),
      authoredTemplateElementSource('p', [
        templateAttribute(fragments, AppBuilderPartKind.StructuralPart, AppBuilderStructuralPartId.PromiseRejected),
      ], 'Rejected'),
      authoredTemplateElementSource('p', [
        templateAttribute(fragments, AppBuilderPartKind.StructuralPart, AppBuilderStructuralPartId.PromiseRejected, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots),
      ], textInterpolationSource('item')),
    ]),
  ];
}

function scopeAndPortalTemplateControllerElements(
  fragments: AppBuilderPartSourceFragment[],
): readonly AuthoredTemplateChildSource[] {
  return [
    authoredTemplateElementSource('section', [
      templateAttribute(fragments, AppBuilderPartKind.StructuralPart, AppBuilderStructuralPartId.ValueScope),
    ], textInterpolationSource('label')),
    authoredTemplateElementSource('section', [
      templateAttribute(fragments, AppBuilderPartKind.StructuralPart, AppBuilderStructuralPartId.Portal),
    ], 'Portal default'),
    authoredTemplateElementSource('section', [
      templateAttribute(fragments, AppBuilderPartKind.StructuralPart, AppBuilderStructuralPartId.Portal, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots),
    ], 'Portal target'),
  ];
}

function frameworkComponentElements(
  fragments: AppBuilderPartSourceFragment[],
): readonly AuthoredTemplateChildSource[] {
  return [
    ...compositionFrameworkComponentElements(fragments),
    ...interactionFrameworkComponentElements(fragments),
    ...routerFrameworkComponentElements(fragments),
    ...validationFrameworkComponentElements(fragments),
    ...compilerSyntaxElements(fragments),
  ];
}

function compositionFrameworkComponentElements(
  fragments: AppBuilderPartSourceFragment[],
): readonly AuthoredTemplateChildSource[] {
  return [
    templateElement(fragments, AppBuilderPartKind.FrameworkComponent, AppBuilderFrameworkComponentId.AuCompose),
    templateElement(fragments, AppBuilderPartKind.FrameworkComponent, AppBuilderFrameworkComponentId.AuCompose, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots),
    templateElement(fragments, AppBuilderPartKind.FrameworkComponent, AppBuilderFrameworkComponentId.AuSlot),
    templateElement(fragments, AppBuilderPartKind.FrameworkComponent, AppBuilderFrameworkComponentId.AuSlot, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots),
  ];
}

function interactionFrameworkComponentElements(
  fragments: AppBuilderPartSourceFragment[],
): readonly AuthoredTemplateChildSource[] {
  return [
    authoredTemplateElementSource('input', [
      templateAttribute(fragments, AppBuilderPartKind.FrameworkComponent, AppBuilderFrameworkComponentId.Focus),
    ], null),
    authoredTemplateElementSource('section', [
      templateAttribute(fragments, AppBuilderPartKind.FrameworkComponent, AppBuilderFrameworkComponentId.Show),
    ], 'Show'),
  ];
}

function routerFrameworkComponentElements(
  fragments: AppBuilderPartSourceFragment[],
): readonly AuthoredTemplateChildSource[] {
  return [
    templateElement(fragments, AppBuilderPartKind.FrameworkComponent, AppBuilderFrameworkComponentId.Viewport),
    templateElement(fragments, AppBuilderPartKind.FrameworkComponent, AppBuilderFrameworkComponentId.Viewport, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots),
    authoredTemplateElementSource('a', [
      templateAttribute(fragments, AppBuilderPartKind.FrameworkComponent, AppBuilderFrameworkComponentId.Load),
    ], 'Load'),
    authoredTemplateElementSource('a', [
      templateAttribute(fragments, AppBuilderPartKind.FrameworkComponent, AppBuilderFrameworkComponentId.Load, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots),
    ], 'Load detailed'),
    authoredTemplateElementSource('a', [
      templateAttribute(fragments, AppBuilderPartKind.FrameworkComponent, AppBuilderFrameworkComponentId.Href),
    ], 'Href'),
  ];
}

function validationFrameworkComponentElements(
  fragments: AppBuilderPartSourceFragment[],
): readonly AuthoredTemplateChildSource[] {
  return [
    authoredTemplateElementSource('div', [
      templateAttribute(fragments, AppBuilderPartKind.FrameworkComponent, AppBuilderFrameworkComponentId.ValidationErrors),
    ], null),
    authoredTemplateElementSource('div', [
      templateAttribute(fragments, AppBuilderPartKind.FrameworkComponent, AppBuilderFrameworkComponentId.ValidationErrors, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots),
    ], null),
    templateElement(fragments, AppBuilderPartKind.FrameworkComponent, AppBuilderFrameworkComponentId.ValidationContainer),
    templateElement(fragments, AppBuilderPartKind.FrameworkComponent, AppBuilderFrameworkComponentId.ValidationContainer, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots),
  ];
}

function compilerSyntaxElements(
  fragments: AppBuilderPartSourceFragment[],
): readonly AuthoredTemplateChildSource[] {
  return [
    authoredTemplateElementSource('sample-card', [
      templateAttribute(fragments, AppBuilderPartKind.FrameworkSyntax, AppBuilderFrameworkSyntaxId.AsElement),
    ], 'As element'),
  ];
}

function galleryAppSource(
  appPath: string,
  templatePath: string,
  statePath: string,
): TypeScriptSourceText {
  const frame = galleryAppSourceFrame(appPath, templatePath, statePath);
  const body = [
    galleryResourceDeclarationsSource(frame),
    galleryRouteAndServiceSource(frame),
    galleryRootAppClassSource(frame),
    gallerySharedTypesSource(frame),
  ].join('\n\n');
  return typeScriptSourceText(
    `${body}\n`,
    frame.imports,
    appBuilderPartSourceFragmentsContributions(frame.fragments, SourcePlanLanguage.TypeScript),
  );
}

interface GalleryAppSourceFrame {
  readonly fragments: AppBuilderPartSourceFragment[];
  readonly imports: readonly TypeScriptImportRequirement[];
  readonly routeDecorator: AppBuilderPartSourceFragment;
  readonly sampleCardDecorator: AppBuilderPartSourceFragment;
  readonly customElementDecorator: AppBuilderPartSourceFragment;
  readonly staticAuRequired: AppBuilderPartSourceFragment;
  readonly staticAuWithOptions: AppBuilderPartSourceFragment;
  readonly defineCallRequired: AppBuilderPartSourceFragment;
  readonly defineCallWithOptions: AppBuilderPartSourceFragment;
  readonly resourceApiMembers: string;
  readonly localDependenciesProperty: AppBuilderPartSourceFragment;
  readonly routeParamsExpression: AppBuilderPartSourceFragment;
  readonly routeParamsWithOptionsExpression: AppBuilderPartSourceFragment;
}

function galleryAppSourceFrame(
  appPath: string,
  templatePath: string,
  statePath: string,
): GalleryAppSourceFrame {
  const fragments: AppBuilderPartSourceFragment[] = [];
  const imports: readonly TypeScriptImportRequirement[] = [
    {
      moduleSpecifier: 'aurelia',
      namedImports: ['resolve'],
    },
    {
      moduleSpecifier: '@aurelia/router',
      namedTypeImports: ['IRouteContext'],
    },
    {
      moduleSpecifier: '@aurelia/validation-html',
      namedImports: ['IValidationController'],
      namedTypeImports: ['ValidationResultTarget'],
    },
    {
      moduleSpecifier: moduleSpecifier(appPath, statePath, false),
      namedTypeImports: ['GalleryState'],
    },
    {
      moduleSpecifier: moduleSpecifier(appPath, templatePath, true),
      defaultImport: 'template',
    },
  ];
  const routeDecorator = appBuilderRouteDecoratorFragment({
    title: 'Gallery',
    routes: [
      { path: '', redirectTo: 'home' },
      {
        id: 'home',
        path: 'home',
        componentIdentifier: 'GalleryHomeRoute',
        title: 'Home',
      },
      {
        id: 'items',
        path: 'items',
        componentIdentifier: 'GalleryItemsRoute',
        title: 'Items',
        routes: [{
          id: 'item-detail',
          path: ':id',
          componentIdentifier: 'GalleryDetailRoute',
          title: 'Detail',
        }],
      },
    ],
  });
  const sampleCardDecorator = appBuilderCustomElementDecoratorFragment('sample-card');
  const customElementDecorator = appBuilderCustomElementDecoratorFragment('my-app', 'template', ['SampleCard']);
  const staticAuRequired = appBuilderCustomElementStaticAuFragment('static-card');
  const staticAuWithOptions = appBuilderCustomElementStaticAuFragment('static-template-card', 'template', ['SampleCard']);
  const defineCallRequired = appBuilderCustomElementDefineCallExpressionFragment('defined-card', 'DefinedCard');
  const defineCallWithOptions = appBuilderCustomElementDefineCallExpressionFragment('defined-template-card', 'DefinedTemplateCard', 'template', ['SampleCard']);
  const resourceApiMembers = resourceApiGalleryMembers(fragments);
  const localDependenciesProperty = appBuilderResourceDependenciesPropertyFragment(['SampleCard']);
  const routeParamsExpression = appBuilderRouteContextParameterReadExpressionFragmentForMembers([
    { name: 'id', typeSource: 'string' },
  ]);
  const routeParamsWithOptionsExpression = appBuilderRouteContextParameterReadExpressionFragmentForMembers([
    { name: 'id', typeSource: 'string' },
    { name: 'filter', typeSource: 'string', optional: true },
  ], {
    receiverExpression: 'this.requiredRouteContext',
    mergeStrategy: 'child-first',
    includeQueryParams: true,
  });
  fragments.push(
    sampleCardDecorator,
    routeDecorator,
    customElementDecorator,
    staticAuRequired,
    staticAuWithOptions,
    defineCallRequired,
    defineCallWithOptions,
    localDependenciesProperty,
    routeParamsExpression,
    routeParamsWithOptionsExpression,
  );
  return {
    fragments,
    imports,
    routeDecorator,
    sampleCardDecorator,
    customElementDecorator,
    staticAuRequired,
    staticAuWithOptions,
    defineCallRequired,
    defineCallWithOptions,
    resourceApiMembers,
    localDependenciesProperty,
    routeParamsExpression,
    routeParamsWithOptionsExpression,
  };
}

function galleryResourceDeclarationsSource(
  frame: GalleryAppSourceFrame,
): string {
  return `${frame.sampleCardDecorator.text}
export class SampleCard {}

export class StaticCard {
${indentLines(frame.staticAuRequired.text, '  ')}
}

export class StaticTemplateCard {
${indentLines(frame.staticAuWithOptions.text, '  ')}
}

export class DefinedCard {}
${frame.defineCallRequired.text};

export class DefinedTemplateCard {}
${frame.defineCallWithOptions.text};

${frame.resourceApiMembers}`;
}

function galleryRouteAndServiceSource(
  frame: GalleryAppSourceFrame,
): string {
  return `export class GalleryHomeRoute {}

export class GalleryItemsRoute {}

export class GalleryDetailRoute {}

export class GallerySanitizer {
  sanitize(input: string): string {
    return input;
  }
}

const galleryDependencies = {
  ${frame.localDependenciesProperty.text}
};

${frame.routeDecorator.text}`;
}

function galleryRootAppClassSource(
  frame: GalleryAppSourceFrame,
): string {
  return `${frame.customElementDecorator.text}
export class MyApp {
${indentLines(galleryRootDependencyAndRouteMembers(frame), '  ')}

${indentLines(galleryRootStateProjectionMembers(frame.fragments), '  ')}

${indentLines(galleryRootScalarMembers(), '  ')}

${indentLines(galleryRootSelectionMembers(), '  ')}

${indentLines(galleryRootCollectionMembers(), '  ')}

${indentLines(galleryRootBehaviorMembers(frame.fragments), '  ')}
}`;
}

function galleryRootDependencyAndRouteMembers(
  frame: GalleryAppSourceFrame,
): string {
  return `static readonly dependencies = galleryDependencies.dependencies;
readonly routeParams = ${frame.routeParamsExpression.text};
readonly requiredRouteContext = resolve(IRouteContext);
readonly routeParamsWithOptions = ${frame.routeParamsWithOptionsExpression.text};`;
}

function galleryRootStateProjectionMembers(
  fragments: AppBuilderPartSourceFragment[],
): string {
  return `${fromStateDecorator(fragments)}
readonly storeItems: readonly GalleryItem[] = [];

${fromStateDecorator(fragments, 'users')}
readonly userStoreItems: readonly GalleryItem[] = [];`;
}

function galleryRootScalarMembers(): string {
  return `firstName = 'Ada';
lastName = 'Lovelace';
title = 'Gallery';
titleKey = 'app.title';
itemCount = 2;
price = 42;
createdAt = new Date('2026-01-01T00:00:00.000Z');
value = 'value';
descriptionHtml = '<strong>Safe sample</strong>';
classes = 'ready highlighted';
styleRules = { color: 'currentColor' };
isActive = true;
isVisible = true;
isDisabled = false;
isReady = true;
isFocused = false;
isOpen = true;
isItemsActive = false;
selectedId = '1';
status = 'ready';
errors: ValidationResultTarget[] = [];
readonly validationController = resolve(IValidationController);
routeContext: { parent: IRouteContext | undefined } = { parent: undefined };
element: HTMLDivElement | null = null;
currentComponent = SampleCard;
currentTemplate = '<template><span>Composed</span></template>';`;
}

function galleryRootSelectionMembers(): string {
  return `selectedItem: GalleryItem = { id: 1, label: 'Alpha' };
selectedOption: GalleryOption | null = null;
selectedOptionId: string | null = null;
selectedOptions: GalleryOption[] = [];
selectedOptionIds: string[] = [];
options: GalleryOption[] = [
  { id: 'alpha', label: 'Alpha' },
  { id: 'beta', label: 'Beta' },
];`;
}

function galleryRootCollectionMembers(): string {
  return `items: GalleryItem[] = [
  { id: 1, label: 'Alpha' },
  { id: 2, label: 'Beta' },
];
draft = {
  title: 'Draft',
  quantity: 1,
  dueDate: new Date('2026-06-01T00:00:00.000Z') as Date | null,
  enabled: true,
};
matcher = (left: GalleryOption, right: GalleryOption) => left.id === right.id;`;
}

function galleryRootBehaviorMembers(
  fragments: AppBuilderPartSourceFragment[],
): string {
  return `${computedDecorator(fragments)}
get fullName(): string {
  return \`\${this.firstName} \${this.lastName}\`;
}

loadItems(): Promise<GalleryItem> {
  return Promise.resolve(this.selectedItem);
}

handle(event: Event): void {
  this.value = event.type;
}

refresh(): void {
  this.value = this.fullName;
}

${componentLifecycleMembers(fragments)}`;
}

function gallerySharedTypesSource(
  frame: GalleryAppSourceFrame,
): string {
  return `export interface GalleryOption {
  readonly id: string;
  readonly label: string;
}

export interface GalleryItem {
  readonly id: number;
  readonly label: string;
}

export class RequiredLifecycleGallery {
${componentLifecycleMembers(frame.fragments, AppBuilderPartSourceLoweringSampleKind.RequiredOnly)}
}`;
}

function galleryStateSource(): TypeScriptSourceText {
  return typeScriptSourceText(`export interface GalleryState {
  readonly items: readonly { readonly id: number; readonly label: string }[];
  readonly title: string;
}

export const initialGalleryState: GalleryState = {
  items: [
    { id: 1, label: 'Alpha' },
    { id: 2, label: 'Beta' },
  ],
  title: 'Gallery',
};

export const usersGalleryState: GalleryState = {
  items: [
    { id: 3, label: 'Gamma' },
  ],
  title: 'Users',
};

export const galleryStateHandler: IActionHandler<GalleryState> = (state, action) => {
  const typedAction = readGalleryAction(action);
  switch (typedAction?.type) {
    case 'activate':
      return state;
    default:
      return state;
  }
};

function readGalleryAction(action: unknown): { readonly type: 'activate' } | null {
  return action != null && typeof action === 'object' && (action as { readonly type?: unknown }).type === 'activate'
    ? { type: 'activate' }
    : null;
}
`, [{
    moduleSpecifier: '@aurelia/state',
    namedTypeImports: ['IActionHandler'],
  }]);
}

function galleryI18nInitOptionsExpression(): string {
  return `{
    resources: {
      en: {
        translation: {
          app: {
            title: 'Gallery',
          },
          itemWithCount: '{{count}} item',
        },
      },
    },
  }`;
}

function appTaskRegistrationExpressions(): readonly AureliaEntrypointRegistrationExpression[] {
  return [
    appTaskRegistrationExpression(AppBuilderPartSourceLoweringSampleKind.RequiredOnly),
    appTaskRegistrationExpression(AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots),
  ];
}

function appTaskRegistrationExpression(
  sampleKind: AppBuilderPartSourceLoweringSampleKind,
): AureliaEntrypointRegistrationExpression {
  const fragment = sourceFragment(
    AppBuilderPartKind.FrameworkApi,
    AppBuilderFrameworkApiId.AppTaskRegistration,
    AppBuilderPartSourceFragmentKind.TypeScriptExpression,
    sampleKind,
  );
  return aureliaEntrypointRegistrationExpressionSource(
    fragment.text,
    appBuilderPartSourceFragmentContributions(fragment, SourcePlanLanguage.TypeScript),
  );
}

function resourceApiGalleryMembers(
  fragments: AppBuilderPartSourceFragment[],
): string {
  const members = [
    namedResourceGalleryMembers(fragments, ResourceDefinitionKind.CustomAttribute, 'gallery-attribute', 'GalleryAttribute', true),
    namedResourceGalleryMembers(fragments, ResourceDefinitionKind.TemplateController, 'gallery-template-controller', 'GalleryTemplateController', true),
    namedResourceGalleryMembers(fragments, ResourceDefinitionKind.ValueConverter, 'gallery-value', 'GalleryValueConverter', false),
    namedResourceGalleryMembers(fragments, ResourceDefinitionKind.BindingBehavior, 'gallery-behavior', 'GalleryBindingBehavior', false),
    namedResourceGalleryMembers(fragments, ResourceDefinitionKind.BindingCommand, 'gallery-command', 'GalleryBindingCommand', false),
    attributePatternGalleryMembers(fragments),
  ];
  return members.join('\n\n');
}

function namedResourceGalleryMembers(
  fragments: AppBuilderPartSourceFragment[],
  resourceKind: Exclude<ResourceDefinitionKind, ResourceDefinitionKind.CustomElement | ResourceDefinitionKind.AttributePattern>,
  resourceName: string,
  classPrefix: string,
  includeOptionalDependencySamples: boolean,
): string {
  const required = namedResourceCarrierGalleryMembers(fragments, resourceKind, resourceName, classPrefix);
  if (!includeOptionalDependencySamples) {
    return required;
  }
  return [
    required,
    namedResourceCarrierGalleryMembers(
      fragments,
      resourceKind,
      `${resourceName}-with-dependency`,
      `${classPrefix}WithDependency`,
      ['SampleCard'],
    ),
  ].join('\n\n');
}

function namedResourceCarrierGalleryMembers(
  fragments: AppBuilderPartSourceFragment[],
  resourceKind: Exclude<ResourceDefinitionKind, ResourceDefinitionKind.CustomElement | ResourceDefinitionKind.AttributePattern>,
  resourceName: string,
  classPrefix: string,
  dependencyExpressions: readonly string[] = [],
): string {
  const decorator = appBuilderNamedResourceDecoratorFragment(resourceKind, resourceName, dependencyExpressions);
  const staticAu = appBuilderNamedResourceStaticAuFragment(resourceKind, `${resourceName}-static`, dependencyExpressions);
  const defineCall = appBuilderNamedResourceDefineCallExpressionFragment(resourceKind, `${resourceName}-defined`, `${classPrefix}Defined`, dependencyExpressions);
  fragments.push(decorator, staticAu, defineCall);
  return `${decorator.text}
export class ${classPrefix}Decorated {}

export class ${classPrefix}Static {
${indentLines(staticAu.text, '  ')}
}

export class ${classPrefix}Defined {}
${defineCall.text};`;
}

function attributePatternGalleryMembers(
  fragments: AppBuilderPartSourceFragment[],
): string {
  const createCall = appBuilderAttributePatternCreateExpressionFragment(
    "{ pattern: 'PART.example', symbols: '.' }",
    'GalleryAttributePattern',
  );
  fragments.push(createCall);
  return `export class GalleryAttributePattern {
  'PART.example'(rawName: string, rawValue: string, parts: readonly string[]) {
    return { rawName, rawValue, target: parts[0] ?? rawName, command: 'example', parts };
  }
}
${createCall.text};`;
}

function componentLifecycleMembers(
  fragments: AppBuilderPartSourceFragment[],
  sampleKind: AppBuilderPartSourceLoweringSampleKind = AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots,
): string {
  return [
    AppBuilderComponentLifecycleId.DefineHook,
    AppBuilderComponentLifecycleId.HydratingHook,
    AppBuilderComponentLifecycleId.HydratedHook,
    AppBuilderComponentLifecycleId.CreatedHook,
    AppBuilderComponentLifecycleId.BindingHook,
    AppBuilderComponentLifecycleId.BoundHook,
    AppBuilderComponentLifecycleId.AttachingHook,
    AppBuilderComponentLifecycleId.AttachedHook,
    AppBuilderComponentLifecycleId.DetachingHook,
    AppBuilderComponentLifecycleId.UnbindingHook,
    AppBuilderComponentLifecycleId.DisposeHook,
    AppBuilderComponentLifecycleId.AcceptHook,
  ]
    .map((id) => indentLines(componentLifecycleHookMethod(fragments, id, sampleKind), '  '))
    .join('\n\n');
}

function templateElement(
  fragments: AppBuilderPartSourceFragment[],
  partKind: AppBuilderPartKind,
  partId: AppBuilderPartId,
  sampleKind: AppBuilderPartSourceLoweringSampleKind = AppBuilderPartSourceLoweringSampleKind.RequiredOnly,
): AuthoredTemplateChildSource {
  return sourceFragment(partKind, partId, AppBuilderPartSourceFragmentKind.TemplateElement, sampleKind, fragments).templateElement;
}

function optionalChoiceTemplateElement(
  fragments: AppBuilderPartSourceFragment[],
  partId: AppBuilderControlId,
  selectedExpression: string,
): AuthoredTemplateChildSource {
  const part = appBuilderPartDescriptor(AppBuilderPartKind.Control, partId);
  const sample = sampleForPart(part, AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots);
  return sourceFragmentForSlotAssignments(
    AppBuilderPartKind.Control,
    partId,
    AppBuilderPartSourceFragmentKind.TemplateElement,
    sample.slotAssignments.map((assignment) =>
      assignment.slotKind === AppBuilderPartSlotKind.BindingExpression
        ? { ...assignment, value: selectedExpression }
        : assignment
    ),
    fragments,
  ).templateElement;
}

function repeatTemplateAttribute(
  fragments: AppBuilderPartSourceFragment[],
  localName: string,
  iterableExpression: string,
): AuthoredTemplateAttributeSource {
  return sourceFragmentForSlotAssignments(
    AppBuilderPartKind.StructuralPart,
    AppBuilderStructuralPartId.Repeat,
    AppBuilderPartSourceFragmentKind.TemplateAttribute,
    [
      {
        slotKind: AppBuilderPartSlotKind.LocalName,
        value: localName,
      },
      {
        slotKind: AppBuilderPartSlotKind.IterableExpression,
        value: iterableExpression,
      },
    ],
    fragments,
  ).templateAttribute;
}

function bindingBehaviorHostElement(
  fragments: AppBuilderPartSourceFragment[],
  id: AppBuilderBindingBehaviorId,
  sampleKind: AppBuilderPartSourceLoweringSampleKind,
): AuthoredTemplateChildSource {
  const expression = bindingExpression(fragments, AppBuilderPartKind.BindingBehavior, id, sampleKind);
  switch (id) {
    case AppBuilderBindingBehaviorId.Self:
      return bindingBehaviorSampleHostElement('button', BuiltInBindingCommandName.Trigger, 'click', expression, 'Self');
    case AppBuilderBindingBehaviorId.Signal:
    case AppBuilderBindingBehaviorId.Translate:
    case AppBuilderBindingBehaviorId.NumberFormat:
    case AppBuilderBindingBehaviorId.DateFormat:
    case AppBuilderBindingBehaviorId.RelativeTime:
    case AppBuilderBindingBehaviorId.State:
      return bindingBehaviorSampleHostElement('span', BuiltInBindingCommandName.Bind, 'textcontent', expression, '');
    case AppBuilderBindingBehaviorId.Attr:
      return bindingBehaviorSampleHostElement('button', BuiltInBindingCommandName.Bind, 'aria-label', expression, 'Attr');
    case AppBuilderBindingBehaviorId.OneTime:
    case AppBuilderBindingBehaviorId.ToView:
    case AppBuilderBindingBehaviorId.FromView:
    case AppBuilderBindingBehaviorId.TwoWay:
    case AppBuilderBindingBehaviorId.Debounce:
    case AppBuilderBindingBehaviorId.Throttle:
    case AppBuilderBindingBehaviorId.UpdateTrigger:
    case AppBuilderBindingBehaviorId.Validate:
      return bindingBehaviorSampleHostElement('input', BuiltInBindingCommandName.Bind, BuiltInBindingCommandTargetName.Value, expression, null);
  }
}

function bindingBehaviorSampleHostElement(
  tagName: string,
  commandName: BuiltInBindingCommandName,
  targetName: string,
  expression: string,
  childText: string | null,
): AuthoredTemplateChildSource {
  return authoredTemplateElementSource(tagName, [builtInBindingCommandAttributeSource({
    commandName,
    targetName,
    rawValue: expression,
  })], childText);
}

function templateAttribute(
  fragments: AppBuilderPartSourceFragment[],
  partKind: AppBuilderPartKind,
  partId: AppBuilderPartId,
  sampleKind: AppBuilderPartSourceLoweringSampleKind = AppBuilderPartSourceLoweringSampleKind.RequiredOnly,
): AuthoredTemplateAttributeSource {
  return sourceFragment(partKind, partId, AppBuilderPartSourceFragmentKind.TemplateAttribute, sampleKind, fragments).templateAttribute;
}

function textInterpolation(
  fragments: AppBuilderPartSourceFragment[],
  partId: AppBuilderPartId,
  sampleKind: AppBuilderPartSourceLoweringSampleKind = AppBuilderPartSourceLoweringSampleKind.RequiredOnly,
): string {
  return sourceFragment(AppBuilderPartKind.BindingPart, partId, AppBuilderPartSourceFragmentKind.TextInterpolation, sampleKind, fragments).text;
}

function bindingExpression(
  fragments: AppBuilderPartSourceFragment[],
  partKind: AppBuilderPartKind,
  partId: AppBuilderPartId,
  sampleKind: AppBuilderPartSourceLoweringSampleKind = AppBuilderPartSourceLoweringSampleKind.RequiredOnly,
): string {
  return sourceFragment(partKind, partId, AppBuilderPartSourceFragmentKind.BindingExpression, sampleKind, fragments).text;
}

function fromStateDecorator(
  fragments: AppBuilderPartSourceFragment[],
  storeName?: string,
): string {
  const fragment = appBuilderFromStateDecoratorFragment('(state: GalleryState) => state.items', storeName);
  fragments.push(fragment);
  return fragment.text;
}

function computedDecorator(
  fragments: AppBuilderPartSourceFragment[],
): string {
  const fragment = appBuilderComputedDecoratorFragment("{ deps: ['firstName', 'lastName'] }");
  fragments.push(fragment);
  return fragment.text;
}

function componentLifecycleHookMethod(
  fragments: AppBuilderPartSourceFragment[],
  lifecycleId: AppBuilderComponentLifecycleId,
  sampleKind: AppBuilderPartSourceLoweringSampleKind,
): string {
  const fragment = appBuilderComponentLifecycleHookMethodFragment(
    lifecycleId,
    sampleKind === AppBuilderPartSourceLoweringSampleKind.WithOptionalSlots
      ? 'this.refresh();'
      : undefined,
  );
  fragments.push(fragment);
  return fragment.text;
}

function sourceFragment<TKind extends AppBuilderPartSourceFragmentKind>(
  partKind: AppBuilderPartKind,
  partId: AppBuilderPartId,
  expectedKind: TKind,
  sampleKind: AppBuilderPartSourceLoweringSampleKind,
  fragments?: AppBuilderPartSourceFragment[],
): AppBuilderPartSourceFragmentForKind<TKind> {
  const part = appBuilderPartDescriptor(partKind, partId);
  const sample = sampleForPart(part, sampleKind);
  return sourceFragmentForSlotAssignments(partKind, partId, expectedKind, sample.slotAssignments, fragments);
}

function sourceFragmentForSlotAssignments<TKind extends AppBuilderPartSourceFragmentKind>(
  partKind: AppBuilderPartKind,
  partId: AppBuilderPartId,
  expectedKind: TKind,
  slotAssignments: readonly AppBuilderPartSlotAssignment[],
  fragments?: AppBuilderPartSourceFragment[],
): AppBuilderPartSourceFragmentForKind<TKind> {
  const part = appBuilderPartDescriptor(partKind, partId);
  const lowering = lowerAppBuilderPartSourceInvocation({
    partKind,
    partId,
    applicationSite: part.applicationSites[0],
    slotAssignments,
  });
  if (lowering.state !== AppBuilderPartSourceLoweringState.Complete) {
    throw new Error(`App-builder part gallery failed to lower '${partKind}:${partId}': ${lowering.displayText}`);
  }
  const matches = lowering.fragments.filter((fragment): fragment is AppBuilderPartSourceFragmentForKind<TKind> =>
    fragment.kind === expectedKind
  );
  if (matches.length !== 1) {
    throw new Error(`App-builder part gallery expected '${partKind}:${partId}' to produce one '${expectedKind}' fragment, got ${matches.length}.`);
  }
  const fragment = matches[0]!;
  fragments?.push(fragment);
  return fragment;
}

function sampleForPart(
  part: AppBuilderPartDescriptor,
  sampleKind: AppBuilderPartSourceLoweringSampleKind,
) {
  const sample = sampleSlotAssignmentSamplesForPart(part).find((candidate) => candidate.sampleKind === sampleKind);
  if (sample == null) {
    throw new Error(`App-builder part '${part.kind}:${part.id}' has no '${sampleKind}' source-lowering sample.`);
  }
  return sample;
}

interface AppBuilderPartSourceGalleryExpectedOriginShape {
  readonly partKind: AppBuilderPartKind;
  readonly partId: AppBuilderPartId;
  readonly slotKinds: readonly string[];
}

interface AppBuilderPartSourceGalleryObservedOriginShape {
  readonly partKind: string;
  readonly partId: string;
  readonly slotKinds: readonly string[];
}

interface AppBuilderPartSourceGalleryOriginShapeKeyInput {
  readonly partKind: string;
  readonly partId: string;
  readonly slotKinds: readonly string[];
}

function appBuilderPartSourceGalleryExpectedOriginShapes(): ReadonlyMap<string, AppBuilderPartSourceGalleryExpectedOriginShape> {
  const shapes = new Map<string, AppBuilderPartSourceGalleryExpectedOriginShape>();
  for (const part of APP_BUILDER_PARTS) {
    for (const sample of sampleSlotAssignmentSamplesForPart(part)) {
      const shape: AppBuilderPartSourceGalleryExpectedOriginShape = {
        partKind: part.kind,
        partId: part.id,
        slotKinds: sortedStrings(sample.slotAssignments.map((assignment) => assignment.slotKind)),
      };
      shapes.set(appBuilderPartSourceGalleryOriginShapeKey(shape), shape);
    }
  }
  return shapes;
}

function appBuilderPartSourceGallerySeenOriginShapes(
  sourcePlan: SourcePlan,
): ReadonlyMap<string, AppBuilderPartSourceGalleryObservedOriginShape> {
  const shapes = new Map<string, AppBuilderPartSourceGalleryObservedOriginShape>();
  for (const file of sourcePlan.files) {
    for (const contribution of file.contributions) {
      const origin = contribution.origin;
      if (origin?.kind !== SourcePlanContributionOriginKind.AppBuilderPartSourceInvocation) {
        continue;
      }
      const shape: AppBuilderPartSourceGalleryObservedOriginShape = {
        partKind: origin.partKind,
        partId: origin.partId,
        slotKinds: sortedStrings(origin.slotKinds),
      };
      shapes.set(appBuilderPartSourceGalleryOriginShapeKey(shape), shape);
    }
  }
  return shapes;
}

function appBuilderPartSourceGalleryOriginShapeKey(
  shape: AppBuilderPartSourceGalleryOriginShapeKeyInput,
): string {
  return `${shape.partKind}\0${shape.partId}\0${shape.slotKinds.join('\0')}`;
}

function sortedStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function textInterpolationSource(
  expression: string,
): string {
  return `\${${expression}}`;
}

function indentLines(
  text: string,
  indent: string,
): string {
  return text
    .split('\n')
    .map((line) => line.length === 0 ? '' : `${indent}${line}`)
    .join('\n');
}
