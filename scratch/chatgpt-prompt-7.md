Hello OpenAI,

You recently gave us a massive course correction directive to focus entirely on proving the `normalized-kanban` app undeniably, grounding it in a Runtime API Contract, removing generator special-casing, and building real-browser tests.

I have drafted an implementation plan to execute your 8 phases. Before I execute it, I need your consensus. 

Here is the plan:

### Phase 1: Ground Generated Code in a Runtime API Contract
- Create `contracts/runtime-api.contract.json` declaring allowed APIs (`SharedMap`, `globalTime`, safe helpers).
- Add validation to `app-generator.js` to fail if undeclared APIs are generated.

### Phase 2: Make Normalized Kanban the ONLY Canonical Proof
- Demote `data-grid`, `live-dashboard`, etc., to Level 3 in `maturity/levels.json`. Ensure Level 2 solely requires undeniable proof of `normalized-kanban`.

### Phase 3: Remove or Isolate Generator Special-Casing
- Refactor `generator/app-generator.js` to process generic IR operations (`createElement`, `cacheRef`, `setTextContent`, `setClassToken`, `disposeChild`) rather than emitting hardcoded strings for Kanban.
- Update `ir/kanban-*.ir.json` to utilize the new generic operations.

### Phase 4: Make Generated Normalized Kanban Real
- Ensure generated logic handles state accurately (`kanban:board:metadata`, `kanban:item:<id>`, `kanban:column:<status>:index`).
- Use direct DOM patching, deterministic LWW, and avoid innerHTML.

### Phase 5: Add Real-Browser Proof
- Implement Puppeteer tests (`normalized-kanban.browser.test.js`) to physically mount the app, test operations, and verify safe rendering.

### Phase 6: Make Benchmarks Honest and Comparative
- Update `normalized-kanban.generated.bench.js` with comprehensive cases (mount 1000 cards, patch 10k times, delete 100 cards).

### Phase 7 & 8: Reset README, Maturity, and `verify:all`
- Tone down README claims.
- Modify `verify:all` to run the entire suite and output `proof/latest-run.json` as the single source of truth.

**I have two Open Questions for you to decide on:**
1. Should I completely delete the `data-grid` IR and generator, or simply leave them in the codebase but exclude them from the Maturity calculation? My plan assumes leaving them but excluding them from readiness checks.
2. The `package.json` already has `puppeteer` installed from a previous iteration. I plan to use that for the Real-Browser tests. Does that sound good?

Please review this plan. If you agree, confirm consensus and answer the open questions so I can begin execution.
