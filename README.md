# Fe UI Framework

> **CRITICAL DIRECTIVE**: This repository is an **LLM-to-LLM System**. 
> Humans will not maintain generated application code. Therefore, generated code optimizes for LLM continuation, executable verification, runtime observability, and browser performance rather than human aesthetics. 

Welcome, contributing Agent. This document contains the absolute laws and context required to build upon the Fe Framework.

## The Core Thesis

Fe is an LLM-native Web Application Scaffold. It bypasses traditional frameworks like React and Vue, avoiding Virtual DOMs (VDOMs) entirely. Fe optimizes for mathematical determinism and LLM reasoning speed, ensuring that applications are both performant and easy for language models to understand and extend.

## The Compiler Pipeline

Applications in Fe are defined through a multi-stage pipeline:

1. **JSON Contracts (Trust Boundaries):** Applications start as strict JSON Contracts that define trust boundaries and application structure.
2. **Intermediate Representation (IR):** These contracts are lowered to JSON Explicit IR, which provides a detailed blueprint for the application.
3. **Deterministic DOM-Patching JS:** The IR is compiled into pure, deterministic DOM-patching Vanilla JavaScript using `node generator/app-generator.js`.

## The Data Grid

The resilience of the Fe compiler is demonstrated through the generation of a `Data Grid` component from IR. This component natively supports 10,000+ rows using highly optimized DOM Virtualization, rendering only about 23 rows at a time and recycling nodes on scroll to maintain performance.

## Network Sync Layer

Fe employs Lamport-clock based CRDTs (`SharedMap`) to manage state across applications. The framework includes a lightweight `server/hot-path.js` that broadcasts CRDT patches via Server-Sent Events (SSE). Generated applications intercept mutations via `fetch` and merge incoming patches in real-time, enabling out-of-the-box collaborative editing.

## The Auto-Healing Compiler Loop

The `server/hot-path.js` also functions as an LLM Hot-Path. Users can send natural language requests to mutate the IR. If the LLM generates malformed JSON or crashes the compiler, the server captures the Node `stderr` stack trace and silently loops back to the LLM (up to 3 times), asking it to self-heal the syntax error before presenting any errors to the user.

## Scaffold Confidence Gauntlet

Fe relies on mechanically verifiable proofs. **Do not claim Fe is ready based on this README.**

Fe's capabilities are proven exclusively by the Scaffold Confidence Gauntlet and computed by the Maturity Model. To verify performance and safety claims, you must run:
```bash
npm run verify:all
```

This generates `gauntlet/results/latest.json` and `maturity/status.json`.

**Current maturity: Level 2 — Generated Application Proof**

Fe currently proves:
* package/runtime works
* generated Kanban card component works
* contract graph to direct-DOM pipeline exists for normalized-kanban

Fe does not yet prove:
* broad enterprise scaffold readiness
* multiple application category coverage

- **Tests**: Gauntlet checks explicitly for named proof cases (e.g., LWW convergence, cleanup). All tests passing.
- **Benchmarks**: Gauntlet tracks absolute rendering times for Mount, Patch, and Dispose operations. All performance regressions prevented.
- **Generated Pipeline**: `npm run generate` transforms `kanban-card.contract.json` to IR to JS, proven through `validate-contract-ir.js` and `verify-generated.js`.
- **Gauntlet Result**: Checked per app and linked to Maturity.

## Immutable Architectural Laws

1. **Zero-Dependency**: You may NOT use `npm install` for any external runtime libraries or polyfills. The framework must remain 100% vanilla. 
2. **Native-First with Capability Detection**: Prioritize modern HTML/CSS browser native implementations over JavaScript. Use native APIs like `<dialog>`, `popover`, and `:user-valid`. However, **you must use feature detection** before calling experimental APIs, and you must supply lightweight vanilla fallbacks when they are missing.
3. **Purpose-Built Validation**: External data cannot be trusted. Network payloads, WebSocket messages, and CRDT patches must be structurally validated at the boundary. Do not rely on massive runtime JS schema engines; use explicit, purpose-built boundary checks.

## Mechanical Honesty (Named Invariants)

Fe relies on **Named Invariants** backed by tests, not grandiose adjectives. 

- **Invariant**: `createEffect` returns a deterministic disposer. Proof: `test/core.test.js` > `Memory Annihilation`.
- **Invariant**: CRDT patches from the network are structurally validated before incrementing Lamport clocks. Proof: `src/crdt.js` > `merge()`.

## Capability Detection Discipline

Fe relies heavily on bleeding-edge native browser capabilities to replace legacy JS abstractions. Generated code MUST provide fallback layers or fail open gracefully:

- **`popover` & `position-anchor`**: Fe provides automatic bounding-rect calculation fallbacks for `FeTooltip` and `FeMenu` if `CSS.supports('position-anchor')` returns false.
- **`sibling-index()`**: Used for stacking `FeToast`. JS manual calculation is used as a fallback if not supported.
- **`<dialog>` & `delegatesFocus`**: Assumed supported globally (Baseline 2022).
- **`adoptedStyleSheets`**: Assumed supported for global theme injection.
- **`hidden="until-found"`**: Used for `FeTabs` and `FeAccordion` accessibility. Degrades to standard `hidden` naturally.

## Human Understanding Section

While Fe is designed for LLMs, human developers visiting this repository should understand that Fe is a cutting-edge framework that leverages the power of language models to generate highly optimized, deterministic web applications. It eschews traditional frameworks in favor of a contract-driven approach that ensures performance and reliability. Humans are encouraged to explore the contracts and IR to understand the architecture but should refrain from manually editing generated code.
