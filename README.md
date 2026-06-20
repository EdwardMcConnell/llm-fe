# Fe

## What this is

Fe is an experimental LLM-native application compiler scaffold.

It explores whether LLMs can build common enterprise web applications by compiling machine-readable contracts and intermediate representation (IR) into generated direct-DOM applications, instead of hand-authoring traditional framework code.

## Why this exists

Most frontend frameworks optimize for human authorship. Fe explores a different approach: generated application code is assumed to be continued by future LLMs, not maintained by humans.

Because humans do not maintain the generated output, Fe prioritizes deterministic behavior, explicit trust boundaries, rigorous runtime API discipline, reproducibility, and executable proof over human readability.

## Current status

Fe is experimental.

The project currently computes maturity at **Level 3: Multi-App Generated Example Gauntlet**. This means Fe has a verified generated normalized Kanban proof, generated examples across multiple common enterprise UI shapes, a runtime API contract, and an emerging contract/IR/direct-DOM compiler path.

Readiness is determined by `npm run verify:all`, not by README prose.

## What is proven today

Fe can claim:
* Fe has a verified generated normalized Kanban proof that successfully compiles contracts into a direct-DOM program and passes tests.
* Fe has generated examples across several common enterprise UI shapes (data grid, settings form, live dashboard, product catalog).
* Fe has a strict runtime API contract and verification pipeline (the "gauntlet").
* Generated code is constrained by the runtime API contract.

## What is not proven

Fe must not claim:
* Enterprise readiness.
* Proof for arbitrary LLM-built applications.
* General framework replacement or superiority over React/Vue/Svelte/Solid.
* Production-proven reliability.
* Complete security or trust-boundary coverage for all scenarios.
* Out-of-the-box collaborative editing support, unless narrowly tied to the normalized LWW state proof.

## Canonical proof: normalized Kanban

The canonical generated app is `generated-examples/normalized-kanban/`.

This app demonstrates the complete pipeline, compiling from contracts and IR into a direct-DOM Kanban board. Its state model is normalized for Last-Writer-Wins shared state, ensuring deterministic resolution for concurrent operations.

## Generated examples and proof tiers

Other generated apps exist, but their proof depth varies. The gauntlet classifies apps into proof tiers:

* **Tier A — Canonical proof**: Full contract/IR/generated/test/browser/benchmark/gauntlet coverage.
  * `normalized-kanban`
* **Tier B — Generated example**: Generated artifact exists with some tests/benchmarks, but lacks full canonical browser proof.
  * `data-grid`
  * `settings-form`
  * `live-dashboard`
  * `product-catalog`
* **Tier C — Experimental sample**: Useful exploration, missing contracts/IR/generated artifacts.
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

Performance claims must cite explicit benchmark output. Do not make broad or unsupported performance multipliers (e.g., avoid "Fe is mathematically optimal").

## Roadmap: next proof target

The generator still relies on some app-specific assumptions. The long-term direction is a fully generic contract/IR compiler. The next target is to generalize the IR vocabulary to handle structural DOM reconciliation (morph/insert/remove) natively across all Tier B examples, promoting them to Tier A canonical proofs.
