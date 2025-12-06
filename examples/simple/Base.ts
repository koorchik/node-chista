/**
 * Layer 2: Project-specific base class
 *
 * This intermediate class adds:
 * - Database transaction wrapping
 * - Event publishing after successful transactions
 */

import { ServiceBase, RunContext } from '../../src/ServiceBase.js';
import { Database, PubSub } from './types.js';

export abstract class Base<TInput = unknown, TOutput = unknown> extends ServiceBase<TInput, TOutput> {
  constructor(
    protected db: Database,
    protected pubSub: PubSub
  ) {
    super();
  }

  // Override doRun to wrap execution in a database transaction
  async doRun(data: TInput): Promise<TOutput> {
    return this.db.withTransaction(() => this.execute(data));
  }

  // Define new abstract method for business logic
  abstract execute(data: TInput): Promise<TOutput>;

  // Publish events after transaction commits
  protected override async onSuccess(result: TOutput, context: RunContext<TInput>): Promise<void> {
    await this.pubSub.processPublishedEvents();
  }
}
