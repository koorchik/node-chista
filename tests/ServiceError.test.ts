import { ServiceError } from '../src/ServiceError.js';

describe('ServiceError', () => {
  it('creates error with fields and default code', () => {
    const error = new ServiceError({ fields: { email: 'REQUIRED' } });
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.fields).toEqual({ email: 'REQUIRED' });
  });

  it('creates error with custom code', () => {
    const error = new ServiceError({
      fields: { id: 'NOT_FOUND' },
      code: 'NOT_FOUND'
    });
    expect(error.code).toBe('NOT_FOUND');
  });

  it('throws if fields not provided', () => {
    expect(() => new ServiceError({} as any)).toThrow("'fields' must be a non-null object");
  });

  it('throws if fields is null', () => {
    expect(() => new ServiceError({ fields: null } as any)).toThrow("'fields' must be a non-null object");
  });

  it('throws if code is empty string', () => {
    expect(() => new ServiceError({ fields: {}, code: '' })).toThrow("'code' must be a non-empty string");
  });

  it('toObject returns serializable format', () => {
    const error = new ServiceError({ fields: { x: 'Y' }, code: 'TEST' });
    expect(error.toObject()).toEqual({ fields: { x: 'Y' }, code: 'TEST' });
  });

  it('extends Error', () => {
    const error = new ServiceError({ fields: { test: 'value' } });
    expect(error).toBeInstanceOf(Error);
  });

  describe('error message', () => {
    it('includes code and field names in message', () => {
      const error = new ServiceError({ fields: { email: 'REQUIRED', name: 'TOO_SHORT' } });
      expect(error.message).toBe('VALIDATION_ERROR: email, name');
    });

    it('uses custom code in message', () => {
      const error = new ServiceError({ fields: { id: 'NOT_FOUND' }, code: 'NOT_FOUND' });
      expect(error.message).toBe('NOT_FOUND: id');
    });

    it('shows validation failed for empty fields', () => {
      const error = new ServiceError({ fields: {} });
      expect(error.message).toBe('VALIDATION_ERROR: validation failed');
    });
  });
});
