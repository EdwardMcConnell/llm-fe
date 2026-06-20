---
name: Fe UI
description: Guide for building scalable, enterprise-grade Single Page Applications with the Fe UI framework. Trigger when the user mentions "Fe UI", "Iron UI", "Fe framework", or asks to build a modern, LLM-native frontend.
---

# Fe UI: Enterprise LLM-Native Framework

You are building an application using **Fe UI** (formerly Antigravity), an enterprise-grade framework designed mathematically for LLMs.

## Architectural Philosophy
Fe UI fundamentally rejects Virtual DOMs (React/Vue). It operates using raw DOM Web Components enhanced by native JS Proxy Reactivity and a JSON CRDT (Conflict-Free Replicated Data Type) engine.

### 1. Reactivity Engine (No VDOM)
Do not use `setState` or manual DOM manipulation.
```javascript
import { createSignal } from 'fe-ui/reactivity';
const [count, setCount] = createSignal(0);
// The DOM updates instantaneously via precise signal subscriptions
```

### 2. Network Data & The CRDT
**NEVER use `fetch()` or `axios` directly.** Fe UI handles network deduplication and global state natively via the `DemandManager`.

Inside a `FeElement`, use `this.demandData()`:
```javascript
export class MyDashboard extends FeElement {
  bind() {
    // This autonomously deduplicates network requests, caches via CRDT,
    // manages Loading/Error states, and pins the memory subscription.
    const [userData, status] = this.demandData('user_123', '/api/users/123');
    
    // userData is a reactive Proxy!
  }
}
```

### 3. Accessible Primitives
Always use Fe UI primitives instead of native HTML where applicable:
- `<fe-button>`: Automatically handles `tabindex`, Enter/Space key trapping, and Telemetry event logging.
- `<fe-dialog>`: Handles `aria-modal` and focus trapping natively.
- `<fe-time>`: Handles localized time display. Pass strict UTC ISO strings: `<fe-time datetime="2026-06-18T21:00:00Z" format="relative"></fe-time>`. Do not use `new Date()`.
- `<fe-link>`: Hover-intent pre-fetching router links.

### 4. Forms
**NEVER write manual `onsubmit` logic or `preventDefault()`.**
Use the autonomous `createFormSignal`:
```javascript
import { createFormSignal } from 'fe-ui/form';

const form = createFormSignal({
  initialValues: { email: '' },
  validate: (values) => {
    const errors = {};
    if (!values.email.includes('@')) errors.email = 'Invalid email';
    return errors;
  },
  onSubmit: async (values) => {
    // Values are guaranteed clean. 
    // <input type="date"> fields are natively forced into UTC ISO strings by the framework!
  }
});
```
Bind it using `<fe-form>` and `<input name="email">`. The framework autonomously locks buttons and injects `aria-invalid`.

### 5. Data Validation & The LLM Contract
**Do not build heavy runtime JavaScript Schema Validation engines (like Zod or Joi).** However, **internal generated code may trust framework primitives, but external input MUST be checked**. You must add tiny, purpose-built validators at trust boundaries (e.g., validating CRDT patches before merge, parsing WebSockets, and sanitizing forms). LLMs perform best when APIs are explicit, narrow, example-backed, mechanically verified, and runtime-observable.

### 6. The Backend Protocol (Agnostic Hub)
Fe UI is strictly a frontend architecture. It does not dictate backend languages or frameworks. However, the backend **must** implement a WebSocket Hub that adheres to the mathematical CRDT protocol.

**Client to Server (`subscribe`):**
When a component demands data, the client sends:
`{ "type": "subscribe", "key": "user_123" }`
The backend must respond with the current authoritative state using the `set` structure below.

**Client to Server / Server to Client (`set`):**
When state changes locally or arrives from the network, the schema is:
`{ "type": "set", "key": "user_123", "value": { ... }, "clock": 1, "client": "client_abc" }`

**Backend Responsibilities:**
1. Maintain an authoritative Lamport Clock mapping for each `key`.
2. Reject `set` patches if the payload structure violates the explicit LLM Contract (`SCHEMA.md`).
3. Relay valid `set` patches to all other connected WebSocket clients.
4. Natively validate the JWT before allowing connections. (Fe UI natively handles `401` HTTP statuses but assumes the WebSocket is authenticated on upgrade).

## Conclusion
Build mathematically perfect logic. Fe UI handles the rest.
