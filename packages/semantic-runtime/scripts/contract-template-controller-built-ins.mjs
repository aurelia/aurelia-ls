import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  createSemanticRuntime,
  SemanticAppQueryKind,
} from '../out/index.js';
import {
  TypeSystemProjectBuilder,
} from '../out/type-system/project.js';
import {
  readTypeSystemOverlayDiagnostics,
} from '../out/type-system/diagnostics.js';
import {
  TemplateTypeSystemOverlayBuilder,
} from '../out/template/template-type-system-overlay.js';
import {
  frameworkTemplateControllerSemantics,
  runtimeHtmlTemplateControllerSemantics,
} from '../out/template/template-controller-semantics.js';
import {
  RuntimeHtmlBuiltInResourceCatalogs,
  UiVirtualizationBuiltInResourceCatalogs,
} from '../out/resources/built-in-resources.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureRoot = path.join(packageRoot, 'fixtures/pressure/template-controller-built-ins');
const virtualRepeatFixtureRoot = path.join(packageRoot, 'fixtures/pressure/ui-virtualization-template-controller');
const frameworkRuntimeHtmlTemplateControllers = [
  { name: 'if', targetName: 'If' },
  { name: 'else', targetName: 'Else' },
  { name: 'repeat', targetName: 'Repeat' },
  { name: 'with', targetName: 'With' },
  { name: 'switch', targetName: 'Switch' },
  { name: 'case', targetName: 'Case' },
  { name: 'default-case', targetName: 'DefaultCase' },
  { name: 'promise', targetName: 'PromiseTemplateController' },
  { name: 'pending', targetName: 'PendingTemplateController' },
  { name: 'then', targetName: 'FulfilledTemplateController' },
  { name: 'catch', targetName: 'RejectedTemplateController' },
  { name: 'portal', targetName: 'Portal' },
];
const frameworkTemplateControllers = [
  ...frameworkRuntimeHtmlTemplateControllers,
  { name: 'virtual-repeat', targetName: 'VirtualRepeat' },
];

const runtime = await createSemanticRuntime({
  workspaceRoot: fixtureRoot,
  storeKey: 'template-controller-built-ins-contract',
});
const app = await runtime.openApp({
  analysisDepth: 'binding-observation',
});

const runtimeControllers = collectAppRows(app, SemanticAppQueryKind.RuntimeControllers, 100);
const resource = app.emission.templates.resources[0] ?? null;
const overlayEmission = resource == null
  ? null
  : new TemplateTypeSystemOverlayBuilder(runtime.workspace.store, app.emission.typeSystem)
    .build(resource, 'contract-template-controller-built-ins');
const overlayTypeSystem = overlayEmission?.overlaySource == null
  ? null
  : new TypeSystemProjectBuilder().build(
    app.project,
    app.emission.evaluation,
    {
      overlaySources: [overlayEmission.overlaySource],
    },
  );
const overlayDiagnostics = overlayTypeSystem == null || overlayEmission?.overlaySource == null
  ? []
  : readTypeSystemOverlayDiagnostics(overlayTypeSystem).filter((diagnostic) =>
    diagnostic.overlayOriginKey === overlayEmission.overlaySource.originKey
  );
const runtimeHtmlCatalogControllers = RuntimeHtmlBuiltInResourceCatalogs.DefaultResources.resources
  .filter((resource) => resource.resourceKind === 'template-controller')
  .map((resource) => ({ name: resource.name, targetName: resource.targetName }))
  .sort(compareTemplateControllerRows);
const runtimeHtmlSemanticsControllers = runtimeHtmlTemplateControllerSemantics
  .map((semantics) => ({ name: semantics.controllerName, targetName: semanticTargetNameForControllerName(semantics.controllerName) }))
  .sort(compareTemplateControllerRows);
const frameworkSemanticsControllers = frameworkTemplateControllerSemantics
  .map((semantics) => ({ name: semantics.controllerName, targetName: semanticTargetNameForControllerName(semantics.controllerName) }))
  .sort(compareTemplateControllerRows);
const uiVirtualizationCatalogControllers = UiVirtualizationBuiltInResourceCatalogs.DefaultResources.resources
  .filter((resource) => resource.resourceKind === 'template-controller')
  .map((resource) => ({ name: resource.name, targetName: resource.targetName }))
  .sort(compareTemplateControllerRows);
const expressionTypes = overlayTypeSystem == null || overlayEmission?.overlaySource == null
  ? new Map()
  : readOverlayVariableExpressionTypes(overlayTypeSystem, overlayEmission.overlaySource.fileName);
const branchSlotDisplays = branchScopeSlotDisplays(resource);
const virtualRepeatProbe = await readVirtualRepeatProbe();

const failures = [];
const assert = (condition, message) => {
  if (!condition) {
    failures.push(message);
  }
};

assert(resource != null, 'Expected the built-in template-controller fixture to compile one app resource.');
assert(overlayEmission?.skippedExpressions.length === 0, `Expected all built-in controller expressions to be overlay-representable, observed skips=${overlayEmission?.skippedExpressions.length ?? 'missing'}.`);
assert(overlayDiagnostics.length === 0, `Expected built-in controller overlay to have no diagnostics, observed ${overlayDiagnostics.length}.`);
assert(overlayEmission?.expressionProbes.some((probe) => probe.expressionText === 'resolved') !== true, 'Expected promise then target expression to be owned by promise-result scope, not emitted as a standalone probe.');
assert(overlayEmission?.expressionProbes.some((probe) => probe.expressionText === 'reason') !== true, 'Expected promise catch target expression to be owned by promise-result scope, not emitted as a standalone probe.');
assertSameTemplateControllerSet(
  runtimeHtmlCatalogControllers,
  frameworkRuntimeHtmlTemplateControllers,
  'runtime-html built-in resource catalog',
);
assertSameTemplateControllerSet(
  runtimeHtmlSemanticsControllers,
  frameworkRuntimeHtmlTemplateControllers,
  'runtime-html template-controller semantics catalog',
);
assertSameTemplateControllerSet(
  frameworkSemanticsControllers,
  frameworkTemplateControllers,
  'framework template-controller semantics catalog',
);
assertSameTemplateControllerSet(
  uiVirtualizationCatalogControllers,
  [{ name: 'virtual-repeat', targetName: 'VirtualRepeat' }],
  'ui-virtualization built-in resource catalog',
);

assertController('if', 'conditional', 'optional');
assertController('else', 'conditional-else', 'optional', 'else-to-if', 'if');
assertController('repeat', 'iteration', 'many', null, null, 4);
assertController('with', 'value-scope', 'single');
assertController('portal', 'pass-through', 'single');
assertController('promise', 'promise', 'single');
assertController('pending', 'promise-pending', 'optional', 'promise-branch-to-promise', 'promise');
assertController('then', 'promise-fulfilled', 'optional', 'promise-branch-to-promise', 'promise');
assertController('catch', 'promise-rejected', 'optional', 'promise-branch-to-promise', 'promise');
assertController('switch', 'switch', 'single');
assertController('case', 'switch-case', 'optional', 'switch-case-to-switch', 'switch', 5);
assertController('default-case', 'switch-default', 'optional', 'switch-case-to-switch', 'switch');

assertExpressionType('$parent.selectProduct(id)', 'boolean');
assertExpressionType('selectedProduct.label', 'string');
assertExpressionType('bookOnly(currentItem)', 'string');
assertExpressionType('currentItem.pages', 'number');
assertExpressionType('notBookOnly(currentItem)', 'string');
assertExpressionType('stringOnly(currentPrimitive)', 'string');
assertExpressionType('numberOnly(currentPrimitive)', 'string');
assertExpressionType('bookOnly(probedItem)', 'string');
assertExpressionType('notBookOnly(probedItem)', 'string');
assertExpressionType('physicalOnly(mixedProduct)', 'string');
assertExpressionType('mixedProduct.shippingWeight', 'number');
assertExpressionType('digitalOnly(mixedProduct)', 'string');
assertExpressionType('label', 'string');
assertExpressionType('labelLength()', 'number');
assertExpressionType('arrayProduct.label', 'string');
assertExpressionType('key', 'string');
assertExpressionType('product.label', 'string');
assertExpressionType('product.labelLength()', 'number');
assertExpressionType('$index', 'number');
assertExpressionType('$length', 'number');
assertExpressionType('setProduct.label', 'string');
assertExpressionType('repeatIndex.toFixed()', 'string');
assertExpressionType('resolved.label', 'string');
assertExpressionType('resolved.labelLength()', 'number');
assertExpressionType('formatReason(reason)', 'string');
assertExpressionType('listOnly(mode)', 'string');
assertExpressionType('detailOnly(mode)', 'string');
assertExpressionType('otherOnly(mode)', 'string');
assertExpressionType('listOrDetailOnly(modeGroup)', 'string');
assertExpressionType('otherOnly(modeGroup)', 'string');
assertExpressionType('listOnly(fallMode)', 'string');
assertExpressionType('listOrDetailOnly(fallMode)', 'string');
assertExpressionType('otherOnly(fallMode)', 'string');
assertExpressionType('portalMessage', 'string');
assert(
  virtualRepeatProbe.controllerCount >= 1,
  `Expected virtual-repeat fixture to materialize a virtual-repeat template-controller row, observed ${virtualRepeatProbe.controllerCount}.`,
);
assert(
  virtualRepeatProbe.expressionTypes.get('virtualProduct.label') === 'string',
  `Expected virtual-repeat local member expression to have type string, observed ${virtualRepeatProbe.expressionTypes.get('virtualProduct.label') ?? 'missing'}.`,
);
assert(
  virtualRepeatProbe.expressionTypes.get('$index') === 'number',
  `Expected virtual-repeat override-context $index expression to have type number, observed ${virtualRepeatProbe.expressionTypes.get('$index') ?? 'missing'}.`,
);
assert(
  virtualRepeatProbe.overlayDiagnosticCount === 0,
  `Expected virtual-repeat overlay to have no diagnostics, observed ${virtualRepeatProbe.overlayDiagnosticCount}.`,
);
assert(
  virtualRepeatProbe.skippedExpressionCount === 0,
  `Expected virtual-repeat overlay to have no skipped expressions, observed ${virtualRepeatProbe.skippedExpressionCount}.`,
);

assertBranchSlotDisplay('mode', '"list"');
assertBranchSlotDisplay('mode', '"detail"');
assertBranchSlotDisplay('mode', '"other"');
assertBranchSlotDisplay('modeGroup', '"list" | "detail"');
assertBranchSlotDisplay('modeGroup', '"other"');
assertBranchSlotDisplay('fallMode', '"list"');
assertBranchSlotDisplay('fallMode', '"list" | "detail"');
assertBranchSlotDisplay('fallMode', '"other"');
assertBranchSlotDisplay('currentItem', 'BookCatalogItem');
assertBranchSlotDisplay('currentItem', 'ServiceCatalogItem | ArchivedCatalogItem');
assertBranchSlotDisplay('currentPrimitive', 'string');
assertBranchSlotDisplay('currentPrimitive', 'number');
assertBranchSlotDisplay('probedItem', 'BookCatalogItem');
assertBranchSlotDisplay('probedItem', 'ServiceCatalogItem | ArchivedCatalogItem');
assertBranchSlotDisplay('mixedProduct', 'PhysicalBuiltInProduct');
assertBranchSlotDisplay('mixedProduct', 'DigitalBuiltInProduct');

const summary = {
  fixtureRoot,
  runtimeControllers: runtimeControllers.length,
  templateControllerNames: runtimeControllers
    .filter((row) => row.creationKind === 'template-controller')
    .map((row) => row.controllerName)
    .sort(),
  runtimeHtmlCatalogControllers,
  runtimeHtmlSemanticsControllers,
  frameworkSemanticsControllers,
  uiVirtualizationCatalogControllers,
  overlay: {
    probes: overlayEmission?.expressionProbes.length ?? 0,
    skips: overlayEmission?.skippedExpressions.length ?? 0,
    diagnostics: overlayDiagnostics.length,
  },
  expressionTypes: Object.fromEntries(expressionTypes),
  virtualRepeat: {
    controllerCount: virtualRepeatProbe.controllerCount,
    expressionTypes: Object.fromEntries(virtualRepeatProbe.expressionTypes),
    overlayDiagnostics: virtualRepeatProbe.overlayDiagnosticCount,
    skippedExpressions: virtualRepeatProbe.skippedExpressionCount,
  },
  branchSlotDisplays: Object.fromEntries([...branchSlotDisplays].map(([key, value]) => [key, [...value].sort()])),
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

function assertController(
  controllerName,
  flowKind,
  childViewCardinality,
  linkKind = null,
  linkedControllerName = null,
  minimumCount = 1,
) {
  const matches = runtimeControllers.filter((row) =>
    row.creationKind === 'template-controller'
    && row.controllerName === controllerName
    && row.templateControllerFlowKind === flowKind
    && row.childViewCardinality === childViewCardinality
    && row.templateControllerLinkKind === linkKind
    && row.linkedTemplateControllerName === linkedControllerName
    && row.childViewRenderingState === 'expanded-aggregate'
    && row.hasScope === true
  );
  assert(
    matches.length >= minimumCount,
    `Expected ${controllerName} controller row with flow=${flowKind}, cardinality=${childViewCardinality}, link=${linkKind ?? 'none'}; observed ${matches.length}.`,
  );
}

function assertExpressionType(expressionText, expectedType) {
  const actual = expressionTypes.get(expressionText) ?? null;
  assert(
    actual === expectedType,
    `Expected overlay expression ${expressionText} to have type ${expectedType}, observed ${actual ?? 'missing'}.`,
  );
}

function assertBranchSlotDisplay(slotName, expectedType) {
  const displays = branchSlotDisplays.get(slotName) ?? new Set();
  assert(
    displays.has(expectedType),
    `Expected durable template-controller branch scope to narrow ${slotName} to ${expectedType}; observed ${[...displays].join(', ') || 'none'}.`,
  );
}

function assertSameTemplateControllerSet(actual, expected, label) {
  const actualKey = actual
    .slice()
    .sort(compareTemplateControllerRows)
    .map(templateControllerRowKey)
    .join('|');
  const expectedKey = expected
    .slice()
    .sort(compareTemplateControllerRows)
    .map(templateControllerRowKey)
    .join('|');
  assert(
    actualKey === expectedKey,
    `Expected ${label} to mirror runtime-html template controllers ${expectedKey}; observed ${actualKey || 'none'}.`,
  );
}

function semanticTargetNameForControllerName(controllerName) {
  const match = frameworkTemplateControllers.find((row) => row.name === controllerName);
  return match?.targetName ?? `<unmapped:${controllerName}>`;
}

function templateControllerRowKey(row) {
  return `${row.name}:${row.targetName}`;
}

function compareTemplateControllerRows(left, right) {
  return left.name.localeCompare(right.name) || left.targetName.localeCompare(right.targetName);
}

function readOverlayVariableExpressionTypes(
  typeSystem,
  overlayFileName,
) {
  const sourceFile = typeSystem.readProgramSourceFileByPath(overlayFileName);
  const rows = new Map();
  if (sourceFile == null) {
    return rows;
  }
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.name.text.startsWith('__au_expr_')
      && node.initializer != null
    ) {
      rows.set(
        node.initializer.getText(sourceFile),
        typeSystem.checker.typeToString(typeSystem.checker.getTypeAtLocation(node.name)),
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return rows;
}

async function readVirtualRepeatProbe() {
  const runtime = await createSemanticRuntime({
    workspaceRoot: virtualRepeatFixtureRoot,
    storeKey: 'ui-virtualization-template-controller-contract',
  });
  const app = await runtime.openApp({
    analysisDepth: 'binding-observation',
  });
  const runtimeControllers = collectAppRows(app, SemanticAppQueryKind.RuntimeControllers, 100);
  const resource = app.emission.templates.resources[0] ?? null;
  if (resource == null) {
    return {
      controllerCount: 0,
      expressionTypes: new Map(),
      overlayDiagnosticCount: 0,
      skippedExpressionCount: 0,
    };
  }
  const overlayEmission = new TemplateTypeSystemOverlayBuilder(runtime.workspace.store, app.emission.typeSystem)
    .build(resource, 'contract-ui-virtualization-template-controller');
  if (overlayEmission.overlaySource == null) {
    return {
      controllerCount: virtualRepeatControllerCount(runtimeControllers),
      expressionTypes: new Map(),
      overlayDiagnosticCount: 0,
      skippedExpressionCount: overlayEmission.skippedExpressions.length,
    };
  }
  const overlayTypeSystem = new TypeSystemProjectBuilder().build(
    app.project,
    app.emission.evaluation,
    {
      overlaySources: [overlayEmission.overlaySource],
    },
  );
  const overlayDiagnostics = readTypeSystemOverlayDiagnostics(overlayTypeSystem).filter((diagnostic) =>
    diagnostic.overlayOriginKey === overlayEmission.overlaySource.originKey
  );
  return {
    controllerCount: virtualRepeatControllerCount(runtimeControllers),
    expressionTypes: readOverlayVariableExpressionTypes(overlayTypeSystem, overlayEmission.overlaySource.fileName),
    overlayDiagnosticCount: overlayDiagnostics.length,
    skippedExpressionCount: overlayEmission.skippedExpressions.length,
  };
}

function virtualRepeatControllerCount(runtimeControllers) {
  return runtimeControllers.filter((row) =>
    row.creationKind === 'template-controller'
    && row.controllerName === 'virtual-repeat'
    && row.templateControllerFlowKind === 'iteration'
    && row.childViewCardinality === 'many'
    && row.childViewRenderingState === 'expanded-aggregate'
    && row.hasScope === true
  ).length;
}

function collectAppRows(app, kind, pageSize) {
  const rows = [];
  let cursor = null;
  do {
    const answer = app.ask({
      kind,
      page: { size: pageSize, cursor },
    });
    rows.push(...answer.value.rows);
    cursor = answer.page?.nextCursor ?? null;
  } while (cursor != null);
  return rows;
}

function branchScopeSlotDisplays(resource) {
  const rows = new Map();
  for (const scope of resource?.runtimeAnalysis.scopes.readScopes() ?? []) {
    if (!scope.scopeCreators.some((creator) =>
      creator.creatorKind === 'template-controller-branch'
      || creator.creatorKind === 'template-controller-condition'
    )) {
      continue;
    }
    for (const slot of scope.bindingContext.slots) {
      if (slot.targetType?.display == null) {
        continue;
      }
      const displays = rows.get(slot.name) ?? new Set();
      displays.add(slot.targetType.display);
      rows.set(slot.name, displays);
    }
  }
  return rows;
}
