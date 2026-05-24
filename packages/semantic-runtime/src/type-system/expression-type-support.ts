import ts from 'typescript';
import type { BindingContextSlot, BindingScope } from '../configuration/scope.js';
import type { ExpressionAstNode } from '../expression/ast.js';
import type { AddressHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import {
  type CheckerTypeProjectionRequest,
  CheckerTypeMemberProjectionPolicy,
  type CheckerTypeProjector,
} from './checker-projector.js';
import {
  CheckerTypeShapeAccess,
  readCheckerTypeShape,
} from './checker-type-shape-access.js';
import {
  CheckerExpressionType,
  type CheckerExpressionTypeEvaluation,
  CheckerExpressionTypeEvaluationResultKind,
  CheckerExpressionTypeOpen,
  CheckerExpressionTypeOpenKind,
  CheckerExpressionTypeOpenSubject,
  type CheckerExpressionTypeOpenSubjectKind,
} from './expression-type-evaluation.js';
import {
  CheckerExpressionTypeSynthesizer,
  commonTypeReference,
} from './expression-type-synthesis.js';
import { TypeSystemHotDetails, TypeSystemProductDetails } from './product-details.js';
import { checkerTypeMemberSourceAddressHandle } from './checker-type-member-source.js';
import {
  CheckerTypeProjectionOrigin,
  checkerTypeMemberReachableIdentityHandle,
  checkerTypeReferenceWithSource,
  CheckerTypeReference,
  type CheckerTypeShape,
} from './type-shape.js';
import {
  checkerPrimitiveLiteralType,
  checkerPrimitiveType,
  type CheckerPrimitiveName,
} from './checker-primitive-types.js';

export type CheckerLookupCarrier = {
  readonly checker: ts.TypeChecker;
  readonly location: ts.Node | null;
};

export interface CheckerExpressionTypeProjectionOptions {
  /**
   * Controls how much member surface is materialized for this expression result.
   *
   * Scope construction often needs a carrier/reference for later type access, while cursor completions need eager
   * enumerable members. Keeping this explicit prevents a low-level evaluator query from silently choosing the wrong
   * memory/CPU trade-off for every consumer.
   */
  readonly memberProjection?: CheckerTypeMemberProjectionPolicy;
}

/**
 * Shared low-level result/projection vocabulary for Aurelia expression TypeChecker emulation.
 *
 * The evaluator and its projectors should agree on how a TypeChecker type becomes a product, how open results preserve
 * repairable subjects, and how synthetic unions are minted. Keep runtime AST control flow in the evaluator; keep these
 * substrate primitives here so adjacent expression projectors do not grow parallel type/open factories.
 */
export class CheckerExpressionTypeSupport {
  constructor(
    readonly store: KernelStore,
    readonly projector: CheckerTypeProjector,
    readonly typeAccess: CheckerTypeShapeAccess,
    readonly synthesis: CheckerExpressionTypeSynthesizer,
  ) {}

  typeShapeForReference(reference: CheckerTypeReference | null): CheckerTypeShape | null {
    return readCheckerTypeShape(this.store, reference);
  }

  findChecker(scope: BindingScope): ts.TypeChecker | null {
    return this.findCheckerCarrier(scope)?.checker ?? null;
  }

  findCheckerCarrier(scope: BindingScope): CheckerLookupCarrier | null {
    let current: BindingScope | null = scope;
    while (current != null) {
      const bindingChecker = this.checkerCarrierForReference(current.bindingContext.contextType);
      if (bindingChecker != null) {
        return bindingChecker;
      }
      const overrideChecker = this.checkerCarrierForReference(current.overrideContext.contextType);
      if (overrideChecker != null) {
        return overrideChecker;
      }
      for (const slot of [...current.overrideContext.slots, ...current.bindingContext.slots]) {
        const slotChecker = this.checkerCarrierForReference(slot.targetType);
        if (slotChecker != null) {
          return slotChecker;
        }
      }
      current = current.parent;
    }
    return null;
  }

  checkerCarrierForReference(reference: CheckerTypeReference | null): CheckerLookupCarrier | null {
    if (reference?.productHandle == null) {
      return null;
    }
    const carrier = this.typeShapeForReference(reference)?.carrier ?? null;
    if (carrier == null) {
      return null;
    }
    return {
      checker: carrier.checker,
      location: carrier.declarations[0] ?? null,
    };
  }

  ensureProjectedSlotType(
    slot: BindingContextSlot,
    reference: CheckerTypeReference,
    localKey: string,
  ): CheckerTypeReference {
    if (reference.productHandle != null) {
      return checkerTypeReferenceWithSource(reference, reference.sourceAddressHandle ?? slot.sourceAddressHandle);
    }

    const member = slot.targetProductHandle == null
      ? null
      : this.store.hotDetails.read(TypeSystemHotDetails.TypeMember, slot.targetProductHandle);
    if (member?.carrier?.valueType == null) {
      return reference;
    }

    const sourceNode = member.carrier.declarations[0] ?? null;
    const sourceAddressHandle = reference.sourceAddressHandle
      ?? slot.sourceAddressHandle
      ?? checkerTypeMemberSourceAddressHandle(this.store, member);
    const projected = this.projector.ensureProjection({
      localKey: `${localKey}:projected-type`,
      checker: member.carrier.checker,
      type: member.carrier.valueType,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceNode,
      sourceAddressHandle,
      ownerIdentityHandle: checkerTypeMemberReachableIdentityHandle(member),
      display: reference.display ?? member.valueType?.display ?? null,
      memberProjection: CheckerTypeMemberProjectionPolicy.Lazy,
    } satisfies CheckerTypeProjectionRequest).toReference();
    return checkerTypeReferenceWithSource(projected, sourceAddressHandle ?? projected.sourceAddressHandle);
  }

  resolveGlobalType(
    scope: BindingScope,
    name: string,
  ): { readonly checker: ts.TypeChecker; readonly type: ts.Type } | null {
    const carrier = this.findCheckerCarrier(scope);
    if (carrier == null) {
      return null;
    }
    const { checker, location } = carrier;

    switch (name) {
      case 'undefined':
        return { checker, type: checker.getUndefinedType() };
      case 'NaN':
      case 'Infinity':
        return { checker, type: checker.getNumberType() };
    }

    const scopedSymbol = location == null
      ? null
      : checker.getSymbolsInScope(location, ts.SymbolFlags.Value).find((symbol) => symbol.getName() === name) ?? null;
    const symbol = scopedSymbol ?? checker.resolveName(name, location ?? undefined, ts.SymbolFlags.Value, false);
    const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0] ?? null;
    if (symbol != null && declaration != null) {
      return {
        checker,
        type: checker.getTypeOfSymbolAtLocation(symbol, declaration),
      };
    }

    const globalThis = checker.resolveName('globalThis', location ?? undefined, ts.SymbolFlags.Value, false);
    const globalDeclaration = globalThis?.valueDeclaration ?? globalThis?.declarations?.[0] ?? location;
    if (globalThis != null && globalDeclaration != null) {
      const globalType = checker.getTypeOfSymbolAtLocation(globalThis, globalDeclaration);
      const property = checker.getPropertyOfType(globalType, name);
      const propertyDeclaration = property?.valueDeclaration ?? property?.declarations?.[0] ?? globalDeclaration;
      if (property != null && propertyDeclaration != null) {
        return {
          checker,
          type: checker.getTypeOfSymbolAtLocation(property, propertyDeclaration),
        };
      }
    }
    return null;
  }

  resolveReference(
    expression: ExpressionAstNode,
    reference: CheckerTypeReference,
    localKey: string,
    openKind: CheckerExpressionTypeOpenKind,
    openSummary: string,
    subject: CheckerExpressionTypeOpenSubject | null = null,
    sourceAddressHandle: AddressHandle | null = reference.sourceAddressHandle,
  ): CheckerExpressionTypeEvaluation {
    const sourceReference = checkerTypeReferenceWithSource(reference, sourceAddressHandle);
    if (sourceReference.productHandle == null) {
      return this.open(openKind, expression, openSummary, sourceReference, subject);
    }
    const typeShape = this.typeAccess.resolveReference(sourceReference);
    if (typeShape == null) {
      return this.open(
        CheckerExpressionTypeOpenKind.MissingTypeDetail,
        expression,
        openSummary,
        sourceReference,
        subject,
      );
    }
    return this.type(typeShape, `Resolved type reference for ${localKey}.`, sourceReference.sourceAddressHandle);
  }

  evaluateTypeUnion(
    alternatives: readonly CheckerExpressionType[],
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    summary: string,
  ): CheckerExpressionTypeEvaluation {
    const commonReference = commonTypeReference(
      alternatives.map((alternative) => alternative.typeReference),
      alternatives.length,
    );
    if (commonReference != null) {
      return alternatives[0]!;
    }

    const typeShape = this.synthesis.unionType(
      alternatives.map((alternative) => alternative.typeShape),
      localKey,
      sourceAddressHandle,
    );
    return this.type(typeShape, summary, sourceAddressHandle);
  }

  projectPrimitive(
    expression: ExpressionAstNode,
    scope: BindingScope,
    localKey: string,
    primitive: CheckerPrimitiveName,
    sourceAddressHandle: AddressHandle | null = null,
  ): CheckerExpressionTypeEvaluation {
    const checker = this.findChecker(scope);
    if (checker == null) {
      return this.open(
        CheckerExpressionTypeOpenKind.MissingChecker,
        expression,
        `Primitive ${primitive} projection needs a TypeChecker from the current binding scope.`,
      );
    }
    const type = checkerPrimitiveType(checker, primitive);
    return this.projectType(expression, checker, type, localKey, sourceAddressHandle);
  }

  projectPrimitiveValue(
    expression: ExpressionAstNode,
    scope: BindingScope,
    localKey: string,
    value: null | undefined | number | boolean | string,
    sourceAddressHandle: AddressHandle | null = null,
  ): CheckerExpressionTypeEvaluation {
    const checker = this.findChecker(scope);
    if (checker == null) {
      return this.open(
        CheckerExpressionTypeOpenKind.MissingChecker,
        expression,
        'Primitive literal projection needs a TypeChecker from the current binding scope.',
      );
    }

    const type = checkerPrimitiveLiteralType(checker, value);
    return this.projectType(expression, checker, type, `${localKey}:literal:${typeof value}`, sourceAddressHandle);
  }

  projectType(
    expression: ExpressionAstNode,
    checker: ts.TypeChecker,
    type: ts.Type,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
    summary: string = `Projected ${expression.$kind} through the TypeChecker.`,
    options: CheckerExpressionTypeProjectionOptions = {},
  ): CheckerExpressionType {
    const typeShape = this.projector.ensureProjection({
      localKey,
      checker,
      type,
      origin: CheckerTypeProjectionOrigin.TypeChecker,
      sourceAddressHandle,
      display: checker.typeToString(type),
      memberProjection: options.memberProjection ?? CheckerTypeMemberProjectionPolicy.Eager,
    } satisfies CheckerTypeProjectionRequest);
    return this.type(typeShape, summary, sourceAddressHandle);
  }

  type(
    typeShape: CheckerTypeShape,
    summary: string,
    sourceAddressHandle: AddressHandle | null = typeShape.sourceAddressHandle,
  ): CheckerExpressionType {
    return new CheckerExpressionType(typeShape, typeShape.toReference(), summary, sourceAddressHandle);
  }

  open(
    openKind: CheckerExpressionTypeOpenKind,
    expression: ExpressionAstNode,
    summary: string,
    partialTypeReference: CheckerTypeReference | null = null,
    subject: CheckerExpressionTypeOpenSubject | null = null,
  ): CheckerExpressionTypeOpen {
    return new CheckerExpressionTypeOpen(openKind, expression.$kind, summary, partialTypeReference, subject);
  }

  openSubject(
    subjectKind: CheckerExpressionTypeOpenSubjectKind,
    name: string | null,
    sourceAddressHandle: AddressHandle | null,
    typeReference: CheckerTypeReference | null = null,
  ): CheckerExpressionTypeOpenSubject {
    return new CheckerExpressionTypeOpenSubject(subjectKind, name, sourceAddressHandle, typeReference);
  }
}
