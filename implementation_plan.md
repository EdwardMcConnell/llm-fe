# Normalized Kanban Compiler Milestone

Per the latest architectural directive and my iterative consultation with OpenAI, we are pivoting the Fe UI framework into a strictly constrained **LLM application compiler**. We will freeze runtime expansion and focus entirely on making one undeniable generated application: the **Normalized Kanban Board**.

## Iterative Reasoning with OpenAI

Before finalizing this plan, I consulted with OpenAI (via our new `npm run chat` tool) to ensure our perspectives were aligned. I proposed that rather than relying on an LLM in the hot-path to blindly generate JavaScript strings, the Generator should be a purely **deterministic compiler** that lowers a strict Intermediate Representation (IR) into JavaScript, constrained entirely by a formal `runtime-api.contract.json`.

OpenAI strongly agreed with this approach:
> "By using a deterministic generator, you can guarantee that the same input will always produce the same output, which is essential for debugging, testing, and maintaining the system... Start by defining the `runtime-api.contract.json` to establish the boundaries and capabilities of the runtime. This approach will provide a solid foundation for building a reliable and maintainable framework."

## Open Questions

> [!WARNING]
> Before we proceed, I want to clarify: should the compilation step from `Contracts -> IR` be done by the LLM offline, and the framework simply executes `IR -> JS` deterministically? This plan assumes the latter (the deterministic compiler).

## Proposed Changes

### 1. Define the Runtime API Contract
The framework must formally declare what generated code is allowed to touch.
#### [NEW] `contracts/runtime-api.contract.json`
- Will define exact public exports from `src/reactivity.js` (e.g. `createSignal`), `src/crdt.js` (e.g. `sharedMap.subscribe`), and `src/component.js` (e.g. `FeElement` cleanups).

### 2. Define the Explicit Kanban IR
The intermediate representation cannot be vague; it must map exact DOM nodes to data.
#### [NEW] `ir/normalized-kanban.ir.json`
- Will define the views for the normalized state (Board, Column, Card).
- Will define explicit DOM caching and patch bindings (e.g., `nodes.get('title').textContent = patch.title`).

### 3. Rewrite the Deterministic Generator
Eliminate handwritten mock logic. The generator must blindly lower IR into vanilla Javascript.
#### [MODIFY] `generator/app-generator.js`
- Will be refactored to read `normalized-kanban.ir.json` and output raw `this._nodes.set` and explicit flush functions.
- Will enforce the rule: **No generic DOM diffing (`bindMorph`). Only exact field patching.**

### 4. Create Browser Tests
#### [NEW] `test/kanban-e2e.test.js`
- Will run real browser tests (using Puppeteer/JSDOM) against the generated Kanban code.
- Will verify mounting, editing, moving, deleting, and memory leak cleanups.

## Verification Plan

### Automated Tests
- Run `npm test` to ensure unit tests and browser tests pass.
- Run `npm run bench` to compare the generated app's direct DOM mutation speed vs the deprecated `bindMorph` paths.

### Manual Verification
- We will inspect the generated code in `generated-examples/kanban-app/` to ensure it is ugly, highly verbose, and extremely fast (the "Compile-in-Prompt" pattern).
