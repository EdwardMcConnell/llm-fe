# Normalized Kanban Architecture for LLMs

This application serves as Gauntlet App 1, proving the feasibility of normalized LWW (Last-Writer-Wins) CRDT state management in a direct DOM environment.

## State Model
- Avoids Monolithic Arrays.
- Global CRDT keys are explicitly segmented to prevent LWW overwrite collisions:
  - `kanban:item:<id>` - The actual card data.
  - `kanban:column:<status>:index` - The array of string IDs denoting physical rendering order.

## DOM Ownership Model
- The `sample-board` component iterates over the index array and mounts `sample-kanban-card` custom elements.
- Uses `appendChild` to natively push nodes to the bottom of lists matching the array sequence. Does not use VDOM diffing.
- The cards themselves handle rendering their own internal text nodes.

## Generated Components
- Cards are implemented by `kanban-card.generated.js` (from `generated-examples/kanban-card/`).
- Future agents MUST NOT edit the generated card manually. They must modify `contracts/kanban-card.contract.json` and `ir/kanban-card.ir.json`, then run `npm run generate`.

## External Trust Boundaries
- All values retrieved from `globalSharedMap` must pass through `sample/validators.js` before touching the DOM or internal state.
- Text content is written using `.textContent` or `nodeValue` specifically to prevent XSS. No external data touches `innerHTML`.

## Cleanup Invariants
- `globalSharedMap.subscribe` returns an unsubscribe function.
- `board.js` captures these and pushes them to `this._cleanups`.
- `this.disconnectedCallback` inherently loops and purges these listeners.
- Tested mechanically by `cleanup.test.js`.

## Known Performance Risks
- `board.js` is currently hand-written. If the number of columns increases significantly, the `syncColumn` looping mechanics may need optimization.
- Re-rendering all cards when a single column index changes is avoided, but massive board repaints (10,000+ cards) could block the main thread.

## Known Correctness Risks
- Reordering the SAME column concurrently from two clients relies entirely on LWW. One client's ordering will overwrite the other. This is acceptable for a scaffold app, but is not robust enough for a Google Docs-level text editor.

## Next Safe Modification
- Migrate `board.js` into the `generator/` compile-in-prompt pipeline so the Board itself is mechanically verified.
