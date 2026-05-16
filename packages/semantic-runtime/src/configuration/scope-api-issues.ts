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
  sourceSiteForNode,
  type TypeScriptSourceSiteContext,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import {
  EvidenceRole,
} from '../kernel/evidence.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  sourceSpanAddressForSite,
  type SourceSpanAddressPublication,
  type SourceSpanSite,
} from '../kernel/source-address.js';
import {
  KernelStore,
  KernelStoreBatch,
  type KernelStoreRecord,
} from '../kernel/store.js';
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
import {
  ConfigurationIssuePublication,
  ConfigurationIssuePublisher,
} from './configuration-issue-publication.js';
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

interface ScopeApiNullishArgument {
  readonly index: number;
  readonly kind: ScopeApiNullishArgumentKind;
  readonly text: string | null;
}

interface ScopeApiCallSite extends SourceSpanSite {
  readonly sourcePath: string;
  readonly methodKind: ScopeApiMethodKind;
  readonly nullishArgument: ScopeApiNullishArgument;
  readonly receiverText: string;
}

export class ScopeApiIssueProjectResult {
  constructor(
    readonly issues: readonly ConfigurationIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Materializes direct runtime `Scope` API failures that are provable from TypeScript source. */
export class ScopeApiIssueMaterializer {
  private readonly issuePublisher: ConfigurationIssuePublisher;

  constructor(
    readonly store: KernelStore,
  ) {
    this.issuePublisher = new ConfigurationIssuePublisher(store);
  }

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
    this.store.productDetails.addAll(ConfigurationProductDetails.Issue, issues.map((issue) => issue.issue));
    return new ScopeApiIssueProjectResult(
      issues.map((issue) => issue.issue),
      records,
    );
  }

  private issueForScopeApiCall(
    project: ProjectBootFrame,
    site: ScopeApiCallSite,
    index: number,
  ): ConfigurationIssuePublication {
    const issueKind = scopeApiIssueKind(site);
    const local = scopeApiIssueLocalKey(project, site, index, issueKind);
    const source = this.sourceForIssue(local, site);
    const publication = this.issuePublisher.publish({
      local,
      projectKey: project.projectKey,
      phase: ConfigurationIssuePhase.ScopeApi,
      issueKind,
      message: scopeApiIssueMessage(site),
      frameworkErrorCode: scopeApiFrameworkCode(site),
      sourceAddressHandle: source.handle,
      ownerHandle: source.handle,
      evidenceRoles: [EvidenceRole.Diagnostic, EvidenceRole.Configuration],
    });
    return new ConfigurationIssuePublication(publication.issue, [...source.records, ...publication.records]);
  }

  private sourceForIssue(
    local: string,
    site: ScopeApiCallSite,
  ): SourceSpanAddressPublication {
    return sourceSpanAddressForSite(this.store, local, site);
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
      : readSourceFileScopeApiCallSites(
        {
          sourcePath: source.path,
          sourceFileAddressHandle: source.addressHandle,
          sourceFile,
        },
        typeSystem.checker,
        sourcePathByFileName,
      );
  });
}

function readSourceFileScopeApiCallSites(
  context: TypeScriptSourceSiteContext,
  checker: ts.TypeChecker,
  sourcePathByFileName: ReadonlyMap<string, string>,
): readonly ScopeApiCallSite[] {
  const bindings = readSourceImportBindings(context.sourceFile, AURELIA_SCOPE_MODULES, AURELIA_SCOPE_EXPORTS);
  const sites: ScopeApiCallSite[] = [];
  const visit = (node: ts.Node): void => {
    recordScopeApiCallSite(sites, context, checker, sourcePathByFileName, bindings, node);
    ts.forEachChild(node, visit);
  };
  visit(context.sourceFile);
  return sites;
}

function recordScopeApiCallSite(
  sites: ScopeApiCallSite[],
  context: TypeScriptSourceSiteContext,
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
  const nullishArgument = scopeApiNullishArgument(node, context.sourceFile, checker);
  if (nullishArgument == null) {
    return;
  }
  sites.push(sourceSiteForNode(
    context,
    node,
    {
      methodKind,
      nullishArgument,
      receiverText: access.expression.getText(context.sourceFile),
    },
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
    return { index: argumentIndex, kind: 'missing', text: null };
  }
  const literalKind = nullishExpressionKind(argument);
  if (literalKind != null) {
    return { index: argumentIndex, kind: literalKind, text: argument.getText(sourceFile) };
  }
  return checkerDefinitelyNullishType(checker, checker.getTypeAtLocation(argument))
    ? { index: argumentIndex, kind: 'definitely-nullish-type', text: argument.getText(sourceFile) }
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
