import { SemanticClaim } from '../kernel/claim.js';
import type { ProductHandle } from '../kernel/handles.js';
import type { KernelStoreRecord } from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';

/** Ordered producer/expression-role claims retained by binding-command lowering publication. */
export class TemplateCompilerNormalizedClaimIndex {
  private readonly expressionParsesByProducerInstruction = new Map<string, ProductHandle[]>();
  private readonly instructionsByProducer = new Map<ProductHandle, ProductHandle[]>();

  constructor(records: readonly KernelStoreRecord[]) {
    let producer: ProductHandle | null = null;
    let instruction: ProductHandle | null = null;
    for (const record of records) {
      if (!(record instanceof SemanticClaim)) {
        producer = null;
        instruction = null;
        continue;
      }
      if (record.predicateKey === KernelVocabulary.Compiler.ProducesInstruction.key) {
        producer = record.subjectHandle as ProductHandle;
        instruction = record.objectHandle as ProductHandle;
        append(this.instructionsByProducer, producer, instruction);
      } else if (
        record.predicateKey === KernelVocabulary.Compiler.UsesExpressionParse.key
        && producer != null
        && instruction === record.subjectHandle
      ) {
        append(
          this.expressionParsesByProducerInstruction,
          producerInstructionKey(producer, instruction),
          record.objectHandle as ProductHandle,
        );
      } else {
        producer = null;
        instruction = null;
      }
    }
  }

  expressionParsesForInstruction(
    producerProductHandle: ProductHandle,
    instructionProductHandle: ProductHandle,
  ): readonly ProductHandle[] {
    return this.expressionParsesByProducerInstruction.get(
      producerInstructionKey(producerProductHandle, instructionProductHandle),
    ) ?? [];
  }

  instructionsForProducer(producerProductHandle: ProductHandle): readonly ProductHandle[] {
    return this.instructionsByProducer.get(producerProductHandle) ?? [];
  }
}

function append<TKey>(
  map: Map<TKey, ProductHandle[]>,
  key: TKey,
  value: ProductHandle,
): void {
  const values = map.get(key);
  if (values == null) map.set(key, [value]);
  else values.push(value);
}

function producerInstructionKey(producer: ProductHandle, instruction: ProductHandle): string {
  return JSON.stringify([producer, instruction]);
}
