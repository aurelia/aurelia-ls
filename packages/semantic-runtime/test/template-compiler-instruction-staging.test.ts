import { describe, expect, test } from 'vitest';

import { ExpressionParser } from '../src/expression/expression-parser.js';
import { ExpressionParseResultKind } from '../src/expression/parse-result-algebra.js';
import { KernelHandleFactory } from '../src/kernel/handles.js';
import {
  TemplateAttributeEmptyValueBindingPolicy,
} from '../src/template/attribute-value-site-selection.js';
import { CompiledTemplateReference } from '../src/template/compiled-template.js';
import {
  HtmlAttributeReference,
  HtmlIrNodeKind,
  HtmlNodeReference,
} from '../src/template/html-ir.js';
import {
  HydrateAttributeInstruction,
  HydrateTemplateControllerInstruction,
  InterpolationInstruction,
  SetPropertyInstruction,
} from '../src/template/instruction-ir.js';
import {
  TemplateCompilerElementInstructionBuckets,
  TemplateCompilerElementInstructionStagingState,
  TemplateCompilerHydrateAttributeStagingRequest,
  TemplateCompilerHydrateTemplateControllerDraft,
  TemplateCompilerInstructionStagingAllocation,
  type TemplateCompilerInstructionStagingAllocationRequest,
  type TemplateCompilerInstructionStagingAuthority,
  TemplateCompilerStaticAttributePolicy,
  TemplateCompilerValueInstructionLane,
  TemplateCompilerValueInstructionStagingRequest,
  stageTemplateCompilerHydrateAttributeInstruction,
  stageTemplateCompilerHydrateTemplateControllerInstruction,
  stageTemplateCompilerValueInstruction,
} from '../src/template/template-compiler-instruction-staging.js';

describe('template compiler instruction staging laws', () => {
  test('shares literal, interpolation, empty-no-binding, and companion leaf selection', () => {
    const parser = new ExpressionParser();
    const absent = parser.parse('literal', 'Interpolation');
    const interpolation = parser.parse('${value}', 'Interpolation');
    const companion = parser.parse('${value', 'Interpolation');
    expect(absent.kind).toBe(ExpressionParseResultKind.InterpolationAbsent);
    expect(interpolation.kind).toBe(ExpressionParseResultKind.InterpolationSuccess);
    expect(companion.kind).toBe(ExpressionParseResultKind.InterpolationFrontierPublication);

    const authority = new TestInstructionAuthority('leaf');
    const literal = stageTemplateCompilerValueInstruction(valueRequest(
      authority,
      'literal',
      TemplateCompilerValueInstructionLane.ElementBindable,
      absent,
      null,
    ));
    const dynamic = stageTemplateCompilerValueInstruction(valueRequest(
      authority,
      'dynamic',
      TemplateCompilerValueInstructionLane.Plain,
      interpolation,
      null,
    ));
    const empty = stageTemplateCompilerValueInstruction(valueRequest(
      authority,
      'empty',
      TemplateCompilerValueInstructionLane.CustomAttribute,
      absent,
      TemplateAttributeEmptyValueBindingPolicy.NoBinding,
      '',
    ));
    const open = stageTemplateCompilerValueInstruction(valueRequest(
      authority,
      'open',
      TemplateCompilerValueInstructionLane.Plain,
      companion,
      null,
    ));

    expect(literal).toBeInstanceOf(SetPropertyInstruction);
    expect(dynamic).toBeInstanceOf(InterpolationInstruction);
    expect(empty).toBeNull();
    expect(open).toBeNull();
    expect(authority.requests.map((request) => request.kind)).toEqual([
      'set-property',
      'interpolation',
    ]);
  });

  test('shares CA wrapper construction while leaving TC child reservation as a draft boundary', () => {
    const parser = new ExpressionParser();
    const authority = new TestInstructionAuthority('wrappers');
    const prop = stageTemplateCompilerValueInstruction(valueRequest(
      authority,
      'prop',
      TemplateCompilerValueInstructionLane.CustomAttribute,
      parser.parse('literal', 'Interpolation'),
      null,
    ));
    if (prop == null) throw new Error('Expected staged CA prop.');
    const hydrate = stageTemplateCompilerHydrateAttributeInstruction(
      new TemplateCompilerHydrateAttributeStagingRequest(
        authority,
        'site:ca',
        'ca',
        node,
        attribute,
        'focus',
        null,
        [prop],
        null,
      ),
    );
    const draft = new TemplateCompilerHydrateTemplateControllerDraft(
      'site:tc',
      'tc',
      node,
      attribute,
      'if',
      null,
      [],
      null,
    );
    const controller = stageTemplateCompilerHydrateTemplateControllerInstruction(
      draft,
      authority,
      (local) => new CompiledTemplateReference(
        authority.handles.product(`${local}:child`),
        authority.handles.identity(`${local}:child`),
      ),
    );

    expect(hydrate).toBeInstanceOf(HydrateAttributeInstruction);
    expect(hydrate.bindingInstructionProductHandles).toEqual([prop.productHandle]);
    expect(controller).toBeInstanceOf(HydrateTemplateControllerInstruction);
    expect(controller.childCompiledTemplate).not.toBeNull();
    expect(draft.props).toEqual([]);
  });

  test('retains bucket identity while ordering only the final plain sequence', () => {
    const parser = new ExpressionParser();
    const authority = new TestInstructionAuthority('buckets');
    const value = stageTemplateCompilerValueInstruction(valueRequest(
      authority,
      'value',
      TemplateCompilerValueInstructionLane.Plain,
      parser.parse('${value}', 'Interpolation'),
      null,
      '${value}',
      'value',
    ));
    const multiple = stageTemplateCompilerValueInstruction(valueRequest(
      authority,
      'multiple',
      TemplateCompilerValueInstructionLane.Plain,
      parser.parse('${multiple}', 'Interpolation'),
      null,
      '${multiple}',
      'multiple',
    ));
    if (value == null || multiple == null) throw new Error('Expected native-order instructions.');
    const buckets = new TemplateCompilerElementInstructionBuckets<string>(['containerless']);
    buckets.plainInstructions.push(value, multiple);
    buckets.captures.push('capture:data-extra');
    const result = buckets.finish(
      TemplateCompilerElementInstructionStagingState.Complete,
      { tagName: 'select' },
      { hasAttribute: () => false, getAttribute: () => null },
    );

    expect(result.plainInstructions).toEqual([value, multiple]);
    expect(result.orderedPlainInstructions).toEqual([multiple, value]);
    expect(result.directRowTail).toEqual([multiple, value]);
    expect(result.captures).toEqual(['capture:data-extra']);
    expect(result.structuralEffects).toEqual(['containerless']);
  });
});

const node = new HtmlNodeReference(HtmlIrNodeKind.Element, null, null, null);
const attribute = new HtmlAttributeReference(null, null, 'value');

class TestInstructionAuthority implements TemplateCompilerInstructionStagingAuthority {
  readonly handles: KernelHandleFactory;
  readonly requests: TemplateCompilerInstructionStagingAllocationRequest[] = [];

  constructor(local: string) {
    this.handles = new KernelHandleFactory(`contract:instruction-staging:${local}`);
  }

  create<TInstruction>(
    request: TemplateCompilerInstructionStagingAllocationRequest,
    factory: (allocation: TemplateCompilerInstructionStagingAllocation) => TInstruction,
  ): TInstruction {
    this.requests.push(request);
    const local = `${request.siteKey}:${request.local}`;
    return factory(new TemplateCompilerInstructionStagingAllocation(
      this.handles.product(local),
      this.handles.identity(local),
      local,
    ));
  }
}

function valueRequest(
  authority: TemplateCompilerInstructionStagingAuthority,
  local: string,
  lane: TemplateCompilerValueInstructionLane,
  result: ReturnType<ExpressionParser['parse']>,
  emptyPolicy: TemplateAttributeEmptyValueBindingPolicy | null,
  rawValue = 'literal',
  target = 'value',
): TemplateCompilerValueInstructionStagingRequest {
  return new TemplateCompilerValueInstructionStagingRequest(
    authority,
    `site:${local}`,
    local,
    node,
    attribute,
    {
      runtimeRawName: target,
      rawValue,
      target,
      targetSourceAddressHandle: null,
      sourceAddressHandle: null,
    },
    lane,
    target,
    authority instanceof TestInstructionAuthority ? authority.handles.product(`${local}:expression`) : null,
    result,
    emptyPolicy,
    TemplateCompilerStaticAttributePolicy.Preserve,
    target,
    null,
  );
}
