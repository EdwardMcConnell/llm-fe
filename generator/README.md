# Fe Generator

This directory contains the experimental code generator for Fe. 

## Current Capabilities

The generator parses JSON contracts and Intermediate Representation (IR) graphs to output direct-DOM, dependency-free vanilla JavaScript components.

The core pipeline has been unified in `app-generator.js` and `index.js`. 

## Known Limitations

**The generator is not yet a fully generic compiler.**

While the component generation loop (creating DOM templates, wiring up static event handlers, and executing `.textContent` patch blocks) is mostly generic, the repository relies on **app-specific wireups** to bridge the gap between high-level application lifecycle and raw UI components.

### What is Generic
- Component DOM tree initialization.
- Simple reactive property binding.
- Basic CRDT SharedMap subscription wiring.
- Exporting predictable factory functions (`create<ComponentName>`).

### What is App-Specific
- **Wireup scripts (`generator/wireups/`)**: These files dictate how specific applications wire their distinct components together. For example, `kanban-wireup.js` knows exactly how to hook up `NormalizedKanban`'s drag-and-drop to CRDT mutations.
- **Complex Structural Reconciliation**: `data-grid` handles massive virtualized lists, but the generic IR does not yet possess the universal grammar to express "morphing" or "insert/remove" at scale.

## Proof Tiers Supported

- **Tier A (Fully Proven)**: `normalized-kanban`. The wireup and compiler logic here is robust, tested, benchmarked, and proven in browser automation.
- **Tier B (Emerging Examples)**: `data-grid`, `settings-form`, `live-dashboard`, `product-catalog`. These run through the generator via their specific wireup files, but lack complete canonical proof (like automated browser test harnesses).

## Instructions for Future LLMs

When adding new app categories or primitives:
1. **Prefer Generic Expansion First**: Try to express the UI pattern using the existing `ir/` vocabulary.
2. **Use Custom Wireups for App Logic**: If the application requires complex structural DOM manipulation or business logic orchestration that cannot yet be expressed generically, create a new `[app-name]-wireup.js` in `generator/wireups/`.
3. **Do not pretend it's generic**: If you create a custom wireup, assign the app to Tier B or Tier C. Only fully generic pipelines with complete proof packs earn Tier A.
