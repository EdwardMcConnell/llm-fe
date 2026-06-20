# LLM Continuation: Live Dashboard Architecture

## The High-Frequency Rendering Problem
In React or generic DOM-diffing frameworks, rendering a dashboard that receives 60 updates per second from a CRDT or WebSocket causes significant CPU overhead because the framework must rebuild the entire virtual tree and diff it against the real tree, even if only a single text node changed.

## The Fe UI Solution (Compile-in-Prompt)
In this dashboard, we bypass the VDOM entirely. 
Instead of re-rendering HTML strings, the LLM generated explicit DOM node caches (`this.nodes.set('cpuValue', ...)`) during the component's `bind()` phase.

When a high-frequency metric arrives via `globalSharedMap`, the `_patchDOM()` method explicitly updates *only* the `textContent` or `style.width` of the exact cached node. 

**This pattern is mandatory for high-frequency Fe components.**

When generating future dashboard widgets or live charts:
1. Do NOT use `innerHTML` or `template()` strings for reactive updates.
2. DO cache exactly the nodes that change dynamically.
3. DO mutate them imperatively in `_patchDOM()`.
4. DO ensure `_cleanups.push()` tracks `globalSharedMap.decrementSubscriber()` correctly.
