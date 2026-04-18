# Registration-World Constructors Ledger

Local port of the Atlas ledger with the same name.
Only the configuration registry archetypes currently spent by the export
semantic surface ledger are included here.

## Configuration Registry Archetypes

The plugin/configuration files point to a small set of reusable archetypes.
These archetypes are not exclusive categories.
Real configurations often cross-compose several of them at once, especially
with lifecycle-attached behavior.

### Aggregate bundle registries

Examples:

- `StandardConfiguration`
- `DefaultVirtualizationConfiguration`

These mostly collect known resources/components and register them as one world.

### Customized-default registries

Examples:

- `ValidationConfiguration`
- `RouterConfiguration.customize(...)`

These start from default options, then materialize registrations from an
options provider.

### Composed configuration layers

Examples:

- `ValidationHtmlConfiguration`
- `ValidationI18nConfiguration`

These extend another configuration surface and add or override registrations.

### Generated-syntax registries

Example:

- `I18nConfiguration`

This family can generate:

- attribute patterns
- binding commands
- aliases
- renderers

from option values like translation aliases.

### Staged builder registries

Examples:

- `StateDefaultConfiguration.init(...).withStore(...)`
- `DialogConfiguration*.withChild(...)`

These accumulate registration intent before final `register(container)` is
called.

### Lifecycle-attached configuration

Examples:

- router startup/shutdown tasks
- state store creation tasks
- dialog global-settings preparation
- i18n initialization gating

These configurations do not only populate the container.
They also schedule lifecycle-coupled work into that world.
