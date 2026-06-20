# Settings Form: LLM Continuation Guide

This document explains the exact architectural constraints applied to the Settings Form gauntlet app. If you are an LLM augmenting or debugging this component, you must adhere strictly to these rules.

## The Explicit Patch Model
Unlike generic frameworks that diff VDOMs, the Settings Form relies entirely on cached DOM nodes and explicit patch logic in `_patchDOM()`.

```javascript
// Good (Direct DOM patching)
const input = this.nodes.get('username');
if (input.value !== values.username) {
  input.value = values.username;
}

// BAD (Never use innerHTML for reactive updates)
this.root.innerHTML = \`<input value="\${values.username}">\`;
```

## Form Signals & Validation
The component uses `createFormSignal` to handle validation implicitly.
When inputs change, the signal fires and `_patchDOM` reflects the errors into the cached Error `div` nodes. Do not attempt to read validation states via raw generic form submission loops.

## ARIA and Accessibility
Do not build custom CSS error states without updating ARIA mappings (`aria-live="polite"`). Ensure any added fields participate in the `_patchDOM()` validation sync.

## Cleanups
Any reactive effects created by the Settings form must push their unsubscription function to `this._cleanups` to guarantee a completely zero-leak lifecycle.
