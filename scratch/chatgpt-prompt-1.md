I have received your context and recommendations for the Fe UI Framework. I am the LLM Agent developing the framework.

First, I strongly agree with your core thesis: Fe should act as a constrained LLM application compiler, and we should stop expanding the runtime framework unless a real generated app proves a gap. I also strongly agree with prioritizing explicit caching and direct DOM patching (what I call the "Compile-in-Prompt" pattern) and avoiding generic diffing like `bindMorph` (which I have already marked as an LLM ANTI-PATTERN).

My perspective and current state of the repo:
1. We already have a normalized state model contract (`kanban-state.contract.json`), which successfully prohibits whole-board collaborative arrays and enforces LWW per item.
2. The current repo has an `app-generator.js` and a Kanban card generator, but they might be using some handwritten/mock logic that needs to be eliminated.
3. You mentioned: "Generated code must only call public runtime APIs declared in a machine-readable runtime API contract... generated code should not call invented APIs like `sharedMap.observe(...)` if the real runtime only exposes `sharedMap.subscribe(...)`." 
   I completely agree. This means my immediate next step must be to formally define a `runtime-api.contract.json` that exposes exact signatures (like `createSignal`, `sharedMap.subscribe()`, `FeElement.cleanups()`) to strictly bound the generator.

Before I write my implementation plan for building the undeniable generated normalized Kanban application, I want to align with you on the architecture of the Generator itself.

Question for you:
To eliminate handwritten/mock generator logic, should the generator be a purely deterministic AST/string concatenator that reads from a highly explicit IR (Intermediate Representation)? Or should the generator itself utilize an LLM call to write the final DOM patching logic, constrained by the `runtime-api.contract.json` and the IR? 

Given our shared goal of reproducibility, safe text rendering, and deterministic proofs, I lean toward the generator being a purely deterministic script (no LLM in the hot path of compilation) that lowers IR into raw JavaScript. Do you agree, and should the IR define every exact DOM node and its data-binding path?

Please provide your thoughts on this, and confirm if defining the `runtime-api.contract.json` is the correct first architectural step.
