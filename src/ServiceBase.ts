import LIVR from 'livr';
import { ServiceError } from './ServiceError.js';

const { Validator } = LIVR;

/**
 * Type-safe interface for LIVR Validator with generic support.
 * This wraps the Validator class to provide proper type inference
 * for validated data based on the TInput type parameter.
 */
interface LIVRValidator<T = unknown> {
  validate(data: T): T | false;
  getErrors(): Record<string, unknown> | null;
  prepare(): this;
}

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
 * Execution flow: run() → validate() → checkPermissions() → doRun() → onSuccess/onError
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
 *   async doRun(data) { return { userId: '123' }; }
 * }
 *
 * const result = await new UsersCreate().run({ email: 'user@example.com' });
 * ```
 */
export abstract class ServiceBase<TValidParams = unknown, TServiceResult = unknown> {
  /** LIVR validation rules. Override in subclass. Validators are cached per class. */
  static validation?: Record<string, unknown>;

  /**
   * Main entry point. Validates input, checks permissions, executes business logic.
   *
   * @param inputData - Raw input data to validate and process
   * @returns Promise resolving to the service result
   * @throws {ServiceError} On validation failure or business logic errors
   */
  async run(inputData: unknown): Promise<TServiceResult> {
    // Runtime checks for JavaScript users
    if (typeof this.doRun !== 'function') {
      throw new Error(`${this.constructor.name}: doRun() must be implemented`);
    }
    if (typeof this.checkPermissions !== 'function') {
      throw new Error(`${this.constructor.name}: checkPermissions() must be implemented`);
    }

    const startTime = new Date();
    const context: RunContext<TValidParams> = {
      inputData,
      cleanData: null,
      startTime,
      endTime: null,
      executionTimeMs: null
    };

    try {
      const cleanData = await this.validate(inputData);
      context.cleanData = cleanData;

      await this.checkPermissions(cleanData);

      const result = await this.doRun(cleanData);

      context.endTime = new Date();
      context.executionTimeMs = context.endTime.getTime() - startTime.getTime();
      await this.onSuccess(result, context);

      return result;
    } catch (error) {
      await this.onError(error, context);
      throw error;
    }
  }

  async validate(data: unknown): Promise<TValidParams> {
    const ctor = this.constructor as typeof ServiceBase & { __validator?: LIVRValidator };
    const validation = ctor.validation;

    if (validation !== undefined && (typeof validation !== 'object' || validation === null)) {
      throw new Error(`${this.constructor.name}: validation must be a non-null object`);
    }

    if (!validation) {
      return (data ?? {}) as TValidParams;
    }

    if (!ctor.__validator) {
      ctor.__validator = new Validator(validation) as LIVRValidator;
    }

    return this.#doValidationWithValidator(data, ctor.__validator as LIVRValidator<TValidParams>);
  }

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
  validateWithRules<T = unknown>(data: unknown, rules: Record<string, unknown>): T {
    if (!rules || typeof rules !== 'object') {
      throw new Error('validateWithRules: rules must be a non-null object');
    }

    const validator = new Validator(rules) as LIVRValidator<T>;
    return this.#doValidationWithValidator(data, validator);
  }

  #doValidationWithValidator<T>(data: unknown, validator: LIVRValidator<T>): T {
    const validData = validator.validate(data as T);
    if (validData) {
      return validData;
    }
    throw new ServiceError({ fields: validator.getErrors() ?? {} });
  }

  abstract doRun(cleanData: TValidParams): Promise<TServiceResult>;

  abstract checkPermissions(cleanData: TValidParams): Promise<boolean>;

  protected async onSuccess(result: TServiceResult, context: RunContext<TValidParams>): Promise<void> {
    // Override in subclass
  }

  protected async onError(error: unknown, context: RunContext<TValidParams>): Promise<void> {
    // Override in subclass
  }
}
