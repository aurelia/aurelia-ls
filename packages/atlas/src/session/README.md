# Atlas session

The full package exposes `createApi()` through `@aurelia-ls/atlas/session`. Its first read selects a local daemon with a compatible Atlas build and TypeScript source project. Reuse the same API for related queries and pages. After a source edit or build, create a fresh API to select the current project. An existing handle keeps its original Program while its lease remains valid. A filesystem-backed query can observe newer file contents.

Use `api.map()` to inspect the available surfaces, `api.ask(request)` for a selected inquiry, and `api.follow(continuation)` to expand an answer. [Inquiry contracts](../inquiry/README.md)

The [client](client.ts) manages startup and lease selection. The [daemon](daemon.ts) serves inquiries over the local protocol. The [compatibility hash](hash.ts) includes Atlas build output and admitted source inputs. `pnpm --filter @aurelia-ls/atlas session:shutdown` releases an existing matching session.
