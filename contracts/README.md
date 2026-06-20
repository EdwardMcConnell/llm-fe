# The Contract Graph

The contract graph is the main **continuation artifact** for future LLMs interacting with the `Fe` framework.

**A future LLM should:**
1. Modify contracts first.
2. Modify IR second.
3. **Never modify generated code by hand**, unless actively debugging a regression.

The contracts describe ownership, events, normalized state, trust boundaries, cleanup rules, and performance boundaries. This declarative architecture is what makes Fe fundamentally different from React/Solid-style runtime frameworks where the architecture is inferred implicitly through arbitrary JS execution.
