/**
 * Dynamic Validation Example
 *
 * Demonstrates multi-step validation with conditional rules based on input type.
 * Uses validateWithRules() for dynamic validation within the validate() method.
 *
 * Run with: npx ts-node --esm examples/dynamic-validation/main.ts
 */

import { ServiceError } from '../../src/ServiceError.js';
import { ItemsCreate } from './services/ItemsCreate.js';

async function main() {
  const service = new ItemsCreate();

  // Example 1: Premium item (requires features and maxUsers)
  console.log('\n--- Creating premium item ---');
  try {
    const premium = await service.run({
      type: 'premium',
      name: 'Enterprise Plan',
      features: ['sso', 'audit-log', 'api-access'],
      maxUsers: 100
    });
    console.log('Created:', premium);
  } catch (error) {
    if (error instanceof ServiceError) {
      console.error('Error:', error.toObject());
    }
  }

  // Example 2: Standard item (simpler validation)
  console.log('\n--- Creating standard item ---');
  try {
    const standard = await service.run({
      type: 'standard',
      name: 'Basic Plan',
      description: 'For small teams'
    });
    console.log('Created:', standard);
  } catch (error) {
    if (error instanceof ServiceError) {
      console.error('Error:', error.toObject());
    }
  }

  // Example 3: Premium item missing required fields
  console.log('\n--- Premium item with missing fields ---');
  try {
    await service.run({
      type: 'premium',
      name: 'Incomplete Plan'
      // Missing: features, maxUsers
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      console.error('Validation error:', error.toObject());
    }
  }
}

main();
