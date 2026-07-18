import { SemanticClaim } from '../kernel/claim.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { CompilerIdentity } from '../kernel/identity.js';
import { MaterializedProduct } from '../kernel/materialization.js';
import type { KernelStore, KernelStoreReadView, KernelStoreRecord } from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { AttributePatternDefinition } from '../resources/attribute-pattern-definition.js';
import type { BindingCommandDefinition } from '../resources/binding-command-definition.js';
import type { ResourceTargetReference } from '../resources/resource-reference.js';
import {
  AttributePatternExecutable,
  AttributePatternExecutionKind,
  CompiledAttributePattern,
  compileAttributePatternDefinition,
} from './attribute-syntax.js';
import {
  BindingCommandExecutable,
  BindingCommandExecutionKind,
} from './binding-command-execution.js';
import type {
  BuiltInAttributePattern,
  BuiltInBindingCommand,
} from './built-in-syntax.js';

export interface CompilerAttributePatternResource {
  readonly handler: BuiltInAttributePattern | null;
  readonly executable: AttributePatternExecutable;
  readonly compiledPatterns: readonly CompiledAttributePattern[];
  readonly definition: AttributePatternDefinition | null;
  readonly registrationSourceAddressHandle: AddressHandle | null;
}

export interface CompilerBindingCommandResource {
  readonly handler: BuiltInBindingCommand | null;
  readonly executable: BindingCommandExecutable;
  readonly definition: BindingCommandDefinition | null;
  readonly registrationSourceAddressHandle: AddressHandle | null;
}

export class SourceAttributePatternResource implements CompilerAttributePatternResource {
  readonly handler = null;

  constructor(
    readonly executable: AttributePatternExecutable,
    readonly compiledPatterns: readonly CompiledAttributePattern[],
    readonly definition: AttributePatternDefinition,
    readonly registrationSourceAddressHandle: AddressHandle | null,
  ) {}
}

export class SourceBindingCommandResource implements CompilerBindingCommandResource {
  readonly handler = null;

  constructor(
    readonly executable: BindingCommandExecutable,
    readonly definition: BindingCommandDefinition,
    readonly registrationSourceAddressHandle: AddressHandle | null,
  ) {}
}

export class AttributePatternExecutablePublication {
  constructor(
    readonly executable: AttributePatternExecutable,
    readonly compiledPatterns: readonly CompiledAttributePattern[],
    readonly records: readonly KernelStoreRecord[],
    readonly claimHandles: readonly ReturnType<KernelStore['handles']['claim']>[],
  ) {}
}

export class BindingCommandExecutablePublication {
  constructor(
    readonly executable: BindingCommandExecutable,
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

export interface AttributePatternExecutableMaterializationInput {
  readonly localKey: string;
  readonly ownerIdentityHandle: IdentityHandle;
  readonly definitionProductHandle: ProductHandle | null;
  readonly target: ResourceTargetReference | null;
  readonly patterns: AttributePatternDefinition['patterns'];
  readonly executionKind: AttributePatternExecutionKind;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly provenanceHandle: ProvenanceHandle;
}

export interface BindingCommandExecutableMaterializationInput {
  readonly localKey: string;
  readonly ownerIdentityHandle: IdentityHandle;
  readonly definitionProductHandle: ProductHandle | null;
  readonly target: ResourceTargetReference | null;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly key: string;
  readonly ignoreAttr: boolean | null;
  readonly executionKind: BindingCommandExecutionKind;
  readonly sourceAddressHandle: AddressHandle | null;
  readonly provenanceHandle: ProvenanceHandle;
}

/** Publishes syntax-resource executables shared by framework catalogs and source registrations. */
export class SyntaxResourceExecutableMaterializer {
  constructor(private readonly store: KernelStoreReadView) {}

  materializeAttributePattern(
    input: AttributePatternExecutableMaterializationInput,
  ): AttributePatternExecutablePublication {
    const executableProductHandle = this.store.handles.product(input.localKey);
    const executableIdentityHandle = this.store.handles.identity(input.localKey);
    const executable = new AttributePatternExecutable(
      executableProductHandle,
      executableIdentityHandle,
      input.definitionProductHandle,
      input.target,
      input.patterns,
      input.executionKind,
      input.sourceAddressHandle,
      [],
    );
    const records: KernelStoreRecord[] = [
      new CompilerIdentity(
        executableIdentityHandle,
        KernelVocabulary.Compiler.AttributePatternExecutable.key,
        input.ownerIdentityHandle,
        input.sourceAddressHandle,
        input.target?.localName ?? null,
      ),
      new MaterializedProduct(
        executableProductHandle,
        KernelVocabulary.Compiler.AttributePatternExecutable.key,
        executableIdentityHandle,
        input.sourceAddressHandle,
        input.provenanceHandle,
      ),
    ];
    const compiledPatterns = input.patterns.map((definition, index) => {
      const local = `${input.localKey}:compiled-pattern:${index}`;
      const productHandle = this.store.handles.product(local);
      const identityHandle = this.store.handles.identity(local);
      const compiled = compileAttributePatternDefinition(definition);
      const pattern = new CompiledAttributePattern(
        productHandle,
        identityHandle,
        definition,
        compiled.tokens,
        compiled.score,
        compiled.symbols,
        executableProductHandle,
        definition.addressHandle ?? input.sourceAddressHandle,
      );
      records.push(
        new CompilerIdentity(
          identityHandle,
          KernelVocabulary.Compiler.CompiledAttributePattern.key,
          executableIdentityHandle,
          pattern.sourceAddressHandle,
          definition.pattern,
        ),
        new MaterializedProduct(
          productHandle,
          KernelVocabulary.Compiler.CompiledAttributePattern.key,
          identityHandle,
          pattern.sourceAddressHandle,
          input.provenanceHandle,
        ),
      );
      return pattern;
    });
    const claims = compiledPatterns.map((pattern, index) => new SemanticClaim(
      this.store.handles.claim(`${input.localKey}:compiles-attribute-pattern:${index}`),
      executableProductHandle,
      KernelVocabulary.Compiler.CompilesAttributePattern.key,
      pattern.productHandle,
      input.provenanceHandle,
    ));
    records.push(...claims);
    return new AttributePatternExecutablePublication(
      executable,
      compiledPatterns,
      records,
      claims.map((claim) => claim.handle),
    );
  }

  materializeBindingCommand(
    input: BindingCommandExecutableMaterializationInput,
  ): BindingCommandExecutablePublication {
    const productHandle = this.store.handles.product(input.localKey);
    const identityHandle = this.store.handles.identity(input.localKey);
    const executable = new BindingCommandExecutable(
      productHandle,
      identityHandle,
      input.definitionProductHandle,
      input.target,
      input.name,
      input.aliases,
      input.key,
      input.ignoreAttr,
      input.executionKind,
      input.sourceAddressHandle,
      [],
    );
    const records = [
      new CompilerIdentity(
        identityHandle,
        KernelVocabulary.Compiler.BindingCommandExecutable.key,
        input.ownerIdentityHandle,
        input.sourceAddressHandle,
        input.name,
      ),
      new MaterializedProduct(
        productHandle,
        KernelVocabulary.Compiler.BindingCommandExecutable.key,
        identityHandle,
        input.sourceAddressHandle,
        input.provenanceHandle,
      ),
    ];
    return new BindingCommandExecutablePublication(executable, records);
  }
}
