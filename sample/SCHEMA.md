# Fe UI Sample App: Normalized Kanban Schema Contract

This document defines the strict shape of the CRDT state shared between the frontend and the WebSocket Hub. The Fe architecture uses explicit, normalized state to optimize LWW (Last-Writer-Wins) CRDT performance and determinism.

**Canonical Reference:** The canonical reference for this architecture in practice is the `gauntlet/apps/normalized-kanban` application. Do NOT use any legacy samples that might employ hot-path `bindMorph` or single-array states.

## 1. Why One Array is Bad for LWW
Storing `board_items = [all cards]` inside a single CRDT key creates massive network payloads and frequent collisions. If Client A edits task 1 and Client B edits task 2 concurrently, a single LWW key will overwrite one client's edits. 

Instead, Fe normalizes state into discrete keys.

## 2. Normalized Keys
The global CRDT `SharedMap` contains per-entity keys:

* `kanban:item:<id>` (Card Data)
* `kanban:column:<status>:index` (Column Ordering)
* `kanban:board:metadata` (Board Info)

### Kanban Item
```javascript
/**
 * @typedef {Object} KanbanItem
 * @property {string} id - A unique string identifier (e.g., random hex or uuid)
 * @property {string} title - The display text of the task
 * @property {'todo' | 'in-progress' | 'done'} status - The column the item belongs to
 * @property {string} priority - 'low', 'medium', 'high', 'urgent'
 * @property {string|null} lockedBy - User ID of the client actively dragging the card
 */
```

### Column Index
```javascript
/**
 * @typedef {string[]} ColumnIndex
 * Array of KanbanItem ids representing the physical rendering order.
 */
```

## 3. Operations & LWW Limitations

* **Safe**: Editing a card title updates only `kanban:item:<id>`. Concurrent edits to DIFFERENT cards are perfectly safe.
* **Deterministic**: Two clients editing the SAME card concurrently will result in one winner (LWW), but both clients will converge to the same state.
* **Limitation**: Two clients dragging and dropping cards in the SAME column concurrently will result in one array order winning. We accept this limitation for the sake of Zero-Dependency simplicity in this sample. This is not Google Docs.

## 4. Mechanical Validation Boundary
Fe UI enforces that external input MUST NOT be trusted, but prohibits using heavy runtime libraries like Zod. Instead, you must write tiny, mechanically verifiable manual parsers directly at the ingress boundary.

See `sample/validators.js` for our implementations:
- `normalizeKanbanItemFromSharedState(raw)`
- `normalizeColumnIndexFromSharedState(raw)`
- `normalizeKanbanStatus(raw)`
- `safeClassToken(raw)`
