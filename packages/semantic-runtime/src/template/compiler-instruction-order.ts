import {
  hasHtmlAttribute,
  htmlAttributeValue,
} from './html-ir.js';
import type {
  HtmlElement,
  HtmlElementAttributeOwner,
} from './html-ir.js';
import {
  InterpolationInstruction,
  PropertyBindingInstruction,
  type TemplateInstruction,
} from './instruction-ir.js';
import {
  isNativeInputCheckedInitializationPredecessor,
  isNativeInputCheckedType,
  nativeInputCheckedBindingSemantics,
  nativeSelectValueBindingSemantics,
} from './native-form-control-semantics.js';
import { runtimeNodeName } from './runtime-dom-name.js';

/** Preserve the framework compiler's observer-sensitive native instruction order after authored lowering. */
export function orderCompilerInstructionsForElement(
  node: HtmlElement,
  owner: HtmlElementAttributeOwner | null,
  instructions: readonly TemplateInstruction[],
): readonly TemplateInstruction[] {
  if (instructions.length < 2) {
    return instructions;
  }

  switch (runtimeNodeName(node.tagName, node.namespace)) {
    case nativeInputCheckedBindingSemantics.nodeName: {
      const type = htmlAttributeValue(owner, 'type')?.toLowerCase() ?? 'text';
      if (!isNativeInputCheckedType(type)) {
        return instructions;
      }
      return reorderInputInstructions(instructions);
    }
    case nativeSelectValueBindingSemantics.nodeName:
      return hasHtmlAttribute(owner, nativeSelectValueBindingSemantics.multipleTarget)
        || instructions.some((instruction) =>
          runtimeInstructionTarget(instruction) === nativeSelectValueBindingSemantics.multipleTarget
        )
        ? reorderSelectInstructions(instructions)
        : instructions;
    default:
      return instructions;
  }
}

function reorderInputInstructions(
  instructions: readonly TemplateInstruction[],
): readonly TemplateInstruction[] {
  let modelOrValueOrMatcherIndex: number | undefined;
  let checkedIndex: number | undefined;
  let found = 0;
  for (let index = 0; index < instructions.length && found < 3; index++) {
    const target = runtimeInstructionTarget(instructions[index]!);
    if (
      target != null
      && isNativeInputCheckedInitializationPredecessor(target)
    ) {
      modelOrValueOrMatcherIndex = index;
      found++;
    } else if (target === nativeInputCheckedBindingSemantics.checkedTarget) {
      checkedIndex = index;
      found++;
    }
  }
  if (
    checkedIndex == null
    || modelOrValueOrMatcherIndex == null
    || checkedIndex >= modelOrValueOrMatcherIndex
  ) {
    return instructions;
  }
  return swapInstructions(instructions, modelOrValueOrMatcherIndex, checkedIndex);
}

function reorderSelectInstructions(
  instructions: readonly TemplateInstruction[],
): readonly TemplateInstruction[] {
  let valueIndex = 0;
  let multipleIndex = 0;
  let found = 0;
  for (let index = 0; index < instructions.length && found < 2; index++) {
    const target = runtimeInstructionTarget(instructions[index]!);
    if (target === nativeSelectValueBindingSemantics.multipleTarget) {
      multipleIndex = index;
      found++;
    } else if (target === nativeSelectValueBindingSemantics.valueTarget) {
      valueIndex = index;
      found++;
    }
  }
  return found === 2 && valueIndex < multipleIndex
    ? swapInstructions(instructions, multipleIndex, valueIndex)
    : instructions;
}

function swapInstructions(
  instructions: readonly TemplateInstruction[],
  leftIndex: number,
  rightIndex: number,
): readonly TemplateInstruction[] {
  const ordered = [...instructions];
  [ordered[leftIndex], ordered[rightIndex]] = [ordered[rightIndex]!, ordered[leftIndex]!];
  return ordered;
}

function runtimeInstructionTarget(
  instruction: TemplateInstruction,
): string | null {
  return instruction instanceof PropertyBindingInstruction
    ? instruction.targetProperty
    : instruction instanceof InterpolationInstruction
      ? instruction.target
      : null;
}
