import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import {
  readImportedExportName,
  readSourceImportBindings,
} from '../evaluation/import-bindings.js';
import {
  nullishExpressionKind,
  type NullishExpressionKind,
} from '../evaluation/nullish-expression.js';
import {
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import {
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import {
  ConfigurationIdentity,
} from '../kernel/identity.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import { ProvenanceRecord } from '../kernel/provenance.js';
import {
  KernelStore,
  KernelStoreBatch,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  checkerDefinitelyNullishType,
} from '../type-system/checker-related-types.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  normalizeTypeSystemSourceFileName,
  typeSystemSourcePathIndex,
} from '../type-system/source-path-index.js';
import {
  ConfigurationFrameworkErrorCode,
} from './framework-error-code.js';
import {
  ConfigurationIssue,
  ConfigurationIssueKind,
  ConfigurationIssuePhase,
} from './configuration-issue.js';
import { ConfigurationProductDetails } from './product-details.js';

const AURELIA_SCOPE_MODULES = new Set([
  'aurelia',
  '@aurelia/runtime',
]);

const AURELIA_SCOPE_EXPORTS = new Set([
  'Scope',
]);

const enum ScopeApiMethodKind {
  Create = 'create',
  FromParent = 'fromParent',
  GetContext = 'getContext',
}

type ScopeApiNullishArgumentKind =
  | NullishExpressionKind
  | 'missing'
  | 'definitely-nullish-type';

class ScopeApiNullishArgument {
  constructor(
    readonly index: number,
    readonly kind: ScopeApiNullishArgumentKind,
    readonly text: string | null,
  ) {}
}

class ScopeApiCallSite {
  constructor(
    readonly sourcePath: string,
    readonly start: number,
    readonly end: number,
    readonly methodKind: ScopeApiMethodKind,
    readonly nullishArgument: ScopeApiNullishArgument,
    readonly receiverText: string,
  ) {}
}

class ScopeApiIssueSource {
  constructor(
    readonly records: readonly KernelStoreRecord[],
    readonly addressHandle: AddressHandle | null,
    readonly provenanceHandle: ProvenanceHandle,
  ) {}
}

export class ScopeApiIssueProjectResult {
  constructor(
    readonly issues: readonly ConfigurationIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Materializes direct runtime `Scope` API failures that are provable from TypeScript source. */
export class ScopeApiIssueMaterializer {
  constructor(
    readonly store: KernelStore,
  ) {}

  materializeAndEmit(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
  ): ScopeApiIssueProjectResult {
    const issues = readScopeApiCallSites(project, typeSystem)
      .map((site, index) => this.issueForScopeApiCall(project, site, index));
    const records = issues.flatMap((issue) => issue.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, `scope-api-issues:${project.projectKey}`));
    }
    for (const issue of issues) {
      this.store.productDetails.add(ConfigurationProductDetails.Issue, issue.issue.productHandle, issue.issue);
    }
    return new ScopeApiIssueProjectResult(
      issues.map((issue) => issue.issue),
      records,
    );
  }

  private issueForScopeApiCall(
    project: ProjectBootFrame,
    site: ScopeApiCallSite,
    index: number,
  ): {
    readonly issue: ConfigurationIssue;
    readonly records: readonly KernelStoreRecord[];
  } {
    const issueKind = scopeApiIssueKind(site);
    const local = scopeApiIssueLocalKey(project, site, index, issueKind);
    const source = this.sourceForIssue(local, site);
    const productHandle = this.store.handles.product(local);
    const identityHandle = this.store.handles.identity(local);
    const issue = new ConfigurationIssue(
      productHandle,
      identityHandle,
      project.projectKey,
      ConfigurationIssuePhase.ScopeApi,
      issueKind,
      scopeApiIssueMessage(site),
      source.addressHandle,
      scopeApiFrameworkCode(site),
    );
    const records = [
      ...source.records,
      new ConfigurationIdentity(
        identityHandle,
        KernelVocabulary.Configuration.Issue.key,
        null,
        source.addressHandle,
        issue.issueKind,
      ),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Configuration.Issue.key,
        identityHandle,
        source.addressHandle,
        source.provenanceHandle,
      ),
      new MaterializationRecord(
        this.store.handles.materialization(local),
        identityHandle,
        [productHandle],
        [],
      ),
    ];
    return { issue, records };
  }

  private sourceForIssue(
    local: string,
    site: ScopeApiCallSite,
  ): ScopeApiIssueSource {
    const evidenceHandle = this.store.handles.evidence(`${local}:evidence`);
    const provenanceHandle = this.store.handles.provenance(`${local}:provenance`);
    const file = this.store.readBestSourceFileAddressForFileName(site.sourcePath);
    if (file == null) {
      return new ScopeApiIssueSource(
        [
          new EvidenceRecord(
            evidenceHandle,
            EvidenceKind.SemanticObservation,
            [EvidenceRole.Diagnostic, EvidenceRole.Configuration],
            scopeApiIssueMessage(site),
            null,
          ),
          new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
        ],
        null,
        provenanceHandle,
      );
    }

    const addressHandle = this.store.handles.address(`${local}:source`);
    return new ScopeApiIssueSource(
      [
        new SourceSpanAddress(
          addressHandle,
          file.handle,
          site.start,
          site.end,
          SourceSpanRole.Range,
        ),
        new EvidenceRecord(
          evidenceHandle,
          EvidenceKind.SemanticObservation,
          [EvidenceRole.Diagnostic, EvidenceRole.Configuration],
          scopeApiIssueMessage(site),
          addressHandle,
        ),
        new ProvenanceRecord(provenanceHandle, [evidenceHandle]),
      ],
      addressHandle,
      provenanceHandle,
    );
  }
}

function readScopeApiCallSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly ScopeApiCallSite[] {
  const sourcePathByFileName = typeSystemSourcePathIndex(project, typeSystem);
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readSourceFileByPath(source.path);
    return sourceFile == null
      ? []
      : readSourceFileScopeApiCallSites(source.path, sourceFile, typeSystem.checker, sourcePathByFileName);
  });
}

function readSourceFileScopeApiCallSites(
  sourcePath: string,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  sourcePathByFileName: ReadonlyMap<string, string>,
): readonly ScopeApiCallSite[] {
  const bindings = readSourceImportBindings(sourceFile, AURELIA_SCOPE_MODULES, AURELIA_SCOPE_EXPORTS);
  const sites: ScopeApiCallSite[] = [];
  const visit = (node: ts.Node): void => {
    recordScopeApiCallSite(sites, sourcePath, sourceFile, checker, sourcePathByFileName, bindings, node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return sites;
}

function recordScopeApiCallSite(
  sites: ScopeApiCallSite[],
  sourcePath: string,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  sourcePathByFileName: ReadonlyMap<string, string>,
  bindings: ReturnType<typeof readSourceImportBindings>,
  node: ts.Node,
): void {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(unwrapExpression(node.expression))) {
    return;
  }
  const access = unwrapExpression(node.expression) as ts.PropertyAccessExpression;
  const methodKind = scopeApiMethodKind(access.name.text);
  if (
    methodKind == null
    || !isAureliaScopeReceiver(checker, access.expression, methodKind, bindings, sourcePathByFileName)
  ) {
    return;
  }
  const nullishArgument = scopeApiNullishArgument(node, sourceFile, checker);
  if (nullishArgument == null) {
    return;
  }
  sites.push(new ScopeApiCallSite(
    sourcePath,
    node.getStart(sourceFile),
    node.end,
    methodKind,
    nullishArgument,
    access.expression.getText(sourceFile),
  ));
}

function scopeApiMethodKind(
  name: string,
): ScopeApiMethodKind | null {
  switch (name) {
    case 'create':
      return ScopeApiMethodKind.Create;
    case 'fromParent':
      return ScopeApiMethodKind.FromParent;
    case 'getContext':
      return ScopeApiMethodKind.GetContext;
    default:
      return null;
  }
}

function scopeApiNullishArgument(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
): ScopeApiNullishArgument | null {
  const argumentIndex = 0;
  const argument = call.arguments[argumentIndex] ?? null;
  if (argument == null) {
    return new ScopeApiNullishArgument(argumentIndex, 'missing', null);
  }
  const literalKind = nullishExpressionKind(argument);
  if (literalKind != null) {
    return new ScopeApiNullishArgument(argumentIndex, literalKind, argument.getText(sourceFile));
  }
  return checkerDefinitelyNullishType(checker, checker.getTypeAtLocation(argument))
    ? new ScopeApiNullishArgument(argumentIndex, 'definitely-nullish-type', argument.getText(sourceFile))
    : null;
}

function isAureliaScopeReceiver(
  checker: ts.TypeChecker,
  receiver: ts.Expression,
  methodKind: ScopeApiMethodKind,
  bindings: ReturnType<typeof readSourceImportBindings>,
  sourcePathByFileName: ReadonlyMap<string, string>,
): boolean {
  if (readImportedExportName(receiver, bindings, AURELIA_SCOPE_EXPORTS) === 'Scope') {
    return true;
  }

  const type = checker.getTypeAtLocation(receiver);
  const property = checker.getPropertyOfType(type, methodKind);
  const declarations = property?.declarations ?? [];
  return declarations.some((declaration) => isAureliaScopeDeclaration(declaration, sourcePathByFileName));
}

function isAureliaScopeDeclaration(
  declaration: ts.Declaration,
  sourcePathByFileName: ReadonlyMap<string, string>,
): boolean {
  const sourceFileName = normalizeTypeSystemSourceFileName(declaration.getSourceFile().fileName);
  const projectSourcePath = sourcePathByFileName.get(sourceFileName) ?? sourceFileName;
  const normalized = projectSourcePath.replace(/\\/g, '/');
  return normalized.includes('/aurelia/packages/runtime/src/scope.ts')
    || normalized.includes('/aurelia/packages/runtime/dist/types/scope.d.ts')
    || normalized.includes('/@aurelia/runtime/');
}

function scopeApiIssueKind(
  site: ScopeApiCallSite,
): ConfigurationIssueKind {
  return site.methodKind === ScopeApiMethodKind.Create
    ? ConfigurationIssueKind.CreateScopeWithNullContext
    : ConfigurationIssueKind.NullScope;
}

function scopeApiFrameworkCode(
  site: ScopeApiCallSite,
): ConfigurationFrameworkErrorCode {
  return site.methodKind === ScopeApiMethodKind.Create
    ? ConfigurationFrameworkErrorCode.CreateScopeWithNullContext
    : ConfigurationFrameworkErrorCode.NullScope;
}

function scopeApiIssueMessage(
  site: ScopeApiCallSite,
): string {
  const argument = site.nullishArgument.text == null
    ? 'a missing first argument'
    : `first argument ${site.nullishArgument.text}`;
  return site.methodKind === ScopeApiMethodKind.Create
    ? `Aurelia Scope.create receives ${argument}; the runtime rejects null/undefined binding contexts.`
    : `Aurelia Scope.${site.methodKind} receives ${argument}; the runtime rejects null/undefined scopes.`;
}

function scopeApiIssueLocalKey(
  project: ProjectBootFrame,
  site: ScopeApiCallSite,
  index: number,
  issueKind: ConfigurationIssueKind,
): string {
  return [
    'scope-api-issue',
    issueKind,
    localKeyPart(project.projectKey),
    localKeyPart(site.sourcePath),
    site.start,
    site.end,
    index,
  ].join(':');
}
