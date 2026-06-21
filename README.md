# Fe

## What this is

Fe is an experimental LLM-native application compiler scaffold.

It compiles contracts and IR into generated direct-DOM applications.

The pipeline is:
`LLM intent` → `contracts` → `IR` → `generated direct DOM` → `tests` → `browser proof` → `benchmarks`.

## Why this exists

Most frontend frameworks optimize for human authorship. Fe explores a different approach: generated application code is assumed to be continued by future LLMs, not maintained by humans.

Because humans do not maintain the generated output, Fe prioritizes deterministic behavior, explicit trust boundaries, rigorous runtime API discipline, reproducibility, and executable proof over human readability.

## Current status

Fe is experimental.
Fe has a serious generated normalized Kanban proof.
Fe has emerging generated examples across additional app categories.
Fe is not yet proven for arbitrary applications.
Fe is not enterprise-ready.
Fe is not a general replacement for existing frontend frameworks.
Claims are valid only when backed by `npm run verify:all`.

Maturity is computed automatically by `npm run maturity`, not asserted manually. 

## What is proven today

The strongest canonical proof today is normalized Kanban (`normalized-kanban`).
Other app examples exist, but proof depth may vary.

## What is not proven

Fe does not claim to be:
* production-proven
* enterprise-ready
* mathematically optimal
* faster than React/Vue/Svelte/Solid
* guaranteed zero leaks
* guaranteed zero trust-boundary bugs
* fully generic across arbitrary apps

unless those exact claims are strictly backed by current executable proofs in `verify:all`.

## Canonical proof: normalized Kanban

The canonical generated app is `generated-examples/normalized-kanban/`.

This app demonstrates the complete pipeline, compiling from contracts and IR into a direct-DOM Kanban board. Its state model is normalized for Last-Writer-Wins shared state, ensuring deterministic resolution for concurrent operations.

## Generated examples and proof tiers

The gauntlet (`npm run gauntlet`) classifies apps into proof tiers:

* **Tier A — Canonical proof**: Full contract, IR, generated output, test, browser proof, and benchmark coverage.
  * `normalized-kanban`
  * `data-grid`
  * `settings-form`
  * `live-dashboard`
  * `product-catalog`
  * `customer-ops-console`
* **Tier B — Generated example**: Generated artifact exists with some tests/benchmarks, but lacks full canonical browser proof.
* **Tier C — Experimental sample**: Useful exploration, missing complete contracts/IR/generated artifacts. Should not contribute to readiness until it has generated artifacts, benchmarks, and browser proof.
* **Tier D — Placeholder/future target**: Listed but not proven.

## How the pipeline works

The intended "Compile-in-Prompt" workflow is:

1. Modify contracts.
2. Lower/update IR.
3. Run the generator.
4. Verify generated output is reproducible.
5. Run tests.
6. Run browser proof.
7. Run benchmarks.
8. Run the gauntlet.
9. Update maturity.

Generated code should be changed through contracts/IR, not hand-edited.

## Runtime API contract

Generated code may only call runtime APIs explicitly declared in `contracts/runtime-api.contract.json`. 

This strict discipline prevents generated code from hallucinating runtime methods. Runtime expansion should happen only when generated apps mathematically prove a need for a new primitive.

## Trust boundary rules

Generated application code must treat external data as untrusted.

Rules:
* External data must render through safe text paths (e.g., `textContent`) unless explicitly trusted.
* External text must not flow into `innerHTML`.
* The `innerHTML` property is restricted strictly to `trustedStaticTemplateHTML` operations during internal compiler execution to create static templates. It must NEVER accept dynamic variables.
* Malformed external values must fail safely.
* Generated code should prefer explicit purpose-built validators over generic runtime schema libraries.

## Commands

* Install dependencies: `npm install`
* Run tests: `npm test`
* Run browser proof: `npm run test:browser`
* Run benchmarks: `npm run bench`
* Regenerate canonical components: `npm run generate:kanban`
* Verify reproducibility: `npm run verify:generated`
* Run the scaffold gauntlet: `npm run gauntlet`
* Update computed maturity: `npm run maturity`
* **Run the full proof pipeline (Source of Truth):** `npm run verify:all`

## How future LLM agents should work in this repo

Before changing code:
1. Read `maturity/status.json` and `gauntlet/results/latest.json`.
2. Read `contracts/runtime-api.contract.json`.
3. Understand the generator limitations documented in `generator/README.md`.
4. Identify whether the requested change belongs in contracts, IR, generator, runtime, or proof.

Prefer changing `contracts/` → `ir/` → `generator/` before editing `generated-examples/`. Generated files should be regenerated, not hand-polished.

## Non-goals

Do not add:
* JSX or Virtual DOM.
* Framework-style component ergonomics for humans.
* React/Solid/Vue/Svelte compatibility layers.
* Generic morphing in hot paths.
* Broad design-system primitives without generated-app proof.

## Performance claims policy

Performance claims must cite explicit benchmark output. Do not make broad or unsupported performance generalizations.
* Allowed: "In benchmark X, operation Y measured Z."
* Not Allowed: "Fe is faster than React." or "Fe is mathematically optimal."

Benchmarks must be current. Missing values must not be zero. Benchmarks should guide engineering, not marketing.

## Roadmap: next proof target

The generator currently relies on some app-specific wireups (documented in `generator/README.md`). The long-term direction is a fully generic contract/IR compiler. The next target is to generalize the IR vocabulary to handle structural DOM reconciliation (morph/insert/remove) natively across all Tier B examples, promoting them to Tier A canonical proofs.
