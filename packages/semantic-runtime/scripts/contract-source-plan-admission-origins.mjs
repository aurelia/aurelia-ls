import assert from 'node:assert/strict';
import {
  AureliaConfigurationAdmissionKind,
  SourcePlanContributionKind,
  SourcePlanContributionOriginKind,
  aureliaConfigurationAdmissionSourceSet,
  aureliaRouterConfigurationAdmissionSource,
  aureliaStateDefaultConfigurationAdmissionSource,
  configuredAureliaEntrypointFile,
  typeScriptImportStatements,
} from '../out/index.js';
import { routerRouteConfigurationObjectExpressionSourceText } from '../out/router/route-configuration-source.js';

const admissionSet = aureliaConfigurationAdmissionSourceSet([
  aureliaRouterConfigurationAdmissionSource(),
  aureliaStateDefaultConfigurationAdmissionSource({
    stateModuleSpecifier: './state',
    initialStateName: 'initialState',
    handlerName: 'handler',
  }),
]);
const entrypointFile = configuredAureliaEntrypointFile({
  entrypointPath: 'src/main.ts',
  rootComponentPath: 'src/my-app.ts',
  rootComponentClassName: 'MyApp',
  configurationAdmission: admissionSet,
});
const routerOnlyEntrypointFile = configuredAureliaEntrypointFile({
  entrypointPath: 'src/main.ts',
  rootComponentPath: 'src/my-app.ts',
  rootComponentClassName: 'MyApp',
  configurationAdmission: aureliaConfigurationAdmissionSourceSet([
    aureliaRouterConfigurationAdmissionSource(),
  ]),
});

assert.ok(
  routerOnlyEntrypointFile.text?.text.includes('.register(RouterConfiguration)'),
  'Expected single-line router registration to stay compact in generated entrypoint source.',
);

assert.equal(
  typeScriptImportStatements([
    { moduleSpecifier: './routes/task-item-list-route', namedImports: ['TaskItemListRoute'] },
    { moduleSpecifier: '@aurelia/router', namedImports: ['route'] },
    { moduleSpecifier: './routes/task-item-detail-route', namedImports: ['TaskItemDetailRoute'] },
  ]),
  "import { route } from '@aurelia/router';\nimport { TaskItemListRoute } from './routes/task-item-list-route';\nimport { TaskItemDetailRoute } from './routes/task-item-detail-route';\n",
  'Expected generated TypeScript imports to place package imports before relative imports while preserving caller order inside each group.',
);

assert.equal(
  routerRouteConfigurationObjectExpressionSourceText({
    title: 'Task Browser',
    routes: [
      {
        path: '',
        redirectTo: 'tasks',
      },
      {
        id: 'taskItems',
        path: 'tasks',
        componentIdentifier: 'TaskItemListRoute',
        title: 'Tasks',
        viewport: 'main',
        routes: [
          {
            id: 'task-item-detail',
            path: ':taskId',
            componentIdentifier: 'TaskItemDetailRoute',
            title: 'Task Detail',
            viewport: 'detail',
          },
        ],
      },
    ],
  }),
  `{
  title: 'Task Browser',
  routes: [
    {
      path: '',
      redirectTo: 'tasks',
    },
    {
      id: 'taskItems',
      path: 'tasks',
      component: TaskItemListRoute,
      title: 'Tasks',
      viewport: 'main',
      routes: [
        {
          id: 'task-item-detail',
          path: ':taskId',
          component: TaskItemDetailRoute,
          title: 'Task Detail',
          viewport: 'detail',
        },
      ],
    },
  ],
}`,
  'Expected generated route configuration object literals to keep trailing commas in multiline arrays and objects.',
);

assertOriginContribution(entrypointFile.contributions, {
  admissionKind: AureliaConfigurationAdmissionKind.RouterConfiguration,
  contributionKind: SourcePlanContributionKind.TypeScriptImportRequirement,
  summary: 'router configuration import',
});
assertOriginContribution(entrypointFile.contributions, {
  admissionKind: AureliaConfigurationAdmissionKind.RouterConfiguration,
  contributionKind: SourcePlanContributionKind.SourceFragment,
  summary: 'router configuration registration expression',
});
assertOriginContribution(entrypointFile.contributions, {
  admissionKind: AureliaConfigurationAdmissionKind.StateDefaultConfiguration,
  contributionKind: SourcePlanContributionKind.TypeScriptImportRequirement,
  summary: 'state configuration import',
});
assertOriginContribution(entrypointFile.contributions, {
  admissionKind: AureliaConfigurationAdmissionKind.StateDefaultConfiguration,
  contributionKind: SourcePlanContributionKind.SourceFragment,
  summary: 'state configuration registration expression',
});

console.log(JSON.stringify({
  ok: true,
  entrypointContributionCount: entrypointFile.contributions.length,
}, null, 2));

function assertOriginContribution(contributions, expectation) {
  const match = contributions.find((contribution) =>
    contribution.kind === expectation.contributionKind
    && contribution.origin?.kind === SourcePlanContributionOriginKind.AureliaConfigurationAdmission
    && contribution.origin.admissionKind === expectation.admissionKind
  );
  assert.ok(
    match != null,
    `Expected source plan contributions to retain ${expectation.summary} origin ${expectation.admissionKind}.`,
  );
}
