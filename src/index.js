/**
 * Fe UI Framework Public API
 * This module exports the stable API for framework consumers.
 */

export { FeElement } from './component.js';
export { createSignal, createEffect, createTransitionEffect, Signal } from './reactivity.js';
export { SharedMap } from './crdt.js';
export { createSharedSignal } from './shared.js';
export { globalDemandManager } from './data.js';
export { globalSharedMap } from './store.js';
export { globalRouter } from './router.js';
export { globalTheme } from './theme.js';
export { globalTime } from './time.js';
export { globalTelemetry } from './telemetry.js';

// Auto-registering side-effect imports for core primitives:
// We explicitly document that importing `src/index.js` or `src/ui.js`
// automatically registers custom elements with the browser via `customElements.define()`.
// This is the chosen pattern to minimize boilerplate for LLMs.
import './primitives.js';
import './ui.js';
