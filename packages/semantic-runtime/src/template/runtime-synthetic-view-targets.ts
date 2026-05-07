import type {
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import {
  TemplateRenderingTargetInput,
} from './compiler-world.js';
import {
  TemplateRenderTarget,
  TemplateRenderTargetKind,
} from './compiled-template.js';
import type { HtmlNodeReference } from './html-ir.js';
import {
  HydrateTemplateControllerInstruction,
  type TemplateInstruction,
  type TemplateInstructionSequence,
} from './instruction-ir.js';

export interface SyntheticViewTargetAllocation {
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
}

export interface SyntheticViewTargetInput {
  readonly local: string;
  readonly sequence: TemplateInstructionSequence;
  readonly instructions: readonly TemplateInstruction[];
  readonly allocate: (local: string) => SyntheticViewTargetAllocation;
}

class SyntheticViewTargetGroup {
  constructor(
    readonly targetNode: HtmlNodeReference | null,
    readonly targetKind: TemplateRenderTargetKind,
    readonly instructions: readonly TemplateInstruction[],
  ) {}
}

/**
 * Builds synthetic-view render targets from an embedded instruction sequence.
 *
 * The compiled-template front door currently stores template-controller child instructions as an ordered sequence,
 * while runtime `Rendering.render(...)` expects target rows. Grouping consecutive instructions by their authored target
 * node preserves enough target fidelity for nested renderer dispatch and spread compilation without pretending to have
 * per-runtime-instance DOM nodes.
 */
export function syntheticViewTargetInputs(
  input: SyntheticViewTargetInput,
): readonly TemplateRenderingTargetInput[] {
  return syntheticViewTargetGroups(input.instructions).map((group, index) => {
    const allocation = input.allocate(`${input.local}:target:${index}`);
    return new TemplateRenderingTargetInput(
      new TemplateRenderTarget(
        allocation.productHandle,
        allocation.identityHandle,
        group.targetKind,
        group.targetNode,
        input.sequence.productHandle,
        group.targetNode?.addressHandle ?? input.sequence.sourceAddressHandle,
        [],
      ),
      input.sequence,
      group.instructions,
    );
  });
}

function syntheticViewTargetGroups(
  instructions: readonly TemplateInstruction[],
): readonly SyntheticViewTargetGroup[] {
  const groups: SyntheticViewTargetGroup[] = [];
  let currentKey: string | null = null;
  let currentNode: HtmlNodeReference | null = null;
  let currentKind = TemplateRenderTargetKind.MarkerTarget;
  let currentInstructions: TemplateInstruction[] = [];

  const flush = (): void => {
    if (currentInstructions.length === 0) {
      return;
    }
    groups.push(new SyntheticViewTargetGroup(currentNode, currentKind, currentInstructions));
    currentInstructions = [];
  };

  instructions.forEach((instruction, index) => {
    const node = nodeForInstruction(instruction);
    const key = node?.productHandle ?? `${instruction.productHandle}:${index}`;
    if (currentKey !== null && key !== currentKey) {
      flush();
    }
    if (currentInstructions.length === 0) {
      currentKey = key;
      currentNode = node;
      currentKind = instruction instanceof HydrateTemplateControllerInstruction
        ? TemplateRenderTargetKind.RenderLocation
        : TemplateRenderTargetKind.MarkerTarget;
    }
    currentInstructions.push(instruction);
  });
  flush();
  return groups;
}

function nodeForInstruction(
  instruction: TemplateInstruction,
): HtmlNodeReference | null {
  return 'node' in instruction ? instruction.node : null;
}
