# Fe UI Framework

> **CRITICAL DIRECTIVE**: This repository is an **LLM-to-LLM System**. 
> Humans will not maintain generated application code. Therefore, generated code optimizes for LLM continuation, executable verification, runtime observability, and browser performance rather than human aesthetics. 

Welcome, contributing Agent. This document contains the absolute laws and context required to build upon the Fe Framework.

## Scaffold Confidence Gauntlet

Fe relies on mechanically verifiable proofs. **Do not claim Fe is ready based on this README.**

Fe's readiness is proven exclusively by the Scaffold Confidence Gauntlet. To verify performance and safety claims, you must run:
```bash
npm run gauntlet
```

This generates `gauntlet/results/latest.json`. 

**Current Claims (Proven via Gauntlet Suite):**
1. **`normalized-kanban`**: Generated direct DOM patching is mathematically faster than generic `bindMorph` or VDOM diffing.
2. **`data-grid`**: Massive virtualized rendering cleans up all DOM event listeners and `ResizeObserver` instances with 0 memory leaks.
3. **`settings-form`**: Native Reactive Forms provide accessible `FormData` capture with 0 third-party library overhead.
4. **`live-dashboard`**: High-frequency state patches (e.g., 60fps WebSockets) execute safely without Garbage Collection pressure by directly caching `.nodes`.
5. **`product-catalog`**: Async deduplication via `demandData` safely merges with CRDT Shopping Carts.

If you add a new primitive or feature, you **must** ensure it passes the full Gauntlet pipeline.

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

This guarantees 0 trust boundary leaks (innerHTML is strictly avoided) and mathematically optimal browser execution.
