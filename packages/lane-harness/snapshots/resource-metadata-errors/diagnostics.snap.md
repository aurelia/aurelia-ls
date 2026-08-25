# resource-metadata-errors diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/resource-metadata-errors`
Probe file: `packages/lane-harness/probes/resource-metadata-errors.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## resource-metadata-app-source

### Probe

```json
{
  "file": "src/resource-metadata-errors-app.ts"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 22,
  "diagnostics": [
    {
      "anomaly": null,
      "code": "TS2769",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "typescript",
        "diagnosticKind": "TS2769",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "semantic",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "typescript-diagnostics",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": 2769
      },
      "message": "No overload matches this call.\nOverload 1 of 3, '(definition: PartialCustomElementDefinition<string>): CustomElementDecorator', gave the following error.\nObject literal may only specify known properties, and 'type' does not exist in type 'IComponentBindablePropDefinition'.\nOverload 2 of 3, '(name: string): CustomElementDecorator', gave the following error.\nArgument of type '{ name: string; template: string; bindables: { name: string; type: NumberConstructor; }[]; }' is not assignable to parameter of type 'string'.\nOverload 3 of 3, '(nameOrDef: string | PartialCustomElementDefinition<string>): CustomElementDecorator', gave the following error.\nObject literal may only specify known properties, and 'type' does not exist in type 'IComponentBindablePropDefinition'.",
      "range": {
        "end": {
          "character": 14,
          "line": 9
        },
        "start": {
          "character": 1,
          "line": 9
        }
      },
      "rangeText": "customElement",
      "relatedInformation": [],
      "severity": "error",
      "source": "typescript"
    },
    {
      "anomaly": null,
      "code": "AUR0507",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-controller-framework-error",
        "frameworkErrorCode": "AUR0507",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-controller:AUR0507",
        "missingInputs": [
          "runtime-controller:AUR0507"
        ],
        "phase": "observer-setup",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "rewrite-template-syntax",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "template-syntax-rewrite",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "Observer for bindable property length does not support coercion.",
      "range": {
        "end": {
          "character": 46,
          "line": 12
        },
        "start": {
          "character": 14,
          "line": 12
        }
      },
      "rangeText": "{ name: 'length', type: Number }",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0772",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "watch-null-config",
        "frameworkErrorCode": "AUR0772",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "watch-decorator",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": {
          "source": {
            "end": 397,
            "kind": "source-span-address",
            "label": "src/resource-metadata-errors-app.ts@372..397",
            "path": "src/resource-metadata-errors-app.ts",
            "role": "value",
            "start": 372
          },
          "span": null,
          "subjectKind": "custom-element",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "@watch requires a non-null expression or property key.",
      "range": {
        "end": {
          "character": 32,
          "line": 18
        },
        "start": {
          "character": 7,
          "line": 18
        }
      },
      "rangeText": "null as unknown as string",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "TS2769",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "typescript",
        "diagnosticKind": "TS2769",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "semantic",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "typescript-diagnostics",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": 2769
      },
      "message": "No overload matches this call.\nOverload 1 of 3, '(expressionOrPropertyAccessFn: PropertyKey, changeHandlerOrCallback: \"nameChanged\" | IWatcherCallback<ResourceMetadataErrorsApp, unknown>, options?: IWatchOptions | undefined): WatchClassDecorator<...>', gave the following error.\nArgument of type '\"missingPrototypeHandler\"' is not assignable to parameter of type '\"nameChanged\" | IWatcherCallback<ResourceMetadataErrorsApp, unknown>'.\nOverload 2 of 3, '(expressionOrPropertyAccessFn: IDepCollectionFn<ResourceMetadataErrorsApp, unknown>, changeHandlerOrCallback: \"nameChanged\" | IWatcherCallback<ResourceMetadataErrorsApp, unknown>, options?: IWatchOptions | undefined): WatchClassDecorator<...>', gave the following error.\nArgument of type 'string' is not assignable to parameter of type 'IDepCollectionFn<ResourceMetadataErrorsApp, unknown>'.\nOverload 3 of 3, '(expressionOrPropertyAccessFn: PropertyKey | IDepCollectionFn<typeof ResourceMetadataErrorsApp, unknown>, options?: IWatchOptions | undefined): WatchMethodDecorator<...>', gave the following error.\nType '\"missingPrototypeHandler\"' has no properties in common with type 'IWatchOptions'.",
      "range": {
        "end": {
          "character": 6,
          "line": 19
        },
        "start": {
          "character": 1,
          "line": 19
        }
      },
      "rangeText": "watch",
      "relatedInformation": [],
      "severity": "error",
      "source": "typescript"
    },
    {
      "anomaly": null,
      "code": "AUR0773",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "watch-invalid-change-handler",
        "frameworkErrorCode": "AUR0773",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "watch-decorator",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": {
          "source": {
            "end": 453,
            "kind": "source-span-address",
            "label": "src/resource-metadata-errors-app.ts@430..453",
            "path": "src/resource-metadata-errors-app.ts",
            "role": "value",
            "start": 430
          },
          "span": null,
          "subjectKind": "custom-element",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Class @watch callback 'missingPrototypeHandler' is not present on the resource prototype.",
      "range": {
        "end": {
          "character": 39,
          "line": 19
        },
        "start": {
          "character": 16,
          "line": 19
        }
      },
      "rangeText": "missingPrototypeHandler",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0506",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "controller-watch-invalid-callback",
        "frameworkErrorCode": "AUR0506",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "watch-metadata",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": {
          "source": {
            "end": 814,
            "kind": "source-span-address",
            "label": "src/resource-metadata-errors-app.ts@789..814",
            "path": "src/resource-metadata-errors-app.ts",
            "role": "value",
            "start": 789
          },
          "span": null,
          "subjectKind": "custom-element",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Watch callback 'missingStaticWatchHandler' is not declared on the resource instance.",
      "range": {
        "end": {
          "character": 62,
          "line": 27
        },
        "start": {
          "character": 37,
          "line": 27
        }
      },
      "rangeText": "missingStaticWatchHandler",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0506",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "controller-watch-invalid-callback",
        "frameworkErrorCode": "AUR0506",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "watch-metadata",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": {
          "source": {
            "end": 909,
            "kind": "source-span-address",
            "label": "src/resource-metadata-errors-app.ts@880..909",
            "path": "src/resource-metadata-errors-app.ts",
            "role": "value",
            "start": 880
          },
          "span": null,
          "subjectKind": "custom-element",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Watch callback 'nonCallableStaticWatchHandler' is not callable on the resource instance.",
      "range": {
        "end": {
          "character": 66,
          "line": 28
        },
        "start": {
          "character": 37,
          "line": 28
        }
      },
      "rangeText": "nonCallableStaticWatchHandler",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "TS1240",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "typescript",
        "diagnosticKind": "TS1240",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "semantic",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "typescript-diagnostics",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": 1240
      },
      "message": "Unable to resolve signature of property decorator when called as an expression.\nArgument of type 'undefined' is not assignable to parameter of type 'WatchableMethod<ResourceMetadataErrorsApp, unknown, unknown>'.",
      "range": {
        "end": {
          "character": 16,
          "line": 36
        },
        "start": {
          "character": 3,
          "line": 36
        }
      },
      "rangeText": "watch('name')",
      "relatedInformation": [],
      "severity": "error",
      "source": "typescript"
    },
    {
      "anomaly": null,
      "code": "AUR0774",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "watch-non-method-decorator-usage",
        "frameworkErrorCode": "AUR0774",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "watch-decorator",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": {
          "source": {
            "end": 1066,
            "kind": "source-span-address",
            "label": "src/resource-metadata-errors-app.ts@1054..1066",
            "path": "src/resource-metadata-errors-app.ts",
            "role": "name",
            "start": 1054
          },
          "span": null,
          "subjectKind": "custom-element",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "The @watch decorator can only be used on instance methods.",
      "range": {
        "end": {
          "character": 14,
          "line": 37
        },
        "start": {
          "character": 2,
          "line": 37
        }
      },
      "rangeText": "fieldWatcher",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0774",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "watch-non-method-decorator-usage",
        "frameworkErrorCode": "AUR0774",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "watch-decorator",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": {
          "source": {
            "end": 1125,
            "kind": "source-span-address",
            "label": "src/resource-metadata-errors-app.ts@1112..1125",
            "path": "src/resource-metadata-errors-app.ts",
            "role": "name",
            "start": 1112
          },
          "span": null,
          "subjectKind": "custom-element",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "The @watch decorator can only be used on instance methods.",
      "range": {
        "end": {
          "character": 22,
          "line": 40
        },
        "start": {
          "character": 9,
          "line": 40
        }
      },
      "rangeText": "staticWatcher",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0501",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "controller-no-shadow-on-containerless",
        "frameworkErrorCode": "AUR0501",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "custom-element-definition",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": {
          "source": {
            "end": 1288,
            "kind": "source-span-address",
            "label": "src/resource-metadata-errors-app.ts@1275..1288",
            "path": "src/resource-metadata-errors-app.ts",
            "role": "value",
            "start": 1275
          },
          "span": null,
          "subjectKind": "custom-element",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Containerless custom elements cannot request Shadow DOM or slot projection.",
      "range": {
        "end": {
          "character": 15,
          "line": 47
        },
        "start": {
          "character": 2,
          "line": 47
        }
      },
      "rangeText": "shadowOptions",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0717",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "template-compiler-error",
        "frameworkErrorCode": "AUR0717",
        "frameworkRawErrorAuthority": null,
        "missingInput": "template-compiler:AUR0717",
        "missingInputs": [
          "template-compiler:AUR0717"
        ],
        "phase": "compiled-template",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "template-diagnostics",
        "repairAffordance": {
          "actionKind": "rewrite-template-syntax",
          "actionability": "guided",
          "changeDomain": "app-source",
          "planKind": "template-syntax-rewrite",
          "readiness": "ready-to-plan",
          "targetSourceCoverage": "all"
        },
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": null
      },
      "message": "Detected a usage of \"<slot>\" element without specifying shadow DOM options in element: containerless-slot-conflict.",
      "range": {
        "end": {
          "character": 36,
          "line": 53
        },
        "start": {
          "character": 23,
          "line": 53
        }
      },
      "rangeText": "<slot></slot>",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0501",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "controller-no-shadow-on-containerless",
        "frameworkErrorCode": "AUR0501",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "custom-element-definition",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": {
          "source": {
            "end": 1495,
            "kind": "source-span-address",
            "label": "src/resource-metadata-errors-app.ts@1487..1495",
            "path": "src/resource-metadata-errors-app.ts",
            "role": "value",
            "start": 1487
          },
          "span": null,
          "subjectKind": "custom-element",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Containerless custom elements cannot request Shadow DOM or slot projection.",
      "range": {
        "end": {
          "character": 10,
          "line": 55
        },
        "start": {
          "character": 2,
          "line": 55
        }
      },
      "rangeText": "hasSlots",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0228",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "invalid-bindable-decorator-usage-class-without-configuration",
        "frameworkErrorCode": "AUR0228",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "bindable-decorator",
        "presentation": {
          "contextual": [
            {
              "diagnostic": {
                "diagnosticAuthority": "typescript",
                "diagnosticDomain": "typescript",
                "diagnosticKind": "TS2769",
                "frameworkErrorCode": null,
                "frameworkRawErrorAuthority": null,
                "missingInput": null,
                "missingInputs": [],
                "phase": "semantic",
                "relatedInformation": [],
                "relatedQueryKind": "typescript-diagnostics",
                "repairAffordance": null,
                "severity": "error",
                "sourceRole": "app-source",
                "subject": null,
                "typeScriptDiagnosticCode": 2769
              },
              "relation": "checker-evidence"
            }
          ],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 2
        },
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": {
          "source": {
            "end": 1594,
            "kind": "source-span-address",
            "label": "src/resource-metadata-errors-app.ts@1559..1594",
            "path": "src/resource-metadata-errors-app.ts",
            "role": "value",
            "start": 1559
          },
          "span": null,
          "subjectKind": "custom-element",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Class-level @bindable cannot use a null configuration.",
      "range": {
        "end": {
          "character": 45,
          "line": 59
        },
        "start": {
          "character": 10,
          "line": 59
        }
      },
      "rangeText": "null as unknown as { name: string }",
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/resource-metadata-errors-app.ts",
          "message": "No overload matches this call.\nOverload 1 of 4, '(config?: Omit<PartialBindableDefinition, \"name\"> | undefined): (target: unknown, context: ClassDecoratorContext<abstract new (...args: any) => any> | ClassFieldDecoratorContext<...> | ClassGetterDecoratorContext<...>) => void', gave the following error.\nType '{ name: string; }' has no properties in common with type 'Omit<PartialBindableDefinition, \"name\">'.\nOverload 2 of 4, '(prop: string): (target: Constructable, context: ClassDecoratorContext<abstract new (...args: any) => any>) => void', gave the following error.\nArgument of type '{ name: string; }' is not assignable to parameter of type 'string'.",
          "range": {
            "end": {
              "character": 45,
              "line": 59
            },
            "start": {
              "character": 10,
              "line": 59
            }
          },
          "rangeText": "null as unknown as { name: string }",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        }
      ],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0229",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "invalid-bindable-decorator-usage-class-without-property-name-configuration",
        "frameworkErrorCode": "AUR0229",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "bindable-decorator",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": {
          "source": {
            "end": 1748,
            "kind": "source-span-address",
            "label": "src/resource-metadata-errors-app.ts@1746..1748",
            "path": "src/resource-metadata-errors-app.ts",
            "role": "value",
            "start": 1746
          },
          "span": null,
          "subjectKind": "custom-element",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Class-level @bindable must provide a property name in its configuration.",
      "range": {
        "end": {
          "character": 12,
          "line": 66
        },
        "start": {
          "character": 10,
          "line": 66
        }
      },
      "rangeText": "{}",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "TS2769",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "typescript",
        "diagnosticKind": "TS2769",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "semantic",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "typescript-diagnostics",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": null,
        "typeScriptDiagnosticCode": 2769
      },
      "message": "No overload matches this call.\nOverload 1 of 4, '(config?: Omit<PartialBindableDefinition, \"name\"> | undefined): (target: unknown, context: ClassDecoratorContext<abstract new (...args: any) => any> | ClassFieldDecoratorContext<...> | ClassGetterDecoratorContext<...>) => void', gave the following error.\nObject literal may only specify known properties, and 'name' does not exist in type 'Omit<PartialBindableDefinition, \"name\">'.\nOverload 2 of 4, '(prop: string): (target: Constructable, context: ClassDecoratorContext<abstract new (...args: any) => any>) => void', gave the following error.\nArgument of type '{ name: string; }' is not assignable to parameter of type 'string'.",
      "range": {
        "end": {
          "character": 9,
          "line": 73
        },
        "start": {
          "character": 1,
          "line": 73
        }
      },
      "rangeText": "bindable",
      "relatedInformation": [],
      "severity": "error",
      "source": "typescript"
    },
    {
      "anomaly": null,
      "code": "AUR0227",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "invalid-bindable-decorator-usage-symbol",
        "frameworkErrorCode": "AUR0227",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "bindable-decorator",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": {
          "source": {
            "end": 1908,
            "kind": "source-span-address",
            "label": "src/resource-metadata-errors-app.ts@1904..1908",
            "path": "src/resource-metadata-errors-app.ts",
            "role": "value",
            "start": 1904
          },
          "span": null,
          "subjectKind": "custom-element",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Class-level @bindable property names must be strings.",
      "range": {
        "end": {
          "character": 16,
          "line": 73
        },
        "start": {
          "character": 12,
          "line": 73
        }
      },
      "rangeText": "name",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0227",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "invalid-bindable-decorator-usage-symbol",
        "frameworkErrorCode": "AUR0227",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "bindable-decorator",
        "presentation": {
          "contextual": [
            {
              "diagnostic": {
                "diagnosticAuthority": "typescript",
                "diagnosticDomain": "typescript",
                "diagnosticKind": "TS1166",
                "frameworkErrorCode": null,
                "frameworkRawErrorAuthority": null,
                "missingInput": null,
                "missingInputs": [],
                "phase": "semantic",
                "relatedInformation": [],
                "relatedQueryKind": "typescript-diagnostics",
                "repairAffordance": null,
                "severity": "error",
                "sourceRole": "app-source",
                "subject": null,
                "typeScriptDiagnosticCode": 1166
              },
              "relation": "checker-evidence"
            }
          ],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 2
        },
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": {
          "source": {
            "end": 2286,
            "kind": "source-span-address",
            "label": "src/resource-metadata-errors-app.ts@2232..2286",
            "path": "src/resource-metadata-errors-app.ts",
            "role": "name",
            "start": 2232
          },
          "span": null,
          "subjectKind": "custom-element",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "@bindable cannot target a symbol or computed property name.",
      "range": {
        "end": {
          "character": 56,
          "line": 86
        },
        "start": {
          "character": 2,
          "line": 86
        }
      },
      "rangeText": "[Symbol.for('semantic-runtime.invalid-bindable-name')]",
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/resource-metadata-errors-app.ts",
          "message": "A computed property name in a class property declaration must have a simple literal type or a 'unique symbol' type.",
          "range": {
            "end": {
              "character": 56,
              "line": 86
            },
            "start": {
              "character": 2,
              "line": 86
            }
          },
          "rangeText": "[Symbol.for('semantic-runtime.invalid-bindable-name')]",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        }
      ],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0766",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "invalid-process-content-hook",
        "frameworkErrorCode": "AUR0766",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "process-content-decorator",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": {
          "source": {
            "end": 2334,
            "kind": "source-span-address",
            "label": "src/resource-metadata-errors-app.ts@2313..2334",
            "path": "src/resource-metadata-errors-app.ts",
            "role": "value",
            "start": 2313
          },
          "span": null,
          "subjectKind": "custom-element",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "Class-level @processContent did not resolve to a static function hook.",
      "range": {
        "end": {
          "character": 38,
          "line": 89
        },
        "start": {
          "character": 17,
          "line": 89
        }
      },
      "rangeText": "missingProcessContent",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR0766",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "invalid-process-content-hook",
        "frameworkErrorCode": "AUR0766",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "process-content-decorator",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": {
          "source": {
            "end": 2675,
            "kind": "source-span-address",
            "label": "src/resource-metadata-errors-app.ts@2661..2675",
            "path": "src/resource-metadata-errors-app.ts",
            "role": "name",
            "start": 2661
          },
          "span": null,
          "subjectKind": "custom-element",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "@processContent() must decorate a static method when used as a method decorator.",
      "range": {
        "end": {
          "character": 16,
          "line": 102
        },
        "start": {
          "character": 2,
          "line": 102
        }
      },
      "rangeText": "processContent",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR9989",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "children-invalid-query",
        "frameworkErrorCode": "AUR9989",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "children-decorator",
        "presentation": {
          "contextual": [],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 1
        },
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": {
          "source": {
            "end": 2836,
            "kind": "source-span-address",
            "label": "src/resource-metadata-errors-app.ts@2831..2836",
            "path": "src/resource-metadata-errors-app.ts",
            "role": "value",
            "start": 2831
          },
          "span": null,
          "subjectKind": "custom-element",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "@children query 'article > section' is rejected by Aurelia because it contains whitespace or '>'.",
      "range": {
        "end": {
          "character": 19,
          "line": 110
        },
        "start": {
          "character": 14,
          "line": 110
        }
      },
      "rangeText": "query",
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    },
    {
      "anomaly": null,
      "code": "AUR9990",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "slotted-decorator-invalid-usage",
        "frameworkErrorCode": "AUR9990",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "phase": "slotted-decorator",
        "presentation": {
          "contextual": [
            {
              "diagnostic": {
                "diagnosticAuthority": "typescript",
                "diagnosticDomain": "typescript",
                "diagnosticKind": "TS1241",
                "frameworkErrorCode": null,
                "frameworkRawErrorAuthority": null,
                "missingInput": null,
                "missingInputs": [],
                "phase": "semantic",
                "relatedInformation": [],
                "relatedQueryKind": "typescript-diagnostics",
                "repairAffordance": null,
                "severity": "error",
                "sourceRole": "app-source",
                "subject": null,
                "typeScriptDiagnosticCode": 1241
              },
              "relation": "checker-evidence"
            },
            {
              "diagnostic": {
                "diagnosticAuthority": "typescript",
                "diagnosticDomain": "typescript",
                "diagnosticKind": "TS1270",
                "frameworkErrorCode": null,
                "frameworkRawErrorAuthority": null,
                "missingInput": null,
                "missingInputs": [],
                "phase": "semantic",
                "relatedInformation": [],
                "relatedQueryKind": "typescript-diagnostics",
                "repairAffordance": null,
                "severity": "error",
                "sourceRole": "app-source",
                "subject": null,
                "typeScriptDiagnosticCode": 1270
              },
              "relation": "checker-evidence"
            }
          ],
          "maxRawSeverity": "error",
          "primarySeverity": "error",
          "rawRowCount": 3
        },
        "relatedInformation": [],
        "relatedQueryKind": "resource-issues",
        "repairAffordance": null,
        "sourceRole": "app-source",
        "subject": {
          "source": {
            "end": 3055,
            "kind": "source-span-address",
            "label": "src/resource-metadata-errors-app.ts@3045..3055",
            "path": "src/resource-metadata-errors-app.ts",
            "role": "name",
            "start": 3045
          },
          "span": null,
          "subjectKind": "custom-element",
          "uri": null
        },
        "typeScriptDiagnosticCode": null
      },
      "message": "@slotted can only decorate a class field.",
      "range": {
        "end": {
          "character": 12,
          "line": 119
        },
        "start": {
          "character": 2,
          "line": 119
        }
      },
      "rangeText": "@slotted()",
      "relatedInformation": [
        {
          "anomaly": null,
          "file": "src/resource-metadata-errors-app.ts",
          "message": "Unable to resolve signature of method decorator when called as an expression.\nArgument of type '() => void' is not assignable to parameter of type 'undefined'.",
          "range": {
            "end": {
              "character": 12,
              "line": 119
            },
            "start": {
              "character": 3,
              "line": 119
            }
          },
          "rangeText": "slotted()",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "anomaly": null,
          "file": "src/resource-metadata-errors-app.ts",
          "message": "Decorator function return type '(initialValue: any) => any' is not assignable to type 'void | (() => void)'.\nType '(initialValue: any) => any' is not assignable to type '() => void'.\nTarget signature provides too few arguments. Expected 1 or more, but got 0.",
          "range": {
            "end": {
              "character": 12,
              "line": 119
            },
            "start": {
              "character": 3,
              "line": 119
            }
          },
          "rangeText": "slotted()",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        }
      ],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
}
```

### textDocument/diagnostic — previousResultId reuse

```json
{
  "diagnosticCount": null,
  "diagnostics": [],
  "matchesPreviousResultId": true,
  "outcome": "unchanged",
  "previousResultIdPresent": true,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
}
```
