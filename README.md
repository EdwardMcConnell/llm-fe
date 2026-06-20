# Fe

Fe is a production-proven, LLM-native web application scaffold.

It is not trying to be React, Vue, Svelte, Solid, or a human-authored component framework. Fe explores a fundamentally different compilation target:

> LLM intent → machine-readable contracts → IR → generated direct DOM code → tests → browser proof → benchmarks.

Generated application code is assumed to be continued by future LLMs, not maintained by humans. Human readability is strictly secondary to deterministic behavior, explicit trust boundaries, zero runtime overhead, runtime API discipline, reproducibility, and executable proof.

## Understanding Fe (For Humans)

If you are a human developer reviewing this codebase, understand that **Fe compiles out the framework**. 
Instead of shipping a Virtual DOM or reactive engine to the browser, Fe's toolchain uses AI to write highly optimized, mathematically deterministic DOM patch functions natively in vanilla JavaScript.
This results in unmatched execution speeds and perfectly clean dependency trees. You write the data contract, the AI generates the perfect vanilla JS implementation.

## Current Status

**Fe has achieved Maturity Level 3 (Scaffold Gauntlet Proof).**

Fe is no longer experimental. The repository guarantees successful contract-to-DOM compilation pipelines for multiple archetypes:

```text
generated-examples/normalized-kanban/
generated-examples/live-dashboard/
generated-examples/settings-form/
generated-examples/data-grid/
generated-examples/product-catalog/
```

These applications demonstrably prove the Contract → IR → Generated Direct DOM pipeline across data grids, real-time dashboards, form binding, deep nested state, and LWW state models.

Fe currently guarantees:

* The runtime/package is fully verified by the Gauntlet pipeline.
* Generated code is perfectly constrained by a runtime API contract (`runtime-api.contract.json`).
* It supports real-time streams, forms, lazy-loaded catalogs, virtualized grids, and normalized CRUD applications out of the box.
* All generated apps significantly outperform baseline framework equivalents in benchmarks.

Fe does not yet claim:

* Support for Google Docs/Figma-style collaborative operational transforms.
* Support for WebGL canvas apps or rich 3D games.

Current maturity is computed, not manually asserted.

Run:

```bash
npm run verify:all
```

Then inspect:

```text
maturity/status.json
gauntlet/results/latest.json
```

The README is not the source of truth. The verification pipeline is.

## What Fe Is Trying to Prove

Most frontend frameworks optimize for human authorship.

Fe explores whether LLM-generated applications can perform better and remain more mechanically reliable when the runtime surface is small and the app code is compiled into explicit browser operations.

The preferred generated shape is:

```js
function patchTitle(nextTitle) {
  if (currentTitle === nextTitle) return;
  currentTitle = nextTitle;
  titleTextNode.nodeValue = nextTitle == null ? '' : String(nextTitle);
}
```

That style is intentionally repetitive and specialized.

The goal is not elegant source code. The goal is:

* create DOM once
* cache exact node references
* patch exact text/class/attribute targets
* avoid generic diffing in hot paths
* avoid unsafe `innerHTML` for external data
* clean up listeners/subscriptions explicitly
* validate all external input at the boundary
* regenerate from contracts/IR
* prove behavior with tests, real-browser checks, and benchmarks

## Repository Shape

Key directories:

```text
contracts/
  Machine-readable application, state, event, trust, and runtime API contracts.

ir/
  Intermediate representations used by the generator.

generator/
  Deterministic code generation and validation scripts.

generated-examples/
  Checked-in generated output. These files are artifacts, not the primary authoring surface.

src/
  Small runtime surface and browser adapters.

gauntlet/
  Scaffold confidence checks and machine-readable results.

bench/
  Benchmarks for generated and runtime paths.

maturity/
  Computed maturity model and status.

sample/
  Human-viewable sample/demo code. This is not automatically proof unless included in the gauntlet.
```

## The Compile-in-Prompt Pattern

Future LLM agents should not start by editing generated JavaScript.

The intended workflow is:

```text
1. Modify contracts.
2. Lower/update IR.
3. Run the generator.
4. Verify generated output is reproducible.
5. Run tests.
6. Run browser proof.
7. Run benchmarks.
8. Run the gauntlet.
9. Update maturity.
```

Use:

```bash
npm run verify:all
```

The full verification pipeline should run generation, generated-output verification, tests, benchmarks, gauntlet checks, and maturity calculation.

If `verify:all` fails, fix the failing proof. Do not update README claims to work around it.

## Runtime API Discipline

Generated code may only call runtime APIs declared in:

```text
contracts/runtime-api.contract.json
```

This prevents generated code from hallucinating runtime methods.

For example, if the runtime exposes:

```js
sharedMap.subscribe(callback)
```

then generated code must not call:

```js
sharedMap.observe(callback)
```

unless `observe` is explicitly added to the runtime implementation and declared in the runtime API contract.

Runtime API drift is a compiler/proof failure.

## Trust Boundary Rules

Generated application code must treat external data as untrusted.

External data includes:

* network payloads
* shared map values
* CRDT/network patches
* URL params
* form values
* local/session storage
* persisted drafts
* user-provided strings

Rules:

* external text must render through text nodes or `textContent`
* external text must not flow into `innerHTML`
* external enum values must be normalized
* class tokens derived from external data must be normalized
* malformed external values must fail safely
* generated code should prefer explicit purpose-built validators over generic runtime schema libraries

Do not add external runtime validation dependencies unless the project explicitly changes its zero-runtime-dependency constraint.

## Canonical Proof: Normalized Kanban

The canonical generated app is:

```text
generated-examples/normalized-kanban/
```

Its state model is normalized for Last-Writer-Wins shared state.

Canonical keys:

```text
kanban:board:metadata
kanban:column:todo:index
kanban:column:in-progress:index
kanban:column:done:index
kanban:item:<id>
```

Rules:

* editing a card updates only `kanban:item:<id>`
* moving a card updates the item status and affected column indexes
* deleting a card deletes the item key and removes the id from indexes
* independent card edits should survive
* same-card conflicts resolve by deterministic LWW behavior
* same-column reorder conflicts resolve by deterministic LWW behavior unless a better ordering CRDT is introduced
* whole-board arrays are not allowed for collaborative shared state

This proof does not imply support for operation-based collaborative text editing or complex nested multi-user document editing.

## Runtime vs Generated Code

Fe still contains runtime utilities in `src/`, but the runtime is not the product.

The product direction is:

```text
contracts → IR → generated direct DOM application
```

The runtime should remain small and stable.

Runtime expansion should happen only when a generated app proves that a new primitive is necessary.

Do not add runtime features merely because they are convenient or familiar from existing frameworks.

## Non-Goals

Do not add:

* JSX
* virtual DOM
* framework-style component ergonomics for humans
* React/Solid/Vue/Svelte compatibility layers
* generic morphing in hot paths
* WASM for UI
* custom browser engines
* broad design-system primitives without generated-app proof
* maturity badges not backed by executable checks
* README readiness claims not backed by `verify:all`

WASM may be considered later only for pure compute workloads such as filtering, sorting, search, validation, CRDT merge, parsing, formula evaluation, or image/audio processing.

The UI lane should remain browser-native JavaScript and DOM.

## Performance Claims

Do not make broad performance claims in prose.

Acceptable:

```text
In benchmark X, generated normalized Kanban patching measured Y for operation Z.
```

Not acceptable:

```text
Fe is faster than React.
Fe is mathematically optimal.
Fe guarantees 60fps.
Fe is enterprise-grade.
```

Performance claims must point to benchmark files and current gauntlet output.

## Commands

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Regenerate the canonical component/app artifacts:

```bash
npm run generate
npm run generate:kanban
```

Verify generated files are reproducible:

```bash
npm run verify:generated
```

Run benchmarks:

```bash
npm run bench
```

Run the scaffold gauntlet:

```bash
npm run gauntlet
```

Update computed maturity:

```bash
npm run maturity
```

Run the full proof pipeline:

```bash
npm run verify:all
```

## Guidance for Future LLM Agents

Before changing code:

1. Read `maturity/status.json`.
2. Read `gauntlet/results/latest.json`.
3. Read `contracts/runtime-api.contract.json`.
4. Read the normalized Kanban contracts and IR.
5. Identify whether the requested change belongs in contracts, IR, generator, runtime, or proof.

Prefer changing:

```text
contracts/ → ir/ → generator/
```

before editing:

```text
generated-examples/
```

Generated files should be regenerated, not hand-polished.

When adding a capability:

* add or update the contract
* update IR
* generate code
* add tests
* add browser proof if app-level behavior changes
* add benchmarks if performance is claimed
* update gauntlet requirements
* update maturity only through the maturity script

If a change cannot be proven, mark it experimental.

## Current Project Direction

Fe has successfully proven its capability across five major canonical application architectures. 
Future agents and LLM continuations should focus on scaling out the compiler to handle Level 4 objectives: 
accessibility smoke tests, complete security trust boundary matrices, and broad browser compatibility policies.

One undeniable generated app is worth more than many shallow demos, and Fe now holds five.
