import ts from "typescript";

import { countBy, uniqueFirstByKey } from "../collections.js";
import {
  declarationName,
  hasModifier,
  propertyOrIdentifierName,
  readAureliaFrameworkPackageNames,
  readTypeScriptCallSiteEntry,
  readTypeScriptExpressionFact,
  requiredSourceFileIdentity,
  sourceRangeForSourceFileNode,
  SourceProjectKeyedMemo,
  SourceProjectMemo,
  type SourceFileIdentity,
  type SourceProject,
  type TypeScriptCallSiteEntry,
} from "../source/index.js";
import type { SourceRange } from "../inquiry/locus.js";
import { isCreateInterfaceCall } from "./di-source.js";
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
  /** Schema version for this index family. */
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

interface FrameworkRelationshipClassification {
  readonly relation: FrameworkRelationshipRelation;
  readonly mechanism: FrameworkRelationshipMechanism;
  readonly phase: FrameworkRelationshipPhase;
  readonly closure: FrameworkRelationshipClosure;
  readonly toKind: FrameworkRelationshipEndpointKind;
  readonly toName: string;
  readonly strategy?: FrameworkDiResolverStrategy;
}

const staticNewExpressionClassifications =
  new Map<string, FrameworkRelationshipClassification>([
    [
      "Factory",
      {
        relation: FrameworkRelationshipRelation.CreatesFactory,
        mechanism: FrameworkRelationshipMechanism.FactoryConstruct,
        phase: FrameworkRelationshipPhase.Materialization,
        closure: FrameworkRelationshipClosure.Exact,
        toKind: FrameworkRelationshipEndpointKind.Symbol,
        toName: "Factory",
      },
    ],
    [
      "Container",
      {
        relation: FrameworkRelationshipRelation.CreatesContainer,
        mechanism: FrameworkRelationshipMechanism.ContainerChild,
        phase: FrameworkRelationshipPhase.ContainerConstruction,
        closure: FrameworkRelationshipClosure.Exact,
        toKind: FrameworkRelationshipEndpointKind.Symbol,
        toName: "Container",
      },
    ],
    [
      "ContainerConfiguration",
      {
        relation: FrameworkRelationshipRelation.ConstructsInstance,
        mechanism: FrameworkRelationshipMechanism.ContainerChild,
        phase: FrameworkRelationshipPhase.ContainerConstruction,
        closure: FrameworkRelationshipClosure.Exact,
        toKind: FrameworkRelationshipEndpointKind.Symbol,
        toName: "ContainerConfiguration",
      },
    ],
    [
      "ResolverBuilder",
      {
        relation: FrameworkRelationshipRelation.CreatesRegistration,
        mechanism: FrameworkRelationshipMechanism.ResolverBuilder,
        phase: FrameworkRelationshipPhase.Definition,
        closure: FrameworkRelationshipClosure.Exact,
        toKind: FrameworkRelationshipEndpointKind.Symbol,
        toName: "ResolverBuilder",
      },
    ],
    [
      "ParameterizedRegistry",
      {
        relation: FrameworkRelationshipRelation.CreatesRegistration,
        mechanism: FrameworkRelationshipMechanism.RegistrationFactory,
        phase: FrameworkRelationshipPhase.Definition,
        closure: FrameworkRelationshipClosure.Exact,
        toKind: FrameworkRelationshipEndpointKind.Symbol,
        toName: "ParameterizedRegistry",
      },
    ],
    [
      "InstanceProvider",
      {
        relation: FrameworkRelationshipRelation.CreatesResolver,
        mechanism: FrameworkRelationshipMechanism.ResolverHelper,
        phase: FrameworkRelationshipPhase.Materialization,
        closure: FrameworkRelationshipClosure.Exact,
        toKind: FrameworkRelationshipEndpointKind.Symbol,
        toName: "InstanceProvider",
        strategy: FrameworkDiResolverStrategy.Instance,
      },
    ],
    ...["Type", "this.Type", "RealType"].map((name) =>
      [
        name,
        {
          relation: FrameworkRelationshipRelation.ConstructsInstance,
          mechanism: FrameworkRelationshipMechanism.FactoryConstruct,
          phase: FrameworkRelationshipPhase.Materialization,
          closure: FrameworkRelationshipClosure.Exact,
          toKind: FrameworkRelationshipEndpointKind.Symbol,
          toName: name,
        },
      ] as const
    ),
  ]);

const resourceStoreRelationshipFacts = {
  family: FrameworkRelationshipFamily.Di,
  relation: FrameworkRelationshipRelation.StoresResourceSlot,
  mechanism: FrameworkRelationshipMechanism.ResourceStore,
  phase: FrameworkRelationshipPhase.Registration,
  evidenceBasis: FrameworkRelationshipEvidenceBasis.KernelSource,
  closure: FrameworkRelationshipClosure.Exact,
  toKind: FrameworkRelationshipEndpointKind.ContainerSlot,
  toName: "container.res",
} as const;

const createInterfaceProviderRelationshipFacts = {
  family: FrameworkRelationshipFamily.Di,
  mechanism: FrameworkRelationshipMechanism.ResolverBuilder,
  phase: FrameworkRelationshipPhase.Definition,
  evidenceBasis: FrameworkRelationshipEvidenceBasis.Syntax,
  closure: FrameworkRelationshipClosure.Exact,
} as const;

const registrationFactoryProviderRelationshipFacts = {
  family: FrameworkRelationshipFamily.Di,
  mechanism: FrameworkRelationshipMechanism.RegistrationFactory,
  phase: FrameworkRelationshipPhase.Definition,
  evidenceBasis: FrameworkRelationshipEvidenceBasis.Checker,
  closure: FrameworkRelationshipClosure.Exact,
} as const;

const kernelCallClassifications = new Map<
  string,
  FrameworkRelationshipClassification
>([
  [
    "registerResolver",
    {
      relation: FrameworkRelationshipRelation.RegistersProvider,
      mechanism: FrameworkRelationshipMechanism.ContainerRegisterResolver,
      phase: FrameworkRelationshipPhase.Registration,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.ContainerSlot,
      toName: "resolver-slot",
    },
  ],
  [
    "register",
    {
      relation: FrameworkRelationshipRelation.InvokesRegistry,
      mechanism: FrameworkRelationshipMechanism.ContainerRegister,
      phase: FrameworkRelationshipPhase.Registration,
      closure: FrameworkRelationshipClosure.Modeled,
      toKind: FrameworkRelationshipEndpointKind.Method,
      toName: "register",
    },
  ],
  [
    "getResolver",
    {
      relation: FrameworkRelationshipRelation.LooksUpKey,
      mechanism: FrameworkRelationshipMechanism.ContainerGetResolver,
      phase: FrameworkRelationshipPhase.Lookup,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.Method,
      toName: "getResolver",
    },
  ],
  [
    "get",
    {
      relation: FrameworkRelationshipRelation.ResolvesKey,
      mechanism: FrameworkRelationshipMechanism.ContainerGet,
      phase: FrameworkRelationshipPhase.Resolution,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.Method,
      toName: "get",
    },
  ],
  [
    "getAll",
    {
      relation: FrameworkRelationshipRelation.ResolvesKey,
      mechanism: FrameworkRelationshipMechanism.ContainerGetAll,
      phase: FrameworkRelationshipPhase.Resolution,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.Method,
      toName: "getAll",
    },
  ],
  [
    "has",
    {
      relation: FrameworkRelationshipRelation.LooksUpKey,
      mechanism: FrameworkRelationshipMechanism.ContainerHas,
      phase: FrameworkRelationshipPhase.Lookup,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.Method,
      toName: "has",
    },
  ],
  [
    "find",
    {
      relation: FrameworkRelationshipRelation.LooksUpKey,
      mechanism: FrameworkRelationshipMechanism.ContainerFind,
      phase: FrameworkRelationshipPhase.ResourceLookup,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.Method,
      toName: "find",
    },
  ],
  [
    "getFactory",
    {
      relation: FrameworkRelationshipRelation.LooksUpKey,
      mechanism: FrameworkRelationshipMechanism.ResolverGetFactory,
      phase: FrameworkRelationshipPhase.Materialization,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.Method,
      toName: "getFactory",
    },
  ],
  [
    "_jitRegister",
    {
      relation: FrameworkRelationshipRelation.RegistersProvider,
      mechanism: FrameworkRelationshipMechanism.JitRegister,
      phase: FrameworkRelationshipPhase.Registration,
      closure: FrameworkRelationshipClosure.Modeled,
      toKind: FrameworkRelationshipEndpointKind.Method,
      toName: "_jitRegister",
    },
  ],
  [
    "createContainer",
    {
      relation: FrameworkRelationshipRelation.CreatesContainer,
      mechanism: FrameworkRelationshipMechanism.ContainerChild,
      phase: FrameworkRelationshipPhase.ContainerConstruction,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.Symbol,
      toName: "Container",
    },
  ],
  [
    "createResolver",
    {
      relation: FrameworkRelationshipRelation.CreatesResolver,
      mechanism: FrameworkRelationshipMechanism.ResolverHelper,
      phase: FrameworkRelationshipPhase.Definition,
      closure: FrameworkRelationshipClosure.Exact,
      toKind: FrameworkRelationshipEndpointKind.Symbol,
      toName: "callable-resolver",
    },
  ],
]);

const resolverStrategyRegistrationFacts = {
  phase: FrameworkRelationshipPhase.Definition,
  closure: FrameworkRelationshipClosure.Exact,
  toKind: FrameworkRelationshipEndpointKind.ResolverStrategy,
} as const;

const FRAMEWORK_DI_RELATIONSHIP_INDEX_VERSION = "di-relationship-atoms@3";

const frameworkDiIndexMemo = new SourceProjectMemo<FrameworkDiIndex>();
const frameworkDiPackagePayloadByPackage = new SourceProjectKeyedMemo<
  string,
  FrameworkDiPackagePayload
>();

/** Build or read the framework DI index for one hot source project. */
export function readFrameworkDiIndex(
  /** Hot source project held by the Atlas daemon. */
  sourceProject: SourceProject,
): FrameworkDiIndex {
  return frameworkDiIndexMemo.read(sourceProject, () => {
    const packageNames = readAureliaFrameworkPackageNames(sourceProject);
    const payloads = [...packageNames.keys()].map((packageId) =>
      readFrameworkDiPackagePayload(
        sourceProject,
        packageId,
        packageNames.get(packageId) ?? packageId,
      ),
    );
    const keys = payloads.flatMap((payload) => payload.keys);
    const relationships = [
      ...uniqueFirstByKey(
        payloads.flatMap((payload) => payload.relationships),
        (row) => row.id,
      ),
    ].sort(compareRelationshipAtoms);
    return {
      version: FRAMEWORK_DI_RELATIONSHIP_INDEX_VERSION,
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
  });
}

function readFrameworkDiPackagePayload(
  sourceProject: SourceProject,
  packageId: string,
  packageName: string,
): FrameworkDiPackagePayload {
  return frameworkDiPackagePayloadByPackage.read(sourceProject, packageId, () =>
    scanFrameworkDiPackagePayload(sourceProject, packageId, packageName),
  );
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
    const file = requiredSourceFileIdentity(sourceProject, sourceFile);
    if (file.packageId !== packageId) {
      continue;
    }

    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        if (isCreateInterfaceCall(sourceProject, node)) {
          const key = createInterfaceKeyRow(
            sourceProject,
            sourceFile,
            file,
            packageId,
            packageName,
            node,
          );
          if (key !== null) {
            keys.push(key.row);
            relationships.push(
              key.definitionAtom,
              ...key.defaultRegistrationAtoms,
            );
          }
        }
        const atoms = relationshipAtomsForCall(
          sourceProject,
          sourceFile,
          file,
          packageId,
          packageName,
          node,
          isKernel,
        );
        if (atoms.length > 0) {
          relationships.push(...atoms);
        }
      } else if (isKernel && ts.isNewExpression(node)) {
        const atom = relationshipAtomForNew(
          sourceProject,
          sourceFile,
          file,
          packageId,
          packageName,
          node,
        );
        if (atom !== null) {
          relationships.push(atom);
        }
      } else if (isKernel && ts.isBinaryExpression(node)) {
        const atom = relationshipAtomForBinaryExpression(
          sourceProject,
          sourceFile,
          file,
          packageId,
          packageName,
          node,
        );
        if (atom !== null) {
          relationships.push(atom);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  return {
    keys: uniqueFirstByKey(keys, (row) => row.id).sort(compareDiKeys),
    relationships: uniqueFirstByKey(relationships, (row) => row.id).sort(
      compareRelationshipAtoms,
    ),
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
  const source = sourceRangeForSourceFileNode(file.repoPath, sourceFile, call);
  const exportName = variable.name.text;
  const interfaceKey = createInterfaceFriendlyName(call, exportName);
  const endpoint = diKeyEndpoint(packageId, packageName, interfaceKey, source);
  const from = enclosingEndpoint(
    sourceProject,
    sourceFile,
    file,
    packageId,
    packageName,
    call,
  );
  const definitionAtom: FrameworkRelationshipAtom = {
    id: `framework-di:${packageId}:${file.repoPath}:${call.getStart(
      sourceFile,
    )}:defines-key:${exportName}`,
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
      defaultRegistrationAtomIds: defaultRegistrationAtoms.map(
        (atom) => atom.id,
      ),
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
        const source = sourceRangeForSourceFileNode(file.repoPath, sourceFile, node);
        const callSite =
          readTypeScriptCallSiteEntry(sourceProject, sourceFile, node) ??
          undefined;
        const providerArgument = node.arguments[0];
        const value =
          providerArgument === undefined
            ? undefined
            : providerArgument.getText(sourceFile);
        atoms.push({
          id: `framework-di:${packageId}:${file.repoPath}:${node.getStart(
            sourceFile,
          )}:builder:${strategy}`,
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
          callSite,
          key: interfaceKey,
          value,
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
  const source = sourceRangeForSourceFileNode(file.repoPath, sourceFile, builderCall);
  const callSite =
    readTypeScriptCallSiteEntry(sourceProject, sourceFile, builderCall) ??
    undefined;
  const providerText = providerArgument.getText(sourceFile);
  const relation =
    strategy === FrameworkDiResolverStrategy.Alias
      ? FrameworkRelationshipRelation.AliasesKey
      : FrameworkRelationshipRelation.ProvidesKey;
  return {
    id: `framework-di:${packageId}:${file.repoPath}:${builderCall.getStart(
      sourceFile,
    )}:builder-provider:${strategy}`,
    ...createInterfaceProviderRelationshipFacts,
    relation,
    packageId,
    packageName,
    from: keyEndpoint,
    to: diExpressionEndpoint(
      sourceProject,
      sourceFile,
      file,
      packageId,
      packageName,
      providerArgument,
    ),
    source,
    callSite,
    key: interfaceKey,
    value: providerText,
    strategy,
    summary:
      relation === FrameworkRelationshipRelation.AliasesKey
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
  const implementationRegisterAtom = implementationRegisterAtomForCall(
    sourceProject,
    sourceFile,
    file,
    packageId,
    packageName,
    call,
  );
  if (implementationRegisterAtom !== null) {
    return [implementationRegisterAtom];
  }
  const classified = classifyCall(
    sourceProject,
    sourceFile,
    call,
    includeKernelInternals,
  );
  if (classified === null) {
    return [];
  }
  const source = sourceRangeForSourceFileNode(file.repoPath, sourceFile, call);
  const callSite =
    readTypeScriptCallSiteEntry(sourceProject, sourceFile, call) ?? undefined;
  const atom: FrameworkRelationshipAtom = {
    id: `framework-di:${packageId}:${file.repoPath}:${call.getStart(
      sourceFile,
    )}:${classified.relation}:${classified.mechanism}`,
    family: FrameworkRelationshipFamily.Di,
    relation: classified.relation,
    mechanism: classified.mechanism,
    phase: classified.phase,
    evidenceBasis: FrameworkRelationshipEvidenceBasis.KernelSource,
    closure: classified.closure,
    packageId,
    packageName,
    from: enclosingEndpoint(
      sourceProject,
      sourceFile,
      file,
      packageId,
      packageName,
      call,
    ),
    to: {
      kind: classified.toKind,
      name: classified.toName,
      packageId,
      packageName,
      source,
      expression: readTypeScriptExpressionFact(
        sourceProject,
        sourceFile,
        call.expression,
      ),
    },
    source,
    callSite,
    ...keyAndValueFromArguments(sourceFile, call.arguments, classified),
    strategy: classified.strategy,
    summary: summaryForRelationshipClassification(classified, sourceFile, call),
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

function implementationRegisterAtomForCall(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  packageId: string,
  packageName: string,
  call: ts.CallExpression,
): FrameworkRelationshipAtom | null {
  if (!isCreateImplementationRegisterCall(sourceProject, call)) {
    return null;
  }
  const keyArgument = call.arguments[0];
  const owner = enclosingStaticRegisterClass(call);
  if (keyArgument === undefined || owner?.name === undefined) {
    return null;
  }
  const source = sourceRangeForSourceFileNode(file.repoPath, sourceFile, call);
  const callSite =
    readTypeScriptCallSiteEntry(sourceProject, sourceFile, call) ?? undefined;
  const key = expressionDisplayName(sourceFile, keyArgument);
  const provider = owner.name.text;
  return {
    id: `framework-di:${packageId}:${file.repoPath}:${call.getStart(
      sourceFile,
    )}:implementation-register:${key}:${provider}`,
    family: FrameworkRelationshipFamily.Di,
    relation: FrameworkRelationshipRelation.ProvidesKey,
    mechanism: FrameworkRelationshipMechanism.RegistrationFactory,
    phase: FrameworkRelationshipPhase.Definition,
    evidenceBasis: FrameworkRelationshipEvidenceBasis.Syntax,
    closure: FrameworkRelationshipClosure.Exact,
    packageId,
    packageName,
    from: diKeyEndpointForExpression(
      sourceProject,
      sourceFile,
      file,
      packageId,
      packageName,
      keyArgument,
      key,
    ),
    to: {
      kind: FrameworkRelationshipEndpointKind.Symbol,
      name: provider,
      packageId,
      packageName,
      source: sourceRangeForSourceFileNode(file.repoPath, sourceFile, owner),
      expression: readTypeScriptExpressionFact(
        sourceProject,
        sourceFile,
        owner.name,
      ),
    },
    source,
    callSite,
    key,
    value: provider,
    strategy: FrameworkDiResolverStrategy.Singleton,
    summary: `${provider}.register provides DI key ${key} through createImplementationRegister.`,
  };
}

function relationshipAtomForNew(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  packageId: string,
  packageName: string,
  node: ts.NewExpression,
): FrameworkRelationshipAtom | null {
  const classified = classifyDiNewExpression(sourceFile, node);
  if (classified === null) {
    return null;
  }
  const source = sourceRangeForSourceFileNode(file.repoPath, sourceFile, node);
  const callSite =
    readTypeScriptCallSiteEntry(sourceProject, sourceFile, node) ?? undefined;
  return {
    id: `framework-di:${packageId}:${file.repoPath}:${node.getStart(
      sourceFile,
    )}:${classified.relation}:${classified.mechanism}`,
    family: FrameworkRelationshipFamily.Di,
    relation: classified.relation,
    mechanism: classified.mechanism,
    phase: classified.phase,
    evidenceBasis: FrameworkRelationshipEvidenceBasis.KernelSource,
    closure: classified.closure,
    packageId,
    packageName,
    from: enclosingEndpoint(
      sourceProject,
      sourceFile,
      file,
      packageId,
      packageName,
      node,
    ),
    to: {
      kind: classified.toKind,
      name: classified.toName,
      packageId,
      packageName,
      source,
      expression: readTypeScriptExpressionFact(
        sourceProject,
        sourceFile,
        node.expression,
      ),
    },
    source,
    callSite,
    ...keyAndValueFromArguments(
      sourceFile,
      node.arguments ?? ts.factory.createNodeArray(),
      classified,
    ),
    strategy: classified.strategy,
    summary: summaryForRelationshipClassification(classified, sourceFile, node),
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
  if (
    node.operatorToken.kind !== ts.SyntaxKind.EqualsToken ||
    !isResourceStoreWrite(node.left)
  ) {
    return null;
  }
  const source = sourceRangeForSourceFileNode(file.repoPath, sourceFile, node);
  const value = node.right.getText(sourceFile);
  return {
    id: `framework-di:${packageId}:${file.repoPath}:${node.getStart(
      sourceFile,
    )}:stores-resource-slot`,
    family: resourceStoreRelationshipFacts.family,
    relation: resourceStoreRelationshipFacts.relation,
    mechanism: resourceStoreRelationshipFacts.mechanism,
    phase: resourceStoreRelationshipFacts.phase,
    evidenceBasis: resourceStoreRelationshipFacts.evidenceBasis,
    closure: resourceStoreRelationshipFacts.closure,
    packageId,
    packageName,
    from: enclosingEndpoint(
      sourceProject,
      sourceFile,
      file,
      packageId,
      packageName,
      node,
    ),
    to: {
      kind: resourceStoreRelationshipFacts.toKind,
      name: resourceStoreRelationshipFacts.toName,
      packageId,
      packageName,
      source,
      expression: readTypeScriptExpressionFact(
        sourceProject,
        sourceFile,
        node.left,
      ),
    },
    source,
    value,
    summary: `Kernel DI stores a resource resolver slot through ${node.left.getText(
      sourceFile,
    )}.`,
  };
}

function registrationFactoryProviderAtomForCall(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  packageId: string,
  packageName: string,
  call: ts.CallExpression,
  classified: FrameworkRelationshipClassification,
): FrameworkRelationshipAtom | null {
  if (
    classified.mechanism !==
      registrationFactoryProviderRelationshipFacts.mechanism ||
    classified.strategy === undefined ||
    classified.strategy === FrameworkDiResolverStrategy.Defer
  ) {
    return null;
  }
  const keyArgument =
    classified.strategy === FrameworkDiResolverStrategy.Alias
      ? call.arguments[1]
      : call.arguments[0];
  const providerArgument =
    classified.strategy === FrameworkDiResolverStrategy.Alias
      ? call.arguments[0]
      : call.arguments[1];
  if (keyArgument === undefined || providerArgument === undefined) {
    return null;
  }
  const source = sourceRangeForSourceFileNode(file.repoPath, sourceFile, call);
  const callSite =
    readTypeScriptCallSiteEntry(sourceProject, sourceFile, call) ?? undefined;
  const key = expressionDisplayName(sourceFile, keyArgument);
  const value = expressionDisplayName(sourceFile, providerArgument);
  const relation =
    classified.strategy === FrameworkDiResolverStrategy.Alias
      ? FrameworkRelationshipRelation.AliasesKey
      : FrameworkRelationshipRelation.ProvidesKey;
  return {
    id: `framework-di:${packageId}:${file.repoPath}:${call.getStart(
      sourceFile,
    )}:registration-provider:${classified.strategy}`,
    ...registrationFactoryProviderRelationshipFacts,
    relation,
    packageId,
    packageName,
    from: diExpressionEndpoint(
      sourceProject,
      sourceFile,
      file,
      packageId,
      packageName,
      keyArgument,
    ),
    to: diExpressionEndpoint(
      sourceProject,
      sourceFile,
      file,
      packageId,
      packageName,
      providerArgument,
    ),
    source,
    callSite,
    key,
    value,
    strategy: classified.strategy,
    summary:
      relation === FrameworkRelationshipRelation.AliasesKey
        ? `${key} aliases ${value} through Registration.${classified.strategy}.`
        : `${key} is provided by ${value} through Registration.${classified.strategy}.`,
  };
}

function classifyCall(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
  includeKernelInternals: boolean,
): FrameworkRelationshipClassification | null {
  const calleeName =
    propertyOrIdentifierName(call.expression, sourceFile) ??
    call.expression.getText(sourceFile);
  const calleeText = call.expression.getText(sourceFile);
  const registrationStrategy = registrationFactoryStrategy(
    sourceProject,
    sourceFile,
    call,
    calleeName,
  );
  if (registrationStrategy !== null) {
    return registrationFactoryClassification(registrationStrategy);
  }
  const builderStrategy = includeKernelInternals
    ? resolverBuilderStrategy(call)
    : null;
  if (builderStrategy !== null) {
    return resolverBuilderClassification(builderStrategy);
  }
  if (!includeKernelInternals) {
    return null;
  }
  const registryRegister = classifyRegistryRegisterCall(
    sourceProject,
    call,
    calleeName,
  );
  if (registryRegister !== null) {
    return registryRegister;
  }
  const resolverStoreClassification = classifyResolverStoreCall(calleeText);
  if (resolverStoreClassification !== null) {
    return resolverStoreClassification;
  }
  if (calleeName === "construct") {
    return constructCallClassification(sourceFile, call);
  }
  if (calleeName === "resolve") {
    return resolveCallClassification(sourceFile, call);
  }
  return kernelCallClassifications.get(calleeName) ?? null;
}

function classifyRegistryRegisterCall(
  sourceProject: SourceProject,
  call: ts.CallExpression,
  calleeName: string,
): FrameworkRelationshipClassification | null {
  if (calleeName !== "register" || !ts.isPropertyAccessExpression(call.expression)) {
    return null;
  }
  const receiverType = sourceProject.checker.typeToString(
    sourceProject.checker.getTypeAtLocation(call.expression.expression),
    call.expression.expression,
  );
  if (!receiverType.includes("IRegistry")) {
    return null;
  }
  return {
    relation: FrameworkRelationshipRelation.InvokesRegistry,
    mechanism: FrameworkRelationshipMechanism.ContainerRegister,
    phase: FrameworkRelationshipPhase.Registration,
    closure: FrameworkRelationshipClosure.Exact,
    toKind: FrameworkRelationshipEndpointKind.Method,
    toName: "IRegistry.register",
  };
}

function registrationFactoryClassification(
  strategy: FrameworkDiResolverStrategy,
): FrameworkRelationshipClassification {
  return resolverStrategyRegistrationClassification(
    strategy,
    FrameworkRelationshipMechanism.RegistrationFactory,
  );
}

function resolverBuilderClassification(
  strategy: FrameworkDiResolverStrategy,
): FrameworkRelationshipClassification {
  return resolverStrategyRegistrationClassification(
    strategy,
    FrameworkRelationshipMechanism.ResolverBuilder,
  );
}

function resolverStrategyRegistrationClassification(
  strategy: FrameworkDiResolverStrategy,
  mechanism: FrameworkRelationshipMechanism,
): FrameworkRelationshipClassification {
  return {
    relation:
      strategy === FrameworkDiResolverStrategy.Alias
        ? FrameworkRelationshipRelation.AliasesKey
        : FrameworkRelationshipRelation.CreatesRegistration,
    mechanism,
    phase: resolverStrategyRegistrationFacts.phase,
    closure: resolverStrategyRegistrationFacts.closure,
    toKind: resolverStrategyRegistrationFacts.toKind,
    toName: strategy,
    strategy,
  };
}

function classifyResolverStoreCall(
  calleeText: string,
): FrameworkRelationshipClassification | null {
  if (
    calleeText.endsWith("._resolvers.set") ||
    calleeText.endsWith("_resolvers.set")
  ) {
    return resolverStoreSetClassification();
  }
  if (
    calleeText.endsWith("._resolvers.get") ||
    calleeText.endsWith("_resolvers.get")
  ) {
    return resolverStoreGetClassification();
  }
  return null;
}

function resolverStoreSetClassification(): FrameworkRelationshipClassification {
  return {
    relation: FrameworkRelationshipRelation.StoresResolverSlot,
    mechanism: FrameworkRelationshipMechanism.ResolverStore,
    phase: FrameworkRelationshipPhase.Registration,
    closure: FrameworkRelationshipClosure.Exact,
    toKind: FrameworkRelationshipEndpointKind.ContainerSlot,
    toName: "_resolvers",
  };
}

function resolverStoreGetClassification(): FrameworkRelationshipClassification {
  return {
    relation: FrameworkRelationshipRelation.LooksUpKey,
    mechanism: FrameworkRelationshipMechanism.ResolverStore,
    phase: FrameworkRelationshipPhase.Lookup,
    closure: FrameworkRelationshipClosure.Exact,
    toKind: FrameworkRelationshipEndpointKind.ContainerSlot,
    toName: "_resolvers",
  };
}

function constructCallClassification(
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
): FrameworkRelationshipClassification {
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

function resolveCallClassification(
  sourceFile: ts.SourceFile,
  call: ts.CallExpression,
): FrameworkRelationshipClassification {
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

function classifyDiNewExpression(
  sourceFile: ts.SourceFile,
  node: ts.NewExpression,
): FrameworkRelationshipClassification | null {
  const name = node.expression.getText(sourceFile);
  if (name === "Resolver") {
    return resolverNewExpressionClassification(sourceFile, node);
  }
  return staticNewExpressionClassifications.get(name) ?? null;
}

function resolverNewExpressionClassification(
  sourceFile: ts.SourceFile,
  node: ts.NewExpression,
): FrameworkRelationshipClassification {
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

function registrationFactoryStrategy(
  sourceProject: SourceProject,
  _sourceFile: ts.SourceFile,
  call: ts.CallExpression,
  calleeName: string,
): FrameworkDiResolverStrategy | null {
  if (
    !isFrameworkRegistrationFactoryCallee(
      sourceProject,
      call.expression,
      calleeName,
    )
  ) {
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
  if (!isRegistrationFactoryExpression(sourceProject, expression)) {
    return false;
  }
  const type = sourceProject.checker.typeToString(
    sourceProject.checker.getTypeAtLocation(expression),
    expression,
  );
  return type.includes("IRegistration") || type.includes("IRegistry");
}

function isRegistrationFactoryExpression(
  sourceProject: SourceProject,
  expression: ts.Expression,
): boolean {
  const calleeName =
    propertyOrIdentifierName(expression, expression.getSourceFile()) ??
    expression.getText(expression.getSourceFile());
  if (!isRegistrationFactoryName(calleeName)) {
    return false;
  }
  const symbol = resolvedSymbolAt(sourceProject, expression);
  return symbol?.getDeclarations()?.some((declaration) => {
    const packageId =
      sourceProject.sourceFileIdentity(declaration.getSourceFile())?.packageId;
    if (packageId === "kernel") {
      return true;
    }
    if (
      ts.isVariableDeclaration(declaration) &&
      declaration.initializer !== undefined
    ) {
      return isRegistrationFactoryExpression(
        sourceProject,
        declaration.initializer,
      );
    }
    return false;
  }) === true;
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

function resolverBuilderStrategy(
  call: ts.CallExpression,
): FrameworkDiResolverStrategy | null {
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

function resolvedSymbolAt(
  sourceProject: SourceProject,
  expression: ts.Expression,
): ts.Symbol | undefined {
  const symbolNode = ts.isPropertyAccessExpression(expression)
    ? expression.name
    : expression;
  const symbol =
    sourceProject.checker.getSymbolAtLocation(symbolNode) ??
    sourceProject.checker.getSymbolAtLocation(expression);
  if (symbol === undefined) {
    return undefined;
  }
  return (symbol.flags & ts.SymbolFlags.Alias) === 0
    ? symbol
    : sourceProject.checker.getAliasedSymbol(symbol);
}

function isCreateImplementationRegisterCall(
  sourceProject: SourceProject,
  call: ts.CallExpression,
): boolean {
  if (propertyOrIdentifierName(call.expression) !== "createImplementationRegister") {
    return false;
  }
  const symbol = resolvedSymbolAt(sourceProject, call.expression);
  return symbol?.getDeclarations()?.some(
    (declaration) =>
      sourceProject.sourceFileIdentity(declaration.getSourceFile())
        ?.packageId === "kernel",
  ) === true;
}

function createInterfaceConfigureArgument(
  call: ts.CallExpression,
): ts.Expression | null {
  for (const argument of call.arguments) {
    if (ts.isArrowFunction(argument) || ts.isFunctionExpression(argument)) {
      return argument;
    }
  }
  return null;
}

function createInterfaceFriendlyName(
  call: ts.CallExpression,
  fallbackName: string,
): string {
  const first = call.arguments[0];
  if (first !== undefined && ts.isStringLiteralLike(first)) {
    return first.text;
  }
  return fallbackName;
}

function isExportedVariableDeclaration(
  variable: ts.VariableDeclaration,
): boolean {
  const statement = variable.parent.parent;
  return (
    ts.isVariableStatement(statement) &&
    hasModifier(statement, ts.SyntaxKind.ExportKeyword)
  );
}

function enclosingVariableDeclaration(
  node: ts.Node,
): ts.VariableDeclaration | null {
  let current: ts.Node | undefined = node;
  while (current !== undefined) {
    if (ts.isVariableDeclaration(current)) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function enclosingStaticRegisterClass(
  node: ts.Node,
): ts.ClassDeclaration | null {
  let current: ts.Node | undefined = node;
  while (current !== undefined) {
    if (ts.isPropertyDeclaration(current) || ts.isMethodDeclaration(current)) {
      const name = declarationName(current);
      if (name !== "register" || !hasModifier(current, ts.SyntaxKind.StaticKeyword)) {
        return null;
      }
      return ts.isClassDeclaration(current.parent) ? current.parent : null;
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
      kind: ts.isMethodDeclaration(declaration)
        ? FrameworkRelationshipEndpointKind.Method
        : FrameworkRelationshipEndpointKind.Symbol,
      name,
      packageId,
      packageName,
      source: sourceRangeForSourceFileNode(file.repoPath, sourceFile, declaration),
    };
  }
  const expression = nearestExpression(node);
  return {
    kind: FrameworkRelationshipEndpointKind.Package,
    name: packageId,
    packageId,
    packageName,
    source: sourceRangeForSourceFileNode(file.repoPath, sourceFile, sourceFile),
    expression: expression === null
      ? undefined
      : readTypeScriptExpressionFact(sourceProject, sourceFile, expression),
  };
}

function enclosingNamedDeclaration(node: ts.Node): ts.Declaration | null {
  let current: ts.Node | undefined = node;
  while (current !== undefined) {
    if (
      ts.isMethodDeclaration(current) ||
      ts.isFunctionDeclaration(current) ||
      ts.isClassDeclaration(current) ||
      ts.isVariableDeclaration(current) ||
      ts.isPropertyDeclaration(current)
    ) {
      return current;
    }
    current = current.parent;
  }
  return null;
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

function diKeyEndpoint(
  packageId: string,
  packageName: string,
  name: string,
  source: SourceRange,
): FrameworkRelationshipEndpoint {
  return {
    kind: FrameworkRelationshipEndpointKind.DiKey,
    name,
    packageId,
    packageName,
    source,
  };
}

function diKeyEndpointForExpression(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  file: SourceFileIdentity,
  fallbackPackageId: string,
  fallbackPackageName: string,
  expression: ts.Expression,
  key: string,
): FrameworkRelationshipEndpoint {
  const symbol = resolvedSymbolAt(sourceProject, expression);
  const declaration = symbol
    ?.getDeclarations()
    ?.find(
      (candidate): candidate is ts.VariableDeclaration =>
        ts.isVariableDeclaration(candidate) &&
        candidate.name.getText(candidate.getSourceFile()) === key,
    );
  if (declaration !== undefined) {
    const declarationFile = declaration.getSourceFile();
    const identity = sourceProject.sourceFileIdentity(declarationFile);
    const packageDefinition = sourceProject.packageForFileName(
      declarationFile.fileName,
    );
    if (identity !== null && packageDefinition !== null) {
      return diKeyEndpoint(
        identity.packageId ?? fallbackPackageId,
        packageDefinition.packageName,
        key,
        sourceRangeForSourceFileNode(identity.repoPath, declarationFile, declaration),
      );
    }
  }
  return diKeyEndpoint(
    fallbackPackageId,
    fallbackPackageName,
    key,
    sourceRangeForSourceFileNode(file.repoPath, sourceFile, expression),
  );
}

function diExpressionEndpoint(
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
    source: sourceRangeForSourceFileNode(file.repoPath, sourceFile, expression),
    expression: readTypeScriptExpressionFact(
      sourceProject,
      sourceFile,
      expression,
    ),
  };
}

function expressionDisplayName(
  sourceFile: ts.SourceFile,
  expression: ts.Expression,
): string {
  if (expression.kind === ts.SyntaxKind.ThisKeyword) {
    const owner = enclosingStaticRegisterClass(expression);
    if (owner?.name !== undefined) {
      return owner.name.text;
    }
  }
  if (
    ts.isIdentifier(expression) ||
    ts.isStringLiteralLike(expression) ||
    ts.isNumericLiteral(expression)
  ) {
    return expression.text;
  }
  return expression.getText(sourceFile).replace(/\s+/gu, " ").slice(0, 160);
}

function keyAndValueFromArguments(
  sourceFile: ts.SourceFile,
  args: ts.NodeArray<ts.Expression>,
  classified: FrameworkRelationshipClassification,
): { readonly key?: string; readonly value?: string } {
  const first = args[0];
  const second = args[1];
  if (
    classified.relation === FrameworkRelationshipRelation.ConstructsInstance ||
    classified.relation === FrameworkRelationshipRelation.CreatesContainer ||
    (classified.mechanism === FrameworkRelationshipMechanism.FactoryConstruct &&
      classified.relation !== FrameworkRelationshipRelation.CreatesFactory)
  ) {
    return {};
  }
  if (classified.relation === FrameworkRelationshipRelation.InvokesRegistry) {
    return {
      value: first?.getText(sourceFile),
    };
  }
  return {
    key: first === undefined ? undefined : expressionDisplayName(sourceFile, first),
    value: second === undefined ? undefined : expressionDisplayName(sourceFile, second),
  };
}

function resolverStrategyFromExpressionText(
  sourceFile: ts.SourceFile,
  expression: ts.Expression | undefined,
): FrameworkDiResolverStrategy | undefined {
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

function resolverStrategyForNearestCase(
  sourceFile: ts.SourceFile,
  node: ts.Node,
): FrameworkDiResolverStrategy | undefined {
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
  return (
    ts.isPropertyAccessExpression(receiver) && receiver.name.text === "res"
  );
}

function summaryForRelationshipClassification(
  classified: FrameworkRelationshipClassification,
  sourceFile: ts.SourceFile,
  node: ts.CallExpression | ts.NewExpression,
): string {
  const site = node.getText(sourceFile).slice(0, 160);
  return `${classified.relation} through ${classified.mechanism} at ${site}`;
}

function compareDiKeys(
  left: FrameworkDiKeyRow,
  right: FrameworkDiKeyRow,
): number {
  return (
    left.packageId.localeCompare(right.packageId) ||
    left.exportName.localeCompare(right.exportName) ||
    left.interfaceKey.localeCompare(right.interfaceKey)
  );
}

function compareRelationshipAtoms(
  left: FrameworkRelationshipAtom,
  right: FrameworkRelationshipAtom,
): number {
  return (
    left.packageId.localeCompare(right.packageId) ||
    left.phase.localeCompare(right.phase) ||
    left.relation.localeCompare(right.relation) ||
    left.mechanism.localeCompare(right.mechanism) ||
    left.source.filePath.localeCompare(right.source.filePath) ||
    left.source.start.line - right.source.start.line ||
    left.source.start.character - right.source.start.character
  );
}
