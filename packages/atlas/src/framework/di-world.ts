import ts from "typescript";

import {
  EvaluationBindingKind,
  EvaluationClassValue,
  EvaluationEnvironment,
  EvaluationFunctionValue,
  EvaluationUnknownValue,
  EvaluationValueKind,
  StaticEvaluator,
  type EvaluationValue,
} from "../evaluation/index.js";
import type { SourceRange } from "../inquiry/locus.js";
import {
  readTypeScriptCallSiteEntry,
  readTypeScriptExpressionFact,
  SourceProjectMemo,
  type TypeScriptCallSiteEntry,
  type TypeScriptExpressionFact,
  type SourceProject,
  type SourceSpan,
} from "../source/index.js";
import {
  FrameworkDiResolverStrategy,
  FrameworkRelationshipClosure,
  FrameworkRelationshipEndpointKind,
  FrameworkRelationshipMechanism,
  FrameworkRelationshipRelation,
  type FrameworkRelationshipAtom,
  type FrameworkRelationshipEndpoint,
} from "./relationships.js";
import { readFrameworkModuleBootIndex } from "./module-boot.js";
import { readFrameworkDiIndex } from "./di-index.js";

const standardConfigurationDiWorldMemo = new SourceProjectMemo<FrameworkDiWorld>();

/** Runtime-shaped value lane admitted by abstract container registration. */
export type FrameworkDiAdmissionKind =
  | "configuration"
  | "interface-default"
  | "registry"
  | "registration-helper"
  | "class"
  | "resource"
  | "unknown";

/** Container dependency access observed while scanning a registered provider. */
export type FrameworkDiDependencyAccess =
  | "get"
  | "get-all"
  | "get-resolver"
  | "has"
  | "find"
  | "invoke"
  | "resolve";

/** Source-level value identity used by DI world rows. */
export class FrameworkDiValueRef {
  constructor(
    /** Stable value lane. */
    readonly kind: "interface" | "class" | "class-expression" | "resource" | "registry" | "function" | "function-expression" | "object" | "value" | "unknown",
    /** Human-readable identity for rows and graph nodes. */
    readonly name: string,
    /** Exact source range for the identity when visible. */
    readonly source?: SourceRange,
  ) {}
}

/** One value admitted while spending a configuration or registry register call. */
export class FrameworkDiRegistrationAdmission {
  constructor(
    /** Stable row id. */
    readonly id: string,
    /** Owning configuration or registry path. */
    readonly owner: string,
    /** Admission lane. */
    readonly kind: FrameworkDiAdmissionKind,
    /** Value admitted by this row. */
    readonly value: FrameworkDiValueRef,
    /** Register argument path, including spread/catalog expansion. */
    readonly path: readonly string[],
    /** Exact source evidence for the admitted expression. */
    readonly source: SourceRange | undefined,
    /** Human-facing summary. */
    readonly summary: string,
  ) {}
}

/** Resolver slot produced by spending a DI registration admission. */
export class FrameworkDiResolverSlot {
  constructor(
    /** Stable row id. */
    readonly id: string,
    /** Key registered in the abstract container. */
    readonly key: FrameworkDiValueRef,
    /** Provider, alias target, callback, or instance value. */
    readonly provider: FrameworkDiValueRef,
    /** Runtime resolver strategy modeled for this slot. */
    readonly strategy: FrameworkDiResolverStrategy,
    /** Source admission that produced this slot. */
    readonly admissionId: string,
    /** Whether this row is exact, modeled, partial, or open. */
    readonly closure: FrameworkRelationshipClosure,
    /** Exact source evidence for the slot. */
    readonly source: SourceRange | undefined,
    /** Human-facing summary. */
    readonly summary: string,
  ) {}
}

/** Resource slot produced by framework resource registration fallback. */
export class FrameworkDiResourceSlot {
  constructor(
    /** Stable row id. */
    readonly id: string,
    /** Registered resource key or class identity. */
    readonly key: FrameworkDiValueRef,
    /** Resource class admitted to the container. */
    readonly resource: FrameworkDiValueRef,
    /** Source admission that produced this slot. */
    readonly admissionId: string,
    /** Exact source evidence for the slot. */
    readonly source: SourceRange | undefined,
    /** Human-facing summary. */
    readonly summary: string,
  ) {}
}

/** Dependency edge discovered from provider source after DI registration spending. */
export class FrameworkDiDependencyRow {
  constructor(
    /** Stable row id. */
    readonly id: string,
    /** Owning resolver slot. */
    readonly slotId: string,
    /** DI key whose provider owns this dependency. */
    readonly ownerKey: FrameworkDiValueRef,
    /** Provider whose source was scanned. */
    readonly ownerProvider: FrameworkDiValueRef,
    /** Dependency key requested by the provider. */
    readonly dependencyKey: FrameworkDiValueRef,
    /** Container/read mechanism. */
    readonly access: FrameworkDiDependencyAccess,
    /** Path through provider method, constructor, or class field. */
    readonly path: readonly string[],
    /** Exact dependency source. */
    readonly source: SourceRange | undefined,
    /** Exact call-site fact when this dependency came from a call expression. */
    readonly callSite: TypeScriptCallSiteEntry | undefined,
    /** Dependency key argument expression fact. */
    readonly argument: TypeScriptExpressionFact | undefined,
    /** Exact dependency key argument source. */
    readonly argumentSource: SourceRange | undefined,
    /** Human-facing summary. */
    readonly summary: string,
  ) {}
}

/** Explicit open edge left while spending DI registrations. */
export class FrameworkDiWorldOpen {
  constructor(
    /** Stable row id. */
    readonly id: string,
    /** Owning configuration/registry/provider path. */
    readonly owner: string,
    /** Short open reason. */
    readonly reason: string,
    /** Source evidence for the open boundary. */
    readonly source: SourceRange | undefined,
  ) {}
}

/** Container identities visible while scanning provider source. */
class FrameworkDiContainerScanScope {
  readonly names = new Set<string>();
  readonly properties = new Set<string>();

  constructor(
    names: Iterable<string> = [],
    properties: Iterable<string> = [],
  ) {
    for (const name of names) {
      this.names.add(name);
    }
    for (const property of properties) {
      this.properties.add(property);
    }
  }

  clone(): FrameworkDiContainerScanScope {
    return new FrameworkDiContainerScanScope(this.names, this.properties);
  }
}

/** Abstract framework DI world derived from booted source values. */
export class FrameworkDiWorld {
  constructor(
    /** Configuration export that seeded this world. */
    readonly configurationExport: string,
    /** Values admitted by configuration and nested registries. */
    readonly admissions: readonly FrameworkDiRegistrationAdmission[],
    /** Resolver slots produced by registration spending. */
    readonly resolverSlots: readonly FrameworkDiResolverSlot[],
    /** Resource slots produced by resource registration fallback. */
    readonly resourceSlots: readonly FrameworkDiResourceSlot[],
    /** Provider dependency edges found after registration spending. */
    readonly dependencies: readonly FrameworkDiDependencyRow[],
    /** Open boundaries encountered during spending. */
    readonly opens: readonly FrameworkDiWorldOpen[],
  ) {}

  /** Read dependencies for a materialization route key/provider pair. */
  readDependenciesForRoute(
    key: string,
    provider: string,
  ): readonly FrameworkDiDependencyRow[] {
    const exact = this.dependencies.filter(
      (row) => row.ownerKey.name === key && row.ownerProvider.name === provider,
    );
    if (exact.length > 0) {
      return exact;
    }
    const keyOwned = this.dependencies.filter((row) => row.ownerKey.name === key);
    if (key === provider && keyOwned.length > 0) {
      return keyOwned;
    }
    return this.dependencies.filter(
      (row) =>
        row.ownerProvider.name === provider ||
        row.ownerProvider.name === key,
    );
  }
}

/** Build/read StandardConfiguration's abstract DI world from linked framework source values. */
export function readFrameworkStandardConfigurationDiWorld(
  sourceProject: SourceProject,
): FrameworkDiWorld {
  return standardConfigurationDiWorldMemo.read(sourceProject, () =>
    new FrameworkDiWorldBuilder(sourceProject).buildConfiguration(
      "runtime-html",
      "StandardConfiguration",
    ),
  );
}

class FrameworkDiWorldBuilder {
  readonly #evaluator: StaticEvaluator;
  readonly #admissions: FrameworkDiRegistrationAdmission[] = [];
  readonly #resolverSlots: FrameworkDiResolverSlot[] = [];
  readonly #resourceSlots: FrameworkDiResourceSlot[] = [];
  readonly #dependencies: FrameworkDiDependencyRow[] = [];
  readonly #opens: FrameworkDiWorldOpen[] = [];
  readonly #spentRegistries = new Set<string>();
  readonly #spentDefaultInterfaceKeys = new Set<string>();
  readonly #dependencyScanKeys = new Set<string>();
  #admissionSequence = 0;
  #slotSequence = 0;
  #dependencySequence = 0;
  #openSequence = 0;

  constructor(readonly sourceProject: SourceProject) {
    this.#evaluator = new StaticEvaluator(sourceProject);
  }

  buildConfiguration(packageId: string, exportName: string): FrameworkDiWorld {
    const read = readFrameworkModuleBootIndex(this.sourceProject).readExportValue(
      packageId,
      exportName,
    );
    const owner = `${packageId}:${exportName}`;
    if (read.value?.kind !== EvaluationValueKind.Object) {
      this.open(owner, `Configuration ${owner} did not evaluate to an object.`, undefined);
      return this.world(owner);
    }
    const register = read.value.properties.get("register")?.value;
    if (register?.kind !== EvaluationValueKind.Function) {
      this.open(owner, `Configuration ${owner} does not expose a static register function.`, sourceRangeForValue(read.value));
      return this.world(owner);
    }
    this.spendRegisterFunction(register, owner, ["register"]);
    this.closeDefaultInterfaceDependencyGraph();
    return this.world(owner);
  }

  private world(owner: string): FrameworkDiWorld {
    return new FrameworkDiWorld(
      owner,
      [...this.#admissions],
      uniqueBy(this.#resolverSlots, (row) => `${row.key.name}:${row.provider.name}:${row.strategy}`),
      uniqueBy(this.#resourceSlots, (row) => `${row.key.name}:${row.resource.name}`),
      uniqueBy(this.#dependencies, (row) => `${row.slotId}:${row.dependencyKey.name}:${row.access}:${row.source?.filePath}:${row.source?.start.line}:${row.source?.start.character}`),
      [...this.#opens],
    );
  }

  private spendRegisterFunction(
    register: EvaluationFunctionValue,
    owner: string,
    path: readonly string[],
    thisValue: EvaluationValue | null = null,
  ): void {
    const body = register.declaration.body;
    if (body === undefined) {
      this.open(owner, "Register function has no body.", sourceRangeForValue(register));
      return;
    }
    const frame = register.environment.clone(`${owner}:di-register`);
    register.declaration.parameters.forEach((parameter, index) => {
      if (!ts.isIdentifier(parameter.name)) {
        return;
      }
      frame.initializeBinding(
        parameter.name.text,
        new EvaluationUnknownValue("Abstract DI container parameter.", parameter),
        EvaluationBindingKind.Parameter,
        true,
        parameter,
      );
      if (index === 0) {
        frame.initializeBinding(
          "$container",
          new EvaluationUnknownValue("Abstract DI container parameter.", parameter),
          EvaluationBindingKind.Parameter,
          true,
          parameter,
        );
      }
    });
    if (thisValue !== null) {
      frame.initializeBinding(
        "this",
        thisValue,
        EvaluationBindingKind.Parameter,
        false,
        sourceNodeForValue(thisValue),
      );
    }

    if (!ts.isBlock(body)) {
      this.spendRegisterExpression(body, frame, owner, path);
      return;
    }

    for (const statement of body.statements) {
      this.evaluateLocalStatement(statement, frame, owner);
      this.spendRegisterStatement(statement, frame, owner, path);
    }
  }

  private evaluateLocalStatement(
    statement: ts.Statement,
    frame: EvaluationEnvironment,
    owner: string,
  ): void {
    if (!ts.isVariableStatement(statement)) {
      return;
    }
    const bindingKind =
      (statement.declarationList.flags & ts.NodeFlags.Const) !== 0
        ? EvaluationBindingKind.Const
        : (statement.declarationList.flags & ts.NodeFlags.Let) !== 0
          ? EvaluationBindingKind.Let
          : EvaluationBindingKind.Var;
    const mutable = bindingKind !== EvaluationBindingKind.Const;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) {
        continue;
      }
      const value =
        declaration.initializer === undefined
          ? new EvaluationUnknownValue("Local declaration has no initializer.", declaration)
          : this.#evaluator.evaluateExpressionInEnvironment(
              declaration.initializer,
              frame,
              owner,
            ).value;
      frame.initializeBinding(
        declaration.name.text,
        value,
        bindingKind,
        mutable,
        declaration,
      );
    }
  }

  private spendRegisterStatement(
    statement: ts.Statement,
    frame: EvaluationEnvironment,
    owner: string,
    path: readonly string[],
  ): void {
    const visit = (node: ts.Node): void => {
      if (ts.isFunctionLike(node) || ts.isClassLike(node)) {
        return;
      }
      if (ts.isCallExpression(node)) {
        this.spendRegisterExpression(node, frame, owner, path);
      }
      ts.forEachChild(node, visit);
    };
    visit(statement);
  }

  private spendRegisterExpression(
    expression: ts.Expression,
    frame: EvaluationEnvironment,
    owner: string,
    path: readonly string[],
  ): void {
    const current = unwrapExpression(expression);
    if (!ts.isCallExpression(current)) {
      return;
    }
    if (isRegistrationProductRegisterCall(current)) {
      this.spendRegistrationHelperCall(
        current.expression.expression,
        frame,
        owner,
        [...path, "direct-register"],
      );
      return;
    }
    if (!isContainerRegisterCall(current)) {
      return;
    }
    current.arguments.forEach((argument, index) =>
      this.spendRegisterArgument(argument, frame, owner, [...path, String(index)]),
    );
  }

  private spendRegisterArgument(
    argument: ts.Expression,
    frame: EvaluationEnvironment,
    owner: string,
    path: readonly string[],
  ): void {
    if (ts.isSpreadElement(argument)) {
      const spread = this.#evaluator.evaluateExpressionInEnvironment(
        argument.expression,
        frame,
        owner,
      ).value;
      if (spread.kind !== EvaluationValueKind.Array) {
        this.open(owner, "Register spread did not evaluate to an array.", sourceRangeForNode(argument));
        return;
      }
      spread.elements.forEach((element, index) =>
      this.spendRegisterValue(
          element.value,
          element.expression ?? argument.expression,
          frame,
          owner,
          [...path, `spread:${index}`],
        ),
      );
      return;
    }
    const value = this.#evaluator.evaluateExpressionInEnvironment(argument, frame, owner).value;
    this.spendRegisterValue(value, argument, frame, owner, path);
  }

  private spendRegisterValue(
    value: EvaluationValue,
    expression: ts.Expression,
    frame: EvaluationEnvironment,
    owner: string,
    path: readonly string[],
  ): void {
    const helper = ts.isCallExpression(unwrapExpression(expression))
      ? this.spendRegistrationHelperCall(unwrapExpression(expression), frame, owner, path)
      : false;
    if (helper) {
      return;
    }

    if (value.kind === EvaluationValueKind.Object) {
      const register = value.properties.get("register")?.value;
      const ref = valueRefForValue(this.sourceProject, value, expression);
      if (register?.kind === EvaluationValueKind.Function) {
        const admission = this.admit(owner, "registry", ref, path, expression);
        const registryKey = `${admission.value.name}:${admission.source?.filePath}:${admission.source?.start.line}:${admission.source?.start.character}`;
        if (!this.#spentRegistries.has(registryKey)) {
          this.#spentRegistries.add(registryKey);
          this.spendRegisterFunction(register, admission.value.name, [...path, "registry"]);
        }
        return;
      }
      if (isInterfaceSymbolValue(value)) {
        const admission = this.admit(owner, "registry", ref, path, expression);
        this.open(admission.id, `Interface ${ref.name} has no configured default registration to spend.`, admission.source);
        return;
      }
    }

    if (value.kind === EvaluationValueKind.Class) {
      this.spendClassValue(value, expression, owner, path);
      return;
    }

    if (value.kind === EvaluationValueKind.Unknown) {
      this.open(owner, value.reason, sourceRangeForNode(expression));
      this.admit(owner, "unknown", valueRefForValue(this.sourceProject, value, expression), path, expression);
      return;
    }

    this.admit(owner, "unknown", valueRefForValue(this.sourceProject, value, expression), path, expression);
  }

  private spendRegistrationHelperCall(
    expression: ts.Expression,
    frame: EvaluationEnvironment,
    owner: string,
    path: readonly string[],
  ): boolean {
    const call = unwrapExpression(expression);
    if (!ts.isCallExpression(call)) {
      return false;
    }
    const helper = registrationHelperForCall(call);
    if (helper === null) {
      return false;
    }
    const keyArgument =
      helper === FrameworkDiResolverStrategy.Alias ? call.arguments[1] : call.arguments[0];
    const providerArgument =
      helper === FrameworkDiResolverStrategy.Alias ? call.arguments[0] : call.arguments[1];
    if (
      keyArgument === undefined ||
      providerArgument === undefined ||
      ts.isSpreadElement(keyArgument) ||
      ts.isSpreadElement(providerArgument)
    ) {
      this.open(owner, `Registration helper ${helper} does not expose key/provider arguments.`, sourceRangeForNode(call));
      return true;
    }
    const keyValue = this.#evaluator.evaluateExpressionInEnvironment(keyArgument, frame, owner).value;
    const providerValue = this.#evaluator.evaluateExpressionInEnvironment(providerArgument, frame, owner).value;
    const key = valueRefForValue(this.sourceProject, keyValue, keyArgument);
    const provider = valueRefForValue(this.sourceProject, providerValue, providerArgument);
    const admission = this.admit(owner, "registration-helper", provider, path, call);
    this.addResolverSlot(
      admission.id,
      key,
      provider,
      helper,
      FrameworkRelationshipClosure.Exact,
      sourceRangeForNode(call),
    );
    return true;
  }

  private spendClassValue(
    value: EvaluationClassValue,
    expression: ts.Expression,
    owner: string,
    path: readonly string[],
  ): void {
    const classRef = valueRefForValue(this.sourceProject, value, expression);
    const admission = this.admit(owner, "class", classRef, path, expression);
    const implementationKey = implementationRegisterKey(this.sourceProject, value);
    if (implementationKey !== null) {
      this.addResolverSlot(
        admission.id,
        implementationKey,
        classRef,
        FrameworkDiResolverStrategy.Singleton,
        FrameworkRelationshipClosure.Modeled,
        implementationKey.source ?? classRef.source,
      );
      this.addResolverSlot(
        admission.id,
        classRef,
        classRef,
        FrameworkDiResolverStrategy.Singleton,
        FrameworkRelationshipClosure.Modeled,
        classRef.source,
      );
      return;
    }

    const staticRegister = staticRegisterFunction(value);
    if (staticRegister !== null) {
      this.spendRegisterFunction(
        staticRegister,
        `${classRef.name}.register`,
        [...path, "static-register"],
        value,
      );
      return;
    }

    const metadataKeys = dynamicRegistrableMetadataKeysForClass(
      this.sourceProject,
      value,
    );
    if (metadataKeys.length > 0) {
      for (const key of metadataKeys) {
        this.addResolverSlot(
          admission.id,
          key,
          classRef,
          FrameworkDiResolverStrategy.Singleton,
          FrameworkRelationshipClosure.Modeled,
          classRef.source ?? key.source,
        );
      }
      return;
    }

    const metadataRegister = staticRegistrableMetadataRegisterFunction(
      this.sourceProject,
      value,
    );
    if (metadataRegister !== null) {
      this.spendRegisterFunction(
        metadataRegister,
        `${classRef.name}.metadata`,
        [...path, "metadata"],
        value,
      );
    }

    const resource = staticAuResourceRef(this.sourceProject, value);
    if (resource !== null) {
      this.addResourceSlot(admission.id, resource, classRef, resource.source ?? classRef.source);
      this.addResolverSlot(
        admission.id,
        classRef,
        classRef,
        FrameworkDiResolverStrategy.Singleton,
        FrameworkRelationshipClosure.Modeled,
        classRef.source,
      );
      return;
    }

    this.addResolverSlot(
      admission.id,
      classRef,
      classRef,
      FrameworkDiResolverStrategy.Singleton,
      FrameworkRelationshipClosure.Modeled,
      classRef.source,
    );
  }

  private closeDefaultInterfaceDependencyGraph(): void {
    this.scanProviderDependencies();
    for (let iteration = 0; iteration < 12; iteration++) {
      const beforeDependencyCount = this.#dependencies.length;
      const requestedKeys = new Set(
        this.#dependencies.map((row) => row.dependencyKey.name),
      );
      const added = this.spendDefaultInterfaceRegistrationsForKeys(requestedKeys);
      this.scanProviderDependencies();
      if (!added && this.#dependencies.length === beforeDependencyCount) {
        return;
      }
    }
  }

  private spendDefaultInterfaceRegistrationsForKeys(
    keys: ReadonlySet<string>,
  ): boolean {
    let added = false;
    for (const relationship of readFrameworkDiIndex(this.sourceProject).relationships) {
      if (
        relationship.mechanism !== FrameworkRelationshipMechanism.ResolverBuilder ||
        relationship.strategy === undefined ||
        (relationship.relation !== FrameworkRelationshipRelation.ProvidesKey &&
          relationship.relation !== FrameworkRelationshipRelation.AliasesKey)
      ) {
        continue;
      }
      const keyName = relationship.key ?? relationship.from.name;
      if (
        !keys.has(keyName) ||
        this.#spentDefaultInterfaceKeys.has(keyName) ||
        this.#resolverSlots.some((slot) => slot.key.name === keyName)
      ) {
        continue;
      }
      const sourceNode =
        sourceNodeForRange(this.sourceProject, relationship.to.source) ??
        sourceNodeForRange(this.sourceProject, relationship.source);
      if (sourceNode === null) {
        continue;
      }
      const key = new FrameworkDiValueRef(
        "interface",
        keyName,
        relationship.from.source ?? relationship.source,
      );
      const provider = valueRefForEndpoint(relationship.to);
      const admission = this.admit(
        "framework:createInterface-defaults",
        "interface-default",
        provider,
        [relationship.packageId, key.name],
        sourceNode,
      );
      this.addResolverSlot(
        admission.id,
        key,
        provider,
        relationship.relation === FrameworkRelationshipRelation.AliasesKey
          ? FrameworkDiResolverStrategy.Alias
          : relationship.strategy,
        FrameworkRelationshipClosure.Exact,
        relationship.to.source ?? relationship.source,
      );
      this.#spentDefaultInterfaceKeys.add(keyName);
      added = true;
    }
    return added;
  }

  private admit(
    owner: string,
    kind: FrameworkDiAdmissionKind,
    value: FrameworkDiValueRef,
    path: readonly string[],
    node: ts.Node,
  ): FrameworkDiRegistrationAdmission {
    const admission = new FrameworkDiRegistrationAdmission(
      `framework-di-world:admission:${++this.#admissionSequence}`,
      owner,
      kind,
      value,
      path,
      sourceRangeForNode(node),
      `${owner} admits ${value.name} through ${kind}.`,
    );
    this.#admissions.push(admission);
    return admission;
  }

  private addResolverSlot(
    admissionId: string,
    key: FrameworkDiValueRef,
    provider: FrameworkDiValueRef,
    strategy: FrameworkDiResolverStrategy,
    closure: FrameworkRelationshipClosure,
    source: SourceRange | undefined,
  ): FrameworkDiResolverSlot {
    const slot = new FrameworkDiResolverSlot(
      `framework-di-world:resolver:${++this.#slotSequence}`,
      key,
      provider,
      strategy,
      admissionId,
      closure,
      source,
      `${key.name} resolves through ${strategy} provider ${provider.name}.`,
    );
    this.#resolverSlots.push(slot);
    return slot;
  }

  private addResourceSlot(
    admissionId: string,
    key: FrameworkDiValueRef,
    resource: FrameworkDiValueRef,
    source: SourceRange | undefined,
  ): FrameworkDiResourceSlot {
    const slot = new FrameworkDiResourceSlot(
      `framework-di-world:resource:${++this.#slotSequence}`,
      key,
      resource,
      admissionId,
      source,
      `${resource.name} registers resource key ${key.name}.`,
    );
    this.#resourceSlots.push(slot);
    return slot;
  }

  private open(owner: string, reason: string, source: SourceRange | undefined): void {
    this.#opens.push(
      new FrameworkDiWorldOpen(
        `framework-di-world:open:${++this.#openSequence}`,
        owner,
        reason,
        source,
      ),
    );
  }

  private scanProviderDependencies(): void {
    for (const slot of this.#resolverSlots) {
      if (
        slot.strategy !== FrameworkDiResolverStrategy.Singleton &&
        slot.strategy !== FrameworkDiResolverStrategy.Transient
      ) {
        continue;
      }
      const declaration = classDeclarationForSource(this.sourceProject, slot.provider.source);
      if (declaration === null) {
        continue;
      }
      const scanKey = `${slot.id}:${slot.provider.name}`;
      if (this.#dependencyScanKeys.has(scanKey)) {
        continue;
      }
      this.#dependencyScanKeys.add(scanKey);
      const environment = classEnvironmentForDeclaration(this.sourceProject, declaration);
      this.scanClassDependencies(slot, declaration, environment, [slot.provider.name]);
    }
  }

  private scanClassDependencies(
    slot: FrameworkDiResolverSlot,
    declaration: ts.ClassLikeDeclaration,
    environment: EvaluationEnvironment,
    path: readonly string[],
    containerParameterNames: ReadonlySet<string> = new Set(),
  ): void {
    const classScope = new FrameworkDiContainerScanScope(
      containerParameterNames,
      containerPropertyNames(this.sourceProject, declaration),
    );
    for (const member of declaration.members) {
      if (ts.isPropertyDeclaration(member) && member.initializer !== undefined) {
        this.scanDependencyExpression(slot, member.initializer, environment, path, classScope);
        continue;
      }
      if (isFunctionBodyClassMember(member)) {
        const localContainers = classScope.clone();
        for (const parameter of member.parameters) {
          if (
            ts.isIdentifier(parameter.name) &&
            (parameter.name.text === "container" ||
              parameter.name.text === "c" ||
              parameterTypeIsContainerLike(this.sourceProject, parameter))
          ) {
            localContainers.names.add(parameter.name.text);
          }
        }
        collectLocalContainerBindings(this.sourceProject, member.body, localContainers);
        const memberName = ts.isConstructorDeclaration(member)
          ? "constructor"
          : propertyNameText(member.name) ?? "method";
        this.scanDependencyExpression(slot, member.body, environment, [...path, memberName], localContainers);
      }
    }
  }

  private scanDependencyExpression(
    slot: FrameworkDiResolverSlot,
    node: ts.Node,
    environment: EvaluationEnvironment,
    path: readonly string[],
    containerScope: FrameworkDiContainerScanScope,
    visitedFunctions: Set<string> = new Set(),
  ): void {
    const visit = (current: ts.Node): void => {
      if (ts.isFunctionLike(current) && current !== node) {
        return;
      }
      if (ts.isCallExpression(current)) {
        this.recordDependencyCall(slot, current, environment, path, containerScope);
        this.followFunctionCall(
          slot,
          current,
          environment,
          path,
          containerScope,
          visitedFunctions,
        );
      }
      if (ts.isNewExpression(current)) {
        this.followNewExpression(slot, current, environment, path, containerScope);
      }
      ts.forEachChild(current, visit);
    };
    visit(node);
  }

  private recordDependencyCall(
    slot: FrameworkDiResolverSlot,
    call: ts.CallExpression,
    environment: EvaluationEnvironment,
    path: readonly string[],
    containerScope: FrameworkDiContainerScanScope,
  ): void {
    const expression = unwrapExpression(call.expression);
    if (ts.isIdentifier(expression) && expression.text === "resolve") {
      const resolved = dependencyArgumentForResolveCall(call);
      if (resolved !== null) {
        this.addDependency(slot, resolved.keyExpression, environment, resolved.access, path, call);
      }
      return;
    }
    if (!ts.isPropertyAccessExpression(expression)) {
      return;
    }
    const resourceAccess = resourceStaticDependencyForCall(
      this.sourceProject,
      call,
      expression,
      containerScope,
    );
    if (resourceAccess !== null) {
      this.addDependency(
        slot,
        resourceAccess.keyExpression,
        environment,
        resourceAccess.access,
        path,
        call,
      );
      return;
    }
    const access = containerAccessForMember(expression.name.text);
    if (
      access === null ||
      !isContainerLikeReceiver(this.sourceProject, expression.expression, containerScope)
    ) {
      return;
    }
    const keyArgument = call.arguments[0];
    if (keyArgument === undefined || ts.isSpreadElement(keyArgument)) {
      return;
    }
    this.addDependency(slot, keyArgument, environment, access, path, call);
  }

  private followNewExpression(
    slot: FrameworkDiResolverSlot,
    expression: ts.NewExpression,
    environment: EvaluationEnvironment,
    path: readonly string[],
    containerScope: FrameworkDiContainerScanScope,
  ): void {
    const target = classValueForNewExpression(this.sourceProject, expression, environment);
    if (target === null || target.declaration === expression.parent) {
      return;
    }
    const constructor = target.declaration.members.find(ts.isConstructorDeclaration);
    if (constructor === undefined || constructor.body === undefined) {
      return;
    }
    const nestedContainerNames = new Set<string>();
    constructor.parameters.forEach((parameter, index) => {
      const argument = expression.arguments?.[index];
      const unwrappedArgument =
        argument === undefined || ts.isSpreadElement(argument)
          ? null
          : unwrapExpression(argument);
      if (
        unwrappedArgument !== null &&
        ts.isIdentifier(unwrappedArgument) &&
        containerScope.names.has(unwrappedArgument.text) &&
        ts.isIdentifier(parameter.name)
      ) {
        nestedContainerNames.add(parameter.name.text);
      }
    });
    if (nestedContainerNames.size === 0) {
      return;
    }
    const name = target.declaration.name?.text ?? expression.expression.getText(expression.getSourceFile());
    this.scanDependencyExpression(
      slot,
      constructor.body,
      target.environment,
      [...path, `new:${name}`, "constructor"],
      new FrameworkDiContainerScanScope(nestedContainerNames),
    );
  }

  private followFunctionCall(
    slot: FrameworkDiResolverSlot,
    call: ts.CallExpression,
    environment: EvaluationEnvironment,
    path: readonly string[],
    containerScope: FrameworkDiContainerScanScope,
    visitedFunctions: Set<string>,
  ): void {
    const target = localFunctionValueForCall(
      this.sourceProject,
      call,
      environment,
      slot.provider.source,
    );
    const body = target?.declaration.body;
    if (target === null || body === undefined || !ts.isBlock(body)) {
      return;
    }
    const functionKey = `${slot.id}:${target.declaration.getSourceFile().fileName}:${target.declaration.getStart()}`;
    if (visitedFunctions.has(functionKey)) {
      return;
    }
    visitedFunctions.add(functionKey);
    const frame = target.environment.clone(`${slot.provider.name}:call`);
    const localContainers = new FrameworkDiContainerScanScope();
    target.declaration.parameters.forEach((parameter, index) => {
      if (!ts.isIdentifier(parameter.name)) {
        return;
      }
      const argument = call.arguments[index];
      const value =
        argument === undefined || ts.isSpreadElement(argument)
          ? new EvaluationUnknownValue("Function argument is not statically visible.", parameter)
          : this.#evaluator.evaluateExpressionInEnvironment(
              argument,
              environment,
              slot.provider.name,
            ).value;
      frame.initializeBinding(
        parameter.name.text,
        value,
        EvaluationBindingKind.Parameter,
        true,
        parameter,
      );
      if (
        argument !== undefined &&
        !ts.isSpreadElement(argument) &&
        isContainerLikeExpression(this.sourceProject, argument, containerScope)
      ) {
        localContainers.names.add(parameter.name.text);
      }
    });
    collectLocalContainerBindings(this.sourceProject, body, localContainers);
    const name = functionNameText(target.declaration) ?? "function";
    this.scanDependencyExpression(
      slot,
      body,
      frame,
      [...path, `call:${name}`],
      localContainers,
      visitedFunctions,
    );
  }

  private addDependency(
    slot: FrameworkDiResolverSlot,
    keyExpression: ts.Expression,
    environment: EvaluationEnvironment,
    access: FrameworkDiDependencyAccess,
    path: readonly string[],
    sourceNode: ts.Node,
  ): void {
    const value = this.#evaluator.evaluateExpressionInEnvironment(
      keyExpression,
      environment,
      slot.provider.name,
    ).value;
    const key = valueRefForValue(this.sourceProject, value, keyExpression);
    const sourceFile = keyExpression.getSourceFile();
    const callSite = ts.isCallExpression(sourceNode)
      ? readTypeScriptCallSiteEntry(this.sourceProject, sourceFile, sourceNode)
      : null;
    const argument = readTypeScriptExpressionFact(
      this.sourceProject,
      sourceFile,
      keyExpression,
    );
    this.#dependencies.push(
      new FrameworkDiDependencyRow(
        `framework-di-world:dependency:${++this.#dependencySequence}`,
        slot.id,
        slot.key,
        slot.provider,
        key,
        access,
        path,
        sourceRangeForNode(sourceNode),
        callSite ?? undefined,
        argument,
        sourceRangeForNode(keyExpression),
        `${slot.provider.name} ${access} dependency on ${key.name}.`,
      ),
    );
  }
}

function registrationHelperForCall(
  call: ts.CallExpression,
): FrameworkDiResolverStrategy | null {
  const name = propertyOrIdentifierName(call.expression);
  switch (name) {
    case "instance":
    case "instanceRegistration":
      return FrameworkDiResolverStrategy.Instance;
    case "singleton":
    case "singletonRegistration":
      return FrameworkDiResolverStrategy.Singleton;
    case "transient":
    case "transientRegistation":
    case "transientRegistration":
      return FrameworkDiResolverStrategy.Transient;
    case "callback":
    case "callbackRegistration":
      return FrameworkDiResolverStrategy.Callback;
    case "cachedCallback":
    case "cachedCallbackRegistration":
      return FrameworkDiResolverStrategy.CachedCallback;
    case "aliasTo":
    case "aliasRegistration":
    case "aliasToRegistration":
      return FrameworkDiResolverStrategy.Alias;
    default:
      return null;
  }
}

function isContainerRegisterCall(call: ts.CallExpression): boolean {
  const expression = unwrapExpression(call.expression);
  return (
    ts.isPropertyAccessExpression(expression) &&
    expression.name.text === "register" &&
    !ts.isCallExpression(unwrapExpression(expression.expression))
  );
}

function isRegistrationProductRegisterCall(call: ts.CallExpression): call is ts.CallExpression & {
  readonly expression: ts.PropertyAccessExpression & { readonly expression: ts.CallExpression };
} {
  const expression = unwrapExpression(call.expression);
  const receiver = ts.isPropertyAccessExpression(expression)
    ? unwrapExpression(expression.expression)
    : null;
  return (
    ts.isPropertyAccessExpression(expression) &&
    expression.name.text === "register" &&
    receiver !== null &&
    ts.isCallExpression(receiver) &&
    registrationHelperForCall(receiver) !== null
  );
}

function implementationRegisterKey(
  sourceProject: SourceProject,
  value: EvaluationClassValue,
): FrameworkDiValueRef | null {
  for (const member of value.declaration.members) {
    if (!isStaticMemberNamed(member, "register") || !ts.isPropertyDeclaration(member) || member.initializer === undefined) {
      continue;
    }
    const initializer = unwrapExpression(member.initializer);
    if (!ts.isCallExpression(initializer) || propertyOrIdentifierName(initializer.expression) !== "createImplementationRegister") {
      continue;
    }
    const keyArgument = initializer.arguments[0];
    if (keyArgument === undefined || ts.isSpreadElement(keyArgument)) {
      continue;
    }
    const keyValue = new StaticEvaluator(sourceProject).evaluateExpressionInEnvironment(
      keyArgument,
      value.environment,
      value.declaration.getSourceFile().fileName,
    ).value;
    return valueRefForValue(sourceProject, keyValue, keyArgument);
  }
  return null;
}

function dynamicRegistrableMetadataKeysForClass(
  sourceProject: SourceProject,
  value: EvaluationClassValue,
): readonly FrameworkDiValueRef[] {
  const helperCall = enclosingClassHelperCall(value.declaration);
  if (
    helperCall === null ||
    propertyOrIdentifierName(helperCall.expression) !== "renderer"
  ) {
    return [];
  }
  return implementedDiKeysForClass(sourceProject, value.declaration);
}

function enclosingClassHelperCall(
  declaration: ts.ClassLikeDeclaration,
): ts.CallExpression | null {
  const parent = declaration.parent;
  if (!ts.isCallExpression(parent)) {
    return null;
  }
  return parent.arguments.some(
    (argument) => !ts.isSpreadElement(argument) && unwrapExpression(argument) === declaration,
  )
    ? parent
    : null;
}

function implementedDiKeysForClass(
  sourceProject: SourceProject,
  declaration: ts.ClassLikeDeclaration,
): readonly FrameworkDiValueRef[] {
  const implementedNames = implementedInterfaceNames(declaration);
  if (implementedNames.size === 0) {
    return [];
  }
  return uniqueBy(
    readFrameworkDiIndex(sourceProject).keys
      .filter(
        (row) =>
          implementedNames.has(row.exportName) ||
          implementedNames.has(row.interfaceKey),
      )
      .map(
        (row) =>
          new FrameworkDiValueRef(
            "interface",
            row.interfaceKey,
            row.source,
          ),
      ),
    (row) => row.name,
  );
}

function implementedInterfaceNames(
  declaration: ts.ClassLikeDeclaration,
): ReadonlySet<string> {
  const names = new Set<string>();
  for (const clause of declaration.heritageClauses ?? []) {
    if (clause.token !== ts.SyntaxKind.ImplementsKeyword) {
      continue;
    }
    for (const type of clause.types) {
      names.add(type.expression.getText(type.getSourceFile()));
    }
  }
  return names;
}

function staticRegisterFunction(value: EvaluationClassValue): EvaluationFunctionValue | null {
  for (const member of value.declaration.members) {
    if (isStaticMemberNamed(member, "register") && ts.isMethodDeclaration(member)) {
      return new EvaluationFunctionValue(member, value.environment, member);
    }
  }
  return null;
}

function staticRegistrableMetadataRegisterFunction(
  sourceProject: SourceProject,
  value: EvaluationClassValue,
): EvaluationFunctionValue | null {
  const registry = staticRegistrableMetadataRegistryValue(sourceProject, value);
  return registry === null ? null : registerFunctionForObject(registry);
}

function staticRegistrableMetadataRegistryValue(
  sourceProject: SourceProject,
  value: EvaluationClassValue,
): EvaluationValue | null {
  const evaluator = new StaticEvaluator(sourceProject);
  for (const member of value.declaration.members) {
    if (
      !ts.isPropertyDeclaration(member) ||
      member.initializer === undefined ||
      !isStaticClassElement(member)
    ) {
      continue;
    }
    const name = propertyNameText(member.name);
    if (name === "register" || name === "$au") {
      continue;
    }
    const evaluated = evaluator.evaluateExpressionInEnvironment(
      member.initializer,
      value.environment,
      value.declaration.getSourceFile().fileName,
    ).value;
    if (registerFunctionForObject(evaluated) !== null) {
      return evaluated;
    }
    if (evaluated.kind !== EvaluationValueKind.Object) {
      continue;
    }
    for (const property of evaluated.properties.values()) {
      if (registerFunctionForObject(property.value) !== null) {
        return property.value;
      }
    }
  }
  return null;
}

function registerFunctionForObject(
  value: EvaluationValue,
): EvaluationFunctionValue | null {
  if (value.kind !== EvaluationValueKind.Object) {
    return null;
  }
  const register = value.properties.get("register")?.value;
  return register?.kind === EvaluationValueKind.Function ? register : null;
}

function staticAuResourceRef(
  sourceProject: SourceProject,
  value: EvaluationClassValue,
): FrameworkDiValueRef | null {
  for (const member of value.declaration.members) {
    if (!isStaticMemberNamed(member, "$au") || !ts.isPropertyDeclaration(member) || member.initializer === undefined) {
      continue;
    }
    const evaluated = new StaticEvaluator(sourceProject).evaluateExpressionInEnvironment(
      member.initializer,
      value.environment,
      value.declaration.getSourceFile().fileName,
    ).value;
    if (evaluated.kind !== EvaluationValueKind.Object) {
      continue;
    }
    const type = stringProperty(evaluated, "type");
    const name = stringProperty(evaluated, "name");
    if (type === null || name === null) {
      continue;
    }
    return new FrameworkDiValueRef(
      "resource",
      `${type}:${name}`,
      sourceRangeForNode(member),
    );
  }
  return null;
}

function classValueForNewExpression(
  sourceProject: SourceProject,
  expression: ts.NewExpression,
  environment: EvaluationEnvironment,
): EvaluationClassValue | null {
  const target = unwrapExpression(expression.expression);
  if (ts.isIdentifier(target)) {
    const value = environment.readValue(target.text);
    if (value?.kind === EvaluationValueKind.Class) {
      return value;
    }
  }
  const symbol = sourceProject.checker.getSymbolAtLocation(target);
  const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
  return declaration !== undefined && ts.isClassLike(declaration)
    ? new EvaluationClassValue(declaration, classEnvironmentForDeclaration(sourceProject, declaration), declaration)
    : null;
}

function localFunctionValueForCall(
  sourceProject: SourceProject,
  call: ts.CallExpression,
  environment: EvaluationEnvironment,
  providerSource: SourceRange | undefined,
): EvaluationFunctionValue | null {
  const expression = unwrapExpression(call.expression);
  if (!ts.isIdentifier(expression)) {
    return null;
  }
  const value = environment.readValue(expression.text);
  const candidate =
    value?.kind === EvaluationValueKind.Function
      ? value
      : functionValueForSymbol(sourceProject, expression);
  if (candidate === null || providerSource === undefined) {
    return null;
  }
  return sameSourceFilePath(
    candidate.declaration.getSourceFile().fileName,
    providerSource.filePath,
  )
    ? candidate
    : null;
}

function functionValueForSymbol(
  sourceProject: SourceProject,
  expression: ts.Identifier,
): EvaluationFunctionValue | null {
  const symbol = sourceProject.checker.getSymbolAtLocation(expression);
  const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
  if (
    declaration === undefined ||
    (!ts.isFunctionDeclaration(declaration) &&
      !ts.isFunctionExpression(declaration) &&
      !ts.isArrowFunction(declaration))
  ) {
    return null;
  }
  return new EvaluationFunctionValue(
    declaration,
    functionEnvironmentForDeclaration(sourceProject, declaration),
    declaration,
  );
}

function functionEnvironmentForDeclaration(
  sourceProject: SourceProject,
  declaration: ts.FunctionLikeDeclaration,
): EvaluationEnvironment {
  const sourceFile = declaration.getSourceFile();
  const boot = readFrameworkModuleBootIndex(sourceProject);
  const identity = sourceProject.sourceFileIdentity(sourceFile);
  const packageId = identity?.packageId;
  if (packageId !== undefined && packageId !== null) {
    const packageBoot = boot.readPackage(packageId);
    const moduleKey = identity?.repoPath ?? sourceFile.fileName.replace(/\\/gu, "/");
    const result = packageBoot?.evaluator.evaluateModule(moduleKey);
    if (result !== undefined && result !== null) {
      return result.environment;
    }
  }
  return new EvaluationEnvironment(sourceFile.fileName);
}

function classEnvironmentForDeclaration(
  sourceProject: SourceProject,
  declaration: ts.ClassLikeDeclaration,
): EvaluationEnvironment {
  const sourceFile = declaration.getSourceFile();
  const boot = readFrameworkModuleBootIndex(sourceProject);
  const identity = sourceProject.sourceFileIdentity(sourceFile);
  const packageId = identity?.packageId;
  if (packageId !== undefined && packageId !== null) {
    const packageBoot = boot.readPackage(packageId);
    const moduleKey = identity?.repoPath ?? sourceFile.fileName.replace(/\\/gu, "/");
    const result = packageBoot?.evaluator.evaluateModule(moduleKey);
    const className = declaration.name?.text;
    const classValue = className === undefined ? null : result?.environment.readValue(className);
    if (classValue?.kind === EvaluationValueKind.Class) {
      return classValue.environment;
    }
    if (result !== undefined && result !== null) {
      return result.environment;
    }
  }
  return new EvaluationEnvironment(sourceFile.fileName);
}

function sameSourceFilePath(left: string, right: string): boolean {
  return left.replace(/\\/gu, "/") === right.replace(/\\/gu, "/");
}

function classDeclarationForSource(
  sourceProject: SourceProject,
  source: SourceRange | undefined,
): ts.ClassLikeDeclaration | null {
  if (source === undefined) {
    return null;
  }
  const sourceFile = sourceProject.readSourceFile(source.filePath);
  if (sourceFile === null) {
    return null;
  }
  const position = sourceFile.getPositionOfLineAndCharacter(
    source.start.line,
    source.start.character,
  );
  let found: ts.ClassLikeDeclaration | null = null;
  let symbolBacked: ts.ClassLikeDeclaration | null = null;
  const visit = (node: ts.Node): void => {
    if (found !== null) {
      return;
    }
    if (ts.isClassLike(node) && node.getStart(sourceFile) === position) {
      found = node;
      return;
    }
    if (
      symbolBacked === null &&
      node.getStart(sourceFile) === position &&
      (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node))
    ) {
      const symbol = sourceProject.checker.getSymbolAtLocation(node);
      const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
      if (declaration !== undefined && ts.isClassLike(declaration)) {
        symbolBacked = declaration;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found ?? symbolBacked;
}

function sourceNodeForRange(
  sourceProject: SourceProject,
  source: SourceRange | undefined,
): ts.Node | null {
  if (source === undefined) {
    return null;
  }
  const sourceFile = sourceProject.readSourceFile(source.filePath);
  if (sourceFile === null) {
    return null;
  }
  const position = sourceFile.getPositionOfLineAndCharacter(
    source.start.line,
    source.start.character,
  );
  let found: ts.Node | null = null;
  const visit = (node: ts.Node): void => {
    if (found !== null) {
      return;
    }
    if (node.getStart(sourceFile) === position) {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found ?? sourceFile;
}

function valueRefForEndpoint(
  endpoint: FrameworkRelationshipEndpoint,
): FrameworkDiValueRef {
  switch (endpoint.kind) {
    case FrameworkRelationshipEndpointKind.DiKey:
      return new FrameworkDiValueRef("interface", endpoint.name, endpoint.source);
    case FrameworkRelationshipEndpointKind.Expression:
    case FrameworkRelationshipEndpointKind.Symbol:
      return new FrameworkDiValueRef("class", endpoint.name, endpoint.source);
    case FrameworkRelationshipEndpointKind.Resource:
      return new FrameworkDiValueRef("resource", endpoint.name, endpoint.source);
    case FrameworkRelationshipEndpointKind.RegistryExport:
    case FrameworkRelationshipEndpointKind.RegistrationCatalog:
      return new FrameworkDiValueRef("registry", endpoint.name, endpoint.source);
    default:
      return new FrameworkDiValueRef("value", endpoint.name, endpoint.source);
  }
}

function valueRefForValue(
  sourceProject: SourceProject,
  value: EvaluationValue,
  expression: ts.Node,
): FrameworkDiValueRef {
  const source = sourceRangeForValue(value) ?? sourceRangeForNode(expression);
  switch (value.kind) {
    case EvaluationValueKind.Class:
      return new FrameworkDiValueRef(
        value.declaration.name === undefined ? "class-expression" : "class",
        value.declaration.name?.text ?? expression.getText(expression.getSourceFile()),
        source,
      );
    case EvaluationValueKind.Object:
      if (isInterfaceSymbolValue(value)) {
        return new FrameworkDiValueRef(
          "interface",
          interfaceFriendlyName(value) ?? expression.getText(expression.getSourceFile()),
          source,
        );
      }
      return new FrameworkDiValueRef(
        value.properties.has("register") ? "registry" : "object",
        expression.getText(expression.getSourceFile()),
        source,
      );
    case EvaluationValueKind.Function:
      const name = functionNameText(value.declaration);
      return new FrameworkDiValueRef(
        name === null ? "function-expression" : "function",
        name ?? expression.getText(expression.getSourceFile()),
        source,
      );
    case EvaluationValueKind.String:
      return new FrameworkDiValueRef("value", value.value, source);
    case EvaluationValueKind.Unknown: {
      const symbol = sourceProject.checker.getSymbolAtLocation(expression);
      return new FrameworkDiValueRef(
        "unknown",
        symbol?.getName() ?? expression.getText(expression.getSourceFile()),
        source,
      );
    }
    default:
      return new FrameworkDiValueRef(
        "value",
        expression.getText(expression.getSourceFile()),
        source,
      );
  }
}

function sourceNodeForValue(value: EvaluationValue): ts.Node | null {
  return "node" in value ? value.node : null;
}

function sourceRangeForValue(value: EvaluationValue): SourceRange | undefined {
  const node = sourceNodeForValue(value);
  return node === null ? undefined : sourceRangeForNode(node);
}

function sourceRangeForNode(node: ts.Node | undefined): SourceRange | undefined {
  if (node === undefined) {
    return undefined;
  }
  const sourceFile = node.getSourceFile();
  return sourceRangeForSpan(sourceFile.fileName, sourceSpan(sourceFile, node));
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

function isStaticMemberNamed(member: ts.ClassElement, name: string): boolean {
  return (
    isStaticClassElement(member) &&
    propertyNameText((member as { readonly name?: ts.PropertyName }).name) === name
  );
}

function isStaticClassElement(member: ts.ClassElement): boolean {
  return (
    ts.canHaveModifiers(member) &&
    ts.getModifiers(member)?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword) === true
  );
}

function propertyNameText(name: ts.PropertyName | undefined): string | null {
  if (name === undefined) {
    return null;
  }
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  if (ts.isPrivateIdentifier(name)) {
    return name.getText(name.getSourceFile());
  }
  return null;
}

function propertyOrIdentifierName(expression: ts.Expression): string | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return current.text;
  }
  if (ts.isPropertyAccessExpression(current)) {
    return current.name.text;
  }
  return null;
}

type FunctionBodyClassMember =
  | ts.MethodDeclaration
  | ts.ConstructorDeclaration
  | ts.GetAccessorDeclaration
  | ts.SetAccessorDeclaration;

function isFunctionBodyClassMember(
  member: ts.ClassElement,
): member is FunctionBodyClassMember & { readonly body: ts.Block } {
  return (
    (ts.isMethodDeclaration(member) ||
      ts.isConstructorDeclaration(member) ||
      ts.isGetAccessorDeclaration(member) ||
      ts.isSetAccessorDeclaration(member)) &&
    member.body !== undefined
  );
}

function containerPropertyNames(
  sourceProject: SourceProject,
  declaration: ts.ClassLikeDeclaration,
): readonly string[] {
  const properties = new Set<string>();
  for (const member of declaration.members) {
    if (ts.isPropertyDeclaration(member)) {
      const name = propertyNameText(member.name);
      if (
        name !== null &&
        (memberTypeIsContainerLike(sourceProject, member) ||
          (member.initializer !== undefined &&
            isContainerLikeExpression(
              sourceProject,
              member.initializer,
              new FrameworkDiContainerScanScope(),
            )))
      ) {
        properties.add(name);
      }
    }
    if (isFunctionBodyClassMember(member)) {
      const scope = new FrameworkDiContainerScanScope([], properties);
      collectLocalContainerBindings(sourceProject, member.body, scope);
      for (const property of scope.properties) {
        properties.add(property);
      }
    }
  }
  return [...properties];
}

function collectLocalContainerBindings(
  sourceProject: SourceProject,
  node: ts.Node,
  scope: FrameworkDiContainerScanScope,
): void {
  const visit = (current: ts.Node): void => {
    if (ts.isFunctionLike(current) && current !== node) {
      return;
    }
    if (ts.isVariableDeclaration(current) && current.initializer !== undefined) {
      if (
        ts.isIdentifier(current.name) &&
        isContainerLikeExpression(sourceProject, current.initializer, scope)
      ) {
        scope.names.add(current.name.text);
      }
    }
    if (ts.isBinaryExpression(current) && isAssignmentOperator(current.operatorToken.kind)) {
      const rightIsContainer = isContainerLikeExpression(sourceProject, current.right, scope);
      if (rightIsContainer && ts.isIdentifier(current.left)) {
        scope.names.add(current.left.text);
      }
      if (rightIsContainer && isThisPropertyAccess(current.left)) {
        scope.properties.add(current.left.name.text);
      }
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
}

interface ResolveDependencyArgument {
  readonly keyExpression: ts.Expression;
  readonly access: FrameworkDiDependencyAccess;
}

function dependencyArgumentForResolveCall(
  call: ts.CallExpression,
): ResolveDependencyArgument | null {
  const argument = call.arguments[0];
  if (argument === undefined || ts.isSpreadElement(argument)) {
    return null;
  }
  const unwrapped = unwrapExpression(argument);
  if (ts.isCallExpression(unwrapped)) {
    const wrapper = propertyOrIdentifierName(unwrapped.expression);
    const keyExpression = unwrapped.arguments[0];
    if (keyExpression !== undefined && !ts.isSpreadElement(keyExpression)) {
      return {
        keyExpression,
        access:
          wrapper === "all" || wrapper === "allResources"
            ? "get-all"
            : "resolve",
      };
    }
  }
  return {
    keyExpression: argument,
    access: "resolve",
  };
}

function functionNameText(declaration: ts.FunctionLikeDeclaration): string | null {
  const name = declaration.name;
  return name === undefined ? null : propertyNameText(name);
}

function unwrapExpression<T extends ts.Node>(node: T): T;
function unwrapExpression(node: ts.Expression): ts.Expression;
function unwrapExpression(node: ts.Node): ts.Node {
  let current = node;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function isInterfaceSymbolValue(value: EvaluationValue): boolean {
  if (value.kind !== EvaluationValueKind.Object) {
    return false;
  }
  const marker = value.properties.get("$isInterface")?.value;
  return marker?.kind === EvaluationValueKind.Boolean && marker.value;
}

function interfaceFriendlyName(value: EvaluationValue): string | null {
  if (value.kind !== EvaluationValueKind.Object) {
    return null;
  }
  const friendly = value.properties.get("friendlyName")?.value;
  return friendly?.kind === EvaluationValueKind.String ? friendly.value : null;
}

function stringProperty(value: EvaluationValue, key: string): string | null {
  if (value.kind !== EvaluationValueKind.Object) {
    return null;
  }
  const property = value.properties.get(key)?.value;
  return property?.kind === EvaluationValueKind.String ? property.value : null;
}

function containerAccessForMember(name: string): FrameworkDiDependencyAccess | null {
  switch (name) {
    case "get":
      return "get";
    case "getAll":
      return "get-all";
    case "getResolver":
      return "get-resolver";
    case "has":
      return "has";
    case "find":
      return "find";
    case "invoke":
      return "invoke";
    default:
      return null;
  }
}

interface ResourceStaticDependency {
  readonly keyExpression: ts.Expression;
  readonly access: FrameworkDiDependencyAccess;
}

const RESOURCE_STATIC_LOOKUP_NAMES = new Set([
  "BindingBehavior",
  "BindingCommand",
  "CustomAttribute",
  "CustomElement",
  "ValueConverter",
]);

function resourceStaticDependencyForCall(
  sourceProject: SourceProject,
  call: ts.CallExpression,
  expression: ts.PropertyAccessExpression,
  containerScope: FrameworkDiContainerScanScope,
): ResourceStaticDependency | null {
  const firstArgument = call.arguments[0];
  if (
    firstArgument === undefined ||
    ts.isSpreadElement(firstArgument) ||
    !isContainerLikeExpression(sourceProject, firstArgument, containerScope)
  ) {
    return null;
  }
  const receiver = unwrapExpression(expression.expression);
  const receiverName = ts.isIdentifier(receiver) ? receiver.text : null;
  if (
    receiverName === null ||
    !RESOURCE_STATIC_LOOKUP_NAMES.has(receiverName)
  ) {
    return null;
  }
  switch (expression.name.text) {
    case "find":
      return { keyExpression: receiver, access: "find" };
    case "get":
      return { keyExpression: receiver, access: "get" };
    default:
      return null;
  }
}

function isContainerLikeReceiver(
  sourceProject: SourceProject,
  expression: ts.Expression,
  containerScope: FrameworkDiContainerScanScope,
): boolean {
  return isContainerLikeExpression(sourceProject, expression, containerScope);
}

function isContainerLikeExpression(
  sourceProject: SourceProject,
  expression: ts.Expression,
  containerScope: FrameworkDiContainerScanScope,
): boolean {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return (
      containerScope.names.has(current.text) ||
      expressionTypeIsContainerLike(sourceProject, current)
    );
  }
  if (isThisPropertyAccess(current)) {
    return (
      containerScope.properties.has(current.name.text) ||
      expressionTypeIsContainerLike(sourceProject, current)
    );
  }
  if (ts.isPropertyAccessExpression(current)) {
    if (current.name.text === "root") {
      return isContainerLikeExpression(sourceProject, current.expression, containerScope);
    }
    return expressionTypeIsContainerLike(sourceProject, current);
  }
  if (ts.isBinaryExpression(current) && isAssignmentOperator(current.operatorToken.kind)) {
    return isContainerLikeExpression(sourceProject, current.right, containerScope);
  }
  if (ts.isCallExpression(current) && isResolveIContainerCall(current)) {
    return true;
  }
  if (ts.isCallExpression(current)) {
    return expressionTypeIsContainerLike(sourceProject, current);
  }
  return false;
}

function isResolveIContainerCall(call: ts.CallExpression): boolean {
  const expression = unwrapExpression(call.expression);
  if (!ts.isIdentifier(expression) || expression.text !== "resolve") {
    return false;
  }
  const resolved = dependencyArgumentForResolveCall(call);
  if (resolved === null) {
    return false;
  }
  return expressionText(resolved.keyExpression) === "IContainer";
}

function isThisPropertyAccess(
  expression: ts.Expression,
): expression is ts.PropertyAccessExpression {
  const current = unwrapExpression(expression);
  return (
    ts.isPropertyAccessExpression(current) &&
    current.expression.kind === ts.SyntaxKind.ThisKeyword
  );
}

function parameterTypeIsContainerLike(
  sourceProject: SourceProject,
  parameter: ts.ParameterDeclaration,
): boolean {
  return typeIsContainerLike(
    sourceProject.checker.getTypeAtLocation(parameter),
    sourceProject,
  );
}

function memberTypeIsContainerLike(
  sourceProject: SourceProject,
  member: ts.PropertyDeclaration,
): boolean {
  return typeIsContainerLike(
    sourceProject.checker.getTypeAtLocation(member),
    sourceProject,
  );
}

function expressionTypeIsContainerLike(
  sourceProject: SourceProject,
  expression: ts.Expression,
): boolean {
  return typeIsContainerLike(
    sourceProject.checker.getTypeAtLocation(expression),
    sourceProject,
  );
}

function typeIsContainerLike(
  type: ts.Type,
  sourceProject: SourceProject,
  seen = new Set<ts.Type>(),
): boolean {
  if (seen.has(type)) {
    return false;
  }
  seen.add(type);
  if (
    type.symbol?.getName() === "IContainer" ||
    type.aliasSymbol?.getName() === "IContainer"
  ) {
    return true;
  }
  if (type.isUnionOrIntersection()) {
    return type.types.some((part) =>
      typeIsContainerLike(part, sourceProject, seen),
    );
  }
  if ((type.flags & ts.TypeFlags.TypeParameter) !== 0) {
    const constraint = sourceProject.checker.getBaseConstraintOfType(type);
    return constraint === undefined || constraint === type
      ? false
      : typeIsContainerLike(constraint, sourceProject, seen);
  }
  return false;
}

function expressionText(expression: ts.Expression): string {
  return unwrapExpression(expression).getText(expression.getSourceFile());
}

function isAssignmentOperator(kind: ts.SyntaxKind): boolean {
  return kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment;
}

function uniqueBy<T>(rows: readonly T[], keyFor: (row: T) => string): readonly T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const row of rows) {
    const key = keyFor(row);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(row);
  }
  return unique;
}
