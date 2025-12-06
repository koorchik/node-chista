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
export declare class ServiceError extends Error {
    #private;
    /**
     * @param options - Error options
     * @param options.fields - Object mapping field names to error codes
     * @param options.code - Error type code (defaults to 'VALIDATION_ERROR')
     */
    constructor({ fields, code }: {
        fields: Record<string, unknown>;
        code?: string;
    });
    /** Error type code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND', 'PERMISSION_DENIED') */
    get code(): string;
    /** Object mapping field names to their error codes */
    get fields(): Record<string, unknown>;
    /** Convert to plain object for JSON serialization */
    toObject(): {
        fields: Record<string, unknown>;
        code: string;
    };
}
//# sourceMappingURL=ServiceError.d.ts.map