import ts from 'typescript';

import {
  KernelStore,
  KernelStoreBatch,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { localKeyPart } from '../kernel/local-key.js';
import {
  sourceSpanAddressForSite,
  type SourceSpanAddressPublication,
} from '../kernel/source-address.js';
import type { ProjectBootFrame } from '../boot/frames.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  ContainerLookupKeyKind,
} from './container-key.js';
import {
  nullishExpressionKind,
} from '../evaluation/nullish-expression.js';
import {
  readPropertyName,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import {
  DiContainerKeyExpressionIdentityKind,
} from './source-key-expression.js';
import {
  readDiInterfaceKeyDeclarations,
} from './interface-key-recognition.js';
import {
  DiContainerApiCallSite,
  DiContainerApiMethodKind,
  readDiContainerApiCallSites,
} from './container-api-recognition.js';
import type { DiIssue } from './di-issue.js';
import {
  DiIssueKind,
} from './di-issue.js';
import {
  DiIssuePublication,
  DiIssuePublisher,
  withDiIssueSourceAddressRecords,
} from './di-issue-publication.js';
import { DiProductDetails } from './product-details.js';

export class DiContainerApiIssueMaterialization {
  constructor(
    readonly issues: readonly DiIssue[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

/** Materializes diagnostics for direct Aurelia container API calls whose framework failure is method-local. */
export class DiContainerApiIssueMaterializer {
  private readonly publisher: DiIssuePublisher;

  constructor(
    readonly store: KernelStore,
  ) {
    this.publisher = new DiIssuePublisher(store);
  }

  materialize(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
  ): DiContainerApiIssueMaterialization {
    const nullReturningRegistryNames = readNullReturningRegistryNames(project, typeSystem);
    const noDefaultInterfaceNames = readNoDefaultInterfaceKeyNames(project, typeSystem);
    const publications = readDiContainerApiCallSites(project, typeSystem)
      .flatMap((site, index) =>
        this.publicationsForContainerApiCall(project, site, index, nullReturningRegistryNames, noDefaultInterfaceNames)
      );

    const records = publications.flatMap((publication) => publication.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, 'di-container-api-issues'));
    }
    this.store.productDetails.addAll(DiProductDetails.Issue, publications.map((publication) => publication.issue));

    return new DiContainerApiIssueMaterialization(
      publications.map((publication) => publication.issue),
      records,
    );
  }

  private publicationsForContainerApiCall(
    project: ProjectBootFrame,
    site: DiContainerApiCallSite,
    index: number,
    nullReturningRegistryNames: ReadonlySet<string>,
    noDefaultInterfaceNames: ReadonlySet<string>,
  ): readonly DiIssuePublication[] {
    if (containerApiCallValidatesNullishKey(site) && site.nullishKeyArguments.length > 0) {
      const local = containerApiIssueLocalKey(project, site, index, DiIssueKind.NullUndefinedKey);
      const source = this.sourceAddress(local, site);
      const publication = this.publisher.publishNullUndefinedKeyForContainerCall(local, site, source.handle);
      return [withDiIssueSourceAddressRecords(publication, source.records)];
    }

    if (containerApiCallHasExactNoneResolverFailure(site)) {
      const local = containerApiIssueLocalKey(project, site, index, DiIssueKind.NoneResolverFound);
      const source = this.sourceAddress(local, site);
      const publication = this.publisher.publishNoneResolverFoundForContainerCall(local, site, source.handle);
      return [withDiIssueSourceAddressRecords(publication, source.records)];
    }

    if (containerApiCallHasExactNullResolverFromRegisterFailure(site, nullReturningRegistryNames)) {
      const local = containerApiIssueLocalKey(project, site, index, DiIssueKind.NullResolverFromRegister);
      const source = this.sourceAddress(local, site);
      const publication = this.publisher.publishNullResolverFromRegisterForContainerCall(local, site, source.handle);
      return [withDiIssueSourceAddressRecords(publication, source.records)];
    }

    if (containerApiCallHasExactInvalidNewInstanceOnInterfaceFailure(site, noDefaultInterfaceNames)) {
      const local = containerApiIssueLocalKey(project, site, index, DiIssueKind.InvalidNewInstanceOnInterface);
      const source = this.sourceAddress(local, site);
      const publication = this.publisher.publishInvalidNewInstanceOnInterfaceForContainerCall(local, site, source.handle);
      return [withDiIssueSourceAddressRecords(publication, source.records)];
    }

    if (containerApiCallHasExactNativeConstructionFailure(site)) {
      const local = containerApiIssueLocalKey(project, site, index, DiIssueKind.NoConstructNativeFunction);
      const source = this.sourceAddress(local, site);
      const publication = this.publisher.publishNoConstructNativeFunctionForContainerCall(local, site, source.handle);
      return [withDiIssueSourceAddressRecords(publication, source.records)];
    }

    if (containerApiCallHasExactEphemeralNonConstructorFailure(site)) {
      const local = containerApiIssueLocalKey(project, site, index, DiIssueKind.UnableJitNonConstructor);
      const source = this.sourceAddress(local, site);
      const publication = this.publisher.publishUnableJitNonConstructorForContainerCall(local, site, source.handle);
      return [withDiIssueSourceAddressRecords(publication, source.records)];
    }

    return [];
  }

  private sourceAddress(
    local: string,
    site: DiContainerApiCallSite,
  ): SourceSpanAddressPublication {
    return sourceSpanAddressForSite(this.store, local, site);
  }
}

function readNoDefaultInterfaceKeyNames(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): ReadonlySet<string> {
  return new Set(
    readDiInterfaceKeyDeclarations(project, typeSystem)
      .filter((declaration) => !declaration.hasDefaultRegistration)
      .map((declaration) => declaration.name),
  );
}

function readNullReturningRegistryNames(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): ReadonlySet<string> {
  const names = new Set<string>();
  for (const source of project.sourceFiles) {
    const sourceFile = typeSystem.readSourceFileByPath(source.path);
    if (sourceFile == null) {
      continue;
    }
    readNullReturningRegistryNamesFromSourceFile(sourceFile, names);
  }
  return names;
}

function readNullReturningRegistryNamesFromSourceFile(
  sourceFile: ts.SourceFile,
  names: Set<string>,
): void {
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer != null) {
      if (registryObjectReturnsNullish(node.initializer)) {
        names.add(node.name.text);
      }
    } else if (ts.isClassDeclaration(node) && node.name != null && registryClassReturnsNullish(node)) {
      names.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

function registryClassReturnsNullish(
  declaration: ts.ClassDeclaration,
): boolean {
  return declaration.members.some((member) =>
    ts.isMethodDeclaration(member)
    && readPropertyName(member.name) === 'register'
    && functionLikeReturnsNullish(member)
  );
}

function registryObjectReturnsNullish(
  expression: ts.Expression,
): boolean {
  const current = unwrapExpression(expression);
  if (!ts.isObjectLiteralExpression(current)) {
    return false;
  }
  return current.properties.some((property) => {
    if (ts.isMethodDeclaration(property)) {
      return readPropertyName(property.name) === 'register' && functionLikeReturnsNullish(property);
    }
    if (!ts.isPropertyAssignment(property) || readPropertyName(property.name) !== 'register') {
      return false;
    }
    return functionLikeExpressionReturnsNullish(property.initializer);
  });
}

function functionLikeExpressionReturnsNullish(
  expression: ts.Expression,
): boolean {
  const current = unwrapExpression(expression);
  if (ts.isArrowFunction(current) && !ts.isBlock(current.body)) {
    return nullishExpressionKind(current.body) != null;
  }
  if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
    return functionLikeReturnsNullish(current);
  }
  return false;
}

function functionLikeReturnsNullish(
  declaration: ts.FunctionLikeDeclaration,
): boolean {
  const body = declaration.body;
  if (body == null || !ts.isBlock(body)) {
    return false;
  }
  return body.statements.some((statement) =>
    ts.isReturnStatement(statement)
    && statement.expression != null
    && nullishExpressionKind(statement.expression) != null
  );
}

function containerApiCallHasExactNativeConstructionFailure(
  site: DiContainerApiCallSite,
): boolean {
  if (
    site.keyKind !== ContainerLookupKeyKind.NativeFunction
    && site.keyKind !== ContainerLookupKeyKind.IntrinsicConstructable
  ) {
    return false;
  }
  switch (site.methodKind) {
    case DiContainerApiMethodKind.Invoke:
    case DiContainerApiMethodKind.GetFactory:
      return true;
    case DiContainerApiMethodKind.Get:
    case DiContainerApiMethodKind.GetResolver:
    case DiContainerApiMethodKind.GetAll:
    case DiContainerApiMethodKind.Has:
      return false;
  }
}

function containerApiCallHasExactNullResolverFromRegisterFailure(
  site: DiContainerApiCallSite,
  nullReturningRegistryNames: ReadonlySet<string>,
): boolean {
  return site.methodKind === DiContainerApiMethodKind.Get
    && site.autoRegister === true
    && site.receiverFreshCreateContainer
    && site.keyKind === ContainerLookupKeyKind.Registry
    && site.keyName != null
    && nullReturningRegistryNames.has(site.keyName);
}

function containerApiCallHasExactInvalidNewInstanceOnInterfaceFailure(
  site: DiContainerApiCallSite,
  noDefaultInterfaceNames: ReadonlySet<string>,
): boolean {
  return site.methodKind === DiContainerApiMethodKind.Get
    && site.receiverFreshCreateContainer
    && site.keyKind === ContainerLookupKeyKind.Resolver
    && (site.keyWrapperKind === 'newInstanceOf' || site.keyWrapperKind === 'newInstanceForScope')
    && site.wrappedKeyName != null
    && noDefaultInterfaceNames.has(site.wrappedKeyName);
}

function containerApiCallHasExactNoneResolverFailure(
  site: DiContainerApiCallSite,
): boolean {
  if (site.receiverDefaultResolverPolicy !== 'none') {
    return false;
  }
  if (site.keyKind !== ContainerLookupKeyKind.Constructable) {
    return false;
  }
  switch (site.methodKind) {
    case DiContainerApiMethodKind.Get:
      return true;
    case DiContainerApiMethodKind.GetResolver:
      return site.autoRegister === true;
    case DiContainerApiMethodKind.GetAll:
    case DiContainerApiMethodKind.Has:
    case DiContainerApiMethodKind.GetFactory:
    case DiContainerApiMethodKind.Invoke:
      return false;
  }
}

function containerApiCallValidatesNullishKey(
  site: DiContainerApiCallSite,
): boolean {
  switch (site.methodKind) {
    case DiContainerApiMethodKind.Get:
    case DiContainerApiMethodKind.GetResolver:
    case DiContainerApiMethodKind.GetAll:
    case DiContainerApiMethodKind.Has:
      return true;
    case DiContainerApiMethodKind.GetFactory:
    case DiContainerApiMethodKind.Invoke:
      return false;
  }
}

function containerApiCallHasExactEphemeralNonConstructorFailure(
  site: DiContainerApiCallSite,
): boolean {
  if (site.keyIdentityKind !== DiContainerKeyExpressionIdentityKind.EphemeralObject) {
    return false;
  }
  switch (site.methodKind) {
    case DiContainerApiMethodKind.Get:
      return true;
    case DiContainerApiMethodKind.GetResolver:
      return site.autoRegister === true;
    case DiContainerApiMethodKind.GetFactory:
      return true;
    case DiContainerApiMethodKind.GetAll:
    case DiContainerApiMethodKind.Has:
    case DiContainerApiMethodKind.Invoke:
      return false;
  }
}

function containerApiIssueLocalKey(
  project: ProjectBootFrame,
  site: DiContainerApiCallSite,
  index: number,
  issueKind: DiIssueKind,
): string {
  return [
    'di-container-api-issue',
    issueKind,
    localKeyPart(project.projectKey),
    localKeyPart(site.sourcePath),
    site.start,
    site.end,
    index,
  ].join(':');
}
