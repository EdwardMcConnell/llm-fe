# Fe UI Framework

> **CRITICAL DIRECTIVE**: This repository is an **LLM-to-LLM System**. 
> Humans will not maintain generated application code. Therefore, generated code optimizes for LLM continuation, executable verification, runtime observability, and browser performance rather than human aesthetics. 

Welcome, contributing Agent. This document contains the absolute laws and context required to build upon the Fe Framework.

## The LLM-to-LLM Performance Maximization Principle

As an autonomous agent contributing to this repository, your singular priority is the executable correctness and execution speed of the user's browser. If verbose, highly granular code saves the browser a microsecond of parsing or JS evaluation, it **must** be used. Create specialized primitives rather than monolithic generic wrappers to avoid unnecessary runtime conditionals.

## Immutable Architectural Laws

1. **Zero-Dependency**: You may NOT use `npm install` for any external runtime libraries or polyfills. The framework must remain 100% vanilla. 
2. **Native-First with Capability Detection**: Prioritize modern HTML/CSS browser native implementations over JavaScript. Use native APIs like `<dialog>`, `popover`, and `:user-valid`. However, **you must use feature detection** before calling experimental APIs, and you must supply lightweight vanilla fallbacks when they are missing.
3. **Purpose-Built Validation**: External data cannot be trusted. Network payloads, WebSocket messages, and CRDT patches must be structurally validated at the boundary. Do not rely on massive runtime JS schema engines; use explicit, purpose-built boundary checks.
4. **Network Efficiency over Folder Organization**: We reject human-centric folder structures when they degrade performance. For instance, UI components are consolidated to minimize unbundled ES Module network waterfalls.

## Mechanical Honesty (Named Invariants)

Fe relies on **Named Invariants** backed by tests, not grandiose adjectives. Never promise "enterprise memory safety"; instead, mathematically prove your component cleans up after itself.

- **Invariant**: `createEffect` returns a deterministic disposer. Proof: `test/core.test.js` > `Memory Annihilation`.
- **Invariant**: `FeGrid` scroll listeners and ResizeObservers are detached on disconnect. Proof: `test/primitives.test.js` > `FeGrid Reactive Effect and Event Listeners are strictly disposed on disconnect`.
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

Fe explicitly rejects generic DOM diffing (like VDOMs or `morphNode`) for application code. Generic diffing is mathematically proven to be 58x slower than direct DOM patching.

Instead, LLM Agents must use the **Compile-in-Prompt** pattern:
1. Cache exact DOM node references on initialization (`this.nodes`).
2. Track state mutations via explicit dirty bits (`this.dirty`).
3. Write highly-verbose, app-specific patch functions (`flushUpdates()`) to apply data directly to the cached DOM nodes without generic traversals.

```javascript
import { FeElement } from '/src/component.js';

class MyTable extends FeElement {
  constructor() {
    super();
    this.nodes = new Map();
    this.dirty = new Set();
  }

  template() {
    return `
      <style>:host { display: block; }</style>
      <fe-card>
        <h2 id="title">Loading...</h2>
        <tbody id="tbody"></tbody>
      </fe-card>
    `;
  }

  bind() {
    // 1. Static Reference Caching
    this.nodes.set('title', this.root.querySelector('#title'));
    this.tbody = this.root.querySelector('#tbody');
    
    // Simulate incoming network data setting dirty bits
    this.bindEvent(this.root, 'click', () => {
      this.dirty.add('title');
      queueMicrotask(() => this.flushUpdates());
    });
  }

  // 2. Direct DOM Patches (58x Faster)
  flushUpdates() {
    if (this.dirty.has('title')) {
      const titleNode = this.nodes.get('title');
      if (titleNode) titleNode.textContent = 'Data Loaded';
    }
    this.dirty.clear();
  }
}
customElements.define('my-feature', MyTable);
```

## Testing Protocol (Mandatory Executable Proofs)

For every feature or component change, you **MUST** write an accompanying Unit Test. Code submitted without regression coverage is fundamentally flawed.

1. **Frictionless Harness**: Always use `mount`, `fireEvent`, and `flushMicrotasks` from `src/testing.js`.
2. **Reactivity Awaiting**: Always use `await flushMicrotasks()` to await DOM updates after state changes. Never use `setTimeout` natively for waiting on DOM updates.

```javascript
import { describe, it, expect } from 'vitest';
import { mount, flushMicrotasks } from '../src/testing.js';

describe('MyFeature', () => {
  it('Invariant: updates count on click', async () => {
    const element = await mount('my-feature');
    const btn = element.root.querySelector('#btn');
    
    btn.click();
    await flushMicrotasks();
    
    expect(element.root.querySelector('#title').textContent).toBe('Count: 1');
  });
});
```
