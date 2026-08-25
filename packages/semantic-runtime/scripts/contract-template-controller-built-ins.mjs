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
import { projectTypeSystemProgramSources } from '../out/type-system/program-source-authority.js';
import {
  readTypeSystemOverlayDiagnostics,
} from '../out/type-system/diagnostics.js';
import {
  TemplateTypeSystemOverlayBuilder,
} from '../out/template/template-type-system-overlay.js';
import {
  IterateBindingInstruction,
  IteratorBindingInstruction,
  MultiAttrInstruction,
} from '../out/template/instruction-ir.js';
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
  : new TemplateTypeSystemOverlayBuilder(runtime.workspace.store, app.emission.project, app.emission.typeSystem)
    .build(resource, 'contract-template-controller-built-ins');
const overlayTypeSystem = overlayEmission?.overlaySource == null
  ? null
  : new TypeSystemProjectBuilder(projectTypeSystemProgramSources).build(
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
  : readOverlayVariableExpressionTypes(
      overlayTypeSystem,
      overlayEmission.overlaySource.fileName,
      overlayEmission.expressionProbes,
    );
const branchSlotDisplays = branchScopeSlotDisplays(resource);
const promiseBranchLinks = (resource?.runtimeAnalysis.scopes.templateControllerLinks ?? [])
  .filter((link) => ['pending', 'then', 'catch'].includes(link.sourceController.name));
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
assert(overlayEmission?.expressionProbes.some((probe) => probe.authoredExpressionText === 'resolved') !== true, 'Expected the from-view then assignment target to be modeled by runtime-assignment state, not emitted as a standalone read probe.');
assert(overlayEmission?.expressionProbes.some((probe) => probe.authoredExpressionText === 'reason') !== true, 'Expected the from-view catch assignment target to be modeled by runtime-assignment state, not emitted as a standalone read probe.');
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
assertExpressionType('formatReason(carrierReason)', 'string');
assertExpressionType('formatReason($parent.rejectedReason)', 'string');
assert(
  new Set(promiseBranchLinks.map((link) => link.targetController.productHandle)).size === 4,
  `Expected promise branches to retain four concrete promise applications, observed ${new Set(promiseBranchLinks.map((link) => link.targetController.productHandle)).size}.`,
);
assert(
  promiseBranchLinks.every((link) =>
    link.targetController.name === 'promise'
    && link.sourceController.parent?.parent?.productHandle === link.targetController.productHandle
  ),
  'Expected every promise branch to link to its concrete enclosing promise controller application.',
);
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
assert(
  virtualRepeatProbe.syntaxCatalog?.packageId === 'ui-virtualization'
  && virtualRepeatProbe.syntaxCatalog?.group === 'ui-virtualization-syntax',
  `Expected DefaultVirtualizationConfiguration to admit the ui-virtualization syntax catalog, observed ${JSON.stringify(virtualRepeatProbe.syntaxCatalog)}.`,
);
assert(
  virtualRepeatProbe.syntaxCatalog?.patternTargetName === 'VirtualRepeatForAttributePattern'
  && virtualRepeatProbe.syntaxCatalog?.pattern === 'virtual-repeat.for'
  && virtualRepeatProbe.syntaxCatalog?.patternSymbols === '.-',
  `Expected exact virtual-repeat.for pattern identity, observed ${JSON.stringify(virtualRepeatProbe.syntaxCatalog)}.`,
);
assert(
  virtualRepeatProbe.syntaxCatalog?.commandTargetName === 'IterateBindingCommand'
  && virtualRepeatProbe.syntaxCatalog?.commandName === 'forof'
  && virtualRepeatProbe.syntaxCatalog?.commandKey === 'au:resource:binding-command:forof'
  && sameStrings(virtualRepeatProbe.syntaxCatalog?.producedInstructionTypeNames, ['IterateBindingInstruction']),
  `Expected exact forof command identity and IterateBindingInstruction framework product name, observed ${JSON.stringify(virtualRepeatProbe.syntaxCatalog)}.`,
);
assert(
  virtualRepeatProbe.syntaxCatalog?.sourceKind === 'external-address'
  && virtualRepeatProbe.syntaxCatalog?.sourceScheme === 'aurelia-package-catalog'
  && virtualRepeatProbe.syntaxCatalog?.sourceValue === 'ui-virtualization:ui-virtualization-syntax',
  `Expected ui-virtualization package-catalog provenance, observed ${JSON.stringify(virtualRepeatProbe.syntaxCatalog)}.`,
);
assert(
  virtualRepeatProbe.syntaxCatalog?.selectedByDefaultConfiguration === true,
  'Expected ui-virtualization.default-configuration to select the plugin syntax catalog.',
);
assert(
  virtualRepeatProbe.lowering?.syntaxTarget === 'virtual-repeat'
  && virtualRepeatProbe.lowering?.syntaxCommand === 'forof'
  && virtualRepeatProbe.lowering?.commandName === 'forof'
  && virtualRepeatProbe.lowering?.state === 'complete',
  `Expected virtual-repeat.for to lower through the selected forof command, observed ${JSON.stringify(virtualRepeatProbe.lowering)}.`,
);
assert(
  virtualRepeatProbe.lowering?.instructionClass === 'IterateBindingInstruction'
  && virtualRepeatProbe.lowering?.sharedIteratorAbstraction === true
  && virtualRepeatProbe.lowering?.frameworkInstructionType === 200
  && virtualRepeatProbe.lowering?.targetProperty === 'items'
  && sameStrings(virtualRepeatProbe.lowering?.localNames, ['virtualProduct'])
  && virtualRepeatProbe.lowering?.objectBindingSourceKeyCount === 0,
  `Expected forof to reuse the single-identifier semantic iterator abstraction, observed ${JSON.stringify(virtualRepeatProbe.lowering)}.`,
);
assert(
  virtualRepeatProbe.lowering?.gapTarget === 'gap'
  && virtualRepeatProbe.lowering?.gapCommand === null
  && virtualRepeatProbe.lowering?.gapValue === '8'
  && virtualRepeatProbe.lowering?.gapLinkedFromIterator === true,
  `Expected static virtual-repeat gap tail data to survive iterator lowering, observed ${JSON.stringify(virtualRepeatProbe.lowering)}.`,
);
assert(
  virtualRepeatProbe.unsupportedDeclaration?.issueCount === 3
  && virtualRepeatProbe.unsupportedDeclaration?.certainty === 'definite'
  && virtualRepeatProbe.unsupportedDeclaration?.message === 'Virtual repeat requires a single binding identifier and does not materialize destructured locals',
  `Expected one definite rejection per virtual-repeat binding pattern, observed ${JSON.stringify(virtualRepeatProbe.unsupportedDeclaration)}.`,
);
assert(
  sameStrings(virtualRepeatProbe.unsupportedDeclaration?.parsedLocalNames, ['label', 'nullableLabel', 'scalarItem'])
  && sameStrings(virtualRepeatProbe.unsupportedDeclaration?.objectBindingSourceKeys, ['label', 'label'])
  && virtualRepeatProbe.unsupportedDeclaration?.destructuredLocalProjected === false
  && virtualRepeatProbe.unsupportedDeclaration?.coreProjectionIssueCount === 0
  && virtualRepeatProbe.unsupportedDeclaration?.publicDiagnosticCount === 3
  && virtualRepeatProbe.unsupportedDeclaration?.publicDiagnosticMissingInput === 'virtual-repeat-declaration:binding-pattern-runtime-unsupported'
  && virtualRepeatProbe.unsupportedDeclaration?.publicDiagnosticSummary === 'Virtual repeat requires a single binding identifier and does not materialize destructured locals.',
  `Expected parser carriers without projected locals or borrowed core Repeat diagnostics, observed ${JSON.stringify(virtualRepeatProbe.unsupportedDeclaration)}.`,
);
assert(
  virtualRepeatProbe.capabilityDemand?.demandKind === 'ui-virtualization.default-resources'
  && virtualRepeatProbe.capabilityDemand?.requiredCapability === 'ui-virtualization.default-resources'
  && virtualRepeatProbe.capabilityDemand?.admissionState === 'admitted',
  `Expected exact admitted ui-virtualization capability demand, observed ${JSON.stringify(virtualRepeatProbe.capabilityDemand)}.`,
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
    diagnosticRows: overlayDiagnostics.map((diagnostic) => ({
      code: diagnostic.diagnostic.code,
      message: diagnostic.diagnostic.message,
      generatedSource: diagnostic.diagnostic.source == null
        ? null
        : {
            start: diagnostic.diagnostic.source.start,
            end: diagnostic.diagnostic.source.end,
            text: overlayEmission.overlaySource.text.slice(
              Math.max(0, (diagnostic.diagnostic.source.start ?? 0) - 80),
              Math.min(
                overlayEmission.overlaySource.text.length,
                (diagnostic.diagnostic.source.end ?? diagnostic.diagnostic.source.start ?? 0) + 80,
              ),
            ),
          },
      segment: diagnostic.segment?.label ?? null,
      authoredSource: diagnostic.authoredSource == null
        ? null
        : {
            start: diagnostic.authoredSource.sourceStart,
            end: diagnostic.authoredSource.sourceEnd,
            label: diagnostic.authoredSource.label,
          },
    })),
  },
  promiseBranchLinks: promiseBranchLinks.length,
  expressionTypes: Object.fromEntries(expressionTypes),
  virtualRepeat: {
    controllerCount: virtualRepeatProbe.controllerCount,
    expressionTypes: Object.fromEntries(virtualRepeatProbe.expressionTypes),
    overlayDiagnostics: virtualRepeatProbe.overlayDiagnosticCount,
    skippedExpressions: virtualRepeatProbe.skippedExpressionCount,
    syntaxCatalog: virtualRepeatProbe.syntaxCatalog,
    lowering: virtualRepeatProbe.lowering,
    unsupportedDeclaration: virtualRepeatProbe.unsupportedDeclaration,
    capabilityDemand: virtualRepeatProbe.capabilityDemand,
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
  expressionProbes = [],
) {
  const sourceFile = typeSystem.readProgramSourceFileByHostPath(overlayFileName);
  const rows = new Map();
  const authoredExpressionByLocal = new Map(expressionProbes.flatMap((probe) =>
    probe.authoredExpressionText == null ? [] : [[probe.localName, probe.authoredExpressionText]]
  ));
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
        authoredExpressionByLocal.get(node.name.text) ?? node.initializer.getText(sourceFile),
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
  const syntaxFacts = readVirtualRepeatSyntaxFacts(runtime, app, resource);
  if (resource == null) {
    return {
      controllerCount: 0,
      expressionTypes: new Map(),
      overlayDiagnosticCount: 0,
      skippedExpressionCount: 0,
      ...syntaxFacts,
    };
  }
  const overlayEmission = new TemplateTypeSystemOverlayBuilder(runtime.workspace.store, app.emission.project, app.emission.typeSystem)
    .build(resource, 'contract-ui-virtualization-template-controller');
  if (overlayEmission.overlaySource == null) {
    return {
      controllerCount: virtualRepeatControllerCount(runtimeControllers),
      expressionTypes: new Map(),
      overlayDiagnosticCount: 0,
      skippedExpressionCount: overlayEmission.skippedExpressions.length,
      ...syntaxFacts,
    };
  }
  const overlayTypeSystem = new TypeSystemProjectBuilder(projectTypeSystemProgramSources).build(
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
    expressionTypes: readOverlayVariableExpressionTypes(
      overlayTypeSystem,
      overlayEmission.overlaySource.fileName,
      overlayEmission.expressionProbes,
    ),
    overlayDiagnosticCount: overlayDiagnostics.length,
    skippedExpressionCount: overlayEmission.skippedExpressions.length,
    ...syntaxFacts,
  };
}

function readVirtualRepeatSyntaxFacts(runtime, app, resource) {
  const catalog = app.emission.appWorld.configuredSyntax.catalogEmission.catalogs.find((candidate) =>
    candidate.packageId === 'ui-virtualization'
    && candidate.group === 'ui-virtualization-syntax'
  ) ?? null;
  const pattern = catalog?.attributePatterns.find((candidate) =>
    candidate.targetName === 'VirtualRepeatForAttributePattern'
  ) ?? null;
  const command = catalog?.bindingCommands.find((candidate) => candidate.name === 'forof') ?? null;
  const source = pattern?.sourceAddressHandle == null
    ? null
    : runtime.workspace.store.read(pattern.sourceAddressHandle);
  const selection = catalog == null
    ? null
    : app.emission.appWorld.configuredSyntax.selections.find((candidate) =>
        candidate.frameworkKind === 'ui-virtualization.default-configuration'
        && candidate.catalogProductHandles.includes(catalog.productHandle)
      ) ?? null;
  const syntax = resource?.compilation.authoredAttributeSyntaxes.find((candidate) =>
    candidate.rawName === 'virtual-repeat.for'
  ) ?? null;
  const lowering = resource?.compilation.bindingCommandLowering.lowerings.find((candidate) =>
    candidate.command.name === 'forof'
  ) ?? null;
  const iterator = resource?.compilation.bindingCommandLowering.instructions.find((candidate) =>
    candidate instanceof IterateBindingInstruction
    && lowering?.instructionProductHandles.includes(candidate.productHandle)
  ) ?? null;
  const gap = resource?.compilation.bindingCommandLowering.instructions.find((candidate) =>
    candidate instanceof MultiAttrInstruction
    && candidate.target === 'gap'
    && iterator?.tailInstructionProductHandles.includes(candidate.productHandle)
  ) ?? null;
  const unsupportedIssues = resource?.runtimeAnalysis.scopes.scopeIssues.filter((candidate) =>
    candidate.issueKind === 'unsupported-repeat-declaration'
  ) ?? [];
  const unsupportedIssue = unsupportedIssues[0] ?? null;
  const unsupportedLocalNames = new Set(['label', 'nullableLabel', 'scalarItem']);
  const unsupportedIterators = resource?.compilation.bindingCommandLowering.instructions.filter((candidate) =>
    candidate instanceof IteratorBindingInstruction
    && candidate.localNames.some((name) => unsupportedLocalNames.has(name))
  ) ?? [];
  const destructuredLocalProjected = resource?.runtimeAnalysis.scopes.derivedScopes.some((candidate) =>
    candidate.scopeCreators.some((creator) =>
      creator.introducedSlotNames.some((name) => unsupportedLocalNames.has(name))
    )
  ) ?? false;
  const coreProjectionIssues = resource?.runtimeAnalysis.scopes.scopeIssues.filter((candidate) =>
    candidate.issueKind === 'destructuring-non-object'
    || candidate.issueKind === 'repeat-object-binding-nullish'
    || candidate.issueKind === 'array-rest-non-array'
  ) ?? [];
  const unsupportedDiagnostics = collectAppRows(app, SemanticAppQueryKind.AppDiagnostics, 100).filter((candidate) =>
    candidate.diagnosticKind === 'unsupported-repeat-declaration'
  );
  const unsupportedDiagnostic = unsupportedDiagnostics[0] ?? null;
  const capabilityDemand = app.emission.capabilityDemands.readDemands().find((candidate) =>
    candidate.authoredName === 'virtual-repeat.for'
    && candidate.requiredCapability === 'ui-virtualization.default-resources'
  ) ?? null;

  return {
    syntaxCatalog: catalog == null ? null : {
      packageId: catalog.packageId,
      group: catalog.group,
      patternTargetName: pattern?.targetName ?? null,
      pattern: pattern?.patterns[0]?.pattern ?? null,
      patternSymbols: pattern?.patterns[0]?.symbols ?? null,
      commandTargetName: command?.targetName ?? null,
      commandName: command?.name ?? null,
      commandKey: command?.key ?? null,
      producedInstructionTypeNames: command?.producedInstructionTypeNames ?? [],
      sourceKind: source?.kind ?? null,
      sourceScheme: source?.scheme ?? null,
      sourceValue: source?.value ?? null,
      selectedByDefaultConfiguration: selection != null,
    },
    lowering: syntax == null || lowering == null ? null : {
      syntaxTarget: syntax.target,
      syntaxCommand: syntax.command,
      commandName: lowering.command.name,
      state: lowering.state,
      instructionClass: iterator?.constructor.name ?? null,
      sharedIteratorAbstraction: iterator instanceof IteratorBindingInstruction,
      frameworkInstructionType: iterator?.frameworkInstructionType ?? null,
      targetProperty: iterator?.targetProperty ?? null,
      localNames: iterator?.localNames ?? [],
      objectBindingSourceKeyCount: iterator?.objectBindingSourceKeys.length ?? -1,
      gapTarget: gap?.target ?? null,
      gapCommand: gap?.command ?? null,
      gapValue: gap?.value ?? null,
      gapLinkedFromIterator: gap != null && iterator?.tailInstructionProductHandles.includes(gap.productHandle) === true,
    },
    unsupportedDeclaration: {
      issueCount: unsupportedIssues.length,
      certainty: unsupportedIssue?.certainty ?? null,
      message: unsupportedIssue?.message ?? null,
      parsedLocalNames: unsupportedIterators.flatMap((candidate) => candidate.localNames),
      objectBindingSourceKeys: unsupportedIterators.flatMap((candidate) => candidate.objectBindingSourceKeys),
      destructuredLocalProjected,
      coreProjectionIssueCount: coreProjectionIssues.length,
      publicDiagnosticCount: unsupportedDiagnostics.length,
      publicDiagnosticMissingInput: unsupportedDiagnostic?.missingInput ?? null,
      publicDiagnosticSummary: unsupportedDiagnostic?.summary ?? null,
    },
    capabilityDemand: capabilityDemand == null ? null : {
      demandKind: capabilityDemand.demandKind,
      requiredCapability: capabilityDemand.requiredCapability,
      admissionState: capabilityDemand.admissionState,
    },
  };
}

function sameStrings(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
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
