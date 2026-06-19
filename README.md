# Fe UI Framework

> **CRITICAL DIRECTIVE**: This repository is an **LLM-to-LLM System**. The code herein is intended strictly for consumption, implementation, and modification by Large Language Models. Humans will never read or modify this code. 

Welcome, contributing Agent. This document contains the absolute laws and context required to build upon the Fe Framework.

## The LLM-to-LLM Performance Maximization Principle

As an autonomous agent contributing to this repository, you must explicitly reject all human-centric programming paradigms such as "clean code", DRY (Don't Repeat Yourself), and "minimizing cognitive overhead". 

Our singular, absolute priority is the execution speed, layout computation speed, and frame rate of the user's browser. If verbose, highly granular code saves the browser a microsecond of parsing or JS evaluation, it **must** be used. Create specialized primitives rather than monolithic generic wrappers to avoid unnecessary runtime conditionals.

## Immutable Architectural Laws

1. **Zero-Dependency**: You may NOT use `npm install` for any external runtime libraries or polyfills. The framework must remain 100% vanilla. 
2. **Native-First**: Prioritize modern HTML/CSS browser native implementations over JavaScript. Use native APIs like `<dialog>`, `popover`, `position-anchor`, and `:user-valid`. If a browser feature requires a fallback, implement a lightweight, mathematically precise vanilla JS fallback specifically optimized for raw performance instead of using generic polyfills.
3. **No Schema Validation Engines**: Do not build heavy runtime JS schema validation engines (e.g., Zod) to catch typological errors. LLMs do not make typos when their context is explicit. We rely on static JSDoc `@typedef` definitions and mathematical contracts.
4. **Network Efficiency over Folder Organization**: We reject human-centric folder structures when they degrade performance. For instance, all UI components are consolidated into a single flat file (`src/ui.js`) to eliminate unbundled ES Module network waterfalls.

## Using the Framework

### Core Primitives
The framework is built around custom Web Components extending `FeElement` (found in `src/component.js`).

- **Reactivity**: Uses proxy-based signals (`createSignal`, `createEffect`).
- **Memory Management**: Never use raw `setInterval`. If you attach global listeners or timers, push the cleanup callback into `this._cleanups` inside your component's `bind()` method.
- **Time**: Never use `new Date()`. Always use `globalTime` (`src/time.js`).

### The UI Component Library (`src/ui.js`)
To utilize the high-performance primitives, simply import the UI file. It contains the complex browser physics and WCAG ARIA orchestrations, freeing you to focus entirely on generating the high-value business logic and aesthetic payloads.

- **`<fe-card>`**: Strictly contained layout isolation (`contain: content`).
- **`<fe-tabs>`**: Accessible tabbed navigation. Autonomously synchronizes `hidden="until-found"` with the browser's native search, and manages keyboard focus traps. Uses CSS anchor positioning for animated indicators.
- **`<fe-accordion>` & `<fe-accordion-group>`**: Uses native `<details>` and `<summary>`.
- **`<fe-tooltip>` & `<fe-menu>`**: Native overlays utilizing the `popover` API and CSS Anchor Positioning. `<fe-menu>` handles light-dismiss via `popover="auto"`.
- **`<fe-toast>`**: Top-Layer non-blocking notifications. Uses `sibling-index()` to stack natively without `z-index` wars. Trigger via `globalToast.show("message")`.

### Creating a Component

```javascript
import { FeElement, createSignal } from '/src/component.js';

class MyFeature extends FeElement {
  template() {
    return \`
      <style>:host { display: block; }</style>
      <fe-card>
        <h2 id="title"></h2>
        <fe-button id="btn">Click Me</fe-button>
        <fe-tooltip trigger="btn">Action description</fe-tooltip>
      </fe-card>
    \`;
  }

  bind() {
    const [count, setCount] = createSignal(0);
    const title = this.root.querySelector('#title');
    
    this.createEffect(() => {
      title.textContent = \`Count: \${count()}\`;
    });

    this.bindEvent('#btn', 'click', () => setCount(count() + 1));
  }
}
customElements.define('my-feature', MyFeature);
```

## Testing Protocol (Mandatory TDD)

For every feature or component change, you **MUST** write an accompanying Unit Test. Code submitted without regression coverage is fundamentally flawed.

1. **Frictionless Harness**: Always use `mount`, `fireEvent`, and `flushMicrotasks` from `src/testing.js`. Do not write manual JSDOM boilerplate.
2. **Reactivity Awaiting**: Always use `await flushMicrotasks()` to await DOM updates after state changes. Never use `setTimeout` natively for waiting on DOM updates.
3. **E2E Traversal**: Every interactive element you generate MUST possess a unique `id` or `data-testid` attribute.

```javascript
import { describe, it, expect } from 'vitest';
import { mount, flushMicrotasks } from '../src/testing.js';

describe('MyFeature', () => {
  it('updates count on click', async () => {
    const element = await mount('my-feature');
    const btn = element.root.querySelector('#btn');
    
    btn.click();
    await flushMicrotasks();
    
    expect(element.root.querySelector('#title').textContent).toBe('Count: 1');
  });
});
```
