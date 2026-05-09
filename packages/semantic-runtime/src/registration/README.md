# Registration

See [../README.md](../README.md) for the folder-wide rebuild map and Atlas and auLink rule.

Registration is the admission layer for values passed to Aurelia's container registration machinery.

It consumes evaluated source values, resource definitions, and configuration admission records, then emits normalized
registration observations and products. DI world construction later spends those products into container state,
resource lookup tables, resolver slots, and dependency availability.

## Responsibilities

- Recognize `Registration.instance`, `singleton`, `transient`, `callback`, `cachedCallback`, `aliasTo`, and `defer`.
- Recognize direct `container.register(...)` and `aurelia.register(...)` argument shapes.
- Preserve configuration-owned implicit admissions such as the browser `aurelia` facade's default
  `StandardConfiguration`.
- Recognize `IRegistry` objects and `register(container, ...params)` methods without executing arbitrary code.
- Recognize resource definition registration, static `$au` resource registration, resource aliases, and plain class
  self-registration.
- Preserve key, registered value, resolver strategy, admission source, and field provenance as kernel-backed facts or
  products.
- Emit open seams for dynamic keys, dynamic registered values, object maps, spreads, and unsupported
  registry shapes.

## Non-Responsibilities

- Building container state or answering lookups.
- Invoking constructors, callbacks, getters, setters, async flows, or lifecycle hooks.
- Performing resource definition convergence.
- Ranking candidate registrations for IDE or tooling answers.

## Runtime Grounding

The kernel `Container.register(...)` accepts a wide admission surface:

- `IRegistry` values delegate to `register(container)`.
- metadata-backed resource definitions delegate to `ResourceDefinition.register`.
- static `$au` resource classes produce resource keys and aliases, plus a singleton self-registration if needed.
- ordinary classes fall back to singleton self-registration.
- object maps are recursively registered by value.

The tooling model should represent those as registration products and seams, not as immediate container mutations.
That keeps registration analyzable before DI world construction exists.

## Watchpoints

- Registration vocabulary uses explicit kernel slots for claim predicates, seam kinds, and product kinds. Resolver
  strategies and admission kinds should stay registration model fields unless a real materializer or query needs a stable
  vocabulary key.
- Registration open seams carry product-owned `KernelVocabulary.Registration.*` seam keys directly. Do not add a
  second local open-kind enum unless a future materializer needs a genuinely different, non-durable taxonomy.
- Registration product models must stay at least as fine-grained as the runtime ingress shapes. Resolver-producing
  admissions, `Registration.defer`/`ParameterizedRegistry`, and generic `IRegistry` admissions are separate product
  classes so DI world construction does not have to rediscover the runtime split later.
- A registration product should distinguish source admission from runtime consequence. `container.register(Foo)` is
  an observation; the later resolver/resource table rows are DI world products.
- Key provenance is not always provider-key provenance. `Registration.defer(key, ...params)` references a registry
  lookup key and must not emit the same `registration.admits-key` claim as `Registration.singleton(key, value)`.
- Known framework registration effects use explicit `FrameworkRegistrationKind` fields and capability mapping. Registry
  bodies, framework-owned registration spreads, and facade-default admissions are separate products; do not infer any of
  them from `localName`. Local names are trace/debug labels only.
- Avoid generic value escape hatches. If key or registered-value shape matters, model it as a typed registration field
  with provenance or leave an open seam.
- `Registration.callback(...)` and `Registration.cachedCallback(...)` are closed resolver admissions when the target key
  and callback expression are known. The callback body is activation/dependency pressure for DI lookup inquiries, not a
  registration-recognition seam.

## Implementation Shape

`registration-observation.ts` is the AST-bearing layer. It records source carriers such as `Registration.*` calls,
`container.register(...)`, static resource admission, object-map entries, and `IRegistry.register(...)` methods.

`registration-reference.ts` is the source-level reference layer. It names target keys and registered values without
retaining TypeScript nodes in durable records. Container receivers belong to `di` operations, not registration
products.

`registration-admission.ts` is the product model. `ResolverRegistrationAdmission`,
`ParameterizedRegistryAdmission`, `RegistryRegistrationAdmission`, and `FrameworkRegistrationAdmission` mirror the
runtime ingress families and framework-owned registration groups that feed container registration.
`OpenRegistrationAdmission` preserves observed but unclassified registration pressure without pretending it is a
resolver, registry, or framework group. These products carry the same product handle as the kernel
`MaterializedProduct` envelope so callers can keep typed product indexes without smuggling product fields into the
generic kernel product record.

`framework-registration-manifest.ts` is the framework registration descriptor table. It maps known configuration
exports, decomposed registration groups, chain methods, roles, and semantic capabilities such as runtime-html compiler
services, default syntax, default resources, default renderers, i18n resource/syntax/renderer/service/task effects,
router default components/resources, router option resolvers, router lifecycle tasks, and state
resource/syntax/renderer/service/task effects, plus dialog service resolvers and the dialog settings-provider task.
`StandardConfiguration` is one broad capability bundle and discovery canary, not the only way those capabilities can
enter an app world.

Runtime-shaped `Resolver`, `IRegistry`, and `ParameterizedRegistry` values live in `../di/`. Registration admissions
may point at those products, but they are not themselves the runtime values.

`IRegistry` bodies are connected later through `../configuration/registry-body-index.ts`. The index uses source-span
containment between the registry value and the recognized `register(container)` body; it intentionally does not use
local names as identity. Imported registry values work when the evaluator can point the value at an admitted source-file
address in the owning module. Unadmitted or unresolved registry bodies remain open instead of borrowing spans from the
importing file.
Registry body interpretation and registry body effects are distinct. The index records that a body was recognized for
an admission even if it emitted zero registration steps, and registration observation handles include project identity
so the same linked source can be analyzed under several project frames without duplicate kernel records.

`registration-kernel-emitter.ts` is the current kernel boundary. It turns admission observations into source spans,
evidence, provenance, typed DI key identities, registration identities, registration claims, materialized-product
envelopes, materialization records, and open seams.

Registration emission is scope-owned. Standalone source-module recognition is useful for inquiry and low-level
registration analysis. Configuration emission owns the registration products admitted by a concrete configuration
step, and later DI world construction should spend those configuration-owned products when constructing an app
container world.

`registration-factory-recognizer.ts` recognizes the source carrier family for imported `Registration.*(...)`
factory calls from `aurelia` or `@aurelia/kernel`, including namespace imports such as
`Aurelia.Registration.singleton(...)`. This is source-shape recognition, not container reachability. Configuration and
later DI world construction still decide whether a registration product participates in an app/container world.

DI key identities are split in the kernel by runtime key shape: class, interface symbol, string, symbol, resource,
resolver, or unknown. Materializers should use those records rather than hiding key semantics in descriptions.
