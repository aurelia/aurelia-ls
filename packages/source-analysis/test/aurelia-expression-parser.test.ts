import { describe, expect, it } from './test-harness.js';

import {
  ExpressionCompanionFrameKind,
  ExpressionExpectedContinuationClass,
  ExpressionFrontierKind,
  ExpressionGapKind,
  ExpressionParser,
  ExpressionParseResultFlags,
  ExpressionParseResultInspector,
  ExpressionParseResultKind,
  ExpressionParseRequest,
  Scanner,
  NoParseSelection,
  IteratorActiveRegionKind,
  IteratorOfSeparatorStateKind,
  IteratorTrailingSplitKind,
  InterpolationHoleBoundaryKind,
  InterpolationSuppressedHolePublicationKind,
  MatchedDelimiterKind,
  ProgramRef,
  SelectedExpressionEntryFamily,
  SourceFileRef,
  Token,
  TokenFlags,
  TokenType,
  hasExpressionParseResultKindFlag,
  hasTokenFlag,
  tokenTypeName,
} from '../src/aurelia/index.js';
import * as expressionApi from '../src/aurelia/expression/index.js';

describe('aurelia expression parser', () => {
  it('publishes scanner tokens as class-backed numeric enum carriers with flag metadata', () => {
    const scanner = new Scanner('$this');
    const token = scanner.peek();

    expect(token).toBeInstanceOf(Token);
    expect(token.type).toBe(TokenType.KeywordDollarThis);
    expect(tokenTypeName(token.type)).toBe('KeywordDollarThis');
    expect(hasTokenFlag(token.type, TokenFlags.IdentifierName)).toBe(true);
    expect(hasTokenFlag(token.type, TokenFlags.PrimaryStart)).toBe(true);
    expect(hasTokenFlag(TokenType.Equals, TokenFlags.AssignmentOperator)).toBe(true);
    expect(hasTokenFlag(TokenType.KeywordTypeof, TokenFlags.PrefixUnaryOperator)).toBe(true);
  });

  it('publishes class-backed span carriers through the expression package helper surface', () => {
    const local = expressionApi.spanFromBounds(9, 3);
    const base = new expressionApi.SourceSpan(20, 10, null);
    const normalizedBase = expressionApi.normalizeSpan(base);
    const rebased = expressionApi.absoluteSpan(local, normalizedBase);

    expect(local).toBeInstanceOf(expressionApi.TextSpan);
    expect(local.start).toBe(3);
    expect(local.end).toBe(9);

    expect(normalizedBase).toBeInstanceOf(expressionApi.SourceSpan);
    expect(normalizedBase.start).toBe(10);
    expect(normalizedBase.end).toBe(20);
    expect(normalizedBase.file).toBeNull();

    expect(rebased).toBeInstanceOf(expressionApi.SourceSpan);
    expect(rebased?.start).toBe(13);
    expect(rebased?.end).toBe(19);
    expect(rebased?.file).toBeNull();
  });

  it('parses property-like expressions into runtime-shaped AST carriers', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('person.address.city', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.ExpressionSuccess);
    if (result.kind !== ExpressionParseResultKind.ExpressionSuccess) {
      throw new Error(`Expected ExpressionSuccess, received ${result.kind}`);
    }

    expect(result.ast.$kind).toBe('AccessMember');
    if (result.ast.$kind !== 'AccessMember') {
      throw new Error(`Expected AccessMember, received ${result.ast.$kind}`);
    }

    expect(result.primarySpan).toBeInstanceOf(expressionApi.SourceSpan);
    expect(result.ast.span).toBeInstanceOf(expressionApi.SourceSpan);
    expect(result.ast.name.name).toBe('city');
    expect(result.ast.object.$kind).toBe('AccessMember');
    expect(result.ast.accessGlobal).toBe(false);
  });

  it('treats empty property-like input as an empty primitive literal', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.EmptyExpressionSuccess);
    if (result.kind !== ExpressionParseResultKind.EmptyExpressionSuccess) {
      throw new Error(`Expected EmptyExpressionSuccess, received ${result.kind}`);
    }

    expect(result.ast.$kind).toBe('PrimitiveLiteral');
    if (result.ast.$kind !== 'PrimitiveLiteral') {
      throw new Error(`Expected PrimitiveLiteral, received ${result.ast.$kind}`);
    }

    expect(result.ast.value).toBe('');
    expect(result.ast.span.start).toBe(0);
    expect(result.ast.span.end).toBe(0);
  });

  it('publishes parser-owned result inspection helpers for completed, companion, and family questions', () => {
    const parser = new ExpressionParser();
    const completed = parser.parse('person.address', 'IsProperty');
    const companion = parser.parse('person.', 'IsProperty');
    const interpolation = parser.parse('Hello ${name.}', 'Interpolation');
    const hardError = parser.parse('item of items )', 'IsIterator');

    expect(ExpressionParseResultInspector.isCompleted(completed)).toBe(true);
    expect(ExpressionParseResultInspector.hasCanonicalAst(completed)).toBe(true);
    expect(ExpressionParseResultInspector.isPropertyLikeFamily(completed)).toBe(true);

    expect(ExpressionParseResultInspector.isCompanion(companion)).toBe(true);
    expect(ExpressionParseResultInspector.isPropertyLikeFamily(companion)).toBe(true);
    expect(ExpressionParseResultInspector.hasCanonicalAst(companion)).toBe(false);

    expect(ExpressionParseResultInspector.isCompanion(interpolation)).toBe(true);
    expect(ExpressionParseResultInspector.isInterpolationFamily(interpolation)).toBe(true);
    expect(ExpressionParseResultInspector.entryFamily(interpolation)).toBe('Interpolation');

    expect(ExpressionParseResultInspector.isHardParseError(hardError)).toBe(true);
    expect(ExpressionParseResultInspector.isIteratorFamily(hardError)).toBe(true);
  });

  it('publishes parser result-kind flags for family and outcome overlap without local switch duplication', () => {
    expect(
      hasExpressionParseResultKindFlag(
        ExpressionParseResultKind.ExpressionSuccess,
        ExpressionParseResultFlags.Completed,
      ),
    ).toBe(true);
    expect(
      hasExpressionParseResultKindFlag(
        ExpressionParseResultKind.ExpressionSuccess,
        ExpressionParseResultFlags.PropertyLikeFamily,
      ),
    ).toBe(true);
    expect(
      hasExpressionParseResultKindFlag(
        ExpressionParseResultKind.InterpolationSuccess,
        ExpressionParseResultFlags.HasCanonicalAst,
      ),
    ).toBe(true);
    expect(
      hasExpressionParseResultKindFlag(
        ExpressionParseResultKind.NoExpressionParse,
        ExpressionParseResultFlags.CustomFamily,
      ),
    ).toBe(true);
    expect(
      hasExpressionParseResultKindFlag(
        ExpressionParseResultKind.NoExpressionParse,
        ExpressionParseResultFlags.Completed,
      ),
    ).toBe(false);
  });

  it('exposes direct family parse methods beside the generic parse facade', () => {
    const parser = new ExpressionParser();
    const propertyLike = parser.parsePropertyLike('person.address');
    const iterator = parser.parseIterator('item of items');
    const interpolation = parser.parseInterpolation('Hello ${name}');
    const custom = parser.parseCustom('some custom payload');

    expect(propertyLike.kind).toBe(ExpressionParseResultKind.ExpressionSuccess);
    expect(iterator.kind).toBe(ExpressionParseResultKind.IteratorSuccess);
    expect(interpolation.kind).toBe(ExpressionParseResultKind.InterpolationSuccess);
    expect(custom.kind).toBe(ExpressionParseResultKind.OpaqueSuccess);
  });

  it('publishes explicit no-parse results through the selection lane', () => {
    const parser = new ExpressionParser();
    const result = parser.parseSelected(
      'person.address',
      NoParseSelection.entryFamilyNotSelected('IsProperty'),
    );

    expect(result.kind).toBe(ExpressionParseResultKind.NoExpressionParse);
    if (result.kind !== ExpressionParseResultKind.NoExpressionParse) {
      throw new Error(`Expected NoExpressionParse, received ${result.kind}`);
    }

    expect(result.entryFamily).toBe('IsProperty');
    expect(result.reason).toBe('entry-family-not-selected');
    expect(ExpressionParseResultInspector.isNonOwning(result)).toBe(true);
    expect(ExpressionParseResultInspector.secondaryGrammarOwner(result)).toBeNull();
  });

  it('threads secondary grammar ownership through opaque custom and no-parse selection publication', () => {
    const parser = new ExpressionParser();
    const opaque = parser.parseSelected(
      'rule:value',
      SelectedExpressionEntryFamily.custom('binding-command'),
    );
    const transferred = parser.parseRequest(
      ExpressionParseRequest.noParse(
        'rule:value',
        NoParseSelection.secondaryGrammarTransfer('IsCustom', 'binding-command'),
      ),
    );

    expect(opaque.kind).toBe(ExpressionParseResultKind.OpaqueSuccess);
    if (opaque.kind !== ExpressionParseResultKind.OpaqueSuccess) {
      throw new Error(`Expected OpaqueSuccess, received ${opaque.kind}`);
    }

    expect(opaque.secondaryGrammarOwner).toBe('binding-command');
    expect(ExpressionParseResultInspector.secondaryGrammarOwner(opaque)).toBe('binding-command');

    expect(transferred.kind).toBe(ExpressionParseResultKind.NoExpressionParse);
    if (transferred.kind !== ExpressionParseResultKind.NoExpressionParse) {
      throw new Error(`Expected NoExpressionParse, received ${transferred.kind}`);
    }

    expect(transferred.reason).toBe('secondary-grammar-transfer');
    expect(transferred.secondaryGrammarOwner).toBe('binding-command');
    expect(ExpressionParseResultInspector.secondaryGrammarOwner(transferred)).toBe('binding-command');
  });

  it('normalizes meaningless selection owners away outside their owning lanes', () => {
    const selected = new SelectedExpressionEntryFamily('IsProperty', 'binding-command');
    const declined = new NoParseSelection('IsProperty', 'caller-short-circuit', 'binding-command');

    expect(selected.secondaryGrammarOwner).toBeNull();
    expect(declined.secondaryGrammarOwner).toBeNull();
  });

  it('parses iterator headers and preserves the trailing-property split point', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('item of items; key: id', 'IsIterator');

    expect(result.kind).toBe(ExpressionParseResultKind.IteratorSuccess);
    if (result.kind !== ExpressionParseResultKind.IteratorSuccess) {
      throw new Error(`Expected IteratorSuccess, received ${result.kind}`);
    }

    expect(result.ast.$kind).toBe('ForOfStatement');
    if (result.ast.$kind !== 'ForOfStatement') {
      throw new Error(`Expected ForOfStatement, received ${result.ast.$kind}`);
    }

    expect(result.ast.semiIdx).toBeGreaterThan(-1);
    expect(result.ast.declaration.$kind).toBe('BindingIdentifier');
    expect(result.ast.iterable.$kind).toBe('AccessScope');
    expect(result.trailingSplit?.kind).toBe(IteratorTrailingSplitKind.RawTailVisible);
    expect(result.trailingSplit?.rawTailText).toBe(' key: id');
  });

  it('publishes iterator declaration frontiers distinctly from hard errors', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('', 'IsIterator');

    expect(result.kind).toBe(ExpressionParseResultKind.IteratorFrontierPublication);
    if (result.kind !== ExpressionParseResultKind.IteratorFrontierPublication) {
      throw new Error(`Expected IteratorFrontierPublication, received ${result.kind}`);
    }

    expect(result.activeRegionKind).toBe(IteratorActiveRegionKind.Declaration);
    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingBindingDeclaration);
    expect(result.expectedContinuationClasses).toEqual([
      ExpressionExpectedContinuationClass.BindingDeclaration,
    ]);
    expect(result.ofSeparator.kind).toBe(IteratorOfSeparatorStateKind.Absent);
  });

  it('publishes missing iterator separators as iterator-owned degraded truth', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('item', 'IsIterator');

    expect(result.kind).toBe(ExpressionParseResultKind.IteratorDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.IteratorDegradedPublication) {
      throw new Error(`Expected IteratorDegradedPublication, received ${result.kind}`);
    }

    expect(result.activeRegionKind).toBe(IteratorActiveRegionKind.Separator);
    expect(result.declaration?.$kind).toBe('BindingIdentifier');
    expect(result.ofSeparator.kind).toBe(IteratorOfSeparatorStateKind.Absent);
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingIteratorOf);
  });

  it('publishes iterator-owned iterable gaps instead of collapsing them to property-like hard errors', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('item of count +', 'IsIterator');

    expect(result.kind).toBe(ExpressionParseResultKind.IteratorDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.IteratorDegradedPublication) {
      throw new Error(`Expected IteratorDegradedPublication, received ${result.kind}`);
    }

    expect(result.activeRegionKind).toBe(IteratorActiveRegionKind.Iterable);
    expect(result.ofSeparator.kind).toBe(IteratorOfSeparatorStateKind.Present);
    expect(result.iterable).toBeNull();
    expect(result.iterableClosedSubtreeRefs[0]?.node.$kind).toBe('AccessScope');
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingExpression);
  });

  it('preserves iterator declaration pattern prefixes when the declaration is missing a closing delimiter', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('[item of items', 'IsIterator');

    expect(result.kind).toBe(ExpressionParseResultKind.IteratorDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.IteratorDegradedPublication) {
      throw new Error(`Expected IteratorDegradedPublication, received ${result.kind}`);
    }

    expect(result.activeRegionKind).toBe(IteratorActiveRegionKind.Declaration);
    expect(result.declaration).toBeNull();
    expect(result.declarationClosedSubtreeRefs[0]?.node.$kind).toBe('ArrayBindingPattern');
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingClosingDelimiter);
  });

  it('publishes missing binding declarations inside object pattern properties instead of hard errors', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('{ key: } of items', 'IsIterator');

    expect(result.kind).toBe(ExpressionParseResultKind.IteratorDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.IteratorDegradedPublication) {
      throw new Error(`Expected IteratorDegradedPublication, received ${result.kind}`);
    }

    expect(result.activeRegionKind).toBe(IteratorActiveRegionKind.Declaration);
    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingBindingDeclaration);
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingBindingDeclaration);
  });

  it('publishes missing binding declarations for array-pattern rest targets instead of collapsing to hard errors', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('[... ] of items', 'IsIterator');

    expect(result.kind).toBe(ExpressionParseResultKind.IteratorDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.IteratorDegradedPublication) {
      throw new Error(`Expected IteratorDegradedPublication, received ${result.kind}`);
    }

    expect(result.activeRegionKind).toBe(IteratorActiveRegionKind.Declaration);
    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingBindingDeclaration);
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingBindingDeclaration);
  });

  it('preserves nested object-pattern binding gaps inside iterator declarations', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('{ a: { b: } } of items', 'IsIterator');

    expect(result.kind).toBe(ExpressionParseResultKind.IteratorDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.IteratorDegradedPublication) {
      throw new Error(`Expected IteratorDegradedPublication, received ${result.kind}`);
    }

    expect(result.activeRegionKind).toBe(IteratorActiveRegionKind.Declaration);
    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingBindingDeclaration);
    expect(result.gapDescriptors.some((gap) => gap.gapKind === ExpressionGapKind.MissingBindingDeclaration)).toBe(true);
  });

  it('preserves nested array-pattern rest-target gaps inside iterator declarations', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('{ a: [b, ...] } of items', 'IsIterator');

    expect(result.kind).toBe(ExpressionParseResultKind.IteratorDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.IteratorDegradedPublication) {
      throw new Error(`Expected IteratorDegradedPublication, received ${result.kind}`);
    }

    expect(result.activeRegionKind).toBe(IteratorActiveRegionKind.Declaration);
    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingBindingDeclaration);
    expect(result.declarationClosedSubtreeRefs.some((ref) => ref.node.$kind === 'ArrayBindingPattern')).toBe(true);
    expect(result.gapDescriptors.some((gap) => gap.gapKind === ExpressionGapKind.MissingBindingDeclaration)).toBe(true);
  });

  it('preserves nested binding-pattern default initializer prefixes when the initializer goes incomplete', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('[{ key: alias = count + }] of items', 'IsIterator');

    expect(result.kind).toBe(ExpressionParseResultKind.IteratorDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.IteratorDegradedPublication) {
      throw new Error(`Expected IteratorDegradedPublication, received ${result.kind}`);
    }

    expect(result.activeRegionKind).toBe(IteratorActiveRegionKind.Declaration);
    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingExpression);
    expect(result.declarationClosedSubtreeRefs.some((ref) => ref.node.$kind === 'BindingIdentifier')).toBe(true);
    expect(result.declarationClosedSubtreeRefs.some((ref) => ref.node.$kind === 'AccessScope')).toBe(true);
    expect(result.gapDescriptors.some((gap) => gap.gapKind === ExpressionGapKind.MissingExpression)).toBe(true);
  });

  it('publishes visible iterator tail splits when a semicolon has no tail yet', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('item of items;', 'IsIterator');

    expect(result.kind).toBe(ExpressionParseResultKind.IteratorDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.IteratorDegradedPublication) {
      throw new Error(`Expected IteratorDegradedPublication, received ${result.kind}`);
    }

    expect(result.activeRegionKind).toBe(IteratorActiveRegionKind.TrailingSplit);
    expect(result.iterable?.$kind).toBe('AccessScope');
    expect(result.trailingSplit?.kind).toBe(IteratorTrailingSplitKind.SemicolonOnly);
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingIteratorTailSegment);
  });

  it('rejects unexpected trailing tokens after the iterable when no semicolon split is present', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('item of items )', 'IsIterator');

    expect(result.kind).toBe(ExpressionParseResultKind.CompleteInputParseError);
    if (result.kind !== ExpressionParseResultKind.CompleteInputParseError) {
      throw new Error(`Expected CompleteInputParseError, received ${result.kind}`);
    }

    expect(result.message).toContain("Unexpected token after iterator iterable");
  });

  it('parses interpolation and rebases spans to the provided source context', () => {
    const parser = new ExpressionParser();
    const program = new ProgramRef('program:test', 'C:/projects/aurelia-ls2', null);
    const file = new SourceFileRef('file:test', program, 'C:/projects/aurelia-ls2/app.html');
    const result = parser.parse('Hello ${name}', 'Interpolation', {
      baseOffset: 100,
      file,
    });

    expect(result.kind).toBe(ExpressionParseResultKind.InterpolationSuccess);
    if (result.kind !== ExpressionParseResultKind.InterpolationSuccess) {
      throw new Error(`Expected InterpolationSuccess, received ${result.kind}`);
    }

    expect(result.ast.$kind).toBe('Interpolation');
    expect(result.ast.parts).toEqual(['Hello ', '']);
    expect(result.ast.isMulti).toBe(false);
    expect(result.ast.firstExpression.$kind).toBe('AccessScope');
    expect(result.ast.expressions).toHaveLength(1);
    expect(result.ast.span.start).toBe(100);
    expect(result.ast.span.end).toBe(113);
    expect(result.ast.span.file?.id).toBe(file.id);
    expect(result.ast.expressions[0]?.span.start).toBe(108);
    expect(result.ast.expressions[0]?.span.end).toBe(112);
    expect(result.ast.expressions[0]?.$kind).toBe('AccessScope');
  });

  it('publishes interpolation absence distinctly from parse failure', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('Hello world', 'Interpolation');

    expect(result.kind).toBe(ExpressionParseResultKind.InterpolationAbsent);
    if (result.kind !== ExpressionParseResultKind.InterpolationAbsent) {
      throw new Error(`Expected InterpolationAbsent, received ${result.kind}`);
    }

    expect(result.rawText).toBe('Hello world');
  });

  it('publishes interpolation-owned missing-hole-close state instead of treating unterminated holes as hard errors', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('Hello ${name', 'Interpolation');

    expect(result.kind).toBe(ExpressionParseResultKind.InterpolationDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.InterpolationDegradedPublication) {
      throw new Error(`Expected InterpolationDegradedPublication, received ${result.kind}`);
    }

    expect(result.closedHoles).toHaveLength(0);
    expect(result.activeHole.frontierKind).toBe(ExpressionFrontierKind.AwaitingClosingDelimiter);
    expect(result.activeHole.boundaryState.kind).toBe(InterpolationHoleBoundaryKind.Unterminated);
    expect(result.activeHole.boundaryState.openSpan).not.toBeNull();
    expect(result.activeHole.boundaryState.closeSpan).toBeNull();
    expect(result.activeHole.expectedContinuationClasses).toEqual([
      ExpressionExpectedContinuationClass.InterpolationHoleClose,
    ]);
    expect(result.activeHole.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingClosingDelimiter);
  });

  it('publishes interpolation frontier state for empty unterminated holes', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('Hello ${', 'Interpolation');

    expect(result.kind).toBe(ExpressionParseResultKind.InterpolationFrontierPublication);
    if (result.kind !== ExpressionParseResultKind.InterpolationFrontierPublication) {
      throw new Error(`Expected InterpolationFrontierPublication, received ${result.kind}`);
    }

    expect(result.activeHole.frontierKind).toBe(ExpressionFrontierKind.AmbiguousClosure);
    expect(result.activeHole.boundaryState.kind).toBe(InterpolationHoleBoundaryKind.Unterminated);
    expect(result.activeHole.boundaryState.closeSpan).toBeNull();
    expect(result.activeHole.expectedContinuationClasses).toEqual([
      ExpressionExpectedContinuationClass.Expression,
      ExpressionExpectedContinuationClass.InterpolationHoleClose,
    ]);
  });

  it('publishes interpolation-owned degraded hole state instead of collapsing hole companions to hard errors', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('Hello ${name.}', 'Interpolation');

    expect(result.kind).toBe(ExpressionParseResultKind.InterpolationDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.InterpolationDegradedPublication) {
      throw new Error(`Expected InterpolationDegradedPublication, received ${result.kind}`);
    }

    expect(result.rawParts).toEqual(['Hello ', '']);
    expect(result.closedHoles).toHaveLength(0);
    expect(result.activeHole.holeIndex).toBe(0);
    expect(result.activeHole.boundaryState.kind).toBe(InterpolationHoleBoundaryKind.Closed);
    expect(result.activeHole.boundaryState.openSpan).not.toBeNull();
    expect(result.activeHole.boundaryState.closeSpan).not.toBeNull();
    expect(result.activeHole.bodyMatchedDelimiterStack).toEqual([]);
    expect(result.activeHole.frontierKind).toBe(ExpressionFrontierKind.AwaitingMemberName);
    expect(result.activeHole.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingMemberName);
  });

  it('preserves earlier closed holes when a later interpolation hole becomes active', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('${first}${count +}', 'Interpolation');

    expect(result.kind).toBe(ExpressionParseResultKind.InterpolationDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.InterpolationDegradedPublication) {
      throw new Error(`Expected InterpolationDegradedPublication, received ${result.kind}`);
    }

    expect(result.closedHoles).toHaveLength(1);
    expect(result.closedHoles[0]?.ast.$kind).toBe('AccessScope');
    expect(result.closedHoles[0]?.index).toBe(0);
    expect(result.activeHole.holeIndex).toBe(1);
    expect(result.activeHole.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingExpression);
  });

  it('keeps full scanned interpolation parts and later closed holes after the active hole', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('a${name.}b${done}c', 'Interpolation');

    expect(result.kind).toBe(ExpressionParseResultKind.InterpolationDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.InterpolationDegradedPublication) {
      throw new Error(`Expected InterpolationDegradedPublication, received ${result.kind}`);
    }

    expect(result.rawParts).toEqual(['a', 'b', 'c']);
    expect(result.activeHole.holeIndex).toBe(0);
    expect(result.closedHoles).toHaveLength(1);
    expect(result.closedHoles[0]?.index).toBe(1);
    expect(result.closedHoles[0]?.ast.$kind).toBe('AccessScope');
  });

  it('preserves earlier closed holes when a later unterminated hole becomes the active interpolation frontier', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('a${name}b${count', 'Interpolation');

    expect(result.kind).toBe(ExpressionParseResultKind.InterpolationDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.InterpolationDegradedPublication) {
      throw new Error(`Expected InterpolationDegradedPublication, received ${result.kind}`);
    }

    expect(result.rawParts).toEqual(['a', 'b']);
    expect(result.closedHoles).toHaveLength(1);
    expect(result.closedHoles[0]?.index).toBe(0);
    expect(result.closedHoles[0]?.ast.$kind).toBe('AccessScope');
    expect(result.activeHole.holeIndex).toBe(1);
    expect(result.activeHole.boundaryState.kind).toBe(InterpolationHoleBoundaryKind.Unterminated);
    expect(result.activeHole.frontierKind).toBe(ExpressionFrontierKind.AwaitingClosingDelimiter);
    expect(result.suppressedHoles).toEqual([]);
  });

  it('publishes later malformed interpolation holes as suppressed scanner-owned boundaries after the active hole is already claimed', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('a${name.}b${count +}c', 'Interpolation');

    expect(result.kind).toBe(ExpressionParseResultKind.InterpolationDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.InterpolationDegradedPublication) {
      throw new Error(`Expected InterpolationDegradedPublication, received ${result.kind}`);
    }

    expect(result.rawParts).toEqual(['a', 'b', 'c']);
    expect(result.activeHole.holeIndex).toBe(0);
    expect(result.closedHoles).toHaveLength(0);
    expect(result.suppressedHoles).toHaveLength(1);
    expect(result.suppressedHoles[0]?.index).toBe(1);
    expect(result.suppressedHoles[0]?.boundaryState.kind).toBe(InterpolationHoleBoundaryKind.Closed);
    expect(result.suppressedHoles[0]?.publicationKind).toBe(
      InterpolationSuppressedHolePublicationKind.CompanionSuppressed,
    );
  });

  it('keeps later closed interpolation holes even after a suppressed malformed hole boundary is visible', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('a${name.}b${count +}c${done}', 'Interpolation');

    expect(result.kind).toBe(ExpressionParseResultKind.InterpolationDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.InterpolationDegradedPublication) {
      throw new Error(`Expected InterpolationDegradedPublication, received ${result.kind}`);
    }

    expect(result.rawParts).toEqual(['a', 'b', 'c', '']);
    expect(result.activeHole.holeIndex).toBe(0);
    expect(result.suppressedHoles).toHaveLength(1);
    expect(result.suppressedHoles[0]?.index).toBe(1);
    expect(result.closedHoles).toHaveLength(1);
    expect(result.closedHoles[0]?.index).toBe(2);
    expect(result.closedHoles[0]?.ast.$kind).toBe('AccessScope');
  });

  it('publishes later hard-error interpolation holes as suppressed scanner-owned boundaries after the active hole is already claimed', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('a${name.}b${)}c', 'Interpolation');

    expect(result.kind).toBe(ExpressionParseResultKind.InterpolationDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.InterpolationDegradedPublication) {
      throw new Error(`Expected InterpolationDegradedPublication, received ${result.kind}`);
    }

    expect(result.activeHole.holeIndex).toBe(0);
    expect(result.closedHoles).toHaveLength(0);
    expect(result.suppressedHoles).toHaveLength(1);
    expect(result.suppressedHoles[0]?.index).toBe(1);
    expect(result.suppressedHoles[0]?.publicationKind).toBe(
      InterpolationSuppressedHolePublicationKind.HardErrorSuppressed,
    );
    expect(result.suppressedHoles[0]?.boundaryState.kind).toBe(InterpolationHoleBoundaryKind.Closed);
  });

  it('preserves multiple later suppressed interpolation hole boundaries in order', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('a${name.}b${count +}c${)}d', 'Interpolation');

    expect(result.kind).toBe(ExpressionParseResultKind.InterpolationDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.InterpolationDegradedPublication) {
      throw new Error(`Expected InterpolationDegradedPublication, received ${result.kind}`);
    }

    expect(result.activeHole.holeIndex).toBe(0);
    expect(result.suppressedHoles).toHaveLength(2);
    expect(result.suppressedHoles.map((hole) => hole.index)).toEqual([1, 2]);
    expect(result.suppressedHoles.map((hole) => hole.publicationKind)).toEqual([
      InterpolationSuppressedHolePublicationKind.CompanionSuppressed,
      InterpolationSuppressedHolePublicationKind.HardErrorSuppressed,
    ]);
  });

  it('rejects incomplete member access instead of fabricating a partial member node', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('person.', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeDegradedPublication) {
      throw new Error(`Expected PropertyLikeDegradedPublication, received ${result.kind}`);
    }

    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingMemberName);
    expect(result.surroundingFrameKind).toBe(ExpressionCompanionFrameKind.MemberAccess);
    expect(result.closedSubtreeRefs).toHaveLength(1);
    expect(result.closedSubtreeRefs[0]?.node.$kind).toBe('AccessScope');
    expect(result.gapDescriptors).toHaveLength(1);
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingMemberName);
  });

  it('publishes optional-chain continuation sites instead of hard errors', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('person?.', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeFrontierPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeFrontierPublication) {
      throw new Error(`Expected PropertyLikeFrontierPublication, received ${result.kind}`);
    }

    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingChainSegment);
    expect(result.surroundingFrameKind).toBe(ExpressionCompanionFrameKind.OptionalChain);
    expect(result.expectedContinuationClasses).toEqual([
      ExpressionExpectedContinuationClass.MemberName,
      ExpressionExpectedContinuationClass.OpenBracket,
      ExpressionExpectedContinuationClass.OpenParen,
    ]);
    expect(result.preservedSpan?.start).toBe(0);
    expect(result.preservedSpan?.end).toBe(8);
    expect(result.closedSubtreeRefs[0]?.node.$kind).toBe('AccessScope');
  });

  it('publishes $this member-name gaps instead of collapsing them to hard errors', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('$this.', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeDegradedPublication) {
      throw new Error(`Expected PropertyLikeDegradedPublication, received ${result.kind}`);
    }

    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingMemberName);
    expect(result.surroundingFrameKind).toBe(ExpressionCompanionFrameKind.MemberAccess);
    expect(result.preservedSpan?.start).toBe(0);
    expect(result.preservedSpan?.end).toBe(6);
    expect(result.closedSubtreeRefs[0]?.node.$kind).toBe('AccessThis');
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingMemberName);
  });

  it('publishes $parent scope-path continuation sites instead of hard errors', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('$parent.', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeFrontierPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeFrontierPublication) {
      throw new Error(`Expected PropertyLikeFrontierPublication, received ${result.kind}`);
    }

    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingChainSegment);
    expect(result.surroundingFrameKind).toBe(ExpressionCompanionFrameKind.ScopePath);
    expect(result.expectedContinuationClasses).toEqual([
      ExpressionExpectedContinuationClass.MemberName,
      ExpressionExpectedContinuationClass.ParentScopeKeyword,
    ]);
    expect(result.preservedSpan?.start).toBe(0);
    expect(result.preservedSpan?.end).toBe(8);
    expect(result.closedSubtreeRefs[0]?.node.$kind).toBe('AccessThis');
    if (result.closedSubtreeRefs[0]?.node.$kind !== 'AccessThis') {
      throw new Error(`Expected AccessThis, received ${result.closedSubtreeRefs[0]?.node.$kind}`);
    }
    expect(result.closedSubtreeRefs[0].node.ancestor).toBe(1);
  });

  it('publishes arrow-function body gaps once the arrow has been committed', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('value =>', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeDegradedPublication) {
      throw new Error(`Expected PropertyLikeDegradedPublication, received ${result.kind}`);
    }

    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingExpression);
    expect(result.surroundingFrameKind).toBe(ExpressionCompanionFrameKind.ArrowFunction);
    expect(result.preservedSpan?.start).toBe(0);
    expect(result.preservedSpan?.end).toBe(8);
    expect(result.closedSubtreeRefs[0]?.node.$kind).toBe('BindingIdentifier');
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingExpression);
  });

  it('publishes parenthesized-arrow body gaps without dropping parameter prefixes', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('(value, other) =>', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeDegradedPublication) {
      throw new Error(`Expected PropertyLikeDegradedPublication, received ${result.kind}`);
    }

    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingExpression);
    expect(result.surroundingFrameKind).toBe(ExpressionCompanionFrameKind.ArrowFunction);
    expect(result.closedSubtreeRefs).toHaveLength(2);
    expect(result.closedSubtreeRefs[0]?.node.$kind).toBe('BindingIdentifier');
    expect(result.closedSubtreeRefs[1]?.node.$kind).toBe('BindingIdentifier');
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingExpression);
  });

  it('publishes committed arrow-head parameter gaps instead of routing them through grouped-expression recovery', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('(value,', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeDegradedPublication) {
      throw new Error(`Expected PropertyLikeDegradedPublication, received ${result.kind}`);
    }

    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingBindingDeclaration);
    expect(result.surroundingFrameKind).toBe(ExpressionCompanionFrameKind.ArrowParameterList);
    expect(result.closedSubtreeRefs[0]?.node.$kind).toBe('BindingIdentifier');
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingBindingDeclaration);
  });

  it('publishes committed rest-parameter heads as arrow-parameter-list delimiter gaps', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('(...rest', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeDegradedPublication) {
      throw new Error(`Expected PropertyLikeDegradedPublication, received ${result.kind}`);
    }

    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingClosingDelimiter);
    expect(result.surroundingFrameKind).toBe(ExpressionCompanionFrameKind.ArrowParameterList);
    expect(result.expectedContinuationClasses).toEqual([
      ExpressionExpectedContinuationClass.CloseParen,
    ]);
    expect(result.closedSubtreeRefs[0]?.node.$kind).toBe('BindingIdentifier');
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingClosingDelimiter);
  });

  it("publishes missing '=>' after committed arrow parameter lists", () => {
    const parser = new ExpressionParser();
    const result = parser.parse('(value, other)', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeDegradedPublication) {
      throw new Error(`Expected PropertyLikeDegradedPublication, received ${result.kind}`);
    }

    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingSeparator);
    expect(result.surroundingFrameKind).toBe(ExpressionCompanionFrameKind.ArrowParameterList);
    expect(result.expectedContinuationClasses).toEqual([
      ExpressionExpectedContinuationClass.ArrowToken,
    ]);
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingArrowSeparator);
  });

  it('keeps single-parameter parenthesized expressions on the ordinary grouped-expression lane', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('(value)', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.ExpressionSuccess);
    if (result.kind !== ExpressionParseResultKind.ExpressionSuccess) {
      throw new Error(`Expected ExpressionSuccess, received ${result.kind}`);
    }

    expect(result.ast.$kind).toBe('Paren');
  });

  it('rejects committed invalid parenthesized arrow parameter lists instead of routing them through grouped-expression recovery', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('({ a }) => a', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.CompleteInputParseError);
    if (result.kind !== ExpressionParseResultKind.CompleteInputParseError) {
      throw new Error(`Expected CompleteInputParseError, received ${result.kind}`);
    }

    expect(result.message).toContain('Invalid arrow parameter list');
  });

  it('rejects default-valued arrow parameters instead of treating them as grouped assignments', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('(a = value) => a', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.CompleteInputParseError);
    if (result.kind !== ExpressionParseResultKind.CompleteInputParseError) {
      throw new Error(`Expected CompleteInputParseError, received ${result.kind}`);
    }

    expect(result.message).toContain('Invalid arrow parameter list');
  });

  it('publishes degraded operator gaps instead of hard-failing on missing right-hand sides', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('count +', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeDegradedPublication) {
      throw new Error(`Expected PropertyLikeDegradedPublication, received ${result.kind}`);
    }

    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingExpression);
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingExpression);
    expect(result.closedSubtreeRefs[0]?.node.$kind).toBe('AccessScope');
  });

  it('tracks delimiter state for incomplete parenthesized expressions', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('(count', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeDegradedPublication) {
      throw new Error(`Expected PropertyLikeDegradedPublication, received ${result.kind}`);
    }

    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingClosingDelimiter);
    expect(result.matchedDelimiterStack).toHaveLength(1);
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingClosingDelimiter);
  });

  it('uses frontier-only publication when a call can still close or accept its first argument', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('call(', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeFrontierPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeFrontierPublication) {
      throw new Error(`Expected PropertyLikeFrontierPublication, received ${result.kind}`);
    }

    expect(result.frontierKind).toBe(ExpressionFrontierKind.AmbiguousClosure);
    expect(result.surroundingFrameKind).toBe(ExpressionCompanionFrameKind.CallArguments);
    expect(result.expectedContinuationClasses).toEqual([
      ExpressionExpectedContinuationClass.Expression,
      ExpressionExpectedContinuationClass.CloseParen,
    ]);
    expect(result.preservedSpan?.start).toBe(0);
    expect(result.preservedSpan?.end).toBe(5);
    expect(result.closedSubtreeRefs[0]?.node.$kind).toBe('AccessScope');
  });

  it("publishes constructor-target frontiers instead of collapsing bare 'new' to a hard error", () => {
    const parser = new ExpressionParser();
    const result = parser.parse('new', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeFrontierPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeFrontierPublication) {
      throw new Error(`Expected PropertyLikeFrontierPublication, received ${result.kind}`);
    }

    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingExpression);
    expect(result.surroundingFrameKind).toBe(ExpressionCompanionFrameKind.NewExpression);
    expect(result.expectedContinuationClasses).toEqual([
      ExpressionExpectedContinuationClass.Expression,
    ]);
    expect(result.preservedSpan?.start).toBe(0);
    expect(result.preservedSpan?.end).toBe(3);
    expect(result.closedSubtreeRefs).toHaveLength(0);
  });

  it('publishes constructor-owned member gaps when a new-expression callee is incomplete', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('new person.', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeDegradedPublication) {
      throw new Error(`Expected PropertyLikeDegradedPublication, received ${result.kind}`);
    }

    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingMemberName);
    expect(result.surroundingFrameKind).toBe(ExpressionCompanionFrameKind.NewExpression);
    expect(result.preservedSpan?.start).toBe(0);
    expect(result.preservedSpan?.end).toBe(11);
    expect(result.closedSubtreeRefs[0]?.node.$kind).toBe('AccessScope');
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingMemberName);
  });

  it('publishes constructor-owned call frontiers when new-expression arguments are still open', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('new Person(', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeFrontierPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeFrontierPublication) {
      throw new Error(`Expected PropertyLikeFrontierPublication, received ${result.kind}`);
    }

    expect(result.frontierKind).toBe(ExpressionFrontierKind.AmbiguousClosure);
    expect(result.surroundingFrameKind).toBe(ExpressionCompanionFrameKind.NewExpression);
    expect(result.expectedContinuationClasses).toEqual([
      ExpressionExpectedContinuationClass.Expression,
      ExpressionExpectedContinuationClass.CloseParen,
    ]);
    expect(result.preservedSpan?.start).toBe(0);
    expect(result.preservedSpan?.end).toBe(11);
    expect(result.closedSubtreeRefs[0]?.node.$kind).toBe('AccessScope');
  });

  it('preserves inner binding-pattern prefixes when iterator declaration defaults go incomplete', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('[item = count +] of items', 'IsIterator');

    expect(result.kind).toBe(ExpressionParseResultKind.IteratorDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.IteratorDegradedPublication) {
      throw new Error(`Expected IteratorDegradedPublication, received ${result.kind}`);
    }

    expect(result.activeRegionKind).toBe(IteratorActiveRegionKind.Declaration);
    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingExpression);
    expect(result.declarationClosedSubtreeRefs[0]?.node.$kind).toBe('BindingIdentifier');
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingExpression);
  });

  it('publishes tail frontiers for incomplete value converter heads', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('value |', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeDegradedPublication) {
      throw new Error(`Expected PropertyLikeDegradedPublication, received ${result.kind}`);
    }

    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingTailSegment);
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingTailName);
  });

  it('publishes unary-prefix gaps instead of hard-failing on missing operands', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('!', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeDegradedPublication) {
      throw new Error(`Expected PropertyLikeDegradedPublication, received ${result.kind}`);
    }

    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingExpression);
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingExpression);
  });

  it('publishes ambiguous array starts as frontier-only instead of hard errors', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('[', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeFrontierPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeFrontierPublication) {
      throw new Error(`Expected PropertyLikeFrontierPublication, received ${result.kind}`);
    }

    expect(result.frontierKind).toBe(ExpressionFrontierKind.AmbiguousClosure);
    expect(result.expectedContinuationClasses).toEqual([
      ExpressionExpectedContinuationClass.Expression,
      ExpressionExpectedContinuationClass.Comma,
      ExpressionExpectedContinuationClass.CloseBracket,
    ]);
    expect(result.matchedDelimiterStack).toHaveLength(1);
  });

  it('preserves array literal prefixes when an inner element goes incomplete', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('[item, count +', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeDegradedPublication) {
      throw new Error(`Expected PropertyLikeDegradedPublication, received ${result.kind}`);
    }

    expect(result.closedSubtreeRefs[0]?.node.$kind).toBe('ArrayLiteral');
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingExpression);
  });

  it('publishes object literal key sites distinctly from hard errors', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('{', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeFrontierPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeFrontierPublication) {
      throw new Error(`Expected PropertyLikeFrontierPublication, received ${result.kind}`);
    }

    expect(result.frontierKind).toBe(ExpressionFrontierKind.AmbiguousClosure);
    expect(result.expectedContinuationClasses).toEqual([
      ExpressionExpectedContinuationClass.ObjectLiteralKey,
      ExpressionExpectedContinuationClass.CloseBrace,
    ]);
    expect(result.matchedDelimiterStack).toHaveLength(1);
  });

  it('publishes object literal missing separators as degraded companion truth', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('{ answer', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeDegradedPublication) {
      throw new Error(`Expected PropertyLikeDegradedPublication, received ${result.kind}`);
    }

    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingSeparator);
    expect(result.expectedContinuationClasses).toEqual([
      ExpressionExpectedContinuationClass.Colon,
    ]);
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingObjectValueSeparator);
  });

  it('publishes missing template closing delimiters instead of hard errors', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('`hello', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeDegradedPublication) {
      throw new Error(`Expected PropertyLikeDegradedPublication, received ${result.kind}`);
    }

    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingClosingDelimiter);
    expect(result.expectedContinuationClasses).toEqual([
      ExpressionExpectedContinuationClass.TemplateClose,
    ]);
    expect(result.matchedDelimiterStack[0]?.kind).toBe(MatchedDelimiterKind.Template);
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingClosingDelimiter);
  });

  it('publishes template-hole frontiers for empty hole starts', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('`${', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeFrontierPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeFrontierPublication) {
      throw new Error(`Expected PropertyLikeFrontierPublication, received ${result.kind}`);
    }

    expect(result.frontierKind).toBe(ExpressionFrontierKind.AmbiguousClosure);
    expect(result.expectedContinuationClasses).toEqual([
      ExpressionExpectedContinuationClass.Expression,
      ExpressionExpectedContinuationClass.CloseBrace,
    ]);
    expect(result.matchedDelimiterStack.map((entry) => entry.kind)).toEqual([
      MatchedDelimiterKind.Template,
      MatchedDelimiterKind.TemplateHole,
    ]);
  });

  it('publishes template-hole missing-close state with both template and hole context', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('`Hello ${name', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeDegradedPublication) {
      throw new Error(`Expected PropertyLikeDegradedPublication, received ${result.kind}`);
    }

    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingClosingDelimiter);
    expect(result.expectedContinuationClasses).toEqual([
      ExpressionExpectedContinuationClass.CloseBrace,
    ]);
    expect(result.matchedDelimiterStack.map((entry) => entry.kind)).toEqual([
      MatchedDelimiterKind.Template,
      MatchedDelimiterKind.TemplateHole,
    ]);
    expect(result.closedSubtreeRefs[0]?.node.$kind).toBe('Template');
    expect(result.closedSubtreeRefs[1]?.node.$kind).toBe('AccessScope');
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingClosingDelimiter);
  });

  it('wraps closed-hole inner companions in template-literal context', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('`${count +}`', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeDegradedPublication) {
      throw new Error(`Expected PropertyLikeDegradedPublication, received ${result.kind}`);
    }

    expect(result.frontierKind).toBe(ExpressionFrontierKind.AwaitingExpression);
    expect(result.matchedDelimiterStack.map((entry) => entry.kind)).toEqual([
      MatchedDelimiterKind.Template,
    ]);
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingExpression);
    expect(result.closedSubtreeRefs[0]?.node.$kind).toBe('AccessScope');
  });

  it('preserves closed object prefixes when later property values go incomplete', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('{ answer: 42, next: count +', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.PropertyLikeDegradedPublication);
    if (result.kind !== ExpressionParseResultKind.PropertyLikeDegradedPublication) {
      throw new Error(`Expected PropertyLikeDegradedPublication, received ${result.kind}`);
    }

    expect(result.closedSubtreeRefs[0]?.node.$kind).toBe('ObjectLiteral');
    expect(result.gapDescriptors[0]?.gapKind).toBe(ExpressionGapKind.MissingExpression);
  });

  it('propagates global-rooted member access and binding behavior identity fields', () => {
    const parser = new ExpressionParser();
    const result = parser.parse('Math.max & debounce', 'IsProperty');

    expect(result.kind).toBe(ExpressionParseResultKind.ExpressionSuccess);
    if (result.kind !== ExpressionParseResultKind.ExpressionSuccess) {
      throw new Error(`Expected ExpressionSuccess, received ${result.kind}`);
    }

    expect(result.ast.$kind).toBe('BindingBehavior');
    if (result.ast.$kind !== 'BindingBehavior') {
      throw new Error(`Expected BindingBehavior, received ${result.ast.$kind}`);
    }

    expect(result.ast.key).toBe('_bb_debounce');
    expect(result.ast.expression.$kind).toBe('AccessMember');
    if (result.ast.expression.$kind !== 'AccessMember') {
      throw new Error(`Expected AccessMember, received ${result.ast.expression.$kind}`);
    }

    expect(result.ast.expression.accessGlobal).toBe(true);
  });
});
