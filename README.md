# chista

[![npm version](https://badge.fury.io/js/chista.svg)](https://badge.fury.io/js/chista)
[![npm downloads](https://img.shields.io/npm/dm/chista.svg)](https://www.npmjs.com/package/chista)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/chista)](https://bundlephobia.com/package/chista)
[![Known Vulnerabilities](https://snyk.io/test/github/koorchik/node-chista/badge.svg?targetFile=package.json)](https://snyk.io/test/github/koorchik/node-chista?targetFile=package.json)

A minimal, framework-agnostic base class for building clean service layers with LIVR validation.

"Chista" means "clean" in Ukrainian.

## Installation

```bash
npm install chista
```

## Features

- LIVR validation
- Generic types for type-safe input/output
- Hook-based architecture for lifecycle events
- Validator caching for performance
- ServiceError for consistent error handling
- TypeScript support

## Design

### Why Chista?

Chista provides a consistent structure for service layer operations, separating concerns into distinct phases:

```
run(input) → validate → checkPermissions → doRun → onSuccess/onError
```

This design is:
- **Framework-agnostic**: Works with any database, HTTP framework, or messaging system
- **Type-safe**: Full TypeScript generics for input/output types
- **Extensible**: Override any phase or add cross-cutting concerns via inheritance

### Design Patterns

**Template Method Pattern**: The `run()` method defines the algorithm skeleton. Subclasses implement abstract methods (`doRun`, `checkPermissions`) and optionally override hooks (`onSuccess`, `onError`).

**Layered Inheritance**: The recommended pattern uses three layers:
1. `ServiceBase` (library) - Core template with validation and lifecycle
2. `ProjectBase` (your code) - Adds project-specific concerns (transactions, logging)
3. `ConcreteService` (your code) - Implements business logic

### Validator Caching

LIVR validators are cached per service class as a static property. This avoids re-parsing validation rules on every `run()` call.

```typescript
// Cached: validator created once, reused for all calls
class MyService extends ServiceBase {
  static validation = { email: ['required', 'email'] };
  // ...
}
```

**Note**: Caching only applies when using the `validation` property. When you override `validate()` and use `validateWithRules()`, validators are created fresh each call (necessary for dynamic rules).

See [`examples/simple/`](./examples/simple/) for a complete runnable example.

## Basic Usage

### 1. Create a project-specific base class

The recommended pattern is to create an intermediate base class that:
- Overrides `doRun` to add transaction support (or other cross-cutting concerns)
- Defines a new abstract `execute` method for business logic

```typescript
import { ServiceBase, RunContext } from 'chista/ServiceBase.js';
import { ServiceError } from 'chista/ServiceError.js';

export abstract class Base<TInput = unknown, TOutput = unknown> extends ServiceBase<TInput, TOutput> {
  constructor(private db: Database, private pubSub: PubSub) {
    super();
  }

  // Override doRun to wrap execution in a transaction
  async doRun(data: TInput): Promise<TOutput> {
    return this.db.withTransaction(() => this.execute(data));
  }

  // Define new abstract method for business logic
  abstract execute(data: TInput): Promise<TOutput>;

  protected override async onSuccess(result: TOutput, context: RunContext<TInput>): Promise<void> {
    await this.pubSub.processPublishedEvents();
  }
}
```

### 2. Implement a service

```typescript
import type { InferFromSchema } from 'livr/types';

// Define validation schema with `as const` for type inference
const usersCreateValidation = {
  email: ['required', 'email'],
  password: ['required', { min_length: 8 }]
} as const;

// Infer input type from validation schema (no duplicate interface needed!)
type CreateUserInput = InferFromSchema<typeof usersCreateValidation>;

interface CreateUserOutput {
  userId: string;
}

class UsersCreate extends Base<CreateUserInput, CreateUserOutput> {
  static validation = usersCreateValidation;

  async checkPermissions(data: CreateUserInput): Promise<boolean> {
    return true; // Public endpoint
  }

  async execute(data: CreateUserInput): Promise<CreateUserOutput> {
    const user = await this.db.users.create(data);
    return { userId: user.id };
  }
}
```

### 3. Run the service

```typescript
const service = new UsersCreate(db, pubSub);
const result = await service.run({ email: 'user@example.com', password: 'secret123' });
// result is typed as CreateUserOutput
```

## API

### ServiceBase<TInput, TOutput>

Abstract base class with the following methods:

| Method | Description |
|--------|-------------|
| `run(inputData)` | Main entry point - validates, checks permissions, calls doRun |
| `validate(data)` | LIVR validation (override `validation` property) |
| `validateWithRules<T>(data, rules)` | Helper for dynamic validation with custom rules |
| `doRun(data)` | Abstract - implement or wrap business logic |
| `checkPermissions(data)` | Abstract - implement authorization |

Hook methods (override in subclass):

| Hook | Description |
|------|-------------|
| `onSuccess(result, context)` | Called after successful execution (async) |
| `onError(error, context)` | Called on error (async) |

### ServiceError

```typescript
new ServiceError({ fields: { email: 'INVALID' }, code: 'VALIDATION_ERROR' })
```

Properties: `code`, `fields`, `toObject()`

### RunContext<TInput>

The context object passed to hook methods:

```typescript
interface RunContext<TInput> {
  inputData: unknown;        // Original input data
  cleanData: TInput | null;  // Validated/cleaned data
  startTime: Date;           // When run() was called
  endTime: Date | null;      // When execution completed
  executionTimeMs: number | null; // Execution duration in ms
}
```

## Dynamic Validation

Use `validateWithRules()` for dynamic or multi-step validation:

```typescript
import type { InferFromSchema } from 'livr/types';

// For dynamic validation, define schemas for each branch
const typeCheckSchema = {
  type: ['required', 'string']
} as const;

const premiumSchema = {
  type: ['required', 'string'],
  features: ['required', { list_of: 'string' }]
} as const;

const standardSchema = {
  type: ['required', 'string'],
  name: ['required', 'string']
} as const;

type PremiumInput = InferFromSchema<typeof premiumSchema>;
type StandardInput = InferFromSchema<typeof standardSchema>;
type UpdateInput = PremiumInput | StandardInput;

class ItemsUpdate extends Base<UpdateInput, UpdateOutput> {
  async validate(data: unknown): Promise<UpdateInput> {
    // First pass - get the type
    const { type } = this.validateWithRules<InferFromSchema<typeof typeCheckSchema>>(
      data,
      typeCheckSchema
    );

    // Dynamic rules based on type
    if (type === 'premium') {
      return this.validateWithRules<PremiumInput>(data, premiumSchema);
    }
    return this.validateWithRules<StandardInput>(data, standardSchema);
  }
}
```

## LIVR Validation

The library uses [LIVR](https://livr-spec.org/) (Language Independent Validation Rules).

LIVR supports automatic TypeScript type inference from validation schemas. Use `as const` and `InferFromSchema` to derive types:

```typescript
import type { InferFromSchema } from 'livr/types';

const myServiceValidation = {
  email: ['required', 'email'],
  age: ['required', 'positive_integer'],
  role: ['required', { one_of: ['admin', 'user'] as const }],
  tags: { list_of: 'string' }
} as const;

// Inferred type: { email: string; age: number; role: 'admin' | 'user'; tags?: string[] }
type MyServiceInput = InferFromSchema<typeof myServiceValidation>;

class MyService extends ServiceBase<MyServiceInput, void> {
  static validation = myServiceValidation;
  // ...
}
```

## Error Handling

Services throw `ServiceError` for validation and business logic errors:

```typescript
// Validation error (automatic)
throw new ServiceError({
  fields: { email: 'REQUIRED' }
  // code defaults to 'VALIDATION_ERROR'
});

// Business logic error
throw new ServiceError({
  code: 'NOT_FOUND',
  fields: { id: 'WRONG_ID' }
});

// Permission error
throw new ServiceError({
  code: 'PERMISSION_DENIED',
  fields: { targetId: 'PERMISSION_DENIED' }
});
```

## License

MIT
