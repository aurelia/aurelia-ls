import {
  AuthoringSourceEditPlan,
  type AuthoringSourceFileEdit,
  referenceInstantiationSourceFiles,
  referenceInstantiationSourcePattern,
  recipeSourceEditPolicy,
  recipeSourceFile,
  sourcePatternAdaptationGroup,
  sourcePatternParameter,
} from './source-plan.js';
import { aureliaRecipeProjectToolingPlan } from './package-tooling.js';
import { moduleSpecifier } from '../application/module-specifier.js';
import {
  fillSourceTemplate,
  sourceText,
} from './source-template.js';
import { standardAureliaEntrypointFile } from './aurelia-entrypoint-source-plan.js';
import { SourcePatternModules } from './source-pattern-modules.js';

export interface ComposedDashboardSourcePlanModel {
  readonly rootDir: string;
  readonly appName: string;
  readonly entrypointPath: string;
  readonly rootComponentPath: string;
  readonly rootTemplatePath: string;
  readonly rootComponentClassName: string;
  readonly rootElementName: string;
  readonly statePath: string;
  readonly stateClassName: string;
  readonly widgetModelName: string;
  readonly chartWidgetPath: string;
  readonly chartWidgetTemplatePath: string;
  readonly chartWidgetClassName: string;
  readonly chartWidgetElementName: string;
  readonly inventoryWidgetPath: string;
  readonly inventoryWidgetTemplatePath: string;
  readonly inventoryWidgetClassName: string;
  readonly inventoryWidgetElementName: string;
}

export function composedDashboardSourcePlan(model: ComposedDashboardSourcePlanModel): AuthoringSourceEditPlan {
  return new AuthoringSourceEditPlan(
    model.rootDir,
    recipeSourceEditPolicy('recipe-baseline'),
    referenceInstantiationSourceFiles(composedDashboardSourceFiles(model)),
    aureliaRecipeProjectToolingPlan({
      appName: model.appName,
    }),
    composedDashboardSourcePattern(model),
  );
}

function composedDashboardSourcePattern(model: ComposedDashboardSourcePlanModel) {
  return referenceInstantiationSourcePattern(
    'composed-dashboard.reference-instantiation',
    'Dynamic dashboard composition pattern',
    'A complete reference instantiation of DI-owned dashboard state and dynamic AuCompose component selection across multiple widget component types.',
    [
      'Treat widget names, inventory/order labels, and sample widget data as replaceable defaults for the caller dashboard domain.',
      'Keep the state-owned component selection and composition boundary when adapting; do not introduce framework composition only to avoid ordinary component dependencies.',
    ],
    'structural-baseline',
    [
      sourcePatternParameter(
        'dashboard-widget',
        'domain-entity',
        'Dashboard widget model',
        model.widgetModelName,
        'Replace widget metadata and component selection fields with the caller dashboard domain.',
      ),
      sourcePatternParameter(
        'dashboard-widget-set',
        'domain-collection',
        'Widget component set',
        `${model.chartWidgetClassName}, ${model.inventoryWidgetClassName}`,
        'Adapt the component registry and state-owned component selection boundary together.',
      ),
      sourcePatternParameter(
        'dashboard-sample-data',
        'sample-data',
        'Reference widget data',
        'chart and inventory widgets',
        'Replace labels and sample metric data before emitting caller-specific code.',
      ),
    ],
    [
      SourcePatternModules.AppShell,
      SourcePatternModules.DiStateBoundary,
      SourcePatternModules.StateComposition,
      SourcePatternModules.DomainClassModel,
      SourcePatternModules.DynamicComposition,
      SourcePatternModules.ListRendering,
      SourcePatternModules.ComponentBoundary,
      SourcePatternModules.TemplateControllerFlow,
    ],
    [
      sourcePatternAdaptationGroup(
        'dashboard-composition-model',
        'Dashboard composition model',
        'Widget model shape, component set, and sample widget data move together; changing only the class name would leave the dynamic composition contract misleading.',
        ['dashboard-widget', 'dashboard-widget-set', 'dashboard-sample-data'],
      ),
    ],
  );
}

function composedDashboardSourceFiles(
  model: ComposedDashboardSourcePlanModel,
): readonly AuthoringSourceFileEdit[] {
  return [
    composedDashboardEntrypointFile(model),
    composedDashboardRootComponentFile(model),
    composedDashboardRootTemplateFile(model),
    composedDashboardStateFile(model),
    composedDashboardChartWidgetComponentFile(model),
    composedDashboardChartWidgetTemplateFile(model),
    composedDashboardInventoryWidgetComponentFile(model),
    composedDashboardInventoryWidgetTemplateFile(model),
  ];
}

function composedDashboardEntrypointFile(model: ComposedDashboardSourcePlanModel): AuthoringSourceFileEdit {
  return standardAureliaEntrypointFile(model);
}

function composedDashboardRootComponentFile(model: ComposedDashboardSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootComponentPath,
    'root-component',
    'typescript',
    'create-root-component',
    fillSourceTemplate(ROOT_COMPONENT_SOURCE, {
      CHART_WIDGET_CLASS: model.chartWidgetClassName,
      CHART_WIDGET_MODULE: moduleSpecifier(model.rootComponentPath, model.chartWidgetPath, false),
      INVENTORY_WIDGET_CLASS: model.inventoryWidgetClassName,
      INVENTORY_WIDGET_MODULE: moduleSpecifier(model.rootComponentPath, model.inventoryWidgetPath, false),
      ROOT_COMPONENT_CLASS: model.rootComponentClassName,
      ROOT_ELEMENT_NAME: model.rootElementName,
      ROOT_TEMPLATE_MODULE: moduleSpecifier(model.rootComponentPath, model.rootTemplatePath, true),
      STATE_CLASS: model.stateClassName,
      STATE_MODULE: moduleSpecifier(model.rootComponentPath, model.statePath, false),
    }),
  );
}

function composedDashboardRootTemplateFile(model: ComposedDashboardSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootTemplatePath,
    'template',
    'html',
    'create-external-template',
    ROOT_TEMPLATE_SOURCE,
  );
}

function composedDashboardStateFile(model: ComposedDashboardSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.statePath,
    'state-model',
    'typescript',
    'create-state-model',
    fillSourceTemplate(STATE_SOURCE, {
      CHART_WIDGET_CLASS: model.chartWidgetClassName,
      CHART_WIDGET_MODULE: moduleSpecifier(model.statePath, model.chartWidgetPath, false),
      INVENTORY_WIDGET_CLASS: model.inventoryWidgetClassName,
      INVENTORY_WIDGET_MODULE: moduleSpecifier(model.statePath, model.inventoryWidgetPath, false),
      STATE_CLASS: model.stateClassName,
      WIDGET_MODEL_NAME: model.widgetModelName,
    }),
  );
}

function composedDashboardChartWidgetComponentFile(model: ComposedDashboardSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.chartWidgetPath,
    'component',
    'typescript',
    'create-widget-component',
    fillSourceTemplate(CHART_WIDGET_COMPONENT_SOURCE, {
      CHART_WIDGET_CLASS: model.chartWidgetClassName,
      CHART_WIDGET_ELEMENT_NAME: model.chartWidgetElementName,
      CHART_WIDGET_TEMPLATE_MODULE: moduleSpecifier(model.chartWidgetPath, model.chartWidgetTemplatePath, true),
      STATE_MODULE: moduleSpecifier(model.chartWidgetPath, model.statePath, false),
      WIDGET_MODEL_NAME: model.widgetModelName,
    }),
  );
}

function composedDashboardChartWidgetTemplateFile(model: ComposedDashboardSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.chartWidgetTemplatePath,
    'template',
    'html',
    'create-external-template',
    CHART_WIDGET_TEMPLATE_SOURCE,
  );
}

function composedDashboardInventoryWidgetComponentFile(model: ComposedDashboardSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.inventoryWidgetPath,
    'component',
    'typescript',
    'create-widget-component',
    fillSourceTemplate(INVENTORY_WIDGET_COMPONENT_SOURCE, {
      INVENTORY_WIDGET_CLASS: model.inventoryWidgetClassName,
      INVENTORY_WIDGET_ELEMENT_NAME: model.inventoryWidgetElementName,
      INVENTORY_WIDGET_TEMPLATE_MODULE: moduleSpecifier(model.inventoryWidgetPath, model.inventoryWidgetTemplatePath, true),
      STATE_MODULE: moduleSpecifier(model.inventoryWidgetPath, model.statePath, false),
      WIDGET_MODEL_NAME: model.widgetModelName,
    }),
  );
}

function composedDashboardInventoryWidgetTemplateFile(model: ComposedDashboardSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.inventoryWidgetTemplatePath,
    'template',
    'html',
    'create-external-template',
    INVENTORY_WIDGET_TEMPLATE_SOURCE,
  );
}

const ROOT_COMPONENT_SOURCE = sourceText(`import { customElement, resolve } from 'aurelia';
import { __CHART_WIDGET_CLASS__ } from '__CHART_WIDGET_MODULE__';
import { __INVENTORY_WIDGET_CLASS__ } from '__INVENTORY_WIDGET_MODULE__';
import { __STATE_CLASS__ } from '__STATE_MODULE__';
import template from '__ROOT_TEMPLATE_MODULE__';

@customElement({
  name: '__ROOT_ELEMENT_NAME__',
  template,
  dependencies: [__CHART_WIDGET_CLASS__, __INVENTORY_WIDGET_CLASS__],
})
export class __ROOT_COMPONENT_CLASS__ {
  readonly state = resolve(__STATE_CLASS__);
  summaryComposition?: unknown;
  summaryPending?: Promise<void> | void;

  readonly summaryTemplate = '<p class="dashboard-summary">Alert summary is composed at runtime.</p>';

  getAsyncSummaryTemplate(): Promise<string> {
    return Promise.resolve(this.summaryTemplate);
  }

  getAsyncFeaturedComponent(): Promise<typeof __INVENTORY_WIDGET_CLASS__> {
    return Promise.resolve(__INVENTORY_WIDGET_CLASS__);
  }

  binding(): void {
    void this.state.loadDashboard();
  }
}
`);

const ROOT_TEMPLATE_SOURCE = sourceText(`<main class="dashboard-shell">
  <header>
    <h1>Operations Dashboard</h1>
    <p>Active alerts: \${state.alertCount}</p>
  </header>

  <au-compose template.bind="summaryTemplate" scope-behavior="scoped" tag="aside" flush-mode="async" composition.bind="summaryComposition" composing.bind="summaryPending"></au-compose>
  <au-compose template.bind="getAsyncSummaryTemplate()" scope-behavior="scoped" flush-mode="async"></au-compose>

  <section class="featured-widget">
    <h2>Featured Inventory</h2>
    <au-compose component="inventory-widget" model.bind="state.featuredWidget"></au-compose>
    <au-compose component.bind="getAsyncFeaturedComponent()" model.bind="state.featuredWidget" flush-mode="async"></au-compose>
  </section>

  <section class="dashboard-grid">
    <article repeat.for="widget of state.widgets" class="dashboard-card \${widget.kind}">
      <h2>\${widget.title}</h2>
      <au-compose component.bind="widget.component" model.bind="widget" flush-mode="async"></au-compose>
    </article>
  </section>
</main>
`);

const STATE_SOURCE = sourceText(`import { __CHART_WIDGET_CLASS__ } from '__CHART_WIDGET_MODULE__';
import { __INVENTORY_WIDGET_CLASS__ } from '__INVENTORY_WIDGET_MODULE__';

export type DashboardWidgetKind = 'chart' | 'inventory';

export interface DashboardInventoryItem {
  readonly sku: string;
  readonly label: string;
  readonly count: number;
}

export interface __WIDGET_MODEL_NAME__ {
  readonly id: string;
  readonly kind: DashboardWidgetKind;
  readonly title: string;
  readonly component: typeof __CHART_WIDGET_CLASS__ | typeof __INVENTORY_WIDGET_CLASS__;
  readonly points: readonly number[];
  readonly items: readonly DashboardInventoryItem[];
}

export class __STATE_CLASS__ {
  readonly widgets: readonly __WIDGET_MODEL_NAME__[] = [
    {
      id: 'orders',
      kind: 'chart',
      title: 'Order Trend',
      component: __CHART_WIDGET_CLASS__,
      points: [12, 18, 16, 24],
      items: [],
    },
    {
      id: 'stock',
      kind: 'inventory',
      title: 'Inventory Watch',
      component: __INVENTORY_WIDGET_CLASS__,
      points: [],
      items: [
        { sku: 'lamp-1', label: 'Task lamp', count: 6 },
        { sku: 'chair-1', label: 'Reading chair', count: 2 },
        { sku: 'shelf-1', label: 'Wall shelf', count: 0 },
      ],
    },
  ];

  get featuredWidget(): __WIDGET_MODEL_NAME__ {
    return this.widgets.find((widget) => widget.kind === 'inventory') ?? this.widgets[0]!;
  }

  get alertCount(): number {
    return this.widgets
      .flatMap((widget) => widget.items)
      .filter((item) => item.count <= 2).length;
  }

  async loadDashboard(): Promise<void> {
    await Promise.resolve();
  }
}
`);

const CHART_WIDGET_COMPONENT_SOURCE = sourceText(`import { customElement } from 'aurelia';
import type { __WIDGET_MODEL_NAME__ } from '__STATE_MODULE__';
import template from '__CHART_WIDGET_TEMPLATE_MODULE__';

@customElement({
  name: '__CHART_WIDGET_ELEMENT_NAME__',
  template,
})
export class __CHART_WIDGET_CLASS__ {
  model: __WIDGET_MODEL_NAME__ | null = null;

  activate(model: __WIDGET_MODEL_NAME__): void {
    this.model = model;
  }

  get peakLabel(): string {
    const peak = Math.max(0, ...(this.model?.points ?? []));
    return peak === 0 ? 'No samples yet' : \`Peak \${peak}\`;
  }
}
`);

const CHART_WIDGET_TEMPLATE_SOURCE = sourceText(`<div if.bind="model" class="chart-widget">
  <p>\${peakLabel}</p>
  <ol>
    <li repeat.for="point of model.points">\${point}</li>
  </ol>
</div>
<p else>No chart selected.</p>
`);

const INVENTORY_WIDGET_COMPONENT_SOURCE = sourceText(`import { customElement } from 'aurelia';
import type { __WIDGET_MODEL_NAME__ } from '__STATE_MODULE__';
import template from '__INVENTORY_WIDGET_TEMPLATE_MODULE__';

@customElement({
  name: '__INVENTORY_WIDGET_ELEMENT_NAME__',
  template,
})
export class __INVENTORY_WIDGET_CLASS__ {
  model: __WIDGET_MODEL_NAME__ | null = null;

  activate(model: __WIDGET_MODEL_NAME__): void {
    this.model = model;
  }
}
`);

const INVENTORY_WIDGET_TEMPLATE_SOURCE = sourceText(`<ul if.bind="model" class="inventory-widget">
  <li repeat.for="item of model.items" class="\${item.count <= 2 ? 'low-stock' : 'in-stock'}">
    <span>\${item.label}</span>
    <strong>\${item.count}</strong>
  </li>
</ul>
<p else>No inventory selected.</p>
`);
