/**
 * Context object passed to lifecycle hooks (onSuccess, onError).
 * Contains timing information and both raw and validated data.
 */
export interface RunContext<TValidParams = unknown> {
    /** Original unvalidated input data */
    inputData: unknown;
    /** Validated and cleaned data (null if validation failed) */
    cleanData: TValidParams | null;
    /** When run() was called */
    startTime: Date;
    /** When execution completed (null if still running or failed) */
    endTime: Date | null;
    /** Execution duration in milliseconds */
    executionTimeMs: number | null;
}
/**
 * Abstract base class for building service layers with LIVR validation.
 *
 * Execution flow: run() → validate() → checkPermissions() → aroundExecute() → execute() → onSuccess/onError
 *
 * @template TValidParams - Type of validated input data
 * @template TServiceResult - Type of service result
 *
 * @example
 * ```typescript
 * class UsersCreate extends ServiceBase<{ email: string }, { userId: string }> {
 *   static validation = { email: ['required', 'email'] };
 *
 *   async checkPermissions(data) { return true; }
 *   async execute(data) { return { userId: '123' }; }
 * }
 *
 * const result = await new UsersCreate().run({ email: 'user@example.com' });
 * ```
 */
export declare abstract class ServiceBase<TValidParams = unknown, TServiceResult = unknown> {
    #private;
    /** LIVR validation rules. Override in subclass. Validators are cached per class. */
    static validation?: Record<string, unknown>;
    /**
     * Main entry point. Validates input, checks permissions, executes business logic.
     *
     * @param inputData - Raw input data to validate and process
     * @returns Promise resolving to the service result
     * @throws {ServiceError} On validation failure or business logic errors
     */
    run(inputData: unknown): Promise<TServiceResult>;
    validate(data: unknown): Promise<TValidParams>;
    /**
     * Validate data with custom rules. Use for dynamic or multi-step validation.
     * Unlike the static validation property, this creates a new validator each call.
     *
     * @template T - Expected type of validated data
     * @param data - Data to validate
     * @param rules - LIVR validation rules object
     * @returns Validated and cleaned data
     * @throws {ServiceError} On validation failure
     */
    validateWithRules<T = unknown>(data: unknown, rules: Record<string, unknown>): T;
    /**
     * Wraps execute() to add cross-cutting concerns like transactions, retries, etc.
     * Override in intermediate base classes to add wrapping behavior.
     * Call super.aroundExecute() to chain multiple wrappers.
     *
     * @param cleanData - Validated input data
     * @param proceed - Function that calls execute() - invoke this to run business logic
     * @returns Promise resolving to the service result
     *
     * @example
     * ```typescript
     * protected override async aroundExecute(data, proceed) {
     *   return this.db.withTransaction(() => super.aroundExecute(data, proceed));
     * }
     * ```
     */
    protected aroundExecute(cleanData: TValidParams, proceed: (data: TValidParams) => Promise<TServiceResult>): Promise<TServiceResult>;
    /**
     * Business logic implementation. Override in concrete service classes.
     *
     * @param cleanData - Validated input data
     * @returns Promise resolving to the service result
     */
    abstract execute(cleanData: TValidParams): Promise<TServiceResult>;
    abstract checkPermissions(cleanData: TValidParams): Promise<boolean>;
    protected onSuccess(result: TServiceResult, context: RunContext<TValidParams>): Promise<void>;
    protected onError(error: unknown, context: RunContext<TValidParams>): Promise<void>;
}
//# sourceMappingURL=ServiceBase.d.ts.map