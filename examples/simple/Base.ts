/**
 * Layer 2: Project-specific base class
 *
 * This intermediate class adds:
 * - Database transaction wrapping via aroundExecute
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

  // Wrap execute() in a database transaction
  protected override async aroundExecute(
    data: TInput,
    proceed: (data: TInput) => Promise<TOutput>
  ): Promise<TOutput> {
    return this.db.withTransaction(() => super.aroundExecute(data, proceed));
  }

  // Publish events after transaction commits
  protected override async onSuccess(result: TOutput, context: RunContext<TInput>): Promise<void> {
    await this.pubSub.processPublishedEvents();
  }
}
