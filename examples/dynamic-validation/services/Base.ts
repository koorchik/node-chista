/**
 * Base class for dynamic-validation example services.
 *
 * Minimal base class - concrete services implement execute() directly.
 */

import { ServiceBase } from '../../../src/ServiceBase.js';

export abstract class Base<TInput, TOutput> extends ServiceBase<TInput, TOutput> {
  // No additional behavior - concrete services implement execute() directly
}
