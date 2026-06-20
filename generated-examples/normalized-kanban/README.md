# Generated Normalized Kanban Application

This directory contains a generated web application slice.
It was generated entirely from the contract definitions in `contracts/` and the IR definitions in `ir/`.

It uses the `fe` generator pipeline:
**Contract** -> **IR** -> **Generated Module** -> **Gauntlet**

## Architecture

* **State**: Uses a normalized shared map via `createInitialBoardState` and helper mutation methods (`applyItemMove`, `applyItemEdit`).
* **App**: Instantiates the Kanban Board and connects mutations.
* **Board**: Owns and creates columns and routes item patches.
* **Column**: Orchestrates physical DOM arrays of cards inside itself.
* **Card**: Self-contained atomic unit.

This serves as proof that `fe` can support an AI-generated architecture without thick runtime dependencies.
