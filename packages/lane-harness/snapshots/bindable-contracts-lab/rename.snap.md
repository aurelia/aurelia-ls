# bindable-contracts-lab rename lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/bindable-contracts-lab`
Probe file: `packages/lane-harness/probes/bindable-contracts-lab.probes.json`
Lane: `rename`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## class-level-bindable-property

### Probe

```json
{
  "anchor": "external-value.bind=\"externalValue\"",
  "at": "external-value",
  "atOccurrence": 1,
  "displayPosition": "src/bindable-lab-app.html:38:24",
  "file": "src/bindable-lab-app.html",
  "lspPosition": {
    "character": 23,
    "line": 37
  },
  "newName": "externalState",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "externalValue",
    "range": {
      "end": {
        "character": 37,
        "line": 37
      },
      "start": {
        "character": 23,
        "line": 37
      }
    }
  }
}
```

### rename

```json
{
  "outcome": "result",
  "result": {
    "documentChanges": [
      {
        "edits": [
          {
            "newText": "externalState",
            "range": {
              "end": {
                "character": 15,
                "line": 105
              },
              "start": {
                "character": 2,
                "line": 105
              }
            }
          },
          {
            "newText": "externalState",
            "range": {
              "end": {
                "character": 24,
                "line": 99
              },
              "start": {
                "character": 11,
                "line": 99
              }
            }
          },
          {
            "newText": "externalState",
            "range": {
              "end": {
                "character": 34,
                "line": 102
              },
              "start": {
                "character": 21,
                "line": 102
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts",
          "version": null
        }
      },
      {
        "edits": [
          {
            "newText": "external-state",
            "range": {
              "end": {
                "character": 37,
                "line": 37
              },
              "start": {
                "character": 23,
                "line": 37
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/bindable-contracts-lab/src/bindable-lab-app.html",
          "version": 1
        }
      }
    ]
  }
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### In-memory apply

```json
{
  "anomalies": [],
  "editCount": 4,
  "expectedOldTexts": [
    "external-value",
    "externalValue",
    "external"
  ],
  "filesTouched": [
    "src/bindable-lab-app.html",
    "src/binding-contract-surfaces.ts"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/bindable-lab-app.html",
      "newText": "external-state",
      "oldText": "external-value",
      "range": {
        "end": {
          "character": 37,
          "line": 37
        },
        "start": {
          "character": 23,
          "line": 37
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/binding-contract-surfaces.ts",
      "newText": "externalState",
      "oldText": "externalValue",
      "range": {
        "end": {
          "character": 24,
          "line": 99
        },
        "start": {
          "character": 11,
          "line": 99
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/binding-contract-surfaces.ts",
      "newText": "externalState",
      "oldText": "externalValue",
      "range": {
        "end": {
          "character": 34,
          "line": 102
        },
        "start": {
          "character": 21,
          "line": 102
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/binding-contract-surfaces.ts",
      "newText": "externalState",
      "oldText": "externalValue",
      "range": {
        "end": {
          "character": 15,
          "line": 105
        },
        "start": {
          "character": 2,
          "line": 105
        }
      },
      "source": "documentChanges",
      "status": "ok"
    }
  ]
}
```

### Applied diff

```diff
diff --git a/src/bindable-lab-app.html b/src/bindable-lab-app.html
--- a/src/bindable-lab-app.html
+++ b/src/bindable-lab-app.html
@@ -1,40 +1,40 @@
 <template>
   <profile-card
     title.bind="titleText"
     display-label.bind="aliasLabel"
     selected-id.two-way="selectedId"
     count.bind="count"
     quantity.bind="quantity"
     strict-quantity.bind="strictQuantity"
     normalized-label.bind="normalizedLabel"
     stringified-label.bind="stringifiedLabel"
     summary.bind="summaryText"
     action.bind="handleAction">
   </profile-card>

   <profile-card title="Literal title" display-label="Literal public label"></profile-card>

   <section display-hint="message.bind: statusMessage; display-label.bind: aliasLabel; tone.bind: accentTone"></section>
   <section display-hint="message.one-time: statusMessage"></section>
   <section display-hint="message: Literal status; tone: ${accentTone}"></section>
   <section display-hint.bind="statusMessage"></section>
   <section display-hint.bind="statusMessage ? accentTone : aliasLabel"></section>

   <section active-state.bind="isActive"></section>
   <section implicit-state.bind="implicitValue"></section>
   <section two-way-state.bind="twoWayValue"></section>
   <section raw-hint="message.bind: statusMessage; tone.bind: accentTone"></section>

   <static-card display-headline.bind="headline" subtitle.bind="subtitle"></static-card>
   <inherited-badge shared.bind="inheritedShared" own.bind="inheritedOwn"></inherited-badge>
   <inherited-static-badge base-static.bind="inheritedStatic"></inherited-static-badge>
   <nearest-static-badge own-static.bind="ownStatic"></nearest-static-badge>
   <bindable-precedence-card
     definition-value.bind="precedenceValue"
     inherited-only.bind="precedenceInherited"
     static-only.bind="precedenceStatic"
     definition-only.bind="precedenceDefinition">
   </bindable-precedence-card>
-  <class-bindable-card external-value.bind="externalValue"></class-bindable-card>
+  <class-bindable-card external-state.bind="externalValue"></class-bindable-card>
   <record-card status-text.bind="recordStatus"></record-card>
 </template>
diff --git a/src/binding-contract-surfaces.ts b/src/binding-contract-surfaces.ts
--- a/src/binding-contract-surfaces.ts
+++ b/src/binding-contract-surfaces.ts
@@ -1,126 +1,126 @@
 import { BindingMode, bindable, customAttribute, customElement } from 'aurelia';

 @customAttribute({
   name: 'two-way-state',
   defaultProperty: 'data',
 })
 export class TwoWayState {
   @bindable({ mode: BindingMode.twoWay }) data = '';
 }

 @customAttribute({
   name: 'raw-hint',
   defaultProperty: 'value',
   noMultiBindings: true,
 })
 export class RawHint {
   @bindable value = '';
 }

 @customAttribute({
   name: 'implicit-state',
   defaultProperty: 'state',
 })
 export class ImplicitState {
   state = '';
 }

 @customAttribute('title')
 export class TitleCustomAttribute {
   @bindable value = '';
 }

 class DecoratorBindableBase {
   @bindable shared = '';
 }

 @customElement({
   name: 'inherited-badge',
   template: '<span>${shared}:${own}</span>',
 })
 export class InheritedBadge extends DecoratorBindableBase {
   @bindable own = '';
 }

 type StaticBindableConfig = readonly (string | {
   readonly name: string;
   readonly attribute?: string;
 })[];

 class StaticBindableBase {
   static readonly bindables: StaticBindableConfig = ['baseStatic'];

   baseStatic = '';
 }

 @customElement({
   name: 'inherited-static-badge',
   template: '<span>${baseStatic}</span>',
 })
 export class InheritedStaticBadge extends StaticBindableBase {}

 @customElement({
   name: 'nearest-static-badge',
   template: '<span>${ownStatic}</span>',
 })
 export class NearestStaticBadge extends StaticBindableBase {
   static override readonly bindables: StaticBindableConfig = [
     { name: 'ownStatic', attribute: 'own-static' },
   ];

   ownStatic = '';
 }

 class BindablePrecedenceBase {
   @bindable({ attribute: 'base-value' }) value = '';
   @bindable inheritedOnly = '';
 }

 @customElement({
   name: 'bindable-precedence-card',
   template: '<span>${value}:${inheritedOnly}:${staticOnly}:${definitionOnly}</span>',
   bindables: [
     { name: 'value', attribute: 'definition-value', mode: BindingMode.oneTime },
     'definitionOnly',
   ],
 })
 export class BindablePrecedenceCard extends BindablePrecedenceBase {
   static readonly bindables = [
     { name: 'value', attribute: 'static-value', mode: BindingMode.twoWay },
     'staticOnly',
   ];

   @bindable({ attribute: 'decorator-value', mode: BindingMode.fromView })
   override value = '';

   staticOnly = '';
   definitionOnly = '';
 }

-@bindable('externalValue')
+@bindable('externalState')
 @customElement({
   name: 'class-bindable-card',
-  template: '<span>${externalValue}</span>',
+  template: '<span>${externalState}</span>',
 })
 export class ClassBindableCard {
-  externalValue = '';
+  externalState = '';
 }

 @customElement({
   name: 'record-card',
   template: '<span>${status}</span>',
 })
 export class RecordCard {
   static readonly bindables = {
     status: {
       attribute: 'status-text',
       callback: 'statusDidChange',
       mode: BindingMode.fromView,
       set: String,
     },
   };

   status = '';

   statusDidChange(): void {}
 }
```

## inherited-static-bindable-property

### Probe

```json
{
  "anchor": "base-static.bind=\"inheritedStatic\"",
  "at": "base-static",
  "atOccurrence": 1,
  "displayPosition": "src/bindable-lab-app.html:30:27",
  "file": "src/bindable-lab-app.html",
  "lspPosition": {
    "character": 26,
    "line": 29
  },
  "newName": "baseValue",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "baseStatic",
    "range": {
      "end": {
        "character": 37,
        "line": 29
      },
      "start": {
        "character": 26,
        "line": 29
      }
    }
  }
}
```

### rename

```json
{
  "outcome": "result",
  "result": {
    "documentChanges": [
      {
        "edits": [
          {
            "newText": "baseValue",
            "range": {
              "end": {
                "character": 12,
                "line": 52
              },
              "start": {
                "character": 2,
                "line": 52
              }
            }
          },
          {
            "newText": "baseValue",
            "range": {
              "end": {
                "character": 64,
                "line": 50
              },
              "start": {
                "character": 54,
                "line": 50
              }
            }
          },
          {
            "newText": "baseValue",
            "range": {
              "end": {
                "character": 31,
                "line": 57
              },
              "start": {
                "character": 21,
                "line": 57
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts",
          "version": null
        }
      },
      {
        "edits": [
          {
            "newText": "base-value",
            "range": {
              "end": {
                "character": 37,
                "line": 29
              },
              "start": {
                "character": 26,
                "line": 29
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/bindable-contracts-lab/src/bindable-lab-app.html",
          "version": 1
        }
      }
    ]
  }
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### In-memory apply

```json
{
  "anomalies": [],
  "editCount": 4,
  "expectedOldTexts": [
    "base-static",
    "baseStatic",
    "base"
  ],
  "filesTouched": [
    "src/bindable-lab-app.html",
    "src/binding-contract-surfaces.ts"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/bindable-lab-app.html",
      "newText": "base-value",
      "oldText": "base-static",
      "range": {
        "end": {
          "character": 37,
          "line": 29
        },
        "start": {
          "character": 26,
          "line": 29
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/binding-contract-surfaces.ts",
      "newText": "baseValue",
      "oldText": "baseStatic",
      "range": {
        "end": {
          "character": 64,
          "line": 50
        },
        "start": {
          "character": 54,
          "line": 50
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/binding-contract-surfaces.ts",
      "newText": "baseValue",
      "oldText": "baseStatic",
      "range": {
        "end": {
          "character": 12,
          "line": 52
        },
        "start": {
          "character": 2,
          "line": 52
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/binding-contract-surfaces.ts",
      "newText": "baseValue",
      "oldText": "baseStatic",
      "range": {
        "end": {
          "character": 31,
          "line": 57
        },
        "start": {
          "character": 21,
          "line": 57
        }
      },
      "source": "documentChanges",
      "status": "ok"
    }
  ]
}
```

### Applied diff

```diff
diff --git a/src/bindable-lab-app.html b/src/bindable-lab-app.html
--- a/src/bindable-lab-app.html
+++ b/src/bindable-lab-app.html
@@ -1,40 +1,40 @@
 <template>
   <profile-card
     title.bind="titleText"
     display-label.bind="aliasLabel"
     selected-id.two-way="selectedId"
     count.bind="count"
     quantity.bind="quantity"
     strict-quantity.bind="strictQuantity"
     normalized-label.bind="normalizedLabel"
     stringified-label.bind="stringifiedLabel"
     summary.bind="summaryText"
     action.bind="handleAction">
   </profile-card>

   <profile-card title="Literal title" display-label="Literal public label"></profile-card>

   <section display-hint="message.bind: statusMessage; display-label.bind: aliasLabel; tone.bind: accentTone"></section>
   <section display-hint="message.one-time: statusMessage"></section>
   <section display-hint="message: Literal status; tone: ${accentTone}"></section>
   <section display-hint.bind="statusMessage"></section>
   <section display-hint.bind="statusMessage ? accentTone : aliasLabel"></section>

   <section active-state.bind="isActive"></section>
   <section implicit-state.bind="implicitValue"></section>
   <section two-way-state.bind="twoWayValue"></section>
   <section raw-hint="message.bind: statusMessage; tone.bind: accentTone"></section>

   <static-card display-headline.bind="headline" subtitle.bind="subtitle"></static-card>
   <inherited-badge shared.bind="inheritedShared" own.bind="inheritedOwn"></inherited-badge>
-  <inherited-static-badge base-static.bind="inheritedStatic"></inherited-static-badge>
+  <inherited-static-badge base-value.bind="inheritedStatic"></inherited-static-badge>
   <nearest-static-badge own-static.bind="ownStatic"></nearest-static-badge>
   <bindable-precedence-card
     definition-value.bind="precedenceValue"
     inherited-only.bind="precedenceInherited"
     static-only.bind="precedenceStatic"
     definition-only.bind="precedenceDefinition">
   </bindable-precedence-card>
   <class-bindable-card external-value.bind="externalValue"></class-bindable-card>
   <record-card status-text.bind="recordStatus"></record-card>
 </template>
diff --git a/src/binding-contract-surfaces.ts b/src/binding-contract-surfaces.ts
--- a/src/binding-contract-surfaces.ts
+++ b/src/binding-contract-surfaces.ts
@@ -1,126 +1,126 @@
 import { BindingMode, bindable, customAttribute, customElement } from 'aurelia';

 @customAttribute({
   name: 'two-way-state',
   defaultProperty: 'data',
 })
 export class TwoWayState {
   @bindable({ mode: BindingMode.twoWay }) data = '';
 }

 @customAttribute({
   name: 'raw-hint',
   defaultProperty: 'value',
   noMultiBindings: true,
 })
 export class RawHint {
   @bindable value = '';
 }

 @customAttribute({
   name: 'implicit-state',
   defaultProperty: 'state',
 })
 export class ImplicitState {
   state = '';
 }

 @customAttribute('title')
 export class TitleCustomAttribute {
   @bindable value = '';
 }

 class DecoratorBindableBase {
   @bindable shared = '';
 }

 @customElement({
   name: 'inherited-badge',
   template: '<span>${shared}:${own}</span>',
 })
 export class InheritedBadge extends DecoratorBindableBase {
   @bindable own = '';
 }

 type StaticBindableConfig = readonly (string | {
   readonly name: string;
   readonly attribute?: string;
 })[];

 class StaticBindableBase {
-  static readonly bindables: StaticBindableConfig = ['baseStatic'];
+  static readonly bindables: StaticBindableConfig = ['baseValue'];

-  baseStatic = '';
+  baseValue = '';
 }

 @customElement({
   name: 'inherited-static-badge',
-  template: '<span>${baseStatic}</span>',
+  template: '<span>${baseValue}</span>',
 })
 export class InheritedStaticBadge extends StaticBindableBase {}

 @customElement({
   name: 'nearest-static-badge',
   template: '<span>${ownStatic}</span>',
 })
 export class NearestStaticBadge extends StaticBindableBase {
   static override readonly bindables: StaticBindableConfig = [
     { name: 'ownStatic', attribute: 'own-static' },
   ];

   ownStatic = '';
 }

 class BindablePrecedenceBase {
   @bindable({ attribute: 'base-value' }) value = '';
   @bindable inheritedOnly = '';
 }

 @customElement({
   name: 'bindable-precedence-card',
   template: '<span>${value}:${inheritedOnly}:${staticOnly}:${definitionOnly}</span>',
   bindables: [
     { name: 'value', attribute: 'definition-value', mode: BindingMode.oneTime },
     'definitionOnly',
   ],
 })
 export class BindablePrecedenceCard extends BindablePrecedenceBase {
   static readonly bindables = [
     { name: 'value', attribute: 'static-value', mode: BindingMode.twoWay },
     'staticOnly',
   ];

   @bindable({ attribute: 'decorator-value', mode: BindingMode.fromView })
   override value = '';

   staticOnly = '';
   definitionOnly = '';
 }

 @bindable('externalValue')
 @customElement({
   name: 'class-bindable-card',
   template: '<span>${externalValue}</span>',
 })
 export class ClassBindableCard {
   externalValue = '';
 }

 @customElement({
   name: 'record-card',
   template: '<span>${status}</span>',
 })
 export class RecordCard {
   static readonly bindables = {
     status: {
       attribute: 'status-text',
       callback: 'statusDidChange',
       mode: BindingMode.fromView,
       set: String,
     },
   };

   status = '';

   statusDidChange(): void {}
 }
```

## inherited-decorator-bindable-property

### Probe

```json
{
  "anchor": "inherited-only.bind=\"precedenceInherited\"",
  "at": "inherited-only",
  "atOccurrence": 1,
  "displayPosition": "src/bindable-lab-app.html:34:5",
  "file": "src/bindable-lab-app.html",
  "lspPosition": {
    "character": 4,
    "line": 33
  },
  "newName": "baseOnly",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "inheritedOnly",
    "range": {
      "end": {
        "character": 18,
        "line": 33
      },
      "start": {
        "character": 4,
        "line": 33
      }
    }
  }
}
```

### rename

```json
{
  "outcome": "result",
  "result": {
    "documentChanges": [
      {
        "edits": [
          {
            "newText": "baseOnly",
            "range": {
              "end": {
                "character": 25,
                "line": 75
              },
              "start": {
                "character": 12,
                "line": 75
              }
            }
          },
          {
            "newText": "baseOnly",
            "range": {
              "end": {
                "character": 43,
                "line": 80
              },
              "start": {
                "character": 30,
                "line": 80
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts",
          "version": null
        }
      },
      {
        "edits": [
          {
            "newText": "base-only",
            "range": {
              "end": {
                "character": 18,
                "line": 33
              },
              "start": {
                "character": 4,
                "line": 33
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/bindable-contracts-lab/src/bindable-lab-app.html",
          "version": 1
        }
      }
    ]
  }
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### In-memory apply

```json
{
  "anomalies": [],
  "editCount": 3,
  "expectedOldTexts": [
    "inherited-only",
    "inheritedOnly",
    "inherited"
  ],
  "filesTouched": [
    "src/bindable-lab-app.html",
    "src/binding-contract-surfaces.ts"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/bindable-lab-app.html",
      "newText": "base-only",
      "oldText": "inherited-only",
      "range": {
        "end": {
          "character": 18,
          "line": 33
        },
        "start": {
          "character": 4,
          "line": 33
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/binding-contract-surfaces.ts",
      "newText": "baseOnly",
      "oldText": "inheritedOnly",
      "range": {
        "end": {
          "character": 25,
          "line": 75
        },
        "start": {
          "character": 12,
          "line": 75
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/binding-contract-surfaces.ts",
      "newText": "baseOnly",
      "oldText": "inheritedOnly",
      "range": {
        "end": {
          "character": 43,
          "line": 80
        },
        "start": {
          "character": 30,
          "line": 80
        }
      },
      "source": "documentChanges",
      "status": "ok"
    }
  ]
}
```

### Applied diff

```diff
diff --git a/src/bindable-lab-app.html b/src/bindable-lab-app.html
--- a/src/bindable-lab-app.html
+++ b/src/bindable-lab-app.html
@@ -1,40 +1,40 @@
 <template>
   <profile-card
     title.bind="titleText"
     display-label.bind="aliasLabel"
     selected-id.two-way="selectedId"
     count.bind="count"
     quantity.bind="quantity"
     strict-quantity.bind="strictQuantity"
     normalized-label.bind="normalizedLabel"
     stringified-label.bind="stringifiedLabel"
     summary.bind="summaryText"
     action.bind="handleAction">
   </profile-card>

   <profile-card title="Literal title" display-label="Literal public label"></profile-card>

   <section display-hint="message.bind: statusMessage; display-label.bind: aliasLabel; tone.bind: accentTone"></section>
   <section display-hint="message.one-time: statusMessage"></section>
   <section display-hint="message: Literal status; tone: ${accentTone}"></section>
   <section display-hint.bind="statusMessage"></section>
   <section display-hint.bind="statusMessage ? accentTone : aliasLabel"></section>

   <section active-state.bind="isActive"></section>
   <section implicit-state.bind="implicitValue"></section>
   <section two-way-state.bind="twoWayValue"></section>
   <section raw-hint="message.bind: statusMessage; tone.bind: accentTone"></section>

   <static-card display-headline.bind="headline" subtitle.bind="subtitle"></static-card>
   <inherited-badge shared.bind="inheritedShared" own.bind="inheritedOwn"></inherited-badge>
   <inherited-static-badge base-static.bind="inheritedStatic"></inherited-static-badge>
   <nearest-static-badge own-static.bind="ownStatic"></nearest-static-badge>
   <bindable-precedence-card
     definition-value.bind="precedenceValue"
-    inherited-only.bind="precedenceInherited"
+    base-only.bind="precedenceInherited"
     static-only.bind="precedenceStatic"
     definition-only.bind="precedenceDefinition">
   </bindable-precedence-card>
   <class-bindable-card external-value.bind="externalValue"></class-bindable-card>
   <record-card status-text.bind="recordStatus"></record-card>
 </template>
diff --git a/src/binding-contract-surfaces.ts b/src/binding-contract-surfaces.ts
--- a/src/binding-contract-surfaces.ts
+++ b/src/binding-contract-surfaces.ts
@@ -1,126 +1,126 @@
 import { BindingMode, bindable, customAttribute, customElement } from 'aurelia';

 @customAttribute({
   name: 'two-way-state',
   defaultProperty: 'data',
 })
 export class TwoWayState {
   @bindable({ mode: BindingMode.twoWay }) data = '';
 }

 @customAttribute({
   name: 'raw-hint',
   defaultProperty: 'value',
   noMultiBindings: true,
 })
 export class RawHint {
   @bindable value = '';
 }

 @customAttribute({
   name: 'implicit-state',
   defaultProperty: 'state',
 })
 export class ImplicitState {
   state = '';
 }

 @customAttribute('title')
 export class TitleCustomAttribute {
   @bindable value = '';
 }

 class DecoratorBindableBase {
   @bindable shared = '';
 }

 @customElement({
   name: 'inherited-badge',
   template: '<span>${shared}:${own}</span>',
 })
 export class InheritedBadge extends DecoratorBindableBase {
   @bindable own = '';
 }

 type StaticBindableConfig = readonly (string | {
   readonly name: string;
   readonly attribute?: string;
 })[];

 class StaticBindableBase {
   static readonly bindables: StaticBindableConfig = ['baseStatic'];

   baseStatic = '';
 }

 @customElement({
   name: 'inherited-static-badge',
   template: '<span>${baseStatic}</span>',
 })
 export class InheritedStaticBadge extends StaticBindableBase {}

 @customElement({
   name: 'nearest-static-badge',
   template: '<span>${ownStatic}</span>',
 })
 export class NearestStaticBadge extends StaticBindableBase {
   static override readonly bindables: StaticBindableConfig = [
     { name: 'ownStatic', attribute: 'own-static' },
   ];

   ownStatic = '';
 }

 class BindablePrecedenceBase {
   @bindable({ attribute: 'base-value' }) value = '';
-  @bindable inheritedOnly = '';
+  @bindable baseOnly = '';
 }

 @customElement({
   name: 'bindable-precedence-card',
-  template: '<span>${value}:${inheritedOnly}:${staticOnly}:${definitionOnly}</span>',
+  template: '<span>${value}:${baseOnly}:${staticOnly}:${definitionOnly}</span>',
   bindables: [
     { name: 'value', attribute: 'definition-value', mode: BindingMode.oneTime },
     'definitionOnly',
   ],
 })
 export class BindablePrecedenceCard extends BindablePrecedenceBase {
   static readonly bindables = [
     { name: 'value', attribute: 'static-value', mode: BindingMode.twoWay },
     'staticOnly',
   ];

   @bindable({ attribute: 'decorator-value', mode: BindingMode.fromView })
   override value = '';

   staticOnly = '';
   definitionOnly = '';
 }

 @bindable('externalValue')
 @customElement({
   name: 'class-bindable-card',
   template: '<span>${externalValue}</span>',
 })
 export class ClassBindableCard {
   externalValue = '';
 }

 @customElement({
   name: 'record-card',
   template: '<span>${status}</span>',
 })
 export class RecordCard {
   static readonly bindables = {
     status: {
       attribute: 'status-text',
       callback: 'statusDidChange',
       mode: BindingMode.fromView,
       set: String,
     },
   };

   status = '';

   statusDidChange(): void {}
 }
```

## static-list-bindable-property

### Probe

```json
{
  "anchor": "static-only.bind=\"precedenceStatic\"",
  "at": "static-only",
  "atOccurrence": 1,
  "displayPosition": "src/bindable-lab-app.html:35:5",
  "file": "src/bindable-lab-app.html",
  "lspPosition": {
    "character": 4,
    "line": 34
  },
  "newName": "configuredOnly",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "staticOnly",
    "range": {
      "end": {
        "character": 15,
        "line": 34
      },
      "start": {
        "character": 4,
        "line": 34
      }
    }
  }
}
```

### rename

```json
{
  "outcome": "result",
  "result": {
    "documentChanges": [
      {
        "edits": [
          {
            "newText": "configuredOnly",
            "range": {
              "end": {
                "character": 12,
                "line": 95
              },
              "start": {
                "character": 2,
                "line": 95
              }
            }
          },
          {
            "newText": "configuredOnly",
            "range": {
              "end": {
                "character": 57,
                "line": 80
              },
              "start": {
                "character": 47,
                "line": 80
              }
            }
          },
          {
            "newText": "configuredOnly",
            "range": {
              "end": {
                "character": 15,
                "line": 89
              },
              "start": {
                "character": 5,
                "line": 89
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts",
          "version": null
        }
      },
      {
        "edits": [
          {
            "newText": "configured-only",
            "range": {
              "end": {
                "character": 15,
                "line": 34
              },
              "start": {
                "character": 4,
                "line": 34
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/bindable-contracts-lab/src/bindable-lab-app.html",
          "version": 1
        }
      }
    ]
  }
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### In-memory apply

```json
{
  "anomalies": [],
  "editCount": 4,
  "expectedOldTexts": [
    "static-only",
    "staticOnly",
    "static"
  ],
  "filesTouched": [
    "src/bindable-lab-app.html",
    "src/binding-contract-surfaces.ts"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/bindable-lab-app.html",
      "newText": "configured-only",
      "oldText": "static-only",
      "range": {
        "end": {
          "character": 15,
          "line": 34
        },
        "start": {
          "character": 4,
          "line": 34
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/binding-contract-surfaces.ts",
      "newText": "configuredOnly",
      "oldText": "staticOnly",
      "range": {
        "end": {
          "character": 57,
          "line": 80
        },
        "start": {
          "character": 47,
          "line": 80
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/binding-contract-surfaces.ts",
      "newText": "configuredOnly",
      "oldText": "staticOnly",
      "range": {
        "end": {
          "character": 15,
          "line": 89
        },
        "start": {
          "character": 5,
          "line": 89
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/binding-contract-surfaces.ts",
      "newText": "configuredOnly",
      "oldText": "staticOnly",
      "range": {
        "end": {
          "character": 12,
          "line": 95
        },
        "start": {
          "character": 2,
          "line": 95
        }
      },
      "source": "documentChanges",
      "status": "ok"
    }
  ]
}
```

### Applied diff

```diff
diff --git a/src/bindable-lab-app.html b/src/bindable-lab-app.html
--- a/src/bindable-lab-app.html
+++ b/src/bindable-lab-app.html
@@ -1,40 +1,40 @@
 <template>
   <profile-card
     title.bind="titleText"
     display-label.bind="aliasLabel"
     selected-id.two-way="selectedId"
     count.bind="count"
     quantity.bind="quantity"
     strict-quantity.bind="strictQuantity"
     normalized-label.bind="normalizedLabel"
     stringified-label.bind="stringifiedLabel"
     summary.bind="summaryText"
     action.bind="handleAction">
   </profile-card>

   <profile-card title="Literal title" display-label="Literal public label"></profile-card>

   <section display-hint="message.bind: statusMessage; display-label.bind: aliasLabel; tone.bind: accentTone"></section>
   <section display-hint="message.one-time: statusMessage"></section>
   <section display-hint="message: Literal status; tone: ${accentTone}"></section>
   <section display-hint.bind="statusMessage"></section>
   <section display-hint.bind="statusMessage ? accentTone : aliasLabel"></section>

   <section active-state.bind="isActive"></section>
   <section implicit-state.bind="implicitValue"></section>
   <section two-way-state.bind="twoWayValue"></section>
   <section raw-hint="message.bind: statusMessage; tone.bind: accentTone"></section>

   <static-card display-headline.bind="headline" subtitle.bind="subtitle"></static-card>
   <inherited-badge shared.bind="inheritedShared" own.bind="inheritedOwn"></inherited-badge>
   <inherited-static-badge base-static.bind="inheritedStatic"></inherited-static-badge>
   <nearest-static-badge own-static.bind="ownStatic"></nearest-static-badge>
   <bindable-precedence-card
     definition-value.bind="precedenceValue"
     inherited-only.bind="precedenceInherited"
-    static-only.bind="precedenceStatic"
+    configured-only.bind="precedenceStatic"
     definition-only.bind="precedenceDefinition">
   </bindable-precedence-card>
   <class-bindable-card external-value.bind="externalValue"></class-bindable-card>
   <record-card status-text.bind="recordStatus"></record-card>
 </template>
diff --git a/src/binding-contract-surfaces.ts b/src/binding-contract-surfaces.ts
--- a/src/binding-contract-surfaces.ts
+++ b/src/binding-contract-surfaces.ts
@@ -1,126 +1,126 @@
 import { BindingMode, bindable, customAttribute, customElement } from 'aurelia';

 @customAttribute({
   name: 'two-way-state',
   defaultProperty: 'data',
 })
 export class TwoWayState {
   @bindable({ mode: BindingMode.twoWay }) data = '';
 }

 @customAttribute({
   name: 'raw-hint',
   defaultProperty: 'value',
   noMultiBindings: true,
 })
 export class RawHint {
   @bindable value = '';
 }

 @customAttribute({
   name: 'implicit-state',
   defaultProperty: 'state',
 })
 export class ImplicitState {
   state = '';
 }

 @customAttribute('title')
 export class TitleCustomAttribute {
   @bindable value = '';
 }

 class DecoratorBindableBase {
   @bindable shared = '';
 }

 @customElement({
   name: 'inherited-badge',
   template: '<span>${shared}:${own}</span>',
 })
 export class InheritedBadge extends DecoratorBindableBase {
   @bindable own = '';
 }

 type StaticBindableConfig = readonly (string | {
   readonly name: string;
   readonly attribute?: string;
 })[];

 class StaticBindableBase {
   static readonly bindables: StaticBindableConfig = ['baseStatic'];

   baseStatic = '';
 }

 @customElement({
   name: 'inherited-static-badge',
   template: '<span>${baseStatic}</span>',
 })
 export class InheritedStaticBadge extends StaticBindableBase {}

 @customElement({
   name: 'nearest-static-badge',
   template: '<span>${ownStatic}</span>',
 })
 export class NearestStaticBadge extends StaticBindableBase {
   static override readonly bindables: StaticBindableConfig = [
     { name: 'ownStatic', attribute: 'own-static' },
   ];

   ownStatic = '';
 }

 class BindablePrecedenceBase {
   @bindable({ attribute: 'base-value' }) value = '';
   @bindable inheritedOnly = '';
 }

 @customElement({
   name: 'bindable-precedence-card',
-  template: '<span>${value}:${inheritedOnly}:${staticOnly}:${definitionOnly}</span>',
+  template: '<span>${value}:${inheritedOnly}:${configuredOnly}:${definitionOnly}</span>',
   bindables: [
     { name: 'value', attribute: 'definition-value', mode: BindingMode.oneTime },
     'definitionOnly',
   ],
 })
 export class BindablePrecedenceCard extends BindablePrecedenceBase {
   static readonly bindables = [
     { name: 'value', attribute: 'static-value', mode: BindingMode.twoWay },
-    'staticOnly',
+    'configuredOnly',
   ];

   @bindable({ attribute: 'decorator-value', mode: BindingMode.fromView })
   override value = '';

-  staticOnly = '';
+  configuredOnly = '';
   definitionOnly = '';
 }

 @bindable('externalValue')
 @customElement({
   name: 'class-bindable-card',
   template: '<span>${externalValue}</span>',
 })
 export class ClassBindableCard {
   externalValue = '';
 }

 @customElement({
   name: 'record-card',
   template: '<span>${status}</span>',
 })
 export class RecordCard {
   static readonly bindables = {
     status: {
       attribute: 'status-text',
       callback: 'statusDidChange',
       mode: BindingMode.fromView,
       set: String,
     },
   };

   status = '';

   statusDidChange(): void {}
 }
```

## definition-object-bindable-property

### Probe

```json
{
  "anchor": "definition-only.bind=\"precedenceDefinition\"",
  "at": "definition-only",
  "atOccurrence": 1,
  "displayPosition": "src/bindable-lab-app.html:36:5",
  "file": "src/bindable-lab-app.html",
  "lspPosition": {
    "character": 4,
    "line": 35
  },
  "newName": "declaredOnly",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "definitionOnly",
    "range": {
      "end": {
        "character": 19,
        "line": 35
      },
      "start": {
        "character": 4,
        "line": 35
      }
    }
  }
}
```

### rename

```json
{
  "outcome": "result",
  "result": {
    "documentChanges": [
      {
        "edits": [
          {
            "newText": "declaredOnly",
            "range": {
              "end": {
                "character": 16,
                "line": 96
              },
              "start": {
                "character": 2,
                "line": 96
              }
            }
          },
          {
            "newText": "declaredOnly",
            "range": {
              "end": {
                "character": 75,
                "line": 80
              },
              "start": {
                "character": 61,
                "line": 80
              }
            }
          },
          {
            "newText": "declaredOnly",
            "range": {
              "end": {
                "character": 19,
                "line": 83
              },
              "start": {
                "character": 5,
                "line": 83
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts",
          "version": null
        }
      },
      {
        "edits": [
          {
            "newText": "declared-only",
            "range": {
              "end": {
                "character": 19,
                "line": 35
              },
              "start": {
                "character": 4,
                "line": 35
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/bindable-contracts-lab/src/bindable-lab-app.html",
          "version": 1
        }
      }
    ]
  }
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### In-memory apply

```json
{
  "anomalies": [],
  "editCount": 4,
  "expectedOldTexts": [
    "definition-only",
    "definitionOnly",
    "definition"
  ],
  "filesTouched": [
    "src/bindable-lab-app.html",
    "src/binding-contract-surfaces.ts"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/bindable-lab-app.html",
      "newText": "declared-only",
      "oldText": "definition-only",
      "range": {
        "end": {
          "character": 19,
          "line": 35
        },
        "start": {
          "character": 4,
          "line": 35
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/binding-contract-surfaces.ts",
      "newText": "declaredOnly",
      "oldText": "definitionOnly",
      "range": {
        "end": {
          "character": 75,
          "line": 80
        },
        "start": {
          "character": 61,
          "line": 80
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/binding-contract-surfaces.ts",
      "newText": "declaredOnly",
      "oldText": "definitionOnly",
      "range": {
        "end": {
          "character": 19,
          "line": 83
        },
        "start": {
          "character": 5,
          "line": 83
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/binding-contract-surfaces.ts",
      "newText": "declaredOnly",
      "oldText": "definitionOnly",
      "range": {
        "end": {
          "character": 16,
          "line": 96
        },
        "start": {
          "character": 2,
          "line": 96
        }
      },
      "source": "documentChanges",
      "status": "ok"
    }
  ]
}
```

### Applied diff

```diff
diff --git a/src/bindable-lab-app.html b/src/bindable-lab-app.html
--- a/src/bindable-lab-app.html
+++ b/src/bindable-lab-app.html
@@ -1,40 +1,40 @@
 <template>
   <profile-card
     title.bind="titleText"
     display-label.bind="aliasLabel"
     selected-id.two-way="selectedId"
     count.bind="count"
     quantity.bind="quantity"
     strict-quantity.bind="strictQuantity"
     normalized-label.bind="normalizedLabel"
     stringified-label.bind="stringifiedLabel"
     summary.bind="summaryText"
     action.bind="handleAction">
   </profile-card>

   <profile-card title="Literal title" display-label="Literal public label"></profile-card>

   <section display-hint="message.bind: statusMessage; display-label.bind: aliasLabel; tone.bind: accentTone"></section>
   <section display-hint="message.one-time: statusMessage"></section>
   <section display-hint="message: Literal status; tone: ${accentTone}"></section>
   <section display-hint.bind="statusMessage"></section>
   <section display-hint.bind="statusMessage ? accentTone : aliasLabel"></section>

   <section active-state.bind="isActive"></section>
   <section implicit-state.bind="implicitValue"></section>
   <section two-way-state.bind="twoWayValue"></section>
   <section raw-hint="message.bind: statusMessage; tone.bind: accentTone"></section>

   <static-card display-headline.bind="headline" subtitle.bind="subtitle"></static-card>
   <inherited-badge shared.bind="inheritedShared" own.bind="inheritedOwn"></inherited-badge>
   <inherited-static-badge base-static.bind="inheritedStatic"></inherited-static-badge>
   <nearest-static-badge own-static.bind="ownStatic"></nearest-static-badge>
   <bindable-precedence-card
     definition-value.bind="precedenceValue"
     inherited-only.bind="precedenceInherited"
     static-only.bind="precedenceStatic"
-    definition-only.bind="precedenceDefinition">
+    declared-only.bind="precedenceDefinition">
   </bindable-precedence-card>
   <class-bindable-card external-value.bind="externalValue"></class-bindable-card>
   <record-card status-text.bind="recordStatus"></record-card>
 </template>
diff --git a/src/binding-contract-surfaces.ts b/src/binding-contract-surfaces.ts
--- a/src/binding-contract-surfaces.ts
+++ b/src/binding-contract-surfaces.ts
@@ -1,126 +1,126 @@
 import { BindingMode, bindable, customAttribute, customElement } from 'aurelia';

 @customAttribute({
   name: 'two-way-state',
   defaultProperty: 'data',
 })
 export class TwoWayState {
   @bindable({ mode: BindingMode.twoWay }) data = '';
 }

 @customAttribute({
   name: 'raw-hint',
   defaultProperty: 'value',
   noMultiBindings: true,
 })
 export class RawHint {
   @bindable value = '';
 }

 @customAttribute({
   name: 'implicit-state',
   defaultProperty: 'state',
 })
 export class ImplicitState {
   state = '';
 }

 @customAttribute('title')
 export class TitleCustomAttribute {
   @bindable value = '';
 }

 class DecoratorBindableBase {
   @bindable shared = '';
 }

 @customElement({
   name: 'inherited-badge',
   template: '<span>${shared}:${own}</span>',
 })
 export class InheritedBadge extends DecoratorBindableBase {
   @bindable own = '';
 }

 type StaticBindableConfig = readonly (string | {
   readonly name: string;
   readonly attribute?: string;
 })[];

 class StaticBindableBase {
   static readonly bindables: StaticBindableConfig = ['baseStatic'];

   baseStatic = '';
 }

 @customElement({
   name: 'inherited-static-badge',
   template: '<span>${baseStatic}</span>',
 })
 export class InheritedStaticBadge extends StaticBindableBase {}

 @customElement({
   name: 'nearest-static-badge',
   template: '<span>${ownStatic}</span>',
 })
 export class NearestStaticBadge extends StaticBindableBase {
   static override readonly bindables: StaticBindableConfig = [
     { name: 'ownStatic', attribute: 'own-static' },
   ];

   ownStatic = '';
 }

 class BindablePrecedenceBase {
   @bindable({ attribute: 'base-value' }) value = '';
   @bindable inheritedOnly = '';
 }

 @customElement({
   name: 'bindable-precedence-card',
-  template: '<span>${value}:${inheritedOnly}:${staticOnly}:${definitionOnly}</span>',
+  template: '<span>${value}:${inheritedOnly}:${staticOnly}:${declaredOnly}</span>',
   bindables: [
     { name: 'value', attribute: 'definition-value', mode: BindingMode.oneTime },
-    'definitionOnly',
+    'declaredOnly',
   ],
 })
 export class BindablePrecedenceCard extends BindablePrecedenceBase {
   static readonly bindables = [
     { name: 'value', attribute: 'static-value', mode: BindingMode.twoWay },
     'staticOnly',
   ];

   @bindable({ attribute: 'decorator-value', mode: BindingMode.fromView })
   override value = '';

   staticOnly = '';
-  definitionOnly = '';
+  declaredOnly = '';
 }

 @bindable('externalValue')
 @customElement({
   name: 'class-bindable-card',
   template: '<span>${externalValue}</span>',
 })
 export class ClassBindableCard {
   externalValue = '';
 }

 @customElement({
   name: 'record-card',
   template: '<span>${status}</span>',
 })
 export class RecordCard {
   static readonly bindables = {
     status: {
       attribute: 'status-text',
       callback: 'statusDidChange',
       mode: BindingMode.fromView,
       set: String,
     },
   };

   status = '';

   statusDidChange(): void {}
 }
```

## inline-built-in-one-time-command-refusal

### Probe

```json
{
  "anchor": "display-hint=\"message.one-time: statusMessage",
  "at": "one-time",
  "atOccurrence": 1,
  "displayPosition": "src/bindable-lab-app.html:18:34",
  "file": "src/bindable-lab-app.html",
  "lspPosition": {
    "character": 33,
    "line": 17
  },
  "newName": "flow",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": null
}
```

### rename

```json
{
  "error": {
    "code": 0,
    "message": "Resource 'one-time' is not renameable from this template position."
  },
  "outcome": "error"
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### In-memory apply

```json
{
  "anomalies": [],
  "editCount": 0,
  "expectedOldTexts": [
    "one"
  ],
  "filesTouched": [],
  "outcome": "rename-error",
  "validation": []
}
```

### Applied diff

_No in-memory diff._
