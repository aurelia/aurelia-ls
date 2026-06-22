import type {
  AffordanceSignal,
  CodeFence,
  MarkdownDocument,
  SourceUnit,
  SourceUnitRole
} from './corpus-types.js';

export function sourceUnitsForDocument(document: MarkdownDocument): readonly SourceUnit[] {
  return document.codeFences.map((fence, index) => sourceUnitForCodeFence(document.relativePath, fence, index));
}

export function sourceUnitForSourceText(
  sourceText: string,
  language: string,
  sourceUnitId = 'inline-source'
): SourceUnit {
  const normalizedLanguage = normalizeLanguage(language);
  return {
    sourceUnitId,
    documentPath: '<inline>',
    sectionId: '<inline>',
    codeFenceId: '<inline>',
    language: normalizedLanguage,
    role: classifySourceUnitRole(normalizedLanguage, sourceText),
    sourceText,
    signals: extractAffordanceSignals(normalizedLanguage, sourceText)
  };
}

export function signalNamesForSourceUnits(sourceUnits: readonly SourceUnit[]): readonly string[] {
  return Array.from(new Set(sourceUnits.flatMap((unit) => unit.signals.map((signal) => signal.name)))).sort();
}

export const localCollectionDeferredSignals = [
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
] as const;

function sourceUnitForCodeFence(documentPath: string, fence: CodeFence, index: number): SourceUnit {
  const role = classifySourceUnitRole(fence.language, fence.code);
  return {
    sourceUnitId: `${documentPath}#source-${index + 1}`,
    documentPath,
    sectionId: fence.sectionId,
    codeFenceId: fence.fenceId,
    language: normalizeLanguage(fence.language),
    role,
    ...(fence.title !== undefined ? { title: fence.title } : {}),
    sourceText: fence.code,
    signals: extractAffordanceSignals(fence.language, fence.code)
  };
}

function classifySourceUnitRole(language: string, sourceText: string): SourceUnitRole {
  const normalizedLanguage = normalizeLanguage(language);
  const text = sourceText.trim();

  if (normalizedLanguage === 'bash' || normalizedLanguage === 'powershell' || /^(pnpm|npm|yarn|curl)\s/m.test(text)) {
    return 'command';
  }
  if (normalizedLanguage === 'css' || normalizedLanguage === 'scss') {
    return 'style';
  }
  if (normalizedLanguage === 'json' || normalizedLanguage === 'yaml' || normalizedLanguage === 'toml') {
    return 'config';
  }
  if (isTemplateSource(normalizedLanguage, text)) {
    return 'template';
  }
  if (hasRouteSignals(text)) {
    return 'route-config';
  }
  if (hasBootstrapSignals(text)) {
    return 'bootstrap';
  }
  if (hasTestSignals(text)) {
    return 'test';
  }
  if (hasDiSignals(text)) {
    return 'service-or-di';
  }
  if (normalizedLanguage === 'typescript' || normalizedLanguage === 'javascript') {
    if (/\bexport\s+class\s+\w+|\bclass\s+\w+|@\w+|\bimport\s+/.test(text)) {
      return 'component-or-resource';
    }
    return 'typescript-snippet';
  }
  if (normalizedLanguage === 'markdown' || normalizedLanguage === 'md') {
    return 'markdown';
  }
  return 'unlabeled';
}

function extractAffordanceSignals(language: string, sourceText: string): readonly AffordanceSignal[] {
  const normalizedLanguage = normalizeLanguage(language);
  const text = sourceText;
  const signals = new Map<string, AffordanceSignal>();
  const add = (name: string, reason: string): void => {
    if (!signals.has(name)) {
      signals.set(name, { name, strength: 'strong', reason });
    }
  };

  if (/repeat\.for\s*=/.test(text)) {
    add('repeat.for', 'template uses repeat.for');
  }
  if (/repeat\.for\s*=\s*["'][^"']*;\s*key(?:\.bind)?\s*:/.test(text)) {
    add('keyed-repeat', 'repeat.for has a key expression');
  }
  if (/\$\{[^}]+\}/.test(text)) {
    add('interpolation', 'template/source contains interpolation');
  }
  if (/\bvalue\.bind\s*=/.test(text)) {
    add('value.bind', 'template binds an input value');
  }
  if (/\b[\w:-]+\.attr\s*=|&\s*attr\b/.test(text)) {
    add('attribute-binding', 'template forces a value into an HTML attribute');
  }
  if (/\bmodel\.bind\s*=/.test(text)) {
    add('model.bind', 'template binds a selected model value');
  }
  if (/\bvalue-as-(?:number|date)\.bind\s*=/.test(text)) {
    add('typed-value-binding', 'template binds a typed native input value');
  }
  if (/\bfocus\.(?:bind|to-view|two-way)\s*=/.test(text)) {
    add('focus-binding', 'template binds focus state with the focus custom attribute');
  }
  if (/\bfocus\.to-view\s*=/.test(text)) {
    add('focus-to-view', 'template sends focus state from the view model to the element');
  }
  if (/\bfocus\.(?:bind|two-way)\s*=/.test(text)) {
    add('two-way-focus', 'template lets focus and blur update view-model state');
  }
  if (/\bchecked\.bind\s*=/.test(text)) {
    add('checked.bind', 'template binds checked state');
  }
  if (/\bchecked\.to-view\s*=/.test(text)) {
    add('checked.to-view', 'template reads derived checked state without writing back through the binding');
  }
  if (/\bchecked\.one-way\s*=/.test(text)) {
    add('checked.one-way', 'template reads derived checked state with legacy one-way spelling');
  }
  if (/\bmatcher\.bind\s*=/.test(text)) {
    add('matcher.bind', 'template binds custom equality for form choices');
  }
  if (/\bif\.bind\s*=/.test(text)) {
    add('if.bind', 'template uses conditional rendering');
  }
  if (/\b(?:show|hide)\.bind\s*=/.test(text)) {
    add('show.bind', 'template toggles visibility without removing DOM state');
  }
  if (/\bswitch\.bind\s*=/.test(text)) {
    add('switch.bind', 'template uses switch/case conditional rendering');
  }
  if (/\b(?:case(?:\.bind)?|default-case)\b/.test(text)) {
    add('switch-case', 'template declares switch cases');
  }
  if (isTemplateSource(normalizedLanguage, text) && /\bpromise\.(?:bind|resolve)(?:\.bind)?\s*=/.test(text)) {
    add('promise.bind', 'template binds a promise to pending/then/catch states');
  }
  if (isTemplateSource(normalizedLanguage, text) && /\bpending\b/.test(text)) {
    add('promise-pending', 'template renders promise pending state');
  }
  if (isTemplateSource(normalizedLanguage, text) && /\bthen(?:\.bind)?(?:\s*=|\b)/.test(text)) {
    add('promise-then', 'template renders promise resolved state');
  }
  if (isTemplateSource(normalizedLanguage, text) && /\bcatch(?:\.bind)?(?:\s*=|\b)/.test(text)) {
    add('promise-catch', 'template renders promise rejected state');
  }
  if (/\b(?:click|change|submit|input|blur|focus|keyup|keydown|mousemove|pointermove|scroll)\.trigger\s*=/.test(text)) {
    add('event-binding', 'template uses trigger event binding');
  }
  if (/<[a-z][\w]*-[\w-]+[^>]*\b[\w-]+\.trigger\s*=/.test(text)) {
    add('custom-event-listener', 'template listens to a custom element event');
  }
  if (/\b\w+\.(?:trigger|capture):[\w:+-]+|@\w+:[\w:+.-]+/.test(text)) {
    add('event-modifier', 'template uses event modifier syntax');
  }
  if (isTemplateSource(normalizedLanguage, text) && /&\s*self\b/.test(text)) {
    add('self-event-behavior', 'template handles only events that originate on the bound element');
  }
  if (/\b\w+\.capture\s*=/.test(text)) {
    add('capture-event', 'template listens during the event capture phase');
  }
  if (/\bsubmit\.trigger\s*=/.test(text)) {
    add('submit.trigger', 'template handles native form submission');
  }
  if (/<form\b/i.test(text)) {
    add('form-element', 'template contains a native form element');
  }
  if (/<button\b[^>]*\btype=["']submit["']/i.test(text)) {
    add('submit-button', 'template contains a native submit button');
  }
  if (/\bdisabled\.bind\s*=/.test(text)) {
    add('disabled.bind', 'template binds disabled state');
  }
  if (/<label\b[^>]*\bfor(?:\.bind)?=["'][^"']+["']/i.test(text)) {
    add('label-for', 'template associates labels with controls');
  }
  if (/<textarea\b/i.test(text)) {
    add('textarea', 'template contains a textarea control');
  }
  if (/<select\b/i.test(text)) {
    add('select-element', 'template contains a select control');
  }
  if (/<select\b[^>]*\bmultiple\b/i.test(text)) {
    add('multiple-select', 'template contains a multi-select control');
  }
  if (/<input\b[^>]*\btype=["']checkbox["']/i.test(text)) {
    add('checkbox-input', 'template contains a checkbox control');
  }
  if (/<input\b[^>]*\btype=["']radio["']/i.test(text)) {
    add('radio-input', 'template contains a radio control');
  }
  if (/<fieldset\b[\s\S]*<legend\b/i.test(text)) {
    add('fieldset-legend', 'template groups native form controls with a fieldset and legend');
  }
  if (/\b(?:required|min|max|minlength|maxlength|pattern)=?(?=[\s>])/i.test(text)) {
    add('native-input-constraint', 'template uses native input constraints');
  }
  if (/@bindable\b/.test(text)) {
    add('bindable-component', 'source declares bindable component inputs');
  }
  if (/<import\b[^>]*\bfrom=["'][^"']+["']/i.test(text)) {
    add('custom-element-import', 'template imports a custom element dependency');
  }
  if (/<[a-z][\w]*-[\w-]+\b/i.test(text)) {
    add('custom-element-usage', 'template uses a custom element tag');
  }
  if (/<[a-z][\w]*-[\w-]+[^>]*\b[\w-]+\.(?:bind|one-way|to-view|two-way)=/i.test(text)) {
    add('bindable-property-binding', 'template binds values into custom element properties');
  }
  if (/\bBindingMode\.twoWay\b|\.two-way\s*=/.test(text)) {
    add('two-way-bindable', 'source uses two-way bindable flow');
  }
  if (/\bBindingMode\.fromView\b|\.from-view\s*=/.test(text)) {
    add('from-view-bindable', 'source uses from-view bindable flow');
  }
  if (/@bindable\s+(?:on[A-Z]\w*|\w+\??\s*:\s*\([^)]*\)\s*=>)/.test(text)) {
    add('callback-bindable', 'source exposes a callback as a bindable property');
  }
  if (/\b\w+Changed\s*\(|\bpropertyChanged\s*\(|\bpropertiesChanged\s*\(/.test(text)) {
    add('bindable-change-callback', 'source handles bindable change callbacks');
  }
  if (/\bcoercingOptions\b|@bindable\s*\(\s*\{[^}]*\b(?:set|type|nullable)\s*:/s.test(text)) {
    add('bindable-coercion', 'source configures bindable coercion or setter behavior');
  }
  if (/\$attrs\b|\.\.\.\s*\$attrs|\bcapture\s*:|@capture\b/.test(text)) {
    add('attribute-capture', 'source captures or transfers custom element attributes');
  }
  if (/<(?:au-)?slot\b|\b(?:au-)?slot(?:\.bind)?=["']/.test(text)) {
    add('slot-content', 'template uses slot content projection');
  }
  if (isTemplateSource(normalizedLanguage, text) && /<let\b/i.test(text)) {
    add('let-variable', 'template declares local variables with the let element');
  }
  if (isTemplateSource(normalizedLanguage, text) && /<au-compose\b/i.test(text)) {
    add('dynamic-composition', 'template composes a component or template dynamically');
  }
  if (/@templateController\b|\btemplateController\s*\(|\bisTemplateController\s*:\s*true/.test(text)) {
    add('template-controller', 'source defines a template controller resource');
    add('custom-attribute', 'template controller is backed by a custom attribute');
  }
  if (isTemplateSource(normalizedLanguage, text) && /<[\w:-]+[^>]*\sportal(?:[\w.-]+)?(?:\s*=|\s|>)/i.test(text)) {
    add('portal', 'template portals content to another DOM location');
  }
  if (/\bcustomAttribute\b|@customAttribute\b/.test(text)) {
    add('custom-attribute', 'source defines or configures a custom attribute');
  }
  if (/\buseShadowDOM\b|\bshadowCSS\b/.test(text)) {
    add('shadow-dom', 'source uses Shadow DOM component isolation');
  }
  if (/\bIEventAggregator\b|(?:\bea|\beventAggregator)\.(?:publish|subscribe)\s*\(/.test(text)) {
    add('event-aggregator', 'source uses event aggregator communication');
  }
  if (/bindable values|Bindable properties have been set|needing bindables/i.test(text)) {
    add('bindable-lifecycle-timing', 'source or docs describe bindable lifecycle timing');
  }
  if (/\b@(?:observable|watch)\b|\bwatch\s*\(/.test(text)) {
    add('observable-side-effect', 'source uses observation side-effect APIs');
  }
  if (/\bDI\.createInterface\s*</.test(text)) {
    add('di-interface-token', 'source creates a DI interface token');
  }
  if (/\b(?:Registration\.)?singleton\s*\(|@singleton\s*\(/.test(text)) {
    add('singleton-service', 'source registers or declares a singleton service');
  }
  if (/\b(?:Registration\.)?transient\s*\(|@transient\s*\(/.test(text)) {
    add('transient-service', 'source registers or declares a transient service');
  }
  if (/\bcontainer\.register\s*\(|\bAurelia\.register\s*\(|\bRegistration\.(?:singleton|transient|instance)\s*\(/.test(text)) {
    add('manual-registration', 'source registers dependencies explicitly');
  }
  if (/(?<!\.)\bresolve\s*\([^)]*\)/.test(text)) {
    add('resolve-service', 'source resolves a service from the Aurelia DI context');
  }
  if (/\bexport\s+class\s+\w+(?:Service|State|Store)\b/.test(text)) {
    add('service-class', 'source exports a service or state class');
  }
  if (/\bexport\s+class\s+\w+State\b[\s\S]*\breadonly\s+\w+\s*[:=][\s\S]*\bselect\w*\s*\(/.test(text)) {
    add('shared-state-service', 'source stores shared state and exposes mutation methods from a state service');
  }
  if (/\bDI\.getGlobalContainer\s*\(|\bcontainer\.get(?:All)?\s*\(/.test(text)) {
    add('service-locator', 'source looks up services directly from a container');
  }
  if (/\bINode\b|resolve\s*\(\s*INode\s*\)/.test(text)) {
    add('host-element', 'source accesses the custom element host node');
  }
  if (/\b@inject\s*\(|static\s+inject\s*=|constructor\s*\([^)]*(?:private|public|protected)\s+readonly/.test(text)) {
    add('constructor-injection', 'source injects dependencies through constructor metadata');
  }
  if (/\b@computed\b/.test(text)) {
    add('computed-decorator', 'source uses explicit computed decorator');
  }
  if (/\bget\s+\w+\s*\([^)]*\)\s*[:\w\s<>\[\]|]*\{/.test(text)) {
    add('computed-getter', 'source has a getter-derived value');
  }
  if (/\b(?:filter|sort)\s*\(/.test(text)) {
    add('filter-or-sort', 'source filters or sorts a collection');
  }
  if (/\b(?:readonly\s+)?\w+\s*:\s*[\w<>\s|]+\[\]\s*=\s*\[|\b(?:readonly\s+)?\w+\s*=\s*\[/.test(text)) {
    add('local-array', 'source declares local array data');
  }
  if (/\bexport\s+class\s+\w+/.test(text)) {
    add('exported-view-model-class', 'source exports a class view-model');
  }
  if (/&\s*debounce\b|setTimeout\s*\(/.test(text)) {
    add('debounce', 'source uses debounce behavior or timers');
  }
  if (isTemplateSource(normalizedLanguage, text) && /\|\s*\w+/.test(text)) {
    add('value-converter', 'template uses value converter pipe syntax');
  }
  if (isTemplateSource(normalizedLanguage, text) && /&\s*[\w-]+/.test(text)) {
    add('binding-behavior', 'template uses binding behavior syntax');
  }
  if (isTemplateSource(normalizedLanguage, text) && /&\s*debounce\b/.test(text)) {
    add('debounce-behavior', 'template delays updates with debounce binding behavior');
  }
  if (isTemplateSource(normalizedLanguage, text) && /&\s*throttle\b/.test(text)) {
    add('throttle-behavior', 'template limits update frequency with throttle binding behavior');
  }
  if (isTemplateSource(normalizedLanguage, text) && /&\s*updateTrigger\b/.test(text)) {
    add('update-trigger-behavior', 'template customizes input update events');
  }
  if (isTemplateSource(normalizedLanguage, text) && /&\s*signal\b/.test(text)) {
    add('signal-behavior', 'template refreshes bindings through a signal binding behavior');
  }
  if (isTemplateSource(normalizedLanguage, text) && /&\s*(?:oneTime|toView|fromView|twoWay)\b/.test(text)) {
    add('binding-mode-behavior', 'template overrides binding mode through a binding behavior');
  }
  if (isTemplateSource(normalizedLanguage, text) && /&\s*(?:self|attr)\b/.test(text)) {
    add('event-or-attribute-behavior', 'template uses event or attribute binding behavior');
  }
  if (/\bBindingBehavior\b|type:\s*['"]binding-behavior['"]/.test(text)) {
    add('custom-binding-behavior-class', 'source defines a custom binding behavior resource');
  }
  if (isTemplateSource(normalizedLanguage, text) && /\|\s*[\w-]+\s*:/.test(text)) {
    add('converter-parameter', 'template passes parameters to a value converter');
  }
  if (isTemplateSource(normalizedLanguage, text) && /\|\s*[\w-]+[^\r\n}"']*\|\s*[\w-]+/.test(text)) {
    add('converter-chaining', 'template chains multiple value converters');
  }
  if (/@valueConverter\b|\bValueConverter\.define\b|\bclass\s+\w+ValueConverter\b|\bclass\s+\w+Converter\b[\s\S]*\btoView\s*\(/.test(text)) {
    add('value-converter-class', 'source defines a value converter resource');
  }
  if (/\btoView\s*\(/.test(text)) {
    add('to-view-converter', 'source implements value converter toView');
  }
  if (/\bfromView\s*\(/.test(text)) {
    add('from-view-converter', 'source implements value converter fromView');
  }
  if (/\bwithContext\s*=\s*true|\bICallerContext\b/.test(text)) {
    add('context-aware-converter', 'source opts a value converter into caller context');
  }
  if (/\breadonly\s+signals\s*[?:=]|\bISignaler\b|\bdispatchSignal\s*\(/.test(text)) {
    add('signalable-converter', 'source uses value converter signal invalidation');
  }
  if (/\bprivate\s+cache\s*=\s*new\s+Map\b|\bMap<[^>]*>\s*\(\s*\)/.test(text)) {
    add('converter-cache', 'source caches value converter results');
  }
  if (/@aurelia\/i18n|\|\s*(?:t|nf|df|rt)\b/.test(text)) {
    add('i18n-plugin', 'source uses i18n-provided converters or binding behaviors');
  }
  if (/@aurelia\/dialog\b|\b(?:DialogConfigurationStandard|IDialogService|IDialogController|IDialogCustomElementViewModel)\b/.test(text)) {
    add('dialog-plugin', 'source uses Aurelia dialog package APIs');
  }
  if (/\b[A-Za-z0-9_-]+(?:,[A-Za-z0-9_-]+)*\.class\s*=/.test(text)) {
    add('class-toggle-binding', 'template toggles named CSS classes from state');
  }
  if (/\bclass\.bind\s*=/.test(text)) {
    add('class-binding', 'template binds a class string or class object');
  }
  if (/\b(?:[A-Za-z_-][\w-]*|--[\w-]+)\.style\s*=|\bstyle\.[A-Za-z_-][\w-]*\s*=/.test(text)) {
    add('style-property-binding', 'template binds an individual CSS property');
  }
  if (/\bstyle\.bind\s*=/.test(text)) {
    add('style-object-binding', 'template binds a style string or object');
  }
  if (
    /\b[A-Za-z0-9_-]+(?:,[A-Za-z0-9_-]+)*\.class\s*=/.test(text) ||
    /\bclass\.bind\s*=|\bstyle\.bind\s*=|class="\$\{/.test(text) ||
    /\b(?:[A-Za-z_-][\w-]*|--[\w-]+)\.style\s*=|\bstyle\.[A-Za-z_-][\w-]*\s*=/.test(text)
  ) {
    add('class-style-binding', 'template binds class or style state');
  }
  if (/\bawait\s+/.test(text)) {
    add('async-operation', 'source performs asynchronous work');
  }
  if (/\bfetch\s*\(/.test(text)) {
    add('fetch-call', 'source performs fetch work');
    add('async-fetch', 'source performs fetch work');
  }
  if (/\bdispatchEvent\s*\(\s*new\s+CustomEvent\b|new\s+CustomEvent\s*</.test(text)) {
    add('custom-event-dispatch', 'source dispatches a CustomEvent');
  }
  if (/\bnew\s+CustomEvent\b[\s\S]*\bdetail\s*:/.test(text)) {
    add('custom-event-detail', 'source includes a CustomEvent detail payload');
  }
  if (/\bnew\s+CustomEvent\b[\s\S]*\bbubbles\s*:\s*true/.test(text)) {
    add('bubbling-custom-event', 'source dispatches a bubbling CustomEvent');
  }
  if (/\bIHttpClient\b|@aurelia\/fetch-client/.test(text)) {
    add('http-client', 'source uses Aurelia fetch client APIs');
  }
  if (/\b(?:this\.)?\w*http\.(?:get|post|put|patch|delete|fetch)\s*\(/.test(text)) {
    add('http-request', 'source sends a request through an HTTP client');
  }
  if (/\bresponse\.ok\b|\bresponse\.status\b|\brejectErrorResponses\s*\(/.test(text)) {
    add('http-response-check', 'source checks or configures HTTP error responses');
  }
  if (/\bresponse\.json\s*\(/.test(text)) {
    add('json-response', 'source reads a JSON response body');
  }
  if (/\bconfigure\s*\(\s*\(?\s*config\s*\)?\s*=>|\bwithBaseUrl\s*\(|\bwithDefaults\s*\(/.test(text)) {
    add('http-client-configuration', 'source configures an HTTP client');
  }
  if (/\bwithInterceptor\s*\(|\bIFetchInterceptor\b|\binterceptor\b/i.test(text)) {
    add('http-interceptor', 'source uses HTTP client interceptors');
  }
  if (/\bwithRetry\s*\(|\bRetryStrategy\b|\bmaxRetries\b|\bbeforeRetry\b|\bdoRetry\b/i.test(text)) {
    add('http-retry', 'source configures HTTP retry behavior');
  }
  if (/\bCacheInterceptor\b|\bICacheService\b|\bcacheTime\b|\bbackground refresh\b/i.test(text)) {
    add('http-cache', 'source configures HTTP caching');
  }
  if (/\bAbortController\b|\babort\s*\(/.test(text)) {
    add('abort-controller', 'source handles request cancellation');
  }
  if (/\bisRequesting\b|\bactiveRequestCount\b|\bHttpClientEvent\b/.test(text)) {
    add('request-tracking', 'source observes global HTTP request activity');
  }
  if (/\bAuthorization\b|\bBearer\b|\brefreshToken\b|\bauth token\b/i.test(text)) {
    add('auth-interceptor', 'source handles authentication headers or token refresh');
  }
  if (/\b(?:created|binding|attached)\s*\([^)]*\)\s*[:\w\s<>\[\]|]*\{[\s\S]*\bawait\b/.test(text)) {
    add('component-load-lifecycle', 'component lifecycle loads asynchronous data');
  }
  if (/\bisLoading\b|\bloading\s*=\s*(?:true|false)/.test(text)) {
    add('loading-state', 'source tracks loading state');
  }
  if (/\berrorMessage\b|\brole=["']alert["']/.test(text)) {
    add('error-feedback', 'source exposes error feedback state');
  }
  if (/\blocalStorage\b|\bsessionStorage\b|IndexedDB\b|indexedDB\b/.test(text)) {
    add('browser-storage', 'source uses browser persistence APIs');
  }
  if (/\bisSubmitting\b|\bsuccessMessage\b|\berrorMessage\b|\bSubmissionState\b/.test(text)) {
    add('submission-state', 'source models form submission state');
  }
  if (/\bformData\b|\bform\s*=\s*\{/.test(text)) {
    add('form-object-state', 'source stores form fields in an object');
  }
  if (/\bresetForm\s*\(|\breset\s*\(\)\s*\{/.test(text)) {
    add('form-reset', 'source resets form state after submission');
  }
  if (/\bsuccessMessage\b|\berrorMessage\b|\brole=["'](?:status|alert)["']/.test(text)) {
    add('success-error-feedback', 'source or template exposes submit feedback state');
  }
  if (/\bpreventDefault\s*\(/.test(text)) {
    add('prevent-default', 'source prevents native submit default explicitly');
  }
  if (/\bautoSave\b|\bsaveTimer\b|AutoSave/.test(text)) {
    add('autosave', 'source implements autosave behavior');
  }
  if (/\brate\s*limit|RateLimited|cooldown/i.test(text)) {
    add('rate-limit', 'source implements submission rate limiting');
  }
  if (/\bmulti-step\b|\bwizard\b|currentStep\b/i.test(text)) {
    add('multi-step-form', 'source implements a multi-step form');
  }
  if (/\bdynamic\b|\baddField\b|\bremoveField\b/i.test(text)) {
    add('dynamic-form', 'source implements dynamic form fields');
  }
  if (/\btype=["']file["']|FileReader|FormData\b/.test(text)) {
    add('file-upload', 'source handles file input or upload data');
  }
  if (/\bRouterConfiguration\b/.test(text)) {
    add('router-configuration', 'source configures the Aurelia router');
  }
  if (/\b@route\b|\bstatic\s+routes\b|\broutes\s*:/.test(text)) {
    add('route-config', 'source declares route configuration');
  }
  if (/\bfallback\s*(?:\(|:)/.test(text)) {
    add('route-fallback', 'source configures route fallback behavior');
  }
  if (/\bIRouteViewModel\b|\bcanLoad\s*\(|\bloading\s*\(/.test(text)) {
    add('route-lifecycle', 'source implements router lifecycle hooks');
  }
  if (/\bcanLoad\s*\(/.test(text)) {
    add('can-load-hook', 'source implements canLoad route admission logic');
  }
  if (/\bcanUnload\s*\(/.test(text)) {
    add('can-unload-hook', 'source implements canUnload route exit logic');
  }
  if (/\bloading\s*\(/.test(text)) {
    add('loading-hook', 'source implements route loading setup');
  }
  if (/\bIRouteContext\b|resolve\s*\(\s*IRouteContext\s*\)/.test(text)) {
    add('route-context', 'source resolves or types the current route context');
  }
  if (/\bgetRouteParameters\s*(?:<|\()/.test(text)) {
    add('route-parameter-aggregation', 'source aggregates route parameters through IRouteContext.getRouteParameters');
  }
  if (/\bmergeStrategy\s*:\s*['"](?:child-first|parent-first|append|by-route)['"]/.test(text)) {
    add('route-parameter-merge-strategy', 'source chooses a route parameter merge strategy');
  }
  if (/\bincludeQueryParams\s*:\s*true\b/.test(text)) {
    add('route-query-parameters', 'source includes query parameters in route parameter reads');
  }
  if (/\brouter\.load\s*\([^)]*,\s*\{[\s\S]*\bcontext\s*:|\bcontext\s*:\s*(?:this\.)?\w+/.test(text)) {
    add('relative-route-navigation', 'source uses a route context for relative navigation');
  }
  if (/\bParams\b|\bparams\.|\bgetRouteParameters\s*(?:<|\()/.test(text)) {
    add('route-parameter', 'source reads route parameters');
  }
  if (isTemplateSource(normalizedLanguage, text) && /<au-viewport\b/i.test(text)) {
    add('route-viewport', 'template hosts routed content in an au-viewport');
  }
  if (isTemplateSource(normalizedLanguage, text) && /<a\b[^>]*\b(?:href(?:\.bind)?|load)=["'][^"']+["']/i.test(text)) {
    add('route-link', 'template declares router navigation links');
  }
  if (/\b(?:INavigationModel|INavigationRoute)\b|\bnavigationModel\b/.test(text)) {
    add('navigation-model', 'source reads or types the router navigation model');
  }
  if (isTemplateSource(normalizedLanguage, text) && /\bactive\.class\s*=/.test(text)) {
    add('active-class-binding', 'template binds active route state into a CSS class');
  }
  if (/\bactiveClass\s*:/.test(text)) {
    add('router-active-class', 'source configures the router active class');
  }
  if (/\bIRouterEvents\b|\bau:router:navigation-/.test(text)) {
    add('router-events', 'source subscribes to typed router events');
  }
  if (/\bNavigationStartEvent\b|au:router:navigation-start/.test(text)) {
    add('navigation-start-event', 'source handles router navigation start events');
  }
  if (/\bNavigationEndEvent\b|au:router:navigation-end/.test(text)) {
    add('navigation-end-event', 'source handles router navigation end events');
  }
  if (/\bNavigationCancelEvent\b|au:router:navigation-cancel/.test(text)) {
    add('navigation-cancel-event', 'source handles router navigation cancellation events');
  }
  if (/\bNavigationErrorEvent\b|au:router:navigation-error/.test(text)) {
    add('navigation-error-event', 'source handles router navigation error events');
  }
  if (/@aurelia\/router-direct\b/.test(text)) {
    add('router-direct', 'source depends on the permanently excluded router-direct package');
  }
  if (/@aurelia\/router(?:-direct)?\b|\bIRouter\b|\brouter\.load\b|\bload\s*\(/.test(text)) {
    add('router', 'source depends on router APIs or router loading');
  }
  if (/\b@aurelia\/state\b|StateDefaultConfiguration|\bdispatch\s*\(/.test(text)) {
    add('state-plugin', 'source depends on the Aurelia state plugin');
  }
  if (/\b@aurelia\/store\b|\bStoreConfiguration\b|\bIStore\b|\bdispatchify\b/.test(text)) {
    add('store-plugin', 'source depends on the Aurelia store plugin');
  }
  if (/\b@aurelia\/validation|ValidationController|validation-errors|&\s*validate\b/.test(text)) {
    add('validation-plugin', 'source depends on validation plugin APIs');
  }
  if (/\b(?:attached|detaching|unbinding)\s*\(/.test(text)) {
    add('lifecycle-cleanup', 'source uses lifecycle setup or cleanup');
  }
  if (/document\?\?\.addEventListener|document\.addEventListener|window\.addEventListener/.test(text)) {
    add('global-listener', 'source registers a global listener');
  }
  if (/innerhtml\.bind\s*=/.test(text)) {
    add('innerhtml', 'template binds innerhtml');
  }
  if (/new\s+Set\s*</.test(text) || /\bSet<.+>/.test(text)) {
    add('batch-selection', 'source uses a Set, often for selection state');
  }
  if (/\bcurrentPage\b|\bpageSize\b|\btotalPages\b|\bpaginated\w*\b/.test(text)) {
    add('pagination', 'source carries pagination state');
  }
  if (/virtual-repeat\.for/.test(text)) {
    add('virtual-repeat', 'template uses virtual repeat');
  }
  if (/\bIRepeatableHandler\b|CollectionObserver|ICollectionObserver/.test(text)) {
    add('custom-repeat-handler', 'source customizes repeat collection handling');
  }
  if (/\b(?:ref|component\.ref|custom-attribute\.ref|controller\.ref)\s*=/.test(text)) {
    add('template-ref', 'template uses a ref binding');
  }
  if (/\bcomponent\.ref\s*=/.test(text)) {
    add('component-ref', 'template references a custom element view model');
  }
  if (/\bcustom-attribute\.ref\s*=/.test(text)) {
    add('custom-attribute-ref', 'template references a custom attribute view model');
  }
  if (/\bcontroller\.ref\s*=/.test(text)) {
    add('controller-ref', 'template references an Aurelia controller');
  }
  if (hasDiSignals(text)) {
    add('dependency-injection', 'source uses Aurelia DI APIs');
  }
  if (normalizedLanguage === 'css' || normalizedLanguage === 'scss') {
    add('style-source', 'source unit is stylesheet support');
  }

  return Array.from(signals.values()).sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeLanguage(language: string): string {
  const normalized = language.trim().toLowerCase();
  if (normalized === 'ts') {
    return 'typescript';
  }
  if (normalized === 'js') {
    return 'javascript';
  }
  if (normalized === 'sh' || normalized === 'shell') {
    return 'bash';
  }
  return normalized;
}

function isTemplateSource(language: string, text: string): boolean {
  return language === 'html' || (/<[A-Za-z][^>]*>/.test(text) && /(?:\.bind|\.trigger|repeat\.for|\$\{)/.test(text));
}

function hasDiSignals(text: string): boolean {
  return /(?<!\.)\bresolve\s*\(|\b@inject\b|\bIContainer\b|\bRegistration\.|\bDI\./.test(text);
}

function hasRouteSignals(text: string): boolean {
  return /\bRouterConfiguration\b|\bIRouteViewModel\b|\bIRouteContext\b|\bgetRouteParameters\s*\(|\bcanLoad\s*\(|\bcanUnload\s*\(|\bloading\s*\(|\bfallback\s*(?:\(|:)|\broutes\s*=|\b@route\b/.test(text);
}

function hasBootstrapSignals(text: string): boolean {
  return /\bAurelia\s*(?:\.register|\.app)|\bstart\s*\(|\benhance\s*\(/.test(text);
}

function hasTestSignals(text: string): boolean {
  return /\b(?:describe|it|expect|createFixture)\s*\(/.test(text);
}
