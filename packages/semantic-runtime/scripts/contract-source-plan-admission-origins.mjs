import assert from 'node:assert/strict';
import ts from 'typescript';
import {
  AureliaConfigurationAdmissionKind,
  FrameworkRegistrationCapability,
  FrameworkRegistrationKind,
  SourcePlanContributionKind,
  SourcePlanContributionOriginKind,
  aureliaFrameworkRegistrationAdmissionSource,
  aureliaConfigurationAdmissionSourceSet,
  aureliaRouterConfigurationAdmissionSource,
  aureliaStateDefaultConfigurationAdmissionSource,
  configuredAureliaEntrypointFile,
  planAureliaRegisterChainSourceOperation,
  planTypeScriptImportSourceOperations,
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

const shorthandAdmission = aureliaFrameworkRegistrationAdmissionSource({
  capability: FrameworkRegistrationCapability.RuntimeHtmlShortHandBindingSyntax,
  preferredModuleName: '@aurelia/runtime-html',
});
assert.ok(shorthandAdmission != null, 'Expected shorthand binding syntax to produce a framework registration admission source.');
assert.equal(shorthandAdmission.registrationKind, FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax);
assertFrameworkRegistrationOriginContribution(shorthandAdmission.entrypointImports[0].contributions, {
  registrationKind: FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax,
  capability: FrameworkRegistrationCapability.RuntimeHtmlShortHandBindingSyntax,
  contributionKind: SourcePlanContributionKind.TypeScriptImportRequirement,
  summary: 'shorthand syntax import',
});
assertFrameworkRegistrationOriginContribution(
  typeof shorthandAdmission.registrationExpressions[0] === 'string'
    ? []
    : shorthandAdmission.registrationExpressions[0].contributions,
  {
    registrationKind: FrameworkRegistrationKind.RuntimeHtmlShortHandBindingSyntax,
    capability: FrameworkRegistrationCapability.RuntimeHtmlShortHandBindingSyntax,
    contributionKind: SourcePlanContributionKind.SourceFragment,
    summary: 'shorthand syntax registration expression',
  },
);

const shorthandMainText = `import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { App } from './app';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: App,
  })
  .start();
`;
const shorthandSourceFile = ts.createSourceFile('src/main.ts', shorthandMainText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const importEdits = planTypeScriptImportSourceOperations(shorthandSourceFile, shorthandAdmission.entrypointImports);
assert.equal(importEdits.length, 1, 'Expected one import-clause source operation.');
assert.equal(importEdits[0].oldText, '{ Aurelia, StandardConfiguration }');
assert.equal(importEdits[0].newText, '{ Aurelia, StandardConfiguration, ShortHandBindingSyntax }');

const registerEdit = planAureliaRegisterChainSourceOperation(shorthandSourceFile, {
  appCallStart: shorthandMainText.indexOf('new Aurelia()'),
  appCallEnd: shorthandMainText.indexOf('\n  .start()'),
  registrationExpressions: shorthandAdmission.registrationExpressions,
});
assert.ok(registerEdit != null, 'Expected one app-root register-chain source operation.');
assert.equal(registerEdit.oldText, '');
assert.equal(registerEdit.newText, '.register(ShortHandBindingSyntax)\n  ');

for (const imports of [
  "import { Aurelia, StandardConfiguration, type ShortHandBindingSyntax, type SideType } from '@aurelia/runtime-html';",
  "import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';\nimport type { ShortHandBindingSyntax, SideType } from '@aurelia/runtime-html';",
  "import { Aurelia, StandardConfiguration, ShortHandBindingSyntax, type SideType } from '@aurelia/runtime-html';",
]) {
  const text = shorthandMainText.replace(/^import[^\n]+/u, imports);
  const source = ts.createSourceFile('main.ts', text, ts.ScriptTarget.Latest, true);
  const importsPlan = planTypeScriptImportSourceOperations(source, shorthandAdmission.entrypointImports);
  const chain = planAureliaRegisterChainSourceOperation(source, { registrationExpressions: shorthandAdmission.registrationExpressions });
  assert.ok(importsPlan && chain);
  let edited = text;
  for (const edit of [...importsPlan, chain].sort((left, right) => right.start - left.start)) {
    assert.equal(edited.slice(edit.start, edit.end), edit.oldText);
    edited = edited.slice(0, edit.start) + edit.newText + edited.slice(edit.end);
  }
  const { outputText } = ts.transpileModule(edited, { compilerOptions: { module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true } });
  assert.match(outputText, /import \{[^}]*\bShortHandBindingSyntax\b[^}]*\} from '@aurelia\/runtime-html'/u);
  assert.match(outputText, /\.register\(ShortHandBindingSyntax\)/u);
  assert.doesNotMatch(outputText, /\bSideType\b/u);
}
// Adding a value import must not displace a shebang, directive prologue or an import's line comment.
for (const [source, preserved, next] of [
  ["#!/usr/bin/env node\n'use strict'; // keep script mode\nbootstrap();", "'use strict'; // keep script mode", "bootstrap();"],
  ["import * as other from 'other'; // documentation for other\nbootstrap();", "import * as other from 'other'; // documentation for other", "bootstrap();"],
]) {
  const file = ts.createSourceFile('main.ts', source, ts.ScriptTarget.Latest, true);
  const [edit] = planTypeScriptImportSourceOperations(file, shorthandAdmission.entrypointImports);
  const updated = source.slice(0, edit.start) + edit.newText + source.slice(edit.end);
  assert.ok(updated.indexOf(preserved) >= 0 && updated.indexOf(preserved) < updated.indexOf('import { ShortHandBindingSyntax }'));
  assert.ok(updated.indexOf('import { ShortHandBindingSyntax }') < updated.indexOf(next));
}
// A second local default binding requires a distinct declaration. Existing type bindings can be promoted.
for (const [before, expected] of [
  ["import Other from 'm';", "import Other from 'm';\nimport Chosen from 'm';"],
  ["import type Chosen from 'm';", "import Chosen from 'm';"],
  ["import type {default as Chosen, Other} from 'm';", "import {default as Chosen, type Other} from 'm';"],
]) {
  const source = ts.createSourceFile('main.ts', before, ts.ScriptTarget.Latest, true);
  const edits = planTypeScriptImportSourceOperations(source, [{ moduleSpecifier: 'm', defaultImport: 'Chosen' }]);
  assert.ok(edits);
  let result = before;
  for (const e of [...edits].sort((a, b) => b.start - a.start)) result = result.slice(0, e.start) + e.newText + result.slice(e.end);
  assert.equal(result, expected);
}
const conflictingDefault = ts.createSourceFile('main.ts', "import {other as Chosen} from 'x';", ts.ScriptTarget.Latest, true);
assert.equal(planTypeScriptImportSourceOperations(conflictingDefault, [{ moduleSpecifier: 'm', defaultImport: 'Chosen' }]), null);

const occupiedName = ts.createSourceFile('main.ts', "import { Other as ShortHandBindingSyntax } from '@aurelia/runtime-html';", ts.ScriptTarget.Latest, true);
assert.equal(planTypeScriptImportSourceOperations(occupiedName, shorthandAdmission.entrypointImports), null);

const multiRootMainText = `new Aurelia()
  .register(ShortHandBindingSyntax)
  .app({
    host: first,
    component: FirstApp,
  })
  .start();

new Aurelia()
  .app({
    host: second,
    component: SecondApp,
  })
  .start();
`;
const multiRootSourceFile = ts.createSourceFile('src/main.ts', multiRootMainText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const firstAppRootStart = multiRootMainText.indexOf('new Aurelia()');
const firstAppRootEnd = multiRootMainText.indexOf('\n  .start();') + '\n  .start();'.length;
const duplicateRegisterEdit = planAureliaRegisterChainSourceOperation(multiRootSourceFile, {
  appCallStart: firstAppRootStart,
  appCallEnd: firstAppRootEnd,
  registrationExpressions: shorthandAdmission.registrationExpressions,
});
assert.equal(duplicateRegisterEdit, null, 'Expected the planner to skip expressions already present on the same app-root chain.');

const secondAppRootStart = multiRootMainText.indexOf('new Aurelia()', firstAppRootEnd);
const secondAppRootEnd = multiRootMainText.indexOf('\n  .start();', secondAppRootStart) + '\n  .start();'.length;
const scopedRegisterEdit = planAureliaRegisterChainSourceOperation(multiRootSourceFile, {
  appCallStart: secondAppRootStart,
  appCallEnd: secondAppRootEnd,
  registrationExpressions: shorthandAdmission.registrationExpressions,
});
assert.ok(scopedRegisterEdit != null, 'Expected another app-root chain in the same file to receive its own registration edit.');
assert.equal(scopedRegisterEdit.oldText, '');
assert.equal(scopedRegisterEdit.newText, '.register(ShortHandBindingSyntax)\n  ');

const routerAdmission = aureliaFrameworkRegistrationAdmissionSource({
  capability: FrameworkRegistrationCapability.RouterDefaultResources,
  requiredRegistrationKinds: [FrameworkRegistrationKind.RouterConfiguration],
  preferredModuleName: '@aurelia/router',
});
assert.ok(routerAdmission != null, 'Expected router resources to admit RouterConfiguration.');
assert.equal(routerAdmission.registrationKind, FrameworkRegistrationKind.RouterConfiguration);

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

function assertFrameworkRegistrationOriginContribution(contributions, expectation) {
  const match = contributions?.find((contribution) =>
    contribution.kind === expectation.contributionKind
    && contribution.origin?.kind === SourcePlanContributionOriginKind.AureliaFrameworkRegistrationAdmission
    && contribution.origin.registrationKind === expectation.registrationKind
    && contribution.origin.capability === expectation.capability
  );
  assert.ok(
    match != null,
    `Expected source plan contributions to retain ${expectation.summary} origin ${expectation.registrationKind}.`,
  );
}
