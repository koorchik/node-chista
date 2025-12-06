/**
 * Base class with instrumented lifecycle hooks.
 *
 * Demonstrates onSuccess and onError hooks for:
 * - Logging and metrics collection
 * - Error tracking
 * - Extension points for subclasses (afterSuccess, afterError)
 */

import { ServiceBase, RunContext } from '../../../src/ServiceBase.js';
import { ServiceError } from '../../../src/ServiceError.js';
import { metrics, errorTracker } from '../infrastructure.js';

export abstract class Base<TInput, TOutput> extends ServiceBase<TInput, TOutput> {
  async doRun(data: TInput): Promise<TOutput> {
    return this.execute(data);
  }

  abstract execute(data: TInput): Promise<TOutput>;

  /**
   * Called after successful execution.
   * Use for: logging, metrics, event publishing, cache invalidation.
   */
  protected override async onSuccess(result: TOutput, context: RunContext<TInput>): Promise<void> {
    // Record metrics
    metrics.calls.push({
      service: this.constructor.name,
      durationMs: context.executionTimeMs ?? 0,
      success: true
    });

    // Log success
    console.log(`[${this.constructor.name}] Completed in ${context.executionTimeMs}ms`);

    // Subclasses can override to add more behavior
    await this.afterSuccess(result, context);
  }

  /**
   * Called when an error occurs (validation, permissions, or business logic).
   * Use for: error tracking, cleanup, alerting.
   */
  protected override async onError(error: unknown, context: RunContext<TInput>): Promise<void> {
    // Record metrics
    metrics.calls.push({
      service: this.constructor.name,
      durationMs: Date.now() - context.startTime.getTime(),
      success: false
    });

    // Track error
    errorTracker.errors.push({
      service: this.constructor.name,
      error,
      input: context.inputData
    });

    // Log error (but not validation errors - those are expected)
    if (error instanceof ServiceError && error.code === 'VALIDATION_ERROR') {
      console.log(`[${this.constructor.name}] Validation failed:`, error.fields);
    } else {
      console.error(`[${this.constructor.name}] Error:`, error instanceof Error ? error.message : error);
    }

    // Subclasses can override to add more behavior
    await this.afterError(error, context);
  }

  // Extension points for subclasses
  protected async afterSuccess(result: TOutput, context: RunContext<TInput>): Promise<void> {}
  protected async afterError(error: unknown, context: RunContext<TInput>): Promise<void> {}
}
