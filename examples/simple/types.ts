/**
 * Infrastructure interfaces (replace with your actual implementations)
 */

export interface Database {
  withTransaction<T>(fn: () => Promise<T>): Promise<T>;
  users: {
    findByEmail(email: string): Promise<{ id: string; email: string } | null>;
    create(data: { email: string; passwordHash: string }): Promise<{ id: string }>;
  };
}

export interface PubSub {
  publish(event: string, data: unknown): void;
  processPublishedEvents(): Promise<void>;
}
