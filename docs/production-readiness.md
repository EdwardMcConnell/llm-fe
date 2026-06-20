# Production SaaS Readiness Criteria

**Important Disclaimer:** Fe is an experimental LLM-native application compiler scaffold. **Fe is NOT currently production-ready.** It does not currently guarantee production success, and it cannot safely support arbitrary customer-critical experiences today.

The purpose of this document is to define what Fe *would* need to prove before it could credibly support production enterprise SaaS frontends. The claims in this document map strictly to future executable proofs. If a dimension below lacks an automated, reproducible executable check within the repository, that capability is considered **unsupported**.

---

## Readiness Dimensions

Fe will not claim production readiness until every one of the following 18 dimensions is proven mechanically through continuous integration release gates.

### 1. Functional Correctness
- **Definition:** Generated applications must exactly mirror their declared contracts (schema, logic, transitions).
- **Proof Requirement:** Every canonical Tier A app pattern (e.g., Kanban, Data Grid) must possess a fully automated browser suite that asserts the structural and functional output.

### 2. Runtime API Discipline
- **Definition:** Generated code must only interact with a strictly declared, versioned, and constrained runtime API (the "IR runtime").
- **Proof Requirement:** Static scanning of generated artifacts must assert that undocumented browser globals (e.g., direct arbitrary `document` manipulation outside of declared IR boundaries) are strictly absent.

### 3. Trust-Boundary Safety
- **Definition:** The compiler must inherently reject dangerous injections. External text must not be rendered as HTML, external URLs must be normalized, and class/enum tokens must be validated.
- **Proof Requirement:** Security test suites must aggressively attempt to breach the generated DOM via mock malformed state. Artifact generation must fail if `innerHTML`, `insertAdjacentHTML`, `eval`, or inline event handler attributes are emitted.

### 4. Accessibility
- **Definition:** Generated components must meet enterprise standards for labels, roles, accessible names, keyboard interactions, and focus traps.
- **Proof Requirement:** Automated browser tests and tools like `axe-core` must prove ARIA validity, focus order, and keyboard navigation for every claimed Tier A behavior. Currently, broad accessibility is **unsupported**.

### 5. Browser Compatibility
- **Definition:** Production enterprise software must support a baseline matrix of modern browsers.
- **Proof Requirement:** Automated tests must pass across Chromium, WebKit (Safari), and Firefox engines. Currently, Fe is only proven against **Chromium**.

### 6. Performance and Regression Thresholds
- **Definition:** Applications must remain responsive under heavy enterprise data loads.
- **Proof Requirement:** Quantitative performance budgets (e.g., maximum milliseconds to patch a row or render 10,000 virtualized items) must be stored as contracts and enforced via `verify:all` benchmarking.

### 7. State Consistency
- **Definition:** Multi-user or highly concurrent asynchronous state operations must deterministically resolve.
- **Proof Requirement:** CRDT / `SharedMap` convergence must be tested under simulated network latency and conflict conditions within the browser proof.

### 8. Cleanup and Memory Safety
- **Definition:** Disposing of a route or component must sever all event listeners, network subscriptions, and state bindings.
- **Proof Requirement:** Memory leak and DOM-node retention tests must assert that memory footprints return to baseline after a component is mounted, mutated, and disposed. Mutating state after disposal must not throw errors or mutate stale DOM.

### 9. Error Handling and Recovery
- **Definition:** The frontend must gracefully handle network failures, invalid data, or absent permissions without crashing.
- **Proof Requirement:** Resource state contracts must define transitions for loading, empty, error, and permission-denied states. Browser proofs must exercise these transitions. Currently, full error boundary enforcement is **unsupported**.

### 10. Observability
- **Definition:** Operations teams must have insight into application health.
- **Proof Requirement:** A telemetry contract must define safe, PII-scrubbed events for routing, errors, and actions. The generated app must be proven to emit these payloads via tests. Currently, observability is **unsupported**.

### 11. Auth/Session/Permission Integration
- **Definition:** Enterprise frontends require complex role-based capability gating.
- **Proof Requirement:** Contracts must define roles and resource scopes. Browser proofs must confirm that unauthorized actions are un-clickable, hidden controls remain absent from the DOM, and disabled controls cannot emit events. **Note: Frontend permission checks are UX enhancements; backend enforcement is always required.** Currently, comprehensive role-based permission rendering is **unsupported**.

### 12. Internationalization (i18n) Readiness
- **Definition:** Applications must support locale-aware formatting and string translation.
- **Proof Requirement:** Text primitives and date/currency formatters must accept locale contexts via contract. Currently, i18n is **unsupported**.

### 13. Test Reproducibility
- **Definition:** Test environments must exactly match the artifacts generated for production.
- **Proof Requirement:** Browser proofs must directly import or serve the *generated artifacts* without intermediary abstractions or handwritten "sample" application shells.

### 14. Generated Artifact Reproducibility
- **Definition:** All artifacts that count toward the repository's maturity score must be strictly reproducible from their source IR.
- **Proof Requirement:** `verify:generated` must regenerate all counted artifacts and assert a zero-diff match against checked-in files.

### 15. Release Gating
- **Definition:** Code cannot enter production unless it clears the compiler's strict criteria.
- **Proof Requirement:** A full `verify:all` gauntlet execution (which checks types, benchmarks, proofs, and regression budgets) must pass flawlessly before a release is permitted.

### 16. Rollback Strategy
- **Definition:** Broken compiler versions must be revertible without irrecoverable state corruption.
- **Proof Requirement:** The repository must document a recovery path for migrating applications backward if a newer runtime or generated artifact introduces critical regressions.

### 17. Versioned Contracts and Migrations
- **Definition:** Enterprise applications evolve over time; old contracts must remain intelligible.
- **Proof Requirement:** Contracts must specify `schemaVersion`, `appVersion`, and `runtimeApiVersion`. The generator must validate version compatibility and fail on mismatches. Currently, versioning is **unsupported**.

### 18. Documentation for Future LLM Agents
- **Definition:** The repository must provide unambiguous instructions, limitations, and invariants so that future autonomous agents can maintain or evolve the codebase without drifting into anti-patterns.
- **Proof Requirement:** Documents like this one, alongside `SKILL.md` or `AGENTS.md` guidelines, must be continually updated and respected.

---

## Conclusion
Fe's objective is to make production-readiness mechanically inevitable before the repo is allowed to claim it. Until the automated infrastructure can irrefutably answer "yes" to all 18 dimensions, Fe remains a research experiment.
