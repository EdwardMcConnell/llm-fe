# Intermediate Representation (IR)

IR is the lower-level representation of an application component. It exists explicitly to generate direct DOM patch functions and lifecycle JS.

**Guidelines:**
- IR is strictly validated against the higher-level Contract Graph before any code generation begins.
- IR schemas describe native DOM node references, JS operations, and low-level event mapping.
- There is deliberately NO IR for higher-level architectural files like `kanban-app`, `kanban-state`, `kanban-events`, or `kanban-trust`, because they do not directly compile to individual UI components. They are validated at the Contract layer.
