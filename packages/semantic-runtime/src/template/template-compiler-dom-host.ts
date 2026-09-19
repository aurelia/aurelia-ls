import ts from 'typescript';

import { EvaluationCompletionKind, ThrowEvaluationCompletion } from '../evaluation/completion.js';
import type { StaticEvaluationValueGraph } from '../evaluation/evaluation-graph.js';
import {
  StaticEvaluationRuntimeValueResult,
  type StaticEvaluationRuntimeHost,
} from '../evaluation/evaluator.js';
import type { StaticIntrinsicEvaluationHost } from '../evaluation/intrinsics/contracts.js';
import {
  StaticInvocationHandled,
  StaticInvocationKind,
  StaticInvocationNotApplicable,
  staticInvocationValue,
  type StaticInvocationDispatch,
  type StaticInvocationFrame,
} from '../evaluation/invocation.js';
import { EvaluationIteratorStep, EvaluationIteratorStepKind, type EvaluationIterator } from '../evaluation/iterator-projection.js';
import { EvaluationOpenSeamKind } from '../evaluation/seams.js';
import { EvaluationValueEvidence } from '../evaluation/value-pressure.js';
import { EvaluationRuntimeIdentityIndex } from '../evaluation/value-relation.js';
import {
  EvaluationArrayElement,
  EvaluationArrayValue,
  EvaluationBoundaryKind,
  EvaluationBoundaryValue,
  EvaluationBooleanValue,
  EvaluationNullValue,
  EvaluationNumberValue,
  EvaluationObjectProperty,
  EvaluationObjectPropertyState,
  EvaluationObjectValue,
  EvaluationStringValue,
  EvaluationUndefined,
  EvaluationUnknownValue,
  EvaluationValueKind,
  readEvaluationTruthiness,
  readEvaluationPrimitive,
  type EvaluationValue,
} from '../evaluation/values.js';
import { HtmlNamespaceKind } from './html-ir.js';
import type { TemplateContentOwnerDocument } from './template-structure.js';
import type {
  TemplateCompilerExecutionSession,
  TemplateCompilerPendingOperationAttempt,
} from './template-compiler-execution.js';
import { snapshotTemplateCompilerDescendantElements } from './template-compiler-dom-query.js';
import {
  compilerDomAttributeNameIssue,
  compilerDomElementNameIssue,
  compilerDomNamespacedAttributeName,
  type CompilerDomAttributeName,
} from './template-compiler-dom-name.js';
import {
  TemplateCompilerCommentOccurrence,
  TemplateCompilerDoctypeOccurrence,
  TemplateCompilerElementOccurrence,
  TemplateCompilerFragmentOccurrence,
  TemplateCompilerOccurrenceEdgeKind,
  TemplateCompilerTextOccurrence,
  type TemplateCompilerAttributeOccurrence,
  type TemplateCompilerNodeOccurrence,
} from './template-compiler-occurrence.js';

export interface TemplateCompilerDomRefusal {
  readonly kind: string;
  readonly member: string | null;
  readonly node: ts.Node;
  readonly summary: string;
}

class CompilerDomNodeReference {
  readonly kind = 'node';
  readonly collections = new Map<string, CompilerDomCollectionReference>();
  classList: CompilerDomTokenListReference | null = null;
  constructor(readonly occurrence: TemplateCompilerNodeOccurrence) {}
}

class CompilerDomTokenListReference {
  readonly kind = 'tokens';
  constructor(readonly element: TemplateCompilerElementOccurrence) {}
}

class CompilerDomTokenIteratorReference {
  readonly kind = 'token-iterator';
  constructor(readonly iterator: EvaluationIterator) {}
}

class CompilerDomCollectionReference {
  readonly kind = 'collection';
  constructor(
    readonly nodeList: boolean,
    readonly read: () => readonly TemplateCompilerNodeOccurrence[],
  ) {}
}

class CompilerDomOpaqueReference {
  constructor(readonly kind: 'platform' | 'document' | 'metadata') {}
}

type CompilerDomReference = CompilerDomNodeReference | CompilerDomCollectionReference | CompilerDomTokenListReference
  | CompilerDomTokenIteratorReference | CompilerDomOpaqueReference;

/**
 * Source-callable DOM operations over the existing compiler forest and pending operation overlay.
 *
 * Traversal, document factories, copies, attributes, class tokens, and node relocation/removal use one pending operation.
 * Native resource effects are not confined DOM mutations: platform-owned resource mutations remain explicit refusals.
 * Native control history, markup/metadata writes, and dataset remain unsupported until their owned lowering lanes exist.
 */
export class TemplateCompilerDomHost {
  readonly argumentValues: readonly EvaluationValue[];
  refusal: TemplateCompilerDomRefusal | null = null;
  private readonly references = new EvaluationRuntimeIdentityIndex<CompilerDomReference>();
  private readonly values = new WeakMap<CompilerDomReference, EvaluationObjectValue>();
  private readonly nodeReferences = new Map<TemplateCompilerNodeOccurrence, CompilerDomNodeReference>();
  private readonly methods = new Map<string, EvaluationBoundaryValue>();
  private readonly methodNames = new WeakMap<EvaluationValue, string>();
  private readonly ownedNodes = new Set<TemplateCompilerNodeOccurrence>();
  private readonly document = new CompilerDomOpaqueReference('document');
  private readonly templateContentsDocument = new CompilerDomOpaqueReference('document');
  private evaluationGraph: StaticEvaluationValueGraph | null = null;

  constructor(
    private readonly execution: TemplateCompilerExecutionSession,
    private readonly attempt: TemplateCompilerPendingOperationAttempt,
    private readonly rootElement: TemplateCompilerElementOccurrence,
  ) {
    const pending = [rootElement as TemplateCompilerNodeOccurrence];
    while (pending.length > 0) {
      const node = pending.pop()!;
      this.ownedNodes.add(node);
      pending.push(...node.readChildren());
      if (node instanceof TemplateCompilerElementOccurrence && node.templateContent != null) {
        pending.push(node.templateContent);
      }
    }
    this.argumentValues = [
      this.nodeValue(rootElement),
      this.referenceValue(new CompilerDomOpaqueReference('platform')),
      this.referenceValue(new CompilerDomOpaqueReference('metadata')),
    ];
  }

  decorateRuntimeHost(baseHost: StaticEvaluationRuntimeHost): StaticEvaluationRuntimeHost {
    this.evaluationGraph = baseHost.evaluationValueGraph ?? null;
    const previous = baseHost.closedOperations;
    return {
      ...baseHost,
      closedOperations: {
        ...previous,
        readProperty: (receiver, member, node, moduleKey, host) => {
          const reference = this.references.read(receiver);
          return reference == null
            ? previous?.readProperty?.(receiver, member, node, moduleKey, host) ?? null
            : new StaticEvaluationRuntimeValueResult(this.read(reference, member, node, moduleKey, host), null);
        },
        writeProperty: (receiver, member, evidence, node, moduleKey, host) => {
          const reference = this.references.read(receiver);
          if (reference == null) return previous?.writeProperty?.(receiver, member, evidence, node, moduleKey, host) ?? null;
          return new StaticEvaluationRuntimeValueResult(this.write(reference, member, evidence.value, node, moduleKey, host), null);
        },
        evaluateInvocation: (frame, host) => {
          const member = this.methodNames.get(frame.callee.value);
          if (member == null) return previous?.evaluateInvocation?.(frame, host) ?? StaticInvocationNotApplicable;
          const result = this.invoke(frame, member, host);
          if (result instanceof StaticInvocationHandled && result.completion.kind === EvaluationCompletionKind.Throw) {
            this.evaluationGraph?.retainProduced(result.completion.value);
          }
          return result;
        },
        openIterator: (source, node, moduleKey, host) => {
          const reference = this.references.read(source);
          if (reference?.kind === 'token-iterator') return reference.iterator;
          if (!(reference instanceof CompilerDomCollectionReference) && !(reference instanceof CompilerDomTokenListReference)) {
            return previous?.openIterator?.(source, node, moduleKey, host) ?? null;
          }
          let index = 0;
          let done = false;
          return {
            next: () => {
              const current = done ? null : reference.kind === 'tokens' ? this.classTokens(reference)[index] : reference.read()[index];
              if (current == null) {
                done = true;
                return new EvaluationIteratorStep(EvaluationIteratorStepKind.Done);
              }
              return new EvaluationIteratorStep(
                EvaluationIteratorStepKind.Value,
                new EvaluationArrayElement(typeof current === 'string' ? new EvaluationStringValue(current) : this.nodeValue(current), null, [], index++),
              );
            },
          };
        },
      },
    };
  }

  private read(
    reference: CompilerDomReference,
    member: string,
    node: ts.Node,
    moduleKey: string,
    host: StaticIntrinsicEvaluationHost,
  ): EvaluationValue {
    if (this.refusal != null) return this.unsupported(member, node, moduleKey, host);
    if (reference.kind === 'platform' && member === 'document') return this.referenceValue(this.document);
    if (reference.kind === 'document') {
      if (member === 'nodeType') return new EvaluationNumberValue(9);
      if (member === 'nodeName') return new EvaluationStringValue('#document');
      if (member === 'ownerDocument') return new EvaluationNullValue();
      if (['createElement', 'createElementNS', 'createTextNode', 'createComment', 'createDocumentFragment', 'importNode'].includes(member)) {
        return this.method(`document:${member}`);
      }
      return this.unsupported(member, node, moduleKey, host);
    }
    if (reference.kind === 'token-iterator') return member === 'next'
      ? this.method('token-iterator:next') : this.unsupported(member, node, moduleKey, host);
    if (reference.kind === 'tokens') {
      if (member === 'value') return new EvaluationStringValue(this.reflectedAttributeValue(reference.element, 'class'));
      if (member === 'length') return new EvaluationNumberValue(this.classTokens(reference).length);
      if (/^(0|[1-9]\d*)$/.test(member)) {
        const token = this.classTokens(reference)[Number(member)];
        return token == null ? EvaluationUndefined : new EvaluationStringValue(token);
      }
      if (['add', 'remove', 'contains', 'toggle', 'replace', 'item', 'supports', 'toString', 'forEach', 'keys', 'values', 'entries'].includes(member)) {
        return this.method(`tokens:${member}`);
      }
      return this.unsupported(member, node, moduleKey, host);
    }
    if (reference.kind === 'collection') {
      if (member === 'length') return new EvaluationNumberValue(reference.read().length);
      if (/^(0|[1-9]\d*)$/.test(member)) {
        const value = reference.read()[Number(member)];
        return value == null ? EvaluationUndefined : this.nodeValue(value);
      }
      if (member === 'item' || member === 'forEach' && reference.nodeList) return this.method(member);
      return this.unsupported(member, node, moduleKey, host);
    }
    if (reference.kind !== 'node') return this.unsupported(member, node, moduleKey, host);
    const occurrence = reference.occurrence;
    switch (member) {
      case 'nodeType': return new EvaluationNumberValue(nodeType(occurrence));
      case 'nodeName': return new EvaluationStringValue(nodeName(occurrence));
      case 'ownerDocument': return this.referenceValue(this.execution.forest.ownerDocumentFor(occurrence) === 'platform'
        ? this.document : this.templateContentsDocument);
      case 'parentNode':
      case 'parentElement':
        if (occurrence === this.rootElement) return this.outside(member, node, moduleKey, host);
        if (occurrence.parentEdgeKind === TemplateCompilerOccurrenceEdgeKind.TemplateContent) return new EvaluationNullValue();
        return this.nullableNode(member === 'parentElement' && !(occurrence.parent instanceof TemplateCompilerElementOccurrence)
          ? null : occurrence.parent);
      case 'childNodes': return this.collection(reference, member, true, () => occurrence.readChildren());
      case 'children':
        if (!isParent(occurrence)) break;
        return this.collection(reference, member, false, () => childElements(occurrence));
      case 'childElementCount':
        if (!isParent(occurrence)) break;
        return new EvaluationNumberValue(childElements(occurrence).length);
      case 'firstChild': return this.nullableNode(occurrence.readChildren()[0] ?? null);
      case 'lastChild': return this.nullableNode(occurrence.readChildren().at(-1) ?? null);
      case 'firstElementChild':
        if (!isParent(occurrence)) break;
        return this.nullableNode(childElements(occurrence)[0] ?? null);
      case 'lastElementChild':
        if (!isParent(occurrence)) break;
        return this.nullableNode(childElements(occurrence).at(-1) ?? null);
      case 'previousSibling':
      case 'nextSibling':
      case 'previousElementSibling':
      case 'nextElementSibling': {
        if (member.includes('Element') && (occurrence instanceof TemplateCompilerFragmentOccurrence || occurrence instanceof TemplateCompilerDoctypeOccurrence)) break;
        if (occurrence === this.rootElement) return this.outside(member, node, moduleKey, host);
        if (occurrence.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Child || occurrence.parent == null) return new EvaluationNullValue();
        const siblings = occurrence.parent.readChildren();
        const step = member.startsWith('previous') ? -1 : 1;
        for (let index = siblings.indexOf(occurrence) + step; index >= 0 && index < siblings.length; index += step) {
          const sibling = siblings[index]!;
          if (!member.includes('Element') || sibling instanceof TemplateCompilerElementOccurrence) return this.nodeValue(sibling);
        }
        return new EvaluationNullValue();
      }
      case 'nodeValue':
      case 'data':
        if (occurrence instanceof TemplateCompilerTextOccurrence || occurrence instanceof TemplateCompilerCommentOccurrence) {
          return new EvaluationStringValue(occurrence.text);
        }
        if (member === 'nodeValue') return new EvaluationNullValue();
        break;
      case 'textContent': return occurrence instanceof TemplateCompilerDoctypeOccurrence
        ? new EvaluationNullValue() : new EvaluationStringValue(textContent(occurrence));
      case 'hasChildNodes':
      case 'cloneNode':
      case 'contains':
      case 'appendChild':
      case 'insertBefore':
      case 'replaceChild':
      case 'removeChild': return this.method(member);
      case 'remove':
        if (!(occurrence instanceof TemplateCompilerFragmentOccurrence)) return this.method(member);
        break;
    }
    if (occurrence instanceof TemplateCompilerElementOccurrence) {
      switch (member) {
        case 'tagName': return new EvaluationStringValue(nodeName(occurrence));
        case 'localName': return new EvaluationStringValue(occurrence.tagName);
        case 'namespaceURI': return new EvaluationStringValue(occurrence.namespaceUri);
        case 'id': return new EvaluationStringValue(this.reflectedAttributeValue(occurrence, 'id'));
        case 'className':
          if (occurrence.namespace !== HtmlNamespaceKind.Html) break;
          return new EvaluationStringValue(this.reflectedAttributeValue(occurrence, 'class'));
        case 'classList':
          reference.classList ??= new CompilerDomTokenListReference(occurrence);
          return this.referenceValue(reference.classList);
        case 'slot': return new EvaluationStringValue(this.reflectedAttributeValue(occurrence, 'slot'));
        case 'content':
          if (occurrence.templateContent != null) return this.nodeValue(occurrence.templateContent);
          break;
        case 'getAttribute':
        case 'getAttributeNS':
        case 'hasAttribute':
        case 'hasAttributeNS':
        case 'hasAttributes':
        case 'getAttributeNames':
        case 'setAttribute':
        case 'setAttributeNS':
        case 'removeAttribute':
        case 'removeAttributeNS':
        case 'toggleAttribute':
        case 'getElementsByTagName':
        case 'getElementsByClassName': return this.method(member);
      }
    }
    return this.unsupported(member, node, moduleKey, host);
  }

  private write(
    reference: CompilerDomReference,
    member: string,
    value: EvaluationValue,
    node: ts.Node,
    moduleKey: string,
    host: StaticIntrinsicEvaluationHost,
  ): EvaluationValue {
    if (this.refusal == null && reference.kind === 'tokens' && member === 'value') {
      return this.setReflectedAttribute(reference.element, 'class', value, member, node, moduleKey, host);
    }
    if (this.refusal == null && reference.kind === 'node' && reference.occurrence instanceof TemplateCompilerElementOccurrence) {
      const name = member === 'id' || member === 'slot' ? member
        : member === 'classList' || member === 'className' && reference.occurrence.namespace === HtmlNamespaceKind.Html ? 'class' : null;
      if (name != null) return this.setReflectedAttribute(reference.occurrence, name, value, member, node, moduleKey, host);
    }
    return this.unsupported(member, node, moduleKey, host);
  }

  private invoke(frame: StaticInvocationFrame, member: string, host: StaticIntrinsicEvaluationHost): StaticInvocationDispatch {
    if (this.refusal != null) return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host));
    if (frame.kind !== StaticInvocationKind.Call || frame.thisValue == null) return domThrow('TypeError', 'Illegal DOM invocation.');
    const reference = this.references.read(frame.thisValue.value);
    const args = frame.argumentList.elements.map((entry) => entry.value);
    if (reference == null) return domThrow('TypeError', 'Illegal DOM invocation.');
    if (member.startsWith('document:')) {
      return reference.kind === 'document'
        ? this.invokeDocumentFactory(reference, member.slice(9), args, frame, host)
        : domThrow('TypeError', 'Illegal Document invocation.');
    }
    if (member === 'token-iterator:next') {
      if (reference.kind !== 'token-iterator') return domThrow('TypeError', 'Illegal DOMTokenList iterator invocation.');
      const step = reference.iterator.next();
      const result = new EvaluationObjectValue(new Map([
        ['done', new EvaluationObjectProperty('done', new EvaluationBooleanValue(step.kind === EvaluationIteratorStepKind.Done), null, EvaluationObjectPropertyState.Closed)],
        ['value', new EvaluationObjectProperty('value', step.element?.value ?? EvaluationUndefined, null, EvaluationObjectPropertyState.Closed)],
      ]), false);
      this.evaluationGraph?.retainProduced(result);
      return staticInvocationValue(result);
    }
    if (member.startsWith('tokens:')) {
      return reference.kind === 'tokens'
        ? this.invokeTokenList(reference, member.slice(7), args, frame, host)
        : domThrow('TypeError', 'Illegal DOMTokenList invocation.');
    }
    if (reference.kind === 'collection') {
      if (member === 'item') {
        if (args.length < 1) return domThrow('TypeError', 'item requires an index.');
        const value = args[0]!;
        if (value.kind === EvaluationValueKind.BigInt) return domThrow('TypeError', 'A BigInt cannot be converted to a DOM collection index.');
        if (value.kind !== EvaluationValueKind.String && value.kind !== EvaluationValueKind.Number
          && value.kind !== EvaluationValueKind.Boolean && value.kind !== EvaluationValueKind.Null
          && value.kind !== EvaluationValueKind.Undefined) {
          return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'runtime-dependent-input'));
        }
        const index = Number(readEvaluationPrimitive(value)) >>> 0;
        return staticInvocationValue(this.nullableNode(reference.read()[index] ?? null));
      }
      if (member === 'forEach' && reference.nodeList && ts.isCallExpression(frame.node)) {
        const callback = args[0];
        if (callback?.kind !== EvaluationValueKind.Function) return domThrow('TypeError', 'forEach requires a callback.');
        const length = reference.read().length;
        if (length > host.guardrails.maxIntrinsicCallbackEvaluations) {
          return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'evaluation-limit'));
        }
        for (let index = 0; index < length; index++) {
          const current = reference.read()[index];
          if (current == null) continue;
          host.evaluateFunctionWithArguments(callback, frame.node, [
            new EvaluationValueEvidence(this.nodeValue(current), []),
            new EvaluationValueEvidence(new EvaluationNumberValue(index), []),
            frame.thisValue,
          ], frame.moduleKey, frame.depth + 1, args[1] == null ? null : new EvaluationValueEvidence(args[1], []));
        }
        return staticInvocationValue(EvaluationUndefined);
      }
      return domThrow('TypeError', 'Illegal DOM collection invocation.');
    }
    if (reference.kind !== 'node') return domThrow('TypeError', 'Illegal DOM invocation.');
    const occurrence = reference.occurrence;
    if (member === 'cloneNode') {
      return this.invokeNodeCopy(occurrence, args[0], this.execution.forest.ownerDocumentFor(occurrence), member, frame, host);
    }
    if (member === 'appendChild' || member === 'insertBefore' || member === 'replaceChild') {
      return this.invokeNodePlacement(occurrence, member, args, frame, host);
    }
    if (member === 'hasChildNodes') return staticInvocationValue(new EvaluationBooleanValue(occurrence.readChildren().length > 0));
    if (member === 'contains') {
      if (args.length === 0) return domThrow('TypeError', 'contains requires a node.');
      if (args[0]!.kind === EvaluationValueKind.Null) return staticInvocationValue(new EvaluationBooleanValue(false));
      const candidate = this.references.read(args[0]!);
      if (candidate?.kind === 'document') return staticInvocationValue(new EvaluationBooleanValue(false));
      if (candidate?.kind !== 'node') return domThrow('TypeError', 'contains requires a node.');
      let ancestor: TemplateCompilerNodeOccurrence | null = candidate.occurrence;
      while (ancestor != null) {
        if (ancestor === occurrence) return staticInvocationValue(new EvaluationBooleanValue(true));
        ancestor = ancestor.parentEdgeKind === TemplateCompilerOccurrenceEdgeKind.Child ? ancestor.parent : null;
      }
      return staticInvocationValue(new EvaluationBooleanValue(false));
    }
    if (member === 'removeChild' || member === 'remove') {
      const candidate = member === 'remove' ? reference : args[0] == null ? null : this.references.read(args[0]);
      if (candidate?.kind === 'document') return domThrow('NotFoundError', 'The document is not a child of this node.');
      if (candidate?.kind !== 'node') return domThrow('TypeError', 'removeChild requires a node.');
      const child = candidate.occurrence;
      if (member === 'removeChild' && (child.parent !== occurrence || child.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Child)) {
        return domThrow('NotFoundError', 'The node to remove is not a child of this node.');
      }
      if (child === this.rootElement) return staticInvocationValue(this.outside(member, frame.node, frame.moduleKey, host));
      if (child.parent == null) return staticInvocationValue(EvaluationUndefined);
      if (this.hasNativeResourceTreeEffect(child, null)) {
        return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'native-resource-effects'));
      }
      if (this.hasNativeControlTreeState(child)) {
        return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'native-control-state'));
      }
      this.execution.detachProcessContentNode(this.attempt, child);
      return staticInvocationValue(member === 'remove' ? EvaluationUndefined : this.nodeValue(child));
    }
    if (!(occurrence instanceof TemplateCompilerElementOccurrence)) return domThrow('TypeError', 'Illegal Element invocation.');
    const attributeResult = this.invokeAttributeMethod(occurrence, member, args, frame, host);
    if (attributeResult != null) return attributeResult;
    if (args.length < 1) return domThrow('TypeError', `${member} requires an argument.`);
    const argument = domPrimitiveString(args[0]!);
    if (argument == null) return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'runtime-dependent-input'));
    switch (member) {
      case 'getElementsByTagName': return staticInvocationValue(this.referenceValue(new CompilerDomCollectionReference(false, () =>
        snapshotTemplateCompilerDescendantElements(occurrence, (candidate) => argument === '*'
          || (candidate.namespace === HtmlNamespaceKind.Html ? candidate.tagName === asciiLower(argument) : candidate.tagName === argument)),
      )));
      case 'getElementsByClassName': {
        const tokens = argument.split(/[\t\n\f\r ]+/).filter(Boolean);
        return staticInvocationValue(this.referenceValue(new CompilerDomCollectionReference(false, () =>
          tokens.length === 0 ? [] : snapshotTemplateCompilerDescendantElements(occurrence, (candidate) => {
            const classes = this.reflectedAttributeValue(candidate, 'class').split(/[\t\n\f\r ]+/);
            return tokens.every((token) => classes.includes(token));
          }),
        )));
      }
      default: return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host));
    }
  }

  private invokeDocumentFactory(
    reference: CompilerDomOpaqueReference,
    member: string,
    args: readonly EvaluationValue[],
    frame: StaticInvocationFrame,
    host: StaticIntrinsicEvaluationHost,
  ): StaticInvocationDispatch {
    const document = reference === this.document ? 'platform' : 'template-contents';
    if (member === 'importNode') {
      if (args.length === 0) return domThrow('TypeError', 'importNode requires a node.');
      const source = this.references.read(args[0]!);
      if (source?.kind === 'document') return domThrow('NotSupportedError', 'A document cannot be imported.');
      if (source?.kind !== 'node') return domThrow('TypeError', 'importNode requires a node.');
      // Newer browsers accept an options dictionary here; it is not Boolean(object), unlike cloneNode.
      if (args[1] != null && domPrimitiveString(args[1]) == null) {
        return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'dom-import-options'));
      }
      return this.invokeNodeCopy(source.occurrence, args[1], document, member, frame, host);
    }
    const expose = (node: TemplateCompilerNodeOccurrence): StaticInvocationDispatch => {
      this.ownedNodes.add(node);
      if (node instanceof TemplateCompilerElementOccurrence && node.templateContent != null) {
        this.ownedNodes.add(node.templateContent);
      }
      return staticInvocationValue(this.nodeValue(node));
    };
    if (member === 'createDocumentFragment') {
      return expose(this.execution.createProcessContentFragment(this.attempt, document));
    }
    const namespaced = member === 'createElementNS';
    if (args.length < (namespaced ? 2 : 1)) return domThrow('TypeError', `${member} is missing a required argument.`);
    const text = domPrimitiveString(args[namespaced ? 1 : 0]!);
    if (text == null) return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'runtime-dependent-input'));
    if (member === 'createTextNode') return expose(this.execution.createProcessContentText(this.attempt, text, document));
    if (member === 'createComment') return expose(this.execution.createProcessContentComment(this.attempt, text, document));
    const option = args[namespaced ? 2 : 1];
    if (option != null && option.kind !== EvaluationValueKind.Undefined && option.kind !== EvaluationValueKind.Null) {
      return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'dom-creation-options'));
    }
    let namespaceUri = 'http://www.w3.org/1999/xhtml';
    let namespace = HtmlNamespaceKind.Html;
    let name = asciiLower(text);
    const issue = compilerDomElementNameIssue(text);
    if (issue != null) return issue === 'dom-name-compatibility'
      ? staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, issue))
      : domThrow(issue, 'The element name is invalid.');
    if (namespaced) {
      const nsValue = args[0]!;
      const ns = nsValue.kind === EvaluationValueKind.Null || nsValue.kind === EvaluationValueKind.Undefined
        ? '' : domPrimitiveString(nsValue);
      if (ns == null) return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'runtime-dependent-input'));
      // The common QName subset shares XML namespace constraints with attributes; newer names remain explicit.
      const descriptor = compilerDomNamespacedAttributeName(ns === '' ? null : ns, text);
      if (typeof descriptor === 'string') return descriptor === 'dom-name-compatibility'
        ? staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, descriptor))
        : domThrow(descriptor, 'The element name and namespace are not valid together.');
      if (descriptor.prefix != null) return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'dom-element-prefix'));
      namespaceUri = ns;
      namespace = ns === 'http://www.w3.org/1999/xhtml' ? HtmlNamespaceKind.Html
        : ns === 'http://www.w3.org/2000/svg' ? HtmlNamespaceKind.Svg
        : ns === 'http://www.w3.org/1998/Math/MathML' ? HtmlNamespaceKind.Math : HtmlNamespaceKind.Unknown;
      if (namespace === HtmlNamespaceKind.Unknown) {
        return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'dom-element-namespace'));
      }
      name = descriptor.name;
      if (namespace === HtmlNamespaceKind.Html && /[A-Z]/u.test(name)) {
        return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'dom-html-name-case'));
      }
    }
    if (namespace === HtmlNamespaceKind.Html && document === 'platform' && name.includes('-')) {
      return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'native-custom-element-construction'));
    }
    return expose(this.execution.createProcessContentElement(this.attempt, name, namespace, namespaceUri, null, document));
  }

  private invokeNodeCopy(
    source: TemplateCompilerNodeOccurrence,
    deepValue: EvaluationValue | undefined,
    document: TemplateContentOwnerDocument,
    member: string,
    frame: StaticInvocationFrame,
    host: StaticIntrinsicEvaluationHost,
  ): StaticInvocationDispatch {
    const deep = deepValue == null ? false : readEvaluationTruthiness(deepValue);
    if (deep == null) return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'runtime-dependent-input'));
    const pending = [{ node: source, document }];
    while (pending.length > 0) {
      const current = pending.pop()!;
      if (current.node instanceof TemplateCompilerDoctypeOccurrence) {
        return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'dom-copy-node-kind'));
      }
      if (current.node instanceof TemplateCompilerElementOccurrence) {
        const element = current.node;
        // Copying does not mutate the original: reactions depend on the destination, not the source document.
        if (current.document === 'platform') {
          if (element.namespace === HtmlNamespaceKind.Html && (element.tagName.includes('-') || element.customElementIs != null)) {
            return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'native-custom-element-construction'));
          }
          if (this.isNativeResourceElement(element)) {
            return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'native-resource-effects'));
          }
        }
        if (this.isNativeRadio(element)) {
          return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'native-control-state'));
        }
        if (deep && element.templateContent != null) {
          if (element.readChildren().length > 0) {
            return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'template-element-children'));
          }
          pending.push({ node: element.templateContent, document: 'template-contents' });
        }
      }
      if (deep) for (const child of current.node.readChildren()) pending.push({ node: child, document: current.document });
    }
    const copy = this.execution.cloneProcessContentNode(this.attempt, source, deep, document);
    const owned = [copy];
    while (owned.length > 0) {
      const node = owned.pop()!;
      this.ownedNodes.add(node);
      owned.push(...node.readChildren());
      if (node instanceof TemplateCompilerElementOccurrence && node.templateContent != null) owned.push(node.templateContent);
    }
    return staticInvocationValue(this.nodeValue(copy));
  }

  private invokeNodePlacement(
    parent: TemplateCompilerNodeOccurrence,
    member: 'appendChild' | 'insertBefore' | 'replaceChild',
    args: readonly EvaluationValue[],
    frame: StaticInvocationFrame,
    host: StaticIntrinsicEvaluationHost,
  ): StaticInvocationDispatch {
    const replacing = member === 'replaceChild';
    if (args.length < (member === 'appendChild' ? 1 : 2)) return domThrow('TypeError', `${member} is missing a required node.`);
    const input = this.references.read(args[0]!);
    if (input?.kind !== 'node' && input?.kind !== 'document') return domThrow('TypeError', `${member} requires a node.`);
    const referenceValue = args[1];
    const nullableReference = !replacing && (referenceValue == null
      || referenceValue.kind === EvaluationValueKind.Null || referenceValue.kind === EvaluationValueKind.Undefined);
    const reference = member === 'appendChild' || nullableReference ? null : this.references.read(referenceValue!);
    if (member !== 'appendChild' && !nullableReference && reference?.kind !== 'node' && reference?.kind !== 'document') {
      return domThrow('TypeError', `${member} requires a ${replacing ? 'child' : 'reference'} node.`);
    }
    if (!isParent(parent)) return domThrow('HierarchyRequestError', 'This node cannot contain children.');
    // DOM validates ancestry before checking the reference child's membership, including template-content hosts.
    if (input.kind === 'node') {
      for (let ancestor: TemplateCompilerNodeOccurrence | null = parent; ancestor != null; ancestor = ancestor.parent) {
        if (ancestor === input.occurrence) return domThrow('HierarchyRequestError', 'A node cannot contain its own ancestor.');
      }
    }
    const child = reference?.kind === 'node' ? reference.occurrence : null;
    if (reference != null && (child == null || child.parent !== parent || child.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Child)) {
      return domThrow('NotFoundError', 'The reference node is not a child of this parent.');
    }
    if (input.kind !== 'node' || input.occurrence instanceof TemplateCompilerDoctypeOccurrence) {
      return domThrow('HierarchyRequestError', 'This node cannot be inserted into an element or fragment.');
    }
    const node = input.occurrence;
    if (node === this.rootElement) return staticInvocationValue(this.outside(member, frame.node, frame.moduleKey, host));
    if (parent instanceof TemplateCompilerElementOccurrence && parent.templateContent != null) {
      // Ordinary children of <template> are distinct from .content; their compiler/emitter path is not admitted yet.
      return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'template-element-children'));
    }
    const siblings = parent.readChildren();
    let before = replacing ? siblings[siblings.indexOf(child!) + 1] ?? null : child;
    if (before === node) before = siblings[siblings.indexOf(node) + 1] ?? null;
    // Insertion drains a fragment's children; its own template-content ownership and identity do not move.
    const inputs = node instanceof TemplateCompilerFragmentOccurrence ? [...node.readChildren()] : [node];
    if (replacing && node === child) return staticInvocationValue(this.nodeValue(child));
    if (inputs.some(inputNode => this.hasNativeResourceTreeEffect(inputNode, parent))
      || replacing && this.hasNativeResourceTreeEffect(child!, null)) {
      return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'native-resource-effects'));
    }
    if (inputs.some(inputNode => this.hasNativeControlTreeState(inputNode))
      || replacing && this.hasNativeControlTreeState(child!)) {
      return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'native-control-state'));
    }
    if (replacing) this.execution.detachProcessContentNode(this.attempt, child!);
    for (const inputNode of inputs) {
      const currentChildren = parent.readChildren();
      let ordinal = before == null ? currentChildren.length : currentChildren.indexOf(before);
      if (inputNode.parent === parent && inputNode.parentEdgeKind === TemplateCompilerOccurrenceEdgeKind.Child
        && currentChildren.indexOf(inputNode) < ordinal) ordinal--;
      this.execution.placeProcessContentNode(this.attempt, inputNode, parent, ordinal);
    }
    return staticInvocationValue(this.nodeValue(replacing ? child! : node));
  }

  private invokeAttributeMethod(
    element: TemplateCompilerElementOccurrence,
    member: string,
    args: readonly EvaluationValue[],
    frame: StaticInvocationFrame,
    host: StaticIntrinsicEvaluationHost,
  ): StaticInvocationDispatch | null {
    if (member === 'hasAttributes') return staticInvocationValue(new EvaluationBooleanValue(element.readAttributes().length > 0));
    if (member === 'getAttributeNames') {
      const names = stringArray(element.readAttributes().map(attributeName));
      this.evaluationGraph?.retainProduced(names);
      return staticInvocationValue(names);
    }
    const namespaced = ['getAttributeNS', 'hasAttributeNS', 'setAttributeNS', 'removeAttributeNS'].includes(member);
    if (!namespaced && !['getAttribute', 'hasAttribute', 'setAttribute', 'removeAttribute', 'toggleAttribute'].includes(member)) return null;
    const setter = member === 'setAttribute' || member === 'setAttributeNS';
    const nameIndex = namespaced ? 1 : 0;
    if (args.length < nameIndex + (setter ? 2 : 1)) return domThrow('TypeError', `${member} is missing a required argument.`);
    const nameValue = domPrimitiveString(args[nameIndex]!);
    const value = setter ? domPrimitiveString(args[nameIndex + 1]!) : '';
    const nsValue = namespaced ? args[0]! : null;
    const nsString = nsValue == null || nsValue.kind === EvaluationValueKind.Null || nsValue.kind === EvaluationValueKind.Undefined
      ? '' : domPrimitiveString(nsValue);
    if (nameValue == null || value == null || nsString == null) {
      return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'runtime-dependent-input'));
    }
    const namespaceUri = nsString === '' ? null : nsString;
    if (namespaced) {
      if (setter) {
        const descriptor = compilerDomNamespacedAttributeName(namespaceUri, nameValue);
        if (typeof descriptor === 'string') return descriptor === 'dom-name-compatibility'
          ? staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, descriptor))
          : domThrow(descriptor, 'The attribute name and namespace are not valid together.');
        return staticInvocationValue(this.setAttributeDescriptor(element, descriptor, value, member, frame.node, frame.moduleKey, host));
      }
      const attribute = this.namespacedAttribute(element, namespaceUri, nameValue);
      if (member === 'getAttributeNS') return staticInvocationValue(attribute == null ? new EvaluationNullValue()
        : new EvaluationStringValue(this.execution.readAttributeValue(this.attempt, attribute)));
      if (member === 'hasAttributeNS') return staticInvocationValue(new EvaluationBooleanValue(attribute != null));
      if (attribute != null && this.hasNativeResourceAttributeEffect(element)) {
        return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'native-resource-effects'));
      }
      if (attribute != null && this.hasNativeControlAttributeState(element, attribute, null)) {
        return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'native-control-state'));
      }
      if (attribute != null) this.execution.removeProcessContentAttribute(this.attempt, attribute);
      return staticInvocationValue(EvaluationUndefined);
    }
    if (setter || member === 'toggleAttribute') {
      const issue = compilerDomAttributeNameIssue(nameValue);
      if (issue != null) return issue === 'dom-name-compatibility'
        ? staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, issue))
        : domThrow(issue, 'The attribute name is invalid.');
    }
    const name = element.namespace === HtmlNamespaceKind.Html ? asciiLower(nameValue) : nameValue;
    const attribute = this.attribute(element, name);
    if (member === 'getAttribute') return staticInvocationValue(attribute == null ? new EvaluationNullValue()
      : new EvaluationStringValue(this.execution.readAttributeValue(this.attempt, attribute)));
    if (member === 'hasAttribute') return staticInvocationValue(new EvaluationBooleanValue(attribute != null));
    if (member === 'setAttribute') {
      // Non-namespace setters target the first qualified-name match, even if that attribute has a namespace.
      if (attribute != null) {
        if (this.hasNativeResourceAttributeEffect(element, attribute, value)) {
          return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'native-resource-effects'));
        }
        if (this.hasNativeControlAttributeState(element, attribute, value)) {
          return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'native-control-state'));
        }
        this.execution.rewriteAttributeValue(this.attempt, attribute, value);
      }
      else return staticInvocationValue(this.setAttributeDescriptor(
        element, { name, namespaceUri: null, prefix: null }, value, member, frame.node, frame.moduleKey, host,
      ));
      return staticInvocationValue(EvaluationUndefined);
    }
    if (member === 'removeAttribute') {
      if (attribute != null && this.hasNativeResourceAttributeEffect(element)) {
        return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'native-resource-effects'));
      }
      if (attribute != null && this.hasNativeControlAttributeState(element, attribute, null)) {
        return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'native-control-state'));
      }
      if (attribute != null) this.execution.removeProcessContentAttribute(this.attempt, attribute);
      return staticInvocationValue(EvaluationUndefined);
    }
    const force = args[1] == null || args[1].kind === EvaluationValueKind.Undefined ? undefined : readEvaluationTruthiness(args[1]);
    if (force === null) return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'runtime-dependent-input'));
    const present = force ?? (attribute == null);
    if (present && attribute == null) {
      const result = this.setAttributeDescriptor(element, { name, namespaceUri: null, prefix: null }, '', member, frame.node, frame.moduleKey, host);
      if (this.refusal != null) return staticInvocationValue(result);
    } else if (!present && attribute != null) {
      if (this.hasNativeResourceAttributeEffect(element)) {
        return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'native-resource-effects'));
      }
      if (this.hasNativeControlAttributeState(element, attribute, null)) {
        return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'native-control-state'));
      }
      this.execution.removeProcessContentAttribute(this.attempt, attribute);
    }
    return staticInvocationValue(new EvaluationBooleanValue(present));
  }

  /** DOMTokenList operations use the null-namespace class attribute as their sole mutable authority. */
  private invokeTokenList(
    reference: CompilerDomTokenListReference,
    member: string,
    args: readonly EvaluationValue[],
    frame: StaticInvocationFrame,
    host: StaticIntrinsicEvaluationHost,
  ): StaticInvocationDispatch {
    if (member === 'toString') return staticInvocationValue(new EvaluationStringValue(this.reflectedAttributeValue(reference.element, 'class')));
    if (member === 'values' || member === 'entries' || member === 'keys') {
      let index = 0;
      let done = false;
      return staticInvocationValue(this.referenceValue(new CompilerDomTokenIteratorReference({ next: () => {
        const token = done ? null : this.classTokens(reference)[index];
        if (token == null) {
          done = true;
          return new EvaluationIteratorStep(EvaluationIteratorStepKind.Done);
        }
        let value: EvaluationValue = member === 'keys' ? new EvaluationNumberValue(index) : new EvaluationStringValue(token);
        if (member === 'entries') {
          value = new EvaluationArrayValue([
            new EvaluationArrayElement(new EvaluationNumberValue(index), null, [], 0),
            new EvaluationArrayElement(new EvaluationStringValue(token), null, [], 1),
          ]);
          this.evaluationGraph?.retainProduced(value);
        }
        return new EvaluationIteratorStep(EvaluationIteratorStepKind.Value, new EvaluationArrayElement(value, null, [], index++));
      } })));
    }
    if (member === 'item') {
      if (args.length === 0) return domThrow('TypeError', 'item requires an index.');
      const value = args[0]!;
      if (value.kind === EvaluationValueKind.BigInt) return domThrow('TypeError', 'A BigInt cannot be converted to a DOMTokenList index.');
      if (value.kind !== EvaluationValueKind.String && value.kind !== EvaluationValueKind.Number
        && value.kind !== EvaluationValueKind.Boolean && value.kind !== EvaluationValueKind.Null
        && value.kind !== EvaluationValueKind.Undefined) {
        return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'runtime-dependent-input'));
      }
      const token = this.classTokens(reference)[Number(readEvaluationPrimitive(value)) >>> 0];
      return staticInvocationValue(token == null ? new EvaluationNullValue() : new EvaluationStringValue(token));
    }
    if (member === 'forEach' && ts.isCallExpression(frame.node)) {
      const callback = args[0];
      if (callback?.kind !== EvaluationValueKind.Function) return domThrow('TypeError', 'forEach requires a callback.');
      const length = this.classTokens(reference).length;
      if (length > host.guardrails.maxIntrinsicCallbackEvaluations) {
        return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'evaluation-limit'));
      }
      for (let index = 0; index < length; index++) {
        const token = this.classTokens(reference)[index];
        if (token == null) continue;
        host.evaluateFunctionWithArguments(callback, frame.node, [
          new EvaluationValueEvidence(new EvaluationStringValue(token), []),
          new EvaluationValueEvidence(new EvaluationNumberValue(index), []),
          frame.thisValue!,
        ], frame.moduleKey, frame.depth + 1, args[1] == null ? null : new EvaluationValueEvidence(args[1], []));
      }
      return staticInvocationValue(EvaluationUndefined);
    }
    const variadic = member === 'add' || member === 'remove';
    const arity = variadic ? args.length : member === 'replace' ? 2 : 1;
    if (args.length < arity) return domThrow('TypeError', `${member} is missing a required argument.`);
    const argumentsTokens: string[] = [];
    for (let index = 0; index < arity; index++) {
      const token = domPrimitiveString(args[index]!);
      if (token == null) return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'runtime-dependent-input'));
      argumentsTokens.push(token);
    }
    const tokens = this.classTokens(reference);
    if (member === 'contains') return staticInvocationValue(new EvaluationBooleanValue(tokens.includes(argumentsTokens[0]!)));
    if (member === 'supports') return domThrow('TypeError', 'classList does not define supported tokens.');
    // replace validates emptiness across both arguments before whitespace; add/remove validate each argument in order.
    if (member === 'replace' && argumentsTokens.some(token => token.length === 0)) return domThrow('SyntaxError', 'Class tokens cannot be empty.');
    for (const token of argumentsTokens) {
      if (token.length === 0) return domThrow('SyntaxError', 'Class tokens cannot be empty.');
      if (/[\t\n\f\r ]/.test(token)) return domThrow('InvalidCharacterError', 'Class tokens cannot contain ASCII whitespace.');
    }
    if (variadic) {
      for (const token of argumentsTokens) {
        const index = tokens.indexOf(token);
        if (member === 'add' && index < 0) tokens.push(token);
        else if (member === 'remove' && index >= 0) tokens.splice(index, 1);
      }
      return staticInvocationValue(this.writeClassTokens(reference, tokens, member, frame, host));
    }
    const index = tokens.indexOf(argumentsTokens[0]!);
    if (member === 'replace') {
      if (index < 0) return staticInvocationValue(new EvaluationBooleanValue(false));
      const replacement = argumentsTokens[1]!;
      const existingIndex = tokens.indexOf(replacement);
      if (existingIndex < 0) tokens[index] = replacement;
      else if (existingIndex > index) { tokens[index] = replacement; tokens.splice(existingIndex, 1); }
      else if (existingIndex < index) tokens.splice(index, 1);
      const result = this.writeClassTokens(reference, tokens, member, frame, host);
      return staticInvocationValue(this.refusal == null ? new EvaluationBooleanValue(true) : result);
    }
    if (member === 'toggle') {
      const force = args[1] == null || args[1].kind === EvaluationValueKind.Undefined ? undefined : readEvaluationTruthiness(args[1]);
      if (force === null) return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'runtime-dependent-input'));
      const present = force ?? (index < 0);
      if (present === (index >= 0)) return staticInvocationValue(new EvaluationBooleanValue(present));
      if (present) tokens.push(argumentsTokens[0]!);
      else tokens.splice(index, 1);
      const result = this.writeClassTokens(reference, tokens, member, frame, host);
      return staticInvocationValue(this.refusal == null ? new EvaluationBooleanValue(present) : result);
    }
    return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host));
  }

  private classTokens(reference: CompilerDomTokenListReference): string[] {
    return [...new Set(this.reflectedAttributeValue(reference.element, 'class').split(/[\t\n\f\r ]+/).filter(Boolean))];
  }

  private writeClassTokens(
    reference: CompilerDomTokenListReference,
    tokens: readonly string[],
    member: string,
    frame: StaticInvocationFrame,
    host: StaticIntrinsicEvaluationHost,
  ): EvaluationValue {
    if (tokens.length === 0 && this.namespacedAttribute(reference.element, null, 'class') == null) return EvaluationUndefined;
    return this.setAttributeDescriptor(
      reference.element, { name: 'class', namespaceUri: null, prefix: null }, tokens.join(' '),
      member, frame.node, frame.moduleKey, host,
    );
  }

  private setReflectedAttribute(
    element: TemplateCompilerElementOccurrence,
    name: string,
    value: EvaluationValue,
    member: string,
    node: ts.Node,
    moduleKey: string,
    host: StaticIntrinsicEvaluationHost,
  ): EvaluationValue {
    const text = domPrimitiveString(value);
    if (text == null) return this.unsupported(member, node, moduleKey, host, 'runtime-dependent-input');
    return this.setAttributeDescriptor(element, { name, namespaceUri: null, prefix: null }, text, member, node, moduleKey, host);
  }

  private setAttributeDescriptor(
    element: TemplateCompilerElementOccurrence,
    descriptor: CompilerDomAttributeName,
    value: string,
    member: string,
    node: ts.Node,
    moduleKey: string,
    host: StaticIntrinsicEvaluationHost,
  ): EvaluationValue {
    const existing = this.namespacedAttribute(element, descriptor.namespaceUri, descriptor.name);
    const qualifiedName = descriptor.prefix == null ? descriptor.name : `${descriptor.prefix}:${descriptor.name}`;
    if (existing == null && this.attribute(element, qualifiedName) != null) {
      return this.unsupported(member, node, moduleKey, host, 'duplicate-qualified-attribute-lowering');
    }
    if (this.hasNativeResourceAttributeEffect(element, descriptor, value)) {
      return this.unsupported(member, node, moduleKey, host, 'native-resource-effects');
    }
    if (this.hasNativeControlAttributeState(element, descriptor, value)) {
      return this.unsupported(member, node, moduleKey, host, 'native-control-state');
    }
    this.execution.setProcessContentAttribute(this.attempt, element, descriptor, value);
    return EvaluationUndefined;
  }

  private isNativeRadio(element: TemplateCompilerElementOccurrence): boolean {
    return element.namespace === HtmlNamespaceKind.Html && element.tagName === 'input'
      && asciiLower(this.reflectedAttributeValue(element, 'type')) === 'radio';
  }

  /** Native input state can survive cloning but is not determined by final attributes alone. */
  private hasNativeControlAttributeState(
    element: TemplateCompilerElementOccurrence,
    attribute: Pick<CompilerDomAttributeName, 'name' | 'namespaceUri'>,
    value: string | null,
  ): boolean {
    if (element.namespace !== HtmlNamespaceKind.Html || element.tagName !== 'input') return false;
    if (this.isNativeRadio(element)) return true;
    return attribute.namespaceUri == null && attribute.name === 'type'
      && (asciiLower(value ?? '') || 'text') !== (asciiLower(this.reflectedAttributeValue(element, 'type')) || 'text');
  }

  private hasNativeControlTreeState(node: TemplateCompilerNodeOccurrence): boolean {
    const pending = [node];
    while (pending.length > 0) {
      const current = pending.pop()!;
      if (current instanceof TemplateCompilerElementOccurrence && this.isNativeRadio(current)) return true;
      // Ordinary movement does not reparent a nested template's inert content tree.
      pending.push(...current.readChildren());
    }
    return false;
  }

  /** Conservative owned-effect boundary, not a model of resource fetching or a claim to exhaust browser effects. */
  private hasNativeResourceAttributeEffect(
    element: TemplateCompilerElementOccurrence,
    incoming?: Pick<CompilerDomAttributeName, 'name' | 'namespaceUri'>,
    value?: string,
  ): boolean {
    return this.execution.forest.ownerDocumentFor(element) === 'platform'
      && this.isNativeResourceElement(element, incoming, value);
  }

  private isNativeResourceElement(
    element: TemplateCompilerElementOccurrence,
    incoming?: Pick<CompilerDomAttributeName, 'name' | 'namespaceUri'>,
    value?: string,
  ): boolean {
    if (element.namespace === HtmlNamespaceKind.Html) {
      switch (element.tagName) {
        case 'img': case 'audio': case 'video': case 'source': case 'track':
        case 'object': case 'embed': case 'iframe': case 'link':
          return true;
        case 'script': return !element.parserInertScript;
        case 'input':
          return this.namespacedAttribute(element, null, 'src') != null
            || asciiLower(this.reflectedAttributeValue(element, 'type')) === 'image'
            || incoming?.namespaceUri === null && (incoming.name === 'src'
              || incoming.name === 'type' && asciiLower(value ?? '') === 'image');
      }
    }
    return element.namespace === HtmlNamespaceKind.Svg
      && (element.tagName === 'image' || element.tagName === 'use' || element.tagName === 'feImage');
  }

  private hasNativeResourceTreeEffect(
    node: TemplateCompilerNodeOccurrence,
    destination: TemplateCompilerElementOccurrence | TemplateCompilerFragmentOccurrence | null,
  ): boolean {
    const forest = this.execution.forest;
    const platformDestination = destination != null && forest.ownerDocumentFor(destination) === 'platform';
    if (destination instanceof TemplateCompilerElementOccurrence && this.hasNativeResourceAttributeEffect(destination)
      || node.parent instanceof TemplateCompilerElementOccurrence && this.hasNativeResourceAttributeEffect(node.parent)) return true;
    const pending = [node];
    while (pending.length > 0) {
      const current = pending.pop()!;
      if (current instanceof TemplateCompilerElementOccurrence
        && (platformDestination || forest.ownerDocumentFor(current) === 'platform')
        && this.isNativeResourceElement(current)) return true;
      // Moving a template does not insert its inert .content; an explicit content insertion drains its children above.
      pending.push(...current.readChildren());
    }
    return false;
  }

  private attribute(element: TemplateCompilerElementOccurrence, name: string): TemplateCompilerAttributeOccurrence | null {
    return element.readAttributes().find((attribute) => attributeName(attribute) === name) ?? null;
  }

  private namespacedAttribute(
    element: TemplateCompilerElementOccurrence,
    namespaceUri: string | null,
    name: string,
  ): TemplateCompilerAttributeOccurrence | null {
    return element.readAttributes().find((attribute) => attribute.namespaceUri === namespaceUri && attribute.name === name) ?? null;
  }

  private reflectedAttributeValue(element: TemplateCompilerElementOccurrence, name: string): string {
    const attribute = this.namespacedAttribute(element, null, name);
    return attribute == null ? '' : this.execution.readAttributeValue(this.attempt, attribute);
  }

  private collection(
    reference: CompilerDomNodeReference,
    member: string,
    nodeList: boolean,
    read: () => readonly TemplateCompilerNodeOccurrence[],
  ): EvaluationValue {
    let collection = reference.collections.get(member);
    if (collection == null) {
      collection = new CompilerDomCollectionReference(nodeList, read);
      reference.collections.set(member, collection);
    }
    return this.referenceValue(collection);
  }

  private nodeValue(node: TemplateCompilerNodeOccurrence): EvaluationValue {
    if (!this.ownedNodes.has(node)) throw new Error('Compiler DOM reference escaped its admitted occurrence subtree.');
    let reference = this.nodeReferences.get(node);
    if (reference == null) {
      reference = new CompilerDomNodeReference(node);
      this.nodeReferences.set(node, reference);
    }
    return this.referenceValue(reference);
  }

  private nullableNode(node: TemplateCompilerNodeOccurrence | null): EvaluationValue {
    return node == null ? new EvaluationNullValue() : this.nodeValue(node);
  }

  private referenceValue(reference: CompilerDomReference): EvaluationObjectValue {
    let value = this.values.get(reference);
    if (value == null) {
      // Unknown own-property membership keeps generic enumeration from treating a DOM reference as an empty object.
      value = new EvaluationObjectValue(new Map(), true);
      this.values.set(reference, value);
      this.references.retain(value, reference);
    }
    return value;
  }

  private method(member: string): EvaluationValue {
    let value = this.methods.get(member);
    if (value == null) {
      value = new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, `compiler-dom.${member}`);
      this.methods.set(member, value);
      this.methodNames.set(value, member);
    }
    return value;
  }

  private outside(member: string, node: ts.Node, moduleKey: string, host: StaticIntrinsicEvaluationHost): EvaluationValue {
    return this.unsupported(member, node, moduleKey, host, 'outside-compiler-root');
  }

  private unsupported(
    member: string,
    node: ts.Node,
    moduleKey: string,
    host: StaticIntrinsicEvaluationHost,
    kind = 'unsupported-dom-member',
  ): EvaluationValue {
    this.refusal ??= {
      kind, member, node,
      summary: `Compiler DOM operation '${member}' is not admitted (${kind}).`,
    };
    return host.unknown(this.refusal.summary, node, moduleKey, EvaluationOpenSeamKind.DynamicCall);
  }
}

function isParent(node: TemplateCompilerNodeOccurrence): node is TemplateCompilerElementOccurrence | TemplateCompilerFragmentOccurrence {
  return node instanceof TemplateCompilerElementOccurrence || node instanceof TemplateCompilerFragmentOccurrence;
}

function childElements(node: TemplateCompilerNodeOccurrence): readonly TemplateCompilerElementOccurrence[] {
  return node.readChildren().filter((child): child is TemplateCompilerElementOccurrence => child instanceof TemplateCompilerElementOccurrence);
}

function nodeType(node: TemplateCompilerNodeOccurrence): number {
  if (node instanceof TemplateCompilerElementOccurrence) return 1;
  if (node instanceof TemplateCompilerTextOccurrence) return 3;
  if (node instanceof TemplateCompilerCommentOccurrence) return 8;
  if (node instanceof TemplateCompilerDoctypeOccurrence) return 10;
  return 11;
}

function nodeName(node: TemplateCompilerNodeOccurrence): string {
  if (node instanceof TemplateCompilerElementOccurrence) return node.namespace === HtmlNamespaceKind.Html
    ? node.tagName.replace(/[a-z]/g, (character) => character.toUpperCase()) : node.tagName;
  if (node instanceof TemplateCompilerTextOccurrence) return '#text';
  if (node instanceof TemplateCompilerCommentOccurrence) return '#comment';
  if (node instanceof TemplateCompilerDoctypeOccurrence) return node.name;
  return '#document-fragment';
}

function textContent(node: TemplateCompilerNodeOccurrence): string {
  if (node instanceof TemplateCompilerTextOccurrence || node instanceof TemplateCompilerCommentOccurrence) return node.text;
  let text = '';
  for (const child of node.readChildren()) {
    if (!(child instanceof TemplateCompilerCommentOccurrence)) text += textContent(child);
  }
  return text;
}

function attributeName(attribute: TemplateCompilerAttributeOccurrence): string {
  return attribute.prefix == null ? attribute.name : `${attribute.prefix}:${attribute.name}`;
}

function asciiLower(value: string): string {
  return value.replace(/[A-Z]/g, (character) => character.toLowerCase());
}

function domPrimitiveString(value: EvaluationValue): string | null {
  switch (value.kind) {
    case EvaluationValueKind.String:
    case EvaluationValueKind.Number:
    case EvaluationValueKind.Boolean:
    case EvaluationValueKind.Null:
    case EvaluationValueKind.Undefined: return String(readEvaluationPrimitive(value));
    case EvaluationValueKind.BigInt: return BigInt(value.text.replace(/_/g, '').replace(/n$/, '')).toString();
    default: return null;
  }
}

function stringArray(values: readonly string[]): EvaluationArrayValue {
  return new EvaluationArrayValue(values.map((value, index) => new EvaluationArrayElement(new EvaluationStringValue(value), null, [], index)));
}

function domThrow(name: string, message: string): StaticInvocationHandled {
  return new StaticInvocationHandled(new ThrowEvaluationCompletion(new EvaluationObjectValue(new Map([
    ['name', new EvaluationObjectProperty('name', new EvaluationStringValue(name), null, EvaluationObjectPropertyState.Closed)],
    ['message', new EvaluationObjectProperty('message', new EvaluationUnknownValue(
      `${message} Exact exception message wording depends on the browser.`,
    ), null, EvaluationObjectPropertyState.Open)],
  ]), true)));
}
