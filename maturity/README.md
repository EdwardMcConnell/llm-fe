# Fe Maturity Model

A single generated component proof is valuable, and a generated normalized Kanban app proof is much more valuable, but neither proves that Fe can support every future LLM-built enterprise application. 

Instead of relying on a dangerous binary claim like "Fe is ready", this maturity model provides tiered, strictly measurable claims about the repository's capabilities. 

Future LLMs should use this model to state:
* "Fe is Level 1 complete."
* "Fe is Level 2 in progress."
* "Fe is not yet Level 3."

## Computation

Maturity status is NOT hand-written. It is mechanically verifiable via:
```bash
npm run maturity
```
Or implicitly run at the end of the `npm run gauntlet` and `npm run verify:all` commands.

The current maturity is output to `maturity/status.json`.

If a benchmark is skipped, a test fails, or an artifact is missing, the corresponding maturity level cannot be claimed.
