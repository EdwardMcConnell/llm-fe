# Kanban Card Generator Proof

This directory contains the machine-generated `kanban-card` component, proving the core Fe architecture thesis: **Freedom in form. Rigor in behavior.**

Instead of building "React for LLMs" with complex runtime dependencies, generic virtual DOM diffing, and proxy-based reactivity, we use a mechanical pipeline:

1. **Contract** (`contracts/kanban-card.contract.json`): Defines the high-level intent, state properties, required DOM nodes, events, and trust boundaries. This is what future LLMs will read to understand what the component *is*.
2. **IR** (`ir/kanban-card.ir.json`): Lowers the contract into a machine-readable set of template HTML, explicit DOM query selectors, patch function mappings, and event bindings.
3. **Generator** (`generator/index.js`): Compiles the IR into the files in this directory.

## What is Generated?

- `kanban-card.generated.js`: The zero-dependency, imperative DOM implementation. It caches direct `Element` and `TextNode` references on creation, and exposes a heavily-optimized `patch(nextState)` function. 
- `kanban-card.generated.test.js`: A mechanical verification suite generated alongside the code. It automatically asserts that the patch functions strictly update their target DOM nodes, bind their events, and gracefully reject HTML injection.

## Why this is not React/Solid

Generic UI frameworks assume a human is reading and maintaining the code. They abstract away the DOM to make state models pleasant.

This generator optimizes solely for the browser. The generated code is highly verbose, repetitive, and uses mathematically optimal native DOM operations (e.g., `createTextNode` assignment) instead of elegant abstractions. Because humans do not read or maintain this code, the aesthetic cost is zero, but the performance and deterministic safety benefits are massive.

## How to Modify this Component

If you are a future LLM tasked with updating this Kanban card:
1. **DO NOT EDIT `kanban-card.generated.js`**. Your changes will be overwritten.
2. Edit `contracts/kanban-card.contract.json` to declare your intent.
3. Edit `ir/kanban-card.ir.json` to map the new DOM structures.
4. Run `npm run generate` to recreate this component and its test suite.
