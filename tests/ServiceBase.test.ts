import { ServiceBase } from '../src/ServiceBase.js';
import { ServiceError } from '../src/ServiceError.js';

interface TestInput {
  name: string;
}

interface TestOutput {
  received: string;
}

class TestService extends ServiceBase<TestInput, TestOutput> {
  static validation = { name: ['required', 'string'] };

  async checkPermissions() {
    return true;
  }

  async execute(data: TestInput): Promise<TestOutput> {
    return { received: data.name };
  }
}

class PermissionDeniedService extends ServiceBase {
  async checkPermissions(): Promise<boolean> {
    throw new ServiceError({ fields: {}, code: 'PERMISSION_DENIED' });
  }

  async execute() {
    return {};
  }
}

// Example of the recommended inheritance pattern for adding transaction support
abstract class TransactionBase extends ServiceBase {
  lifecycleCalls: string[] = [];

  protected override async aroundExecute(
    data: unknown,
    proceed: (data: unknown) => Promise<unknown>
  ): Promise<unknown> {
    this.lifecycleCalls.push('begin');
    const result = await super.aroundExecute(data, proceed);
    this.lifecycleCalls.push('commit');
    return result;
  }

  protected override async onSuccess() {
    this.lifecycleCalls.push('onSuccess');
  }
}

class TransactionService extends TransactionBase {
  async checkPermissions() {
    return true;
  }

  async execute(data: unknown) {
    this.lifecycleCalls.push('execute');
    return data;
  }
}

describe('ServiceBase', () => {
  describe('validation', () => {
    it('validates input and passes clean data to execute', async () => {
      const service = new TestService();
      const result = await service.run({ name: 'test', extra: 'ignored' });
      expect(result).toEqual({ received: 'test' });
    });

    it('throws ServiceError on validation failure', async () => {
      const service = new TestService();
      await expect(service.run({})).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        fields: { name: 'REQUIRED' }
      });
    });

    it('skips validation if validation property not set', async () => {
      class NoValidation extends ServiceBase {
        async checkPermissions() {
          return true;
        }

        async execute(data: unknown) {
          return data;
        }
      }
      const service = new NoValidation();
      const result = await service.run({ anything: 'works' });
      expect(result).toEqual({ anything: 'works' });
    });
  });

  describe('permissions', () => {
    it('throws when permission denied', async () => {
      const service = new PermissionDeniedService();
      await expect(service.run({})).rejects.toMatchObject({
        code: 'PERMISSION_DENIED'
      });
    });
  });

  describe('inheritance pattern', () => {
    it('supports wrapping execute in intermediate base class', async () => {
      const service = new TransactionService();
      await service.run({});
      expect(service.lifecycleCalls).toEqual(['begin', 'execute', 'commit', 'onSuccess']);
    });
  });

  describe('error hooks', () => {
    it('calls onError when execution fails', async () => {
      const errors: unknown[] = [];

      class ErrorService extends ServiceBase {
        async checkPermissions() {
          return true;
        }

        async execute() {
          throw new Error('boom');
        }

        protected override async onError(error: unknown) {
          errors.push(error);
        }
      }

      const service = new ErrorService();
      await expect(service.run({})).rejects.toThrow('boom');
      expect(errors).toHaveLength(1);
    });
  });

  describe('success hooks', () => {
    it('calls onSuccess with result and context', async () => {
      let capturedResult: unknown;
      let capturedContext: unknown;

      class SuccessService extends ServiceBase {
        async checkPermissions() {
          return true;
        }

        async execute() {
          return { ok: true };
        }

        protected override async onSuccess(result: unknown, context: unknown) {
          capturedResult = result;
          capturedContext = context;
        }
      }

      const service = new SuccessService();
      await service.run({ input: 'test' });

      expect(capturedResult).toEqual({ ok: true });
      expect(capturedContext).toMatchObject({
        inputData: { input: 'test' },
        cleanData: { input: 'test' }
      });
      expect((capturedContext as any).executionTimeMs).toBeGreaterThanOrEqual(0);
      expect((capturedContext as any).endTime).toBeInstanceOf(Date);
      expect((capturedContext as any).startTime).toBeInstanceOf(Date);
    });
  });

  describe('validateWithRules', () => {
    it('validates data with provided rules', async () => {
      class DynamicService extends ServiceBase {
        async checkPermissions() {
          return true;
        }

        async validate(data: unknown) {
          return this.validateWithRules(data, { name: ['required', 'string'] });
        }

        async execute(data: unknown) {
          return data;
        }
      }

      const service = new DynamicService();
      const result = await service.run({ name: 'test', extra: 'ignored' });
      expect(result).toEqual({ name: 'test' });
    });

    it('throws ServiceError on validation failure', async () => {
      class DynamicService extends ServiceBase {
        async checkPermissions() {
          return true;
        }

        async validate(data: unknown) {
          return this.validateWithRules(data, { email: ['required', 'email'] });
        }

        async execute(data: unknown) {
          return data;
        }
      }

      const service = new DynamicService();
      await expect(service.run({ email: 'invalid' })).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        fields: { email: 'WRONG_EMAIL' }
      });
    });

    it('supports multi-step validation', async () => {
      class MultiStepService extends ServiceBase {
        async checkPermissions() {
          return true;
        }

        async validate(data: unknown) {
          this.validateWithRules(data, { step: ['required'] });
          return this.validateWithRules(data, { step: ['required'], value: ['required'] });
        }

        async execute(data: unknown) {
          return data;
        }
      }

      const service = new MultiStepService();
      const result = await service.run({ step: 1, value: 'test' });
      expect(result).toEqual({ step: 1, value: 'test' });
    });

    it('supports dynamic validation rules based on input', async () => {
      class DynamicRulesService extends ServiceBase {
        async checkPermissions() {
          return true;
        }

        async validate(data: unknown) {
          const { type } = this.validateWithRules<{ type: string }>(data, { type: ['required', 'string'] });

          const rules =
            type === 'email'
              ? { type: ['required'], contact: ['required', 'email'] }
              : { type: ['required'], contact: ['required', 'string'] };

          return this.validateWithRules(data, rules);
        }

        async execute(data: unknown) {
          return data;
        }
      }

      const service = new DynamicRulesService();

      const emailResult = await service.run({ type: 'email', contact: 'test@example.com' });
      expect(emailResult).toEqual({ type: 'email', contact: 'test@example.com' });

      const phoneResult = await service.run({ type: 'phone', contact: '123456' });
      expect(phoneResult).toEqual({ type: 'phone', contact: '123456' });

      await expect(service.run({ type: 'email', contact: 'not-an-email' })).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        fields: { contact: 'WRONG_EMAIL' }
      });
    });
  });

  describe('generic types', () => {
    it('provides type-safe input and output', async () => {
      interface CreateUserInput {
        email: string;
        password: string;
      }

      interface CreateUserOutput {
        userId: string;
      }

      class UsersCreate extends ServiceBase<CreateUserInput, CreateUserOutput> {
        static validation = {
          email: ['required', 'email'],
          password: ['required', { min_length: 8 }]
        };

        async checkPermissions(data: CreateUserInput) {
          return true;
        }

        async execute(data: CreateUserInput): Promise<CreateUserOutput> {
          return { userId: `user-${data.email}` };
        }
      }

      const service = new UsersCreate();
      const result = await service.run({ email: 'test@example.com', password: 'secret123' });
      expect(result.userId).toBe('user-test@example.com');
    });
  });

  describe('validator caching', () => {
    it('caches validator as static property on service class', async () => {
      class CachingService extends ServiceBase {
        static validation = { name: ['required'] };

        async checkPermissions() {
          return true;
        }

        async execute(data: unknown) {
          return data;
        }
      }

      const service1 = new CachingService();
      await service1.run({ name: 'test1' });

      // Access the cached validator
      const validator1 = (CachingService as any).__validator;
      expect(validator1).toBeDefined();

      const service2 = new CachingService();
      await service2.run({ name: 'test2' });

      // Same validator should be reused
      const validator2 = (CachingService as any).__validator;
      expect(validator2).toBe(validator1);
    });

    it('different service classes have separate cached validators', async () => {
      class ServiceA extends ServiceBase {
        static validation = { fieldA: ['required'] };

        async checkPermissions() {
          return true;
        }

        async execute(data: unknown) {
          return data;
        }
      }

      class ServiceB extends ServiceBase {
        static validation = { fieldB: ['required'] };

        async checkPermissions() {
          return true;
        }

        async execute(data: unknown) {
          return data;
        }
      }

      await new ServiceA().run({ fieldA: 'a' });
      await new ServiceB().run({ fieldB: 'b' });

      expect((ServiceA as any).__validator).toBeDefined();
      expect((ServiceB as any).__validator).toBeDefined();
      expect((ServiceA as any).__validator).not.toBe((ServiceB as any).__validator);
    });
  });

  describe('null and undefined input handling', () => {
    it('handles undefined input when no validation', async () => {
      class NoValidationService extends ServiceBase {
        async checkPermissions() {
          return true;
        }

        async execute(data: unknown) {
          return data;
        }
      }

      const result = await new NoValidationService().run(undefined);
      expect(result).toEqual({});
    });

    it('handles null input when no validation', async () => {
      class NoValidationService extends ServiceBase {
        async checkPermissions() {
          return true;
        }

        async execute(data: unknown) {
          return data;
        }
      }

      const result = await new NoValidationService().run(null);
      expect(result).toEqual({});
    });
  });

  describe('concurrent execution', () => {
    it('handles concurrent execution of same service class', async () => {
      let executionCount = 0;

      class ConcurrentService extends ServiceBase {
        static validation = { id: ['required'] };

        async checkPermissions() {
          return true;
        }

        async execute(data: { id: number }) {
          executionCount++;
          await new Promise((resolve) => setTimeout(resolve, 10));
          return { id: data.id, count: executionCount };
        }
      }

      const results = await Promise.all([
        new ConcurrentService().run({ id: 1 }),
        new ConcurrentService().run({ id: 2 }),
        new ConcurrentService().run({ id: 3 })
      ]);

      expect(results).toHaveLength(3);
      expect(results.map((r: any) => r.id).sort()).toEqual([1, 2, 3]);
      expect(executionCount).toBe(3);
    });
  });

  describe('runtime checks', () => {
    it('throws descriptive error when execute is not implemented', async () => {
      // Simulate JS user forgetting to implement execute
      class IncompleteService extends ServiceBase {
        async checkPermissions() {
          return true;
        }
        // execute not implemented
      }

      // Force TypeScript to allow this for testing
      const service = new (IncompleteService as any)();
      await expect(service.run({})).rejects.toThrow('IncompleteService: execute() must be implemented');
    });

    it('throws descriptive error when checkPermissions is not implemented', async () => {
      // Simulate JS user forgetting to implement checkPermissions
      class IncompleteService extends ServiceBase {
        async execute() {
          return {};
        }
        // checkPermissions not implemented
      }

      const service = new (IncompleteService as any)();
      await expect(service.run({})).rejects.toThrow('IncompleteService: checkPermissions() must be implemented');
    });

    it('throws error when validation is not an object', async () => {
      class BadValidation extends ServiceBase {
        static validation = 'not an object' as any;

        async checkPermissions() {
          return true;
        }

        async execute() {
          return {};
        }
      }

      const service = new BadValidation();
      await expect(service.run({})).rejects.toThrow('BadValidation: validation must be a non-null object');
    });

    it('throws error when validateWithRules receives invalid rules', async () => {
      class TestService extends ServiceBase {
        async checkPermissions() {
          return true;
        }

        async validate(data: unknown) {
          return this.validateWithRules(data, null as any);
        }

        async execute() {
          return {};
        }
      }

      const service = new TestService();
      await expect(service.run({})).rejects.toThrow('validateWithRules: rules must be a non-null object');
    });
  });

  describe('aroundExecute hook', () => {
    it('allows wrapping execute via aroundExecute', async () => {
      const calls: string[] = [];

      class WrappedService extends ServiceBase {
        async checkPermissions() {
          return true;
        }

        protected override async aroundExecute(
          data: unknown,
          proceed: (data: unknown) => Promise<unknown>
        ): Promise<unknown> {
          calls.push('before');
          const result = await proceed(data);
          calls.push('after');
          return result;
        }

        async execute(data: unknown) {
          calls.push('execute');
          return data;
        }
      }

      const service = new WrappedService();
      await service.run({ test: true });
      expect(calls).toEqual(['before', 'execute', 'after']);
    });

    it('supports chaining aroundExecute via super', async () => {
      const calls: string[] = [];

      abstract class Layer1 extends ServiceBase {
        protected override async aroundExecute(
          data: unknown,
          proceed: (data: unknown) => Promise<unknown>
        ): Promise<unknown> {
          calls.push('layer1-before');
          const result = await super.aroundExecute(data, proceed);
          calls.push('layer1-after');
          return result;
        }
      }

      abstract class Layer2 extends Layer1 {
        protected override async aroundExecute(
          data: unknown,
          proceed: (data: unknown) => Promise<unknown>
        ): Promise<unknown> {
          calls.push('layer2-before');
          const result = await super.aroundExecute(data, proceed);
          calls.push('layer2-after');
          return result;
        }
      }

      class ConcreteService extends Layer2 {
        async checkPermissions() {
          return true;
        }

        async execute(data: unknown) {
          calls.push('execute');
          return data;
        }
      }

      const service = new ConcreteService();
      await service.run({});
      expect(calls).toEqual([
        'layer2-before',
        'layer1-before',
        'execute',
        'layer1-after',
        'layer2-after'
      ]);
    });

    it('can modify data passed to execute', async () => {
      class ModifyingService extends ServiceBase {
        async checkPermissions() {
          return true;
        }

        protected override async aroundExecute(
          data: { value: number },
          proceed: (data: { value: number }) => Promise<{ doubled: number }>
        ): Promise<{ doubled: number }> {
          return proceed({ value: data.value * 2 });
        }

        async execute(data: { value: number }) {
          return { doubled: data.value };
        }
      }

      const service = new ModifyingService();
      const result = await service.run({ value: 5 });
      expect(result).toEqual({ doubled: 10 });
    });
  });
});
