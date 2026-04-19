# Aurelia Lens Charter Template

Use this template before expanding an Aurelia-specific semantic lens.

The point is to make scope, cost, and canonical shape decisions explicit before
the lens grows.

## Lens

- Name:
- Status:
- Related code:

## Burden

Write one sentence:

- “Given X, recover Y within ceiling Z.”

If that sentence is blurry, the lens is not ready to harden.

## Subject

- What semantic subject does the lens talk about?
- What ingress/selectors are allowed?
- What is deliberately out of scope?

## Canonical Record

- What is the smallest plain-data record that closes the burden?
- Which fields are irreducible?
- Which fields are only projections and must stay out of the canonical record?

## Evaluator Ceiling

- What substrate does the lens spend?
- What value-resolution or flow ceiling is allowed?
- What patterns are explicitly whitelisted?
- What must stay open instead of being guessed?

## Load-Bearing Coverage

- Which framework surfaces would make the lens misleading if omitted?
- Which omitted patterns are explicitly acceptable for now?

## Cost Rules

- Can this lens reuse an existing live context?
- Can it avoid reopening programs or outputs?
- What operations are too expensive for the current slice?

## Golden Shape

- What needs to be canonical?
- What needs to be projection-only for reviewability?
- Should the golden be one file or many?

## Exit Condition

- What would make this lens ready to compose into the next one?
