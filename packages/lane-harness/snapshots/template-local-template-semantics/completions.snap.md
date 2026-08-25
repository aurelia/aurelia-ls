# template-local-template-semantics completions lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-local-template-semantics`
Probe file: `packages/lane-harness/probes/template-local-template-semantics.probes.json`
Lane: `completions`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## local-body-scope

### Probe

```json
{
  "anchor": "<h2>${oneTimeValue}</h2>",
  "at": "oneTimeValue",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:34:13",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 12,
    "line": 33
  },
  "occurrence": 1
}
```

### completion

```json
{
  "gapMarker": false,
  "invalidTextEditCount": 0,
  "isIncomplete": false,
  "kindCounts": {
    "property": 8
  },
  "labelFallbackCount": 0,
  "outcome": "result",
  "textEditCount": 8,
  "totalItems": 8
}
```

### Membership

```json
{
  "mismatches": 0,
  "watched": [
    {
      "details": [
        "binding-context-slot | string | number"
      ],
      "edits": [
        "33:12..33:24 \"oneTimeValue\" -> \"mixedValue\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "mixedValue"
    },
    {
      "details": [
        "binding-context-slot | string"
      ],
      "edits": [
        "33:12..33:24 \"oneTimeValue\" -> \"oneTimeValue\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "oneTimeValue"
    },
    {
      "details": [
        "binding-context-slot"
      ],
      "edits": [
        "33:12..33:24 \"oneTimeValue\" -> \"unusedValue\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "property"
      ],
      "label": "unusedValue"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "entries"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "ownerSummary"
    }
  ]
}
```

## local-parent-bindable-attributes

### Probe

```json
{
  "anchor": "one-time-value.bind=\"oneTimeValue\"",
  "at": "one-time-value",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:3:5",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 4,
    "line": 2
  },
  "occurrence": 1
}
```

### completion

```json
{
  "gapMarker": false,
  "invalidTextEditCount": 0,
  "isIncomplete": false,
  "kindCounts": {
    "field": 8,
    "property": 2,
    "struct": 12
  },
  "labelFallbackCount": 0,
  "outcome": "result",
  "textEditCount": 22,
  "totalItems": 22
}
```

### Membership

```json
{
  "mismatches": 0,
  "watched": [
    {
      "details": [
        "bindable-attribute"
      ],
      "edits": [
        "2:4..2:18 \"one-time-value\" -> \"camel-case-value\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "field"
      ],
      "label": "camel-case-value"
    },
    {
      "details": [
        "bindable-attribute"
      ],
      "edits": [
        "2:4..2:18 \"one-time-value\" -> \"mixed-value\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "field"
      ],
      "label": "mixed-value"
    },
    {
      "details": [
        "bindable-attribute"
      ],
      "edits": [
        "2:4..2:18 \"one-time-value\" -> \"one-time-value\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "field"
      ],
      "label": "one-time-value"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "oneTimeValue"
    },
    {
      "details": [],
      "expectation": "absent",
      "found": false,
      "kinds": [],
      "label": "unusedValue"
    }
  ]
}
```

## local-bindable-mode-values

### Probe

```json
{
  "anchor": "mode=\"oneTime\"",
  "at": "oneTime",
  "atOccurrence": 1,
  "displayPosition": "src/template-local-template-semantics-app.html:24:68",
  "file": "src/template-local-template-semantics-app.html",
  "lspPosition": {
    "character": 67,
    "line": 23
  },
  "occurrence": 1
}
```

### completion

```json
{
  "gapMarker": false,
  "invalidTextEditCount": 0,
  "isIncomplete": false,
  "kindCounts": {
    "enum-member": 5
  },
  "labelFallbackCount": 0,
  "outcome": "result",
  "textEditCount": 5,
  "totalItems": 5
}
```

### Membership

```json
{
  "mismatches": 0,
  "watched": [
    {
      "details": [
        "bindable-mode"
      ],
      "edits": [
        "23:67..23:74 \"oneTime\" -> \"default\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "enum-member"
      ],
      "label": "default"
    },
    {
      "details": [
        "bindable-mode"
      ],
      "edits": [
        "23:67..23:74 \"oneTime\" -> \"fromView\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "enum-member"
      ],
      "label": "fromView"
    },
    {
      "details": [
        "bindable-mode"
      ],
      "edits": [
        "23:67..23:74 \"oneTime\" -> \"oneTime\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "enum-member"
      ],
      "label": "oneTime"
    },
    {
      "details": [
        "bindable-mode"
      ],
      "edits": [
        "23:67..23:74 \"oneTime\" -> \"toView\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "enum-member"
      ],
      "label": "toView"
    },
    {
      "details": [
        "bindable-mode"
      ],
      "edits": [
        "23:67..23:74 \"oneTime\" -> \"twoWay\""
      ],
      "expectation": "present",
      "found": true,
      "kinds": [
        "enum-member"
      ],
      "label": "twoWay"
    }
  ]
}
```
