import ts from "typescript";

import {
  AURELIA_FRAMEWORK_PACKAGE_IDS,
  readTypeScriptCallSiteEntry,
  readTypeScriptExpressionFact,
  type SourceFileIdentity,
  type SourceProject,
  type SourceSpan,
  type TypeScriptCallSiteEntry,
  type TypeScriptExpressionFact,
} from "../source/index.js";
import type { SourceRange } from "../inquiry/locus.js";
import {
  frameworkJsonCacheProducerVersion,
  readFrameworkJsonCachePackage,
  writeFrameworkJsonCachePackage,
} from "./json-cache.js";
import {
  FrameworkDiResolverStrategy,
  FrameworkRelationshipClosure,
  FrameworkRelationshipEndpointKind,
  FrameworkRelationshipEvidenceBasis,
  FrameworkRelationshipFamily,
  FrameworkRelationshipMechanism,
  FrameworkRelationshipPhase,
  FrameworkRelationshipRelation,
  type FrameworkRelationshipAtom,
  type FrameworkRelationshipEndpoint,
} from "./relationships.js";

/** Stable id for the framework DI relationship atom cache family. */
export const FRAMEWORK_DI_RELATIONSHIP_CACHE_FAMILY_ID = "framework.di.relationship-atoms";

/** One framework DI key declaration discovered from createInterface. */
export interface FrameworkDiKeyRow {
  /** Stable row id. */
  readonly id: string;
  /** Aurelia framework package id. */
  readonly packageId: string;
  /** Package name from source admission. */
  readonly packageName: string;
  /** Variable/export name that receives the InterfaceSymbol. */
  readonly exportName: string;
  /** Runtime InterfaceSymbol friendly name. */
  readonly interfaceKey: string;
  /** Whether the declaration is syntactically exported from its source module. */
  readonly exported: boolean;
  /** Exact createInterface call site. */
  readonly createInterfaceCall: TypeScriptCallSiteEntry;
  /** Exact source range for the createInterface call. */
  readonly source: SourceRange;
  /** Relationship atom id that defines this key. */
  readonly definitionAtomId: string;
  /** Default registration/provider atoms discovered in the builder callback. */
  readonly defaultRegistrationAtomIds: readonly string[];
}

/** Compact rollup for framework DI relationship atoms. */
export interface FrameworkDiIndexRollup {
  /** Number of framework InterfaceSymbol key rows. */
  readonly keys: number;
  /** Number of relationship atoms. */
  readonly relationships: number;
  /** Relationship counts grouped by semantic relation. */
  readonly relations: Readonly<Record<string, number>>;
  /** Relationship counts grouped by mechanism. */
  readonly mechanisms: Readonly<Record<string, number>>;
  /** Relationship counts grouped by phase. */
  readonly phases: Readonly<Record<string, number>>;
}

/** Framework DI index over the hot TypeScript project. */
export interface FrameworkDiIndex {
  /** Cache/schema version for this index family. */
  readonly version: string;
  /** Framework InterfaceSymbol keys discovered across admitted packages. */
  readonly keys: readonly FrameworkDiKeyRow[];
  /** Normalized DI relationship atoms. */
  readonly relationships: readonly FrameworkRelationshipAtom[];
  /** Compact rollup for orientation and summaries. */
  readonly rollup: FrameworkDiIndexRollup;
}

interface FrameworkDiPackagePayload {
  readonly keys: readonly FrameworkDiKeyRow[];
  readonly relationships: readonly FrameworkRelationshipAtom[];
}

interface ClassifiedRelationship {
  readonly relation: FrameworkRelationshipRelation;
  readonly mechanism: FrameworkRelationshipMechanism;
  readonly phase: FrameworkRelationshipPhase;
  readonly closure: FrameworkRelationshipClosure;
  readonly toKind: FrameworkRelationshipEndpointKind;
  readonly toName: string;
  readonly strategy?: FrameworkDiResolverStrategy;
}

const FRAMEWORK_DI_RELATIONSHIP_CACHE_FAMILY_VERSION = "di-relationship-atoms@3";
const frameworkDiRelationshipCacheProducerVersion = frameworkJsonCacheProducerVersion(
  FRAMEWORK_DI_RELATIONSHIP_CACHE_FAMILY_ID,
  FRAMEWORK_DI_RELATIONSHIP_CACHE_FAMILY_VERSION,
  import.meta.url,
);

const frameworkDiIndexByProject = new WeakMap<SourceProject, FrameworkDiIndex>();
const frameworkDiPackagePayloadByProject = new WeakMap<SourceProject, Map<string, FrameworkDiPackagePayload>>();

/** Build or read the framework DI index for one hot source project. */
export function readFrameworkDiIndex(
  /** Hot source project held by the Atlas daemon. */
  sourceProject: SourceProject,
): FrameworkDiIndex {
  const cached = frameworkDiIndexByProject.get(sourceProject);
  if (cached !== undefined) {
    return cached;
  }

  const packageNames = readFrameworkPackageNames(sourceProject);
  const payloads = [...packageNames.keys()]
    .map((packageId) => readFrameworkDiPackagePayload(sourceProject, packageId, packageNames.get(packageId) ?? packageId));
  const keys = payloads.flatMap((payload) => payload.keys);
  const relationships = [...uniqueAtoms(payloads.flatMap((payload) => payload.relationships))]
    .sort(compareRelationshipAtoms);
  const index: FrameworkDiIndex = {
    version: FRAMEWORK_DI_RELATIONSHIP_CACHE_FAMILY_VERSION,
    keys: [...keys].sort(compareDiKeys),
    relationships,
    rollup: {
      keys: keys.length,
      relationships: relationships.length,
      relations: countBy(relationships, (row) => row.relation),
      mechanisms: countBy(relationships, (row) => row.mechanism),
      phases: countBy(relationships, (row) => row.phase),
    },
  };
  frameworkDiIndexByProject.set(sourceProject, index);
  return index;
}

function readFrameworkDiPackagePayload(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): FrameworkDiPackagePayload {
  const cache = frameworkDiPackagePayloadByProject.get(sourceProject) ?? new Map<string, FrameworkDiPackagePayload>();
  if (!frameworkDiPackagePayloadByProject.has(sourceProject)) {
    frameworkDiPackagePayloadByProject.set(sourceProject, cache);
  }
  const cached = cache.get(packageId);
  if (cached !== undefined) {
    return cached;
  }
  const diskCached = readFrameworkJsonCachePackage<FrameworkDiPackagePayload>(sourceProject, {
    familyId: FRAMEWORK_DI_RELATIONSHIP_CACHE_FAMILY_ID,
    familyVersion: FRAMEWORK_DI_RELATIONSHIP_CACHE_FAMILY_VERSION,
    producerVersion: frameworkDiRelationshipCacheProducerVersion,
    packageId,
  });
  if (diskCached !== undefined) {
    cache.set(packageId, diskCached);
    return diskCached;
  }
  const payload = scanFrameworkDiPackagePayload(sourceProject, packageId, packageName);
  cache.set(packageId, payload);
  if (payload.keys.length > 0 || payload.relationships.length > 0) {
    writeFrameworkJsonCachePackage(sourceProject, {
      familyId: FRAMEWORK_DI_RELATIONSHIP_CACHE_FAMILY_ID,
      familyVersion: FRAMEWORK_DI_RELATIONSHIP_CACHE_FAMILY_VERSION,
      producerVersion: frameworkDiRelationshipCacheProducerVersion,
      packageId,
    }, payload);
  }
  return payload;
}

function scanFrameworkDiPackagePayload(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): FrameworkDiPackagePayload {
  const keys: FrameworkDiKeyRow[] = [];
  const relationships: FrameworkRelationshipAtom[] = [];
  const isKernel = packageId === "kernel";

  for (const sourceFile of sourceProject.ownedSourceFiles()) {
    const file = sourceProject.sourceFileIdentity(sourceFile);
    if (file?.packageId !== packageId) {
      continue;
    }

    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        if (isCreateInterfaceCall(node)) {
          const key = createInterfaceKeyRow(sourceProject, sourceFile, file, packageId, packageName, node);
          if (key !== null) {
            keys.push(key.row);
            relationships.push(key.definitionAtom, ...key.defaultRegistrationAtoms);
          }
        }
        const atoms = relationshipAtomsForCall(sourceProject, sourceFile, file, packageId, packageName, node, isKernel);
        if (atoms.length > 0) {
          relationships.push(...atoms);
        }
      } else if (isKernel && ts.isNewExpression(node)) {
        const atom = relationshipAtomForNew(sourceProject, sourceFile, file, packageId, packageName, node);
        if (atom !== null) {
          relationships.push(atom);
        }
      } else if (isKernel && ts.isBinaryExpression(node)) {
        const atom = relationshipAtomForBinaryExpression(sourceProject, sourceFile, file, packageId, packageName, node);
        if (atom !== null) {
          relationships.push(atom);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  return {
    keys: [...uniqueDiKeys(keys)].sort(compareDiKeys),
    relationships: [...uniqueAtoms(relationships)].sort(compareRelationshipAtoms),
  };
}

function createInterfaceKeyRow(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  packageId: string,
  packageName: string,
  call: ts.CallExpression,
): {
  readonly row: FrameworkDiKeyRow;
  readonly definitionAtom: FrameworkRelationshipAtom;
  readonly defaultRegistrationAtoms: readonly FrameworkRelationshipAtom[];
} | null {
  const variable = enclosingVariableDeclaration(call);
  if (variable?.name === undefined || !ts.isIdentifier(variable.name)) {
    return null;
  }
  const exported = isExportedVariableDeclaration(variable);
  if (!exported) {
    return null;
  }
  const callSite = readTypeScriptCallSiteEntry(sourceProject, sourceFile, call);
  if (callSite === null) {
    return null;
  }
  const source = sourceRangeForNode(file.repoPath, sourceFile, call);
  const exportName = variable.name.text;
  const interfaceKey = createInterfaceFriendlyName(call, exportName);
  const endpoint = diKeyEndpoint(packageId, packageName, interfaceKey, source);
  const from = enclosingEndpoint(sourceProject, sourceFile, file, packageId, packageName, call);
  const definitionAtom: FrameworkRelationshipAtom = {
    id: `framework-di:${packageId}:${file.repoPath}:${call.getStart(sourceFile)}:defines-key:${exportName}`,
    family: FrameworkRelationshipFamily.Di,
    relation: FrameworkRelationshipRelation.DefinesKey,
    mechanism: FrameworkRelationshipMechanism.CreateInterface,
    phase: FrameworkRelationshipPhase.Definition,
    evidenceBasis: FrameworkRelationshipEvidenceBasis.Checker,
    closure: FrameworkRelationshipClosure.Exact,
    packageId,
    packageName,
    from,
    to: endpoint,
    source,
    callSite,
    key: interfaceKey,
    summary: `${packageId}:${exportName} defines DI InterfaceSymbol ${interfaceKey}.`,
  };
  const defaultRegistrationAtoms = createInterfaceBuilderAtoms(
    sourceProject,
    sourceFile,
    file,
    packageId,
    packageName,
    call,
    endpoint,
    interfaceKey,
  );
  return {
    row: {
      id: `framework-di-key:${packageId}:${exportName}`,
      packageId,
      packageName,
      exportName,
      interfaceKey,
      exported,
      createInterfaceCall: callSite,
      source,
      definitionAtomId: definitionAtom.id,
      defaultRegistrationAtomIds: defaultRegistrationAtoms.map((atom) => atom.id),
    },
    definitionAtom,
    defaultRegistrationAtoms,
  };
}

function createInterfaceBuilderAtoms(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  packageId: string,
  packageName: string,
  call: ts.CallExpression,
  keyEndpoint: FrameworkRelationshipEndpoint,
  interfaceKey: string,
): readonly FrameworkRelationshipAtom[] {
  const configure = createInterfaceConfigureArgument(call);
  if (configure === null) {
    return [];
  }
  const atoms: FrameworkRelationshipAtom[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const strategy = resolverBuilderStrategy(node);
      if (strategy !== null) {
        const source = sourceRangeForNode(file.repoPath, sourceFile, node);
        const callSite = readTypeScriptCallSiteEntry(sourceProject, sourceFile, node) ?? undefined;
        const providerArgument = node.arguments[0];
        const value = providerArgument === undefined ? undefined : providerArgument.getText(sourceFile);
        atoms.push({
          id: `framework-di:${packageId}:${file.repoPath}:${node.getStart(sourceFile)}:builder:${strategy}`,
          family: FrameworkRelationshipFamily.Di,
          relation: FrameworkRelationshipRelation.CreatesRegistration,
          mechanism: FrameworkRelationshipMechanism.ResolverBuilder,
          phase: FrameworkRelationshipPhase.Definition,
          evidenceBasis: FrameworkRelationshipEvidenceBasis.Syntax,
          closure: FrameworkRelationshipClosure.Exact,
          packageId,
          packageName,
          from: keyEndpoint,
          to: {
            kind: FrameworkRelationshipEndpointKind.ResolverStrategy,
            name: strategy,
            packageId,
            packageName,
            source,
          },
          source,
          ...(callSite === undefined ? {} : { callSite }),
          key: interfaceKey,
          ...(value === undefined ? {} : { value }),
          strategy,
          summary: `${interfaceKey} has createInterface default ${strategy} registration.`,
        });
        const providerAtom = createInterfaceBuilderProviderAtom(
          sourceProject,
          sourceFile,
          file,
          packageId,
          packageName,
          node,
          keyEndpoint,
          interfaceKey,
          strategy,
          providerArgument,
        );
        if (providerAtom !== null) {
          atoms.push(providerAtom);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(configure);
  return atoms;
}

function createInterfaceBuilderProviderAtom(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  packageId: string,
  packageName: string,
  builderCall: ts.CallExpression,
  keyEndpoint: FrameworkRelationshipEndpoint,
  interfaceKey: string,
  strategy: FrameworkDiResolverStrategy,
  providerArgument: ts.Expression | undefined,
): FrameworkRelationshipAtom | null {
  if (providerArgument === undefined) {
    return null;
  }
  const source = sourceRangeForNode(file.repoPath, sourceFile, builderCall);
  const callSite = readTypeScriptCallSiteEntry(sourceProject, sourceFile, builderCall) ?? undefined;
  const providerText = providerArgument.getText(sourceFile);
  const relation = strategy === FrameworkDiResolverStrategy.Alias
    ? FrameworkRelationshipRelation.AliasesKey
    : FrameworkRelationshipRelation.ProvidesKey;
  return {
    id: `framework-di:${packageId}:${file.repoPath}:${builderCall.getStart(sourceFile)}:builder-provider:${strategy}`,
    family: FrameworkRelationshipFamily.Di,
    relation,
    mechanism: FrameworkRelationshipMechanism.ResolverBuilder,
    phase: FrameworkRelationshipPhase.Definition,
    evidenceBasis: FrameworkRelationshipEvidenceBasis.Syntax,
    closure: FrameworkRelationshipClosure.Exact,
    packageId,
    packageName,
    from: keyEndpoint,
    to: expressionEndpoint(sourceProject, sourceFile, file, packageId, packageName, providerArgument),
    source,
    ...(callSite === undefined ? {} : { callSite }),
    key: interfaceKey,
    value: providerText,
    strategy,
    summary: relation === FrameworkRelationshipRelation.AliasesKey
      ? `${interfaceKey} aliases ${providerText} through createInterface ${strategy} registration.`
      : `${interfaceKey} is provided by ${providerText} through createInterface ${strategy} registration.`,
  };
}

function relationshipAtomsForCall(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  packageId: string,
  packageName: string,
  call: ts.CallExpression,
  includeKernelInternals: boolean,
): readonly FrameworkRelationshipAtom[] {
  const classified = classifyCall(sourceProject, sourceFile, call, includeKernelInternals);
  if (classified === null) {
    return [];
  }
  const source = sourceRangeForNode(file.repoPath, sourceFile, call);
  const callSite = readTypeScriptCallSiteEntry(sourceProject, sourceFile, call) ?? undefined;
  const atom: FrameworkRelationshipAtom = {
    id: `framework-di:${packageId}:${file.repoPath}:${call.getStart(sourceFile)}:${classified.relation}:${classified.mechanism}`,
    family: FrameworkRelationshipFamily.Di,
    relation: classified.relation,
    mechanism: classified.mechanism,
    phase: classified.phase,
    evidenceBasis: FrameworkRelationshipEvidenceBasis.KernelSource,
    closure: classified.closure,
    packageId,
    packageName,
    from: enclosingEndpoint(sourceProject, sourceFile, file, packageId, packageName, call),
    to: {
      kind: classified.toKind,
      name: classified.toName,
      packageId,
      packageName,
      source,
      expression: readTypeScriptExpressionFact(sourceProject, sourceFile, call.expression),
    },
    source,
    ...(callSite === undefined ? {} : { callSite }),
    ...keyAndValueFromArguments(sourceFile, call.arguments, classified),
    ...(classified.strategy === undefined ? {} : { strategy: classified.strategy }),
    summary: summaryForClassifiedRelationship(classified, sourceFile, call),
  };
  const providerAtom = registrationFactoryProviderAtomForCall(
    sourceProject,
    sourceFile,
    file,
    packageId,
    packageName,
    call,
    classified,
  );
  return providerAtom === null ? [atom] : [atom, providerAtom];
}

function relationshipAtomForNew(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  packageId: string,
  packageName: string,
  node: ts.NewExpression,
): FrameworkRelationshipAtom | null {
  const classified = classifyNewExpression(sourceFile, node);
  if (classified === null) {
    return null;
  }
  const source = sourceRangeForNode(file.repoPath, sourceFile, node);
  const callSite = readTypeScriptCallSiteEntry(sourceProject, sourceFile, node) ?? undefined;
  return {
    id: `framework-di:${packageId}:${file.repoPath}:${node.getStart(sourceFile)}:${classified.relation}:${classified.mechanism}`,
    family: FrameworkRelationshipFamily.Di,
    relation: classified.relation,
    mechanism: classified.mechanism,
    phase: classified.phase,
    evidenceBasis: FrameworkRelationshipEvidenceBasis.KernelSource,
    closure: classified.closure,
    packageId,
    packageName,
    from: enclosingEndpoint(sourceProject, sourceFile, file, packageId, packageName, node),
    to: {
      kind: classified.toKind,
      name: classified.toName,
      packageId,
      packageName,
      source,
      expression: readTypeScriptExpressionFact(sourceProject, sourceFile, node.expression),
    },
    source,
    ...(callSite === undefined ? {} : { callSite }),
    ...keyAndValueFromArguments(sourceFile, node.arguments ?? ts.factory.createNodeArray(), classified),
    ...(classified.strategy === undefined ? {} : { strategy: classified.strategy }),
    summary: summaryForClassifiedRelationship(classified, sourceFile, node),
  };
}

function relationshipAtomForBinaryExpression(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  packageId: string,
  packageName: string,
  node: ts.BinaryExpression,
): FrameworkRelationshipAtom | null {
  if (node.operatorToken.kind !== ts.SyntaxKind.EqualsToken || !isResourceStoreWrite(node.left)) {
    return null;
  }
  const source = sourceRangeForNode(file.repoPath, sourceFile, node);
  const value = node.right.getText(sourceFile);
  return {
    id: `framework-di:${packageId}:${file.repoPath}:${node.getStart(sourceFile)}:stores-resource-slot`,
    family: FrameworkRelationshipFamily.Di,
    relation: FrameworkRelationshipRelation.StoresResourceSlot,
    mechanism: FrameworkRelationshipMechanism.ResourceStore,
    phase: FrameworkRelationshipPhase.Registration,
    evidenceBasis: FrameworkRelationshipEvidenceBasis.KernelSource,
    closure: FrameworkRelationshipClosure.Exact,
    packageId,
    packageName,
    from: enclosingEndpoint(sourceProject, sourceFile, file, packageId, packageName, node),
    to: {
      kind: FrameworkRelationshipEndpointKind.ContainerSlot,
      name: "container.res",
      packageId,
      packageName,
      source,
      expression: readTypeScriptExpressionFact(sourceProject, sourceFile, node.left),
    },
    source,
    value,
    summary: `Kernel DI stores a resource resolver slot through ${node.left.getText(sourceFile)}.`,
  };
}

function registrationFactoryProviderAtomForCall(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  packageId: string,
  packageName: string,
  call: ts.CallExpression,
  classified: ClassifiedRelationship,
): FrameworkRelationshipAtom | null {
  if (classified.mechanism !== FrameworkRelationshipMechanism.RegistrationFactory
    || classified.strategy === undefined
    || classified.strategy === FrameworkDiResolverStrategy.Defer) {
    return null;
  }
  const keyArgument = classified.strategy === FrameworkDiResolverStrategy.Alias ? call.arguments[1] : call.arguments[0];
  const providerArgument = classified.strategy === FrameworkDiResolverStrategy.Alias ? call.arguments[0] : call.arguments[1];
  if (keyArgument === undefined || providerArgument === undefined) {
    return null;
  }
  const source = sourceRangeForNode(file.repoPath, sourceFile, call);
  const callSite = readTypeScriptCallSiteEntry(sourceProject, sourceFile, call) ?? undefined;
  const key = keyArgument.getText(sourceFile);
  const value = providerArgument.getText(sourceFile);
  const relation = classified.strategy === FrameworkDiResolverStrategy.Alias
    ? FrameworkRelationshipRelation.AliasesKey
    : FrameworkRelationshipRelation.ProvidesKey;
  return {
    id: `framework-di:${packageId}:${file.repoPath}:${call.getStart(sourceFile)}:registration-provider:${classified.strategy}`,
    family: FrameworkRelationshipFamily.Di,
    relation,
    mechanism: FrameworkRelationshipMechanism.RegistrationFactory,
    phase: FrameworkRelationshipPhase.Definition,
    evidenceBasis: FrameworkRelationshipEvidenceBasis.Checker,
    closure: FrameworkRelationshipClosure.Exact,
    packageId,
    packageName,
    from: expressionEndpoint(sourceProject, sourceFile, file, packageId, packageName, keyArgument),
    to: expressionEndpoint(sourceProject, sourceFile, file, packageId, packageName, providerArgument),
    source,
    ...(callSite === undefined ? {} : { callSite }),
    key,
    value,
    strategy: classified.strategy,
    summary: relation === FrameworkRelationshipRelation.AliasesKey
      ? `${key} aliases ${value} through Registration.${classified.strategy}.`
      : `${key} is provided by ${value} through Registration.${classified.strategy}.`,
  };
}

function classifyCall(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
  includeKernelInternals: boolean,
): ClassifiedRelationship | null {
  const calleeName = propertyOrIdentifierName(call.expression);
  const calleeText = call.expression.getText(sourceFile);
  const registrationStrategy = registrationFactoryStrategy(sourceProject, sourceFile, call, calleeName);
  if (registrationStrategy !== null) {
    return {
      relation: registrationStrategy === FrameworkDiResolverStrategy.Alias
        ? FrameworkRelationshipRelation.AliasesKey
        : FrameworkRelationshipRelation.CreatesRegistration,
      mechanism: FrameworkRelationshipMechanism.RegistrationFactory,
      phase: FrameworkRelationshipPhase.Definition,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.ResolverStrategy,
      toName: registrationStrategy,
      strategy: registrationStrategy,
    };
  }
  if (includeKernelInternals && resolverBuilderStrategy(call) !== null) {
    const strategy = resolverBuilderStrategy(call)!;
    return {
      relation: strategy === FrameworkDiResolverStrategy.Alias
        ? FrameworkRelationshipRelation.AliasesKey
        : FrameworkRelationshipRelation.CreatesRegistration,
      mechanism: FrameworkRelationshipMechanism.ResolverBuilder,
      phase: FrameworkRelationshipPhase.Definition,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.ResolverStrategy,
      toName: strategy,
      strategy,
    };
  }
  if (!includeKernelInternals) {
    return null;
  }
  if (calleeName === "registerResolver") {
    return {
      relation: FrameworkRelationshipRelation.RegistersProvider,
      mechanism: FrameworkRelationshipMechanism.ContainerRegisterResolver,
      phase: FrameworkRelationshipPhase.Registration,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.ContainerSlot,
      toName: "resolver-slot",
    };
  }
  if (calleeText.endsWith("._resolvers.set") || calleeText.endsWith("_resolvers.set")) {
    return {
      relation: FrameworkRelationshipRelation.StoresResolverSlot,
      mechanism: FrameworkRelationshipMechanism.ResolverStore,
      phase: FrameworkRelationshipPhase.Registration,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.ContainerSlot,
      toName: "_resolvers",
    };
  }
  if (calleeText.endsWith("._resolvers.get") || calleeText.endsWith("_resolvers.get")) {
    return {
      relation: FrameworkRelationshipRelation.LooksUpKey,
      mechanism: FrameworkRelationshipMechanism.ResolverStore,
      phase: FrameworkRelationshipPhase.Lookup,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.ContainerSlot,
      toName: "_resolvers",
    };
  }
  if (calleeName === "register") {
    return {
      relation: FrameworkRelationshipRelation.InvokesRegistry,
      mechanism: FrameworkRelationshipMechanism.ContainerRegister,
      phase: FrameworkRelationshipPhase.Registration,
      closure: FrameworkRelationshipClosure.Modeled,
      toKind: FrameworkRelationshipEndpointKind.Method,
      toName: "register",
    };
  }
  if (calleeName === "getResolver") {
    return {
      relation: FrameworkRelationshipRelation.LooksUpKey,
      mechanism: FrameworkRelationshipMechanism.ContainerGetResolver,
      phase: FrameworkRelationshipPhase.Lookup,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.Method,
      toName: "getResolver",
    };
  }
  if (calleeName === "get") {
    return {
      relation: FrameworkRelationshipRelation.ResolvesKey,
      mechanism: FrameworkRelationshipMechanism.ContainerGet,
      phase: FrameworkRelationshipPhase.Resolution,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.Method,
      toName: "get",
    };
  }
  if (calleeName === "getAll") {
    return {
      relation: FrameworkRelationshipRelation.ResolvesKey,
      mechanism: FrameworkRelationshipMechanism.ContainerGetAll,
      phase: FrameworkRelationshipPhase.Resolution,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.Method,
      toName: "getAll",
    };
  }
  if (calleeName === "has") {
    return {
      relation: FrameworkRelationshipRelation.LooksUpKey,
      mechanism: FrameworkRelationshipMechanism.ContainerHas,
      phase: FrameworkRelationshipPhase.Lookup,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.Method,
      toName: "has",
    };
  }
  if (calleeName === "find") {
    return {
      relation: FrameworkRelationshipRelation.LooksUpKey,
      mechanism: FrameworkRelationshipMechanism.ContainerFind,
      phase: FrameworkRelationshipPhase.ResourceLookup,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.Method,
      toName: "find",
    };
  }
  if (calleeName === "getFactory") {
    return {
      relation: FrameworkRelationshipRelation.LooksUpKey,
      mechanism: FrameworkRelationshipMechanism.ResolverGetFactory,
      phase: FrameworkRelationshipPhase.Materialization,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.Method,
      toName: "getFactory",
    };
  }
  if (calleeName === "construct") {
    return {
      relation: FrameworkRelationshipRelation.MaterializesKey,
      mechanism: FrameworkRelationshipMechanism.FactoryConstruct,
      phase: FrameworkRelationshipPhase.Materialization,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.Method,
      toName: "construct",
      strategy: resolverStrategyForNearestCase(sourceFile, call),
    };
  }
  if (calleeName === "resolve") {
    return {
      relation: FrameworkRelationshipRelation.ResolvesKey,
      mechanism: FrameworkRelationshipMechanism.ResolverResolve,
      phase: FrameworkRelationshipPhase.Resolution,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.Method,
      toName: "resolve",
      strategy: resolverStrategyForNearestCase(sourceFile, call),
    };
  }
  if (calleeName === "_jitRegister") {
    return {
      relation: FrameworkRelationshipRelation.RegistersProvider,
      mechanism: FrameworkRelationshipMechanism.JitRegister,
      phase: FrameworkRelationshipPhase.Registration,
      closure: FrameworkRelationshipClosure.Modeled,
      toKind: FrameworkRelationshipEndpointKind.Method,
      toName: "_jitRegister",
    };
  }
  if (calleeName === "createContainer") {
    return {
      relation: FrameworkRelationshipRelation.CreatesContainer,
      mechanism: FrameworkRelationshipMechanism.ContainerChild,
      phase: FrameworkRelationshipPhase.ContainerConstruction,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.Symbol,
      toName: "Container",
    };
  }
  if (calleeName === "createResolver") {
    return {
      relation: FrameworkRelationshipRelation.CreatesResolver,
      mechanism: FrameworkRelationshipMechanism.ResolverHelper,
      phase: FrameworkRelationshipPhase.Definition,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.Symbol,
      toName: "callable-resolver",
    };
  }
  return null;
}

function classifyNewExpression(sourceFile: ts.SourceFile, node: ts.NewExpression): ClassifiedRelationship | null {
  const name = node.expression.getText(sourceFile);
  if (name === "Resolver") {
    return {
      relation: FrameworkRelationshipRelation.CreatesResolver,
      mechanism: FrameworkRelationshipMechanism.ResolverConstructor,
      phase: FrameworkRelationshipPhase.Definition,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.Symbol,
      toName: "Resolver",
      strategy: resolverStrategyFromExpressionText(sourceFile, node.arguments?.[1]),
    };
  }
  if (name === "Factory") {
    return {
      relation: FrameworkRelationshipRelation.CreatesFactory,
      mechanism: FrameworkRelationshipMechanism.FactoryConstruct,
      phase: FrameworkRelationshipPhase.Materialization,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.Symbol,
      toName: "Factory",
    };
  }
  if (name === "Container") {
    return {
      relation: FrameworkRelationshipRelation.CreatesContainer,
      mechanism: FrameworkRelationshipMechanism.ContainerChild,
      phase: FrameworkRelationshipPhase.ContainerConstruction,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.Symbol,
      toName: "Container",
    };
  }
  if (name === "ResolverBuilder") {
    return {
      relation: FrameworkRelationshipRelation.CreatesRegistration,
      mechanism: FrameworkRelationshipMechanism.ResolverBuilder,
      phase: FrameworkRelationshipPhase.Definition,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.Symbol,
      toName: "ResolverBuilder",
    };
  }
  if (name === "InstanceProvider") {
    return {
      relation: FrameworkRelationshipRelation.CreatesResolver,
      mechanism: FrameworkRelationshipMechanism.ResolverHelper,
      phase: FrameworkRelationshipPhase.Materialization,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.Symbol,
      toName: "InstanceProvider",
      strategy: FrameworkDiResolverStrategy.Instance,
    };
  }
  if (name === "Type" || name === "this.Type" || name === "RealType") {
    return {
      relation: FrameworkRelationshipRelation.ConstructsInstance,
      mechanism: FrameworkRelationshipMechanism.FactoryConstruct,
      phase: FrameworkRelationshipPhase.Materialization,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.Symbol,
      toName: name,
    };
  }
  return null;
}

function registrationFactoryStrategy(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
  calleeName: string,
): FrameworkDiResolverStrategy | null {
  if (!isFrameworkRegistrationFactoryCallee(sourceProject, call.expression, calleeName)) {
    return null;
  }
  const name = calleeName;
  switch (name) {
    case "instance":
    case "instanceRegistration":
      return FrameworkDiResolverStrategy.Instance;
    case "singleton":
    case "singletonRegistration":
      return FrameworkDiResolverStrategy.Singleton;
    case "transient":
    case "transientRegistation":
      return FrameworkDiResolverStrategy.Transient;
    case "callback":
    case "callbackRegistration":
      return FrameworkDiResolverStrategy.Callback;
    case "cachedCallback":
    case "cachedCallbackRegistration":
      return FrameworkDiResolverStrategy.CachedCallback;
    case "aliasTo":
    case "aliasToRegistration":
      return FrameworkDiResolverStrategy.Alias;
    case "defer":
    case "deferRegistration":
      return FrameworkDiResolverStrategy.Defer;
    default:
      return null;
  }
}

function isFrameworkRegistrationFactoryCallee(
  sourceProject: SourceProject,
  expression: ts.Expression,
  calleeName: string,
): boolean {
  if (!isRegistrationFactoryName(calleeName)) {
    return false;
  }
  const symbolNode = ts.isPropertyAccessExpression(expression) ? expression.name : expression;
  const symbol = sourceProject.checker.getSymbolAtLocation(symbolNode) ?? sourceProject.checker.getSymbolAtLocation(expression);
  const declarations = symbol?.getDeclarations() ?? [];
  const hasKernelDeclaration = declarations.some((declaration) =>
    sourceProject.sourceFileIdentity(declaration.getSourceFile())?.packageId === "kernel");
  if (!hasKernelDeclaration) {
    return false;
  }
  const type = sourceProject.checker.typeToString(sourceProject.checker.getTypeAtLocation(expression), expression);
  return type.includes("IRegistration") || type.includes("IRegistry");
}

function isRegistrationFactoryName(name: string): boolean {
  switch (name) {
    case "instance":
    case "instanceRegistration":
    case "singleton":
    case "singletonRegistration":
    case "transient":
    case "transientRegistation":
    case "callback":
    case "callbackRegistration":
    case "cachedCallback":
    case "cachedCallbackRegistration":
    case "aliasTo":
    case "aliasToRegistration":
    case "defer":
    case "deferRegistration":
      return true;
    default:
      return false;
  }
}

function resolverBuilderStrategy(call: ts.CallExpression): FrameworkDiResolverStrategy | null {
  const callee = call.expression;
  if (!ts.isPropertyAccessExpression(callee)) {
    return null;
  }
  switch (callee.name.text) {
    case "instance":
      return FrameworkDiResolverStrategy.Instance;
    case "singleton":
      return FrameworkDiResolverStrategy.Singleton;
    case "transient":
      return FrameworkDiResolverStrategy.Transient;
    case "callback":
      return FrameworkDiResolverStrategy.Callback;
    case "cachedCallback":
      return FrameworkDiResolverStrategy.CachedCallback;
    case "aliasTo":
      return FrameworkDiResolverStrategy.Alias;
    default:
      return null;
  }
}

function isCreateInterfaceCall(call: ts.CallExpression): boolean {
  const expression = call.expression;
  return ts.isIdentifier(expression) && expression.text === "createInterface"
    || ts.isPropertyAccessExpression(expression) && expression.name.text === "createInterface";
}

function createInterfaceConfigureArgument(call: ts.CallExpression): ts.Expression | null {
  for (const argument of call.arguments) {
    if (ts.isArrowFunction(argument) || ts.isFunctionExpression(argument)) {
      return argument;
    }
  }
  return null;
}

function createInterfaceFriendlyName(call: ts.CallExpression, fallbackName: string): string {
  const first = call.arguments[0];
  if (first !== undefined && ts.isStringLiteralLike(first)) {
    return first.text;
  }
  return fallbackName;
}

function isExportedVariableDeclaration(variable: ts.VariableDeclaration): boolean {
  const statement = variable.parent.parent;
  return ts.isVariableStatement(statement) && hasModifier(statement, ts.SyntaxKind.ExportKeyword);
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) => modifier.kind === kind) === true;
}

function enclosingVariableDeclaration(node: ts.Node): ts.VariableDeclaration | null {
  let current: ts.Node | undefined = node;
  while (current !== undefined) {
    if (ts.isVariableDeclaration(current)) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function enclosingEndpoint(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  packageId: string,
  packageName: string,
  node: ts.Node,
): FrameworkRelationshipEndpoint {
  const declaration = enclosingNamedDeclaration(node);
  if (declaration !== null) {
    const name = declarationName(declaration) ?? file.repoPath;
    return {
      kind: ts.isMethodDeclaration(declaration) ? FrameworkRelationshipEndpointKind.Method : FrameworkRelationshipEndpointKind.Symbol,
      name,
      packageId,
      packageName,
      source: sourceRangeForNode(file.repoPath, sourceFile, declaration),
    };
  }
  return {
    kind: FrameworkRelationshipEndpointKind.Package,
    name: packageId,
    packageId,
    packageName,
    source: sourceRangeForNode(file.repoPath, sourceFile, sourceFile),
    ...(nearestExpression(node) === null ? {} : { expression: readTypeScriptExpressionFact(sourceProject, sourceFile, nearestExpression(node)!) }),
  };
}

function enclosingNamedDeclaration(node: ts.Node): ts.Declaration | null {
  let current: ts.Node | undefined = node;
  while (current !== undefined) {
    if (
      ts.isMethodDeclaration(current)
      || ts.isFunctionDeclaration(current)
      || ts.isClassDeclaration(current)
      || ts.isVariableDeclaration(current)
      || ts.isPropertyDeclaration(current)
    ) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function declarationName(node: ts.Declaration): string | null {
  const name = (node as { readonly name?: ts.PropertyName | ts.BindingName }).name;
  if (name === undefined) {
    return null;
  }
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  if (ts.isPrivateIdentifier(name)) {
    return name.text;
  }
  return name.getText();
}

function nearestExpression(node: ts.Node): ts.Expression | null {
  let current: ts.Node | undefined = node;
  while (current !== undefined) {
    if (ts.isExpression(current)) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function diKeyEndpoint(packageId: string, packageName: string, name: string, source: SourceRange): FrameworkRelationshipEndpoint {
  return {
    kind: FrameworkRelationshipEndpointKind.DiKey,
    name,
    packageId,
    packageName,
    source,
  };
}

function expressionEndpoint(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  packageId: string,
  packageName: string,
  expression: ts.Expression,
): FrameworkRelationshipEndpoint {
  return {
    kind: FrameworkRelationshipEndpointKind.Expression,
    name: expressionDisplayName(sourceFile, expression),
    packageId,
    packageName,
    source: sourceRangeForNode(file.repoPath, sourceFile, expression),
    expression: readTypeScriptExpressionFact(sourceProject, sourceFile, expression),
  };
}

function expressionDisplayName(sourceFile: ts.SourceFile, expression: ts.Expression): string {
  if (ts.isIdentifier(expression) || ts.isStringLiteralLike(expression) || ts.isNumericLiteral(expression)) {
    return expression.text;
  }
  return expression.getText(sourceFile).replace(/\s+/gu, " ").slice(0, 160);
}

function propertyOrIdentifierName(expression: ts.Expression): string {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }
  return expression.getText();
}

function keyAndValueFromArguments(
  sourceFile: ts.SourceFile,
  args: ts.NodeArray<ts.Expression>,
  classified: ClassifiedRelationship,
): { readonly key?: string; readonly value?: string } {
  const first = args[0];
  const second = args[1];
  if (classified.relation === FrameworkRelationshipRelation.ConstructsInstance
    || classified.relation === FrameworkRelationshipRelation.CreatesContainer
    || classified.mechanism === FrameworkRelationshipMechanism.FactoryConstruct && classified.relation !== FrameworkRelationshipRelation.CreatesFactory) {
    return {};
  }
  if (classified.relation === FrameworkRelationshipRelation.InvokesRegistry) {
    return {
      ...(first === undefined ? {} : { value: first.getText(sourceFile) }),
    };
  }
  return {
    ...(first === undefined ? {} : { key: first.getText(sourceFile) }),
    ...(second === undefined ? {} : { value: second.getText(sourceFile) }),
  };
}

function resolverStrategyFromExpressionText(sourceFile: ts.SourceFile, expression: ts.Expression | undefined): FrameworkDiResolverStrategy | undefined {
  if (expression === undefined) {
    return undefined;
  }
  const text = expression.getText(sourceFile);
  if (text.endsWith(".instance")) {
    return FrameworkDiResolverStrategy.Instance;
  }
  if (text.endsWith(".singleton")) {
    return FrameworkDiResolverStrategy.Singleton;
  }
  if (text.endsWith(".transient")) {
    return FrameworkDiResolverStrategy.Transient;
  }
  if (text.endsWith(".callback")) {
    return FrameworkDiResolverStrategy.Callback;
  }
  if (text.endsWith(".array")) {
    return FrameworkDiResolverStrategy.Array;
  }
  if (text.endsWith(".alias")) {
    return FrameworkDiResolverStrategy.Alias;
  }
  return FrameworkDiResolverStrategy.Unknown;
}

function resolverStrategyForNearestCase(sourceFile: ts.SourceFile, node: ts.Node): FrameworkDiResolverStrategy | undefined {
  let current: ts.Node | undefined = node;
  while (current !== undefined) {
    if (ts.isCaseClause(current)) {
      return resolverStrategyFromExpressionText(sourceFile, current.expression);
    }
    current = current.parent;
  }
  return undefined;
}

function isResourceStoreWrite(left: ts.Expression): boolean {
  if (!ts.isElementAccessExpression(left)) {
    return false;
  }
  const receiver = left.expression;
  return ts.isPropertyAccessExpression(receiver) && receiver.name.text === "res";
}

function summaryForClassifiedRelationship(
  classified: ClassifiedRelationship,
  sourceFile: ts.SourceFile,
  node: ts.CallExpression | ts.NewExpression,
): string {
  const site = node.getText(sourceFile).slice(0, 160);
  return `${classified.relation} through ${classified.mechanism} at ${site}`;
}

function sourceRangeForNode(filePath: string, sourceFile: ts.SourceFile, node: ts.Node): SourceRange {
  return sourceRangeForSpan(filePath, sourceSpan(sourceFile, node));
}

function sourceRangeForSpan(filePath: string, span: SourceSpan): SourceRange {
  return {
    filePath: filePath.replace(/\\/gu, "/"),
    start: {
      line: span.startLine - 1,
      character: span.startCharacter - 1,
    },
    end: {
      line: span.endLine - 1,
      character: span.endCharacter - 1,
    },
  };
}

function sourceSpan(sourceFile: ts.SourceFile, node: ts.Node): SourceSpan {
  const start = node.getStart(sourceFile);
  const end = node.getEnd();
  const startPosition = sourceFile.getLineAndCharacterOfPosition(start);
  const endPosition = sourceFile.getLineAndCharacterOfPosition(end);
  return {
    start,
    end,
    startLine: startPosition.line + 1,
    startCharacter: startPosition.character + 1,
    endLine: endPosition.line + 1,
    endCharacter: endPosition.character + 1,
  };
}

function readFrameworkPackageNames(sourceProject: SourceProject): ReadonlyMap<string, string> {
  const admitted = new Set<string>(AURELIA_FRAMEWORK_PACKAGE_IDS);
  return new Map(sourceProject.snapshot().summary.packages
    .filter((entry) => admitted.has(entry.id))
    .map((entry) => [entry.id, entry.packageName]));
}

function uniqueDiKeys(rows: readonly FrameworkDiKeyRow[]): readonly FrameworkDiKeyRow[] {
  const seen = new Set<string>();
  const unique: FrameworkDiKeyRow[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) {
      continue;
    }
    seen.add(row.id);
    unique.push(row);
  }
  return unique;
}

function uniqueAtoms(rows: readonly FrameworkRelationshipAtom[]): readonly FrameworkRelationshipAtom[] {
  const seen = new Set<string>();
  const unique: FrameworkRelationshipAtom[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) {
      continue;
    }
    seen.add(row.id);
    unique.push(row);
  }
  return unique;
}

function compareDiKeys(left: FrameworkDiKeyRow, right: FrameworkDiKeyRow): number {
  return left.packageId.localeCompare(right.packageId)
    || left.exportName.localeCompare(right.exportName)
    || left.interfaceKey.localeCompare(right.interfaceKey);
}

function compareRelationshipAtoms(left: FrameworkRelationshipAtom, right: FrameworkRelationshipAtom): number {
  return left.packageId.localeCompare(right.packageId)
    || left.phase.localeCompare(right.phase)
    || left.relation.localeCompare(right.relation)
    || left.mechanism.localeCompare(right.mechanism)
    || left.source.filePath.localeCompare(right.source.filePath)
    || left.source.start.line - right.source.start.line
    || left.source.start.character - right.source.start.character;
}

function countBy<TValue>(rows: readonly TValue[], keyFor: (row: TValue) => string): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = keyFor(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}
