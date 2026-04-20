Focused golden for the first configuration-to-registration bridge.

This suite snapshots only direct registration producer calls that can be
recovered from configuration/registry surfaces without deeper evaluation.

Today that means:

- `Registration.*`
- `instanceRegistration` / `singletonRegistration` / related helper aliases
- `AppTask.*`

It does not yet attempt to expand bundle arrays, follow helper functions like
`configure(...)`, or materialize final container-state transitions.
