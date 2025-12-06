# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chista is a minimal, framework-agnostic base class for building clean service layers with LIVR validation. The name means "clean" in Ukrainian.

## Commands

```bash
# Build TypeScript to dist/
npm run build

# Run all tests
npm test

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
4. `doRun(cleanData)` - Abstract, implement or wrap business logic
5. `onSuccess(result, context)` / `onError(error, context)` - Lifecycle hooks

### Key Patterns

- Services are generic: `ServiceBase<TValidParams, TServiceResult>`
- `validateWithRules<T>(data, rules)` allows dynamic/multi-step validation within a service
- Consumers create an intermediate `Base` class that overrides `doRun` to call abstract `execute` method

## Examples

See `examples/` for runnable code demonstrating key patterns:

- **simple/** - Basic 3-layer pattern (ServiceBase → Base → ConcreteService)
- **dynamic-validation/** - Multi-step validation with conditional rules using `validateWithRules()`
- **permissions/** - Role-based access control and resource ownership checks in `checkPermissions()`
- **hooks/** - Lifecycle hooks (`onSuccess`/`onError`) for logging, metrics, events, and cleanup

Run any example with: `npx ts-node --esm examples/<name>/main.ts`

### Example Structure

Each example follows this structure:

```
examples/<name>/
├── main.ts              # Entry point, demo code
├── types.ts             # Shared infrastructure types (if needed)
└── services/
    ├── Base.ts          # Project-specific base class
    └── <Service>.ts     # Concrete service implementations
```

### Service File Pattern

Each service file should be self-contained with validation schema and type inference:

```typescript
import type { InferFromSchema } from 'livr/types';
import { Base } from './Base.js';

// Validation schema
const myServiceValidation = {
  email: ['required', 'email'],
  name: ['required', 'string']
} as const;

// Infer input type from schema
type MyServiceInput = InferFromSchema<typeof myServiceValidation>;

interface MyServiceOutput {
  id: string;
}

export class MyService extends Base<MyServiceInput, MyServiceOutput> {
  static validation = myServiceValidation;

  async checkPermissions(data: MyServiceInput): Promise<boolean> {
    return true;
  }

  async execute(data: MyServiceInput): Promise<MyServiceOutput> {
    // Business logic here
    return { id: '123' };
  }
}
```

### Base Class Pattern

Project-specific `Base` class overrides `doRun` to call abstract `execute`:

```typescript
import { ServiceBase } from '../../../src/ServiceBase.js';

export abstract class Base<TInput, TOutput> extends ServiceBase<TInput, TOutput> {
  async doRun(data: TInput): Promise<TOutput> {
    return this.execute(data);
  }

  abstract execute(data: TInput): Promise<TOutput>;
}
```

## Dependencies

- **livr**: Peer dependency for validation (Language Independent Validation Rules)
- Tests use Jest with ts-jest ESM preset
