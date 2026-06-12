import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import {
  readImportedExportName,
  readSourceImportBindings,
  type SourceImportBindings,
} from '../evaluation/import-bindings.js';
import {
  sourceSiteForNode,
  typescriptExpressionSourceRootName,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import { EvidenceRole } from '../kernel/evidence.js';
import type {
  AddressHandle,
} from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { SourceSpanSite } from '../kernel/source-address.js';
import {
  KernelStore,
  KernelStoreBatch,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { ObservationProductDetails } from './product-details.js';
import {
  ProxyObservableEscape,
  ProxyObservableEscapeKind,
  ProxyObservableEscapeProjectResult,
} from './proxy-observable-escape.js';
import { sourceObservationProductRecords } from './source-observation-product-publication.js';

const PROXY_OBSERVABLE_MODULES = new Set([
  'aurelia',
  '@aurelia/runtime',
]);

const PROXY_OBSERVABLE_EXPORTS = new Set([
  'ProxyObservable',
]);

interface ProxyObservableEscapeSite extends SourceSpanSite {
  readonly sourcePath: string;
  readonly sourceFileAddressHandle: AddressHandle;
  readonly sourceFile: ts.SourceFile;
  readonly escapeKind: ProxyObservableEscapeKind;
  readonly argument: ts.Expression | null;
}

interface ProxyObservableEscapePublication {
  readonly escape: ProxyObservableEscape;
  readonly records: readonly KernelStoreRecord[];
}

/** Materializes direct source calls to ProxyObservable.getRaw(...) and ProxyObservable.unwrap(...). */
export class ProxyObservableEscapeMaterializer {
  constructor(
    readonly store: KernelStore,
  ) {}

  materialize(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
  ): ProxyObservableEscapeProjectResult {
    const publications = readProxyObservableEscapeSites(project, typeSystem)
      .map((site, index) => this.publicationForSite(project, site, index));
    const records = publications.flatMap((publication) => publication.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, `proxy-observable-escapes:${project.projectKey}`));
    }
    for (const publication of publications) {
      this.store.productDetails.add(
        ObservationProductDetails.ProxyObservableEscape,
        publication.escape.productHandle,
        publication.escape,
      );
    }
    return new ProxyObservableEscapeProjectResult(publications.map((publication) => publication.escape));
  }

  private publicationForSite(
    project: ProjectBootFrame,
    site: ProxyObservableEscapeSite,
    index: number,
  ): ProxyObservableEscapePublication {
    const local = proxyObservableEscapeLocalKey(project, site, index);
    const argumentSourceName = site.argument?.getText(site.sourceFile) ?? null;
    const product = sourceObservationProductRecords({
      store: this.store,
      local,
      site,
      productKindKey: KernelVocabulary.Observation.ProxyObservableEscape.key,
      evidenceRoles: [EvidenceRole.Usage],
      evidenceSummary: `ProxyObservable.${site.escapeKind} source escape.`,
      identityOwnerHandle: null,
      identityLocalName: `${site.escapeKind}:${argumentSourceName ?? index}`,
    });
    const escape = new ProxyObservableEscape(
      product.productHandle,
      product.identityHandle,
      site.escapeKind,
      argumentSourceName,
      site.argument == null ? null : typescriptExpressionSourceRootName(site.argument),
      product.sourceAddressHandle,
    );
    return {
      escape,
      records: product.records,
    };
  }
}

function readProxyObservableEscapeSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly ProxyObservableEscapeSite[] {
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
    if (sourceFile == null) {
      return [];
    }
    return readSourceFileProxyObservableEscapeSites(source.path, source.addressHandle, sourceFile);
  });
}

function readSourceFileProxyObservableEscapeSites(
  sourcePath: string,
  sourceFileAddressHandle: AddressHandle,
  sourceFile: ts.SourceFile,
): readonly ProxyObservableEscapeSite[] {
  const bindings = readSourceImportBindings(sourceFile, PROXY_OBSERVABLE_MODULES, PROXY_OBSERVABLE_EXPORTS);
  const sites: ProxyObservableEscapeSite[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const site = proxyObservableEscapeSiteForCall(sourcePath, sourceFileAddressHandle, sourceFile, bindings, node);
      if (site != null) {
        sites.push(site);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return sites;
}

function proxyObservableEscapeSiteForCall(
  sourcePath: string,
  sourceFileAddressHandle: AddressHandle,
  sourceFile: ts.SourceFile,
  bindings: SourceImportBindings,
  call: ts.CallExpression,
): ProxyObservableEscapeSite | null {
  const expression = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(expression)) {
    return null;
  }
  const escapeKind = proxyObservableEscapeKind(expression.name.text);
  if (escapeKind == null || readImportedExportName(expression.expression, bindings, true) !== 'ProxyObservable') {
    return null;
  }
  return sourceSiteForNode(
    {
      sourcePath,
      sourceFileAddressHandle,
      sourceFile,
    },
    call,
    {
      sourcePath,
      sourceFileAddressHandle,
      sourceFile,
      escapeKind,
      argument: call.arguments[0] ?? null,
    },
  );
}

function proxyObservableEscapeKind(
  methodName: string,
): ProxyObservableEscapeKind | null {
  switch (methodName) {
    case 'getRaw':
      return ProxyObservableEscapeKind.GetRaw;
    case 'unwrap':
      return ProxyObservableEscapeKind.Unwrap;
    default:
      return null;
  }
}

function proxyObservableEscapeLocalKey(
  project: ProjectBootFrame,
  site: ProxyObservableEscapeSite,
  index: number,
): string {
  return [
    'proxy-observable-escape',
    site.escapeKind,
    localKeyPart(project.projectKey),
    localKeyPart(site.sourcePath),
    site.start,
    site.end,
    index,
  ].join(':');
}
