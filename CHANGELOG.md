# Changelog

## v2.1.0

### Breaking Changes

- **Renamed `doRun` → `execute`**: The abstract method for business logic is now `execute()`
- **Removed intermediate `doRun` → `execute` pattern**: Base classes no longer need to override `doRun` to call `execute`

### New Features

- **`aroundExecute(data, proceed)` hook**: AOP-style hook for wrapping execution (transactions, retries, etc.)
  ```typescript
  protected override async aroundExecute(data, proceed) {
    return this.db.withTransaction(() => super.aroundExecute(data, proceed));
  }
  ```

### Migration from v2.x

```typescript
// Before (v2.x)
abstract class Base extends ServiceBase {
  async doRun(data) {
    return this.db.withTransaction(() => this.execute(data));
  }
  abstract execute(data): Promise<unknown>;
}

// After (v3.x)
abstract class Base extends ServiceBase {
  protected override async aroundExecute(data, proceed) {
    return this.db.withTransaction(() => super.aroundExecute(data, proceed));
  }
}
```

---

# Changelog: chista v2.0.0 vs node-chista v1.0.1

This document outlines all changes between the original [node-chista](https://github.com/koorchik/node-chista) and the new chista v2.0.0.

## Breaking Changes

### Language & Module System
- **JavaScript → TypeScript**: Complete rewrite in TypeScript with full type definitions
- **CommonJS → ESM**: Now pure ES Modules (`"type": "module"`)
- **Node.js requirement**: Now requires Node.js >= 20.0.0 (was unspecified)

### Removed Express.js Integration
The original library was tightly coupled to Express.js. The new version is **framework-agnostic**:

| Removed Component | Description |
|-------------------|-------------|
| `Chista` class | Express service orchestrator with `makeServiceRunner()`, `renderPromiseAsJson()` |
| `serviceUtils.js` | `runService()` and `renderPromiseAsJson()` Express handlers |
| `consoleLogger.js` | Default logging utility |

### ServiceBase API Changes

| Old (v1.x) | New (v2.x/v3.x) | Notes |
|------------|-----------------|-------|
| `constructor({ context })` | `constructor()` | Context no longer required in constructor |
| `validationRules` (static) | `validation` (static) | Renamed static property |
| `execute(data)` | `execute(data)` | Same name, now abstract in ServiceBase |
| `doValidation(data, rules)` | `validateWithRules(data, rules)` | Renamed, now generic `<T>` |
| `run(params)` | `run(inputData)` | Same purpose, different orchestration |
| — | `checkPermissions(data)` | **New** abstract method (required) |
| — | `aroundExecute(data, proceed)` | **New** hook for wrapping execute (v3.x) |
| — | `onSuccess(result, context)` | **New** lifecycle hook |
| — | `onError(error, context)` | **New** lifecycle hook |

### Exception → ServiceError

| Old `Exception` | New `ServiceError` | Notes |
|-----------------|-------------------|-------|
| `toHash()` | `toObject()` | Renamed method |
| Default code: `'FORMAT_ERROR'` | Default code: `'VALIDATION_ERROR'` | Changed default |
| Used `json-pointer` + `rename-keys` | No external deps | Simplified implementation |

## New Features

### TypeScript Generics
```typescript
class MyService extends ServiceBase<InputType, OutputType> {
  // Full type safety for input validation and return types
}
```

### RunContext for Lifecycle Hooks
```typescript
interface RunContext<TValidParams> {
  inputData: unknown;           // Original input
  cleanData: TValidParams | null; // Validated data
  startTime: Date;              // Execution start
  endTime: Date | null;         // Execution end
  executionTimeMs: number | null; // Duration in ms
}
```

### Mandatory Permission Checking
- `checkPermissions(cleanData)` is now an abstract method
- Must be implemented by all services (return `true` to allow, throw to deny)

### Lifecycle Hooks
- `onSuccess(result, context)` - Called after successful execution
- `onError(error, context)` - Called when any error occurs
- Both receive timing information via `RunContext`

### Improved Validator Caching
- Validators cached as `__validator` static property per service class
- Each service class maintains its own cached validator
- `validateWithRules()` creates fresh validators (not cached)

### Null/Undefined Input Handling
- When no `validation` property set, `null`/`undefined` input → `{}`

### Runtime Safety Checks
- Descriptive error if `execute()` not implemented
- Descriptive error if `checkPermissions()` not implemented
- Validation that `validation` property is object or undefined

## Removed Dependencies

| Dependency | Purpose | Status |
|------------|---------|--------|
| `json-pointer` | Field path processing in Exception | Removed |
| `rename-keys` | Key transformation in Exception | Removed |
| `babel-cli` | ES6 transpilation | Replaced by TypeScript |
| `babel-preset-env` | Babel preset | Replaced by TypeScript |

## Package Structure Changes

### Exports
```javascript
// Old (v1.x)
import Chista from 'chista';
import ServiceBase from 'chista/src/ServiceBase';
import Exception from 'chista/src/Exception';

// New (v2.x)
import { ServiceBase, ServiceError, RunContext } from 'chista';
// Or subpath imports:
import { ServiceBase } from 'chista/ServiceBase';
import { ServiceError } from 'chista/ServiceError';
```

### Files

**Removed:**
- `src/Chista.js` - Express orchestrator
- `src/serviceUtils.js` - Express utilities
- `src/consoleLogger.js` - Logging utility
- `.babelrc` - Babel config

**Added:**
- `src/index.ts` - Main exports
- `tsconfig.json` - TypeScript config
- `jest.config.js` - Test configuration
- `examples/simple/` - Complete usage example
- Type definition files (`.d.ts`)

## Migration Guide

### 1. Update Imports
```typescript
// Before
import ServiceBase from 'chista/src/ServiceBase';
import Exception from 'chista/src/Exception';

// After
import { ServiceBase, ServiceError } from 'chista';
```

### 2. Update ServiceBase Subclass
```typescript
// Before (v1.x)
class MyService extends ServiceBase {
  static validationRules = { /* rules */ };
  async execute(data) { /* logic */ }
}

// After (v3.x)
class MyService extends ServiceBase<InputType, OutputType> {
  static validation = { /* rules */ };

  async checkPermissions(data: InputType): Promise<boolean> {
    return true; // Implement authorization
  }

  async execute(data: InputType): Promise<OutputType> {
    // Business logic
  }
}
```

### 3. Update Exception/Error Handling
```typescript
// Before
throw new Exception({
  code: 'CUSTOM_ERROR',
  fields: { email: 'INVALID' }
});
error.toHash();

// After
throw new ServiceError({
  code: 'CUSTOM_ERROR',
  fields: { email: 'INVALID' }
});
error.toObject();
```

### 4. Remove Express Integration
The Express-specific code must be implemented in your application:
```typescript
// Create your own middleware wrapper
async function runService<T>(ServiceClass: new () => ServiceBase, params: unknown): Promise<T> {
  const service = new ServiceClass();
  return service.run(params);
}
```
