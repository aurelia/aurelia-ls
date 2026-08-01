# typescript-related-member-closure references lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/typescript-related-member-closure`
Probe file: `packages/lane-harness/probes/typescript-related-member-closure.probes.json`
Lane: `references`

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
          "character": 16,
          "line": 50
        },
        "start": {
          "character": 11,
          "line": 50
        }
      },
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
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
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
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
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
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
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
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
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
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
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
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
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
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
      "uri": "fixtures://pressure/typescript-related-member-closure/src/contracts.ts"
    },
    {
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
      "uri": "fixtures://pressure/typescript-related-member-closure/src/contracts.ts"
    },
    {
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
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.html"
    },
    {
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
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
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
  "locationCount": 11,
  "locations": [
    {
      "anomaly": null,
      "file": "src/app.html",
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
      "rangeText": "value",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.html"
    },
    {
      "anomaly": null,
      "file": "src/app.ts",
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
      "rangeText": "value",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
      "anomaly": null,
      "file": "src/app.ts",
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
      "rangeText": "value",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
      "anomaly": null,
      "file": "src/app.ts",
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
      "rangeText": "value",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
      "anomaly": null,
      "file": "src/app.ts",
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
      "rangeText": "value",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
      "anomaly": null,
      "file": "src/app.ts",
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
      "rangeText": "value",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
      "anomaly": null,
      "file": "src/app.ts",
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
      "rangeText": "value",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
      "anomaly": null,
      "file": "src/app.ts",
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
      "rangeText": "value",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
      "anomaly": null,
      "file": "src/app.ts",
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
      "rangeText": "value",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
      "anomaly": null,
      "file": "src/contracts.ts",
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
      "rangeText": "value",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/contracts.ts"
    },
    {
      "anomaly": null,
      "file": "src/contracts.ts",
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
      "rangeText": "value",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/contracts.ts"
    }
  ]
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
          "line": 52
        },
        "start": {
          "character": 11,
          "line": 52
        }
      },
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
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
      "uri": "fixtures://pressure/typescript-related-member-closure/src/contracts.ts"
    },
    {
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
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.html"
    },
    {
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
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
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
      "file": "src/app.html",
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
      "rangeText": "overridden",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.html"
    },
    {
      "anomaly": null,
      "file": "src/app.ts",
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
      "rangeText": "overridden",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
      "anomaly": null,
      "file": "src/app.ts",
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
      "rangeText": "overridden",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
      "anomaly": null,
      "file": "src/contracts.ts",
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
      "rangeText": "overridden",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/contracts.ts"
    }
  ]
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
          "line": 26
        },
        "start": {
          "character": 6,
          "line": 26
        }
      },
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
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
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
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
      "uri": "fixtures://pressure/typescript-related-member-closure/src/contracts.ts"
    },
    {
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
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.html"
    },
    {
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
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
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
  "locationCount": 5,
  "locations": [
    {
      "anomaly": null,
      "file": "src/app.html",
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
      "rangeText": "accessorValue",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.html"
    },
    {
      "anomaly": null,
      "file": "src/app.ts",
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
      "rangeText": "accessorValue",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
      "anomaly": null,
      "file": "src/app.ts",
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
      "rangeText": "accessorValue",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
      "anomaly": null,
      "file": "src/app.ts",
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
      "rangeText": "accessorValue",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
      "anomaly": null,
      "file": "src/contracts.ts",
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
      "rangeText": "accessorValue",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/contracts.ts"
    }
  ]
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
          "character": 12,
          "line": 37
        },
        "start": {
          "character": 2,
          "line": 37
        }
      },
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
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
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
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
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
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
      "uri": "fixtures://pressure/typescript-related-member-closure/src/contracts.ts"
    },
    {
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
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.html"
    },
    {
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
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
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
  "locationCount": 6,
  "locations": [
    {
      "anomaly": null,
      "file": "src/app.html",
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
      "rangeText": "overloaded",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.html"
    },
    {
      "anomaly": null,
      "file": "src/app.ts",
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
      "rangeText": "overloaded",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
      "anomaly": null,
      "file": "src/app.ts",
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
      "rangeText": "overloaded",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
      "anomaly": null,
      "file": "src/app.ts",
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
      "rangeText": "overloaded",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
      "anomaly": null,
      "file": "src/app.ts",
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
      "rangeText": "overloaded",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
      "anomaly": null,
      "file": "src/contracts.ts",
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
      "rangeText": "overloaded",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/contracts.ts"
    }
  ]
}
```

## native-array-length-family

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
          "character": 10,
          "line": 1326
        },
        "start": {
          "character": 4,
          "line": 1326
        }
      },
      "uri": "repo://node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts"
    },
    {
      "range": {
        "end": {
          "character": 30,
          "line": 57
        },
        "start": {
          "character": 24,
          "line": 57
        }
      },
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
      "range": {
        "end": {
          "character": 19,
          "line": 12
        },
        "start": {
          "character": 13,
          "line": 12
        }
      },
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.html"
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
      "file": "src/app.html",
      "range": {
        "end": {
          "character": 19,
          "line": 12
        },
        "start": {
          "character": 13,
          "line": 12
        }
      },
      "rangeText": "length",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.html"
    },
    {
      "anomaly": null,
      "file": "src/app.ts",
      "range": {
        "end": {
          "character": 30,
          "line": 57
        },
        "start": {
          "character": 24,
          "line": 57
        }
      },
      "rangeText": "length",
      "uri": "fixtures://pressure/typescript-related-member-closure/src/app.ts"
    },
    {
      "anomaly": "outside-fixture",
      "file": null,
      "range": {
        "end": {
          "character": 10,
          "line": 1326
        },
        "start": {
          "character": 4,
          "line": 1326
        }
      },
      "rangeText": null,
      "uri": "repo://node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts"
    }
  ]
}
```
