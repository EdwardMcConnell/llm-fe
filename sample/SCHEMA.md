# Fe UI Sample App: Kanban Board Schema Contract

This document mathematically guarantees the shape of the CRDT state shared between the frontend and the WebSocket Hub. As per the Fe UI architectural rules, there are no runtime JS validators—this LLM-first schema defines the strict bounds of the application state.

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
