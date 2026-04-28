import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { BindableDefinition } from '../resources/bindable-definition.js';
import type { ResourceTargetReference } from '../resources/resource-reference.js';
import type { AttributeSyntax } from './attribute-syntax.js';
import type { HtmlAttributeReference, HtmlNodeReference } from './html-ir.js';
import type {
  TemplateInstruction,
  TemplateInstructionKind,
} from './instruction-ir.js';
import {
  TemplateCompilerServiceKind,
  TemplateCompilerServiceReference,
} from './compiler-world.js';

export const enum BindingCommandExecutionKind {
  /** Runtime built-in command whose build behavior can be modeled directly. */
  BuiltIn = 'built-in',
  /** User-defined command with a known target and definition. */
  Custom = 'custom',
  /** Command exists but its build behavior must remain as an open execution seam. */
  Opaque = 'opaque',
  /** Command lookup or definition is unresolved. */
  Open = 'open',
}

export const enum BindingCommandBuildInputKind {
  /** Plain attribute command info, corresponding to runtime IPlainAttrCommandInfo. */
  PlainAttribute = 'plain-attribute',
  /** Bindable command info, corresponding to runtime IBindableCommandInfo. */
  Bindable = 'bindable',
  /** Command info shape remains open because classification or lookup is incomplete. */
  Open = 'open',
}

export const enum BindingCommandLoweringState {
  /** Command build produced the expected instruction products. */
  Complete = 'complete',
  /** Command build produced useful products while leaving visible open seams. */
  Partial = 'partial',
  /** Command build could not run because a required input was open. */
  Open = 'open',
  /** Command build determined that the syntax/input combination is invalid. */
  Invalid = 'invalid',
}

export type BindingCommandExecutableField =
  | 'definition'
  | 'target'
  | 'name'
  | 'aliases'
  | 'key'
  | 'ignoreAttr'
  | 'executionKind'
  | 'source';

export type BindingCommandResolverField =
  | 'commands'
  | 'source';

export type BindingCommandBuildInputField =
  | 'inputKind'
  | 'attribute'
  | 'syntax'
  | 'bindable'
  | 'definition'
  | 'node'
  | 'source';

export type BindingCommandLoweringField =
  | 'command'
  | 'input'
  | 'state'
  | 'instructions'
  | 'source';

export class BindingCommandInstructionAllocation {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
  ) {}
}

export class BindingCommandIteratorParse {
  constructor(
    readonly expressionProductHandle: ProductHandle | null,
    readonly localNames: readonly string[],
    readonly rawTailText: string | null,
  ) {}
}

/**
 * Runtime-shaped build info for executing a binding command model.
 *
 * The durable product below keeps normalized handles. This object is the
 * hydrated method input, corresponding to runtime ICommandBuildInfo.
 */
export class BindingCommandBuildInfo {
  constructor(
    readonly node: HtmlNodeReference,
    readonly attribute: HtmlAttributeReference,
    readonly syntax: AttributeSyntax,
    readonly bindable: BindableDefinition | null,
    readonly buildInputProductHandle: ProductHandle | null,
    readonly bindableProductHandle: ProductHandle | null,
    readonly definitionProductHandle: ProductHandle | null,
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

export interface BindingCommandBuildContext {
  allocateInstruction(
    kind: TemplateInstructionKind,
    info: BindingCommandBuildInfo,
    local: string,
  ): BindingCommandInstructionAllocation;

  parsePropertyExpression(
    expression: string,
    info: BindingCommandBuildInfo,
  ): ProductHandle | null;

  parseFunctionExpression(
    expression: string,
    info: BindingCommandBuildInfo,
  ): ProductHandle | null;

  parseIteratorExpression(
    expression: string,
    info: BindingCommandBuildInfo,
  ): BindingCommandIteratorParse;

  parseAttributeSyntax(
    rawName: string,
    rawValue: string,
    info: BindingCommandBuildInfo,
  ): AttributeSyntax | null;

  mapAttribute(
    node: HtmlNodeReference,
    attr: string,
  ): string | null;

  isTwoWay(
    node: HtmlNodeReference,
    attr: string,
  ): boolean;
}

export class BindingCommandBuildResult {
  constructor(
    readonly state: BindingCommandLoweringState,
    readonly instructions: readonly TemplateInstruction[],
    readonly message: string | null = null,
  ) {}

  static complete(instructions: readonly TemplateInstruction[]): BindingCommandBuildResult {
    return new BindingCommandBuildResult(BindingCommandLoweringState.Complete, instructions);
  }

  static invalid(message: string): BindingCommandBuildResult {
    return new BindingCommandBuildResult(BindingCommandLoweringState.Invalid, [], message);
  }

  static open(message: string): BindingCommandBuildResult {
    return new BindingCommandBuildResult(BindingCommandLoweringState.Open, [], message);
  }
}

/** Reference to a binding-command executable without retaining handler instances. */
export class BindingCommandExecutableReference {
  constructor(
    /** Product handle for the executable command model, when emitted. */
    readonly productHandle: ProductHandle | null,
    /** Identity for the executable command model, when emitted. */
    readonly identityHandle: IdentityHandle | null,
    /** Runtime command name such as `bind`, `two-way`, or `trigger`. */
    readonly name: string,
    /** Runtime DI/resource key, when materialized. */
    readonly key: string | null,
  ) {}
}

/** Runtime BindingCommandInstance model used by lowering. */
@auLink('template-compiler:BindingCommandInstance')
export class BindingCommandExecutable {
  constructor(
    /** Product handle for the materialized-product envelope that represents this command executable. */
    readonly productHandle: ProductHandle,
    /** Identity for this command executable model. */
    readonly identityHandle: IdentityHandle,
    /** Definition product that registered the command. */
    readonly definitionProductHandle: ProductHandle | null,
    /** Type, object, or function target that implements the command. */
    readonly target: ResourceTargetReference | null,
    /** Runtime command name. */
    readonly name: string,
    /** Runtime aliases accepted by lookup. */
    readonly aliases: readonly string[],
    /** Runtime DI/resource key for this command. */
    readonly key: string,
    /** Mirrors built-in command behavior that tells the template compiler whether to keep the source attr. */
    readonly ignoreAttr: boolean,
    /** How much of command execution is known to this substrate. */
    readonly executionKind: BindingCommandExecutionKind,
    /** Source address for the command definition or registration. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<BindingCommandExecutableField>[] = [],
  ) {}

  toReference(): BindingCommandExecutableReference {
    return new BindingCommandExecutableReference(this.productHandle, this.identityHandle, this.name, this.key);
  }
}

/** Runtime IBindingCommandResolver model for one compiler world/container. */
@auLink('template-compiler:IBindingCommandResolver')
export class BindingCommandResolverService {
  private readonly _cache = new Map<string, BindingCommandExecutable | null>();

  constructor(
    /** Product handle for the materialized-product envelope that represents this resolver service. */
    readonly productHandle: ProductHandle,
    /** Identity for this resolver service model. */
    readonly identityHandle: IdentityHandle,
    /** Binding commands visible to this resolver service. */
    readonly commands: readonly BindingCommandExecutable[],
    /** Source address for the resolver service registration or lookup. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<BindingCommandResolverField>[] = [],
  ) {}

  /** Product handles for commands visible through this resolver service. */
  get commandProductHandles(): readonly ProductHandle[] {
    return this.commands.map((command) => command.productHandle);
  }

  /** Runtime `IBindingCommandResolver.get(container, name)` shape for this container-scoped service. */
  get(commandName: string): BindingCommandExecutable | null {
    if (this._cache.has(commandName)) {
      return this._cache.get(commandName) ?? null;
    }
    const command = this.commands.find((candidate) =>
      candidate.name === commandName || candidate.aliases.includes(commandName)
    ) ?? null;
    this._cache.set(commandName, command);
    return command;
  }

  /** Alias used by lowering code that talks in lookup/resolution terms rather than runtime method names. */
  resolve(commandName: string): BindingCommandExecutable | null {
    return this.get(commandName);
  }

  /** Snapshot command lookup cache for answer envelopes or later kernel emission. */
  readCachedCommands(): ReadonlyMap<string, BindingCommandExecutable | null> {
    return new Map(this._cache);
  }

  toReference(): TemplateCompilerServiceReference {
    return new TemplateCompilerServiceReference(
      TemplateCompilerServiceKind.BindingCommandResolver,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }
}

/** Runtime ICommandBuildInfo model, before a binding command builds instructions. */
@auLink('template-compiler:ICommandBuildInfo')
export class BindingCommandBuildInput {
  constructor(
    /** Product handle for the materialized-product envelope that represents this build input. */
    readonly productHandle: ProductHandle,
    /** Identity for this build input model. */
    readonly identityHandle: IdentityHandle,
    /** Runtime command info lane. */
    readonly inputKind: BindingCommandBuildInputKind,
    /** Element/node that owns the command input. */
    readonly node: HtmlNodeReference,
    /** Authored HTML attribute that produced the command input. */
    readonly attribute: HtmlAttributeReference,
    /** Parsed attribute syntax product, when available. */
    readonly syntaxProductHandle: ProductHandle | null,
    /** Bindable product selected by resource classification, for bindable command info. */
    readonly bindableProductHandle: ProductHandle | null,
    /** Resource or element definition product relevant to the command input, when known. */
    readonly definitionProductHandle: ProductHandle | null,
    /** Source address for the command input site. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<BindingCommandBuildInputField>[] = [],
  ) {}
}

/**
 * Result of running, emulating, or preserving a binding command build.
 *
 * The executable can be opaque while the build input remains precise. That gives diagnostics and AI explanation a
 * concrete place to show "we reached this command but did not execute its custom build body".
 */
export class BindingCommandLowering {
  constructor(
    /** Product handle for the materialized-product envelope that represents this lowering. */
    readonly productHandle: ProductHandle,
    /** Identity for this lowering product. */
    readonly identityHandle: IdentityHandle,
    /** Command executable selected for this lowering. */
    readonly command: BindingCommandExecutableReference,
    /** Product handle for the command build input. */
    readonly inputProductHandle: ProductHandle,
    /** Lowering outcome. */
    readonly state: BindingCommandLoweringState,
    /** Instruction products produced by the command build. */
    readonly instructionProductHandles: readonly ProductHandle[],
    /** Source address for the command lowering site. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<BindingCommandLoweringField>[] = [],
  ) {}
}
