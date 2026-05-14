import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import {
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type { AddressHandle } from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import { ProvenanceRecord } from '../kernel/provenance.js';
import {
  KernelStore,
  KernelStoreBatch,
  type KernelStoreRecord,
} from '../kernel/store.js';
import {
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import {
  normalizeTypeSystemSourceFileName,
  typeSystemSourcePathIndex,
} from '../type-system/source-path-index.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { ResourceProductDetails } from './product-details.js';
import type { FullResourceDefinition } from './resource-definition.js';
import {
  ResourceDefinitionKind,
} from './resource-kind.js';
import {
  ResourceFrameworkErrorCode,
} from './framework-error-code.js';
import {
  ResourceIssueKind,
  ResourceIssuePhase,
} from './resource-issue.js';
import type { ResourceIssue } from './resource-issue.js';
import {
  ResourceIssuePublication,
  ResourceIssuePublisher,
} from './resource-issue-publication.js';

const enum ResourceDefinitionApiCallKind {
  CustomElementDefinitionCreateOnlyName = 'custom-element-definition-create-only-name',
  CustomElementGetDefinition = 'custom-element-get-definition',
  CustomAttributeGetDefinition = 'custom-attribute-get-definition',
  ValueConverterGetDefinition = 'value-converter-get-definition',
  BindingBehaviorGetDefinition = 'binding-behavior-get-definition',
}

class SourceDeclarationReference {
  constructor(
    readonly sourcePath: string,
    readonly start: number,
    readonly end: number,
    readonly name: string | null,
  ) {}
}

class ResourceDefinitionApiCallSite {
  constructor(
    readonly sourcePath: string,
    readonly start: number,
    readonly end: number,
    readonly kind: ResourceDefinitionApiCallKind,
    readonly target: SourceDeclarationReference | null,
  ) {}
}

class ResourceDefinitionApiIssueSourceSet {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly provenanceHandle: ReturnType<KernelStore['handles']['provenance']>,
  ) {}
}

export class ResourceDefinitionApiIssueProjectResult {
  constructor(
    readonly issues: readonly ResourceIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Materializes direct runtime-html resource API failures that are provable from TypeScript source. */
export class ResourceDefinitionApiIssueMaterializer {
  private readonly publisher: ResourceIssuePublisher;

  constructor(
    readonly store: KernelStore,
  ) {
    this.publisher = new ResourceIssuePublisher(store);
  }

  materializeAndEmit(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
    definitions: readonly FullResourceDefinition[],
  ): ResourceDefinitionApiIssueProjectResult {
    const source = this.recordsForSource(project);
    const publications = readResourceDefinitionApiCallSites(project, typeSystem)
      .flatMap((site, index) => this.publicationsForSite(project, source, definitions, site, index));
    const records = [
      ...source.records,
      ...publications.flatMap((publication) => publication.records),
    ];
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, `resource-definition-api-issues:${project.projectKey}`));
    }
    for (const publication of publications) {
      this.store.productDetails.add(ResourceProductDetails.Issue, publication.issue.productHandle, publication.issue);
    }
    return new ResourceDefinitionApiIssueProjectResult(
      publications.map((publication) => publication.issue),
      records,
    );
  }

  private publicationsForSite(
    project: ProjectBootFrame,
    source: ResourceDefinitionApiIssueSourceSet,
    definitions: readonly FullResourceDefinition[],
    site: ResourceDefinitionApiCallSite,
    index: number,
  ): readonly ResourceIssuePublication[] {
    const issue = issueForResourceDefinitionApiCall(site, definitions, this.store);
    if (issue == null) {
      return [];
    }
    const local = resourceDefinitionApiIssueLocalKey(project, site, index, issue.issueKind);
    const span = this.sourceAddress(local, site.sourcePath, site.start, site.end);
    const publication = this.publisher.publish(
      local,
      project.projectKey,
      null,
      source.provenanceHandle,
      ResourceIssuePhase.ResourceDefinitionApi,
      issue.issueKind,
      issue.message,
      issue.frameworkErrorCode,
      span.handle,
    );
    return [
      new ResourceIssuePublication(publication.issue, [
        ...span.records,
        ...publication.records,
      ]),
    ];
  }

  private recordsForSource(project: ProjectBootFrame): ResourceDefinitionApiIssueSourceSet {
    const evidenceHandle = this.store.handles.evidence(`resource-definition-api-issues:${project.projectKey}`);
    const provenanceHandle = this.store.handles.provenance(`resource-definition-api-issues:${project.projectKey}`);
    return new ResourceDefinitionApiIssueSourceSet(
      [
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.Diagnostic],
          'Resource definition API issue materialization consumed TypeChecker-resolved runtime-html API calls and recognized resource definitions.',
          null,
        ),
        new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
      ],
      provenanceHandle,
    );
  }

  private sourceAddress(
    local: string,
    sourcePath: string,
    start: number,
    end: number,
  ): {
    readonly handle: AddressHandle | null;
    readonly records: readonly KernelStoreRecord[];
  } {
    const file = this.store.readBestSourceFileAddressForFileName(sourcePath);
    if (file == null) {
      return {
        handle: null,
        records: [],
      };
    }
    const handle = this.store.handles.address(`${local}:source`);
    return {
      handle,
      records: [
        new SourceSpanAddress(
          handle,
          file.handle,
          start,
          end,
          SourceSpanRole.Primary,
        ),
      ],
    };
  }
}

function readResourceDefinitionApiCallSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly ResourceDefinitionApiCallSite[] {
  const sourcePathByFileName = typeSystemSourcePathIndex(project, typeSystem);
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readSourceFileByPath(source.path);
    return sourceFile == null
      ? []
      : readSourceFileResourceDefinitionApiCallSites(source.path, sourceFile, typeSystem.checker, sourcePathByFileName);
  });
}

function readSourceFileResourceDefinitionApiCallSites(
  sourcePath: string,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  sourcePathByFileName: ReadonlyMap<string, string>,
): readonly ResourceDefinitionApiCallSite[] {
  const sites: ResourceDefinitionApiCallSite[] = [];
  const visit = (node: ts.Node): void => {
    recordResourceDefinitionApiCallSite(sites, sourcePath, sourceFile, checker, sourcePathByFileName, node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return sites;
}

function recordResourceDefinitionApiCallSite(
  sites: ResourceDefinitionApiCallSite[],
  sourcePath: string,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  sourcePathByFileName: ReadonlyMap<string, string>,
  node: ts.Node,
): void {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(unwrapExpression(node.expression))) {
    return;
  }
  const access = unwrapExpression(node.expression) as ts.PropertyAccessExpression;
  const owner = runtimeHtmlApiOwnerName(checker, access.expression);
  if (owner == null) {
    return;
  }

  const method = access.name.text;
  if (owner === 'CustomElementDefinition' && method === 'create' && isCustomElementDefinitionCreateOnlyName(node)) {
    sites.push(new ResourceDefinitionApiCallSite(
      sourcePath,
      node.getStart(sourceFile),
      node.end,
      ResourceDefinitionApiCallKind.CustomElementDefinitionCreateOnlyName,
      null,
    ));
    return;
  }

  const getDefinitionKind = getDefinitionCallKind(owner, method);
  if (getDefinitionKind == null) {
    return;
  }
  sites.push(new ResourceDefinitionApiCallSite(
    sourcePath,
    node.getStart(sourceFile),
    node.end,
    getDefinitionKind,
    sourceDeclarationReferenceForExpression(checker, node.arguments[0] ?? null, sourcePathByFileName),
  ));
}

function runtimeHtmlApiOwnerName(
  checker: ts.TypeChecker,
  expression: ts.Expression,
): string | null {
  const symbol = checker.getSymbolAtLocation(expression);
  const target = symbol != null && (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ? checker.getAliasedSymbol(symbol)
    : symbol;
  if (target == null) {
    return null;
  }
  const name = target.getName();
  if (!isRuntimeHtmlResourceApiName(name)) {
    return null;
  }
  return (target.declarations ?? []).some(isRuntimeHtmlDeclaration)
    ? name
    : null;
}

function isRuntimeHtmlResourceApiName(name: string): boolean {
  switch (name) {
    case 'CustomElementDefinition':
    case 'CustomElement':
    case 'CustomAttribute':
    case 'ValueConverter':
    case 'BindingBehavior':
      return true;
    default:
      return false;
  }
}

function isRuntimeHtmlDeclaration(declaration: ts.Declaration): boolean {
  const normalized = normalizeTypeSystemSourceFileName(declaration.getSourceFile().fileName).replace(/\\/g, '/');
  return normalized.includes('/aurelia/packages/runtime-html/src/')
    || normalized.includes('/aurelia/packages/runtime-html/dist/')
    || normalized.includes('/@aurelia/runtime-html/')
    || normalized.includes('/@aurelia+runtime-html/');
}

function isCustomElementDefinitionCreateOnlyName(call: ts.CallExpression): boolean {
  const first = unwrapExpression(call.arguments[0] ?? call);
  if (!ts.isStringLiteralLike(first)) {
    return false;
  }
  return call.arguments[1] == null || isUndefinedOrNullExpression(call.arguments[1]);
}

function isUndefinedOrNullExpression(expression: ts.Expression): boolean {
  const current = unwrapExpression(expression);
  return current.kind === ts.SyntaxKind.NullKeyword
    || current.kind === ts.SyntaxKind.UndefinedKeyword
    || (ts.isVoidExpression(current) && current.expression.kind === ts.SyntaxKind.FirstLiteralToken);
}

function getDefinitionCallKind(
  owner: string,
  method: string,
): ResourceDefinitionApiCallKind | null {
  if (method !== 'getDefinition') {
    return null;
  }
  switch (owner) {
    case 'CustomElement':
      return ResourceDefinitionApiCallKind.CustomElementGetDefinition;
    case 'CustomAttribute':
      return ResourceDefinitionApiCallKind.CustomAttributeGetDefinition;
    case 'ValueConverter':
      return ResourceDefinitionApiCallKind.ValueConverterGetDefinition;
    case 'BindingBehavior':
      return ResourceDefinitionApiCallKind.BindingBehaviorGetDefinition;
    default:
      return null;
  }
}

function sourceDeclarationReferenceForExpression(
  checker: ts.TypeChecker,
  expression: ts.Expression | null,
  sourcePathByFileName: ReadonlyMap<string, string>,
): SourceDeclarationReference | null {
  if (expression == null) {
    return null;
  }
  const current = unwrapExpression(expression);
  if (ts.isClassExpression(current)) {
    return sourceDeclarationReferenceForDeclaration(current, sourcePathByFileName);
  }
  const symbol = checker.getSymbolAtLocation(current);
  const target = symbol != null && (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ? checker.getAliasedSymbol(symbol)
    : symbol;
  const declaration = target?.declarations?.find(ts.isClassDeclaration) ?? null;
  return declaration == null
    ? null
    : sourceDeclarationReferenceForDeclaration(declaration, sourcePathByFileName);
}

function sourceDeclarationReferenceForDeclaration(
  declaration: ts.ClassDeclaration | ts.ClassExpression,
  sourcePathByFileName: ReadonlyMap<string, string>,
): SourceDeclarationReference | null {
  const sourceFile = declaration.getSourceFile();
  const normalizedFileName = normalizeTypeSystemSourceFileName(sourceFile.fileName);
  const sourcePath = sourcePathByFileName.get(normalizedFileName) ?? null;
  if (sourcePath == null) {
    return null;
  }
  return new SourceDeclarationReference(
    sourcePath,
    declaration.getStart(sourceFile),
    declaration.end,
    declaration.name?.text ?? null,
  );
}

function issueForResourceDefinitionApiCall(
  site: ResourceDefinitionApiCallSite,
  definitions: readonly FullResourceDefinition[],
  store: KernelStore,
): {
  readonly issueKind: ResourceIssueKind;
  readonly message: string;
  readonly frameworkErrorCode: ResourceFrameworkErrorCode;
} | null {
  switch (site.kind) {
    case ResourceDefinitionApiCallKind.CustomElementDefinitionCreateOnlyName:
      return {
        issueKind: ResourceIssueKind.CustomElementDefinitionOnlyName,
        message: 'Cannot create a custom element definition with only a name and no type.',
        frameworkErrorCode: ResourceFrameworkErrorCode.ElementOnlyName,
      };
    case ResourceDefinitionApiCallKind.CustomElementGetDefinition:
      return definitionCallIssue(
        site,
        definitions,
        store,
        ResourceDefinitionKind.CustomElement,
        ResourceIssueKind.CustomElementDefinitionNotFound,
        ResourceFrameworkErrorCode.ElementDefinitionNotFound,
        'custom element',
      );
    case ResourceDefinitionApiCallKind.CustomAttributeGetDefinition:
      return definitionCallIssue(
        site,
        definitions,
        store,
        ResourceDefinitionKind.CustomAttribute,
        ResourceIssueKind.CustomAttributeDefinitionNotFound,
        ResourceFrameworkErrorCode.AttributeDefinitionNotFound,
        'custom attribute',
      );
    case ResourceDefinitionApiCallKind.ValueConverterGetDefinition:
      return definitionCallIssue(
        site,
        definitions,
        store,
        ResourceDefinitionKind.ValueConverter,
        ResourceIssueKind.ValueConverterDefinitionNotFound,
        ResourceFrameworkErrorCode.ValueConverterDefinitionNotFound,
        'value converter',
      );
    case ResourceDefinitionApiCallKind.BindingBehaviorGetDefinition:
      return definitionCallIssue(
        site,
        definitions,
        store,
        ResourceDefinitionKind.BindingBehavior,
        ResourceIssueKind.BindingBehaviorDefinitionNotFound,
        ResourceFrameworkErrorCode.BindingBehaviorDefinitionNotFound,
        'binding behavior',
      );
  }
}

function definitionCallIssue(
  site: ResourceDefinitionApiCallSite,
  definitions: readonly FullResourceDefinition[],
  store: KernelStore,
  expectedKind: ResourceDefinitionKind,
  issueKind: ResourceIssueKind,
  frameworkErrorCode: ResourceFrameworkErrorCode,
  label: string,
): {
  readonly issueKind: ResourceIssueKind;
  readonly message: string;
  readonly frameworkErrorCode: ResourceFrameworkErrorCode;
} | null {
  if (site.target == null || resourceDefinitionExistsForTarget(definitions, store, expectedKind, site.target)) {
    return null;
  }
  return {
    issueKind,
    message: `No ${label} definition found for type ${site.target.name ?? '(anonymous class)'}.`,
    frameworkErrorCode,
  };
}

function resourceDefinitionExistsForTarget(
  definitions: readonly FullResourceDefinition[],
  store: KernelStore,
  expectedKind: ResourceDefinitionKind,
  target: SourceDeclarationReference,
): boolean {
  return definitions.some((definition) =>
    definition.type === expectedKind
    && definitionTargetMatches(store, definition, target)
  );
}

function definitionTargetMatches(
  store: KernelStore,
  definition: FullResourceDefinition,
  target: SourceDeclarationReference,
): boolean {
  const address = definition.target.addressHandle == null
    ? null
    : store.readAddress(definition.target.addressHandle);
  if (address?.kind !== 'source-span-address' || address.start !== target.start || address.end !== target.end) {
    return false;
  }
  const file = store.readAddress(address.fileHandle);
  return file?.kind === 'source-file-address'
    && sourcePathEqual(file.path, target.sourcePath);
}

function sourcePathEqual(left: string, right: string): boolean {
  return normalizeTypeSystemSourceFileName(left) === normalizeTypeSystemSourceFileName(right);
}

function resourceDefinitionApiIssueLocalKey(
  project: ProjectBootFrame,
  site: ResourceDefinitionApiCallSite,
  index: number,
  issueKind: ResourceIssueKind,
): string {
  return [
    'resource-definition-api-issue',
    issueKind,
    localKeyPart(project.projectKey),
    localKeyPart(site.sourcePath),
    site.start,
    site.end,
    index,
  ].join(':');
}
