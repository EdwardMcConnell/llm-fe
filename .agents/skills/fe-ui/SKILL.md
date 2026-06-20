---
name: Fe UI
description: Guide for building scalable Single Page Applications with the Fe UI framework. Trigger when the user mentions "Fe UI", "Iron UI", "Fe framework", or asks to build a modern, LLM-native frontend.
---

# Fe UI: LLM-Native Framework

You are building an application using **Fe UI** (formerly Antigravity), a framework designed explicitly for LLM continuation and machine-verifiable behavior. Humans will not maintain the code you write.

## Architectural Philosophy
Fe UI fundamentally rejects Virtual DOMs (React/Vue). It operates using raw DOM Web Components enhanced by native JS Proxy Reactivity and a JSON CRDT engine.

### 1. Reactivity Engine (No VDOM)
Do not use `setState` or manual DOM manipulation for state updates.
```javascript
import { createSignal } from 'fe-ui/reactivity';
const [count, setCount] = createSignal(0);
// The DOM updates instantaneously via precise signal subscriptions
```

### 2. Network Data & The CRDT
**NEVER use `fetch()` or `axios` manually for shared state.** Fe UI handles network deduplication and global state natively via the `DemandManager`.

Inside a `FeElement`, use `this.demandData()`:
```javascript
export class MyDashboard extends FeElement {
  bind() {
    // This autonomously deduplicates network requests, caches via CRDT,
    // and returns the [getter, setter, unsubscribe] tuple.
    // The unsubscribe is automatically tracked by FeElement._cleanups.
    const [getUserData, setUserData, unsubscribe] = this.demandData(
      'user_123', 
      () => fetch('/api/users/123').then(res => res.json())
    );
    
    this.createEffect(() => {
      const data = getUserData();
      if (!data) return; // Loading state
      console.log('User loaded:', data);
    });
  }
}
```

### 3. Accessible Primitives
Always use Fe UI primitives instead of native HTML where applicable:
- `<fe-button>`: Handles keyboard trapping and Telemetry event logging natively.
- `<fe-dialog>`: Handles `aria-modal` and focus trapping natively.
- `<fe-time>`: Handles localized time display. Pass strict UTC ISO strings. Do not use `new Date()`.

### 4. Forms
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
    // Values are validated before execution.
  }
});
```

### 5. Data Validation & The LLM Contract
**Do not build heavy runtime JavaScript Schema Validation engines (like Zod).** However, **internal generated code may trust framework primitives, but external input MUST be checked**. You must add tiny, purpose-built validators at trust boundaries (e.g., validating CRDT patches before merge, parsing WebSockets, and sanitizing forms). LLMs perform best when APIs are explicit, narrow, example-backed, and mechanically verified.

### 6. Capability Detection
Use modern browser APIs, but **you must use feature detection** (`if (document.startViewTransition)`) and provide simple vanilla fallbacks. Do not assume universal browser support for experimental APIs.

### 7. Named Invariants (Mechanical Proofs)
Never assert that a behavior is "foolproof" or "memory-safe". Prove it. Document your architectural choices using **Named Invariants** and back them up with tests.

**Example Invariants in Fe UI:**
- **Invariant**: `FeElement` click listener is removed on disconnect. (Proof: `core.test.js`)
- **Invariant**: `createEffect` returns a deterministic disposer. (Proof: `core.test.js`)

## Conclusion
Build mechanically verifiable logic. Replace human-centric code with explicit ownership.
