/**
 * Base class for services that require user authentication.
 *
 * Provides user context via constructor and a helper method for denying access.
 */

import { ServiceBase } from '../../../src/ServiceBase.js';
import { ServiceError } from '../../../src/ServiceError.js';
import { UserContext } from '../types.js';

export abstract class Base<TInput, TOutput> extends ServiceBase<TInput, TOutput> {
  constructor(protected user: UserContext) {
    super();
  }

  // Helper to throw permission denied error
  protected denyAccess(reason: string): never {
    throw new ServiceError({
      code: 'PERMISSION_DENIED',
      fields: { _authorization: reason }
    });
  }
}
