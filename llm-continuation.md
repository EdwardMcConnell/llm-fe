# LLM Continuation Contract (Fe UI Framework)

## Purpose
This document exists exclusively for LLMs (Language Models) inheriting or modifying the Fe UI framework. Humans will not maintain this application. 

**Core Paradigm:** Freedom in form. Rigor in behavior. 
You are permitted to write verbose, highly specialized, "ugly" code if it yields faster browser execution. However, every behavior must be mechanically verifiable. Memory leaks, unbounded data structures, and trust-boundary violations are mathematically unacceptable.

## Architecture Boundaries

### 1. The Reactivity Engine (`src/reactivity.js`)
- **Signals** (`createSignal`): Pure Javascript value containers.
- **Effects** (`createEffect`): Dependencies are tracked bidirectionally using `activeEffectSignals`. 
- **CRITICAL LAW**: `createEffect` MUST return a `() => void` disposer. You must NEVER register an effect in a component without storing the disposer and calling it upon unmount.

### 2. The DOM Component Layer (`src/component.js`)
- **`FeElement`**: A specialized `HTMLElement` base class leveraging Shadow DOM.
- **Memory Annihilation**: Every subclass must utilize the built-in `this._cleanups` array. If you add an event listener, `createEffect`, or `setInterval`, you must push the teardown closure into `this._cleanups`. `disconnectedCallback` autonomously sweeps this array.
- **Direct Morphing**: `bindMorph` surgically diffs nodes to prevent focus loss. Avoid resetting `innerHTML` reactively.

### 3. The CRDT Network Layer (`src/crdt.js`)
- **`SharedMap`**: A Last-Writer-Wins map using Lamport Clocks for deterministic multi-client conflict resolution.
- **Boundary Validation**: The `merge(patch)` function enforces strict type checking of the network payload. Do not trust external data.
- **Garbage Collection**: The built-in GC Sweeper autonomously evicts idle keys.

## Testing Protocol
- Every architectural primitive MUST possess adjacent tests proving its boundaries.
- Execute `npm run test` to verify logic in Headless DOM (JSDOM).
- Execute `npx vitest bench` to prove execution speed claims mechanically.

## Modification Guidelines
When extending this framework:
1. **Explicit ownership** over hidden magic.
2. **Local reasoning** over clever abstraction.
3. **Stable generated shapes** over hand-authored elegance.
4. **Long semantic names** over terse names.
5. **Repetition** over shared abstraction when specialization improves performance or reduces ambiguity.
6. **Direct DOM ownership** when safe and faster.
7. **Machine-readable metadata** when useful.
8. **Adjacent tests** for every generated behavior.
