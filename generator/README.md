# Fe Compiler Generator

This directory contains the compiler scripts that parse Machine-Readable Contracts and Intermediate Representation (IR) into generated vanilla JS Direct-DOM operations.

## Current Generator Limitations

The long-term direction of Fe is a completely generic contract/IR compiler. **It is not there yet.** 
Currently, the generator relies on some app-specific assumptions and hardcoded logic while the IR vocabulary stabilizes.

### Which paths are generic?
- State to DOM pathing (basic text updates based on state changes)
- Event listener bindings based on standard `target` and `type`
- Basic DOM instantiation (`template.content.cloneNode`)
- Standard input/form binding

### Which paths are app-specific?
- `generator/app-generator.js` currently contains app-specific conditional blocks (e.g. specialized list rendering for Kanban vs standard iteration loops).
- `generator/data-grid-generator.js` handles virtualized rendering with hardcoded math specific to the data-grid canonical proof.
- `app-wireup` generation is still highly bespoke per app structure instead of relying purely on an explicit `AppContract` graph resolver.

### What must happen before calling it general?
1. The IR vocabulary must be expanded to handle list reconciliation natively (`morph`, `insert`, `remove` operations in IR) instead of hardcoding `kanban` specifics.
2. The `app-generator.js` file must be unified into a single AST generator that accepts *any* app contract and generates wireup and child mounts automatically.
3. Nested state proxying (e.g., deep signals) needs a generic parser.

### What IR operations exist?
- `create`: Instantiates DOM and caches query selectors to elements.
- `state`: Subscribes to atomic units of state via the CRDT.
- `events`: Listens for native DOM events and emits Fe `runtime` intentions.
- `validators`: Evaluates strict state rules at the trust boundary.

### What runtime APIs may generated code call?
All generated code is constrained by `contracts/runtime-api.contract.json`. 
Current allowed APIs are minimal:
- `globalSharedMap.get(key)`
- `globalSharedMap.set(key, val)`
- `globalSharedMap.delete(key)`
- `globalSharedMap.subscribe(callback)`
- `globalAuthManager.getToken()`
- `globalDemandManager.demand(sharedMap, key, fetcher)`
- `globalTime.now()`

*Do not hallucinative runtime API calls. If an app needs a new primitive, it must be added to the runtime contract.*
