import type { ClaimFamilyDefinition } from "./types.js";

export const CLAIM_FAMILY_DEFINITIONS = 
[
  {
    familyId: "claim.identity.custom-element",
    ordinal: 1,
    category: "resource-interface",
    nodeKind: "resource-identity",
    keyConstructor: "ResourceKey(custom-element, canonicalName)",
    stage: "2-4",
    producingEvaluatorGroups: [
      "subject-convergence"
    ],
    positiveAssertion: "A custom-element identity closes for one canonical element name.",
    entityFamily: "ResourceKey(custom-element, canonicalName)",
    dependencies: [
      "realized-world-consultation",
      "support-bundle",
      "declaration-surface"
    ],
    completenessConditions: "Positive identity closes on one applicable custom-element declaration witness. Negative identity claims require declaration-surface across the applicable custom-element declaration surfaces.",
    degradationTarget: "ResourceKey(custom-element, canonicalName), fact kind identity, state open via OpenBoundaryKey(...).",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "@customElement, define(), $au, convention",
    analysis: "Convergence: name from highest-precedence source",
    output: "CE identity with canonicalName",
    crossFamilyDependencies: []
  },
  {
    familyId: "claim.resource.custom-element-field",
    ordinal: 2,
    category: "resource-interface",
    nodeKind: "field-fact",
    keyConstructor: "FieldFactKey(ResourceKey(custom-element, canonicalName), fieldPath)",
    stage: "2-4",
    producingEvaluatorGroups: [
      "subject-convergence"
    ],
    positiveAssertion: "One custom-element field fact closes at field-path granularity.",
    entityFamily: "FieldFactKey(ResourceKey(custom-element, canonicalName), fieldPath)",
    dependencies: [
      "realized-world-consultation",
      "support-bundle",
      "declaration-surface"
    ],
    completenessConditions: "Positive field facts close on one field witness. Negative/default/empty forms follow resource-kind-fields.md: many custom-element payload fields need declaration-surface, while identity-carried fields do not carry an independent negative-field declaration-surface burden; opaque payload semantics such as function-valued capture and processContent may remain field-open.",
    degradationTarget: "claim.identity.custom-element plus FieldFactKey(ResourceKey(custom-element, canonicalName), fieldPath), fact kind resource-field, state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "Same as F1 + static fields, template",
    analysis: "Per-field convergence",
    output: "12 FieldFact nodes per CE",
    crossFamilyDependencies: [
      "claim.identity.custom-element"
    ]
  },
  {
    familyId: "claim.identity.custom-attribute",
    ordinal: 3,
    category: "resource-interface",
    nodeKind: "resource-identity",
    keyConstructor: "ResourceKey(custom-attribute, canonicalName)",
    stage: "2-4",
    producingEvaluatorGroups: [
      "subject-convergence"
    ],
    positiveAssertion: "A custom-attribute identity closes for one canonical attribute name.",
    entityFamily: "ResourceKey(custom-attribute, canonicalName)",
    dependencies: [
      "realized-world-consultation",
      "support-bundle",
      "declaration-surface"
    ],
    completenessConditions: "Positive identity closes on one applicable custom-attribute declaration witness. Negative identity claims require declaration-surface across the applicable custom-attribute declaration surfaces.",
    degradationTarget: "ResourceKey(custom-attribute, canonicalName), fact kind identity, state open via OpenBoundaryKey(...).",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "@customAttribute, @templateController, define(), $au",
    analysis: "Convergence: name, isTemplateController",
    output: "CA identity",
    crossFamilyDependencies: []
  },
  {
    familyId: "claim.resource.custom-attribute-field",
    ordinal: 4,
    category: "resource-interface",
    nodeKind: "field-fact",
    keyConstructor: "FieldFactKey(ResourceKey(custom-attribute, canonicalName), fieldPath)",
    stage: "2-4",
    producingEvaluatorGroups: [
      "subject-convergence"
    ],
    positiveAssertion: "One custom-attribute field fact closes at field-path granularity.",
    entityFamily: "FieldFactKey(ResourceKey(custom-attribute, canonicalName), fieldPath)",
    dependencies: [
      "realized-world-consultation",
      "support-bundle",
      "declaration-surface"
    ],
    completenessConditions: "Positive field facts close on one field witness. Negative/default/empty forms require declaration-surface for the queried custom-attribute field path where the subject inventory marks the negative as completeness-sensitive.",
    degradationTarget: "claim.identity.custom-attribute plus FieldFactKey(ResourceKey(custom-attribute, canonicalName), fieldPath), fact kind resource-field, state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "Same as F3",
    analysis: "Per-field convergence",
    output: "8 FieldFact nodes per CA",
    crossFamilyDependencies: [
      "claim.identity.custom-attribute"
    ]
  },
  {
    familyId: "claim.resource.controllerhood",
    ordinal: 5,
    category: "resource-interface",
    nodeKind: "resource-identity",
    keyConstructor: "ResourceKey(custom-attribute, canonicalName) with factKind=controllerhood",
    stage: "2-4",
    producingEvaluatorGroups: [
      "subject-convergence"
    ],
    positiveAssertion: "A custom attribute closes as controller-bearing (isTemplateController=true).",
    entityFamily: "ResourceKey(custom-attribute, canonicalName) with fact kind controllerhood",
    dependencies: [
      "realized-world-consultation",
      "support-bundle",
      "declaration-surface"
    ],
    completenessConditions: "Positive controllerhood closes on one isTemplateController=true witness. Plain-custom-attribute / not-controller claims require declaration-surface over the custom-attribute declaration surfaces.",
    degradationTarget: "claim.identity.custom-attribute plus ResourceKey(custom-attribute, canonicalName), fact kind controllerhood, state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "F3 identity + isTemplateController field",
    analysis: "isTemplateController === true",
    output: "Controllerhood fact on CA",
    crossFamilyDependencies: [
      "claim.identity.custom-attribute",
      "claim.resource.custom-attribute-field"
    ]
  },
  {
    familyId: "claim.identity.value-converter",
    ordinal: 6,
    category: "resource-interface",
    nodeKind: "resource-identity",
    keyConstructor: "ResourceKey(value-converter, canonicalName)",
    stage: "2-4",
    producingEvaluatorGroups: [
      "subject-convergence"
    ],
    positiveAssertion: "A value-converter identity closes for one canonical converter name.",
    entityFamily: "ResourceKey(value-converter, canonicalName)",
    dependencies: [
      "realized-world-consultation",
      "support-bundle",
      "declaration-surface"
    ],
    completenessConditions: "Positive identity closes on one applicable value-converter declaration witness. Negative identity claims require declaration-surface across the applicable value-converter declaration surfaces.",
    degradationTarget: "ResourceKey(value-converter, canonicalName), fact kind identity, state open via OpenBoundaryKey(...).",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "@valueConverter, $au, convention",
    analysis: "Name convergence",
    output: "VC identity",
    crossFamilyDependencies: []
  },
  {
    familyId: "claim.resource.value-converter-field",
    ordinal: 7,
    category: "resource-interface",
    nodeKind: "field-fact",
    keyConstructor: "FieldFactKey(ResourceKey(value-converter, canonicalName), fieldPath)",
    stage: "2-4",
    producingEvaluatorGroups: [
      "subject-convergence"
    ],
    positiveAssertion: "One value-converter field fact closes at field-path granularity.",
    entityFamily: "FieldFactKey(ResourceKey(value-converter, canonicalName), fieldPath)",
    dependencies: [
      "realized-world-consultation",
      "support-bundle",
      "declaration-surface"
    ],
    completenessConditions: "Positive field facts close on one field witness. aliases is completeness-sensitive; Type, name, and key are identity-carried rather than standalone negative field burdens.",
    degradationTarget: "claim.identity.value-converter plus FieldFactKey(ResourceKey(value-converter, canonicalName), fieldPath), fact kind resource-field, state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "Same as F6",
    analysis: "Per-field convergence",
    output: "2 FieldFact nodes per VC",
    crossFamilyDependencies: [
      "claim.identity.value-converter"
    ]
  },
  {
    familyId: "claim.identity.binding-behavior",
    ordinal: 8,
    category: "resource-interface",
    nodeKind: "resource-identity",
    keyConstructor: "ResourceKey(binding-behavior, canonicalName)",
    stage: "2-4",
    producingEvaluatorGroups: [
      "subject-convergence"
    ],
    positiveAssertion: "A binding-behavior identity closes for one canonical behavior name.",
    entityFamily: "ResourceKey(binding-behavior, canonicalName)",
    dependencies: [
      "realized-world-consultation",
      "support-bundle",
      "declaration-surface"
    ],
    completenessConditions: "Positive identity closes on one applicable binding-behavior declaration witness. Negative identity claims require declaration-surface across the applicable binding-behavior declaration surfaces.",
    degradationTarget: "ResourceKey(binding-behavior, canonicalName), fact kind identity, state open via OpenBoundaryKey(...).",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "@bindingBehavior, $au, convention",
    analysis: "Name convergence",
    output: "BB identity",
    crossFamilyDependencies: []
  },
  {
    familyId: "claim.resource.binding-behavior-field",
    ordinal: 9,
    category: "resource-interface",
    nodeKind: "field-fact",
    keyConstructor: "FieldFactKey(ResourceKey(binding-behavior, canonicalName), fieldPath)",
    stage: "2-4",
    producingEvaluatorGroups: [
      "subject-convergence"
    ],
    positiveAssertion: "One binding-behavior field fact closes at field-path granularity.",
    entityFamily: "FieldFactKey(ResourceKey(binding-behavior, canonicalName), fieldPath)",
    dependencies: [
      "realized-world-consultation",
      "support-bundle",
      "declaration-surface"
    ],
    completenessConditions: "Positive field facts close on one field witness. aliases is completeness-sensitive; Type, name, and key are identity-carried rather than standalone negative field burdens.",
    degradationTarget: "claim.identity.binding-behavior plus FieldFactKey(ResourceKey(binding-behavior, canonicalName), fieldPath), fact kind resource-field, state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "Same as F8",
    analysis: "Per-field convergence",
    output: "2 FieldFact nodes per BB",
    crossFamilyDependencies: [
      "claim.identity.binding-behavior"
    ]
  },
  {
    familyId: "claim.identity.binding-command",
    ordinal: 10,
    category: "resource-interface",
    nodeKind: "resource-identity",
    keyConstructor: "ResourceKey(binding-command, canonicalName)",
    stage: "2-4",
    producingEvaluatorGroups: [
      "subject-convergence"
    ],
    positiveAssertion: "A binding-command identity closes for one canonical command name.",
    entityFamily: "ResourceKey(binding-command, canonicalName)",
    dependencies: [
      "realized-world-consultation",
      "support-bundle",
      "declaration-surface"
    ],
    completenessConditions: "Positive identity closes on one applicable binding-command declaration witness. Negative identity claims require declaration-surface across the applicable binding-command declaration surfaces.",
    degradationTarget: "ResourceKey(binding-command, canonicalName), fact kind identity, state open via OpenBoundaryKey(...).",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "Command definitions, StandardConfiguration",
    analysis: "Name convergence",
    output: "BC identity",
    crossFamilyDependencies: []
  },
  {
    familyId: "claim.resource.binding-command-field",
    ordinal: 11,
    category: "resource-interface",
    nodeKind: "field-fact",
    keyConstructor: "FieldFactKey(ResourceKey(binding-command, canonicalName), fieldPath)",
    stage: "2-4",
    producingEvaluatorGroups: [
      "subject-convergence"
    ],
    positiveAssertion: "One binding-command field fact closes at field-path granularity.",
    entityFamily: "FieldFactKey(ResourceKey(binding-command, canonicalName), fieldPath)",
    dependencies: [
      "realized-world-consultation",
      "support-bundle",
      "declaration-surface"
    ],
    completenessConditions: "Positive field facts close on one field witness. aliases is completeness-sensitive; Type, name, and key are identity-carried rather than standalone negative field burdens.",
    degradationTarget: "claim.identity.binding-command plus FieldFactKey(ResourceKey(binding-command, canonicalName), fieldPath), fact kind resource-field, state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "Same as F10",
    analysis: "Per-field convergence",
    output: "3 FieldFact nodes per BC",
    crossFamilyDependencies: [
      "claim.identity.binding-command"
    ]
  },
  {
    familyId: "claim.identity.attribute-pattern",
    ordinal: 12,
    category: "resource-interface",
    nodeKind: "resource-identity",
    keyConstructor: "ResourceKey(attribute-pattern, pattern\\\\|symbols)",
    stage: "2-4",
    producingEvaluatorGroups: [
      "subject-convergence"
    ],
    positiveAssertion: "An attribute-pattern identity closes for one pattern|symbols pair.",
    entityFamily: "ResourceKey(attribute-pattern, pattern|symbols)",
    dependencies: [
      "realized-world-consultation",
      "support-bundle",
      "declaration-surface"
    ],
    completenessConditions: "Positive identity closes on one applicable attribute-pattern declaration witness. Negative identity claims require declaration-surface across the applicable attribute-pattern declaration surfaces.",
    degradationTarget: "ResourceKey(attribute-pattern, pattern|symbols), fact kind identity, state open via OpenBoundaryKey(...).",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "AttributePattern.define(), registered",
    analysis: "pattern\\\\|symbols key",
    output: "AP identity",
    crossFamilyDependencies: []
  },
  {
    familyId: "claim.resource.attribute-pattern-field",
    ordinal: 13,
    category: "resource-interface",
    nodeKind: "field-fact",
    keyConstructor: "FieldFactKey(ResourceKey(attribute-pattern, pattern\\\\|symbols), fieldPath)",
    stage: "2-4",
    producingEvaluatorGroups: [
      "subject-convergence"
    ],
    positiveAssertion: "One attribute-pattern structural field fact closes at field-path granularity.",
    entityFamily: "FieldFactKey(ResourceKey(attribute-pattern, pattern|symbols), fieldPath)",
    dependencies: [
      "realized-world-consultation",
      "support-bundle",
      "declaration-surface"
    ],
    completenessConditions: "Positive field facts close on one field witness. The two committed attribute-pattern fields are identity-carrying, so failed negative field closure collapses to identity openness rather than to a separate closed negative field fact.",
    degradationTarget: "claim.identity.attribute-pattern plus FieldFactKey(ResourceKey(attribute-pattern, pattern|symbols), fieldPath), fact kind resource-field, state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "Same as F12",
    analysis: "Per-field convergence",
    output: "2 FieldFact nodes per AP",
    crossFamilyDependencies: [
      "claim.identity.attribute-pattern"
    ]
  },
  {
    familyId: "claim.identity.local-custom-element",
    ordinal: 14,
    category: "resource-interface",
    nodeKind: "resource-identity",
    keyConstructor: "ResourceKey(local-custom-element, ownerResourceKey + localName)",
    stage: "2-4",
    producingEvaluatorGroups: [
      "subject-convergence"
    ],
    positiveAssertion: "A local custom-element identity closes for one owner-bounded local name.",
    entityFamily: "ResourceKey(local-custom-element, ownerResourceKey + localName)",
    dependencies: [
      "realized-world-consultation",
      "support-bundle",
      "declaration-surface"
    ],
    completenessConditions: "Positive identity closes on one owner-bounded local-template declaration witness. Negative identity claims require declaration-surface over the local-template declaration surface for that owner boundary.",
    degradationTarget: "ResourceKey(local-custom-element, ownerResourceKey + localName), fact kind identity, state open via OpenBoundaryKey(...).",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "<template as-custom-element>",
    analysis: "Owner + localName",
    output: "Local CE identity",
    crossFamilyDependencies: [
      "claim.identity.custom-element"
    ]
  },
  {
    familyId: "claim.interface.bindable-identity",
    ordinal: 15,
    category: "resource-interface",
    nodeKind: "bindable-identity",
    keyConstructor: "BindableKey(ownerResourceKey, propertyName)",
    stage: "2-4",
    producingEvaluatorGroups: [
      "subject-convergence"
    ],
    positiveAssertion: "A resource closes as exposing one bindable member.",
    entityFamily: "BindableKey(ownerResourceKey, propertyName)",
    dependencies: [
      "realized-world-consultation",
      "support-bundle",
      "declaration-surface",
      "interface-completeness"
    ],
    completenessConditions: "Positive bindable membership closes on one bindable witness. Negative membership requires embedded interface-completeness; inheritance remains a named gap at the owner resource identity site rather than defeating non-inherited closure.",
    degradationTarget: "Owner resource identity plus BindableKey(ownerResourceKey, propertyName), fact kind bindable-interface, state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support",
      "completeness"
    ],
    sourceInputs: "@bindable decorator, $au.bindables",
    analysis: "Per-property identity discovery",
    output: "One BI per bindable property",
    crossFamilyDependencies: [
      "claim.identity.custom-element",
      "claim.identity.custom-attribute"
    ]
  },
  {
    familyId: "claim.interface.bindable-attribute",
    ordinal: 16,
    category: "resource-interface",
    nodeKind: "bindable-trait",
    keyConstructor: "BindableTraitKey(bindableKey, attribute)",
    stage: "2-4",
    producingEvaluatorGroups: [
      "subject-convergence"
    ],
    positiveAssertion: "A bindable closes with one normalized attribute-mapping trait.",
    entityFamily: "BindableTraitKey(bindableKey, attribute)",
    dependencies: [
      "realized-world-consultation",
      "support-bundle",
      "declaration-surface",
      "interface-completeness"
    ],
    completenessConditions: "Positive trait closure needs one normalized trait witness. Negative/default trait claims require embedded interface-completeness.",
    degradationTarget: "claim.interface.bindable-identity plus BindableTraitKey(BindableKey(ownerResourceKey, propertyName), attribute), fact kind bindable-trait, state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support",
      "completeness"
    ],
    sourceInputs: "Same as F15 + explicit attribute name or convention",
    analysis: "Resolve attribute name; convention: camelCase -> kebab-case",
    output: "attribute trait value",
    crossFamilyDependencies: [
      "claim.interface.bindable-identity"
    ]
  },
  {
    familyId: "claim.interface.bindable-mode",
    ordinal: 17,
    category: "resource-interface",
    nodeKind: "bindable-trait",
    keyConstructor: "BindableTraitKey(bindableKey, mode)",
    stage: "2-4",
    producingEvaluatorGroups: [
      "subject-convergence"
    ],
    positiveAssertion: "A bindable closes with one binding-mode trait.",
    entityFamily: "BindableTraitKey(bindableKey, mode)",
    dependencies: [
      "realized-world-consultation",
      "support-bundle",
      "declaration-surface",
      "interface-completeness"
    ],
    completenessConditions: "Positive trait closure needs one normalized trait witness. Negative/default trait claims require embedded interface-completeness.",
    degradationTarget: "claim.interface.bindable-identity plus BindableTraitKey(BindableKey(ownerResourceKey, propertyName), mode), fact kind bindable-trait, state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support",
      "completeness"
    ],
    sourceInputs: "@bindable mode option",
    analysis: "Read explicit mode or default",
    output: "mode trait value",
    crossFamilyDependencies: [
      "claim.interface.bindable-identity"
    ]
  },
  {
    familyId: "claim.interface.bindable-callback",
    ordinal: 18,
    category: "resource-interface",
    nodeKind: "bindable-trait",
    keyConstructor: "BindableTraitKey(bindableKey, callback)",
    stage: "2-4",
    producingEvaluatorGroups: [
      "subject-convergence"
    ],
    positiveAssertion: "A bindable closes with one callback trait.",
    entityFamily: "BindableTraitKey(bindableKey, callback)",
    dependencies: [
      "realized-world-consultation",
      "support-bundle",
      "declaration-surface",
      "interface-completeness"
    ],
    completenessConditions: "Positive trait closure needs one normalized trait witness. Negative/default trait claims require embedded interface-completeness.",
    degradationTarget: "claim.interface.bindable-identity plus BindableTraitKey(BindableKey(ownerResourceKey, propertyName), callback), fact kind bindable-trait, state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support",
      "completeness"
    ],
    sourceInputs: "@bindable callback option or convention",
    analysis: "Read or derive ${propertyName}Changed",
    output: "callback trait value",
    crossFamilyDependencies: [
      "claim.interface.bindable-identity"
    ]
  },
  {
    familyId: "claim.interface.bindable-set",
    ordinal: 19,
    category: "resource-interface",
    nodeKind: "bindable-trait",
    keyConstructor: "BindableTraitKey(bindableKey, set)",
    stage: "2-4",
    producingEvaluatorGroups: [
      "subject-convergence"
    ],
    positiveAssertion: "A bindable closes with one normalized set / coercion trait.",
    entityFamily: "BindableTraitKey(bindableKey, set)",
    dependencies: [
      "realized-world-consultation",
      "support-bundle",
      "declaration-surface",
      "interface-completeness"
    ],
    completenessConditions: "Positive trait closure needs one normalized trait witness. Negative/default trait claims require embedded interface-completeness.",
    degradationTarget: "claim.interface.bindable-identity plus BindableTraitKey(BindableKey(ownerResourceKey, propertyName), set), fact kind bindable-trait, state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support",
      "completeness"
    ],
    sourceInputs: "@bindable set option",
    analysis: "Read boolean presence",
    output: "set trait value",
    crossFamilyDependencies: [
      "claim.interface.bindable-identity"
    ]
  },
  {
    familyId: "claim.availability.resource-admission",
    ordinal: 20,
    category: "dependency-stage",
    nodeKind: "admission",
    keyConstructor: "AdmissionKey(consultedWorld, ResourceKey(kind, stableIdentity))",
    stage: "5",
    producingEvaluatorGroups: [
      "admission"
    ],
    positiveAssertion: "A resource identity has entered the consulted app/container/template world.",
    entityFamily: "AdmissionKey(consultedWorld, ResourceKey(kind, stableIdentity))",
    dependencies: [
      "realized-world-consultation",
      "support-bundle"
    ],
    completenessConditions: "Positive admission closes on one admission witness. Negative or exhaustive admission claims require resource-admission-completeness; activation gaps stay open rather than collapsing to absence.",
    degradationTarget: "AdmissionKey(consultedWorld, ResourceKey(kind, stableIdentity)), fact kind resource-admission, state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "ResourceIdentity + registration chain + Layer 1 config",
    analysis: "Check registration surfaces for this resource in this world",
    output: "admissionState",
    crossFamilyDependencies: [
      "claim.identity.custom-element",
      "claim.identity.local-custom-element"
    ],
    correctnessConditions: "N/A"
  },
  {
    familyId: "claim.availability.vocabulary-admission",
    ordinal: 21,
    category: "dependency-stage",
    nodeKind: "admission",
    keyConstructor: "AdmissionKey(consultedWorld, VocabularyEntryKey(vocabularyFamily, entryIdentity))",
    stage: "5",
    producingEvaluatorGroups: [
      "admission"
    ],
    positiveAssertion: "A vocabulary entry has entered the consulted parser/compiler world.",
    entityFamily: "AdmissionKey(consultedWorld, VocabularyEntryKey(vocabularyFamily, entryIdentity))",
    dependencies: [
      "realized-world-consultation",
      "support-bundle"
    ],
    completenessConditions: "Positive admission closes on one admission witness. Negative or exhaustive admission claims require vocabulary-admission-completeness; inactive vocabulary stays open rather than absent.",
    degradationTarget: "AdmissionKey(consultedWorld, VocabularyEntryKey(vocabularyFamily, entryIdentity)), fact kind vocabulary-admission, state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "VocabularyEntry definition + registration",
    analysis: "Check vocabulary registration",
    output: "admissionState",
    crossFamilyDependencies: [
      "claim.identity.binding-command",
      "claim.resource.attribute-pattern-field"
    ],
    correctnessConditions: "N/A"
  },
  {
    familyId: "claim.reachability.resource-scope",
    ordinal: 22,
    category: "dependency-stage",
    nodeKind: "reachability",
    keyConstructor: "ReachabilityKey(consultedContext, ResourceKey(kind, stableIdentity))",
    stage: "6",
    producingEvaluatorGroups: [
      "scope"
    ],
    positiveAssertion: "An admitted resource is reachable from this site under the local-or-root resource-scope law.",
    entityFamily: "ReachabilityKey(consultedContext, ResourceKey(kind, stableIdentity))",
    dependencies: [
      "realized-world-consultation",
      "support-bundle"
    ],
    completenessConditions: "Positive reachability closes on one local or root reachability witness. Negative reachability claims require resource-scope-completeness on the reachable registration world.",
    degradationTarget: "ReachabilityKey(consultedContext, ResourceKey(kind, stableIdentity)), fact kind resource-scope, state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support",
      "context-admission"
    ],
    sourceInputs: "Admission nodes + container hierarchy",
    analysis: "Two-level lookup: current then root",
    output: "reachabilityState",
    crossFamilyDependencies: [
      "claim.availability.resource-admission"
    ]
  },
  {
    familyId: "claim.reachability.template-scope",
    ordinal: 23,
    category: "dependency-stage",
    nodeKind: "reachability",
    keyConstructor: "ReachabilityKey(consultedContext, occurrenceAnchor + identifierOrReferentKey)",
    stage: "6",
    producingEvaluatorGroups: [
      "scope"
    ],
    positiveAssertion: "An identifier or resolved referent is reachable from this site under the template-scope chain.",
    entityFamily: "ReachabilityKey(consultedContext, occurrenceAnchor + identifierOrReferentKey)",
    dependencies: [
      "realized-world-consultation",
      "support-bundle"
    ],
    completenessConditions: "Positive reachability closes on one scope-frame witness. Negative reachability claims require template-scope-completeness on the contributing scope-frame world.",
    degradationTarget: "ReachabilityKey(consultedContext, occurrenceAnchor + identifierOrReferentKey), fact kind template-scope, state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support",
      "context-admission"
    ],
    sourceInputs: "Scope-frame contributing structures",
    analysis: "Scope-frame walk to boundary",
    output: "reachabilityState",
    crossFamilyDependencies: [
      "claim.availability.resource-admission",
      "claim.reachability.resource-scope"
    ]
  },
  {
    familyId: "claim.position.grammar-only-classification",
    ordinal: 24,
    category: "position-classification",
    nodeKind: "position-classification",
    keyConstructor: "OccurrenceKey(consultedContext, occurrenceAnchor, positionFamily)",
    stage: "7",
    producingEvaluatorGroups: [
      "template-interpretation"
    ],
    positiveAssertion: "An occurrence classifies as one of the grammar-only position families.",
    entityFamily: "OccurrenceKey(consultedContext, occurrenceAnchor, positionFamily)",
    dependencies: [
      "admissibility-gate",
      "classification",
      "grammar-shape-completeness",
      "realized-world-consultation"
    ],
    completenessConditions: "Positive classification closes once grammar-shape is fixed enough. Negative classification requires grammar-shape-completeness.",
    degradationTarget: "OccurrenceKey(consultedContext, occurrenceAnchor, positionFamily), fact kind classification, state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "completeness",
      "context-admission"
    ],
    sourceInputs: "Template AST position",
    analysis: "Grammar-only analysis: element name pattern, attribute syntax, text interpolation, slot-name",
    output: "gatingTier=grammar-only, classificationResult",
    crossFamilyDependencies: [],
    correctnessConditions: "N/A (classification, not correctness)"
  },
  {
    familyId: "claim.position.vocabulary-gated-classification",
    ordinal: 25,
    category: "position-classification",
    nodeKind: "position-classification",
    keyConstructor: "OccurrenceKey(consultedContext, occurrenceAnchor, positionFamily)",
    stage: "7",
    producingEvaluatorGroups: [
      "template-interpretation"
    ],
    positiveAssertion: "An occurrence classifies as one of the vocabulary-gated position families.",
    entityFamily: "OccurrenceKey(consultedContext, occurrenceAnchor, positionFamily)",
    dependencies: [
      "admissibility-gate",
      "classification",
      "grammar-shape-completeness",
      "vocabulary-admission-completeness",
      "realized-world-consultation"
    ],
    completenessConditions: "Positive classification closes once vocabulary admission and grammar-shape are fixed enough. Negative classification requires grammar-shape-completeness plus vocabulary-admission-completeness.",
    degradationTarget: "OccurrenceKey(consultedContext, occurrenceAnchor, positionFamily), fact kind classification, state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "completeness",
      "context-admission"
    ],
    sourceInputs: "Template position + admission for vocabulary entries",
    analysis: "Grammar analysis gated on vocabulary admission: binding-command resolution, attribute-pattern matching",
    output: "gatingTier=vocabulary-gated, classificationResult",
    crossFamilyDependencies: [
      "claim.availability.vocabulary-admission",
      "witness.completeness.vocabulary-admission"
    ],
    correctnessConditions: "N/A"
  },
  {
    familyId: "claim.position.resource-gated-classification",
    ordinal: 26,
    category: "position-classification",
    nodeKind: "position-classification",
    keyConstructor: "OccurrenceKey(consultedContext, occurrenceAnchor, positionFamily)",
    stage: "7",
    producingEvaluatorGroups: [
      "template-interpretation"
    ],
    positiveAssertion: "An occurrence classifies as one of the resource-gated position families.",
    entityFamily: "OccurrenceKey(consultedContext, occurrenceAnchor, positionFamily)",
    dependencies: [
      "admissibility-gate",
      "classification",
      "grammar-shape-completeness",
      "resource-admission-completeness",
      "resource-scope-completeness",
      "realized-world-consultation"
    ],
    completenessConditions: "Positive classification closes once resource admission, resource reachability, and grammar-shape are fixed enough. Negative classification requires grammar-shape-completeness, resource-admission-completeness, and resource-scope-completeness.",
    degradationTarget: "OccurrenceKey(consultedContext, occurrenceAnchor, positionFamily), fact kind classification, state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "completeness",
      "context-admission",
      "reachability-scope"
    ],
    sourceInputs: "Template position + admission + reachability for resources",
    analysis: "Full classification gated on resource reachability: CE/CA/TC resolution",
    output: "gatingTier=resource-gated, classificationResult, referentIdentity",
    crossFamilyDependencies: [
      "claim.availability.resource-admission",
      "claim.reachability.resource-scope",
      "witness.completeness.resource-admission",
      "witness.completeness.resource-scope"
    ],
    correctnessConditions: "N/A"
  },
  {
    familyId: "correctness.1.resource-scope-absence",
    ordinal: 27,
    category: "correctness",
    nodeKind: "correctness-finding",
    keyConstructor: "LookupKey(OccurrenceKey(...), resource-scope, resourceKind+lookupName)",
    stage: "7",
    producingEvaluatorGroups: [
      "template-interpretation"
    ],
    positiveAssertion: "A claim-bearing resource lookup safely concludes that no reachable admitted resource satisfies the required lookup.",
    entityFamily: "LookupKey(OccurrenceKey(consultedContext, occurrenceAnchor), resource-scope, resourceKind + lookupName)",
    dependencies: [
      "admissibility-gate",
      "resource-admission-completeness",
      "resource-scope-completeness",
      "realized-world-consultation"
    ],
    completenessConditions: "Absence-style negative. The negative search space closes only when resource-admission-completeness and resource-scope-completeness both hold.",
    degradationTarget: "LookupKey(OccurrenceKey(consultedContext, occurrenceAnchor), resource-scope, resourceKind + lookupName), fact kind resource-scope-absence, state open via OpenBoundaryKey(...).",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "completeness",
      "context-admission",
      "reachability-scope"
    ],
    sourceInputs: "PC + Reachability + CW(resource-admission, resource-scope)",
    analysis: "Tag name or attribute name references non-reachable resource",
    crossFamilyDependencies: [
      "claim.reachability.resource-scope",
      "claim.position.resource-gated-classification",
      "witness.completeness.resource-admission",
      "witness.completeness.resource-scope"
    ],
    correctnessConditions: "fails when reachability=not-reachable AND resource-scope CW satisfied AND resource-admission CW satisfied. D-3: unsatisfied CW -> no-claim"
  },
  {
    familyId: "correctness.1.vocabulary-entry-absence",
    ordinal: 28,
    category: "correctness",
    nodeKind: "correctness-finding",
    keyConstructor: "LookupKey(OccurrenceKey(...), vocabulary-entry, vocabularyFamily+lookupName)",
    stage: "7",
    producingEvaluatorGroups: [
      "template-interpretation"
    ],
    positiveAssertion: "A claim-bearing vocabulary lookup safely concludes that no admitted entry satisfies the required lookup.",
    entityFamily: "LookupKey(OccurrenceKey(consultedContext, occurrenceAnchor), vocabulary-entry, vocabularyFamily + lookupName)",
    dependencies: [
      "admissibility-gate",
      "vocabulary-admission-completeness",
      "realized-world-consultation"
    ],
    completenessConditions: "Absence-style negative. The negative search space closes only when vocabulary-admission-completeness holds.",
    degradationTarget: "LookupKey(OccurrenceKey(consultedContext, occurrenceAnchor), vocabulary-entry, vocabularyFamily + lookupName), fact kind vocabulary-entry-absence, state open via OpenBoundaryKey(...).",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "completeness",
      "context-admission"
    ],
    sourceInputs: "PC + CW(vocabulary-admission)",
    analysis: "Binding command or vocab entry not found",
    crossFamilyDependencies: [
      "claim.availability.vocabulary-admission",
      "claim.position.vocabulary-gated-classification",
      "witness.completeness.vocabulary-admission"
    ],
    correctnessConditions: "fails when not admitted AND vocabulary-admission CW satisfied. D-3 applies"
  },
  {
    familyId: "correctness.1.schema-surface-absence",
    ordinal: 29,
    category: "correctness",
    nodeKind: "correctness-finding",
    keyConstructor: "LookupKey(OccurrenceKey(...), schema-surface, schemaFamily+entryName)",
    stage: "7",
    producingEvaluatorGroups: [
      "template-interpretation"
    ],
    positiveAssertion: "A schema-backed lookup safely concludes that no required schema entry exists for the queried surface.",
    entityFamily: "LookupKey(OccurrenceKey(consultedContext, occurrenceAnchor), schema-surface, schemaFamily + entryName)",
    dependencies: [
      "admissibility-gate",
      "classification",
      "schema-surface-completeness",
      "realized-world-consultation"
    ],
    completenessConditions: "Absence-style negative. The negative search space closes through embedded schema-surface-completeness; the completeness mechanism is committed as embedded rather than as a standalone witness row.",
    degradationTarget: "LookupKey(OccurrenceKey(consultedContext, occurrenceAnchor), schema-surface, schemaFamily + entryName), fact kind schema-surface-absence, state open via OpenBoundaryKey(...).",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "completeness",
      "context-admission",
      "reachability-scope"
    ],
    sourceInputs: "PC + bindable interface",
    analysis: "Attribute name not in resource's bindable interface",
    crossFamilyDependencies: [
      "claim.interface.bindable-identity",
      "claim.position.resource-gated-classification"
    ],
    correctnessConditions: "fails when bindable not found AND interface completeness embedded. D-3 via schema-surface"
  },
  {
    familyId: "correctness.2.missing-bindable",
    ordinal: 30,
    category: "correctness",
    nodeKind: "correctness-finding",
    keyConstructor: "LookupKey(OccurrenceKey(...), bindable-interface, targetResourceKey+propertyName)",
    stage: "7",
    producingEvaluatorGroups: [
      "template-interpretation"
    ],
    positiveAssertion: "A reachable target resource safely concludes that the requested bindable or interface member is absent.",
    entityFamily: "LookupKey(OccurrenceKey(consultedContext, occurrenceAnchor), bindable-interface, targetResourceKey + propertyName)",
    dependencies: [
      "admissibility-gate",
      "resource-admission-completeness",
      "resource-scope-completeness",
      "interface-completeness",
      "declaration-surface",
      "realized-world-consultation"
    ],
    completenessConditions: "Absence-style negative. Closure requires resource-admission-completeness, resource-scope-completeness, and embedded interface-completeness, with the non-inherited declaration-surface burden carried explicitly by the row.",
    degradationTarget: "Target resource identity plus queried interface fact state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "completeness",
      "context-admission"
    ],
    sourceInputs: "PC + BindableIdentity + CW(resource-admission, resource-scope)",
    analysis: "Binding targets non-existent bindable property",
    crossFamilyDependencies: [
      "claim.interface.bindable-identity",
      "claim.reachability.resource-scope",
      "claim.position.resource-gated-classification",
      "witness.completeness.resource-admission",
      "witness.completeness.resource-scope"
    ],
    correctnessConditions: "fails when BI absent AND resource-scope + interface complete"
  },
  {
    familyId: "correctness.3.duplicate-registration",
    ordinal: 31,
    category: "correctness",
    nodeKind: "correctness-finding",
    keyConstructor: "RelationKey(claimantAKey, claimantBKey, registrationSlot)",
    stage: "4-5",
    producingEvaluatorGroups: [
      "admission"
    ],
    positiveAssertion: "Two or more incompatible claimants positively witness one conflicting semantic slot.",
    entityFamily: "RelationKey(claimantAKey, claimantBKey, registrationSlot)",
    dependencies: [
      "admissibility-gate",
      "support-bundle",
      "realized-world-consultation"
    ],
    completenessConditions: "Violation-style family. One witnessed conflict is enough; no completeness witness is needed for the violation itself, and no positive-clean dual is required by default.",
    degradationTarget: "RelationKey(claimantAKey, claimantBKey, registrationSlot), fact kind duplicate-registration, state open via OpenBoundaryKey(...).",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support",
      "context-admission"
    ],
    sourceInputs: "Admission analysis",
    analysis: "Detect conflicting registrations for same canonical name in same world",
    output: "claimState: holds when duplicate found",
    crossFamilyDependencies: [
      "claim.availability.resource-admission"
    ],
    correctnessConditions: "Duplicate: two resources with same canonicalName registered in same world. No completeness witness required."
  },
  {
    familyId: "correctness.4.syntax-invalid",
    ordinal: 32,
    category: "correctness",
    nodeKind: "correctness-finding",
    keyConstructor: "OccurrenceKey(consultedContext, occurrenceAnchor, expressionEntryFamily)",
    stage: "7",
    producingEvaluatorGroups: [
      "template-interpretation"
    ],
    positiveAssertion: "An expression entry site is locally syntactically invalid.",
    entityFamily: "OccurrenceKey(consultedContext, occurrenceAnchor, expressionEntryFamily)",
    dependencies: [
      "admissibility-gate",
      "support-bundle",
      "realized-world-consultation"
    ],
    completenessConditions: "Violation-style family. Local parse failure is sufficient; no completeness witness is needed.",
    degradationTarget: "OccurrenceKey(consultedContext, occurrenceAnchor, expressionEntryFamily), fact kind syntax-invalid, state open via OpenBoundaryKey(...).",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support",
      "context-admission"
    ],
    sourceInputs: "Template AST",
    analysis: "Expression parse failure, malformed binding syntax",
    crossFamilyDependencies: [
      "claim.position.grammar-only-classification",
      "claim.position.vocabulary-gated-classification"
    ],
    correctnessConditions: "fails on local parse failure. No completeness required"
  },
  {
    familyId: "correctness.4.symbol-unresolved",
    ordinal: 33,
    category: "correctness",
    nodeKind: "correctness-finding",
    keyConstructor: "LookupKey(OccurrenceKey(...), template-scope, identifierName)",
    stage: "7",
    producingEvaluatorGroups: [
      "template-interpretation"
    ],
    positiveAssertion: "A symbol in expression scope safely concludes as unresolved.",
    entityFamily: "LookupKey(OccurrenceKey(consultedContext, occurrenceAnchor), template-scope, identifierName)",
    dependencies: [
      "admissibility-gate",
      "template-scope-completeness",
      "realized-world-consultation"
    ],
    completenessConditions: "Absence-style negative. The negative search space closes only when template-scope-completeness holds.",
    degradationTarget: "LookupKey(OccurrenceKey(consultedContext, occurrenceAnchor), template-scope, identifierName), fact kind symbol-unresolved, state open via OpenBoundaryKey(...).",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "completeness",
      "context-admission"
    ],
    sourceInputs: "PC + Reachability (template-scope) + CW(template-scope)",
    analysis: "Expression identifier not resolvable in scope",
    crossFamilyDependencies: [
      "claim.reachability.template-scope",
      "witness.completeness.template-scope"
    ],
    correctnessConditions: "fails when scope walk exhausted AND template-scope CW satisfied. D-3 applies"
  },
  {
    familyId: "correctness.4.type-contradiction",
    ordinal: 34,
    category: "correctness",
    nodeKind: "correctness-finding",
    keyConstructor: "RelationKey(OccurrenceKey(...), typedConstraint, type-contradiction)",
    stage: "7",
    producingEvaluatorGroups: [
      "template-interpretation"
    ],
    positiveAssertion: "A typed expression relation closes as contradictory under a type world strong enough to support the contradiction.",
    entityFamily: "RelationKey(OccurrenceKey(consultedContext, occurrenceAnchor), typedConstraint, type-contradiction)",
    dependencies: [
      "admissibility-gate",
      "template-scope-completeness",
      "type-closure-completeness",
      "realized-world-consultation"
    ],
    completenessConditions: "Violation-style once the typed world closes strongly enough. The row stays provisional because type-closure-completeness is an open-placeholder mechanism.",
    degradationTarget: "RelationKey(OccurrenceKey(consultedContext, occurrenceAnchor), typedConstraint, type-contradiction) plus type-closure boundary state open.",
    status: "provisional",
    incomingEdgeClasses: [
      "completeness",
      "context-admission"
    ],
    sourceInputs: "PC + type analysis + CW(template-scope, type-closure)",
    analysis: "Type mismatch between binding source and target",
    crossFamilyDependencies: [
      "claim.reachability.template-scope",
      "witness.completeness.template-scope",
      "witness.completeness.type-closure"
    ],
    correctnessConditions: "fails when type check fails AND template-scope + type-closure CW satisfied. PROVISIONAL: type-closure CW is open placeholder"
  },
  {
    familyId: "correctness.4.subject-derived-resource-misuse",
    ordinal: 35,
    category: "correctness",
    nodeKind: "correctness-finding",
    keyConstructor: "RelationKey(OccurrenceKey(...), resourceKey, subject-derived-resource-misuse)",
    stage: "7",
    producingEvaluatorGroups: [
      "template-interpretation"
    ],
    positiveAssertion: "A resource-bearing expression site positively witnesses misuse under a contract derivable from subject evidence.",
    entityFamily: "RelationKey(OccurrenceKey(consultedContext, occurrenceAnchor), resourceKey, subject-derived-resource-misuse)",
    dependencies: [
      "resource identity",
      "subject-derived type evidence",
      "admissibility-gate",
      "classification",
      "realized-world-consultation"
    ],
    completenessConditions: "Violation-style family. No completeness witness is needed for the misuse itself once the subject-derived contract closes.",
    degradationTarget: "Resolved subject-derived resource fact plus misuse state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support",
      "context-admission",
      "reachability-scope"
    ],
    sourceInputs: "PC + ResourceIdentity fields",
    analysis: "Resource used in a way contradicting its subject-derived contract (e.g., containerless CE with slot)",
    crossFamilyDependencies: [
      "claim.resource.custom-element-field",
      "claim.resource.custom-attribute-field",
      "claim.position.resource-gated-classification"
    ],
    correctnessConditions: "fails when subject-derived contract closes and usage violates it"
  },
  {
    familyId: "correctness.4.governed-resource-misuse",
    ordinal: 36,
    category: "correctness",
    nodeKind: "correctness-finding",
    keyConstructor: "RelationKey(OccurrenceKey(...), resourceKey, governed-resource-misuse)",
    stage: "7",
    producingEvaluatorGroups: [
      "template-interpretation"
    ],
    positiveAssertion: "A resource-bearing expression site positively witnesses misuse under a governed semantic contract.",
    entityFamily: "RelationKey(OccurrenceKey(consultedContext, occurrenceAnchor), resourceKey, governed-resource-misuse)",
    dependencies: [
      "resource identity",
      "family-4-governed-applicability",
      "controller-semantics-governed-closure or binding-command-semantics-governed-closure or attribute-pattern-semantics-governed-closure",
      "admissibility-gate",
      "classification",
      "realized-world-consultation"
    ],
    completenessConditions: "Violation-style family. No completeness witness is needed for the misuse itself, but the row stays provisional because family-4-governed-applicability is conditional-boundary-uncommitted even when the relevant governed row is committed.",
    degradationTarget: "Resolved governed resource fact plus governed-use boundary state open.",
    status: "provisional",
    incomingEdgeClasses: [
      "support",
      "context-admission",
      "reachability-scope"
    ],
    sourceInputs: "PC + GovernedSemantic",
    analysis: "Resource used in a way contradicting governed closure (e.g., repeat without iterable)",
    crossFamilyDependencies: [
      "claim.governed.controller-semantics",
      "claim.governed.binding-command-semantics",
      "claim.governed.attribute-pattern-semantics",
      "claim.position.resource-gated-classification"
    ],
    correctnessConditions: "holds when governed contract closes and usage violates it; no node produced when usage is correct (per Section 2.3). PROVISIONAL: governed-applicability uncommitted"
  },
  {
    familyId: "correctness.5.template-structure",
    ordinal: 37,
    category: "correctness",
    nodeKind: "correctness-finding",
    keyConstructor: "OccurrenceKey(consultedContext, occurrenceAnchor, structuralConstructFamily)",
    stage: "7",
    producingEvaluatorGroups: [
      "template-interpretation"
    ],
    positiveAssertion: "A classified framework structural site positively witnesses invalid placement or invalid template shape.",
    entityFamily: "OccurrenceKey(consultedContext, occurrenceAnchor, structuralConstructFamily)",
    dependencies: [
      "admissibility-gate",
      "classification",
      "grammar-shape-completeness",
      "realized-world-consultation"
    ],
    completenessConditions: "Violation-style family. grammar-shape-completeness must close before structural invalidity is safe, but no additional completeness witness is needed for the witnessed violation.",
    degradationTarget: "OccurrenceKey(consultedContext, occurrenceAnchor, structuralConstructFamily), fact kind template-structure, state open via OpenBoundaryKey(...).",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "completeness",
      "context-admission",
      "reachability-scope"
    ],
    sourceInputs: "Template AST + CW(grammar-shape)",
    analysis: "Structural template error (orphaned au-slot, misplaced else, etc.)",
    crossFamilyDependencies: [
      "witness.completeness.grammar-shape"
    ],
    correctnessConditions: "fails when grammar-shape CW satisfied and structure violated"
  },
  {
    familyId: "correctness.6.controller-linkage",
    ordinal: 38,
    category: "correctness",
    nodeKind: "correctness-finding",
    keyConstructor: "RelationKey(controllerResourceKey, controlledOccurrenceKey, controller-linkage)",
    stage: "7",
    producingEvaluatorGroups: [
      "template-interpretation"
    ],
    positiveAssertion: "A controller-bearing relation positively witnesses invalid linkage under closed controller semantics.",
    entityFamily: "RelationKey(controllerResourceKey, controlledOccurrenceKey, controller-linkage)",
    dependencies: [
      "admissibility-gate",
      "resource-admission-completeness",
      "resource-scope-completeness",
      "classification",
      "controller-semantics-governed-closure",
      "realized-world-consultation"
    ],
    completenessConditions: "Violation-style family. No completeness witness is needed for the linkage violation itself once controller semantics are closed.",
    degradationTarget: "claim.resource.controllerhood plus governed controller-semantics state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support",
      "completeness",
      "context-admission",
      "reachability-scope"
    ],
    sourceInputs: "PC + GovernedSemantic (controller-semantics)",
    analysis: "TC linkage violation (parent/sibling linkage mismatch)",
    crossFamilyDependencies: [
      "claim.governed.controller-semantics",
      "claim.reachability.resource-scope",
      "claim.position.resource-gated-classification"
    ],
    correctnessConditions: "fails when controller-semantics.linkageKind known and usage violates it"
  },
  {
    familyId: "correctness.7.binding-behavior-unknown-entry",
    ordinal: 39,
    category: "correctness",
    nodeKind: "correctness-finding",
    keyConstructor: "LookupKey(OccurrenceKey(...), binding-behavior, behaviorName)",
    stage: "7",
    producingEvaluatorGroups: [
      "template-interpretation"
    ],
    positiveAssertion: "A behavior-bearing site safely concludes that no reachable binding behavior satisfies the queried name.",
    entityFamily: "LookupKey(OccurrenceKey(consultedContext, occurrenceAnchor), binding-behavior, behaviorName)",
    dependencies: [
      "admissibility-gate",
      "resource-admission-completeness",
      "resource-scope-completeness",
      "realized-world-consultation"
    ],
    completenessConditions: "Absence-style negative. The negative search space closes only when resource-admission-completeness and resource-scope-completeness both hold.",
    degradationTarget: "LookupKey(OccurrenceKey(consultedContext, occurrenceAnchor), binding-behavior, behaviorName), fact kind binding-behavior-unknown-entry, state open via OpenBoundaryKey(...).",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "completeness",
      "context-admission"
    ],
    sourceInputs: "PC + Reachability + CW(resource-admission, resource-scope)",
    analysis: "BB name not in reachable set",
    crossFamilyDependencies: [
      "claim.identity.binding-behavior",
      "claim.reachability.resource-scope",
      "witness.completeness.resource-admission",
      "witness.completeness.resource-scope"
    ],
    correctnessConditions: "fails when BB not reachable AND resource-scope + resource-admission CW satisfied. D-3 applies"
  },
  {
    familyId: "correctness.7.binding-behavior-misuse",
    ordinal: 40,
    category: "correctness",
    nodeKind: "correctness-finding",
    keyConstructor: "RelationKey(OccurrenceKey(...), ResourceKey(binding-behavior, canonicalName), binding-behavior-misuse)",
    stage: "7",
    producingEvaluatorGroups: [
      "template-interpretation"
    ],
    positiveAssertion: "A recognized binding behavior is positively witnessed as misused at this site.",
    entityFamily: "RelationKey(OccurrenceKey(consultedContext, occurrenceAnchor), ResourceKey(binding-behavior, canonicalName), binding-behavior-misuse)",
    dependencies: [
      "admissibility-gate",
      "resource-admission-completeness",
      "resource-scope-completeness",
      "binding-behavior-semantics-governed-closure",
      "realized-world-consultation"
    ],
    completenessConditions: "Violation-style family. No completeness witness is needed for the misuse itself, but the row stays provisional because binding-behavior-semantics-governed-closure is uncommitted and no standalone governed row exists.",
    degradationTarget: "claim.identity.binding-behavior plus binding-behavior semantics state open.",
    status: "provisional",
    incomingEdgeClasses: [
      "support",
      "completeness",
      "context-admission",
      "reachability-scope"
    ],
    sourceInputs: "PC + GovernedSemantic (BB semantics -- uncommitted)",
    analysis: "BB used incorrectly",
    crossFamilyDependencies: [
      "claim.identity.binding-behavior"
    ],
    correctnessConditions: "PROVISIONAL: no standalone BB governed family committed. fails when governed contract available and usage violates it"
  },
  {
    familyId: "correctness.7.binding-command-unknown-entry",
    ordinal: 41,
    category: "correctness",
    nodeKind: "correctness-finding",
    keyConstructor: "LookupKey(OccurrenceKey(...), binding-command, commandName)",
    stage: "7",
    producingEvaluatorGroups: [
      "template-interpretation"
    ],
    positiveAssertion: "A command-bearing site safely concludes that no admitted binding command satisfies the queried name.",
    entityFamily: "LookupKey(OccurrenceKey(consultedContext, occurrenceAnchor), binding-command, commandName)",
    dependencies: [
      "admissibility-gate",
      "vocabulary-admission-completeness",
      "realized-world-consultation"
    ],
    completenessConditions: "Absence-style negative. The negative search space closes only when vocabulary-admission-completeness holds.",
    degradationTarget: "LookupKey(OccurrenceKey(consultedContext, occurrenceAnchor), binding-command, commandName), fact kind binding-command-unknown-entry, state open via OpenBoundaryKey(...).",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "completeness",
      "context-admission"
    ],
    sourceInputs: "PC + CW(vocabulary-admission)",
    analysis: "Binding command name not in vocabulary",
    crossFamilyDependencies: [
      "claim.availability.vocabulary-admission",
      "claim.position.vocabulary-gated-classification",
      "witness.completeness.vocabulary-admission"
    ],
    correctnessConditions: "fails when not admitted AND vocabulary-admission CW satisfied. D-3 applies"
  },
  {
    familyId: "correctness.7.binding-command-misuse",
    ordinal: 42,
    category: "correctness",
    nodeKind: "correctness-finding",
    keyConstructor: "RelationKey(OccurrenceKey(...), ResourceKey(binding-command, canonicalName), binding-command-misuse)",
    stage: "7",
    producingEvaluatorGroups: [
      "template-interpretation"
    ],
    positiveAssertion: "A recognized binding command is positively witnessed as misused under closed command semantics.",
    entityFamily: "RelationKey(OccurrenceKey(consultedContext, occurrenceAnchor), ResourceKey(binding-command, canonicalName), binding-command-misuse)",
    dependencies: [
      "admissibility-gate",
      "classification",
      "binding-command-semantics-governed-closure",
      "realized-world-consultation"
    ],
    completenessConditions: "Violation-style family. No completeness witness is needed for the misuse itself once command semantics are closed.",
    degradationTarget: "claim.identity.binding-command plus governed command-semantics state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support",
      "context-admission",
      "reachability-scope"
    ],
    sourceInputs: "PC + GovernedSemantic (binding-command-semantics)",
    analysis: "BC used incorrectly (e.g., for.bind with non-supported command)",
    crossFamilyDependencies: [
      "claim.governed.binding-command-semantics",
      "claim.position.vocabulary-gated-classification"
    ],
    correctnessConditions: "fails when command semantics close and usage violates it"
  },
  {
    familyId: "correctness.8.composition",
    ordinal: 43,
    category: "correctness",
    nodeKind: "correctness-finding",
    keyConstructor: "OccurrenceKey(consultedContext, occurrenceAnchor, compositionSurface)",
    stage: "open",
    producingEvaluatorGroups: [
      "template-interpretation"
    ],
    positiveAssertion: "Composition-specific correctness remains a named family boundary, but the current stack does not yet force a closable decomposition.",
    entityFamily: "OccurrenceKey(consultedContext, occurrenceAnchor, compositionSurface)",
    dependencies: [
      "admissibility-gate",
      "composition-contract"
    ],
    completenessConditions: "Open family. The bridge freezes the family as unresolved and carries the composition contract only as an open placeholder boundary.",
    degradationTarget: "Same composition boundary open via OpenBoundaryKey(...).",
    status: "open",
    incomingEdgeClasses: [
      "context-admission"
    ],
    sourceInputs: "Template AST",
    analysis: "Composition correctness (open family)",
    crossFamilyDependencies: [],
    correctnessConditions: "deferred-open. Evaluator creates CorrectnessFinding with claimKind='deferred-open' and an OpenBoundary"
  },
  {
    familyId: "correctness.9.structural-invalid",
    ordinal: 44,
    category: "correctness",
    nodeKind: "correctness-finding",
    keyConstructor: "OccurrenceKey(consultedContext, occurrenceAnchor, iteratorDeclaration)",
    stage: "7",
    producingEvaluatorGroups: [
      "template-interpretation"
    ],
    positiveAssertion: "An iterator-bearing site positively witnesses invalid header, option, or local-binding structure.",
    entityFamily: "OccurrenceKey(consultedContext, occurrenceAnchor, iteratorDeclaration)",
    dependencies: [
      "admissibility-gate",
      "classification",
      "grammar-shape-completeness",
      "binding-command-semantics-governed-closure",
      "realized-world-consultation"
    ],
    completenessConditions: "Violation-style family. grammar-shape-completeness must close before structural invalidity is safe, but no further completeness witness is needed for the witnessed violation.",
    degradationTarget: "OccurrenceKey(consultedContext, occurrenceAnchor, iteratorDeclaration), fact kind structural-invalid, state open via OpenBoundaryKey(...).",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "completeness",
      "context-admission",
      "reachability-scope"
    ],
    sourceInputs: "Template AST + CW(grammar-shape) + GovernedSemantic (BC semantics)",
    analysis: "Structural validity violation (e.g., invalid repeat syntax)",
    crossFamilyDependencies: [
      "witness.completeness.grammar-shape",
      "claim.governed.binding-command-semantics"
    ],
    correctnessConditions: "fails when grammar-shape CW satisfied AND BC semantics close AND structure invalid"
  },
  {
    familyId: "correctness.9.semantic-non-iterable",
    ordinal: 45,
    category: "correctness",
    nodeKind: "correctness-finding",
    keyConstructor: "RelationKey(OccurrenceKey(...), iterableExpression, semantic-non-iterable)",
    stage: "deferred",
    producingEvaluatorGroups: [
      "template-interpretation"
    ],
    positiveAssertion: "Iterator semantic non-iterability remains a named hard-negative family, but it is not currently closable.",
    entityFamily: "RelationKey(OccurrenceKey(consultedContext, occurrenceAnchor), iterableExpression, semantic-non-iterable)",
    dependencies: [
      "admissibility-gate",
      "classification",
      "type-closure-completeness",
      "realized-world-consultation"
    ],
    completenessConditions: "Deferred family. Hard negative non-iterability would require a type-closure boundary strong enough to rule out runtime-extensible repeatable handlers.",
    degradationTarget: "RelationKey(OccurrenceKey(consultedContext, occurrenceAnchor), iterableExpression, semantic-non-iterable), state open via OpenBoundaryKey(...).",
    status: "deferred",
    incomingEdgeClasses: [
      "completeness",
      "context-admission"
    ],
    sourceInputs: "PC + type analysis + CW(type-closure)",
    analysis: "repeat.for target is provably non-iterable",
    crossFamilyDependencies: [
      "witness.completeness.type-closure"
    ],
    correctnessConditions: "deferred-open. Requires type-closure CW (open placeholder). PROVISIONAL"
  },
  {
    familyId: "witness.boundary.open-boundary",
    ordinal: 46,
    category: "witness-completeness",
    nodeKind: "open-boundary",
    keyConstructor: "OpenBoundaryKey(targetFamilyId, subjectKey, blockedDependency)",
    stage: "any",
    producingEvaluatorGroups: [
      "subject-convergence",
      "admission",
      "scope",
      "template-interpretation"
    ],
    positiveAssertion: "The stronger claim boundary is explicitly open because a required dependency failed, remained unevaluated, or retreated.",
    entityFamily: "OpenBoundaryKey(targetFamilyId, subjectKey, blockedDependency)",
    dependencies: [
      "open-boundary"
    ],
    completenessConditions: "This row is itself the honest-open state. It never asserts absence and never substitutes for a closed negative claim.",
    degradationTarget: "none; terminal honest-open state",
    status: "attractor-derived",
    incomingEdgeClasses: []
  },
  {
    familyId: "witness.declaration.declaration-surface",
    ordinal: 47,
    category: "witness-completeness",
    nodeKind: "witness",
    keyConstructor: "DeclarationWitnessKey(subjectKey, declarationFormSet)",
    stage: "2-4",
    producingEvaluatorGroups: [
      "observation",
      "subject-convergence"
    ],
    positiveAssertion: "The relevant declaration search space is closed enough to license declaration-sensitive negatives and provenance-sensitive identity facts.",
    entityFamily: "DeclarationWitnessKey(subjectKey, declarationFormSet)",
    dependencies: [
      "declaration-surface",
      "realized-world-consultation"
    ],
    completenessConditions: "This row is itself the standalone declaration-surface witness used by identity, field, and interface rows.",
    degradationTarget: "DeclarationWitnessKey(subjectKey, declarationFormSet), state open via OpenBoundaryKey(...).",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "Declaration surface inventory for resource kind",
    analysis: "All applicable surfaces searched?",
    output: "witnessState: satisfied/unsatisfied",
    crossFamilyDependencies: []
  },
  {
    familyId: "witness.support.support-bundle",
    ordinal: 48,
    category: "witness-completeness",
    nodeKind: "witness",
    keyConstructor: "SupportBundleKey(targetFamilyId, subjectKey)",
    stage: "any",
    producingEvaluatorGroups: [
      "subject-convergence"
    ],
    positiveAssertion: "The exact support bundle required for a consuming fact is closed.",
    entityFamily: "SupportBundleKey(targetFamilyId, subjectKey)",
    dependencies: [
      "support-bundle",
      "realized-world-consultation"
    ],
    completenessConditions: "Positive-only witness family. Negative or exhaustive consumers must add their own completeness witness.",
    degradationTarget: "SupportBundleKey(targetFamilyId, subjectKey), state open via OpenBoundaryKey(...).",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "Support edge inventory for target fact",
    analysis: "All required support present?",
    output: "witnessState: satisfied/unsatisfied",
    crossFamilyDependencies: []
  },
  {
    familyId: "witness.completeness.grammar-shape",
    ordinal: 49,
    category: "witness-completeness",
    nodeKind: "completeness-witness",
    keyConstructor: "CompletenessKey(consultedContext+grammarShapeSurface, grammar-shape)",
    stage: "7",
    producingEvaluatorGroups: [
      "template-interpretation"
    ],
    positiveAssertion: "The consulted grammar-shape surface is fixed enough for honest closed-world classification.",
    entityFamily: "CompletenessKey(consultedContext + grammarShapeSurface, grammar-shape)",
    dependencies: [
      "grammar-shape-completeness",
      "realized-world-consultation"
    ],
    completenessConditions: "This row is the completeness witness for negative position classification and grammar-sensitive structural consumers.",
    degradationTarget: "CompletenessKey(consultedContext + grammarShapeSurface, grammar-shape), state open via OpenBoundaryKey(...).",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "Grammar-shape surface inventory",
    analysis: "Is grammar-shape surface fixed for this context?",
    output: "witnessState",
    crossFamilyDependencies: [],
    correctnessConditions: "N/A"
  },
  {
    familyId: "witness.completeness.resource-admission",
    ordinal: 50,
    category: "witness-completeness",
    nodeKind: "completeness-witness",
    keyConstructor: "CompletenessKey(consultedWorld+resourceFamily, resource-admission)",
    stage: "5",
    producingEvaluatorGroups: [
      "admission"
    ],
    positiveAssertion: "The consulted resource-admission search space is closed enough to support safe negative admission claims.",
    entityFamily: "CompletenessKey(consultedWorld + resourceFamily, resource-admission)",
    dependencies: [
      "resource-admission-completeness",
      "realized-world-consultation"
    ],
    completenessConditions: "This row is the completeness witness for negative resource-admission and resource-backed absence claims.",
    degradationTarget: "CompletenessKey(consultedWorld + resourceFamily, resource-admission), state open via OpenBoundaryKey(...).",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "Registration surface inventory",
    analysis: "All surfaces for this resource family in this world searched?",
    output: "witnessState",
    crossFamilyDependencies: [
      "claim.availability.resource-admission"
    ],
    correctnessConditions: "N/A"
  },
  {
    familyId: "witness.completeness.vocabulary-admission",
    ordinal: 51,
    category: "witness-completeness",
    nodeKind: "completeness-witness",
    keyConstructor: "CompletenessKey(consultedWorld+vocabularyFamily, vocabulary-admission)",
    stage: "5",
    producingEvaluatorGroups: [
      "admission"
    ],
    positiveAssertion: "The consulted vocabulary-admission search space is closed enough to support safe negative admission claims.",
    entityFamily: "CompletenessKey(consultedWorld + vocabularyFamily, vocabulary-admission)",
    dependencies: [
      "vocabulary-admission-completeness",
      "realized-world-consultation"
    ],
    completenessConditions: "This row is the completeness witness for negative vocabulary-admission and vocabulary-entry absence claims.",
    degradationTarget: "CompletenessKey(consultedWorld + vocabularyFamily, vocabulary-admission), state open via OpenBoundaryKey(...).",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "Vocabulary source inventory",
    analysis: "All vocabulary sources for this family in this world searched?",
    output: "witnessState",
    crossFamilyDependencies: [
      "claim.availability.vocabulary-admission"
    ],
    correctnessConditions: "N/A"
  },
  {
    familyId: "witness.completeness.resource-scope",
    ordinal: 52,
    category: "witness-completeness",
    nodeKind: "completeness-witness",
    keyConstructor: "CompletenessKey(consultedContext+resourceScopeBoundary, resource-scope)",
    stage: "6",
    producingEvaluatorGroups: [
      "scope"
    ],
    positiveAssertion: "The local-or-root reachable resource world is closed enough to support safe negative reachability claims at a site.",
    entityFamily: "CompletenessKey(consultedContext + resourceScopeBoundary, resource-scope)",
    dependencies: [
      "resource-scope-completeness",
      "realized-world-consultation"
    ],
    completenessConditions: "This row is the completeness witness for negative resource-scope reachability and resource-scope absence claims.",
    degradationTarget: "CompletenessKey(consultedContext + resourceScopeBoundary, resource-scope), state open via OpenBoundaryKey(...).",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "Container registration inventory",
    analysis: "All containers in lookup path searched?",
    output: "witnessState",
    crossFamilyDependencies: [
      "claim.reachability.resource-scope"
    ]
  },
  {
    familyId: "witness.completeness.template-scope",
    ordinal: 53,
    category: "witness-completeness",
    nodeKind: "completeness-witness",
    keyConstructor: "CompletenessKey(consultedContext+templateScopeBoundary, template-scope)",
    stage: "6",
    producingEvaluatorGroups: [
      "scope"
    ],
    positiveAssertion: "The contributing template-scope frame world is closed enough to support safe negative identifier-resolution claims at a site.",
    entityFamily: "CompletenessKey(consultedContext + templateScopeBoundary, template-scope)",
    dependencies: [
      "template-scope-completeness",
      "realized-world-consultation"
    ],
    completenessConditions: "This row is the completeness witness for negative template-scope resolution claims.",
    degradationTarget: "CompletenessKey(consultedContext + templateScopeBoundary, template-scope), state open via OpenBoundaryKey(...).",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "Scope-frame contributor inventory",
    analysis: "All scope contributors at position known?",
    output: "witnessState",
    crossFamilyDependencies: [
      "claim.reachability.template-scope"
    ]
  },
  {
    familyId: "witness.completeness.type-closure",
    ordinal: 54,
    category: "witness-completeness",
    nodeKind: "completeness-witness",
    keyConstructor: "CompletenessKey(consultedContext+typeClosureBoundary, type-closure)",
    stage: "open",
    producingEvaluatorGroups: [
      "template-interpretation"
    ],
    positiveAssertion: "The type-closure witness required for hard-negative type-dependent claims is named, but not yet committed as a closable mechanism.",
    entityFamily: "CompletenessKey(consultedContext + typeClosureBoundary, type-closure)",
    dependencies: [
      "type-closure-completeness"
    ],
    completenessConditions: "Open placeholder. Required by rows such as correctness.4.type-contradiction and correctness.9.semantic-non-iterable, but no committed closure source currently closes it.",
    degradationTarget: "CompletenessKey(consultedContext + typeClosureBoundary, type-closure), state open via OpenBoundaryKey(...).",
    status: "open",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "Type analysis surface",
    analysis: "Type-closure surface fixed?",
    crossFamilyDependencies: [],
    correctnessConditions: "Currently OPEN PLACEHOLDER: witnessState='unsatisfied', closability='open-placeholder'"
  },
  {
    familyId: "claim.governed.controller-semantics",
    ordinal: 55,
    category: "governed-semantic",
    nodeKind: "governed-semantic",
    keyConstructor: "GovernedSemanticKey(ResourceKey(custom-attribute, canonicalName), controller-semantics)",
    stage: "3",
    producingEvaluatorGroups: [
      "subject-convergence"
    ],
    positiveAssertion: "A controller-bearing custom attribute has a closed product-authored controller-semantics family.",
    entityFamily: "GovernedSemanticKey(ResourceKey(custom-attribute, canonicalName), controller-semantics)",
    dependencies: [
      "controller-semantics-governed-closure",
      "realized-world-consultation"
    ],
    completenessConditions: "Positive-only family. If the governing contract is absent, the family stays open rather than closing negatively.",
    degradationTarget: "claim.resource.controllerhood plus governed controller-semantics state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support"
    ],
    sourceInputs: "Product-authored TC contracts (built-in: if/repeat/with/switch/promise; Layer 1: user TCs)",
    analysis: "Match TC identity to contract; populate 5 slots",
    output: "closureState, governedSlots",
    crossFamilyDependencies: [
      "claim.identity.custom-attribute",
      "claim.resource.controllerhood"
    ],
    correctnessConditions: "N/A (governed closure, not correctness)"
  },
  {
    familyId: "claim.governed.binding-command-semantics",
    ordinal: 56,
    category: "governed-semantic",
    nodeKind: "governed-semantic",
    keyConstructor: "GovernedSemanticKey(ResourceKey(binding-command, canonicalName), binding-command-semantics)",
    stage: "3",
    producingEvaluatorGroups: [
      "subject-convergence"
    ],
    positiveAssertion: "A binding command has a closed product-authored binding-command-semantics family.",
    entityFamily: "GovernedSemanticKey(ResourceKey(binding-command, canonicalName), binding-command-semantics)",
    dependencies: [
      "binding-command-semantics-governed-closure",
      "classification",
      "realized-world-consultation"
    ],
    completenessConditions: "Positive-only family. If the governing contract is absent, the family stays open rather than closing negatively.",
    degradationTarget: "claim.identity.binding-command plus governed command-semantics state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support",
      "reachability-scope"
    ],
    sourceInputs: "Command definition objects",
    analysis: "Extract commandKind, expressionRequired, targetProperty",
    output: "closureState, governedSlots",
    crossFamilyDependencies: [
      "claim.identity.binding-command"
    ],
    correctnessConditions: "N/A"
  },
  {
    familyId: "claim.governed.attribute-pattern-semantics",
    ordinal: 57,
    category: "governed-semantic",
    nodeKind: "governed-semantic",
    keyConstructor: "GovernedSemanticKey(ResourceKey(attribute-pattern, pattern\\\\|symbols), attribute-pattern-semantics)",
    stage: "3",
    producingEvaluatorGroups: [
      "subject-convergence"
    ],
    positiveAssertion: "An attribute pattern has a closed product-authored attribute-pattern-semantics family.",
    entityFamily: "GovernedSemanticKey(ResourceKey(attribute-pattern, pattern|symbols), attribute-pattern-semantics)",
    dependencies: [
      "attribute-pattern-semantics-governed-closure",
      "classification",
      "realized-world-consultation"
    ],
    completenessConditions: "Positive-only family. If the governing contract is absent, the family stays open rather than closing negatively.",
    degradationTarget: "claim.identity.attribute-pattern plus governed pattern-semantics state open.",
    status: "attractor-derived",
    incomingEdgeClasses: [
      "support",
      "reachability-scope"
    ],
    sourceInputs: "Pattern registration",
    analysis: "Extract interpret, symbols",
    output: "closureState, governedSlots",
    crossFamilyDependencies: [
      "claim.identity.attribute-pattern"
    ],
    correctnessConditions: "N/A"
  }
] as const satisfies readonly ClaimFamilyDefinition[];
