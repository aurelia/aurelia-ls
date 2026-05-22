import type { AuthoringRecipeKey } from '../authoring/recipe.js';
import type {
  SemanticAuthoringGuidanceDecisionRow,
  SemanticAuthoringGuidanceFocus,
  SemanticAuthoringGuidanceFollowUpRow,
  SemanticAuthoringGuidancePlanningLayer,
  SemanticAuthoringGuidancePrincipleRow,
} from './contracts.js';

export const guidanceRecipeKeysByFocus = {
  'app-shell': [
    'convention-minimal-app',
    'minimal-app',
    'routed-app-shell',
    'state-backed-form',
  ],
  forms: [
    'state-backed-form',
    'service-backed-form',
    'validated-state-backed-form',
    'localized-state-backed-form',
    'localized-validated-state-backed-form',
    'multi-step-state-backed-form',
    'searchable-data-table',
    'routed-searchable-data-table',
    'routed-state-backed-form',
    'routed-validated-state-backed-form',
    'routed-service-backed-form',
    'routed-service-validated-state-backed-form',
    'routed-localized-validated-state-backed-form',
  ],
  state: [
    'state-backed-form',
    'multi-step-state-backed-form',
    'service-backed-form',
    'routed-service-backed-form',
    'routed-service-validated-state-backed-form',
    'searchable-data-table',
    'routed-searchable-data-table',
    'catalog-storefront',
    'state-store-list',
  ],
  routing: [
    'routed-app-shell',
    'routed-state-backed-form',
    'routed-validated-state-backed-form',
    'routed-service-backed-form',
    'routed-service-validated-state-backed-form',
    'routed-localized-validated-state-backed-form',
    'routed-catalog-storefront',
    'routed-searchable-data-table',
    'catalog-storefront',
  ],
  plugins: [
    'state-store-list',
    'localized-validated-state-backed-form',
    'routed-localized-validated-state-backed-form',
    'localized-state-backed-form',
    'validated-state-backed-form',
    'routed-service-validated-state-backed-form',
    'routed-validated-state-backed-form',
  ],
  composition: [
    'composed-dashboard',
    'catalog-storefront',
  ],
  diagnostics: [
    'routed-app-shell',
    'state-backed-form',
    'validated-state-backed-form',
    'multi-step-state-backed-form',
    'routed-state-backed-form',
    'routed-validated-state-backed-form',
    'routed-service-validated-state-backed-form',
    'catalog-storefront',
    'routed-catalog-storefront',
    'searchable-data-table',
    'routed-searchable-data-table',
  ],
  'app-building': [
    'state-backed-form',
    'searchable-data-table',
    'routed-app-shell',
    'routed-searchable-data-table',
    'routed-service-backed-form',
    'routed-service-validated-state-backed-form',
    'routed-catalog-storefront',
    'routed-localized-validated-state-backed-form',
    'multi-step-state-backed-form',
    'service-backed-form',
    'catalog-storefront',
    'composed-dashboard',
    'routed-state-backed-form',
    'routed-validated-state-backed-form',
    'localized-state-backed-form',
    'validated-state-backed-form',
    'localized-validated-state-backed-form',
    'state-store-list',
    'convention-minimal-app',
    'minimal-app',
  ],
} as const satisfies Record<SemanticAuthoringGuidanceFocus, readonly AuthoringRecipeKey[]>;

export interface GuidanceFeatureSignalDefinition {
  readonly key: string;
  /** Planning layer separates feature surfaces from architecture/framework choices so mixed goals can compose recipes deliberately. */
  readonly planningLayer: SemanticAuthoringGuidancePlanningLayer;
  /** Exact user-goal words or short phrases that activate this authored signal. */
  readonly terms: readonly string[];
  /** Deterministic non-contiguous token sets for common authored intent such as "editable product fields". */
  readonly tokenCombos?: readonly GuidanceFeatureSignalTokenCombo[];
  /** Signal strength for mixed recipe choreography; recipe ranking sums covered weights after breadth checks. */
  readonly primaryWeight: number;
  /** Recipes whose source plans and expected effects directly cover the signal. */
  readonly recipeKeys: readonly AuthoringRecipeKey[];
  /** Decision rows that should stay visible when this signal appears in a feature goal. */
  readonly decisionKeys?: readonly string[];
  /** Principle rows that should stay visible when this signal appears in a feature goal. */
  readonly principleKeys?: readonly string[];
}

export interface GuidanceFeatureSignalTokenCombo {
  readonly label: string;
  readonly tokens: readonly string[];
}

export const guidanceFeatureSignals: readonly GuidanceFeatureSignalDefinition[] = [
  {
    // Navigation-frame intent: route config, route params, links, and viewport layout.
    key: 'routing',
    planningLayer: 'navigation-frame',
    terms: [
      'route',
      'routes',
      'routed',
      'router',
      'routing',
      'navigation',
      'viewport',
      'params',
      'route params',
      'route parameter',
      'route parameters',
      'parameterized',
    ],
    primaryWeight: 20,
    recipeKeys: [
      'routed-app-shell',
      'routed-state-backed-form',
      'routed-validated-state-backed-form',
      'routed-service-backed-form',
      'routed-service-validated-state-backed-form',
      'routed-localized-validated-state-backed-form',
      'routed-catalog-storefront',
      'routed-searchable-data-table',
    ],
    decisionKeys: ['route-selected-state', 'component-handoff', 'active-navigation-styling'],
    principleKeys: ['route-selected-state'],
  },
  {
    // Sectioned navigation intent: tabbed/settings areas and section shells that need navigation structure
    // before the individual feature recipes own their forms, tables, or state.
    key: 'sectioned-navigation',
    planningLayer: 'navigation-frame',
    terms: [
      'tabs',
      'tabbed',
      'tabbed area',
      'tabbed settings',
      'settings area',
      'sectioned area',
      'sectioned navigation',
      'section navigation',
      'section tabs',
      'sections',
    ],
    tokenCombos: [
      { label: 'settings+tabs', tokens: ['settings', 'tabs'] },
      { label: 'area+tabs', tokens: ['area', 'tabs'] },
      { label: 'area+sections', tokens: ['area', 'sections'] },
    ],
    primaryWeight: 18,
    recipeKeys: [
      'routed-app-shell',
    ],
    decisionKeys: ['route-selected-state', 'active-navigation-styling', 'component-handoff'],
    principleKeys: ['route-selected-state'],
  },
  {
    // Collection-management surface: search/filter/sort/table/list features, not generic layout grids.
    // This stays coarse until a docs/test-grounded simple collection recipe exists.
    key: 'searchable-list',
    planningLayer: 'feature-surface',
    terms: ['search', 'searchable', 'filter', 'filters', 'filterable', 'sort', 'sortable', 'table', 'data grid', 'user grid', 'record grid', 'records grid', 'item grid', 'items grid', 'list', 'directory'],
    primaryWeight: 35,
    recipeKeys: [
      'searchable-data-table',
      'routed-searchable-data-table',
      'catalog-storefront',
      'routed-catalog-storefront',
    ],
    decisionKeys: ['template-model-access', 'derived-getter-observation', 'form-value-channel'],
  },
  {
    // Data-entry surface: native form controls and editable domain fields without implying service integration.
    key: 'form-entry',
    planningLayer: 'feature-surface',
    terms: [
      'form',
      'edit form',
      'edit forms',
      'edit page',
      'edit screen',
      'edit view',
      'create form',
      'create forms',
      'data entry',
      'form field',
      'form fields',
      'input field',
      'input fields',
      'field label',
      'field labels',
      'text input',
      'select field',
      'select fields',
      'select input',
      'select inputs',
      'dropdown field',
      'dropdown fields',
      'checkbox field',
      'checkbox fields',
      'radio field',
      'radio fields',
      'toggle field',
      'toggle fields',
      'switch field',
      'switch fields',
      'settings form',
      'settings fields',
      'editable settings',
      'preferences',
      'preference screen',
      'account settings',
      'api key',
      'api keys',
      'contact method',
      'preferred contact method',
      'profile editor',
      'profile fields',
      'editable profile',
      'editable fields',
      'edit profile',
      'contact profile',
      'onboarding flow',
      'wizard flow',
      'shipping address',
      'billing address',
      'payment options',
      'signup',
      'sign up',
      'registration',
      'password',
    ],
    tokenCombos: [
      { label: 'editable+field', tokens: ['editable', 'field'] },
      { label: 'editable+fields', tokens: ['editable', 'fields'] },
      { label: 'edit+field', tokens: ['edit', 'field'] },
      { label: 'edit+fields', tokens: ['edit', 'fields'] },
      { label: 'edit+detail', tokens: ['edit', 'detail'] },
      { label: 'edit+details', tokens: ['edit', 'details'] },
      { label: 'edit+forms', tokens: ['edit', 'forms'] },
      { label: 'create+forms', tokens: ['create', 'forms'] },
      { label: 'editing+field', tokens: ['editing', 'field'] },
      { label: 'editing+fields', tokens: ['editing', 'fields'] },
      { label: 'editor+validation', tokens: ['editor', 'validation'] },
      { label: 'editor+validated', tokens: ['editor', 'validated'] },
      { label: 'editor+errors', tokens: ['editor', 'errors'] },
      { label: 'editor+select', tokens: ['editor', 'select'] },
      { label: 'editor+toggle', tokens: ['editor', 'toggle'] },
      { label: 'editor+number', tokens: ['editor', 'number'] },
      { label: 'editor+date', tokens: ['editor', 'date'] },
      { label: 'editable+detail', tokens: ['editable', 'detail'] },
      { label: 'editable+details', tokens: ['editable', 'details'] },
    ],
    primaryWeight: 25,
    recipeKeys: [
      'state-backed-form',
      'service-backed-form',
      'validated-state-backed-form',
      'localized-state-backed-form',
      'localized-validated-state-backed-form',
      'multi-step-state-backed-form',
      'routed-state-backed-form',
      'routed-validated-state-backed-form',
      'routed-service-backed-form',
      'routed-service-validated-state-backed-form',
      'routed-localized-validated-state-backed-form',
    ],
    decisionKeys: ['state-boundary', 'template-model-access', 'form-value-channel'],
    principleKeys: ['state-and-domain-first', 'observation-enables-less-code', 'forms-use-framework-value-channels'],
  },
  {
    // Wizard/progression surface: multi-step form flow that can borrow routing/catalog only when separately requested.
    key: 'multi-step-form',
    planningLayer: 'feature-surface',
    terms: ['multi step', 'wizard', 'wizard form', 'stepper', 'form steps', 'step form', 'onboarding flow', 'review step', 'checkout flow'],
    primaryWeight: 45,
    recipeKeys: ['multi-step-state-backed-form'],
    decisionKeys: ['state-boundary', 'template-model-access', 'form-value-channel'],
    principleKeys: ['state-and-domain-first', 'observation-enables-less-code', 'forms-use-framework-value-channels'],
  },
  {
    // Plugin capability: translated UI text/resources, not generic label/message wording.
    key: 'localization',
    planningLayer: 'framework-capability',
    terms: ['localized', 'localization', 'i18n', 'translation', 'translated', 'translations', 'translated labels', 'localized labels'],
    primaryWeight: 10,
    recipeKeys: [
      'localized-state-backed-form',
      'localized-validated-state-backed-form',
      'routed-localized-validated-state-backed-form',
    ],
    decisionKeys: ['form-value-channel', 'template-model-access'],
  },
  {
    // Plugin capability: validation ownership/presentation, not every error-message surface.
    key: 'validation',
    planningLayer: 'framework-capability',
    terms: ['validate', 'validation', 'validated', 'validation errors', 'validation messages', 'error messages', 'field errors', 'form errors'],
    primaryWeight: 10,
    recipeKeys: [
      'validated-state-backed-form',
      'localized-validated-state-backed-form',
      'routed-validated-state-backed-form',
      'routed-service-validated-state-backed-form',
      'routed-localized-validated-state-backed-form',
      'multi-step-state-backed-form',
    ],
    decisionKeys: ['form-value-channel', 'type-repair-routing'],
  },
  {
    // Integration boundary: service/API/loading/repository-pattern language, not domain nouns containing "service".
    key: 'service-boundary',
    planningLayer: 'integration-boundary',
    // Keep plain submit/save button language on the form lane; service-boundary needs integration wording.
    terms: ['service-backed', 'service layer', 'service class', 'service boundary', 'service boundaries', 'load data', 'loading data', 'data loading', 'api backed', 'api backed data', 'api backed load', 'api backed loading', 'api service', 'api client', 'api call', 'api calls', 'backend api', 'http', 'repository pattern', 'repository class', 'data repository', 'autosave service', 'auto save service'],
    tokenCombos: [
      { label: 'service+loading', tokens: ['service', 'loading'] },
      { label: 'service+load', tokens: ['service', 'load'] },
      { label: 'service+loads', tokens: ['service', 'loads'] },
      { label: 'api+backed', tokens: ['api', 'backed'] },
      { label: 'api+loading', tokens: ['api', 'loading'] },
      { label: 'autosave+service', tokens: ['autosave', 'service'] },
      { label: 'auto+save+service', tokens: ['auto', 'save', 'service'] },
    ],
    primaryWeight: 15,
    recipeKeys: [
      'service-backed-form',
      'routed-service-backed-form',
      'routed-service-validated-state-backed-form',
      'catalog-storefront',
      'routed-catalog-storefront',
      'searchable-data-table',
      'routed-searchable-data-table',
    ],
    decisionKeys: ['state-boundary', 'listener-action-boundary'],
  },
  {
    // Integration boundary: write/save/persist wording should be owned by service-backed form patterns,
    // not treated as already covered by a list recipe's service-backed loading boundary.
    key: 'service-write-boundary',
    planningLayer: 'integration-boundary',
    terms: ['api backed save', 'save through api', 'save to api', 'saves through api', 'save data through api', 'save data through an api', 'saves data through api', 'saves data through an api', 'save through api service', 'saves through api service', 'persist through api', 'backend save', 'backend submit', 'autosave', 'auto save', 'autosaves', 'autosaving'],
    tokenCombos: [
      { label: 'api+backed+save', tokens: ['api', 'backed', 'save'] },
      { label: 'api+backed+submit', tokens: ['api', 'backed', 'submit'] },
      { label: 'api+backed+persist', tokens: ['api', 'backed', 'persist'] },
      { label: 'backend+save', tokens: ['backend', 'save'] },
      { label: 'backend+submit', tokens: ['backend', 'submit'] },
      { label: 'autosave+service', tokens: ['autosave', 'service'] },
      { label: 'auto+save+service', tokens: ['auto', 'save', 'service'] },
    ],
    primaryWeight: 18,
    recipeKeys: [
      'service-backed-form',
      'routed-service-backed-form',
      'routed-service-validated-state-backed-form',
    ],
    decisionKeys: ['state-boundary', 'listener-action-boundary'],
  },
  {
    // Catalog/storefront surface: product list/card/detail/cart intent, not every domain object named product.
    key: 'catalog-product',
    planningLayer: 'feature-surface',
    terms: ['storefront', 'product catalog', 'product list', 'product lists', 'product table', 'product grid', 'product card', 'product cards', 'product detail', 'product details', 'product tier', 'product tiers', 'pricing tier', 'pricing tiers', 'pricing page', 'selected product', 'cart', 'checkout'],
    tokenCombos: [
      { label: 'product+catalog', tokens: ['product', 'catalog'] },
      { label: 'products+catalog', tokens: ['products', 'catalog'] },
      { label: 'item+catalog', tokens: ['item', 'catalog'] },
      { label: 'items+catalog', tokens: ['items', 'catalog'] },
      { label: 'pricing+catalog', tokens: ['pricing', 'catalog'] },
      { label: 'tier+catalog', tokens: ['tier', 'catalog'] },
      { label: 'tiers+catalog', tokens: ['tiers', 'catalog'] },
      { label: 'catalog+cards', tokens: ['catalog', 'cards'] },
    ],
    primaryWeight: 40,
    recipeKeys: [
      'catalog-storefront',
      'routed-catalog-storefront',
    ],
  },
  {
    // Dynamic composition surface: compose/widget language, not bare dashboard layout.
    key: 'composition',
    planningLayer: 'feature-surface',
    // Bare dashboard requests are ordinary app surfaces; dynamic composition needs compose/widget wording.
    terms: ['compose', 'composition', 'composed dashboard', 'dynamic dashboard', 'widget dashboard', 'widget', 'widgets'],
    primaryWeight: 35,
    recipeKeys: [
      'composed-dashboard',
    ],
  },
  {
    // Architecture choice: explicit @aurelia/state/store-backed-state, not ordinary DI-owned app state.
    key: 'state-plugin',
    planningLayer: 'architecture-choice',
    terms: ['@aurelia/state', 'state store', 'state-store', 'store-backed state'],
    primaryWeight: 35,
    recipeKeys: [
      'state-store-list',
    ],
  },
  {
    // App shell intent: starter/minimal/convention shell before a richer feature surface is known.
    key: 'app-shell',
    planningLayer: 'app-shell',
    terms: ['minimal', 'shell', 'scaffold', 'starter', 'convention'],
    primaryWeight: 5,
    recipeKeys: [
      'convention-minimal-app',
      'minimal-app',
      'routed-app-shell',
    ],
  },
];

export const guidanceRecipeSpecializationSignalKeysByRecipe: Partial<Record<AuthoringRecipeKey, readonly string[]>> = {
  // Specialization signals are used to keep compact feature-goal comparisons from inviting larger scaffolds
  // unless the caller asked for the corresponding surface/capability. Include all feature surfaces a recipe brings.
  'routed-app-shell': ['routing'],
  'state-backed-form': ['form-entry'],
  'validated-state-backed-form': ['form-entry', 'validation'],
  'localized-state-backed-form': ['form-entry', 'localization'],
  'localized-validated-state-backed-form': ['form-entry', 'localization', 'validation'],
  'multi-step-state-backed-form': ['form-entry', 'multi-step-form'],
  'service-backed-form': ['form-entry', 'service-boundary', 'service-write-boundary'],
  'routed-state-backed-form': ['routing', 'form-entry'],
  'routed-validated-state-backed-form': ['routing', 'form-entry', 'validation'],
  'routed-service-backed-form': ['routing', 'form-entry', 'service-boundary', 'service-write-boundary'],
  'routed-service-validated-state-backed-form': ['routing', 'form-entry', 'validation', 'service-boundary', 'service-write-boundary'],
  'routed-localized-validated-state-backed-form': ['routing', 'form-entry', 'localization', 'validation'],
  'catalog-storefront': ['catalog-product'],
  'routed-catalog-storefront': ['routing', 'catalog-product'],
  'searchable-data-table': ['searchable-list'],
  'routed-searchable-data-table': ['routing', 'searchable-list'],
  'composed-dashboard': ['composition'],
  'state-store-list': ['state-plugin'],
} as const;

export const recipeGuidanceByKey = {
  'minimal-app': {
    whenToUse: 'Use when a caller needs the smallest explicit Aurelia app shell before introducing domain state.',
    codeShape: 'Entrypoint, root component, external template, package/typecheck baseline, and explicit resource declaration.',
    prefer: [
      'Keep the root component small and let the next recipe introduce state or routing.',
      'Use explicit Aurelia startup/configuration instead of framework-agnostic SPA scaffolding.',
    ],
    avoid: [
      'Do not hide build-tool or package-manager choices inside semantic-runtime until a host policy selects them.',
    ],
  },
  'convention-minimal-app': {
    whenToUse: 'Use when the caller wants the smallest public-scaffold-like app shell and the project can use Aurelia source/template conventions.',
    codeShape: 'Entrypoint, root class, sibling convention template file, package/typecheck baseline, and convention-derived custom-element metadata.',
    prefer: [
      'Use file/class/template names that the convention recognizer can prove instead of adding a decorator only for metadata.',
      'Keep the convention lane small until the app introduces state, routing, forms, or plugin configuration.',
    ],
    avoid: [
      'Do not use convention output when the component name, template path, or project tooling cannot make discovery explicit.',
      'Do not confuse the current legacy convention rules with an unspecified future convention system.',
    ],
  },
  'routed-app-shell': {
    whenToUse: 'Use when a feature needs routing, route params, static navigation, and viewport layout without importing a form, catalog, or data-table domain model.',
    codeShape: 'Aurelia entrypoint with RouterConfiguration, root @route config, named au-viewport, static load links, and small routeable components that read params/query values through IRouteContext.',
    prefer: [
      'Use this as the routing companion pattern for dashboards or other features whose main surface is not itself a route recipe.',
      'Keep selected identity in route params/query/fragment when navigation owns it, while the main feature recipe owns domain state.',
      'Use router activeClass for class-only active-link styling before adding view-model route-active state.',
    ],
    avoid: [
      'Do not borrow data-table, catalog, or form files just to get a route shell.',
      'Do not hide dynamic router uncertainty behind component-local state.',
    ],
  },
  'state-backed-form': {
    whenToUse: 'Use for ordinary data-entry flows whose durable state belongs in an injectable app state class.',
    codeShape: 'DI-owned draft/domain state owns field bindings; use a scalar selection id only when the caller supplied an existing-record boundary.',
    prefer: [
      'Bind controls to `request.*` or `state.*` members when that is the real domain surface.',
      'Use native value, checked, select, nullable option, and custom matcher channels deliberately.',
    ],
    avoid: [
      'Do not add per-field view-model forwarding getters merely to shorten template expressions.',
      'Do not add `@computed` to make an ordinary getter observable.',
    ],
  },
  'localized-state-backed-form': {
    whenToUse: 'Use when the form shape also needs static translation resources and i18n template bindings.',
    codeShape: 'State-backed form plus i18n plugin configuration, translation catalog resources, `t` attributes, and `t-params.bind` rows.',
    prefer: [
      'Keep localization as plugin admission plus translation resources, not ad hoc string helpers.',
      'Verify translation keys separately from rendered translation binding rows.',
    ],
    avoid: [
      'Do not treat missing translation rows as generic template binding failures.',
    ],
  },
  'validated-state-backed-form': {
    whenToUse: 'Use when form validation belongs in the Aurelia validation plugin rather than manual view-model checks.',
    codeShape: 'State-backed form plus validation-html configuration, domain-model validation rules, validation controller usage, `& validate` bindings, validation-errors targets, and direct error-array field presentation.',
    prefer: [
      'Attach validation rules to the domain model that the controls edit.',
      'Bind validation presentation directly from validation error arrays when no extra view-model adaptation is needed.',
      'Use validation behavior rows to prove trigger and controller ownership.',
    ],
    avoid: [
      'Do not recreate plugin validation as local boolean flags unless the app intentionally chooses manual validation.',
    ],
  },
  'localized-validated-state-backed-form': {
    whenToUse: 'Use when a form should combine translated UI text with framework-owned validation on the same DI-owned state model.',
    codeShape: 'State-backed form plus i18n configuration, static translation resources, validation-html configuration, domain-model validation rules, translated labels, validate bindings, validation-errors targets, and direct error-array field presentation.',
    prefer: [
      'Keep localization and validation as plugin admission plus domain-form facts rather than scattered string and boolean helpers.',
      'Use one source-backed form state boundary while the template applies both `t`/`t-params.bind` and `& validate` where each belongs.',
    ],
    avoid: [
      'Do not split translation and validation into unrelated components when the user-facing form feature needs both.',
      'Do not hand-roll validation messages as plain conditional text when validation-html owns the interaction.',
    ],
  },
  'multi-step-state-backed-form': {
    whenToUse: 'Use when a longer form needs wizard-style progression, validation, and progress presentation without turning every field into a view-model facade.',
    codeShape: 'DI-owned wizard state, composed profile domain object, repeated step model, conditional step sections, validation-html usage, native value/checked/select bindings, error-array field presentation, and class/style progress channels.',
    prefer: [
      'Keep step, progress, and readiness behavior on state/domain classes when that is the durable model.',
      'Use repeat/if controllers plus class/style bindings for progress UI instead of hand-rolled DOM synchronization.',
      'Let the template bind directly to `state.profile.*` when the wizard component has no meaningful adaptation to add.',
    ],
    avoid: [
      'Do not create one forwarding getter per wizard field merely to shorten `state.profile.*` bindings.',
      'Do not replace checked/select/validation semantics with manual synchronization just because the form spans steps.',
    ],
  },
  'service-backed-form': {
    whenToUse: 'Use when loading or submitting form state crosses a service/repository/use-case boundary.',
    codeShape: 'DI-owned state owns the service dependency; the component resolves state; the template binds to domain objects and calls state methods rather than service facades.',
    prefer: [
      'Keep background loading and submission behind state/service methods that listener bindings can call directly when no view-model adaptation is needed.',
      'Let topology service-interaction rows prove template-to-state and state-to-service handoff.',
    ],
    avoid: [
      'Do not expose services directly to templates when a state/domain boundary can keep the view clean.',
    ],
  },
  'routed-state-backed-form': {
    whenToUse: 'Use for common routed forms where route params select state and links should be statically understandable.',
    codeShape: 'Router admission, parameterized route config, named viewport layout, route-context parameter reads, and a state-backed form component.',
    prefer: [
      'Carry selected identity through route params when navigation owns the selection.',
      'Use router overview and route expected effects to verify params, query values, fragments, and viewport targets.',
    ],
    avoid: [
      'Do not model every ViewportAgent edge case before offering common route authoring guidance.',
    ],
  },
  'routed-validated-state-backed-form': {
    whenToUse: 'Use when a route-owned edit/create form needs framework-owned validation without also introducing localization or service loading.',
    codeShape: 'Routed state-backed form plus validation-html configuration, domain validation rules, route param selection, validate bindings, validation-errors targets, and direct error-array field presentation.',
    prefer: [
      'Let route params own selected identity while validation-html owns field validation and error presentation.',
      'Keep validation as a framework/plugin fact over the same route-selected domain object instead of adding per-field forwarding helpers.',
    ],
    avoid: [
      'Do not borrow a non-routed validation recipe when one routed validated form source plan can keep the route and validation contracts aligned.',
      'Do not add localization just to get routed validation when the caller did not ask for translated UI.',
    ],
  },
  'routed-service-backed-form': {
    whenToUse: 'Use when route params select a form record and durable loading/submission should stay behind a state-owned service boundary.',
    codeShape: 'Router admission, parameterized route config, route-context parameter reads, DI-owned state, injected request service, background load, direct submit listener calls, and template-local request bindings.',
    prefer: [
      'Let the route own selected identity while state owns loading, caching, and submission side effects.',
      'Keep the form component bound to route-selected scalar identity and call state methods directly from listener bindings when no extra presentation adaptation is needed.',
    ],
    avoid: [
      'Do not expose the service directly to the template or make the route component forward every field.',
      'Do not split route selection and service-backed state into unrelated examples when the app feature needs both.',
    ],
  },
  'routed-service-validated-state-backed-form': {
    whenToUse: 'Use when a route-owned edit/create form needs both service-backed loading/submission and framework-owned validation.',
    codeShape: 'Router admission, route-context parameter reads, DI-owned state, injected request service, background load, submit listener calls, validation-html configuration, domain rules, validate bindings, and validation-errors targets over the same route-selected request.',
    prefer: [
      'Keep the service boundary, route-selected identity, and validation controller aligned around one request state model.',
      'Call state-owned load/submit methods from route lifecycle and listener bindings while validation-html owns field validity and error presentation.',
    ],
    avoid: [
      'Do not ask an MCP client to merge separate service and validation form scaffolds when one recipe can carry both concerns.',
      'Do not add localization just to combine route-owned service loading with validation.',
    ],
  },
  'routed-localized-validated-state-backed-form': {
    whenToUse: 'Use when a route-owned edit/create form needs translated UI text and framework-owned validation over route-selected state.',
    codeShape: 'Routed state-backed form plus i18n configuration, static translation resources, validation-html configuration, domain validation rules, route param selection, translated labels, validate bindings, validation-errors targets, and direct error-array field presentation.',
    prefer: [
      'Let route params own selected identity while the form component still binds directly to the route-selected request object.',
      'Keep router, i18n, and validation as framework/plugin facts rather than duplicating them as view-model helper state.',
    ],
    avoid: [
      'Do not split route selection, translations, and validation into unrelated examples when the user-facing feature combines them.',
      'Do not make the view-model forward every form field just because several framework plugins are involved.',
    ],
  },
  'catalog-storefront': {
    whenToUse: 'Use for a larger app slice with lists, filter controls, detail views, composed DI state, service-backed loading, and presentational state.',
    codeShape: 'DI-owned composed state, a catalog service, direct search/checked/select filter bindings, local object component handoff, direct state/domain template reads, control-flow controllers, class/style bindings, and getter observation.',
    prefer: [
      'Pass typed objects across local leaf-like component boundaries when that removes redundant lookup code.',
      'Bind filter controls directly to nested catalog state rather than adding view-model forwarding properties.',
      'Use plain domain/state getters for real derived behavior and let ComputedObserver source rows prove observation.',
      'Verify class/style, promise, switch, repeat, and service-interaction facts through expected effects.',
    ],
    avoid: [
      'Do not turn scalar IDs into dogma when a local typed object boundary is clearer.',
      'Do not use callback bindables as a default app-composition pattern.',
    ],
  },
  'routed-catalog-storefront': {
    whenToUse: 'Use for a larger routed app slice where list/detail navigation, route params, DI-owned state, and service-backed loading should be planned together.',
    codeShape: 'Router admission, catalog list/detail routes, root static detail navigation, data-driven card links, route-parameter selected state, DI-owned composed catalog state, service-backed loading, direct filter controls, and local object card handoff.',
    prefer: [
      'Use route params when navigation owns selected item identity; make routed child links root-relative or parent-relative deliberately when they leave the local route context.',
      'Keep item lookup in the route/state boundary, while local list/card composition can pass typed catalog objects directly.',
      'Verify route config, recognized route params, route nodes, viewport instructions, and catalog binding facts through expected effects.',
    ],
    avoid: [
      'Do not split routing and domain state into unrelated examples when the app feature needs both.',
      'Do not hide dynamic route uncertainty behind hard-coded component state.',
    ],
  },
  'searchable-data-table': {
    whenToUse: 'Use for searchable, filterable, sortable list surfaces where the user needs clean control bindings and derived table state without view-model forwarding boilerplate.',
    codeShape: 'DI-owned composed table state, service-backed loading, direct state/domain template bindings, native value/select/checked channels, debounce, keyed repeats, and getter-observed filter/sort/page projections.',
    prefer: [
      'Bind search, filters, selection, and pagination directly to the state object when those are the real app surfaces.',
      'Use checked/model and option model bindings instead of hand-written synchronization code for ordinary native controls.',
      'Keep table sorting and paging as source-backed state methods/getters so the template stays declarative without losing type information.',
    ],
    avoid: [
      'Do not add view-model getters whose only job is shortening `state.filters.*` or `state.pageUsers` paths.',
      'Do not replace framework value channels with manual DOM event plumbing unless an external widget boundary requires it.',
    ],
  },
  'routed-searchable-data-table': {
    whenToUse: 'Use for route-owned list/detail management features where a searchable table and a detail profile should share DI-owned state and service-backed loading.',
    codeShape: 'Router admission, list/detail routes, route-context parameter reads, static profile navigation, data-driven row links, DI-owned composed table state, native table controls, and getter-observed list projections.',
    prefer: [
      'Let the route own selected identity while the table state owns loading, filtering, sorting, pagination, and selection.',
      'Bind table controls directly to `state.*` and row cells directly to `user.*` instead of adding forwarding accessors.',
      'Use row-level `load.bind` route links when navigation owns the detail boundary.',
    ],
    avoid: [
      'Do not split list search state and detail route state into unrelated examples when the feature is one management surface.',
      'Do not make the route detail component duplicate table filtering or service loading logic.',
    ],
  },
  'composed-dashboard': {
    whenToUse: 'Use when the app genuinely needs dynamic component composition rather than ordinary route or template-controller structure.',
    codeShape: 'DI-owned widget state, repeated dashboard cards, typed component candidates, `<au-compose component.bind model.bind>` handoff, direct activated-model reads, and real derived getters.',
    prefer: [
      'Keep dynamic composition typed enough for candidate/template resolution and activation model handoff.',
      'Bind widget templates through the activated `model` object after nullable narrowing when that is the real boundary.',
      'Keep getters for real derived presentation state instead of one-hop model-member forwarding.',
    ],
    avoid: [
      'Do not choose `au-compose` just to avoid modeling ordinary component or router structure.',
      'Do not add widget getters whose only job is shortening `model.*` paths.',
    ],
  },
  'state-store-list': {
    whenToUse: 'Use when a caller explicitly wants @aurelia/state store semantics instead of vanilla DI-owned state classes.',
    codeShape: 'StateDefaultConfiguration, default and named stores, `.state` and `.dispatch` commands, and `& state` binding behavior usage.',
    prefer: [
      'Start from vanilla classes unless store semantics are part of the requested architecture.',
      'Verify store rows and binding behavior applications separately.',
    ],
    avoid: [
      'Do not introduce a framework state package solely to work around unclear domain modeling.',
    ],
  },
} as const satisfies Record<AuthoringRecipeKey, {
  readonly whenToUse: string;
  readonly codeShape: string;
  readonly prefer: readonly string[];
  readonly avoid: readonly string[];
}>;

// Public text-channel priority for selected recipe guidance. This is not a coverage list:
// rows still come from recipe membership, and keys that are not candidates are ignored.
export const selectedRecipePrincipleKeysByRecipe = {
  'minimal-app': [
    'resource-declaration-is-a-policy-choice',
    'verify-effects-not-snapshots',
  ],
  'convention-minimal-app': [
    'resource-declaration-is-a-policy-choice',
    'verify-effects-not-snapshots',
  ],
  'routed-app-shell': [
    'common-routing-before-edge-parity',
    'resource-declaration-is-a-policy-choice',
    'verify-effects-not-snapshots',
  ],
  'state-backed-form': [
    'state-and-domain-first',
    'observation-enables-less-code',
    'forms-use-framework-value-channels',
    'component-boundaries-are-contextual',
    'verify-effects-not-snapshots',
  ],
  'localized-state-backed-form': [
    'state-and-domain-first',
    'observation-enables-less-code',
    'forms-use-framework-value-channels',
    'verify-effects-not-snapshots',
  ],
  'validated-state-backed-form': [
    'state-and-domain-first',
    'observation-enables-less-code',
    'forms-use-framework-value-channels',
    'verify-effects-not-snapshots',
  ],
  'localized-validated-state-backed-form': [
    'state-and-domain-first',
    'observation-enables-less-code',
    'forms-use-framework-value-channels',
    'verify-effects-not-snapshots',
  ],
  'multi-step-state-backed-form': [
    'state-and-domain-first',
    'observation-enables-less-code',
    'forms-use-framework-value-channels',
    'component-boundaries-are-contextual',
    'verify-effects-not-snapshots',
  ],
  'service-backed-form': [
    'state-and-domain-first',
    'observation-enables-less-code',
    'forms-use-framework-value-channels',
    'component-boundaries-are-contextual',
  ],
  'routed-state-backed-form': [
    'common-routing-before-edge-parity',
    'state-and-domain-first',
    'observation-enables-less-code',
    'forms-use-framework-value-channels',
  ],
  'routed-validated-state-backed-form': [
    'common-routing-before-edge-parity',
    'state-and-domain-first',
    'observation-enables-less-code',
    'forms-use-framework-value-channels',
  ],
  'routed-service-backed-form': [
    'common-routing-before-edge-parity',
    'state-and-domain-first',
    'observation-enables-less-code',
    'forms-use-framework-value-channels',
  ],
  'routed-service-validated-state-backed-form': [
    'common-routing-before-edge-parity',
    'state-and-domain-first',
    'observation-enables-less-code',
    'forms-use-framework-value-channels',
  ],
  'routed-localized-validated-state-backed-form': [
    'common-routing-before-edge-parity',
    'state-and-domain-first',
    'observation-enables-less-code',
    'forms-use-framework-value-channels',
  ],
  'catalog-storefront': [
    'state-and-domain-first',
    'observation-enables-less-code',
    'component-boundaries-are-contextual',
    'verify-effects-not-snapshots',
  ],
  'routed-catalog-storefront': [
    'common-routing-before-edge-parity',
    'state-and-domain-first',
    'observation-enables-less-code',
    'component-boundaries-are-contextual',
  ],
  'searchable-data-table': [
    'state-and-domain-first',
    'observation-enables-less-code',
    'forms-use-framework-value-channels',
    'verify-effects-not-snapshots',
  ],
  'routed-searchable-data-table': [
    'common-routing-before-edge-parity',
    'state-and-domain-first',
    'observation-enables-less-code',
    'forms-use-framework-value-channels',
  ],
  'composed-dashboard': [
    'state-and-domain-first',
    'observation-enables-less-code',
    'component-boundaries-are-contextual',
  ],
  'state-store-list': [
    'plugin-state-is-explicit',
    'verify-effects-not-snapshots',
  ],
} as const satisfies Record<AuthoringRecipeKey, readonly string[]>;

// Selected recipe decision order keeps the compact MCP answer anchored to the recipe's
// core code-shape choices instead of letting broad specificity scoring pick incidental rows.
export const selectedRecipeDecisionKeysByRecipe = {
  'minimal-app': [
    'resource-declaration-style',
  ],
  'convention-minimal-app': [
    'resource-declaration-style',
  ],
  'routed-app-shell': [
    'route-selected-state',
    'active-navigation-styling',
    'resource-declaration-style',
  ],
  'state-backed-form': [
    'state-boundary',
    'template-model-access',
    'source-pattern-use-policy',
    'form-value-channel',
    'listener-action-boundary',
    'derived-getter-observation',
    'component-handoff',
    'proxy-exit-boundary',
  ],
  'localized-state-backed-form': [
    'state-boundary',
    'template-model-access',
    'source-pattern-use-policy',
    'form-value-channel',
    'listener-action-boundary',
    'derived-getter-observation',
    'proxy-exit-boundary',
  ],
  'validated-state-backed-form': [
    'state-boundary',
    'form-value-channel',
    'template-model-access',
    'source-pattern-use-policy',
    'listener-action-boundary',
    'derived-getter-observation',
  ],
  'localized-validated-state-backed-form': [
    'state-boundary',
    'form-value-channel',
    'template-model-access',
    'source-pattern-use-policy',
    'listener-action-boundary',
    'derived-getter-observation',
  ],
  'multi-step-state-backed-form': [
    'state-boundary',
    'template-model-access',
    'source-pattern-use-policy',
    'form-value-channel',
    'listener-action-boundary',
    'derived-getter-observation',
    'proxy-exit-boundary',
    'component-handoff',
  ],
  'service-backed-form': [
    'state-boundary',
    'listener-action-boundary',
    'template-model-access',
    'source-pattern-use-policy',
    'form-value-channel',
    'proxy-exit-boundary',
  ],
  'routed-state-backed-form': [
    'route-selected-state',
    'state-boundary',
    'form-value-channel',
    'template-model-access',
    'source-pattern-use-policy',
    'active-navigation-styling',
  ],
  'routed-validated-state-backed-form': [
    'route-selected-state',
    'state-boundary',
    'form-value-channel',
    'template-model-access',
    'source-pattern-use-policy',
    'active-navigation-styling',
    'derived-getter-observation',
  ],
  'routed-service-backed-form': [
    'route-selected-state',
    'state-boundary',
    'form-value-channel',
    'listener-action-boundary',
    'template-model-access',
    'source-pattern-use-policy',
    'active-navigation-styling',
  ],
  'routed-service-validated-state-backed-form': [
    'route-selected-state',
    'state-boundary',
    'form-value-channel',
    'listener-action-boundary',
    'template-model-access',
    'source-pattern-use-policy',
    'active-navigation-styling',
    'derived-getter-observation',
  ],
  'routed-localized-validated-state-backed-form': [
    'route-selected-state',
    'state-boundary',
    'form-value-channel',
    'template-model-access',
    'source-pattern-use-policy',
    'active-navigation-styling',
    'derived-getter-observation',
  ],
  'catalog-storefront': [
    'state-boundary',
    'template-model-access',
    'source-pattern-use-policy',
    'component-handoff',
    'listener-action-boundary',
    'derived-getter-observation',
    'proxy-exit-boundary',
  ],
  'routed-catalog-storefront': [
    'route-selected-state',
    'active-navigation-styling',
    'state-boundary',
    'template-model-access',
    'source-pattern-use-policy',
    'component-handoff',
    'listener-action-boundary',
    'derived-getter-observation',
  ],
  'searchable-data-table': [
    'state-boundary',
    'template-model-access',
    'source-pattern-use-policy',
    'form-value-channel',
    'listener-action-boundary',
    'derived-getter-observation',
    'proxy-exit-boundary',
  ],
  'routed-searchable-data-table': [
    'route-selected-state',
    'state-boundary',
    'template-model-access',
    'source-pattern-use-policy',
    'form-value-channel',
    'listener-action-boundary',
    'active-navigation-styling',
    'derived-getter-observation',
  ],
  'composed-dashboard': [
    'state-boundary',
    'template-model-access',
    'source-pattern-use-policy',
    'component-handoff',
    'derived-getter-observation',
    'proxy-exit-boundary',
  ],
  'state-store-list': [
    'state-store-plugin-boundary',
    'source-pattern-use-policy',
    'form-value-channel',
    'template-model-access',
  ],
} as const satisfies Record<AuthoringRecipeKey, readonly string[]>;

// Focus-level principle order is a public guidance policy. Keep it explicit so app-building
// answers do not depend on fuzzy text search or recipe-count coincidences.
export const guidancePrincipleKeysByFocus = {
  'app-shell': [
    'resource-declaration-is-a-policy-choice',
    'state-and-domain-first',
    'verify-effects-not-snapshots',
  ],
  forms: [
    'forms-use-framework-value-channels',
    'state-and-domain-first',
    'observation-enables-less-code',
    'component-boundaries-are-contextual',
    'verify-effects-not-snapshots',
  ],
  state: [
    'state-and-domain-first',
    'plugin-state-is-explicit',
    'observation-enables-less-code',
    'forms-use-framework-value-channels',
    'component-boundaries-are-contextual',
  ],
  routing: [
    'common-routing-before-edge-parity',
    'state-and-domain-first',
    'observation-enables-less-code',
    'component-boundaries-are-contextual',
    'verify-effects-not-snapshots',
  ],
  plugins: [
    'plugin-state-is-explicit',
    'forms-use-framework-value-channels',
    'state-and-domain-first',
    'observation-enables-less-code',
    'verify-effects-not-snapshots',
  ],
  composition: [
    'state-and-domain-first',
    'observation-enables-less-code',
    'component-boundaries-are-contextual',
    'verify-effects-not-snapshots',
  ],
  diagnostics: [
    'verify-effects-not-snapshots',
    'forms-use-framework-value-channels',
    'common-routing-before-edge-parity',
    'observation-enables-less-code',
  ],
  'app-building': [
    'state-and-domain-first',
    'observation-enables-less-code',
    'component-boundaries-are-contextual',
    'forms-use-framework-value-channels',
    'common-routing-before-edge-parity',
    'verify-effects-not-snapshots',
  ],
} as const satisfies Record<SemanticAuthoringGuidanceFocus, readonly string[]>;

// Focus-level decision order names the first questions an app-building client should answer
// before source text is requested.
export const guidanceDecisionKeysByFocus = {
  'app-shell': [
    'resource-declaration-style',
    'state-boundary',
    'template-model-access',
  ],
  forms: [
    'form-value-channel',
    'state-boundary',
    'template-model-access',
    'source-pattern-use-policy',
    'listener-action-boundary',
    'derived-getter-observation',
  ],
  state: [
    'state-boundary',
    'state-store-plugin-boundary',
    'template-model-access',
    'derived-getter-observation',
    'listener-action-boundary',
    'proxy-exit-boundary',
  ],
  routing: [
    'route-selected-state',
    'active-navigation-styling',
    'state-boundary',
    'template-model-access',
    'listener-action-boundary',
  ],
  plugins: [
    'state-store-plugin-boundary',
    'form-value-channel',
    'state-boundary',
    'template-model-access',
    'derived-getter-observation',
  ],
  composition: [
    'component-handoff',
    'state-boundary',
    'template-model-access',
    'derived-getter-observation',
  ],
  diagnostics: [
    'type-repair-routing',
    'template-model-access',
    'form-value-channel',
    'route-selected-state',
    'derived-getter-observation',
  ],
  'app-building': [
    'state-boundary',
    'template-model-access',
    'source-pattern-use-policy',
    'type-repair-routing',
    'listener-action-boundary',
    'derived-getter-observation',
    'component-handoff',
    'form-value-channel',
    'route-selected-state',
    'active-navigation-styling',
    'proxy-exit-boundary',
  ],
} as const satisfies Record<SemanticAuthoringGuidanceFocus, readonly string[]>;

export const guidancePrinciples: readonly SemanticAuthoringGuidancePrincipleRow[] = [
  {
    key: 'resource-declaration-is-a-policy-choice',
    title: 'Resource Declaration Is A Policy Choice',
    summary: 'Use conventions, decorators, or explicit registration where the project can prove the resource path; conventions are a code-economy tool, not a hidden fallback.',
    prefer: [
      'Use Aurelia source/template conventions for small app shells when class names, file names, and template pairs line up cleanly.',
      'Use decorators or explicit dependencies when the resource boundary should be locally obvious or convention discovery is not guaranteed.',
    ],
    avoid: [
      'Avoid adding decorators only because the analyzer forgot a convention path it can already prove.',
      'Avoid convention-style source when the naming/template pair would become ambiguous or host-tooling dependent.',
    ],
    tasteValueKeys: [
      'legacy-convention-resource-declaration',
      'decorator-resource-declaration',
      'convention-discovery-admission',
      'convention-template-file',
      'external-template-file',
    ],
    recipeKeys: [
      'convention-minimal-app',
      'minimal-app',
    ],
  },
  {
    key: 'state-and-domain-first',
    title: 'State And Domain First',
    summary: 'Start larger apps with DI-owned state/domain classes and service boundaries before reaching for framework state packages.',
    prefer: [
      'Let view-models resolve state and expose real route, host, validation, or presentation adaptation.',
      'Let state classes compose other state/domain classes when the domain naturally has parts.',
    ],
    avoid: [
      'Avoid view-model fields that duplicate durable app state.',
      'Avoid service objects as template-facing data facades when state/domain objects are clearer.',
    ],
    tasteValueKeys: [
      'di-owned-state-class',
      'di-owned-service-layer',
      'direct-state-domain-template-binding',
      'meaningful-viewmodel-adaptation',
    ],
    recipeKeys: [
      'state-backed-form',
      'multi-step-state-backed-form',
      'localized-validated-state-backed-form',
      'routed-localized-validated-state-backed-form',
      'service-backed-form',
      'routed-service-backed-form',
      'searchable-data-table',
      'routed-searchable-data-table',
      'catalog-storefront',
      'routed-catalog-storefront',
      'composed-dashboard',
    ],
  },
  {
    key: 'plugin-state-is-explicit',
    title: 'Plugin State Is Explicit',
    summary: '@aurelia/state is a deliberate plugin-backed architecture choice, not the default replacement for DI-owned state/domain classes.',
    prefer: [
      'Use @aurelia/state when store configuration, dispatch/action flow, or store-scoped template bindings are part of the requested design.',
      'Keep DI-owned state classes as the lower-boilerplate default when ordinary domain modeling, routing, forms, and services are enough.',
    ],
    avoid: [
      'Avoid introducing a store package only to hide uncertain state ownership.',
      'Avoid mixing store syntax and DI state classes without naming which boundary owns mutation and derived state.',
    ],
    tasteValueKeys: [
      'aurelia-state-store',
      'plugin-registration-admission',
      'di-owned-state-class',
    ],
    recipeKeys: [
      'state-store-list',
    ],
  },
  {
    key: 'observation-enables-less-code',
    title: 'Observation Enables Less Code',
    summary: 'Aurelia template connectables, proxy observation, and ObserverLocator computed observers let plain domain reads and ordinary getters stay observable without boilerplate forwarding; trackable methods and raw-object exits should stay explicit.',
    prefer: [
      'Bind to `state.member`, template-local domain objects, ordinary source-backed getters, or listener-callable state/domain methods when that is the actual model.',
      'Use `@computed` only for explicit dependency or trackable-method semantics.',
    ],
    avoid: [
      'Avoid one-hop view-model getters whose only purpose is shortening a member path.',
      'Avoid adding decorators just to make ordinary getter observation work.',
    ],
    tasteValueKeys: [
      'direct-state-domain-template-binding',
      'source-backed-getter-observation',
      'one-hop-forwarding-accessor-pressure',
    ],
    recipeKeys: [
      'state-backed-form',
      'multi-step-state-backed-form',
      'localized-validated-state-backed-form',
      'routed-localized-validated-state-backed-form',
      'routed-service-backed-form',
      'searchable-data-table',
      'routed-searchable-data-table',
      'catalog-storefront',
      'routed-catalog-storefront',
      'composed-dashboard',
    ],
  },
  {
    key: 'component-boundaries-are-contextual',
    title: 'Component Boundaries Are Contextual',
    summary: 'Scalar IDs, direct object binding, and public bindables are modeling choices; choose the one that preserves locality and keeps boilerplate low.',
    prefer: [
      'Use scalar IDs for route/lazy boundaries and direct objects for local typed boundaries; let the domain shape choose.',
      'Keep public bindables for real component APIs rather than one-hop app wiring.',
      'Use event/output semantics instead of callback bindables for non-leaf app composition.',
    ],
    avoid: [
      'Avoid passing functions through bindables as a default list/card interaction pattern.',
      'Avoid global rules that make every component ID-based or object-based.',
    ],
    tasteValueKeys: [
      'scalar-id-inputs',
      'object-inputs',
      'event-output-interface',
      'callback-function-inputs',
    ],
    recipeKeys: [
      'state-backed-form',
      'multi-step-state-backed-form',
      'localized-validated-state-backed-form',
      'routed-localized-validated-state-backed-form',
      'routed-service-backed-form',
      'searchable-data-table',
      'routed-searchable-data-table',
      'catalog-storefront',
      'routed-catalog-storefront',
    ],
  },
  {
    key: 'forms-use-framework-value-channels',
    title: 'Forms Use Framework Value Channels',
    summary: 'Native value, checked, select, matcher, and validation behaviors are framework semantics, not string-template conveniences.',
    prefer: [
      'Use `value.bind` on native value/select controls, `checked.bind` on checkbox/radio controls, `model.bind` where an option or input carries app identity, and binding value-channel `observerCouplings` to explain select/checked behavior.',
      'Keep object-valued select or matcher cases explicit and verified.',
      'Use binding value-channel `observerCouplings` to explain select option lists, select arrays, checked collections/maps, and matcher comparison without manual synchronization code.',
      'Use validation-html, `validation-errors`, and error-array-driven presentation when validation ownership belongs in the framework plugin.',
    ],
    avoid: [
      'Avoid replacing checked/select behavior with hand-written synchronization logic.',
      'Avoid treating weak type surfaces as a reason to synthesize fake completions.',
    ],
    tasteValueKeys: [
      'native-control-value-binding',
      'checked-model-binding',
      'select-model-binding',
      'custom-matcher-comparison',
      'validation-controller-usage',
    ],
    recipeKeys: [
      'state-backed-form',
      'validated-state-backed-form',
      'multi-step-state-backed-form',
      'localized-validated-state-backed-form',
      'routed-localized-validated-state-backed-form',
      'service-backed-form',
      'searchable-data-table',
      'routed-searchable-data-table',
    ],
  },
  {
    key: 'common-routing-before-edge-parity',
    title: 'Common Routing Before Edge Parity',
    summary: 'Public guidance should handle common route config, params, links, routeable components, and viewport layout while leaving dynamic boundaries explicit.',
    prefer: [
      'Use route params when navigation owns selected state.',
      'Verify static links, params, query values, fragments, route tree, and viewport targets through router rows.',
    ],
    avoid: [
      'Avoid pretending dynamic router/runtime boundaries are statically closed.',
      'Avoid making full viewport parity a blocker for useful routed app recipes.',
    ],
    tasteValueKeys: [
      'static-route-config',
      'decorator-route-config',
      'route-parameter-selected-state',
      'viewport-layout-navigation',
    ],
    recipeKeys: [
      'routed-state-backed-form',
      'routed-validated-state-backed-form',
      'routed-service-backed-form',
      'routed-localized-validated-state-backed-form',
      'routed-catalog-storefront',
    ],
  },
  {
    key: 'verify-effects-not-snapshots',
    title: 'Verify Effects, Not Snapshots',
    summary: 'Generated recipes should reopen through semantic-runtime and prove expected semantic effects instead of relying on source-text snapshots.',
    prefer: [
      'Use authoring orientation and expected effects to compare generated intent with reopened facts.',
      'Use diagnostics and open seams as repair pressure when facts are missing.',
    ],
    avoid: [
      'Avoid declaring a recipe good because files were written.',
      'Avoid widening generated examples from stress fixtures without separating recommendation from analysis pressure.',
    ],
    tasteValueKeys: [
      'compact-semantic-facts',
      'source-legible-boundaries',
    ],
    recipeKeys: [
      'state-backed-form',
      'multi-step-state-backed-form',
      'localized-validated-state-backed-form',
      'searchable-data-table',
      'routed-searchable-data-table',
      'catalog-storefront',
      'routed-state-backed-form',
      'routed-validated-state-backed-form',
      'routed-localized-validated-state-backed-form',
      'routed-catalog-storefront',
    ],
  },
];

export const guidanceDecisions: readonly SemanticAuthoringGuidanceDecisionRow[] = [
  {
    key: 'resource-declaration-style',
    title: 'Resource Declaration',
    question: 'Should the component use a decorator, conventions, or explicit registration?',
    recommendation: 'Prefer conventions when the class/file/template pair is simple and provable; use decorators or explicit dependency registration when that local contract is clearer or required by the host.',
    chooseWhen: [
      'A small app shell follows the currently modeled convention pair, such as `MyApp` in `my-app.ts` with `my-app.html`.',
      'The caller is optimizing for public-scaffold-like code with less ceremony.',
    ],
    avoidWhen: [
      'The source file name, class name, or template path would not be convention-compatible.',
      'The component has dependencies, capture, shadow, or other resource metadata that should stay explicit in source.',
    ],
    tasteValueKeys: [
      'legacy-convention-resource-declaration',
      'decorator-resource-declaration',
      'convention-discovery-admission',
      'dependency-array-admission',
      'convention-template-file',
      'external-template-file',
    ],
    recipeKeys: [
      'convention-minimal-app',
      'minimal-app',
    ],
    followUpSurfaces: [
      'authoring-recipe-plan',
      'resource-definitions',
      'authoring-orientation',
    ],
  },
  {
    key: 'state-boundary',
    title: 'State Boundary',
    question: 'Where should durable app state live?',
    recommendation: 'Put durable app state in DI-owned state/domain classes; keep services behind that boundary when they perform loading or integration work.',
    chooseWhen: [
      'The value must survive component churn or be shared across routes/components.',
      'The feature has domain behavior, derived state, or service-backed loading/submission.',
    ],
    avoidWhen: [
      'The state is only ephemeral control-local presentation state.',
      'The caller explicitly requested @aurelia/state store semantics instead of vanilla classes.',
    ],
    tasteValueKeys: [
      'di-owned-state-class',
      'di-owned-service-layer',
      'viewmodel-local-state',
      'aurelia-state-store',
    ],
    recipeKeys: [
      'state-backed-form',
      'multi-step-state-backed-form',
      'service-backed-form',
      'routed-service-backed-form',
      'searchable-data-table',
      'routed-searchable-data-table',
      'catalog-storefront',
      'routed-catalog-storefront',
      'composed-dashboard',
    ],
    followUpSurfaces: [
      'authoring-recipe-plan',
      'authoring-orientation',
      'app-overview',
    ],
  },
  {
    key: 'state-store-plugin-boundary',
    title: 'State Store Boundary',
    question: 'When should @aurelia/state own application state instead of DI-owned classes?',
    recommendation: 'Choose @aurelia/state only when the feature benefits from store configuration, action dispatch, named stores, or store-scoped template bindings; otherwise keep ordinary DI-owned state/domain classes as the simpler default.',
    chooseWhen: [
      'The caller explicitly asks for @aurelia/state, reducers/action handlers, `.state`/`.dispatch`, `& state`, named stores, or store-scoped plugin behavior.',
      'The app needs store-level integration that should be visible as plugin configuration and state-store products.',
    ],
    avoidWhen: [
      'The feature is an ordinary form, route, table, or catalog that can stay cleaner with injected state/domain classes.',
      'The store is being introduced only because component/view-model boundaries are unclear.',
    ],
    tasteValueKeys: [
      'aurelia-state-store',
      'plugin-registration-admission',
      'di-owned-state-class',
    ],
    recipeKeys: [
      'state-store-list',
    ],
    followUpSurfaces: [
      'state-stores',
      'state-issues',
      'binding-data-flow-summary',
      'binding-value-channel-summary',
      'authoring-recipe-plan',
    ],
  },
  {
    key: 'template-model-access',
    title: 'Template Model Access',
    question: 'Should the view-model forward fields or should the template bind to state/domain objects directly?',
    recommendation: 'Bind directly to `state.*`, template-local domain objects, real domain getters, or small state/domain methods when the view-model has no meaningful adaptation to add.',
    chooseWhen: [
      'The template path is typed, local, and expresses the actual domain model.',
      'A `<let>` value or template controller narrowing cleanly adapts an ID or nullable lookup into a local domain object.',
    ],
    avoidWhen: [
      'A getter only shortens one member path and adds no route, host, presentation, or validation adaptation.',
      'The direct path hides an actual boundary that should be a route param, component input, or service method.',
    ],
    tasteValueKeys: [
      'direct-state-domain-template-binding',
      'template-local-domain-adaptation',
      'meaningful-viewmodel-adaptation',
      'one-hop-forwarding-accessor-pressure',
    ],
    recipeKeys: [
      'state-backed-form',
      'multi-step-state-backed-form',
      'localized-validated-state-backed-form',
      'routed-localized-validated-state-backed-form',
      'service-backed-form',
      'routed-service-backed-form',
      'searchable-data-table',
      'routed-searchable-data-table',
      'catalog-storefront',
      'routed-catalog-storefront',
      'composed-dashboard',
    ],
    followUpSurfaces: [
      'binding-data-flow-summary',
      'binding-observed-dependency-summary',
      'binding-data-flows',
      'binding-observed-dependencies',
      'authoring-orientation',
    ],
  },
  {
    key: 'source-pattern-use-policy',
    title: 'Source Pattern Use',
    question: 'Should recipe source be copied directly, adapted, or merged selectively?',
    recommendation: 'Read `sourcePlan.pattern.usePolicy` before source text: apply direct starts as scaffolds, adapt reference scenarios before emitting caller-domain code, merge companion patterns selectively, and keep analysis-pressure source out of app output.',
    chooseWhen: [
      'The recipe plan carries concrete source text, sample data, sample copy, or CSS.',
      'A feature-goal sequence includes a primary recipe plus companion pattern-reference rows.',
      'A source plan reports `scenario-reference`, `reference-complete`, `synthetic-reference-data`, or `semantic-runtime-reference-instantiation` text authority.',
    ],
    avoidWhen: [
      'A complete reference scenario is copied wholesale because includeText returned many files.',
      'A companion recipe is applied as a second full scaffold instead of borrowing the relevant modules and expected effects.',
      'Sample entity names or presentation CSS are treated as the reusable recipe ontology.',
    ],
    tasteValueKeys: [
      'compact-semantic-facts',
      'source-legible-boundaries',
    ],
    recipeKeys: [
      'state-backed-form',
      'localized-state-backed-form',
      'validated-state-backed-form',
      'localized-validated-state-backed-form',
      'multi-step-state-backed-form',
      'service-backed-form',
      'routed-state-backed-form',
      'routed-validated-state-backed-form',
      'routed-service-backed-form',
      'routed-localized-validated-state-backed-form',
      'catalog-storefront',
      'routed-catalog-storefront',
      'searchable-data-table',
      'routed-searchable-data-table',
      'composed-dashboard',
      'state-store-list',
    ],
    followUpSurfaces: [
      'authoring-recipe-plan',
      'authoring-catalog',
    ],
  },
  {
    key: 'type-repair-routing',
    title: 'Type Repair Routing',
    question: 'Where should weak or unresolved binding type pressure be repaired first?',
    recommendation: 'Use `binding-data-flow-summary` issue rows to route repair: unresolved source typing belongs near the source/scope declaration, nullish one-way/two-way rows need narrowing or optional contracts on the receiving side, and empty-array inferred targets usually need explicit component or state property types.',
    chooseWhen: [
      'A summary row reports `source-type-unresolved`, `source-nullish-to-required-target`, `target-nullish-to-required-source`, `target-empty-array-inferred`, weak owner typing, or assignability pressure.',
      'The caller needs a low-token explanation before opening exact binding rows or source spans.',
    ],
    avoidWhen: [
      'Weak typing is hidden by inventing completion members, forwarding getters, or broad `any` casts.',
      'A component API is changed before checking whether the source side or target side owns the missing type.',
    ],
    tasteValueKeys: [
      'compact-semantic-facts',
      'source-legible-boundaries',
      'semantic-gaps-present',
    ],
    recipeKeys: [
      'state-backed-form',
      'validated-state-backed-form',
      'multi-step-state-backed-form',
      'routed-state-backed-form',
      'routed-validated-state-backed-form',
      'catalog-storefront',
      'routed-catalog-storefront',
      'searchable-data-table',
      'routed-searchable-data-table',
    ],
    followUpSurfaces: [
      'binding-data-flow-summary',
      'binding-data-flows',
      'template-diagnostics',
      'authoring-orientation',
    ],
  },
  {
    key: 'listener-action-boundary',
    title: 'Listener Action Boundary',
    question: 'Should a listener call a view-model method or a state/domain method?',
    recommendation: 'Call state/domain methods directly from listener bindings when no view-model adaptation is needed; keep view-model methods for route, validation, host, or presentation coordination.',
    chooseWhen: [
      'The action belongs to the DI-owned state/domain model and the listener does not need to reshape `$event` or coordinate component-local concerns.',
      'A submit, load, toggle, or command method already sits on the same state object that owns the edited data.',
    ],
    avoidWhen: [
      'The view-model method only forwards to `state.method(...)` and adds no adaptation.',
      'A direct call would hide required validation controller, route context, host API, or event-shaping work.',
    ],
    tasteValueKeys: [
      'direct-state-domain-template-binding',
      'meaningful-viewmodel-adaptation',
      'event-output-interface',
    ],
    recipeKeys: [
      'state-backed-form',
      'multi-step-state-backed-form',
      'localized-validated-state-backed-form',
      'routed-localized-validated-state-backed-form',
      'service-backed-form',
      'routed-service-backed-form',
      'searchable-data-table',
      'routed-searchable-data-table',
      'catalog-storefront',
      'routed-catalog-storefront',
    ],
    followUpSurfaces: [
      'binding-data-flow-summary',
      'binding-value-channel-summary',
      'app-topology',
    ],
  },
  {
    key: 'derived-getter-observation',
    title: 'Derived Getter Observation',
    question: 'Does a getter need `@computed` to be observable?',
    recommendation: 'No. Ordinary configurable accessors are observed through ObserverLocator computed-observer paths; use `@computed` for explicit dependency or trackable-method metadata.',
    chooseWhen: [
      'The getter body expresses real derived state over observable state/domain members.',
      'Explicit dependency strings/functions are needed for a specialized computed contract.',
    ],
    avoidWhen: [
      'A decorator is being added only because a plain getter was assumed to be invisible to observation.',
      'A getter exists only to forward a single nested member into the view-model.',
    ],
    tasteValueKeys: [
      'source-backed-getter-observation',
      'direct-state-domain-template-binding',
      'one-hop-forwarding-accessor-pressure',
    ],
    recipeKeys: [
      'state-backed-form',
      'multi-step-state-backed-form',
      'localized-validated-state-backed-form',
      'routed-localized-validated-state-backed-form',
      'searchable-data-table',
      'routed-searchable-data-table',
      'catalog-storefront',
      'routed-catalog-storefront',
      'composed-dashboard',
    ],
    followUpSurfaces: [
      'computed-observer-sources',
      'computed-observer-observed-dependencies',
      'binding-observed-dependency-summary',
      'binding-observed-dependencies',
    ],
  },
  {
    key: 'component-handoff',
    title: 'Component Handoff',
    question: 'Should a component receive an ID, an object, or a public bindable value?',
    recommendation: 'Use the boundary that preserves locality: IDs for route/lazy/non-leaf selection, direct objects for local typed boundaries, public bindables only for real component APIs.',
    chooseWhen: [
      'A receiving component can own lookup, lazy loading, or route parity from a scalar identity.',
      'A local leaf-like boundary is intentionally close to the domain object and benefits from typed object access.',
    ],
    avoidWhen: [
      'A callback function bindable is only compensating for missing event/output or state interaction structure.',
      'A global ID-only or object-only rule would add boilerplate to a simpler local domain boundary.',
    ],
    tasteValueKeys: [
      'scalar-id-inputs',
      'object-inputs',
      'public-inputs-present',
      'event-output-interface',
      'callback-function-inputs',
    ],
    recipeKeys: [
      'state-backed-form',
      'multi-step-state-backed-form',
      'service-backed-form',
      'routed-service-backed-form',
      'catalog-storefront',
      'routed-catalog-storefront',
    ],
    followUpSurfaces: [
      'authoring-orientation',
      'component-agents',
      'binding-data-flow-summary',
      'binding-data-flows',
    ],
  },
  {
    key: 'form-value-channel',
    title: 'Form Value Channel',
    question: 'How should form controls synchronize values?',
    recommendation: 'Use Aurelia value-channel semantics: `value.bind` for DOM string-ish values, `checked.bind` for boolean/radio/collection state, `model.bind` for app identity on options/inputs, matchers for non-boolean comparison, and `observerCouplings` when explaining select option-list, select array, checked collection/map, or matcher behavior.',
    chooseWhen: [
      'A native control maps to value, checked, select, or collection-membership behavior.',
      'Object-valued or non-string select/radio/checkbox choices need explicit model values, and object comparison may need a matcher.',
      'You need to explain or repair select option-list, select array, checked collection, or matcher behavior through observer couplings rather than hand-written event plumbing.',
    ],
    avoidWhen: [
      'Manual flags and DOM event handlers duplicate framework checked/select/validation behavior.',
      'Plain boolean checkbox state is being routed through a matcher even though the framework ignores matcher comparison for checked booleans.',
      'Weak owner typings are being hidden by synthesizing fake completion or assignment facts.',
    ],
    tasteValueKeys: [
      'native-control-value-binding',
      'checked-model-binding',
      'select-model-binding',
      'custom-matcher-comparison',
      'validation-controller-usage',
    ],
    recipeKeys: [
      'state-backed-form',
      'validated-state-backed-form',
      'multi-step-state-backed-form',
      'localized-validated-state-backed-form',
      'routed-localized-validated-state-backed-form',
      'service-backed-form',
      'routed-service-backed-form',
      'searchable-data-table',
      'routed-searchable-data-table',
    ],
    followUpSurfaces: [
      'binding-value-channel-summary',
      'binding-data-flow-summary',
      'binding-value-channels',
      'binding-data-flows',
      'template-diagnostics',
    ],
  },
  {
    key: 'route-selected-state',
    title: 'Route Selected State',
    question: 'When should navigation own selection state?',
    recommendation: 'Use route params/query/fragment when navigation owns the current record or mode; let state own loading, caching, and mutation behind that selected identity.',
    chooseWhen: [
      'The selected entity should be linkable, refreshable, or shareable as a URL.',
      'The routed component can load/render around the scalar route parameter while state owns data availability.',
    ],
    avoidWhen: [
      'The selection is purely local UI state with no navigation meaning.',
      'Dynamic router behavior cannot be statically closed and should remain an explicit open seam.',
    ],
    tasteValueKeys: [
      'route-parameter-selected-state',
      'static-route-config',
      'decorator-route-config',
      'viewport-layout-navigation',
    ],
    recipeKeys: [
      'routed-state-backed-form',
      'routed-validated-state-backed-form',
      'routed-service-backed-form',
      'routed-localized-validated-state-backed-form',
      'routed-catalog-storefront',
    ],
    followUpSurfaces: [
      'router-overview',
      'route-contexts',
      'route-context-parameter-reads',
      'viewport-instruction-trees',
    ],
  },
  {
    key: 'active-navigation-styling',
    title: 'Active Navigation',
    question: 'Should active route styling use router configuration or view-model state?',
    recommendation: 'Use router `activeClass` for class-only active link styling; bind `load.active` only when route-active status is real application state.',
    chooseWhen: [
      'A navigation link only needs a CSS class while its `load` instruction is active.',
      'A component genuinely needs the active-route boolean for state, analytics, or non-class presentation.',
    ],
    avoidWhen: [
      'View-model booleans are introduced solely to mirror an active CSS class.',
      'The route instruction is dynamic enough that active state cannot be statically explained yet.',
    ],
    tasteValueKeys: [
      'static-route-config',
      'viewport-layout-navigation',
      'meaningful-viewmodel-adaptation',
    ],
    recipeKeys: [
      'routed-state-backed-form',
      'routed-validated-state-backed-form',
      'routed-service-backed-form',
      'routed-localized-validated-state-backed-form',
      'routed-catalog-storefront',
    ],
    followUpSurfaces: [
      'router-options',
      'binding-data-flow-summary',
      'binding-value-channel-summary',
    ],
  },
  {
    key: 'proxy-exit-boundary',
    title: 'Proxy Exit Boundary',
    question: 'When should observed domain objects be unwrapped for external code?',
    recommendation: 'Keep app state/domain objects inside Aurelia observation by default; unwrap only at explicit external-library, host-object, or serialization boundaries.',
    chooseWhen: [
      'A third-party library, browser API, worker, or serializer needs a raw object or cannot tolerate proxy identity.',
      'The boundary is narrow enough that re-entering Aurelia state remains obvious after the call.',
    ],
    avoidWhen: [
      'The unwrap call is compensating for uncertainty about ordinary template or getter observation.',
      'The raw value would be stored as durable app state and disconnect later reads from Aurelia observation.',
    ],
    tasteValueKeys: [
      'direct-state-domain-template-binding',
      'source-backed-getter-observation',
    ],
    recipeKeys: [
      'state-backed-form',
      'multi-step-state-backed-form',
      'service-backed-form',
      'routed-service-backed-form',
      'searchable-data-table',
      'routed-searchable-data-table',
      'catalog-storefront',
      'routed-catalog-storefront',
    ],
    followUpSurfaces: [
      'proxy-observable-escapes',
      'binding-observed-dependency-summary',
      'binding-observed-dependencies',
      'computed-observer-sources',
    ],
  },
];

export const followUps: readonly SemanticAuthoringGuidanceFollowUpRow[] = [
  {
    surface: 'authoring-catalog-view:recipes',
    purpose: 'List recipe contracts, preferences, source-plan summaries, and expected effect kinds.',
    whenToUse: 'Use before choosing a recipe key or comparing several recipe families.',
  },
  {
    surface: 'authoring-recipe-plan',
    purpose: 'Read the concrete operation steps, source edit plan, and expected effects for one recipe.',
    whenToUse: 'Use after selecting a recipe; keep source text disabled until concrete files are needed.',
  },
  {
    surface: 'app-overview',
    purpose: 'Open an existing app or generated fixture and read topology, diagnostics, and open-seam pressure.',
    whenToUse: 'Use before modifying an existing app or when checking whether a generated shape reopened correctly.',
  },
  {
    surface: 'authoring-orientation',
    purpose: 'Compare opened-app facts with authoring capabilities, taste readings, recipes, and repair pressure.',
    whenToUse: 'Use when deciding the next authoring operation or diagnosing why a recipe fit is weak.',
  },
  {
    surface: 'app-query-batch',
    purpose: 'Read several compact app facts in one app-open boundary instead of issuing separate routed app queries.',
    whenToUse: 'Use for the binding summary triad or other related summary queries; keep app profile fields disabled unless profiling construction cost.',
  },
  {
    surface: 'router-overview',
    purpose: 'Inspect route configs, route contexts, recognized routes, viewport instructions, and router issues.',
    whenToUse: 'Use when routing, route params, links, or viewport layout are part of the requested app.',
  },
  {
    surface: 'template-diagnostics',
    purpose: 'Inspect source-file or project template diagnostics with optional TypeChecker projection.',
    whenToUse: 'Use when weak typings, missing members, invalid commands, or binding assignability affect authoring.',
  },
];
