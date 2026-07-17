# bindable-contracts-lab definition lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/bindable-contracts-lab`
Probe file: `packages/lane-harness/probes/bindable-contracts-lab.probes.json`
Lane: `definition`

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

### definition

```json
{
  "outcome": "result",
  "result": [
    {
      "targetRange": {
        "end": {
          "character": 15,
          "line": 105
        },
        "start": {
          "character": 2,
          "line": 105
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 15,
          "line": 105
        },
        "start": {
          "character": 2,
          "line": 105
        }
      },
      "targetUri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    }
  ]
}
```

### Resolved locations

```json
{
  "locationCount": 1,
  "locations": [
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

### definition

```json
{
  "outcome": "result",
  "result": [
    {
      "targetRange": {
        "end": {
          "character": 12,
          "line": 52
        },
        "start": {
          "character": 2,
          "line": 52
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 12,
          "line": 52
        },
        "start": {
          "character": 2,
          "line": 52
        }
      },
      "targetUri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    }
  ]
}
```

### Resolved locations

```json
{
  "locationCount": 1,
  "locations": [
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

### definition

```json
{
  "outcome": "result",
  "result": [
    {
      "targetRange": {
        "end": {
          "character": 25,
          "line": 75
        },
        "start": {
          "character": 12,
          "line": 75
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 25,
          "line": 75
        },
        "start": {
          "character": 12,
          "line": 75
        }
      },
      "targetUri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    }
  ]
}
```

### Resolved locations

```json
{
  "locationCount": 1,
  "locations": [
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

### definition

```json
{
  "outcome": "result",
  "result": [
    {
      "targetRange": {
        "end": {
          "character": 12,
          "line": 95
        },
        "start": {
          "character": 2,
          "line": 95
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 12,
          "line": 95
        },
        "start": {
          "character": 2,
          "line": 95
        }
      },
      "targetUri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    }
  ]
}
```

### Resolved locations

```json
{
  "locationCount": 1,
  "locations": [
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

### definition

```json
{
  "outcome": "result",
  "result": [
    {
      "targetRange": {
        "end": {
          "character": 16,
          "line": 96
        },
        "start": {
          "character": 2,
          "line": 96
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 16,
          "line": 96
        },
        "start": {
          "character": 2,
          "line": 96
        }
      },
      "targetUri": "fixtures://pressure/bindable-contracts-lab/src/binding-contract-surfaces.ts"
    }
  ]
}
```

### Resolved locations

```json
{
  "locationCount": 1,
  "locations": [
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

## element-alias-property-target

### Probe

```json
{
  "anchor": "display-label.bind=\"aliasLabel\"",
  "at": "display-label",
  "atOccurrence": 1,
  "displayPosition": "src/bindable-lab-app.html:4:5",
  "file": "src/bindable-lab-app.html",
  "lspPosition": {
    "character": 4,
    "line": 3
  },
  "occurrence": 1
}
```

### definition

```json
{
  "outcome": "result",
  "result": [
    {
      "targetRange": {
        "end": {
          "character": 39,
          "line": 11
        },
        "start": {
          "character": 26,
          "line": 11
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 39,
          "line": 11
        },
        "start": {
          "character": 26,
          "line": 11
        }
      },
      "targetUri": "fixtures://pressure/bindable-contracts-lab/src/profile-card.ts"
    }
  ]
}
```

### Resolved locations

```json
{
  "locationCount": 1,
  "locations": [
    {
      "anomaly": null,
      "file": "src/profile-card.ts",
      "range": {
        "end": {
          "character": 39,
          "line": 11
        },
        "start": {
          "character": 26,
          "line": 11
        }
      },
      "rangeText": "display-label",
      "uri": "fixtures://pressure/bindable-contracts-lab/src/profile-card.ts"
    }
  ]
}
```

## inline-alias-property-target

### Probe

```json
{
  "anchor": "display-hint=\"message.bind: statusMessage; display-label.bind: aliasLabel",
  "at": "display-label",
  "atOccurrence": 1,
  "displayPosition": "src/bindable-lab-app.html:17:55",
  "file": "src/bindable-lab-app.html",
  "lspPosition": {
    "character": 54,
    "line": 16
  },
  "occurrence": 1
}
```

### definition

```json
{
  "outcome": "result",
  "result": [
    {
      "targetRange": {
        "end": {
          "character": 39,
          "line": 8
        },
        "start": {
          "character": 26,
          "line": 8
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 39,
          "line": 8
        },
        "start": {
          "character": 26,
          "line": 8
        }
      },
      "targetUri": "fixtures://pressure/bindable-contracts-lab/src/display-hint.ts"
    }
  ]
}
```

### Resolved locations

```json
{
  "locationCount": 1,
  "locations": [
    {
      "anomaly": null,
      "file": "src/display-hint.ts",
      "range": {
        "end": {
          "character": 39,
          "line": 8
        },
        "start": {
          "character": 26,
          "line": 8
        }
      },
      "rangeText": "display-label",
      "uri": "fixtures://pressure/bindable-contracts-lab/src/display-hint.ts"
    }
  ]
}
```
