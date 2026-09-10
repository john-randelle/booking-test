<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Code principles: SOLID

All code written or refactored in this repo must follow the SOLID principles.

## S – Single Responsibility Principle
A module, class, or function should have one reason to change.
- Keep route handlers thin: parse/validate input, call a service, return a response.
- Put business logic in services and data access in repositories; do not mix them.
- If a file's name needs "and" to describe it, split it.

## O – Open/Closed Principle
Code should be open for extension but closed for modification.
- Add new behaviour by adding new implementations (new strategy, handler, provider), not by editing a growing `if`/`switch` chain.
- Prefer composition and configuration over changing existing, tested code.

## L – Liskov Substitution Principle
Subtypes must be usable anywhere their base type is expected without surprises.
- Implementations of an interface must honour its contract: same inputs, same error semantics, no strengthened preconditions or weakened postconditions.
- Do not implement an interface method by throwing "not supported".

## I – Interface Segregation Principle
Clients should not depend on methods they do not use.
- Define small, focused interfaces (e.g. `BookingReader`, `BookingWriter`) rather than one large "god" interface.
- Accept the narrowest type a function actually needs.

## D – Dependency Inversion Principle
High-level modules depend on abstractions, not on concrete implementations.
- Services depend on repository/interface types; concrete implementations (Drizzle, HTTP clients, etc.) are injected at the composition root.
- Never import a concrete database client directly into business logic.
- This keeps services unit-testable with in-memory fakes.

## Applying these principles
- When adding a feature, first identify which abstraction it extends before writing code.
- When a change requires editing many unrelated files, that is a signal a principle is being violated; refactor first.
- Keep SOLID pragmatic: do not introduce abstractions with only one implementation unless testing or a known upcoming variant requires it.
