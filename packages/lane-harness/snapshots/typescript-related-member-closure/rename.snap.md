# typescript-related-member-closure rename lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/typescript-related-member-closure`
Probe file: `packages/lane-harness/probes/typescript-related-member-closure.probes.json`
Lane: `rename`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## interface-implementation-value-family

### Probe

```json
{
  "anchor": "${value}",
  "at": "value",
  "atOccurrence": 1,
  "displayPosition": "src/app.html:2:8",
  "file": "src/app.html",
  "lspPosition": {
    "character": 7,
    "line": 1
  },
  "newName": "valueNext",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "value",
    "range": {
      "end": {
        "character": 12,
        "line": 1
      },
      "start": {
        "character": 7,
        "line": 1
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
            "newText": "valueNext",
            "range": {
              "end": {
                "character": 7,
                "line": 11
              },
              "start": {
                "character": 2,
                "line": 11
              }
            }
          },
          {
            "newText": "valueNext",
            "range": {
              "end": {
                "character": 16,
                "line": 50
              },
              "start": {
                "character": 11,
                "line": 50
              }
            }
          },
          {
            "newText": "valueNext",
            "range": {
              "end": {
                "character": 16,
                "line": 63
              },
              "start": {
                "character": 11,
                "line": 63
              }
            }
          },
          {
            "newText": "valueNext",
            "range": {
              "end": {
                "character": 23,
                "line": 68
              },
              "start": {
                "character": 18,
                "line": 68
              }
            }
          },
          {
            "newText": "valueNext",
            "range": {
              "end": {
                "character": 7,
                "line": 72
              },
              "start": {
                "character": 2,
                "line": 72
              }
            }
          },
          {
            "newText": "valueNext: value",
            "range": {
              "end": {
                "character": 7,
                "line": 78
              },
              "start": {
                "character": 2,
                "line": 78
              }
            }
          },
          {
            "newText": "valueNext",
            "range": {
              "end": {
                "character": 15,
                "line": 83
              },
              "start": {
                "character": 10,
                "line": 83
              }
            }
          },
          {
            "newText": "valueNext: value",
            "range": {
              "end": {
                "character": 15,
                "line": 85
              },
              "start": {
                "character": 10,
                "line": 85
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts",
          "version": null
        }
      },
      {
        "edits": [
          {
            "newText": "valueNext",
            "range": {
              "end": {
                "character": 7,
                "line": 1
              },
              "start": {
                "character": 2,
                "line": 1
              }
            }
          },
          {
            "newText": "valueNext",
            "range": {
              "end": {
                "character": 7,
                "line": 6
              },
              "start": {
                "character": 2,
                "line": 6
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/typescript-related-member-closure/src/contracts.ts",
          "version": null
        }
      },
      {
        "edits": [
          {
            "newText": "valueNext",
            "range": {
              "end": {
                "character": 12,
                "line": 1
              },
              "start": {
                "character": 7,
                "line": 1
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/typescript-related-member-closure/src/app.html",
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
  "editCount": 11,
  "expectedOldTexts": [
    "value"
  ],
  "filesTouched": [
    "src/app.html",
    "src/app.ts",
    "src/contracts.ts"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/app.html",
      "newText": "valueNext",
      "oldText": "value",
      "range": {
        "end": {
          "character": 12,
          "line": 1
        },
        "start": {
          "character": 7,
          "line": 1
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/app.ts",
      "newText": "valueNext",
      "oldText": "value",
      "range": {
        "end": {
          "character": 7,
          "line": 11
        },
        "start": {
          "character": 2,
          "line": 11
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/app.ts",
      "newText": "valueNext",
      "oldText": "value",
      "range": {
        "end": {
          "character": 16,
          "line": 50
        },
        "start": {
          "character": 11,
          "line": 50
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/app.ts",
      "newText": "valueNext",
      "oldText": "value",
      "range": {
        "end": {
          "character": 16,
          "line": 63
        },
        "start": {
          "character": 11,
          "line": 63
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/app.ts",
      "newText": "valueNext",
      "oldText": "value",
      "range": {
        "end": {
          "character": 23,
          "line": 68
        },
        "start": {
          "character": 18,
          "line": 68
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/app.ts",
      "newText": "valueNext",
      "oldText": "value",
      "range": {
        "end": {
          "character": 7,
          "line": 72
        },
        "start": {
          "character": 2,
          "line": 72
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/app.ts",
      "newText": "valueNext: value",
      "oldText": "value",
      "range": {
        "end": {
          "character": 7,
          "line": 78
        },
        "start": {
          "character": 2,
          "line": 78
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/app.ts",
      "newText": "valueNext",
      "oldText": "value",
      "range": {
        "end": {
          "character": 15,
          "line": 83
        },
        "start": {
          "character": 10,
          "line": 83
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/app.ts",
      "newText": "valueNext: value",
      "oldText": "value",
      "range": {
        "end": {
          "character": 15,
          "line": 85
        },
        "start": {
          "character": 10,
          "line": 85
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/contracts.ts",
      "newText": "valueNext",
      "oldText": "value",
      "range": {
        "end": {
          "character": 7,
          "line": 1
        },
        "start": {
          "character": 2,
          "line": 1
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/contracts.ts",
      "newText": "valueNext",
      "oldText": "value",
      "range": {
        "end": {
          "character": 7,
          "line": 6
        },
        "start": {
          "character": 2,
          "line": 6
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
diff --git a/src/app.html b/src/app.html
--- a/src/app.html
+++ b/src/app.html
@@ -1,14 +1,14 @@
 <template>
-  <p>${value}</p>
+  <p>${valueNext}</p>
   <p>${inherited}</p>
   <p>${overridden}</p>
   <p>${readonlyValue}</p>
   <p>${accessorValue}</p>
   <p>${abstractValue}</p>
   <p>${parameterValue}</p>
   <p>${run()}</p>
   <p>${execute()}</p>
   <p>${overloaded('')}</p>
   <p>${perform()}</p>
   <p>${items.length}</p>
 </template>
diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,105 +1,105 @@
 import { customElement } from 'aurelia';
 import template from './app.html';
 import {
   type AdvancedContract,
   BaseViewModel,
   type PrimaryContract,
   type SecondaryContract,
 } from './contracts';

 @customElement({ name: 'app', template })
 export class App extends BaseViewModel implements PrimaryContract, SecondaryContract, AdvancedContract {
-  value = '';
+  valueNext = '';
   readonly readonlyValue = '';
   abstractValue = '';
   items: string[] = [];

   private accessorBacking = '';

   constructor(public parameterValue: string = '') {
     super();
   }

   get accessorValue(): string {
     return this.accessorBacking;
   }

   set accessorValue(value: string) {
     this.accessorBacking = value;
   }

   run(): void {}

   override overridden = '';

   override execute(): void {}

   overloaded(input: string): string;
   overloaded(input: number): number;
   overloaded(input: string | number): string | number {
     return input;
   }

   perform(): void {}

   readMembers(): string {
     this.run();
     this.execute();
     this.perform();
     this.overloaded('');
     return [
-      this.value,
+      this.valueNext,
       this.inherited,
       this.overridden,
       this.readonlyValue,
       this.accessorValue,
       this.abstractValue,
       this.parameterValue,
       String(this.items.length),
     ].join(':');
   }
 }

 function readPrimary(contract: PrimaryContract): void {
-  contract.value;
+  contract.valueNext;
   contract.run();
 }

 function readSecondary(contract: SecondaryContract): string {
-  return contract.value;
+  return contract.valueNext;
 }

 const contextual: PrimaryContract = {
-  value: '',
+  valueNext: '',
   run() {},
 };

 const value = '';
 const contextualShorthand: PrimaryContract = {
-  value,
+  valueNext: value,
   run() {},
 };

 function destructure(input: PrimaryContract): void {
-  const { value: localValue } = input;
+  const { valueNext: localValue } = input;
   localValue;
-  const { value } = input;
+  const { valueNext: value } = input;
   value;
 }

 class StructuralContract {
   value = '';
   run(): void {}
 }

 const structural = new StructuralContract();
 const structuralAsPrimary: PrimaryContract = structural;
 structural.value;
 structural.run();

 void readPrimary;
 void readSecondary;
 void contextual;
 void contextualShorthand;
 void destructure;
 void structuralAsPrimary;
diff --git a/src/contracts.ts b/src/contracts.ts
--- a/src/contracts.ts
+++ b/src/contracts.ts
@@ -1,27 +1,27 @@
 export interface PrimaryContract {
-  value: string;
+  valueNext: string;
   run(): void;
 }

 export interface SecondaryContract {
-  value: string;
+  valueNext: string;
 }

 export interface AdvancedContract {
   readonly readonlyValue: string;
   accessorValue: string;
   abstractValue: string;
   parameterValue: string;
   overloaded(input: string): string;
   perform(): void;
 }

 export abstract class BaseViewModel {
   inherited = '';
   overridden = '';

   execute(): void {}

   abstract abstractValue: string;
   abstract perform(): void;
 }
```

## base-override-overridden-family

### Probe

```json
{
  "anchor": "${overridden}",
  "at": "overridden",
  "atOccurrence": 1,
  "displayPosition": "src/app.html:4:8",
  "file": "src/app.html",
  "lspPosition": {
    "character": 7,
    "line": 3
  },
  "newName": "replacement",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "overridden",
    "range": {
      "end": {
        "character": 17,
        "line": 3
      },
      "start": {
        "character": 7,
        "line": 3
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
            "newText": "replacement",
            "range": {
              "end": {
                "character": 21,
                "line": 32
              },
              "start": {
                "character": 11,
                "line": 32
              }
            }
          },
          {
            "newText": "replacement",
            "range": {
              "end": {
                "character": 21,
                "line": 52
              },
              "start": {
                "character": 11,
                "line": 52
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts",
          "version": null
        }
      },
      {
        "edits": [
          {
            "newText": "replacement",
            "range": {
              "end": {
                "character": 12,
                "line": 20
              },
              "start": {
                "character": 2,
                "line": 20
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/typescript-related-member-closure/src/contracts.ts",
          "version": null
        }
      },
      {
        "edits": [
          {
            "newText": "replacement",
            "range": {
              "end": {
                "character": 17,
                "line": 3
              },
              "start": {
                "character": 7,
                "line": 3
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/typescript-related-member-closure/src/app.html",
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
    "overridden"
  ],
  "filesTouched": [
    "src/app.html",
    "src/app.ts",
    "src/contracts.ts"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/app.html",
      "newText": "replacement",
      "oldText": "overridden",
      "range": {
        "end": {
          "character": 17,
          "line": 3
        },
        "start": {
          "character": 7,
          "line": 3
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/app.ts",
      "newText": "replacement",
      "oldText": "overridden",
      "range": {
        "end": {
          "character": 21,
          "line": 32
        },
        "start": {
          "character": 11,
          "line": 32
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/app.ts",
      "newText": "replacement",
      "oldText": "overridden",
      "range": {
        "end": {
          "character": 21,
          "line": 52
        },
        "start": {
          "character": 11,
          "line": 52
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/contracts.ts",
      "newText": "replacement",
      "oldText": "overridden",
      "range": {
        "end": {
          "character": 12,
          "line": 20
        },
        "start": {
          "character": 2,
          "line": 20
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
diff --git a/src/app.html b/src/app.html
--- a/src/app.html
+++ b/src/app.html
@@ -1,14 +1,14 @@
 <template>
   <p>${value}</p>
   <p>${inherited}</p>
-  <p>${overridden}</p>
+  <p>${replacement}</p>
   <p>${readonlyValue}</p>
   <p>${accessorValue}</p>
   <p>${abstractValue}</p>
   <p>${parameterValue}</p>
   <p>${run()}</p>
   <p>${execute()}</p>
   <p>${overloaded('')}</p>
   <p>${perform()}</p>
   <p>${items.length}</p>
 </template>
diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,105 +1,105 @@
 import { customElement } from 'aurelia';
 import template from './app.html';
 import {
   type AdvancedContract,
   BaseViewModel,
   type PrimaryContract,
   type SecondaryContract,
 } from './contracts';

 @customElement({ name: 'app', template })
 export class App extends BaseViewModel implements PrimaryContract, SecondaryContract, AdvancedContract {
   value = '';
   readonly readonlyValue = '';
   abstractValue = '';
   items: string[] = [];

   private accessorBacking = '';

   constructor(public parameterValue: string = '') {
     super();
   }

   get accessorValue(): string {
     return this.accessorBacking;
   }

   set accessorValue(value: string) {
     this.accessorBacking = value;
   }

   run(): void {}

-  override overridden = '';
+  override replacement = '';

   override execute(): void {}

   overloaded(input: string): string;
   overloaded(input: number): number;
   overloaded(input: string | number): string | number {
     return input;
   }

   perform(): void {}

   readMembers(): string {
     this.run();
     this.execute();
     this.perform();
     this.overloaded('');
     return [
       this.value,
       this.inherited,
-      this.overridden,
+      this.replacement,
       this.readonlyValue,
       this.accessorValue,
       this.abstractValue,
       this.parameterValue,
       String(this.items.length),
     ].join(':');
   }
 }

 function readPrimary(contract: PrimaryContract): void {
   contract.value;
   contract.run();
 }

 function readSecondary(contract: SecondaryContract): string {
   return contract.value;
 }

 const contextual: PrimaryContract = {
   value: '',
   run() {},
 };

 const value = '';
 const contextualShorthand: PrimaryContract = {
   value,
   run() {},
 };

 function destructure(input: PrimaryContract): void {
   const { value: localValue } = input;
   localValue;
   const { value } = input;
   value;
 }

 class StructuralContract {
   value = '';
   run(): void {}
 }

 const structural = new StructuralContract();
 const structuralAsPrimary: PrimaryContract = structural;
 structural.value;
 structural.run();

 void readPrimary;
 void readSecondary;
 void contextual;
 void contextualShorthand;
 void destructure;
 void structuralAsPrimary;
diff --git a/src/contracts.ts b/src/contracts.ts
--- a/src/contracts.ts
+++ b/src/contracts.ts
@@ -1,27 +1,27 @@
 export interface PrimaryContract {
   value: string;
   run(): void;
 }

 export interface SecondaryContract {
   value: string;
 }

 export interface AdvancedContract {
   readonly readonlyValue: string;
   accessorValue: string;
   abstractValue: string;
   parameterValue: string;
   overloaded(input: string): string;
   perform(): void;
 }

 export abstract class BaseViewModel {
   inherited = '';
-  overridden = '';
+  replacement = '';

   execute(): void {}

   abstract abstractValue: string;
   abstract perform(): void;
 }
```

## accessor-pair-accessorValue-family

### Probe

```json
{
  "anchor": "${accessorValue}",
  "at": "accessorValue",
  "atOccurrence": 1,
  "displayPosition": "src/app.html:6:8",
  "file": "src/app.html",
  "lspPosition": {
    "character": 7,
    "line": 5
  },
  "newName": "displayValue",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "accessorValue",
    "range": {
      "end": {
        "character": 20,
        "line": 5
      },
      "start": {
        "character": 7,
        "line": 5
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
            "newText": "displayValue",
            "range": {
              "end": {
                "character": 19,
                "line": 22
              },
              "start": {
                "character": 6,
                "line": 22
              }
            }
          },
          {
            "newText": "displayValue",
            "range": {
              "end": {
                "character": 19,
                "line": 26
              },
              "start": {
                "character": 6,
                "line": 26
              }
            }
          },
          {
            "newText": "displayValue",
            "range": {
              "end": {
                "character": 24,
                "line": 54
              },
              "start": {
                "character": 11,
                "line": 54
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts",
          "version": null
        }
      },
      {
        "edits": [
          {
            "newText": "displayValue",
            "range": {
              "end": {
                "character": 15,
                "line": 11
              },
              "start": {
                "character": 2,
                "line": 11
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/typescript-related-member-closure/src/contracts.ts",
          "version": null
        }
      },
      {
        "edits": [
          {
            "newText": "displayValue",
            "range": {
              "end": {
                "character": 20,
                "line": 5
              },
              "start": {
                "character": 7,
                "line": 5
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/typescript-related-member-closure/src/app.html",
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
  "editCount": 5,
  "expectedOldTexts": [
    "accessorValue"
  ],
  "filesTouched": [
    "src/app.html",
    "src/app.ts",
    "src/contracts.ts"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/app.html",
      "newText": "displayValue",
      "oldText": "accessorValue",
      "range": {
        "end": {
          "character": 20,
          "line": 5
        },
        "start": {
          "character": 7,
          "line": 5
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/app.ts",
      "newText": "displayValue",
      "oldText": "accessorValue",
      "range": {
        "end": {
          "character": 19,
          "line": 22
        },
        "start": {
          "character": 6,
          "line": 22
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/app.ts",
      "newText": "displayValue",
      "oldText": "accessorValue",
      "range": {
        "end": {
          "character": 19,
          "line": 26
        },
        "start": {
          "character": 6,
          "line": 26
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/app.ts",
      "newText": "displayValue",
      "oldText": "accessorValue",
      "range": {
        "end": {
          "character": 24,
          "line": 54
        },
        "start": {
          "character": 11,
          "line": 54
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/contracts.ts",
      "newText": "displayValue",
      "oldText": "accessorValue",
      "range": {
        "end": {
          "character": 15,
          "line": 11
        },
        "start": {
          "character": 2,
          "line": 11
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
diff --git a/src/app.html b/src/app.html
--- a/src/app.html
+++ b/src/app.html
@@ -1,14 +1,14 @@
 <template>
   <p>${value}</p>
   <p>${inherited}</p>
   <p>${overridden}</p>
   <p>${readonlyValue}</p>
-  <p>${accessorValue}</p>
+  <p>${displayValue}</p>
   <p>${abstractValue}</p>
   <p>${parameterValue}</p>
   <p>${run()}</p>
   <p>${execute()}</p>
   <p>${overloaded('')}</p>
   <p>${perform()}</p>
   <p>${items.length}</p>
 </template>
diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,105 +1,105 @@
 import { customElement } from 'aurelia';
 import template from './app.html';
 import {
   type AdvancedContract,
   BaseViewModel,
   type PrimaryContract,
   type SecondaryContract,
 } from './contracts';

 @customElement({ name: 'app', template })
 export class App extends BaseViewModel implements PrimaryContract, SecondaryContract, AdvancedContract {
   value = '';
   readonly readonlyValue = '';
   abstractValue = '';
   items: string[] = [];

   private accessorBacking = '';

   constructor(public parameterValue: string = '') {
     super();
   }

-  get accessorValue(): string {
+  get displayValue(): string {
     return this.accessorBacking;
   }

-  set accessorValue(value: string) {
+  set displayValue(value: string) {
     this.accessorBacking = value;
   }

   run(): void {}

   override overridden = '';

   override execute(): void {}

   overloaded(input: string): string;
   overloaded(input: number): number;
   overloaded(input: string | number): string | number {
     return input;
   }

   perform(): void {}

   readMembers(): string {
     this.run();
     this.execute();
     this.perform();
     this.overloaded('');
     return [
       this.value,
       this.inherited,
       this.overridden,
       this.readonlyValue,
-      this.accessorValue,
+      this.displayValue,
       this.abstractValue,
       this.parameterValue,
       String(this.items.length),
     ].join(':');
   }
 }

 function readPrimary(contract: PrimaryContract): void {
   contract.value;
   contract.run();
 }

 function readSecondary(contract: SecondaryContract): string {
   return contract.value;
 }

 const contextual: PrimaryContract = {
   value: '',
   run() {},
 };

 const value = '';
 const contextualShorthand: PrimaryContract = {
   value,
   run() {},
 };

 function destructure(input: PrimaryContract): void {
   const { value: localValue } = input;
   localValue;
   const { value } = input;
   value;
 }

 class StructuralContract {
   value = '';
   run(): void {}
 }

 const structural = new StructuralContract();
 const structuralAsPrimary: PrimaryContract = structural;
 structural.value;
 structural.run();

 void readPrimary;
 void readSecondary;
 void contextual;
 void contextualShorthand;
 void destructure;
 void structuralAsPrimary;
diff --git a/src/contracts.ts b/src/contracts.ts
--- a/src/contracts.ts
+++ b/src/contracts.ts
@@ -1,27 +1,27 @@
 export interface PrimaryContract {
   value: string;
   run(): void;
 }

 export interface SecondaryContract {
   value: string;
 }

 export interface AdvancedContract {
   readonly readonlyValue: string;
-  accessorValue: string;
+  displayValue: string;
   abstractValue: string;
   parameterValue: string;
   overloaded(input: string): string;
   perform(): void;
 }

 export abstract class BaseViewModel {
   inherited = '';
   overridden = '';

   execute(): void {}

   abstract abstractValue: string;
   abstract perform(): void;
 }
```

## overload-overloaded-family

### Probe

```json
{
  "anchor": "${overloaded('')}",
  "at": "overloaded",
  "atOccurrence": 1,
  "displayPosition": "src/app.html:11:8",
  "file": "src/app.html",
  "lspPosition": {
    "character": 7,
    "line": 10
  },
  "newName": "invoke",
  "occurrence": 1
}
```

### prepareRename

```json
{
  "outcome": "result",
  "result": {
    "placeholder": "overloaded",
    "range": {
      "end": {
        "character": 17,
        "line": 10
      },
      "start": {
        "character": 7,
        "line": 10
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
            "newText": "invoke",
            "range": {
              "end": {
                "character": 12,
                "line": 36
              },
              "start": {
                "character": 2,
                "line": 36
              }
            }
          },
          {
            "newText": "invoke",
            "range": {
              "end": {
                "character": 12,
                "line": 37
              },
              "start": {
                "character": 2,
                "line": 37
              }
            }
          },
          {
            "newText": "invoke",
            "range": {
              "end": {
                "character": 12,
                "line": 38
              },
              "start": {
                "character": 2,
                "line": 38
              }
            }
          },
          {
            "newText": "invoke",
            "range": {
              "end": {
                "character": 19,
                "line": 48
              },
              "start": {
                "character": 9,
                "line": 48
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts",
          "version": null
        }
      },
      {
        "edits": [
          {
            "newText": "invoke",
            "range": {
              "end": {
                "character": 12,
                "line": 14
              },
              "start": {
                "character": 2,
                "line": 14
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/typescript-related-member-closure/src/contracts.ts",
          "version": null
        }
      },
      {
        "edits": [
          {
            "newText": "invoke",
            "range": {
              "end": {
                "character": 17,
                "line": 10
              },
              "start": {
                "character": 7,
                "line": 10
              }
            }
          }
        ],
        "textDocument": {
          "uri": "fixtures://pressure/typescript-related-member-closure/src/app.html",
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
  "editCount": 6,
  "expectedOldTexts": [
    "overloaded"
  ],
  "filesTouched": [
    "src/app.html",
    "src/app.ts",
    "src/contracts.ts"
  ],
  "outcome": "applied",
  "validation": [
    {
      "file": "src/app.html",
      "newText": "invoke",
      "oldText": "overloaded",
      "range": {
        "end": {
          "character": 17,
          "line": 10
        },
        "start": {
          "character": 7,
          "line": 10
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/app.ts",
      "newText": "invoke",
      "oldText": "overloaded",
      "range": {
        "end": {
          "character": 12,
          "line": 36
        },
        "start": {
          "character": 2,
          "line": 36
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/app.ts",
      "newText": "invoke",
      "oldText": "overloaded",
      "range": {
        "end": {
          "character": 12,
          "line": 37
        },
        "start": {
          "character": 2,
          "line": 37
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/app.ts",
      "newText": "invoke",
      "oldText": "overloaded",
      "range": {
        "end": {
          "character": 12,
          "line": 38
        },
        "start": {
          "character": 2,
          "line": 38
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/app.ts",
      "newText": "invoke",
      "oldText": "overloaded",
      "range": {
        "end": {
          "character": 19,
          "line": 48
        },
        "start": {
          "character": 9,
          "line": 48
        }
      },
      "source": "documentChanges",
      "status": "ok"
    },
    {
      "file": "src/contracts.ts",
      "newText": "invoke",
      "oldText": "overloaded",
      "range": {
        "end": {
          "character": 12,
          "line": 14
        },
        "start": {
          "character": 2,
          "line": 14
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
diff --git a/src/app.html b/src/app.html
--- a/src/app.html
+++ b/src/app.html
@@ -1,14 +1,14 @@
 <template>
   <p>${value}</p>
   <p>${inherited}</p>
   <p>${overridden}</p>
   <p>${readonlyValue}</p>
   <p>${accessorValue}</p>
   <p>${abstractValue}</p>
   <p>${parameterValue}</p>
   <p>${run()}</p>
   <p>${execute()}</p>
-  <p>${overloaded('')}</p>
+  <p>${invoke('')}</p>
   <p>${perform()}</p>
   <p>${items.length}</p>
 </template>
diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,105 +1,105 @@
 import { customElement } from 'aurelia';
 import template from './app.html';
 import {
   type AdvancedContract,
   BaseViewModel,
   type PrimaryContract,
   type SecondaryContract,
 } from './contracts';

 @customElement({ name: 'app', template })
 export class App extends BaseViewModel implements PrimaryContract, SecondaryContract, AdvancedContract {
   value = '';
   readonly readonlyValue = '';
   abstractValue = '';
   items: string[] = [];

   private accessorBacking = '';

   constructor(public parameterValue: string = '') {
     super();
   }

   get accessorValue(): string {
     return this.accessorBacking;
   }

   set accessorValue(value: string) {
     this.accessorBacking = value;
   }

   run(): void {}

   override overridden = '';

   override execute(): void {}

-  overloaded(input: string): string;
-  overloaded(input: number): number;
-  overloaded(input: string | number): string | number {
+  invoke(input: string): string;
+  invoke(input: number): number;
+  invoke(input: string | number): string | number {
     return input;
   }

   perform(): void {}

   readMembers(): string {
     this.run();
     this.execute();
     this.perform();
-    this.overloaded('');
+    this.invoke('');
     return [
       this.value,
       this.inherited,
       this.overridden,
       this.readonlyValue,
       this.accessorValue,
       this.abstractValue,
       this.parameterValue,
       String(this.items.length),
     ].join(':');
   }
 }

 function readPrimary(contract: PrimaryContract): void {
   contract.value;
   contract.run();
 }

 function readSecondary(contract: SecondaryContract): string {
   return contract.value;
 }

 const contextual: PrimaryContract = {
   value: '',
   run() {},
 };

 const value = '';
 const contextualShorthand: PrimaryContract = {
   value,
   run() {},
 };

 function destructure(input: PrimaryContract): void {
   const { value: localValue } = input;
   localValue;
   const { value } = input;
   value;
 }

 class StructuralContract {
   value = '';
   run(): void {}
 }

 const structural = new StructuralContract();
 const structuralAsPrimary: PrimaryContract = structural;
 structural.value;
 structural.run();

 void readPrimary;
 void readSecondary;
 void contextual;
 void contextualShorthand;
 void destructure;
 void structuralAsPrimary;
diff --git a/src/contracts.ts b/src/contracts.ts
--- a/src/contracts.ts
+++ b/src/contracts.ts
@@ -1,27 +1,27 @@
 export interface PrimaryContract {
   value: string;
   run(): void;
 }

 export interface SecondaryContract {
   value: string;
 }

 export interface AdvancedContract {
   readonly readonlyValue: string;
   accessorValue: string;
   abstractValue: string;
   parameterValue: string;
-  overloaded(input: string): string;
+  invoke(input: string): string;
   perform(): void;
 }

 export abstract class BaseViewModel {
   inherited = '';
   overridden = '';

   execute(): void {}

   abstract abstractValue: string;
   abstract perform(): void;
 }
```

## native-array-length-refusal

### Probe

```json
{
  "anchor": "${items.length}",
  "at": "length",
  "atOccurrence": 1,
  "displayPosition": "src/app.html:13:14",
  "file": "src/app.html",
  "lspPosition": {
    "character": 13,
    "line": 12
  },
  "newName": "size",
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
    "message": "TypeScript does not allow length to be renamed. You cannot rename elements that are defined in the standard TypeScript library."
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
    "length"
  ],
  "filesTouched": [],
  "outcome": "rename-error",
  "validation": []
}
```

### Applied diff

_No in-memory diff._
