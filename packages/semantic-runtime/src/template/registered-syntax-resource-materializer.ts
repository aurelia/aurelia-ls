import { MaterializationRecord } from '../kernel/materialization.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import { AttributePatternDefinition } from '../resources/attribute-pattern-definition.js';
import { BindingCommandDefinition } from '../resources/binding-command-definition.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import type { ResourceRegistrationAdmission } from '../registration/registration-admission.js';
import type { TemplateVisibleResource } from './compiler-world-reference.js';
import {
  AttributePatternExecutionKind,
} from './attribute-syntax.js';
import {
  BindingCommandExecutionKind,
} from './binding-command-execution.js';
import {
  SourceAttributePatternResource,
  SourceBindingCommandResource,
  SyntaxResourceExecutableMaterializer,
} from './syntax-resource-materializer.js';
import { TemplateProductDetails } from './product-details.js';

export class RegisteredSyntaxResourceEmission {
  constructor(
    readonly attributePatterns: readonly SourceAttributePatternResource[],
    readonly bindingCommands: readonly SourceBindingCommandResource[],
    readonly records: readonly KernelStoreRecord[],
  ) {}
}

export interface RegisteredSyntaxResourceMaterializationInput {
  readonly localKey: string;
  readonly admissions: readonly ResourceRegistrationAdmission[];
  readonly visibleResources: readonly TemplateVisibleResource[];
  readonly resourceDefinitions: ResourceDefinitionIndex | null;
}

/** Projects source-registered compiler resources onto the shared syntax executable products. */
export class RegisteredSyntaxResourceMaterializer {
  private readonly executables: SyntaxResourceExecutableMaterializer;

  constructor(private readonly store: KernelStore) {
    this.executables = new SyntaxResourceExecutableMaterializer(store);
  }

  materialize(input: RegisteredSyntaxResourceMaterializationInput): RegisteredSyntaxResourceEmission {
    const records: KernelStoreRecord[] = [];
    const attributePatterns: SourceAttributePatternResource[] = [];
    const bindingCommands: SourceBindingCommandResource[] = [];
    const visibleBindingCommandDefinitions = new Set(input.visibleResources.flatMap((resource) =>
      resource.definition instanceof BindingCommandDefinition && resource.definition.productHandle != null
        ? [resource.definition.productHandle]
        : []
    ));
    const seenBindingCommandDefinitions = new Set<NonNullable<BindingCommandDefinition['productHandle']>>();

    input.admissions.forEach((admission, index) => {
      const definition = input.resourceDefinitions?.lookupByProduct(admission.registeredValue.productHandle) ?? null;
      if (definition instanceof AttributePatternDefinition) {
        const publication = this.attributePattern(
          `${input.localKey}:attribute-pattern:${index}`,
          definition,
          admission,
        );
        if (publication != null) {
          attributePatterns.push(publication.resource);
          records.push(...publication.records);
        }
        return;
      }
      if (
        !(definition instanceof BindingCommandDefinition)
        || definition.productHandle == null
        || !visibleBindingCommandDefinitions.has(definition.productHandle)
        || seenBindingCommandDefinitions.has(definition.productHandle)
      ) {
        return;
      }
      seenBindingCommandDefinitions.add(definition.productHandle);
      const publication = this.bindingCommand(
        `${input.localKey}:binding-command:${index}`,
        definition,
        admission,
      );
      if (publication != null) {
        bindingCommands.push(publication.resource);
        records.push(...publication.records);
      }
    });

    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, `registered-syntax-resources:${input.localKey}`));
    }
    for (const pattern of attributePatterns) {
      this.store.productDetails.addIfAbsent(
        TemplateProductDetails.AttributePatternExecutable,
        pattern.executable.productHandle,
        pattern.executable,
      );
      for (const compiled of pattern.compiledPatterns) {
        this.store.productDetails.addIfAbsent(
          TemplateProductDetails.CompiledAttributePattern,
          compiled.productHandle,
          compiled,
        );
      }
    }
    for (const command of bindingCommands) {
      this.store.productDetails.addIfAbsent(
        TemplateProductDetails.BindingCommandExecutable,
        command.executable.productHandle,
        command.executable,
      );
    }
    return new RegisteredSyntaxResourceEmission(attributePatterns, bindingCommands, records);
  }

  private attributePattern(
    localKey: string,
    definition: AttributePatternDefinition,
    admission: ResourceRegistrationAdmission,
  ): { readonly resource: SourceAttributePatternResource; readonly records: readonly KernelStoreRecord[] } | null {
    if (definition.productHandle == null || definition.identityHandle == null) {
      return null;
    }
    const provenanceHandle = this.provenanceHandle(admission, definition.productHandle);
    if (provenanceHandle == null) {
      return null;
    }
    const sourceAddressHandle = admission.sourceAddressHandle ?? definition.sourceAddressHandle;
    const publication = this.executables.materializeAttributePattern({
      localKey,
      ownerIdentityHandle: definition.identityHandle,
      definitionProductHandle: definition.productHandle,
      target: definition.target,
      patterns: definition.patterns,
      executionKind: AttributePatternExecutionKind.Custom,
      sourceAddressHandle,
      provenanceHandle,
    });
    const materialization = new MaterializationRecord(
      this.store.handles.materialization(localKey),
      definition.identityHandle,
      [publication.executable.productHandle, ...publication.compiledPatterns.map((pattern) => pattern.productHandle)],
      publication.claimHandles,
    );
    return {
      resource: new SourceAttributePatternResource(
        publication.executable,
        publication.compiledPatterns,
        definition,
        admission.sourceAddressHandle,
      ),
      records: [...publication.records, materialization],
    };
  }

  private bindingCommand(
    localKey: string,
    definition: BindingCommandDefinition,
    admission: ResourceRegistrationAdmission,
  ): { readonly resource: SourceBindingCommandResource; readonly records: readonly KernelStoreRecord[] } | null {
    if (definition.productHandle == null || definition.identityHandle == null) {
      return null;
    }
    const provenanceHandle = this.provenanceHandle(admission, definition.productHandle);
    if (provenanceHandle == null) {
      return null;
    }
    const sourceAddressHandle = admission.sourceAddressHandle ?? definition.sourceAddressHandle;
    const publication = this.executables.materializeBindingCommand({
      localKey,
      ownerIdentityHandle: definition.identityHandle,
      definitionProductHandle: definition.productHandle,
      target: definition.target,
      name: definition.name,
      aliases: definition.aliases.map((alias) => alias.name),
      key: definition.key,
      ignoreAttr: null,
      executionKind: BindingCommandExecutionKind.Custom,
      sourceAddressHandle,
      provenanceHandle,
    });
    return {
      resource: new SourceBindingCommandResource(
        publication.executable,
        definition,
        admission.sourceAddressHandle,
      ),
      records: [
        ...publication.records,
        new MaterializationRecord(
          this.store.handles.materialization(localKey),
          definition.identityHandle,
          [publication.executable.productHandle],
        ),
      ],
    };
  }

  private provenanceHandle(
    admission: ResourceRegistrationAdmission,
    definitionProductHandle: NonNullable<AttributePatternDefinition['productHandle'] | BindingCommandDefinition['productHandle']>,
  ) {
    return this.store.readProduct(admission.productHandle)?.provenanceHandle
      ?? this.store.readProduct(definitionProductHandle)?.provenanceHandle
      ?? null;
  }
}
