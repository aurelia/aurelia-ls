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

### publishDiagnostics

```json
{
  "diagnosticCount": 27,
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
        "relatedQueryKind": "typescript-diagnostics",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "expression",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
      "code": "TS2769",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "typescript",
        "diagnosticKind": "TS2769",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "relatedQueryKind": "typescript-diagnostics",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "expression",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
      "code": "TS1240",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "typescript",
        "diagnosticKind": "TS1240",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "relatedQueryKind": "typescript-diagnostics",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "expression",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Unable to resolve signature of property decorator when called as an expression.\nArgument of type 'undefined' is not assignable to parameter of type 'never'.",
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
      "code": "TS2769",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "typescript",
        "diagnosticKind": "TS2769",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "relatedQueryKind": "typescript-diagnostics",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "expression",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
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
      "relatedInformation": [],
      "severity": "error",
      "source": "typescript"
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
        "relatedQueryKind": "typescript-diagnostics",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "expression",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
      "code": "TS1166",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "typescript",
        "diagnosticKind": "TS1166",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "relatedQueryKind": "typescript-diagnostics",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "expression",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
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
      "relatedInformation": [],
      "severity": "error",
      "source": "typescript"
    },
    {
      "anomaly": null,
      "code": "TS1241",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "typescript",
        "diagnosticKind": "TS1241",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "relatedQueryKind": "typescript-diagnostics",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "expression",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
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
      "relatedInformation": [],
      "severity": "error",
      "source": "typescript"
    },
    {
      "anomaly": null,
      "code": "TS1270",
      "data": {
        "diagnosticAuthority": "typescript",
        "diagnosticDomain": "typescript",
        "diagnosticKind": "TS1270",
        "frameworkErrorCode": null,
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "relatedQueryKind": "typescript-diagnostics",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "expression",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
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
        "relatedQueryKind": "template-diagnostics",
        "subject": null,
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Aurelia runtime controller AUR0507 rejects this controller input: Observer for bindable property length does not support coercion..",
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
      "code": "AUR0508",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "template",
        "diagnosticKind": "runtime-controller-framework-error",
        "frameworkErrorCode": "AUR0508",
        "frameworkRawErrorAuthority": null,
        "missingInput": "runtime-controller:AUR0508",
        "missingInputs": [
          "runtime-controller:AUR0508"
        ],
        "relatedQueryKind": "template-diagnostics",
        "subject": null,
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Aurelia runtime controller AUR0508 rejects this controller input: Observer for property length does not support change handler..",
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
        "relatedQueryKind": "resource-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "resource-resolution",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
      "code": "AUR0773",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "watch-invalid-change-handler",
        "frameworkErrorCode": "AUR0773",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "relatedQueryKind": "resource-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "resource-resolution",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "relatedQueryKind": "resource-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "resource-resolution",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Watch callback 'missingStaticWatchHandler' is not declared on the resource instance.",
      "range": {
        "end": {
          "character": 89,
          "line": 27
        },
        "start": {
          "character": 4,
          "line": 27
        }
      },
      "rangeText": "{ expression: 'name', callback: 'missingStaticWatchHandler', flush: 'sync' as const }",
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
        "relatedQueryKind": "resource-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "resource-resolution",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Watch callback 'nonCallableStaticWatchHandler' is not callable on the resource instance.",
      "range": {
        "end": {
          "character": 94,
          "line": 28
        },
        "start": {
          "character": 4,
          "line": 28
        }
      },
      "rangeText": "{ expression: 'name', callback: 'nonCallableStaticWatchHandler', flush: 'async' as const }",
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
        "relatedQueryKind": "resource-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "resource-resolution",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "relatedQueryKind": "resource-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "resource-resolution",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "relatedQueryKind": "resource-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "resource-resolution",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "relatedQueryKind": "template-diagnostics",
        "subject": null,
        "taxonomy": {
          "actionability": "guided",
          "category": "template-syntax",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
      },
      "message": "Aurelia template compiler AUR0717 rejects this template syntax: Template compilation error: detected a usage of \"<slot>\" element without specifying shadow DOM options in element: containerless-slot-conflict.",
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
        "relatedQueryKind": "resource-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "resource-resolution",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "relatedQueryKind": "resource-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "resource-resolution",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
      "relatedInformation": [],
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
        "relatedQueryKind": "resource-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "resource-resolution",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
      "code": "AUR0227",
      "data": {
        "diagnosticAuthority": "framework-error-code",
        "diagnosticDomain": "resource",
        "diagnosticKind": "invalid-bindable-decorator-usage-symbol",
        "frameworkErrorCode": "AUR0227",
        "frameworkRawErrorAuthority": null,
        "missingInput": null,
        "missingInputs": [],
        "relatedQueryKind": "resource-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "resource-resolution",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "relatedQueryKind": "resource-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "resource-resolution",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "relatedQueryKind": "resource-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "resource-resolution",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "relatedQueryKind": "resource-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "resource-resolution",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "relatedQueryKind": "resource-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "resource-resolution",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
        "relatedQueryKind": "resource-issues",
        "subject": null,
        "taxonomy": {
          "actionability": "manual",
          "category": "resource-resolution",
          "confidence": null,
          "impact": "blocking",
          "schema": "diagnostics-taxonomy/1"
        }
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
      "relatedInformation": [],
      "severity": "error",
      "source": "aurelia"
    }
  ],
  "outcome": "published",
  "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
}
```

### aurelia/getDiagnostics

```json
{
  "fingerprint": "semantic-runtime:hit",
  "outcome": "result",
  "presentation": {
    "complete": true,
    "contextualCount": 0,
    "groups": [
      {
        "groupKey": "row:diagnostic:1:typescript:TS2769:typescript:no-framework-code:c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts:122:135:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "expression",
            "code": "TS2769",
            "data": {
              "diagnosticAuthority": "typescript",
              "diagnosticDomain": "typescript",
              "diagnosticKind": "TS2769",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "typescript-diagnostics",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS2769",
                "kind": "TS2769",
                "message": "No overload matches this call.\nOverload 1 of 3, '(definition: PartialCustomElementDefinition<string>): CustomElementDecorator', gave the following error.\nObject literal may only specify known properties, and 'type' does not exist in type 'IComponentBindablePropDefinition'.\nOverload 2 of 3, '(name: string): CustomElementDecorator', gave the following error.\nArgument of type '{ name: string; template: string; bindables: { name: string; type: NumberConstructor; }[]; }' is not assignable to parameter of type 'string'.\nOverload 3 of 3, '(nameOrDef: string | PartialCustomElementDefinition<string>): CustomElementDecorator', gave the following error.\nObject literal may only specify known properties, and 'type' does not exist in type 'IComponentBindablePropDefinition'."
              }
            ],
            "message": "No overload matches this call.\nOverload 1 of 3, '(definition: PartialCustomElementDefinition<string>): CustomElementDecorator', gave the following error.\nObject literal may only specify known properties, and 'type' does not exist in type 'IComponentBindablePropDefinition'.\nOverload 2 of 3, '(name: string): CustomElementDecorator', gave the following error.\nArgument of type '{ name: string; template: string; bindables: { name: string; type: NumberConstructor; }[]; }' is not assignable to parameter of type 'string'.\nOverload 3 of 3, '(nameOrDef: string | PartialCustomElementDefinition<string>): CustomElementDecorator', gave the following error.\nObject literal may only specify known properties, and 'type' does not exist in type 'IComponentBindablePropDefinition'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:typescript",
            "span": {
              "end": 135,
              "start": 122
            },
            "spanText": "customElement",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:1:typescript:TS2769:typescript:no-framework-code:c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts:122:135:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:7:typescript:TS2769:typescript:no-framework-code:c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts:415:420:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "expression",
            "code": "TS2769",
            "data": {
              "diagnosticAuthority": "typescript",
              "diagnosticDomain": "typescript",
              "diagnosticKind": "TS2769",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "typescript-diagnostics",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS2769",
                "kind": "TS2769",
                "message": "No overload matches this call.\nOverload 1 of 3, '(expressionOrPropertyAccessFn: PropertyKey, changeHandlerOrCallback: \"nameChanged\" | IWatcherCallback<ResourceMetadataErrorsApp, unknown>, options?: IWatchOptions | undefined): WatchClassDecorator<...>', gave the following error.\nArgument of type '\"missingPrototypeHandler\"' is not assignable to parameter of type '\"nameChanged\" | IWatcherCallback<ResourceMetadataErrorsApp, unknown>'.\nOverload 2 of 3, '(expressionOrPropertyAccessFn: IDepCollectionFn<ResourceMetadataErrorsApp, unknown>, changeHandlerOrCallback: \"nameChanged\" | IWatcherCallback<ResourceMetadataErrorsApp, unknown>, options?: IWatchOptions | undefined): WatchClassDecorator<...>', gave the following error.\nArgument of type 'string' is not assignable to parameter of type 'IDepCollectionFn<ResourceMetadataErrorsApp, unknown>'.\nOverload 3 of 3, '(expressionOrPropertyAccessFn: PropertyKey | IDepCollectionFn<typeof ResourceMetadataErrorsApp, unknown>, options?: IWatchOptions | undefined): WatchMethodDecorator<...>', gave the following error.\nType '\"missingPrototypeHandler\"' has no properties in common with type 'IWatchOptions'."
              }
            ],
            "message": "No overload matches this call.\nOverload 1 of 3, '(expressionOrPropertyAccessFn: PropertyKey, changeHandlerOrCallback: \"nameChanged\" | IWatcherCallback<ResourceMetadataErrorsApp, unknown>, options?: IWatchOptions | undefined): WatchClassDecorator<...>', gave the following error.\nArgument of type '\"missingPrototypeHandler\"' is not assignable to parameter of type '\"nameChanged\" | IWatcherCallback<ResourceMetadataErrorsApp, unknown>'.\nOverload 2 of 3, '(expressionOrPropertyAccessFn: IDepCollectionFn<ResourceMetadataErrorsApp, unknown>, changeHandlerOrCallback: \"nameChanged\" | IWatcherCallback<ResourceMetadataErrorsApp, unknown>, options?: IWatchOptions | undefined): WatchClassDecorator<...>', gave the following error.\nArgument of type 'string' is not assignable to parameter of type 'IDepCollectionFn<ResourceMetadataErrorsApp, unknown>'.\nOverload 3 of 3, '(expressionOrPropertyAccessFn: PropertyKey | IDepCollectionFn<typeof ResourceMetadataErrorsApp, unknown>, options?: IWatchOptions | undefined): WatchMethodDecorator<...>', gave the following error.\nType '\"missingPrototypeHandler\"' has no properties in common with type 'IWatchOptions'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:typescript",
            "span": {
              "end": 420,
              "start": 415
            },
            "spanText": "watch",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:7:typescript:TS2769:typescript:no-framework-code:c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts:415:420:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:0:typescript:TS1240:typescript:no-framework-code:c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts:1038:1051:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "expression",
            "code": "TS1240",
            "data": {
              "diagnosticAuthority": "typescript",
              "diagnosticDomain": "typescript",
              "diagnosticKind": "TS1240",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "typescript-diagnostics",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS1240",
                "kind": "TS1240",
                "message": "Unable to resolve signature of property decorator when called as an expression.\nArgument of type 'undefined' is not assignable to parameter of type 'never'."
              }
            ],
            "message": "Unable to resolve signature of property decorator when called as an expression.\nArgument of type 'undefined' is not assignable to parameter of type 'never'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:typescript",
            "span": {
              "end": 1051,
              "start": 1038
            },
            "spanText": "watch('name')",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:0:typescript:TS1240:typescript:no-framework-code:c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts:1038:1051:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:2:typescript:TS2769:typescript:no-framework-code:c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts:1559:1594:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "expression",
            "code": "TS2769",
            "data": {
              "diagnosticAuthority": "typescript",
              "diagnosticDomain": "typescript",
              "diagnosticKind": "TS2769",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "typescript-diagnostics",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS2769",
                "kind": "TS2769",
                "message": "No overload matches this call.\nOverload 1 of 4, '(config?: Omit<PartialBindableDefinition, \"name\"> | undefined): (target: unknown, context: ClassDecoratorContext<abstract new (...args: any) => any> | ClassFieldDecoratorContext<...> | ClassGetterDecoratorContext<...>) => void', gave the following error.\nType '{ name: string; }' has no properties in common with type 'Omit<PartialBindableDefinition, \"name\">'.\nOverload 2 of 4, '(prop: string): (target: Constructable, context: ClassDecoratorContext<abstract new (...args: any) => any>) => void', gave the following error.\nArgument of type '{ name: string; }' is not assignable to parameter of type 'string'."
              }
            ],
            "message": "No overload matches this call.\nOverload 1 of 4, '(config?: Omit<PartialBindableDefinition, \"name\"> | undefined): (target: unknown, context: ClassDecoratorContext<abstract new (...args: any) => any> | ClassFieldDecoratorContext<...> | ClassGetterDecoratorContext<...>) => void', gave the following error.\nType '{ name: string; }' has no properties in common with type 'Omit<PartialBindableDefinition, \"name\">'.\nOverload 2 of 4, '(prop: string): (target: Constructable, context: ClassDecoratorContext<abstract new (...args: any) => any>) => void', gave the following error.\nArgument of type '{ name: string; }' is not assignable to parameter of type 'string'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:typescript",
            "span": {
              "end": 1594,
              "start": 1559
            },
            "spanText": "null as unknown as { name: string }",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:2:typescript:TS2769:typescript:no-framework-code:c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts:1559:1594:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:3:typescript:TS2769:typescript:no-framework-code:c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts:1893:1901:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "expression",
            "code": "TS2769",
            "data": {
              "diagnosticAuthority": "typescript",
              "diagnosticDomain": "typescript",
              "diagnosticKind": "TS2769",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "typescript-diagnostics",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS2769",
                "kind": "TS2769",
                "message": "No overload matches this call.\nOverload 1 of 4, '(config?: Omit<PartialBindableDefinition, \"name\"> | undefined): (target: unknown, context: ClassDecoratorContext<abstract new (...args: any) => any> | ClassFieldDecoratorContext<...> | ClassGetterDecoratorContext<...>) => void', gave the following error.\nObject literal may only specify known properties, and 'name' does not exist in type 'Omit<PartialBindableDefinition, \"name\">'.\nOverload 2 of 4, '(prop: string): (target: Constructable, context: ClassDecoratorContext<abstract new (...args: any) => any>) => void', gave the following error.\nArgument of type '{ name: string; }' is not assignable to parameter of type 'string'."
              }
            ],
            "message": "No overload matches this call.\nOverload 1 of 4, '(config?: Omit<PartialBindableDefinition, \"name\"> | undefined): (target: unknown, context: ClassDecoratorContext<abstract new (...args: any) => any> | ClassFieldDecoratorContext<...> | ClassGetterDecoratorContext<...>) => void', gave the following error.\nObject literal may only specify known properties, and 'name' does not exist in type 'Omit<PartialBindableDefinition, \"name\">'.\nOverload 2 of 4, '(prop: string): (target: Constructable, context: ClassDecoratorContext<abstract new (...args: any) => any>) => void', gave the following error.\nArgument of type '{ name: string; }' is not assignable to parameter of type 'string'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:typescript",
            "span": {
              "end": 1901,
              "start": 1893
            },
            "spanText": "bindable",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:3:typescript:TS2769:typescript:no-framework-code:c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts:1893:1901:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:4:typescript:TS1166:typescript:no-framework-code:c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts:2232:2286:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "expression",
            "code": "TS1166",
            "data": {
              "diagnosticAuthority": "typescript",
              "diagnosticDomain": "typescript",
              "diagnosticKind": "TS1166",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "typescript-diagnostics",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS1166",
                "kind": "TS1166",
                "message": "A computed property name in a class property declaration must have a simple literal type or a 'unique symbol' type."
              }
            ],
            "message": "A computed property name in a class property declaration must have a simple literal type or a 'unique symbol' type.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:typescript",
            "span": {
              "end": 2286,
              "start": 2232
            },
            "spanText": "[Symbol.for('semantic-runtime.invalid-bindable-name')]",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:4:typescript:TS1166:typescript:no-framework-code:c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts:2232:2286:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:5:typescript:TS1241:typescript:no-framework-code:c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts:3046:3055:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "expression",
            "code": "TS1241",
            "data": {
              "diagnosticAuthority": "typescript",
              "diagnosticDomain": "typescript",
              "diagnosticKind": "TS1241",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "typescript-diagnostics",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS1241",
                "kind": "TS1241",
                "message": "Unable to resolve signature of method decorator when called as an expression.\nArgument of type '() => void' is not assignable to parameter of type 'undefined'."
              }
            ],
            "message": "Unable to resolve signature of method decorator when called as an expression.\nArgument of type '() => void' is not assignable to parameter of type 'undefined'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:typescript",
            "span": {
              "end": 3055,
              "start": 3046
            },
            "spanText": "slotted()",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:5:typescript:TS1241:typescript:no-framework-code:c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts:3046:3055:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:6:typescript:TS1270:typescript:no-framework-code:c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts:3046:3055:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "expression",
            "code": "TS1270",
            "data": {
              "diagnosticAuthority": "typescript",
              "diagnosticDomain": "typescript",
              "diagnosticKind": "TS1270",
              "frameworkErrorCode": null,
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "typescript-diagnostics",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "TS1270",
                "kind": "TS1270",
                "message": "Decorator function return type '(initialValue: any) => any' is not assignable to type 'void | (() => void)'.\nType '(initialValue: any) => any' is not assignable to type '() => void'.\nTarget signature provides too few arguments. Expected 1 or more, but got 0."
              }
            ],
            "message": "Decorator function return type '(initialValue: any) => any' is not assignable to type 'void | (() => void)'.\nType '(initialValue: any) => any' is not assignable to type '() => void'.\nTarget signature provides too few arguments. Expected 1 or more, but got 0.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:typescript",
            "span": {
              "end": 3055,
              "start": 3046
            },
            "spanText": "slotted()",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:6:typescript:TS1270:typescript:no-framework-code:c:/projects/aurelia-ls2/packages/semantic-runtime/fixtures/pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts:3046:3055:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:17:template:runtime-controller-framework-error:framework-error-code:AUR0507:src/resource-metadata-errors-app.ts:231:263:runtime-controller:AUR0507",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "relatedQueryKind": "template-diagnostics",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0507",
                "kind": "runtime-controller-framework-error",
                "message": "Aurelia runtime controller AUR0507 rejects this controller input: Observer for bindable property length does not support coercion.."
              }
            ],
            "message": "Aurelia runtime controller AUR0507 rejects this controller input: Observer for bindable property length does not support coercion..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 263,
              "start": 231
            },
            "spanText": "{ name: 'length', type: Number }",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:17:template:runtime-controller-framework-error:framework-error-code:AUR0507:src/resource-metadata-errors-app.ts:231:263:runtime-controller:AUR0507"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:18:template:runtime-controller-framework-error:framework-error-code:AUR0508:src/resource-metadata-errors-app.ts:231:263:runtime-controller:AUR0508",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
            "code": "AUR0508",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "template",
              "diagnosticKind": "runtime-controller-framework-error",
              "frameworkErrorCode": "AUR0508",
              "frameworkRawErrorAuthority": null,
              "missingInput": "runtime-controller:AUR0508",
              "missingInputs": [
                "runtime-controller:AUR0508"
              ],
              "relatedQueryKind": "template-diagnostics",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0508",
                "kind": "runtime-controller-framework-error",
                "message": "Aurelia runtime controller AUR0508 rejects this controller input: Observer for property length does not support change handler.."
              }
            ],
            "message": "Aurelia runtime controller AUR0508 rejects this controller input: Observer for property length does not support change handler..",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 263,
              "start": 231
            },
            "spanText": "{ name: 'length', type: Number }",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:18:template:runtime-controller-framework-error:framework-error-code:AUR0508:src/resource-metadata-errors-app.ts:231:263:runtime-controller:AUR0508"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:23:resource:watch-null-config:framework-error-code:AUR0772:src/resource-metadata-errors-app.ts:372:397:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "resource-resolution",
            "code": "AUR0772",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "resource",
              "diagnosticKind": "watch-null-config",
              "frameworkErrorCode": "AUR0772",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "resource-issues",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0772",
                "kind": "watch-null-config",
                "message": "@watch requires a non-null expression or property key."
              }
            ],
            "message": "@watch requires a non-null expression or property key.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:resource",
            "span": {
              "end": 397,
              "start": 372
            },
            "spanText": "null as unknown as string",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:23:resource:watch-null-config:framework-error-code:AUR0772:src/resource-metadata-errors-app.ts:372:397:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:24:resource:watch-invalid-change-handler:framework-error-code:AUR0773:src/resource-metadata-errors-app.ts:430:453:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "resource-resolution",
            "code": "AUR0773",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "resource",
              "diagnosticKind": "watch-invalid-change-handler",
              "frameworkErrorCode": "AUR0773",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "resource-issues",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0773",
                "kind": "watch-invalid-change-handler",
                "message": "Class @watch callback 'missingPrototypeHandler' is not present on the resource prototype."
              }
            ],
            "message": "Class @watch callback 'missingPrototypeHandler' is not present on the resource prototype.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:resource",
            "span": {
              "end": 453,
              "start": 430
            },
            "spanText": "missingPrototypeHandler",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:24:resource:watch-invalid-change-handler:framework-error-code:AUR0773:src/resource-metadata-errors-app.ts:430:453:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:25:resource:controller-watch-invalid-callback:framework-error-code:AUR0506:src/resource-metadata-errors-app.ts:756:841:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "resource-resolution",
            "code": "AUR0506",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "resource",
              "diagnosticKind": "controller-watch-invalid-callback",
              "frameworkErrorCode": "AUR0506",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "resource-issues",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0506",
                "kind": "controller-watch-invalid-callback",
                "message": "Watch callback 'missingStaticWatchHandler' is not declared on the resource instance."
              }
            ],
            "message": "Watch callback 'missingStaticWatchHandler' is not declared on the resource instance.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:resource",
            "span": {
              "end": 841,
              "start": 756
            },
            "spanText": "{ expression: 'name', callback: 'missingStaticWatchHandler', flush: 'sync' as const }",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:25:resource:controller-watch-invalid-callback:framework-error-code:AUR0506:src/resource-metadata-errors-app.ts:756:841:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:26:resource:controller-watch-invalid-callback:framework-error-code:AUR0506:src/resource-metadata-errors-app.ts:847:937:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "resource-resolution",
            "code": "AUR0506",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "resource",
              "diagnosticKind": "controller-watch-invalid-callback",
              "frameworkErrorCode": "AUR0506",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "resource-issues",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0506",
                "kind": "controller-watch-invalid-callback",
                "message": "Watch callback 'nonCallableStaticWatchHandler' is not callable on the resource instance."
              }
            ],
            "message": "Watch callback 'nonCallableStaticWatchHandler' is not callable on the resource instance.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:resource",
            "span": {
              "end": 937,
              "start": 847
            },
            "spanText": "{ expression: 'name', callback: 'nonCallableStaticWatchHandler', flush: 'async' as const }",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:26:resource:controller-watch-invalid-callback:framework-error-code:AUR0506:src/resource-metadata-errors-app.ts:847:937:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:8:resource:watch-non-method-decorator-usage:framework-error-code:AUR0774:src/resource-metadata-errors-app.ts:1054:1066:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "resource-resolution",
            "code": "AUR0774",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "resource",
              "diagnosticKind": "watch-non-method-decorator-usage",
              "frameworkErrorCode": "AUR0774",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "resource-issues",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0774",
                "kind": "watch-non-method-decorator-usage",
                "message": "The @watch decorator can only be used on instance methods."
              }
            ],
            "message": "The @watch decorator can only be used on instance methods.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:resource",
            "span": {
              "end": 1066,
              "start": 1054
            },
            "spanText": "fieldWatcher",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:8:resource:watch-non-method-decorator-usage:framework-error-code:AUR0774:src/resource-metadata-errors-app.ts:1054:1066:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:9:resource:watch-non-method-decorator-usage:framework-error-code:AUR0774:src/resource-metadata-errors-app.ts:1112:1125:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "resource-resolution",
            "code": "AUR0774",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "resource",
              "diagnosticKind": "watch-non-method-decorator-usage",
              "frameworkErrorCode": "AUR0774",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "resource-issues",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0774",
                "kind": "watch-non-method-decorator-usage",
                "message": "The @watch decorator can only be used on instance methods."
              }
            ],
            "message": "The @watch decorator can only be used on instance methods.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:resource",
            "span": {
              "end": 1125,
              "start": 1112
            },
            "spanText": "staticWatcher",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:9:resource:watch-non-method-decorator-usage:framework-error-code:AUR0774:src/resource-metadata-errors-app.ts:1112:1125:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:10:resource:controller-no-shadow-on-containerless:framework-error-code:AUR0501:src/resource-metadata-errors-app.ts:1275:1288:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "resource-resolution",
            "code": "AUR0501",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "resource",
              "diagnosticKind": "controller-no-shadow-on-containerless",
              "frameworkErrorCode": "AUR0501",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "resource-issues",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0501",
                "kind": "controller-no-shadow-on-containerless",
                "message": "Containerless custom elements cannot request Shadow DOM or slot projection."
              }
            ],
            "message": "Containerless custom elements cannot request Shadow DOM or slot projection.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:resource",
            "span": {
              "end": 1288,
              "start": 1275
            },
            "spanText": "shadowOptions",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:10:resource:controller-no-shadow-on-containerless:framework-error-code:AUR0501:src/resource-metadata-errors-app.ts:1275:1288:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:11:template:template-compiler-error:framework-error-code:AUR0717:src/resource-metadata-errors-app.ts:1435:1448:template-compiler:AUR0717",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "guided",
            "anomaly": null,
            "category": "template-syntax",
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
              "relatedQueryKind": "template-diagnostics",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0717",
                "kind": "template-compiler-error",
                "message": "Aurelia template compiler AUR0717 rejects this template syntax: Template compilation error: detected a usage of \"<slot>\" element without specifying shadow DOM options in element: containerless-slot-conflict."
              }
            ],
            "message": "Aurelia template compiler AUR0717 rejects this template syntax: Template compilation error: detected a usage of \"<slot>\" element without specifying shadow DOM options in element: containerless-slot-conflict.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:template",
            "span": {
              "end": 1448,
              "start": 1435
            },
            "spanText": "<slot></slot>",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:11:template:template-compiler-error:framework-error-code:AUR0717:src/resource-metadata-errors-app.ts:1435:1448:template-compiler:AUR0717"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:12:resource:controller-no-shadow-on-containerless:framework-error-code:AUR0501:src/resource-metadata-errors-app.ts:1487:1495:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "resource-resolution",
            "code": "AUR0501",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "resource",
              "diagnosticKind": "controller-no-shadow-on-containerless",
              "frameworkErrorCode": "AUR0501",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "resource-issues",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0501",
                "kind": "controller-no-shadow-on-containerless",
                "message": "Containerless custom elements cannot request Shadow DOM or slot projection."
              }
            ],
            "message": "Containerless custom elements cannot request Shadow DOM or slot projection.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:resource",
            "span": {
              "end": 1495,
              "start": 1487
            },
            "spanText": "hasSlots",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:12:resource:controller-no-shadow-on-containerless:framework-error-code:AUR0501:src/resource-metadata-errors-app.ts:1487:1495:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:13:resource:invalid-bindable-decorator-usage-class-without-configuration:framework-error-code:AUR0228:src/resource-metadata-errors-app.ts:1559:1594:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "resource-resolution",
            "code": "AUR0228",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "resource",
              "diagnosticKind": "invalid-bindable-decorator-usage-class-without-configuration",
              "frameworkErrorCode": "AUR0228",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "resource-issues",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0228",
                "kind": "invalid-bindable-decorator-usage-class-without-configuration",
                "message": "Class-level @bindable cannot use a null configuration."
              }
            ],
            "message": "Class-level @bindable cannot use a null configuration.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:resource",
            "span": {
              "end": 1594,
              "start": 1559
            },
            "spanText": "null as unknown as { name: string }",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:13:resource:invalid-bindable-decorator-usage-class-without-configuration:framework-error-code:AUR0228:src/resource-metadata-errors-app.ts:1559:1594:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:14:resource:invalid-bindable-decorator-usage-class-without-property-name-configuration:framework-error-code:AUR0229:src/resource-metadata-errors-app.ts:1746:1748:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "resource-resolution",
            "code": "AUR0229",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "resource",
              "diagnosticKind": "invalid-bindable-decorator-usage-class-without-property-name-configuration",
              "frameworkErrorCode": "AUR0229",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "resource-issues",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0229",
                "kind": "invalid-bindable-decorator-usage-class-without-property-name-configuration",
                "message": "Class-level @bindable must provide a property name in its configuration."
              }
            ],
            "message": "Class-level @bindable must provide a property name in its configuration.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:resource",
            "span": {
              "end": 1748,
              "start": 1746
            },
            "spanText": "{}",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:14:resource:invalid-bindable-decorator-usage-class-without-property-name-configuration:framework-error-code:AUR0229:src/resource-metadata-errors-app.ts:1746:1748:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:15:resource:invalid-bindable-decorator-usage-symbol:framework-error-code:AUR0227:src/resource-metadata-errors-app.ts:1904:1908:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "resource-resolution",
            "code": "AUR0227",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "resource",
              "diagnosticKind": "invalid-bindable-decorator-usage-symbol",
              "frameworkErrorCode": "AUR0227",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "resource-issues",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0227",
                "kind": "invalid-bindable-decorator-usage-symbol",
                "message": "Class-level @bindable property names must be strings."
              }
            ],
            "message": "Class-level @bindable property names must be strings.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:resource",
            "span": {
              "end": 1908,
              "start": 1904
            },
            "spanText": "name",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:15:resource:invalid-bindable-decorator-usage-symbol:framework-error-code:AUR0227:src/resource-metadata-errors-app.ts:1904:1908:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:16:resource:invalid-bindable-decorator-usage-symbol:framework-error-code:AUR0227:src/resource-metadata-errors-app.ts:2232:2286:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "resource-resolution",
            "code": "AUR0227",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "resource",
              "diagnosticKind": "invalid-bindable-decorator-usage-symbol",
              "frameworkErrorCode": "AUR0227",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "resource-issues",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0227",
                "kind": "invalid-bindable-decorator-usage-symbol",
                "message": "@bindable cannot target a symbol or computed property name."
              }
            ],
            "message": "@bindable cannot target a symbol or computed property name.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:resource",
            "span": {
              "end": 2286,
              "start": 2232
            },
            "spanText": "[Symbol.for('semantic-runtime.invalid-bindable-name')]",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:16:resource:invalid-bindable-decorator-usage-symbol:framework-error-code:AUR0227:src/resource-metadata-errors-app.ts:2232:2286:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:19:resource:invalid-process-content-hook:framework-error-code:AUR0766:src/resource-metadata-errors-app.ts:2313:2334:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "resource-resolution",
            "code": "AUR0766",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "resource",
              "diagnosticKind": "invalid-process-content-hook",
              "frameworkErrorCode": "AUR0766",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "resource-issues",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0766",
                "kind": "invalid-process-content-hook",
                "message": "Class-level @processContent did not resolve to a static function hook."
              }
            ],
            "message": "Class-level @processContent did not resolve to a static function hook.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:resource",
            "span": {
              "end": 2334,
              "start": 2313
            },
            "spanText": "missingProcessContent",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:19:resource:invalid-process-content-hook:framework-error-code:AUR0766:src/resource-metadata-errors-app.ts:2313:2334:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:20:resource:invalid-process-content-hook:framework-error-code:AUR0766:src/resource-metadata-errors-app.ts:2661:2675:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "resource-resolution",
            "code": "AUR0766",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "resource",
              "diagnosticKind": "invalid-process-content-hook",
              "frameworkErrorCode": "AUR0766",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "resource-issues",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR0766",
                "kind": "invalid-process-content-hook",
                "message": "@processContent() must decorate a static method when used as a method decorator."
              }
            ],
            "message": "@processContent() must decorate a static method when used as a method decorator.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:resource",
            "span": {
              "end": 2675,
              "start": 2661
            },
            "spanText": "processContent",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:20:resource:invalid-process-content-hook:framework-error-code:AUR0766:src/resource-metadata-errors-app.ts:2661:2675:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:21:resource:children-invalid-query:framework-error-code:AUR9989:src/resource-metadata-errors-app.ts:2831:2836:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "resource-resolution",
            "code": "AUR9989",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "resource",
              "diagnosticKind": "children-invalid-query",
              "frameworkErrorCode": "AUR9989",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "resource-issues",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR9989",
                "kind": "children-invalid-query",
                "message": "@children query 'article > section' is rejected by Aurelia because it contains whitespace or '>'."
              }
            ],
            "message": "@children query 'article > section' is rejected by Aurelia because it contains whitespace or '>'.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:resource",
            "span": {
              "end": 2836,
              "start": 2831
            },
            "spanText": "query",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:21:resource:children-invalid-query:framework-error-code:AUR9989:src/resource-metadata-errors-app.ts:2831:2836:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      },
      {
        "groupKey": "row:diagnostic:22:resource:slotted-decorator-invalid-usage:framework-error-code:AUR9990:src/resource-metadata-errors-app.ts:3045:3055:no-missing-input",
        "maxRawSeverity": "error",
        "primary": {
          "diagnostic": {
            "actionability": "manual",
            "anomaly": null,
            "category": "resource-resolution",
            "code": "AUR9990",
            "data": {
              "diagnosticAuthority": "framework-error-code",
              "diagnosticDomain": "resource",
              "diagnosticKind": "slotted-decorator-invalid-usage",
              "frameworkErrorCode": "AUR9990",
              "frameworkRawErrorAuthority": null,
              "missingInput": null,
              "missingInputs": [],
              "relatedQueryKind": "resource-issues",
              "subject": null,
              "taxonomy": {
                "actionability": null,
                "category": null,
                "confidence": null,
                "impact": null,
                "schema": null
              }
            },
            "file": "src/resource-metadata-errors-app.ts",
            "impact": "blocking",
            "issues": [
              {
                "code": "AUR9990",
                "kind": "slotted-decorator-invalid-usage",
                "message": "@slotted can only decorate a class field."
              }
            ],
            "message": "@slotted can only decorate a class field.",
            "related": [],
            "severity": "error",
            "source": "semantic-runtime:resource",
            "span": {
              "end": 3055,
              "start": 3045
            },
            "spanText": "@slotted()",
            "status": "primary",
            "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
          },
          "relation": null,
          "role": "primary",
          "rowId": "diagnostic:22:resource:slotted-decorator-invalid-usage:framework-error-code:AUR9990:src/resource-metadata-errors-app.ts:3045:3055:no-missing-input"
        },
        "primarySeverity": "error",
        "rawRowCount": 1,
        "related": [],
        "subject": null
      }
    ],
    "primaryCount": 27,
    "rawRowCount": 27
  },
  "raw": {
    "diagnosticCount": 27,
    "diagnostics": [
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "expression",
        "code": "TS1240",
        "data": {
          "diagnosticAuthority": "typescript",
          "diagnosticDomain": "typescript",
          "diagnosticKind": "TS1240",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "typescript-diagnostics",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS1240",
            "kind": "TS1240",
            "message": "Unable to resolve signature of property decorator when called as an expression.\nArgument of type 'undefined' is not assignable to parameter of type 'never'."
          }
        ],
        "message": "Unable to resolve signature of property decorator when called as an expression.\nArgument of type 'undefined' is not assignable to parameter of type 'never'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:typescript",
        "span": {
          "end": 1051,
          "start": 1038
        },
        "spanText": "watch('name')",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "expression",
        "code": "TS2769",
        "data": {
          "diagnosticAuthority": "typescript",
          "diagnosticDomain": "typescript",
          "diagnosticKind": "TS2769",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "typescript-diagnostics",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2769",
            "kind": "TS2769",
            "message": "No overload matches this call.\nOverload 1 of 3, '(definition: PartialCustomElementDefinition<string>): CustomElementDecorator', gave the following error.\nObject literal may only specify known properties, and 'type' does not exist in type 'IComponentBindablePropDefinition'.\nOverload 2 of 3, '(name: string): CustomElementDecorator', gave the following error.\nArgument of type '{ name: string; template: string; bindables: { name: string; type: NumberConstructor; }[]; }' is not assignable to parameter of type 'string'.\nOverload 3 of 3, '(nameOrDef: string | PartialCustomElementDefinition<string>): CustomElementDecorator', gave the following error.\nObject literal may only specify known properties, and 'type' does not exist in type 'IComponentBindablePropDefinition'."
          }
        ],
        "message": "No overload matches this call.\nOverload 1 of 3, '(definition: PartialCustomElementDefinition<string>): CustomElementDecorator', gave the following error.\nObject literal may only specify known properties, and 'type' does not exist in type 'IComponentBindablePropDefinition'.\nOverload 2 of 3, '(name: string): CustomElementDecorator', gave the following error.\nArgument of type '{ name: string; template: string; bindables: { name: string; type: NumberConstructor; }[]; }' is not assignable to parameter of type 'string'.\nOverload 3 of 3, '(nameOrDef: string | PartialCustomElementDefinition<string>): CustomElementDecorator', gave the following error.\nObject literal may only specify known properties, and 'type' does not exist in type 'IComponentBindablePropDefinition'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:typescript",
        "span": {
          "end": 135,
          "start": 122
        },
        "spanText": "customElement",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "expression",
        "code": "TS2769",
        "data": {
          "diagnosticAuthority": "typescript",
          "diagnosticDomain": "typescript",
          "diagnosticKind": "TS2769",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "typescript-diagnostics",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2769",
            "kind": "TS2769",
            "message": "No overload matches this call.\nOverload 1 of 4, '(config?: Omit<PartialBindableDefinition, \"name\"> | undefined): (target: unknown, context: ClassDecoratorContext<abstract new (...args: any) => any> | ClassFieldDecoratorContext<...> | ClassGetterDecoratorContext<...>) => void', gave the following error.\nType '{ name: string; }' has no properties in common with type 'Omit<PartialBindableDefinition, \"name\">'.\nOverload 2 of 4, '(prop: string): (target: Constructable, context: ClassDecoratorContext<abstract new (...args: any) => any>) => void', gave the following error.\nArgument of type '{ name: string; }' is not assignable to parameter of type 'string'."
          }
        ],
        "message": "No overload matches this call.\nOverload 1 of 4, '(config?: Omit<PartialBindableDefinition, \"name\"> | undefined): (target: unknown, context: ClassDecoratorContext<abstract new (...args: any) => any> | ClassFieldDecoratorContext<...> | ClassGetterDecoratorContext<...>) => void', gave the following error.\nType '{ name: string; }' has no properties in common with type 'Omit<PartialBindableDefinition, \"name\">'.\nOverload 2 of 4, '(prop: string): (target: Constructable, context: ClassDecoratorContext<abstract new (...args: any) => any>) => void', gave the following error.\nArgument of type '{ name: string; }' is not assignable to parameter of type 'string'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:typescript",
        "span": {
          "end": 1594,
          "start": 1559
        },
        "spanText": "null as unknown as { name: string }",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "expression",
        "code": "TS2769",
        "data": {
          "diagnosticAuthority": "typescript",
          "diagnosticDomain": "typescript",
          "diagnosticKind": "TS2769",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "typescript-diagnostics",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2769",
            "kind": "TS2769",
            "message": "No overload matches this call.\nOverload 1 of 4, '(config?: Omit<PartialBindableDefinition, \"name\"> | undefined): (target: unknown, context: ClassDecoratorContext<abstract new (...args: any) => any> | ClassFieldDecoratorContext<...> | ClassGetterDecoratorContext<...>) => void', gave the following error.\nObject literal may only specify known properties, and 'name' does not exist in type 'Omit<PartialBindableDefinition, \"name\">'.\nOverload 2 of 4, '(prop: string): (target: Constructable, context: ClassDecoratorContext<abstract new (...args: any) => any>) => void', gave the following error.\nArgument of type '{ name: string; }' is not assignable to parameter of type 'string'."
          }
        ],
        "message": "No overload matches this call.\nOverload 1 of 4, '(config?: Omit<PartialBindableDefinition, \"name\"> | undefined): (target: unknown, context: ClassDecoratorContext<abstract new (...args: any) => any> | ClassFieldDecoratorContext<...> | ClassGetterDecoratorContext<...>) => void', gave the following error.\nObject literal may only specify known properties, and 'name' does not exist in type 'Omit<PartialBindableDefinition, \"name\">'.\nOverload 2 of 4, '(prop: string): (target: Constructable, context: ClassDecoratorContext<abstract new (...args: any) => any>) => void', gave the following error.\nArgument of type '{ name: string; }' is not assignable to parameter of type 'string'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:typescript",
        "span": {
          "end": 1901,
          "start": 1893
        },
        "spanText": "bindable",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "expression",
        "code": "TS1166",
        "data": {
          "diagnosticAuthority": "typescript",
          "diagnosticDomain": "typescript",
          "diagnosticKind": "TS1166",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "typescript-diagnostics",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS1166",
            "kind": "TS1166",
            "message": "A computed property name in a class property declaration must have a simple literal type or a 'unique symbol' type."
          }
        ],
        "message": "A computed property name in a class property declaration must have a simple literal type or a 'unique symbol' type.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:typescript",
        "span": {
          "end": 2286,
          "start": 2232
        },
        "spanText": "[Symbol.for('semantic-runtime.invalid-bindable-name')]",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "expression",
        "code": "TS1241",
        "data": {
          "diagnosticAuthority": "typescript",
          "diagnosticDomain": "typescript",
          "diagnosticKind": "TS1241",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "typescript-diagnostics",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS1241",
            "kind": "TS1241",
            "message": "Unable to resolve signature of method decorator when called as an expression.\nArgument of type '() => void' is not assignable to parameter of type 'undefined'."
          }
        ],
        "message": "Unable to resolve signature of method decorator when called as an expression.\nArgument of type '() => void' is not assignable to parameter of type 'undefined'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:typescript",
        "span": {
          "end": 3055,
          "start": 3046
        },
        "spanText": "slotted()",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "expression",
        "code": "TS1270",
        "data": {
          "diagnosticAuthority": "typescript",
          "diagnosticDomain": "typescript",
          "diagnosticKind": "TS1270",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "typescript-diagnostics",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS1270",
            "kind": "TS1270",
            "message": "Decorator function return type '(initialValue: any) => any' is not assignable to type 'void | (() => void)'.\nType '(initialValue: any) => any' is not assignable to type '() => void'.\nTarget signature provides too few arguments. Expected 1 or more, but got 0."
          }
        ],
        "message": "Decorator function return type '(initialValue: any) => any' is not assignable to type 'void | (() => void)'.\nType '(initialValue: any) => any' is not assignable to type '() => void'.\nTarget signature provides too few arguments. Expected 1 or more, but got 0.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:typescript",
        "span": {
          "end": 3055,
          "start": 3046
        },
        "spanText": "slotted()",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "expression",
        "code": "TS2769",
        "data": {
          "diagnosticAuthority": "typescript",
          "diagnosticDomain": "typescript",
          "diagnosticKind": "TS2769",
          "frameworkErrorCode": null,
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "typescript-diagnostics",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "TS2769",
            "kind": "TS2769",
            "message": "No overload matches this call.\nOverload 1 of 3, '(expressionOrPropertyAccessFn: PropertyKey, changeHandlerOrCallback: \"nameChanged\" | IWatcherCallback<ResourceMetadataErrorsApp, unknown>, options?: IWatchOptions | undefined): WatchClassDecorator<...>', gave the following error.\nArgument of type '\"missingPrototypeHandler\"' is not assignable to parameter of type '\"nameChanged\" | IWatcherCallback<ResourceMetadataErrorsApp, unknown>'.\nOverload 2 of 3, '(expressionOrPropertyAccessFn: IDepCollectionFn<ResourceMetadataErrorsApp, unknown>, changeHandlerOrCallback: \"nameChanged\" | IWatcherCallback<ResourceMetadataErrorsApp, unknown>, options?: IWatchOptions | undefined): WatchClassDecorator<...>', gave the following error.\nArgument of type 'string' is not assignable to parameter of type 'IDepCollectionFn<ResourceMetadataErrorsApp, unknown>'.\nOverload 3 of 3, '(expressionOrPropertyAccessFn: PropertyKey | IDepCollectionFn<typeof ResourceMetadataErrorsApp, unknown>, options?: IWatchOptions | undefined): WatchMethodDecorator<...>', gave the following error.\nType '\"missingPrototypeHandler\"' has no properties in common with type 'IWatchOptions'."
          }
        ],
        "message": "No overload matches this call.\nOverload 1 of 3, '(expressionOrPropertyAccessFn: PropertyKey, changeHandlerOrCallback: \"nameChanged\" | IWatcherCallback<ResourceMetadataErrorsApp, unknown>, options?: IWatchOptions | undefined): WatchClassDecorator<...>', gave the following error.\nArgument of type '\"missingPrototypeHandler\"' is not assignable to parameter of type '\"nameChanged\" | IWatcherCallback<ResourceMetadataErrorsApp, unknown>'.\nOverload 2 of 3, '(expressionOrPropertyAccessFn: IDepCollectionFn<ResourceMetadataErrorsApp, unknown>, changeHandlerOrCallback: \"nameChanged\" | IWatcherCallback<ResourceMetadataErrorsApp, unknown>, options?: IWatchOptions | undefined): WatchClassDecorator<...>', gave the following error.\nArgument of type 'string' is not assignable to parameter of type 'IDepCollectionFn<ResourceMetadataErrorsApp, unknown>'.\nOverload 3 of 3, '(expressionOrPropertyAccessFn: PropertyKey | IDepCollectionFn<typeof ResourceMetadataErrorsApp, unknown>, options?: IWatchOptions | undefined): WatchMethodDecorator<...>', gave the following error.\nType '\"missingPrototypeHandler\"' has no properties in common with type 'IWatchOptions'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:typescript",
        "span": {
          "end": 420,
          "start": 415
        },
        "spanText": "watch",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "resource-resolution",
        "code": "AUR0774",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "resource",
          "diagnosticKind": "watch-non-method-decorator-usage",
          "frameworkErrorCode": "AUR0774",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "resource-issues",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0774",
            "kind": "watch-non-method-decorator-usage",
            "message": "The @watch decorator can only be used on instance methods."
          }
        ],
        "message": "The @watch decorator can only be used on instance methods.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:resource",
        "span": {
          "end": 1066,
          "start": 1054
        },
        "spanText": "fieldWatcher",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "resource-resolution",
        "code": "AUR0774",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "resource",
          "diagnosticKind": "watch-non-method-decorator-usage",
          "frameworkErrorCode": "AUR0774",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "resource-issues",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0774",
            "kind": "watch-non-method-decorator-usage",
            "message": "The @watch decorator can only be used on instance methods."
          }
        ],
        "message": "The @watch decorator can only be used on instance methods.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:resource",
        "span": {
          "end": 1125,
          "start": 1112
        },
        "spanText": "staticWatcher",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "resource-resolution",
        "code": "AUR0501",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "resource",
          "diagnosticKind": "controller-no-shadow-on-containerless",
          "frameworkErrorCode": "AUR0501",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "resource-issues",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0501",
            "kind": "controller-no-shadow-on-containerless",
            "message": "Containerless custom elements cannot request Shadow DOM or slot projection."
          }
        ],
        "message": "Containerless custom elements cannot request Shadow DOM or slot projection.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:resource",
        "span": {
          "end": 1288,
          "start": 1275
        },
        "spanText": "shadowOptions",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "relatedQueryKind": "template-diagnostics",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0717",
            "kind": "template-compiler-error",
            "message": "Aurelia template compiler AUR0717 rejects this template syntax: Template compilation error: detected a usage of \"<slot>\" element without specifying shadow DOM options in element: containerless-slot-conflict."
          }
        ],
        "message": "Aurelia template compiler AUR0717 rejects this template syntax: Template compilation error: detected a usage of \"<slot>\" element without specifying shadow DOM options in element: containerless-slot-conflict.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 1448,
          "start": 1435
        },
        "spanText": "<slot></slot>",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "resource-resolution",
        "code": "AUR0501",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "resource",
          "diagnosticKind": "controller-no-shadow-on-containerless",
          "frameworkErrorCode": "AUR0501",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "resource-issues",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0501",
            "kind": "controller-no-shadow-on-containerless",
            "message": "Containerless custom elements cannot request Shadow DOM or slot projection."
          }
        ],
        "message": "Containerless custom elements cannot request Shadow DOM or slot projection.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:resource",
        "span": {
          "end": 1495,
          "start": 1487
        },
        "spanText": "hasSlots",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "resource-resolution",
        "code": "AUR0228",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "resource",
          "diagnosticKind": "invalid-bindable-decorator-usage-class-without-configuration",
          "frameworkErrorCode": "AUR0228",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "resource-issues",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0228",
            "kind": "invalid-bindable-decorator-usage-class-without-configuration",
            "message": "Class-level @bindable cannot use a null configuration."
          }
        ],
        "message": "Class-level @bindable cannot use a null configuration.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:resource",
        "span": {
          "end": 1594,
          "start": 1559
        },
        "spanText": "null as unknown as { name: string }",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "resource-resolution",
        "code": "AUR0229",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "resource",
          "diagnosticKind": "invalid-bindable-decorator-usage-class-without-property-name-configuration",
          "frameworkErrorCode": "AUR0229",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "resource-issues",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0229",
            "kind": "invalid-bindable-decorator-usage-class-without-property-name-configuration",
            "message": "Class-level @bindable must provide a property name in its configuration."
          }
        ],
        "message": "Class-level @bindable must provide a property name in its configuration.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:resource",
        "span": {
          "end": 1748,
          "start": 1746
        },
        "spanText": "{}",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "resource-resolution",
        "code": "AUR0227",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "resource",
          "diagnosticKind": "invalid-bindable-decorator-usage-symbol",
          "frameworkErrorCode": "AUR0227",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "resource-issues",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0227",
            "kind": "invalid-bindable-decorator-usage-symbol",
            "message": "Class-level @bindable property names must be strings."
          }
        ],
        "message": "Class-level @bindable property names must be strings.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:resource",
        "span": {
          "end": 1908,
          "start": 1904
        },
        "spanText": "name",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "resource-resolution",
        "code": "AUR0227",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "resource",
          "diagnosticKind": "invalid-bindable-decorator-usage-symbol",
          "frameworkErrorCode": "AUR0227",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "resource-issues",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0227",
            "kind": "invalid-bindable-decorator-usage-symbol",
            "message": "@bindable cannot target a symbol or computed property name."
          }
        ],
        "message": "@bindable cannot target a symbol or computed property name.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:resource",
        "span": {
          "end": 2286,
          "start": 2232
        },
        "spanText": "[Symbol.for('semantic-runtime.invalid-bindable-name')]",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
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
          "relatedQueryKind": "template-diagnostics",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0507",
            "kind": "runtime-controller-framework-error",
            "message": "Aurelia runtime controller AUR0507 rejects this controller input: Observer for bindable property length does not support coercion.."
          }
        ],
        "message": "Aurelia runtime controller AUR0507 rejects this controller input: Observer for bindable property length does not support coercion..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 263,
          "start": 231
        },
        "spanText": "{ name: 'length', type: Number }",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "guided",
        "anomaly": null,
        "category": "template-syntax",
        "code": "AUR0508",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "template",
          "diagnosticKind": "runtime-controller-framework-error",
          "frameworkErrorCode": "AUR0508",
          "frameworkRawErrorAuthority": null,
          "missingInput": "runtime-controller:AUR0508",
          "missingInputs": [
            "runtime-controller:AUR0508"
          ],
          "relatedQueryKind": "template-diagnostics",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0508",
            "kind": "runtime-controller-framework-error",
            "message": "Aurelia runtime controller AUR0508 rejects this controller input: Observer for property length does not support change handler.."
          }
        ],
        "message": "Aurelia runtime controller AUR0508 rejects this controller input: Observer for property length does not support change handler..",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:template",
        "span": {
          "end": 263,
          "start": 231
        },
        "spanText": "{ name: 'length', type: Number }",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "resource-resolution",
        "code": "AUR0766",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "resource",
          "diagnosticKind": "invalid-process-content-hook",
          "frameworkErrorCode": "AUR0766",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "resource-issues",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0766",
            "kind": "invalid-process-content-hook",
            "message": "Class-level @processContent did not resolve to a static function hook."
          }
        ],
        "message": "Class-level @processContent did not resolve to a static function hook.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:resource",
        "span": {
          "end": 2334,
          "start": 2313
        },
        "spanText": "missingProcessContent",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "resource-resolution",
        "code": "AUR0766",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "resource",
          "diagnosticKind": "invalid-process-content-hook",
          "frameworkErrorCode": "AUR0766",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "resource-issues",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0766",
            "kind": "invalid-process-content-hook",
            "message": "@processContent() must decorate a static method when used as a method decorator."
          }
        ],
        "message": "@processContent() must decorate a static method when used as a method decorator.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:resource",
        "span": {
          "end": 2675,
          "start": 2661
        },
        "spanText": "processContent",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "resource-resolution",
        "code": "AUR9989",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "resource",
          "diagnosticKind": "children-invalid-query",
          "frameworkErrorCode": "AUR9989",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "resource-issues",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR9989",
            "kind": "children-invalid-query",
            "message": "@children query 'article > section' is rejected by Aurelia because it contains whitespace or '>'."
          }
        ],
        "message": "@children query 'article > section' is rejected by Aurelia because it contains whitespace or '>'.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:resource",
        "span": {
          "end": 2836,
          "start": 2831
        },
        "spanText": "query",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "resource-resolution",
        "code": "AUR9990",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "resource",
          "diagnosticKind": "slotted-decorator-invalid-usage",
          "frameworkErrorCode": "AUR9990",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "resource-issues",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR9990",
            "kind": "slotted-decorator-invalid-usage",
            "message": "@slotted can only decorate a class field."
          }
        ],
        "message": "@slotted can only decorate a class field.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:resource",
        "span": {
          "end": 3055,
          "start": 3045
        },
        "spanText": "@slotted()",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "resource-resolution",
        "code": "AUR0772",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "resource",
          "diagnosticKind": "watch-null-config",
          "frameworkErrorCode": "AUR0772",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "resource-issues",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0772",
            "kind": "watch-null-config",
            "message": "@watch requires a non-null expression or property key."
          }
        ],
        "message": "@watch requires a non-null expression or property key.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:resource",
        "span": {
          "end": 397,
          "start": 372
        },
        "spanText": "null as unknown as string",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "resource-resolution",
        "code": "AUR0773",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "resource",
          "diagnosticKind": "watch-invalid-change-handler",
          "frameworkErrorCode": "AUR0773",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "resource-issues",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0773",
            "kind": "watch-invalid-change-handler",
            "message": "Class @watch callback 'missingPrototypeHandler' is not present on the resource prototype."
          }
        ],
        "message": "Class @watch callback 'missingPrototypeHandler' is not present on the resource prototype.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:resource",
        "span": {
          "end": 453,
          "start": 430
        },
        "spanText": "missingPrototypeHandler",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "resource-resolution",
        "code": "AUR0506",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "resource",
          "diagnosticKind": "controller-watch-invalid-callback",
          "frameworkErrorCode": "AUR0506",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "resource-issues",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0506",
            "kind": "controller-watch-invalid-callback",
            "message": "Watch callback 'missingStaticWatchHandler' is not declared on the resource instance."
          }
        ],
        "message": "Watch callback 'missingStaticWatchHandler' is not declared on the resource instance.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:resource",
        "span": {
          "end": 841,
          "start": 756
        },
        "spanText": "{ expression: 'name', callback: 'missingStaticWatchHandler', flush: 'sync' as const }",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      },
      {
        "actionability": "manual",
        "anomaly": null,
        "category": "resource-resolution",
        "code": "AUR0506",
        "data": {
          "diagnosticAuthority": "framework-error-code",
          "diagnosticDomain": "resource",
          "diagnosticKind": "controller-watch-invalid-callback",
          "frameworkErrorCode": "AUR0506",
          "frameworkRawErrorAuthority": null,
          "missingInput": null,
          "missingInputs": [],
          "relatedQueryKind": "resource-issues",
          "subject": null,
          "taxonomy": {
            "actionability": null,
            "category": null,
            "confidence": null,
            "impact": null,
            "schema": null
          }
        },
        "file": "src/resource-metadata-errors-app.ts",
        "impact": "blocking",
        "issues": [
          {
            "code": "AUR0506",
            "kind": "controller-watch-invalid-callback",
            "message": "Watch callback 'nonCallableStaticWatchHandler' is not callable on the resource instance."
          }
        ],
        "message": "Watch callback 'nonCallableStaticWatchHandler' is not callable on the resource instance.",
        "related": [],
        "severity": "error",
        "source": "semantic-runtime:resource",
        "span": {
          "end": 937,
          "start": 847
        },
        "spanText": "{ expression: 'name', callback: 'nonCallableStaticWatchHandler', flush: 'async' as const }",
        "status": "canonical",
        "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
      }
    ]
  },
  "suppressed": {
    "diagnosticCount": 0,
    "diagnostics": []
  },
  "surfaces": {
    "lsp": {
      "diagnosticCount": 27,
      "diagnostics": [
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "expression",
          "code": "TS2769",
          "data": {
            "diagnosticAuthority": "typescript",
            "diagnosticDomain": "typescript",
            "diagnosticKind": "TS2769",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "typescript-diagnostics",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS2769",
              "kind": "TS2769",
              "message": "No overload matches this call.\nOverload 1 of 3, '(definition: PartialCustomElementDefinition<string>): CustomElementDecorator', gave the following error.\nObject literal may only specify known properties, and 'type' does not exist in type 'IComponentBindablePropDefinition'.\nOverload 2 of 3, '(name: string): CustomElementDecorator', gave the following error.\nArgument of type '{ name: string; template: string; bindables: { name: string; type: NumberConstructor; }[]; }' is not assignable to parameter of type 'string'.\nOverload 3 of 3, '(nameOrDef: string | PartialCustomElementDefinition<string>): CustomElementDecorator', gave the following error.\nObject literal may only specify known properties, and 'type' does not exist in type 'IComponentBindablePropDefinition'."
            }
          ],
          "message": "No overload matches this call.\nOverload 1 of 3, '(definition: PartialCustomElementDefinition<string>): CustomElementDecorator', gave the following error.\nObject literal may only specify known properties, and 'type' does not exist in type 'IComponentBindablePropDefinition'.\nOverload 2 of 3, '(name: string): CustomElementDecorator', gave the following error.\nArgument of type '{ name: string; template: string; bindables: { name: string; type: NumberConstructor; }[]; }' is not assignable to parameter of type 'string'.\nOverload 3 of 3, '(nameOrDef: string | PartialCustomElementDefinition<string>): CustomElementDecorator', gave the following error.\nObject literal may only specify known properties, and 'type' does not exist in type 'IComponentBindablePropDefinition'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:typescript",
          "span": {
            "end": 135,
            "start": 122
          },
          "spanText": "customElement",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "expression",
          "code": "TS2769",
          "data": {
            "diagnosticAuthority": "typescript",
            "diagnosticDomain": "typescript",
            "diagnosticKind": "TS2769",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "typescript-diagnostics",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS2769",
              "kind": "TS2769",
              "message": "No overload matches this call.\nOverload 1 of 3, '(expressionOrPropertyAccessFn: PropertyKey, changeHandlerOrCallback: \"nameChanged\" | IWatcherCallback<ResourceMetadataErrorsApp, unknown>, options?: IWatchOptions | undefined): WatchClassDecorator<...>', gave the following error.\nArgument of type '\"missingPrototypeHandler\"' is not assignable to parameter of type '\"nameChanged\" | IWatcherCallback<ResourceMetadataErrorsApp, unknown>'.\nOverload 2 of 3, '(expressionOrPropertyAccessFn: IDepCollectionFn<ResourceMetadataErrorsApp, unknown>, changeHandlerOrCallback: \"nameChanged\" | IWatcherCallback<ResourceMetadataErrorsApp, unknown>, options?: IWatchOptions | undefined): WatchClassDecorator<...>', gave the following error.\nArgument of type 'string' is not assignable to parameter of type 'IDepCollectionFn<ResourceMetadataErrorsApp, unknown>'.\nOverload 3 of 3, '(expressionOrPropertyAccessFn: PropertyKey | IDepCollectionFn<typeof ResourceMetadataErrorsApp, unknown>, options?: IWatchOptions | undefined): WatchMethodDecorator<...>', gave the following error.\nType '\"missingPrototypeHandler\"' has no properties in common with type 'IWatchOptions'."
            }
          ],
          "message": "No overload matches this call.\nOverload 1 of 3, '(expressionOrPropertyAccessFn: PropertyKey, changeHandlerOrCallback: \"nameChanged\" | IWatcherCallback<ResourceMetadataErrorsApp, unknown>, options?: IWatchOptions | undefined): WatchClassDecorator<...>', gave the following error.\nArgument of type '\"missingPrototypeHandler\"' is not assignable to parameter of type '\"nameChanged\" | IWatcherCallback<ResourceMetadataErrorsApp, unknown>'.\nOverload 2 of 3, '(expressionOrPropertyAccessFn: IDepCollectionFn<ResourceMetadataErrorsApp, unknown>, changeHandlerOrCallback: \"nameChanged\" | IWatcherCallback<ResourceMetadataErrorsApp, unknown>, options?: IWatchOptions | undefined): WatchClassDecorator<...>', gave the following error.\nArgument of type 'string' is not assignable to parameter of type 'IDepCollectionFn<ResourceMetadataErrorsApp, unknown>'.\nOverload 3 of 3, '(expressionOrPropertyAccessFn: PropertyKey | IDepCollectionFn<typeof ResourceMetadataErrorsApp, unknown>, options?: IWatchOptions | undefined): WatchMethodDecorator<...>', gave the following error.\nType '\"missingPrototypeHandler\"' has no properties in common with type 'IWatchOptions'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:typescript",
          "span": {
            "end": 420,
            "start": 415
          },
          "spanText": "watch",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "expression",
          "code": "TS1240",
          "data": {
            "diagnosticAuthority": "typescript",
            "diagnosticDomain": "typescript",
            "diagnosticKind": "TS1240",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "typescript-diagnostics",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS1240",
              "kind": "TS1240",
              "message": "Unable to resolve signature of property decorator when called as an expression.\nArgument of type 'undefined' is not assignable to parameter of type 'never'."
            }
          ],
          "message": "Unable to resolve signature of property decorator when called as an expression.\nArgument of type 'undefined' is not assignable to parameter of type 'never'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:typescript",
          "span": {
            "end": 1051,
            "start": 1038
          },
          "spanText": "watch('name')",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "expression",
          "code": "TS2769",
          "data": {
            "diagnosticAuthority": "typescript",
            "diagnosticDomain": "typescript",
            "diagnosticKind": "TS2769",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "typescript-diagnostics",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS2769",
              "kind": "TS2769",
              "message": "No overload matches this call.\nOverload 1 of 4, '(config?: Omit<PartialBindableDefinition, \"name\"> | undefined): (target: unknown, context: ClassDecoratorContext<abstract new (...args: any) => any> | ClassFieldDecoratorContext<...> | ClassGetterDecoratorContext<...>) => void', gave the following error.\nType '{ name: string; }' has no properties in common with type 'Omit<PartialBindableDefinition, \"name\">'.\nOverload 2 of 4, '(prop: string): (target: Constructable, context: ClassDecoratorContext<abstract new (...args: any) => any>) => void', gave the following error.\nArgument of type '{ name: string; }' is not assignable to parameter of type 'string'."
            }
          ],
          "message": "No overload matches this call.\nOverload 1 of 4, '(config?: Omit<PartialBindableDefinition, \"name\"> | undefined): (target: unknown, context: ClassDecoratorContext<abstract new (...args: any) => any> | ClassFieldDecoratorContext<...> | ClassGetterDecoratorContext<...>) => void', gave the following error.\nType '{ name: string; }' has no properties in common with type 'Omit<PartialBindableDefinition, \"name\">'.\nOverload 2 of 4, '(prop: string): (target: Constructable, context: ClassDecoratorContext<abstract new (...args: any) => any>) => void', gave the following error.\nArgument of type '{ name: string; }' is not assignable to parameter of type 'string'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:typescript",
          "span": {
            "end": 1594,
            "start": 1559
          },
          "spanText": "null as unknown as { name: string }",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "expression",
          "code": "TS2769",
          "data": {
            "diagnosticAuthority": "typescript",
            "diagnosticDomain": "typescript",
            "diagnosticKind": "TS2769",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "typescript-diagnostics",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS2769",
              "kind": "TS2769",
              "message": "No overload matches this call.\nOverload 1 of 4, '(config?: Omit<PartialBindableDefinition, \"name\"> | undefined): (target: unknown, context: ClassDecoratorContext<abstract new (...args: any) => any> | ClassFieldDecoratorContext<...> | ClassGetterDecoratorContext<...>) => void', gave the following error.\nObject literal may only specify known properties, and 'name' does not exist in type 'Omit<PartialBindableDefinition, \"name\">'.\nOverload 2 of 4, '(prop: string): (target: Constructable, context: ClassDecoratorContext<abstract new (...args: any) => any>) => void', gave the following error.\nArgument of type '{ name: string; }' is not assignable to parameter of type 'string'."
            }
          ],
          "message": "No overload matches this call.\nOverload 1 of 4, '(config?: Omit<PartialBindableDefinition, \"name\"> | undefined): (target: unknown, context: ClassDecoratorContext<abstract new (...args: any) => any> | ClassFieldDecoratorContext<...> | ClassGetterDecoratorContext<...>) => void', gave the following error.\nObject literal may only specify known properties, and 'name' does not exist in type 'Omit<PartialBindableDefinition, \"name\">'.\nOverload 2 of 4, '(prop: string): (target: Constructable, context: ClassDecoratorContext<abstract new (...args: any) => any>) => void', gave the following error.\nArgument of type '{ name: string; }' is not assignable to parameter of type 'string'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:typescript",
          "span": {
            "end": 1901,
            "start": 1893
          },
          "spanText": "bindable",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "expression",
          "code": "TS1166",
          "data": {
            "diagnosticAuthority": "typescript",
            "diagnosticDomain": "typescript",
            "diagnosticKind": "TS1166",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "typescript-diagnostics",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS1166",
              "kind": "TS1166",
              "message": "A computed property name in a class property declaration must have a simple literal type or a 'unique symbol' type."
            }
          ],
          "message": "A computed property name in a class property declaration must have a simple literal type or a 'unique symbol' type.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:typescript",
          "span": {
            "end": 2286,
            "start": 2232
          },
          "spanText": "[Symbol.for('semantic-runtime.invalid-bindable-name')]",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "expression",
          "code": "TS1241",
          "data": {
            "diagnosticAuthority": "typescript",
            "diagnosticDomain": "typescript",
            "diagnosticKind": "TS1241",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "typescript-diagnostics",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS1241",
              "kind": "TS1241",
              "message": "Unable to resolve signature of method decorator when called as an expression.\nArgument of type '() => void' is not assignable to parameter of type 'undefined'."
            }
          ],
          "message": "Unable to resolve signature of method decorator when called as an expression.\nArgument of type '() => void' is not assignable to parameter of type 'undefined'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:typescript",
          "span": {
            "end": 3055,
            "start": 3046
          },
          "spanText": "slotted()",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "expression",
          "code": "TS1270",
          "data": {
            "diagnosticAuthority": "typescript",
            "diagnosticDomain": "typescript",
            "diagnosticKind": "TS1270",
            "frameworkErrorCode": null,
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "typescript-diagnostics",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "TS1270",
              "kind": "TS1270",
              "message": "Decorator function return type '(initialValue: any) => any' is not assignable to type 'void | (() => void)'.\nType '(initialValue: any) => any' is not assignable to type '() => void'.\nTarget signature provides too few arguments. Expected 1 or more, but got 0."
            }
          ],
          "message": "Decorator function return type '(initialValue: any) => any' is not assignable to type 'void | (() => void)'.\nType '(initialValue: any) => any' is not assignable to type '() => void'.\nTarget signature provides too few arguments. Expected 1 or more, but got 0.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:typescript",
          "span": {
            "end": 3055,
            "start": 3046
          },
          "spanText": "slotted()",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "relatedQueryKind": "template-diagnostics",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0507",
              "kind": "runtime-controller-framework-error",
              "message": "Aurelia runtime controller AUR0507 rejects this controller input: Observer for bindable property length does not support coercion.."
            }
          ],
          "message": "Aurelia runtime controller AUR0507 rejects this controller input: Observer for bindable property length does not support coercion..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 263,
            "start": 231
          },
          "spanText": "{ name: 'length', type: Number }",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
          "code": "AUR0508",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "template",
            "diagnosticKind": "runtime-controller-framework-error",
            "frameworkErrorCode": "AUR0508",
            "frameworkRawErrorAuthority": null,
            "missingInput": "runtime-controller:AUR0508",
            "missingInputs": [
              "runtime-controller:AUR0508"
            ],
            "relatedQueryKind": "template-diagnostics",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0508",
              "kind": "runtime-controller-framework-error",
              "message": "Aurelia runtime controller AUR0508 rejects this controller input: Observer for property length does not support change handler.."
            }
          ],
          "message": "Aurelia runtime controller AUR0508 rejects this controller input: Observer for property length does not support change handler..",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 263,
            "start": 231
          },
          "spanText": "{ name: 'length', type: Number }",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "resource-resolution",
          "code": "AUR0772",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "resource",
            "diagnosticKind": "watch-null-config",
            "frameworkErrorCode": "AUR0772",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "resource-issues",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0772",
              "kind": "watch-null-config",
              "message": "@watch requires a non-null expression or property key."
            }
          ],
          "message": "@watch requires a non-null expression or property key.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:resource",
          "span": {
            "end": 397,
            "start": 372
          },
          "spanText": "null as unknown as string",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "resource-resolution",
          "code": "AUR0773",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "resource",
            "diagnosticKind": "watch-invalid-change-handler",
            "frameworkErrorCode": "AUR0773",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "resource-issues",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0773",
              "kind": "watch-invalid-change-handler",
              "message": "Class @watch callback 'missingPrototypeHandler' is not present on the resource prototype."
            }
          ],
          "message": "Class @watch callback 'missingPrototypeHandler' is not present on the resource prototype.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:resource",
          "span": {
            "end": 453,
            "start": 430
          },
          "spanText": "missingPrototypeHandler",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "resource-resolution",
          "code": "AUR0506",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "resource",
            "diagnosticKind": "controller-watch-invalid-callback",
            "frameworkErrorCode": "AUR0506",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "resource-issues",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0506",
              "kind": "controller-watch-invalid-callback",
              "message": "Watch callback 'missingStaticWatchHandler' is not declared on the resource instance."
            }
          ],
          "message": "Watch callback 'missingStaticWatchHandler' is not declared on the resource instance.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:resource",
          "span": {
            "end": 841,
            "start": 756
          },
          "spanText": "{ expression: 'name', callback: 'missingStaticWatchHandler', flush: 'sync' as const }",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "resource-resolution",
          "code": "AUR0506",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "resource",
            "diagnosticKind": "controller-watch-invalid-callback",
            "frameworkErrorCode": "AUR0506",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "resource-issues",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0506",
              "kind": "controller-watch-invalid-callback",
              "message": "Watch callback 'nonCallableStaticWatchHandler' is not callable on the resource instance."
            }
          ],
          "message": "Watch callback 'nonCallableStaticWatchHandler' is not callable on the resource instance.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:resource",
          "span": {
            "end": 937,
            "start": 847
          },
          "spanText": "{ expression: 'name', callback: 'nonCallableStaticWatchHandler', flush: 'async' as const }",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "resource-resolution",
          "code": "AUR0774",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "resource",
            "diagnosticKind": "watch-non-method-decorator-usage",
            "frameworkErrorCode": "AUR0774",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "resource-issues",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0774",
              "kind": "watch-non-method-decorator-usage",
              "message": "The @watch decorator can only be used on instance methods."
            }
          ],
          "message": "The @watch decorator can only be used on instance methods.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:resource",
          "span": {
            "end": 1066,
            "start": 1054
          },
          "spanText": "fieldWatcher",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "resource-resolution",
          "code": "AUR0774",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "resource",
            "diagnosticKind": "watch-non-method-decorator-usage",
            "frameworkErrorCode": "AUR0774",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "resource-issues",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0774",
              "kind": "watch-non-method-decorator-usage",
              "message": "The @watch decorator can only be used on instance methods."
            }
          ],
          "message": "The @watch decorator can only be used on instance methods.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:resource",
          "span": {
            "end": 1125,
            "start": 1112
          },
          "spanText": "staticWatcher",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "resource-resolution",
          "code": "AUR0501",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "resource",
            "diagnosticKind": "controller-no-shadow-on-containerless",
            "frameworkErrorCode": "AUR0501",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "resource-issues",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0501",
              "kind": "controller-no-shadow-on-containerless",
              "message": "Containerless custom elements cannot request Shadow DOM or slot projection."
            }
          ],
          "message": "Containerless custom elements cannot request Shadow DOM or slot projection.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:resource",
          "span": {
            "end": 1288,
            "start": 1275
          },
          "spanText": "shadowOptions",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "guided",
          "anomaly": null,
          "category": "template-syntax",
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
            "relatedQueryKind": "template-diagnostics",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0717",
              "kind": "template-compiler-error",
              "message": "Aurelia template compiler AUR0717 rejects this template syntax: Template compilation error: detected a usage of \"<slot>\" element without specifying shadow DOM options in element: containerless-slot-conflict."
            }
          ],
          "message": "Aurelia template compiler AUR0717 rejects this template syntax: Template compilation error: detected a usage of \"<slot>\" element without specifying shadow DOM options in element: containerless-slot-conflict.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:template",
          "span": {
            "end": 1448,
            "start": 1435
          },
          "spanText": "<slot></slot>",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "resource-resolution",
          "code": "AUR0501",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "resource",
            "diagnosticKind": "controller-no-shadow-on-containerless",
            "frameworkErrorCode": "AUR0501",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "resource-issues",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0501",
              "kind": "controller-no-shadow-on-containerless",
              "message": "Containerless custom elements cannot request Shadow DOM or slot projection."
            }
          ],
          "message": "Containerless custom elements cannot request Shadow DOM or slot projection.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:resource",
          "span": {
            "end": 1495,
            "start": 1487
          },
          "spanText": "hasSlots",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "resource-resolution",
          "code": "AUR0228",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "resource",
            "diagnosticKind": "invalid-bindable-decorator-usage-class-without-configuration",
            "frameworkErrorCode": "AUR0228",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "resource-issues",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0228",
              "kind": "invalid-bindable-decorator-usage-class-without-configuration",
              "message": "Class-level @bindable cannot use a null configuration."
            }
          ],
          "message": "Class-level @bindable cannot use a null configuration.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:resource",
          "span": {
            "end": 1594,
            "start": 1559
          },
          "spanText": "null as unknown as { name: string }",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "resource-resolution",
          "code": "AUR0229",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "resource",
            "diagnosticKind": "invalid-bindable-decorator-usage-class-without-property-name-configuration",
            "frameworkErrorCode": "AUR0229",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "resource-issues",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0229",
              "kind": "invalid-bindable-decorator-usage-class-without-property-name-configuration",
              "message": "Class-level @bindable must provide a property name in its configuration."
            }
          ],
          "message": "Class-level @bindable must provide a property name in its configuration.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:resource",
          "span": {
            "end": 1748,
            "start": 1746
          },
          "spanText": "{}",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "resource-resolution",
          "code": "AUR0227",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "resource",
            "diagnosticKind": "invalid-bindable-decorator-usage-symbol",
            "frameworkErrorCode": "AUR0227",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "resource-issues",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0227",
              "kind": "invalid-bindable-decorator-usage-symbol",
              "message": "Class-level @bindable property names must be strings."
            }
          ],
          "message": "Class-level @bindable property names must be strings.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:resource",
          "span": {
            "end": 1908,
            "start": 1904
          },
          "spanText": "name",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "resource-resolution",
          "code": "AUR0227",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "resource",
            "diagnosticKind": "invalid-bindable-decorator-usage-symbol",
            "frameworkErrorCode": "AUR0227",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "resource-issues",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0227",
              "kind": "invalid-bindable-decorator-usage-symbol",
              "message": "@bindable cannot target a symbol or computed property name."
            }
          ],
          "message": "@bindable cannot target a symbol or computed property name.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:resource",
          "span": {
            "end": 2286,
            "start": 2232
          },
          "spanText": "[Symbol.for('semantic-runtime.invalid-bindable-name')]",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "resource-resolution",
          "code": "AUR0766",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "resource",
            "diagnosticKind": "invalid-process-content-hook",
            "frameworkErrorCode": "AUR0766",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "resource-issues",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0766",
              "kind": "invalid-process-content-hook",
              "message": "Class-level @processContent did not resolve to a static function hook."
            }
          ],
          "message": "Class-level @processContent did not resolve to a static function hook.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:resource",
          "span": {
            "end": 2334,
            "start": 2313
          },
          "spanText": "missingProcessContent",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "resource-resolution",
          "code": "AUR0766",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "resource",
            "diagnosticKind": "invalid-process-content-hook",
            "frameworkErrorCode": "AUR0766",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "resource-issues",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR0766",
              "kind": "invalid-process-content-hook",
              "message": "@processContent() must decorate a static method when used as a method decorator."
            }
          ],
          "message": "@processContent() must decorate a static method when used as a method decorator.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:resource",
          "span": {
            "end": 2675,
            "start": 2661
          },
          "spanText": "processContent",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "resource-resolution",
          "code": "AUR9989",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "resource",
            "diagnosticKind": "children-invalid-query",
            "frameworkErrorCode": "AUR9989",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "resource-issues",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR9989",
              "kind": "children-invalid-query",
              "message": "@children query 'article > section' is rejected by Aurelia because it contains whitespace or '>'."
            }
          ],
          "message": "@children query 'article > section' is rejected by Aurelia because it contains whitespace or '>'.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:resource",
          "span": {
            "end": 2836,
            "start": 2831
          },
          "spanText": "query",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        },
        {
          "actionability": "manual",
          "anomaly": null,
          "category": "resource-resolution",
          "code": "AUR9990",
          "data": {
            "diagnosticAuthority": "framework-error-code",
            "diagnosticDomain": "resource",
            "diagnosticKind": "slotted-decorator-invalid-usage",
            "frameworkErrorCode": "AUR9990",
            "frameworkRawErrorAuthority": null,
            "missingInput": null,
            "missingInputs": [],
            "relatedQueryKind": "resource-issues",
            "subject": null,
            "taxonomy": {
              "actionability": null,
              "category": null,
              "confidence": null,
              "impact": null,
              "schema": null
            }
          },
          "file": "src/resource-metadata-errors-app.ts",
          "impact": "blocking",
          "issues": [
            {
              "code": "AUR9990",
              "kind": "slotted-decorator-invalid-usage",
              "message": "@slotted can only decorate a class field."
            }
          ],
          "message": "@slotted can only decorate a class field.",
          "related": [],
          "severity": "error",
          "source": "semantic-runtime:resource",
          "span": {
            "end": 3055,
            "start": 3045
          },
          "spanText": "@slotted()",
          "status": "primary",
          "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
        }
      ]
    }
  },
  "uri": "fixtures://pressure/resource-metadata-errors/src/resource-metadata-errors-app.ts"
}
```

### Alignment

```json
{
  "comparisonKey": "domain/kind/code/severity/text/message",
  "countsMatch": true,
  "customLspSurfaceCount": 27,
  "customOnly": [],
  "lspOnly": [],
  "lspPublishCount": 27,
  "suppressedCount": 0
}
```
