/**
 * Example usage demonstrating the 3-layer pattern:
 * 1. ServiceBase (from library)
 * 2. Base (project-specific with transactions)
 * 3. UsersCreate (concrete service)
 *
 * Run with: npx ts-node --esm examples/simple/main.ts
 */

import { ServiceError } from '../../src/ServiceError.js';
import { Database, PubSub } from './types.js';
import { UsersCreate } from './UsersCreate.js';

// Mock database implementation
const db: Database = {
  async withTransaction(fn) {
    console.log('BEGIN TRANSACTION');
    try {
      const result = await fn();
      console.log('COMMIT');
      return result;
    } catch (error) {
      console.log('ROLLBACK');
      throw error;
    }
  },
  users: {
    async findByEmail(email) {
      return null; // No existing user
    },
    async create(data) {
      console.log('INSERT user:', data.email);
      return { id: 'user-123' };
    }
  }
};

// Mock pub/sub implementation
const events: Array<{ event: string; data: unknown }> = [];
const pubSub: PubSub = {
  publish(event, data) {
    events.push({ event, data });
  },
  async processPublishedEvents() {
    for (const { event, data } of events) {
      console.log('PUBLISH:', event, data);
    }
    events.length = 0;
  }
};

// Create and run service
async function main() {
  const service = new UsersCreate(db, pubSub);

  try {
    const result = await service.run({
      email: 'user@example.com',
      password: 'secretpassword'
    });
    console.log('Created user:', result.userId);
  } catch (error) {
    if (error instanceof ServiceError) {
      console.error('Service error:', error.toObject());
    } else {
      throw error;
    }
  }
}

main();
