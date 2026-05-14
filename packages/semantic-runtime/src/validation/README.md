# Validation Semantics

This area owns source-backed `@aurelia/validation` products that do not belong to template binding behavior, DI, or
configuration admission.

The first modeled lane is validation rule construction and model-rule hydration:

- Fluent `PropertyRule` modifier calls such as `.withMessage(...)`, `.withMessageKey(...)`, `.when(...)`, and `.tag(...)`
  spend `AUR4101` only when the local chain proves that no rule-producing call has run since `ensure(...)` or
  `ensureObject()`.
- Property accessor arguments to `ensure(...)`, `ensureGroup(...)`, and direct `parsePropertyName(...)` calls spend
  `AUR4102` only for strings or statically visible accessor functions whose body cannot reduce to Aurelia's supported
  direct property/keyed-access path.
- Default `ModelValidationExpressionHydrator` model-rule objects spend `AUR4105` for unsupported rule keys and `AUR4106`
  for empty property names. These diagnostics are suppressed when configuration proves a custom `HydratorType`.
- Closed `ensureGroup(...)` callbacks spend `AUR4108` only when the returned object literal names a property outside the
  statically closed group, or omits the `property` key entirely.

The intentionally unclaimed validation codes remain separate: serialized validation AST/ruleset payloads
(`AUR4100`, `AUR4103`, `AUR4104`), live group execution without scope (`AUR4107`), arbitrary custom rule return values
(`AUR4109`), and framework abstract/mixin stubs (`AUR0099`) need a broader serializer or live rule-execution product
before semantic-runtime should spend their authority.
