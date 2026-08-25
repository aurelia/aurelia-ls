# resource-registration-effective-definitions references lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/resource-registration-effective-definitions`
Probe file: `packages/lane-harness/probes/resource-registration-effective-definitions.probes.json`
Lane: `references`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## binding-command-class-origin

### Probe

```json
{
  "anchor": "export class SharedBindingCommand",
  "at": "SharedBindingCommand",
  "atOccurrence": 1,
  "displayPosition": "src/resources.ts:153:14",
  "file": "src/resources.ts",
  "lspPosition": {
    "character": 13,
    "line": 152
  },
  "occurrence": 1
}
```

### references

```json
{
  "outcome": "result",
  "result": [
    {
      "range": {
        "end": {
          "character": 54,
          "line": 19
        },
        "start": {
          "character": 48,
          "line": 19
        }
      },
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/effective-definitions-app.html"
    },
    {
      "range": {
        "end": {
          "character": 21,
          "line": 21
        },
        "start": {
          "character": 15,
          "line": 21
        }
      },
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/effective-definitions-app.html"
    },
    {
      "range": {
        "end": {
          "character": 23,
          "line": 151
        },
        "start": {
          "character": 17,
          "line": 151
        }
      },
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/resources.ts"
    }
  ]
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### Resolved locations

```json
{
  "locationCount": 3,
  "locations": [
    {
      "anomaly": null,
      "file": "src/effective-definitions-app.html",
      "range": {
        "end": {
          "character": 54,
          "line": 19
        },
        "start": {
          "character": 48,
          "line": 19
        }
      },
      "rangeText": "shared",
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/effective-definitions-app.html"
    },
    {
      "anomaly": null,
      "file": "src/effective-definitions-app.html",
      "range": {
        "end": {
          "character": 21,
          "line": 21
        },
        "start": {
          "character": 15,
          "line": 21
        }
      },
      "rangeText": "shared",
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/effective-definitions-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 23,
          "line": 151
        },
        "start": {
          "character": 17,
          "line": 151
        }
      },
      "rangeText": "shared",
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/resources.ts"
    }
  ]
}
```

## binding-command-static-class-origin

### Probe

```json
{
  "anchor": "export class StaticBindingCommand",
  "at": "StaticBindingCommand",
  "atOccurrence": 1,
  "displayPosition": "src/resources.ts:163:14",
  "file": "src/resources.ts",
  "lspPosition": {
    "character": 13,
    "line": 162
  },
  "occurrence": 1
}
```

### references

```json
{
  "outcome": "result",
  "result": [
    {
      "range": {
        "end": {
          "character": 29,
          "line": 22
        },
        "start": {
          "character": 15,
          "line": 22
        }
      },
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/effective-definitions-app.html"
    },
    {
      "range": {
        "end": {
          "character": 25,
          "line": 23
        },
        "start": {
          "character": 15,
          "line": 23
        }
      },
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/effective-definitions-app.html"
    },
    {
      "range": {
        "end": {
          "character": 25,
          "line": 165
        },
        "start": {
          "character": 11,
          "line": 165
        }
      },
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/resources.ts"
    },
    {
      "range": {
        "end": {
          "character": 25,
          "line": 166
        },
        "start": {
          "character": 15,
          "line": 166
        }
      },
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/resources.ts"
    }
  ]
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### Resolved locations

```json
{
  "locationCount": 4,
  "locations": [
    {
      "anomaly": null,
      "file": "src/effective-definitions-app.html",
      "range": {
        "end": {
          "character": 29,
          "line": 22
        },
        "start": {
          "character": 15,
          "line": 22
        }
      },
      "rangeText": "static-command",
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/effective-definitions-app.html"
    },
    {
      "anomaly": null,
      "file": "src/effective-definitions-app.html",
      "range": {
        "end": {
          "character": 25,
          "line": 23
        },
        "start": {
          "character": 15,
          "line": 23
        }
      },
      "rangeText": "static-cmd",
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/effective-definitions-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 25,
          "line": 165
        },
        "start": {
          "character": 11,
          "line": 165
        }
      },
      "rangeText": "static-command",
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/resources.ts"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 25,
          "line": 166
        },
        "start": {
          "character": 15,
          "line": 166
        }
      },
      "rangeText": "static-cmd",
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/resources.ts"
    }
  ]
}
```

## binding-command-alias-origin

### Probe

```json
{
  "anchor": "aliases: ['static-cmd']",
  "at": "static-cmd",
  "atOccurrence": 1,
  "displayPosition": "src/resources.ts:167:16",
  "file": "src/resources.ts",
  "lspPosition": {
    "character": 15,
    "line": 166
  },
  "occurrence": 1
}
```

### references

```json
{
  "outcome": "result",
  "result": [
    {
      "range": {
        "end": {
          "character": 29,
          "line": 22
        },
        "start": {
          "character": 15,
          "line": 22
        }
      },
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/effective-definitions-app.html"
    },
    {
      "range": {
        "end": {
          "character": 25,
          "line": 23
        },
        "start": {
          "character": 15,
          "line": 23
        }
      },
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/effective-definitions-app.html"
    },
    {
      "range": {
        "end": {
          "character": 25,
          "line": 165
        },
        "start": {
          "character": 11,
          "line": 165
        }
      },
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/resources.ts"
    },
    {
      "range": {
        "end": {
          "character": 25,
          "line": 166
        },
        "start": {
          "character": 15,
          "line": 166
        }
      },
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/resources.ts"
    }
  ]
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### Resolved locations

```json
{
  "locationCount": 4,
  "locations": [
    {
      "anomaly": null,
      "file": "src/effective-definitions-app.html",
      "range": {
        "end": {
          "character": 29,
          "line": 22
        },
        "start": {
          "character": 15,
          "line": 22
        }
      },
      "rangeText": "static-command",
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/effective-definitions-app.html"
    },
    {
      "anomaly": null,
      "file": "src/effective-definitions-app.html",
      "range": {
        "end": {
          "character": 25,
          "line": 23
        },
        "start": {
          "character": 15,
          "line": 23
        }
      },
      "rangeText": "static-cmd",
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/effective-definitions-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 25,
          "line": 165
        },
        "start": {
          "character": 11,
          "line": 165
        }
      },
      "rangeText": "static-command",
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/resources.ts"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 25,
          "line": 166
        },
        "start": {
          "character": 15,
          "line": 166
        }
      },
      "rangeText": "static-cmd",
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/resources.ts"
    }
  ]
}
```

## attribute-pattern-class-origin

### Probe

```json
{
  "anchor": "export class DataAttributePattern",
  "at": "DataAttributePattern",
  "atOccurrence": 1,
  "displayPosition": "src/resources.ts:189:14",
  "file": "src/resources.ts",
  "lspPosition": {
    "character": 13,
    "line": 188
  },
  "occurrence": 1
}
```

### references

```json
{
  "outcome": "result",
  "result": [
    {
      "range": {
        "end": {
          "character": 79,
          "line": 19
        },
        "start": {
          "character": 75,
          "line": 19
        }
      },
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/effective-definitions-app.html"
    },
    {
      "range": {
        "end": {
          "character": 17,
          "line": 26
        },
        "start": {
          "character": 13,
          "line": 26
        }
      },
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/effective-definitions-app.html"
    },
    {
      "range": {
        "end": {
          "character": 39,
          "line": 187
        },
        "start": {
          "character": 30,
          "line": 187
        }
      },
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/resources.ts"
    }
  ]
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### Resolved locations

```json
{
  "locationCount": 3,
  "locations": [
    {
      "anomaly": null,
      "file": "src/effective-definitions-app.html",
      "range": {
        "end": {
          "character": 79,
          "line": 19
        },
        "start": {
          "character": 75,
          "line": 19
        }
      },
      "rangeText": "data",
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/effective-definitions-app.html"
    },
    {
      "anomaly": null,
      "file": "src/effective-definitions-app.html",
      "range": {
        "end": {
          "character": 17,
          "line": 26
        },
        "start": {
          "character": 13,
          "line": 26
        }
      },
      "rangeText": "data",
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/effective-definitions-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 39,
          "line": 187
        },
        "start": {
          "character": 30,
          "line": 187
        }
      },
      "rangeText": "PART.data",
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/resources.ts"
    }
  ]
}
```

## attribute-pattern-metadata-origin

### Probe

```json
{
  "anchor": "pattern: 'PART.data'",
  "at": "PART.data",
  "atOccurrence": 1,
  "displayPosition": "src/resources.ts:188:31",
  "file": "src/resources.ts",
  "lspPosition": {
    "character": 30,
    "line": 187
  },
  "occurrence": 1
}
```

### references

```json
{
  "outcome": "result",
  "result": [
    {
      "range": {
        "end": {
          "character": 79,
          "line": 19
        },
        "start": {
          "character": 75,
          "line": 19
        }
      },
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/effective-definitions-app.html"
    },
    {
      "range": {
        "end": {
          "character": 17,
          "line": 26
        },
        "start": {
          "character": 13,
          "line": 26
        }
      },
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/effective-definitions-app.html"
    },
    {
      "range": {
        "end": {
          "character": 39,
          "line": 187
        },
        "start": {
          "character": 30,
          "line": 187
        }
      },
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/resources.ts"
    }
  ]
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### Resolved locations

```json
{
  "locationCount": 3,
  "locations": [
    {
      "anomaly": null,
      "file": "src/effective-definitions-app.html",
      "range": {
        "end": {
          "character": 79,
          "line": 19
        },
        "start": {
          "character": 75,
          "line": 19
        }
      },
      "rangeText": "data",
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/effective-definitions-app.html"
    },
    {
      "anomaly": null,
      "file": "src/effective-definitions-app.html",
      "range": {
        "end": {
          "character": 17,
          "line": 26
        },
        "start": {
          "character": 13,
          "line": 26
        }
      },
      "rangeText": "data",
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/effective-definitions-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 39,
          "line": 187
        },
        "start": {
          "character": 30,
          "line": 187
        }
      },
      "rangeText": "PART.data",
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/resources.ts"
    }
  ]
}
```

## factory-attribute-pattern-class-origin

### Probe

```json
{
  "anchor": "export class CreatedAttributePattern",
  "at": "CreatedAttributePattern",
  "atOccurrence": 1,
  "displayPosition": "src/resources.ts:195:14",
  "file": "src/resources.ts",
  "lspPosition": {
    "character": 13,
    "line": 194
  },
  "occurrence": 1
}
```

### references

```json
{
  "outcome": "result",
  "result": [
    {
      "range": {
        "end": {
          "character": 21,
          "line": 27
        },
        "start": {
          "character": 14,
          "line": 27
        }
      },
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/effective-definitions-app.html"
    },
    {
      "range": {
        "end": {
          "character": 28,
          "line": 201
        },
        "start": {
          "character": 15,
          "line": 201
        }
      },
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/resources.ts"
    }
  ]
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### Resolved locations

```json
{
  "locationCount": 2,
  "locations": [
    {
      "anomaly": null,
      "file": "src/effective-definitions-app.html",
      "range": {
        "end": {
          "character": 21,
          "line": 27
        },
        "start": {
          "character": 14,
          "line": 27
        }
      },
      "rangeText": "created",
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/effective-definitions-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 28,
          "line": 201
        },
        "start": {
          "character": 15,
          "line": 201
        }
      },
      "rangeText": "PART::created",
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/resources.ts"
    }
  ]
}
```

## factory-attribute-pattern-metadata-origin

### Probe

```json
{
  "anchor": "pattern: 'PART::created'",
  "at": "PART::created",
  "atOccurrence": 1,
  "displayPosition": "src/resources.ts:202:16",
  "file": "src/resources.ts",
  "lspPosition": {
    "character": 15,
    "line": 201
  },
  "occurrence": 1
}
```

### references

```json
{
  "outcome": "result",
  "result": [
    {
      "range": {
        "end": {
          "character": 21,
          "line": 27
        },
        "start": {
          "character": 14,
          "line": 27
        }
      },
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/effective-definitions-app.html"
    },
    {
      "range": {
        "end": {
          "character": 28,
          "line": 201
        },
        "start": {
          "character": 15,
          "line": 201
        }
      },
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/resources.ts"
    }
  ]
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### Resolved locations

```json
{
  "locationCount": 2,
  "locations": [
    {
      "anomaly": null,
      "file": "src/effective-definitions-app.html",
      "range": {
        "end": {
          "character": 21,
          "line": 27
        },
        "start": {
          "character": 14,
          "line": 27
        }
      },
      "rangeText": "created",
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/effective-definitions-app.html"
    },
    {
      "anomaly": null,
      "file": "src/resources.ts",
      "range": {
        "end": {
          "character": 28,
          "line": 201
        },
        "start": {
          "character": 15,
          "line": 201
        }
      },
      "rangeText": "PART::created",
      "uri": "fixtures://pressure/resource-registration-effective-definitions/src/resources.ts"
    }
  ]
}
```
