import path from 'node:path';

import type ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import { sourceFileAddressHostPath } from '../boot/source-ownership.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import type { OpenSeamReasonKind } from '../kernel/open-seam.js';
import {
  authoredSourceAddressForAnchorHandle,
} from '../kernel/source-address.js';
import type { KernelStoreReadView } from '../kernel/store.js';
import type { OpenSeamKindKey } from '../kernel/vocabulary.js';
import type { FullResourceDefinition } from './resource-definition.js';
import type { ResourceDefinitionHeaderEmission } from './resource-definition-header-emission.js';
import type { ResourceCarrierKind } from './resource-kind.js';
import type { ResourceRecognitionContext } from './resource-recognition-context.js';
import type { ResourceRecognitionObservation, ResourceRecognitionOpen } from './resource-observation.js';

/** Exact authored range copied out of an active source generation for later old-text-validated transformation. */
export class ResourceDefinitionAuthoredSourceSpan {
  constructor(
    /** Boot/kernel identity of the source file that owns this range. */
    readonly sourceFileAddressHandle: AddressHandle,
    /** Semantic workspace-relative source path retained by the source-file address. */
    readonly sourcePath: string,
    /** Host path from which the copied text was read. */
    readonly sourceFilePath: string,
    /** Inclusive zero-based start offset. */
    readonly start: number,
    /** Exclusive zero-based end offset. */
    readonly end: number,
    /** Exact text at `[start, end)` in the source generation that produced this attachment. */
    readonly oldText: string,
  ) {}
}

/** Recognition pressure copied beside a resource carrier without turning it into a transform-policy verdict. */
export class ResourceDefinitionSourceOpenReason {
  constructor(
    readonly openKind: OpenSeamKindKey,
    readonly summary: string,
    readonly reasonKinds: readonly OpenSeamReasonKind[],
    readonly source: ResourceDefinitionAuthoredSourceSpan | null,
  ) {}
}

/**
 * Detached authored-source geometry for one converged resource definition.
 *
 * The attachment preserves recognition/convergence identity while copying every AST-backed range and its validation
 * text out of the evaluator generation. It deliberately does not decide whether a particular build transform can
 * realize the carrier: that policy belongs to the consumer and may differ by target or bundler.
 */
export class ResourceDefinitionSourceAttachment {
  constructor(
    readonly projectKey: string,
    readonly projectInputRevision: string,
    readonly definitionProductHandle: ProductHandle,
    readonly definitionIdentityHandle: IdentityHandle | null,
    readonly headerProductHandle: ProductHandle,
    readonly headerIdentityHandle: IdentityHandle | null,
    readonly headerProvenanceHandle: ProvenanceHandle,
    readonly carrierSourceAddressHandle: AddressHandle,
    readonly carrierKind: ResourceCarrierKind,
    readonly owningModuleKey: string,
    readonly owningSourceFileAddressHandle: AddressHandle,
    readonly carrier: ResourceDefinitionAuthoredSourceSpan,
    readonly definitionExpression: ResourceDefinitionAuthoredSourceSpan | null,
    readonly targetModuleKey: string | null,
    readonly targetIdentityHandle: IdentityHandle | null,
    readonly targetSourceAddressHandle: AddressHandle | null,
    readonly targetDeclarationSourceAddressHandle: AddressHandle | null,
    readonly target: ResourceDefinitionAuthoredSourceSpan | null,
    readonly targetDeclaration: ResourceDefinitionAuthoredSourceSpan | null,
    /** Exact authored template carrier when convergence retained one, whether inline, imported, or conventional. */
    readonly templateSource: ResourceDefinitionAuthoredSourceSpan | null,
    readonly recognitionOpenReasons: readonly ResourceDefinitionSourceOpenReason[],
  ) {}
}

/** Materialize source attachments for every converged definition in one project recognition result. */
export function materializeResourceDefinitionSourceAttachments(
  project: ProjectBootFrame,
  context: ResourceRecognitionContext,
  observations: readonly ResourceRecognitionObservation[],
  headers: readonly ResourceDefinitionHeaderEmission[],
  definitions: readonly FullResourceDefinition[],
  readView: KernelStoreReadView,
): ReadonlyMap<FullResourceDefinition, ResourceDefinitionSourceAttachment> {
  const attachments = new Map<FullResourceDefinition, ResourceDefinitionSourceAttachment>();
  for (const definition of definitions) {
    const attachment = sourceAttachmentForDefinition(
      project,
      context,
      observations,
      headers,
      definition,
      readView,
    );
    if (attachment != null) {
      attachments.set(definition, attachment);
    }
  }
  return attachments;
}

function sourceAttachmentForDefinition(
  project: ProjectBootFrame,
  context: ResourceRecognitionContext,
  observations: readonly ResourceRecognitionObservation[],
  headers: readonly ResourceDefinitionHeaderEmission[],
  definition: FullResourceDefinition,
  readView: KernelStoreReadView,
): ResourceDefinitionSourceAttachment | null {
  const definitionProductHandle = definition.productHandle;
  const carrierSourceAddressHandle = definition.sourceAddressHandle;
  if (definitionProductHandle == null || carrierSourceAddressHandle == null) {
    return null;
  }
  const header = headers.find((candidate) =>
    candidate.sourceAddressHandle === carrierSourceAddressHandle
  ) ?? null;
  if (header == null) {
    return null;
  }
  const observation = observations[header.observationIndex] ?? null;
  if (observation == null) {
    return null;
  }
  const carrier = sourceSpanForNode(context, observation.sourceNode, readView);
  if (carrier == null) {
    return null;
  }
  const target = observation.definition?.target ?? null;
  const carrierContext = context.readAdmittedNodeContext(observation.sourceNode) ?? context;
  return new ResourceDefinitionSourceAttachment(
    project.projectKey,
    project.inputGeneration.revision,
    definitionProductHandle,
    definition.identityHandle,
    header.productHandle,
    header.primaryIdentityHandle,
    header.provenanceHandle,
    carrierSourceAddressHandle,
    observation.carrierKind,
    carrierContext.moduleKey,
    carrierContext.sourceFileAddressHandle,
    carrier,
    sourceSpanForNode(context, observation.definitionNode, readView),
    definition.target.moduleKey,
    definition.target.identityHandle,
    definition.target.addressHandle,
    definition.target.declarationSourceAddressHandle,
    sourceSpanForNode(context, target?.node ?? null, readView),
    sourceSpanForNode(context, target?.declarationNode ?? null, readView),
    templateSourceSpan(project, definition, readView),
    observation.openSeams.map((open) => sourceOpenReason(context, open, readView)),
  );
}

function sourceSpanForNode(
  context: ResourceRecognitionContext,
  node: ts.Node | null,
  readView: KernelStoreReadView,
): ResourceDefinitionAuthoredSourceSpan | null {
  if (node == null) {
    return null;
  }
  const owner = context.readAdmittedNodeContext(node);
  if (owner == null) {
    return null;
  }
  const sourceFile = node.getSourceFile();
  const start = node.getStart(sourceFile);
  const end = node.getEnd();
  if (start < 0 || end < start || end > sourceFile.text.length) {
    return null;
  }
  const sourceFileAddress = authoredSourceAddressForAnchorHandle(readView, owner.sourceFileAddressHandle)?.sourceFile;
  return new ResourceDefinitionAuthoredSourceSpan(
    owner.sourceFileAddressHandle,
    sourceFileAddress?.path ?? sourceFile.fileName,
    path.resolve(sourceFile.fileName),
    start,
    end,
    sourceFile.text.slice(start, end),
  );
}

function templateSourceSpan(
  project: ProjectBootFrame,
  definition: FullResourceDefinition,
  readView: KernelStoreReadView,
): ResourceDefinitionAuthoredSourceSpan | null {
  if (!('template' in definition) || definition.template?.addressHandle == null) {
    return null;
  }
  const source = authoredSourceAddressForAnchorHandle(readView, definition.template.addressHandle);
  if (source?.sourceFile == null || source.sourceSpan == null) {
    return null;
  }
  const sourceFilePath = sourceFileAddressHostPath(project.workspaceRootDir, source.sourceFile);
  const text = project.inputGeneration.host.readFile(sourceFilePath);
  const start = source.sourceSpan.start;
  const end = source.sourceSpan.end;
  if (text == null || start < 0 || end < start || end > text.length) {
    return null;
  }
  return new ResourceDefinitionAuthoredSourceSpan(
    source.sourceFile.handle,
    source.sourceFile.path,
    sourceFilePath,
    start,
    end,
    text.slice(start, end),
  );
}

function sourceOpenReason(
  context: ResourceRecognitionContext,
  open: ResourceRecognitionOpen,
  readView: KernelStoreReadView,
): ResourceDefinitionSourceOpenReason {
  return new ResourceDefinitionSourceOpenReason(
    open.openKind,
    open.summary,
    open.reasonKinds,
    sourceSpanForNode(context, open.node, readView),
  );
}
