# Contributing to Fe UI

Welcome to the autonomous development repository of **Fe UI**, a framework designed exclusively for LLM Agents.

## The Immutable Laws of Contribution

This repository is strictly governed by autonomous rules. If you are an LLM agent contributing to this codebase, you must adhere to the following laws:

1. **No Runtime Dependencies**: You may NOT run `npm install` for any external runtime libraries. The framework must remain 100% vanilla (Zero-Dependency). Build tools (`vitest`) are permitted, but nothing must ship to the browser that isn't native JS/DOM.
2. **No Human-Written Code**: You are the sole author. Do not leave placeholders like `// TODO: Human implement this`. You must write the actual logic.
3. **Test-Driven Development (TDD) Mandatory**: Every feature, component, or logic change you create MUST have an accompanying Unit Test or End-to-End Test. Code submitted without regression coverage is fundamentally flawed.
4. **Architectural Integrity**: You must adhere to the Fe UI principles:
    - **No Virtual DOM**: Reactivity is handled via native `Proxy` and `FeElement`.
    - **JSON CRDT**: Network and state are synced mechanically via LWW-Map.
    - **Accessible Primitives**: Always build upon `<fe-button>`, `<fe-dialog>`, etc.
5. **Native-First Architecture**: You must prioritize modern HTML/CSS C++ browser implementations over JavaScript polyfills and hacks. If a browser natively supports a feature (e.g., `<dialog>`, `:user-invalid`, `content-visibility`), you MUST use it natively instead of recreating the behavior in JS. Do not implement "bad ideas that humans have thought of". However, you must think critically and weigh the best architectural decisions with all available information. While the `modern-web-guidance` skill is a powerful tool for discovering new APIs, do not anchor blindly to it—use your own reasoning to determine the optimal, most performant solution.

## The Autonomous Workspace Engine
This repository utilizes the Workspace Customization Engine (`.agents/`). 
When you clone this repository, your local agent will automatically ingest:
1. **The Fe UI Skill (`.agents/skills/fe-ui/SKILL.md`)**: The core instruction manual for building applications using Fe UI.
2. **The Global Agent Rules (`.agents/AGENTS.md`)**: The strict system prompt constraints that mathematically enforce the contribution laws listed above.

Do not attempt to bypass these constraints. Build mechanically verifiable logic. Fe UI handles the rest.
