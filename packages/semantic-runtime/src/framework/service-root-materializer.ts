import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import {
  readImportedExportName,
  readSourceImportBindings,
  type SourceImportBindings,
  typeNodeReferencesImportedExport,
} from '../evaluation/import-bindings.js';
import {
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import {
  DiContainerApiMethodKind,
} from '../di/container-api-recognition.js';
import {
  readAureliaResolverWrapperCall,
} from '../di/resolver-wrapper-recognition.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import { FrameworkIdentity } from '../kernel/identity.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import { OpenSeamReasonKind } from '../kernel/open-seam.js';
import { ProvenanceRecord } from '../kernel/provenance.js';
import {
  recordsForSourceOpenSeams,
  type SourceOpenSeamInput,
} from '../kernel/source-open-seam.js';
import {
  sourceSpanAddressForSite,
} from '../kernel/source-address.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  symbolForExpression,
} from '../type-system/checker-node-helpers.js';
import {
  AureliaSourceApiRootFacts,
  callCreatesAureliaContainer,
  callIsAureliaContainerGetCall,
  callIsAureliaContainerGetServiceRoot,
  callIsProvidedByAureliaResolveActivation,
  expressionReferencesAureliaContainerRootType,
  readAureliaContainerSourceImportBindings,
  sourceRootSymbolForPropertyName,
  type AureliaSourceApiRootProductFact,
} from './source-api-root-recognition.js';
import { FrameworkProductDetails } from './product-details.js';
import {
  FrameworkServiceRoot,
  FrameworkServiceRootBasis,
  FrameworkServiceRootKind,
  FrameworkServiceRootProjectResult,
} from './service-root.js';

interface FrameworkServiceDescriptor {
  readonly serviceFamily: string;
  readonly moduleSpecifiers: ReadonlySet<string>;
  readonly exports: ReadonlySet<string>;
  readonly directConstructors: ReadonlySet<string>;
}

interface FrameworkServiceRootSite {
  readonly sourcePath: string;
  readonly sourceFileAddressHandle: ProjectBootFrame['sourceFiles'][number]['addressHandle'];
  readonly start: number;
  readonly end: number;
  readonly evidenceStart: number;
  readonly evidenceEnd: number;
  readonly rootKind: FrameworkServiceRootKind;
  readonly serviceFamily: string | null;
  readonly serviceKeyName: string;
  readonly basis: FrameworkServiceRootBasis;
  readonly symbol: ts.Symbol | null;
  readonly ownerIdentityHandle: IdentityHandle | null;
  readonly ownerProductHandle: ProductHandle | null;
}

class FrameworkServiceRootPublication {
  constructor(
    readonly root: FrameworkServiceRoot,
    readonly records: readonly KernelStoreRecord[],
    readonly symbol: ts.Symbol | null,
  ) {}
}

export class FrameworkServiceRootMaterializationResult extends FrameworkServiceRootProjectResult {
  constructor(
    roots: readonly FrameworkServiceRoot[],
    records: readonly KernelStoreRecord[],
    readonly sourceApiRoots: AureliaSourceApiRootFacts,
  ) {
    super(roots, records);
  }
}

export class FrameworkServiceRootMaterializer {
  constructor(
    readonly store: KernelStore,
  ) {}

  materializeAndEmit(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
    sourceApiRoots: AureliaSourceApiRootFacts,
  ): FrameworkServiceRootMaterializationResult {
    const containerPublications = uniqueRootSites(readFrameworkContainerRootSites(project, typeSystem, sourceApiRoots))
      .map((site) => this.publishRoot(project, site));
    const containerFacts = rootFactsForPublications(containerPublications);
    const rootsWithContainers = sourceApiRoots.withFrameworkServiceRootProducts(containerFacts);
    const servicePublications = uniqueRootSites(readFrameworkServiceRootSites(project, typeSystem, rootsWithContainers))
      .map((site) => this.publishRoot(project, site));
    const candidateSeams = recordsForSourceOpenSeams(
      this.store,
      cappedCandidateSeamsBySource(readFrameworkServiceRootCandidateSeams(project, typeSystem, rootsWithContainers)),
    );
    const allPublications = [...containerPublications, ...servicePublications];
    const records = [
      ...allPublications.flatMap((publication) => publication.records),
      ...candidateSeams.records,
    ];
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, `framework-service-roots:${project.projectKey}`));
    }
    for (const publication of allPublications) {
      this.store.productDetails.add(
        FrameworkProductDetails.ServiceRoot,
        publication.root.productHandle,
        publication.root,
      );
    }
    const enrichedRoots = sourceApiRoots.withFrameworkServiceRootProducts(rootFactsForPublications(allPublications));
    return new FrameworkServiceRootMaterializationResult(
      allPublications.map((publication) => publication.root),
      records,
      enrichedRoots,
    );
  }

  private publishRoot(
    project: ProjectBootFrame,
    site: FrameworkServiceRootSite,
  ): FrameworkServiceRootPublication {
    const local = serviceRootLocalKey(project.projectKey, site);
    const source = sourceSpanAddressForSite(this.store, local, site);
    const evidenceSource = site.evidenceStart === site.start && site.evidenceEnd === site.end
      ? source
      : sourceSpanAddressForSite(this.store, `${local}:evidence`, {
        sourceFileAddressHandle: site.sourceFileAddressHandle,
        start: site.evidenceStart,
        end: site.evidenceEnd,
      });
    const evidenceHandle = this.store.handles.evidence(local);
    const provenanceHandle = this.store.handles.provenance(local);
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const root = new FrameworkServiceRoot(
      productHandle,
      identityHandle,
      project.projectKey,
      site.rootKind,
      site.serviceFamily,
      site.serviceKeyName,
      site.basis,
      site.sourcePath,
      site.start,
      site.end,
      site.evidenceStart,
      site.evidenceEnd,
      source.handle,
      evidenceSource.handle,
      site.ownerIdentityHandle,
      site.ownerProductHandle,
    );
    const records = [
      ...source.records,
      ...(evidenceSource === source ? [] : evidenceSource.records),
      new EvidenceRecord(
        evidenceHandle,
        evidenceKindForBasis(site.basis),
        [EvidenceRole.Usage, EvidenceRole.Diagnostic],
        `${site.rootKind} root for ${site.serviceKeyName} observed through ${site.basis}.`,
        evidenceSource.handle,
      ),
      new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
      new FrameworkIdentity(
        identityHandle,
        KernelVocabulary.Framework.ServiceRoot.key,
        site.ownerIdentityHandle,
        source.handle,
        `${site.rootKind}:${site.serviceKeyName}`,
      ),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Framework.ServiceRoot.key,
        identityHandle,
        source.handle,
        provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(local),
        identityHandle,
        [productHandle],
      ),
    ];
    return new FrameworkServiceRootPublication(root, records, site.symbol);
  }
}

const FRAMEWORK_SERVICE_DESCRIPTORS: readonly FrameworkServiceDescriptor[] = [
  {
    serviceFamily: 'dialog',
    moduleSpecifiers: new Set(['@aurelia/dialog']),
    exports: new Set(['DialogService', 'IDialogService']),
    directConstructors: new Set(['DialogService']),
  },
  {
    serviceFamily: 'fetch-client',
    moduleSpecifiers: new Set(['@aurelia/fetch-client']),
    exports: new Set(['HttpClient', 'IHttpClient']),
    directConstructors: new Set(['HttpClient']),
  },
  {
    serviceFamily: 'validation',
    moduleSpecifiers: new Set(['aurelia', '@aurelia/validation', '@aurelia/validation-html']),
    exports: new Set(['IValidationRules', 'ValidationRules']),
    directConstructors: new Set(['ValidationRules']),
  },
];

const AURELIA_INJECT_MODULES = new Set(['aurelia', '@aurelia/kernel']);
const AURELIA_INJECT_EXPORTS = new Set(['inject']);
const MAX_SERVICE_ROOT_CANDIDATE_SEAMS_PER_FILE = 8;

function readFrameworkContainerRootSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
  sourceApiRoots: AureliaSourceApiRootFacts,
): readonly FrameworkServiceRootSite[] {
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
    if (sourceFile == null) {
      return [];
    }
    const bindings = readAureliaContainerSourceImportBindings(sourceFile);
    const sites: FrameworkServiceRootSite[] = [];
    for (const callbackRoot of sourceApiRoots.appTaskCallbackRoots) {
      if (
        callbackRoot.sourcePath === source.path
        && expressionReferencesAureliaContainerRootType(callbackRoot.keyExpression, bindings)
      ) {
        sites.push({
          sourcePath: source.path,
          sourceFileAddressHandle: source.addressHandle,
          start: callbackRoot.parameterStart,
          end: callbackRoot.parameterEnd,
          evidenceStart: callbackRoot.parameterStart,
          evidenceEnd: callbackRoot.parameterEnd,
          rootKind: FrameworkServiceRootKind.Container,
          serviceFamily: null,
          serviceKeyName: 'IContainer',
          basis: FrameworkServiceRootBasis.AppTaskDeclaredKey,
          symbol: callbackRoot.symbol,
          ownerIdentityHandle: null,
          ownerProductHandle: null,
        });
      }
    }
    const visit = (node: ts.Node): void => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        const site = containerDeclarationRootSite(source, sourceFile, typeSystem, bindings, sourceApiRoots, node, node.name);
        pushNullable(sites, site);
      } else if (ts.isPropertyDeclaration(node)) {
        const site = containerDeclarationRootSite(source, sourceFile, typeSystem, bindings, sourceApiRoots, node, node.name);
        pushNullable(sites, site);
      } else if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
        const site = containerDeclarationRootSite(source, sourceFile, typeSystem, bindings, sourceApiRoots, node, node.name);
        pushNullable(sites, site);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return sites;
  });
}

function readFrameworkServiceRootCandidateSeams(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
  sourceApiRoots: AureliaSourceApiRootFacts,
): readonly SourceOpenSeamInput[] {
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
    if (sourceFile == null) {
      return [];
    }
    const serviceBindings = new Map(FRAMEWORK_SERVICE_DESCRIPTORS.map((descriptor) => [
      descriptor.serviceFamily,
      readSourceImportBindings(sourceFile, descriptor.moduleSpecifiers, descriptor.exports),
    ]));
    const injectBindings = readSourceImportBindings(sourceFile, AURELIA_INJECT_MODULES, AURELIA_INJECT_EXPORTS);
    const seams: SourceOpenSeamInput[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        pushNullable(seams, resolverCandidateSeam(source, sourceFile, typeSystem, sourceApiRoots, serviceBindings, node));
        pushNullable(seams, containerApiCandidateSeam(source, sourceFile, typeSystem, sourceApiRoots, serviceBindings, node));
      }
      if (ts.isClassDeclaration(node)) {
        seams.push(...classicInjectionCandidateSeams(source, sourceFile, serviceBindings, injectBindings, node));
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return uniqueCandidateSeams(seams);
  });
}

function resolverCandidateSeam(
  source: ProjectBootFrame['sourceFiles'][number],
  sourceFile: ts.SourceFile,
  typeSystem: TypeSystemProject,
  sourceApiRoots: AureliaSourceApiRootFacts,
  bindingsByFamily: ReadonlyMap<string, SourceImportBindings>,
  call: ts.CallExpression,
): SourceOpenSeamInput | null {
  const site = sourceApiRoots.resolveCallSite(source.path, sourceFile, call);
  for (const descriptor of FRAMEWORK_SERVICE_DESCRIPTORS) {
    const bindings = bindingsByFamily.get(descriptor.serviceFamily);
    if (bindings == null) {
      continue;
    }
    const first = call.arguments[0] ?? null;
    const directKey = first == null || ts.isSpreadElement(first)
      ? null
      : readServiceKeyNameFromExpression(first, bindings, descriptor.exports);
    if (site == null) {
      if (
        directKey != null
        && expressionReferencesResolveNamedSymbol(typeSystem.checker, call.expression)
      ) {
        return candidateSeamForNode(
          source,
          sourceFile,
          call,
          `Project-local resolve-like call references framework service key ${directKey}; preserve it as a service-root candidate instead of claiming an Aurelia DI-backed root.`,
        );
      }
      continue;
    }
    if (site.argumentCount !== 1) {
      return null;
    }
    if (directKey != null && site.activeContainerExpectation !== 'provided-by-container-activation') {
      return candidateSeamForNode(
        source,
        sourceFile,
        call,
        `Aurelia resolve(${directKey}) is ${site.activeContainerExpectation} here; preserve it as a candidate instead of claiming a DI-backed service root.`,
      );
    }
    if (directKey == null && site.keyImportName != null && descriptor.exports.has(site.keyImportName)) {
      return candidateSeamForNode(
        source,
        sourceFile,
        call,
        `Aurelia resolve(${site.keyExpressionText ?? site.keyImportName}) uses a resolver wrapper or non-direct key; preserve it as a service-root candidate.`,
      );
    }
  }
  return null;
}

function containerApiCandidateSeam(
  source: ProjectBootFrame['sourceFiles'][number],
  sourceFile: ts.SourceFile,
  typeSystem: TypeSystemProject,
  sourceApiRoots: AureliaSourceApiRootFacts,
  bindingsByFamily: ReadonlyMap<string, SourceImportBindings>,
  call: ts.CallExpression,
): SourceOpenSeamInput | null {
  const site = sourceApiRoots.containerApiCallSite(source.path, sourceFile, call);
  if (site?.methodKind !== DiContainerApiMethodKind.Get || site.keyWrapperKind == null || site.wrappedKeyName == null) {
    return null;
  }
  const first = call.arguments[0] ?? null;
  if (first == null || ts.isSpreadElement(first)) {
    return null;
  }
  for (const descriptor of FRAMEWORK_SERVICE_DESCRIPTORS) {
    const bindings = bindingsByFamily.get(descriptor.serviceFamily);
    if (bindings == null) {
      continue;
    }
    const serviceKeyName = readResolverWrappedServiceKeyName(typeSystem.checker, first, bindings, descriptor.exports);
    if (serviceKeyName == null) {
      continue;
    }
    return candidateSeamForNode(
      source,
      sourceFile,
      call,
      `Aurelia container.get(${site.keyExpressionText ?? serviceKeyName}) uses resolver wrapper ${site.keyWrapperKind}; preserve it as a service-root candidate instead of claiming a direct container-backed root.`,
    );
  }
  return null;
}

function readResolverWrappedServiceKeyName(
  checker: ts.TypeChecker,
  expression: ts.Expression,
  bindings: SourceImportBindings,
  allowedExports: ReadonlySet<string>,
): string | null {
  const wrapper = readAureliaResolverWrapperCall(checker, expression);
  if (wrapper?.innerExpression == null) {
    return null;
  }
  return readServiceKeyNameFromExpression(wrapper.innerExpression, bindings, allowedExports);
}

function classicInjectionCandidateSeams(
  source: ProjectBootFrame['sourceFiles'][number],
  sourceFile: ts.SourceFile,
  bindingsByFamily: ReadonlyMap<string, SourceImportBindings>,
  injectBindings: SourceImportBindings,
  node: ts.ClassDeclaration,
): readonly SourceOpenSeamInput[] {
  const seams: SourceOpenSeamInput[] = [];
  for (const member of node.members) {
    if (!memberIsStaticInjectMetadata(member)) {
      continue;
    }
    for (const array of staticInjectArrayExpressions(member)) {
      for (const element of array.elements) {
        if (!ts.isSpreadElement(element) && expressionReferencesAnyFrameworkService(element, bindingsByFamily)) {
          seams.push(candidateSeamForNode(
            source,
            sourceFile,
            element,
            'Classic static inject metadata names a framework service key; constructor parameter ownership is not modeled as a positive source service root yet.',
          ));
        }
      }
    }
  }
  for (const decorator of ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : []) {
    const expression = unwrapExpression(decorator.expression);
    if (!ts.isCallExpression(expression) || readImportedExportName(expression.expression, injectBindings, AURELIA_INJECT_EXPORTS) == null) {
      continue;
    }
    for (const argument of expression.arguments) {
      if (!ts.isSpreadElement(argument) && expressionReferencesAnyFrameworkService(argument, bindingsByFamily)) {
        seams.push(candidateSeamForNode(
          source,
          sourceFile,
          argument,
          'Classic @inject(...) metadata names a framework service key; constructor parameter ownership is not modeled as a positive source service root yet.',
        ));
      }
    }
  }
  return seams;
}

function memberIsStaticInjectMetadata(
  member: ts.ClassElement,
): member is ts.PropertyDeclaration | ts.GetAccessorDeclaration {
  return (
    ts.isPropertyDeclaration(member)
    || ts.isGetAccessorDeclaration(member)
  ) && propertyNameIs(member.name, 'inject') && isStaticMember(member);
}

function staticInjectArrayExpressions(
  member: ts.PropertyDeclaration | ts.GetAccessorDeclaration,
): readonly ts.ArrayLiteralExpression[] {
  if (ts.isPropertyDeclaration(member)) {
    const initializer = member.initializer == null ? null : unwrapExpression(member.initializer);
    return initializer != null && ts.isArrayLiteralExpression(initializer) ? [initializer] : [];
  }
  const body = member.body;
  if (body == null) {
    return [];
  }
  const returns = body.statements.filter(ts.isReturnStatement);
  if (returns.length !== 1 || returns[0]?.expression == null) {
    return [];
  }
  const expression = unwrapExpression(returns[0].expression);
  return ts.isArrayLiteralExpression(expression) ? [expression] : [];
}

function expressionReferencesResolveNamedSymbol(
  checker: ts.TypeChecker,
  expression: ts.Expression,
): boolean {
  const symbol = symbolForExpression(checker, unwrapExpression(expression));
  if (symbol == null) {
    return false;
  }
  return symbolAndAliasedDeclarations(checker, symbol).some(declarationNameIsResolve);
}

function symbolAndAliasedDeclarations(
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
): readonly ts.Declaration[] {
  const declarations = [...symbol.declarations ?? []];
  if ((symbol.flags & ts.SymbolFlags.Alias) !== 0) {
    const aliased = checker.getAliasedSymbol(symbol);
    if (aliased !== symbol) {
      declarations.push(...aliased.declarations ?? []);
    }
  }
  return declarations;
}

function declarationNameIsResolve(
  declaration: ts.Declaration,
): boolean {
  if (ts.isImportSpecifier(declaration) || ts.isExportSpecifier(declaration)) {
    return (declaration.propertyName?.text ?? declaration.name.text) === 'resolve';
  }
  if (
    (
      ts.isFunctionDeclaration(declaration)
      || ts.isVariableDeclaration(declaration)
      || ts.isParameter(declaration)
    )
    && declaration.name != null
    && ts.isIdentifier(declaration.name)
  ) {
    return declaration.name.text === 'resolve';
  }
  return false;
}

function expressionReferencesAnyFrameworkService(
  expression: ts.Expression,
  bindingsByFamily: ReadonlyMap<string, SourceImportBindings>,
): boolean {
  return FRAMEWORK_SERVICE_DESCRIPTORS.some((descriptor) => {
    const bindings = bindingsByFamily.get(descriptor.serviceFamily);
    return bindings != null && readServiceKeyNameFromExpression(expression, bindings, descriptor.exports) != null;
  });
}

function candidateSeamForNode(
  source: ProjectBootFrame['sourceFiles'][number],
  sourceFile: ts.SourceFile,
  node: ts.Node,
  summary: string,
): SourceOpenSeamInput {
  return {
    localKey: [
      'framework-service-root-candidate',
      localKeyPart(source.path),
      node.getStart(sourceFile).toString(),
      node.getEnd().toString(),
    ].join(':'),
    openKind: KernelVocabulary.Framework.OpenServiceRootCandidate.key,
    summary,
    sourceFileAddressHandle: source.addressHandle,
    start: node.getStart(sourceFile),
    end: node.getEnd(),
    evidenceRoles: [EvidenceRole.Usage, EvidenceRole.Diagnostic],
    reasonKinds: [OpenSeamReasonKind.FrameworkServiceRootCandidateOpen],
    includeProvenanceRecord: true,
  };
}

function cappedCandidateSeamsBySource(
  seams: readonly SourceOpenSeamInput[],
): readonly SourceOpenSeamInput[] {
  const counts = new Map<string, number>();
  const rollups = new Map<string, { first: SourceOpenSeamInput; suppressed: number }>();
  const result: SourceOpenSeamInput[] = [];
  for (const seam of seams) {
    const count = counts.get(seam.sourceFileAddressHandle) ?? 0;
    if (count >= MAX_SERVICE_ROOT_CANDIDATE_SEAMS_PER_FILE) {
      const existing = rollups.get(seam.sourceFileAddressHandle);
      if (existing == null) {
        rollups.set(seam.sourceFileAddressHandle, { first: seam, suppressed: 1 });
      } else {
        rollups.set(seam.sourceFileAddressHandle, {
          first: existing.first,
          suppressed: existing.suppressed + 1,
        });
      }
      continue;
    }
    counts.set(seam.sourceFileAddressHandle, count + 1);
    result.push(seam);
  }
  return [
    ...result,
    ...[...rollups.values()].map((rollup) => candidateSeamRollup(rollup.first, rollup.suppressed)),
  ];
}

function candidateSeamRollup(
  firstSuppressed: SourceOpenSeamInput,
  suppressed: number,
): SourceOpenSeamInput {
  return {
    ...firstSuppressed,
    localKey: `${firstSuppressed.localKey}:suppressed-rollup`,
    summary: `${suppressed} additional framework service-root candidate seam(s) in this source file were capped after ${MAX_SERVICE_ROOT_CANDIDATE_SEAMS_PER_FILE} detailed rows.`,
  };
}

function uniqueCandidateSeams(
  seams: readonly SourceOpenSeamInput[],
): readonly SourceOpenSeamInput[] {
  const seen = new Set<string>();
  const result: SourceOpenSeamInput[] = [];
  for (const seam of seams) {
    const key = `${seam.sourceFileAddressHandle}:${seam.start}:${seam.end}:${seam.summary}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(seam);
  }
  return result;
}

function readFrameworkServiceRootSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
  sourceApiRoots: AureliaSourceApiRootFacts,
): readonly FrameworkServiceRootSite[] {
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
    if (sourceFile == null) {
      return [];
    }
    const bindingsByFamily = new Map(FRAMEWORK_SERVICE_DESCRIPTORS.map((descriptor) => [
      descriptor.serviceFamily,
      readSourceImportBindings(sourceFile, descriptor.moduleSpecifiers, descriptor.exports),
    ]));
    const sites: FrameworkServiceRootSite[] = [];
    for (const callbackRoot of sourceApiRoots.appTaskCallbackRoots) {
      if (callbackRoot.sourcePath !== source.path) {
        continue;
      }
      for (const descriptor of FRAMEWORK_SERVICE_DESCRIPTORS) {
        const bindings = bindingsByFamily.get(descriptor.serviceFamily);
        const keyName = bindings == null
          ? null
          : readImportedExportName(unwrapExpression(callbackRoot.keyExpression), bindings, descriptor.exports);
        if (keyName == null) {
          continue;
        }
        sites.push({
          sourcePath: source.path,
          sourceFileAddressHandle: source.addressHandle,
          start: callbackRoot.parameterStart,
          end: callbackRoot.parameterEnd,
          evidenceStart: callbackRoot.parameterStart,
          evidenceEnd: callbackRoot.parameterEnd,
          rootKind: FrameworkServiceRootKind.Service,
          serviceFamily: descriptor.serviceFamily,
          serviceKeyName: keyName,
          basis: FrameworkServiceRootBasis.AppTaskDeclaredKey,
          symbol: callbackRoot.symbol,
          ownerIdentityHandle: null,
          ownerProductHandle: null,
        });
      }
    }
    const visit = (node: ts.Node): void => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        pushNullable(sites, serviceDeclarationRootSite(source, sourceFile, typeSystem, sourceApiRoots, bindingsByFamily, node, node.name));
      } else if (ts.isPropertyDeclaration(node)) {
        pushNullable(sites, serviceDeclarationRootSite(source, sourceFile, typeSystem, sourceApiRoots, bindingsByFamily, node, node.name));
      } else if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
        pushNullable(sites, serviceDeclarationRootSite(source, sourceFile, typeSystem, sourceApiRoots, bindingsByFamily, node, node.name));
      } else if (ts.isCallExpression(node)) {
        if (!expressionIsDirectDeclarationInitializer(node)) {
          pushNullable(sites, serviceCallRootSite(source, sourceFile, sourceApiRoots, bindingsByFamily, node, node.getStart(sourceFile), node.end, null));
        }
      } else if (ts.isNewExpression(node)) {
        if (!expressionIsDirectDeclarationInitializer(node)) {
          pushNullable(sites, serviceConstructorRootSite(source, sourceFile, bindingsByFamily, node, node.getStart(sourceFile), node.end, null));
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return sites;
  });
}

function containerDeclarationRootSite(
  source: ProjectBootFrame['sourceFiles'][number],
  sourceFile: ts.SourceFile,
  typeSystem: TypeSystemProject,
  bindings: SourceImportBindings,
  sourceApiRoots: AureliaSourceApiRootFacts,
  node: { readonly type?: ts.TypeNode; readonly initializer?: ts.Expression },
  name: ts.Identifier | ts.PropertyName,
): FrameworkServiceRootSite | null {
  if (!isSourceRootPropertyName(name)) {
    return null;
  }
  const basis = containerRootBasis(source.path, sourceFile, bindings, sourceApiRoots, node);
  if (basis == null) {
    return null;
  }
  return {
    sourcePath: source.path,
    sourceFileAddressHandle: source.addressHandle,
    start: name.getStart(sourceFile),
    end: name.end,
    evidenceStart: name.getStart(sourceFile),
    evidenceEnd: name.end,
    rootKind: FrameworkServiceRootKind.Container,
    serviceFamily: null,
    serviceKeyName: 'IContainer',
    basis,
    symbol: sourceRootSymbolForPropertyName(typeSystem, name),
    ownerIdentityHandle: null,
    ownerProductHandle: null,
  };
}

function containerRootBasis(
  sourcePath: string,
  sourceFile: ts.SourceFile,
  bindings: SourceImportBindings,
  sourceApiRoots: AureliaSourceApiRootFacts,
  node: { readonly type?: ts.TypeNode; readonly initializer?: ts.Expression },
): FrameworkServiceRootBasis | null {
  if (typeNodeReferencesImportedExport(node.type ?? null, bindings, new Set(['IContainer']))) {
    return FrameworkServiceRootBasis.FrameworkTypeAnnotation;
  }
  const initializer = node.initializer == null ? null : unwrapExpression(node.initializer);
  if (initializer != null && ts.isCallExpression(initializer) && callCreatesAureliaContainer(initializer, bindings)) {
    return FrameworkServiceRootBasis.DirectConstructor;
  }
  return sourceApiRoots.expressionCreatesAureliaContainerRoot(sourcePath, sourceFile, node.initializer ?? null)
    ? FrameworkServiceRootBasis.DiActivationBacked
    : null;
}

function serviceDeclarationRootSite(
  source: ProjectBootFrame['sourceFiles'][number],
  sourceFile: ts.SourceFile,
  typeSystem: TypeSystemProject,
  sourceApiRoots: AureliaSourceApiRootFacts,
  bindingsByFamily: ReadonlyMap<string, SourceImportBindings>,
  node: { readonly type?: ts.TypeNode; readonly initializer?: ts.Expression },
  name: ts.Identifier | ts.PropertyName,
): FrameworkServiceRootSite | null {
  if (!isSourceRootPropertyName(name)) {
    return null;
  }
  for (const descriptor of FRAMEWORK_SERVICE_DESCRIPTORS) {
    const bindings = bindingsByFamily.get(descriptor.serviceFamily);
    if (bindings == null) {
      continue;
    }
    const initialized = serviceExpressionRootSite(
      source,
      sourceFile,
      sourceApiRoots,
      bindings,
      descriptor,
      node.initializer ?? null,
      name.getStart(sourceFile),
      name.end,
      sourceRootSymbolForPropertyName(typeSystem, name),
    );
    if (initialized != null) {
      return initialized;
    }
    const typeName = readImportedTypeExportName(node.type ?? null, bindings, descriptor.exports);
    if (typeName != null) {
      return {
        sourcePath: source.path,
        sourceFileAddressHandle: source.addressHandle,
        start: name.getStart(sourceFile),
        end: name.end,
        evidenceStart: name.getStart(sourceFile),
        evidenceEnd: name.end,
        rootKind: FrameworkServiceRootKind.Service,
        serviceFamily: descriptor.serviceFamily,
        serviceKeyName: typeName,
        basis: FrameworkServiceRootBasis.FrameworkTypeAnnotation,
        symbol: sourceRootSymbolForPropertyName(typeSystem, name),
        ownerIdentityHandle: null,
        ownerProductHandle: null,
      };
    }
  }
  return null;
}

function serviceExpressionRootSite(
  source: ProjectBootFrame['sourceFiles'][number],
  sourceFile: ts.SourceFile,
  sourceApiRoots: AureliaSourceApiRootFacts,
  bindings: SourceImportBindings,
  descriptor: FrameworkServiceDescriptor,
  expression: ts.Expression | null,
  start: number,
  end: number,
  symbol: ts.Symbol | null,
): FrameworkServiceRootSite | null {
  if (expression == null) {
    return null;
  }
  const current = unwrapExpression(expression);
  if (ts.isCallExpression(current)) {
    return serviceCallRootSite(source, sourceFile, sourceApiRoots, new Map([[descriptor.serviceFamily, bindings]]), current, start, end, symbol);
  }
  if (ts.isNewExpression(current)) {
    return serviceConstructorRootSite(source, sourceFile, new Map([[descriptor.serviceFamily, bindings]]), current, start, end, symbol);
  }
  return null;
}

function serviceCallRootSite(
  source: ProjectBootFrame['sourceFiles'][number],
  sourceFile: ts.SourceFile,
  sourceApiRoots: AureliaSourceApiRootFacts,
  bindingsByFamily: ReadonlyMap<string, SourceImportBindings>,
  call: ts.CallExpression,
  start: number,
  end: number,
  symbol: ts.Symbol | null,
): FrameworkServiceRootSite | null {
  for (const descriptor of FRAMEWORK_SERVICE_DESCRIPTORS) {
    const bindings = bindingsByFamily.get(descriptor.serviceFamily);
    if (bindings == null) {
      continue;
    }
    if (callIsProvidedByAureliaResolveActivation(sourceApiRoots, source.path, sourceFile, call)) {
      const first = call.arguments[0] ?? null;
      const keyName = first == null || ts.isSpreadElement(first)
        ? null
        : readServiceKeyNameFromExpression(first, bindings, descriptor.exports);
      if (keyName != null) {
        return {
          sourcePath: source.path,
          sourceFileAddressHandle: source.addressHandle,
          start,
          end,
          evidenceStart: call.getStart(sourceFile),
          evidenceEnd: call.end,
          rootKind: FrameworkServiceRootKind.Service,
          serviceFamily: descriptor.serviceFamily,
          serviceKeyName: keyName,
          basis: FrameworkServiceRootBasis.DiActivationBacked,
          symbol,
          ownerIdentityHandle: null,
          ownerProductHandle: null,
        };
      }
    }
    if (
      callIsAureliaContainerGetServiceRoot(sourceApiRoots, source.path, sourceFile, call, bindings, descriptor.exports)
      || callIsAureliaContainerGetCall(sourceApiRoots, source.path, sourceFile, call)
    ) {
      const first = call.arguments[0] ?? null;
      const keyName = first == null || ts.isSpreadElement(first)
        ? null
        : readServiceKeyNameFromExpression(first, bindings, descriptor.exports);
      if (keyName != null) {
        const callee = unwrapExpression(call.expression);
        const receiver = ts.isPropertyAccessExpression(callee)
          ? callee.expression
          : null;
        const containerRoot = receiver == null
          ? null
          : sourceApiRoots.containerRootIdentityForExpression(source.path, sourceFile, receiver);
        return {
          sourcePath: source.path,
          sourceFileAddressHandle: source.addressHandle,
          start,
          end,
          evidenceStart: call.getStart(sourceFile),
          evidenceEnd: call.end,
          rootKind: FrameworkServiceRootKind.Service,
          serviceFamily: descriptor.serviceFamily,
          serviceKeyName: keyName,
          basis: FrameworkServiceRootBasis.ContainerGetBacked,
          symbol,
          ownerIdentityHandle: containerRoot?.identityHandle ?? null,
          ownerProductHandle: containerRoot?.productHandle ?? null,
        };
      }
    }
  }
  return null;
}

function serviceConstructorRootSite(
  source: ProjectBootFrame['sourceFiles'][number],
  sourceFile: ts.SourceFile,
  bindingsByFamily: ReadonlyMap<string, SourceImportBindings>,
  expression: ts.NewExpression,
  start: number,
  end: number,
  symbol: ts.Symbol | null,
): FrameworkServiceRootSite | null {
  for (const descriptor of FRAMEWORK_SERVICE_DESCRIPTORS) {
    const bindings = bindingsByFamily.get(descriptor.serviceFamily);
    const keyName = bindings == null
      ? null
      : readImportedExportName(expression.expression, bindings, descriptor.directConstructors);
    if (keyName == null) {
      continue;
    }
    return {
      sourcePath: source.path,
      sourceFileAddressHandle: source.addressHandle,
      start,
      end,
      evidenceStart: expression.getStart(sourceFile),
      evidenceEnd: expression.end,
      rootKind: FrameworkServiceRootKind.Service,
      serviceFamily: descriptor.serviceFamily,
      serviceKeyName: keyName,
      basis: FrameworkServiceRootBasis.DirectConstructor,
      symbol,
      ownerIdentityHandle: null,
      ownerProductHandle: null,
    };
  }
  return null;
}

function readServiceKeyNameFromExpression(
  expression: ts.Expression,
  bindings: SourceImportBindings,
  allowedExports: ReadonlySet<string>,
): string | null {
  const current = unwrapExpression(expression);
  const direct = readImportedExportName(current, bindings, allowedExports);
  if (direct != null) {
    return direct;
  }
  if (ts.isCallExpression(current)) {
    const callee = unwrapExpression(current.expression);
    if (!ts.isPropertyAccessExpression(callee)) {
      return null;
    }
    if (callee.name.text === 'child') {
      return readImportedExportName(callee.expression, bindings, allowedExports);
    }
  }
  return null;
}

function readImportedTypeExportName(
  typeNode: ts.TypeNode | null,
  bindings: SourceImportBindings,
  allowedExports: ReadonlySet<string>,
): string | null {
  if (typeNode == null) {
    return null;
  }
  if (ts.isTypeReferenceNode(typeNode)) {
    const typeName = typeNode.typeName;
    if (ts.isIdentifier(typeName)) {
      const exportedName = bindings.locals.get(typeName.text) ?? null;
      return exportedName != null && allowedExports.has(exportedName) ? exportedName : null;
    }
    if (
      ts.isQualifiedName(typeName)
      && ts.isIdentifier(typeName.left)
      && bindings.namespaces.has(typeName.left.text)
      && allowedExports.has(typeName.right.text)
    ) {
      return typeName.right.text;
    }
  }
  let found: string | null = null;
  typeNode.forEachChild((child) => {
    if (found == null && ts.isTypeNode(child)) {
      found = readImportedTypeExportName(child, bindings, allowedExports);
    }
  });
  return found;
}

function uniqueRootSites(
  sites: readonly FrameworkServiceRootSite[],
): readonly FrameworkServiceRootSite[] {
  const byLocalKey = new Map<string, FrameworkServiceRootSite>();
  for (const site of sites) {
    const local = serviceRootLocalKey('', site);
    const existing = byLocalKey.get(local);
    if (existing == null || basisRank(site.basis) < basisRank(existing.basis)) {
      byLocalKey.set(local, site);
    }
  }
  return [...byLocalKey.values()];
}

function rootFactsForPublications(
  publications: readonly FrameworkServiceRootPublication[],
): readonly AureliaSourceApiRootProductFact[] {
  return publications.map((publication) => ({
    root: publication.root,
    symbol: publication.symbol,
  }));
}

function serviceRootLocalKey(
  projectKey: string,
  site: Pick<FrameworkServiceRootSite, 'sourcePath' | 'start' | 'end' | 'rootKind' | 'serviceKeyName'>,
): string {
  return [
    'framework-service-root',
    localKeyPart(projectKey),
    localKeyPart(site.rootKind),
    localKeyPart(site.sourcePath),
    site.start.toString(),
    site.end.toString(),
    localKeyPart(site.serviceKeyName),
  ].join(':');
}

function evidenceKindForBasis(
  basis: FrameworkServiceRootBasis,
): EvidenceKind {
  switch (basis) {
    case FrameworkServiceRootBasis.AppTaskDeclaredKey:
      return EvidenceKind.ConfigurationFlow;
    case FrameworkServiceRootBasis.FrameworkTypeAnnotation:
    case FrameworkServiceRootBasis.DeclarationSourceMatched:
      return EvidenceKind.SemanticObservation;
    case FrameworkServiceRootBasis.DiActivationBacked:
    case FrameworkServiceRootBasis.ContainerGetBacked:
    case FrameworkServiceRootBasis.DirectConstructor:
    case FrameworkServiceRootBasis.CandidateOpen:
      return EvidenceKind.SourceObservation;
  }
}

function basisRank(
  basis: FrameworkServiceRootBasis,
): number {
  switch (basis) {
    case FrameworkServiceRootBasis.DiActivationBacked:
      return 0;
    case FrameworkServiceRootBasis.ContainerGetBacked:
      return 1;
    case FrameworkServiceRootBasis.AppTaskDeclaredKey:
      return 2;
    case FrameworkServiceRootBasis.DirectConstructor:
      return 3;
    case FrameworkServiceRootBasis.FrameworkTypeAnnotation:
      return 4;
    case FrameworkServiceRootBasis.DeclarationSourceMatched:
      return 5;
    case FrameworkServiceRootBasis.CandidateOpen:
      return 6;
  }
}

function isSourceRootPropertyName(
  name: ts.Identifier | ts.PropertyName,
): name is ts.Identifier | ts.StringLiteralLike | ts.NumericLiteral {
  return ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name);
}

function propertyNameIs(
  name: ts.PropertyName,
  expected: string,
): boolean {
  return (
    ts.isIdentifier(name)
    || ts.isStringLiteralLike(name)
    || ts.isNumericLiteral(name)
  ) && name.text === expected;
}

function isStaticMember(
  node: ts.ClassElement,
): boolean {
  return (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Static) !== 0;
}

function expressionIsDirectDeclarationInitializer(
  node: ts.Expression,
): boolean {
  let expression: ts.Expression = node;
  let parent: ts.Node | undefined = node.parent;
  while (parent != null && expressionWrapperOwnsExpression(parent, expression)) {
    expression = parent;
    parent = parent.parent;
  }
  return parent != null
    && (
      ts.isVariableDeclaration(parent)
      || ts.isPropertyDeclaration(parent)
      || ts.isParameter(parent)
    )
    && parent.initializer === expression;
}

function expressionWrapperOwnsExpression(
  node: ts.Node,
  expression: ts.Expression,
): node is ts.Expression {
  return (
    ts.isAsExpression(node)
    || ts.isTypeAssertionExpression(node)
    || ts.isParenthesizedExpression(node)
    || ts.isNonNullExpression(node)
    || ts.isSatisfiesExpression(node)
  ) && node.expression === expression;
}

function pushNullable<T>(
  values: T[],
  value: T | null,
): void {
  if (value != null) {
    values.push(value);
  }
}
