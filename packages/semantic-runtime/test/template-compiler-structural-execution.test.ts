import { describe, expect, test } from 'vitest';

import {
  CompiledTemplateReference,
  TemplateRenderTargetKind,
} from '../src/template/compiled-template.js';
import {
  TemplateCompilationContextKind,
  TemplateCompilationContextReference,
} from '../src/template/compilation-unit.js';
import {
  TemplateCompilerContainerlessReplacementPlacement,
  TemplateCompilerMarkerTargetPlacement,
  TemplateCompilerTemplateControllerSourceReplacementPlacement,
  TemplateCompilerTargetPlan,
  TemplateCompilerTargetRowPosture,
  type TemplateCompilerTargetContextPlan,
  type TemplateCompilerTargetOccurrenceMembershipArrivalAuthority,
  type TemplateCompilerTemplateControllerTransitionSourceRowAuthority,
} from '../src/template/compiler-target-plan.js';
import {
  HtmlCommentSemanticKind,
  HtmlComment,
  HtmlElement,
  HtmlNamespaceKind,
  HtmlText,
} from '../src/template/html-ir.js';
import {
  AuSlotProcessContentInstructionData,
  HydrateElementInstruction,
  HydrateElementProjectionContributor,
  HydrateElementProjectionContributorDisposition,
  HydrateElementProjectionDefinition,
  HydrateTemplateControllerInstruction,
  SetAttributeInstruction,
  TextBindingInstruction,
} from '../src/template/instruction-ir.js';
import {
  TemplateCompilerCommentOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerGeneratedOccurrenceRole,
  TemplateCompilerOccurrenceEdgeKind,
  TemplateCompilerOccurrenceForest,
  TemplateCompilerOccurrenceGeneration,
  type TemplateCompilerNodeOccurrence,
  TemplateCompilerTextOccurrence,
} from '../src/template/template-compiler-occurrence.js';
import { TemplateCompilerOccurrenceMembershipArrivalPosture } from '../src/template/template-compiler-occurrence-membership.js';
import {
  type TemplateCompilerRenderLocationTargetGeometry,
  TemplateCompilerStructuralExecutionSession,
  TemplateCompilerTargetGeometryKind,
} from '../src/template/template-compiler-structural-execution.js';
import {
  TemplateStructuralAttributeReference,
  TemplateStructuralNodeReference,
} from '../src/template/template-structure.js';
import {
  BrowserEffectiveTemplateFixture,
} from './browser-effective-template-fixture.js';

describe('template compiler structural execution mechanics', () => {
  test('owns multiple target plans and exact root structures in one occurrence family', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-structural-family');

    try {
      const input = fixture.materialize('family', '<div>one</div><span>two</span>');
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
      const firstPlan = createTargetPlan(fixture, 'family:first');
      const secondPlan = createTargetPlan(fixture, 'family:second');
      for (const node of [
        requiredAuthoredElement(input.authoredHtml.nodes, 'div'),
        requiredAuthoredText(input.authoredHtml.nodes, 'one'),
        requiredAuthoredElement(input.authoredHtml.nodes, 'span'),
        requiredAuthoredText(input.authoredHtml.nodes, 'two'),
      ]) {
        firstPlan.root.recordCompilerReachableNode(node.productHandle);
      }

      const session = TemplateCompilerStructuralExecutionSession.create(forest, firstPlan);
      expect(() => session.admitTargetPlan(secondPlan)).toThrow(/must be sealed/);
      expect(session.readTargetPlans()).toEqual([firstPlan]);
      expect(session.readContexts()).toEqual([firstPlan.root]);
      secondPlan.seal();
      session.admitTargetPlan(secondPlan);
      expect(session.readTargetPlans()).toEqual([firstPlan, secondPlan]);
      expect(session.readContexts()).toEqual([firstPlan.root, secondPlan.root]);
      expect(() => session.assertCoherent()).toThrow(/does not cover every target context/);

      const secondStructure = session.createGeneratedContextStructure(secondPlan.root);
      expect(session.readContextStructure(firstPlan.root)?.compilerCarrier).toBe(forest.compilerCarrier);
      expect(session.readContextStructure(secondPlan.root)).toBe(secondStructure);
      expect(session.structuralContextForOccurrence(requiredOccurrenceElement(forest, 'div'))).toBe(firstPlan.root);
      expect(session.compilationContextForOccurrence(requiredOccurrenceElement(forest, 'div'))).toBe(firstPlan.root);
      expect(session.structuralContextForOccurrence(secondStructure.compilerCarrier)).toBe(secondPlan.root);
      expect(session.compilationContextForOccurrence(secondStructure.compilerCarrier)).toBeNull();
      expect(session.contextForLocalKey(secondPlan.root.localKey)).toBe(secondPlan.root);
      expect(forest.readRoots()).toEqual([forest.compilerCarrier, secondStructure.compilerCarrier]);
      expect(secondStructure.compilerContent.readChildren()).toEqual([]);
      session.assertCoherent();

      expect(() => session.admitTargetPlan(secondPlan)).toThrow(/already admitted/);
      const duplicatePlanKey = createTargetPlan(fixture, 'family:first');
      duplicatePlanKey.seal();
      expect(() => session.admitTargetPlan(duplicatePlanKey)).toThrow(/plan key.*not unique/);
      const duplicateCompiledRoot = new TemplateCompilerTargetPlan(
        'family:duplicate-compiled-root:target-plan',
        new TemplateCompilationContextReference(
          fixture.run.handles.product('family:duplicate-compiled-root:root-context'),
          fixture.run.handles.identity('family:duplicate-compiled-root:root-context'),
          TemplateCompilationContextKind.Root,
          null,
        ),
        secondPlan.root.compiledTemplate,
      );
      duplicateCompiledRoot.seal();
      expect(() => session.admitTargetPlan(duplicateCompiledRoot)).toThrow(/Compiled-template product/);
      const duplicateReachableNode = createTargetPlan(fixture, 'family:duplicate-reachable-node');
      duplicateReachableNode.root.recordCompilerReachableNode(
        requiredAuthoredElement(input.authoredHtml.nodes, 'div').productHandle,
      );
      duplicateReachableNode.seal();
      expect(() => session.admitTargetPlan(duplicateReachableNode)).toThrow(/Compiler-reachable node/);
      expect(session.readTargetPlans()).toEqual([firstPlan, secondPlan]);
      expect(session.readContexts()).toEqual([firstPlan.root, secondPlan.root]);
      session.assertCoherent();

      const sharedContributor = new HydrateElementProjectionContributor(
        requiredAuthoredText(input.authoredHtml.nodes, 'one').toReference(),
        'default',
        null,
        null,
        HydrateElementProjectionContributorDisposition.RetainedNode,
      );
      const contributorOwner = createProjectionContributorPlan(
        fixture,
        'family:contributor-owner',
        requiredAuthoredElement(input.authoredHtml.nodes, 'div'),
        sharedContributor,
      );
      contributorOwner.seal();
      session.admitTargetPlan(contributorOwner);
      const targetPlansBeforeRejectedContributor = [...session.readTargetPlans()];
      const contextsBeforeRejectedContributor = [...session.readContexts()];
      const contributorReuse = createProjectionContributorPlan(
        fixture,
        'family:contributor-reuse',
        requiredAuthoredElement(input.authoredHtml.nodes, 'div'),
        sharedContributor,
      );
      contributorReuse.seal();
      expect(() => session.admitTargetPlan(contributorReuse)).toThrow(/Projection contributor object/);
      expect(session.readTargetPlans()).toEqual(targetPlansBeforeRejectedContributor);
      expect(session.readContexts()).toEqual(contextsBeforeRejectedContributor);
    } finally {
      fixture.dispose();
    }
  });

  test('separates final compilation membership from pre-transfer structural ownership', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-context-axis-split');
    try {
      const input = fixture.materialize('context-axis-split', '<div></div>');
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
      const authoredDiv = requiredAuthoredElement(input.authoredHtml.nodes, 'div');
      const div = requiredOccurrenceElement(forest, 'div');
      const targetPlan = createTargetPlan(fixture, 'context-axis-split');
      const instruction = templateControllerInstruction(fixture, authoredDiv, 'context-axis-split');
      const child = targetPlan.createTemplateControllerContext(targetPlan.root, instruction);
      const row = targetPlan.root.appendRow(
        'context-axis-split',
        authoredDiv,
        [instruction],
        TemplateRenderTargetKind.RenderLocation,
        TemplateCompilerTargetRowPosture.Complete,
        1,
        [],
        authoredDiv.sourceAddressHandle,
        new TemplateCompilerTemplateControllerSourceReplacementPlacement(instruction),
      );
      if (row == null) throw new Error('Expected source-replacement row.');
      const arrival = membershipArrivalAuthority(
        child,
        div,
        TemplateCompilerOccurrenceMembershipArrivalPosture.IncomingTransfer,
      );
      const membership = child.recordCompilerReachableOccurrence(
        'context-axis-split:div',
        div,
        authoredDiv,
        TemplateCompilerOccurrenceMembershipArrivalPosture.IncomingTransfer,
        arrival,
      );

      const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);

      expect(session.compilationContextForOccurrence(div)).toBe(child);
      expect(session.structuralContextForOccurrence(div)).toBe(targetPlan.root);
      expect(membership.arrivalPosture).toBe(TemplateCompilerOccurrenceMembershipArrivalPosture.IncomingTransfer);
    } finally {
      fixture.dispose();
    }
  });

  test('does not infer render-location placement from the runtime target kind', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-explicit-placement');
    try {
      const input = fixture.materialize('explicit-placement', '<div></div>');
      const authoredDiv = requiredAuthoredElement(input.authoredHtml.nodes, 'div');
      const targetPlan = createTargetPlan(fixture, 'explicit-placement');
      const instruction = setAttributeInstruction(fixture, authoredDiv, 'explicit-placement');
      const row = targetPlan.root.appendRow(
        'explicit-placement',
        authoredDiv,
        [instruction],
        TemplateRenderTargetKind.RenderLocation,
      );
      expect(row?.placement).toBeInstanceOf(TemplateCompilerMarkerTargetPlacement);
      expect(() => targetPlan.assertCoherent()).toThrow(/incoherent context ownership/);
    } finally {
      fixture.dispose();
    }
  });

  test('keeps text-output generation independent from input origin and realizes marker preorder exactly', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-structural-text');

    try {
      const input = fixture.materialize('text', '<!--au--><div title="x">before</div>');
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
      const authoredText = input.authoredHtml.nodes.find((node): node is HtmlText =>
        node instanceof HtmlText && node.text === 'before'
      );
      const inputText = forest.readNodes().find((node): node is TemplateCompilerTextOccurrence =>
        node instanceof TemplateCompilerTextOccurrence && node.text === 'before'
      );
      const inputElement = forest.readNodes().find((node): node is TemplateCompilerElementOccurrence =>
        node instanceof TemplateCompilerElementOccurrence && node.tagName.toLowerCase() === 'div'
      );
      const authoredElement = input.authoredHtml.nodes.find((node): node is HtmlElement =>
        node instanceof HtmlElement && node.tagName.toLowerCase() === 'div'
      );
      if (
        authoredText == null
        || inputText == null
        || inputText.inputReference == null
        || inputElement == null
        || inputElement.inputReference == null
        || authoredElement == null
      ) {
        throw new Error('Expected authored and browser-effective text occurrences.');
      }
      const instructions = [0, 1].map((expressionChainIndex) => new TextBindingInstruction(
        fixture.run.handles.product(`text-instruction:${expressionChainIndex}`),
        fixture.run.handles.identity(`text-instruction:${expressionChainIndex}`),
        authoredText.toReference(),
        null,
        expressionChainIndex,
        authoredText.sourceAddressHandle,
      ));
      const targetPlan = createTargetPlan(fixture, 'text');
      targetPlan.root.recordCompilerReachableNode(authoredElement.productHandle);
      targetPlan.root.recordCompilerReachableNode(authoredText.productHandle);
      const rows = instructions.map((instruction, index) => targetPlan.root.appendRow(
        `text-hole:${index}`,
        authoredText,
        [instruction],
        TemplateRenderTargetKind.MarkerTarget,
      ));
      if (rows.some((row) => row == null)) throw new Error('Expected two complete text target rows.');
      const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
      expect(() => session.assertCoherent()).toThrow(/no exact structural geometry/);

      const parent = inputText.parent;
      if (parent == null) throw new Error('Expected live input text ownership.');
      const causes = instructions.map((instruction) => instruction.productHandle);
      const staticText = forest.createGeneratedText(
        session.createGeneration(
          targetPlan.root,
          'text-static-parts',
          TemplateCompilerGeneratedOccurrenceRole.StaticTextSegment,
          causes,
          0,
        ),
        'before',
        inputText.inputReference,
      );
      const placeholders = rows.map((row, index) => forest.createGeneratedText(
        session.createGeneration(
          targetPlan.root,
          row!.localKey,
          TemplateCompilerGeneratedOccurrenceRole.BindingPlaceholder,
          [instructions[index]!.productHandle],
          0,
        ),
        ' ',
        inputText.inputReference,
      ));
      session.expandTextInput(inputText, targetPlan.root, [staticText, ...placeholders], causes);
      const firstGeometry = session.realizeMarkerTarget(rows[0]!, placeholders[0]!);
      expect(() => session.realizeMarkerTarget(rows[1]!, placeholders[0]!)).toThrow(/binding placeholder/);
      const secondGeometry = session.realizeMarkerTarget(rows[1]!, placeholders[1]!);
      session.assertCoherent();
      expect(parent.readChildren()).toEqual([
        staticText,
        firstGeometry.marker,
        placeholders[0],
        secondGeometry.marker,
        placeholders[1],
      ]);
      expect(firstGeometry.logicalTarget).toBe(placeholders[0]);
      expect(secondGeometry.logicalTarget).toBe(placeholders[1]);
      expect(inputText.text).toBe('before');
      expect(inputText.parentEdgeKind).toBe(TemplateCompilerOccurrenceEdgeKind.Detached);
      expect(forest.nodesForInputProduct(inputText.inputReference.productHandle)).toEqual([
        inputText,
        staticText,
        ...placeholders,
      ]);
      expect(staticText.inputReference).toBe(inputText.inputReference);
      expect(staticText.generation?.role).toBe(TemplateCompilerGeneratedOccurrenceRole.StaticTextSegment);
      expect(placeholders.every((placeholder) => placeholder.inputReference === inputText.inputReference)).toBe(true);
      expect(placeholders.every((placeholder) =>
        placeholder.generation?.role === TemplateCompilerGeneratedOccurrenceRole.BindingPlaceholder
      )).toBe(true);
      expect(firstGeometry.marker.inputReference).toBeNull();
      expect(firstGeometry.marker.semanticKind).toBe(HtmlCommentSemanticKind.CompilerMarker);
      expect(forest.readNodes().filter((node): node is TemplateCompilerCommentOccurrence =>
        node instanceof TemplateCompilerCommentOccurrence && node.text === 'au'
      ).map((comment) => comment.semanticKind)).toEqual([
        HtmlCommentSemanticKind.Plain,
        HtmlCommentSemanticKind.CompilerMarker,
        HtmlCommentSemanticKind.CompilerMarker,
      ]);
      expect(() => session.createGeneration(
        targetPlan.root,
        'originless',
        TemplateCompilerGeneratedOccurrenceRole.Clone,
        [],
        0,
      )).toThrow(/semantic cause/);
      const canonicalCause = fixture.run.handles.product('canonical-cause');
      const mutableCauses = [canonicalCause];
      const canonicalGeneration = session.createGeneration(
        targetPlan.root,
        'canonical-causes',
        TemplateCompilerGeneratedOccurrenceRole.Clone,
        mutableCauses,
        0,
      );
      mutableCauses[0] = fixture.run.handles.product('mutated-cause');
      expect(canonicalGeneration.causeHandles).toEqual([canonicalCause]);
      expect(() => session.createGeneration(
        targetPlan.root,
        'canonical-causes',
        TemplateCompilerGeneratedOccurrenceRole.Clone,
        [canonicalCause],
        1,
      )).not.toThrow();

      const unclaimedPlaceholder = forest.createGeneratedText(
        session.createGeneration(
          targetPlan.root,
          'unclaimed-placeholder',
          TemplateCompilerGeneratedOccurrenceRole.BindingPlaceholder,
          [instructions[0]!.productHandle],
          0,
        ),
        ' ',
        inputText.inputReference,
      );
      forest.insertDetachedNode(
        unclaimedPlaceholder,
        parent,
        TemplateCompilerOccurrenceEdgeKind.Child,
        parent.readChildren().length,
      );
      expect(() => session.assertCoherent()).toThrow(/no unique exact marker target/);
    } finally {
      fixture.dispose();
    }
  });

  test('assigns one carrier per target context and realizes exact render-location adjacency before movement', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-structural-contexts');

    try {
      const input = fixture.materialize(
        'contexts',
        '<!--au-start--><div title="kept-by-replacement"><span></span></div><!--au-end-->',
      );
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
      const authoredElement = input.authoredHtml.nodes.find((node): node is HtmlElement =>
        node instanceof HtmlElement && node.tagName.toLowerCase() === 'div'
      );
      const inputElement = forest.readNodes().find((node): node is TemplateCompilerElementOccurrence =>
        node instanceof TemplateCompilerElementOccurrence && node.tagName.toLowerCase() === 'div'
      );
      if (authoredElement == null || inputElement == null) {
        throw new Error('Expected authored and browser-effective element occurrences.');
      }
      const targetPlan = createTargetPlan(fixture, 'contexts');
      const outerCompiledTemplate = new CompiledTemplateReference(
        fixture.run.handles.product('outer-compiled-template'),
        fixture.run.handles.identity('outer-compiled-template'),
      );
      const outerInstruction = new HydrateTemplateControllerInstruction(
        fixture.run.handles.product('outer-template-controller-instruction'),
        fixture.run.handles.identity('outer-template-controller-instruction'),
        authoredElement.toReference(),
        {
          productHandle: null,
          addressHandle: authoredElement.sourceAddressHandle,
          rawName: 'if.bind',
        },
        'if',
        null,
        outerCompiledTemplate,
        [],
        authoredElement.sourceAddressHandle,
      );
      const outerContext = targetPlan.createTemplateControllerContext(targetPlan.root, outerInstruction);
      const innerCompiledTemplate = new CompiledTemplateReference(
        fixture.run.handles.product('inner-compiled-template'),
        fixture.run.handles.identity('inner-compiled-template'),
      );
      const innerInstruction = new HydrateTemplateControllerInstruction(
        fixture.run.handles.product('inner-template-controller-instruction'),
        fixture.run.handles.identity('inner-template-controller-instruction'),
        authoredElement.toReference(),
        {
          productHandle: null,
          addressHandle: authoredElement.sourceAddressHandle,
          rawName: 'repeat.for',
        },
        'repeat',
        null,
        innerCompiledTemplate,
        [],
        authoredElement.sourceAddressHandle,
      );
      const innerContext = targetPlan.createTemplateControllerContext(outerContext, innerInstruction);
      innerContext.recordCompilerReachableNode(authoredElement.productHandle);
      const rootRow = targetPlan.root.appendRow(
        'outer-if',
        authoredElement,
        [outerInstruction],
        TemplateRenderTargetKind.RenderLocation,
        TemplateCompilerTargetRowPosture.Complete,
        1,
        [],
        authoredElement.sourceAddressHandle,
        new TemplateCompilerTemplateControllerSourceReplacementPlacement(outerInstruction),
      );
      const outerRow = outerContext.appendGeneratedContextBoundaryRow(
        'inner-repeat',
        innerInstruction,
      );
      const containerlessInstruction = new HydrateElementInstruction(
        fixture.run.handles.product('inner-containerless-instruction'),
        fixture.run.handles.identity('inner-containerless-instruction'),
        authoredElement.toReference(),
        'x-containerless',
        'x-containerless',
        null,
        [],
        [],
        null,
        [],
        [],
        [],
        true,
        authoredElement.sourceAddressHandle,
      );
      const innerRow = innerContext.appendRow(
        'containerless-element',
        authoredElement,
        [containerlessInstruction],
        TemplateRenderTargetKind.RenderLocation,
        TemplateCompilerTargetRowPosture.Complete,
        1,
        [],
        authoredElement.sourceAddressHandle,
        new TemplateCompilerContainerlessReplacementPlacement(containerlessInstruction),
      );
      if (rootRow == null || outerRow == null || innerRow == null) {
        throw new Error('Expected complete render-location rows.');
      }
      expect(rootRow.placement).toBeInstanceOf(TemplateCompilerTemplateControllerSourceReplacementPlacement);
      expect(outerRow.sourceKind).toBe('generated-context-boundary');
      expect(outerRow.node).toBeNull();
      expect(outerRow.occurrence).toBeNull();
      expect(innerRow.placement).toBeInstanceOf(TemplateCompilerContainerlessReplacementPlacement);
      const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
      expect(() => session.assertCoherent()).toThrow(/cover every target context/);
      const outerStructure = session.createGeneratedContextStructure(outerContext);
      const innerStructure = session.createGeneratedContextStructure(innerContext);

      expect(() => session.appendRenderLocationTarget(rootRow)).toThrow(/generated-append placement authority/);
      const rootGeometry = session.realizeRenderLocationTarget(rootRow, inputElement);
      expect(() => session.moveNodeIntoContext(
        inputElement,
        outerContext,
        0,
        [outerInstruction.productHandle],
      )).toThrow(/not admitted/);
      const outerGeometry = session.appendRenderLocationTarget(outerRow);
      session.moveNodeIntoContext(inputElement, innerContext, 0, [innerInstruction.productHandle]);
      const innerGeometry = session.realizeRenderLocationTarget(innerRow, inputElement);
      session.assertCoherent();

      expect(rootGeometry.geometryKind).toBe(TemplateCompilerTargetGeometryKind.RenderLocation);
      expect(rootGeometry.placement).toBe(rootRow.placement);
      expect(rootGeometry.logicalTarget).toBe(rootGeometry.end);
      expect(rootGeometry.marker.text).toBe('au');
      expect(rootGeometry.start.text).toBe('au-start');
      expect(rootGeometry.end.text).toBe('au-end');
      expect(rootGeometry.marker.parent?.readChildren()).toEqual([
        expect.objectContaining({ semanticKind: HtmlCommentSemanticKind.Plain, text: 'au-start' }),
        rootGeometry.marker,
        rootGeometry.start,
        rootGeometry.end,
        expect.objectContaining({ semanticKind: HtmlCommentSemanticKind.Plain, text: 'au-end' }),
      ]);
      expect(outerGeometry.replacedNode).toBeNull();
      expect(outerGeometry.placement).toBe(outerRow.placement);
      expect(outerStructure.compilerContent.readChildren()).toEqual([
        outerGeometry.marker,
        outerGeometry.start,
        outerGeometry.end,
      ]);
      expect(innerStructure.compilerContent.readChildren()).toEqual([
        innerGeometry.marker,
        innerGeometry.start,
        innerGeometry.end,
      ]);
      expect(rootGeometry.replacedNode).toBe(inputElement);
      expect(innerGeometry.replacedNode).toBe(inputElement);
      expect(innerGeometry.placement).toBe(innerRow.placement);
      expect(rootGeometry.end).not.toBe(innerGeometry.end);
      expect(inputElement.parent).toBeNull();
      expect(inputElement.parentEdgeKind).toBe(TemplateCompilerOccurrenceEdgeKind.Detached);
      expect(inputElement.generation).toBeNull();
      expect(session.readTargetGeometries(targetPlan.root)).toEqual([rootGeometry]);
      expect(session.readTargetGeometries(outerContext)).toEqual([outerGeometry]);
      expect(session.readTargetGeometries(innerContext)).toEqual([innerGeometry]);
      expect(forest.readRoots()).toEqual([
        forest.compilerCarrier,
        outerStructure.compilerCarrier,
        innerStructure.compilerCarrier,
      ]);
      expect(outerStructure.compilerCarrier.generation?.role)
        .toBe(TemplateCompilerGeneratedOccurrenceRole.TemplateCarrier);
      expect(innerStructure.compilerContent.generation?.role)
        .toBe(TemplateCompilerGeneratedOccurrenceRole.TemplateContent);
    } finally {
      fixture.dispose();
    }
  });

  test('batches sibling namespaces, open-row refusal, wrong/duplicate geometry, and stray-marker detection', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-structural-invariants');

    try {
      const input = fixture.materialize('invariants', '<div></div><span></span><p></p>');
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
      const authoredElements = input.authoredHtml.nodes.filter((node): node is HtmlElement =>
        node instanceof HtmlElement && ['div', 'span', 'p'].includes(node.tagName.toLowerCase())
      );
      const occurrences = forest.readNodes().filter((node): node is TemplateCompilerElementOccurrence =>
        node instanceof TemplateCompilerElementOccurrence
          && ['div', 'span', 'p'].includes(node.tagName.toLowerCase())
      );
      if (authoredElements.length !== 3 || occurrences.length !== 3) {
        throw new Error('Expected three authored and browser-effective sibling elements.');
      }
      const targetPlan = createTargetPlan(fixture, 'invariants');
      const controllerInstructions = authoredElements.map((element, index) =>
        templateControllerInstruction(fixture, element, `sibling-${index}`)
      );
      const contexts = controllerInstructions.map((instruction) =>
        targetPlan.createTemplateControllerContext(targetPlan.root, instruction)
      );
      contexts.forEach((context, index) => context.recordCompilerReachableNode(authoredElements[index]!.productHandle));
      const rootRows = controllerInstructions.map((instruction, index) => targetPlan.root.appendRow(
        `sibling-controller:${index}`,
        authoredElements[index]!,
        [instruction],
        TemplateRenderTargetKind.RenderLocation,
        TemplateCompilerTargetRowPosture.Complete,
        1,
        [],
        authoredElements[index]!.sourceAddressHandle,
        new TemplateCompilerTemplateControllerSourceReplacementPlacement(instruction),
      ));
      if (rootRows.some((row) => row == null)) throw new Error('Expected three root render-location rows.');
      const childInstructions = authoredElements.slice(0, 2).map((element, index) =>
        setAttributeInstruction(fixture, element, `child-${index}`)
      );
      const firstChildRow = contexts[0]!.appendRow(
        'direct-child',
        authoredElements[0]!,
        [childInstructions[0]!],
      );
      const secondChildRow = contexts[1]!.appendRow(
        'direct-child',
        authoredElements[1]!,
        [childInstructions[1]!],
      );
      const openRow = contexts[0]!.appendRow(
        'open-child',
        authoredElements[0]!,
        [childInstructions[0]!],
        TemplateRenderTargetKind.MarkerTarget,
        TemplateCompilerTargetRowPosture.Open,
        1,
        [fixture.run.handles.openSeam('open-child')],
      );
      const afterOpenRow = contexts[0]!.appendRow(
        'after-open-child',
        authoredElements[0]!,
        [childInstructions[0]!],
      );
      contexts[1]!.recordFrontier(
        'conditional-tail',
        'Later sibling order is conditional.',
        authoredElements[1]!.sourceAddressHandle,
        [fixture.run.handles.openSeam('conditional-tail')],
      );
      const afterFrontierRow = contexts[1]!.appendRow(
        'after-frontier-child',
        authoredElements[1]!,
        [childInstructions[1]!],
      );
      if (
        firstChildRow == null
        || secondChildRow == null
        || openRow == null
        || afterOpenRow == null
        || afterFrontierRow == null
      ) {
        throw new Error('Expected sibling and open target rows.');
      }

      const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
      const foreignTargetPlan = createTargetPlan(fixture, 'invariants');
      expect(() => session.readContextStructure(foreignTargetPlan.root)).toThrow(/another target plan/);
      const firstCarrier = forest.createGeneratedElement(
        session.createGeneration(
          contexts[0]!,
          'first-sibling-carrier',
          TemplateCompilerGeneratedOccurrenceRole.TemplateCarrier,
          [controllerInstructions[0]!.productHandle],
          0,
        ),
        'template',
        HtmlNamespaceKind.Html,
        'http://www.w3.org/1999/xhtml',
      );
      const firstContent = forest.createGeneratedFragment(session.createGeneration(
        contexts[0]!,
        'first-sibling-carrier',
        TemplateCompilerGeneratedOccurrenceRole.TemplateContent,
        [controllerInstructions[0]!.productHandle],
        0,
      ));
      forest.insertDetachedNode(
        firstCarrier,
        null,
        TemplateCompilerOccurrenceEdgeKind.Root,
        forest.readRoots().length,
      );
      forest.insertDetachedNode(
        firstContent,
        firstCarrier,
        TemplateCompilerOccurrenceEdgeKind.TemplateContent,
        0,
      );
      expect(() => session.bindContextStructure(contexts[1]!, firstCarrier, firstContent))
        .toThrow(/incoherent generated carrier pair/);
      const structures = [
        session.bindContextStructure(contexts[0]!, firstCarrier, firstContent),
        ...contexts.slice(1).map((context) => session.createGeneratedContextStructure(context)),
      ];
      const rootGeometries: TemplateCompilerRenderLocationTargetGeometry[] = [];
      for (let index = 0; index < rootRows.length; index++) {
        rootGeometries.push(session.realizeRenderLocationTarget(rootRows[index]!, occurrences[index]!));
        session.moveNodeIntoContext(
          occurrences[index]!,
          contexts[index]!,
          0,
          [controllerInstructions[index]!.productHandle],
        );
      }
      const firstGeometry = session.realizeMarkerTarget(firstChildRow, occurrences[0]!);
      expect(() => session.realizeMarkerTarget(firstChildRow, occurrences[0]!)).toThrow(/already has exact geometry/);
      expect(() => session.realizeMarkerTarget(secondChildRow, occurrences[0]!)).toThrow(/outside target context/);
      const secondGeometry = session.realizeMarkerTarget(secondChildRow, occurrences[1]!);
      expect(() => session.realizeMarkerTarget(openRow, occurrences[0]!)).toThrow(/open/);
      expect(() => session.realizeMarkerTarget(afterOpenRow, occurrences[0]!)).toThrow(/open ordering frontier/);
      expect(() => session.realizeMarkerTarget(afterFrontierRow, occurrences[1]!)).toThrow(/open ordering frontier/);

      session.assertCoherent();
      expect(firstChildRow.ordinal).toBe(0);
      expect(secondChildRow.ordinal).toBe(0);
      expect(firstChildRow.localKey).not.toBe(secondChildRow.localKey);
      expect(firstGeometry.marker.occurrenceKey).not.toBe(secondGeometry.marker.occurrenceKey);
      expect(firstGeometry.marker.generation?.contextKey).toBe(contexts[0]!.localKey);
      expect(secondGeometry.marker.generation?.contextKey).toBe(contexts[1]!.localKey);
      expect(contexts[2]!.readRows()).toEqual([]);
      expect(structures[2]!.compilerContent.readChildren()).toEqual([occurrences[2]]);

      const rootContent = forest.compilerContent;
      forest.moveNode(rootGeometries[1]!.marker, rootContent, TemplateCompilerOccurrenceEdgeKind.Child, 0);
      forest.moveNode(rootGeometries[1]!.start, rootContent, TemplateCompilerOccurrenceEdgeKind.Child, 1);
      forest.moveNode(rootGeometries[1]!.end, rootContent, TemplateCompilerOccurrenceEdgeKind.Child, 2);
      expect(() => session.assertCoherent()).toThrow(/marker preorder diverges/);
      forest.moveNode(rootGeometries[0]!.marker, rootContent, TemplateCompilerOccurrenceEdgeKind.Child, 0);
      forest.moveNode(rootGeometries[0]!.start, rootContent, TemplateCompilerOccurrenceEdgeKind.Child, 1);
      forest.moveNode(rootGeometries[0]!.end, rootContent, TemplateCompilerOccurrenceEdgeKind.Child, 2);
      session.assertCoherent();

      const strayMarker = forest.createGeneratedComment(
        session.createGeneration(
          contexts[2]!,
          'stray-marker',
          TemplateCompilerGeneratedOccurrenceRole.CompilerMarker,
          [controllerInstructions[2]!.productHandle],
          0,
        ),
        'au',
        HtmlCommentSemanticKind.CompilerMarker,
      );
      forest.insertDetachedNode(
        strayMarker,
        structures[2]!.compilerContent,
        TemplateCompilerOccurrenceEdgeKind.Child,
        0,
      );
      expect(() => session.assertCoherent()).toThrow(/no exact target geometry/);
    } finally {
      fixture.dispose();
    }
  });

  test('proves projection context membership, unwrapped consumption, and contributor order independently', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-structural-projection');

    try {
      const input = fixture.materialize(
        'projection',
        '<x-card>\n<!--default-comment--><em au-slot>default</em><template au-slot="named"><!--named-comment--><b>named</b><i>tail</i></template></x-card>',
      );
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
      const authored = input.authoredHtml.nodes;
      const authoredHost = requiredAuthoredElement(authored, 'x-card');
      const authoredDefault = requiredAuthoredElement(authored, 'em');
      const authoredDefaultComment = requiredAuthoredComment(authored, 'default-comment');
      const authoredWrapper = requiredAuthoredElement(authored, 'template');
      const authoredDefaultAuSlot = authoredDefault.attributes.find((attribute) => attribute.rawName === 'au-slot');
      const authoredWrapperAuSlot = authoredWrapper.attributes.find((attribute) => attribute.rawName === 'au-slot');
      const authoredWhitespace = requiredAuthoredText(authored, '\n');
      const authoredBold = requiredAuthoredElement(authored, 'b');
      const authoredItalic = requiredAuthoredElement(authored, 'i');
      const authoredNamedComment = requiredAuthoredComment(authored, 'named-comment');
      const authoredDefaultText = requiredAuthoredText(authored, 'default');
      const authoredNamedText = requiredAuthoredText(authored, 'named');
      const authoredTailText = requiredAuthoredText(authored, 'tail');
      const host = requiredOccurrenceElement(forest, 'x-card');
      const defaultElement = requiredOccurrenceElement(forest, 'em');
      const defaultAuSlot = defaultElement.readAttributes().find((attribute) => attribute.name === 'au-slot');
      const defaultComment = requiredOccurrenceComment(forest, 'default-comment');
      const defaultText = requiredOccurrenceText(forest, 'default');
      const wrapper = forest.readNodes().find((node): node is TemplateCompilerElementOccurrence =>
        node instanceof TemplateCompilerElementOccurrence
          && node !== forest.compilerCarrier
          && node.tagName.toLowerCase() === 'template'
      );
      const wrapperAuSlot = wrapper?.readAttributes().find((attribute) => attribute.name === 'au-slot');
      const bold = requiredOccurrenceElement(forest, 'b');
      const italic = requiredOccurrenceElement(forest, 'i');
      const namedComment = requiredOccurrenceComment(forest, 'named-comment');
      const namedText = requiredOccurrenceText(forest, 'named');
      const projectionWhitespace = forest.readNodes().find((node): node is TemplateCompilerTextOccurrence =>
        node instanceof TemplateCompilerTextOccurrence && node.text === '\n'
      );
      if (
        wrapper == null
        || wrapperAuSlot == null
        || projectionWhitespace == null
        || defaultAuSlot == null
        || authoredDefaultAuSlot == null
        || authoredWrapperAuSlot == null
      ) {
        throw new Error('Expected authored projection template and whitespace occurrences.');
      }

      const targetPlan = createTargetPlan(fixture, 'projection');
      const defaultProjection = new HydrateElementProjectionDefinition(
        'default',
        new CompiledTemplateReference(
          fixture.run.handles.product('projection:default-template'),
          fixture.run.handles.identity('projection:default-template'),
        ),
        [
          new HydrateElementProjectionContributor(
            authoredDefaultComment.toReference(),
            'default',
            null,
            null,
            HydrateElementProjectionContributorDisposition.RetainedNode,
          ),
          new HydrateElementProjectionContributor(
            authoredDefault.toReference(),
            'default',
            authoredDefaultAuSlot,
            null,
            HydrateElementProjectionContributorDisposition.RetainedNode,
          ),
        ],
        null,
      );
      const namedProjection = new HydrateElementProjectionDefinition(
        'named',
        new CompiledTemplateReference(
          fixture.run.handles.product('projection:named-template'),
          fixture.run.handles.identity('projection:named-template'),
        ),
        [new HydrateElementProjectionContributor(
          authoredWrapper.toReference(),
          'named',
          authoredWrapperAuSlot,
          authoredWrapperAuSlot.addressHandle,
          HydrateElementProjectionContributorDisposition.UnwrappedTemplateContent,
        )],
        authoredWrapper.sourceAddressHandle,
      );
      const hostInstruction = new HydrateElementInstruction(
        fixture.run.handles.product('projection:host-instruction'),
        fixture.run.handles.identity('projection:host-instruction'),
        authoredHost.toReference(),
        'x-card',
        'x-card',
        null,
        [defaultProjection, namedProjection],
        [new HydrateElementProjectionContributor(
          authoredWhitespace.toReference(),
          'default',
          null,
          null,
          HydrateElementProjectionContributorDisposition.DiscardedWhitespace,
        )],
        null,
        [],
        [],
        [],
        false,
        authoredHost.sourceAddressHandle,
      );
      const defaultContext = targetPlan.createProjectionContext(targetPlan.root, hostInstruction, defaultProjection);
      const namedContext = targetPlan.createProjectionContext(targetPlan.root, hostInstruction, namedProjection);
      expect(defaultContext.sourceAddressHandle).toBe(hostInstruction.sourceAddressHandle);
      expect(namedContext.sourceAddressHandle).toBe(namedProjection.sourceAddressHandle);
      targetPlan.root.recordCompilerReachableNode(authoredHost.productHandle);
      for (const node of [authoredDefault, authoredDefaultText]) {
        defaultContext.recordCompilerReachableNode(node.productHandle);
      }
      for (const node of [
        authoredBold,
        authoredNamedText,
        authoredItalic,
        authoredTailText,
      ]) {
        namedContext.recordCompilerReachableNode(node.productHandle);
      }
      const rootRow = targetPlan.root.appendRow(
        'projection-host',
        authoredHost,
        [hostInstruction],
      );
      if (rootRow == null) throw new Error('Expected one projection host row.');

      const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
      const defaultStructure = session.createGeneratedContextStructure(defaultContext);
      const namedStructure = session.createGeneratedContextStructure(namedContext);
      session.realizeMarkerTarget(rootRow, host);
      expect(() => session.moveNodeIntoContext(
        defaultElement,
        namedContext,
        0,
        [hostInstruction.productHandle],
      )).toThrow(/not admitted/);
      expect(() => session.moveNodeIntoContext(
        wrapper,
        defaultContext,
        0,
        [hostInstruction.productHandle],
      )).toThrow(/not admitted/);
      expect(() => session.moveNodeIntoContext(
        defaultComment,
        namedContext,
        0,
        [hostInstruction.productHandle],
      )).toThrow(/not admitted/);
      expect(() => session.moveNodeIntoContext(
        namedComment,
        defaultContext,
        0,
        [hostInstruction.productHandle],
      )).toThrow(/not admitted/);
      expect(() => session.moveNodeIntoContext(
        defaultText,
        defaultContext,
        0,
        [hostInstruction.productHandle],
      )).toThrow(/not admitted/);
      expect(() => session.moveNodeIntoContext(
        namedText,
        namedContext,
        0,
        [hostInstruction.productHandle],
      )).toThrow(/not admitted/);

      const whitespaceDisposition = session.consumeNodeForContext(
        projectionWhitespace,
        targetPlan.root,
        [hostInstruction.productHandle],
      );
      const wrapperContent = wrapper.templateContent;
      if (wrapperContent == null) throw new Error('Expected named projection template content.');
      session.moveNodeIntoContext(defaultComment, defaultContext, 0, [hostInstruction.productHandle]);
      session.consumeAttributeForContext(defaultAuSlot, targetPlan.root, [hostInstruction.productHandle]);
      session.moveNodeIntoContext(defaultElement, defaultContext, 1, [hostInstruction.productHandle]);
      const wrapperSlotDisposition = session.consumeAttributeForContext(
        wrapperAuSlot,
        targetPlan.root,
        [hostInstruction.productHandle],
      );
      const wrapperDisposition = session.consumeNodeForContext(
        wrapper,
        namedContext,
        [hostInstruction.productHandle],
      );
      session.moveNodeIntoContext(namedComment, namedContext, 0, [hostInstruction.productHandle]);
      session.moveNodeIntoContext(bold, namedContext, 1, [hostInstruction.productHandle]);
      session.moveNodeIntoContext(italic, namedContext, 2, [hostInstruction.productHandle]);
      forest.reorderNode(defaultElement, 0);
      expect(() => session.assertCoherent()).toThrow(/membership|source order|transferred input order/);
      forest.reorderNode(defaultElement, 1);
      session.assertCoherent();
      expect(defaultStructure.compilerContent.readChildren()).toEqual([defaultComment, defaultElement]);
      expect(namedStructure.compilerContent.readChildren()).toEqual([namedComment, bold, italic]);
      expect(wrapper.parentEdgeKind).toBe(TemplateCompilerOccurrenceEdgeKind.Detached);
      expect(wrapperAuSlot.owner).toBeNull();
      expect(wrapperSlotDisposition.eventOrdinal).toBeLessThan(wrapperDisposition.eventOrdinal);
      expect(defaultAuSlot.owner).toBeNull();
      expect(whitespaceDisposition.membershipOrdinal).toBeNull();
      expect(whitespaceDisposition.context).toBe(targetPlan.root);

      const invalidProjectionInstruction = templateControllerInstruction(
        fixture,
        authoredDefault,
        'projection-invalid-append',
      );
      const invalidProjectionRow = defaultContext.appendRow(
        'invalid-append',
        authoredDefault,
        [invalidProjectionInstruction],
        TemplateRenderTargetKind.RenderLocation,
        TemplateCompilerTargetRowPosture.Complete,
        1,
        [],
        authoredDefault.sourceAddressHandle,
        new TemplateCompilerTemplateControllerSourceReplacementPlacement(invalidProjectionInstruction),
      );
      if (invalidProjectionRow == null) throw new Error('Expected one invalid projection append row.');
      expect(() => session.appendRenderLocationTarget(invalidProjectionRow)).toThrow(/generated-append placement authority/);
    } finally {
      fixture.dispose();
    }
  });

  test('requires known AuSlot process-content removals from the exact host edge', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-structural-au-slot-process-content');

    try {
      const input = fixture.materialize(
        'au-slot-process-content',
        '<au-slot><div au-slot="ignored"></div></au-slot>',
      );
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
      const authoredHost = requiredAuthoredElement(input.authoredHtml.nodes, 'au-slot');
      const authoredRemoved = requiredAuthoredElement(input.authoredHtml.nodes, 'div');
      const host = requiredOccurrenceElement(forest, 'au-slot');
      const removed = requiredOccurrenceElement(forest, 'div');
      const targetPlan = createTargetPlan(fixture, 'au-slot-process-content');
      targetPlan.root.recordCompilerReachableNode(authoredHost.productHandle);
      const instruction = new HydrateElementInstruction(
        fixture.run.handles.product('au-slot-process-content:instruction'),
        fixture.run.handles.identity('au-slot-process-content:instruction'),
        authoredHost.toReference(),
        'au-slot',
        'au-slot',
        null,
        [],
        [],
        new AuSlotProcessContentInstructionData('default', null),
        [authoredRemoved.toReference()],
        [],
        [],
        false,
        authoredHost.sourceAddressHandle,
      );
      const row = targetPlan.root.appendRow('au-slot', authoredHost, [instruction]);
      if (row == null) throw new Error('Expected AuSlot hydrate-element row.');
      const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
      session.realizeMarkerTarget(row, host);
      expect(() => session.assertCoherent()).toThrow(/AuSlot instruction/);
      expect(() => session.consumeNodeForContext(
        removed,
        targetPlan.root,
        [fixture.run.handles.product('wrong-au-slot-cause')],
      )).toThrow(/owning instruction cause/);
      const disposition = session.consumeNodeForContext(
        removed,
        targetPlan.root,
        [instruction.productHandle],
      );
      session.assertCoherent();
      expect(disposition.owner).toBe(host);
      expect(host.readChildren().map((node) =>
        node instanceof TemplateCompilerElementOccurrence ? node.tagName : node.occurrenceKey
      )).toEqual([]);
    } finally {
      fixture.dispose();
    }
  });

  test('stops target containment and marker preorder at inert nested template-content edges', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-structural-inert-template');

    try {
      const input = fixture.materialize(
        'inert-template',
        '<div><template><!--au--><span>inert</span></template><b>live</b></div>',
      );
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
      const authored = input.authoredHtml.nodes;
      const authoredDiv = requiredAuthoredElement(authored, 'div');
      const authoredTemplate = requiredAuthoredElement(authored, 'template');
      const authoredBold = requiredAuthoredElement(authored, 'b');
      const authoredSpan = requiredAuthoredElement(authored, 'span');
      const authoredLiveText = requiredAuthoredText(authored, 'live');
      const bold = requiredOccurrenceElement(forest, 'b');
      const span = requiredOccurrenceElement(forest, 'span');
      const targetPlan = createTargetPlan(fixture, 'inert-template');
      for (const node of [authoredDiv, authoredTemplate, authoredBold, authoredLiveText]) {
        targetPlan.root.recordCompilerReachableNode(node.productHandle);
      }
      const liveInstruction = setAttributeInstruction(fixture, authoredBold, 'inert-live');
      const liveRow = targetPlan.root.appendRow('live', authoredBold, [liveInstruction]);
      if (liveRow == null) throw new Error('Expected one live target row.');
      const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
      session.realizeMarkerTarget(liveRow, bold);
      session.assertCoherent();
      expect(forest.readNodes().filter((node): node is TemplateCompilerCommentOccurrence =>
        node instanceof TemplateCompilerCommentOccurrence && node.text === 'au'
      ).map((comment) => comment.semanticKind)).toEqual([
        HtmlCommentSemanticKind.Plain,
        HtmlCommentSemanticKind.CompilerMarker,
      ]);

      const inertRow = targetPlan.root.appendRow(
        'inert',
        authoredSpan,
        [setAttributeInstruction(fixture, authoredSpan, 'inert-span')],
      );
      if (inertRow == null) throw new Error('Expected one inert falsifier row.');
      expect(() => session.realizeMarkerTarget(inertRow, span)).toThrow(/outside target context/);
    } finally {
      fixture.dispose();
    }
  });

  test('reuses an input template carrier for an innermost template-controller context', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-structural-input-carrier');

    try {
      const input = fixture.materialize(
        'input-carrier',
        '<div><template if.bind="value"><span></span></template></div>',
      );
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
      const authoredDiv = requiredAuthoredElement(input.authoredHtml.nodes, 'div');
      const authoredTemplate = requiredAuthoredElement(input.authoredHtml.nodes, 'template');
      const authoredSpan = requiredAuthoredElement(input.authoredHtml.nodes, 'span');
      const template = forest.readNodes().find((node): node is TemplateCompilerElementOccurrence =>
        node instanceof TemplateCompilerElementOccurrence
          && node !== forest.compilerCarrier
          && node.tagName.toLowerCase() === 'template'
      );
      if (template?.templateContent == null) throw new Error('Expected input template carrier content.');
      const span = requiredOccurrenceElement(forest, 'span');
      const targetPlan = createTargetPlan(fixture, 'input-carrier');
      const outerInstruction = templateControllerInstruction(fixture, authoredTemplate, 'input-carrier-outer');
      const outerContext = targetPlan.createTemplateControllerContext(targetPlan.root, outerInstruction);
      const innerInstruction = templateControllerInstruction(fixture, authoredTemplate, 'input-carrier-inner');
      const childContext = targetPlan.createTemplateControllerContext(outerContext, innerInstruction);
      targetPlan.root.recordCompilerReachableNode(authoredDiv.productHandle);
      childContext.recordCompilerReachableNode(authoredTemplate.productHandle);
      childContext.recordCompilerReachableNode(authoredSpan.productHandle);
      const templateArrival = membershipArrivalAuthority(
        childContext,
        template,
        TemplateCompilerOccurrenceMembershipArrivalPosture.AdoptedInput,
      );
      const spanArrival = membershipArrivalAuthority(
        childContext,
        span,
        TemplateCompilerOccurrenceMembershipArrivalPosture.AdoptedInput,
      );
      childContext.recordCompilerReachableOccurrence(
        'input-template:membership',
        template,
        authoredTemplate,
        TemplateCompilerOccurrenceMembershipArrivalPosture.AdoptedInput,
        templateArrival,
      );
      childContext.recordCompilerReachableOccurrence(
        'input-template:span:membership',
        span,
        authoredSpan,
        TemplateCompilerOccurrenceMembershipArrivalPosture.AdoptedInput,
        spanArrival,
      );
      const row = targetPlan.root.appendRow(
        'input-template-controller',
        authoredTemplate,
        [outerInstruction],
        TemplateRenderTargetKind.RenderLocation,
        TemplateCompilerTargetRowPosture.Complete,
        1,
        [],
        authoredTemplate.sourceAddressHandle,
        new TemplateCompilerTemplateControllerSourceReplacementPlacement(outerInstruction),
      );
      const outerRow = outerContext.appendGeneratedContextBoundaryRow(
        'input-template-controller-inner',
        innerInstruction,
      );
      if (row == null || outerRow == null) throw new Error('Expected stacked input template-controller rows.');
      expect(outerRow.stableSlotKey).toBe('input-template-controller-inner');
      expect(outerRow.publicationLocalKey).toBe('input-template-controller-inner');
      const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
      const outerStructure = session.createGeneratedContextStructure(outerContext);
      expect(() => session.createGeneratedContextStructure(childContext)).toThrow(/must adopt/);
      session.realizeRenderLocationTarget(row, template);
      const outerGeometry = session.appendRenderLocationTarget(outerRow);
      const childStructure = session.adoptInputContextStructure(
        childContext,
        template,
        template.templateContent,
        [innerInstruction.productHandle],
      );

      session.assertCoherent();
      expect(childStructure.compilerCarrier).toBe(template);
      expect(childStructure.compilerContent).toBe(template.templateContent);
      expect(childContext.readOccurrenceMemberships().map((membership) => membership.arrivalPosture)).toEqual([
        TemplateCompilerOccurrenceMembershipArrivalPosture.AdoptedInput,
        TemplateCompilerOccurrenceMembershipArrivalPosture.AdoptedInput,
      ]);
      expect(childStructure.compilerCarrier.generation).toBeNull();
      expect(childStructure.compilerContent.generation).toBeNull();
      expect(outerStructure.compilerContent.readChildren()).toEqual([
        outerGeometry.marker,
        outerGeometry.start,
        outerGeometry.end,
      ]);
      expect(forest.readRoots()).toEqual([forest.compilerCarrier, outerStructure.compilerCarrier, template]);
    } finally {
      fixture.dispose();
    }
  });

  test('binds an empty incoming TC leaf and validates one cross-context source row after transfer', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-structural-incoming-membership');

    try {
      const input = fixture.materialize('incoming-membership', '<div></div>');
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
      const authoredDiv = requiredAuthoredElement(input.authoredHtml.nodes, 'div');
      const div = requiredOccurrenceElement(forest, 'div');
      const targetPlan = createTargetPlan(fixture, 'incoming-membership');
      const instruction = templateControllerInstruction(fixture, authoredDiv, 'incoming-membership');
      const leaf = targetPlan.createTemplateControllerContext(targetPlan.root, instruction);
      const arrival = membershipArrivalAuthority(
        leaf,
        div,
        TemplateCompilerOccurrenceMembershipArrivalPosture.IncomingTransfer,
      );
      const membership = leaf.recordCompilerReachableOccurrence(
        'incoming-membership:div',
        div,
        authoredDiv,
        TemplateCompilerOccurrenceMembershipArrivalPosture.IncomingTransfer,
        arrival,
      );
      const foreignTransition = transitionSourceRowAuthority(
        targetPlan.root,
        div,
        TemplateCompilerOccurrenceMembershipArrivalPosture.Initial,
        targetPlan.root,
        membership,
      );
      expect(() => targetPlan.root.appendTemplateControllerTransitionSourceRow(
        'incoming-membership:foreign',
        div,
        authoredDiv,
        instruction,
        leaf,
        membership,
        foreignTransition,
      )).toThrow(/destination membership authority/u);
      const transition = transitionSourceRowAuthority(
        targetPlan.root,
        div,
        TemplateCompilerOccurrenceMembershipArrivalPosture.Initial,
        leaf,
        membership,
      );
      const row = targetPlan.root.appendTemplateControllerTransitionSourceRow(
        'incoming-membership:source',
        div,
        authoredDiv,
        instruction,
        leaf,
        membership,
        transition,
      );

      const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
      const leafStructure = session.createGeneratedContextStructure(leaf);
      expect(leafStructure.compilerContent.readChildren()).toEqual([]);
      expect(membership.arrivalPosture).toBe(TemplateCompilerOccurrenceMembershipArrivalPosture.IncomingTransfer);
      session.realizeRenderLocationTarget(row, div);
      session.moveNodeIntoContext(div, leaf, 0, [instruction.productHandle]);
      session.assertCoherent();

      expect(leafStructure.compilerContent.readChildren()).toEqual([div]);
      expect(session.compilationContextForOccurrence(div)).toBe(leaf);
      expect(session.structuralContextForOccurrence(div)).toBe(leaf);
    } finally {
      fixture.dispose();
    }
  });

  test('binds a nested TC source row absent, then realizes it after its generated source context receives the host', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-structural-nested-transition-source');

    try {
      const input = fixture.materialize('nested-transition-source', '<section><div></div></section>');
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
      const authoredSection = requiredAuthoredElement(input.authoredHtml.nodes, 'section');
      const authoredDiv = requiredAuthoredElement(input.authoredHtml.nodes, 'div');
      const section = requiredOccurrenceElement(forest, 'section');
      const div = requiredOccurrenceElement(forest, 'div');
      const targetPlan = createTargetPlan(fixture, 'nested-transition-source');
      const outerInstruction = templateControllerInstruction(fixture, authoredSection, 'nested-transition:outer');
      const sourceContext = targetPlan.createTemplateControllerContext(targetPlan.root, outerInstruction);
      const innerInstruction = templateControllerInstruction(fixture, authoredDiv, 'nested-transition:inner');
      const leaf = targetPlan.createTemplateControllerContext(sourceContext, innerInstruction);

      const sectionArrival = membershipArrivalAuthority(
        sourceContext,
        section,
        TemplateCompilerOccurrenceMembershipArrivalPosture.IncomingTransfer,
      );
      const sectionMembership = sourceContext.recordCompilerReachableOccurrence(
        'nested-transition:section',
        section,
        authoredSection,
        TemplateCompilerOccurrenceMembershipArrivalPosture.IncomingTransfer,
        sectionArrival,
      );
      const divArrival = membershipArrivalAuthority(
        leaf,
        div,
        TemplateCompilerOccurrenceMembershipArrivalPosture.IncomingTransfer,
      );
      const divMembership = leaf.recordCompilerReachableOccurrence(
        'nested-transition:div',
        div,
        authoredDiv,
        TemplateCompilerOccurrenceMembershipArrivalPosture.IncomingTransfer,
        divArrival,
      );
      const outerAuthority = transitionSourceRowAuthority(
        targetPlan.root,
        section,
        TemplateCompilerOccurrenceMembershipArrivalPosture.Initial,
        sourceContext,
        sectionMembership,
      );
      const outerRow = targetPlan.root.appendTemplateControllerTransitionSourceRow(
        'nested-transition:outer-row',
        section,
        authoredSection,
        outerInstruction,
        sourceContext,
        sectionMembership,
        outerAuthority,
      );
      const innerAuthority = transitionSourceRowAuthority(
        sourceContext,
        div,
        TemplateCompilerOccurrenceMembershipArrivalPosture.IncomingTransfer,
        leaf,
        divMembership,
      );
      const innerRow = sourceContext.appendTemplateControllerTransitionSourceRow(
        'nested-transition:inner-row',
        div,
        authoredDiv,
        innerInstruction,
        leaf,
        divMembership,
        innerAuthority,
      );

      const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
      const sourceStructure = session.createGeneratedContextStructure(sourceContext);
      const leafStructure = session.createGeneratedContextStructure(leaf);
      expect(sourceStructure.compilerContent.readChildren()).toEqual([]);
      expect(leafStructure.compilerContent.readChildren()).toEqual([]);

      session.realizeRenderLocationTarget(outerRow, section);
      session.moveNodeIntoContext(section, sourceContext, 0, [outerInstruction.productHandle]);
      expect(sourceStructure.compilerContent.readChildren()).toEqual([section]);
      session.realizeRenderLocationTarget(innerRow, div);
      session.moveNodeIntoContext(div, leaf, 0, [innerInstruction.productHandle]);
      session.assertCoherent();

      expect(session.structuralContextForOccurrence(section)).toBe(sourceContext);
      expect(session.structuralContextForOccurrence(div)).toBe(leaf);
      expect(leafStructure.compilerContent.readChildren()).toEqual([div]);
    } finally {
      fixture.dispose();
    }
  });

  test('rejects duplicate source membership and incoming membership already present at bind', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-structural-arrival-refusal');

    try {
      {
        const input = fixture.materialize('duplicate-source-membership', '<div></div>');
        const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
        const authoredDiv = requiredAuthoredElement(input.authoredHtml.nodes, 'div');
        const div = requiredOccurrenceElement(forest, 'div');
        const targetPlan = createTargetPlan(fixture, 'duplicate-source-membership');
        const instruction = templateControllerInstruction(fixture, authoredDiv, 'duplicate-source-membership');
        const leaf = targetPlan.createTemplateControllerContext(targetPlan.root, instruction);
        const arrival = membershipArrivalAuthority(
          leaf,
          div,
          TemplateCompilerOccurrenceMembershipArrivalPosture.IncomingTransfer,
        );
        const destinationMembership = leaf.recordCompilerReachableOccurrence(
          'duplicate-source:leaf',
          div,
          authoredDiv,
          TemplateCompilerOccurrenceMembershipArrivalPosture.IncomingTransfer,
          arrival,
        );
        const sourceMembership = targetPlan.root.recordCompilerReachableOccurrence(
          'duplicate-source:root',
          div,
          authoredDiv,
        );
        expect(sourceMembership).toMatchObject({
          arrivalPosture: TemplateCompilerOccurrenceMembershipArrivalPosture.Initial,
          arrivalAuthority: null,
        });
        const transition = transitionSourceRowAuthority(
          targetPlan.root,
          div,
          TemplateCompilerOccurrenceMembershipArrivalPosture.Initial,
          leaf,
          destinationMembership,
        );
        expect(() => targetPlan.root.appendTemplateControllerTransitionSourceRow(
          'duplicate-source:row',
          div,
          authoredDiv,
          instruction,
          leaf,
          destinationMembership,
          transition,
        )).toThrow(/destination membership authority/u);
      }

      {
        const input = fixture.materialize(
          'incoming-present-at-bind',
          '<div><template if.bind="value"><span></span></template></div>',
        );
        const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
        const authoredTemplate = requiredAuthoredElement(input.authoredHtml.nodes, 'template');
        const template = forest.readNodes().find((node): node is TemplateCompilerElementOccurrence =>
          node instanceof TemplateCompilerElementOccurrence
            && node !== forest.compilerCarrier
            && node.tagName.toLowerCase() === 'template'
        );
        if (template?.templateContent == null) throw new Error('Expected an incoming-present template.');
        const targetPlan = createTargetPlan(fixture, 'incoming-present-at-bind');
        const instruction = templateControllerInstruction(fixture, authoredTemplate, 'incoming-present-at-bind');
        const leaf = targetPlan.createTemplateControllerContext(targetPlan.root, instruction);
        const arrival = membershipArrivalAuthority(
          leaf,
          template,
          TemplateCompilerOccurrenceMembershipArrivalPosture.IncomingTransfer,
        );
        leaf.recordCompilerReachableOccurrence(
          'incoming-present:template',
          template,
          authoredTemplate,
          TemplateCompilerOccurrenceMembershipArrivalPosture.IncomingTransfer,
          arrival,
        );
        const row = targetPlan.root.appendRow(
          'incoming-present:source',
          authoredTemplate,
          [instruction],
          TemplateRenderTargetKind.RenderLocation,
          TemplateCompilerTargetRowPosture.Complete,
          1,
          [],
          authoredTemplate.sourceAddressHandle,
          new TemplateCompilerTemplateControllerSourceReplacementPlacement(instruction),
        );
        if (row == null) throw new Error('Expected incoming-present source row.');
        const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
        session.realizeRenderLocationTarget(row, template);
        expect(() => session.adoptInputContextStructure(
          leaf,
          template,
          template.templateContent!,
          [instruction.productHandle],
        ))
          .toThrow(/bind-time occurrence membership/u);
      }
    } finally {
      fixture.dispose();
    }
  });

  test('retains browser-first node and attribute consumption events for final disposition', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-structural-dispositions');

    try {
      const input = fixture.materialize(
        'dispositions',
        '<div title="x"><!--plain--> \n</div><span data-value="y"></span>',
      );
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
      const authoredDiv = requiredAuthoredElement(input.authoredHtml.nodes, 'div');
      const authoredSpan = requiredAuthoredElement(input.authoredHtml.nodes, 'span');
      const div = requiredOccurrenceElement(forest, 'div');
      const span = requiredOccurrenceElement(forest, 'span');
      const comment = forest.readNodes().find((node): node is TemplateCompilerCommentOccurrence =>
        node instanceof TemplateCompilerCommentOccurrence && node.text === 'plain'
      );
      const whitespace = forest.readNodes().find((node): node is TemplateCompilerTextOccurrence =>
        node instanceof TemplateCompilerTextOccurrence && node.text === ' \n'
      );
      const attribute = div.readAttributes().find((candidate) => candidate.name === 'title');
      const spanAttribute = span.readAttributes().find((candidate) => candidate.name === 'data-value');
      if (comment == null || whitespace == null || attribute == null || spanAttribute == null) {
        throw new Error('Expected comment, whitespace, and two-owner attribute browser inputs.');
      }
      const targetPlan = createTargetPlan(fixture, 'dispositions');
      targetPlan.root.recordCompilerReachableNode(authoredDiv.productHandle);
      targetPlan.root.recordCompilerReachableNode(authoredSpan.productHandle);
      const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
      const cause = fixture.run.handles.product('dispositions:cause');
      const attributesByReverseOwnerKey = [
        { owner: div, attribute },
        { owner: span, attribute: spanAttribute },
      ].sort((left, right) => right.owner.occurrenceKey.localeCompare(left.owner.occurrenceKey));
      expect(attributesByReverseOwnerKey[0]!.owner.occurrenceKey.localeCompare(
        attributesByReverseOwnerKey[1]!.owner.occurrenceKey,
      )).toBeGreaterThan(0);
      const attributeDispositions = attributesByReverseOwnerKey.map(({ attribute: candidate }) =>
        session.consumeAttributeForContext(candidate, targetPlan.root, [cause])
      );
      const attributeDisposition = attributeDispositions.find((entry) => entry.attribute === attribute);
      if (attributeDisposition == null) throw new Error('Expected the div attribute disposition.');
      const parent = comment.parent;
      const commentOrdinal = comment.readParentOrdinal();
      const whitespaceOrdinal = whitespace.readParentOrdinal();
      if (parent == null || commentOrdinal == null || whitespaceOrdinal == null) {
        throw new Error('Expected live disposition inputs.');
      }
      forest.detachNode(comment);
      forest.detachNode(whitespace);
      expect(() => session.assertCoherent()).toThrow(/without a compiler operation/);
      forest.insertDetachedNode(comment, parent, TemplateCompilerOccurrenceEdgeKind.Child, commentOrdinal);
      forest.insertDetachedNode(whitespace, parent, TemplateCompilerOccurrenceEdgeKind.Child, whitespaceOrdinal);
      const whitespaceDisposition = session.consumeNodeForContext(whitespace, targetPlan.root, [cause]);
      const commentDisposition = session.consumeNodeForContext(comment, targetPlan.root, [cause]);

      session.assertCoherent();
      expect(comment.semanticKind).toBe(HtmlCommentSemanticKind.Plain);
      expect(commentDisposition.inputReference).toBe(comment.inputReference);
      expect(commentDisposition.membershipOrdinal).toBeNull();
      expect(commentDisposition.owner).toBe(div);
      expect(commentDisposition.ownerOrdinal).toBe(0);
      expect(whitespaceDisposition.membershipOrdinal).toBeNull();
      expect(whitespaceDisposition.owner).toBe(div);
      expect(whitespaceDisposition.ownerOrdinal).toBe(1);
      expect(attributeDisposition.inputReference).toBe(attribute.inputReference);
      expect(attributeDisposition.owner).toBe(div);
      expect(attributeDisposition.ownerOrdinal).toBe(0);
      expect(attribute.owner).toBeNull();
      expect(session.structuralContextForOccurrence(comment)).toBe(targetPlan.root);
      expect(session.structuralContextForOccurrence(attribute)).toBe(targetPlan.root);
      expect(session.structuralContextForOccurrence(span)).toBe(targetPlan.root);
      expect(session.readConsumedNodeDispositions()).toEqual(
        session.readConsumedNodeDispositions(targetPlan.root),
      );
      expect(session.readConsumedNodeDispositions().map((entry) => entry.node)).toEqual([whitespace, comment]);
      expect(new Set(session.readConsumedNodeDispositions().map((entry) => entry.node)))
        .toEqual(new Set([comment, whitespace]));
      expect(session.readConsumedAttributeDispositions()).toEqual(attributeDispositions);
      expect(attributeDispositions[0]!.eventOrdinal).toBeLessThan(attributeDispositions[1]!.eventOrdinal);
      expect(attributeDispositions[1]!.eventOrdinal).toBeLessThan(whitespaceDisposition.eventOrdinal);
      expect(whitespaceDisposition.eventOrdinal).toBeLessThan(commentDisposition.eventOrdinal);
      const foreignPlan = createTargetPlan(fixture, 'dispositions-foreign');
      expect(() => session.readConsumedNodeDispositions(foreignPlan.root)).toThrow(/another target plan/);
      expect(() => session.readConsumedAttributeDispositions(foreignPlan.root)).toThrow(/another target plan/);
    } finally {
      fixture.dispose();
    }
  });

  test('rejects preorder-preserving flattening and descendant transfers without structural authority', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-structural-topology-falsifiers');

    try {
      {
        const input = fixture.materialize('root-flatten', '<div><span></span></div>');
        const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
        const authoredDiv = requiredAuthoredElement(input.authoredHtml.nodes, 'div');
        const authoredSpan = requiredAuthoredElement(input.authoredHtml.nodes, 'span');
        const div = requiredOccurrenceElement(forest, 'div');
        const span = requiredOccurrenceElement(forest, 'span');
        const targetPlan = createTargetPlan(fixture, 'root-flatten');
        targetPlan.root.recordCompilerReachableNode(authoredDiv.productHandle);
        targetPlan.root.recordCompilerReachableNode(authoredSpan.productHandle);
        const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
        forest.moveNode(
          span,
          forest.compilerContent,
          TemplateCompilerOccurrenceEdgeKind.Child,
          div.readParentOrdinal()! + 1,
        );
        expect(() => session.assertCoherent()).toThrow(/without a compiler operation/);
      }

      {
        const input = fixture.materialize('tc-flatten', '<div><span></span></div>');
        const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
        const authoredDiv = requiredAuthoredElement(input.authoredHtml.nodes, 'div');
        const authoredSpan = requiredAuthoredElement(input.authoredHtml.nodes, 'span');
        const div = requiredOccurrenceElement(forest, 'div');
        const span = requiredOccurrenceElement(forest, 'span');
        const targetPlan = createTargetPlan(fixture, 'tc-flatten');
        const instruction = templateControllerInstruction(fixture, authoredDiv, 'tc-flatten');
        const childContext = targetPlan.createTemplateControllerContext(targetPlan.root, instruction);
        childContext.recordCompilerReachableNode(authoredDiv.productHandle);
        childContext.recordCompilerReachableNode(authoredSpan.productHandle);
        const row = targetPlan.root.appendRow(
          'tc-flatten',
          authoredDiv,
          [instruction],
          TemplateRenderTargetKind.RenderLocation,
          TemplateCompilerTargetRowPosture.Complete,
          1,
          [],
          authoredDiv.sourceAddressHandle,
          new TemplateCompilerTemplateControllerSourceReplacementPlacement(instruction),
        );
        if (row == null) throw new Error('Expected template-controller flattening row.');
        const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
        const child = session.createGeneratedContextStructure(childContext);
        session.realizeRenderLocationTarget(row, div);
        session.moveNodeIntoContext(div, childContext, 0, [instruction.productHandle]);
        expect(() => session.moveNodeIntoContext(
          span,
          childContext,
          1,
          [instruction.productHandle],
        )).toThrow(/not admitted/);
        forest.moveNode(span, child.compilerContent, TemplateCompilerOccurrenceEdgeKind.Child, 1);
        expect(() => session.assertCoherent()).toThrow(/without a compiler operation/);
      }

      {
        const input = fixture.materialize('distinct-tc-sources', '<div><span></span></div>');
        const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
        const authoredDiv = requiredAuthoredElement(input.authoredHtml.nodes, 'div');
        const authoredSpan = requiredAuthoredElement(input.authoredHtml.nodes, 'span');
        const div = requiredOccurrenceElement(forest, 'div');
        const span = requiredOccurrenceElement(forest, 'span');
        const targetPlan = createTargetPlan(fixture, 'distinct-tc-sources');
        const outerInstruction = templateControllerInstruction(fixture, authoredDiv, 'distinct-outer');
        const outerContext = targetPlan.createTemplateControllerContext(targetPlan.root, outerInstruction);
        const innerInstruction = templateControllerInstruction(fixture, authoredSpan, 'distinct-inner');
        const innerContext = targetPlan.createTemplateControllerContext(outerContext, innerInstruction);
        outerContext.recordCompilerReachableNode(authoredDiv.productHandle);
        innerContext.recordCompilerReachableNode(authoredSpan.productHandle);
        const rootRow = targetPlan.root.appendRow(
          'distinct-outer',
          authoredDiv,
          [outerInstruction],
          TemplateRenderTargetKind.RenderLocation,
          TemplateCompilerTargetRowPosture.Complete,
          1,
          [],
          authoredDiv.sourceAddressHandle,
          new TemplateCompilerTemplateControllerSourceReplacementPlacement(outerInstruction),
        );
        const outerRow = outerContext.appendRow(
          'distinct-inner',
          authoredSpan,
          [innerInstruction],
          TemplateRenderTargetKind.RenderLocation,
          TemplateCompilerTargetRowPosture.Complete,
          1,
          [],
          authoredSpan.sourceAddressHandle,
          new TemplateCompilerTemplateControllerSourceReplacementPlacement(innerInstruction),
        );
        if (rootRow == null || outerRow == null) throw new Error('Expected distinct-source TC rows.');
        const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
        const outerStructure = session.createGeneratedContextStructure(outerContext);
        session.createGeneratedContextStructure(innerContext);
        session.realizeRenderLocationTarget(rootRow, div);
        session.moveNodeIntoContext(div, outerContext, 0, [outerInstruction.productHandle]);
        expect(() => session.appendRenderLocationTarget(outerRow)).toThrow(/generated-append placement authority/);
        const descendantGeometry = session.realizeRenderLocationTarget(outerRow, span);
        session.moveNodeIntoContext(span, innerContext, 0, [innerInstruction.productHandle]);
        session.assertCoherent();
        for (const node of [
          descendantGeometry.marker,
          descendantGeometry.start,
          descendantGeometry.end,
        ]) {
          forest.moveNode(
            node,
            outerStructure.compilerContent,
            TemplateCompilerOccurrenceEdgeKind.Child,
            outerStructure.compilerContent.readChildren().length,
          );
        }
        expect(() => session.assertCoherent()).toThrow(/marker adjacency/);
      }

      {
        const input = fixture.materialize('render-reorder', '<div></div><!--tail-->');
        const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
        const authoredDiv = requiredAuthoredElement(input.authoredHtml.nodes, 'div');
        const div = requiredOccurrenceElement(forest, 'div');
        const targetPlan = createTargetPlan(fixture, 'render-reorder');
        const instruction = templateControllerInstruction(fixture, authoredDiv, 'render-reorder');
        const childContext = targetPlan.createTemplateControllerContext(targetPlan.root, instruction);
        const row = targetPlan.root.appendRow(
          'render-reorder',
          authoredDiv,
          [instruction],
          TemplateRenderTargetKind.RenderLocation,
          TemplateCompilerTargetRowPosture.Complete,
          1,
          [],
          authoredDiv.sourceAddressHandle,
          new TemplateCompilerTemplateControllerSourceReplacementPlacement(instruction),
        );
        if (row == null) throw new Error('Expected render-reorder row.');
        const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
        session.createGeneratedContextStructure(childContext);
        forest.reorderNode(div, 1);
        expect(() => session.realizeRenderLocationTarget(row, div)).toThrow(/reordered before/);
      }
    } finally {
      fixture.dispose();
    }
  });

  test('rejects owner laundering and source reordering before terminal input operations', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-structural-owner-falsifiers');

    try {
      {
        const input = fixture.materialize(
          'attribute-owner',
          '<div a="1" b="2"><!--first--><!--second--></div><span></span>',
        );
        const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
        const authoredDiv = requiredAuthoredElement(input.authoredHtml.nodes, 'div');
        const authoredSpan = requiredAuthoredElement(input.authoredHtml.nodes, 'span');
        const div = requiredOccurrenceElement(forest, 'div');
        const span = requiredOccurrenceElement(forest, 'span');
        const first = requiredOccurrenceComment(forest, 'first');
        const second = requiredOccurrenceComment(forest, 'second');
        const firstAttribute = div.readAttributes().find((attribute) => attribute.name === 'a');
        const secondAttribute = div.readAttributes().find((attribute) => attribute.name === 'b');
        if (firstAttribute?.inputReference == null || secondAttribute == null) {
          throw new Error('Expected two source-backed attributes.');
        }
        const targetPlan = createTargetPlan(fixture, 'attribute-owner');
        targetPlan.root.recordCompilerReachableNode(authoredDiv.productHandle);
        targetPlan.root.recordCompilerReachableNode(authoredSpan.productHandle);
        const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
        const cause = fixture.run.handles.product('attribute-owner:cause');

        forest.moveNode(first, span, TemplateCompilerOccurrenceEdgeKind.Child, 0);
        expect(() => session.consumeNodeForContext(first, targetPlan.root, [cause])).toThrow(/current source edge/);
        forest.moveNode(first, div, TemplateCompilerOccurrenceEdgeKind.Child, 0);

        forest.moveAttribute(firstAttribute, span, 0);
        expect(() => session.assertCoherent()).toThrow(/changed owner/);
        forest.moveAttribute(firstAttribute, div, 0);

        forest.reorderNode(second, 0);
        expect(() => session.consumeNodeForContext(second, targetPlan.root, [cause])).toThrow(/reordered before/);
        forest.reorderNode(second, 1);
        forest.reorderAttribute(secondAttribute, 0);
        expect(() => session.consumeAttributeForContext(secondAttribute, targetPlan.root, [cause]))
          .toThrow(/reordered before/);
        forest.reorderAttribute(secondAttribute, 1);

        const clonedAttribute = forest.createGeneratedAttribute(
          session.createGeneration(
            targetPlan.root,
            'laundered-attribute',
            TemplateCompilerGeneratedOccurrenceRole.Clone,
            [cause],
            0,
          ),
          firstAttribute.name,
          firstAttribute.value,
          firstAttribute.namespaceUri,
          firstAttribute.prefix,
          firstAttribute.inputReference,
        );
        forest.detachAttribute(firstAttribute);
        forest.insertDetachedAttribute(clonedAttribute, span, 0);
        expect(() => session.assertCoherent()).toThrow(/no final compiler disposition|no exact structural clone operation/);
        expect(first.parent).toBe(div);
      }


      {
        const input = fixture.materialize('live-transferred-attribute', '<div title="x"></div>');
        const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
        const authoredDiv = requiredAuthoredElement(input.authoredHtml.nodes, 'div');
        const div = requiredOccurrenceElement(forest, 'div');
        const attribute = div.readAttributes().find((candidate) => candidate.name === 'title');
        if (attribute == null) throw new Error('Expected transferred source attribute.');
        const targetPlan = createTargetPlan(fixture, 'live-transferred-attribute');
        const instruction = templateControllerInstruction(fixture, authoredDiv, 'live-transferred-attribute');
        const childContext = targetPlan.createTemplateControllerContext(targetPlan.root, instruction);
        childContext.recordCompilerReachableNode(authoredDiv.productHandle);
        const row = targetPlan.root.appendRow(
          'live-transferred-attribute',
          authoredDiv,
          [instruction],
          TemplateRenderTargetKind.RenderLocation,
          TemplateCompilerTargetRowPosture.Complete,
          1,
          [],
          authoredDiv.sourceAddressHandle,
          new TemplateCompilerTemplateControllerSourceReplacementPlacement(instruction),
        );
        if (row == null) throw new Error('Expected transferred-attribute row.');
        const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
        session.createGeneratedContextStructure(childContext);
        session.realizeRenderLocationTarget(row, div);
        session.moveNodeIntoContext(div, childContext, 0, [instruction.productHandle]);
        forest.detachAttribute(attribute);
        expect(() => session.assertCoherent()).toThrow(/no final compiler disposition/);
      }
    } finally {
      fixture.dispose();
    }
  });

  test('keeps a text-expansion band in its seeded source-relative slot', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-structural-text-band');

    try {
      const input = fixture.materialize('text-band', '<div>before<!--tail--><span></span></div>');
      const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
      const authoredDiv = requiredAuthoredElement(input.authoredHtml.nodes, 'div');
      const authoredText = requiredAuthoredText(input.authoredHtml.nodes, 'before');
      const authoredSpan = requiredAuthoredElement(input.authoredHtml.nodes, 'span');
      const inputText = forest.readNodes().find((node): node is TemplateCompilerTextOccurrence =>
        node instanceof TemplateCompilerTextOccurrence && node.text === 'before'
      );
      const tail = requiredOccurrenceComment(forest, 'tail');
      const span = requiredOccurrenceElement(forest, 'span');
      if (inputText?.inputReference == null) throw new Error('Expected source-backed text input.');
      const instruction = new TextBindingInstruction(
        fixture.run.handles.product('text-band:instruction'),
        fixture.run.handles.identity('text-band:instruction'),
        authoredText.toReference(),
        null,
        0,
        authoredText.sourceAddressHandle,
      );
      const targetPlan = createTargetPlan(fixture, 'text-band');
      targetPlan.root.recordCompilerReachableNode(authoredDiv.productHandle);
      targetPlan.root.recordCompilerReachableNode(authoredText.productHandle);
      targetPlan.root.recordCompilerReachableNode(authoredSpan.productHandle);
      const row = targetPlan.root.appendRow('text-band', authoredText, [instruction]);
      if (row == null) throw new Error('Expected text-band row.');
      const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
      const staticText = forest.createGeneratedText(
        session.createGeneration(
          targetPlan.root,
          'text-band:static',
          TemplateCompilerGeneratedOccurrenceRole.StaticTextSegment,
          [instruction.productHandle],
          0,
        ),
        'before',
        inputText.inputReference,
      );
      const placeholder = forest.createGeneratedText(
        session.createGeneration(
          targetPlan.root,
          row.localKey,
          TemplateCompilerGeneratedOccurrenceRole.BindingPlaceholder,
          [instruction.productHandle],
          0,
        ),
        ' ',
        inputText.inputReference,
      );
      expect(() => session.expandTextInput(
        inputText,
        targetPlan.root,
        [staticText, staticText],
        [instruction.productHandle],
      )).toThrow(/generated outputs/);
      expect(inputText.parent).not.toBeNull();
      expect(staticText.parentEdgeKind).toBe(TemplateCompilerOccurrenceEdgeKind.Detached);
      const seededTextParent = inputText.parent;
      if (seededTextParent == null) throw new Error('Expected seeded text parent.');
      forest.moveNode(inputText, span, TemplateCompilerOccurrenceEdgeKind.Child, 0);
      expect(() => session.expandTextInput(
        inputText,
        targetPlan.root,
        [staticText, placeholder],
        [instruction.productHandle],
      )).toThrow(/current source edge/);
      forest.moveNode(inputText, seededTextParent, TemplateCompilerOccurrenceEdgeKind.Child, 0);
      session.expandTextInput(
        inputText,
        targetPlan.root,
        [staticText, placeholder],
        [instruction.productHandle],
      );
      session.realizeMarkerTarget(row, placeholder);
      session.assertCoherent();
      forest.reorderNode(tail, 0);
      expect(() => session.assertCoherent()).toThrow(/source order|incoherent expansion/);
    } finally {
      fixture.dispose();
    }
  });

  test('rejects forged origins, alien generations, reconstructed origins, and malformed generated carriers', () => {
    const fixture = new BrowserEffectiveTemplateFixture('template-compiler-structural-authority-guards');

    try {
      {
        const input = fixture.materialize('forged-origin', '<div title="x"></div>');
        const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
        const targetPlan = createTargetPlan(fixture, 'forged-origin');
        const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
        expect(() => TemplateCompilerStructuralExecutionSession.create(forest, targetPlan))
          .toThrow(/already belongs/);
        const element = requiredOccurrenceElement(forest, 'div');
        const attribute = element.readAttributes()[0];
        if (element.inputReference == null || attribute?.inputReference == null) {
          throw new Error('Expected exact element/attribute input references.');
        }
        const causes = [fixture.run.handles.product('forged-origin:cause')];
        const forgedNode = new TemplateStructuralNodeReference(
          element.inputReference.treeProductHandle,
          element.inputReference.nodeKind,
          element.inputReference.productHandle,
          element.inputReference.identityHandle,
          fixture.run.handles.address('forged-node-address'),
        );
        expect(() => forest.createGeneratedElement(
          session.createGeneration(
            targetPlan.root,
            'forged-node',
            TemplateCompilerGeneratedOccurrenceRole.Clone,
            causes,
            0,
          ),
          element.tagName,
          element.namespace,
          element.namespaceUri,
          forgedNode,
        )).toThrow(/seeded origin index/);
        const forgedAttribute = new TemplateStructuralAttributeReference(
          attribute.inputReference.treeProductHandle,
          attribute.inputReference.productHandle,
          attribute.inputReference.identityHandle,
          attribute.inputReference.addressHandle,
          'forged-name',
        );
        expect(() => forest.createGeneratedAttribute(
          session.createGeneration(
            targetPlan.root,
            'forged-attribute',
            TemplateCompilerGeneratedOccurrenceRole.Clone,
            causes,
            0,
          ),
          attribute.name,
          attribute.value,
          attribute.namespaceUri,
          attribute.prefix,
          forgedAttribute,
        )).toThrow(/seeded origin index/);
        const spentGeneration = session.createGeneration(
          targetPlan.root,
          'spent-generation',
          TemplateCompilerGeneratedOccurrenceRole.Clone,
          causes,
          0,
        );
        forest.createGeneratedElement(
          spentGeneration,
          element.tagName,
          element.namespace,
          element.namespaceUri,
          element.inputReference,
        );
        expect(() => forest.createGeneratedAttribute(
          spentGeneration,
          attribute.name,
          attribute.value,
          attribute.namespaceUri,
          attribute.prefix,
          attribute.inputReference,
        )).toThrow(/already spent/);
      }

      {
        const input = fixture.materialize('malformed-carrier', '<div></div>');
        const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
        const authoredDiv = requiredAuthoredElement(input.authoredHtml.nodes, 'div');
        const targetPlan = createTargetPlan(fixture, 'malformed-carrier');
        const instruction = templateControllerInstruction(fixture, authoredDiv, 'malformed-carrier');
        const context = targetPlan.createTemplateControllerContext(targetPlan.root, instruction);
        targetPlan.root.appendRow('owner', authoredDiv, [instruction]);
        const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
        const causes = [instruction.productHandle];
        const carrier = forest.createGeneratedElement(
          session.createGeneration(
            context,
            'malformed-pair',
            TemplateCompilerGeneratedOccurrenceRole.TemplateCarrier,
            causes,
            0,
          ),
          'template',
          HtmlNamespaceKind.Html,
          'http://www.w3.org/1999/xhtml',
        );
        expect(() => session.createGeneration(
          context,
          'malformed-pair',
          TemplateCompilerGeneratedOccurrenceRole.TemplateContent,
          [fixture.run.handles.product('different-cause')],
          0,
        )).toThrow(/changed its ordered semantic causes/);
        const content = forest.createGeneratedFragment(session.createGeneration(
          context,
          'malformed-pair',
          TemplateCompilerGeneratedOccurrenceRole.TemplateContent,
          causes,
          1,
        ));
        forest.insertDetachedNode(carrier, null, TemplateCompilerOccurrenceEdgeKind.Root, forest.readRoots().length);
        forest.insertDetachedNode(content, carrier, TemplateCompilerOccurrenceEdgeKind.TemplateContent, 0);
        expect(() => session.bindContextStructure(context, carrier, content))
          .toThrow(/incoherent generated carrier pair/);
      }

      {
        const input = fixture.materialize('malformed-carrier-namespace', '<div></div>');
        const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
        const authoredDiv = requiredAuthoredElement(input.authoredHtml.nodes, 'div');
        const targetPlan = createTargetPlan(fixture, 'malformed-carrier-namespace');
        const instruction = templateControllerInstruction(fixture, authoredDiv, 'malformed-carrier-namespace');
        const context = targetPlan.createTemplateControllerContext(targetPlan.root, instruction);
        targetPlan.root.appendRow('owner', authoredDiv, [instruction]);
        const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
        const causes = [instruction.productHandle];
        const carrier = forest.createGeneratedElement(
          session.createGeneration(
            context,
            'malformed-namespace-pair',
            TemplateCompilerGeneratedOccurrenceRole.TemplateCarrier,
            causes,
            0,
          ),
          'template',
          HtmlNamespaceKind.Svg,
          'http://www.w3.org/2000/svg',
        );
        const content = forest.createGeneratedFragment(session.createGeneration(
          context,
          'malformed-namespace-pair',
          TemplateCompilerGeneratedOccurrenceRole.TemplateContent,
          causes,
          0,
        ));
        forest.insertDetachedNode(carrier, null, TemplateCompilerOccurrenceEdgeKind.Root, forest.readRoots().length);
        forest.insertDetachedNode(content, carrier, TemplateCompilerOccurrenceEdgeKind.TemplateContent, 0);
        expect(() => session.bindContextStructure(context, carrier, content))
          .toThrow(/exact template-content carrier/);
      }

      {
        const input = fixture.materialize('alien-generation', '<div>x</div>');
        const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
        const targetPlan = createTargetPlan(fixture, 'alien-generation');
        const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
        const text = forest.readNodes().find((node): node is TemplateCompilerTextOccurrence =>
          node instanceof TemplateCompilerTextOccurrence && node.text === 'x'
        );
        if (text?.inputReference == null || text.parent == null) throw new Error('Expected source-backed text.');
        const alien = forest.createGeneratedText(
          new TemplateCompilerOccurrenceGeneration(
            {},
            targetPlan.root.localKey,
            'alien',
            TemplateCompilerGeneratedOccurrenceRole.StaticTextSegment,
            [fixture.run.handles.product('alien:cause')],
            0,
          ),
          'alien',
          text.inputReference,
        );
        forest.insertDetachedNode(alien, text.parent, TemplateCompilerOccurrenceEdgeKind.Child, 0);
        expect(() => session.assertCoherent()).toThrow(/belongs to another session/);
      }

      {
        const input = fixture.materialize('bad-carrier-role', '<div></div>');
        const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
        const targetPlan = createTargetPlan(fixture, 'bad-carrier-role');
        const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
        const falseCarrier = forest.createGeneratedElement(
          session.createGeneration(
            targetPlan.root,
            'false-carrier',
            TemplateCompilerGeneratedOccurrenceRole.TemplateCarrier,
            [fixture.run.handles.product('false-carrier:cause')],
            0,
          ),
          'div',
          HtmlNamespaceKind.Html,
          'http://www.w3.org/1999/xhtml',
        );
        forest.insertDetachedNode(
          falseCarrier,
          forest.compilerContent,
          TemplateCompilerOccurrenceEdgeKind.Child,
          0,
        );
        expect(() => session.assertCoherent()).toThrow(/exact assigned context carrier/);
      }

      {
        const input = fixture.materialize('hidden-carrier-child', '<div></div>');
        const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
        const targetPlan = createTargetPlan(fixture, 'hidden-carrier-child');
        const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
        const div = requiredOccurrenceElement(forest, 'div');
        forest.moveNode(
          div,
          forest.compilerCarrier,
          TemplateCompilerOccurrenceEdgeKind.Child,
          0,
        );
        expect(() => session.assertCoherent()).toThrow(/structural ownership/);
      }

      {
        const input = fixture.materialize('placeholder-shape', '<div>x</div>');
        const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
        const authoredDiv = requiredAuthoredElement(input.authoredHtml.nodes, 'div');
        const authoredText = requiredAuthoredText(input.authoredHtml.nodes, 'x');
        const div = requiredOccurrenceElement(forest, 'div');
        const text = forest.readNodes().find((node): node is TemplateCompilerTextOccurrence =>
          node instanceof TemplateCompilerTextOccurrence && node.text === 'x'
        );
        if (text?.inputReference == null || text.parent == null) throw new Error('Expected source-backed text.');
        const targetPlan = createTargetPlan(fixture, 'placeholder-shape');
        const instruction = new TextBindingInstruction(
          fixture.run.handles.product('placeholder-shape:instruction'),
          fixture.run.handles.identity('placeholder-shape:instruction'),
          authoredText.toReference(),
          null,
          0,
          authoredText.sourceAddressHandle,
        );
        const textRow = targetPlan.root.appendRow('text', authoredText, [instruction]);
        const elementRow = targetPlan.root.appendRow(
          'element',
          authoredDiv,
          [setAttributeInstruction(fixture, authoredDiv, 'placeholder-shape:element')],
        );
        if (textRow == null || elementRow == null) throw new Error('Expected shape falsifier rows.');
        const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
        expect(() => session.realizeMarkerTarget(textRow, text)).toThrow(/binding placeholder/);
        expect(() => session.realizeMarkerTarget(textRow, div)).toThrow(/binding placeholder/);
        const textOrdinal = text.readParentOrdinal();
        if (textOrdinal == null) throw new Error('Expected live source text ordinal.');
        const malformed = forest.createGeneratedText(
          session.createGeneration(
            targetPlan.root,
            textRow.localKey,
            TemplateCompilerGeneratedOccurrenceRole.BindingPlaceholder,
            [instruction.productHandle],
            0,
          ),
          '',
          text.inputReference,
        );
        forest.insertDetachedNode(
          malformed,
          text.parent,
          TemplateCompilerOccurrenceEdgeKind.Child,
          textOrdinal,
        );
        expect(() => session.realizeMarkerTarget(textRow, malformed)).toThrow(/binding placeholder/);
        expect(() => session.realizeMarkerTarget(elementRow, malformed)).toThrow(/authored node\/target shape/);
      }

      {
        const input = fixture.materialize('duplicate-element-target', '<div></div>');
        const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
        const authoredDiv = requiredAuthoredElement(input.authoredHtml.nodes, 'div');
        const div = requiredOccurrenceElement(forest, 'div');
        const targetPlan = createTargetPlan(fixture, 'duplicate-element-target');
        const firstRow = targetPlan.root.appendRow(
          'first',
          authoredDiv,
          [setAttributeInstruction(fixture, authoredDiv, 'duplicate-element-target:first')],
        );
        const secondRow = targetPlan.root.appendRow(
          'second',
          authoredDiv,
          [setAttributeInstruction(fixture, authoredDiv, 'duplicate-element-target:second')],
        );
        if (firstRow == null || secondRow == null) throw new Error('Expected duplicate element rows.');
        const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
        session.realizeMarkerTarget(firstRow, div);
        expect(() => session.realizeMarkerTarget(secondRow, div)).toThrow(/reuse logical occurrence/);
      }

      {
        const input = fixture.materialize('reconstructed-origin', '<p><b>1<i>2</b>3</i>4</p>');
        const forest = TemplateCompilerOccurrenceForest.fromBrowserEffective(input.emission);
        const authoredItalic = requiredAuthoredElement(input.authoredHtml.nodes, 'i');
        const italic = requiredOccurrenceElement(forest, 'i');
        const targetPlan = createTargetPlan(fixture, 'reconstructed-origin');
        const instruction = setAttributeInstruction(fixture, authoredItalic, 'reconstructed-origin');
        const row = targetPlan.root.appendRow('reconstructed', authoredItalic, [instruction]);
        if (row == null) throw new Error('Expected reconstructed-origin falsifier row.');
        const session = TemplateCompilerStructuralExecutionSession.create(forest, targetPlan);
        expect(() => session.realizeMarkerTarget(row, italic)).toThrow(/no exact singular authored origin/);
      }
    } finally {
      fixture.dispose();
    }
  });
});

function membershipArrivalAuthority(
  context: TemplateCompilerTargetContextPlan,
  occurrence: TemplateCompilerNodeOccurrence,
  arrivalPosture: Exclude<
    TemplateCompilerOccurrenceMembershipArrivalPosture,
    TemplateCompilerOccurrenceMembershipArrivalPosture.Initial
  >,
): TemplateCompilerTargetOccurrenceMembershipArrivalAuthority {
  return {
    context,
    occurrence,
    arrivalPosture,
    authorizesMembership(candidateContext, candidateOccurrence, candidatePosture): boolean {
      return candidateContext === context
        && candidateOccurrence === occurrence
        && candidatePosture === arrivalPosture;
    },
  };
}

function transitionSourceRowAuthority(
  sourceContext: TemplateCompilerTargetContextPlan,
  occurrence: TemplateCompilerElementOccurrence,
  sourceArrivalPosture: TemplateCompilerOccurrenceMembershipArrivalPosture,
  destinationContext: TemplateCompilerTargetContextPlan,
  destinationMembership: ReturnType<TemplateCompilerTargetContextPlan['recordCompilerReachableOccurrence']>,
): TemplateCompilerTemplateControllerTransitionSourceRowAuthority {
  return {
    sourceContext,
    occurrence,
    sourceArrivalPosture,
    destinationContext,
    destinationMembership,
    authorizesTransitionSourceRow(
      candidateSource,
      candidateOccurrence,
      candidateSourcePosture,
      candidateDestination,
      candidateMembership,
    ): boolean {
      return candidateSource === sourceContext
        && candidateOccurrence === occurrence
        && candidateSourcePosture === sourceArrivalPosture
        && candidateDestination === destinationContext
        && candidateMembership === destinationMembership;
    },
  };
}

function createTargetPlan(
  fixture: BrowserEffectiveTemplateFixture,
  key: string,
): TemplateCompilerTargetPlan {
  const rootContext = new TemplateCompilationContextReference(
    fixture.run.handles.product(`${key}:root-context`),
    fixture.run.handles.identity(`${key}:root-context`),
    TemplateCompilationContextKind.Root,
    null,
  );
  const rootCompiledTemplate = new CompiledTemplateReference(
    fixture.run.handles.product(`${key}:root-compiled-template`),
    fixture.run.handles.identity(`${key}:root-compiled-template`),
  );
  return new TemplateCompilerTargetPlan(`${key}:target-plan`, rootContext, rootCompiledTemplate);
}

function createProjectionContributorPlan(
  fixture: BrowserEffectiveTemplateFixture,
  key: string,
  host: HtmlElement,
  contributor: HydrateElementProjectionContributor,
): TemplateCompilerTargetPlan {
  const targetPlan = createTargetPlan(fixture, key);
  const projection = new HydrateElementProjectionDefinition(
    'default',
    new CompiledTemplateReference(
      fixture.run.handles.product(`${key}:projection-template`),
      fixture.run.handles.identity(`${key}:projection-template`),
    ),
    [contributor],
    host.sourceAddressHandle,
  );
  const instruction = new HydrateElementInstruction(
    fixture.run.handles.product(`${key}:host-instruction`),
    fixture.run.handles.identity(`${key}:host-instruction`),
    host.toReference(),
    host.tagName,
    host.tagName,
    null,
    [projection],
    [],
    null,
    [],
    [],
    [],
    false,
    host.sourceAddressHandle,
  );
  targetPlan.createProjectionContext(targetPlan.root, instruction, projection);
  targetPlan.root.appendRow('projection-host', host, [instruction]);
  return targetPlan;
}

function templateControllerInstruction(
  fixture: BrowserEffectiveTemplateFixture,
  element: HtmlElement,
  key: string,
): HydrateTemplateControllerInstruction {
  return new HydrateTemplateControllerInstruction(
    fixture.run.handles.product(`${key}:instruction`),
    fixture.run.handles.identity(`${key}:instruction`),
    element.toReference(),
    {
      productHandle: null,
      addressHandle: element.sourceAddressHandle,
      rawName: 'if.bind',
    },
    'if',
    null,
    new CompiledTemplateReference(
      fixture.run.handles.product(`${key}:compiled-template`),
      fixture.run.handles.identity(`${key}:compiled-template`),
    ),
    [],
    element.sourceAddressHandle,
  );
}

function setAttributeInstruction(
  fixture: BrowserEffectiveTemplateFixture,
  element: HtmlElement,
  key: string,
): SetAttributeInstruction {
  return new SetAttributeInstruction(
    fixture.run.handles.product(`${key}:instruction`),
    fixture.run.handles.identity(`${key}:instruction`),
    element.toReference(),
    {
      productHandle: null,
      addressHandle: element.sourceAddressHandle,
      rawName: 'data-ready',
    },
    'data-ready',
    'true',
    element.sourceAddressHandle,
  );
}

function requiredAuthoredElement(
  nodes: readonly (HtmlElement | HtmlText | object)[],
  tagName: string,
): HtmlElement {
  const element = nodes.find((node): node is HtmlElement =>
    node instanceof HtmlElement && node.tagName.toLowerCase() === tagName
  );
  if (element == null) throw new Error(`Expected authored <${tagName}> element.`);
  return element;
}

function requiredAuthoredText(
  nodes: readonly (HtmlElement | HtmlText | object)[],
  text: string,
): HtmlText {
  const node = nodes.find((candidate): candidate is HtmlText =>
    candidate instanceof HtmlText && candidate.text === text
  );
  if (node == null) throw new Error(`Expected authored text '${text}'.`);
  return node;
}

function requiredAuthoredComment(
  nodes: readonly (HtmlElement | HtmlText | HtmlComment | object)[],
  text: string,
): HtmlComment {
  const node = nodes.find((candidate): candidate is HtmlComment =>
    candidate instanceof HtmlComment && candidate.text === text
  );
  if (node == null) throw new Error(`Expected authored comment '${text}'.`);
  return node;
}

function requiredOccurrenceElement(
  forest: TemplateCompilerOccurrenceForest,
  tagName: string,
): TemplateCompilerElementOccurrence {
  const element = forest.readNodes().find((node): node is TemplateCompilerElementOccurrence =>
    node instanceof TemplateCompilerElementOccurrence && node.tagName.toLowerCase() === tagName
  );
  if (element == null) throw new Error(`Expected compiler <${tagName}> occurrence.`);
  return element;
}

function requiredOccurrenceComment(
  forest: TemplateCompilerOccurrenceForest,
  text: string,
): TemplateCompilerCommentOccurrence {
  const comment = forest.readNodes().find((node): node is TemplateCompilerCommentOccurrence =>
    node instanceof TemplateCompilerCommentOccurrence && node.text === text
  );
  if (comment == null) throw new Error(`Expected compiler comment '${text}' occurrence.`);
  return comment;
}

function requiredOccurrenceText(
  forest: TemplateCompilerOccurrenceForest,
  text: string,
): TemplateCompilerTextOccurrence {
  const occurrence = forest.readNodes().find((node): node is TemplateCompilerTextOccurrence =>
    node instanceof TemplateCompilerTextOccurrence && node.text === text
  );
  if (occurrence == null) throw new Error(`Expected compiler text '${text}' occurrence.`);
  return occurrence;
}
