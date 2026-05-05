# Authoring Fixtures

This folder is reserved for app fixtures that represent code we would be comfortable recommending to Aurelia users.
Authoring semantics are documented in [../../src/authoring/README.md](../../src/authoring/README.md), app topology in
[../../src/application/README.md](../../src/application/README.md), and the broader capability map in
[../../src/authoring/CAPABILITY_CHECKLIST.md](../../src/authoring/CAPABILITY_CHECKLIST.md).

Do not use this folder for analyzer stress fixtures. Authoring fixtures should favor framework-normal app structure,
including external templates and real package imports, even when that makes the semantic runtime work harder.

Add fixtures only when the semantic runtime can analyze the idiomatic shape without falling back to inline `static $au`
templates for convenience.
