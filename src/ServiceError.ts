/**
 * Error class for validation and business logic errors.
 * Contains structured field-level errors and an error code.
 *
 * @example
 * ```typescript
 * // Validation error (default code)
 * throw new ServiceError({ fields: { email: 'REQUIRED' } });
 *
 * // Business logic error with custom code
 * throw new ServiceError({ code: 'NOT_FOUND', fields: { id: 'WRONG_ID' } });
 * ```
 */
export class ServiceError extends Error {
  #fields: Record<string, unknown>;
  #code: string;

  /**
   * @param options - Error options
   * @param options.fields - Object mapping field names to error codes
   * @param options.code - Error type code (defaults to 'VALIDATION_ERROR')
   */
  constructor({ fields, code = 'VALIDATION_ERROR' }: { fields: Record<string, unknown>; code?: string }) {
    const fieldKeys = typeof fields === 'object' && fields !== null ? Object.keys(fields) : [];
    super(`${code}: ${fieldKeys.join(', ') || 'validation failed'}`);
    if (typeof fields !== 'object' || fields === null) {
      throw new Error("'fields' must be a non-null object");
    }
    if (typeof code !== 'string' || !code) {
      throw new Error("'code' must be a non-empty string");
    }
    this.#fields = fields;
    this.#code = code;
  }

  /** Error type code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND', 'PERMISSION_DENIED') */
  get code(): string {
    return this.#code;
  }

  /** Object mapping field names to their error codes */
  get fields(): Record<string, unknown> {
    return this.#fields;
  }

  /** Convert to plain object for JSON serialization */
  toObject(): { fields: Record<string, unknown>; code: string } {
    return { fields: this.fields, code: this.code };
  }
}
