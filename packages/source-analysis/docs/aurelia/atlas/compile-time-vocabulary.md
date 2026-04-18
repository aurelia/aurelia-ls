# Compile-Time Vocabulary Resolution Dynamics

Local port of the Atlas dynamic note with the same name.
Only Stage 5, which the export semantic surface ledger currently spends, is
included here.

## Stage 5: Admission / activation

### Identity

Binding commands are admitted into the active compile world by DI registration
of their resource type.

Attribute patterns are admitted by registering an `IRegistry` that calls
`IAttributeParser.registerPattern(...)` and also registers the handler
singleton.

Built-in status matters because `StandardConfiguration` registers several
command and pattern bundles by default.

### Mechanism

`runtime-html/src/configuration.ts` is the main admission bundle for built-ins.
`StandardConfiguration.register(container)` registers:

- `DefaultBindingSyntax`
- `DefaultBindingLanguage`
- `DefaultResources`

Binding-command admission remains ordinary DI/resource admission.
Attribute-pattern admission is more stateful: the parser accepts registrations
only until its first `parse()` call, after which late pattern registration
throws.

### Lookup

Admission mechanisms visible in source are:

- container registration through `StandardConfiguration`
- explicit container registration of user-supplied types/registries
- command resource metadata consumed by the resource system
- pattern registries consumed by `AttributeParser.registerPattern()`

No separate convention-based admission path was found for this family.

### Fallback

If a binding command is not admitted, parsed use fails when
`IBindingCommandResolver` calls `BindingCommand.get(...)`.

If an attribute pattern is not admitted, its syntax is not recognized by the
parser and falls through unless some other admitted pattern matches.

Late attribute-pattern admission is a hard failure.

### Completeness

The admission world is complete enough for negative claims only if:

- the active container is known
- the relevant configuration bundles are known
- and, for attribute patterns, parser initialization state is known

Before parser initialization, the possibility of additional registrations means
the negative world is still open.

### Open

Built-in binding commands and built-in patterns are admitted through different
bundles.
The absence of one bundle does not imply the absence of the others.
