import type { ClaimEndpointHandle } from '../kernel/claim.js';
import type { IdentityHandle, ProductHandle } from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { TemplateCompilerFrameworkErrorCode } from './framework-error-code.js';
import { TemplateCompilerFrameworkErrorCode as FrameworkError } from './framework-error-code.js';
import { TemplateCompilerIssueKind } from './compiler-issue.js';
import { runtimeElementResourceName } from './runtime-dom-name.js';
import {
  snapshotTemplateCompilerDescendantElements,
  templateCompilerDirectElementCount,
  templateCompilerElementAttribute,
} from './template-compiler-dom-query.js';
import {
  type TemplateCompilerExecutionLaneReference,
  type TemplateCompilerExecutionSession,
  type TemplateCompilerOperation,
  TemplateCompilerOperationCompletion,
  TemplateCompilerOperationCompletionKind,
  TemplateCompilerOperationExecutionMechanism,
  TemplateCompilerOperationKind,
} from './template-compiler-execution.js';
import type {
  TemplateCompilerAttributeOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerFragmentOccurrence,
  TemplateCompilerNodeOccurrence,
} from './template-compiler-occurrence.js';
import {
  TemplateCompilerHookBootstrapState,
  type TemplateCompilerHookBootstrapResult,
} from './template-compiler-hook-bootstrap.js';

const allowedLocalBindableAttributes = new Set(['name', 'attribute', 'mode']);

export const enum TemplateCompilerLocalExtractionState {
  NoLocalTemplates = 'no-local-templates',
  Extracted = 'extracted',
  Refused = 'refused',
  Abrupt = 'abrupt',
}

/** First terminal built-in boundary reached by the JIT-ordered local extraction phase. */
export class TemplateCompilerLocalExtractionFailure {
  constructor(
    readonly issueKind: TemplateCompilerIssueKind | null,
    readonly frameworkErrorCode: TemplateCompilerFrameworkErrorCode | null,
    readonly summary: string,
    readonly target: TemplateCompilerNodeOccurrence | TemplateCompilerAttributeOccurrence,
    readonly operation: TemplateCompilerOperation,
  ) {}
}

/** Effective `<bindable>` fact whose element has been removed from the local carrier content. */
export class TemplateCompilerExtractedLocalBindable {
  constructor(
    readonly ordinal: number,
    readonly element: TemplateCompilerElementOccurrence,
    readonly propertyName: string,
    readonly explicitAttributeName: string | null,
    readonly mode: string | null,
    readonly nameAttribute: TemplateCompilerAttributeOccurrence,
    readonly attributeAttribute: TemplateCompilerAttributeOccurrence | null,
    readonly modeAttribute: TemplateCompilerAttributeOccurrence | null,
    readonly ignoredAttributes: readonly TemplateCompilerAttributeOccurrence[],
    readonly detachmentOperation: TemplateCompilerOperation,
  ) {}
}

/** One fully extracted carrier before its cohort-local definition is published. */
export class TemplateCompilerExtractedLocalTemplate {
  constructor(
    readonly declarationOrdinal: number,
    readonly invocationKey: string,
    readonly definitionReservation: TemplateCompilerLocalDefinitionReservation,
    readonly name: string,
    readonly carrier: TemplateCompilerElementOccurrence,
    readonly content: TemplateCompilerFragmentOccurrence,
    readonly declarationAttribute: TemplateCompilerAttributeOccurrence,
    readonly bindables: readonly TemplateCompilerExtractedLocalBindable[],
    readonly carrierDetachmentOperation: TemplateCompilerOperation,
    readonly invocationLane: TemplateCompilerExecutionLaneReference | null,
  ) {}
}

/** Nominal full-success receipt; partial/refused extraction can never be passed to definition publication. */
export class TemplateCompilerLocalExtractionHandoff {
  readonly #fullSuccess = true;

  constructor(
    readonly ownerLane: TemplateCompilerExecutionLaneReference,
    readonly entries: readonly TemplateCompilerExtractedLocalTemplate[],
  ) {}

  isFullSuccessReceipt(): boolean {
    return this.#fullSuccess;
  }
}

export class TemplateCompilerLocalExtractionResult {
  constructor(
    readonly lane: TemplateCompilerExecutionLaneReference,
    readonly state: TemplateCompilerLocalExtractionState,
    /** Exact forest epoch after the extraction boundary closed. */
    readonly forestMutationRevision: number,
    readonly operations: readonly TemplateCompilerOperation[],
    /** Completed candidates remain visible on refusal, but own no admitted child lane and are not publishable. */
    readonly completedExtractions: readonly TemplateCompilerExtractedLocalTemplate[],
    readonly handoff: TemplateCompilerLocalExtractionHandoff | null,
    readonly failure: TemplateCompilerLocalExtractionFailure | null,
  ) {}
}

export interface TemplateCompilerLocalExtractionRequest {
  readonly execution: TemplateCompilerExecutionSession;
  readonly lane: TemplateCompilerExecutionLaneReference;
  readonly hookBootstrap: TemplateCompilerHookBootstrapResult;
  readonly ownerName: string;
  readonly ownerCauseHandles: readonly ClaimEndpointHandle[];
  readonly reserveDefinition: (
    invocationKey: string,
  ) => TemplateCompilerLocalDefinitionReservation;
}

/** Non-publishing handles reserved before the first effective local-definition mutation. */
export interface TemplateCompilerLocalDefinitionReservation {
  readonly invocationKey: string;
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
}

interface PendingExtractedLocalTemplate {
  readonly declarationOrdinal: number;
  readonly invocationKey: string;
  readonly definitionReservation: TemplateCompilerLocalDefinitionReservation;
  readonly name: string;
  readonly carrier: TemplateCompilerElementOccurrence;
  readonly content: TemplateCompilerFragmentOccurrence;
  readonly declarationAttribute: TemplateCompilerAttributeOccurrence;
  readonly bindables: readonly TemplateCompilerExtractedLocalBindable[];
  readonly carrierDetachmentOperation: TemplateCompilerOperation;
}

class TemplateCompilerLocalExtractionFrame {
  private readonly context;
  private readonly initialOperationCount: number;
  private readonly completed: PendingExtractedLocalTemplate[] = [];

  constructor(private readonly request: TemplateCompilerLocalExtractionRequest) {
    if (request.ownerCauseHandles.length === 0) {
      throw new Error('Local-template extraction requires at least one owner semantic cause.');
    }
    if (
      request.hookBootstrap.state !== TemplateCompilerHookBootstrapState.Exact
      || request.hookBootstrap.lane !== request.lane
      || request.hookBootstrap.operations.some((operation) =>
        operation.lane !== request.lane
        || operation.operationKind !== TemplateCompilerOperationKind.CompilerHook
        || operation.completion.completionKind !== TemplateCompilerOperationCompletionKind.Complete
      )
    ) {
      throw new Error(`Local-template extraction for '${request.lane.localKey}' requires exact hook bootstrap.`);
    }
    this.context = request.execution.bootstrapContext(request.lane);
    this.initialOperationCount = request.execution.sequence.readOperations().length;
  }

  execute(): TemplateCompilerLocalExtractionResult {
    const rootDeclaration = templateCompilerElementAttribute(this.context.compilerCarrier, 'as-custom-element');
    if (rootDeclaration != null) {
      return this.refuse(
        TemplateCompilerIssueKind.RootTemplateCannotBeLocal,
        FrameworkError.CompilerRootIsLocal,
        `Template compilation error in element "${this.request.ownerName}": the root <template> cannot be a local element template.`,
        rootDeclaration,
        'root-is-local',
      );
    }

    const candidates = snapshotTemplateCompilerDescendantElements(
      this.context.compilerContent,
      isLocalTemplateCarrier,
    );
    if (candidates.length === 0) {
      return new TemplateCompilerLocalExtractionResult(
        this.request.lane,
        TemplateCompilerLocalExtractionState.NoLocalTemplates,
        this.request.execution.forest.mutationRevision,
        [],
        [],
        null,
        null,
      );
    }
    if (candidates.length === templateCompilerDirectElementCount(this.context.compilerContent)) {
      return this.refuse(
        TemplateCompilerIssueKind.OnlyLocalTemplates,
        FrameworkError.CompilerTemplateOnlyLocalTemplate,
        `Template compilation error: the custom element "${this.request.ownerName}" does not have any content other than local template(s).`,
        this.context.compilerContent,
        'only-local-templates',
      );
    }

    const names = new Set<string>();
    for (const [declarationOrdinal, carrier] of candidates.entries()) {
      const failure = this.extractCandidate(declarationOrdinal, carrier, names);
      if (failure != null) return failure;
    }

    const entries = this.completed.map((entry) => {
      const lane = this.request.execution.admitExtractedInvocation(
        entry.invocationKey,
        entry.carrier,
        entry.content,
        entry.carrierDetachmentOperation,
      );
      return new TemplateCompilerExtractedLocalTemplate(
        entry.declarationOrdinal,
        entry.invocationKey,
        entry.definitionReservation,
        entry.name,
        entry.carrier,
        entry.content,
        entry.declarationAttribute,
        entry.bindables,
        entry.carrierDetachmentOperation,
        lane,
      );
    });
    const handoff = new TemplateCompilerLocalExtractionHandoff(this.request.lane, entries);
    return new TemplateCompilerLocalExtractionResult(
      this.request.lane,
      TemplateCompilerLocalExtractionState.Extracted,
      this.request.execution.forest.mutationRevision,
      this.readNewOperations(),
      entries,
      handoff,
      null,
    );
  }

  private extractCandidate(
    declarationOrdinal: number,
    carrier: TemplateCompilerElementOccurrence,
    names: Set<string>,
  ): TemplateCompilerLocalExtractionResult | null {
    if (carrier.parent !== this.context.compilerContent) {
      return this.refuse(
        TemplateCompilerIssueKind.LocalTemplateNotUnderRoot,
        FrameworkError.CompilerLocalElementNotUnderRoot,
        `Template compilation error: local element template needs to be defined directly under root of element "${this.request.ownerName}".`,
        carrier,
        `candidate:${declarationOrdinal}:not-under-root`,
      );
    }
    const declarationAttribute = templateCompilerElementAttribute(carrier, 'as-custom-element');
    const name = declarationAttribute?.value ?? '';
    if (declarationAttribute == null || name.length === 0) {
      return this.refuse(
        TemplateCompilerIssueKind.LocalTemplateNameEmpty,
        FrameworkError.CompilerLocalNameEmpty,
        `Template compilation error: the value of "as-custom-element" attribute cannot be empty for local element in element "${this.request.ownerName}".`,
        declarationAttribute ?? carrier,
        `candidate:${declarationOrdinal}:name-empty`,
      );
    }
    if (names.has(name)) {
      return this.refuse(
        TemplateCompilerIssueKind.LocalTemplateNameDuplicate,
        FrameworkError.CompilerDuplicateLocalName,
        `Template compilation error: duplicate definition of the local template named "${name}" in element ${this.request.ownerName}.`,
        declarationAttribute,
        `candidate:${declarationOrdinal}:name-duplicate`,
      );
    }
    names.add(name);
    const invocationKey = `${this.request.lane.localKey}:local-template:${localKeyPart(name)}`;
    const definitionReservation = this.request.reserveDefinition(invocationKey);
    if (definitionReservation.invocationKey !== invocationKey) {
      throw new Error(`Local definition reservation changed invocation key '${invocationKey}'.`);
    }
    const candidateCauses = [...this.request.ownerCauseHandles, definitionReservation.productHandle];
    this.detachAttribute(
      declarationAttribute,
      `candidate:${declarationOrdinal}:remove-name`,
      candidateCauses,
    );

    const content = carrier.templateContent;
    if (content == null) {
      return this.abrupt(
        carrier,
        `Local template '${name}' has no HTML template-content fragment.`,
        `candidate:${declarationOrdinal}:content`,
        candidateCauses,
      );
    }
    const bindableElements = snapshotTemplateCompilerDescendantElements(content, isLocalBindableElement);
    const bindables: TemplateCompilerExtractedLocalBindable[] = [];
    const properties = new Set<string>();
    const attributes = new Set<string>();
    for (const [ordinal, bindable] of bindableElements.entries()) {
      if (bindable.parent !== content) {
        return this.refuse(
          TemplateCompilerIssueKind.LocalTemplateBindableNotUnderRoot,
          FrameworkError.CompilerLocalElementBindableNotUnderRoot,
          `Template compilation error: bindable properties of local element "${name}" template needs to be defined directly under <template>.`,
          bindable,
          `candidate:${declarationOrdinal}:bindable:${ordinal}:not-under-root`,
          candidateCauses,
        );
      }
      const nameAttribute = templateCompilerElementAttribute(bindable, 'name');
      if (nameAttribute == null) {
        return this.refuse(
          TemplateCompilerIssueKind.LocalTemplateBindableNameMissing,
          FrameworkError.CompilerLocalElementBindableNameMissing,
          `Template compilation error: the attribute 'property' is missing in <bindable> in local element "${name}".`,
          bindable,
          `candidate:${declarationOrdinal}:bindable:${ordinal}:name-missing`,
          candidateCauses,
        );
      }
      const propertyName = nameAttribute.value;
      const attributeAttribute = templateCompilerElementAttribute(bindable, 'attribute');
      const explicitAttributeName = attributeAttribute?.value ?? null;
      if (
        properties.has(propertyName)
        || (explicitAttributeName != null && attributes.has(explicitAttributeName))
      ) {
        return this.refuse(
          TemplateCompilerIssueKind.LocalTemplateBindableDuplicate,
          FrameworkError.CompilerLocalElementBindableDuplicate,
          `Template compilation error: Bindable property and attribute needs to be unique; found property: ${propertyName}, attribute: ${explicitAttributeName ?? '(none)'}.`,
          bindable,
          `candidate:${declarationOrdinal}:bindable:${ordinal}:duplicate`,
          candidateCauses,
        );
      }
      properties.add(propertyName);
      if (explicitAttributeName != null) attributes.add(explicitAttributeName);
      const modeAttribute = templateCompilerElementAttribute(bindable, 'mode');
      const ignoredAttributes = bindable.readAttributes().filter((attribute) =>
        !allowedLocalBindableAttributes.has(attribute.name)
      );
      const detachmentOperation = this.detachNode(
        bindable,
        `candidate:${declarationOrdinal}:bindable:${ordinal}:detach`,
        candidateCauses,
      );
      bindables.push(new TemplateCompilerExtractedLocalBindable(
        ordinal,
        bindable,
        propertyName,
        explicitAttributeName,
        modeAttribute?.value ?? null,
        nameAttribute,
        attributeAttribute,
        modeAttribute,
        ignoredAttributes,
        detachmentOperation,
      ));
    }

    const carrierDetachmentOperation = this.detachNode(
      carrier,
      `candidate:${declarationOrdinal}:detach-carrier`,
      candidateCauses,
    );
    this.completed.push({
      declarationOrdinal,
      invocationKey,
      definitionReservation,
      name,
      carrier,
      content,
      declarationAttribute,
      bindables,
      carrierDetachmentOperation,
    });
    return null;
  }

  private detachAttribute(
    attribute: TemplateCompilerAttributeOccurrence,
    suffix: string,
    causeHandles: readonly ClaimEndpointHandle[],
  ): TemplateCompilerOperation {
    const attempt = this.request.execution.beginOperation({
      operationKey: `${this.request.lane.localKey}:local-extraction:${suffix}`,
      context: this.context,
      operationKind: TemplateCompilerOperationKind.LocalTemplateExtraction,
      executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
      target: this.request.execution.occurrenceTarget(this.context, attribute),
      causeHandles,
    });
    this.request.execution.detachAttribute(attempt, attribute);
    return this.request.execution.completeOperation(attempt, complete());
  }

  private detachNode(
    node: TemplateCompilerNodeOccurrence,
    suffix: string,
    causeHandles: readonly ClaimEndpointHandle[],
  ): TemplateCompilerOperation {
    const attempt = this.request.execution.beginOperation({
      operationKey: `${this.request.lane.localKey}:local-extraction:${suffix}`,
      context: this.context,
      operationKind: TemplateCompilerOperationKind.LocalTemplateExtraction,
      executionMechanism: TemplateCompilerOperationExecutionMechanism.BuiltIn,
      target: this.request.execution.occurrenceTarget(this.context, node),
      causeHandles,
    });
    this.request.execution.detachNode(attempt, node);
    return this.request.execution.completeOperation(attempt, complete());
  }

  private refuse(
    issueKind: TemplateCompilerIssueKind,
    frameworkErrorCode: TemplateCompilerFrameworkErrorCode,
    summary: string,
    target: TemplateCompilerNodeOccurrence | TemplateCompilerAttributeOccurrence,
    suffix: string,
    causeHandles: readonly ClaimEndpointHandle[] = this.request.ownerCauseHandles,
  ): TemplateCompilerLocalExtractionResult {
    const operation = this.recordTerminal(
      target,
      suffix,
      new TemplateCompilerOperationCompletion(
        TemplateCompilerOperationCompletionKind.Refused,
        [],
        summary,
      ),
      TemplateCompilerOperationExecutionMechanism.NotAttempted,
      causeHandles,
    );
    return new TemplateCompilerLocalExtractionResult(
      this.request.lane,
      TemplateCompilerLocalExtractionState.Refused,
      this.request.execution.forest.mutationRevision,
      this.readNewOperations(),
      this.partialExtractions(),
      null,
      new TemplateCompilerLocalExtractionFailure(issueKind, frameworkErrorCode, summary, target, operation),
    );
  }

  private abrupt(
    target: TemplateCompilerNodeOccurrence,
    summary: string,
    suffix: string,
    causeHandles: readonly ClaimEndpointHandle[],
  ): TemplateCompilerLocalExtractionResult {
    const operation = this.recordTerminal(
      target,
      suffix,
      new TemplateCompilerOperationCompletion(
        TemplateCompilerOperationCompletionKind.Abrupt,
        [],
        summary,
      ),
      TemplateCompilerOperationExecutionMechanism.BuiltIn,
      causeHandles,
    );
    return new TemplateCompilerLocalExtractionResult(
      this.request.lane,
      TemplateCompilerLocalExtractionState.Abrupt,
      this.request.execution.forest.mutationRevision,
      this.readNewOperations(),
      this.partialExtractions(),
      null,
      new TemplateCompilerLocalExtractionFailure(null, null, summary, target, operation),
    );
  }

  private recordTerminal(
    target: TemplateCompilerNodeOccurrence | TemplateCompilerAttributeOccurrence,
    suffix: string,
    completion: TemplateCompilerOperationCompletion,
    mechanism: TemplateCompilerOperationExecutionMechanism,
    causeHandles: readonly ClaimEndpointHandle[],
  ): TemplateCompilerOperation {
    const attempt = this.request.execution.beginOperation({
      operationKey: `${this.request.lane.localKey}:local-extraction:${suffix}:terminal`,
      context: this.context,
      operationKind: TemplateCompilerOperationKind.LocalTemplateExtraction,
      executionMechanism: mechanism,
      target: this.request.execution.occurrenceTarget(this.context, target),
      causeHandles,
    });
    return this.request.execution.completeOperation(attempt, completion);
  }

  private partialExtractions(): readonly TemplateCompilerExtractedLocalTemplate[] {
    return this.completed.map((entry) => new TemplateCompilerExtractedLocalTemplate(
      entry.declarationOrdinal,
      entry.invocationKey,
      entry.definitionReservation,
      entry.name,
      entry.carrier,
      entry.content,
      entry.declarationAttribute,
      entry.bindables,
      entry.carrierDetachmentOperation,
      null,
    ));
  }

  private readNewOperations(): readonly TemplateCompilerOperation[] {
    return this.request.execution.sequence.readOperations().slice(this.initialOperationCount);
  }
}

export function executeTemplateCompilerLocalExtraction(
  request: TemplateCompilerLocalExtractionRequest,
): TemplateCompilerLocalExtractionResult {
  return new TemplateCompilerLocalExtractionFrame(request).execute();
}

function isLocalTemplateCarrier(element: TemplateCompilerElementOccurrence): boolean {
  return runtimeElementResourceName(element.tagName, element.namespace) === 'template'
    && templateCompilerElementAttribute(element, 'as-custom-element') != null;
}

function isLocalBindableElement(element: TemplateCompilerElementOccurrence): boolean {
  return runtimeElementResourceName(element.tagName, element.namespace) === 'bindable';
}

function complete(): TemplateCompilerOperationCompletion {
  return new TemplateCompilerOperationCompletion(TemplateCompilerOperationCompletionKind.Complete);
}
