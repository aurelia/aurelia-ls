export interface PatternAdmissionRecord {
  readonly patternId: string;
  readonly title: string;
  readonly sourceDocumentPaths: readonly string[];
  readonly supportRefPaths: readonly string[];
  readonly expectedSignals: readonly string[];
  readonly deferredSignals: readonly string[];
  readonly admissionSummary: string;
}

export const componentLocalCollectionAdmission: PatternAdmissionRecord = {
  patternId: 'component.local-collection',
  title: 'Searchable local collection component',
  sourceDocumentPaths: [
    'templates/repeats-and-list-rendering.md',
    'templates/recipes/product-catalog.md',
    'templates/recipes/data-table.md',
    'templates/recipes/search-autocomplete.md',
    'essentials/reactivity.md',
    'essentials/components.md',
    'essentials/templates.md',
    'templates/conditional-rendering.md'
  ],
  supportRefPaths: [
    'templates/repeats-and-list-rendering.md',
    'essentials/reactivity.md',
    'essentials/templates.md',
    'essentials/components.md'
  ],
  expectedSignals: [
    'computed-getter',
    'event-binding',
    'exported-view-model-class',
    'filter-or-sort',
    'if.bind',
    'interpolation',
    'keyed-repeat',
    'local-array',
    'repeat.for',
    'value.bind'
  ],
  deferredSignals: [
    'async-fetch',
    'batch-selection',
    'bindable-component',
    'debounce',
    'global-listener',
    'innerhtml',
    'lifecycle-cleanup',
    'pagination',
    'router',
    'state-plugin',
    'validation-plugin',
    'value-converter',
    'virtual-repeat'
  ],
  admissionSummary:
    'Admit a curated smaller component-pair pattern grounded by list rendering and recipe evidence; do not copy recipe examples wholesale.'
};

export const collectionServerQueryAdmission: PatternAdmissionRecord = {
  patternId: 'collection.server-query',
  title: 'Server-backed query collection',
  sourceDocumentPaths: [
    'templates/recipes/data-table.md',
    'router/route-parameters.md',
    'aurelia-packages/fetch-client/setting-up.md',
    'aurelia-packages/fetch-client/abort-controller.md',
    'templates/forms/README.md'
  ],
  supportRefPaths: [
    'templates/recipes/data-table.md',
    'router/route-parameters.md',
    'aurelia-packages/fetch-client/setting-up.md'
  ],
  expectedSignals: [
    'abort-controller',
    'async-operation',
    'binding-behavior',
    'debounce-behavior',
    'dependency-injection',
    'di-interface-token',
    'disabled.bind',
    'error-feedback',
    'form-element',
    'http-client',
    'http-request',
    'http-response-check',
    'json-response',
    'keyed-repeat',
    'loading-state',
    'pagination',
    'repeat.for',
    'resolve-service',
    'route-lifecycle',
    'router',
    'select-element',
    'service-class',
    'singleton-service',
    'submit.trigger',
    'value.bind'
  ],
  deferredSignals: [
    'batch-selection',
    'callback-bindable',
    'event-aggregator',
    'router-direct',
    'state-plugin',
    'store-plugin',
    'validation-plugin',
    'virtual-repeat'
  ],
  admissionSummary:
    'Admit a server-owned filter/sort/page query pattern grounded by data-table, route-query, and fetch-client evidence; defer cross-page selection, validation, state plugins, and virtualization.'
};

export const formNativeSubmitAdmission: PatternAdmissionRecord = {
  patternId: 'form.native-submit',
  title: 'Native form submission state',
  sourceDocumentPaths: [
    'templates/forms/README.md',
    'templates/forms/submission.md',
    'templates/forms.md',
    'templates/forms/collections.md',
    'templates/forms/advanced-patterns.md'
  ],
  supportRefPaths: [
    'templates/forms/README.md',
    'templates/forms/submission.md'
  ],
  expectedSignals: [
    'async-operation',
    'disabled.bind',
    'exported-view-model-class',
    'form-element',
    'form-object-state',
    'form-reset',
    'label-for',
    'native-input-constraint',
    'submission-state',
    'submit-button',
    'submit.trigger',
    'success-error-feedback',
    'textarea',
    'value.bind'
  ],
  deferredSignals: [
    'autosave',
    'batch-selection',
    'bindable-component',
    'dependency-injection',
    'dynamic-form',
    'fetch-call',
    'file-upload',
    'multi-step-form',
    'rate-limit',
    'router',
    'state-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit a native form submission pattern grounded by form basics and submission docs; defer validation-plugin, router, autosave, file upload, dynamic form, and direct API-boundary concerns.'
};

export const formValidationSubmitAdmission: PatternAdmissionRecord = {
  patternId: 'form.validation-submit',
  title: 'Validated form submission',
  sourceDocumentPaths: [
    'aurelia-packages/validation/outcome-recipes.md',
    'aurelia-packages/validation/validation-controller.md',
    'aurelia-packages/validation/validate-binding-behavior.md',
    'aurelia-packages/validation/displaying-errors.md',
    'aurelia-packages/validation/configuration-and-customization.md'
  ],
  supportRefPaths: [
    'aurelia-packages/validation/outcome-recipes.md',
    'aurelia-packages/validation/validation-controller.md',
    'aurelia-packages/validation/validate-binding-behavior.md'
  ],
  expectedSignals: [
    'async-operation',
    'binding-behavior',
    'dependency-injection',
    'disabled.bind',
    'error-feedback',
    'form-element',
    'from-view-bindable',
    'if.bind',
    'interpolation',
    'label-for',
    'repeat.for',
    'resolve-service',
    'submission-state',
    'submit-button',
    'submit.trigger',
    'success-error-feedback',
    'validation-plugin',
    'value.bind'
  ],
  deferredSignals: [
    'dynamic-form',
    'event-aggregator',
    'fetch-call',
    'file-upload',
    'http-client',
    'i18n-plugin',
    'router',
    'router-direct',
    'state-plugin',
    'store-plugin'
  ],
  admissionSummary:
    'Admit scoped validation-html form submission when native constraints are insufficient; keep server validation, i18n, schema generation, file upload, and router policy separate.'
};

export const formServerValidationErrorsAdmission: PatternAdmissionRecord = {
  patternId: 'form.server-validation-errors',
  title: 'Server validation error merge',
  sourceDocumentPaths: [
    'aurelia-packages/validation/outcome-recipes.md',
    'aurelia-packages/validation/validation-controller.md',
    'aurelia-packages/validation/displaying-errors.md',
    'aurelia-packages/fetch-client/forms.md',
    'aurelia-packages/fetch-client/response-types.md'
  ],
  supportRefPaths: [
    'aurelia-packages/validation/outcome-recipes.md',
    'aurelia-packages/validation/validation-controller.md',
    'aurelia-packages/fetch-client/forms.md'
  ],
  expectedSignals: [
    'async-operation',
    'binding-behavior',
    'dependency-injection',
    'di-interface-token',
    'disabled.bind',
    'error-feedback',
    'event-binding',
    'fetch-call',
    'form-element',
    'from-view-bindable',
    'http-client',
    'http-request',
    'http-response-check',
    'json-response',
    'repeat.for',
    'resolve-service',
    'service-class',
    'singleton-service',
    'submission-state',
    'submit.trigger',
    'success-error-feedback',
    'validation-plugin',
    'value.bind'
  ],
  deferredSignals: [
    'dynamic-form',
    'event-aggregator',
    'file-upload',
    'i18n-plugin',
    'router',
    'router-direct',
    'state-plugin',
    'store-plugin'
  ],
  admissionSummary:
    'Admit server field-error merging into a scoped validation controller; defer general failures, dynamic schema mapping, validation localization, file upload, and route workflow concerns.'
};

export const componentBindableBasicAdmission: PatternAdmissionRecord = {
  patternId: 'component.bindable-basic',
  title: 'Bindable presenter component',
  sourceDocumentPaths: [
    'components/bindable-properties.md',
    'components/components.md',
    'essentials/components.md',
    'components/component-lifecycles.md',
    'templates/recipes/search-autocomplete.md',
    'components/shadow-dom-and-slots.md'
  ],
  supportRefPaths: [
    'components/bindable-properties.md',
    'components/components.md',
    'essentials/components.md'
  ],
  expectedSignals: [
    'bindable-component',
    'bindable-property-binding',
    'computed-getter',
    'custom-element-import',
    'custom-element-usage',
    'exported-view-model-class',
    'interpolation'
  ],
  deferredSignals: [
    'async-fetch',
    'async-operation',
    'attribute-capture',
    'bindable-change-callback',
    'bindable-coercion',
    'custom-attribute',
    'dependency-injection',
    'event-aggregator',
    'lifecycle-cleanup',
    'router',
    'shadow-dom',
    'slot-content',
    'two-way-bindable',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit a plain parent-to-child bindable custom element pattern; keep shared behavior/state in DI services and defer two-way, callback, coercion, slot, attribute-capture, and event-aggregator variants.'
};

export const componentSlottedLayoutAdmission: PatternAdmissionRecord = {
  patternId: 'component.slotted-layout',
  title: 'Slotted layout component',
  sourceDocumentPaths: [
    'components/shadow-dom-and-slots.md',
    'components/shadow-dom.md',
    'components/bindable-properties.md',
    'components/components.md',
    'templates/conditional-rendering.md',
    'developer-guides/error-messages/runtime-html/aur9990.md'
  ],
  supportRefPaths: [
    'components/shadow-dom-and-slots.md',
    'components/bindable-properties.md'
  ],
  expectedSignals: [
    'bindable-component',
    'bindable-property-binding',
    'custom-element-import',
    'custom-element-usage',
    'event-binding',
    'exported-view-model-class',
    'interpolation',
    'slot-content'
  ],
  deferredSignals: [
    'attribute-capture',
    'bindable-change-callback',
    'callback-bindable',
    'custom-attribute',
    'dependency-injection',
    'event-aggregator',
    'lifecycle-cleanup',
    'router',
    'shadow-dom',
    'state-plugin',
    'two-way-bindable',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit a light-DOM au-slot layout composition pattern for application components; keep native Shadow DOM slots, slot observation, attribute capture, and component-library packaging as separate concerns.'
};

export const serviceInjectedStateAdmission: PatternAdmissionRecord = {
  patternId: 'service.injected-state',
  title: 'Injected shared state service',
  sourceDocumentPaths: [
    'essentials/dependency-injection.md',
    'getting-to-know-aurelia/dependency-injection.md',
    'getting-to-know-aurelia/dependency-injection-di/creating-services.md',
    'getting-started/intermediate-tutorial.md',
    'aurelia-packages/state.md',
    'aurelia-packages/store/configuration-and-setup.md'
  ],
  supportRefPaths: [
    'essentials/dependency-injection.md',
    'getting-to-know-aurelia/dependency-injection.md',
    'getting-to-know-aurelia/dependency-injection-di/creating-services.md'
  ],
  expectedSignals: [
    'custom-element-import',
    'custom-element-usage',
    'dependency-injection',
    'di-interface-token',
    'event-binding',
    'exported-view-model-class',
    'interpolation',
    'keyed-repeat',
    'local-array',
    'repeat.for',
    'resolve-service',
    'service-class',
    'shared-state-service',
    'singleton-service'
  ],
  deferredSignals: [
    'async-fetch',
    'async-operation',
    'bindable-component',
    'browser-storage',
    'constructor-injection',
    'event-aggregator',
    'fetch-call',
    'http-client',
    'manual-registration',
    'router',
    'service-locator',
    'state-plugin',
    'store-plugin',
    'transient-service',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit a plain Aurelia DI singleton service for shared view state; defer persistence, fetch/http, router, validation, state/store plugins, scoped containers, transient lifetime, and advanced resolver choices.'
};

export const componentCustomEventAdmission: PatternAdmissionRecord = {
  patternId: 'component.custom-event',
  title: 'Custom event component output',
  sourceDocumentPaths: [
    'templates/template-syntax/event-binding.md',
    'components/bindable-properties.md',
    'components/components.md',
    'essentials/components.md',
    'getting-to-know-aurelia/event-aggregator.md',
    'aurelia-packages/event-aggregator.md'
  ],
  supportRefPaths: [
    'templates/template-syntax/event-binding.md',
    'components/bindable-properties.md',
    'components/components.md'
  ],
  expectedSignals: [
    'bindable-component',
    'bindable-property-binding',
    'bubbling-custom-event',
    'custom-element-import',
    'custom-element-usage',
    'custom-event-detail',
    'custom-event-dispatch',
    'custom-event-listener',
    'event-binding',
    'exported-view-model-class',
    'host-element',
    'interpolation',
    'local-array',
    'repeat.for'
  ],
  deferredSignals: [
    'async-fetch',
    'async-operation',
    'callback-bindable',
    'capture-event',
    'constructor-injection',
    'event-aggregator',
    'event-modifier',
    'from-view-bindable',
    'lifecycle-cleanup',
    'router',
    'shadow-dom',
    'slot-content',
    'state-plugin',
    'store-plugin',
    'two-way-bindable',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit a narrow visible parent-child output pattern based on a bubbling CustomEvent listened to with .trigger; keep shared behavior/state in DI services and treat callback bindables, two-way/from-view bindables, EventAggregator, shadow DOM composition, and advanced event modifiers as non-default variants.'
};

export const serviceFetchClientAdmission: PatternAdmissionRecord = {
  patternId: 'service.fetch-client',
  title: 'Fetch client data service',
  sourceDocumentPaths: [
    'aurelia-packages/fetch-client/overview.md',
    'aurelia-packages/fetch-client/setting-up.md',
    'aurelia-packages/fetch-client/response-types.md',
    'developer-guides/working-with-web-standards.md',
    'aurelia-packages/fetch-client/outcome-recipes.md',
    'aurelia-packages/fetch-client/caching.md'
  ],
  supportRefPaths: [
    'aurelia-packages/fetch-client/overview.md',
    'aurelia-packages/fetch-client/setting-up.md',
    'aurelia-packages/fetch-client/response-types.md'
  ],
  expectedSignals: [
    'async-operation',
    'component-load-lifecycle',
    'dependency-injection',
    'di-interface-token',
    'disabled.bind',
    'error-feedback',
    'exported-view-model-class',
    'http-client',
    'http-request',
    'http-response-check',
    'if.bind',
    'interpolation',
    'json-response',
    'keyed-repeat',
    'loading-state',
    'local-array',
    'repeat.for',
    'resolve-service',
    'service-class',
    'singleton-service'
  ],
  deferredSignals: [
    'abort-controller',
    'auth-interceptor',
    'browser-storage',
    'fetch-call',
    'file-upload',
    'form-element',
    'http-cache',
    'http-client-configuration',
    'http-interceptor',
    'http-retry',
    'request-tracking',
    'router',
    'service-locator',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit a narrow injected data service that wraps Aurelia fetch-client JSON loading; defer client configuration, auth, retries, caching, aborts, uploads, global request tracking, router loading, and state/store policy.'
};

export const formChoiceControlsAdmission: PatternAdmissionRecord = {
  patternId: 'form.choice-controls',
  title: 'Native choice controls',
  sourceDocumentPaths: [
    'templates/forms/collections.md',
    'templates/forms/README.md',
    'templates/forms.md',
    'templates/repeats-and-list-rendering.md',
    'templates/forms/advanced-patterns.md'
  ],
  supportRefPaths: [
    'templates/forms/collections.md',
    'templates/forms/README.md'
  ],
  expectedSignals: [
    'checked.bind',
    'checkbox-input',
    'computed-getter',
    'exported-view-model-class',
    'fieldset-legend',
    'form-element',
    'if.bind',
    'interpolation',
    'keyed-repeat',
    'local-array',
    'model.bind',
    'radio-input',
    'repeat.for',
    'select-element',
    'value.bind'
  ],
  deferredSignals: [
    'batch-selection',
    'dependency-injection',
    'dynamic-form',
    'fetch-call',
    'file-upload',
    'matcher.bind',
    'multiple-select',
    'router',
    'state-plugin',
    'store-plugin',
    'submit.trigger',
    'validation-plugin',
    'value-converter',
    'virtual-repeat'
  ],
  admissionSummary:
    'Admit a native select/radio/checkbox choice-control pattern with primitive values and local form state; defer object matchers, Sets/Maps, select-all, validation, submission, dynamic forms, and large-list performance patterns.'
};

export const templateClassStyleBindingAdmission: PatternAdmissionRecord = {
  patternId: 'template.class-style-binding',
  title: 'State-driven class and style binding',
  sourceDocumentPaths: [
    'templates/class-and-style-bindings.md',
    'components/class-and-style-binding.md',
    'getting-to-know-aurelia/introduction/class-and-style-binding.md',
    'templates/template-syntax/attribute-binding.md',
    'developer-guides/scenarios/tailwindcss-integration.md'
  ],
  supportRefPaths: [
    'templates/class-and-style-bindings.md',
    'components/class-and-style-binding.md'
  ],
  expectedSignals: [
    'class-style-binding',
    'class-toggle-binding',
    'computed-getter',
    'event-binding',
    'exported-view-model-class',
    'if.bind',
    'interpolation',
    'keyed-repeat',
    'local-array',
    'repeat.for',
    'style-property-binding',
    'style-source'
  ],
  deferredSignals: [
    'binding-behavior',
    'custom-attribute',
    'global-listener',
    'innerhtml',
    'router',
    'shadow-dom',
    'state-plugin',
    'store-plugin',
    'validation-plugin',
    'value-converter',
    'virtual-repeat'
  ],
  admissionSummary:
    'Admit a basic template class/style binding pattern for state-driven visual affordances; defer theming architecture, Shadow DOM/CSS modules, value converters, animation orchestration, router activity, and validation styling.'
};

export const templateValueConverterDisplayAdmission: PatternAdmissionRecord = {
  patternId: 'template.value-converter-display',
  title: 'Reusable display value converter',
  sourceDocumentPaths: [
    'templates/value-converters.md',
    'templates/template-syntax/attribute-binding.md',
    'developer-guides/error-messages/runtime-html/aur0103.md',
    'aurelia-packages/internationalization.md',
    'templates/binding-behaviors.md'
  ],
  supportRefPaths: [
    'templates/value-converters.md',
    'developer-guides/error-messages/runtime-html/aur0103.md'
  ],
  expectedSignals: [
    'converter-parameter',
    'custom-element-import',
    'event-binding',
    'exported-view-model-class',
    'interpolation',
    'keyed-repeat',
    'local-array',
    'repeat.for',
    'to-view-converter',
    'value-converter',
    'value-converter-class'
  ],
  deferredSignals: [
    'async-operation',
    'binding-behavior',
    'class-style-binding',
    'context-aware-converter',
    'converter-cache',
    'converter-chaining',
    'dependency-injection',
    'fetch-call',
    'from-view-converter',
    'i18n-plugin',
    'manual-registration',
    'router',
    'signalable-converter',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit a pure display-only toView value converter with parameters and local template import; defer getters-for-local-use, fromView/two-way parsing, caller context, signals, caching, i18n/plugin converters, binding behaviors, and manual/global registration policy.'
};

export const localizationI18nLocaleServiceAdmission: PatternAdmissionRecord = {
  patternId: 'localization.i18n-locale-service',
  title: 'I18n locale service',
  sourceDocumentPaths: [
    'aurelia-packages/internationalization.md',
    'aurelia-packages/internationalization-outcome-recipes.md',
    'getting-started/extended-tutorial/step-7-internationalization.md'
  ],
  supportRefPaths: [
    'aurelia-packages/internationalization.md',
    'aurelia-packages/internationalization-outcome-recipes.md',
    'getting-started/extended-tutorial/step-7-internationalization.md'
  ],
  expectedSignals: [
    'async-operation',
    'browser-storage',
    'computed-getter',
    'dependency-injection',
    'di-interface-token',
    'event-binding',
    'i18n-plugin',
    'interpolation',
    'local-array',
    'repeat.for',
    'resolve-service',
    'select-element',
    'service-class',
    'singleton-service'
  ],
  deferredSignals: [
    'event-aggregator',
    'router',
    'router-direct',
    'state-plugin',
    'store-plugin',
    'validation-plugin',
    'value-converter'
  ],
  admissionSummary:
    'Admit a bundled i18n locale-service pattern for stable UI keys and runtime locale changes; defer validation localization, lazy namespaces, router titles, and state-plugin coupling.'
};

export const templateFocusControlAdmission: PatternAdmissionRecord = {
  patternId: 'template.focus-control',
  title: 'Open panel focus control',
  sourceDocumentPaths: [
    'templates/focus.md',
    'templates/conditional-rendering.md',
    'templates/template-syntax/event-binding.md',
    'templates/forms/README.md',
    'templates/custom-attributes.md'
  ],
  supportRefPaths: [
    'templates/focus.md',
    'templates/conditional-rendering.md'
  ],
  expectedSignals: [
    'disabled.bind',
    'event-binding',
    'exported-view-model-class',
    'focus-binding',
    'focus-to-view',
    'form-element',
    'if.bind',
    'label-for',
    'submit-button',
    'submit.trigger',
    'value.bind'
  ],
  deferredSignals: [
    'custom-attribute',
    'event-modifier',
    'global-listener',
    'lifecycle-cleanup',
    'router',
    'state-plugin',
    'store-plugin',
    'template-ref',
    'two-way-focus',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit the built-in focus custom attribute as an open-and-focus UI pattern using focus.to-view; defer authoring custom attributes, two-way focus state, focus traps, roving tabindex, router/validation state, and advanced accessibility orchestration.'
};

export const templateDomRefAdmission: PatternAdmissionRecord = {
  patternId: 'template.dom-ref',
  title: 'Template DOM element reference',
  sourceDocumentPaths: [
    'templates/template-syntax/template-references.md',
    'templates/focus.md',
    'components/component-lifecycles.md',
    'developer-guides/working-with-web-standards.md'
  ],
  supportRefPaths: [
    'templates/template-syntax/template-references.md',
    'templates/focus.md'
  ],
  expectedSignals: [
    'computed-getter',
    'disabled.bind',
    'event-binding',
    'exported-view-model-class',
    'filter-or-sort',
    'if.bind',
    'interpolation',
    'keyed-repeat',
    'label-for',
    'local-array',
    'repeat.for',
    'template-ref',
    'value.bind'
  ],
  deferredSignals: [
    'component-ref',
    'controller-ref',
    'custom-attribute',
    'custom-attribute-ref',
    'event-aggregator',
    'focus-binding',
    'global-listener',
    'lifecycle-cleanup',
    'router',
    'state-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit plain DOM element refs for narrow browser APIs such as focus or selection; keep component/custom-attribute/controller refs and reusable DOM behavior as separate, more deliberate patterns.'
};

export const templateDebouncedInputAdmission: PatternAdmissionRecord = {
  patternId: 'template.debounced-input',
  title: 'Debounced local input binding',
  sourceDocumentPaths: [
    'templates/binding-behaviors.md',
    'templates/repeats-and-list-rendering.md',
    'templates/template-syntax/attribute-binding.md',
    'templates/forms/README.md',
    'aurelia-packages/fetch-client/overview.md'
  ],
  supportRefPaths: [
    'templates/binding-behaviors.md',
    'templates/repeats-and-list-rendering.md'
  ],
  expectedSignals: [
    'binding-behavior',
    'computed-getter',
    'debounce-behavior',
    'exported-view-model-class',
    'filter-or-sort',
    'if.bind',
    'interpolation',
    'keyed-repeat',
    'label-for',
    'local-array',
    'repeat.for',
    'value.bind'
  ],
  deferredSignals: [
    'async-operation',
    'custom-binding-behavior-class',
    'dependency-injection',
    'fetch-call',
    'http-client',
    'request-tracking',
    'router',
    'signal-behavior',
    'state-plugin',
    'store-plugin',
    'throttle-behavior',
    'update-trigger-behavior',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit a built-in debounce binding behavior pattern for local synchronous input state; defer throttle, updateTrigger, signal flushing, custom behavior authoring, remote search, request cancellation, validation timing, and router/state involvement.'
};

export const templateConditionalRenderingAdmission: PatternAdmissionRecord = {
  patternId: 'template.conditional-rendering',
  title: 'Conditional UI state rendering',
  sourceDocumentPaths: [
    'templates/conditional-rendering.md',
    'essentials/templates.md',
    'templates/repeats-and-list-rendering.md',
    'developer-guides/error-messages/runtime-html/aur0810.md',
    'developer-guides/error-messages/runtime-html/aur0815.md'
  ],
  supportRefPaths: [
    'templates/conditional-rendering.md',
    'templates/repeats-and-list-rendering.md'
  ],
  expectedSignals: [
    'computed-getter',
    'event-binding',
    'exported-view-model-class',
    'if.bind',
    'interpolation',
    'keyed-repeat',
    'local-array',
    'repeat.for',
    'show.bind',
    'switch-case',
    'switch.bind'
  ],
  deferredSignals: [
    'async-fetch',
    'async-operation',
    'dependency-injection',
    'fetch-call',
    'http-client',
    'promise.bind',
    'router',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit a local UI state rendering pattern that chooses if.bind, show.bind, and switch.bind deliberately; keep router-critical, validation, and application-state policy outside the template branch itself.'
};

export const componentLifecycleCleanupAdmission: PatternAdmissionRecord = {
  patternId: 'component.lifecycle-cleanup',
  title: 'Lifecycle setup and cleanup',
  sourceDocumentPaths: [
    'components/component-lifecycles.md',
    'components/lifecycle-diagrams.md',
    'developer-guides/working-with-web-standards.md',
    'getting-to-know-aurelia/watching-data.md',
    'router/routing-lifecycle.md'
  ],
  supportRefPaths: [
    'components/component-lifecycles.md',
    'components/lifecycle-diagrams.md'
  ],
  expectedSignals: [
    'exported-view-model-class',
    'global-listener',
    'if.bind',
    'interpolation',
    'lifecycle-cleanup'
  ],
  deferredSignals: [
    'async-fetch',
    'async-operation',
    'dependency-injection',
    'event-aggregator',
    'http-client',
    'observable-side-effect',
    'request-tracking',
    'route-lifecycle',
    'router',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit a component-owned setup/cleanup pattern for browser resources and manual listeners; keep shared subscriptions, observation side effects, route lifecycle, and app-wide services as separate ownership decisions.'
};

export const resourceCustomAttributeAdmission: PatternAdmissionRecord = {
  patternId: 'resource.custom-attribute',
  title: 'Host custom attribute behavior',
  sourceDocumentPaths: [
    'templates/custom-attributes.md',
    'templates/advanced-custom-attributes.md',
    'components/component-lifecycles.md',
    'developer-guides/working-with-web-standards.md',
    'reference/examples/custom-attributes/README.md'
  ],
  supportRefPaths: [
    'templates/custom-attributes.md',
    'components/component-lifecycles.md'
  ],
  expectedSignals: [
    'bindable-change-callback',
    'bindable-component',
    'custom-attribute',
    'custom-element-import',
    'dependency-injection',
    'exported-view-model-class',
    'host-element',
    'interpolation',
    'keyed-repeat',
    'local-array',
    'repeat.for',
    'resolve-service'
  ],
  deferredSignals: [
    'attribute-capture',
    'bindable-coercion',
    'controller-ref',
    'event-aggregator',
    'global-listener',
    'lifecycle-cleanup',
    'router',
    'shadow-dom',
    'state-plugin',
    'store-plugin',
    'two-way-bindable',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit a basic host-element custom attribute with one bindable value; defer template controllers, third-party lifecycle orchestration, global listeners, advanced binding/coercion policy, and component-style rendering.'
};

export const shellNavigationProgressAdmission: PatternAdmissionRecord = {
  patternId: 'shell.navigation-progress',
  title: 'Shell navigation progress state',
  sourceDocumentPaths: [
    'router/router-events.md',
    'router/viewports.md',
    'router/routing-lifecycle.md',
    'router/router-configuration.md',
    'getting-to-know-aurelia/event-aggregator.md'
  ],
  supportRefPaths: [
    'router/router-events.md',
    'router/viewports.md'
  ],
  expectedSignals: [
    'dependency-injection',
    'di-interface-token',
    'event-binding',
    'exported-view-model-class',
    'if.bind',
    'interpolation',
    'navigation-cancel-event',
    'navigation-end-event',
    'navigation-error-event',
    'navigation-start-event',
    'resolve-service',
    'route-link',
    'route-viewport',
    'router',
    'router-events',
    'service-class',
    'singleton-service'
  ],
  deferredSignals: [
    'auth-interceptor',
    'event-aggregator',
    'http-client',
    'request-tracking',
    'router-direct',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit a shell-owned router event progress pattern using typed IRouterEvents; keep route data in route hooks/services and keep EventAggregator as reference evidence only.'
};

export const routerCriticalLoadingAdmission: PatternAdmissionRecord = {
  patternId: 'router.critical-loading',
  title: 'Route critical data loading',
  sourceDocumentPaths: [
    'router/routing-lifecycle.md',
    'router/configuring-routes.md',
    'router/getting-started.md',
    'router/router-events.md',
    'components/component-lifecycles.md',
    'developer-guides/cheat-sheet.md',
    'aurelia-packages/fetch-client/overview.md'
  ],
  supportRefPaths: [
    'router/routing-lifecycle.md',
    'router/configuring-routes.md',
    'router/router-events.md'
  ],
  expectedSignals: [
    'async-operation',
    'can-load-hook',
    'dependency-injection',
    'di-interface-token',
    'exported-view-model-class',
    'interpolation',
    'keyed-repeat',
    'loading-hook',
    'local-array',
    'repeat.for',
    'resolve-service',
    'route-config',
    'route-lifecycle',
    'route-link',
    'route-parameter',
    'route-viewport',
    'router',
    'service-class',
    'singleton-service'
  ],
  deferredSignals: [
    'abort-controller',
    'auth-interceptor',
    'event-aggregator',
    'fetch-call',
    'http-cache',
    'http-client',
    'http-client-configuration',
    'http-interceptor',
    'http-retry',
    'promise.bind',
    'request-tracking',
    'router-direct',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit a small router lifecycle pattern where canLoad decides entry and loading prepares critical data before render; require shell progress or explicit handoff for visible navigation waiting.'
};

export const routerRouteParametersAdmission: PatternAdmissionRecord = {
  patternId: 'router.route-parameters',
  title: 'Route context parameter aggregation',
  sourceDocumentPaths: [
    'router/route-parameters.md',
    'router/routing-lifecycle.md',
    'router/api-reference.md',
    'router/child-routing.md',
    'router/README.md',
    'developer-guides/cheat-sheet.md',
    'developer-guides/testing/mocks-spies.md'
  ],
  supportRefPaths: [
    'router/route-parameters.md',
    'router/routing-lifecycle.md',
    'router/api-reference.md'
  ],
  expectedSignals: [
    'async-operation',
    'dependency-injection',
    'di-interface-token',
    'exported-view-model-class',
    'interpolation',
    'loading-hook',
    'resolve-service',
    'route-config',
    'route-context',
    'route-lifecycle',
    'route-parameter',
    'route-parameter-aggregation',
    'route-parameter-merge-strategy',
    'route-query-parameters',
    'route-viewport',
    'router',
    'service-class',
    'singleton-service'
  ],
  deferredSignals: [
    'abort-controller',
    'auth-interceptor',
    'can-load-hook',
    'event-aggregator',
    'fetch-call',
    'http-cache',
    'http-client',
    'http-client-configuration',
    'http-interceptor',
    'http-retry',
    'promise.bind',
    'request-tracking',
    'router-direct',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit route-context parameter aggregation for nested routed data loading; keep navigation, auth, cache, and async error policy as companion concerns.'
};

export const routerNavigationLinksAdmission: PatternAdmissionRecord = {
  patternId: 'router.navigation-links',
  title: 'Router navigation links',
  sourceDocumentPaths: [
    'router/navigating.md',
    'router/route-expression-syntax.md',
    'router/configuring-routes.md',
    'router/viewports.md',
    'router/router-events.md',
    'router/troubleshooting.md'
  ],
  supportRefPaths: [
    'router/navigating.md',
    'router/route-expression-syntax.md',
    'router/configuring-routes.md'
  ],
  expectedSignals: [
    'exported-view-model-class',
    'interpolation',
    'route-config',
    'route-link',
    'route-viewport',
    'router'
  ],
  deferredSignals: [
    'auth-interceptor',
    'can-load-hook',
    'event-aggregator',
    'loading-hook',
    'request-tracking',
    'route-context',
    'route-lifecycle',
    'route-parameter-aggregation',
    'router-direct',
    'router-events',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit declarative router-aware anchor links and route expressions for ordinary navigation; keep programmatic navigation, guards, progress, active-link policy, and route data loading in companion patterns.'
};

export const routerActiveNavigationAdmission: PatternAdmissionRecord = {
  patternId: 'router.active-navigation',
  title: 'Router active navigation state',
  sourceDocumentPaths: [
    'router/navigation-model.md',
    'router/router-configuration.md',
    'router/navigating.md',
    'router/configuring-routes.md',
    'router/viewports.md'
  ],
  supportRefPaths: [
    'router/navigation-model.md',
    'router/router-configuration.md',
    'router/navigating.md'
  ],
  expectedSignals: [
    'active-class-binding',
    'async-operation',
    'class-style-binding',
    'class-toggle-binding',
    'custom-element-import',
    'custom-element-usage',
    'dependency-injection',
    'exported-view-model-class',
    'interpolation',
    'keyed-repeat',
    'navigation-model',
    'repeat.for',
    'resolve-service',
    'route-config',
    'route-context',
    'route-link',
    'route-viewport',
    'router'
  ],
  deferredSignals: [
    'auth-interceptor',
    'can-load-hook',
    'event-aggregator',
    'loading-hook',
    'promise.bind',
    'request-tracking',
    'route-lifecycle',
    'route-parameter-aggregation',
    'router-active-class',
    'router-direct',
    'router-events',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit navigation-model-backed active menu rendering for shells; keep activeClass-only static links, guards, critical loading, auth redirects, router events, and error recovery in companion patterns.'
};

export const templatePromiseSecondaryAdmission: PatternAdmissionRecord = {
  patternId: 'template.promise-secondary',
  title: 'Promise-bound secondary content',
  sourceDocumentPaths: [
    'templates/template-syntax/template-promises.md',
    'templates/README.md',
    'developer-guides/error-messages/runtime-html/aur0813.md',
    'developer-guides/error-handling-patterns.md',
    'developer-guides/cheat-sheet.md',
    'router/routing-lifecycle.md'
  ],
  supportRefPaths: [
    'templates/template-syntax/template-promises.md',
    'developer-guides/error-messages/runtime-html/aur0813.md'
  ],
  expectedSignals: [
    'async-operation',
    'event-binding',
    'exported-view-model-class',
    'interpolation',
    'keyed-repeat',
    'local-array',
    'promise.bind',
    'promise-catch',
    'promise-pending',
    'promise-then',
    'repeat.for'
  ],
  deferredSignals: [
    'abort-controller',
    'fetch-call',
    'http-cache',
    'http-client',
    'request-tracking',
    'route-lifecycle',
    'router',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit a template promise pattern for secondary non-gating async content; keep route-critical data in loading() and move operational async policy behind services.'
};

export const templateAttributeBindingAdmission: PatternAdmissionRecord = {
  patternId: 'template.attribute-binding',
  title: 'Explicit HTML attribute binding',
  sourceDocumentPaths: [
    'templates/template-syntax/attribute-binding.md',
    'templates/binding-behaviors.md',
    'templates/class-and-style-bindings.md',
    'developer-guides/accessibility.md'
  ],
  supportRefPaths: [
    'templates/template-syntax/attribute-binding.md',
    'templates/binding-behaviors.md'
  ],
  expectedSignals: [
    'attribute-binding',
    'binding-behavior',
    'computed-getter',
    'event-binding',
    'event-or-attribute-behavior',
    'exported-view-model-class',
    'if.bind',
    'interpolation'
  ],
  deferredSignals: [
    'bindable-component',
    'custom-attribute',
    'router',
    'shadow-dom',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit explicit DOM attribute binding for ARIA/data/SVG/platform attributes; defer component API, custom-attribute authoring, and app-state concerns.'
};

export const templateEventSelfAdmission: PatternAdmissionRecord = {
  patternId: 'template.event-self',
  title: 'Self-filtered local event',
  sourceDocumentPaths: [
    'templates/template-syntax/event-binding.md',
    'templates/binding-behaviors.md',
    'components/component-lifecycles.md'
  ],
  supportRefPaths: [
    'templates/template-syntax/event-binding.md',
    'templates/binding-behaviors.md'
  ],
  expectedSignals: [
    'attribute-binding',
    'binding-behavior',
    'event-binding',
    'event-or-attribute-behavior',
    'exported-view-model-class',
    'if.bind',
    'interpolation',
    'keyed-repeat',
    'local-array',
    'repeat.for',
    'self-event-behavior'
  ],
  deferredSignals: [
    'custom-event-dispatch',
    'event-aggregator',
    'global-listener',
    'lifecycle-cleanup',
    'router',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit self-filtered event binding for local DOM interactions; keep shared coordination and global listeners out of the baseline.'
};

export const templateUpdateTriggerAdmission: PatternAdmissionRecord = {
  patternId: 'template.update-trigger',
  title: 'Blur-updated input binding',
  sourceDocumentPaths: [
    'templates/binding-behaviors.md',
    'templates/forms/README.md',
    'templates/template-syntax/event-binding.md',
    'templates/forms/submission.md'
  ],
  supportRefPaths: [
    'templates/binding-behaviors.md',
    'templates/forms/README.md'
  ],
  expectedSignals: [
    'binding-behavior',
    'computed-getter',
    'disabled.bind',
    'event-binding',
    'exported-view-model-class',
    'form-element',
    'if.bind',
    'label-for',
    'submit-button',
    'submit.trigger',
    'textarea',
    'update-trigger-behavior',
    'value.bind'
  ],
  deferredSignals: [
    'async-operation',
    'debounce-behavior',
    'fetch-call',
    'http-client',
    'router',
    'state-plugin',
    'store-plugin',
    'throttle-behavior',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit updateTrigger as input commit-timing policy; defer validation, remote checks, debounce/throttle, and application state concerns.'
};

export const templateThrottledEventAdmission: PatternAdmissionRecord = {
  patternId: 'template.throttled-event',
  title: 'Throttled high-frequency event',
  sourceDocumentPaths: [
    'templates/template-syntax/event-binding.md',
    'templates/binding-behaviors.md',
    'advanced-scenarios/performance-optimization-techniques.md'
  ],
  supportRefPaths: [
    'templates/template-syntax/event-binding.md',
    'templates/binding-behaviors.md'
  ],
  expectedSignals: [
    'binding-behavior',
    'event-binding',
    'exported-view-model-class',
    'interpolation',
    'throttle-behavior'
  ],
  deferredSignals: [
    'async-operation',
    'custom-binding-behavior-class',
    'debounce-behavior',
    'fetch-call',
    'global-listener',
    'http-client',
    'router',
    'signal-behavior',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit throttle for local high-frequency event handling; defer remote work, signal flushing, custom behavior authoring, and shared-state transitions.'
};

export const templateLetVariablesAdmission: PatternAdmissionRecord = {
  patternId: 'template.let-variables',
  title: 'Template-local derived variables',
  sourceDocumentPaths: [
    'templates/template-syntax/template-variables.md',
    'templates/repeats-and-list-rendering.md',
    'templates/conditional-rendering.md'
  ],
  supportRefPaths: [
    'templates/template-syntax/template-variables.md',
    'templates/repeats-and-list-rendering.md'
  ],
  expectedSignals: [
    'computed-getter',
    'exported-view-model-class',
    'filter-or-sort',
    'if.bind',
    'interpolation',
    'keyed-repeat',
    'let-variable',
    'local-array',
    'repeat.for',
    'select-element',
    'value.bind'
  ],
  deferredSignals: [
    'async-operation',
    'dependency-injection',
    'fetch-call',
    'http-client',
    'router',
    'state-plugin',
    'store-plugin',
    'validation-plugin',
    'value-converter'
  ],
  admissionSummary:
    'Admit <let> for small display-local variables; keep complex derivation in TypeScript and shared state in DI services.'
};

export const componentAttributeTransferAdmission: PatternAdmissionRecord = {
  patternId: 'component.attribute-transfer',
  title: 'Native attribute transfer component',
  sourceDocumentPaths: [
    'getting-to-know-aurelia/introduction/attribute-transferring.md',
    'components/bindable-properties.md',
    'components/components.md',
    'templates/forms/README.md'
  ],
  supportRefPaths: [
    'getting-to-know-aurelia/introduction/attribute-transferring.md',
    'components/bindable-properties.md'
  ],
  expectedSignals: [
    'attribute-capture',
    'bindable-component',
    'bindable-property-binding',
    'custom-element-import',
    'custom-element-usage',
    'exported-view-model-class',
    'form-element',
    'label-for',
    'native-input-constraint',
    'value.bind'
  ],
  deferredSignals: [
    'async-operation',
    'bindable-change-callback',
    'callback-bindable',
    'dependency-injection',
    'event-aggregator',
    'from-view-bindable',
    'router',
    'shadow-dom',
    'slot-content',
    'state-plugin',
    'store-plugin',
    'two-way-bindable',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit attribute capture and $attrs transfer for native-control wrappers; defer broad component API, slots, Shadow DOM, and shared coordination variants.'
};

export const componentDynamicCompositionAdmission: PatternAdmissionRecord = {
  patternId: 'component.dynamic-composition',
  title: 'Dynamic component composition',
  sourceDocumentPaths: [
    'getting-to-know-aurelia/dynamic-composition.md',
    'components/components.md',
    'templates/conditional-rendering.md',
    'developer-guides/error-messages/runtime-html/aur0806.md'
  ],
  supportRefPaths: [
    'getting-to-know-aurelia/dynamic-composition.md',
    'components/components.md'
  ],
  expectedSignals: [
    'attribute-binding',
    'bindable-component',
    'bindable-property-binding',
    'custom-element-usage',
    'dynamic-composition',
    'event-binding',
    'exported-view-model-class',
    'interpolation',
    'keyed-repeat',
    'local-array',
    'repeat.for'
  ],
  deferredSignals: [
    'async-operation',
    'component-ref',
    'dependency-injection',
    'lifecycle-cleanup',
    'promise.bind',
    'router',
    'state-plugin',
    'store-plugin',
    'template-ref',
    'validation-plugin',
    'value-converter'
  ],
  admissionSummary:
    'Admit bounded dynamic component composition for local UI switching; defer unbounded plugin loading, direct child instance access, route-sized choices, and lifecycle orchestration.'
};

export const routerGuardRedirectAdmission: PatternAdmissionRecord = {
  patternId: 'router.guard-redirect',
  title: 'Route guard redirect',
  sourceDocumentPaths: [
    'router/routing-lifecycle.md',
    'router/configuring-routes.md',
    'router/navigating.md',
    'router/router-events.md'
  ],
  supportRefPaths: [
    'router/routing-lifecycle.md',
    'router/configuring-routes.md'
  ],
  expectedSignals: [
    'can-load-hook',
    'dependency-injection',
    'di-interface-token',
    'exported-view-model-class',
    'interpolation',
    'keyed-repeat',
    'loading-hook',
    'local-array',
    'repeat.for',
    'resolve-service',
    'route-config',
    'route-lifecycle',
    'route-link',
    'route-parameter',
    'route-viewport',
    'router',
    'service-class',
    'singleton-service'
  ],
  deferredSignals: [
    'abort-controller',
    'async-fetch',
    'auth-interceptor',
    'event-aggregator',
    'fetch-call',
    'http-cache',
    'http-client',
    'promise.bind',
    'request-tracking',
    'router-direct',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit canLoad redirect for route entry decisions; keep data preparation, shell progress, and reusable decision state as companion concerns.'
};

export const routerAuthSessionGuardAdmission: PatternAdmissionRecord = {
  patternId: 'router.auth-session-guard',
  title: 'Auth session route guard',
  sourceDocumentPaths: [
    'router/router-hooks.md',
    'developer-guides/security.md',
    'getting-started/extended-tutorial/step-6-route-data-and-roles.md',
    'router/route-parameters.md'
  ],
  supportRefPaths: [
    'router/router-hooks.md',
    'developer-guides/security.md',
    'router/route-parameters.md'
  ],
  expectedSignals: [
    'can-load-hook',
    'computed-getter',
    'dependency-injection',
    'di-interface-token',
    'exported-view-model-class',
    'interpolation',
    'resolve-service',
    'route-config',
    'route-lifecycle',
    'route-parameter',
    'router',
    'service-class',
    'singleton-service'
  ],
  deferredSignals: [
    'async-fetch',
    'auth-interceptor',
    'browser-storage',
    'callback-bindable',
    'event-aggregator',
    'fetch-call',
    'http-client',
    'router-direct',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit canLoad auth and role gating with injected session state; defer token refresh, browser persistence, fetched permission policy, state plugins, and server authorization implementation.'
};

export const routerCanUnloadDirtyFormAdmission: PatternAdmissionRecord = {
  patternId: 'router.can-unload-dirty-form',
  title: 'Dirty form route exit guard',
  sourceDocumentPaths: [
    'router/routing-lifecycle.md',
    'templates/forms/submission.md',
    'templates/forms/README.md',
    'developer-guides/working-with-web-standards.md'
  ],
  supportRefPaths: [
    'router/routing-lifecycle.md',
    'templates/forms/submission.md'
  ],
  expectedSignals: [
    'can-unload-hook',
    'disabled.bind',
    'event-binding',
    'exported-view-model-class',
    'form-element',
    'if.bind',
    'label-for',
    'native-input-constraint',
    'route-lifecycle',
    'router',
    'submit.trigger',
    'textarea',
    'value.bind'
  ],
  deferredSignals: [
    'async-operation',
    'autosave',
    'dependency-injection',
    'dynamic-form',
    'fetch-call',
    'http-client',
    'multi-step-form',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit canUnload for route-owned dirty forms; defer autosave, draft persistence, validation-plugin coupling, and multi-step workflow policy.'
};

export const routerRelativeContextNavigationAdmission: PatternAdmissionRecord = {
  patternId: 'router.relative-context-navigation',
  title: 'Route-context relative navigation',
  sourceDocumentPaths: [
    'router/child-routing.md',
    'router/navigating.md',
    'router/api-reference.md',
    'router/route-parameters.md'
  ],
  supportRefPaths: [
    'router/child-routing.md',
    'router/navigating.md',
    'router/api-reference.md'
  ],
  expectedSignals: [
    'async-operation',
    'dependency-injection',
    'event-binding',
    'exported-view-model-class',
    'interpolation',
    'keyed-repeat',
    'local-array',
    'relative-route-navigation',
    'repeat.for',
    'resolve-service',
    'route-config',
    'route-context',
    'route-link',
    'route-viewport',
    'router'
  ],
  deferredSignals: [
    'auth-interceptor',
    'can-load-hook',
    'event-aggregator',
    'fetch-call',
    'http-client',
    'loading-hook',
    'promise.bind',
    'request-tracking',
    'route-parameter-aggregation',
    'router-direct',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit router.load with explicit IRouteContext for relative programmatic navigation; keep parameter aggregation and route data loading in companion patterns.'
};

export const routerErrorFallbackAdmission: PatternAdmissionRecord = {
  patternId: 'router.error-fallback',
  title: 'Unknown route fallback',
  sourceDocumentPaths: [
    'router/configuring-routes.md',
    'router/error-handling.md',
    'router/viewports.md',
    'router/troubleshooting.md'
  ],
  supportRefPaths: [
    'router/configuring-routes.md',
    'router/error-handling.md',
    'router/viewports.md'
  ],
  expectedSignals: [
    'exported-view-model-class',
    'interpolation',
    'route-config',
    'route-fallback',
    'route-link',
    'route-viewport',
    'router'
  ],
  deferredSignals: [
    'auth-interceptor',
    'can-load-hook',
    'event-aggregator',
    'fetch-call',
    'http-client',
    'loading-hook',
    'request-tracking',
    'route-lifecycle',
    'router-direct',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit router fallback for unknown paths; keep denied-route redirects, data-load failures, and deployment rewrites as separate concerns.'
};

export const serviceFetchConfigurationAdmission: PatternAdmissionRecord = {
  patternId: 'service.fetch-configuration',
  title: 'Configured fetch-client service',
  sourceDocumentPaths: [
    'aurelia-packages/fetch-client/setting-up.md',
    'aurelia-packages/fetch-client/overview.md',
    'aurelia-packages/fetch-client/utilities-and-lifecycle.md',
    'aurelia-packages/fetch-client/outcome-recipes.md'
  ],
  supportRefPaths: [
    'aurelia-packages/fetch-client/setting-up.md',
    'aurelia-packages/fetch-client/overview.md',
    'aurelia-packages/fetch-client/utilities-and-lifecycle.md'
  ],
  expectedSignals: [
    'async-operation',
    'component-load-lifecycle',
    'dependency-injection',
    'di-interface-token',
    'exported-view-model-class',
    'http-client',
    'http-client-configuration',
    'http-request',
    'http-response-check',
    'if.bind',
    'interpolation',
    'json-response',
    'keyed-repeat',
    'loading-state',
    'repeat.for',
    'resolve-service',
    'service-class',
    'singleton-service'
  ],
  deferredSignals: [
    'abort-controller',
    'auth-interceptor',
    'browser-storage',
    'http-cache',
    'http-interceptor',
    'http-retry',
    'request-tracking',
    'router',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit centralized fetch-client base/default configuration with typed services; defer interceptors, auth, retries, caching, cancellation, and multi-domain client policy.'
};

export const serviceFetchCancellationAdmission: PatternAdmissionRecord = {
  patternId: 'service.fetch-cancellation',
  title: 'Cancellable fetch-client request',
  sourceDocumentPaths: [
    'aurelia-packages/fetch-client/abort-controller.md',
    'aurelia-packages/fetch-client/setting-up.md',
    'aurelia-packages/fetch-client/advanced.md',
    'components/component-lifecycles.md'
  ],
  supportRefPaths: [
    'aurelia-packages/fetch-client/abort-controller.md',
    'aurelia-packages/fetch-client/setting-up.md',
    'components/component-lifecycles.md'
  ],
  expectedSignals: [
    'abort-controller',
    'async-operation',
    'dependency-injection',
    'error-feedback',
    'event-binding',
    'exported-view-model-class',
    'http-client',
    'http-request',
    'http-response-check',
    'if.bind',
    'interpolation',
    'json-response',
    'keyed-repeat',
    'label-for',
    'lifecycle-cleanup',
    'loading-state',
    'repeat.for',
    'resolve-service'
  ],
  deferredSignals: [
    'auth-interceptor',
    'browser-storage',
    'http-cache',
    'http-client-configuration',
    'http-interceptor',
    'http-retry',
    'request-tracking',
    'route-lifecycle',
    'router',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit AbortController cancellation for component-owned fetch-client requests; defer router-critical loading, retry/cache policy, and shared search state.'
};

export const serviceFetchInterceptorAdmission: PatternAdmissionRecord = {
  patternId: 'service.fetch-interceptor',
  title: 'Fetch-client request interceptor',
  sourceDocumentPaths: [
    'aurelia-packages/fetch-client/interceptors.md',
    'aurelia-packages/fetch-client/setting-up.md',
    'aurelia-packages/fetch-client/utilities-and-lifecycle.md',
    'aurelia-packages/fetch-client/overview.md'
  ],
  supportRefPaths: [
    'aurelia-packages/fetch-client/interceptors.md',
    'aurelia-packages/fetch-client/setting-up.md',
    'aurelia-packages/fetch-client/utilities-and-lifecycle.md'
  ],
  expectedSignals: [
    'dependency-injection',
    'di-interface-token',
    'exported-view-model-class',
    'http-client',
    'http-client-configuration',
    'http-interceptor',
    'interpolation',
    'resolve-service',
    'service-class',
    'singleton-service'
  ],
  deferredSignals: [
    'abort-controller',
    'auth-interceptor',
    'browser-storage',
    'http-cache',
    'http-retry',
    'request-tracking',
    'router',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit small fetch-client interceptors for cross-cutting request treatment; defer auth, retry, cache, cancellation, and duplicate-registration policy.'
};

export const serviceFetchCachePolicyAdmission: PatternAdmissionRecord = {
  patternId: 'service.fetch-cache-policy',
  title: 'Fetch-client cache policy service',
  sourceDocumentPaths: [
    'aurelia-packages/fetch-client/caching.md',
    'aurelia-packages/fetch-client/setting-up.md',
    'aurelia-packages/fetch-client/utilities-and-lifecycle.md',
    'aurelia-packages/fetch-client/interceptors.md'
  ],
  supportRefPaths: [
    'aurelia-packages/fetch-client/caching.md',
    'aurelia-packages/fetch-client/setting-up.md',
    'aurelia-packages/fetch-client/utilities-and-lifecycle.md'
  ],
  expectedSignals: [
    'async-operation',
    'component-load-lifecycle',
    'dependency-injection',
    'di-interface-token',
    'exported-view-model-class',
    'http-cache',
    'http-client',
    'http-client-configuration',
    'http-interceptor',
    'http-request',
    'http-response-check',
    'if.bind',
    'interpolation',
    'json-response',
    'keyed-repeat',
    'loading-state',
    'repeat.for',
    'resolve-service',
    'service-class',
    'singleton-service'
  ],
  deferredSignals: [
    'abort-controller',
    'auth-interceptor',
    'browser-storage',
    'http-retry',
    'request-tracking',
    'router',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit fetch-client caching as explicit read-service HTTP policy; defer auth, retries, cancellation, browser persistence, and editable shared state.'
};

export const collectionPaginationAdmission: PatternAdmissionRecord = {
  patternId: 'collection.pagination',
  title: 'Local collection pagination',
  sourceDocumentPaths: [
    'templates/repeats-and-list-rendering.md',
    'advanced-scenarios/performance-optimization-techniques.md',
    'developer-guides/ui-virtualization.md'
  ],
  supportRefPaths: [
    'templates/repeats-and-list-rendering.md',
    'advanced-scenarios/performance-optimization-techniques.md'
  ],
  expectedSignals: [
    'computed-getter',
    'disabled.bind',
    'event-binding',
    'exported-view-model-class',
    'interpolation',
    'keyed-repeat',
    'local-array',
    'pagination',
    'repeat.for'
  ],
  deferredSignals: [
    'async-fetch',
    'batch-selection',
    'dependency-injection',
    'fetch-call',
    'http-client',
    'route-parameter',
    'router',
    'state-plugin',
    'store-plugin',
    'validation-plugin',
    'virtual-repeat'
  ],
  admissionSummary:
    'Admit local presentation pagination for modest in-memory collections; defer server paging, route-owned page state, batch selection, and virtualization.'
};

export const collectionVirtualRepeatAdmission: PatternAdmissionRecord = {
  patternId: 'collection.virtual-repeat',
  title: 'Virtualized large collection',
  sourceDocumentPaths: [
    'developer-guides/ui-virtualization.md',
    'advanced-scenarios/performance-optimization-techniques.md',
    'templates/repeats-and-list-rendering.md'
  ],
  supportRefPaths: [
    'developer-guides/ui-virtualization.md',
    'advanced-scenarios/performance-optimization-techniques.md'
  ],
  expectedSignals: [
    'binding-behavior',
    'computed-getter',
    'debounce-behavior',
    'exported-view-model-class',
    'filter-or-sort',
    'if.bind',
    'interpolation',
    'repeat.for',
    'style-source',
    'value.bind',
    'virtual-repeat'
  ],
  deferredSignals: [
    'async-fetch',
    'batch-selection',
    'fetch-call',
    'http-client',
    'pagination',
    'router',
    'router-direct',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit virtual-repeat for client-owned large collections with stable row geometry; defer server query ownership, pagination policy, selection, routing, and plugin/state coordination.'
};

export const collectionBatchSelectionAdmission: PatternAdmissionRecord = {
  patternId: 'collection.batch-selection',
  title: 'Batch selection with a local Set',
  sourceDocumentPaths: [
    'templates/forms/collections.md',
    'templates/repeats-and-list-rendering.md',
    'getting-to-know-aurelia/watching-data.md'
  ],
  supportRefPaths: [
    'templates/forms/collections.md',
    'templates/repeats-and-list-rendering.md',
    'getting-to-know-aurelia/watching-data.md'
  ],
  expectedSignals: [
    'batch-selection',
    'checkbox-input',
    'checked.to-view',
    'computed-getter',
    'disabled.bind',
    'event-binding',
    'exported-view-model-class',
    'interpolation',
    'keyed-repeat',
    'local-array',
    'repeat.for'
  ],
  deferredSignals: [
    'async-fetch',
    'dependency-injection',
    'fetch-call',
    'http-client',
    'pagination',
    'router',
    'state-plugin',
    'store-plugin',
    'validation-plugin',
    'virtual-repeat'
  ],
  admissionSummary:
    'Admit local Set-based row selection for visible collections; defer cross-route selection state, server-owned selection, pagination coupling, and shared feature state.'
};

export const formFileUploadAdmission: PatternAdmissionRecord = {
  patternId: 'form.file-upload',
  title: 'Native file upload form',
  sourceDocumentPaths: [
    'templates/forms/file-uploads.md',
    'templates/forms/submission.md',
    'templates/forms/README.md',
    'developer-guides/working-with-web-standards.md'
  ],
  supportRefPaths: [
    'templates/forms/file-uploads.md',
    'templates/forms/submission.md',
    'developer-guides/working-with-web-standards.md'
  ],
  expectedSignals: [
    'async-fetch',
    'async-operation',
    'disabled.bind',
    'error-feedback',
    'event-binding',
    'exported-view-model-class',
    'fetch-call',
    'file-upload',
    'form-element',
    'form-object-state',
    'if.bind',
    'interpolation',
    'label-for',
    'submission-state',
    'submit-button',
    'submit.trigger',
    'success-error-feedback'
  ],
  deferredSignals: [
    'autosave',
    'dependency-injection',
    'dynamic-form',
    'http-client',
    'multi-step-form',
    'router',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit native file input plus FormData upload for component-owned interactions; defer resumable uploads, shared upload queues, validation plugin, and specialized SDK flows.'
};

export const resourceTemplateControllerAdmission: PatternAdmissionRecord = {
  patternId: 'resource.template-controller',
  title: 'Template controller resource',
  sourceDocumentPaths: [
    'getting-to-know-aurelia/template-controllers.md',
    'templates/custom-attributes.md',
    'components/component-lifecycles.md'
  ],
  supportRefPaths: [
    'getting-to-know-aurelia/template-controllers.md',
    'templates/custom-attributes.md'
  ],
  expectedSignals: [
    'bindable-component',
    'custom-attribute',
    'dependency-injection',
    'exported-view-model-class',
    'lifecycle-cleanup',
    'resolve-service',
    'template-controller'
  ],
  deferredSignals: [
    'callback-bindable',
    'dynamic-composition',
    'event-aggregator',
    'manual-registration',
    'router',
    'shadow-dom',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit template-controller authoring for reusable structural template behavior; defer feature-state ownership, router concerns, broad communication, and manual registration policy.'
};

export const dialogConfirmEditAdmission: PatternAdmissionRecord = {
  patternId: 'dialog.confirm-edit',
  title: 'Dialog confirm and edit flow',
  sourceDocumentPaths: [
    'aurelia-packages/dialog.md',
    'getting-started/extended-tutorial/step-9-dialogs.md',
    'templates/forms/README.md'
  ],
  supportRefPaths: [
    'aurelia-packages/dialog.md',
    'getting-started/extended-tutorial/step-9-dialogs.md'
  ],
  expectedSignals: [
    'async-operation',
    'dependency-injection',
    'di-interface-token',
    'dialog-plugin',
    'disabled.bind',
    'event-binding',
    'exported-view-model-class',
    'filter-or-sort',
    'form-element',
    'keyed-repeat',
    'native-input-constraint',
    'repeat.for',
    'resolve-service',
    'service-class',
    'singleton-service',
    'submit.trigger',
    'value.bind'
  ],
  deferredSignals: [
    'callback-bindable',
    'dynamic-composition',
    'event-aggregator',
    'i18n-plugin',
    'portal',
    'router',
    'router-direct',
    'state-plugin',
    'store-plugin',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit dialog confirm/edit flows for blocking modal decisions with close results; defer portal overlays, app-wide dialog orchestration, validation, router, i18n, and broad communication mechanisms.'
};

export const templatePortalOverlayAdmission: PatternAdmissionRecord = {
  patternId: 'template.portal-overlay',
  title: 'Portal-backed overlay content',
  sourceDocumentPaths: [
    'getting-to-know-aurelia/portalling-elements.md',
    'getting-to-know-aurelia/template-controllers.md',
    'developer-guides/error-messages/runtime-html/aur0812.md',
    'developer-guides/error-messages/runtime-html/aur0779.md'
  ],
  supportRefPaths: [
    'getting-to-know-aurelia/portalling-elements.md',
    'getting-to-know-aurelia/template-controllers.md'
  ],
  expectedSignals: [
    'event-binding',
    'exported-view-model-class',
    'if.bind',
    'interpolation',
    'keyed-repeat',
    'local-array',
    'portal',
    'repeat.for'
  ],
  deferredSignals: [
    'dynamic-composition',
    'event-aggregator',
    'global-listener',
    'router',
    'state-plugin',
    'store-plugin',
    'template-ref',
    'validation-plugin'
  ],
  admissionSummary:
    'Admit portal-backed overlay rendering for component-owned content that needs a stable DOM target; defer app-wide overlay orchestration, global listeners, and shared overlay queues.'
};

export const aureliaPatternAdmissionRecords = [
  componentLocalCollectionAdmission,
  collectionServerQueryAdmission,
  formNativeSubmitAdmission,
  formValidationSubmitAdmission,
  formServerValidationErrorsAdmission,
  componentBindableBasicAdmission,
  componentSlottedLayoutAdmission,
  serviceInjectedStateAdmission,
  componentCustomEventAdmission,
  serviceFetchClientAdmission,
  formChoiceControlsAdmission,
  templateClassStyleBindingAdmission,
  templateValueConverterDisplayAdmission,
  localizationI18nLocaleServiceAdmission,
  templateFocusControlAdmission,
  templateDomRefAdmission,
  templateDebouncedInputAdmission,
  templateConditionalRenderingAdmission,
  componentLifecycleCleanupAdmission,
  resourceCustomAttributeAdmission,
  shellNavigationProgressAdmission,
  routerNavigationLinksAdmission,
  routerActiveNavigationAdmission,
  routerCriticalLoadingAdmission,
  routerRouteParametersAdmission,
  templatePromiseSecondaryAdmission,
  templateAttributeBindingAdmission,
  templateEventSelfAdmission,
  templateUpdateTriggerAdmission,
  templateThrottledEventAdmission,
  templateLetVariablesAdmission,
  componentAttributeTransferAdmission,
  componentDynamicCompositionAdmission,
  routerGuardRedirectAdmission,
  routerAuthSessionGuardAdmission,
  routerCanUnloadDirtyFormAdmission,
  routerRelativeContextNavigationAdmission,
  routerErrorFallbackAdmission,
  serviceFetchConfigurationAdmission,
  serviceFetchCancellationAdmission,
  serviceFetchInterceptorAdmission,
  serviceFetchCachePolicyAdmission,
  collectionPaginationAdmission,
  collectionVirtualRepeatAdmission,
  collectionBatchSelectionAdmission,
  formFileUploadAdmission,
  resourceTemplateControllerAdmission,
  dialogConfirmEditAdmission,
  templatePortalOverlayAdmission
] as const satisfies readonly PatternAdmissionRecord[];

export function getPatternAdmissionRecord(patternId: string): PatternAdmissionRecord | undefined {
  return aureliaPatternAdmissionRecords.find((record) => record.patternId === patternId);
}
