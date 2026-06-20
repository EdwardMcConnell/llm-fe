# Browser Capability Manifest

Fe relies on modern native browser capabilities to bypass the need for traditional client-side JavaScript frameworks. Because humans do not maintain the generated output, Fe prioritizes maximum execution speed, deterministic memory ownership, and mathematically predictable DOM mappings.

By targeting a modern baseline, Fe eliminates 95% of the JavaScript payload traditionally used for state synchronization, component encapsulation, and reactivity.

## 1. Direct DOM Mutation (Compile-in-Prompt)
Instead of employing virtual DOM diffing engines (like React) or proxy-based fine-grained reactivity (like SolidJS or Vue 3), Fe compiles State Intent into explicitly defined setter functions at generation time. 
* **Capability:** `Node.nodeValue`, `Element.textContent`, `Element.className`
* **Why it matters:** Eliminates the need to serialize and diff objects dynamically. The exact property to patch is mapped 1:1, making the reconciliation step `O(1)` per changed attribute.

## 2. Shared Worker / MessageChannel (CRDT Transport)
Fe isolates data synchronization to the Native BroadcastChannel and IndexedDB to ensure consistency across tabs and components without heavy UI thread blocking.
* **Capability:** `BroadcastChannel`, `IndexedDB`
* **Why it matters:** Replaces complex centralized client stores (like Redux or Zustand) with lightweight CRDT patches communicated purely through standard messages.

## 3. Web Components (Shadow DOM & Custom Elements)
For absolute style encapsulation and DOM boundary trust, Fe wraps generated UI components in `CustomElements`.
* **Capability:** `customElements.define`, `<template>`, `attachShadow({ mode: 'open' })` (where strictly required)
* **Why it matters:** Frameworks like styled-components or CSS Modules generate dynamic class strings to prevent collision. Fe leverages the browser's native C++ boundaries for `<style>` scoping.

## 4. CSS Variables (Custom Properties)
Theme interpolation and dynamic style computation is strictly offloaded to the GPU/Browser paint step.
* **Capability:** `var(--token-name)`
* **Why it matters:** Fe components do not execute Javascript to compute inline styles for complex themes, entirely avoiding layout thrashing.

## 5. Native Form Elements and Validation
Form inputs, validations, and interactive states are driven by standard pseudo-classes.
* **Capability:** `:user-invalid`, `:checked`, `:focus-within`, `FormData`
* **Why it matters:** Instead of building synthetic event pools to track focus states or validations, the UI relies on C++ executed pseudo-states, triggering `patch` updates only on committed change events.

## 6. HTML `<dialog>` and `popover`
Modals, tooltips, and overlay management are native.
* **Capability:** `<dialog>`, `popover`, `anchor()`
* **Why it matters:** Completely bypasses the need for React Portals, synthetic `z-index` management trees, and focus-trapping libraries.

---

### Strict Non-Goals
* **No JSX/TSX:** HTML is declared natively using `<template>`.
* **No Runtime CSS-in-JS:** CSS is statically provided.
* **No Runtime Validation Overheads:** Validation happens at trust boundaries in the generator output, not via massive runtime libraries like Zod shipped to the client.
