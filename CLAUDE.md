# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chista is a minimal, framework-agnostic base class for building clean service layers with LIVR validation. The name means "clean" in Ukrainian.

## Setup

Requires Node >=20. `livr` is a peer dependency — build and tests fail without it:

```bash
npm install
npm install livr    # peer dep, not auto-installed
```

## Commands

```bash
npm run build                # TypeScript to dist/
npm test                     # Run all tests
npm run prepublishOnly       # Build + test (runs before npm publish)

# Run a single test file
node --experimental-vm-modules node_modules/jest/bin/jest.js tests/ServiceBase.test.ts

# Run tests matching a pattern
node --experimental-vm-modules node_modules/jest/bin/jest.js -t "pattern"
```

## Architecture

This is a TypeScript ESM library that exports two classes:

- **ServiceBase** (`src/ServiceBase.ts`): Abstract base class implementing a service pattern with validation, permissions, and lifecycle hooks. Caches LIVR validators as static properties on each service class.

- **ServiceError** (`src/ServiceError.ts`): Error class with `fields` (validation errors) and `code` (error type, defaults to 'VALIDATION_ERROR').

### ServiceBase Execution Flow

1. `run(inputData)` - Entry point
2. `validate(data)` - LIVR validation using static `validation` property
3. `checkPermissions(cleanData)` - Abstract, must implement authorization
4. `aroundExecute(cleanData, proceed)` - Hook for wrapping execute (transactions, retries, etc.)
5. `execute(cleanData)` - Abstract, implement business logic
6. `onSuccess(result, context)` / `onError(error, context)` - Lifecycle hooks

### Key Patterns

- Services are generic: `ServiceBase<TValidParams, TServiceResult>`
- `validateWithRules<T>(data, rules)` allows dynamic/multi-step validation within a service
- Intermediate `Base` classes override `aroundExecute` to add cross-cutting concerns (transactions, retries, etc.)

## Examples

See `examples/` for runnable code demonstrating key patterns:

- **simple/** - Basic 3-layer pattern (ServiceBase → Base → ConcreteService)
- **dynamic-validation/** - Multi-step validation with conditional rules using `validateWithRules()`
- **permissions/** - Role-based access control and resource ownership checks in `checkPermissions()`
- **hooks/** - Lifecycle hooks (`onSuccess`/`onError`) for logging, metrics, events, and cleanup

Run any example with: `npx tsx examples/<name>/main.ts`

### Key Conventions

- Each service file is self-contained: validation schema (`as const`), inferred input type via `InferFromSchema`, and output interface
- Project-specific `Base` classes override `aroundExecute` for cross-cutting concerns (transactions, retries)
- Concrete services implement `checkPermissions()` and `execute()` — see `examples/simple/` for the canonical pattern

## Dependencies

- **livr**: Peer dependency for validation (Language Independent Validation Rules)
- Tests use Jest with ts-jest ESM preset

## Gotchas

- ESM-only library (`"type": "module"`) — all imports need `.js` extensions
- Jest requires `--experimental-vm-modules` flag (already configured in `npm test`)
- LIVR validators are cached as static properties on each service class — don't mutate `static validation` at runtime
