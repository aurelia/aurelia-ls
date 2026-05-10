import type {
  ArrayBindingPattern,
  BindingIdentifierOrPattern,
  BindingPattern,
  BindingPatternDefault,
  ObjectBindingPattern,
} from '../expression/ast.js';
import type { AddressHandle } from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { CheckerTypeReference, CheckerTypeShape } from './type-shape.js';
import type { CheckerTypeShapeAccess } from './checker-type-shape-access.js';

export class CheckerBindingPatternLocalType {
  constructor(
    /** Runtime binding-context name introduced by the pattern. */
    readonly name: string,
    /** Type reached by the pattern path, when checker projection could close it. */
    readonly typeReference: CheckerTypeReference | null,
  ) {}
}

/**
 * Projects `repeat.for` binding-pattern declarations into named template locals.
 *
 * This follows the runtime destructuring path from the iterable element type to each declared local. Unknown rest
 * payloads stay explicit by yielding an untyped local instead of synthesizing a misleading rest object or array.
 */
export class CheckerBindingPatternLocalTypeProjector {
  constructor(
    readonly typeAccess: CheckerTypeShapeAccess,
  ) {}

  localTypesForBindingPattern(
    pattern: BindingIdentifierOrPattern,
    sourceType: CheckerTypeShape | null,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): readonly CheckerBindingPatternLocalType[] {
    return this.localTypesForPattern(pattern, sourceType, localKey, sourceAddressHandle);
  }

  private localTypesForPattern(
    pattern: BindingPattern,
    sourceType: CheckerTypeShape | null,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): readonly CheckerBindingPatternLocalType[] {
    switch (pattern.$kind) {
      case 'BindingIdentifier':
        return [new CheckerBindingPatternLocalType(pattern.name.name, sourceType?.toReference() ?? null)];
      case 'BindingPatternDefault':
        return this.localTypesForDefaultPattern(pattern, sourceType, localKey, sourceAddressHandle);
      case 'BindingPatternHole':
        return [];
      case 'ArrayBindingPattern':
        return this.localTypesForArrayPattern(pattern, sourceType, localKey, sourceAddressHandle);
      case 'ObjectBindingPattern':
        return this.localTypesForObjectPattern(pattern, sourceType, localKey, sourceAddressHandle);
    }
  }

  private localTypesForDefaultPattern(
    pattern: BindingPatternDefault,
    sourceType: CheckerTypeShape | null,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): readonly CheckerBindingPatternLocalType[] {
    return this.localTypesForPattern(pattern.target, sourceType, `${localKey}:default`, sourceAddressHandle);
  }

  private localTypesForArrayPattern(
    pattern: ArrayBindingPattern,
    sourceType: CheckerTypeShape | null,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): readonly CheckerBindingPatternLocalType[] {
    const locals: CheckerBindingPatternLocalType[] = [];
    pattern.elements.forEach((element, index) => {
      const elementType = sourceType == null
        ? null
        : this.typeForArrayPatternElement(sourceType, index, `${localKey}:array:${index}`, sourceAddressHandle);
      locals.push(...this.localTypesForPattern(element, elementType, `${localKey}:array:${index}`, sourceAddressHandle));
    });
    if (pattern.rest != null) {
      locals.push(...this.localTypesForPattern(pattern.rest, null, `${localKey}:array:rest`, sourceAddressHandle));
    }
    return locals;
  }

  private typeForArrayPatternElement(
    sourceType: CheckerTypeShape,
    index: number,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeShape | null {
    return this.typeAccess.numericIndexValueType(sourceType, index, localKey, sourceAddressHandle);
  }

  private localTypesForObjectPattern(
    pattern: ObjectBindingPattern,
    sourceType: CheckerTypeShape | null,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): readonly CheckerBindingPatternLocalType[] {
    const locals: CheckerBindingPatternLocalType[] = [];
    pattern.properties.forEach((property, index) => {
      const propertyKey = String(property.key);
      const propertyLocalKey = `${localKey}:object:${localKeyPart(propertyKey)}:${index}`;
      const propertyType = sourceType == null
        ? null
        : this.typeForObjectPatternProperty(sourceType, propertyKey, propertyLocalKey);
      locals.push(...this.localTypesForPattern(property.value, propertyType, propertyLocalKey, sourceAddressHandle));
    });
    if (pattern.rest != null) {
      locals.push(...this.localTypesForPattern(pattern.rest, null, `${localKey}:object:rest`, sourceAddressHandle));
    }
    return locals;
  }

  private typeForObjectPatternProperty(
    sourceType: CheckerTypeShape,
    propertyName: string,
    localKey: string,
  ): CheckerTypeShape | null {
    return this.typeAccess.memberValueType(sourceType, propertyName, `${localKey}:member`);
  }
}
