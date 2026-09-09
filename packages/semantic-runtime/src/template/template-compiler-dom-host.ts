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
import { EvaluationIteratorStep, EvaluationIteratorStepKind } from '../evaluation/iterator-projection.js';
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
  readEvaluationPrimitive,
  type EvaluationValue,
} from '../evaluation/values.js';
import { HtmlNamespaceKind } from './html-ir.js';
import type {
  TemplateCompilerExecutionSession,
  TemplateCompilerPendingOperationAttempt,
} from './template-compiler-execution.js';
import { snapshotTemplateCompilerDescendantElements } from './template-compiler-dom-query.js';
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
  constructor(readonly occurrence: TemplateCompilerNodeOccurrence) {}
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

type CompilerDomReference = CompilerDomNodeReference | CompilerDomCollectionReference | CompilerDomOpaqueReference;

/**
 * Source-callable DOM operations over the existing compiler forest and pending operation overlay.
 *
 * This first executor admits traversal, existing attribute values, and descendant removal. Creation, reparenting,
 * markup writes, and metadata writes remain explicit refusals until generated sites enter ordinary compiler lowering.
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
          if (!(reference instanceof CompilerDomCollectionReference)) {
            return previous?.openIterator?.(source, node, moduleKey, host) ?? null;
          }
          let index = 0;
          let done = false;
          return {
            next: () => {
              const current = done ? null : reference.read()[index];
              if (current == null) {
                done = true;
                return new EvaluationIteratorStep(EvaluationIteratorStepKind.Done);
              }
              return new EvaluationIteratorStep(
                EvaluationIteratorStepKind.Value,
                new EvaluationArrayElement(this.nodeValue(current), null, [], index++),
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
      case 'ownerDocument': return this.referenceValue(this.document);
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
      case 'contains':
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
        case 'id': return new EvaluationStringValue(this.attributeValue(occurrence, 'id') ?? '');
        case 'className':
          if (occurrence.namespace !== HtmlNamespaceKind.Html) break;
          return new EvaluationStringValue(this.attributeValue(occurrence, 'class') ?? '');
        case 'slot': return new EvaluationStringValue(this.attributeValue(occurrence, 'slot') ?? '');
        case 'content':
          if (occurrence.templateContent != null) return this.nodeValue(occurrence.templateContent);
          break;
        case 'getAttribute':
        case 'hasAttribute':
        case 'getAttributeNames':
        case 'setAttribute':
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
    if (this.refusal == null && reference.kind === 'node' && reference.occurrence instanceof TemplateCompilerElementOccurrence) {
      const name = member === 'id' || member === 'slot' ? member
        : member === 'className' && reference.occurrence.namespace === HtmlNamespaceKind.Html ? 'class' : null;
      if (name != null) return this.setExistingAttribute(reference.occurrence, name, value, member, node, moduleKey, host);
    }
    return this.unsupported(member, node, moduleKey, host);
  }

  private invoke(frame: StaticInvocationFrame, member: string, host: StaticIntrinsicEvaluationHost): StaticInvocationDispatch {
    if (this.refusal != null) return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host));
    if (frame.kind !== StaticInvocationKind.Call || frame.thisValue == null) return domThrow('TypeError', 'Illegal DOM invocation.');
    const reference = this.references.read(frame.thisValue.value);
    const args = frame.argumentList.elements.map((entry) => entry.value);
    if (reference == null) return domThrow('TypeError', 'Illegal DOM invocation.');
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
      // A removed subtree remains inspectable, but further detached-tree mutation needs a wider site disposition.
      let ancestor: TemplateCompilerNodeOccurrence | null = child.parent;
      while (ancestor != null && ancestor !== this.rootElement) ancestor = ancestor.parent;
      if (ancestor == null) return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'detached-subtree-mutation'));
      this.execution.detachProcessContentNode(this.attempt, child);
      return staticInvocationValue(member === 'remove' ? EvaluationUndefined : this.nodeValue(child));
    }
    if (!(occurrence instanceof TemplateCompilerElementOccurrence)) return domThrow('TypeError', 'Illegal Element invocation.');
    if (member === 'getAttributeNames') {
      const names = stringArray(occurrence.readAttributes().map(attributeName));
      this.evaluationGraph?.retainProduced(names);
      return staticInvocationValue(names);
    }
    if (args.length < (member === 'setAttribute' ? 2 : 1)) return domThrow('TypeError', `${member} requires an argument.`);
    const argument = domPrimitiveString(args[0]!);
    if (argument == null) return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host, 'runtime-dependent-input'));
    const name = occurrence.namespace === HtmlNamespaceKind.Html ? asciiLower(argument) : argument;
    switch (member) {
      case 'getAttribute': {
        const value = this.attributeValue(occurrence, name);
        return staticInvocationValue(value == null ? new EvaluationNullValue() : new EvaluationStringValue(value));
      }
      case 'hasAttribute': return staticInvocationValue(new EvaluationBooleanValue(this.attribute(occurrence, name) != null));
      case 'setAttribute': return staticInvocationValue(this.setExistingAttribute(
        occurrence, name, args[1]!, member, frame.node, frame.moduleKey, host,
      ));
      case 'getElementsByTagName': return staticInvocationValue(this.referenceValue(new CompilerDomCollectionReference(false, () =>
        snapshotTemplateCompilerDescendantElements(occurrence, (candidate) => argument === '*'
          || (candidate.namespace === HtmlNamespaceKind.Html ? candidate.tagName === asciiLower(argument) : candidate.tagName === argument)),
      )));
      case 'getElementsByClassName': {
        const tokens = argument.split(/[\t\n\f\r ]+/).filter(Boolean);
        return staticInvocationValue(this.referenceValue(new CompilerDomCollectionReference(false, () =>
          tokens.length === 0 ? [] : snapshotTemplateCompilerDescendantElements(occurrence, (candidate) => {
            const classes = (this.attributeValue(candidate, 'class') ?? '').split(/[\t\n\f\r ]+/);
            return tokens.every((token) => classes.includes(token));
          }),
        )));
      }
      default: return staticInvocationValue(this.unsupported(member, frame.node, frame.moduleKey, host));
    }
  }

  private setExistingAttribute(
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
    const attribute = this.attribute(element, name);
    if (attribute == null) return this.unsupported(member, node, moduleKey, host, 'generated-attribute-lowering');
    this.execution.rewriteAttributeValue(this.attempt, attribute, text);
    return EvaluationUndefined;
  }

  private attribute(element: TemplateCompilerElementOccurrence, name: string): TemplateCompilerAttributeOccurrence | null {
    return element.readAttributes().find((attribute) => attributeName(attribute) === name) ?? null;
  }

  private attributeValue(element: TemplateCompilerElementOccurrence, name: string): string | null {
    const attribute = this.attribute(element, name);
    return attribute == null ? null : this.execution.readAttributeValue(this.attempt, attribute);
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
    case EvaluationValueKind.BigInt: return value.text.replace(/n$/, '');
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
