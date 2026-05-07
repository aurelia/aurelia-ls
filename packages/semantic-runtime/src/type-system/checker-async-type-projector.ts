import ts from 'typescript';
import type { AddressHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import {
  CheckerSyntheticTypeProjectionInput,
  CheckerTypeProjectionInput,
  CheckerTypeProjector,
} from './checker-projector.js';
import { TypeSystemProductDetails } from './product-details.js';
import {
  CheckerTypeProjectionOrigin,
  CheckerTypeReference,
  CheckerTypeShapeKind,
} from './type-shape.js';

/** TypeChecker-backed async/result helpers used by runtime-shaped template scope materialization. */
export class CheckerAsyncTypeProjector {
  constructor(
    readonly store: KernelStore,
    readonly projector: CheckerTypeProjector,
  ) {}

  awaitedTypeReference(
    reference: CheckerTypeReference,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const carrier = this.carrierForReference(reference);
    if (carrier == null) {
      return null;
    }

    const awaited = carrier.checker.getAwaitedType(carrier.type);
    if (awaited == null) {
      return reference;
    }

    return this.projectCheckerType(carrier, awaited, localKey, sourceAddressHandle);
  }

  unknownTypeReference(
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference {
    return this.projector.ensureSyntheticProjection(new CheckerSyntheticTypeProjectionInput(
      localKey,
      CheckerTypeShapeKind.Unknown,
      'unknown',
      [],
      null,
      null,
      CheckerTypeProjectionOrigin.SyntheticTemplateType,
      sourceAddressHandle,
    )).toReference();
  }

  private carrierForReference(reference: CheckerTypeReference): CheckerTypeCarrierInput | null {
    if (reference.productHandle == null) {
      return null;
    }
    const carrier = this.store.productDetails.read(TypeSystemProductDetails.TypeShape, reference.productHandle)?.carrier ?? null;
    if (carrier == null) {
      return null;
    }
    return {
      checker: carrier.checker,
      type: carrier.type,
      declarations: carrier.declarations,
    };
  }

  private projectCheckerType(
    carrier: CheckerTypeCarrierInput,
    type: ts.Type,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference {
    const sourceNode = carrier.declarations[0] ?? null;
    return this.projector.ensureProjection(new CheckerTypeProjectionInput(
      localKey,
      carrier.checker,
      type,
      CheckerTypeProjectionOrigin.SyntheticTemplateType,
      sourceNode,
      sourceAddressHandle,
      null,
      carrier.checker.typeToString(type, sourceNode ?? undefined),
    )).toReference();
  }
}

type CheckerTypeCarrierInput = {
  readonly checker: ts.TypeChecker;
  readonly type: ts.Type;
  readonly declarations: readonly ts.Declaration[];
};
