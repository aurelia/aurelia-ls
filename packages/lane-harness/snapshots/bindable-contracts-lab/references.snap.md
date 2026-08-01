# bindable-contracts-lab references lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/bindable-contracts-lab`
Probe file: `packages/lane-harness/probes/bindable-contracts-lab.probes.json`
Lane: `references`

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
          "character": 37,
          "line": 37
        },
        "start": {
          "character": 23,
          "line": 37
        }
      },
      "uri": "fixtures://pressure/bindable-contracts-lab/src/bindable-lab-app.html"
    },
    {
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
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    },
    {
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
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    },
    {
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
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
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
      "file": "src/bindable-lab-app.html",
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
      "rangeText": "external-value",
      "uri": "fixtures://pressure/bindable-contracts-lab/src/bindable-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/binding-contract-surfaces.ts",
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
      "rangeText": "externalValue",
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    },
    {
      "anomaly": null,
      "file": "src/binding-contract-surfaces.ts",
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
      "rangeText": "externalValue",
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    },
    {
      "anomaly": null,
      "file": "src/binding-contract-surfaces.ts",
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
      "rangeText": "externalValue",
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    }
  ]
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
          "character": 37,
          "line": 29
        },
        "start": {
          "character": 26,
          "line": 29
        }
      },
      "uri": "fixtures://pressure/bindable-contracts-lab/src/bindable-lab-app.html"
    },
    {
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
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    },
    {
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
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    },
    {
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
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
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
      "file": "src/bindable-lab-app.html",
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
      "rangeText": "base-static",
      "uri": "fixtures://pressure/bindable-contracts-lab/src/bindable-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/binding-contract-surfaces.ts",
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
      "rangeText": "baseStatic",
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    },
    {
      "anomaly": null,
      "file": "src/binding-contract-surfaces.ts",
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
      "rangeText": "baseStatic",
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    },
    {
      "anomaly": null,
      "file": "src/binding-contract-surfaces.ts",
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
      "rangeText": "baseStatic",
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    }
  ]
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
          "character": 18,
          "line": 33
        },
        "start": {
          "character": 4,
          "line": 33
        }
      },
      "uri": "fixtures://pressure/bindable-contracts-lab/src/bindable-lab-app.html"
    },
    {
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
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    },
    {
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
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
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
      "file": "src/bindable-lab-app.html",
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
      "rangeText": "inherited-only",
      "uri": "fixtures://pressure/bindable-contracts-lab/src/bindable-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/binding-contract-surfaces.ts",
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
      "rangeText": "inheritedOnly",
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    },
    {
      "anomaly": null,
      "file": "src/binding-contract-surfaces.ts",
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
      "rangeText": "inheritedOnly",
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    }
  ]
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
          "character": 15,
          "line": 34
        },
        "start": {
          "character": 4,
          "line": 34
        }
      },
      "uri": "fixtures://pressure/bindable-contracts-lab/src/bindable-lab-app.html"
    },
    {
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
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    },
    {
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
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    },
    {
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
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
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
      "file": "src/bindable-lab-app.html",
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
      "rangeText": "static-only",
      "uri": "fixtures://pressure/bindable-contracts-lab/src/bindable-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/binding-contract-surfaces.ts",
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
      "rangeText": "staticOnly",
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    },
    {
      "anomaly": null,
      "file": "src/binding-contract-surfaces.ts",
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
      "rangeText": "staticOnly",
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    },
    {
      "anomaly": null,
      "file": "src/binding-contract-surfaces.ts",
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
      "rangeText": "staticOnly",
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    }
  ]
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
          "character": 19,
          "line": 35
        },
        "start": {
          "character": 4,
          "line": 35
        }
      },
      "uri": "fixtures://pressure/bindable-contracts-lab/src/bindable-lab-app.html"
    },
    {
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
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    },
    {
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
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    },
    {
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
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
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
      "file": "src/bindable-lab-app.html",
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
      "rangeText": "definition-only",
      "uri": "fixtures://pressure/bindable-contracts-lab/src/bindable-lab-app.html"
    },
    {
      "anomaly": null,
      "file": "src/binding-contract-surfaces.ts",
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
      "rangeText": "definitionOnly",
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    },
    {
      "anomaly": null,
      "file": "src/binding-contract-surfaces.ts",
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
      "rangeText": "definitionOnly",
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    },
    {
      "anomaly": null,
      "file": "src/binding-contract-surfaces.ts",
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
      "rangeText": "definitionOnly",
      "uri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    }
  ]
}
```

## inline-built-in-one-time-command-usage

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
          "character": 41,
          "line": 17
        },
        "start": {
          "character": 33,
          "line": 17
        }
      },
      "uri": "fixtures://pressure/bindable-contracts-lab/src/bindable-lab-app.html"
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
  "locationCount": 1,
  "locations": [
    {
      "anomaly": null,
      "file": "src/bindable-lab-app.html",
      "range": {
        "end": {
          "character": 41,
          "line": 17
        },
        "start": {
          "character": 33,
          "line": 17
        }
      },
      "rangeText": "one-time",
      "uri": "fixtures://pressure/bindable-contracts-lab/src/bindable-lab-app.html"
    }
  ]
}
```
