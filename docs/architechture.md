# Architecture rules

This document defines practical DDD-inspired architecture boundaries for this Laravel codebase.

## Core boundaries

- Keep HTTP concerns, domain behavior, and infrastructure concerns in separate layers.
- Model business behavior in domain actions and model methods instead of controllers.
- Prefer explicit, intention-revealing names for actions, services, and model helpers.
- Keep each class focused on one responsibility and one level of abstraction.
- Transfer data between layers using DTOs instead of raw arrays.

## Naming conventions

- Use `VerbNounAction` for actions (for example, `CreateSaleAction`).
- Use `NounService` for services (for example, `SalesWorkflowService`).
- Use `NounData` for DTOs in `Data` (for example, `CreateSaleData`).
- Use `VerbNounRequest` for requests (for example, `StoreSaleRequest`).

## Domain folder structure

Every module should live under `app/Domain/[Name]/`.

Inside each module, follow this structure:

- `Actions`
- `Services`
- `Requests`
- `Enums`
- `Data`
- `Policies`
- `Support` (only when needed)

Guidelines:

- Keep module-specific classes inside that module namespace.
- Create `Support` only when shared module internals do not fit cleanly in other folders.
- Avoid creating parallel structures outside `app/Domain/[Name]/` for the same module behavior.

## Controllers (thin by default)

Controllers must stay thin.

Controllers may only:

- authorize
- call actions or services
- send responses to the user

Controllers should not contain:

- business rules
- data mutation orchestration across multiple domain concerns
- reusable query logic that belongs in domain/query classes

## Domain actions and services

Business orchestration belongs in Actions.

Use services only for orchestration, not execution.

Practical split:

- **Actions** execute concrete domain use-cases and contain business-state-aware behavior.
- **Services** coordinate multiple actions, collaborators, or external systems when workflow composition is needed.
- Hard rule: if a class directly mutates domain state, it is an **Action**. If it mainly coordinates calls, it is a **Service**.

If a class both orchestrates and executes domain logic, split it so execution is in actions and orchestration remains at service level.

When data is passed from services to actions, actions to services, or across architectural layers, use DTO classes from the module `Data` namespace.

DTO lifecycle:

- Build DTOs at input boundaries (for example, `Data::fromRequest($request)`).
- Treat DTOs as immutable transport objects after creation.
- Allow plain arrays only at framework boundaries where required (for example, final persistence payloads).

## Transactions

- Wrap multi-write domain operations in `DB::transaction()` at the action boundary.
- Do not scatter nested transaction handling across controllers and multiple layers.
- Keep transaction scope as small as possible around the writes that must be atomic.

## Error and exception contract

- Let actions throw domain-meaningful exceptions when rules are violated.
- Translate exceptions to HTTP responses in controllers or the global exception handler, not inside actions.
- Keep service/action signatures explicit so failure behavior is predictable.

## Authorization

Authorization belongs in:

- policies
- policies get called in controllers
- actions when business-state dependent

Guidelines:

- Use policy checks in controllers as the default entry-point authorization.
- Keep permission-shaped rules in policies.
- Allow actions to enforce additional state-dependent guards (for example, lifecycle or status transitions) when a simple permission check is insufficient.

## Models and model helpers

Create helpers in models for repetitive actions on that model.

Guidelines:

- Keep model helpers focused on behavior intrinsic to that model.
- Use model scopes and helper methods for recurring model-level patterns.
- Do not move orchestration that spans aggregates into model helpers; place that logic in actions/services.

## CRUD controller scope

Base controllers like `SalesController` should only be concerned with CRUD operations on that model. Any other responsibilities should be moved to dedicated controllers.

Examples:

- Reporting endpoints should live in dedicated report controllers.
- Specialized workflows (approve, close, return, post, reconcile) should live in dedicated controllers/actions instead of bloating base CRUD controllers.

## Interfaces and abstraction discipline

Avoid unnecessary interfaces.

Create interfaces only when at least one of these is true:

- multiple concrete implementations are expected
- a package boundary or external integration requires a contract
- tests require contract-level substitution that cannot be achieved with simpler patterns

Do not introduce interfaces that only mirror a single implementation without a clear boundary benefit.

## Practical Laravel defaults

- Use Form Requests for validation; keep validation rules out of controllers.
- Use policies for model/resource authorization and call authorization in controller actions.
- Keep framework glue in HTTP layer classes and domain behavior in action/domain classes.
- Prefer Eloquent scopes and query objects for reusable querying patterns.
- Use typed DTO objects for inter-layer payloads instead of untyped arrays.

## Testing expectations by layer

- Controllers: test HTTP contract (status, redirects, response shape), not deep business logic.
- Policies: test permission outcomes for allowed/denied cases.
- Actions/services: test business behavior, state transitions, and transaction-sensitive flows.
