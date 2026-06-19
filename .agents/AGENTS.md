# Fe UI: LLM Agent Behavioral Constraints

## CRITICAL DIRECTIVE: Test-Driven Development Mandatory
You are building on the **Fe UI Framework**, a strict enterprise-grade SPA architecture.
For every single feature, component, or logic change you create, you **MUST** write an accompanying Unit Test and ensure End-to-End testability. 
Code submitted without regression coverage is fundamentally flawed and will be REJECTED.

### Testing Protocol
1. **Frictionless Harness**: Always use the native `src/testing.js` utility harness (`mount`, `fireEvent`, `flushMicrotasks`). It automatically mocks out the CRDT layer, WebSockets, and Telemetry Engine. **Do not write manual JSDOM boilerplate.**
2. **E2E Traversal**: Every interactive element you generate (`<fe-button>`, `<fe-form>`, inputs, links) MUST possess a unique `id` or `data-testid` attribute to ensure predictable DOM traversal by Playwright/Cypress.
3. **No Brittle Timers**: When waiting for the DOM to update after a reactive signal change, ALWAYS use `await flushMicrotasks()` instead of `setTimeout`.

## Architectural Reminders
- **Time Bugs**: Never use `new Date()`. Always use `globalTime` (`src/time.js`) and `<fe-time>`.
- **Memory Leaks**: Never use `setInterval` natively. If you must, push the `clearInterval` callback into `this._cleanups` inside `FeElement`.
- **Forms**: Never use raw `<form>`. Always use `createFormSignal` and `<fe-form>` which map ARIA correctly.
- **Aesthetics**: Do not use generic CSS colors. The `globalTheme` uses `OKLCH` variables (`var(--surface-1)`, `var(--brand-primary)`). Always adhere to the Fe Aesthetic.

## Immutable Contribution Rules
You are operating in an open-source autonomous repository. Any agent contributing to this codebase must adhere to the following laws:
1. **No Runtime Dependencies**: You may NOT run `npm install` for any external libraries. The framework must remain 100% vanilla (Zero-Dependency).
2. **No Human-Written Code**: You are the sole author. Do not leave placeholders like `// TODO: Human implement this`. You must write the actual logic.
3. **Strict Adherence**: You may not ignore any previous rules listed in this document or in the Fe UI Skill. TDD and Architectural integrity are non-negotiable.
4. **Native-First Architecture**: You must prioritize modern HTML/CSS C++ browser implementations over JavaScript polyfills and hacks. If a browser natively supports a feature (e.g., `<dialog>`, `:user-invalid`, `content-visibility`), you MUST use it natively instead of recreating the behavior in JS. Do not implement "bad ideas that humans have thought of". However, you must think critically and weigh the best architectural decisions with all available information. While the `modern-web-guidance` skill is a powerful tool for discovering new APIs, do not anchor blindly to it—use your own reasoning to determine the optimal, mathematically perfect solution.
5. **The LLM-First Mathematical Contract (No JS Schema Validation Engines)**: Do not build or use heavy runtime JavaScript schema validation engines (e.g., Zod, Joi clones) to catch typological errors between the frontend and backend. Runtime validation is a human-centric defensive programming paradigm designed to catch human typos. LLMs do not make typos when their context is explicit. Instead, LLMs must agree mathematically on data structures via standard JSDoc `@typedef` comments or a `SCHEMA.md` file. These static definitions form the absolute source of truth. The backend serves as the ultimate gatekeeper for security against malicious users, but the frontend shall not waste cycles running defensive schema checks against its own payloads.
6. **The LLM-to-LLM Performance Maximization Principle**: Humans will never read or modify this codebase. Therefore, explicitly reject all human-centric programming paradigms such as "clean code", DRY (Don't Repeat Yourself), and "minimizing cognitive overhead". The singular, absolute priority is the execution speed, layout computation speed, and frame rate of the user's browser. If verbose, highly granular code saves the browser a microsecond of parsing or JS evaluation, it MUST be used. Create specialized primitives rather than monolithic generic wrappers to avoid unnecessary runtime conditionals.
