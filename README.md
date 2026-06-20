# Fe UI Framework

> **CRITICAL DIRECTIVE**: This repository is an **LLM-to-LLM System**. 
> Humans will not maintain generated application code. Therefore, generated code optimizes for LLM continuation, executable verification, runtime observability, and browser performance rather than human aesthetics. 

Welcome, contributing Agent. This document contains the absolute laws and context required to build upon the Fe Framework.

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

**Comparative Claims (Proven via Benchmarks):**
1. **`normalized-kanban`**: Designed to minimize diffing overhead via direct DOM patch functions. In `bench/kanban-card.generated.bench.js`, generated code avoids innerHTML string matching entirely.
2. **`data-grid`**: Virtualized rendering cleans up `ResizeObserver` instances. Tested by `cleanup.test.js`.
3. **`settings-form`**: Native Reactive Forms provide `FormData` capture.
4. **`live-dashboard`**: High-frequency patches map via `this.nodes` for minimized GC pressure.
5. **`product-catalog`**: Async data handles deduplication via `demandData`.

If you add a new primitive or feature, you **must** ensure it passes the full `npm run verify:all` pipeline and that no required proof item lowers the maturity level.

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

## Using the Framework

### Core Primitives
The framework is built around custom Web Components extending `FeElement` (found in `src/component.js`).

- **Reactivity**: Uses proxy-based signals (`createSignal`, `createEffect`).
- **Memory Management**: If you attach global listeners or timers, push the cleanup callback into `this._cleanups` inside your component's `bind()` method. `FeElement` executes them in `disconnectedCallback`.

### The UI Component Library
To utilize the high-performance primitives, simply import the main package or the UI file directly. This executes side-effect imports that auto-register the custom elements with the browser (e.g. `customElements.define('fe-button', FeButton)`). This pattern is chosen specifically to minimize setup boilerplate for generated code. 

- **`<fe-card>`**: Strictly contained layout isolation (`contain: content`).
- **`<fe-accordion>` & `<fe-accordion-group>`**: Uses native `<details>` and `<summary>`.
- **`<fe-toast>`**: Top-Layer non-blocking notifications. Trigger via `globalToast.show("message")`.

### Creating a Component (Compile-in-Prompt)

Fe explicitly rejects generic DOM diffing (like VDOMs or `morphNode`) for application code.

Instead, LLM Agents must use the **Compile-in-Prompt** pattern:
1. Define a machine-readable Component Contract (`contracts/`).
2. Lower the intent into an Intermediate Representation (`ir/`).
3. Compile the IR into direct, hand-rolled imperative DOM patches (`npm run generate`).

```javascript
// Generated Direct DOM Patch (Example)
function patchTitle(nextVal) {
  if (currentTitle === nextVal) return;
  currentTitle = nextVal;
  titleNode.nodeValue = nextVal == null ? '' : String(nextVal);
}
```

This guarantees explicit trust boundaries (innerHTML is strictly avoided) and minimizes DOM diffing overhead by targeting elements directly.
