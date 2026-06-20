# Data Grid Architecture for LLMs

This application serves as Gauntlet App 2, proving the feasibility of handling massive datasets (10,000+ rows) via DOM virtualization and direct patching.

## State Model
- Data is passed into the component via the `data` setter as a raw array.
- The `FeGrid` component maintains internal virtualization state: `startIndex`, `endIndex`, and `scrollTop`.

## DOM Ownership Model
- Uses absolute positioning and `transform: translateY` to physically move a small pool of DOM rows (the "window") as the user scrolls.
- Rows are recycled. Instead of recreating rows, the `_renderVirtualData` function patches new text values into existing `tr` DOM nodes to maximize performance.

## External Trust Boundaries
- Cell text is assigned directly to `td.textContent` within the virtualization loop, neutralizing XSS from external data sources.

## Cleanup Invariants
- Custom `ResizeObserver` instances and `document.addEventListener` for mouse events (column resizing) are strictly tracked.
- `this._cleanups.push()` ensures they are destroyed in `disconnectedCallback`.
- Tested mechanically by `cleanup.test.js`.

## Known Performance Risks
- Extremely rapid scrolling on lower-end devices might cause layout thrashing. The `scroll` event handler uses `requestAnimationFrame` debouncing to mitigate this.

## Known Correctness Risks
- Resizing logic relies on manual pixel calculation and does not perfectly handle complex CSS flex layouts if the grid container changes size. 

## Next Safe Modification
- The inner row rendering should be formalized into the `generator/` pipeline, lowering the `row` schema into a compiled patch function.
