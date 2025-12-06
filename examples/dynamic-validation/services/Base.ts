/**
 * Base class for dynamic-validation example services.
 *
 * Provides the doRun → execute pattern for consistency with other examples.
 */

import { ServiceBase } from '../../../src/ServiceBase.js';

export abstract class Base<TInput, TOutput> extends ServiceBase<TInput, TOutput> {
  async doRun(data: TInput): Promise<TOutput> {
    return this.execute(data);
  }

  abstract execute(data: TInput): Promise<TOutput>;
}
