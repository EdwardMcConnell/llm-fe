# Fe UI Sample App: Kanban Board Schema Contract

This document defines the strict shape of the CRDT state shared between the frontend and the WebSocket Hub. While there are no massive runtime JS schema engines used during normal operation, external input arriving at trust boundaries (like network patches) MUST be manually checked against this exact schema before ingestion.

## 1. Global State Structure

The global CRDT `SharedMap` contains a single key for the kanban board items.

```javascript
/**
 * @typedef {Object} GlobalCRDTState
 * @property {KanbanItem[]} board_items
 */
```

## 2. Entity Definitions

### Kanban Item

```javascript
/**
 * @typedef {Object} KanbanItem
 * @property {string} id - A unique string identifier (e.g., random hex or uuid)
 * @property {string} title - The display text of the task
 * @property {'todo' | 'in-progress' | 'done'} status - The column the item belongs to
 * @property {number} createdAt - UTC Unix timestamp in milliseconds
 */
```

## 3. Network Protocol (Hub Exchange)

All clients will `subscribe` to the `board_items` key.
The backend WebSocket Hub will relay `set` patches conforming to the schema:

```json
{
  "type": "set",
  "key": "board_items",
  "value": [
    {
      "id": "item_abc123",
      "title": "Design the CRDT Hub",
      "status": "in-progress",
      "createdAt": 1718764201000
    }
  ],
  "clock": 42,
  "client": "client_xyz789"
}
```

## 4. Mechanical Validation Boundary

Fe UI enforces that external input MUST NOT be trusted, but prohibits using heavy runtime libraries like Zod. Instead, you must write a tiny, mechanically verifiable manual parser directly at the ingress boundary (e.g., when receiving a WebSocket message or HTTP response):

```javascript
/**
 * Mechanically validates a KanbanItem arriving from the network.
 * If invalid, throws an error before it can pollute the CRDT.
 */
function assertValidKanbanItem(item) {
  if (!item || typeof item !== 'object') throw new Error('Invalid KanbanItem: not an object');
  if (typeof item.id !== 'string') throw new Error('Invalid KanbanItem: missing string id');
  if (typeof item.title !== 'string') throw new Error('Invalid KanbanItem: missing string title');
  if (!['todo', 'in-progress', 'done'].includes(item.status)) throw new Error('Invalid KanbanItem: invalid status');
  if (typeof item.createdAt !== 'number') throw new Error('Invalid KanbanItem: missing number createdAt');
  return item;
}
```
