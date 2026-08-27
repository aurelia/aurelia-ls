import { describe, expect, test } from 'vitest';

import { ExpressionParser } from '../src/expression/expression-parser.js';
import { ExpressionParseResultKind } from '../src/expression/parse-result-algebra.js';
import { KernelHandleFactory } from '../src/kernel/handles.js';
import {
  HtmlIrNodeKind,
  HtmlNodeReference,
} from '../src/template/html-ir.js';
import { TextBindingInstruction } from '../src/template/instruction-ir.js';
import {
  TemplateCompilerTextHoleSourceRange,
  TemplateCompilerTextInstructionAllocation,
  type TemplateCompilerTextInstructionAllocationRequest,
  type TemplateCompilerTextInstructionStaging,
  type TemplateCompilerTextInstructionStagingAuthority,
  TemplateCompilerTextInstructionStagingRequest,
  stageTemplateCompilerTextInstructions,
} from '../src/template/template-compiler-text-instruction-staging.js';

describe('template compiler text instruction staging', () => {
  test('stages one nominal instruction for one parser-owned hole', () => {
    const run = stage('${message}', 'single');

    expect(run.result?.isModuleConstructed()).toBe(true);
    expect(run.result?.instructions).toHaveLength(1);
    expect(run.result?.holes[0]).toMatchObject({
      expressionChainIndex: 0,
      instruction: {
        instructionKind: 'text-binding',
        expressionChainIndex: 0,
        expressionProductHandle: run.expressionProductHandle,
      },
    });
    expect(run.result?.holes[0]?.instruction.sourceAddressHandle)
      .toBe(run.result?.holes[0]?.source.sourceAddressHandle);
    expect(run.authority.requests.map((request) => request.expressionChainIndex)).toEqual([0]);
  });

  test('stages multi-hole instructions in parser expression order with distinct stable handles and ranges', () => {
    const run = stage('before ${first} / ${second.value} after', 'multi');
    const result = required(run.result);

    expect(result.holes.map((hole) => hole.expressionChainIndex)).toEqual([0, 1]);
    expect(result.instructions.map((instruction) => instruction.expressionChainIndex)).toEqual([0, 1]);
    expect(result.instructions.every((instruction) =>
      instruction.expressionProductHandle === run.expressionProductHandle
    )).toBe(true);
    expect(new Set(result.instructions.map((instruction) => instruction.productHandle)).size).toBe(2);
    expect(result.holes.map((hole) => [hole.expressionSpan.start, hole.expressionSpan.end]))
      .toEqual(result.holes.map((hole) => [
        hole.source.expressionSpan.start,
        hole.source.expressionSpan.end,
      ]));
    expect(run.authority.requests.map((request) => request.occurrenceKey)).toEqual([
      'text:multi',
      'text:multi',
    ]);
  });

  test('allocates nothing for static text', () => {
    const run = stage('static text', 'static');

    expect(run.parseResult.kind).toBe(ExpressionParseResultKind.InterpolationAbsent);
    expect(run.result).toBeNull();
    expect(run.authority.requests).toEqual([]);
  });

  test('allocates nothing for companion or invalid interpolation results', () => {
    const companion = stage('${value', 'companion');
    const invalid = stage('${)', 'invalid');

    expect(companion.parseResult.kind).toBe(ExpressionParseResultKind.InterpolationFrontierPublication);
    expect(invalid.parseResult.kind).toBe(ExpressionParseResultKind.CompleteInputParseError);
    expect(companion.result).toBeNull();
    expect(invalid.result).toBeNull();
    expect(companion.authority.requests).toEqual([]);
    expect(invalid.authority.requests).toEqual([]);
  });
});

function stage(source: string, localKey: string): {
  readonly result: TemplateCompilerTextInstructionStaging | null;
  readonly parseResult: ReturnType<ExpressionParser['parse']>;
  readonly expressionProductHandle: ReturnType<KernelHandleFactory['product']>;
  readonly authority: TestTextInstructionAuthority;
} {
  const handles = new KernelHandleFactory(`text-instruction-staging:${localKey}`);
  const parser = new ExpressionParser();
  const parseResult = parser.parse(source, 'Interpolation');
  const authority = new TestTextInstructionAuthority(handles);
  const expressionProductHandle = handles.product(`expression:${localKey}`);
  const sources = parseResult.kind === ExpressionParseResultKind.InterpolationSuccess
    ? parseResult.ast.expressions.map((expression, expressionChainIndex) =>
        new TemplateCompilerTextHoleSourceRange(
          expressionChainIndex,
          expression.span,
          handles.address(`source:${localKey}:carrier`),
          handles.address(`source:${localKey}:hole:${expressionChainIndex}`),
        )
      )
    : [];
  const result = stageTemplateCompilerTextInstructions(new TemplateCompilerTextInstructionStagingRequest(
    authority,
    `site:${localKey}`,
    `text:${localKey}`,
    new HtmlNodeReference(
      HtmlIrNodeKind.Text,
      handles.identity(`text:${localKey}`),
      handles.product(`text:${localKey}`),
      handles.address(`source:${localKey}:text`),
    ),
    expressionProductHandle,
    parseResult,
    sources,
  ));
  return { result, parseResult, expressionProductHandle, authority };
}

class TestTextInstructionAuthority implements TemplateCompilerTextInstructionStagingAuthority {
  readonly requests: TemplateCompilerTextInstructionAllocationRequest[] = [];

  constructor(readonly handles: KernelHandleFactory) {}

  create(
    request: TemplateCompilerTextInstructionAllocationRequest,
    factory: (allocation: TemplateCompilerTextInstructionAllocation) => TextBindingInstruction,
  ): TextBindingInstruction {
    this.requests.push(request);
    const local = `${request.siteKey}:hole:${request.expressionChainIndex}`;
    return factory(new TemplateCompilerTextInstructionAllocation(
      this.handles.product(local),
      this.handles.identity(local),
      local,
    ));
  }
}

function required<T>(value: T | null): T {
  if (value == null) throw new Error('Expected complete text instruction staging.');
  return value;
}
