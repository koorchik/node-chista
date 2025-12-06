import LIVR from 'livr';
import { ServiceError } from './ServiceError.js';
const { Validator } = LIVR;
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
export class ServiceBase {
    /** LIVR validation rules. Override in subclass. Validators are cached per class. */
    static validation;
    /**
     * Main entry point. Validates input, checks permissions, executes business logic.
     *
     * @param inputData - Raw input data to validate and process
     * @returns Promise resolving to the service result
     * @throws {ServiceError} On validation failure or business logic errors
     */
    async run(inputData) {
        // Runtime checks for JavaScript users
        if (typeof this.doRun !== 'function') {
            throw new Error(`${this.constructor.name}: doRun() must be implemented`);
        }
        if (typeof this.checkPermissions !== 'function') {
            throw new Error(`${this.constructor.name}: checkPermissions() must be implemented`);
        }
        const startTime = new Date();
        const context = {
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
        }
        catch (error) {
            await this.onError(error, context);
            throw error;
        }
    }
    async validate(data) {
        const ctor = this.constructor;
        const validation = ctor.validation;
        if (validation !== undefined && (typeof validation !== 'object' || validation === null)) {
            throw new Error(`${this.constructor.name}: validation must be a non-null object`);
        }
        if (!validation) {
            return (data ?? {});
        }
        if (!ctor.__validator) {
            ctor.__validator = new Validator(validation);
        }
        return this.#doValidationWithValidator(data, ctor.__validator);
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
    validateWithRules(data, rules) {
        if (!rules || typeof rules !== 'object') {
            throw new Error('validateWithRules: rules must be a non-null object');
        }
        const validator = new Validator(rules);
        return this.#doValidationWithValidator(data, validator);
    }
    #doValidationWithValidator(data, validator) {
        const validData = validator.validate(data);
        if (validData) {
            return validData;
        }
        throw new ServiceError({ fields: validator.getErrors() ?? {} });
    }
    async onSuccess(result, context) {
        // Override in subclass
    }
    async onError(error, context) {
        // Override in subclass
    }
}
//# sourceMappingURL=ServiceBase.js.map