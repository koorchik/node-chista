/**
 * Layer 3: Concrete service
 *
 * Implements user creation with:
 * - Input validation (LIVR rules)
 * - Permission check
 * - Business logic with duplicate detection
 */

import type { InferFromSchema } from 'livr/types';
import { ServiceError } from '../../src/ServiceError.js';
import { Base } from './Base.js';

// Validation schema with `as const` for type inference
const usersCreateValidation = {
  email: ['required', 'email'],
  password: ['required', { min_length: 8 }]
} as const;

// Infer input type from validation schema
type CreateUserInput = InferFromSchema<typeof usersCreateValidation>;

interface CreateUserOutput {
  userId: string;
}

export class UsersCreate extends Base<CreateUserInput, CreateUserOutput> {
  // Validation rules (LIVR format)
  static validation = usersCreateValidation;

  // Authorization check
  async checkPermissions(data: CreateUserInput): Promise<boolean> {
    // Public endpoint - anyone can register
    return true;
  }

  // Business logic (runs inside transaction from Base.aroundExecute)
  async execute(data: CreateUserInput): Promise<CreateUserOutput> {
    // Check if user already exists
    const existing = await this.db.users.findByEmail(data.email);
    if (existing) {
      throw new ServiceError({
        code: 'EMAIL_ALREADY_EXISTS',
        fields: { email: 'NOT_UNIQUE' }
      });
    }

    // Create user
    const user = await this.db.users.create({
      email: data.email,
      passwordHash: await this.hashPassword(data.password)
    });

    // Publish event (will be processed in onSuccess after transaction commits)
    this.pubSub.publish('user.created', { userId: user.id });

    return { userId: user.id };
  }

  private async hashPassword(password: string): Promise<string> {
    // In real code, use bcrypt or similar
    return `hashed:${password}`;
  }
}
