import ts from 'typescript';

import {
  EvaluationValueKind,
  type EvaluationValue,
} from '../evaluation/values.js';
import { readReferenceName, unwrapExpression } from '../evaluation/ts-syntax.js';
import { SourceSpanAddress, SourceSpanRole } from '../kernel/address.js';
import type { AddressHandle, IdentityHandle } from '../kernel/handles.js';
import {
  ConstructableDiKeyIdentity,
  DiKeyIdentityKind,
  DiResolverKeyKind,
  InterfaceDiKeyIdentity,
  ObjectDiKeyIdentity,
  PrimitiveDiKeyIdentity,
  PrimitiveDiKeyValueKind,
  ResourceDiKeyIdentity,
  ResolverDiKeyIdentity,
  StringDiKeyIdentity,
  SymbolDiKeyIdentity,
  SymbolDiKeyIdentityKind,
  TypeScriptDeclarationIdentity,
  UnknownDiKeyIdentity,
} from '../kernel/identity.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import type { KernelStoreReadView, KernelStoreRecord } from '../kernel/store.js';
import {
  type DeclarationSourcePublication,
  sourceSpanForCheckerDeclaration,
  sourceSpanForCheckerNode,
} from '../type-system/declaration-source.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { isDefaultLibrarySourceFile } from '../type-system/source-file-path.js';
import {
  firstSymbolDeclaration,
  symbolForExpression,
} from '../type-system/checker-node-helpers.js';
import { ContainerLookupKeyKind } from './container-key.js';
import {
  frameworkIntrinsicDiKeyForName,
  frameworkIntrinsicDiKeyLocal,
  type FrameworkIntrinsicDiKey,
} from './framework-intrinsic-di-key.js';
import { aureliaFrameworkIntrinsicDiKeyForDeclaration } from './interface-key-recognition.js';
import {
  containerLookupKeyKindForDeclaration,
  containerLookupKeyKindForExpression,
} from './source-key-expression.js';
import {
  aureliaResolverKeyKindForWrapper,
  isAureliaIgnoreResolverExpression,
  readAureliaResolverWrapperCall,
} from './resolver-wrapper-recognition.js';

/** Evaluator-owned declaration source used when no TypeChecker epoch is available. */
export class EvaluatedDiKeyDeclarationSource {
  constructor(
    readonly declaration: ts.ClassLikeDeclaration | ts.FunctionLikeDeclaration,
    readonly moduleKey: string,
    readonly sourceFileAddressHandle: AddressHandle | null,
  ) {}
}

/** All available evidence for normalizing one authored DI key occurrence. */
export class DiKeyExpressionIdentityRequest {
  constructor(
    readonly projectKey: string | null,
    readonly expression: ts.Expression,
    readonly localName: string | null,
    readonly evaluatedValue: EvaluationValue | null,
    readonly evaluatedDeclaration: EvaluatedDiKeyDeclarationSource | null,
    readonly typeSystem: TypeSystemProject | null,
    readonly fallbackIdentityHandle: IdentityHandle,
    readonly occurrenceAddressHandle: AddressHandle | null,
  ) {}
}

/** Canonical key identity selected from declaration, primitive-value, evaluator, and occurrence evidence. */
export class DiKeyIdentityEmission {
  constructor(
    readonly identityHandle: IdentityHandle,
    readonly keyKind: DiKeyIdentityKind,
    /** Runtime container branch selected by this key; distinct from its JavaScript equality/identity family. */
    readonly lookupKeyKind: ContainerLookupKeyKind,
  ) {}
}

interface DiKeyDeclarationPublication {
  readonly identityHandle: IdentityHandle;
  readonly addressHandle: AddressHandle;
  readonly symbolName: string | null;
  readonly declaration: ts.Declaration;
}

/** Sole publication facade for durable DI key identities. */
export class DiKeyIdentityEmitter {
  private readonly emittedRecordHandles = new Set<string>();
  private readonly interfaceKeyIdentityHandles = new Map<string, IdentityHandle>();
  private evaluatedObjectKeyIdentities = new WeakMap<object, DiKeyIdentityEmission>();

  constructor(private readonly records: KernelStoreReadView) {}

  reset(): void {
    this.emittedRecordHandles.clear();
    this.evaluatedObjectKeyIdentities = new WeakMap<object, DiKeyIdentityEmission>();
  }

  interfaceKeyIdentityHandle(interfaceName: FrameworkIntrinsicDiKey): IdentityHandle {
    let handle = this.interfaceKeyIdentityHandles.get(interfaceName);
    if (handle === undefined) {
      handle = this.records.handles.identity(frameworkIntrinsicDiKeyLocal(interfaceName));
      this.interfaceKeyIdentityHandles.set(interfaceName, handle);
    }
    return handle;
  }

  emitExpressionKeyIdentity(
    records: KernelStoreRecord[],
    publication: KernelPublicationContext,
    request: DiKeyExpressionIdentityRequest,
  ): DiKeyIdentityEmission {
    const wrapper = this.emitResolverWrapperIdentity(records, publication, request);
    if (wrapper != null) {
      return wrapper;
    }
    const ignore = this.emitIgnoreResolverIdentity(records, request);
    if (ignore != null) {
      return ignore;
    }

    const stringValue = evaluatedStringValue(request.evaluatedValue)
      ?? authoredStringValue(request.expression);
    if (stringValue != null && request.projectKey != null) {
      const handle = this.records.handles.identity([
        'di-key',
        'string',
        localKeyPart(request.projectKey),
        localKeyPart(stringValue),
      ].join(':'));
      this.emitRecord(records, new StringDiKeyIdentity(handle, stringValue, null));
      return new DiKeyIdentityEmission(handle, DiKeyIdentityKind.String, ContainerLookupKeyKind.String);
    }

    const primitive = evaluatedPrimitiveKeyValue(request.evaluatedValue)
      ?? authoredPrimitiveKeyValue(request.expression);
    if (primitive != null && request.projectKey != null) {
      const handle = this.records.handles.identity([
        'di-key',
        'primitive',
        localKeyPart(request.projectKey),
        primitive.valueKind,
        localKeyPart(primitive.value),
      ].join(':'));
      this.emitRecord(records, new PrimitiveDiKeyIdentity(
        handle,
        primitive.valueKind,
        primitive.value,
        null,
      ));
      return new DiKeyIdentityEmission(handle, DiKeyIdentityKind.Primitive, ContainerLookupKeyKind.Primitive);
    }

    const declaration = this.declarationForExpression(records, publication, request);
    const symbol = this.emitSymbolKeyIdentity(records, publication, request, declaration);
    if (symbol != null) {
      return symbol;
    }
    if (declaration != null) {
      const emitted = this.emitDeclarationKeyIdentity(
        records,
        declaration,
        this.expressionKind(request),
        request.localName,
      );
      if (emitted != null) {
        return emitted;
      }
    }

    const object = this.emitObjectKeyIdentity(records, publication, request);
    if (object != null) {
      return object;
    }

    const evaluatedDeclaration = declaration == null
      ? this.evaluatedDeclarationForExpression(records, request)
      : null;
    if (evaluatedDeclaration != null) {
      const handle = this.records.handles.identity(`di-key:constructable:${localKeyPart(evaluatedDeclaration.identityHandle)}`);
      this.emitRecord(records, new ConstructableDiKeyIdentity(
        handle,
        evaluatedDeclaration.identityHandle,
        evaluatedDeclaration.symbolName ?? request.localName,
        evaluatedDeclaration.addressHandle,
      ));
      return new DiKeyIdentityEmission(handle, DiKeyIdentityKind.Constructable, ContainerLookupKeyKind.Constructable);
    }

    this.emitRecord(records, new UnknownDiKeyIdentity(
      request.fallbackIdentityHandle,
      request.occurrenceAddressHandle,
      `DI key expression could not be reduced to a canonical declaration or primitive value: ${request.localName ?? ts.SyntaxKind[request.expression.kind]}.`,
    ));
    return new DiKeyIdentityEmission(
      request.fallbackIdentityHandle,
      DiKeyIdentityKind.Unknown,
      this.expressionKind(request),
    );
  }

  /** Resolve a known package export through the same declaration identity authority as authored DI keys. */
  emitExportedKeyIdentity(
    records: KernelStoreRecord[],
    publication: KernelPublicationContext,
    typeSystem: TypeSystemProject,
    moduleSpecifiers: readonly string[],
    exportName: string,
    fallbackIdentityHandle: IdentityHandle,
    occurrenceAddressHandle: AddressHandle | null,
  ): DiKeyIdentityEmission {
    const intrinsic = frameworkIntrinsicDiKeyForName(exportName);
    if (intrinsic != null) {
      const handle = this.interfaceKeyIdentityHandle(intrinsic);
      this.emitInterfaceKeyIdentity(records, handle, exportName, null, occurrenceAddressHandle);
      return new DiKeyIdentityEmission(handle, DiKeyIdentityKind.Interface, ContainerLookupKeyKind.Interface);
    }

    for (const moduleSpecifier of moduleSpecifiers) {
      const symbol = typeSystem.readProgramExportedSymbol(moduleSpecifier, exportName);
      const declaration = symbol == null ? null : firstSymbolDeclaration(symbol);
      if (symbol == null || declaration == null) {
        continue;
      }
      const lookupKind = containerLookupKeyKindForDeclaration(typeSystem, declaration);
      const declarationPublication = this.declarationForSymbol(
        records,
        publication,
        typeSystem,
        symbol,
      );
      const emitted = declarationPublication == null
        ? null
        : this.emitDeclarationKeyIdentity(
          records,
          declarationPublication,
          lookupKind,
          exportName,
        );
      if (emitted != null) {
        return emitted;
      }
    }

    this.emitRecord(records, new UnknownDiKeyIdentity(
      fallbackIdentityHandle,
      occurrenceAddressHandle,
      `Framework DI key ${exportName} is not a public interface or constructable export of ${moduleSpecifiers.join(', ')}.`,
    ));
    return new DiKeyIdentityEmission(
      fallbackIdentityHandle,
      DiKeyIdentityKind.Unknown,
      ContainerLookupKeyKind.Unknown,
    );
  }

  private emitIgnoreResolverIdentity(
    records: KernelStoreRecord[],
    request: DiKeyExpressionIdentityRequest,
  ): DiKeyIdentityEmission | null {
    const typeSystem = request.typeSystem;
    const expression = typeSystem?.readProgramExpression(request.expression) ?? null;
    if (typeSystem == null || expression == null
      || !isAureliaIgnoreResolverExpression(typeSystem.checker, expression)) {
      return null;
    }
    const handle = this.records.handles.identity('di-key:resolver:ignore');
    this.emitRecord(records, new ResolverDiKeyIdentity(
      handle,
      DiResolverKeyKind.Ignore,
      null,
      request.occurrenceAddressHandle,
    ));
    return new DiKeyIdentityEmission(handle, DiKeyIdentityKind.ResolverKey, ContainerLookupKeyKind.Resolver);
  }

  private emitResolverWrapperIdentity(
    records: KernelStoreRecord[],
    publication: KernelPublicationContext,
    request: DiKeyExpressionIdentityRequest,
  ): DiKeyIdentityEmission | null {
    const typeSystem = request.typeSystem;
    const expression = typeSystem?.readProgramExpression(request.expression) ?? null;
    if (typeSystem == null || expression == null) {
      return null;
    }
    const wrapper = readAureliaResolverWrapperCall(typeSystem.checker, expression);
    if (wrapper == null) {
      return null;
    }
    const inner = wrapper.innerExpression == null
      ? null
      : sourceSpanForCheckerNode(
        publication,
        typeSystem.checker,
        'di-key-resolver-inner',
        wrapper.innerExpression,
        SourceSpanRole.Value,
      );
    if (inner != null) {
      this.emitRecords(records, inner.records);
    }
    const innerIdentity = wrapper.innerExpression == null || inner == null
      ? null
      : this.emitExpressionKeyIdentity(records, publication, new DiKeyExpressionIdentityRequest(
        request.projectKey,
        wrapper.innerExpression,
        readReferenceName(wrapper.innerExpression),
        null,
        null,
        typeSystem,
        this.records.handles.identity(`di-key:resolver-inner:${localKeyPart(inner.address.handle)}`),
        inner.address.handle,
      ));
    const resolverKind = aureliaResolverKeyKindForWrapper(wrapper.wrapperKind);
    const semanticPart = innerIdentity == null
      ? localKeyPart(request.fallbackIdentityHandle)
      : localKeyPart(innerIdentity.identityHandle);
    const handle = this.records.handles.identity(`di-key:resolver:${resolverKind}:${semanticPart}`);
    this.emitRecord(records, new ResolverDiKeyIdentity(
      handle,
      resolverKind,
      innerIdentity?.identityHandle ?? null,
      innerIdentity == null ? request.occurrenceAddressHandle : null,
    ));
    return new DiKeyIdentityEmission(handle, DiKeyIdentityKind.ResolverKey, ContainerLookupKeyKind.Resolver);
  }

  private emitSymbolKeyIdentity(
    records: KernelStoreRecord[],
    publication: KernelPublicationContext,
    request: DiKeyExpressionIdentityRequest,
    declaration: DiKeyDeclarationPublication | null,
  ): DiKeyIdentityEmission | null {
    const typeSystem = request.typeSystem;
    const expression = typeSystem?.readProgramExpression(request.expression) ?? null;
    if (typeSystem == null || expression == null) {
      return null;
    }
    const seed = symbolKeySeedForExpression(typeSystem.checker, expression, new Set());
    if (seed == null) {
      return null;
    }
    if (seed.symbolKind === SymbolDiKeyIdentityKind.GlobalRegistry && request.projectKey != null) {
      const handle = this.records.handles.identity([
        'di-key',
        'symbol-for',
        localKeyPart(request.projectKey),
        localKeyPart(seed.symbolName ?? ''),
      ].join(':'));
      this.emitRecord(records, new SymbolDiKeyIdentity(
        handle,
        seed.symbolKind,
        null,
        seed.symbolName,
        null,
      ));
      return new DiKeyIdentityEmission(handle, DiKeyIdentityKind.Symbol, ContainerLookupKeyKind.Symbol);
    }

    const source = declaration == null
      ? sourceSpanForCheckerNode(
        publication,
        typeSystem.checker,
        'di-key-symbol-creation',
        seed.creationNode,
        SourceSpanRole.Value,
      )
      : null;
    if (source != null) {
      this.emitRecords(records, source.records);
    }
    const sourceHandle = declaration?.identityHandle ?? source?.address.handle ?? request.fallbackIdentityHandle;
    const addressHandle = declaration?.addressHandle ?? source?.address.handle ?? request.occurrenceAddressHandle;
    const handle = this.records.handles.identity(`di-key:symbol-local:${localKeyPart(sourceHandle)}`);
    this.emitRecord(records, new SymbolDiKeyIdentity(
      handle,
      SymbolDiKeyIdentityKind.LocalCreation,
      declaration?.identityHandle ?? null,
      seed.symbolName,
      addressHandle,
    ));
    return new DiKeyIdentityEmission(handle, DiKeyIdentityKind.Symbol, ContainerLookupKeyKind.Symbol);
  }

  private emitObjectKeyIdentity(
    records: KernelStoreRecord[],
    publication: KernelPublicationContext,
    request: DiKeyExpressionIdentityRequest,
  ): DiKeyIdentityEmission | null {
    const value = request.evaluatedValue;
    if (value == null || !evaluationValueCanBeObjectKey(value)) {
      return null;
    }
    const existing = this.evaluatedObjectKeyIdentities.get(value);
    if (existing != null) {
      return existing;
    }
    const typeSystem = request.typeSystem;
    const creationNode = value.node;
    const source = typeSystem == null || creationNode == null
      ? null
      : sourceSpanForCheckerNode(
        publication,
        typeSystem.checker,
        'di-key-object-creation',
        typeSystem.readProgramNode(creationNode) ?? creationNode,
        SourceSpanRole.Value,
      );
    if (source != null) {
      this.emitRecords(records, source.records);
    }
    const addressHandle = source?.address.handle ?? request.occurrenceAddressHandle;
    const handle = source == null
      ? request.fallbackIdentityHandle
      : this.records.handles.identity(`di-key:object:${localKeyPart(source.address.handle)}`);
    const expressionKind = this.expressionKind(request);
    const emission = new DiKeyIdentityEmission(
      handle,
      DiKeyIdentityKind.Object,
      expressionKind === ContainerLookupKeyKind.Unknown ? ContainerLookupKeyKind.Object : expressionKind,
    );
    this.evaluatedObjectKeyIdentities.set(value, emission);
    this.emitRecord(records, new ObjectDiKeyIdentity(handle, addressHandle));
    return emission;
  }

  emitInterfaceKeyIdentity(
    records: KernelStoreRecord[],
    handle: IdentityHandle,
    interfaceName: string,
    declarationHandle: IdentityHandle | null,
    addressHandle: AddressHandle | null,
  ): void {
    this.emitRecord(records, new InterfaceDiKeyIdentity(
      handle,
      interfaceName,
      declarationHandle,
      addressHandle,
    ));
  }

  emitResourceKeyIdentity(
    records: KernelStoreRecord[],
    handle: IdentityHandle,
    resourceIdentityHandle: IdentityHandle,
    resourceKey: string,
    addressHandle: AddressHandle | null,
  ): void {
    this.emitRecord(records, new ResourceDiKeyIdentity(
      handle,
      resourceIdentityHandle,
      resourceKey,
      addressHandle,
    ));
  }

  /** Converge declaration source rows through the same batch-local identity authority as DI keys. */
  emitDeclarationSourceRecords(
    records: KernelStoreRecord[],
    source: DeclarationSourcePublication | null,
  ): void {
    if (source != null) {
      this.emitRecords(records, source.records);
    }
  }

  private expressionKind(request: DiKeyExpressionIdentityRequest): ContainerLookupKeyKind {
    if (request.typeSystem == null) {
      return request.evaluatedValue?.kind === EvaluationValueKind.Class
          || request.evaluatedValue?.kind === EvaluationValueKind.Function
        ? ContainerLookupKeyKind.Constructable
        : ContainerLookupKeyKind.Unknown;
    }
    const expression = request.typeSystem.readProgramExpression(request.expression);
    return expression == null
      ? ContainerLookupKeyKind.Unknown
      : containerLookupKeyKindForExpression(request.typeSystem, expression);
  }

  private declarationForExpression(
    records: KernelStoreRecord[],
    publication: KernelPublicationContext,
    request: DiKeyExpressionIdentityRequest,
  ): DiKeyDeclarationPublication | null {
    const typeSystem = request.typeSystem;
    if (typeSystem == null) {
      return null;
    }
    const symbol = typeSystem.readProgramAliasedSymbolAtLocation(request.expression);
    if (symbol == null) {
      return null;
    }
    return this.declarationForSymbol(records, publication, typeSystem, symbol);
  }

  private declarationForSymbol(
    records: KernelStoreRecord[],
    publication: KernelPublicationContext,
    typeSystem: TypeSystemProject,
    symbol: ts.Symbol,
  ): DiKeyDeclarationPublication | null {
    const declaration = firstSymbolDeclaration(symbol);
    const declarations = declaration == null
      ? []
      : [declaration, ...(symbol.declarations ?? []).filter((candidate) => candidate !== declaration)];
    const source = sourceSpanForCheckerDeclaration(
      publication,
      typeSystem.checker,
      symbol,
      declarations,
      SourceSpanRole.Name,
    );
    if (source == null || declaration == null) {
      return null;
    }
    this.emitRecords(records, source.records);
    return {
      identityHandle: source.identity.handle,
      addressHandle: source.address.handle,
      symbolName: symbol.getName(),
      declaration,
    };
  }

  private emitDeclarationKeyIdentity(
    records: KernelStoreRecord[],
    declaration: DiKeyDeclarationPublication,
    lookupKind: ContainerLookupKeyKind,
    localName: string | null,
  ): DiKeyIdentityEmission | null {
    if (lookupKind === ContainerLookupKeyKind.Interface) {
      const interfaceName = interfaceFriendlyName(
        declaration.declaration,
        declaration.symbolName ?? localName,
      );
      const intrinsic = aureliaFrameworkIntrinsicDiKeyForDeclaration(
        declaration.declaration,
        declaration.symbolName,
      );
      const handle = intrinsic != null
        ? this.interfaceKeyIdentityHandle(intrinsic)
        : this.records.handles.identity(`di-key:interface:${localKeyPart(declaration.identityHandle)}`);
      this.emitInterfaceKeyIdentity(
        records,
        handle,
        interfaceName,
        declaration.identityHandle,
        declaration.addressHandle,
      );
      return new DiKeyIdentityEmission(handle, DiKeyIdentityKind.Interface, lookupKind);
    }
    if (
      ts.isClassDeclaration(declaration.declaration)
      || ts.isClassExpression(declaration.declaration)
      || ts.isFunctionDeclaration(declaration.declaration)
      || ts.isFunctionExpression(declaration.declaration)
    ) {
      const handle = this.records.handles.identity(`di-key:constructable:${localKeyPart(declaration.identityHandle)}`);
      this.emitRecord(records, new ConstructableDiKeyIdentity(
        handle,
        declaration.identityHandle,
        declaration.symbolName ?? localName,
        declaration.addressHandle,
      ));
      return new DiKeyIdentityEmission(handle, DiKeyIdentityKind.Constructable, lookupKind);
    }
    return null;
  }

  private evaluatedDeclarationForExpression(
    records: KernelStoreRecord[],
    request: DiKeyExpressionIdentityRequest,
  ): DiKeyDeclarationPublication | null {
    const source = request.evaluatedDeclaration;
    if (source?.sourceFileAddressHandle == null) {
      return null;
    }
    const sourceFile = source.declaration.getSourceFile();
    const name = ts.getNameOfDeclaration(source.declaration);
    const addressNode = name ?? source.declaration;
    const local = [
      'evaluation-declaration',
      localKeyPart(source.sourceFileAddressHandle),
      addressNode.getStart(sourceFile),
      addressNode.end,
    ].join(':');
    const address = new SourceSpanAddress(
      this.records.handles.address(`${local}:span`),
      source.sourceFileAddressHandle,
      addressNode.getStart(sourceFile),
      addressNode.end,
      SourceSpanRole.Name,
    );
    const identity = new TypeScriptDeclarationIdentity(
      this.records.handles.identity(`${local}:identity`),
      source.moduleKey,
      null,
      name?.getText(sourceFile) ?? request.localName,
      address.handle,
    );
    this.emitRecord(records, address);
    this.emitRecord(records, identity);
    return {
      identityHandle: identity.handle,
      addressHandle: address.handle,
      symbolName: identity.localName,
      declaration: source.declaration,
    };
  }

  private emitRecords(target: KernelStoreRecord[], candidates: readonly KernelStoreRecord[]): void {
    for (const candidate of candidates) {
      this.emitRecord(target, candidate);
    }
  }

  private emitRecord(target: KernelStoreRecord[], record: KernelStoreRecord): void {
    if (this.emittedRecordHandles.has(record.handle) || this.records.read(record.handle) != null) {
      return;
    }
    this.emittedRecordHandles.add(record.handle);
    target.push(record);
  }
}

function evaluatedStringValue(value: EvaluationValue | null): string | null {
  return value?.kind === EvaluationValueKind.String ? value.value : null;
}

function authoredStringValue(expression: ts.Expression): string | null {
  const current = unwrapExpression(expression);
  return ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)
    ? current.text
    : null;
}

interface PrimitiveDiKeyValue {
  readonly valueKind: PrimitiveDiKeyValueKind;
  readonly value: string;
}

interface SymbolDiKeySeed {
  readonly symbolKind: SymbolDiKeyIdentityKind;
  readonly symbolName: string | null;
  readonly creationNode: ts.Expression;
}

function evaluatedPrimitiveKeyValue(value: EvaluationValue | null): PrimitiveDiKeyValue | null {
  switch (value?.kind) {
    case EvaluationValueKind.Number:
      return {
        valueKind: PrimitiveDiKeyValueKind.Number,
        value: canonicalNumberKey(value.value),
      };
    case EvaluationValueKind.Boolean:
      return {
        valueKind: PrimitiveDiKeyValueKind.Boolean,
        value: String(value.value),
      };
    case EvaluationValueKind.BigInt:
      return {
        valueKind: PrimitiveDiKeyValueKind.BigInt,
        value: value.text,
      };
    case EvaluationValueKind.Unknown:
    case EvaluationValueKind.Undefined:
    case EvaluationValueKind.Null:
    case EvaluationValueKind.String:
    case EvaluationValueKind.StringPattern:
    case EvaluationValueKind.RegularExpression:
    case EvaluationValueKind.Date:
    case EvaluationValueKind.Array:
    case EvaluationValueKind.Set:
    case EvaluationValueKind.Map:
    case EvaluationValueKind.Object:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.BoundaryValue:
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
    case EvaluationValueKind.Instance:
    case EvaluationValueKind.ModuleNamespace:
    case EvaluationValueKind.Promise:
    case undefined:
      return null;
  }
}

function authoredPrimitiveKeyValue(expression: ts.Expression): PrimitiveDiKeyValue | null {
  const current = unwrapExpression(expression);
  if (ts.isNumericLiteral(current)) {
    return {
      valueKind: PrimitiveDiKeyValueKind.Number,
      value: canonicalNumberKey(Number(current.text)),
    };
  }
  if (current.kind === ts.SyntaxKind.TrueKeyword || current.kind === ts.SyntaxKind.FalseKeyword) {
    return {
      valueKind: PrimitiveDiKeyValueKind.Boolean,
      value: current.kind === ts.SyntaxKind.TrueKeyword ? 'true' : 'false',
    };
  }
  if (ts.isBigIntLiteral(current)) {
    return {
      valueKind: PrimitiveDiKeyValueKind.BigInt,
      value: current.text,
    };
  }
  return null;
}

function canonicalNumberKey(value: number): string {
  return Object.is(value, -0) ? '0' : String(value);
}

function symbolKeySeedForExpression(
  checker: ts.TypeChecker,
  expression: ts.Expression,
  visitedDeclarations: Set<ts.Declaration>,
): SymbolDiKeySeed | null {
  const current = unwrapExpression(expression);
  if (ts.isCallExpression(current)) {
    const callee = unwrapExpression(current.expression);
    if (ts.isIdentifier(callee) && isGlobalSymbolIdentifier(checker, callee)) {
      return {
        symbolKind: SymbolDiKeyIdentityKind.LocalCreation,
        symbolName: staticStringValue(checker, current.arguments[0] ?? null, visitedDeclarations),
        creationNode: current,
      };
    }
    if (
      ts.isPropertyAccessExpression(callee)
      && callee.name.text === 'for'
      && ts.isIdentifier(unwrapExpression(callee.expression))
      && isGlobalSymbolIdentifier(checker, unwrapExpression(callee.expression) as ts.Identifier)
    ) {
      const registryKey = staticStringValue(checker, current.arguments[0] ?? null, visitedDeclarations);
      return registryKey == null
        ? null
        : {
          symbolKind: SymbolDiKeyIdentityKind.GlobalRegistry,
          symbolName: registryKey,
          creationNode: current,
        };
    }
  }

  const symbol = symbolForExpression(checker, current);
  const declaration = symbol == null ? null : firstSymbolDeclaration(symbol);
  if (
    declaration == null
    || visitedDeclarations.has(declaration)
    || !ts.isVariableDeclaration(declaration)
    || declaration.initializer == null
  ) {
    return null;
  }
  visitedDeclarations.add(declaration);
  return symbolKeySeedForExpression(checker, declaration.initializer, visitedDeclarations);
}

function staticStringValue(
  checker: ts.TypeChecker,
  expression: ts.Expression | null,
  visitedDeclarations: Set<ts.Declaration>,
): string | null {
  if (expression == null || ts.isSpreadElement(expression)) {
    return null;
  }
  const authored = authoredStringValue(expression);
  if (authored != null) {
    return authored;
  }
  const current = unwrapExpression(expression);
  const symbol = symbolForExpression(checker, current);
  const declaration = symbol == null ? null : firstSymbolDeclaration(symbol);
  if (
    declaration == null
    || visitedDeclarations.has(declaration)
    || !ts.isVariableDeclaration(declaration)
    || declaration.initializer == null
  ) {
    return null;
  }
  visitedDeclarations.add(declaration);
  return staticStringValue(checker, declaration.initializer, visitedDeclarations);
}

function isGlobalSymbolIdentifier(checker: ts.TypeChecker, identifier: ts.Identifier): boolean {
  if (identifier.text !== 'Symbol') {
    return false;
  }
  const symbol = symbolForExpression(checker, identifier);
  return symbol != null && (symbol.declarations ?? []).some((declaration) =>
    isDefaultLibrarySourceFile(declaration.getSourceFile().fileName.replace(/\\/g, '/'))
  );
}

function evaluationValueCanBeObjectKey(value: EvaluationValue): boolean {
  switch (value.kind) {
    case EvaluationValueKind.RegularExpression:
    case EvaluationValueKind.Date:
    case EvaluationValueKind.Array:
    case EvaluationValueKind.Set:
    case EvaluationValueKind.Map:
    case EvaluationValueKind.Object:
    case EvaluationValueKind.Function:
    case EvaluationValueKind.Class:
    case EvaluationValueKind.Instance:
    case EvaluationValueKind.ModuleNamespace:
    case EvaluationValueKind.Promise:
      return true;
    case EvaluationValueKind.Unknown:
    case EvaluationValueKind.Undefined:
    case EvaluationValueKind.Null:
    case EvaluationValueKind.Boolean:
    case EvaluationValueKind.Number:
    case EvaluationValueKind.BigInt:
    case EvaluationValueKind.String:
    case EvaluationValueKind.StringPattern:
    case EvaluationValueKind.BoundaryObject:
    case EvaluationValueKind.BoundaryValue:
      return false;
  }
}

function interfaceFriendlyName(declaration: ts.Declaration, fallback: string | null): string {
  if (ts.isVariableDeclaration(declaration) && declaration.initializer != null) {
    const initializer = unwrapExpression(declaration.initializer);
    if (ts.isCallExpression(initializer)) {
      const first = initializer.arguments[0];
      if (first != null && !ts.isSpreadElement(first)) {
        const value = authoredStringValue(first);
        if (value != null) {
          return value;
        }
      }
    }
  }
  return fallback ?? '(anonymous interface key)';
}

/** Stable identity local for one canonical resource identity exposed through one exact runtime key. */
export function resourceDiKeyIdentityLocal(
  resourceIdentityHandle: IdentityHandle,
  resourceKey: string,
): string {
  return `di-key:resource:${localKeyPart(resourceIdentityHandle)}:${localKeyPart(resourceKey)}`;
}
