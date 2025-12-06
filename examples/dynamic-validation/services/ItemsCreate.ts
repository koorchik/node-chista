/**
 * ItemsCreate service with dynamic validation.
 *
 * Demonstrates multi-step validation with conditional rules based on input type.
 * Uses validateWithRules() for dynamic validation within the validate() method.
 */

import type { InferFromSchema } from 'livr/types';
import { Base } from './Base.js';

// Validation schemas for each branch
const typeCheckSchema = {
  type: ['required', { one_of: ['premium', 'standard'] as const }]
} as const;

const premiumSchema = {
  type: ['required', 'string'],
  name: ['required', 'string'],
  features: ['required', { list_of: 'string' }],
  maxUsers: ['required', 'positive_integer']
} as const;

const standardSchema = {
  type: ['required', 'string'],
  name: ['required', 'string'],
  description: { max_length: 500 }
} as const;

// Derive types from schemas
type TypeCheckInput = InferFromSchema<typeof typeCheckSchema>;
type PremiumInput = InferFromSchema<typeof premiumSchema>;
type StandardInput = InferFromSchema<typeof standardSchema>;
type CreateItemInput = PremiumInput | StandardInput;

interface CreateItemOutput {
  itemId: string;
  type: string;
}

export class ItemsCreate extends Base<CreateItemInput, CreateItemOutput> {
  // No static validation - we override validate() instead

  async validate(data: unknown): Promise<CreateItemInput> {
    // First pass: determine the type
    const { type } = this.validateWithRules<TypeCheckInput>(data, typeCheckSchema);

    // Second pass: validate with type-specific rules
    if (type === 'premium') {
      return this.validateWithRules<PremiumInput>(data, premiumSchema);
    }
    return this.validateWithRules<StandardInput>(data, standardSchema);
  }

  async checkPermissions(): Promise<boolean> {
    return true;
  }

  async execute(data: CreateItemInput): Promise<CreateItemOutput> {
    console.log('Creating item:', data);
    return {
      itemId: `item-${Date.now()}`,
      type: data.type
    };
  }
}
